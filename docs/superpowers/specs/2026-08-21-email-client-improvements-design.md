# Email Client Improvements Design

## Overview
Four related improvements to the mail page and sidebar:
1. **Body display fix** - Some emails fail to show body after sync
2. **Sidebar badge refresh** - Auto-refresh via SSE + manual refresh button
3. **Stacked email detail view** - Show top 5 selected emails when multi-selecting
4. **Bulk actions** - Delete, Reply, Reply All, Forward, Mark Read/Unread, Move on selected/all emails

---

## 1. Body Display Fix

### Problem
Some emails don't display body content after sync. The `handleGetMail` endpoint (`backend/internal/api/mails.go:56-96`) has multiple code paths:
1. Read from `email.ArchivePath` if present
2. Fallback to `findEmlByUid()` if ArchivePath empty
3. Cache in `globalBodyCache`

Likely causes:
- ArchivePath empty for pre-archive emails
- `findEmlByUid()` fails (date parsing, file missing)
- `extractBody()` returns empty for malformed EML

### Solution
- Add detailed logging to identify failing code path
- Harden `extractBody()` to handle edge cases
- Add `POST /api/v1/mails/{id}/reextract` endpoint to force re-extraction
- Return error details in API response for debugging

### Files to Modify
- `backend/internal/api/mails.go` - Add logging, re-extract endpoint
- `backend/internal/archive/parse.go` - Harden `extractBody()`
- `frontend/src/lib/api.ts` - Add `reextractBody` method

---

## 2. Sidebar Badge Refresh

### Problem
Sidebar folder badges (unread counts) don't reliably update after sync. No manual refresh button.

### Current Flow
- `Sidebar.tsx` calls `api.mails.counts()` on mount
- SSE handlers for `mail:new`, `mail:updated`, `sync:status` call `refreshCounts()`
- But `sync:status` with `status: "ok"` may not fire consistently

### Solution
**Auto-refresh:**
- Ensure `sync:status` with `status === 'ok'` or `status === 'completed'` triggers `refreshCounts()`
- Also trigger on `mail:updated` (already there)

**Manual refresh button:**
- Add refresh icon button next to "邮箱账号" section header in sidebar
- Show loading spinner during refresh
- Call `refreshCounts()` on click

### Files to Modify
- `frontend/src/components/layout/Sidebar.tsx` - Add button, ensure auto-refresh
- `frontend/src/hooks/useSSE.ts` - Verify sync status handling

---

## 3. Stacked Email Detail View

### Problem
When multiple emails selected (via checkboxes or Select All), detail panel still shows single email view.

### Solution
**State logic:**
- `selectedIds.size === 0` → Empty state
- `selectedIds.size === 1` → Normal detail view (existing)
- `selectedIds.size > 1` → Stacked view (new)

**Stacked view UI:**
- Max 5 emails (newest first by date)
- Each card shows:
  - Sender avatar/initials
  - Sender name
  - Subject
  - Date/time
  - Body preview (1-2 lines)
  - Attachment indicator
- Click card → select that email only (exit multi-select)
- "Clear selection" button

### Files to Modify
- `frontend/src/app/mail/page.tsx` - New stacked view rendering, selection logic
- `frontend/src/components/mail/MailItem.tsx` - No changes needed

---

## 4. Bulk Actions

### Problem
No bulk operations. Single-email actions only work on `selectedId`.

### Solution

**Backend API:**
```
POST /api/v1/mails/bulk
{
  "action": "delete|mark_read|mark_unread|move|star|unstar",
  "ids": [1,2,3] | "all_in_folder",
  "folder": "INBOX",  // required for "all_in_folder"
  "destination_folder": "Trash"  // required for "move"
}
```

**Response:**
```json
{
  "success": true,
  "affected_count": 3,
  "failed_ids": []
}
```

**Frontend:**
- When `selectedIds.size > 0`, show bulk action toolbar (replaces single-action toolbar)
- Actions: Delete, Mark Read/Unread, Move (dropdown), Star/Unstar
- Reply/Reply All/Forward only for single selection (navigate to compose)
- "Select All" checkbox → sets `selectedIds = "ALL_IN_FOLDER"` sentinel
- On bulk action: call API, on success refresh list + counts + clear selection

### Files to Modify
- `backend/internal/api/mails.go` - Add `handleBulkMails`
- `backend/internal/api/router.go` - Register route
- `backend/internal/store/emails.go` - Add `BulkUpdate`, `BulkMove`, `BulkDelete`
- `frontend/src/lib/api.ts` - Add `api.mails.bulk()`
- `frontend/src/app/mail/page.tsx` - Bulk action UI + handlers

---

## Implementation Order

1. **Body display fix** (backend first, then frontend)
2. **Sidebar badge refresh** (frontend only)
3. **Stacked detail view** (frontend only)
4. **Bulk actions** (backend API first, then frontend)

---

## Testing Considerations

- Body fix: Test with emails having empty ArchivePath, malformed EML, various encodings
- Badge refresh: Test manual button, verify auto-refresh after sync completes
- Stacked view: Test 0, 1, 2-5, 5+ selections; keyboard navigation
- Bulk actions: Test all action types, "all_in_folder" vs specific IDs, error handling