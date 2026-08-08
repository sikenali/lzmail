package store

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/lzmail/backend/internal/models"
)

type EmailStore struct {
	db *sql.DB
}

func NewEmailStore(db *sql.DB) *EmailStore {
	return &EmailStore{db: db}
}

const emailSelectCols = `e.id, e.account_id, e.uid, e.folder, e.subject, e.from_addr, e.from_name, e.to_addr, e.cc, e.date, e.body_preview, e.is_read, e.is_starred, e.has_attachments, e.archive_path, e.message_id, e.created_at, COALESCE(a.name, ''), COALESCE(a.brand_color, '')`

func scanEmail(scanner interface {
	Scan(dest ...any) error
}) (models.Email, error) {
	var e models.Email
	err := scanner.Scan(&e.ID, &e.AccountID, &e.UID, &e.Folder, &e.Subject, &e.From, &e.FromName, &e.To, &e.CC, &e.Date, &e.BodyPreview, &e.IsRead, &e.IsStarred, &e.HasAttachments, &e.ArchivePath, &e.MessageID, &e.CreatedAt, &e.AccountName, &e.AccountBrand)
	return e, err
}

// buildListCond 返回不带 WHERE 关键字的条件片段（如 "e.folder = ? AND e.is_read = 0"），
// 以及对应的参数。调用方自行拼接到 WHERE 之后。
func buildListCond(folder string, fromDate, toDate string) (string, []any) {
	var conds []string
	var args []any
	switch folder {
	case "UNSEEN":
		conds = append(conds, "e.is_read = 0")
	case "STARRED":
		conds = append(conds, "e.is_starred = 1")
	case "HASATTACH":
		conds = append(conds, "e.has_attachments = 1")
	case "ALL", "":
		// no folder filter
	default:
		conds = append(conds, "e.folder = ?")
		args = append(args, folder)
	}
	if fromDate != "" {
		conds = append(conds, "e.date >= ?")
		args = append(args, fromDate)
	}
	if toDate != "" {
		conds = append(conds, "e.date <= ?")
		args = append(args, toDate+" 23:59:59")
	}
	if len(conds) == 0 {
		return "", args
	}
	return strings.Join(conds, " AND "), args
}

func (s *EmailStore) List(accountID int64, folder string, fromDate, toDate string, limit, offset int) ([]models.Email, error) {
	cond, fargs := buildListCond(folder, fromDate, toDate)
	where := " WHERE e.account_id = ?"
	if cond != "" {
		where += " AND " + cond
	}
	args := append([]any{accountID}, fargs...)
	args = append(args, limit, offset)
	rows, err := s.db.Query(
		`SELECT `+emailSelectCols+`
		 FROM emails e LEFT JOIN accounts a ON a.id = e.account_id`+where+` ORDER BY e.date DESC LIMIT ? OFFSET ?`,
		args...)
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

func (s *EmailStore) ListAll(folder string, fromDate, toDate string, limit, offset int) ([]models.Email, error) {
	// Safety limit: force max 200 per page to prevent unbounded results
	if limit <= 0 || limit > 200 {
		limit = 200
	}
	cond, fargs := buildListCond(folder, fromDate, toDate)
	args := fargs
	where := ""
	if cond != "" {
		where = " WHERE " + cond
	}
	args = append(args, limit, offset)
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

func (s *EmailStore) Search(query string, accountID int64, limit, offset int) ([]models.Email, error) {
	q := "%" + query + "%"
	var rows *sql.Rows
	var err error
	if accountID > 0 {
		rows, err = s.db.Query(
			`SELECT `+emailSelectCols+`
			 FROM emails e LEFT JOIN accounts a ON a.id = e.account_id
			 WHERE e.account_id = ? AND (e.subject LIKE ? OR e.from_addr LIKE ? OR e.from_name LIKE ? OR e.body_preview LIKE ?)
			 ORDER BY e.date DESC LIMIT ? OFFSET ?`,
			accountID, q, q, q, q, limit, offset)
	} else {
		rows, err = s.db.Query(
			`SELECT `+emailSelectCols+`
			 FROM emails e LEFT JOIN accounts a ON a.id = e.account_id
			 WHERE e.subject LIKE ? OR e.from_addr LIKE ? OR e.from_name LIKE ? OR e.body_preview LIKE ?
			 ORDER BY e.date DESC LIMIT ? OFFSET ?`,
			q, q, q, q, limit, offset)
	}
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
	TotalEmails   int    `json:"total_emails"`
	UnreadEmails  int    `json:"unread_emails"`
	TodayEmails   int    `json:"today_emails"`
	AccountCount  int    `json:"account_count"`
	StorageBytes  int64  `json:"storage_bytes"`
	StorageLimit  int64  `json:"storage_limit"`
}

type FolderCounts struct {
	InboxUnread int `json:"inbox_unread"`
	Drafts      int `json:"drafts"`
	Starred     int `json:"starred"`
	Sent        int `json:"sent"`
	Trash       int `json:"trash"`
	Unread      int `json:"unread"`
}

func (s *EmailStore) Counts() (*FolderCounts, error) {
	var inboxUnread, drafts, starred, sent, trash, unread int
	err := s.db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN folder='INBOX' AND is_read=0 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN folder='Drafts' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN is_starred=1 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN folder='Sent' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN folder='Trash' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN is_read=0 THEN 1 ELSE 0 END), 0)
		FROM emails
	`).Scan(&inboxUnread, &drafts, &starred, &sent, &trash, &unread)
	if err != nil {
		return nil, err
	}
	return &FolderCounts{InboxUnread: inboxUnread, Drafts: drafts, Starred: starred, Sent: sent, Trash: trash, Unread: unread}, nil
}

func (s *EmailStore) Stats() (*MailStats, error) {
	var st MailStats
	err := s.db.QueryRow(`
		WITH base AS (
			SELECT
				COUNT(*) AS total,
				SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) AS unread,
				SUM(CASE WHEN date >= date('now', 'start of day') THEN 1 ELSE 0 END) AS today,
				COALESCE(SUM(size), 0) AS storage_bytes
			FROM emails LEFT JOIN attachments ON attachments.email_id = emails.id
		)
		SELECT
			COALESCE((SELECT total FROM base), 0),
			COALESCE((SELECT unread FROM base), 0),
			COALESCE((SELECT today FROM base), 0),
			COALESCE((SELECT COUNT(*) FROM accounts), 0),
			COALESCE((SELECT storage_bytes FROM base), 0),
			COALESCE((SELECT value FROM settings WHERE key = 'storage_limit_bytes'), 0)
	`).Scan(&st.TotalEmails, &st.UnreadEmails, &st.TodayEmails, &st.AccountCount, &st.StorageBytes, &st.StorageLimit)
	if err != nil {
		return nil, err
	}
	return &st, nil
}

type TrendPoint struct {
	Date    string `json:"date"`
	Receive int    `json:"receive"`
	Send    int    `json:"send"`
}

func (s *EmailStore) Trend(days int) ([]TrendPoint, error) {
	rows, err := s.db.Query(`
		SELECT date(e.date, 'localtime') as day,
			COUNT(CASE WHEN e.folder = 'INBOX' THEN 1 END) as receive,
			COUNT(CASE WHEN e.folder = 'Sent' THEN 1 END) as send
		FROM emails e
		WHERE e.date >= datetime('now', ? || ' days')
		GROUP BY day
		ORDER BY day DESC
		LIMIT ?
	`, fmt.Sprintf("-%d", days), days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []TrendPoint
	for rows.Next() {
		var p TrendPoint
		if err := rows.Scan(&p.Date, &p.Receive, &p.Send); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}
	return result, nil
}

func formatDate(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

func (s *EmailStore) Upsert(e *models.Email) (int64, error) {
	var id int64
	err := s.db.QueryRow(
		`INSERT INTO emails (account_id, uid, folder, subject, from_addr, from_name, to_addr, cc, date, body_preview, is_read, is_starred, has_attachments, archive_path, message_id)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
		 ON CONFLICT(account_id, uid, folder) DO UPDATE SET
			subject=excluded.subject, from_addr=excluded.from_addr, from_name=excluded.from_name, to_addr=excluded.to_addr,
			cc=excluded.cc, date=excluded.date, body_preview=excluded.body_preview,
			is_read=excluded.is_read, is_starred=excluded.is_starred,
			has_attachments=excluded.has_attachments, archive_path=excluded.archive_path,
			message_id=excluded.message_id
		 RETURNING id`,
		e.AccountID, e.UID, e.Folder, e.Subject, e.From, e.FromName, e.To, e.CC,
		formatDate(e.Date), e.BodyPreview, e.IsRead, e.IsStarred, e.HasAttachments, e.ArchivePath, e.MessageID,
	).Scan(&id)
	return id, err
}

// BatchUpsert 批量 UPSERT 邮件记录，减少 DB round-trips
func (s *EmailStore) BatchUpsert(emails []*models.Email) error {
	if len(emails) == 0 {
		return nil
	}
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	stmt, err := tx.Prepare(`
		INSERT INTO emails (account_id, uid, folder, subject, from_addr, from_name, to_addr, cc, date, body_preview, is_read, is_starred, has_attachments, archive_path, message_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(account_id, uid, folder) DO UPDATE SET
			subject=excluded.subject, from_addr=excluded.from_addr, from_name=excluded.from_name,
			to_addr=excluded.to_addr, cc=excluded.cc, date=excluded.date,
			body_preview=excluded.body_preview, is_read=excluded.is_read,
			is_starred=excluded.is_starred, has_attachments=excluded.has_attachments,
			archive_path=excluded.archive_path, message_id=excluded.message_id
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for _, e := range emails {
		_, err := stmt.Exec(
			e.AccountID, e.UID, e.Folder, e.Subject, e.From, e.FromName, e.To, e.CC,
			formatDate(e.Date), e.BodyPreview, e.IsRead, e.IsStarred, e.HasAttachments, e.ArchivePath, e.MessageID,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ReplaceAttachments 删除该邮件旧附件记录并写入新附件。
func (s *EmailStore) ReplaceAttachments(emailID int64, atts []models.Attachment) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM attachments WHERE email_id = ?`, emailID); err != nil {
		return err
	}
	for _, a := range atts {
		a.EmailID = emailID
		if _, err := tx.Exec(
			`INSERT INTO attachments (email_id, filename, mime_type, size, path) VALUES (?,?,?,?,?)`,
			a.EmailID, a.Filename, a.MimeType, a.Size, a.Path,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// UIDsWithBody 返回该账号/文件夹下已保存正文归档的 UID 集合。
func (s *EmailStore) UIDsWithBody(accountID int64, folder string) (map[uint32]bool, error) {
	rows, err := s.db.Query(
		`SELECT uid FROM emails WHERE account_id = ? AND folder = ? AND archive_path IS NOT NULL AND archive_path != ''`,
		accountID, folder)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	uids := make(map[uint32]bool)
	for rows.Next() {
		var uid uint32
		if err := rows.Scan(&uid); err != nil {
			return nil, err
		}
		uids[uid] = true
	}
	return uids, rows.Err()
}

// UpdateFlags 增量同步时仅更新已读/星标状态。
func (s *EmailStore) UpdateFlags(accountID int64, uid uint32, folder string, isRead, isStarred bool) error {
	_, err := s.db.Exec(
		`UPDATE emails SET is_read = ?, is_starred = ? WHERE account_id = ? AND uid = ? AND folder = ?`,
		isRead, isStarred, accountID, uid, folder)
	return err
}

// UpdateBody 补充正文预览/附件标记/归档路径（仅在正文已落库后调用）。
func (s *EmailStore) UpdateBody(accountID int64, uid uint32, folder, bodyPreview string, hasAttachments bool, archivePath string) (int64, error) {
	var id int64
	err := s.db.QueryRow(
		`UPDATE emails SET body_preview = ?, has_attachments = ?, archive_path = ?
		 WHERE account_id = ? AND uid = ? AND folder = ?
		 RETURNING id`,
		bodyPreview, hasAttachments, archivePath, accountID, uid, folder,
	).Scan(&id)
	return id, err
}

func (s *EmailStore) InsertSent(e *models.Email) error {
	_, err := s.db.Exec(
		`INSERT INTO emails (account_id, uid, folder, subject, from_addr, from_name, to_addr, cc, date, body_preview, is_read, has_attachments, archive_path, message_id)
		 VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?,?)`,
		e.AccountID, e.UID, e.Folder, e.Subject, e.From, e.FromName, e.To, e.CC, formatDate(e.Date),
		e.BodyPreview, e.HasAttachments, e.ArchivePath, e.MessageID)
	return err
}

func (s *EmailStore) Move(id int64, folder string) error {
	_, err := s.db.Exec(`UPDATE emails SET folder = ? WHERE id = ?`, folder, id)
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


