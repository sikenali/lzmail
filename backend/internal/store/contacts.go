package store

import (
	"database/sql"
	"github.com/lzmail/backend/internal/models"
)

type ContactStore struct {
	db *sql.DB
}

func NewContactStore(db *sql.DB) *ContactStore {
	return &ContactStore{db: db}
}

func (s *ContactStore) List() ([]models.Contact, error) {
	rows, err := s.db.Query(`SELECT id, name, email, account_id, created_at, updated_at FROM contacts ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var contacts []models.Contact
	for rows.Next() {
		var c models.Contact
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.AccountID, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	return contacts, nil
}

func (s *ContactStore) Create(c *models.Contact) error {
	result, err := s.db.Exec(`INSERT INTO contacts (name, email, account_id) VALUES (?,?,?) ON CONFLICT(email, account_id) DO NOTHING`, c.Name, c.Email, c.AccountID)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	c.ID = id
	return nil
}
