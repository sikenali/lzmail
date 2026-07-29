package config

import "os"

type Config struct {
	Port       string
	DataDir    string
	ArchiveDir string
}

func Load() *Config {
	return &Config{
		Port:       getEnv("PORT", "8080"),
		DataDir:    getEnv("DATA_DIR", "./data"),
		ArchiveDir: getEnv("ARCHIVE_DIR", "./archives"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
