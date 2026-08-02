import type { Account, Email, Contact, MailStats, EmailDetail, ComposePayload } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    let msg = `HTTP ${res.status}`
    try { const j = JSON.parse(body); msg = j.error || msg } catch {}
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  const parsed: T = JSON.parse(text)
  if (parsed === null) return undefined as T
  return parsed
}

export const api = {
  accounts: {
    list: () => fetchJSON<Account[]>('/api/v1/accounts'),
    create: (data: Partial<Account> & { password?: string }) =>
      fetchJSON<Account>('/api/v1/accounts', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => fetchJSON<void>(`/api/v1/accounts/${id}`, { method: 'DELETE' }),
    update: (id: number, data: Partial<Account> & { password?: string }) =>
      fetchJSON<Account>(`/api/v1/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  mails: {
    list: (accountId?: number, folder = 'INBOX', limit = 50, offset = 0) => {
      const params = new URLSearchParams()
      if (accountId) params.set('account_id', String(accountId))
      params.set('folder', folder)
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      return fetchJSON<Email[]>(`/api/v1/mails?${params}`)
    },
    get: (id: number) => fetchJSON<EmailDetail>(`/api/v1/mails/${id}`),
    search: (q: string, limit = 50, offset = 0) =>
      fetchJSON<Email[]>(`/api/v1/mails/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),
    stats: () => fetchJSON<MailStats>('/api/v1/mails/stats'),
    trend: (days = 7) => fetchJSON<Array<{date: string; receive: number; send: number}>>(`/api/v1/mails/trend?days=${days}`),
    markRead: (id: number) => fetchJSON<{ status: string }>(`/api/v1/mails/${id}/read`, { method: 'POST' }),
    move: (id: number, folder: string) => fetchJSON<{ status: string }>(`/api/v1/mails/${id}`, { method: 'PATCH', body: JSON.stringify({ folder }) }),
    markStar: (id: number, starred: boolean) =>
      fetchJSON<{ status: string }>(`/api/v1/mails/${id}/star?starred=${starred}`, { method: 'POST' }),
    delete: (id: number) => fetchJSON<void>(`/api/v1/mails/${id}`, { method: 'DELETE' }),
    rawUrl: (id: number) => `${API_BASE}/api/v1/mails/${id}/raw`,
    attachmentUrl: (emailId: number, attId: number) => `${API_BASE}/api/v1/mails/${emailId}/attachments/${attId}`,
  },

  compose: (data: ComposePayload) =>
    fetchJSON<{ status: string }>('/api/v1/compose', { method: 'POST', body: JSON.stringify(data) }),

  contacts: {
    list: () => fetchJSON<Contact[]>('/api/v1/contacts'),
    create: (data: Partial<Contact>) => fetchJSON<Contact>('/api/v1/contacts', { method: 'POST', body: JSON.stringify(data) }),
  },

  settings: {
    get: () => fetchJSON<Record<string, string>>('/api/v1/settings'),
    set: (data: Record<string, string>) =>
      fetchJSON<{ status: string }>('/api/v1/settings', { method: 'POST', body: JSON.stringify(data) }),
  },

  events: {
    url: () => `${API_BASE}/api/v1/events`,
  },
}
