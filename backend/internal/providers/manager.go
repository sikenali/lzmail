package providers

import (
	"context"

	"github.com/lzmail/backend/internal/external_oauth"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/oauth2"
	"github.com/lzmail/backend/internal/store"
)

func stateCtx() context.Context {
	return context.Background()
}

// Manager 聚合 OAuth2 服务，向 API 与同步引擎提供 token 解析能力
type Manager struct {
	oauthSvc *oauth2.OAuth2Service
	external *external_oauth.Client
	store    *store.AccountStore
}

func NewManager(oauthSvc *oauth2.OAuth2Service, external *external_oauth.Client, st *store.AccountStore) *Manager {
	return &Manager{oauthSvc: oauthSvc, external: external, store: st}
}

// TokenSource 为账号构建 token 解析器（密码账号返回 nil）
func (m *Manager) TokenSource(account *models.Account) *TokenSource {
	if account == nil || !account.IsOAuth2() {
		return nil
	}
	return NewTokenSource(m.oauthSvc, m.external, m.store, account)
}

// GetAuthURL 生成服务商授权 URL
func (m *Manager) GetAuthURL(provider oauth2.Provider, state string) (string, error) {
	if m.external != nil {
		return m.external.GetAuthURL(stateCtx(), provider, state)
	}
	client, err := m.oauthSvc.GetClient(provider)
	if err != nil {
		return "", err
	}
	return client.GetAuthURL(state, "")
}

// ExchangeCode 用授权码换取 token
func (m *Manager) ExchangeCode(provider oauth2.Provider, code string) (*external_oauth.TokenResponse, error) {
	if m.external != nil {
		return m.external.ExchangeCode(stateCtx(), provider, code)
	}
	client, err := m.oauthSvc.GetClient(provider)
	if err != nil {
		return nil, err
	}
	resp, err := client.ExchangeCode(code, "")
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
