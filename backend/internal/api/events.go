package api

import "net/http"

func (h *Handler) handleSSE(w http.ResponseWriter, r *http.Request) {
	h.sseHub.ServeHTTP(w, r)
}
