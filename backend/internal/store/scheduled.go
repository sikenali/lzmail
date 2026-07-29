package store

import (
	"database/sql"
	"math"
	"time"
)

// MaxSendAttempts 定时邮件发送的最大尝试次数，超过则标记 failed。
const MaxSendAttempts = 5

// ScheduledEmail 是持久化的定时发送任务
type ScheduledEmail struct {
	ID              int64
	AccountID       int64
	To              string
	Cc              string
	Bcc             string
	Subject         string
	BodyText        string
	BodyHTML        string
	AttachmentsJSON string
	SendAt          time.Time
	Status          string
}

type ScheduledStore struct {
	db *sql.DB
}

func NewScheduledStore(db *sql.DB) *ScheduledStore {
	return &ScheduledStore{db: db}
}

// Create 插入一条定时发送任务，返回自增 ID。
func (s *ScheduledStore) Create(accountID int64, to, cc, bcc, subject, bodyText, bodyHTML, attachmentsJSON string, sendAt time.Time) (int64, error) {
	var id int64
	err := s.db.QueryRow(
		`INSERT INTO scheduled_emails (account_id, to_addr, cc, bcc, subject, body_text, body_html, attachments_json, send_at, status)
		 VALUES (?,?,?,?,?,?,?,?,?, 'pending')
		 RETURNING id`,
		accountID, to, cc, bcc, subject, bodyText, bodyHTML, attachmentsJSON,
		sendAt.UTC().Format(time.RFC3339),
	).Scan(&id)
	return id, err
}

// Due 返回到点未发送的待办任务，最多 50 条。
func (s *ScheduledStore) Due(now time.Time) ([]ScheduledEmail, error) {
	rows, err := s.db.Query(
		`SELECT id, account_id, to_addr, cc, bcc, subject, body_text, body_html, attachments_json, send_at, status
		 FROM scheduled_emails
		 WHERE status = 'pending' AND send_at <= ?
		 ORDER BY send_at
		 LIMIT 50`,
		now.UTC().Format(time.RFC3339),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var jobs []ScheduledEmail
	for rows.Next() {
		var j ScheduledEmail
		var sendAt string
		if err := rows.Scan(&j.ID, &j.AccountID, &j.To, &j.Cc, &j.Bcc, &j.Subject, &j.BodyText, &j.BodyHTML, &j.AttachmentsJSON, &sendAt, &j.Status); err != nil {
			return nil, err
		}
		if t, err := time.Parse(time.RFC3339, sendAt); err == nil {
			j.SendAt = t
		}
		jobs = append(jobs, j)
	}
	return jobs, rows.Err()
}

// SetStatus 更新任务状态：sent / failed
func (s *ScheduledStore) SetStatus(id int64, status string) error {
	_, err := s.db.Exec(`UPDATE scheduled_emails SET status = ? WHERE id = ?`, status, id)
	return err
}

// RecordFailure 记录一次发送失败并做退避重试：未达最大尝试次数时把 send_at 顺延，
// 否则标记为 failed。返回 next time 表示重试时间，为零表示已放弃。
func (s *ScheduledStore) RecordFailure(id int64) (time.Time, error) {
	var attempts int
	if err := s.db.QueryRow(
		`UPDATE scheduled_emails SET attempts = attempts + 1 WHERE id = ? RETURNING attempts`, id,
	).Scan(&attempts); err != nil {
		return time.Time{}, err
	}
	if attempts >= MaxSendAttempts {
		if _, err := s.db.Exec(`UPDATE scheduled_emails SET status = 'failed' WHERE id = ?`, id); err != nil {
			return time.Time{}, err
		}
		return time.Time{}, nil
	}
	backoff := time.Duration(math.Pow(2, float64(attempts-1))) * time.Minute
	requeue := time.Now().Add(backoff)
	if _, err := s.db.Exec(
		`UPDATE scheduled_emails SET send_at = ? WHERE id = ?`,
		requeue.UTC().Format(time.RFC3339), id,
	); err != nil {
		return time.Time{}, err
	}
	return requeue, nil
}
