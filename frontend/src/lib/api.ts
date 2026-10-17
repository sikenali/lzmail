import type { Account, Email, Contact, MailStats, EmailDetail, ComposePayload, StorageTreeNode, Tag } from '@/types'

const API_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      signal: controller.signal,
      ...init,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      const body = await res.text()
      let msg = `HTTP ${res.status}`
      try { const j = JSON.parse(body); msg = j.error || msg } catch {}
      if (res.headers.get('content-type')?.includes('text/html')) msg = '后端连接异常，请检查网络或稍后重试'
      throw new Error(msg)
    }
    if (res.status === 204) return undefined as T
    const text = await res.text()
    if (!text) return undefined as T
    const parsed: T = JSON.parse(text)
    if (parsed === null) return undefined as T
    return parsed
  } catch (e: any) {
    clearTimeout(timeout)
    if (e.name === 'AbortError') throw new Error('请求超时，请稍后重试')
    throw e
  }
}

export const api = {
  accounts: {
    list: () => fetchJSON<Account[]>('/api/v1/accounts'),
    create: (data: Partial<Account> & { password?: string; access_token?: string; token_type?: string; expiry?: string; scope?: string }) =>
      fetchJSON<Account>('/api/v1/accounts', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => fetchJSON<void>(`/api/v1/accounts/${id}`, { method: 'DELETE' }),
    update: (id: number, data: Partial<Account> & { password?: string }) =>
      fetchJSON<Account>(`/api/v1/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  oauth: {
    authUrl: (provider: string, returnUrl?: string) => {
      const url = `/api/v1/oauth/${provider}/init${returnUrl ? `?return_url=${encodeURIComponent(returnUrl)}` : ''}`
      return fetchJSON<{ auth_url: string; state: string }>(url)
    },
    callback: (provider: string, code: string, state: string) =>
      fetchJSON<{ provider: string; access_token: string; refresh_token?: string; token_type?: string; expires_in: number; scope?: string }>(
        `/api/v1/oauth/${provider}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
      ),
  },

  mails: {
    list: (accountId?: number, folder = 'INBOX', limit = 50, offset = 0, fromDate?: string, toDate?: string) => {
      const params = new URLSearchParams()
      if (accountId) params.set('account_id', String(accountId))
      params.set('folder', folder)
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (fromDate) params.set('from_date', fromDate)
      if (toDate) params.set('to_date', toDate)
      return fetchJSON<Email[]>(`/api/v1/mails?${params}`)
    },
    listWithTotal: async (accountId?: number, folder = 'INBOX', limit = 50, offset = 0): Promise<{ items: Email[]; total: number }> => {
      const params = new URLSearchParams()
      if (accountId) params.set('account_id', String(accountId))
      params.set('folder', folder)
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      const res = await fetch(`${API_BASE}/api/v1/mails?${params}`)
      const total = parseInt(res.headers.get('X-Total-Count') || '0', 10) || 0
      const items: Email[] = await res.json()
      return { items, total }
    },
    get: (id: number) => fetchJSON<EmailDetail>(`/api/v1/mails/${id}`),
    search: (q: string, accountId?: number, limit = 50, offset = 0) => {
      const params = new URLSearchParams({ q: q, limit: String(limit), offset: String(offset) })
      if (accountId) params.set('account_id', String(accountId))
      return fetchJSON<Email[]>(`/api/v1/mails/search?${params}`)
    },
    stats: (fromDate?: string, toDate?: string) => {
      const params = new URLSearchParams()
      if (fromDate) params.set('from_date', fromDate)
      if (toDate) params.set('to_date', toDate)
      const qs = params.toString()
      return fetchJSON<MailStats>(`/api/v1/mails/stats${qs ? '?' + qs : ''}`)
    },
    counts: () => fetchJSON<{ inbox_unread: number; drafts: number; starred: number; sent: number; trash: number; unread: number }>('/api/v1/mails/counts'),
    trend: (days = 7) => fetchJSON<Array<{date: string; receive: number; send: number}>>(`/api/v1/mails/trend?days=${days}`),
    markRead: (id: number) => fetchJSON<{ status: string }>(`/api/v1/mails/${id}/read`, { method: 'POST' }),
    move: (id: number, folder: string) => fetchJSON<{ status: string }>(`/api/v1/mails/${id}`, { method: 'PATCH', body: JSON.stringify({ folder }) }),
    markStar: (id: number, starred: boolean) =>
      fetchJSON<{ status: string }>(`/api/v1/mails/${id}/star?starred=${starred}`, { method: 'POST' }),
    delete: (id: number) => fetchJSON<void>(`/api/v1/mails/${id}`, { method: 'DELETE' }),
    reextractBody: (id: number) => fetchJSON<{ body_html: string; source: string }>(`/api/v1/mails/${id}/reextract`, { method: 'POST' }),
    getDraft: (id: number) => fetchJSON<{ id: number; account_id: number; to: string; cc: string; bcc: string; subject: string; body_html: string; body_text: string; message_id: string }>(`/api/v1/mails/${id}/draft`),
    bulk: (data: { action: string; ids?: number[]; all_in_folder?: boolean; folder?: string; destination_folder?: string }) =>
      fetchJSON<{ success: boolean; affected_count: number }>('/api/v1/mails/bulk', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    rawUrl: (id: number) => `${API_BASE}/api/v1/mails/${id}/raw`,
    attachmentUrl: (emailId: number, attId: number) => `${API_BASE}/api/v1/mails/${emailId}/attachments/${attId}`,
    inlineImageUrl: (emailId: number, contentID: string) =>
      `${API_BASE}/api/v1/mails/${emailId}/inline/${encodeURIComponent(contentID)}`,
  },

  compose: (data: ComposePayload) =>
    fetchJSON<{ status: string }>('/api/v1/compose', { method: 'POST', body: JSON.stringify(data) }),
  uploadAttachment: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/api/v1/compose/attachments`, { method: 'POST', body: form })
    if (!res.ok) {
      const body = await res.text()
      let msg = `HTTP ${res.status}`
      try { const j = JSON.parse(body); msg = j.error || msg } catch {}
      throw new Error(msg)
    }
    return res.json() as Promise<{ id: number; filename: string; mime_type: string; size: number; path: string }>
  },

  contacts: {
    list: (accountId?: number, limit = 10, offset = 0) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (accountId) params.set('account_id', String(accountId))
      return fetchJSON<{ items: Contact[]; total: number }>(`/api/v1/contacts?${params}`)
    },
    create: (data: Partial<Contact>) => fetchJSON<Contact>('/api/v1/contacts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Contact>) =>
      fetchJSON<Contact>(`/api/v1/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => fetchJSON<void>(`/api/v1/contacts/${id}`, { method: 'DELETE' }),
    search: (q: string, accountId?: number, limit = 10, offset = 0) => {
      const params = new URLSearchParams({ q, limit: String(limit), offset: String(offset) })
      if (accountId) params.set('account_id', String(accountId))
      return fetchJSON<{ items: Contact[]; total: number }>(`/api/v1/contacts/search?${params}`)
    },
  },

  settings: {
    get: () => fetchJSON<Record<string, string>>('/api/v1/settings'),
    set: (data: Record<string, string>) =>
      fetchJSON<{ status: string }>('/api/v1/settings', { method: 'POST', body: JSON.stringify(data) }),
  },

  storage: {
    list: (path: string) =>
      fetchJSON<{ path: string; entries: Array<{ name: string; is_dir: boolean; path: string; subdirs?: Array<{ name: string; is_dir: boolean; path: string }> }> }>(`/api/v1/storage/list?path=${encodeURIComponent(path)}`),
    tree: (path: string) =>
      fetchJSON<{ path: string; root: StorageTreeNode }>(`/api/v1/storage/tree?path=${encodeURIComponent(path)}`),
  },

  sync: {
    all: () => fetchJSON<{ status: string }>('/api/v1/sync', { method: 'POST' }),
    account: (id: number) => fetchJSON<{ status: string }>(`/api/v1/sync?account_id=${id}`, { method: 'POST' }),
    status: () => fetchJSON<Record<string, string>>('/api/v1/sync/status'),
    statusDetail: () => fetchJSON<Record<string, { status: string; mode: string }>>('/api/v1/sync/status/detail'),
  },

  tags: {
    list: (accountId: number) => fetchJSON<Tag[]>(`/api/v1/tags?account_id=${accountId}`),
    create: (data: { name: string; account_id: number }) =>
      fetchJSON<Tag>('/api/v1/tags', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number, accountId: number) =>
      fetchJSON<{ status: string }>(`/api/v1/tags/${id}?account_id=${accountId}`, { method: 'DELETE' }),
    getEmailTags: (emailId: number) => fetchJSON<Tag[]>(`/api/v1/emails/${emailId}/tags`),
    setEmailTags: (emailId: number, tagIds: number[]) =>
      fetchJSON<Tag[]>(`/api/v1/emails/${emailId}/tags`, {
        method: 'PATCH',
        body: JSON.stringify({ tag_ids: tagIds }),
      }),
  },

  cleanup: {
    preview: (accountId: number, days: number) =>
      fetchJSON<{ account_id: number; days: number; cutoff_date: string; count: number }>(
        `/api/v1/mails/cleanup/preview?account_id=${accountId}&days=${days}`
      ),
    run: (accountId: number, days: number) =>
      fetchJSON<{ deleted: number; days: number; message: string }>(
        `/api/v1/mails/cleanup/run?account_id=${accountId}&days=${days}`,
        { method: 'POST' }
      ),
  },

  events: {
    url: () => `${API_BASE}/api/v1/events`,
  },
}
