package api

import (
	"fmt"
	"net/http"
	"strconv"
	"time"
)

func (h *Handler) handleCleanupPreview(w http.ResponseWriter, r *http.Request) {
	accountID, _ := strconv.ParseInt(r.URL.Query().Get("account_id"), 10, 64)
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days <= 0 {
		days = 30
	}
	if accountID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "account_id required"})
		return
	}
	cutoff := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	count, err := h.emails.CountTrashExpired(accountID, cutoff)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"account_id": accountID,
		"days":       days,
		"cutoff_date": cutoff,
		"count":      count,
	})
}

func (h *Handler) handleCleanupRun(w http.ResponseWriter, r *http.Request) {
	accountID, _ := strconv.ParseInt(r.URL.Query().Get("account_id"), 10, 64)
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days <= 0 {
		days = 30
	}
	if accountID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "account_id required"})
		return
	}
	cutoff := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	deleted, err := h.emails.DeleteExpiredTrash(accountID, cutoff)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("清理失败: %v", err)})
		return
	}
	if h.sseHub != nil {
		h.sseHub.Publish("mail:updated", fmt.Sprintf(`{"cleanup":true,"deleted":%d,"account_id":%d}`, deleted, accountID))
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"deleted": deleted,
		"days":    days,
		"message": fmt.Sprintf("已清理 %d 封超过 %d 天的已删除邮件", deleted, days),
	})
}
