package store

import (
	"database/sql"
	"fmt"
	"github.com/lzmail/backend/internal/crypto"
	"github.com/lzmail/backend/internal/models"
)

type AccountStore struct {
	db *sql.DB
}

func NewAccountStore(db *sql.DB) *AccountStore {
	return &AccountStore{db: db}
}

func (s *AccountStore) encryptAccount(a *models.Account) error {
	if a.Password == "" {
		return nil
	}
	encrypted, err := crypto.Encrypt(a.Password)
	if err != nil {
		return fmt.Errorf("encrypt password: %w", err)
	}
	a.Password = encrypted
	return nil
}

func (s *AccountStore) decryptAccount(a *models.Account) error {
	if a.Password == "" {
		return nil
	}
	decrypted, err := crypto.Decrypt(a.Password)
	if err != nil {
		return fmt.Errorf("decrypt password: %w", err)
	}
	a.Password = decrypted
	return nil
}

func (s *AccountStore) List() ([]models.Account, error) {
	rows, err := s.db.Query(`SELECT id, name, email, imap_host, imap_port, smtp_host, smtp_port, auth_type, username, password, use_idle, brand_color, created_at, updated_at FROM accounts ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var accounts []models.Account
	for rows.Next() {
		var a models.Account
		if err := rows.Scan(&a.ID, &a.Name, &a.Email, &a.IMAPHost, &a.IMAPPort, &a.SMTPHost, &a.SMTPPort, &a.AuthType, &a.Username, &a.Password, &a.UseIDLE, &a.BrandColor, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		if err := s.decryptAccount(&a); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	return accounts, nil
}

func (s *AccountStore) ListPublic() ([]models.Account, error) {
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
	err := s.db.QueryRow(`SELECT id, name, email, imap_host, imap_port, smtp_host, smtp_port, auth_type, username, password, use_idle, brand_color, created_at, updated_at FROM accounts WHERE id = ?`, id).
		Scan(&a.ID, &a.Name, &a.Email, &a.IMAPHost, &a.IMAPPort, &a.SMTPHost, &a.SMTPPort, &a.AuthType, &a.Username, &a.Password, &a.UseIDLE, &a.BrandColor, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if err := s.decryptAccount(&a); err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *AccountStore) Create(a *models.Account) error {
	if err := s.encryptAccount(a); err != nil {
		return err
	}
	result, err := s.db.Exec(`INSERT INTO accounts (name, email, imap_host, imap_port, smtp_host, smtp_port, auth_type, username, password, use_idle, brand_color) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		a.Name, a.Email, a.IMAPHost, a.IMAPPort, a.SMTPHost, a.SMTPPort, a.AuthType, a.Username, a.Password, a.UseIDLE, a.BrandColor)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	a.ID = id
	s.db.QueryRow(`SELECT created_at, updated_at FROM accounts WHERE id = ?`, id).Scan(&a.CreatedAt, &a.UpdatedAt)
	a.Password = ""
	return nil
}

func (s *AccountStore) UpdatePassword(id int64, password string) error {
	encrypted, err := crypto.Encrypt(password)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`UPDATE accounts SET password = ? WHERE id = ?`, encrypted, id)
	return err
}

func (s *AccountStore) Delete(id int64) error {
	_, err := s.db.Exec(`DELETE FROM accounts WHERE id = ?`, id)
	return err
}
