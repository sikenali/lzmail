package models

import "time"

type Email struct {
	ID              int64      `json:"id"`
	AccountID       int64      `json:"account_id"`
	UID             uint32     `json:"uid"`
	Folder          string     `json:"folder"`
	Subject         string     `json:"subject"`
	From            string     `json:"from"`
	FromName        string     `json:"from_name"`
	To              string     `json:"to"`
	CC              string     `json:"cc"`
	Date            time.Time  `json:"date"`
	BodyPreview     string     `json:"body_preview"`
	IsRead          bool       `json:"is_read"`
	IsStarred       bool       `json:"is_starred"`
	HasAttachments  bool       `json:"has_attachments"`
	ArchivePath     string     `json:"archive_path"`
	MessageID       string     `json:"message_id"`
	CreatedAt       time.Time  `json:"created_at"`
	ScheduleAt      *time.Time `json:"-"`
	AccountName     string     `json:"account_name"`
	AccountBrand    string     `json:"account_brand"`
}

type Attachment struct {
	ID       int64  `json:"id"`
	EmailID  int64  `json:"email_id"`
	Filename string `json:"filename"`
	MimeType string `json:"mime_type"`
	Size     int64  `json:"size"`
	Path     string `json:"path"`
}
