import type { Account, Email } from '@/types'

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
