package api

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"encoding/json"
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

	if accountID > 0 {
		emails, err = h.emails.List(accountID, folder, fromDate, toDate, limit, offset)
	} else {
		emails, err = h.emails.ListAll(folder, fromDate, toDate, limit, offset)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, emails)
}

func (h *Handler) handleGetMail(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	email, err := h.emails.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	atts, _ := h.emails.GetAttachmentsByEmailID(id)

	bodyHTML := ""
	if email.ArchivePath != "" {
		if cached, ok := globalBodyCache.get(id); ok {
			bodyHTML = cached
		} else {
			bodyHTML = extractBody(email.ArchivePath)
			globalBodyCache.set(id, bodyHTML)
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"email":       email,
		"attachments": atts,
		"body_html":   bodyHTML,
	})
}

func (h *Handler) handleMoveMail(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var body struct {
		Folder string `json:"folder"`
	}
	if err := readJSON(r, &body); err != nil || body.Folder == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "folder required"})
		return
	}
	if err := h.emails.Move(id, body.Folder); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.sseHub != nil {
		d, _ := json.Marshal(map[string]string{"id": strconv.FormatInt(id, 10), "folder": body.Folder})
		h.sseHub.Publish("mail:updated", string(d))
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "moved"})
}

func (h *Handler) handleMarkRead(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err := h.emails.MarkRead(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.sseHub != nil {
		h.sseHub.Publish("mail:updated", fmt.Sprintf(`{"id":%d}`, id))
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) handleMarkStar(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	starred := r.URL.Query().Get("starred") == "true"
	if err := h.emails.MarkStar(id, starred); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.sseHub != nil {
		h.sseHub.Publish("mail:updated", fmt.Sprintf(`{"id":%d,"star":%s}`, id, strconv.FormatBool(starred)))
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) handleDeleteMail(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err := h.emails.Delete(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
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
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit == 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	emails, err := h.emails.Search(q, limit, offset)
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
			if a.Path != "" {
				w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", a.Filename))
				http.ServeFile(w, r, a.Path)
				return
			}
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "file not found"})
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
	data, err := os.ReadFile(email.ArchivePath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	contentType := "text/plain"
	if strings.HasSuffix(email.ArchivePath, ".eml") {
		contentType = "message/rfc822"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Write(data)
}
