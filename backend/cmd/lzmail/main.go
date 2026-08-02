package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"github.com/lzmail/backend/internal/api"
	"github.com/lzmail/backend/internal/config"
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
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
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
	fmt.Println("lzmail backend starting...")

	ensureDir(cfg.DataDir)
	ensureDir(cfg.ArchiveDir)

	db, err := store.OpenDB(cfg.DataDir + "/lzmail.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	accountStore := store.NewAccountStore(db)
	emailStore := store.NewEmailStore(db)
	contactStore := store.NewContactStore(db)
	settingsStore := store.NewSettingsStore(db)

	sseHub := sse.NewHub()
	go sseHub.Run()

	syncEngine := sync.NewEngine(emailStore, cfg.ArchiveDir, sseHub)
	accounts, _ := accountStore.List()
	syncEngine.StartAll(accounts)

	handler := api.NewHandler(accountStore, emailStore, contactStore, settingsStore, sseHub, cfg.ArchiveDir)
	mux := http.NewServeMux()
	handler.Register(mux)

	wrapped := corsMiddleware(mux)

	addr := ":" + cfg.Port
	fmt.Println("listening on", addr)
	log.Fatal(http.ListenAndServe(addr, wrapped))
}
