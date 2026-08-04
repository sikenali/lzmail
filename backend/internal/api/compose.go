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

type ComposeRequest struct {
	AccountID  int64      `json:"account_id"`
	To         string     `json:"to"`
	Cc         string     `json:"cc"`
	Subject    string     `json:"subject"`
	BodyText   string     `json:"body_text"`
	BodyHTML   string     `json:"body_html"`
	ScheduleAt *time.Time `json:"schedule_at,omitempty"`
}

type scheduledJob struct {
	mu          sync.Mutex
	accountID   int64
	to          string
	cc          string
	subject     string
	bodyText    string
	bodyHTML    string
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

	msg := buildMessage(account.Email, job.to, job.cc, job.subject, job.bodyText, job.bodyHTML)

	addr := fmt.Sprintf("%s:%d", account.SMTPHost, account.SMTPPort)
	host := account.SMTPHost

	var auth smtp.Auth
	if account.AuthType == "plain" {
		auth = smtp.PlainAuth("", account.Username, account.Password, host)
	} else {
		auth = smtp.PlainAuth("", account.Username, account.Password, host)
	}

	recipients := splitEmails(job.to)
	if err := sendMail(addr, auth, account.Email, recipients, msg); err != nil {
		log.Printf("[send] scheduled job %d failed: %v", job.accountID, err)
		return
	}
	log.Printf("[send] scheduled email sent: %s -> %s", account.Email, job.to)
}

func init() {
	go processScheduledJobs()
}

func buildMessage(from, to, cc, subject, bodyText, bodyHTML string) []byte {
	headers := make(map[string]string)
	headers["From"] = from
	headers["To"] = to
	headers["Subject"] = encodeHeader(subject)
	headers["MIME-Version"] = "1.0"
	headers["Date"] = time.Now().Format(time.RFC1123Z)

	if cc != "" {
		headers["Cc"] = cc
	}

	boundary := fmt.Sprintf("=_%d", time.Now().UnixNano())
	headers["Content-Type"] = fmt.Sprintf(`multipart/alternative; boundary="%s"`, boundary)

	var msg strings.Builder
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

	msg := buildMessage(account.Email, req.To, req.Cc, req.Subject, req.BodyText, req.BodyHTML)

	addr := fmt.Sprintf("%s:%d", account.SMTPHost, account.SMTPPort)
	host := account.SMTPHost

	var auth smtp.Auth
	if account.AuthType == "plain" {
		auth = smtp.PlainAuth("", account.Username, account.Password, host)
	} else {
		auth = smtp.PlainAuth("", account.Username, account.Password, host)
	}

	recipients := splitEmails(req.To)

	sendDate := time.Now()
	if req.ScheduleAt != nil && req.ScheduleAt.After(time.Now()) {
		scheduledJobsMu.Lock()
		jobID := time.Now().UnixNano()
		scheduledJobs[jobID] = &scheduledJob{
			accountID: req.AccountID,
			to:        req.To,
			cc:        req.Cc,
			subject:   req.Subject,
			bodyText:  req.BodyText,
			bodyHTML:  req.BodyHTML,
			sendDate:  *req.ScheduleAt,
		}
		scheduledJobsMu.Unlock()

		h.emails.InsertSent(&models.Email{
			AccountID: req.AccountID,
			UID:       uint32(time.Now().UnixNano() % 0xFFFFFFFF),
			Folder:    "Drafts",
			Subject:   req.Subject,
			From:      account.Email,
			To:        req.To,
			Date:      *req.ScheduleAt,
			IsRead:    true,
			IsStarred: false,
			MessageID: fmt.Sprintf("<%d.%s>", time.Now().UnixNano(), account.Email),
		})

		writeJSON(w, http.StatusOK, map[string]string{"status": "scheduled", "send_at": req.ScheduleAt.Format(time.RFC3339)})
		return
	}

	if err := sendMail(addr, auth, account.Email, recipients, msg); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("send failed: %v", err)})
		return
	}

	h.emails.InsertSent(&models.Email{
		AccountID:  req.AccountID,
		UID:        uint32(time.Now().Unix()),
		Folder:     "Sent",
		Subject:    req.Subject,
		From:       account.Email,
		To:         req.To,
		Date:       sendDate,
		IsRead:     true,
		IsStarred:  false,
		MessageID:  fmt.Sprintf("<%d.%s>", sendDate.UnixNano(), account.Email),
	})

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
