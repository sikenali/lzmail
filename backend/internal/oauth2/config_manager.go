package oauth2

import (
	"fmt"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"golang.org/x/oauth2/microsoft"

	"github.com/lzmail/backend/internal/config"
)

// Provider 支持的 OAuth2 邮件服务商
type Provider string

const (
	ProviderGmail   Provider = "gmail"
	ProviderOutlook Provider = "outlook"
	ProviderCustom  Provider = "custom"
)

func ParseProvider(s string) (Provider, error) {
	switch Provider(strings.ToLower(s)) {
	case ProviderGmail:
		return ProviderGmail, nil
	case ProviderOutlook:
		return ProviderOutlook, nil
	case ProviderCustom:
		return ProviderCustom, nil
	}
	return "", fmt.Errorf("unsupported oauth2 provider: %s", s)
}

// OAuth2Config 描述一个服务商的 OAuth2 配置
type OAuth2Config struct {
	Provider     Provider
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
	Config       *oauth2.Config
}

// OAuth2ConfigManager 管理各服务商的 OAuth2 配置
type OAuth2ConfigManager interface {
	GetConfig(provider Provider) (*OAuth2Config, bool)
	GetSupportedProviders() []Provider
}

type StandardOAuth2Config struct {
	configs map[Provider]*OAuth2Config
}

// NewStandardOAuth2Config 根据凭据构建标准配置管理器
func NewStandardOAuth2Config(redirectURL string, credentials map[string]config.ClientCredentials) OAuth2ConfigManager {
	m := &StandardOAuth2Config{configs: map[Provider]*OAuth2Config{}}

	register := func(provider Provider, authURL, tokenURL string, scopes []string, creds config.ClientCredentials) {
		if creds.ClientID == "" {
			return
		}
		m.configs[provider] = &OAuth2Config{
			Provider:     provider,
			ClientID:     creds.ClientID,
			ClientSecret: creds.ClientSecret,
			RedirectURL:  redirectURL,
			Scopes:       scopes,
			Config: &oauth2.Config{
				ClientID:     creds.ClientID,
				ClientSecret: creds.ClientSecret,
				RedirectURL:  redirectURL,
				Scopes:       scopes,
				Endpoint:     oauth2.Endpoint{AuthURL: authURL, TokenURL: tokenURL},
			},
		}
	}

	gmailScopes := []string{
		"https://mail.google.com/",
		"https://www.googleapis.com/auth/gmail.modify",
	}
	register(ProviderGmail, google.Endpoint.AuthURL, google.Endpoint.TokenURL, gmailScopes, credentials["gmail"])

	outlookScopes := []string{
		"https://outlook.office.com/IMAP.AccessAsUser.All",
		"https://outlook.office.com/SMTP.Send",
		"https://graph.microsoft.com/User.Read",
		"offline_access",
	}
	register(ProviderOutlook, microsoft.AzureADEndpoint("common").AuthURL, microsoft.AzureADEndpoint("common").TokenURL, outlookScopes, credentials["outlook"])

	return m
}

func (m *StandardOAuth2Config) GetConfig(provider Provider) (*OAuth2Config, bool) {
	cfg, ok := m.configs[provider]
	return cfg, ok
}

func (m *StandardOAuth2Config) GetSupportedProviders() []Provider {
	var providers []Provider
	for p := range m.configs {
		providers = append(providers, p)
	}
	return providers
}
