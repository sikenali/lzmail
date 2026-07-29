package api

import (
	"net/http"
	"github.com/lzmail/backend/internal/models"
)

func (h *Handler) handleListContacts(w http.ResponseWriter, r *http.Request) {
	contacts, err := h.contacts.List()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, contacts)
}

func (h *Handler) handleCreateContact(w http.ResponseWriter, r *http.Request) {
	var c models.Contact
	if err := readJSON(r, &c); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	if err := h.contacts.Create(&c); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, c)
}
