package api

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/lzmail/backend/internal/oauth2"
)

// oauthState 用于校验 OAuth2 回调，避免 CSRF
type oauthStateStore struct {
	mu     sync.Mutex
	states map[string]time.Time
}

func newOAuthStateStore() *oauthStateStore {
	s := &oauthStateStore{states: map[string]time.Time{}}
	go func() {
		for {
			time.Sleep(10 * time.Minute)
			s.mu.Lock()
			now := time.Now()
			for k, t := range s.states {
				if now.Sub(t) > 30*time.Minute {
					delete(s.states, k)
				}
			}
			s.mu.Unlock()
		}
	}()
	return s
}

// isValidRedirectURL 校验回调URL是否为合法地址（同域或http/https）。
func isValidRedirectURL(url string) bool {
	if url == "" {
		return true
	}
	lower := strings.ToLower(url)
	// 允许相对路径和同域路径
	if strings.HasPrefix(lower, "/") {
		return true
	}
	// 允许http/https，其他协议拒绝
	return strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://")
}

func (s *oauthStateStore) add() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	state := hex.EncodeToString(b)
	s.mu.Lock()
	s.states[state] = time.Now()
	s.mu.Unlock()
	return state, nil
}

func (s *oauthStateStore) verify(state string) bool {
	if state == "" {
		return false
	}
	s.mu.Lock()
	_, ok := s.states[state]
	delete(s.states, state)
	s.mu.Unlock()
	return ok
}

// handleOAuthInit 返回服务商授权 URL
func (h *Handler) handleOAuthInit(w http.ResponseWriter, r *http.Request) {
	if h.oauth == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "OAuth2 not configured"})
		return
	}
	provider, err := oauth2.ParseProvider(r.PathValue("provider"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	state, err := h.oauthStates.add()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	authURL, err := h.oauth.GetAuthURL(provider, state)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	// 将回调 URL 编码到 state 中（state 原样回传）
	returnURL := r.URL.Query().Get("return_url")
	if returnURL != "" {
		// 校验 return_url 必须在预定义域名内，防止开放重定向攻击
		if !isValidRedirectURL(returnURL) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid return_url"})
			return
		}
		authURL = authURL + "&redirect_uri=" + returnURL
	}
	writeJSON(w, http.StatusOK, map[string]string{"auth_url": authURL, "state": state})
}

// handleOAuthCallback 接收 OAuth2 回调，交换/收集 token 后返回给前端
func (h *Handler) handleOAuthCallback(w http.ResponseWriter, r *http.Request) {
	if h.oauth == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "OAuth2 not configured"})
		return
	}
	provider, err := oauth2.ParseProvider(r.PathValue("provider"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if !h.oauthStates.verify(r.URL.Query().Get("state")) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid state"})
		return
	}

	// 外部 OAuth 服务器模式：回调直接携带 token
	if q := r.URL.Query(); q.Get("access_token") != "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"provider":      provider,
			"access_token":  q.Get("access_token"),
			"refresh_token": q.Get("refresh_token"),
			"expires_in":    q.Get("expires_in"),
			"scope":         q.Get("scope"),
			"email":         q.Get("email"),
		})
		return
	}

	// 自持凭据模式：用 code 交换 token
	code := r.URL.Query().Get("code")
	if code == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing code"})
		return
	}
	tok, err := h.oauth.ExchangeCode(provider, code)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"provider":      provider,
		"access_token":  tok.AccessToken,
		"refresh_token": tok.RefreshToken,
		"expires_in":    tok.Expiry.Sub(time.Now()).Seconds(),
		"scope":         tok.Scope,
	})
}
