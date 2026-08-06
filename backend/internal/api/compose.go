package api

import (
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
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/lzmail/backend/internal/models"
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

type scheduledJob struct {
	mu          sync.Mutex
	accountID   int64
	to          string
	cc          string
	bcc         string
	subject     string
	bodyText    string
	bodyHTML    string
	attachments []ComposeAttachment
	sendDate    time.Time
	sent        bool
}

var (
	scheduledJobs   = make(map[int64]*scheduledJob)
	scheduledJobsMu sync.Mutex
)

func processScheduledJobs() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		scheduledJobsMu.Lock()
		for id, job := range scheduledJobs {
			if job.sent || job.sendDate.After(now) {
				continue
			}
			job.mu.Lock()
			job.sent = true
			job.mu.Unlock()
			go func(jobID int64) {
				scheduledJobsMu.Lock()
				j := scheduledJobs[jobID]
				scheduledJobsMu.Unlock()
				if j == nil {
					return
				}
				executeJob(j)
				scheduledJobsMu.Lock()
				delete(scheduledJobs, jobID)
				scheduledJobsMu.Unlock()
			}(id)
		}
		scheduledJobsMu.Unlock()
	}
}

func executeJob(job *scheduledJob) {
	account, err := AccountStoreInstance.GetByID(job.accountID)
	if err != nil {
		log.Printf("[send] scheduled job: account %d not found", job.accountID)
		return
	}

	msg := buildMessage(account.Email, job.to, job.cc, job.subject, job.bodyText, job.bodyHTML, job.attachments)

	addr := fmt.Sprintf("%s:%d", account.SMTPHost, account.SMTPPort)
	host := account.SMTPHost

	var auth smtp.Auth
	if account.AuthType == "plain" {
		auth = smtp.PlainAuth("", account.Username, account.Password, host)
	} else {
		auth = smtp.PlainAuth("", account.Username, account.Password, host)
	}

	recipients := splitEmails(job.to)
	if job.cc != "" {
		recipients = append(recipients, splitEmails(job.cc)...)
	}
	if job.bcc != "" {
		recipients = append(recipients, splitEmails(job.bcc)...)
	}
	if err := sendMail(addr, auth, account.Email, recipients, msg); err != nil {
		log.Printf("[send] scheduled job %d failed: %v", job.accountID, err)
		return
	}
	log.Printf("[send] scheduled email sent: %s -> %s", account.Email, job.to)
}

func init() {
	go processScheduledJobs()
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
	svcBoundary := fmt.Sprintf("=_%d", time.Now().UnixNano())
	altBoundary := fmt.Sprintf("=_alt_%d", time.Now().UnixNano())
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
	encoded := make([]byte, len(s)*4/3+3)
	n := 0
	for i := 0; i < len(s); i += maxLine {
		end := i + maxLine
		if end > len(s) {
			end = len(s)
		}
		n += copy(encoded[n:], s[i:end])
		encoded[n] = '\r'
		n++
		encoded[n] = '\n'
		n++
	}
	return string(encoded[:n])
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

	os.MkdirAll(h.archiveDir, 0755)
	filename := path.Join(h.archiveDir, fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(header.Filename)))
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

	insertRecord := func(folder string, when time.Time) {
		h.emails.InsertSent(&models.Email{
			AccountID: req.AccountID,
			UID:       uint32(time.Now().UnixNano() % 0xFFFFFFFF),
			Folder:    folder,
			Subject:   req.Subject,
			From:      account.Email,
			To:        req.To,
			Date:      when,
			IsRead:    true,
			IsStarred: false,
			MessageID: fmt.Sprintf("<%d.%s>", time.Now().UnixNano(), account.Email),
		})
	}

	// Save as draft: persist locally, do NOT send over SMTP.
	if req.Draft {
		insertRecord("Drafts", time.Now())
		if h.sseHub != nil {
			h.sseHub.Publish("mail:updated", `{"draft":"saved"}`)
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "draft_saved"})
		return
	}

	msg := buildMessage(account.Email, req.To, req.Cc, req.Subject, req.BodyText, req.BodyHTML, req.Attachments)

	addr := fmt.Sprintf("%s:%d", account.SMTPHost, account.SMTPPort)
	host := account.SMTPHost

	var auth smtp.Auth
	if account.AuthType == "plain" {
		auth = smtp.PlainAuth("", account.Username, account.Password, host)
	} else {
		auth = smtp.PlainAuth("", account.Username, account.Password, host)
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
		scheduledJobsMu.Lock()
		jobID := time.Now().UnixNano()
		scheduledJobs[jobID] = &scheduledJob{
			accountID: req.AccountID,
			to:        req.To,
			cc:        req.Cc,
			bcc:       req.Bcc,
			subject:   req.Subject,
			bodyText:  req.BodyText,
			bodyHTML:  req.BodyHTML,
			sendDate:  *req.ScheduleAt,
			attachments: req.Attachments,
		}
		scheduledJobsMu.Unlock()

		insertRecord("Drafts", *req.ScheduleAt)

		writeJSON(w, http.StatusOK, map[string]string{"status": "scheduled", "send_at": req.ScheduleAt.Format(time.RFC3339)})
		return
	}

	if err := sendMail(addr, auth, account.Email, recipients, msg); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("send failed: %v", err)})
		return
	}

	insertRecord("Sent", sendDate)

	if h.sseHub != nil {
		d, _ := json.Marshal(map[string]string{"to": req.To, "subject": req.Subject})
		h.sseHub.Publish("mail:sent", string(d))
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "sent", "to": req.To, "subject": req.Subject})
}

func sendMail(addr string, a smtp.Auth, from string, to []string, msg []byte) error {
	host, _, _ := net.SplitHostPort(addr)
	portStr := strings.Split(addr, ":")[1]
	port, _ := strconv.Atoi(portStr)

	var c *smtp.Client
	var conn net.Conn
	var err error

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
