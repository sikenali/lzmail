package sync

import (
	"crypto/tls"
	"fmt"
	"log"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sse"
)

const (
	maxRetryBackoff = 5 * time.Minute
	minRetryBackoff = 10 * time.Second
	retryMultiplier = 2.0
)

type Syncer struct {
	account    *models.Account
	emailStore *store.EmailStore
	archiveDir string
	sseHub     *sse.Hub
	stopCh     chan struct{}
	doneCh     chan struct{}
	statusMu   sync.RWMutex
	status     string
}

func NewSyncer(account *models.Account, emailStore *store.EmailStore, archiveDir string, sseHub *sse.Hub) *Syncer {
	return &Syncer{
		account:    account,
		emailStore: emailStore,
		archiveDir: archiveDir,
		sseHub:     sseHub,
		stopCh:     make(chan struct{}),
		doneCh:     make(chan struct{}),
		status:     "ok",
	}
}

func (s *Syncer) setStatus(status string) {
	s.statusMu.Lock()
	s.status = status
	s.statusMu.Unlock()
}

func (s *Syncer) Status() string {
	s.statusMu.RLock()
	defer s.statusMu.RUnlock()
	return s.status
}

func (s *Syncer) Start() {
	go s.run()
}

// ForceSync triggers an immediate sync of all folders in the background.
// It is safe to run concurrently with the periodic sync loop.
func (s *Syncer) ForceSync() {
	select {
	case <-s.stopCh:
		return
	default:
	}
	s.syncAllFolders()
}

func (s *Syncer) Stop() {
	close(s.stopCh)
	<-s.doneCh
}

func (s *Syncer) run() {
	defer close(s.doneCh)

	syncOnce := func() {
		s.syncAllFolders()
	}

	if s.account.UseIDLE {
		s.idleLoop(syncOnce)
	} else {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		syncOnce()
		for {
			select {
			case <-s.stopCh:
				return
			case <-ticker.C:
				syncOnce()
			}
		}
	}
}

func (s *Syncer) idleLoop(syncOnce func()) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			return
		default:
		}

		if err := s.idleSync(); err != nil {
			log.Printf("[sync] account %s idle failed: %v", s.account.Email, err)
		}

		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			syncOnce()
		}
	}
}

func (s *Syncer) idleSync() error {
	c, err := s.connect()
	if err != nil {
		return err
	}
	defer c.Logout()

	if _, err := c.Select("INBOX", false); err != nil {
		return fmt.Errorf("select INBOX: %w", err)
	}

	done := make(chan error, 1)
	go func() {
		done <- c.Idle(s.stopCh, nil)
	}()

	select {
	case err := <-done:
		if err != nil && !strings.Contains(err.Error(), "use of closed network connection") {
			return err
		}
		s.syncAllFolders()
		return nil
	case <-s.stopCh:
		return nil
	}
}

func (s *Syncer) syncAllFolders() {
	s.publishSync("syncing")
	folders, err := s.listFolders()
	if err != nil {
		log.Printf("[sync] account %s list folders failed: %v", s.account.Email, err)
		folders = []string{"INBOX"}
		s.publishSync("error")
	}

	for _, folder := range folders {
		select {
		case <-s.stopCh:
			return
		default:
		}
		if strings.Contains(folder, "Drafts") || strings.Contains(folder, "Sent") || strings.Contains(folder, "Trash") || strings.Contains(folder, "Archive") {
			continue
		}
		s.syncFolder(folder)
	}
	s.publishSync("ok")
}

func (s *Syncer) publishSync(status string) {
	s.setStatus(status)
	if s.sseHub == nil {
		return
	}
	s.sseHub.Publish("sync:status", fmt.Sprintf(`{"account_id":%d,"status":%q}`, s.account.ID, status))
}

func (s *Syncer) listFolders() ([]string, error) {
	c, err := s.connect()
	if err != nil {
		return nil, err
	}
	defer c.Logout()

	ch := make(chan *imap.MailboxInfo, 64)
	errCh := make(chan error, 1)
	go func() {
		errCh <- c.List("", "*", ch)
		close(ch)
	}()

	var folders []string
	for m := range ch {
		name := m.Name
		if !strings.Contains(name, "Drafts") && !strings.Contains(name, "Sent") && !strings.Contains(name, "Trash") && !strings.Contains(name, "Archive") {
			folders = append(folders, name)
		}
	}
	return folders, <-errCh
}

func (s *Syncer) syncFolder(folder string) {
	c, err := s.connect()
	if err != nil {
		log.Printf("[sync] account %s (%s) connect failed: %v", s.account.Email, s.account.Name, err)
		return
	}
	defer c.Logout()

	mbox, err := c.Select(folder, false)
	if err != nil {
		log.Printf("[sync] account %s select %s failed: %v", s.account.Email, folder, err)
		return
	}

	if mbox.Messages == 0 {
		return
	}

	lastUID := s.emailStore.GetLastUIDByFolder(s.account.ID, folder)

	var from uint32
	if lastUID > 0 && lastUID < mbox.Messages {
		from = lastUID + 1
	} else {
		from = uint32(1)
		if mbox.Messages > 50 {
			from = mbox.Messages - 50
		}
	}

	if from > mbox.Messages {
		return
	}

	seqset := new(imap.SeqSet)
	seqset.AddRange(from, mbox.Messages)

	messages := make(chan *imap.Message, 10)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, []imap.FetchItem{imap.FetchEnvelope, imap.FetchFlags, imap.FetchBodyStructure, imap.FetchUid}, messages)
	}()

	for msg := range messages {
		if msg.Envelope == nil {
			continue
		}
		email := &models.Email{
			AccountID:   s.account.ID,
			UID:         msg.Uid,
			Folder:      folder,
			Subject:     msg.Envelope.Subject,
			Date:        msg.Envelope.Date,
			IsRead:      !hasFlag(msg.Flags, "\\Seen"),
			BodyPreview: extractBodyPreview(msg),
		}
		if len(msg.Envelope.From) > 0 {
			email.From = msg.Envelope.From[0].Address()
		}
		if len(msg.Envelope.To) > 0 {
			email.To = joinAddresses(msg.Envelope.To)
		}
		if err := s.emailStore.Upsert(email); err != nil {
			log.Printf("[sync] account %s upsert failed: %v", s.account.Email, err)
		}
	}

	if err := <-done; err != nil {
		log.Printf("[sync] account %s fetch failed: %v", s.account.Email, err)
	}

	if mbox.Messages > 0 {
		if err := s.emailStore.SaveLastUID(s.account.ID, folder, mbox.Messages); err != nil {
			log.Printf("[sync] account %s save last UID failed: %v", s.account.Email, err)
		}
	}
}

func (s *Syncer) connect() (*client.Client, error) {
	backoff := minRetryBackoff
	maxAttempts := 3

	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			log.Printf("[sync] account %s reconnecting in %v (attempt %d/%d)", s.account.Email, backoff, attempt+1, maxAttempts)
			select {
			case <-time.After(backoff):
				backoff = time.Duration(math.Min(float64(backoff)*retryMultiplier, float64(maxRetryBackoff)))
			case <-s.stopCh:
				return nil, fmt.Errorf("stopped")
			}
		}

		addr := fmt.Sprintf("%s:%d", s.account.IMAPHost, s.account.IMAPPort)
		var c *client.Client
		var err error
		if s.account.IMAPPort == 993 {
			c, err = client.DialTLS(addr, &tls.Config{ServerName: s.account.IMAPHost, InsecureSkipVerify: false})
		} else {
			c, err = client.Dial(addr)
			if err == nil {
				err = c.StartTLS(&tls.Config{ServerName: s.account.IMAPHost, InsecureSkipVerify: false})
			}
		}
		if err != nil {
			continue
		}
		if err := c.Login(s.account.Username, s.account.Password); err != nil {
			c.Logout()
			continue
		}
		return c, nil
	}
	return nil, fmt.Errorf("failed to connect after %d attempts", maxAttempts)
}

func extractBodyPreview(msg *imap.Message) string {
	body, ok := msg.Items[imap.FetchBodyStructure]
	if !ok {
		return ""
	}
	bs, ok := body.(*imap.BodyStructure)
	if !ok || bs == nil {
		return ""
	}
	// Try to get text body preview from the envelope if available
	if msg.Envelope != nil && msg.Envelope.Subject != "" {
		return msg.Envelope.Subject
	}
	return ""
}

func hasFlag(flags []string, flag string) bool {
	for _, f := range flags {
		if strings.EqualFold(f, flag) {
			return true
		}
	}
	return false
}

func joinAddresses(addrs []*imap.Address) string {
	var parts []string
	for _, a := range addrs {
		parts = append(parts, a.Address())
	}
	return strings.Join(parts, ", ")
}
