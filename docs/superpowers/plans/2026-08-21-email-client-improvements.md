# Email Client Improvements Implementation Plan

> **For AI Agent Workers:** Required sub-skill: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute this plan task by task. Steps use checkbox (`- [ ]`) syntax to track progress.

**Goal:** Fix body display issues, add sidebar badge refresh, implement stacked email detail view for multi-select, and add bulk actions (delete, mark read/unread, move, star/unstar, reply/forward).

**Architecture:** Four independent but related improvements. Backend changes needed for body fix and bulk actions API. Frontend changes for all four features. SSE event handling for auto-refresh.

**Tech Stack:** Go (backend), React/Next.js (frontend), SQLite (database), Server-Sent Events (real-time)

---

## File Structure

### Backend Files
- `backend/internal/api/mails.go` - Add bulk endpoint, body re-extract endpoint, improve error logging
- `backend/internal/api/router.go` - Register new routes
- `backend/internal/store/emails.go` - Add bulk operations (BulkUpdate, BulkMove, BulkDelete, BulkStar)
- `backend/internal/archive/parse.go` - Harden extractBody()

### Frontend Files
- `frontend/src/lib/api.ts` - Add bulk(), reextractBody() methods
- `frontend/src/components/layout/Sidebar.tsx` - Add manual refresh button, verify auto-refresh
- `frontend/src/app/mail/page.tsx` - Stacked view, bulk action toolbar, selection logic
- `frontend/src/hooks/useSSE.ts` - Verify sync status handling

---

## Task 1: Body Display Fix - Backend

### Files
- Modify: `backend/internal/api/mails.go:56-96` (handleGetMail)
- Modify: `backend/internal/api/mails.go` (add handleReextractBody)
- Modify: `backend/internal/api/router.go` (register route)
- Modify: `backend/internal/archive/parse.go` (harden extractBody)
- Test: `backend/internal/api/mails_test.go` (new)

### Steps

- [ ] **Step 1: Add detailed logging to handleGetMail**

```go
// In handleGetMail, after line 69 (email.ArchivePath check)
log.Printf("[mail] get %d: archive_path=%q", id, email.ArchivePath)

// After line 71 (anchorPath)
log.Printf("[mail] get %d: resolved path=%q", id, resolved)

// After line 75 (extractBody)
log.Printf("[mail] get %d: body length=%d", id, len(bodyHTML))

// After line 81 (findEmlByUid)
log.Printf("[mail] get %d: findEmlByUid found=%q", id, resolved)

// After line 85 (extractBody fallback)
log.Printf("[mail] get %d: fallback body length=%d", id, len(bodyHTML))
```

- [ ] **Step 2: Add handleReextractBody endpoint**

```go
func (h *Handler) handleReextractBody(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	email, err := h.emails.GetByID(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	
	// Clear cache
	globalBodyCache.delete(id)
	
	// Force re-extract
	var bodyHTML string
	if email.ArchivePath != "" {
		if resolved, err := anchorPath(h.archiveDir, email.ArchivePath); err == nil {
			bodyHTML = extractBody(resolved)
		}
	}
	if bodyHTML == "" {
		if resolved, err := findEmlByUid(h.archiveDir, email.AccountID, email.UID, email.Date); err == nil {
			bodyHTML = extractBody(resolved)
		}
	}
	globalBodyCache.set(id, bodyHTML)
	
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"body_html": bodyHTML,
		"source":    "archive",
	})
}
```

- [ ] **Step 3: Register route in router.go**

```go
mux.HandleFunc("POST /api/v1/mails/{id}/reextract", h.handleReextractBody)
```

- [ ] **Step 4: Harden extractBody in parse.go**

```go
// Add fallback for empty body, handle encoding, log warnings
func extractBody(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("[archive] read %s failed: %v", path, err)
		return ""
	}
	
	// Try parse as EML
	msg, err := mail.ReadMessage(bytes.NewReader(data))
	if err != nil {
		log.Printf("[archive] parse %s failed: %v", path, err)
		return ""
	}
	
	// Get body
	body := msg.Body
	mediaType, _, _ := mime.ParseMediaType(msg.Header.Get("Content-Type"))
	
	var buf bytes.Buffer
	if strings.HasPrefix(mediaType, "multipart/") {
		// Handle multipart - prefer text/html
		mr := multipart.NewReader(body, msg.Header.Get("Content-Type"))
		for {
			part, err := mr.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				log.Printf("[archive] multipart part error: %v", err)
				continue
			}
			partType, _, _ := mime.ParseMediaType(part.Header.Get("Content-Type"))
			if partType == "text/html" {
				io.Copy(&buf, part)
				break
			}
			if partType == "text/plain" && buf.Len() == 0 {
				io.Copy(&buf, part)
			}
		}
	} else {
		io.Copy(&buf, body)
	}
	
	result := buf.String()
	if result == "" {
		log.Printf("[archive] empty body extracted from %s", path)
	}
	return result
}
```

- [ ] **Step 5: Write test for handleReextractBody**

```go
func TestHandleReextractBody(t *testing.T) {
	// Setup test DB, insert email with archive_path
	// Call handler
	// Assert 200 OK, body_html returned
}
```

- [ ] **Step 6: Run tests and commit**

```bash
cd backend && go test ./internal/api/... -v
git add backend/internal/api/mails.go backend/internal/api/router.go backend/internal/archive/parse.go
git commit -m "feat(backend): add body re-extract endpoint and improve extractBody"
```

---

## Task 2: Body Display Fix - Frontend

### Files
- Modify: `frontend/src/lib/api.ts` (add reextractBody)
- Modify: `frontend/src/app/mail/page.tsx` (add retry button in detail view)
- Test: `frontend/src/app/mail/page.test.tsx` (new)

### Steps

- [ ] **Step 1: Add reextractBody to api.ts**

```typescript
// In api.mails
reextractBody: (id: number) => fetchJSON<{ body_html: string; source: string }>(
  `/api/v1/mails/${id}/reextract`, { method: 'POST' }
),
```

- [ ] **Step 2: Add "Reload Body" button in detail view**

```tsx
// In MailPageInner, after line 588 (body div)
{detail && detail.email.body_preview && !detail.body_html && (
  <div className="p-4 text-center" style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning)' }}>
    <button onClick={async () => {
      const res = await api.mails.reextractBody(detail.email.id);
      if (res?.body_html) setDetail(prev => prev ? { ...prev, body_html: res.body_html } : prev);
    }} className="text-sm px-4 py-2 rounded bg-[var(--warning)] text-[var(--warning-foreground)]">
      重新加载正文
    </button>
  </div>
)}
```

- [ ] **Step 3: Test and commit**

```bash
cd frontend && npm run build
git add frontend/src/lib/api.ts frontend/src/app/mail/page.tsx
git commit -m "feat(frontend): add reload body button for failed emails"
```

---

## Task 3: Sidebar Badge Refresh

### Files
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Test: `frontend/src/components/layout/Sidebar.test.tsx` (new)

### Steps

- [ ] **Step 1: Add manual refresh button in sidebar**

```tsx
// In Sidebar.tsx, after line 207 (邮箱账号 header)
<div className="flex items-center justify-between">
  <div className="text-[11px] font-semibold" style={{ color: 'var(--muted-foreground)' }}>邮箱账号</div>
  <Tooltip text="刷新未读数">
    <button onClick={refreshCounts} disabled={loadingCounts}
      className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-opacity hover:opacity-80 disabled:opacity-50"
      style={{ backgroundColor: 'var(--muted)' }}>
      <RefreshCw className={`w-4 h-4 ${loadingCounts ? 'animate-spin' : ''}`} style={{ color: 'var(--foreground-secondary)' }} />
    </button>
  </Tooltip>
</div>
```

- [ ] **Step 2: Add loadingCounts state**

```tsx
const [loadingCounts, setLoadingCounts] = useState(false);

const refreshCounts = useCallback(async () => {
  setLoadingCounts(true);
  try {
    const d = await api.mails.counts();
    setCounts(d ?? null);
  } catch {}
  setLoadingCounts(false);
}, []);
```

- [ ] **Step 3: Verify auto-refresh on sync:status ok**

```tsx
// In useSSE callback (line 75-88), ensure status 'ok' triggers refresh
es.addEventListener('sync:status', (e: MessageEvent) => {
  try {
    const data = JSON.parse(e.data) as SyncStatusData;
    onSyncStatusRef.current?.(data);
    if (data.status === 'ok' || data.status === 'completed') {
      onMailUpdatedRef.current?.(); // This calls refreshCounts
    }
  } catch {}
});
```

- [ ] **Step 4: Test and commit**

```bash
cd frontend && npm run build
git add frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(frontend): add manual refresh button for sidebar badges"
```

---

## Task 4: Stacked Email Detail View

### Files
- Modify: `frontend/src/app/mail/page.tsx`
- Test: `frontend/src/app/mail/page.test.tsx` (new)

### Steps

- [ ] **Step 1: Add stacked view rendering logic**

```tsx
// In MailPageInner, replace detail rendering (lines 493-666)
{detail ? (
  // Existing single detail view
) : selectedIds.size > 1 ? (
  // Stacked view
  <div className="max-w-[780px] mx-auto px-8 py-6 space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-[16px] font-semibold" style={{ color: 'var(--foreground)' }}>
        已选择 {selectedIds.size} 封邮件
      </h2>
      <button onClick={() => setSelectedIds(new Set())} className="text-sm" style={{ color: 'var(--primary)' }}>
        清除选择
      </button>
    </div>
    {Array.from(selectedIds).slice(0, 5).map(id => {
      const email = emails.find(e => e.id === id);
      if (!email) return null;
      return (
        <div key={email.id} onClick={() => { setSelectedIds(new Set([email.id])); handleSelect(email.id); }}
          className="p-4 rounded-xl cursor-pointer transition-colors hover:bg-[var(--muted)]"
          style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: getAccountAvatarBg({ brand_color: email.account_brand }) }}>
              {(email.from_name || email.from).trim()[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate" style={{ color: 'var(--foreground)' }}>{email.from_name || email.from}</span>
                <span className="text-xs shrink-0" style={{ color: 'var(--muted-foreground)' }}>{formatTime(email.date)}</span>
              </div>
              <div className="truncate mt-0.5 font-medium" style={{ color: 'var(--foreground)' }}>{email.subject || '(无主题)'}</div>
              <div className="truncate text-sm mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>{email.body_preview}</div>
              {email.has_attachments && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <Paperclip className="w-3 h-3" /> 有附件
                </span>
              )}
            </div>
          </div>
        </div>
      );
    })}
    {selectedIds.size > 5 && (
      <div className="text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
        及其他 {selectedIds.size - 5} 封邮件...
      </div>
    )}
  </div>
) : loading ? (
  // Skeleton
) : (
  // Empty state
)}
```

- [ ] **Step 2: Update selection logic to handle stacked view**

```tsx
// Modify handleSelect to clear multi-select when clicking single email
const handleSelect = useCallback(async (id: number) => {
  if (selectedIds.size > 1 && !selectedIds.has(id)) {
    setSelectedIds(new Set([id])); // Exit multi-select
  }
  setSelectedId(id);
  // ... rest of existing logic
}, [loadDetail, emails, selectedIds]);
```

- [ ] **Step 3: Test and commit**

```bash
cd frontend && npm run build
git add frontend/src/app/mail/page.tsx
git commit -m "feat(frontend): add stacked email detail view for multi-select"
```

---

## Task 5: Bulk Actions - Backend API

### Files
- Modify: `backend/internal/store/emails.go` (add bulk methods)
- Modify: `backend/internal/api/mails.go` (add handleBulkMails)
- Modify: `backend/internal/api/router.go` (register route)
- Test: `backend/internal/api/mails_test.go` (new tests)

### Steps

- [ ] **Step 1: Add bulk methods to EmailStore**

```go
// In emails.go

// BulkUpdateFlags updates is_read/is_starred for multiple emails
func (s *EmailStore) BulkUpdateFlags(ids []int64, isRead, isStarred *bool) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := strings.Repeat("?,", len(ids)-1) + "?"
	query := fmt.Sprintf(`UPDATE emails SET `)
	var sets []string
	var args []any
	if isRead != nil {
		sets = append(sets, "is_read = ?")
		args = append(args, *isRead)
	}
	if isStarred != nil {
		sets = append(sets, "is_starred = ?")
		args = append(args, *isStarred)
	}
	if len(sets) == 0 {
		return nil
	}
	query += strings.Join(sets, ", ") + ` WHERE id IN (` + placeholders + `)`
	args = append(args, ids...)
	_, err := s.db.Exec(query, args...)
	return err
}

// BulkMove moves multiple emails to a folder
func (s *EmailStore) BulkMove(ids []int64, folder string) error {
	if len(ids) == 0 {
		return nil
	}
	realFolder := s.ResolveFolder(folder)
	placeholders := strings.Repeat("?,", len(ids)-1) + "?"
	query := fmt.Sprintf(`UPDATE emails SET folder = ? WHERE id IN (` + placeholders + `)`)
	args := append([]any{realFolder}, ids...)
	_, err := s.db.Exec(query, args...)
	return err
}

// BulkDelete deletes multiple emails
func (s *EmailStore) BulkDelete(ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := strings.Repeat("?,", len(ids)-1) + "?"
	query := fmt.Sprintf(`DELETE FROM emails WHERE id IN (` + placeholders + `)`)
	_, err := s.db.Exec(query, ids...)
	return err
}
```

- [ ] **Step 2: Add handleBulkMails endpoint**

```go
func (h *Handler) handleBulkMails(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Action            string   `json:"action"`              // delete, mark_read, mark_unread, move, star, unstar
		IDs               []int64  `json:"ids,omitempty"`       // specific IDs
		AllInFolder       bool     `json:"all_in_folder"`       // true = all in folder
		Folder            string   `json:"folder,omitempty"`    // required for all_in_folder
		DestinationFolder string   `json:"destination_folder,omitempty"` // for move
	}
	if err := readJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	
	var ids []int64
	if req.AllInFolder {
		if req.Folder == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "folder required for all_in_folder"})
			return
		}
		// Get all email IDs in folder
		emails, err := h.emails.ListAll(req.Folder, "", "", 10000, 0)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		for _, e := range emails {
			ids = append(ids, e.ID)
		}
	} else {
		ids = req.IDs
	}
	
	if len(ids) == 0 {
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true, "affected_count": 0})
		return
	}
	
	var err error
	switch req.Action {
	case "delete":
		err = h.emails.BulkDelete(ids)
	case "mark_read":
		err = h.emails.BulkUpdateFlags(ids, ptr(true), nil)
	case "mark_unread":
		err = h.emails.BulkUpdateFlags(ids, ptr(false), nil)
	case "star":
		err = h.emails.BulkUpdateFlags(ids, nil, ptr(true))
	case "unstar":
		err = h.emails.BulkUpdateFlags(ids, nil, ptr(false))
	case "move":
		if req.DestinationFolder == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "destination_folder required for move"})
			return
		}
		err = h.emails.BulkMove(ids, req.DestinationFolder)
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unknown action"})
		return
	}
	
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	
	// Publish SSE events for each affected email
	if h.sseHub != nil {
		for _, id := range ids {
			h.sseHub.Publish("mail:updated", fmt.Sprintf(`{"id":%d}`, id))
		}
	}
	
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"affected_count": len(ids),
	})
}

func ptr[T any](v T) *T { return &v }
```

- [ ] **Step 3: Register route**

```go
mux.HandleFunc("POST /api/v1/mails/bulk", h.handleBulkMails)
```

- [ ] **Step 4: Write tests and commit**

```bash
cd backend && go test ./internal/api/... ./internal/store/... -v
git add backend/internal/store/emails.go backend/internal/api/mails.go backend/internal/api/router.go
git commit -m "feat(backend): add bulk mail operations API"
```

---

## Task 6: Bulk Actions - Frontend

### Files
- Modify: `frontend/src/lib/api.ts` (add bulk method)
- Modify: `frontend/src/app/mail/page.tsx` (bulk action toolbar, handlers)
- Test: `frontend/src/app/mail/page.test.tsx` (new tests)

### Steps

- [ ] **Step 1: Add bulk method to api.ts**

```typescript
// In api.mails
bulk: (data: { action: string; ids?: number[]; all_in_folder?: boolean; folder?: string; destination_folder?: string }) =>
  fetchJSON<{ success: boolean; affected_count: number }>('/api/v1/mails/bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
```

- [ ] **Step 2: Add bulk action toolbar in MailPageInner**

```tsx
// In MailPageInner, after line 443 (search form), add:
{selectedIds.size > 0 && (
  <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
    <div className="flex items-center gap-2">
      <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
        已选择 {selectAllChecked ? `全部 ${totalCount} 封` : `${selectedIds.size} 封`}
      </span>
      <div className="flex items-center gap-1 ml-auto">
        <Tooltip text="标记已读"><button onClick={() => handleBulk('mark_read')} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[var(--muted)]"><MailCheck className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
        <Tooltip text="标记未读"><button onClick={() => handleBulk('mark_unread')} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[var(--muted)]"><Mail className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
        <Tooltip text="星标"><button onClick={() => handleBulk('star')} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[var(--muted)]"><Star className="w-4 h-4" style={{ color: 'var(--gold)' }} /></button></Tooltip>
        <Tooltip text="取消星标"><button onClick={() => handleBulk('unstar')} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[var(--muted)]"><Star className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} /></button></Tooltip>
        <Tooltip text="移动到"><button onClick={() => setFolderMoveOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[var(--muted)]"><FolderMove className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
        <Tooltip text="删除"><button onClick={handleDeleteRequest} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[var(--muted)]"><Trash2 className="w-4 h-4" style={{ color: 'var(--danger)' }} /></button></Tooltip>
      </div>
    </div>
  </div>
)}

// Add handleBulk function
const handleBulk = async (action: string) => {
  const isAll = selectAllChecked;
  try {
    await api.mails.bulk({
      action,
      all_in_folder: isAll,
      folder: isAll ? (folder === 'ALL' ? '' : folder) : undefined,
      ids: isAll ? undefined : Array.from(selectedIds),
      destination_folder: action === 'move' ? undefined : undefined // handled by folder move dropdown
    });
    toast.success(`已处理 ${isAll ? totalCount : selectedIds.size} 封邮件`);
    setSelectedIds(new Set());
    setSelectedId(null);
    setDetail(null);
    setRefresh(n => n + 1);
    refreshCounts();
  } catch {
    toast.error('操作失败，请重试');
  }
};

// Modify handleMove for bulk
const handleMove = async (destFolder: string) => {
  const isAll = selectAllChecked;
  try {
    await api.mails.bulk({
      action: 'move',
      all_in_folder: isAll,
      folder: isAll ? (folder === 'ALL' ? '' : folder) : undefined,
      ids: isAll ? undefined : Array.from(selectedIds),
      destination_folder: destFolder
    });
    toast.success(`已移动 ${isAll ? totalCount : selectedIds.size} 封邮件`);
    setSelectedIds(new Set());
    setSelectedId(null);
    setDetail(null);
    setRefresh(n => n + 1);
    refreshCounts();
  } catch {
    toast.error('移动失败，请重试');
  }
  setFolderMoveOpen(false);
};
```

- [ ] **Step 3: Update handleDelete for bulk**

```tsx
// Modify handleDeleteRequest to handle bulk
const handleDeleteRequest = () => {
  if (selectedIds.size > 1 || selectAllChecked) {
    // Show confirm with count
    setDeleteOpen(true);
  } else {
    setDeleteOpen(true);
  }
};

// Modify handleDelete
const handleDelete = async () => {
  const isAll = selectAllChecked;
  try {
    await api.mails.bulk({
      action: 'delete',
      all_in_folder: isAll,
      folder: isAll ? (folder === 'ALL' ? '' : folder) : undefined,
      ids: isAll ? undefined : Array.from(selectedIds)
    });
    toast.success(`已删除 ${isAll ? totalCount : selectedIds.size} 封邮件`);
    setEmails(prev => isAll ? [] : prev.filter(e => !selectedIds.has(e.id)));
    setTotalCount(prev => isAll ? 0 : Math.max(0, prev - (isAll ? totalCount : selectedIds.size)));
    setSelectedIds(new Set());
    setSelectedId(null);
    setDetail(null);
    setRefresh(n => n + 1);
    refreshCounts();
  } catch {
    toast.error('删除失败，请重试');
  }
  setDeleteOpen(false);
};
```

- [ ] **Step 4: Test and commit**

```bash
cd frontend && npm run build
git add frontend/src/lib/api.ts frontend/src/app/mail/page.tsx
git commit -m "feat(frontend): add bulk actions toolbar and handlers"
```

---

## Task 7: Integration Testing & Polish

### Files
- All modified files

### Steps

- [ ] **Step 1: Run full test suite**

```bash
cd backend && go test ./... -v
cd ../frontend && npm run build && npm test
```

- [ ] **Step 2: Manual testing checklist**

- [ ] Body display: Open email with empty ArchivePath, verify body loads or retry button works
- [ ] Sidebar badges: Click manual refresh, verify counts update; wait for sync, verify auto-refresh
- [ ] Stacked view: Select 2-5 emails, verify stacked cards show; click card to select single
- [ ] Bulk actions: Select multiple, test each action; test Select All + bulk action

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes and polish"
```

---

## Execution Notes

- Tasks 1-2 (Body Fix) can run in parallel with Tasks 3-4 (Sidebar + Stacked View)
- Tasks 5-6 (Bulk Actions) depend on Task 1 backend changes
- Run backend tests after each backend task
- Run frontend build after each frontend task
- Commit after each task completion