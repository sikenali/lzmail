package store

import (
	"database/sql"
	"github.com/lzmail/backend/internal/models"
)

type EmailStore struct {
	db *sql.DB
}

func NewEmailStore(db *sql.DB) *EmailStore {
	return &EmailStore{db: db}
}

func (s *EmailStore) List(accountID int64, folder string, limit, offset int) ([]models.Email, error) {
	rows, err := s.db.Query(
		`SELECT id, account_id, uid, folder, subject, from_addr, to_addr, date, body_preview, is_read, is_starred, has_attachments, archive_path, message_id, created_at
		 FROM emails WHERE account_id = ? AND folder = ? ORDER BY date DESC LIMIT ? OFFSET ?`,
		accountID, folder, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var emails []models.Email
	for rows.Next() {
		var e models.Email
		if err := rows.Scan(&e.ID, &e.AccountID, &e.UID, &e.Folder, &e.Subject, &e.From, &e.To, &e.Date, &e.BodyPreview, &e.IsRead, &e.IsStarred, &e.HasAttachments, &e.ArchivePath, &e.MessageID, &e.CreatedAt); err != nil {
			return nil, err
		}
		emails = append(emails, e)
	}
	return emails, nil
}

func (s *EmailStore) Upsert(e *models.Email) error {
	_, err := s.db.Exec(
		`INSERT INTO emails (account_id, uid, folder, subject, from_addr, to_addr, cc, date, body_preview, has_attachments, archive_path, message_id)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
		 ON CONFLICT(account_id, uid) DO UPDATE SET subject=excluded.subject, from_addr=excluded.from_addr, date=excluded.date, body_preview=excluded.body_preview`,
		e.AccountID, e.UID, e.Folder, e.Subject, e.From, e.To, e.CC, e.Date, e.BodyPreview, e.HasAttachments, e.ArchivePath, e.MessageID)
	return err
}

func (s *EmailStore) MarkRead(id int64) error {
	_, err := s.db.Exec(`UPDATE emails SET is_read = 1 WHERE id = ?`, id)
	return err
}

func (s *EmailStore) MarkStar(id int64, starred bool) error {
	_, err := s.db.Exec(`UPDATE emails SET is_starred = ? WHERE id = ?`, starred, id)
	return err
}

func (s *EmailStore) Delete(id int64) error {
	_, err := s.db.Exec(`DELETE FROM emails WHERE id = ?`, id)
	return err
}
