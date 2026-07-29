package providers

import (
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/oauth2"
)

// ProviderSettings 服务商预设的 IMAP/SMTP 端点
type ProviderSettings struct {
	IMAPHost string
	IMAPPort int
	SMTPHost string
	SMTPPort int
	UseTLS   bool
}

var providerDefaults = map[oauth2.Provider]ProviderSettings{
	oauth2.ProviderGmail: {
		IMAPHost: "imap.gmail.com",
		IMAPPort: 993,
		SMTPHost: "smtp.gmail.com",
		SMTPPort: 587,
	},
	oauth2.ProviderOutlook: {
		IMAPHost: "outlook.office365.com",
		IMAPPort: 993,
		SMTPHost: "smtp.office365.com",
		SMTPPort: 587,
	},
}

// Defaults 返回服务商预设端点；未知服务商返回空结构
func Defaults(provider oauth2.Provider) (ProviderSettings, bool) {
	s, ok := providerDefaults[provider]
	return s, ok
}

// ApplyDefaults 若账号未填写 IMAP/SMTP 主机，则填入服务商预设
func ApplyDefaults(a *models.Account) {
	provider := oauth2.Provider(a.Provider)
	if !a.IsOAuth2() {
		return
	}
	defaults, ok := Defaults(provider)
	if !ok {
		return
	}
	if a.IMAPHost == "" {
		a.IMAPHost = defaults.IMAPHost
		a.IMAPPort = defaults.IMAPPort
	}
	if a.SMTPHost == "" {
		a.SMTPHost = defaults.SMTPHost
		a.SMTPPort = defaults.SMTPPort
	}
}
