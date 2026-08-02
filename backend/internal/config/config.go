package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port         string
	DataDir      string
	ArchiveDir   string
	StorageLimit int64 // bytes, default 50GB
}

func Load() *Config {
	return &Config{
		Port:       getEnv("PORT", "8080"),
		DataDir:    getEnv("DATA_DIR", "./data"),
		ArchiveDir: getEnv("ARCHIVE_DIR", "./archives"),
		StorageLimit: func() int64 {
			v := getEnv("STORAGE_LIMIT_GB", "50")
			var gb int64
			fmt.Sscanf(v, "%d", &gb)
			if gb <= 0 {
				gb = 50
			}
			return gb * 1024 * 1024 * 1024
		}(),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
