// Package external_oauth 与外部 OAuth2 服务器（如 oauth.windyl.de）通信，
// 用于集中管理 Gmail/Outlook 客户端凭据，避免自持各服务商凭据。
package external_oauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/lzmail/backend/internal/oauth2"
)

const (
	pathInitOAuth    = "/auth/%s"
	pathCallback     = "/callback/%s"
	pathExchange     = "/oauth/exchange"
	pathRefresh      = "/oauth/refresh"
	defaultTimeout   = 30 * time.Second
	defaultAccessTyp = "offline"
)

// ServerConfig 外部 OAuth 服务器配置
type ServerConfig struct {
	BaseURL string
}

// Client 与外部 OAuth 服务器通信的客户端
type Client struct {
	baseURL   string
	http      *http.Client
	providers []oauth2.Provider
}

// TokenResponse 外部服务器返回的 token 数据
type TokenResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	Expiry       time.Time `json:"expiry"`
	Scope        string    `json:"scope"`
	ClientID     string    `json:"client_id"`
}

func NewClient(cfg ServerConfig, providers []oauth2.Provider) *Client {
	return &Client{
		baseURL:   strings.TrimRight(cfg.BaseURL, "/"),
		http:      &http.Client{Timeout: defaultTimeout},
		providers: providers,
	}
}

// GetSupportedProviders 返回外部服务器支持的服务商
func (c *Client) GetSupportedProviders() []oauth2.Provider {
	return c.providers
}

// GetAuthURL 向外部服务器请求授权 URL
func (c *Client) GetAuthURL(ctx context.Context, provider oauth2.Provider, state string) (string, error) {
	u := fmt.Sprintf("%s%s", c.baseURL, fmt.Sprintf(pathInitOAuth, provider))
	q := url.Values{}
	q.Set("state", state)
	q.Set("access_type", defaultAccessTyp)
	q.Set("redirect_uri", c.callbackURL(provider))
	if uu, err := url.Parse(u); err == nil {
		uu.RawQuery = q.Encode()
		u = uu.String()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return "", err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("external oauth get auth url: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("external oauth get auth url: status %d: %s", resp.StatusCode, string(body))
	}

	var out struct {
		AuthURL string `json:"auth_url"`
		State   string `json:"state"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", fmt.Errorf("parse auth url response: %w", err)
	}
	if out.AuthURL == "" {
		return "", fmt.Errorf("external oauth: empty auth_url")
	}
	return out.AuthURL, nil
}

// ExchangeCode 用授权码换取 token
func (c *Client) ExchangeCode(ctx context.Context, provider oauth2.Provider, code string) (*TokenResponse, error) {
	payload := map[string]string{
		"provider": string(provider),
		"code":     code,
	}
	return c.doJSON(ctx, fmt.Sprintf(pathExchange), payload)
}

// RefreshToken 用 refresh_token 换取新 token
func (c *Client) RefreshToken(ctx context.Context, provider oauth2.Provider, refreshToken string) (*TokenResponse, error) {
	payload := map[string]string{
		"provider":      string(provider),
		"refresh_token": refreshToken,
	}
	return c.doJSON(ctx, fmt.Sprintf(pathRefresh), payload)
}

func (c *Client) callbackURL(provider oauth2.Provider) string {
	return fmt.Sprintf("%s/oauth/callback/%s", c.baseURL, provider)
}

func (c *Client) doJSON(ctx context.Context, path string, payload map[string]string) (*TokenResponse, error) {
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("external oauth %s: %w", path, err)
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("external oauth %s: status %d: %s", path, resp.StatusCode, string(respBody))
	}
	var tok TokenResponse
	if err := json.Unmarshal(respBody, &tok); err != nil {
		return nil, fmt.Errorf("parse token response: %w", err)
	}
	return &tok, nil
}
