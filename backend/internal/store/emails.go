package store

import (
	"database/sql"
	"fmt"
	"github.com/lzmail/backend/internal/models"
)

type EmailStore struct {
	db *sql.DB
}

func NewEmailStore(db *sql.DB) *EmailStore {
	return &EmailStore{db: db}
}

const emailSelectCols = `e.id, e.account_id, e.uid, e.folder, e.subject, e.from_addr, e.to_addr, e.cc, e.date, e.body_preview, e.is_read, e.is_starred, e.has_attachments, e.archive_path, e.message_id, e.created_at, COALESCE(a.name, ''), COALESCE(a.brand_color, '')`

func scanEmail(scanner interface {
	Scan(dest ...any) error
}) (models.Email, error) {
	var e models.Email
	err := scanner.Scan(&e.ID, &e.AccountID, &e.UID, &e.Folder, &e.Subject, &e.From, &e.To, &e.CC, &e.Date, &e.BodyPreview, &e.IsRead, &e.IsStarred, &e.HasAttachments, &e.ArchivePath, &e.MessageID, &e.CreatedAt, &e.AccountName, &e.AccountBrand)
	return e, err
}

func (s *EmailStore) List(accountID int64, folder string, limit, offset int) ([]models.Email, error) {
	rows, err := s.db.Query(
		`SELECT `+emailSelectCols+`
		 FROM emails e LEFT JOIN accounts a ON a.id = e.account_id WHERE e.account_id = ? AND e.folder = ? ORDER BY e.date DESC LIMIT ? OFFSET ?`,
		accountID, folder, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	emails := make([]models.Email, 0)
	for rows.Next() {
		e, err := scanEmail(rows)
		if err != nil {
			return nil, err
		}
		emails = append(emails, e)
	}
	return emails, nil
}

func (s *EmailStore) ListAll(folder string, limit, offset int) ([]models.Email, error) {
	where := ""
	args := []any{limit, offset}
	if folder != "" {
		where = " WHERE e.folder = ?"
		args = []any{folder, limit, offset}
	}
	rows, err := s.db.Query(
		`SELECT `+emailSelectCols+`
		 FROM emails e LEFT JOIN accounts a ON a.id = e.account_id`+where+` ORDER BY e.date DESC LIMIT ? OFFSET ?`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	emails := make([]models.Email, 0)
	for rows.Next() {
		e, err := scanEmail(rows)
		if err != nil {
			return nil, err
		}
		emails = append(emails, e)
	}
	return emails, nil
}

func (s *EmailStore) GetByID(id int64) (*models.Email, error) {
	row := s.db.QueryRow(
		`SELECT `+emailSelectCols+`
		 FROM emails e LEFT JOIN accounts a ON a.id = e.account_id WHERE e.id = ?`, id)
	e, err := scanEmail(row)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (s *EmailStore) GetAttachmentsByEmailID(emailID int64) ([]models.Attachment, error) {
	rows, err := s.db.Query(`SELECT id, email_id, filename, mime_type, size, path FROM attachments WHERE email_id = ?`, emailID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var atts []models.Attachment
	for rows.Next() {
		var a models.Attachment
		if err := rows.Scan(&a.ID, &a.EmailID, &a.Filename, &a.MimeType, &a.Size, &a.Path); err != nil {
			return nil, err
		}
		atts = append(atts, a)
	}
	return atts, nil
}

func (s *EmailStore) Search(query string, limit, offset int) ([]models.Email, error) {
	q := fmt.Sprintf("%%%s%%", query)
	rows, err := s.db.Query(
		`SELECT `+emailSelectCols+`
		 FROM emails e LEFT JOIN accounts a ON a.id = e.account_id WHERE e.subject LIKE ? OR e.from_addr LIKE ? OR e.body_preview LIKE ? ORDER BY e.date DESC LIMIT ? OFFSET ?`,
		q, q, q, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var emails []models.Email
	for rows.Next() {
		e, err := scanEmail(rows)
		if err != nil {
			return nil, err
		}
		emails = append(emails, e)
	}
	return emails, nil
}

type MailStats struct {
	TotalEmails   int `json:"total_emails"`
	UnreadEmails  int `json:"unread_emails"`
	TodayEmails   int `json:"today_emails"`
	AccountCount  int `json:"account_count"`
	StorageBytes  int64 `json:"storage_bytes"`
}

func (s *EmailStore) Stats() (*MailStats, error) {
	var st MailStats
	err := s.db.QueryRow(`
		SELECT
			COALESCE((SELECT COUNT(*) FROM emails), 0),
			COALESCE((SELECT COUNT(*) FROM emails WHERE is_read = 0), 0),
			COALESCE((SELECT COUNT(*) FROM emails WHERE date >= datetime('now', 'start of day')), 0),
			COALESCE((SELECT COUNT(*) FROM accounts), 0),
			COALESCE((SELECT SUM(COALESCE(size,0)) FROM attachments), 0)
	`).Scan(&st.TotalEmails, &st.UnreadEmails, &st.TodayEmails, &st.AccountCount, &st.StorageBytes)
	if err != nil {
		return nil, err
	}
	return &st, nil
}

func (s *EmailStore) Upsert(e *models.Email) error {
	_, err := s.db.Exec(
		`INSERT INTO emails (account_id, uid, folder, subject, from_addr, to_addr, cc, date, body_preview, has_attachments, archive_path, message_id)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
		 ON CONFLICT(account_id, uid) DO UPDATE SET subject=excluded.subject, from_addr=excluded.from_addr, date=excluded.date, body_preview=excluded.body_preview`,
		e.AccountID, e.UID, e.Folder, e.Subject, e.From, e.To, e.CC, e.Date, e.BodyPreview, e.HasAttachments, e.ArchivePath, e.MessageID)
	return err
}

func (s *EmailStore) InsertSent(e *models.Email) error {
	_, err := s.db.Exec(
		`INSERT INTO emails (account_id, uid, folder, subject, from_addr, to_addr, cc, date, is_read, message_id)
		 VALUES (?,?,?,?,?,?,?,?,1,?)`,
		e.AccountID, e.UID, e.Folder, e.Subject, e.From, e.To, e.CC, e.Date, e.MessageID)
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
