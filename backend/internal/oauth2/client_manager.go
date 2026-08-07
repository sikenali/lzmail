package oauth2

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/oauth2"

	"github.com/lzmail/backend/internal/models"
)

// TokenResponse OAuth2 回调返回的 token 数据
type TokenResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	Expiry       time.Time `json:"expiry"`
	Scope        string    `json:"scope"`
}

// OAuth2Client 封装单个服务商的 OAuth2 操作
type OAuth2Client interface {
	Provider() Provider
	GetAuthURL(state string, accessType string) (string, error)
	ExchangeCode(code string, verifier string) (*TokenResponse, error)
	RefreshToken(refreshToken string) (*TokenResponse, error)
	ValidateToken(accessToken string) (bool, error)
	RevokeToken(accessToken string) error
}

// StandardOAuth2Client 基于 golang.org/x/oauth2 的标准实现
type StandardOAuth2Client struct {
	provider Provider
	config   *oauth2.Config
}

func NewStandardOAuth2Client(provider Provider, cfg *OAuth2Config) OAuth2Client {
	return &StandardOAuth2Client{
		provider: provider,
		config:   cfg.Config,
	}
}

func (c *StandardOAuth2Client) Provider() Provider {
	return c.provider
}

func (c *StandardOAuth2Client) GetAuthURL(state, accessType string) (string, error) {
	if c.config == nil {
		return "", fmt.Errorf("oauth2 config not configured for provider %s", c.provider)
	}
	opts := []oauth2.AuthCodeOption{
		oauth2.AccessTypeOffline,
		oauth2.ApprovalForce,
	}
	return c.config.AuthCodeURL(state, opts...), nil
}

func (c *StandardOAuth2Client) ExchangeCode(code, verifier string) (*TokenResponse, error) {
	if c.config == nil {
		return nil, fmt.Errorf("oauth2 config not configured for provider %s", c.provider)
	}
	tok, err := c.config.Exchange(context.Background(), code)
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}
	return tokenToResponse(tok), nil
}

func (c *StandardOAuth2Client) RefreshToken(refreshToken string) (*TokenResponse, error) {
	if c.config == nil {
		return nil, fmt.Errorf("oauth2 config not configured for provider %s", c.provider)
	}
	if refreshToken == "" {
		return nil, fmt.Errorf("refresh token is empty")
	}
	tok := &oauth2.Token{RefreshToken: refreshToken}
	src := c.config.TokenSource(context.Background(), tok)
	newTok, err := src.Token()
	if err != nil {
		return nil, fmt.Errorf("refresh token: %w", err)
	}
	return tokenToResponse(newTok), nil
}

func (c *StandardOAuth2Client) ValidateToken(accessToken string) (bool, error) {
	return accessToken != "", nil
}

func (c *StandardOAuth2Client) RevokeToken(accessToken string) error {
	return nil
}

func tokenToResponse(tok *oauth2.Token) *TokenResponse {
	resp := &TokenResponse{
		AccessToken:  tok.AccessToken,
		RefreshToken: tok.RefreshToken,
		TokenType:    tok.TokenType,
		Expiry:       tok.Expiry,
	}
	if s, ok := tok.Extra("scope").(string); ok {
		resp.Scope = s
	}
	return resp
}

func (r *TokenResponse) ToTokenData() *models.OAuth2TokenData {
	return &models.OAuth2TokenData{
		AccessToken:  r.AccessToken,
		RefreshToken: r.RefreshToken,
		TokenType:    r.TokenType,
		Expiry:       r.Expiry,
		Scope:        r.Scope,
	}
}


