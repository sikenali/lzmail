package config

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

type Config struct {
	Port         string
	DataDir      string
	ArchiveDir   string
	StorageLimit int64 // bytes, default 50GB

	// OAuth2
	ExternalOAuthServerEnabled bool
	ExternalOAuthServerURL     string
	OAuthRedirectURL           string

	// OAuth2 客户端凭据（provider 使用，可选）
	ClientCredentials map[string]ClientCredentials
}

type ClientCredentials struct {
	ClientID     string
	ClientSecret string
}

func defaultArchiveDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(home, "Documents", "lzmail", "data")
	default:
		return filepath.Join(home, "lzmail", "data")
	}
}

func Load() *Config {
	return &Config{
		Port:       getEnv("PORT", "8080"),
		DataDir:    getEnv("DATA_DIR", "./data"),
		ArchiveDir: getEnv("ARCHIVE_DIR", defaultArchiveDir()),
		StorageLimit: func() int64 {
			v := getEnv("STORAGE_LIMIT_GB", "50")
			var gb int64
			fmt.Sscanf(v, "%d", &gb)
			if gb <= 0 {
				gb = 50
			}
			return gb * 1024 * 1024 * 1024
		}(),
		ExternalOAuthServerEnabled: getEnv("EXTERNAL_OAUTH_SERVER_ENABLED", "false") == "true",
		ExternalOAuthServerURL:     getEnv("EXTERNAL_OAUTH_SERVER_URL", ""),
		OAuthRedirectURL:           getEnv("OAUTH_REDIRECT_URL", "http://localhost:8080"),
		ClientCredentials: map[string]ClientCredentials{
			"gmail": {
				ClientID:     getEnv("GMAIL_CLIENT_ID", ""),
				ClientSecret: getEnv("GMAIL_CLIENT_SECRET", ""),
			},
			"outlook": {
				ClientID:     getEnv("OUTLOOK_CLIENT_ID", ""),
				ClientSecret: getEnv("OUTLOOK_CLIENT_SECRET", ""),
			},
		},
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
