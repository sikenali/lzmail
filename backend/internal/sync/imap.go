package sync

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/lzmail/backend/internal/archive"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/providers"
	"github.com/lzmail/backend/internal/sasl"
	"github.com/lzmail/backend/internal/sse"
	"github.com/lzmail/backend/internal/store"
	"regexp"
)

const (
	maxRetryBackoff = 5 * time.Minute
	minRetryBackoff = 10 * time.Second
	retryMultiplier = 2.0
)

type Syncer struct {
	account     *models.Account
	emailStore  *store.EmailStore
	contactStore *store.ContactStore
	archiveDir  string
	sseHub      *sse.Hub
	tokenSource *providers.TokenSource
	syncMu      sync.Mutex
	stopCh      chan struct{}
	doneCh      chan struct{}
	statusMu    sync.RWMutex
	status      string
}

func NewSyncer(account *models.Account, emailStore *store.EmailStore, archiveDir string, sseHub *sse.Hub, tokenSource *providers.TokenSource) *Syncer {
	return &Syncer{
		account:     account,
		emailStore:  emailStore,
		archiveDir:  archiveDir,
		sseHub:      sseHub,
		tokenSource: tokenSource,
		stopCh:      make(chan struct{}),
		doneCh:      make(chan struct{}),
		status:      "ok",
	}
}

func (s *Syncer) WithContactStore(cs *store.ContactStore) *Syncer {
	s.contactStore = cs
	return s
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

// Stop 关闭同步循环并等待退出。为避免在网络调用卡死时永久阻塞，
// 最多等待 5 秒（I7）。
func (s *Syncer) Stop() {
	select {
	case <-s.stopCh:
	default:
		close(s.stopCh)
	}
	select {
	case <-s.doneCh:
	case <-time.After(5 * time.Second):
		log.Printf("[sync] account %s stop timed out after 5s", s.account.Email)
	}
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
	s.syncMu.Lock()
	defer s.syncMu.Unlock()
	s.publishSync("syncing")
	folders, err := s.listFolders()
	if err != nil {
		log.Printf("[sync] account %s list folders failed: %v", s.account.Email, err)
		folders = []string{"INBOX"}
		s.publishSync("error")
	}

	for i, folder := range folders {
		select {
		case <-s.stopCh:
			return
		default:
		}
		s.publishProgress("syncing", folder, 0, 0, len(folders), i)
		s.syncFolder(folder, len(folders), i)
	}
	s.syncContactsFolder()
	s.publishSync("ok")
}

type syncProgress struct {
	AccountID    int64  `json:"account_id"`
	Status       string `json:"status"`
	Folder       string `json:"folder,omitempty"`
	Total        int    `json:"total,omitempty"`
	Processed    int    `json:"processed,omitempty"`
	FoldersTotal int    `json:"folders_total,omitempty"`
	FoldersDone  int    `json:"folders_done,omitempty"`
}

func (s *Syncer) publishSync(status string) {
	s.setStatus(status)
	if s.sseHub == nil {
		return
	}
	s.publishProgress(status, "", 0, 0, 0, -1)
}

func (s *Syncer) publishProgress(status, folder string, total, processed, foldersTotal, foldersDone int) {
	if s.sseHub == nil {
		return
	}
	payload := syncProgress{
		AccountID:    s.account.ID,
		Status:       status,
		Folder:       folder,
		Total:        total,
		Processed:    processed,
		FoldersTotal: foldersTotal,
		FoldersDone:  foldersDone,
	}
	b, _ := json.Marshal(payload)
	s.sseHub.Publish("sync:status", string(b))
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
		// c.List closes ch when done; do not close again
	}()

	var folders []string
	for m := range ch {
		folders = append(folders, m.Name)
	}
	return folders, <-errCh
}

// syncFolder 增量同步单个文件夹：用 UID 识别缺失消息，仅对新增/无正文的消息
// 抓取 RFC822 正文，其余只刷新已读/星标标志。
func (s *Syncer) syncContactsFolder() {
	if s.contactStore == nil {
		return
	}
	c, err := s.connect()
	if err != nil {
		log.Printf("[sync] account %s contacts connect failed: %v", s.account.Email, err)
		return
	}
	defer c.Logout()

	contactsFolder := s.findContactsFolder(c)
	if contactsFolder == "" {
		return
	}

	mbox, err := c.Select(contactsFolder, false)
	if err != nil {
		log.Printf("[sync] account %s select %s failed: %v", s.account.Email, contactsFolder, err)
		return
	}
	if mbox.Messages == 0 {
		return
	}

	seqset := new(imap.SeqSet)
	seqset.AddRange(1, mbox.Messages)

	metaCh := make(chan *imap.Message, 10)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, []imap.FetchItem{imap.FetchEnvelope, imap.FetchUid, "RFC822"}, metaCh)
	}()

	var needBody []uint32
	for msg := range metaCh {
		if msg.Uid == 0 {
			continue
		}
		needBody = append(needBody, msg.Uid)
	}
	if err := <-done; err != nil {
		log.Printf("[sync] account %s contacts fetch meta failed: %v", s.account.Email, err)
		return
	}

	if len(needBody) == 0 {
		return
	}

	bodySet := new(imap.SeqSet)
	bodySet.AddNum(needBody...)
	bodyCh := make(chan *imap.Message, 5)
	bodyDone := make(chan error, 1)
	go func() {
		bodyDone <- c.Fetch(bodySet, []imap.FetchItem{"RFC822"}, bodyCh)
	}()

	for msg := range bodyCh {
		lit, ok := msg.Items["RFC822"].(imap.Literal)
		if !ok {
			continue
		}
		raw, err := io.ReadAll(lit)
		if err != nil {
			log.Printf("[sync] account %s contacts read failed: %v", s.account.Email, err)
			continue
		}
		contacts := parseVCard(raw)
		for _, contact := range contacts {
			contact.AccountID = s.account.ID
			if contact.Email == "" {
				continue
			}
			if err := s.contactStore.Create(&contact); err != nil {
				log.Printf("[sync] account %s contacts upsert failed: %v", s.account.Email, err)
			}
		}
	}
	if err := <-bodyDone; err != nil {
		log.Printf("[sync] account %s contacts fetch body failed: %v", s.account.Email, err)
	}
}

func (s *Syncer) findContactsFolder(c *client.Client) string {
	patterns := []string{"CONTACTS", "ADDRESS BOOK", "-addressbook", "Contacts", "Contacts/"}
	ch := make(chan *imap.MailboxInfo, 32)
	errCh := make(chan error, 1)
	go func() { errCh <- c.List("", "*", ch) }()
	for m := range ch {
		name := m.Name
		for _, pat := range patterns {
			if strings.EqualFold(name, pat) || strings.Contains(strings.ToUpper(name), "CONTACT") || strings.Contains(strings.ToUpper(name), "ADDRESS BOOK") {
				return name
			}
		}
	}
	<-errCh
	return ""
}

var vcardRe = regexp.MustCompile(`(?mi)^((?:FN|EMAIL|TEL|NOTE):[^\r\n]*(?:\r?\n[ \t].+)*)`)

func parseVCard(raw []byte) []models.Contact {
	var contacts []models.Contact
	entries := strings.Split(string(raw), "END:VCARD")
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if !strings.Contains(entry, "BEGIN:VCARD") {
			continue
		}
		c := models.Contact{}
		lines := strings.Split(entry, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if !strings.Contains(line, ":") {
				continue
			}
			colon := strings.Index(line, ":")
			key := line[:colon]
			value := strings.TrimSpace(line[colon+1:])
			key = regexp.MustCompile(`;[A-Z]+=.`).ReplaceAllString(key, "")
			switch {
			case strings.HasPrefix(key, "FN:") || key == "FN":
				c.Name = value
			case strings.HasPrefix(key, "EMAIL") || key == "EMAIL":
				c.Email = value
			case strings.HasPrefix(key, "TEL") || key == "TEL":
				c.Phone = value
			}
		}
		if c.Email != "" {
			contacts = append(contacts, c)
		}
	}
	return contacts
}

// syncFolder 增量同步单个文件夹：用 UID 识别缺失消息，仅对新增/无正文的消息
// 抓取 RFC822 正文，其余只刷新已读/星标标志。
func (s *Syncer) syncFolder(folder string, foldersTotal, foldersDone int) {
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

	seqset := new(imap.SeqSet)
	seqset.AddRange(1, mbox.Messages)

	metaCh := make(chan *imap.Message, 10)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, []imap.FetchItem{imap.FetchEnvelope, imap.FetchFlags, imap.FetchUid}, metaCh)
	}()

	existing, err := s.emailStore.UIDsWithBody(s.account.ID, folder)
	if err != nil {
		log.Printf("[sync] account %s load existing uids failed: %v", s.account.Email, err)
		existing = map[uint32]bool{}
	}

	var needBody []uint32
	for msg := range metaCh {
		if msg.Envelope == nil {
			continue
		}
		email := &models.Email{
			AccountID:   s.account.ID,
			UID:         msg.Uid,
			Folder:      folder,
			Subject:     msg.Envelope.Subject,
			Date:        msg.Envelope.Date,
			IsRead:      hasFlag(msg.Flags, "\\Seen"),
			IsStarred:   hasFlag(msg.Flags, "\\Flagged"),
			BodyPreview: "",
		}
		if len(msg.Envelope.From) > 0 {
			email.From = msg.Envelope.From[0].Address()
			email.FromName = msg.Envelope.From[0].PersonalName
		}
		if len(msg.Envelope.To) > 0 {
			email.To = joinAddresses(msg.Envelope.To)
		}
		if !existing[msg.Uid] {
			needBody = append(needBody, msg.Uid)
			if _, err := s.emailStore.Upsert(email); err != nil {
				log.Printf("[sync] account %s upsert failed: %v", s.account.Email, err)
			}
			continue
		}
		if err := s.emailStore.UpdateFlags(s.account.ID, msg.Uid, folder, email.IsRead, email.IsStarred); err != nil {
			log.Printf("[sync] account %s update flags failed: %v", s.account.Email, err)
		}
	}
	if err := <-done; err != nil {
		log.Printf("[sync] account %s fetch failed: %v", s.account.Email, err)
	}

	if len(needBody) > 0 {
		s.fetchBodies(c, folder, needBody, foldersTotal, foldersDone)
	}
}

const bodyBatchSize = 200

// fetchBodies 分批抓取指定 UID 的 RFC822 原文，落盘并解析正文预览与附件。
// 每批完成后发布进度事件，避免一次性拉取海量正文导致内存与服务端压力过大。
func (s *Syncer) fetchBodies(c *client.Client, folder string, uids []uint32, foldersTotal, foldersDone int) {
	total := len(uids)
	processed := 0
	for start := 0; start < total; start += bodyBatchSize {
		end := start + bodyBatchSize
		if end > total {
			end = total
		}
		batch := uids[start:end]

		set := new(imap.SeqSet)
		set.AddNum(batch...)

		bodyCh := make(chan *imap.Message, 5)
		done := make(chan error, 1)
		go func() {
			done <- c.UidFetch(set, []imap.FetchItem{imap.FetchUid, imap.FetchRFC822}, bodyCh)
		}()
		for msg := range bodyCh {
			lit, ok := msg.Items[imap.FetchRFC822].(imap.Literal)
			if !ok {
				continue
			}
			raw, err := io.ReadAll(lit)
			if err != nil {
				log.Printf("[sync] account %s read body uid=%d failed: %v", s.account.Email, msg.Uid, err)
				continue
			}
			s.saveBody(folder, msg.Uid, raw)
		}
		if err := <-done; err != nil {
			log.Printf("[sync] account %s fetch bodies failed: %v", s.account.Email, err)
		}

		processed = end
		s.publishProgress("syncing", folder, total, processed, foldersTotal, foldersDone)
	}
}

// saveBody 保存 .eml 与附件，并把正文信息写回数据库。
func (s *Syncer) saveBody(folder string, uid uint32, raw []byte) {
	w := archive.NewWriter(s.archiveDir)

	parsed, err := archive.Parse(raw)
	if err != nil {
		log.Printf("[sync] account %s parse body uid=%d failed: %v", s.account.Email, uid, err)
		parsed = &archive.Parsed{Date: time.Now().UTC()}
	}

	path, err := w.Save(s.account.ID, uid, parsed.Date, raw)
	if err != nil {
		log.Printf("[sync] account %s save eml uid=%d failed: %v", s.account.Email, uid, err)
		return
	}

	id, err := s.emailStore.UpdateBody(s.account.ID, uid, folder, parsed.Preview, parsed.HasAttachments, path)
	if err != nil {
		log.Printf("[sync] account %s update body uid=%d failed: %v", s.account.Email, uid, err)
		return
	}

	if !parsed.HasAttachments {
		return
	}
	atts := make([]models.Attachment, 0, len(parsed.Attachments))
	for i, a := range parsed.Attachments {
		attPath, err := w.SaveAttachment(s.account.ID, uid, i, a.Filename, a.Content)
		if err != nil {
			log.Printf("[sync] account %s save attachment uid=%d failed: %v", s.account.Email, uid, err)
			continue
		}
		atts = append(atts, models.Attachment{
			Filename: a.Filename,
			MimeType: a.MimeType,
			Size:     a.Size,
			Path:     attPath,
		})
	}
	if len(atts) == 0 {
		return
	}
	if err := s.emailStore.ReplaceAttachments(id, atts); err != nil {
		log.Printf("[sync] account %s save attachments uid=%d failed: %v", s.account.Email, uid, err)
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
		dialer := &net.Dialer{Timeout: 15 * time.Second}
		var c *client.Client
		var err error
		if s.account.IMAPPort == 993 {
			c, err = client.DialWithDialerTLS(dialer, addr, &tls.Config{ServerName: s.account.IMAPHost, InsecureSkipVerify: false})
		} else {
			c, err = client.DialWithDialer(dialer, addr)
			if err == nil {
				err = c.StartTLS(&tls.Config{ServerName: s.account.IMAPHost, InsecureSkipVerify: false})
			}
		}
		if err != nil {
			continue
		}
		c.Timeout = 60 * time.Second
		if s.account.IsOAuth2() {
			if s.tokenSource == nil {
				c.Logout()
				continue
			}
			accessToken, err := s.tokenSource.GetAccessToken()
			if err != nil {
				log.Printf("[sync] account %s get oauth2 token failed: %v", s.account.Email, err)
				c.Logout()
				continue
			}
			auth := sasl.NewXOAUTH2(s.account.Username, accessToken)
			if err := c.Authenticate(auth); err != nil {
				c.Logout()
				continue
			}
		} else {
			if err := c.Login(s.account.Username, s.account.Password); err != nil {
				c.Logout()
				continue
			}
		}
		return c, nil
	}
	return nil, fmt.Errorf("failed to connect after %d attempts", maxAttempts)
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
