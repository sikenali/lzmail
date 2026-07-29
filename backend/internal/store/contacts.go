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

type ContactPageResult struct {
	Items []models.Contact `json:"items"`
	Total int              `json:"total"`
}

func (s *ContactStore) ListPage(accountID int64, limit, offset int) (*ContactPageResult, error) {
	countSQL := "SELECT COUNT(*) FROM contacts"
	listSQL := `SELECT id, name, email, COALESCE(phone,''), COALESCE(company,''), COALESCE(title,''), account_id, created_at, updated_at FROM contacts`
	var args []any

	if accountID > 0 {
		countSQL += " WHERE account_id = ?"
		listSQL += " WHERE account_id = ?"
		args = append(args, accountID)
	}

	var total int
	if err := s.db.QueryRow(countSQL, args...).Scan(&total); err != nil {
		return nil, err
	}

	args = append(args, limit, offset)
	rows, err := s.db.Query(listSQL+` ORDER BY name LIMIT ? OFFSET ?`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []models.Contact
	for rows.Next() {
		var c models.Contact
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.Phone, &c.Company, &c.Title, &c.AccountID, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	return &ContactPageResult{Items: contacts, Total: total}, nil
}

func (s *ContactStore) Search(q string, accountID int64, limit, offset int) (*ContactPageResult, error) {
	pattern := "%" + q + "%"
	countSQL := `SELECT COUNT(*) FROM contacts WHERE (name LIKE ? OR email LIKE ?)`
	listSQL := `SELECT id, name, email, COALESCE(phone,''), COALESCE(company,''), COALESCE(title,''), account_id, created_at, updated_at FROM contacts WHERE (name LIKE ? OR email LIKE ?)`
	var countArgs []any = []any{pattern, pattern}
	var listArgs []any = []any{pattern, pattern}

	if accountID > 0 {
		countSQL += " AND account_id = ?"
		listSQL += " AND account_id = ?"
		countArgs = append(countArgs, accountID)
		listArgs = append(listArgs, accountID)
	}

	var total int
	if err := s.db.QueryRow(countSQL, countArgs...).Scan(&total); err != nil {
		return nil, err
	}

	listArgs = append(listArgs, limit, offset)
	rows, err := s.db.Query(listSQL+` ORDER BY name LIMIT ? OFFSET ?`, listArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []models.Contact
	for rows.Next() {
		var c models.Contact
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.Phone, &c.Company, &c.Title, &c.AccountID, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	return &ContactPageResult{Items: contacts, Total: total}, nil
}

func (s *ContactStore) BatchUpsert(contacts []models.Contact) error {
	if len(contacts) == 0 {
		return nil
	}
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	stmt, err := tx.Prepare(`
		INSERT INTO contacts (name, email, phone, company, title, account_id)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(email, account_id) DO UPDATE SET
			name=excluded.name, phone=excluded.phone, company=excluded.company,
			title=excluded.title, updated_at=datetime('now')
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for _, c := range contacts {
		if _, err := stmt.Exec(c.Name, c.Email, c.Phone, c.Company, c.Title, c.AccountID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *ContactStore) Create(c *models.Contact) error {
	result, err := s.db.Exec(`INSERT INTO contacts (name, email, phone, company, title, account_id) VALUES (?,?,?,?,?,?) ON CONFLICT(email, account_id) DO UPDATE SET name=excluded.name, phone=excluded.phone, company=excluded.company, title=excluded.title, updated_at=datetime('now')`, c.Name, c.Email, c.Phone, c.Company, c.Title, c.AccountID)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	c.ID = id
	return nil
}

func (s *ContactStore) Update(c *models.Contact) error {
	_, err := s.db.Exec(`UPDATE contacts SET name = ?, email = ?, phone = ?, company = ?, title = ?, account_id = ?, updated_at = datetime('now') WHERE id = ?`,
		c.Name, c.Email, c.Phone, c.Company, c.Title, c.AccountID, c.ID)
	return err
}

func (s *ContactStore) Delete(id int64) error {
	_, err := s.db.Exec(`DELETE FROM contacts WHERE id = ?`, id)
	return err
}
