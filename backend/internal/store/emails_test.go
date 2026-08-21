package store

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

func setupTestDB(t *testing.T) *EmailStore {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

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
			date TEXT,
			body_preview TEXT,
			is_read INTEGER NOT NULL DEFAULT 0,
			is_starred INTEGER NOT NULL DEFAULT 0,
			has_attachments INTEGER NOT NULL DEFAULT 0,
			archive_path TEXT,
			message_id TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			sender_avatar_url TEXT DEFAULT ''
		)
	`)
	if err != nil {
		t.Fatalf("create table: %v", err)
	}
	return NewEmailStore(db)
}

func TestBulkUpdateFlags_MarkRead(t *testing.T) {
	s := setupTestDB(t)
	insertTestRows(t, s.db, []testRow{{id: 1}, {id: 2}, {id: 3}})

	err := s.BulkUpdateFlags([]int64{1, 2}, boolPtr(true), nil)
	if err != nil {
		t.Fatalf("BulkUpdateFlags: %v", err)
	}

	checkRead(t, s.db, 1, true)
	checkRead(t, s.db, 2, true)
	checkRead(t, s.db, 3, false)
}

func TestBulkUpdateFlags_Star(t *testing.T) {
	s := setupTestDB(t)
	insertTestRows(t, s.db, []testRow{{id: 1}, {id: 2}, {id: 3}})

	err := s.BulkUpdateFlags([]int64{1, 3}, nil, boolPtr(true))
	if err != nil {
		t.Fatalf("BulkUpdateFlags: %v", err)
	}

	checkStarred(t, s.db, 1, true)
	checkStarred(t, s.db, 3, true)
	checkStarred(t, s.db, 2, false)
}

func TestBulkUpdateFlags_EmptyIDs(t *testing.T) {
	s := setupTestDB(t)
	err := s.BulkUpdateFlags([]int64{}, boolPtr(true), nil)
	if err != nil {
		t.Fatalf("BulkUpdateFlags with empty IDs: %v", err)
	}
}

func TestBulkUpdateFlags_NilPointers(t *testing.T) {
	s := setupTestDB(t)
	err := s.BulkUpdateFlags([]int64{1, 2}, nil, nil)
	if err != nil {
		t.Fatalf("BulkUpdateFlags with nil pointers: %v", err)
	}
}

func TestBulkMove(t *testing.T) {
	s := setupTestDB(t)
	insertTestRows(t, s.db, []testRow{{id: 1}, {id: 2}, {id: 3}})

	err := s.BulkMove([]int64{1, 2}, "Trash")
	if err != nil {
		t.Fatalf("BulkMove: %v", err)
	}

	checkFolder(t, s.db, 1, "Trash")
	checkFolder(t, s.db, 2, "Trash")
	checkFolder(t, s.db, 3, "INBOX")
}

func TestBulkMove_EmptyIDs(t *testing.T) {
	s := setupTestDB(t)
	err := s.BulkMove([]int64{}, "Trash")
	if err != nil {
		t.Fatalf("BulkMove with empty IDs: %v", err)
	}
}

func TestBulkDelete(t *testing.T) {
	s := setupTestDB(t)
	insertTestRows(t, s.db, []testRow{{id: 1}, {id: 2}, {id: 3}})

	err := s.BulkDelete([]int64{1, 2})
	if err != nil {
		t.Fatalf("BulkDelete: %v", err)
	}

	checkExists(t, s.db, 1, false)
	checkExists(t, s.db, 2, false)
	checkExists(t, s.db, 3, true)
}

func TestBulkDelete_EmptyIDs(t *testing.T) {
	s := setupTestDB(t)
	err := s.BulkDelete([]int64{})
	if err != nil {
		t.Fatalf("BulkDelete with empty IDs: %v", err)
	}
}

// --- helpers ---

type testRow struct {
	id      int
	read    int
	starred int
	folder  string
}

func boolPtr(b bool) *bool { return &b }

func insertTestRows(t *testing.T, db *sql.DB, rows []testRow) {
	t.Helper()
	for _, r := range rows {
		read := r.read
		starred := r.starred
		folder := r.folder
		if folder == "" {
			folder = "INBOX"
		}
		_, err := db.Exec(
			`INSERT INTO emails (id, account_id, uid, folder, is_read, is_starred) VALUES (?,?,?,?,?,?)`,
			r.id, 1, uint32(r.id), folder, read, starred,
		)
		if err != nil {
			t.Fatalf("insert email %d: %v", r.id, err)
		}
	}
}

func checkRead(t *testing.T, db *sql.DB, id int64, want bool) {
	t.Helper()
	var v int
	err := db.QueryRow(`SELECT is_read FROM emails WHERE id = ?`, id).Scan(&v)
	if err != nil {
		t.Fatalf("checkRead %d: %v", id, err)
	}
	got := v != 0
	if got != want {
		t.Errorf("email %d: is_read = %v, want %v", id, got, want)
	}
}

func checkStarred(t *testing.T, db *sql.DB, id int64, want bool) {
	t.Helper()
	var v int
	err := db.QueryRow(`SELECT is_starred FROM emails WHERE id = ?`, id).Scan(&v)
	if err != nil {
		t.Fatalf("checkStarred %d: %v", id, err)
	}
	got := v != 0
	if got != want {
		t.Errorf("email %d: is_starred = %v, want %v", id, got, want)
	}
}

func checkFolder(t *testing.T, db *sql.DB, id int64, want string) {
	t.Helper()
	var got string
	err := db.QueryRow(`SELECT folder FROM emails WHERE id = ?`, id).Scan(&got)
	if err != nil {
		t.Fatalf("checkFolder %d: %v", id, err)
	}
	if got != want {
		t.Errorf("email %d: folder = %q, want %q", id, got, want)
	}
}

func checkExists(t *testing.T, db *sql.DB, id int64, want bool) {
	t.Helper()
	var cnt int
	err := db.QueryRow(`SELECT COUNT(*) FROM emails WHERE id = ?`, id).Scan(&cnt)
	if err != nil {
		t.Fatalf("checkExists %d: %v", id, err)
	}
	got := cnt > 0
	if got != want {
		t.Errorf("email %d: exists = %v, want %v", id, got, want)
	}
}
