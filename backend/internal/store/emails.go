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

// folderAliases 将前端使用的规范文件夹（侧栏/筛选页）映射到数据库中实际存储的
// IMAP 文件夹名。不同提供商的命名不同（如 QQ 的 "Sent Messages"、"Deleted
// Messages"），因此查询时要把规范名展开为所有别名，避免精确匹配查不到数据。
var folderAliases = map[string][]string{
	"INBOX":    {"INBOX"},
	"Sent":     {"Sent", "Sent Messages", "Sent Items", "[Gmail]/Sent Mail", "已发送"},
	"Drafts":   {"Drafts", "Draft", "草稿箱", "草稿"},
	"Trash":    {"Trash", "Deleted Messages", "Deleted Items", "[Gmail]/Trash", "已删除"},
	"SPAM":     {"SPAM", "Spam", "Junk", "Junk E-mail", "垃圾邮件"},
	"Archive":  {"Archive", "[Gmail]/All Mail"},
	"DEFERRED": {"DEFERRED"},
}

// canonicalFolders 返回与规范文件夹 folder 对应的所有已存储文件夹名。
// 未知的 folder 只匹配它自身。
func canonicalFolders(folder string) []string {
	if names, ok := folderAliases[folder]; ok {
		return names
	}
	return []string{folder}
}

// folderLiterals 把规范 folder 展开为 SQL 内联字面量列表（如 "'Sent','Sent Messages'"），
// 用于 Counts/Trend 这类无法轻易用占位符展开的聚合查询。
func folderLiterals(folder string) string {
	names := canonicalFolders(folder)
	parts := make([]string, 0, len(names))
	for _, n := range names {
		parts = append(parts, "'"+strings.ReplaceAll(n, "'", "''")+"'")
	}
	return strings.Join(parts, ",")
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
		names := canonicalFolders(folder)
		if len(names) == 1 {
			conds = append(conds, "e.folder = ?")
			args = append(args, names[0])
		} else {
			ph := make([]string, len(names))
			for i := range names {
				ph[i] = "?"
				args = append(args, names[i])
			}
			conds = append(conds, "e.folder IN ("+strings.Join(ph, ",")+")")
		}
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

// Count 返回符合过滤条件的邮件总数（与 List 相同的过滤条件，仅统计数量）。
func (s *EmailStore) Count(accountID int64, folder, fromDate, toDate string) (int, error) {
	cond, fargs := buildListCond(folder, fromDate, toDate)
	where := " WHERE 1=1"
	if accountID > 0 {
		where += " AND e.account_id = ?"
		fargs = append([]any{accountID}, fargs...)
	}
	if cond != "" {
		where += " AND " + cond
	}
	var n int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM emails e`+where, fargs...).Scan(&n)
	if err != nil {
		return 0, err
	}
	return n, nil
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
	// trigram 索引对 <3 字符的查询无效，回退到 LIKE 全表扫描以保持「边输入边搜」体验
	if len([]rune(strings.TrimSpace(query))) < 3 {
		return s.searchLike(query, accountID, limit, offset)
	}
	// 把整个查询作为一个 FTS5 短语，等价于连续子串匹配（trigram），并对特殊字符转义
	phrase := strings.ReplaceAll(query, `"`, `""`)
	matchSQL := `"` + phrase + `"`
	where := `WHERE emails_fts MATCH ?`
	args := []any{matchSQL}
	if accountID > 0 {
		where += ` AND e.account_id = ?`
		args = append(args, accountID)
	}
	args = append(args, limit, offset)
	rows, err := s.db.Query(
		`SELECT `+emailSelectCols+`
		 FROM emails_fts
		 JOIN emails e ON e.id = emails_fts.rowid
		 LEFT JOIN accounts a ON a.id = e.account_id
		 `+where+`
		 ORDER BY e.date DESC LIMIT ? OFFSET ?`,
		args...)
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

// searchLike 使用 LIKE 子串匹配的旧实现，用于短查询（<3 字符）回退。
func (s *EmailStore) searchLike(query string, accountID int64, limit, offset int) ([]models.Email, error) {
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
	TotalEmails  int   `json:"total_emails"`
	UnreadEmails int   `json:"unread_emails"`
	TodayEmails  int   `json:"today_emails"`
	AccountCount int   `json:"account_count"`
	StorageBytes int64 `json:"storage_bytes"`
	StorageLimit int64 `json:"storage_limit"`
	ContactCount int   `json:"contact_count"`
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
			COALESCE(SUM(CASE WHEN folder IN (`+folderLiterals("INBOX")+`) AND is_read=0 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN folder IN (`+folderLiterals("Drafts")+`) THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN is_starred=1 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN folder IN (`+folderLiterals("Sent")+`) THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN folder IN (`+folderLiterals("Trash")+`) THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN is_read=0 THEN 1 ELSE 0 END), 0)
		FROM emails
	`).Scan(&inboxUnread, &drafts, &starred, &sent, &trash, &unread)
	if err != nil {
		return nil, err
	}
	return &FolderCounts{InboxUnread: inboxUnread, Drafts: drafts, Starred: starred, Sent: sent, Trash: trash, Unread: unread}, nil
}

func (s *EmailStore) Stats(fromDate, toDate string) (*MailStats, error) {
	var st MailStats
	// 构建可选的日期过滤条件
	var dateCond string
	if fromDate != "" {
		dateCond += " AND date >= ?"
	}
	if toDate != "" {
		if dateCond != "" {
			dateCond += " AND"
		} else {
			dateCond += " AND"
		}
		dateCond += " date <= ?"
	}
	err := s.db.QueryRow(`
		WITH base AS (
			SELECT
				(SELECT COUNT(*) FROM emails`+dateCond+`) AS total,
				(SELECT COUNT(*) FROM emails WHERE is_read = 0`+dateCond+`) AS unread,
				(SELECT COUNT(*) FROM emails WHERE date >= date('now', 'start of day')`+dateCond+`) AS today,
				COALESCE((SELECT SUM(size) FROM attachments), 0) AS storage_bytes
		)
		SELECT
			COALESCE((SELECT total FROM base), 0),
			COALESCE((SELECT unread FROM base), 0),
			COALESCE((SELECT today FROM base), 0),
			COALESCE((SELECT COUNT(*) FROM accounts), 0),
			COALESCE((SELECT storage_bytes FROM base), 0),
			COALESCE((SELECT value FROM settings WHERE key = 'storage_limit_bytes'), 0),
			COALESCE((SELECT COUNT(*) FROM contacts), 0)
	`, dateArgs(fromDate, toDate)...).Scan(&st.TotalEmails, &st.UnreadEmails, &st.TodayEmails, &st.AccountCount, &st.StorageBytes, &st.StorageLimit, &st.ContactCount)
	if err != nil {
		return nil, err
	}
	return &st, nil
}

func dateArgs(fromDate, toDate string) []any {
	var args []any
	if fromDate != "" {
		args = append(args, fromDate+" 00:00:00")
	}
	if toDate != "" {
		args = append(args, toDate+" 23:59:59")
	}
	return args
}

type TrendPoint struct {
	Date    string `json:"date"`
	Receive int    `json:"receive"`
	Send    int    `json:"send"`
}

func (s *EmailStore) Trend(days int) ([]TrendPoint, error) {
	rows, err := s.db.Query(`
		SELECT date(e.date, 'localtime') as day,
			COUNT(CASE WHEN e.folder IN (`+folderLiterals("INBOX")+`) THEN 1 END) as receive,
			COUNT(CASE WHEN e.folder IN (`+folderLiterals("Sent")+`) THEN 1 END) as send
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
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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

// MaxUID 返回该账号/文件夹下最大的 UID，用于增量同步判断是否有新邮件。
func (s *EmailStore) MaxUID(accountID int64, folder string) (uint32, error) {
	var maxUID uint32
	err := s.db.QueryRow(
		`SELECT COALESCE(MAX(uid), 0) FROM emails WHERE account_id = ? AND folder = ?`,
		accountID, folder).Scan(&maxUID)
	return maxUID, err
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
	real := s.ResolveFolder(folder)
	_, err := s.db.Exec(`UPDATE emails SET folder = ? WHERE id = ?`, real, id)
	return err
}

// ResolveFolder 把规范文件夹名（如 "Trash"/"SPAM"/"Sent"）解析为该账号实际存储使用的
// IMAP 文件夹名。若 DB 中已存在匹配的实际文件夹则返回它，否则回退为规范名本身。
func (s *EmailStore) ResolveFolder(folder string) string {
	names := canonicalFolders(folder)
	if len(names) == 1 {
		return names[0]
	}
	var existing string
	err := s.db.QueryRow(`SELECT folder FROM emails WHERE folder IN (` + folderLiterals(folder) + `) LIMIT 1`).Scan(&existing)
	if err == nil && existing != "" {
		return existing
	}
	// 无既有记录时回退为规范化名（如 SPAM→Spam）
	if canonical, ok := map[string]string{"SPAM": "Spam", "Trash": "Trash"}[folder]; ok {
		return canonical
	}
	return folder
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

// BulkUpdateFlags updates is_read/is_starred for multiple emails.
func (s *EmailStore) BulkUpdateFlags(ids []int64, isRead, isStarred *bool) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := strings.Repeat("?,", len(ids)-1) + "?"
	query := fmt.Sprintf(`UPDATE emails SET `)
	var sets []string
	var args []any
	if isRead != nil {
		sets = append(sets, "is_read = ?")
		args = append(args, *isRead)
	}
	if isStarred != nil {
		sets = append(sets, "is_starred = ?")
		args = append(args, *isStarred)
	}
	if len(sets) == 0 {
		return nil
	}
	query += strings.Join(sets, ", ") + ` WHERE id IN (` + placeholders + `)`
	for _, id := range ids {
		args = append(args, id)
	}
	_, err := s.db.Exec(query, args...)
	return err
}

// BulkMove moves multiple emails to a folder.
func (s *EmailStore) BulkMove(ids []int64, folder string) error {
	if len(ids) == 0 {
		return nil
	}
	realFolder := s.ResolveFolder(folder)
	placeholders := strings.Repeat("?,", len(ids)-1) + "?"
	query := "UPDATE emails SET folder = ? WHERE id IN (" + placeholders + ")"
	args := []any{realFolder}
	for _, id := range ids {
		args = append(args, id)
	}
	_, err := s.db.Exec(query, args...)
	return err
}

// BulkDelete deletes multiple emails.
func (s *EmailStore) BulkDelete(ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := strings.Repeat("?,", len(ids)-1) + "?"
	query := "DELETE FROM emails WHERE id IN (" + placeholders + ")"
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	_, err := s.db.Exec(query, args...)
	return err
}

// DeleteExpiredTrash 删除指定账号Trash文件夹中早于 cutoffDate 的邮件记录（仅删 DB，不删 .eml 文件）。
// folder 参数支持多种已删除文件夹别名。
func (s *EmailStore) DeleteExpiredTrash(accountID int64, cutoffDate string) (int64, error) {
	names := canonicalFolders("Trash")
	parts := make([]string, 0, len(names))
	for _, n := range names {
		parts = append(parts, "'"+strings.ReplaceAll(n, "'", "''")+"'")
	}
	folderIn := strings.Join(parts, ",")
	result, err := s.db.Exec(`
		DELETE FROM emails
		 WHERE account_id = ?
		   AND folder IN (`+folderIn+`)
		   AND date < ?
	`, accountID, cutoffDate)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// CountTrashExpired 统计指定账号 Trash 文件夹中早于 cutoffDate 的邮件数量。
func (s *EmailStore) CountTrashExpired(accountID int64, cutoffDate string) (int, error) {
	names := canonicalFolders("Trash")
	parts := make([]string, 0, len(names))
	for _, n := range names {
		parts = append(parts, "'"+strings.ReplaceAll(n, "'", "''")+"'")
	}
	folderIn := strings.Join(parts, ",")
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(*) FROM emails
		 WHERE account_id = ?
		   AND folder IN (`+folderIn+`)
		   AND date < ?
	`, accountID, cutoffDate).Scan(&count)
	return count, err
}
