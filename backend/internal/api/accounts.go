package api

import (
	"net/http"
	"strconv"
	"github.com/lzmail/backend/internal/models"
)

func (h *Handler) handleListAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := h.accounts.List()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, accounts)
}

func (h *Handler) handleCreateAccount(w http.ResponseWriter, r *http.Request) {
	var a models.Account
	if err := readJSON(r, &a); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	if err := h.accounts.Create(&a); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

func (h *Handler) handleDeleteAccount(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err := h.accounts.Delete(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
