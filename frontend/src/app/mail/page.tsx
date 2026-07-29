'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MailItem } from '@/components/mail/MailItem'
import { useSSE } from '@/hooks/useSSE'
import { api } from '@/lib/api'
import { Mail, RefreshCw, Filter, Search, ChevronDown } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Email } from '@/types'

function MailPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [folder, setFolder] = useState(searchParams?.get('folder') || 'INBOX')
  const [searchQ, setSearchQ] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useSSE(() => setRefresh(n => n + 1))

  const loadEmails = useCallback(async () => {
    setLoading(true)
    try {
      const data = searchQ
        ? await api.mails.search(searchQ)
        : await api.mails.list(undefined, folder === 'ALL' ? '' : folder)
      setEmails(data || [])
    } catch { setEmails([]) }
    setLoading(false)
  }, [folder, searchQ])

  useEffect(() => { loadEmails() }, [loadEmails, refresh])

  const filterTabs = ['所有邮件', '未读', '有附件', '已标星']
  const filterValues = ['ALL', 'UNSEEN', 'HASATTACH', 'STARRED']

  const toggleAll = () => {
    if (selected.size === emails.length) setSelected(new Set())
    else setSelected(new Set(emails.map(e => e.id)))
  }

  return (
    <AppShell>
      <div className="flex h-full">
        <div className="w-[400px] border-r shrink-0 flex flex-col bg-[var(--card)]">
          <div className="px-5 py-3 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{folder === 'ALL' ? '所有邮件' : '收件箱'}</span>
                <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded-full">{emails.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setRefresh(n => n + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-lg">
                  <RefreshCw className={`w-4 h-4 text-[var(--foreground-tertiary)] ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-lg">
                  <Filter className="w-4 h-4 text-[var(--foreground-tertiary)]" />
                </button>
              </div>
            </div>
            <form onSubmit={e => { e.preventDefault(); loadEmails() }} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[var(--muted)] rounded-lg outline-none text-sm placeholder:text-[var(--muted-foreground)]" placeholder="搜索邮件..." />
            </form>
          </div>

          <div className="flex gap-1 px-3 py-2.5 border-b overflow-x-auto">
            {filterTabs.map((t, i) => (
              <button key={t} onClick={() => { setFolder(filterValues[i]); setSearchQ('') }}
                className={`px-3 h-7 rounded-full text-xs whitespace-nowrap transition-colors ${folder === filterValues[i] ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium' : 'bg-[var(--muted)] text-[var(--foreground-tertiary)] hover:bg-[var(--accent)]'}`}>
                {t}
              </button>
            ))}
            <button className="ml-auto flex items-center gap-1 px-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)] rounded">
              排序 <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 border-b text-xs text-[var(--muted-foreground)] bg-[var(--muted)]/30">
            <label className="flex items-center gap-2 cursor-pointer" onClick={toggleAll}>
              <input type="checkbox" checked={selected.size === emails.length && emails.length > 0}
                onChange={toggleAll} className="accent-[var(--primary)]" />
              <span>全选</span>
            </label>
            {selected.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[var(--foreground-tertiary)]">已选 {selected.size} 封</span>
                <button className="text-[var(--primary)] hover:underline">标为已读</button>
                <button className="text-red-500 hover:underline">删除</button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-sm text-[var(--muted-foreground)]">加载中...</div>
            ) : emails.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-[var(--muted-foreground)]">暂无邮件</div>
            ) : (
              emails.map((email) => (
                <div key={email.id} className="flex items-stretch group">
                  <div className="flex items-center pl-4 pr-2 border-r border-transparent group-hover:border-[var(--border)]">
                    <input type="checkbox" checked={selected.has(email.id)}
                      onChange={() => { const s = new Set(selected); s.has(email.id) ? s.delete(email.id) : s.add(email.id); setSelected(s) }}
                      className="accent-[var(--primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <MailItem key={email.id} email={email} brand={(email as any).account_brand} onSelect={(id) => router.push(`/mail/${id}`)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-[var(--background)]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-[var(--muted-foreground)]" />
            </div>
            <p className="text-sm text-[var(--foreground-tertiary)]">选择一封邮件查看详情</p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function MailPage() {
  return <Suspense><MailPageInner /></Suspense>
}
