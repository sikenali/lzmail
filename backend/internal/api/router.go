package api

import (
	"encoding/json"
	"net/http"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sse"
)

type Handler struct {
	accounts   *store.AccountStore
	emails     *store.EmailStore
	contacts   *store.ContactStore
	settings   *store.SettingsStore
	sseHub     *sse.Hub
	archiveDir string
}

func NewHandler(as *store.AccountStore, es *store.EmailStore, cs *store.ContactStore, ss *store.SettingsStore, hub *sse.Hub, archiveDir string) *Handler {
	return &Handler{accounts: as, emails: es, contacts: cs, settings: ss, sseHub: hub, archiveDir: archiveDir}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/accounts", h.handleListAccounts)
	mux.HandleFunc("POST /api/v1/accounts", h.handleCreateAccount)
	mux.HandleFunc("DELETE /api/v1/accounts/{id}", h.handleDeleteAccount)
	mux.HandleFunc("PATCH /api/v1/accounts/{id}", h.handleUpdateAccount)

	mux.HandleFunc("GET /api/v1/mails", h.handleListMails)
	mux.HandleFunc("GET /api/v1/mails/{id}", h.handleGetMail)
	mux.HandleFunc("GET /api/v1/mails/{id}/raw", h.handleRenderMail)
	mux.HandleFunc("PATCH /api/v1/mails/{id}", h.handleMoveMail)
	mux.HandleFunc("POST /api/v1/mails/{id}/read", h.handleMarkRead)
	mux.HandleFunc("POST /api/v1/mails/{id}/star", h.handleMarkStar)
	mux.HandleFunc("DELETE /api/v1/mails/{id}", h.handleDeleteMail)
	mux.HandleFunc("GET /api/v1/mails/{id}/attachments/{attId}", h.handleDownloadAttachment)
	mux.HandleFunc("GET /api/v1/mails/search", h.handleSearchMails)
	mux.HandleFunc("GET /api/v1/mails/trend", h.handleMailTrend)
	mux.HandleFunc("GET /api/v1/mails/stats", h.handleMailStats)

	mux.HandleFunc("POST /api/v1/compose", h.handleCompose)
	mux.HandleFunc("POST /api/v1/compose/attachments", h.handleUploadAttachment)

	mux.HandleFunc("GET /api/v1/contacts", h.handleListContacts)
	mux.HandleFunc("POST /api/v1/contacts", h.handleCreateContact)
	mux.HandleFunc("GET /api/v1/contacts/search", h.handleSearchContacts)

	mux.HandleFunc("GET /api/v1/settings", h.handleGetSettings)
	mux.HandleFunc("POST /api/v1/settings", h.handleUpdateSettings)

	mux.HandleFunc("GET /api/v1/events", h.handleSSE)

	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
