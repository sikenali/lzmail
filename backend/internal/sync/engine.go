package sync

import (
	"sync"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sse"
)

type Engine struct {
	mu         sync.Mutex
	syncers    map[int64]*Syncer
	emailStore *store.EmailStore
	archiveDir string
	sseHub     *sse.Hub
}

func NewEngine(emailStore *store.EmailStore, archiveDir string, sseHub *sse.Hub) *Engine {
	return &Engine{
		syncers:    make(map[int64]*Syncer),
		emailStore: emailStore,
		archiveDir: archiveDir,
		sseHub:     sseHub,
	}
}

func (e *Engine) AddAccount(account *models.Account) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if _, exists := e.syncers[account.ID]; exists {
		return
	}
	s := NewSyncer(account, e.emailStore, e.archiveDir, e.sseHub)
	s.Start()
	e.syncers[account.ID] = s
}

func (e *Engine) RemoveAccount(accountID int64) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if s, ok := e.syncers[accountID]; ok {
		s.Stop()
		delete(e.syncers, accountID)
	}
}

func (e *Engine) StartAll(accounts []models.Account) {
	for i := range accounts {
		e.AddAccount(&accounts[i])
	}
}
