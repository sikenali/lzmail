'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { Search, Plus, MoreVertical, ChevronDown, User } from 'lucide-react'
import type { Contact } from '@/types'

const gradients = [
  'from-orange-400 to-red-500', 'from-blue-400 to-indigo-500', 'from-cyan-400 to-blue-500',
  'from-red-400 to-pink-500', 'from-purple-400 to-pink-500', 'from-green-400 to-emerald-500',
]

const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.contacts.list().then(list => setContacts(list || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = contacts.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  const grouped: Record<string, Contact[]> = {}
  for (const c of filtered) {
    const letter = (c.name?.[0] || '#').toUpperCase()
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(c)
  }

  const availableLetters = ALPHABET.filter(l => grouped[l])

  return (
    <AppShell>
      <div className="flex h-full">
        <div className="w-[280px] border-r shrink-0 bg-[var(--card)] flex flex-col">
          <div className="px-5 py-4 border-b">
            <h1 className="text-sm font-semibold mb-3">联系人</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[var(--muted)] rounded-lg outline-none text-sm" placeholder="搜索联系人..." />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {availableLetters.map(l => (
              <a key={l} href={`#letter-${l}`}
                className="flex items-center justify-between px-3 h-8 rounded-lg text-sm text-[var(--foreground-tertiary)] hover:bg-[var(--accent)]"
              >
                {l}
                <span className="text-xs">{grouped[l].length}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--foreground-secondary)]">{filtered.length} 个联系人</span>
            </div>
            <button className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> 新建联系人
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12"><div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-4"><User className="w-8 h-8 text-[var(--muted-foreground)]" /></div><p className="text-sm text-[var(--muted-foreground)]">加载中...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12"><div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-4"><User className="w-8 h-8 text-[var(--muted-foreground)]" /></div><p className="text-sm text-[var(--muted-foreground)]">暂无联系人</p></div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([letter, items]) => (
                <div key={letter} id={`letter-${letter}`}>
                  <div className="sticky top-0 bg-[var(--background)] z-10 pb-2 mb-2 border-b">
                    <span className="text-lg font-semibold text-[var(--foreground)]">{letter}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {items.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 p-4 bg-[var(--card)] rounded-xl border hover:shadow-sm transition-shadow cursor-pointer">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradients[(c.id % gradients.length)]} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                          {(c.name?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{c.name || '(无名)'}</div>
                          <div className="text-xs text-[var(--muted-foreground)] truncate">{c.email}</div>
                        </div>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-lg">
                          <MoreVertical className="w-4 h-4 text-[var(--foreground-tertiary)]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
