package api

import (
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/smtp"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/lzmail/backend/internal/archive"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/sasl"
	"github.com/lzmail/backend/internal/store"
)

type ComposeAttachment struct {
	Filename string `json:"filename"`
	Path     string `json:"path"`
}

type ComposeRequest struct {
	AccountID   int64               `json:"account_id"`
	To          string              `json:"to"`
	Cc          string              `json:"cc"`
	Bcc         string              `json:"bcc"`
	Subject     string              `json:"subject"`
	BodyText    string              `json:"body_text"`
	BodyHTML    string              `json:"body_html"`
	ScheduleAt  *time.Time          `json:"schedule_at,omitempty"`
	Draft       bool                `json:"draft,omitempty"`
	Attachments []ComposeAttachment `json:"attachments,omitempty"`
}

// processScheduledJobs 轮询数据库中的待发送任务并执行。
// 定时任务持久化在 scheduled_emails 表，重启后不丢失。
func processScheduledJobs() {
	const workerCount = 3
	jobCh := make(chan store.ScheduledEmail, 20)
	var wg sync.WaitGroup
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[send] worker panic recovered: %v", r)
				}
			}()
			for job := range jobCh {
				if err := executeJob(&job); err != nil {
					log.Printf("[send] scheduled job %d failed: %v", job.ID, err)
					if ScheduledStoreInstance != nil {
						ScheduledStoreInstance.SetStatus(job.ID, "failed")
					}
					continue
				}
				if ScheduledStoreInstance != nil {
					ScheduledStoreInstance.SetStatus(job.ID, "sent")
				}
				log.Printf("[send] scheduled email sent: account %d -> %s", job.AccountID, job.To)
			}
		}()
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if ScheduledStoreInstance == nil {
			continue
		}
		jobs, err := ScheduledStoreInstance.Due(time.Now())
		if err != nil {
			log.Printf("[send] load scheduled jobs failed: %v", err)
			continue
		}
		for _, j := range jobs {
			jobCh <- j
		}
	}
	// drain: close channel and wait for workers to finish current jobs
	close(jobCh)
	wg.Wait()
}

func init() {
	go processScheduledJobs()
}

func executeJob(job *store.ScheduledEmail) error {
	if AccountStoreInstance == nil {
		return fmt.Errorf("account store not initialized")
	}
	account, err := AccountStoreInstance.GetByID(job.AccountID)
	if err != nil {
		return fmt.Errorf("account %d not found", job.AccountID)
	}

	var atts []ComposeAttachment
	if job.AttachmentsJSON != "" {
		if err := json.Unmarshal([]byte(job.AttachmentsJSON), &atts); err != nil {
			return fmt.Errorf("parse attachments: %w", err)
		}
	}
	validated, err := validateAttachmentPaths(uploadDirOf(""), atts)
	if err != nil {
		return err
	}

	msg := buildMessage(account.Email, job.To, job.Cc, job.Subject, job.BodyText, job.BodyHTML, validated)

	addr := fmt.Sprintf("%s:%d", account.SMTPHost, account.SMTPPort)
	host := account.SMTPHost

	auth, err := buildSMTPAuth(account, host)
	if err != nil {
		return err
	}

	recipients := splitEmails(job.To)
	if job.Cc != "" {
		recipients = append(recipients, splitEmails(job.Cc)...)
	}
	if job.Bcc != "" {
		recipients = append(recipients, splitEmails(job.Bcc)...)
	}
	if err := sendMail(addr, auth, account.Email, recipients, msg); err != nil {
		return err
	}
	return nil
}

func buildMessage(from, to, cc, subject, bodyText, bodyHTML string, attachments []ComposeAttachment) []byte {
	headers := make(map[string]string)
	headers["From"] = from
	headers["To"] = to
	headers["Subject"] = encodeHeader(subject)
	headers["MIME-Version"] = "1.0"
	headers["Date"] = time.Now().Format(time.RFC1123Z)

	if cc != "" {
		headers["Cc"] = cc
	}

	var msg strings.Builder

	if len(attachments) == 0 {
		return buildSinglePart(headers, bodyText, bodyHTML)
	}

	// With attachments: multipart/mixed wrapping an alternative part + attachments.
	svcBoundary := "=_" + randomHex(16)
	altBoundary := "=_alt_" + randomHex(16)
	headers["Content-Type"] = fmt.Sprintf(`multipart/mixed; boundary="%s"`, svcBoundary)

	for k, v := range headers {
		msg.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msg.WriteString("\r\n")
	msg.WriteString(fmt.Sprintf("--%s\r\n", svcBoundary))
	msg.WriteString("Content-Type: multipart/alternative; boundary=\"" + altBoundary + "\"\r\n\r\n")

	if bodyText != "" {
		msg.WriteString(fmt.Sprintf("--%s\r\n", altBoundary))
		msg.WriteString("Content-Type: text/plain; charset=utf-8\r\n")
		msg.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
		msg.WriteString(encodeBase64(bodyText))
		msg.WriteString("\r\n\r\n")
	}

	if bodyHTML != "" {
		msg.WriteString(fmt.Sprintf("--%s\r\n", altBoundary))
		msg.WriteString("Content-Type: text/html; charset=utf-8\r\n")
		msg.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
		msg.WriteString(encodeBase64(bodyHTML))
		msg.WriteString("\r\n\r\n")
	}
	msg.WriteString(fmt.Sprintf("--%s--\r\n", altBoundary))
	msg.WriteString("\r\n")

	for _, att := range attachments {
		msg.WriteString(fmt.Sprintf("--%s\r\n", svcBoundary))
		msg.WriteString(fmt.Sprintf("Content-Type: application/octet-stream; name=\"%s\"\r\n", encodeHeader(att.Filename)))
		msg.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=\"%s\"\r\n", att.Filename))
		msg.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
		b, err := os.ReadFile(att.Path)
		if err == nil && len(b) > 0 {
			msg.WriteString(encodeBase64(string(b)))
		}
		msg.WriteString("\r\n\r\n")
	}
	msg.WriteString(fmt.Sprintf("--%s--\r\n", svcBoundary))
	return []byte(msg.String())
}

func buildSinglePart(headers map[string]string, bodyText, bodyHTML string) []byte {
	var msg strings.Builder
	boundary := fmt.Sprintf("=_%d", time.Now().UnixNano())
	headers["Content-Type"] = fmt.Sprintf(`multipart/alternative; boundary="%s"`, boundary)

	for k, v := range headers {
		msg.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msg.WriteString("\r\n")

	if bodyText != "" {
		msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		msg.WriteString("Content-Type: text/plain; charset=utf-8\r\n")
		msg.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
		msg.WriteString(encodeBase64(bodyText))
		msg.WriteString("\r\n\r\n")
	}

	if bodyHTML != "" {
		msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		msg.WriteString("Content-Type: text/html; charset=utf-8\r\n")
		msg.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
		msg.WriteString(encodeBase64(bodyHTML))
		msg.WriteString("\r\n\r\n")
	}

	msg.WriteString(fmt.Sprintf("--%s--\r\n", boundary))
	return []byte(msg.String())
}

func encodeBase64(s string) string {
	const maxLine = 76
	encoded := base64.StdEncoding.EncodeToString([]byte(s))
	var result strings.Builder
	result.Grow((len(encoded)+maxLine-1)/maxLine*maxLine + (len(encoded)+maxLine-1)/maxLine*2)
	for i := 0; i < len(encoded); i += maxLine {
		end := i + maxLine
		if end > len(encoded) {
			end = len(encoded)
		}
		result.WriteString(encoded[i:end])
		result.WriteString("\r\n")
	}
	return result.String()
}

func randomHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%0*d", n*2, time.Now().UnixNano())
	}
	return fmt.Sprintf("%x", b)
}

func encodeHeader(s string) string {
	if needsEncoding(s) {
		encoded := base64.StdEncoding.EncodeToString([]byte(s))
		return fmt.Sprintf("=?utf-8?B?%s?=", encoded)
	}
	return s
}

func needsEncoding(s string) bool {
	for _, r := range s {
		if r > 127 {
			return true
		}
	}
	return false
}

// uploadDirOf 返回上传附件专用目录（独立于邮件归档目录，避免混放）。
func uploadDirOf(base string) string {
	return filepath.Join(base, "uploads")
}

// validateAttachmentPaths 校验所有附件路径都位于上传目录内，并返回规范化后的绝对路径。
// 防止客户端伪造 path 读取服务器任意文件并夹带发送（C5）。
func validateAttachmentPaths(uploadDir string, atts []ComposeAttachment) ([]ComposeAttachment, error) {
	if uploadDir == "" {
		uploadDir = uploadDirOf(ArchiveDirInstance)
	}
	root, err := filepath.Abs(uploadDir)
	if err != nil {
		return nil, err
	}
	out := make([]ComposeAttachment, len(atts))
	for i, a := range atts {
		if a.Path == "" {
			return nil, fmt.Errorf("attachment %q has empty path", a.Filename)
		}
		abs, err := filepath.Abs(a.Path)
		if err != nil {
			return nil, fmt.Errorf("attachment %q invalid path: %w", a.Filename, err)
		}
		if abs != root && !strings.HasPrefix(abs, root+string(os.PathSeparator)) {
			return nil, fmt.Errorf("attachment %q outside upload directory", a.Filename)
		}
		out[i] = a
	}
	return out, nil
}

func safeFileName(name string) string {
	base := filepath.Base(name)
	base = strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			return r
		case r == '.' || r == '_' || r == '-':
			return r
		}
		return '_'
	}, base)
	return base
}

func (h *Handler) handleUploadAttachment(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(50 << 20)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "file too large"})
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	defer file.Close()

	uploadDir := uploadDirOf(h.archiveDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	filename := filepath.Join(uploadDir, fmt.Sprintf("%d_%s", time.Now().UnixNano(), safeFileName(header.Filename)))
	dst, err := os.Create(filename)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer dst.Close()
	size, err := io.Copy(dst, file)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id":        time.Now().UnixNano(),
		"filename":  header.Filename,
		"mime_type": header.Header.Get("Content-Type"),
		"size":      size,
		"path":      filename,
	})
}

func (h *Handler) persistOutgoing(account *models.Account, req *ComposeRequest, folder string, when time.Time) {
	var path string
	var preview string
	msg := buildMessage(account.Email, req.To, req.Cc, req.Subject, req.BodyText, req.BodyHTML, req.Attachments)
	uid := uint32(time.Now().UnixNano() % 0xFFFFFFFF)
	if len(msg) > 0 {
		w := archive.NewWriter(h.archiveDir)
		if p, err := w.Save(req.AccountID, uid, when, msg); err == nil {
			path = p
		}
	}
	preview = previewFromText(req.BodyText)
	h.emails.InsertSent(&models.Email{
		AccountID:     req.AccountID,
		UID:           uid,
		Folder:        folder,
		Subject:       req.Subject,
		From:          account.Email,
		To:            req.To,
		Date:          when,
		IsRead:        true,
		BodyPreview:   preview,
		HasAttachments: len(req.Attachments) > 0,
		ArchivePath:   path,
		MessageID:     fmt.Sprintf("<%d.%s>", time.Now().UnixNano(), account.Email),
	})
}

func previewFromText(text string) string {
	fields := strings.Fields(text)
	joined := strings.Join(fields, " ")
	runes := []rune(joined)
	if len(runes) > 200 {
		joined = string(runes[:200]) + "…"
	}
	return joined
}

func (h *Handler) handleCompose(w http.ResponseWriter, r *http.Request) {
	var req ComposeRequest
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}

	account, err := h.accounts.GetByID(req.AccountID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "account not found"})
		return
	}

	validated, err := validateAttachmentPaths(uploadDirOf(h.archiveDir), req.Attachments)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	req.Attachments = validated

	// Save as draft: persist locally (including body), do NOT send over SMTP.
	if req.Draft {
		h.persistOutgoing(account, &req, "Drafts", time.Now())
		if h.sseHub != nil {
			h.sseHub.Publish("mail:updated", `{"draft":"saved"}`)
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "draft_saved"})
		return
	}

	addr := fmt.Sprintf("%s:%d", account.SMTPHost, account.SMTPPort)
	host := account.SMTPHost

	auth, err := buildSMTPAuth(account, host)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	recipients := splitEmails(req.To)
	if req.Cc != "" {
		recipients = append(recipients, splitEmails(req.Cc)...)
	}
	if req.Bcc != "" {
		recipients = append(recipients, splitEmails(req.Bcc)...)
	}

	sendDate := time.Now()
	if req.ScheduleAt != nil && req.ScheduleAt.After(time.Now()) {
		if ScheduledStoreInstance == nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "scheduler not available"})
			return
		}
		attJSON, _ := json.Marshal(req.Attachments)
		if _, err := ScheduledStoreInstance.Create(req.AccountID, req.To, req.Cc, req.Bcc, req.Subject, req.BodyText, req.BodyHTML, string(attJSON), *req.ScheduleAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		h.persistOutgoing(account, &req, "Drafts", *req.ScheduleAt)

		writeJSON(w, http.StatusOK, map[string]string{"status": "scheduled", "send_at": req.ScheduleAt.Format(time.RFC3339)})
		return
	}

	msg := buildMessage(account.Email, req.To, req.Cc, req.Subject, req.BodyText, req.BodyHTML, req.Attachments)

	if err := sendMail(addr, auth, account.Email, recipients, msg); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("send failed: %v", err)})
		return
	}

	h.persistOutgoing(account, &req, "Sent", sendDate)

	if h.sseHub != nil {
		d, _ := json.Marshal(map[string]string{"to": req.To, "subject": req.Subject})
		h.sseHub.Publish("mail:sent", string(d))
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "sent", "to": req.To, "subject": req.Subject})
}

func buildSMTPAuth(account *models.Account, host string) (smtp.Auth, error) {
	if account.IsOAuth2() {
		if OAuthManagerInstance == nil {
			return nil, fmt.Errorf("oauth2 not configured")
		}
		ts := OAuthManagerInstance.TokenSource(account)
		if ts == nil {
			return nil, fmt.Errorf("oauth2 token source unavailable")
		}
		accessToken, err := ts.GetAccessToken()
		if err != nil {
			return nil, fmt.Errorf("get oauth2 token failed: %w", err)
		}
		return sasl.NewXOAUTH2Auth(account.Username, accessToken), nil
	}
	return smtp.PlainAuth("", account.Username, account.Password, host), nil
}

func sendMail(addr string, a smtp.Auth, from string, to []string, msg []byte) error {
	host, portStr, err := net.SplitHostPort(addr)
	if err != nil {
		return fmt.Errorf("invalid addr %s: %w", addr, err)
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return fmt.Errorf("invalid port in %s: %w", addr, err)
	}

	var c *smtp.Client
	var conn net.Conn

	if port == 465 {
		conn, err = tls.Dial("tcp", addr, &tls.Config{ServerName: host, InsecureSkipVerify: false})
	} else {
		conn, err = net.Dial("tcp", addr)
	}
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}

	c, err = smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("client: %w", err)
	}
	defer c.Close()

	if port != 465 {
		if ok, _ := c.Extension("STARTTLS"); ok {
			if err := c.StartTLS(&tls.Config{ServerName: host}); err != nil {
				return fmt.Errorf("starttls: %w", err)
			}
		}
	}

	if a != nil {
		if err := c.Auth(a); err != nil {
			return fmt.Errorf("auth: %w", err)
		}
	}

	if err := c.Mail(from); err != nil {
		return fmt.Errorf("mail from: %w", err)
	}
	for _, t := range to {
		if err := c.Rcpt(t); err != nil {
			return fmt.Errorf("rcpt %s: %w", t, err)
		}
	}

	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("data: %w", err)
	}
	_, err = w.Write(msg)
	if err != nil {
		return fmt.Errorf("write: %w", err)
	}
	err = w.Close()
	if err != nil {
		return fmt.Errorf("close: %w", err)
	}
	return c.Quit()
}

func splitEmails(s string) []string {
	parts := strings.Split(s, ",")
	var res []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			res = append(res, p)
		}
	}
	return res
}
