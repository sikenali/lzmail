package sse

import (
	"fmt"
	"net/http"
)

type Hub struct {
	clients map[chan string]struct{}
	sub     chan chan string
	unsub   chan chan string
	publish chan string
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[chan string]struct{}),
		sub:     make(chan chan string),
		unsub:   make(chan chan string),
		publish: make(chan string, 64),
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
			for ch := range h.clients {
				select {
				case ch <- msg:
				default:
				}
			}
		}
	}
}

func (h *Hub) Publish(event string, data string) {
	h.publish <- fmt.Sprintf("event: %s\ndata: %s\n\n", event, data)
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
