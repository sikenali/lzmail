package api

import (
	"net/http"
)

// allowedSettingsKeys 允许客户端更新的设置键白名单
var allowedSettingsKeys = map[string]bool{
	"language":          true,
	"font_size":         true,
	"mail_density":      true,
	"layout_density":    true,
	"theme":             true,
	"accent_color":      true,
	"animations":        true,
	"archive_path":      true,
	"auto_cleanup_days": true,
	"proxy_mode":        true,
	"proxy_proto":       true,
	"proxy_host":        true,
	"proxy_port":        true,
}

func (h *Handler) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settings.GetAll()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	// 向客户端暴露实际归档根目录（Linux 部署 box 的 ARCHIVE_DIR），
	// 供存储页展示真实路径与目录树（避免前端用浏览器推算的假路径）。
	settings["archive_dir"] = h.archiveDir
	// 未设置自定义归档路径时，默认使用服务端实际根目录
	if _, has := settings["archive_path"]; !has || settings["archive_path"] == "" {
		settings["archive_path"] = h.archiveDir
	}
	// 返回代理配置：旧版本默认"global"，无显式设置的存量用户保留兼容
	if settings["proxy_mode"] == "" {
		settings["proxy_mode"] = "global"
	}
	if settings["proxy_proto"] == "" {
		settings["proxy_proto"] = "http"
	}
	if settings["proxy_port"] == "" {
		settings["proxy_port"] = "1080"
	}
	writeJSON(w, http.StatusOK, settings)
}

func (h *Handler) handleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]string
	if err := readJSON(w, r, &body); err != nil {
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
