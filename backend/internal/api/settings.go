package api

import (
	"net/http"
)

// allowedSettingsKeys 允许客户端更新的设置键白名单
var allowedSettingsKeys = map[string]bool{
	"language":        true,
	"font_size":       true,
	"mail_density":    true,
	"layout_density":  true,
	"theme":           true,
	"accent_color":    true,
	"animations":      true,
	"archive_path":    true,
	"auto_cleanup_days": true,
}

func (h *Handler) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settings.GetAll()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (h *Handler) handleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]string
	if err := readJSON(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	// 过滤掉未授权的 key
	filtered := make(map[string]string)
	for k, v := range body {
		if allowedSettingsKeys[k] {
			filtered[k] = v
		}
	}
	if len(filtered) == 0 {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}
	if err := h.settings.SetBatch(filtered); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
