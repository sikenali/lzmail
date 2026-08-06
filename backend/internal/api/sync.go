package api

import (
	"net/http"
	"strconv"
)

func (h *Handler) handleSync(w http.ResponseWriter, r *http.Request) {
	if h.syncEngine == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "sync engine unavailable"})
		return
	}

	// Optional ?account_id=<id> to refresh a single account.
	if idStr := r.URL.Query().Get("account_id"); idStr != "" {
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid account_id"})
			return
		}
		h.syncEngine.RefreshAccount(id)
		writeJSON(w, http.StatusOK, map[string]string{"status": "syncing", "account_id": idStr})
		return
	}

	h.syncEngine.RefreshAll()
	writeJSON(w, http.StatusOK, map[string]string{"status": "syncing"})
}
