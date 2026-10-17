package api

import (
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/providers"
	"net/http"
	"strconv"
	"time"
)

type CreateAccountRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	IMAPHost    string `json:"imap_host"`
	IMAPPort    int    `json:"imap_port"`
	SMTPHost    string `json:"smtp_host"`
	SMTPPort    int    `json:"smtp_port"`
	AuthType    string `json:"auth_type"`
	AuthMethod  string `json:"auth_method"`
	Provider    string `json:"provider"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	UseIDLE     bool   `json:"use_idle"`
	BrandColor  string `json:"brand_color"`
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Expiry      string `json:"expiry"`
	Scope       string `json:"scope"`
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
	if err := readJSON(w, r, &req); err != nil {
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
	isOAuth2 := req.AuthMethod == "oauth2"
	if !isOAuth2 && req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "password is required"})
		return
	}
	if isOAuth2 && req.AccessToken == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "access_token is required for oauth2"})
		return
	}
	if isOAuth2 && req.Provider == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "provider is required for oauth2"})
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
	if req.AuthMethod == "" {
		req.AuthMethod = "password"
	}
	a := &models.Account{
		Name:       req.Name,
		Email:      req.Email,
		IMAPHost:   req.IMAPHost,
		IMAPPort:   req.IMAPPort,
		SMTPHost:   req.SMTPHost,
		SMTPPort:   req.SMTPPort,
		AuthType:   req.AuthType,
		AuthMethod: req.AuthMethod,
		Provider:   req.Provider,
		Username:   req.Username,
		Password:   req.Password,
		UseIDLE:    req.UseIDLE,
		BrandColor: req.BrandColor,
	}
	if isOAuth2 {
		tok := &models.OAuth2TokenData{
			AccessToken: req.AccessToken,
			TokenType:   req.TokenType,
			Scope:       req.Scope,
		}
		if req.Expiry != "" {
			if t, err := time.Parse(time.RFC3339, req.Expiry); err == nil {
				tok.Expiry = t
			}
		}
		s, _ := tok.Marshal()
		a.OAuth2Token = s
	}
	providers.ApplyDefaults(a)
	if err := h.accounts.Create(a); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.syncEngine != nil {
		// Create() blanks the password/oauth token on `a`. Re-fetch the
		// decrypted account so the syncer can authenticate; the response
		// body stays `a` (with blanks), so no secret is leaked.
		if fresh, err := h.accounts.GetByID(a.ID); err == nil {
			h.syncEngine.AddAccount(fresh)
		}
	}
	writeJSON(w, http.StatusCreated, a)
}

// UpdateAccountRequest 用指针字段区分「未提供」与「置空/置 false」。
type UpdateAccountRequest struct {
	Name       *string `json:"name"`
	Email      *string `json:"email"`
	IMAPHost   *string `json:"imap_host"`
	IMAPPort   *int    `json:"imap_port"`
	SMTPHost   *string `json:"smtp_host"`
	SMTPPort   *int    `json:"smtp_port"`
	AuthType   *string `json:"auth_type"`
	AuthMethod *string `json:"auth_method"`
	Provider   *string `json:"provider"`
	Username   *string `json:"username"`
	Password   *string `json:"password"`
	UseIDLE    *bool   `json:"use_idle"`
	BrandColor *string `json:"brand_color"`
}

func (h *Handler) handleUpdateAccount(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	existing, err := h.accounts.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "account not found"})
		return
	}
	var req UpdateAccountRequest
	if err := readJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	// Only update fields that are provided
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Email != nil {
		existing.Email = *req.Email
	}
	if req.IMAPHost != nil {
		existing.IMAPHost = *req.IMAPHost
	}
	if req.IMAPPort != nil {
		existing.IMAPPort = *req.IMAPPort
	}
	if req.SMTPHost != nil {
		existing.SMTPHost = *req.SMTPHost
	}
	if req.SMTPPort != nil {
		existing.SMTPPort = *req.SMTPPort
	}
	if req.AuthType != nil {
		existing.AuthType = *req.AuthType
	}
	if req.AuthMethod != nil {
		existing.AuthMethod = *req.AuthMethod
	}
	if req.Provider != nil {
		existing.Provider = *req.Provider
	}
	if req.Username != nil {
		existing.Username = *req.Username
	}
	if req.Password != nil {
		existing.Password = *req.Password
	}
	if req.UseIDLE != nil {
		existing.UseIDLE = *req.UseIDLE
	}
	if req.BrandColor != nil {
		existing.BrandColor = *req.BrandColor
	}
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
