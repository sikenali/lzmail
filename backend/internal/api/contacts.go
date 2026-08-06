package api

import (
	"net/http"
	"strconv"
	"github.com/lzmail/backend/internal/models"
)


func (h *Handler) handleSearchContacts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	contacts, err := h.contacts.Search(q)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, contacts)
}

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

func (h *Handler) handleUpdateContact(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var c models.Contact
	if err := readJSON(r, &c); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	c.ID = id
	if err := h.contacts.Update(&c); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *Handler) handleDeleteContact(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err := h.contacts.Delete(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
