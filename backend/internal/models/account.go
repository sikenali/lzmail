package models

import "time"

type Account struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	IMAPHost    string    `json:"imap_host"`
	IMAPPort    int       `json:"imap_port"`
	SMTPHost    string    `json:"smtp_host"`
	SMTPPort    int       `json:"smtp_port"`
	AuthType    string    `json:"auth_type"`
	Username    string    `json:"username"`
	Password    string    `json:"-"`
	UseIDLE     bool      `json:"use_idle"`
	BrandColor  string    `json:"brand_color"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
