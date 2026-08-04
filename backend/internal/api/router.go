package api

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sse"
)

type rateLimiter struct {
	mu       sync.Mutex
	requests []time.Time
	limit    int
	window   time.Duration
}

func (rl *rateLimiter) allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	idx := 0
	for idx < len(rl.requests) && rl.requests[idx].Before(windowStart) {
		idx++
	}
	rl.requests = rl.requests[idx:]

	if len(rl.requests) >= rl.limit {
		return false
	}
	rl.requests = append(rl.requests, now)
	return true
}

var (
	searchLimiter = &rateLimiter{limit: 20, window: time.Minute}
	listLimiter   = &rateLimiter{limit: 60, window: time.Minute}
)

type logResponseWriter struct {
	w      http.ResponseWriter
	status int
	size   int
}

func (lrw *logResponseWriter) Header() http.Header { return lrw.w.Header() }
func (lrw *logResponseWriter) Write(p []byte) (int, error) {
	n, err := lrw.w.Write(p)
	lrw.size += n
	return n, err
}
func (lrw *logResponseWriter) WriteHeader(status int) {
	lrw.status = status
	lrw.w.WriteHeader(status)
}

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lrw := &logResponseWriter{w: w, status: http.StatusOK}
		next.ServeHTTP(lrw, r)
		log.Printf("[http] %s %s %s %d %dms", r.Method, r.URL.Path, r.RemoteAddr, lrw.status, time.Since(start).Milliseconds())
	})
}

func rateLimitMiddleware(limitter *rateLimiter, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !limitter.allow() {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{"error": "rate limit exceeded"})
			return
		}
		next(w, r)
	}
}

type Handler struct {
	accounts   *store.AccountStore
	emails     *store.EmailStore
	contacts   *store.ContactStore
	settings   *store.SettingsStore
	sseHub     *sse.Hub
	archiveDir string
}

var AccountStoreInstance interface{ GetByID(int64) (*models.Account, error) }
var EmailStoreInstance interface{ InsertSent(*models.Email) error }

func NewHandler(as *store.AccountStore, es *store.EmailStore, cs *store.ContactStore, ss *store.SettingsStore, hub *sse.Hub, archiveDir string) *Handler {
	h := &Handler{accounts: as, emails: es, contacts: cs, settings: ss, sseHub: hub, archiveDir: archiveDir}
	AccountStoreInstance = as
	EmailStoreInstance = es
	return h
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/accounts", rateLimitMiddleware(listLimiter, h.handleListAccounts))
	mux.HandleFunc("POST /api/v1/accounts", h.handleCreateAccount)
	mux.HandleFunc("DELETE /api/v1/accounts/{id}", h.handleDeleteAccount)
	mux.HandleFunc("PATCH /api/v1/accounts/{id}", h.handleUpdateAccount)

	mux.HandleFunc("GET /api/v1/mails", rateLimitMiddleware(listLimiter, h.handleListMails))
	mux.HandleFunc("GET /api/v1/mails/{id}", h.handleGetMail)
	mux.HandleFunc("GET /api/v1/mails/{id}/raw", h.handleRenderMail)
	mux.HandleFunc("PATCH /api/v1/mails/{id}", h.handleMoveMail)
	mux.HandleFunc("POST /api/v1/mails/{id}/read", h.handleMarkRead)
	mux.HandleFunc("POST /api/v1/mails/{id}/star", h.handleMarkStar)
	mux.HandleFunc("DELETE /api/v1/mails/{id}", h.handleDeleteMail)
	mux.HandleFunc("GET /api/v1/mails/{id}/attachments/{attId}", h.handleDownloadAttachment)
	mux.HandleFunc("GET /api/v1/mails/search", rateLimitMiddleware(searchLimiter, h.handleSearchMails))
	mux.HandleFunc("GET /api/v1/mails/trend", h.handleMailTrend)
	mux.HandleFunc("GET /api/v1/mails/stats", h.handleMailStats)

	mux.HandleFunc("POST /api/v1/compose", h.handleCompose)
	mux.HandleFunc("POST /api/v1/compose/attachments", h.handleUploadAttachment)

	mux.HandleFunc("GET /api/v1/contacts", h.handleListContacts)
	mux.HandleFunc("POST /api/v1/contacts", h.handleCreateContact)
	mux.HandleFunc("GET /api/v1/contacts/search", h.handleSearchContacts)

	mux.HandleFunc("GET /api/v1/settings", h.handleGetSettings)
	mux.HandleFunc("POST /api/v1/settings", h.handleUpdateSettings)

	mux.HandleFunc("GET /api/v1/events", h.handleSSE)

	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "time": time.Now().Format(time.RFC3339)})
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
