package store

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "modernc.org/sqlite"
)

const currentSchemaVersion = 5

func OpenDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)&_pragma=foreign_keys(on)")
	if err != nil {
		return nil, err
	}
	if err := migrate(db); err != nil {
		return nil, err
	}
	if err := addIndexes(db); err != nil {
		return nil, err
	}
	return db, nil
}

func columnExists(db *sql.DB, table, column string) (bool, error) {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return false, err
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dfltValue sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err != nil {
			return false, err
		}
		if name == column {
			return true, nil
		}
	}
	return false, rows.Err()
}

func migrate(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS accounts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		imap_host TEXT NOT NULL,
		imap_port INTEGER NOT NULL DEFAULT 993,
		smtp_host TEXT NOT NULL,
		smtp_port INTEGER NOT NULL DEFAULT 587,
		auth_type TEXT NOT NULL DEFAULT 'password',
		username TEXT NOT NULL,
		password BLOB,
		auth_method TEXT NOT NULL DEFAULT 'password',
		provider TEXT NOT NULL DEFAULT 'custom',
		oauth2_token TEXT,
		use_idle INTEGER NOT NULL DEFAULT 0,
		brand_color TEXT NOT NULL DEFAULT '#6366f1',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS emails (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
		uid INTEGER NOT NULL,
		folder TEXT NOT NULL DEFAULT 'INBOX',
		subject TEXT,
		from_addr TEXT,
		to_addr TEXT,
		cc TEXT,
		date DATETIME,
		body_preview TEXT,
		is_read INTEGER NOT NULL DEFAULT 0,
		is_starred INTEGER NOT NULL DEFAULT 0,
		has_attachments INTEGER NOT NULL DEFAULT 0,
		archive_path TEXT,
		message_id TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(account_id, uid, folder)
	);
	CREATE TABLE IF NOT EXISTS attachments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
		filename TEXT NOT NULL,
		mime_type TEXT,
		size INTEGER DEFAULT 0,
		path TEXT
	);
	CREATE TABLE IF NOT EXISTS contacts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		email TEXT NOT NULL,
		account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(email, account_id)
	);
	CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id, date DESC);
	CREATE INDEX IF NOT EXISTS idx_emails_search ON emails(subject, from_addr, body_preview);
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL DEFAULT ''
	);
	CREATE TABLE IF NOT EXISTS scheduled_emails (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
		to_addr TEXT NOT NULL,
		cc TEXT,
		bcc TEXT,
		subject TEXT,
		body_text TEXT,
		body_html TEXT,
		attachments_json TEXT,
		send_at DATETIME NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := db.Exec(schema)
	if err != nil {
		return err
	}
	if err := migrateToV2(db); err != nil {
		return err
	}
	if err := migrateToV3(db); err != nil {
		return err
	}
	if err := migrateToV4(db); err != nil {
		return err
	}
	return migrateToV5(db)
}

// migrateToV5 为 contacts 表添加 phone、company、title 列（幂等）
func migrateToV5(db *sql.DB) error {
	cols := []struct {
		column    string
		statement string
	}{
		{"phone", `ALTER TABLE contacts ADD COLUMN phone TEXT DEFAULT ''`},
		{"company", `ALTER TABLE contacts ADD COLUMN company TEXT DEFAULT ''`},
		{"title", `ALTER TABLE contacts ADD COLUMN title TEXT DEFAULT ''`},
	}
	for _, c := range cols {
		exists, err := columnExists(db, "contacts", c.column)
		if err != nil {
			return err
		}
		if !exists {
			if _, err := db.Exec(c.statement); err != nil {
				return fmt.Errorf("add column %s: %w", c.column, err)
			}
		}
	}
	return nil
}

// migrateToV3 重建 emails 表，把唯一键从 (account_id, uid) 扩展为
// (account_id, uid, folder)，避免不同文件夹的 UID 互相覆盖（幂等）。
func migrateToV3(db *sql.DB) error {
	var ddl string
	if err := db.QueryRow(`SELECT sql FROM sqlite_master WHERE type='table' AND name='emails'`).Scan(&ddl); err != nil {
		return err
	}
	if strings.Contains(ddl, "uid, folder") {
		return nil
	}
	log.Println("[migrate] rebuilding emails table with folder-aware unique index")
	_, err := db.Exec(`
		ALTER TABLE emails RENAME TO emails_old;
		CREATE TABLE emails (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
			uid INTEGER NOT NULL,
			folder TEXT NOT NULL DEFAULT 'INBOX',
			subject TEXT,
			from_addr TEXT,
			to_addr TEXT,
			cc TEXT,
			date DATETIME,
			body_preview TEXT,
			is_read INTEGER NOT NULL DEFAULT 0,
			is_starred INTEGER NOT NULL DEFAULT 0,
			has_attachments INTEGER NOT NULL DEFAULT 0,
			archive_path TEXT,
			message_id TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(account_id, uid, folder)
		);
		INSERT INTO emails (id, account_id, uid, folder, subject, from_addr, to_addr, cc, date, body_preview, is_read, is_starred, has_attachments, archive_path, message_id, created_at)
			SELECT id, account_id, uid, folder, subject, from_addr, to_addr, cc, date, body_preview, is_read, is_starred, has_attachments, archive_path, message_id, created_at FROM emails_old;
		DROP TABLE emails_old;
	`)
	return err
}

// migrateToV4 为 emails 表添加 from_name 列（发件人显示名）
func migrateToV4(db *sql.DB) error {
	exists, err := columnExists(db, "emails", "from_name")
	if err != nil {
		return err
	}
	if !exists {
		_, err := db.Exec(`ALTER TABLE emails ADD COLUMN from_name TEXT DEFAULT ''`)
		return err
	}
	return nil
}

// migrateToV2 为已有数据库补充 OAuth2 相关列（幂等）
func migrateToV2(db *sql.DB) error {
	cols := []struct {
		column    string
		statement string
	}{
		{"auth_method", `ALTER TABLE accounts ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'password'`},
		{"provider", `ALTER TABLE accounts ADD COLUMN provider TEXT NOT NULL DEFAULT 'custom'`},
		{"oauth2_token", `ALTER TABLE accounts ADD COLUMN oauth2_token TEXT`},
	}
	for _, c := range cols {
		exists, err := columnExists(db, "accounts", c.column)
		if err != nil {
			return err
		}
		if !exists {
			if _, err := db.Exec(c.statement); err != nil {
				return fmt.Errorf("add column %s: %w", c.column, err)
			}
		}
	}
	return nil
}

func addIndexes(db *sql.DB) error {
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(account_id, is_read)`,
		`CREATE INDEX IF NOT EXISTS idx_emails_is_starred ON emails(account_id, is_starred)`,
		`CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(account_id, folder, date DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_scheduled_send_at ON scheduled_emails(status, send_at)`,
		`CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id)`,
		`CREATE INDEX IF NOT EXISTS idx_attachments_email ON attachments(email_id)`,
	}
	for _, idx := range indexes {
		if _, err := db.Exec(idx); err != nil {
			return err
		}
	}
	return nil
}
