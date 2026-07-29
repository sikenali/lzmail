package store

import (
	"database/sql"
	"github.com/lzmail/backend/internal/models"
)

type AccountStore struct {
	db *sql.DB
}

func NewAccountStore(db *sql.DB) *AccountStore {
	return &AccountStore{db: db}
}

func (s *AccountStore) List() ([]models.Account, error) {
	rows, err := s.db.Query(`SELECT id, name, email, imap_host, imap_port, smtp_host, smtp_port, auth_type, username, use_idle, brand_color, created_at, updated_at FROM accounts ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var accounts []models.Account
	for rows.Next() {
		var a models.Account
		if err := rows.Scan(&a.ID, &a.Name, &a.Email, &a.IMAPHost, &a.IMAPPort, &a.SMTPHost, &a.SMTPPort, &a.AuthType, &a.Username, &a.UseIDLE, &a.BrandColor, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	return accounts, nil
}

func (s *AccountStore) GetByID(id int64) (*models.Account, error) {
	var a models.Account
	err := s.db.QueryRow(`SELECT id, name, email, imap_host, imap_port, smtp_host, smtp_port, auth_type, username, use_idle, brand_color, created_at, updated_at FROM accounts WHERE id = ?`, id).
		Scan(&a.ID, &a.Name, &a.Email, &a.IMAPHost, &a.IMAPPort, &a.SMTPHost, &a.SMTPPort, &a.AuthType, &a.Username, &a.UseIDLE, &a.BrandColor, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *AccountStore) Create(a *models.Account) error {
	result, err := s.db.Exec(`INSERT INTO accounts (name, email, imap_host, imap_port, smtp_host, smtp_port, auth_type, username, use_idle, brand_color) VALUES (?,?,?,?,?,?,?,?,?,?)`,
		a.Name, a.Email, a.IMAPHost, a.IMAPPort, a.SMTPHost, a.SMTPPort, a.AuthType, a.Username, a.UseIDLE, a.BrandColor)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	a.ID = id
	return nil
}

func (s *AccountStore) Delete(id int64) error {
	_, err := s.db.Exec(`DELETE FROM accounts WHERE id = ?`, id)
	return err
}
