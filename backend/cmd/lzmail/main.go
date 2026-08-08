package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"github.com/lzmail/backend/internal/api"
	"github.com/lzmail/backend/internal/crypto"
	"github.com/lzmail/backend/internal/config"
	"github.com/lzmail/backend/internal/external_oauth"
	"github.com/lzmail/backend/internal/oauth2"
	"github.com/lzmail/backend/internal/providers"
	"github.com/lzmail/backend/internal/sse"
	"github.com/lzmail/backend/internal/sync"
	"github.com/lzmail/backend/internal/store"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Vary", "Origin")
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
	}
	ensureDir(archiveDir)

	sseHub := sse.NewHub()
	go sseHub.Run()

	oauthManager := setupOAuth(cfg, accountStore)
	syncEngine := sync.NewEngine(emailStore, archiveDir, sseHub, oauthManager)
	accounts, err := accountStore.List()
	if err != nil {
		log.Printf("[WARN] failed to list accounts on startup: %v", err)
	}
	syncEngine.StartAll(accounts)

	handler := api.NewHandler(accountStore, emailStore, contactStore, settingsStore, sseHub, archiveDir, syncEngine, oauthManager)
	mux := http.NewServeMux()
	handler.Register(mux)

	wrapped := corsMiddleware(api.LoggingMiddleware(mux))

	addr := ":" + cfg.Port
	log.Println("listening on", addr)
	log.Fatal(http.ListenAndServe(addr, wrapped))
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
