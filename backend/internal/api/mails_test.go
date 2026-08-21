package api

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/lzmail/backend/internal/sse"
	"github.com/lzmail/backend/internal/store"
	_ "modernc.org/sqlite"
)

func setupTestHandler(t *testing.T) (*Handler, *httptestRecorder, *sql.DB) {
	t.Helper()
	db, err := setupTestDBForAPI(t)
	if err != nil {
		t.Fatalf("setup db: %v", err)
	}
	hub := sse.NewHub()
	s := store.NewEmailStore(db)
	h := &Handler{emails: s, sseHub: hub}
	return h, &httptestRecorder{}, db
}

func TestHandleBulkMails_MarkRead(t *testing.T) {
	h, rec, db := setupTestHandler(t)
	insertTestEmails(t, db, 3)

	body := map[string]any{
		"action": "mark_read",
		"ids":    []int64{1, 2},
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	if rec.status != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.status)
	}
	var resp map[string]any
	json.Unmarshal(rec.body.Bytes(), &resp)
	if int(resp["affected_count"].(float64)) != 2 {
		t.Errorf("affected_count = %v, want 2", resp["affected_count"])
	}

	// verify state
	e1, err := h.emails.GetByID(1)
	if err != nil {
		t.Fatalf("GetByID(1): %v", err)
	}
	e2, err := h.emails.GetByID(2)
	if err != nil {
		t.Fatalf("GetByID(2): %v", err)
	}
	e3, err := h.emails.GetByID(3)
	if err != nil {
		t.Fatalf("GetByID(3): %v", err)
	}
	if !e1.IsRead || !e2.IsRead || e3.IsRead {
		t.Errorf("is_read state wrong: e1=%v e2=%v e3=%v", e1.IsRead, e2.IsRead, e3.IsRead)
	}
}

func TestHandleBulkMails_MarkUnread(t *testing.T) {
	h, rec, db := setupTestHandler(t)
	insertTestEmails(t, db, 3)
	// pre-mark all as read
	h.emails.BulkUpdateFlags([]int64{1, 2, 3}, boolPtr(true), nil)

	body := map[string]any{
		"action": "mark_unread",
		"ids":    []int64{1, 2},
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	e1, _ := h.emails.GetByID(1)
	e2, _ := h.emails.GetByID(2)
	e3, _ := h.emails.GetByID(3)
	if e1.IsRead || e2.IsRead || !e3.IsRead {
		t.Errorf("is_read state wrong after unstar: e1=%v e2=%v e3=%v", e1.IsRead, e2.IsRead, e3.IsRead)
	}
}

func TestHandleBulkMails_Star(t *testing.T) {
	h, rec, db := setupTestHandler(t)
	insertTestEmails(t, db, 3)

	body := map[string]any{
		"action": "star",
		"ids":    []int64{2},
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	e2, _ := h.emails.GetByID(2)
	e1, _ := h.emails.GetByID(1)
	if !e2.IsStarred || e1.IsStarred {
		t.Errorf("is_starred state wrong: e1=%v e2=%v", e1.IsStarred, e2.IsStarred)
	}
}

func TestHandleBulkMails_Unstar(t *testing.T) {
	h, rec, db := setupTestHandler(t)
	insertTestEmails(t, db, 3)
	h.emails.BulkUpdateFlags([]int64{1, 2}, nil, boolPtr(true))

	body := map[string]any{
		"action": "unstar",
		"ids":    []int64{1, 2},
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	e1, _ := h.emails.GetByID(1)
	e2, _ := h.emails.GetByID(2)
	if e1.IsStarred || e2.IsStarred {
		t.Errorf("is_starred should be false: e1=%v e2=%v", e1.IsStarred, e2.IsStarred)
	}
}

func TestHandleBulkMails_Move(t *testing.T) {
	h, rec, db := setupTestHandler(t)
	insertTestEmails(t, db, 2)

	body := map[string]any{
		"action":              "move",
		"ids":                 []int64{1, 2},
		"destination_folder":  "Trash",
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	e1, _ := h.emails.GetByID(1)
	e2, _ := h.emails.GetByID(2)
	if e1.Folder != "Trash" || e2.Folder != "Trash" {
		t.Errorf("folder wrong: e1=%s e2=%s", e1.Folder, e2.Folder)
	}
}

func TestHandleBulkMails_MoveMissingFolder(t *testing.T) {
	h, rec, _ := setupTestHandler(t)

	body := map[string]any{
		"action": "move",
		"ids":    []int64{1},
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	if rec.status != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.status)
	}
}

func TestHandleBulkMails_Delete(t *testing.T) {
	h, rec, db := setupTestHandler(t)
	insertTestEmails(t, db, 3)

	body := map[string]any{
		"action": "delete",
		"ids":    []int64{1, 2},
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	if rec.status != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.status)
	}
	_, err := h.emails.GetByID(1)
	if err == nil {
		t.Error("email 1 should be deleted")
	}
	e3, err := h.emails.GetByID(3)
	if err != nil || e3 == nil {
		t.Error("email 3 should still exist")
	}
}

func TestHandleBulkMails_AllInFolder(t *testing.T) {
	h, rec, db := setupTestHandler(t)
	insertTestEmails(t, db, 3)
	// put e1 in INBOX, e2 and e3 in Trash
	h.emails.BulkMove([]int64{2, 3}, "Trash")

	body := map[string]any{
		"action":        "mark_read",
		"all_in_folder": true,
		"folder":        "INBOX",
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	if rec.status != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.status)
	}
	var resp map[string]any
	json.Unmarshal(rec.body.Bytes(), &resp)
	if int(resp["affected_count"].(float64)) != 1 {
		t.Errorf("affected_count = %v, want 1", resp["affected_count"])
	}
	e1, _ := h.emails.GetByID(1)
	if !e1.IsRead {
		t.Error("e1 should be marked read")
	}
	e2, _ := h.emails.GetByID(2)
	if e2.IsRead {
		t.Error("e2 (in Trash) should NOT be marked read")
	}
}

func TestHandleBulkMails_AllInFolderMissingFolder(t *testing.T) {
	h, rec, _ := setupTestHandler(t)

	body := map[string]any{
		"action":        "mark_read",
		"all_in_folder": true,
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	if rec.status != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.status)
	}
}

func TestHandleBulkMails_UnknownAction(t *testing.T) {
	h, rec, _ := setupTestHandler(t)

	body := map[string]any{
		"action": "foobar",
		"ids":    []int64{1},
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	if rec.status != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.status)
	}
}

func TestHandleBulkMails_EmptyIDs(t *testing.T) {
	h, rec, _ := setupTestHandler(t)

	body := map[string]any{
		"action": "delete",
		"ids":    []int64{},
	}
	req := httptest.NewRequest("POST", "/api/v1/mails/bulk", encodeJSON(body))
	req.Header.Set("Content-Type", "application/json")
	h.handleBulkMails(rec, req)

	if rec.status != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.status)
	}
	var resp map[string]any
	json.Unmarshal(rec.body.Bytes(), &resp)
	if int(resp["affected_count"].(float64)) != 0 {
		t.Errorf("affected_count = %v, want 0", resp["affected_count"])
	}
}

// --- helpers ---

type httptestRecorder struct {
	status int
	body   bytes.Buffer
	header http.Header
}

func (r *httptestRecorder) Header() http.Header {
	if r.header == nil {
		r.header = make(http.Header)
	}
	return r.header
}
func (r *httptestRecorder) Write(p []byte) (int, error) { return r.body.Write(p) }
func (r *httptestRecorder) WriteHeader(status int)      { r.status = status }

func encodeJSON(v any) *bytes.Buffer {
	b, _ := json.Marshal(v)
	return bytes.NewBuffer(b)
}

func boolPtr(b bool) *bool { return &b }

func setupTestDBForAPI(t *testing.T) (*sql.DB, error) {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		return nil, err
	}
	_, err = db.Exec(`
		CREATE TABLE emails (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			account_id INTEGER NOT NULL,
			uid INTEGER NOT NULL,
			folder TEXT NOT NULL DEFAULT 'INBOX',
			subject TEXT,
			from_addr TEXT,
			from_name TEXT,
			to_addr TEXT,
			cc TEXT,
			date DATETIME,
			body_preview TEXT,
			is_read INTEGER NOT NULL DEFAULT 0,
			is_starred INTEGER NOT NULL DEFAULT 0,
			has_attachments INTEGER NOT NULL DEFAULT 0,
			archive_path TEXT,
			message_id TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return nil, err
	}
	_, err = db.Exec(`
		CREATE TABLE accounts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			brand_color TEXT
		)
	`)
	if err != nil {
		return nil, err
	}
	_, err = db.Exec("INSERT INTO accounts (id, name, brand_color) VALUES (1, 'test', '#fff')")
	if err != nil {
		return nil, err
	}
	return db, nil
}

func insertTestEmails(t *testing.T, db *sql.DB, n int) {
	t.Helper()
	date := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	for i := 1; i <= n; i++ {
		_, err := db.Exec(
			`INSERT INTO emails (account_id, uid, folder, subject, from_addr, from_name, to_addr, cc, date, body_preview, is_read, is_starred, has_attachments, archive_path, message_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			1, uint32(i), "INBOX", "Subject "+string(rune('A'+i)),
			"sender@example.com", "Sender", "recipient@example.com", "",
			date, "preview", 0, 0, 0, "", "",
		)
		if err != nil {
			t.Fatalf("insert email %d: %v", i, err)
		}
	}
}
