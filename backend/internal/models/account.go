package models

import (
	"encoding/json"
	"fmt"
	"time"
)

// OAuth2TokenData OAuth2 token 数据，随账号加密存储
type OAuth2TokenData struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	Expiry       time.Time `json:"expiry"`
	Scope        string    `json:"scope"`
	ClientID     string    `json:"client_id"`
}

func (t *OAuth2TokenData) Marshal() (string, error) {
	b, err := json.Marshal(t)
	if err != nil {
		return "", fmt.Errorf("marshal oauth2 token: %w", err)
	}
	return string(b), nil
}

func (t *OAuth2TokenData) Unmarshal(s string) error {
	if s == "" {
		return nil
	}
	if err := json.Unmarshal([]byte(s), t); err != nil {
		return fmt.Errorf("unmarshal oauth2 token: %w", err)
	}
	return nil
}

type Account struct {
	ID          int64            `json:"id"`
	Name        string           `json:"name"`
	Email       string           `json:"email"`
	IMAPHost    string           `json:"imap_host"`
	IMAPPort    int              `json:"imap_port"`
	SMTPHost    string           `json:"smtp_host"`
	SMTPPort    int              `json:"smtp_port"`
	AuthType    string           `json:"auth_type"`
	AuthMethod  string           `json:"auth_method"`
	Provider    string           `json:"provider"`
	Username    string           `json:"username"`
	Password    string           `json:"-"`
	OAuth2Token string           `json:"-"`
	UseIDLE     bool             `json:"use_idle"`
	BrandColor  string           `json:"brand_color"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

func (a *Account) IsOAuth2() bool {
	return a.AuthMethod == "oauth2"
}

func (a *Account) TokenData() (*OAuth2TokenData, error) {
	t := &OAuth2TokenData{}
	if err := t.Unmarshal(a.OAuth2Token); err != nil {
		return nil, err
	}
	return t, nil
}
