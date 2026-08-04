'use client'
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MailItem } from '@/components/mail/MailItem'
import { useSSE, useDebounce } from '@/hooks/useSSE'
import { api } from '@/lib/api'
import { Mail, RefreshCw, Filter, Search, ChevronDown, Archive, Trash2, CheckCircle, Clock, ArrowLeft, Paperclip } from '@/lib/lucide-remix'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Email, EmailDetail } from '@/types'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Skeleton } from '@/components/Skeleton'

function MailPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [folder, setFolder] = useState(searchParams?.get('folder') || 'INBOX')
  const [searchQ, setSearchQ] = useState('')
  const debouncedSearch = useDebounce(searchQ, 300)
  const [refresh, setRefresh] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<EmailDetail | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useSSE(() => setRefresh(n => n + 1))

  const loadEmails = useCallback(async () => {
    setLoading(true)
    try {
      const data = debouncedSearch
        ? await api.mails.search(debouncedSearch)
        : await api.mails.list(undefined, folder === 'ALL' ? '' : folder)
      setEmails(data || [])
    } catch { setEmails([]) }
    setLoading(false)
  }, [folder, debouncedSearch])

  useEffect(() => { loadEmails() }, [loadEmails, refresh])

  const loadDetail = useCallback(async (id: number) => {
    try {
      const d = await api.mails.get(id)
      setDetail(d)
    } catch { setDetail(null) }
  }, [])

  const filterTabs = [
    { label: '所有邮件', value: 'ALL' },
    { label: '未读', value: 'UNSEEN' },
    { label: '有附件', value: 'HASATTACH' },
    { label: '已标星', value: 'STARRED' },
  ]

  const handleSelect = useCallback(async (id: number) => {
    setSelectedId(id)
    await loadDetail(id)
  }, [loadDetail])

  const handleArchive = async () => {
    if (!selectedId) return
    await api.mails.move(selectedId, 'Archive').catch(() => {})
    setSelectedId(null); setDetail(null)
    setRefresh(n => n + 1)
  }

  const handleDeleteRequest = () => {
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    await api.mails.delete(selectedId).catch(() => {})
    setSelectedId(null); setDetail(null)
    setRefresh(n => n + 1)
    router.refresh()
  }

  const handleNext = () => {
    if (!selectedId || emails.length === 0) return
    const idx = emails.findIndex(e => e.id === selectedId)
    if (idx < emails.length - 1) handleSelect(emails[idx + 1].id)
  }

  const handlePrev = () => {
    if (!selectedId || emails.length === 0) return
    const idx = emails.findIndex(e => e.id === selectedId)
    if (idx > 0) handleSelect(emails[idx - 1].id)
  }

  return (
    <AppShell>
      <div className="flex h-full">
        {/* Email list */}
        <div className="w-[420px] border-r shrink-0 flex flex-col bg-[var(--card)]">
          {/* Toolbar */}
          <div className="px-5 py-3 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-semibold" style={{ color: 'var(--foreground)' }}>
                  {filterTabs.find(t => t.value === folder)?.label || '收件箱'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                  {emails.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setRefresh(n => n + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--accent)]">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--foreground-secondary)' }} />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--accent)]">
                  <Filter className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
                </button>
              </div>
            </div>
            <form onSubmit={e => { e.preventDefault(); loadEmails() }} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-[var(--muted)] rounded-xl outline-none text-sm placeholder:text-[var(--muted-foreground)]"
                placeholder="搜索邮件..." />
            </form>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-4 py-2.5 border-b overflow-x-auto">
            {filterTabs.map((t) => (
              <button key={t.value} onClick={() => { setFolder(t.value); setSearchQ('') }}
                className={`px-3 h-7 rounded-full text-xs whitespace-nowrap transition-colors ${folder === t.value ? 'font-medium' : ''}`}
                style={{
                  backgroundColor: folder === t.value ? 'rgba(196,61,61,0.1)' : 'var(--muted)',
                  color: folder === t.value ? 'var(--danger)' : 'var(--foreground-tertiary)',
                }}
              >{t.label}</button>
            ))}
            <button className="ml-auto flex items-center gap-1 px-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)] rounded">
              排序 <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b">
                  <div className="w-8 h-8 rounded-full skeleton shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 skeleton" />
                    <div className="h-2 w-1/2 skeleton" />
                  </div>
                </div>
              ))
            ) : emails.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--muted-foreground)' }}>暂无邮件</div>
            ) : (
              emails.map((email) => (
                <div key={email.id} onClick={() => handleSelect(email.id)}
                  className={`flex items-stretch cursor-pointer border-b transition-colors ${selectedId === email.id ? 'bg-[var(--accent)]' : 'hover:bg-[var(--muted)]'}`}
                >
                  <div className="flex flex-col items-center py-3 px-3 gap-2">
                    <div className="w-4 h-4 rounded border-2 flex items-center justify-center"
                      style={{ borderColor: selectedId === email.id ? 'var(--danger)' : 'var(--muted-foreground)' }}
                    >
                      {selectedId === email.id && <CheckCircle className="w-3 h-3" style={{ color: 'var(--danger)' }} />}
                    </div>
                    {email.is_read === false && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--danger)' }} />}
                  </div>
                  <div className="flex-1 min-w-0 py-2">
                    <MailItem email={email} brand={(email as any).account_brand} onSelect={() => handleSelect(email.id)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email detail */}
        <div className="flex-1 bg-[var(--background)] overflow-auto">
          {detail ? (
            <div className="max-w-[780px] mx-auto px-10 py-6 space-y-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => { setSelectedId(null); setDetail(null); }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--card)]">
                    <ArrowLeft className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
                  </button>
                  <button onClick={handleArchive} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--card)]"><Archive className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button>
                  <button onClick={handleDeleteRequest} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--card)]"><Trash2 className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button>
                  <div className="w-px h-5 bg-[var(--border)] mx-1" />
                  <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--card)]"><Clock className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--foreground-tertiary)' }}>
                  <span>{selectedId ? (emails.findIndex(e => e.id === selectedId) + 1) : 0} / {emails.length}</span>
                  <button onClick={handlePrev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--card)]"><ArrowLeft className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button>
                  <button onClick={handleNext} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--card)]"><ChevronDown className="w-4 h-4 rotate-90" style={{ color: 'var(--foreground-secondary)' }} /></button>
                </div>
              </div>

              {/* Subject */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{detail.email.subject || '(无主题)'}</h1>
                  {detail.email.is_starred && <span className="text-yellow-500 text-xs">★</span>}
                </div>
              </div>

              {/* From info */}
              <div className="flex items-start gap-3 pb-5 border-b">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--primary), #a83232)' }}
                >
                  {(detail.email.from?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[16px] font-semibold" style={{ color: 'var(--foreground)' }}>{detail.email.from}</span>
                      <span className="text-sm text-[var(--foreground-tertiary)] ml-2">&lt;{detail.email.from}&gt;</span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>
                      {new Date(detail.email.date).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>收件人: {detail.email.to}</div>
                </div>
              </div>

              {/* Body */}
              <div
                className="text-sm leading-7"
                style={{ color: 'var(--foreground-secondary)' }}
                dangerouslySetInnerHTML={{ __html: detail.body_html || `<p>${detail.email.body_preview || '(无正文内容)'}</p>` }}
              />

              {/* Attachments */}
              {detail.attachments && detail.attachments.length > 0 && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-3" style={{ color: 'var(--foreground-tertiary)' }}>附件 ({detail.attachments.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {detail.attachments.map(att => (
                      <a key={att.id} href={api.mails.attachmentUrl(detail.email.id, att.id)}
                        download={att.filename}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--foreground-secondary)', backgroundColor: 'var(--card)' }}
                      >
                        <Paperclip className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                        <span className="max-w-[150px] truncate">{att.filename}</span>
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>({(att.size / 1024).toFixed(0)}KB)</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply */}
              <div className="rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card)' }}>
                <div className="text-sm font-medium mb-3" style={{ color: 'var(--foreground-tertiary)' }}>快捷回复</div>
                <textarea
                  placeholder="输入回复内容..."
                  rows={3}
                  className="w-full outline-none text-sm bg-transparent resize-none placeholder:text-[var(--muted-foreground)]"
                  style={{ color: 'var(--foreground)' }}
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center gap-1">
                    <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded"><span className="font-bold text-xs" style={{ color: 'var(--foreground-tertiary)' }}>B</span></button>
                    <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded"><span className="fontItalic text-xs italic" style={{ color: 'var(--foreground-tertiary)' }}>I</span></button>
                    <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded"><Paperclip className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} /></button>
                  </div>
                  <button className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">
                    <SendIcon className="w-4 h-4" /> 发送
                  </button>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="max-w-[780px] mx-auto px-10 py-6 space-y-6">
              <div className="h-6 w-1/2 skeleton" />
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 skeleton" />
                  <div className="h-3 w-1/3 skeleton" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full skeleton" />
                <div className="h-3 w-5/6 skeleton" />
                <div className="h-3 w-4/6 skeleton" />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--muted)' }}>
                  <Mail className="w-8 h-8" style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--foreground-tertiary)' }}>选择一封邮件查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirm
        open={deleteOpen}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </AppShell>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  )
}

export default function MailPage() {
  return <Suspense><MailPageInner /></Suspense>
}
