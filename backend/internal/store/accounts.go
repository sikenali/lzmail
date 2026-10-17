package store

import (
	"database/sql"
	"fmt"
	"github.com/lzmail/backend/internal/crypto"
	"github.com/lzmail/backend/internal/models"
	"log"
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
		log.Printf("[store] account %d (%s) decrypt password failed (key may have changed): %v", a.ID, a.Email, err)
		return fmt.Errorf("decrypt password: %w", err)
	}
	a.Password = decrypted
	return nil
}

func (s *AccountStore) encryptOAuthToken(a *models.Account) error {
	if a.OAuth2Token == "" {
		return nil
	}
	encrypted, err := crypto.Encrypt(a.OAuth2Token)
	if err != nil {
		return fmt.Errorf("encrypt oauth2 token: %w", err)
	}
	a.OAuth2Token = encrypted
	return nil
}

func (s *AccountStore) decryptOAuthToken(a *models.Account) error {
	if a.OAuth2Token == "" {
		return nil
	}
	decrypted, err := crypto.Decrypt(a.OAuth2Token)
	if err != nil {
		return fmt.Errorf("decrypt oauth2 token: %w", err)
	}
	a.OAuth2Token = decrypted
	return nil
}

const accountColumns = `id, name, email, imap_host, imap_port, smtp_host, smtp_port, auth_type, auth_method, provider, username, password, oauth2_token, use_idle, brand_color, created_at, updated_at`

func scanAccount(row interface{ Scan(...any) error }, a *models.Account) error {
	return row.Scan(&a.ID, &a.Name, &a.Email, &a.IMAPHost, &a.IMAPPort, &a.SMTPHost, &a.SMTPPort,
		&a.AuthType, &a.AuthMethod, &a.Provider, &a.Username, &a.Password, &a.OAuth2Token,
		&a.UseIDLE, &a.BrandColor, &a.CreatedAt, &a.UpdatedAt)
}

func (s *AccountStore) List() ([]models.Account, error) {
	rows, err := s.db.Query(`SELECT ` + accountColumns + ` FROM accounts ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var accounts []models.Account
	for rows.Next() {
		var a models.Account
		if err := scanAccount(rows, &a); err != nil {
			return nil, err
		}
		// 单个账号解密失败不应阻塞整个账号列表；记录并继续。
	if err := s.decryptAccount(&a); err != nil {
		log.Printf("[store] account %d (%s) decrypt password failed (key may have changed), password will be empty", a.ID, a.Email)
		a.Password = ""
	}
	if err := s.decryptOAuthToken(&a); err != nil {
		log.Printf("[store] account %d (%s) decrypt oauth token failed (key may have changed), token will be empty", a.ID, a.Email)
		a.OAuth2Token = ""
	}
		accounts = append(accounts, a)
	}
	return accounts, nil
}

func (s *AccountStore) ListPublic() ([]models.Account, error) {
	rows, err := s.db.Query(`SELECT id, name, email, imap_host, imap_port, smtp_host, smtp_port, auth_type, auth_method, provider, username, use_idle, brand_color, created_at, updated_at FROM accounts ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var accounts []models.Account
	for rows.Next() {
		var a models.Account
		if err := rows.Scan(&a.ID, &a.Name, &a.Email, &a.IMAPHost, &a.IMAPPort, &a.SMTPHost, &a.SMTPPort, &a.AuthType, &a.AuthMethod, &a.Provider, &a.Username, &a.UseIDLE, &a.BrandColor, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	return accounts, nil
}

func (s *AccountStore) GetByID(id int64) (*models.Account, error) {
	var a models.Account
	err := s.db.QueryRow(`SELECT `+accountColumns+` FROM accounts WHERE id = ?`, id).Scan(
		&a.ID, &a.Name, &a.Email, &a.IMAPHost, &a.IMAPPort, &a.SMTPHost, &a.SMTPPort,
		&a.AuthType, &a.AuthMethod, &a.Provider, &a.Username, &a.Password, &a.OAuth2Token,
		&a.UseIDLE, &a.BrandColor, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if err := s.decryptAccount(&a); err != nil {
		return nil, err
	}
	if err := s.decryptOAuthToken(&a); err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *AccountStore) Create(a *models.Account) error {
	if err := s.encryptAccount(a); err != nil {
		return err
	}
	if err := s.encryptOAuthToken(a); err != nil {
		return err
	}
	result, err := s.db.Exec(`INSERT INTO accounts (name, email, imap_host, imap_port, smtp_host, smtp_port, auth_type, auth_method, provider, username, password, oauth2_token, use_idle, brand_color) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		a.Name, a.Email, a.IMAPHost, a.IMAPPort, a.SMTPHost, a.SMTPPort, a.AuthType, a.AuthMethod, a.Provider, a.Username, a.Password, a.OAuth2Token, a.UseIDLE, a.BrandColor)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	a.ID = id
	s.db.QueryRow(`SELECT created_at, updated_at FROM accounts WHERE id = ?`, id).Scan(&a.CreatedAt, &a.UpdatedAt)
	a.Password = ""
	a.OAuth2Token = ""
	return nil
}

func (s *AccountStore) Update(a *models.Account) error {
	var storedPassword, storedToken string
	row := s.db.QueryRow(`SELECT password, oauth2_token FROM accounts WHERE id = ?`, a.ID)
	if err := row.Scan(&storedPassword, &storedToken); err != nil {
		return fmt.Errorf("query existing account: %w", err)
	}
	if a.Password != "" {
		encrypted, err := crypto.Encrypt(a.Password)
		if err != nil {
			return fmt.Errorf("encrypt password: %w", err)
		}
		a.Password = encrypted
	} else {
		a.Password = storedPassword
	}
	if a.OAuth2Token != "" {
		encrypted, err := crypto.Encrypt(a.OAuth2Token)
		if err != nil {
			return fmt.Errorf("encrypt oauth2 token: %w", err)
		}
		a.OAuth2Token = encrypted
	} else {
		a.OAuth2Token = storedToken
	}
	_, err := s.db.Exec(
		`UPDATE accounts SET name=?, email=?, imap_host=?, imap_port=?, smtp_host=?, smtp_port=?,
		 auth_type=?, auth_method=?, provider=?, username=?, password=?, oauth2_token=?, use_idle=?, brand_color=?, updated_at=CURRENT_TIMESTAMP
		 WHERE id=?`,
		a.Name, a.Email, a.IMAPHost, a.IMAPPort, a.SMTPHost, a.SMTPPort,
		a.AuthType, a.AuthMethod, a.Provider, a.Username, a.Password, a.OAuth2Token, a.UseIDLE, a.BrandColor, a.ID,
	)
	return err
}

func (s *AccountStore) UpdateOAuth2Token(id int64, tokenData *models.OAuth2TokenData) error {
	tokenStr, err := tokenData.Marshal()
	if err != nil {
		return err
	}
	encrypted, err := crypto.Encrypt(tokenStr)
	if err != nil {
		return fmt.Errorf("encrypt oauth2 token: %w", err)
	}
	_, err = s.db.Exec(`UPDATE accounts SET oauth2_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, encrypted, id)
	return err
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
