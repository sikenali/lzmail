package models

import "time"

type Tag struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	AccountID int64     `json:"account_id"`
	CreatedAt time.Time `json:"created_at"`
}
