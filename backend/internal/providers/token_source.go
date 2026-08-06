// Package providers 提供 OAuth2 token 解析与 IMAP/SMTP 认证适配。
package providers

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/lzmail/backend/internal/external_oauth"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/oauth2"
	"github.com/lzmail/backend/internal/store"
)

// TokenSource 负责为账号解析可用的 OAuth2 access token，过期自动刷新并持久化。
type TokenSource struct {
	oauthSvc *oauth2.OAuth2Service
	external *external_oauth.Client
	store    *store.AccountStore

	mu      sync.Mutex
	account *models.Account
}

// NewTokenSource 构建 token 解析器。external 可为 nil（走自持凭据），oauthSvc 可为 nil（走外部服务器）。
func NewTokenSource(oauthSvc *oauth2.OAuth2Service, external *external_oauth.Client, st *store.AccountStore, account *models.Account) *TokenSource {
	return &TokenSource{oauthSvc: oauthSvc, external: external, store: st, account: account}
}

// GetAccessToken 返回有效 access token，必要时刷新。
func (t *TokenSource) GetAccessToken() (string, error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	data, err := t.account.TokenData()
	if err != nil {
		return "", fmt.Errorf("parse token: %w", err)
	}
	if data.AccessToken != "" && time.Now().Before(data.Expiry.Add(-5*time.Minute)) {
		return data.AccessToken, nil
	}
	if data.RefreshToken == "" {
		return "", fmt.Errorf("oauth2 token expired and no refresh token available")
	}

	refreshed, err := t.refresh(context.Background(), data)
	if err != nil {
		return "", fmt.Errorf("refresh oauth2 token: %w", err)
	}
	if refreshed.AccessToken == "" {
		return "", fmt.Errorf("refresh oauth2 token returned empty access token")
	}

	newData := &models.OAuth2TokenData{
		AccessToken:  refreshed.AccessToken,
		RefreshToken: firstNonEmpty(refreshed.RefreshToken, data.RefreshToken),
		TokenType:    refreshed.TokenType,
		Expiry:       refreshed.Expiry,
		Scope:        refreshed.Scope,
		ClientID:     refreshed.ClientID,
	}
	if err := t.store.UpdateOAuth2Token(t.account.ID, newData); err != nil {
		return "", fmt.Errorf("persist refreshed token: %w", err)
	}
	t.account.OAuth2Token, _ = newData.Marshal()
	return newData.AccessToken, nil
}

func (t *TokenSource) refresh(ctx context.Context, data *models.OAuth2TokenData) (*external_oauth.TokenResponse, error) {
	if t.external != nil {
		return t.external.RefreshToken(ctx, oauth2.Provider(t.account.Provider), data.RefreshToken)
	}
	client, err := t.oauthSvc.GetClient(oauth2.Provider(t.account.Provider))
	if err != nil {
		return nil, err
	}
	resp, err := client.RefreshToken(data.RefreshToken)
	if err != nil {
		return nil, err
	}
	return &external_oauth.TokenResponse{
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
		TokenType:    resp.TokenType,
		Expiry:       resp.Expiry,
		Scope:        resp.Scope,
	}, nil
}

func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}
