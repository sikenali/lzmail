package sse

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

type publishMsg struct {
	id   uint64
	data string
}

type storedEvent struct {
	id   uint64
	data string
}

type Hub struct {
	clients   map[chan string]struct{}
	sub       chan chan string
	unsub     chan chan string
	publish   chan publishMsg
	counter   atomic.Uint64
	ringMu    sync.RWMutex // 保护 eventRing/ringPos，供 replay 读取
	eventRing [128]storedEvent
	ringPos   int
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[chan string]struct{}),
		sub:     make(chan chan string),
		unsub:   make(chan chan string),
		publish: make(chan publishMsg, 64),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case ch := <-h.sub:
			h.clients[ch] = struct{}{}
		case ch := <-h.unsub:
			delete(h.clients, ch)
			close(ch)
		case msg := <-h.publish:
			h.ringMu.Lock()
			h.eventRing[h.ringPos%len(h.eventRing)] = storedEvent{id: msg.id, data: msg.data}
			h.ringPos++
			h.ringMu.Unlock()
			for ch := range h.clients {
				select {
				case ch <- msg.data:
				default:
					// client channel full, drop and remove
					delete(h.clients, ch)
					close(ch)
				}
			}
		}
	}
}

func (h *Hub) Publish(event string, data string) {
	id := h.counter.Add(1)
	formatted := fmt.Sprintf("id: %d\nevent: %s\ndata: %s\n\n", id, event, data)
	select {
	case h.publish <- publishMsg{id: id, data: formatted}:
	case <-time.After(3 * time.Second):
		log.Printf("[sse] publish timeout dropped event=%s", event)
	}
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// 立刻发一个注释帧并冲刷，把响应头马上送出去。
	// 否则首个字节要等到 25 秒心跳或第一条事件才写出，期间代理与浏览器都拿不到响应头：
	// EventSource 会一直挂着不完成，每个 useSSE 调用点各占一个连接，很快占满
	// 浏览器每个主机的 HTTP/1.1 连接上限（6 个），让其余请求（存草稿等）全部排队等待。
	fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()

	lastIDStr := r.Header.Get("Last-Event-ID")
	if lastIDStr != "" {
		lastID, _ := strconv.ParseUint(lastIDStr, 10, 64)
		h.ringMu.RLock()
		ringSize := len(h.eventRing)
		start := h.ringPos - ringSize
		if start < 0 {
			start = 0
		}
		replay := make([]storedEvent, 0, h.ringPos-start)
		for i := start; i < h.ringPos; i++ {
			replay = append(replay, h.eventRing[i%ringSize])
		}
		h.ringMu.RUnlock()
		for _, ev := range replay {
			if ev.id > lastID {
				fmt.Fprint(w, ev.data)
			}
		}
		flusher.Flush()
	}

	ch := make(chan string, 64)
	h.sub <- ch
	defer func() { h.unsub <- ch }()

	ctx := r.Context()
	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()
	for {
		select {
		case msg := <-ch:
			fmt.Fprint(w, msg)
			flusher.Flush()
		case <-heartbeat.C:
			// 发送注释帧作为心跳，防止代理/网关静默回收长连接
			fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		case <-ctx.Done():
			return
		}
	}
}
