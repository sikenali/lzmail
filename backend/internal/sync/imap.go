package sync

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"net"
	"os"
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
	"golang.org/x/net/proxy"
	"net/url"
	"regexp"
)

const (
	maxRetryBackoff = 5 * time.Minute
	minRetryBackoff = 10 * time.Second
	retryMultiplier = 2.0
)

type Syncer struct {
	account       *models.Account
	emailStore    *store.EmailStore
	contactStore  *store.ContactStore
	archiveDir    string
	sseHub        *sse.Hub
	tokenSource   *providers.TokenSource
	proxyMode     string
	proxyProto    string
	proxyHost     string
	proxyPort     string
	syncMu        sync.Mutex
	stopCh        chan struct{}
	doneCh        chan struct{}
	statusMu      sync.RWMutex
	status        string
	connMu        sync.Mutex
	conn          *client.Client
	sem           chan struct{} // 全局并发闸：限制同时同步的账号数
	contactMaxUID uint32        // 通讯录文件夹已处理的 UID 水线（仅同步循环内访问）
	lastFullScan  map[string]time.Time // 每文件夹上次全量 Envelope 扫描时间
}

const fullEnvelopeScanInterval = 15 * time.Minute // 全量 Envelope 扫描最小间隔

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

func (s *Syncer) WithProxySettings(mode, host, port string) *Syncer {
	s.proxyMode = mode
	s.proxyHost = host
	s.proxyPort = port
	return s
}

func (s *Syncer) WithProxyProto(proto string) *Syncer {
	s.proxyProto = proto
	return s
}

// WithSyncSem 绑定全局并发信号量，周期性/手动同步都受其约束，避免 IMAP 连接风暴。
func (s *Syncer) WithSyncSem(sem chan struct{}) *Syncer {
	s.sem = sem
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

func (s *Syncer) closeDone() {
	select {
	case <-s.doneCh:
	default:
		close(s.doneCh)
	}
}

func (s *Syncer) run() {
	defer s.closeDone()

	// 顶层 recover：任何 panic 都不允许静默杀死同步循环，记录并重试。
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[sync] account %s sync loop panic recovered: %v", s.account.Email, r)
			s.setStatus("error")
			select {
			case <-s.stopCh:
				return
			case <-time.After(10 * time.Second):
				go s.run()
			}
		}
	}()

	syncOnce := func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[sync] account %s syncAllFolders panic recovered: %v", s.account.Email, r)
				s.setStatus("error")
			}
		}()
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
			s.setStatus("error")
			s.publishProgress("error", "", 0, 0, 0, -1)
			// Exponential backoff on error to avoid hammering a down server
			jitter := time.Duration(rand.Intn(5)) * time.Second
			select {
			case <-s.stopCh:
				return
			case <-time.After(10*time.Second + jitter):
			}
			continue
		}
		// idleSync 完成，更新最后同步时间并发布 idle 状态
		s.setStatus("ok")
		s.publishProgress("idle", "", 0, 0, 0, -1)

		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			syncOnce()
		}
	}
}

func (s *Syncer) idleSync() error {
	c, err := s.ensureConn()
	if err != nil {
		return err
	}

	if _, err := c.Select("INBOX", false); err != nil {
		s.closeConn(err)
		return fmt.Errorf("select INBOX: %w", err)
	}

	// 60s IDLE 续期，防止 NAT 路由断连无感知
	done := make(chan error, 1)
	go func() {
		done <- c.Idle(s.stopCh, &client.IdleOptions{LogoutTimeout: 60 * time.Second})
	}()

	select {
	case err := <-done:
		// 先关闭连接、释放 connMu，再执行同步，避免持锁期间调用 syncAllFolders
		lastErr := err
		s.closeConn(lastErr)
		if lastErr != nil && !strings.Contains(lastErr.Error(), "use of closed network connection") {
			return lastErr
		}
		s.syncAllFolders()
		return nil
	case <-s.stopCh:
		s.closeConn(nil)
		return nil
	}
}

func (s *Syncer) syncAllFolders() {
	if s.sem != nil {
		select {
		case s.sem <- struct{}{}:
			defer func() { <-s.sem }()
		case <-s.stopCh:
			return
		}
	}
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
	s.closeConn(nil)
}

type syncProgress struct {
	AccountID    int64  `json:"account_id"`
	Status       string `json:"status"`
	Folder       string `json:"folder,omitempty"`
	Total        int    `json:"total,omitempty"`
	Processed    int    `json:"processed,omitempty"`
	FoldersTotal int    `json:"folders_total,omitempty"`
	FoldersDone  int    `json:"folders_done,omitempty"`
	LastSyncedAt int64  `json:"last_synced_at,omitempty"`
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
		LastSyncedAt: time.Now().Unix(),
	}
	b, _ := json.Marshal(payload)
	s.sseHub.Publish("sync:status", string(b))
}

func (s *Syncer) listFolders() ([]string, error) {
	c, err := s.ensureConn()
	if err != nil {
		return nil, err
	}

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
	c, err := s.ensureConn()
	if err != nil {
		log.Printf("[sync] account %s contacts connect failed: %v", s.account.Email, err)
		return
	}

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

	// 只抓取元数据（Envelope+UID，不含正文），计算 UID 水线并找出新增/更新的消息
	seqset := new(imap.SeqSet)
	seqset.AddRange(1, mbox.Messages)

	metaCh := make(chan *imap.Message, 10)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, []imap.FetchItem{imap.FetchEnvelope, imap.FetchUid}, metaCh)
	}()

	var needBody []uint32
	var maxUID uint32
	for msg := range metaCh {
		if msg.Uid == 0 {
			continue
		}
		if msg.Uid > maxUID {
			maxUID = msg.Uid
		}
		if msg.Uid > s.contactMaxUID {
			needBody = append(needBody, msg.Uid)
		}
	}
	if err := <-done; err != nil {
		log.Printf("[sync] account %s contacts fetch meta failed: %v", s.account.Email, err)
		return
	}
	if maxUID > s.contactMaxUID {
		s.contactMaxUID = maxUID
	}

	if len(needBody) == 0 {
		return
	}

	bodySet := new(imap.SeqSet)
	bodySet.AddNum(needBody...)
	bodyCh := make(chan *imap.Message, 5)
	bodyDone := make(chan error, 1)
	go func() {
		bodyDone <- c.Fetch(bodySet, []imap.FetchItem{imap.FetchUid, "RFC822"}, bodyCh)
	}()

	var newContacts []models.Contact
	for msg := range bodyCh {
		lit := msg.GetBody(&imap.BodySectionName{})
		if lit == nil {
			continue
		}
		raw, err := io.ReadAll(lit)
		if err != nil {
			log.Printf("[sync] account %s contacts read failed: %v", s.account.Email, err)
			continue
		}
		contacts := parseVCard(raw)
		for i := range contacts {
			contacts[i].AccountID = s.account.ID
			if contacts[i].Email == "" {
				continue
			}
			newContacts = append(newContacts, contacts[i])
		}
	}
	if err := <-bodyDone; err != nil {
		log.Printf("[sync] account %s contacts fetch body failed: %v", s.account.Email, err)
	}
	if len(newContacts) > 0 {
		if err := s.contactStore.BatchUpsert(newContacts); err != nil {
			log.Printf("[sync] account %s contacts batch upsert failed: %v", s.account.Email, err)
		}
	}
}

func (s *Syncer) findContactsFolder(c *client.Client) string {
	patterns := []string{"CONTACTS", "ADDRESS BOOK", "-addressbook", "Contacts", "Contacts/", "通讯录", "联系人"}
	ch := make(chan *imap.MailboxInfo, 32)
	errCh := make(chan error, 1)
	go func() { errCh <- c.List("", "*", ch) }()
	for m := range ch {
		name := m.Name
		for _, pat := range patterns {
			if strings.EqualFold(name, pat) || strings.Contains(strings.ToUpper(name), "CONTACT") || strings.Contains(strings.ToUpper(name), "ADDRESS BOOK") ||
				strings.Contains(name, "通讯录") || strings.Contains(name, "联系人") {
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
		currentField := ""
		continuationLine := ""
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			// 续行（以空格或 tab 开头）
			if strings.HasPrefix(line, " ") || strings.HasPrefix(line, "\t") {
				continuationLine += line
				continue
			}
			// 处理上一行的续行
			if currentField != "" && continuationLine != "" {
				line = line + continuationLine
				continuationLine = ""
			}
			colon := strings.Index(line, ":")
			if colon < 0 {
				continue
			}
			rawKey := line[:colon]
			value := strings.TrimSpace(line[colon+1:])
			// 去掉参数（如 EMAIL;TYPE=HOME:）
			key := strings.SplitN(rawKey, ";", 2)[0]
			key = regexp.MustCompile(`;[A-Z]+=.`).ReplaceAllString(key, "")
			switch {
			case strings.EqualFold(key, "FN") || strings.EqualFold(key, "N"):
				if key == "N" {
					parts := strings.Split(value, ";")
					if len(parts) > 0 {
						c.Name = parts[0]
					}
				} else {
					c.Name = value
				}
			case strings.EqualFold(key, "EMAIL"):
				if c.Email == "" {
					c.Email = value
				}
			case strings.EqualFold(key, "TEL"):
				if c.Phone == "" {
					c.Phone = value
				}
			case strings.EqualFold(key, "ORG"):
				c.Company = value
			case strings.EqualFold(key, "TITLE"):
				c.Title = value
			}
			currentField = key
		}
		if currentField != "" && continuationLine != "" {
			// 最后一行有续行，已在上一次迭代中处理
		}
		// 如果只有名字没有邮箱，跳过
		if c.Email == "" && c.Name != "" {
			continue
		}
		contacts = append(contacts, c)
	}
	return contacts
}

// syncFolder 增量同步单个文件夹：用 UID 识别缺失消息，仅对新增/无正文的消息
// 抓取 RFC822 正文，其余只刷新已读/星标标志。
func (s *Syncer) syncFolder(folder string, foldersTotal, foldersDone int) {
	c, err := s.ensureConn()
	if err != nil {
		log.Printf("[sync] account %s (%s) connect failed: %v", s.account.Email, s.account.Name, err)
		return
	}

	mbox, err := c.Select(folder, false)
	if err != nil {
		log.Printf("[sync] account %s select %s failed: %v", s.account.Email, folder, err)
		return
	}
	if mbox.Messages == 0 {
		return
	}

	// 判断是否需要全量 Envelope 扫描：首次、间隔>15分钟、或 ForceSync
	now := time.Now()
	needFullScan := false
	if s.lastFullScan == nil {
		s.lastFullScan = make(map[string]time.Time)
		needFullScan = true
	} else if last, ok := s.lastFullScan[folder]; !ok || now.Sub(last) > fullEnvelopeScanInterval {
		needFullScan = true
	}

	var seqset *imap.SeqSet
	if needFullScan {
		seqset = new(imap.SeqSet)
		seqset.AddRange(1, mbox.Messages)
		s.lastFullScan[folder] = now
	} else {
		// 增量：仅抓取最大已知 UID 之后的消息
		maxUID, _ := s.emailStore.MaxUID(s.account.ID, folder)
		if maxUID > 0 && maxUID < mbox.Messages {
			seqset = new(imap.SeqSet)
			seqset.AddRange(maxUID+1, mbox.Messages)
		} else {
			return // 无新消息
		}
	}

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
	var newEmails []*models.Email
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
			newEmails = append(newEmails, email)
			continue
		}
		if err := s.emailStore.UpdateFlags(s.account.ID, msg.Uid, folder, email.IsRead, email.IsStarred); err != nil {
			log.Printf("[sync] account %s update flags failed: %v", s.account.Email, err)
		}
	}
	if err := <-done; err != nil {
		log.Printf("[sync] account %s fetch failed: %v", s.account.Email, err)
	}

	// 批量 UPSERT 新邮件（减少 DB round-trips）
	if len(newEmails) > 0 {
		if err := s.emailStore.BatchUpsert(newEmails); err != nil {
			log.Printf("[sync] account %s batch upsert failed: %v", s.account.Email, err)
		} else {
			// 通知前端有新邮件
			if s.sseHub != nil {
				for _, email := range newEmails {
					s.sseHub.Publish("mail:new", fmt.Sprintf(`{"id":%d,"account_id":%d}`, email.ID, email.AccountID))
				}
			}
		}
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
			lit := msg.GetBody(&imap.BodySectionName{})
			if lit == nil {
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

	// 保存内嵌图片
	for _, img := range parsed.InlineImages {
		imgPath, err := w.SaveInlineImage(s.account.ID, uid, img.ContentID, img.MimeType, img.Content)
		if err != nil {
			log.Printf("[sync] account %s save inline image uid=%d cid=%s failed: %v", s.account.Email, uid, img.ContentID, err)
			continue
		}
		atts = append(atts, models.Attachment{
			Filename: img.ContentID,
			MimeType: img.MimeType,
			Size:     int64(len(img.Content)),
			Path:     imgPath,
		})
	}
	if err := s.emailStore.ReplaceAttachments(id, atts); err != nil {
		log.Printf("[sync] account %s save inline attachments uid=%d failed: %v", s.account.Email, uid, err)
	}
}

func (s *Syncer) connectOneShot() (*client.Client, error) {
	s.connMu.Lock()
	defer s.connMu.Unlock()
	return s.dialLocked()
}

func (s *Syncer) ensureConn() (*client.Client, error) {
	s.connMu.Lock()
	defer s.connMu.Unlock()
	if s.conn != nil {
		if err := s.conn.Noop(); err == nil {
			return s.conn, nil
		}
		s.conn.Logout()
		s.conn = nil
	}
	c, err := s.dialLocked()
	if err != nil {
		return nil, err
	}
	s.conn = c
	return c, nil
}

func (s *Syncer) closeConn(lastErr error) {
	s.connMu.Lock()
	defer s.connMu.Unlock()
	if s.conn != nil {
		s.conn.Logout()
		s.conn = nil
	}
	if lastErr != nil {
		log.Printf("[sync] account %s conn closed (lastErr=%v)", s.account.Email, lastErr)
	}
}

// preferAddress 优先使用 IPv6，因为部分国内邮箱服务商（如 QQ）对 IPv4 连接有限制。
// 若无 IPv6 地址则退回 IPv4。
func preferAddress(addr string, d *net.Dialer) (string, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return addr, err
	}
	ip := net.ParseIP(host)
	if ip != nil {
		if ip.To4() != nil {
			return addr, nil // 已是 IPv4，直接使用
		}
		return addr, nil // 已是 IPv6，直接使用
	}
	ips, err := net.LookupIP(host)
	if err != nil {
		return addr, err
	}
	// 优先 IPv6
	for _, candidate := range ips {
		if candidate.To4() == nil && candidate.To16() != nil {
			return net.JoinHostPort(candidate.String(), port), nil
		}
	}
	// 无 IPv6，使用 IPv4
	for _, candidate := range ips {
		if v4 := candidate.To4(); v4 != nil {
			return net.JoinHostPort(v4.String(), port), nil
		}
	}
	return addr, nil
}

// dialThroughSOCKS5 通过 SOCKS5 代理建立 TLS 或直接连接
func dialThroughSOCKS5(proxyAddr, targetAddr string, account *models.Account) (*client.Client, error) {
	dialer, err := proxy.SOCKS5("tcp", proxyAddr, nil, &net.Dialer{Timeout: 15 * time.Second})
	if err != nil {
		return nil, err
	}
	if account.IMAPPort == 993 {
		tlsConn := tls.Client(dialer.(net.Conn), &tls.Config{ServerName: account.IMAPHost, InsecureSkipVerify: false})
		if tlsErr := tlsConn.Handshake(); tlsErr != nil {
			return nil, tlsErr
		}
		c, err := client.New(tlsConn)
		if err != nil {
			return nil, err
		}
		if loginErr := c.Login(account.Username, account.Password); loginErr != nil {
			c.Logout()
			return nil, loginErr
		}
		return c, nil
	}
	c, err := client.New(dialer.(net.Conn))
	if err != nil {
		return nil, err
	}
	if loginErr := c.Login(account.Username, account.Password); loginErr != nil {
		c.Logout()
		return nil, loginErr
	}
	return c, nil
}
func getProxyURL() *url.URL {
	for _, key := range []string{"http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY"} {
		if v := os.Getenv(key); v != "" {
			if u, err := url.Parse(v); err == nil {
				return u
			}
		}
	}
	return nil
}

// dialThroughProxy 通过 HTTP CONNECT 隧道建立 IMAP 连接并登录，返回 client
func dialThroughProxy(dialConn net.Conn, account *models.Account) (*client.Client, error) {
	if account.IMAPPort == 993 {
		// HTTPS: 发送 CONNECT 请求建立隧道
		connectReq := fmt.Sprintf("CONNECT %s:%d HTTP/1.1\r\nHost: %s:%d\r\n\r\n",
			account.IMAPHost, account.IMAPPort, account.IMAPHost, account.IMAPPort)
		if _, err := dialConn.Write([]byte(connectReq)); err != nil {
			return nil, err
		}
		buf := make([]byte, 4096)
		dialConn.SetReadDeadline(time.Now().Add(5 * time.Second))
		n, _ := dialConn.Read(buf)
		dialConn.SetReadDeadline(time.Time{})
		resp := string(buf[:n])
		if !strings.Contains(resp, "200") {
			return nil, fmt.Errorf("proxy connect failed: %s", resp)
		}
		tlsConn := tls.Client(dialConn, &tls.Config{ServerName: account.IMAPHost, InsecureSkipVerify: false})
		if tlsErr := tlsConn.Handshake(); tlsErr != nil {
			return nil, tlsErr
		}
		c, err := client.New(tlsConn)
		if err != nil {
			return nil, err
		}
		if loginErr := c.Login(account.Username, account.Password); loginErr != nil {
			c.Logout()
			return nil, loginErr
		}
		return c, nil
	}
	// 非 TLS: 直接通过代理连接
	c, err := client.New(dialConn)
	if err != nil {
		return nil, err
	}
	if loginErr := c.Login(account.Username, account.Password); loginErr != nil {
		c.Logout()
		return nil, loginErr
	}
	return c, nil
}

func (s *Syncer) dialLocked() (*client.Client, error) {
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
		dialer := &net.Dialer{
			Timeout:   15 * time.Second,
			KeepAlive: 30 * time.Second,
		}
		var c *client.Client
		var err error

		// 代理支持
		if s.proxyMode == "custom" && s.proxyHost != "" && s.proxyPort != "" {
			proxyAddr := net.JoinHostPort(s.proxyHost, s.proxyPort)
			if s.proxyProto == "socks5" {
				c, err = dialThroughSOCKS5(proxyAddr, addr, s.account)
			} else {
				dialerConn, connErr := dialer.Dial("tcp", proxyAddr)
				if connErr == nil {
					c, err = dialThroughProxy(dialerConn, s.account)
					if err != nil {
						log.Printf("[sync] account %s proxy connect failed: %v", s.account.Email, err)
					}
				} else {
					err = connErr
				}
			}
		} else if s.proxyMode == "global" {
			// 全局代理：从环境变量读取
			proxyURL := getProxyURL()
			if proxyURL != nil {
				dialConn, connErr := dialer.Dial("tcp", proxyURL.Host)
				if connErr == nil {
					c, err = dialThroughProxy(dialConn, s.account)
					if err != nil {
						log.Printf("[sync] account %s global proxy connect failed: %v", s.account.Email, err)
					}
				} else {
					err = connErr
				}
			}
			// 无环境变量则直连
			if err == nil {
				preferredAddr, resolveErr := preferAddress(addr, dialer)
				if resolveErr == nil {
					addr = preferredAddr
				}
				if s.account.IMAPPort == 993 {
					c, err = client.DialWithDialerTLS(dialer, addr, &tls.Config{ServerName: s.account.IMAPHost, InsecureSkipVerify: false})
				} else {
					c, err = client.DialWithDialer(dialer, addr)
					if err == nil {
						err = c.StartTLS(&tls.Config{ServerName: s.account.IMAPHost, InsecureSkipVerify: false})
					}
				}
			}
		} else {
			preferredAddr, resolveErr := preferAddress(addr, dialer)
			if resolveErr == nil {
				addr = preferredAddr
			}

			if s.account.IMAPPort == 993 {
				c, err = client.DialWithDialerTLS(dialer, addr, &tls.Config{ServerName: s.account.IMAPHost, InsecureSkipVerify: false})
			} else {
				c, err = client.DialWithDialer(dialer, addr)
				if err == nil {
					err = c.StartTLS(&tls.Config{ServerName: s.account.IMAPHost, InsecureSkipVerify: false})
				}
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
				log.Printf("[sync] account %s login failed: %v", s.account.Email, err)
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
