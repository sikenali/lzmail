package api

import (
	"encoding/json"
	"fmt"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func (h *Handler) handleListMails(w http.ResponseWriter, r *http.Request) {
	accountID, _ := strconv.ParseInt(r.URL.Query().Get("account_id"), 10, 64)
	folder := r.URL.Query().Get("folder")
	fromDate := r.URL.Query().Get("from_date")
	toDate := r.URL.Query().Get("to_date")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit == 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}

	var emails interface{}
	var err error
	var total int

	if accountID > 0 {
		emails, err = h.emails.List(accountID, folder, fromDate, toDate, limit, offset)
		if err == nil {
			total, err = h.emails.Count(accountID, folder, fromDate, toDate)
		}
	} else {
		emails, err = h.emails.ListAll(folder, fromDate, toDate, limit, offset)
		if err == nil {
			total, err = h.emails.Count(0, folder, fromDate, toDate)
		}
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("X-Total-Count", strconv.Itoa(total))
	writeJSON(w, http.StatusOK, emails)
}

func (h *Handler) handleGetMail(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	email, err := h.emails.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	atts, err := h.emails.GetAttachmentsByEmailID(id)
	if err != nil {
		log.Printf("[mail] get attachments %d failed: %v", id, err)
	}

	bodyHTML := ""
	if email.ArchivePath != "" {
		log.Printf("[mail] get %d: archive_path=%q", id, email.ArchivePath)
		if resolved, err := anchorPath(h.archiveDir, email.ArchivePath); err == nil {
			log.Printf("[mail] get %d: resolved path=%q", id, resolved)
			if cached, ok := globalBodyCache.get(id); ok {
				bodyHTML = cached
			} else {
				bodyHTML = extractBody(resolved)
				log.Printf("[mail] get %d: body length=%d", id, len(bodyHTML))
				globalBodyCache.set(id, bodyHTML)
			}
		}
	} else {
		// archive_path 为空时，尝试从磁盘恢复（兼容历史数据迁移后路径丢失的情况）
		if resolved, err := findEmlByUid(h.archiveDir, email.AccountID, email.UID, email.Date); err == nil {
			log.Printf("[mail] get %d: findEmlByUid found=%q", id, resolved)
			if cached, ok := globalBodyCache.get(id); ok {
				bodyHTML = cached
			} else {
				bodyHTML = extractBody(resolved)
				log.Printf("[mail] get %d: fallback body length=%d", id, len(bodyHTML))
				globalBodyCache.set(id, bodyHTML)
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"email":       email,
		"attachments": atts,
		"body_html":   bodyHTML,
	})
}

func (h *Handler) handleReextractBody(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	email, err := h.emails.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	// Clear cache
	globalBodyCache.delete(id)

	// Force re-extract
	var bodyHTML string
	if email.ArchivePath != "" {
		if resolved, err := anchorPath(h.archiveDir, email.ArchivePath); err == nil {
			bodyHTML = extractBody(resolved)
		}
	}
	if bodyHTML == "" {
		if resolved, err := findEmlByUid(h.archiveDir, email.AccountID, email.UID, email.Date); err == nil {
			bodyHTML = extractBody(resolved)
		}
	}
	globalBodyCache.set(id, bodyHTML)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"body_html": bodyHTML,
		"source":    "archive",
	})
}

func (h *Handler) handleMoveMail(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	email, err := h.emails.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	var body struct {
		Folder string `json:"folder"`
	}
	if err := readJSON(w, r, &body); err != nil || body.Folder == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "folder required"})
		return
	}
	if err := h.emails.Move(id, body.Folder); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.syncEngine != nil && email.Folder != body.Folder {
		go func() {
			dest := h.emails.ResolveFolder(body.Folder)
			if err := h.syncEngine.MoveMessage(email.AccountID, email.Folder, email.UID, dest); err != nil {
				log.Printf("[sync] move %d to %s failed: %v", id, body.Folder, err)
			}
		}()
	}
	if h.sseHub != nil {
		d, _ := json.Marshal(map[string]string{"id": strconv.FormatInt(id, 10), "folder": body.Folder})
		h.sseHub.Publish("mail:updated", string(d))
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "moved"})
}

func (h *Handler) handleMarkRead(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	email, err := h.emails.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if err := h.emails.MarkRead(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.syncEngine != nil {
		go func() {
			if err := h.syncEngine.ApplyFlag(email.AccountID, email.Folder, email.UID, "\\Seen", true); err != nil {
				log.Printf("[sync] mark read %d failed: %v", id, err)
			}
		}()
	}
	if h.sseHub != nil {
		h.sseHub.Publish("mail:updated", fmt.Sprintf(`{"id":%d}`, id))
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) handleMarkStar(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	email, err := h.emails.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	starred := r.URL.Query().Get("starred") == "true"
	if err := h.emails.MarkStar(id, starred); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.syncEngine != nil {
		go func() {
			if err := h.syncEngine.ApplyFlag(email.AccountID, email.Folder, email.UID, "\\Flagged", starred); err != nil {
				log.Printf("[sync] mark star %d failed: %v", id, err)
			}
		}()
	}
	if h.sseHub != nil {
		h.sseHub.Publish("mail:updated", fmt.Sprintf(`{"id":%d,"star":%s}`, id, strconv.FormatBool(starred)))
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) handleDeleteMail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	email, err := h.emails.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if err := h.emails.Delete(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.syncEngine != nil {
		go func() {
			if err := h.syncEngine.DeleteMessage(email.AccountID, email.Folder, email.UID); err != nil {
				log.Printf("[sync] delete %d failed: %v", id, err)
			}
		}()
	}
	if h.sseHub != nil {
		h.sseHub.Publish("mail:updated", fmt.Sprintf(`{"id":%d,"deleted":true}`, id))
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) handleSearchMails(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "query required"})
		return
	}
	accountID, _ := strconv.ParseInt(r.URL.Query().Get("account_id"), 10, 64)
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit == 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	emails, err := h.emails.Search(q, accountID, limit, offset)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, emails)
}

func (h *Handler) handleMailTrend(w http.ResponseWriter, r *http.Request) {
	rangeDays, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if rangeDays <= 0 {
		rangeDays = 7
	}
	if rangeDays > 365 {
		rangeDays = 365
	}
	trend, err := h.emails.Trend(rangeDays)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, trend)
}

func (h *Handler) handleMailStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.emails.Stats()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *Handler) handleMailCounts(w http.ResponseWriter, r *http.Request) {
	counts, err := h.emails.Counts()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, counts)
}

func (h *Handler) handleDownloadAttachment(w http.ResponseWriter, r *http.Request) {
	emailID, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	attID, _ := strconv.ParseInt(r.PathValue("attId"), 10, 64)

	atts, err := h.emails.GetAttachmentsByEmailID(emailID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	for _, a := range atts {
		if a.ID == attID {
			if a.Path == "" {
				writeJSON(w, http.StatusNotFound, map[string]string{"error": "file not found"})
				return
			}
			resolved, err := anchorPath(h.archiveDir, a.Path)
			if err != nil {
				writeJSON(w, http.StatusNotFound, map[string]string{"error": "file not found"})
				return
			}
			w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": a.Filename}))
			http.ServeFile(w, r, resolved)
			return
		}
	}
	writeJSON(w, http.StatusNotFound, map[string]string{"error": "attachment not found"})
}

func (h *Handler) handleRenderMail(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	email, err := h.emails.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if email.ArchivePath == "" {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "no archive"})
		return
	}
	resolved, err := anchorPath(h.archiveDir, email.ArchivePath)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "no archive"})
		return
	}
	data, err := os.ReadFile(resolved)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	contentType := "text/plain"
	if strings.HasSuffix(resolved, ".eml") {
		contentType = "message/rfc822"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Write(data)
}

// handleGetInlineImage 返回指定邮件的内嵌图片。
// 内嵌图片存储在 account/inline_images/ 目录，文件名格式为 {uid}_{safe_content_id}.{ext}。
func (h *Handler) handleGetInlineImage(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	contentID := r.PathValue("cid")
	if contentID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "content id required"})
		return
	}

	email, err := h.emails.GetByID(id)
	if err != nil || email.AccountID == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	safeID := strings.NewReplacer("<", "", ">", "").Replace(contentID)
	safeID = strings.ReplaceAll(safeID, " ", "_")
	imgDir := filepath.Join(h.archiveDir, fmt.Sprintf("%d", email.AccountID), "inline_images")

	// 从附件表查找该内嵌图片的真实 MIME 类型和扩展名
	var imgMimeType string
	var imgPath string
	atts, err := h.emails.GetAttachmentsByEmailID(id)
	if err == nil {
		for _, a := range atts {
			if a.MimeType != "" && strings.Contains(a.Path, safeID) {
				imgMimeType = a.MimeType
				imgPath = a.Path
				break
			}
		}
	}
	if imgPath == "" {
		// 回退：按已知扩展名尝试匹配文件
		for _, ext := range []string{".png", ".jpg", ".gif", ".webp", ".svg"} {
			candidate := filepath.Join(imgDir, fmt.Sprintf("%d_%s%s", email.UID, safeID, ext))
			resolved, err2 := anchorPath(imgDir, candidate)
			if err2 == nil {
				if _, err := os.Stat(resolved); err == nil {
					imgPath = resolved
					imgMimeType = mimeTypeFromExt(ext)
					break
				}
			}
		}
	}
	if imgPath == "" {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "image not found"})
		return
	}

	data, err := os.ReadFile(imgPath)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "image not found"})
		return
	}

	if imgMimeType == "" {
		imgMimeType = "image/png"
	}
	w.Header().Set("Content-Type", imgMimeType)
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Write(data)
}

func mimeTypeFromExt(ext string) string {
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	default:
		return "image/png"
	}
}

// findEmlByUid 当 archive_path 为空时，按 accountID/uid/year/month 在归档目录中查找 EML 文件。
func findEmlByUid(archiveDir string, accountID int64, uid uint32, date time.Time) (string, error) {
	if date.IsZero() {
		return "", fmt.Errorf("zero date")
	}
	base := filepath.Join(archiveDir, fmt.Sprintf("%d", accountID))
	dir := filepath.Join(base, date.Format("2006"), date.Format("01"))
	candidate := filepath.Join(dir, fmt.Sprintf("%d.eml", uid))
	resolved, err := anchorPath(base, candidate)
	if err != nil {
		// 放宽检查：直接在 archiveDir 内搜索
		resolved = candidate
		if _, err := os.Stat(resolved); err != nil {
			return "", err
		}
		return resolved, nil
	}
	if _, err := os.Stat(resolved); err != nil {
		return "", err
	}
	return resolved, nil
}
