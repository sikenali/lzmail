package api

import (
	"encoding/json"
	"net/http"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sse"
)

type Handler struct {
	accounts *store.AccountStore
	emails   *store.EmailStore
	contacts *store.ContactStore
	sseHub   *sse.Hub
}

func NewHandler(as *store.AccountStore, es *store.EmailStore, cs *store.ContactStore, hub *sse.Hub) *Handler {
	return &Handler{accounts: as, emails: es, contacts: cs, sseHub: hub}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/accounts", h.handleListAccounts)
	mux.HandleFunc("POST /api/v1/accounts", h.handleCreateAccount)
	mux.HandleFunc("DELETE /api/v1/accounts/{id}", h.handleDeleteAccount)
	mux.HandleFunc("GET /api/v1/mails", h.handleListMails)
	mux.HandleFunc("GET /api/v1/mails/{id}", h.handleGetMail)
	mux.HandleFunc("POST /api/v1/mails/{id}/read", h.handleMarkRead)
	mux.HandleFunc("POST /api/v1/mails/{id}/star", h.handleMarkStar)
	mux.HandleFunc("DELETE /api/v1/mails/{id}", h.handleDeleteMail)
	mux.HandleFunc("POST /api/v1/compose", h.handleCompose)
	mux.HandleFunc("GET /api/v1/contacts", h.handleListContacts)
	mux.HandleFunc("POST /api/v1/contacts", h.handleCreateContact)
	mux.HandleFunc("GET /api/v1/events", h.handleSSE)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
