package sync

import (
	"fmt"
	"sync"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/providers"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sse"
)

type Engine struct {
	mu         sync.Mutex
	syncers    map[int64]*Syncer
	emailStore *store.EmailStore
	archiveDir string
	sseHub     *sse.Hub
	oauth      *providers.Manager
}

func NewEngine(emailStore *store.EmailStore, archiveDir string, sseHub *sse.Hub, oauth *providers.Manager) *Engine {
	return &Engine{
		syncers:    make(map[int64]*Syncer),
		emailStore: emailStore,
		archiveDir: archiveDir,
		sseHub:     sseHub,
		oauth:      oauth,
	}
}

func (e *Engine) AddAccount(account *models.Account) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if _, exists := e.syncers[account.ID]; exists {
		return
	}
	var tokenSource *providers.TokenSource
	if e.oauth != nil {
		tokenSource = e.oauth.TokenSource(account)
	}
	s := NewSyncer(account, e.emailStore, e.archiveDir, e.sseHub, tokenSource)
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

func (e *Engine) RefreshAll() {
	e.mu.Lock()
	syncers := make(map[int64]*Syncer, len(e.syncers))
	for id, s := range e.syncers {
		syncers[id] = s
	}
	e.mu.Unlock()
	for _, s := range syncers {
		go s.ForceSync()
	}
}

func (e *Engine) RefreshAccount(accountID int64) {
	e.mu.Lock()
	s, ok := e.syncers[accountID]
	e.mu.Unlock()
	if ok {
		go s.ForceSync()
	}
}

func (e *Engine) Statuses() map[int64]string {
	e.mu.Lock()
	defer e.mu.Unlock()
	statuses := make(map[int64]string, len(e.syncers))
	for id, s := range e.syncers {
		statuses[id] = s.Status()
	}
	return statuses
}

func (e *Engine) ApplyFlag(accountID int64, folder string, uid uint32, flag string, set bool) error {
	e.mu.Lock()
	s, ok := e.syncers[accountID]
	e.mu.Unlock()
	if !ok {
		return fmt.Errorf("account %d not found", accountID)
	}
	return s.ApplyFlag(folder, uid, flag, set)
}

func (e *Engine) MoveMessage(accountID int64, srcFolder string, uid uint32, destFolder string) error {
	e.mu.Lock()
	s, ok := e.syncers[accountID]
	e.mu.Unlock()
	if !ok {
		return fmt.Errorf("account %d not found", accountID)
	}
	return s.MoveMessage(srcFolder, uid, destFolder)
}

func (e *Engine) DeleteMessage(accountID int64, folder string, uid uint32) error {
	e.mu.Lock()
	s, ok := e.syncers[accountID]
	e.mu.Unlock()
	if !ok {
		return fmt.Errorf("account %d not found", accountID)
	}
	return s.DeleteMessage(folder, uid)
}
