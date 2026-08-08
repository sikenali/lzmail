'use client'
import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MailItem } from '@/components/mail/MailItem'
import { useSSE, useDebounce } from '@/hooks/useSSE'
import { api } from '@/lib/api'
import { ArrowLeft, Archive, Trash2, Star, ChevronUp, ChevronDown, MoreHorizontal, Reply, Forward, Paperclip, Send, Clock, Bold, Italic, Underline, MailCheck, Search, Check, Tags, FolderMove, Mail, RefreshCw, Download, ArrowUpDown, Calendar, User, FileText } from '@/lib/icons'
import { getAccountAvatarBg } from '@/lib/icons'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Email, EmailDetail } from '@/types'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Skeleton } from '@/components/Skeleton'
import { Tooltip } from '@/components/Tooltip'

function MailPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [folder, setFolder] = useState(searchParams?.get('folder') || 'INBOX')
  const [searchQ, setSearchQ] = useState(searchParams?.get('q') || '')

  useEffect(() => {
    const f = searchParams?.get('folder')
    const q = searchParams?.get('q')
    setFolder(f || 'INBOX')
    setSearchQ(q || '')
  }, [searchParams])
  const debouncedSearch = useDebounce(searchQ, 300)
  const [refresh, setRefresh] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<EmailDetail | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [folderMoveOpen, setFolderMoveOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sortAsc, setSortAsc] = useState(false)
  const [sortMode, setSortMode] = useState<'date' | 'name' | 'subject'>('date')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const listCache = useRef<Record<string, Email[]>>({})
  const scrollHandlerRef = useRef<() => void>(() => {})

  useSSE(() => {
    if (folder === 'INBOX' && !debouncedSearch) {
      fetchPage(0, false)
    } else {
      setRefresh(n => n + 1)
    }
  })

  const resetList = useCallback(() => {
    setEmails([])
    setOffset(0)
    setHasMore(true)
  }, [])

  const PAGE_SIZE = 50

  const fetchPage = useCallback(async (off: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      const data = debouncedSearch && debouncedSearch.trim()
        ? await api.mails.search(debouncedSearch)
        : await api.mails.list(undefined, folder === 'ALL' ? '' : folder, PAGE_SIZE, off)
      const items = data || []
      setEmails(prev => append ? [...prev, ...items] : items)
      if (!append) listCache.current[`${folder}:${debouncedSearch}`] = items
      setOffset(off)
      setHasMore(items.length >= PAGE_SIZE)
    } catch { if (!append) setEmails([]) }
    setLoading(false)
    setLoadingMore(false)
  }, [folder, debouncedSearch])

  useEffect(() => {
    const cached = listCache.current[`${folder}:${debouncedSearch}`]
    if (cached) {
      setEmails(cached)
      setOffset(0)
      setHasMore(true)
    } else {
      resetList()
    }
    fetchPage(0, false)
  }, [fetchPage, resetList, refresh])

  useEffect(() => {
    scrollHandlerRef.current = () => {
      if (loadingMore || !hasMore || loading) return
      const el = listRef.current
      if (!el) return
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
        fetchPage(offset + PAGE_SIZE, true)
      }
    }
  })

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onScroll = () => scrollHandlerRef.current()
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const loadDetail = useCallback(async (id: number): Promise<EmailDetail | null> => {
    try {
      const d = await api.mails.get(id)
      setDetail(d)
      return d
    } catch { setDetail(null); return null }
  }, [])

  const filterTabs = [
    { label: '所有邮件', value: 'ALL' },
    { label: '未读', value: 'UNSEEN' },
    { label: '有附件', value: 'HASATTACH' },
    { label: '已标星', value: 'STARRED' },
  ]

  const handleSelect = useCallback(async (id: number) => {
    setSelectedId(id)
    const d = await loadDetail(id)
    if (d) {
      const email = emails.find(e => e.id === id)
      if (email && !email.is_read) {
        api.mails.markRead(id).catch(() => {})
      }
      // 同步更新本地列表的 is_read 状态
      setEmails(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e))
    }
  }, [loadDetail, emails])

  const resetDetail = () => {
    setSelectedId(null)
    setDetail(null)
    setReplyText('')
  }

  const handleMove = async (folder: string) => {
    if (!selectedId) return
    await api.mails.move(selectedId, folder).catch(() => {})
    setFolderMoveOpen(false)
    resetDetail()
    setRefresh(n => n + 1)
  }

  const handleMarkRead = async () => {
    if (!selectedId) return
    await api.mails.markRead(selectedId).catch(() => {})
    resetDetail()
    setRefresh(n => n + 1)
  }

  const handleReply = async () => {
    if (!detail || !replyText.trim()) return
    try {
      await api.compose({
        account_id: detail.email.account_id,
        to: detail.email.from,
        cc: '',
        bcc: '',
        subject: 'Re: ' + (detail.email.subject || ''),
        body_text: replyText,
        body_html: '',
      })
      setReplyText('')
    } catch { }
  }

  const handleArchive = async () => {
    if (!selectedId) return
    await api.mails.move(selectedId, 'Archive').catch(() => {})
    resetDetail()
    setRefresh(n => n + 1)
  }

  const handleDeleteRequest = () => {
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    await api.mails.delete(selectedId).catch(() => {})
    resetDetail()
    setRefresh(n => n + 1)
  }

  const handleRefresh = () => {
    api.sync.all().catch(() => {})
    setRefresh(n => n + 1)
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

  const sortedEmails = useMemo(() => [...emails].sort((a, b) => {
    let cmp = 0
    if (sortMode === 'name') {
      const nameA = (a.from_name || a.from || '').toLowerCase()
      const nameB = (b.from_name || b.from || '').toLowerCase()
      cmp = nameA.localeCompare(nameB)
    } else if (sortMode === 'subject') {
      const subA = (a.subject || '').toLowerCase()
      const subB = (b.subject || '').toLowerCase()
      cmp = subA.localeCompare(subB)
    } else {
      cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
    }
    return sortAsc ? cmp : -cmp
  }), [emails, sortAsc, sortMode])

  return (
    <AppShell>
      <div className="flex h-full">
        {/* Email list */}
        <div className="w-[420px] border-r shrink-0 flex flex-col" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
          {/* Toolbar */}
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold" style={{ color: 'var(--foreground)' }}>
                  {filterTabs.find(t => t.value === folder)?.label || '收件箱'}
                </span>
                <div className="flex items-center gap-1 h-7 px-2 rounded-[6px]" style={{ backgroundColor: 'var(--muted)', padding: '4px 8px' }}>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--foreground-secondary)' }}>全部账号</span>
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--foreground-secondary)' }} />
                </div>
              </div>
               <div className="flex items-center gap-2">
<Tooltip text="刷新">
                   <button onClick={handleRefresh} className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}>
                     <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--foreground-secondary)' }} />
                   </button>
                   </Tooltip>

               </div>
            </div>
            <form onSubmit={e => e.preventDefault()} className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
               <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                 className="w-full h-10 pl-9 pr-4 rounded-[8px] outline-none text-sm placeholder:text-[var(--muted-foreground)]"
                 style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
                 placeholder="搜索邮件..." />
            </form>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-4 py-2.5 border-b items-center" style={{ borderColor: 'var(--card-border)' }}>
            {filterTabs.map((t) => (
              <button key={t.value} onClick={() => { setFolder(t.value); setSearchQ('') }}
                className={`px-3 h-7 rounded-[6px] text-xs whitespace-nowrap transition-colors ${folder === t.value ? 'font-medium' : ''}`}
                style={{
                  backgroundColor: folder === t.value ? 'var(--muted)' : 'transparent',
                  color: folder === t.value ? 'var(--foreground-secondary)' : 'var(--foreground-tertiary)',
                }}
              >{t.label}</button>
            ))}
            {/* 排序下拉 */}
            <div ref={sortRef} className="ml-auto relative">
              <button onClick={() => setSortOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 h-7 rounded-[6px] text-xs transition-colors"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)' }}
              >
                <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">排序：{sortMode === 'date' ? '日期' : sortMode === 'name' ? '名称' : '主题'}</span>
                <span className="text-[10px]">{sortAsc ? '↑' : '↓'}</span>
                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${sortOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--foreground-tertiary)' }} />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-[160px] rounded-[10px] py-1 shadow-lg"
                    style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)' }}>
                    {([
                      { value: 'date', label: '按日期', icon: Calendar },
                      { value: 'name', label: '按名称', icon: User },
                      { value: 'subject', label: '按主题', icon: FileText },
                    ] as const).map(opt => {
                      const Icon = opt.icon
                      const active = sortMode === opt.value
                      return (
                        <button key={opt.value}
                          onClick={() => { setSortMode(opt.value); setSortOpen(false) }}
                          className="w-full px-3 py-2 flex items-center gap-2 text-[13px] transition-colors hover:bg-[var(--muted)]"
                          style={{ color: active ? 'var(--primary)' : 'var(--foreground)' }}
                        >
                          <Icon className="w-4 h-4 shrink-0" style={{ color: active ? 'var(--primary)' : 'var(--foreground-tertiary)' }} />
                          <span className="flex-1 text-left">{opt.label}</span>
                          {active && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />}
                        </button>
                      )
                    })}
                    <div className="h-px my-1" style={{ backgroundColor: 'var(--card-border)' }} />
                    <button onClick={() => { setSortAsc(a => !a); setSortOpen(false) }}
                      className="w-full px-3 py-2 flex items-center gap-2 text-[13px] transition-colors hover:bg-[var(--muted)]"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <span className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: 'var(--foreground-tertiary)' }}>
                        {sortAsc ? '↑' : '↓'}
                      </span>
                      <span className="flex-1 text-left">{sortAsc ? '升序' : '降序'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Email list */}
          <div ref={listRef} className="flex-1 overflow-auto">
            {loading && emails.length === 0 ? (
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
              sortedEmails.map((email) => (
                <div key={email.id} className={`border-b transition-colors ${selectedId === email.id ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]'}`} style={{ borderColor: 'var(--card-border)' }}>
                  <MailItem email={email} brand={(email as any).account_brand} selected={selectedId === email.id} onSelect={handleSelect} />
                </div>
              ))
            )}
            {loadingMore && (
              <div className="flex items-center justify-center py-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>加载更多...</div>
            )}
            {!hasMore && emails.length > 0 && (
              <div className="flex items-center justify-center py-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>已加载全部邮件</div>
            )}
          </div>
        </div>

        {/* Email detail */}
        <div className="flex-1 bg-[var(--background)] overflow-auto">
          {detail ? (
            <div className="max-w-[780px] mx-auto px-8 py-6 space-y-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
<div className="flex items-center gap-1">
                   <Tooltip text="归档"><button onClick={handleArchive} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Archive className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   <Tooltip text="删除"><button onClick={handleDeleteRequest} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Trash2 className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   <Tooltip text="标记已读"><button onClick={() => { setSelectedId(null); setDetail(null); }} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><MailCheck className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   <Tooltip text="稍后处理"><button onClick={() => handleMove('DEFERRED')} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Clock className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   </div>
                   <div className="w-px h-6 bg-[var(--card-border)]" />
                   <div className="flex items-center gap-1 relative">
                   <Tooltip text="移动到"><button onClick={() => setFolderMoveOpen(o => !o)} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><FolderMove className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   <Tooltip text={detail.email.is_read ? '标记未读' : '标记已读'}><button onClick={handleMarkRead} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Tags className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                  {folderMoveOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setFolderMoveOpen(false)} />
                      <div className="absolute left-0 top-full z-50 mt-1 rounded-[10px] py-1 shadow-lg"
                        style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', minWidth: 140 }}>
                        {[
                          { value: 'Archive', label: '归档' },
                          { value: 'DEFERRED', label: '稍后处理' },
                          { value: 'Drafts', label: '草稿箱' },
                          { value: 'INBOX', label: '收件箱' },
                        ].map(f => (
                          <button key={f.value} onClick={() => handleMove(f.value)}
                            className="w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--muted)]"
                            style={{ color: 'var(--foreground)' }}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    第 {selectedId ? (emails.findIndex(e => e.id === selectedId) + 1) : 0} 封，共 {emails.length} 封
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={handlePrev} className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><ChevronUp className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button>
                    <button onClick={handleNext} className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><ChevronDown className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-[22px] leading-snug font-bold" style={{ color: 'var(--foreground)' }}>{detail.email.subject || '(无主题)'}</h1>
                <div className="flex items-center gap-2 shrink-0 pt-1">
                   {detail.email.is_starred && <Star className="w-5 h-5" style={{ color: 'var(--gold)' }} />}
                </div>
              </div>

              {/* From info */}
              <div className="flex items-start gap-4 p-4 rounded-[12px]" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
                  style={{ backgroundColor: getAccountAvatarBg(detail.email as any) }}
                >
                  {(() => {
                    const name = (detail.email.from_name || detail.email.from).trim()
                    if (!name) return '?'
                    const parts = name.replace(/@.*$/, '').replace(/[._-]/g, ' ').trim().split(/\s+/).filter(Boolean)
                    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
                    return parts[0]?.[0]?.toUpperCase() || '?'
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[15px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{detail.email.from_name || detail.email.from}</span>
                      <span className="text-[13px] hidden md:inline" style={{ color: 'var(--foreground-tertiary)' }}>&lt;{detail.email.from}&gt;</span>
                    </div>
                    <div className="text-xs shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                      {(() => {
                        const d = new Date(detail.email.date)
                        const pad = (n: number) => String(n).padStart(2, '0')
                        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
                      })()}
                    </div>
                  </div>
                  <div className="text-[13px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>收件人: {detail.email.to || '我'}</div>
                </div>
              </div>

              {/* Body */}
              <div
                className="text-[15px] leading-7"
                style={{ color: 'var(--foreground)' }}
                dangerouslySetInnerHTML={{ __html: detail.body_html || `<p>${detail.email.body_preview || '(无正文内容)'}</p>` }}
              />

              {/* Attachments */}
              {detail.attachments && detail.attachments.length > 0 && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background)', border: '0.7px solid var(--border)' }}>
                  <div className="text-[14px] font-semibold mb-3" style={{ color: 'var(--foreground)' }}>附件（{detail.attachments.length}个）</div>
                  <div className="flex flex-wrap gap-2">
                    {detail.attachments.map((att, i) => (
                      <a key={att.id} href={api.mails.attachmentUrl(detail.email.id, att.id)} download={att.filename}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-opacity hover:opacity-70"
                        style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--border)' }}>
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: i % 2 === 0 ? 'var(--danger-bg)' : 'var(--success-bg)' }}>
                          <Paperclip className="w-4 h-4" style={{ color: i % 2 === 0 ? 'var(--danger)' : 'var(--success)' }} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium max-w-[160px] truncate" style={{ color: 'var(--foreground)' }}>{att.filename}</span>
                          <span className="block text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                            {(att.size / 1024).toFixed(0)} KB
                          </span>
                        </span>
                        <Download className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick reply */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)' }}>
                <div className="text-[14px] font-semibold mb-3" style={{ color: 'var(--foreground)' }}>快捷回复</div>
                <textarea
                  placeholder="输入回复内容..."
                  rows={3}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  className="w-full outline-none text-[14px] bg-transparent resize-none placeholder:text-[var(--muted-foreground)]"
                  style={{ color: 'var(--foreground)' }}
                />
                <div className="flex items-center justify-between mt-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
<div className="flex items-center gap-1">
                      {[Bold, Italic, Underline].map((Icon, i) => (
                        <Tooltip key={i} text={['加粗', '斜体', '下划线'][i]}>
                        <button className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[var(--muted)]">
                          <Icon className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} />
                        </button>
                        </Tooltip>
                      ))}
                    </div>
                    <Tooltip text="发送">
                    <button onClick={handleReply} disabled={!replyText.trim()}
                      className="flex items-center gap-2 px-4 h-9 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                      <Send className="w-4 h-4" /> 发送
                    </button>
                    </Tooltip>
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

export default function MailPage() {
  return <Suspense><MailPageInner /></Suspense>
}

export const dynamic = 'force-dynamic'
