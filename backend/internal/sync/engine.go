package sync

import (
	"fmt"
	"sync"

	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/providers"
	"github.com/lzmail/backend/internal/sse"
	"github.com/lzmail/backend/internal/store"
)

const maxConcurrentSyncs = 3 // 限制同时同步的账号数，避免IMAP连接风暴

type Engine struct {
	mu           sync.Mutex
	syncers      map[int64]*Syncer
	emailStore   *store.EmailStore
	archiveDir   string
	sseHub       *sse.Hub
	oauth        *providers.Manager
	syncSem      chan struct{} // 限制并发同步数
	contactStore *store.ContactStore
	settings     *store.SettingsStore
}

func NewEngine(emailStore *store.EmailStore, archiveDir string, sseHub *sse.Hub, oauth *providers.Manager, contactStore *store.ContactStore, settings *store.SettingsStore) *Engine {
	return &Engine{
		syncers:      make(map[int64]*Syncer),
		emailStore:   emailStore,
		archiveDir:   archiveDir,
		sseHub:       sseHub,
		oauth:        oauth,
		syncSem:      make(chan struct{}, maxConcurrentSyncs),
		contactStore: contactStore,
		settings:     settings,
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
	s := NewSyncer(account, e.emailStore, e.archiveDir, e.sseHub, tokenSource).WithContactStore(e.contactStore).WithSyncSem(e.syncSem)
	// 应用代理设置
	if e.settings != nil {
		if ps, err := e.settings.GetAll(); err == nil {
			s.WithProxySettings(ps["proxy_mode"], ps["proxy_host"], ps["proxy_port"])
			s.WithProxyProto(ps["proxy_proto"])
		}
	}
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
	syncers := make([]*Syncer, 0, len(e.syncers))
	for _, s := range e.syncers {
		syncers = append(syncers, s)
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
	if !ok {
		return
	}
	go s.ForceSync()
}

type SyncStatus struct {
	Status string `json:"status"`
	Mode   string `json:"mode"`
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

// StatusDetails 返回每个账号的详细同步状态（含模式）。
func (e *Engine) StatusDetails() map[int64]SyncStatus {
	e.mu.Lock()
	defer e.mu.Unlock()
	details := make(map[int64]SyncStatus, len(e.syncers))
	for id, s := range e.syncers {
		details[id] = SyncStatus{
			Status: s.Status(),
			Mode:   modeLabel(s.account.UseIDLE),
		}
	}
	return details
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
