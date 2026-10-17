package main

import (
	"fmt"
	"github.com/lzmail/backend/internal/api"
	"github.com/lzmail/backend/internal/config"
	"github.com/lzmail/backend/internal/crypto"
	"github.com/lzmail/backend/internal/external_oauth"
	"github.com/lzmail/backend/internal/oauth2"
	"github.com/lzmail/backend/internal/providers"
	"github.com/lzmail/backend/internal/sse"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sync"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// loopbackHosts 表示同源本地访问，CORS 允许这类 Origin 反射。
func isLoopbackHost(host string) bool {
	h := strings.ToLower(host)
	if h == "localhost" || h == "127.0.0.1" || h == "::1" || h == "[::1]" {
		return true
	}
	if i := strings.LastIndex(h, ":"); i >= 0 {
		h = h[:i]
	}
	return h == "localhost" || h == "127.0.0.1" || h == "[::1]"
}

// corsMiddleware 仅对同源/回环/显式白名单来源反射 Origin，杜绝任意站点跨源读取。
func corsMiddleware(next http.Handler) http.Handler {
	// ALLOWED_ORIGINS 环境变量支持额外白名单（逗号分隔，精确匹配）。
	allowed := map[string]bool{}
	for _, o := range strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",") {
		if tr := strings.TrimSpace(o); tr != "" {
			allowed[tr] = true
		}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		reflectOrigin := false
		switch {
		case origin == "":
			reflectOrigin = true // 非浏览器/同源请求无需 CORS
		case origin == "null":
			reflectOrigin = true // file:// 页面 Origin 为 null
		case allowed[origin]:
			reflectOrigin = true
		default:
			if u, err := url.Parse(origin); err == nil {
				if isLoopbackHost(u.Host) {
					reflectOrigin = true
				}
			}
		}
		if reflectOrigin {
			if origin == "" {
				origin = "*"
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func ensureDir(path string) {
	if err := os.MkdirAll(path, 0755); err != nil {
		log.Fatal(err)
	}
}

func main() {
	cfg := config.Load()
	log.Println("lzmail backend starting...")

	ensureDir(cfg.DataDir)
	ensureDir(cfg.ArchiveDir)
	crypto.SetKeyFile(filepath.Join(cfg.DataDir, "encryption.key"))

	db, err := store.OpenDB(cfg.DataDir + "/lzmail.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	accountStore := store.NewAccountStore(db)
	emailStore := store.NewEmailStore(db)
	contactStore := store.NewContactStore(db)
	settingsStore := store.NewSettingsStore(db)
	scheduledStore := store.NewScheduledStore(db)
	api.ScheduledStoreInstance = scheduledStore

	// Allow archive path override via settings
	archiveDir := cfg.ArchiveDir
	if settings, err := settingsStore.GetAll(); err == nil {
		if p, ok := settings["archive_path"]; ok && p != "" {
			archiveDir = p
		}
		// 初始化 storage_limit_bytes 默认值，避免统计显示 0
		if _, has := settings["storage_limit_bytes"]; !has || settings["storage_limit_bytes"] == "0" {
			settingsStore.Set("storage_limit_bytes", fmt.Sprintf("%d", cfg.StorageLimit))
		}
	}
	ensureDir(archiveDir)

	sseHub := sse.NewHub()
	go sseHub.Run()

	oauthManager := setupOAuth(cfg, accountStore)
	syncEngine := sync.NewEngine(emailStore, archiveDir, sseHub, oauthManager, contactStore, settingsStore)
	accounts, err := accountStore.List()
	if err != nil {
		log.Printf("[WARN] failed to list accounts on startup: %v", err)
	}
	syncEngine.StartAll(accounts)

	handler := api.NewHandler(accountStore, emailStore, contactStore, settingsStore, db, sseHub, archiveDir, syncEngine, oauthManager)
	mux := http.NewServeMux()
	handler.Register(mux)

	wrapped := corsMiddleware(api.LoggingMiddleware(api.PathRewriteMiddleware(mux)))

	addr := net.JoinHostPort(cfg.Host, cfg.Port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           wrapped,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      300 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	log.Println("listening on", addr)
	go runCleanupJob(accountStore, emailStore, settingsStore)
	log.Fatal(srv.ListenAndServe())
}

// runCleanupJob 定期清理已过期的已删除邮件（Trash 文件夹）。
func runCleanupJob(accountStore *store.AccountStore, emailStore *store.EmailStore, settingsStore *store.SettingsStore) {
	ticker := time.NewTicker(6 * time.Hour)
	defer ticker.Stop()
	// 启动时也执行一次
	go doCleanup(accountStore, emailStore, settingsStore)
	for range ticker.C {
		doCleanup(accountStore, emailStore, settingsStore)
	}
}

func doCleanup(accountStore *store.AccountStore, emailStore *store.EmailStore, settingsStore *store.SettingsStore) {
	settings, err := settingsStore.GetAll()
	if err != nil {
		log.Printf("[cleanup] get settings failed: %v", err)
		return
	}
	daysStr := settings["auto_cleanup_days"]
	if daysStr == "" || daysStr == "0" {
		return
	}
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		return
	}
	cutoff := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	accounts, err := accountStore.List()
	if err != nil {
		log.Printf("[cleanup] list accounts failed: %v", err)
		return
	}
	total := int64(0)
	for _, a := range accounts {
		n, err := emailStore.DeleteExpiredTrash(a.ID, cutoff)
		if err != nil {
			log.Printf("[cleanup] account %d failed: %v", a.ID, err)
			continue
		}
		total += n
	}
	if total > 0 {
		log.Printf("[cleanup] deleted %d expired trash emails (>%d days)", total, days)
	}
}

func setupOAuth(cfg *config.Config, accountStore *store.AccountStore) *providers.Manager {
	var oauthSvc *oauth2.OAuth2Service
	var external *external_oauth.Client

	if cfg.ExternalOAuthServerEnabled && cfg.ExternalOAuthServerURL != "" {
		external = external_oauth.NewClient(external_oauth.ServerConfig{BaseURL: cfg.ExternalOAuthServerURL}, []oauth2.Provider{oauth2.ProviderGmail, oauth2.ProviderOutlook})
		log.Println("OAuth2: using external server", cfg.ExternalOAuthServerURL)
	} else {
		configs := oauth2.NewStandardOAuth2Config(cfg.OAuthRedirectURL, cfg.ClientCredentials)
		if len(configs.GetSupportedProviders()) > 0 {
			oauthSvc = oauth2.NewOAuth2Service(configs)
			log.Println("OAuth2: using built-in credentials for providers", configs.GetSupportedProviders())
		}
	}

	if oauthSvc == nil && external == nil {
		log.Println("OAuth2: disabled (set EXTERNAL_OAUTH_SERVER_URL or provider client credentials)")
		return nil
	}
	return providers.NewManager(oauthSvc, external, accountStore)
}
