package oauth2

import "fmt"

// OAuth2Service 聚合配置管理与各服务商 client
type OAuth2Service struct {
	configs OAuth2ConfigManager
	clients map[Provider]OAuth2Client
}

func NewOAuth2Service(configs OAuth2ConfigManager) *OAuth2Service {
	svc := &OAuth2Service{
		configs: configs,
		clients: map[Provider]OAuth2Client{},
	}
	for _, p := range configs.GetSupportedProviders() {
		if cfg, ok := configs.GetConfig(p); ok {
			svc.clients[p] = NewStandardOAuth2Client(p, cfg)
		}
	}
	return svc
}

// GetConfig 返回服务商配置
func (s *OAuth2Service) GetConfig(provider Provider) (*OAuth2Config, bool) {
	return s.configs.GetConfig(provider)
}

// GetClient 返回服务商 OAuth2 client
func (s *OAuth2Service) GetClient(provider Provider) (OAuth2Client, error) {
	c, ok := s.clients[provider]
	if !ok {
		return nil, fmt.Errorf("oauth2 client not configured for provider %s", provider)
	}
	return c, nil
}

// SupportedProviders 返回已配置凭据的服务商列表
func (s *OAuth2Service) SupportedProviders() []Provider {
	return s.configs.GetSupportedProviders()
}
