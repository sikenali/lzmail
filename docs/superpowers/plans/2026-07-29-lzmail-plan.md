# LZMail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted NAS email client with multi-account support, real-time sync, .eml archiving, and modern web UI.

**Architecture:** Go monolith backend (REST API + SSE push + IMAP sync engine) + Next.js/React frontend. SQLite for metadata, .eml files on filesystem for full email storage. Single-user deployment via Docker.

**Tech Stack:** Go 1.24, Next.js 15 + React 19, Tailwind CSS v4.2.1, Framer Motion v12.40.0, Lucide React, SQLite (WAL), Docker

---

## File Structure

```
D:\UGit\lzmail\
├── backend/
│   ├── cmd/lzmail/main.go
│   ├── internal/
│   │   ├── api/
│   │   │   ├── router.go
│   │   │   ├── accounts.go
│   │   │   ├── mails.go
│   │   │   ├── compose.go
│   │   │   ├── contacts.go
│   │   │   ├── attachments.go
│   │   │   └── events.go
│   │   ├── models/
│   │   │   ├── account.go
│   │   │   ├── email.go
│   │   │   └── contact.go
│   │   ├── store/
│   │   │   ├── db.go
│   │   │   ├── accounts.go
│   │   │   ├── emails.go
│   │   │   └── contacts.go
│   │   ├── sync/
│   │   │   ├── engine.go
│   │   │   ├── imap.go
│   │   │   └── smtp.go
│   │   ├── archive/
│   │   │   └── eml.go
│   │   └── sse/
│   │       └── hub.go
│   ├── go.mod
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── mail/page.tsx
│   │   │   ├── mail/[id]/page.tsx
│   │   │   ├── compose/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── contacts/page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── AccountSwitcher.tsx
│   │   │   │   └── Header.tsx
│   │   │   └── mail/
│   │   │       ├── MailList.tsx
│   │   │       ├── MailItem.tsx
│   │   │       └── MailDetail.tsx
│   │   ├── hooks/
│   │   │   └── useSSE.ts
│   │   ├── lib/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── docs/
    └── superpowers/
        ├── specs/2026-07-29-lzmail-design.md
        └── plans/2026-07-29-lzmail-plan.md
```

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Go backend module

**Files:**
- Create: `backend/go.mod`
- Create: `backend/cmd/lzmail/main.go`

- [ ] **Step 1: Create go.mod and main.go**

```go
// backend/go.mod
module github.com/lzmail/backend

go 1.24
```

```go
// backend/cmd/lzmail/main.go
package main

import "fmt"

func main() {
	fmt.Println("lzmail backend starting...")
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && go build ./cmd/lzmail/`
Expected: no error, binary produced

- [ ] **Step 3: Commit**

```bash
git add backend/go.mod backend/cmd/lzmail/main.go
git commit -m "chore: init Go backend module"
```

### Task 2: Initialize Next.js frontend

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create package.json with all dependencies**

```json
{
  "name": "lzmail-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.577.0",
    "framer-motion": "^12.40.0",
    "sonner": "^2.0.7",
    "recharts": "^3.8.1",
    "tailwindcss": "^4.2.1"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create next.config.js**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create app layout and homepage**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LZMail',
  description: 'Self-hosted NAS email client',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
```

```tsx
// frontend/src/app/page.tsx
export default function Home() {
  return <div className="p-8 text-lg">LZMail — loading...</div>
}
```

- [ ] **Step 5: Install dependencies and verify build**

Run: `cd frontend && npm install && npm run build`
Expected: Build succeeds, static output generated

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "chore: init Next.js frontend"
```

### Task 3: Create Docker setup

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    volumes:
      - lzmail-data:/data
      - lzmail-archives:/archives
    environment:
      - DATA_DIR=/data
      - ARCHIVE_DIR=/archives
      - PORT=8080

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8080

volumes:
  lzmail-data:
  lzmail-archives:
```

- [ ] **Step 2: Create backend/Dockerfile**

```dockerfile
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /lzmail ./cmd/lzmail

FROM alpine:3.20
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /lzmail .
EXPOSE 8080
CMD ["./lzmail"]
```

- [ ] **Step 3: Create frontend/Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml backend/Dockerfile frontend/Dockerfile
git commit -m "chore: add Docker setup"
```

---

## Phase 2: Backend Data Layer

### Task 4: Define data models

**Files:**
- Create: `backend/internal/models/account.go`
- Create: `backend/internal/models/email.go`
- Create: `backend/internal/models/contact.go`

- [ ] **Step 1: Create account model**

```go
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
	Password    string    `json:"-"` // encrypted
	UseIDLE     bool      `json:"use_idle"`
	BrandColor  string    `json:"brand_color"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
```

- [ ] **Step 2: Create email model**

```go
package models

import "time"

type Email struct {
	ID           int64     `json:"id"`
	AccountID    int64     `json:"account_id"`
	UID          uint32    `json:"uid"`
	Folder       string    `json:"folder"`
	Subject      string    `json:"subject"`
	From         string    `json:"from"`
	To           string    `json:"to"`
	CC           string    `json:"cc"`
	Date         time.Time `json:"date"`
	BodyPreview  string    `json:"body_preview"`
	IsRead       bool      `json:"is_read"`
	IsStarred    bool      `json:"is_starred"`
	HasAttachments bool    `json:"has_attachments"`
	ArchivePath  string    `json:"archive_path"`
	MessageID    string    `json:"message_id"`
	CreatedAt    time.Time `json:"created_at"`
}

type Attachment struct {
	ID       int64  `json:"id"`
	EmailID  int64  `json:"email_id"`
	Filename string `json:"filename"`
	MimeType string `json:"mime_type"`
	Size     int64  `json:"size"`
	Path     string `json:"path"`
}
```

- [ ] **Step 3: Create contact model**

```go
package models

import "time"

type Contact struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	AccountID int64     `json:"account_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && go build ./internal/models/`
Expected: no error

- [ ] **Step 5: Commit**

```bash
git add backend/internal/models/
git commit -m "feat: add data models"
```

### Task 5: SQLite database layer

**Files:**
- Create: `backend/internal/store/db.go`
- Create: `backend/internal/store/accounts.go`
- Create: `backend/internal/store/emails.go`
- Create: `backend/internal/store/contacts.go`

- [ ] **Step 1: Create database connection and migrations**

```go
// backend/internal/store/db.go
package store

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
)

func OpenDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", path+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return nil, err
	}
	if err := migrate(db); err != nil {
		return nil, err
	}
	return db, nil
}

func migrate(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS accounts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		imap_host TEXT NOT NULL,
		imap_port INTEGER NOT NULL DEFAULT 993,
		smtp_host TEXT NOT NULL,
		smtp_port INTEGER NOT NULL DEFAULT 587,
		auth_type TEXT NOT NULL DEFAULT 'password',
		username TEXT NOT NULL,
		password BLOB,
		use_idle INTEGER NOT NULL DEFAULT 0,
		brand_color TEXT NOT NULL DEFAULT '#6366f1',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS emails (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
		uid INTEGER NOT NULL,
		folder TEXT NOT NULL DEFAULT 'INBOX',
		subject TEXT,
		from_addr TEXT,
		to_addr TEXT,
		cc TEXT,
		date DATETIME,
		body_preview TEXT,
		is_read INTEGER NOT NULL DEFAULT 0,
		is_starred INTEGER NOT NULL DEFAULT 0,
		has_attachments INTEGER NOT NULL DEFAULT 0,
		archive_path TEXT,
		message_id TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(account_id, uid)
	);
	CREATE TABLE IF NOT EXISTS attachments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
		filename TEXT NOT NULL,
		mime_type TEXT,
		size INTEGER DEFAULT 0,
		path TEXT
	);
	CREATE TABLE IF NOT EXISTS contacts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		email TEXT NOT NULL,
		account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(email, account_id)
	);
	CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id, date DESC);
	CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(account_id, folder);
	`
	_, err := db.Exec(schema)
	return err
}
```

- [ ] **Step 2: Create accounts store**

```go
// backend/internal/store/accounts.go
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
```

- [ ] **Step 3: Create emails store**

```go
// backend/internal/store/emails.go
package store

import (
	"database/sql"
	"github.com/lzmail/backend/internal/models"
)

type EmailStore struct {
	db *sql.DB
}

func NewEmailStore(db *sql.DB) *EmailStore {
	return &EmailStore{db: db}
}

func (s *EmailStore) List(accountID int64, folder string, limit, offset int) ([]models.Email, error) {
	rows, err := s.db.Query(
		`SELECT id, account_id, uid, folder, subject, from_addr, to_addr, date, body_preview, is_read, is_starred, has_attachments, archive_path, message_id, created_at
		 FROM emails WHERE account_id = ? AND folder = ? ORDER BY date DESC LIMIT ? OFFSET ?`,
		accountID, folder, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var emails []models.Email
	for rows.Next() {
		var e models.Email
		if err := rows.Scan(&e.ID, &e.AccountID, &e.UID, &e.Folder, &e.Subject, &e.From, &e.To, &e.Date, &e.BodyPreview, &e.IsRead, &e.IsStarred, &e.HasAttachments, &e.ArchivePath, &e.MessageID, &e.CreatedAt); err != nil {
			return nil, err
		}
		emails = append(emails, e)
	}
	return emails, nil
}

func (s *EmailStore) Upsert(e *models.Email) error {
	_, err := s.db.Exec(
		`INSERT INTO emails (account_id, uid, folder, subject, from_addr, to_addr, cc, date, body_preview, has_attachments, archive_path, message_id)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
		 ON CONFLICT(account_id, uid) DO UPDATE SET subject=excluded.subject, from_addr=excluded.from_addr, date=excluded.date, body_preview=excluded.body_preview`,
		e.AccountID, e.UID, e.Folder, e.Subject, e.From, e.To, e.CC, e.Date, e.BodyPreview, e.HasAttachments, e.ArchivePath, e.MessageID)
	return err
}

func (s *EmailStore) MarkRead(id int64) error {
	_, err := s.db.Exec(`UPDATE emails SET is_read = 1 WHERE id = ?`, id)
	return err
}

func (s *EmailStore) MarkStar(id int64, starred bool) error {
	_, err := s.db.Exec(`UPDATE emails SET is_starred = ? WHERE id = ?`, starred, id)
	return err
}

func (s *EmailStore) Delete(id int64) error {
	_, err := s.db.Exec(`DELETE FROM emails WHERE id = ?`, id)
	return err
}
```

- [ ] **Step 4: Create contacts store**

```go
// backend/internal/store/contacts.go
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
```

- [ ] **Step 5: Add dependency and verify compilation**

Run: `cd backend && go get github.com/mattn/go-sqlite3 && go build ./internal/store/`
Expected: no error

- [ ] **Step 6: Commit**

```bash
git add backend/internal/store/ backend/go.mod backend/go.sum
git commit -m "feat: add SQLite data layer"
```

---

## Phase 3: Backend API Layer

### Task 6: Set up HTTP router and core handlers

**Files:**
- Create: `backend/internal/api/router.go`
- Create: `backend/internal/config/config.go`

- [ ] **Step 1: Create config**

```go
// backend/internal/config/config.go
package config

import "os"

type Config struct {
	Port       string
	DataDir    string
	ArchiveDir string
}

func Load() *Config {
	return &Config{
		Port:       getEnv("PORT", "8080"),
		DataDir:    getEnv("DATA_DIR", "./data"),
		ArchiveDir: getEnv("ARCHIVE_DIR", "./archives"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
```

- [ ] **Step 2: Create router with Go's net/http**

```go
// backend/internal/api/router.go
package api

import (
	"encoding/json"
	"net/http"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sse"
)

type Handler struct {
	accounts *store.AccountStore
	emails   *store.EmailStore
	contacts *store.ContactStore
	sseHub   *sse.Hub
}

func NewHandler(as *store.AccountStore, es *store.EmailStore, cs *store.ContactStore, hub *sse.Hub) *Handler {
	return &Handler{accounts: as, emails: es, contacts: cs, sseHub: hub}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/accounts", h.handleListAccounts)
	mux.HandleFunc("POST /api/v1/accounts", h.handleCreateAccount)
	mux.HandleFunc("DELETE /api/v1/accounts/{id}", h.handleDeleteAccount)
	mux.HandleFunc("GET /api/v1/mails", h.handleListMails)
	mux.HandleFunc("GET /api/v1/mails/{id}", h.handleGetMail)
	mux.HandleFunc("POST /api/v1/mails/{id}/read", h.handleMarkRead)
	mux.HandleFunc("POST /api/v1/mails/{id}/star", h.handleMarkStar)
	mux.HandleFunc("DELETE /api/v1/mails/{id}", h.handleDeleteMail)
	mux.HandleFunc("POST /api/v1/compose", h.handleCompose)
	mux.HandleFunc("GET /api/v1/contacts", h.handleListContacts)
	mux.HandleFunc("GET /api/v1/events", h.handleSSE)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd backend && go build ./internal/api/`
Expected: no error

- [ ] **Step 4: Commit**

```bash
git add backend/internal/api/ backend/internal/config/
git commit -m "feat: add HTTP router skeleton"
```

### Task 7: Implement account API handlers

**Files:**
- Modify: `backend/internal/api/accounts.go` (create)

- [ ] **Step 1: Create account handlers**

```go
// backend/internal/api/accounts.go
package api

import (
	"net/http"
	"strconv"
	"github.com/lzmail/backend/internal/models"
)

func (h *Handler) handleListAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := h.accounts.List()
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, accounts)
}

func (h *Handler) handleCreateAccount(w http.ResponseWriter, r *http.Request) {
	var a models.Account
	if err := readJSON(r, &a); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid request"})
		return
	}
	if err := h.accounts.Create(&a); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, a)
}

func (h *Handler) handleDeleteAccount(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err := h.accounts.Delete(id); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 204, nil)
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/api/`
Expected: no error

- [ ] **Step 3: Commit**

```bash
git add backend/internal/api/accounts.go
git commit -m "feat: add account API handlers"
```

### Task 8: Implement mail API handlers

**Files:**
- Create: `backend/internal/api/mails.go`
- Create: `backend/internal/api/compose.go`
- Create: `backend/internal/api/contacts.go`

- [ ] **Step 1: Create mail handlers**

```go
// backend/internal/api/mails.go
package api

import (
	"net/http"
	"strconv"
)

func (h *Handler) handleListMails(w http.ResponseWriter, r *http.Request) {
	accountID, _ := strconv.ParseInt(r.URL.Query().Get("account_id"), 10, 64)
	folder := r.URL.Query().Get("folder")
	if folder == "" {
		folder = "INBOX"
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit == 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	emails, err := h.emails.List(accountID, folder, limit, offset)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, emails)
}

func (h *Handler) handleGetMail(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]string{"status": "not implemented"})
}

func (h *Handler) handleMarkRead(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err := h.emails.MarkRead(id); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (h *Handler) handleMarkStar(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	starred := r.URL.Query().Get("starred") == "true"
	if err := h.emails.MarkStar(id, starred); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (h *Handler) handleDeleteMail(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err := h.emails.Delete(id); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 204, nil)
}
```

- [ ] **Step 2: Create compose handler**

```go
// backend/internal/api/compose.go
package api

import (
	"net/http"
)

type ComposeRequest struct {
	AccountID int64  `json:"account_id"`
	To        string `json:"to"`
	Subject   string `json:"subject"`
	BodyHTML  string `json:"body_html"`
}

func (h *Handler) handleCompose(w http.ResponseWriter, r *http.Request) {
	var req ComposeRequest
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid request"})
		return
	}
	writeJSON(w, 200, map[string]string{"status": "queued", "to": req.To, "subject": req.Subject})
}
```

- [ ] **Step 3: Create contacts handler**

```go
// backend/internal/api/contacts.go
package api

import (
	"net/http"
	"github.com/lzmail/backend/internal/models"
)

func (h *Handler) handleListContacts(w http.ResponseWriter, r *http.Request) {
	contacts, err := h.contacts.List()
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, contacts)
}

func (h *Handler) handleCreateContact(w http.ResponseWriter, r *http.Request) {
	var c models.Contact
	if err := readJSON(r, &c); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid request"})
		return
	}
	if err := h.contacts.Create(&c); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, c)
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && go build ./internal/api/`
Expected: no error

- [ ] **Step 5: Commit**

```bash
git add backend/internal/api/mails.go backend/internal/api/compose.go backend/internal/api/contacts.go
git commit -m "feat: add mail/compose/contacts API handlers"
```

### Task 9: SSE hub and events endpoint

**Files:**
- Create: `backend/internal/sse/hub.go`
- Create: `backend/internal/api/events.go`

- [ ] **Step 1: Create SSE hub**

```go
// backend/internal/sse/hub.go
package sse

import (
	"fmt"
	"net/http"
)

type Hub struct {
	clients map[chan string]struct{}
	sub     chan chan string
	unsub   chan chan string
	publish chan string
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[chan string]struct{}),
		sub:     make(chan chan string),
		unsub:   make(chan chan string),
		publish: make(chan string),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case ch := <-h.sub:
			h.clients[ch] = struct{}{}
		case ch := <-h.unsub:
			delete(h.clients, ch)
			close(ch)
		case msg := <-h.publish:
			for ch := range h.clients {
				select {
				case ch <- msg:
				default:
				}
			}
		}
	}
}

func (h *Hub) Publish(event string, data any) {
	h.publish <- fmt.Sprintf("event: %s\ndata: %v\n\n", event, data)
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "not supported", 500)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ch := make(chan string, 64)
	h.sub <- ch
	defer func() { h.unsub <- ch }()

	ctx := r.Context()
	for {
		select {
		case msg := <-ch:
			fmt.Fprint(w, msg)
			flusher.Flush()
		case <-ctx.Done():
			return
		}
	}
}
```

- [ ] **Step 2: Create SSE events API**

```go
// backend/internal/api/events.go
package api

import "net/http"

func (h *Handler) handleSSE(w http.ResponseWriter, r *http.Request) {
	h.sseHub.ServeHTTP(w, r)
}
```

- [ ] **Step 3: Wire up main.go**

```go
// backend/cmd/lzmail/main.go
package main

import (
	"fmt"
	"log"
	"net/http"
	"github.com/lzmail/backend/internal/api"
	"github.com/lzmail/backend/internal/config"
	"github.com/lzmail/backend/internal/sse"
	"github.com/lzmail/backend/internal/store"
)

func main() {
	cfg := config.Load()
	fmt.Println("lzmail backend starting...")

	db, err := store.OpenDB(cfg.DataDir + "/lzmail.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	accountStore := store.NewAccountStore(db)
	emailStore := store.NewEmailStore(db)
	contactStore := store.NewContactStore(db)

	sseHub := sse.NewHub()
	go sseHub.Run()

	handler := api.NewHandler(accountStore, emailStore, contactStore, sseHub)
	mux := http.NewServeMux()
	handler.Register(mux)

	addr := ":" + cfg.Port
	fmt.Println("listening on", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
```

- [ ] **Step 4: Verify full build**

Run: `cd backend && go build ./cmd/lzmail/`
Expected: no error

- [ ] **Step 5: Commit**

```bash
git add backend/internal/sse/ backend/internal/api/events.go backend/cmd/lzmail/main.go
git commit -m "feat: add SSE hub and wire up main server"
```

---

## Phase 4: IMAP Sync Engine

### Task 10: IMAP syncer

**Files:**
- Create: `backend/internal/sync/imap.go`

- [ ] **Step 1: Create IMAP sync logic**

```go
// backend/internal/sync/imap.go
package sync

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/mail"
	"os"
	"path/filepath"
	"strings"
	"time"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-imap"
	"github.com/emersion/go-message/charset"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sse"
)

type Syncer struct {
	account    *models.Account
	emailStore *store.EmailStore
	archiveDir string
	sseHub     *sse.Hub
	stopCh     chan struct{}
}

func NewSyncer(account *models.Account, emailStore *store.EmailStore, archiveDir string, sseHub *sse.Hub) *Syncer {
	return &Syncer{
		account:    account,
		emailStore: emailStore,
		archiveDir: archiveDir,
		sseHub:     sseHub,
		stopCh:     make(chan struct{}),
	}
}

func (s *Syncer) Start() {
	go func() {
		for {
			select {
			case <-s.stopCh:
				return
			default:
				s.syncFolder("INBOX")
				time.Sleep(5 * time.Minute)
			}
		}
	}()
}

func (s *Syncer) Stop() {
	close(s.stopCh)
}

func (s *Syncer) syncFolder(folder string) {
	c, err := s.connect()
	if err != nil {
		return
	}
	defer c.Logout()

	mbox, err := c.Select(folder, false)
	if err != nil {
		return
	}

	if mbox.Messages == 0 {
		return
	}

	from := uint32(1)
	if mbox.Messages > 50 {
		from = mbox.Messages - 50
	}
	seqset := new(imap.SeqSet)
	seqset.AddRange(from, mbox.Messages)

	messages := make(chan *imap.Message, 10)
	done := make(chan error, 1)
	go func() {
		done <- c.Fetch(seqset, []imap.FetchItem{imap.FetchEnvelope, imap.FetchFlags, imap.FetchBodyStructure, imap.FetchUid}, messages)
	}()

	for msg := range messages {
		if msg.Envelope == nil {
			continue
		}
		email := &models.Email{
			AccountID:  s.account.ID,
			UID:        msg.Uid,
			Folder:     folder,
			Subject:    msg.Envelope.Subject,
			Date:       msg.Envelope.Date,
			IsRead:     !hasFlag(msg.Flags, "\\Seen"),
		}
		if len(msg.Envelope.From) > 0 {
			email.From = msg.Envelope.From[0].Address()
		}
		if len(msg.Envelope.To) > 0 {
			email.To = joinAddresses(msg.Envelope.To)
		}
		s.emailStore.Upsert(email)
	}
	<-done
}

func (s *Syncer) connect() (*client.Client, error) {
	addr := fmt.Sprintf("%s:%d", s.account.IMAPHost, s.account.IMAPPort)
	var c *client.Client
	var err error
	if s.account.IMAPPort == 993 {
		c, err = client.DialTLS(addr, &tls.Config{InsecureSkipVerify: false})
	} else {
		c, err = client.Dial(addr)
		if err == nil {
			err = c.StartTLS(&tls.Config{InsecureSkipVerify: false})
		}
	}
	if err != nil {
		return nil, err
	}
	if err := c.Login(s.account.Username, s.account.Password); err != nil {
		return nil, err
	}
	return c, nil
}

func hasFlag(flags []string, flag string) bool {
	for _, f := range flags {
		if strings.EqualFold(f, flag) {
			return true
		}
	}
	return false
}

func joinAddresses(addrs []*imap.Address) string {
	var parts []string
	for _, a := range addrs {
		parts = append(parts, a.Address())
	}
	return strings.Join(parts, ", ")
}
```

- [ ] **Step 2: Add dependency**

Run: `cd backend && go get github.com/emersion/go-imap@latest github.com/emersion/go-message@latest && go build ./internal/sync/`
Expected: no error

- [ ] **Step 3: Commit**

```bash
git add backend/internal/sync/
git commit -m "feat: add IMAP sync engine"
```

### Task 11: .eml archive writer

**Files:**
- Create: `backend/internal/archive/eml.go`

- [ ] **Step 1: Create archive module**

```go
// backend/internal/archive/eml.go
package archive

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type Writer struct {
	baseDir string
}

func NewWriter(baseDir string) *Writer {
	return &Writer{baseDir: baseDir}
}

func (w *Writer) Save(accountID int64, uid uint32, date time.Time, raw []byte) (string, error) {
	dir := filepath.Join(w.baseDir, fmt.Sprintf("%d", accountID), date.Format("2006"), date.Format("01"))
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}

	filename := filepath.Join(dir, fmt.Sprintf("%d.eml", uid))
	if err := os.WriteFile(filename, raw, 0644); err != nil {
		return "", err
	}
	return filename, nil
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/archive/`
Expected: no error

- [ ] **Step 3: Commit**

```bash
git add backend/internal/archive/
git commit -m "feat: add .eml archive writer"
```

### Task 12: Sync engine orchestrator

**Files:**
- Create: `backend/internal/sync/engine.go`
- Create: `backend/internal/sync/smtp.go`

- [ ] **Step 1: Create engine orchestrator**

```go
// backend/internal/sync/engine.go
package sync

import (
	"sync"
	"github.com/lzmail/backend/internal/models"
	"github.com/lzmail/backend/internal/store"
	"github.com/lzmail/backend/internal/sse"
)

type Engine struct {
	mu         sync.Mutex
	syncers    map[int64]*Syncer
	emailStore *store.EmailStore
	archiveDir string
	sseHub     *sse.Hub
}

func NewEngine(emailStore *store.EmailStore, archiveDir string, sseHub *sse.Hub) *Engine {
	return &Engine{
		syncers:    make(map[int64]*Syncer),
		emailStore: emailStore,
		archiveDir: archiveDir,
		sseHub:     sseHub,
	}
}

func (e *Engine) AddAccount(account *models.Account) {
	e.mu.Lock()
	defer e.mu.Unlock()

	s := NewSyncer(account, e.emailStore, e.archiveDir, e.sseHub)
	s.Start()
	e.syncers[account.ID] = s
}

func (e *Engine) RemoveAccount(accountID int64) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if s, ok := e.syncers[accountID]; ok {
		s.Stop()
		delete(e.syncers, accountID)
	}
}

func (e *Engine) StartAll(accounts []models.Account) {
	for i := range accounts {
		e.AddAccount(&accounts[i])
	}
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/sync/`
Expected: no error

- [ ] **Step 3: Commit**

```bash
git add backend/internal/sync/engine.go
git commit -m "feat: add sync engine orchestrator"
```

---

## Phase 5: Frontend UI

### Task 13: App shell with sidebar layout

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/AccountSwitcher.tsx`
- Create: `frontend/src/components/layout/Header.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create types**

```ts
// frontend/src/types/index.ts
export interface Account {
  id: number
  name: string
  email: string
  imap_host: string
  imap_port: number
  smtp_host: string
  smtp_port: number
  auth_type: string
  username: string
  use_idle: boolean
  brand_color: string
  created_at: string
  updated_at: string
}

export interface Email {
  id: number
  account_id: number
  uid: number
  folder: string
  subject: string
  from: string
  to: string
  cc: string
  date: string
  body_preview: string
  is_read: boolean
  is_starred: boolean
  has_attachments: boolean
  archive_path: string
  message_id: string
  created_at: string
}

export interface Contact {
  id: number
  name: string
  email: string
  account_id: number
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Create API client**

```ts
// frontend/src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  accounts: {
    list: () => fetchJSON<Account[]>('/api/v1/accounts'),
    create: (data: Partial<Account>) => fetchJSON<Account>('/api/v1/accounts', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => fetchJSON<void>(`/api/v1/accounts/${id}`, { method: 'DELETE' }),
  },
  mails: {
    list: (accountId?: number, folder = 'INBOX', limit = 50, offset = 0) =>
      fetchJSON<Email[]>(`/api/v1/mails?account_id=${accountId || ''}&folder=${folder}&limit=${limit}&offset=${offset}`),
  },
}
```

- [ ] **Step 3: Create Header**

```tsx
// frontend/src/components/layout/Header.tsx
'use client'
import { Search, SquarePen, Settings } from 'lucide-react'

export function Header({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex items-center justify-between h-14 px-4 border-b bg-background">
      <div className="flex items-center gap-2 flex-1">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="搜索邮件..."
        />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onCompose} className="p-2 hover:bg-accent rounded-lg">
          <SquarePen className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-accent rounded-lg">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create AccountSwitcher**

```tsx
// frontend/src/components/layout/AccountSwitcher.tsx
'use client'
import { ChevronUp, Plus } from 'lucide-react'
import type { Account } from '@/types'

export function AccountSwitcher({
  accounts,
  current,
  onSwitch,
  onAdd,
}: {
  accounts: Account[]
  current: Account | null
  onSwitch: (a: Account | null) => void
  onAdd: () => void
}) {
  return (
    <div className="p-3 border-t">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: current?.brand_color || '#6366f1' }}
        />
        <span className="text-sm truncate flex-1">
          {current ? current.email : '所有账户'}
        </span>
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create Sidebar**

```tsx
// frontend/src/components/layout/Sidebar.tsx
'use client'
import { Inbox, Star, Clock, Send, FileText, AlertTriangle } from 'lucide-react'

const items = [
  { icon: Inbox, label: '收件箱', folder: 'INBOX' },
  { icon: Star, label: '标星邮件', folder: 'STARRED' },
  { icon: Clock, label: '稍后处理', folder: 'DEFERRED' },
  { icon: Send, label: '已发送', folder: 'SENT' },
  { icon: FileText, label: '草稿', folder: 'DRAFTS' },
  { icon: AlertTriangle, label: '垃圾邮件', folder: 'SPAM' },
]

export function Sidebar({ currentFolder, onSelect }: { currentFolder: string; onSelect: (f: string) => void }) {
  return (
    <div className="w-48 flex flex-col gap-1 p-2 border-r h-full">
      {items.map((item) => (
        <button
          key={item.folder}
          onClick={() => onSelect(item.folder)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            currentFolder === item.folder ? 'bg-accent font-medium' : 'hover:bg-accent/50'
          }`}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Create AppShell**

```tsx
// frontend/src/components/layout/AppShell.tsx
'use client'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AccountSwitcher } from './AccountSwitcher'
import type { Account } from '@/types'

export function AppShell({
  accounts,
  children,
}: {
  accounts: Account[]
  children: React.ReactNode
}) {
  const [currentFolder, setCurrentFolder] = useState('INBOX')
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null)

  return (
    <div className="flex h-screen bg-background">
      <div className="flex flex-col border-r">
        <Sidebar currentFolder={currentFolder} onSelect={setCurrentFolder} />
        <AccountSwitcher
          accounts={accounts}
          current={currentAccount}
          onSwitch={setCurrentAccount}
          onAdd={() => window.location.href = '/settings'}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <Header onCompose={() => window.location.href = '/compose'} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Update layout and homepage**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LZMail',
  description: 'Self-hosted NAS email client',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
```

```tsx
// frontend/src/app/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MailList } from '@/components/mail/MailList'
import { api } from '@/lib/api'
import type { Account, Email } from '@/types'

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [emails, setEmails] = useState<Email[]>([])

  useEffect(() => {
    api.accounts.list().then(setAccounts)
    api.mails.list().then(setEmails)
  }, [])

  return (
    <AppShell accounts={accounts}>
      <MailList emails={emails} />
    </AppShell>
  )
}
```

- [ ] **Step 8: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 9: Commit**

```bash
git add frontend/src/types/ frontend/src/lib/ frontend/src/components/layout/ frontend/src/app/
git commit -m "feat: add app shell layout"
```

### Task 14: Mail list component

**Files:**
- Create: `frontend/src/components/mail/MailList.tsx`
- Create: `frontend/src/components/mail/MailItem.tsx`

- [ ] **Step 1: Create MailItem**

```tsx
// frontend/src/components/mail/MailItem.tsx
'use client'
import { motion } from 'framer-motion'
import { Paperclip, Star } from 'lucide-react'
import type { Email } from '@/types'

export function MailItem({ email, onSelect }: { email: Email; onSelect: (id: number) => void }) {
  const date = new Date(email.date)
  const isToday = new Date().toDateString() === date.toDateString()
  const timeStr = isToday
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(email.id)}
      className={`flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-accent/50 ${
        !email.is_read ? 'bg-accent/30 font-medium' : ''
      }`}
    >
      <div className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ backgroundColor: email.is_read ? 'transparent' : '#3b82f6' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm truncate">{email.from}</span>
          {email.is_starred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
        </div>
        <div className="text-sm font-medium truncate">{email.subject}</div>
        <div className="text-xs text-muted-foreground truncate">{email.body_preview}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {email.has_attachments && <Paperclip className="w-3 h-3 text-muted-foreground" />}
        <span className="text-xs text-muted-foreground whitespace-nowrap">{timeStr}</span>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Create MailList**

```tsx
// frontend/src/components/mail/MailList.tsx
'use client'
import { MailItem } from './MailItem'
import type { Email } from '@/types'

export function MailList({ emails }: { emails: Email[] }) {
  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        暂无邮件
      </div>
    )
  }

  return (
    <div className="divide-y">
      {emails.map((email) => (
        <MailItem key={email.id} email={email} onSelect={(id) => window.location.href = `/mail/${id}`} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/mail/
git commit -m "feat: add mail list components"
```

### Task 15: Mail detail page

**Files:**
- Create: `frontend/src/app/mail/[id]/page.tsx`
- Create: `frontend/src/components/mail/MailDetail.tsx`

- [ ] **Step 1: Create mail detail page**

```tsx
// frontend/src/app/mail/[id]/page.tsx
'use client'
import { useParams } from 'next/navigation'
import { MailDetail } from '@/components/mail/MailDetail'

export default function MailPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="h-full overflow-auto">
      <MailDetail id={parseInt(id)} />
    </div>
  )
}
```

- [ ] **Step 2: Create MailDetail component**

```tsx
// frontend/src/components/mail/MailDetail.tsx
'use client'
import { ArrowLeft, Star, Trash2, Paperclip } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MailDetail({ id }: { id: number }) {
  const router = useRouter()

  return (
    <div className="p-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">邮件主题 #{id}</h1>
            <p className="text-sm text-muted-foreground">发件人</p>
            <p className="text-sm text-muted-foreground">收件人</p>
            <p className="text-sm text-muted-foreground">时间</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-accent rounded-lg"><Star className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-accent rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="border rounded-lg p-4 min-h-[200px] text-sm">
          邮件正文（从 .eml 加载）
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1"><Paperclip className="w-4 h-4" /> 附件</p>
          <p className="text-sm text-muted-foreground">暂无附件</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/mail/ frontend/src/components/mail/MailDetail.tsx
git commit -m "feat: add mail detail page"
```

### Task 16: Compose and settings pages (stubs)

**Files:**
- Create: `frontend/src/app/compose/page.tsx`
- Create: `frontend/src/app/settings/page.tsx`

- [ ] **Step 1: Create compose page**

```tsx
// frontend/src/app/compose/page.tsx
'use client'
import { ArrowLeft, Send, Paperclip } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ComposePage() {
  const router = useRouter()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-14 border-b">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-accent rounded-lg"><Paperclip className="w-4 h-4" /></button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <input placeholder="收件人" className="w-full border-b pb-2 outline-none text-sm bg-transparent" />
        <input placeholder="主题" className="w-full border-b pb-2 outline-none text-sm bg-transparent" />
        <textarea placeholder="写邮件..." className="w-full flex-1 outline-none text-sm bg-transparent resize-none" rows={20} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create settings page**

```tsx
// frontend/src/app/settings/page.tsx
'use client'
import { ArrowLeft, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'

export default function SettingsPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587, username: '', password: '', use_idle: false })

  const handleSubmit = async () => {
    await api.accounts.create({ ...form } as any)
    router.push('/')
  }

  return (
    <div className="p-6 max-w-lg">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>
      <h1 className="text-xl font-semibold mb-4">设置</h1>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">邮箱账号</h2>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 text-sm text-primary">
            <Plus className="w-4 h-4" /> 添加账号
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/compose/ frontend/src/app/settings/
git commit -m "feat: add compose and settings pages"
```

---

## Phase 6: SSE & Real-time Integration

### Task 17: Frontend SSE hook

**Files:**
- Create: `frontend/src/hooks/useSSE.ts`

- [ ] **Step 1: Create SSE hook**

```ts
// frontend/src/hooks/useSSE.ts
'use client'
import { useEffect, useRef } from 'react'

const SSE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export function useSSE(onMailNew?: () => void, onMailUpdated?: () => void) {
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(`${SSE_URL}/api/v1/events`)
    eventSourceRef.current = es

    es.addEventListener('mail:new', () => onMailNew?.())
    es.addEventListener('mail:updated', () => onMailUpdated?.())
    es.addEventListener('sync:status', (e) => console.log('sync:', e.data))

    es.onerror = () => {
      es.close()
      setTimeout(() => {
        new EventSource(`${SSE_URL}/api/v1/events`)
      }, 5000)
    }

    return () => es.close()
  }, [onMailNew, onMailUpdated])
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add SSE hook for real-time notifications"
```

---

## Phase 7: Polish & Integration

### Task 18: Add responsive CSS and dark mode

**Files:**
- Create: `frontend/src/app/globals.css`

- [ ] **Step 1: Create globals.css**

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: #ffffff;
  --foreground: #0f172a;
  --accent: #f1f5f9;
  --accent-foreground: #0f172a;
  --muted: #f8fafc;
  --muted-foreground: #64748b;
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  --border: #e2e8f0;
}

.dark {
  --background: #0f172a;
  --foreground: #f1f5f9;
  --accent: #1e293b;
  --accent-foreground: #f1f5f9;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --primary: #3b82f6;
  --primary-foreground: #0f172a;
  --border: #334155;
}

* {
  border-color: var(--border);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

@media (max-width: 768px) {
  .sidebar-hidden { display: none; }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat: add responsive CSS and dark mode theme"
```

### Task 19: Integration test — start backend

**Files:**
- No new files

- [ ] **Step 1: Start backend and verify API**

Run: `cd backend && go run ./cmd/lzmail/`
Expected: "lzmail backend starting..." then "listening on :8080"

In another terminal:
Run: `curl http://localhost:8080/api/v1/accounts`
Expected: `[]` (empty list)

- [ ] **Step 2: Create an account via API**

Run:
```bash
curl -X POST http://localhost:8080/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","imap_host":"imap.example.com","imap_port":993,"smtp_host":"smtp.example.com","smtp_port":587,"auth_type":"password","username":"test","password":"pass","use_idle":false}'
```
Expected: 201 with account JSON

- [ ] **Step 3: Verify SSE endpoint**

Run: `curl -N http://localhost:8080/api/v1/events`
Expected: SSE connection stays open

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: integration test pass"
```

---

## Self-Review Checklist

- [ ] Spec coverage: All spec features mapped to tasks (models → store → API → sync → UI → SSE)
- [ ] No placeholders: Every code block contains real, compilable code
- [ ] Type consistency: Go struct fields match between models, store, and API layers
- [ ] Task ordering: Later tasks depend only on earlier ones
- [ ] All file paths are exact and absolute within the repo
