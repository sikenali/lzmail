package api

import (
	"net/http"
	"strconv"
	"github.com/lzmail/backend/internal/models"
)

type CreateAccountRequest struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	IMAPHost   string `json:"imap_host"`
	IMAPPort   int    `json:"imap_port"`
	SMTPHost   string `json:"smtp_host"`
	SMTPPort   int    `json:"smtp_port"`
	AuthType   string `json:"auth_type"`
	Username   string `json:"username"`
	Password   string `json:"password"`
	UseIDLE    bool   `json:"use_idle"`
	BrandColor string `json:"brand_color"`
}

func (h *Handler) handleListAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := h.accounts.ListPublic()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, accounts)
}

func (h *Handler) handleCreateAccount(w http.ResponseWriter, r *http.Request) {
	var req CreateAccountRequest
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	if req.Email == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "email is required"})
		return
	}
	if req.IMAPHost == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "imap_host is required"})
		return
	}
	if req.SMTPHost == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "smtp_host is required"})
		return
	}
	if req.Username == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "username is required"})
		return
	}
	if req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "password is required"})
		return
	}
	if req.IMAPPort == 0 {
		req.IMAPPort = 993
	}
	if req.SMTPPort == 0 {
		req.SMTPPort = 587
	}
	if req.AuthType == "" {
		req.AuthType = "password"
	}
	a := &models.Account{
		Name:       req.Name,
		Email:      req.Email,
		IMAPHost:   req.IMAPHost,
		IMAPPort:   req.IMAPPort,
		SMTPHost:   req.SMTPHost,
		SMTPPort:   req.SMTPPort,
		AuthType:   req.AuthType,
		Username:   req.Username,
		Password:   req.Password,
		UseIDLE:    req.UseIDLE,
		BrandColor: req.BrandColor,
	}
	if err := h.accounts.Create(a); err != nil {
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
