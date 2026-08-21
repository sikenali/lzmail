package api

import (
	"fmt"
	"net/http"
)

type responseGuard struct {
	http.ResponseWriter
	guarded bool
}

func (g *responseGuard) Header() http.Header {
	return g.ResponseWriter.Header()
}
func (g *responseGuard) Write(p []byte) (int, error) {
	if !g.guarded && len(p) > 0 && p[0] == '<' {
		return 0, fmt.Errorf("html response detected, aborting SSE")
	}
	g.guarded = true
	return g.ResponseWriter.Write(p)
}
func (g *responseGuard) WriteHeader(status int) {
	if !g.guarded {
		g.ResponseWriter.Header().Set("Content-Type", "text/event-stream")
	}
	g.guarded = true
	g.ResponseWriter.WriteHeader(status)
}
func (g *responseGuard) Flush() {
	if f, ok := g.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (h *Handler) handleSSE(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	guarded := &responseGuard{ResponseWriter: w}
	h.sseHub.ServeHTTP(guarded, r)
}
