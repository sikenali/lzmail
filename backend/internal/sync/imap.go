package sync

import (
	"crypto/tls"
	"fmt"
	"log"
	"strings"
	"time"
	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sse"
)

type Syncer struct {
	account    *models.Account
	emailStore *store.EmailStore
	archiveDir string
	sseHub     *sse.Hub
	stopCh     chan struct{}
}

func NewSyncer(account *models.Account, emailStore *store.EmailStore, archiveDir string, sseHub *sse.Hub) *Syncer {
	return &Syncer{
		account:    account,
		emailStore: emailStore,
		archiveDir: archiveDir,
		sseHub:     sseHub,
		stopCh:     make(chan struct{}),
	}
}

func (s *Syncer) Start() {
	go func() {
		for {
			select {
			case <-s.stopCh:
				return
			default:
				s.syncFolder("INBOX")
				time.Sleep(5 * time.Minute)
			}
		}
	}()
}

func (s *Syncer) Stop() {
	close(s.stopCh)
}

func (s *Syncer) syncFolder(folder string) {
	c, err := s.connect()
	if err != nil {
		log.Printf("sync: account %s (%s) connect failed: %v", s.account.Email, s.account.Name, err)
		return
	}
	defer c.Logout()

	mbox, err := c.Select(folder, false)
	if err != nil {
		log.Printf("sync: account %s select %s failed: %v", s.account.Email, folder, err)
		return
	}

	if mbox.Messages == 0 {
		return
	}

	from := uint32(1)
	if mbox.Messages > 50 {
		from = mbox.Messages - 50
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
			AccountID: s.account.ID,
			UID:       msg.Uid,
			Folder:    folder,
			Subject:   msg.Envelope.Subject,
			Date:      msg.Envelope.Date,
			IsRead:    !hasFlag(msg.Flags, "\\Seen"),
		}
		if len(msg.Envelope.From) > 0 {
			email.From = msg.Envelope.From[0].Address()
		}
		if len(msg.Envelope.To) > 0 {
			email.To = joinAddresses(msg.Envelope.To)
		}
		s.emailStore.Upsert(email)
	}
	if err := <-done; err != nil {
		log.Printf("sync: account %s fetch failed: %v", s.account.Email, err)
	}
}

func (s *Syncer) connect() (*client.Client, error) {
	addr := fmt.Sprintf("%s:%d", s.account.IMAPHost, s.account.IMAPPort)
	var c *client.Client
	var err error
	if s.account.IMAPPort == 993 {
		c, err = client.DialTLS(addr, &tls.Config{InsecureSkipVerify: false})
	} else {
		c, err = client.Dial(addr)
		if err == nil {
			err = c.StartTLS(&tls.Config{InsecureSkipVerify: false})
		}
	}
	if err != nil {
		return nil, fmt.Errorf("imap dial %s: %w", addr, err)
	}
	if err := c.Login(s.account.Username, s.account.Password); err != nil {
		c.Logout()
		return nil, fmt.Errorf("imap login %s: %w", s.account.Email, err)
	}
	return c, nil
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
