package providers

import (
	"strings"

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

// providerBrandColor 根据服务商返回品牌色，未知服务商返回默认色
var providerBrandColor = map[string]string{
	"gmail":  "#ea4335",
	"outlook": "#0078d4",
	"qq":     "#12b7f5",
	"netease": "#e53e3e",
	"icloud":  "#7c9a5f",
	"yahoo":   "#721c90",
}

// ApplyDefaults 若账号未填写 IMAP/SMTP 主机或品牌色，则填入服务商预设
func ApplyDefaults(a *models.Account) {
	provider := strings.ToLower(a.Provider)
	// 自动填充品牌色（优先用邮箱域名推断，其次用显式 provider）
	if a.BrandColor == "" {
		if color, ok := providerBrandColor[provider]; ok {
			a.BrandColor = color
		} else {
			// 从邮箱域名推断
			if domain := extractDomain(a.Email); domain != "" {
				for key, color := range providerBrandColor {
					if strings.Contains(domain, key) {
						a.BrandColor = color
						break
					}
				}
			}
		}
	}
	if a.IsOAuth2() {
		p := oauth2.Provider(provider)
		defaults, ok := Defaults(p)
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
}

func extractDomain(email string) string {
	for i := len(email) - 1; i >= 0; i-- {
		if email[i] == '@' {
			return email[i+1:]
		}
	}
	return ""
}
