package store

import (
	"database/sql"
	"fmt"

	"github.com/lzmail/backend/internal/models"
)

type TagStore struct {
	db *sql.DB
}

func NewTagStore(db *sql.DB) *TagStore {
	return &TagStore{db: db}
}

func (s *TagStore) List(accountID int64) ([]models.Tag, error) {
	rows, err := s.db.Query(`SELECT id, name, account_id, created_at FROM tags WHERE account_id = ? ORDER BY created_at DESC`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []models.Tag
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.AccountID, &t.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

func (s *TagStore) Create(name string, accountID int64) (*models.Tag, error) {
	var id int64
	err := s.db.QueryRow(`INSERT INTO tags (name, account_id) VALUES (?, ?) RETURNING id`, name, accountID).Scan(&id)
	if err != nil {
		return nil, err
	}
	return &models.Tag{ID: id, Name: name, AccountID: accountID}, nil
}

func (s *TagStore) Delete(id int64, accountID int64) error {
	_, err := s.db.Exec(`DELETE FROM tags WHERE id = ? AND account_id = ?`, id, accountID)
	return err
}

func (s *TagStore) GetTagsByEmailID(emailID int64) ([]models.Tag, error) {
	rows, err := s.db.Query(`
		SELECT t.id, t.name, t.account_id, t.created_at
		FROM tags t
		JOIN email_tags et ON et.tag_id = t.id
		WHERE et.email_id = ?
		ORDER BY t.created_at DESC
	`, emailID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []models.Tag
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.AccountID, &t.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

// SetTagsForEmail 替换邮件的所有标签：先删除旧关联，再插入新关联。
func (s *TagStore) SetTagsForEmail(emailID int64, tagIDs []int64) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM email_tags WHERE email_id = ?`, emailID); err != nil {
		return err
	}
	if len(tagIDs) > 0 {
		stmt, err := tx.Prepare(`INSERT INTO email_tags (email_id, tag_id) VALUES (?, ?)`)
		if err != nil {
			return err
		}
		defer stmt.Close()
		for _, tid := range tagIDs {
			if _, err := stmt.Exec(emailID, tid); err != nil {
				return fmt.Errorf("insert tag %d: %w", tid, err)
			}
		}
	}
	return tx.Commit()
}

// DeleteEmailTags 删除与指定邮件相关的所有标签关联。
func (s *TagStore) DeleteEmailTags(emailID int64) error {
	_, err := s.db.Exec(`DELETE FROM email_tags WHERE email_id = ?`, emailID)
	return err
}
