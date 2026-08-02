'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MailItem } from '@/components/mail/MailItem'
import { useSSE } from '@/hooks/useSSE'
import { api } from '@/lib/api'
import { Mail, RefreshCw, Filter, Search, ChevronDown, Archive, Trash2, CheckCircle, Clock, ArrowLeft, Paperclip } from 'lucide-react'
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
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Email | null>(null)

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

  const filterTabs = [
    { label: '所有邮件', value: 'ALL' },
    { label: '未读', value: 'UNSEEN' },
    { label: '有附件', value: 'HASATTACH' },
    { label: '已标星', value: 'STARRED' },
  ]

  const handleSelect = async (id: number) => {
    setSelectedId(id)
    try {
      const d = await api.mails.get(id)
      setDetail(d?.email ?? null)
    } catch { setDetail(null) }
  }

  const handleArchive = async () => {
    if (!selectedId) return
    // Archive: mark as read (true folder move requires backend PATCH API)
    await api.mails.markRead(selectedId).catch(() => {})
    setSelectedId(null); setDetail(null)
    setRefresh(n => n + 1)
  }
  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm('确定删除这封邮件？')) return
    await api.mails.delete(selectedId).catch(() => {})
    setSelectedId(null); setDetail(null)
    setRefresh(n => n + 1)
    router.refresh()
  }
  const handleDeferred = async () => {
    if (!selectedId) return
    // Defer: move to DEFERRED folder (requires backend folder update API)
    // For now, show a note that this feature needs backend support
    setRefresh(n => n + 1)
  }
  const handlePrev = () => {
    if (!selectedId || emails.length === 0) return
    const idx = emails.findIndex(e => e.id === selectedId)
    if (idx > 0) handleSelect(emails[idx - 1].id)
  }
  const handleNext = () => {
    if (!selectedId || emails.length === 0) return
    const idx = emails.findIndex(e => e.id === selectedId)
    if (idx < emails.length - 1) handleSelect(emails[idx + 1].id)
  }

  return (
    <AppShell>
      <div className="flex h-full">
        {/* Email list */}
        <div className="w-[420px] border-r shrink-0 flex flex-col bg-white" style={{ borderColor: '#f3ede3' }}>
          {/* Toolbar */}
          <div className="px-5 py-3 border-b" style={{ borderColor: '#f3ede3' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-semibold" style={{ color: '#3d2b1f' }}>
                  {filterTabs.find(t => t.value === folder)?.label || '收件箱'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#fef9f0', color: '#c43d3d' }}>
                  {emails.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setRefresh(n => n + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--accent)]">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#6b5b4f' }} />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--accent)]">
                  <Filter className="w-4 h-4" style={{ color: '#6b5b4f' }} />
                </button>
              </div>
            </div>
            <form onSubmit={e => { e.preventDefault(); loadEmails() }} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-[#f5f0e8] rounded-xl outline-none text-sm placeholder:text-[#b8a88a]"
                placeholder="搜索邮件..." />
            </form>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-4 py-2.5 border-b overflow-x-auto" style={{ borderColor: '#f3ede3' }}>
            {filterTabs.map((t) => (
              <button key={t.value} onClick={() => { setFolder(t.value); setSearchQ('') }}
                className={`px-3 h-7 rounded-full text-xs whitespace-nowrap transition-colors ${folder === t.value ? 'font-medium' : ''}`}
                style={{
                  backgroundColor: folder === t.value ? 'rgba(196,61,61,0.1)' : '#f5f0e8',
                  color: folder === t.value ? '#c43d3d' : '#8b7355',
                }}
              >{t.label}</button>
            ))}
            <button className="ml-auto flex items-center gap-1 px-2 text-xs text-[#b8a88a] hover:bg-[var(--accent)] rounded">
              排序 <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-sm" style={{ color: '#b8a88a' }}>加载中...</div>
            ) : emails.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm" style={{ color: '#b8a88a' }}>暂无邮件</div>
            ) : (
              emails.map((email) => (
                <div key={email.id} onClick={() => handleSelect(email.id)}
                  className={`flex items-stretch cursor-pointer border-b transition-colors ${selectedId === email.id ? 'bg-[#fef9f0]' : 'hover:bg-[#faf8f5]'}`}
                  style={{ borderColor: '#f5f0e8' }}
                >
                  <div className="flex flex-col items-center py-3 px-3 gap-2">
                    <div className="w-4 h-4 rounded border-2 flex items-center justify-center"
                      style={{ borderColor: selectedId === email.id ? '#c43d3d' : '#d4c8b8' }}
                    >
                      {selectedId === email.id && <CheckCircle className="w-3 h-3" style={{ color: '#c43d3d' }} />}
                    </div>
                    {email.is_read === false && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#c43d3d' }} />}
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
        <div className="flex-1 bg-[#fbf7f0] overflow-auto">
          {detail ? (
            <div className="max-w-[780px] mx-auto px-10 py-6 space-y-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => { setSelectedId(null); setDetail(null); }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white">
                    <ArrowLeft className="w-4 h-4" style={{ color: '#6b5b4f' }} />
                  </button>
                  <button onClick={handleArchive} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white"><Archive className="w-4 h-4" style={{ color: '#6b5b4f' }} /></button>
                  <button onClick={handleDelete} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white"><Trash2 className="w-4 h-4" style={{ color: '#6b5b4f' }} /></button>
                  <div className="w-px h-5 bg-[#f3ede3] mx-1" />
                  <button onClick={handleDeferred} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white"><Clock className="w-4 h-4" style={{ color: '#6b5b4f' }} /></button>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#8b7355' }}>
                  <span>{selectedId ? (emails.findIndex(e => e.id === selectedId) + 1) : 0} / {emails.length}</span>
                  <button onClick={handlePrev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white"><ArrowLeft className="w-4 h-4" style={{ color: '#6b5b4f' }} /></button>
                  <button onClick={handleNext} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white"><ChevronDown className="w-4 h-4 rotate-90" style={{ color: '#6b5b4f' }} /></button>
                </div>
              </div>

              {/* Subject */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-lg font-semibold" style={{ color: '#3d2b1f' }}>{detail.subject || '(无主题)'}</h1>
                  {detail.is_starred && <span className="text-yellow-500 text-xs">★</span>}
                </div>
              </div>

              {/* From info */}
              <div className="flex items-start gap-3 pb-5 border-b" style={{ borderColor: '#f3ede3' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #c43d3d, #a83232)' }}
                >
                  {(detail.from?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[16px] font-semibold" style={{ color: '#3d2b1f' }}>{detail.from}</span>
                      <span className="text-sm text-[#8b7355] ml-2">&lt;{detail.from}&gt;</span>
                    </div>
                    <div className="text-xs" style={{ color: '#8b7355' }}>
                      {new Date(detail.date).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#b8a88a' }}>收件人: {detail.to}</div>
                </div>
              </div>

              {/* Body */}
              <div className="text-sm leading-7" style={{ color: '#6b5b4f' }}>
                <p>{detail.body_preview || '(无正文内容)'}</p>
              </div>

              {/* Reply */}
              <div className="rounded-xl border p-4" style={{ borderColor: '#f3ede3', backgroundColor: '#ffffff' }}>
                <div className="text-sm font-medium mb-3" style={{ color: '#8b7355' }}>快捷回复</div>
                <textarea
                  placeholder="输入回复内容..."
                  rows={3}
                  className="w-full outline-none text-sm bg-transparent resize-none placeholder:text-[#b8a88a]"
                  style={{ color: '#3d2b1f' }}
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: '#f3ede3' }}>
                  <div className="flex items-center gap-1">
                    <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded"><span className="font-bold text-xs" style={{ color: '#8b7355' }}>B</span></button>
                    <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded"><span className="fontItalic text-xs italic" style={{ color: '#8b7355' }}>I</span></button>
                    <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded"><Paperclip className="w-4 h-4" style={{ color: '#8b7355' }} /></button>
                  </div>
                  <button className="flex items-center gap-2 px-4 h-9 bg-[#c43d3d] text-white rounded-lg text-sm font-medium hover:opacity-90">
                    <Send className="w-4 h-4" /> 发送
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f5f0e8' }}>
                  <Mail className="w-8 h-8" style={{ color: '#b8a88a' }} />
                </div>
                <p className="text-sm" style={{ color: '#8b7355' }}>选择一封邮件查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function Send({ className }: { className?: string }) {
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
