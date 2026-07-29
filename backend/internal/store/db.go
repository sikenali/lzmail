package store

import (
	"database/sql"
	_ "modernc.org/sqlite"
)

func OpenDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)&_pragma=foreign_keys(on)")
	if err != nil {
		return nil, err
	}
	if err := migrate(db); err != nil {
		return nil, err
	}
	return db, nil
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
		UNIQUE(account_id, uid)
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
	CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(account_id, folder);
	CREATE INDEX IF NOT EXISTS idx_emails_search ON emails(subject, from_addr, body_preview);
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL DEFAULT ''
	);
	`
	_, err := db.Exec(schema)
	return err
}
