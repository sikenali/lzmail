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
	if h.syncEngine != nil {
		h.syncEngine.AddAccount(a)
	}
	writeJSON(w, http.StatusCreated, a)
}


func (h *Handler) handleUpdateAccount(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	existing, err := h.accounts.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "account not found"})
		return
	}
	var req CreateAccountRequest
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	// Only update fields that are provided
	if req.Name != "" { existing.Name = req.Name }
	if req.Email != "" { existing.Email = req.Email }
	if req.IMAPHost != "" { existing.IMAPHost = req.IMAPHost }
	if req.IMAPPort != 0 { existing.IMAPPort = req.IMAPPort }
	if req.SMTPHost != "" { existing.SMTPHost = req.SMTPHost }
	if req.SMTPPort != 0 { existing.SMTPPort = req.SMTPPort }
	if req.Username != "" { existing.Username = req.Username }
	if req.Password != "" { existing.Password = req.Password }
	if req.UseIDLE { existing.UseIDLE = req.UseIDLE }
	if err := h.accounts.Update(existing); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.syncEngine != nil {
		h.syncEngine.RemoveAccount(existing.ID)
		h.syncEngine.AddAccount(existing)
	}
	writeJSON(w, http.StatusOK, existing)
}

func (h *Handler) handleDeleteAccount(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if h.syncEngine != nil {
		h.syncEngine.RemoveAccount(id)
	}
	if err := h.accounts.Delete(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
