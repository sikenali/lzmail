package sse

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"
)

// chClosed returns a channel that receives when ch is closed.
// Used to detect closed client channels without panicking on send.
func chClosed(ch chan string) <-chan struct{} {
	closed := make(chan struct{})
	go func() {
		for range ch {
			// consume, do nothing
		}
		close(closed)
	}()
	return closed
}

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
			formatted := fmt.Sprintf("id: %d\nevent: %s\n\n", msg.id, msg.data)
			h.eventRing[h.ringPos%len(h.eventRing)] = storedEvent{id: msg.id, data: formatted}
			h.ringPos++
			for ch := range h.clients {
				select {
				case ch <- formatted:
				case <-chClosed(ch):
					delete(h.clients, ch)
				default:
				}
			}
		}
	}
}

func (h *Hub) Publish(event string, data string) {
	id := h.counter.Add(1)
	select {
	case h.publish <- publishMsg{id: id, data: fmt.Sprintf("%s\ndata: %s", event, data)}:
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

	lastIDStr := r.Header.Get("Last-Event-ID")
	if lastIDStr != "" {
		lastID, _ := strconv.ParseUint(lastIDStr, 10, 64)
		ringSize := len(h.eventRing)
		start := h.ringPos - ringSize
		if start < 0 {
			start = 0
		}
		for i := start; i < h.ringPos; i++ {
			ev := h.eventRing[i%ringSize]
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
	for {
		select {
		case msg := <-ch:
			fmt.Fprint(w, msg)
			flusher.Flush()
		case <-ctx.Done():
			return
		}
	}
}
