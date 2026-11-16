package api

import (
	"net/http"
	"strconv"
)

func (h *Handler) handleListTags(w http.ResponseWriter, r *http.Request) {
	accountID, _ := strconv.ParseInt(r.URL.Query().Get("account_id"), 10, 64)
	if accountID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "account_id required"})
		return
	}
	tags, err := h.tagStore.List(accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, tags)
}

func (h *Handler) handleCreateTag(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name      string `json:"name"`
		AccountID int64  `json:"account_id"`
	}
	if err := readJSON(w, r, &body); err != nil || body.Name == "" || body.AccountID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name and account_id required"})
		return
	}
	tag, err := h.tagStore.Create(body.Name, body.AccountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.sseHub != nil {
		h.sseHub.Publish("tag:updated", `{"account_id":`+strconv.FormatInt(body.AccountID, 10)+`}`)
	}
	writeJSON(w, http.StatusCreated, tag)
}

func (h *Handler) handleDeleteTag(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	accountID, _ := strconv.ParseInt(r.URL.Query().Get("account_id"), 10, 64)
	if err := h.tagStore.Delete(id, accountID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *Handler) handleSetEmailTags(w http.ResponseWriter, r *http.Request) {
	emailID, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	var body struct {
		TagIDs []int64 `json:"tag_ids"`
	}
	if err := readJSON(w, r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	if err := h.tagStore.SetTagsForEmail(emailID, body.TagIDs); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	tags, err := h.tagStore.GetTagsByEmailID(emailID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if h.sseHub != nil {
		h.sseHub.Publish("mail:updated", "{\"id\":"+strconv.FormatInt(emailID, 10)+"}")
	}
	writeJSON(w, http.StatusOK, tags)
}

func (h *Handler) handleGetEmailTags(w http.ResponseWriter, r *http.Request) {
	emailID, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	tags, err := h.tagStore.GetTagsByEmailID(emailID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, tags)
}
