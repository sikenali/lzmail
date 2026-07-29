package api

import (
	"net/http"
)

type ComposeRequest struct {
	AccountID int64  `json:"account_id"`
	To        string `json:"to"`
	Subject   string `json:"subject"`
	BodyHTML  string `json:"body_html"`
}

func (h *Handler) handleCompose(w http.ResponseWriter, r *http.Request) {
	var req ComposeRequest
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "queued", "to": req.To, "subject": req.Subject})
}
