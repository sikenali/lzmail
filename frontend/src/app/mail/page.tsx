'use client'
import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MailItem } from '@/components/mail/MailItem'
import { useSSE, useDebounce } from '@/hooks/useSSE'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import { Archive, Trash2, Star, ChevronUp, ChevronDown, Reply, Forward, Paperclip, Send, Clock, MailCheck, Search, Tags, FolderMove, Mail, RefreshCw, Download, Check } from '@/lib/icons'
import { getAccountAvatarBg } from '@/lib/icons'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Email, EmailDetail } from '@/types'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Skeleton } from '@/components/Skeleton'
import { sanitizeHTML } from '@/lib/sanitize'
import { Tooltip } from '@/components/Tooltip'
import { toast } from 'sonner'

function resolveCIDRefs(html: string, emailId: number): string {
  if (!html) return ''
  return html.replace(/(?:src|href)\s*=\s*["']\s*cid:([^"'>\s]+)["']/gi, (_, cid) => {
    const encoded = encodeURIComponent(cid)
    return `src="${api.mails.inlineImageUrl(emailId, encoded)}"`
  })
}

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
  const [syncing, setSyncing] = useState(false)
  const [sortAsc, setSortAsc] = useState(false)
  const [sortMode, setSortMode] = useState<'date' | 'name' | 'subject'>('date')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const listCache = useRef<Record<string, Email[]>>({})
  const reqId = useRef(0)
  const prevListKeyRef = useRef('')
  const scrollHandlerRef = useRef<() => void>(() => {})
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const { settings } = useSettings()
  const mailDensity: 'comfortable' | 'compact' = (settings.mail_density as 'comfortable' | 'compact') || 'comfortable'
  const showSidebar = (settings.layout_density as 'three' | 'two') !== 'two'

   const selectAllChecked = emails.length > 0 && selectedIds.size > 0 && [...emails].every(e => selectedIds.has(e.id))
  const isPartialSelected = emails.length > 0 && selectedIds.size > 0 && !selectAllChecked
  const handleSelectAll = () => {
    if (selectAllChecked || isPartialSelected) {
      setSelectedIds(new Set())
    } else {
      const allIds = new Set(emails.map(e => e.id))
      setSelectedIds(allIds)
    }
  }

  useSSE(() => {
    setRefresh(n => n + 1)
    refreshCounts()
  }, () => {
    setRefresh(n => n + 1)
    refreshCounts()
  })

  useEffect(() => {
    const timer = setInterval(() => setRefresh(n => n + 1), 30 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const resetList = useCallback(() => {
    setEmails([])
    setOffset(0)
    setHasMore(true)
    setSelectedIds(new Set())
  }, [])

  const PAGE_SIZE = 50

  const [totalCount, setTotalCount] = useState(0)

  const fetchPage = useCallback(async (off: number, append: boolean) => {
    const id = ++reqId.current
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      const isSearch = debouncedSearch && debouncedSearch.trim()
      let items: Email[] = []
      let more = false
      if (isSearch) {
        const res = await api.mails.search(debouncedSearch, undefined, PAGE_SIZE + 1, off)
        items = res?.slice(0, PAGE_SIZE) || []
        more = (res?.length || 0) > PAGE_SIZE
        if (!append) setTotalCount(items.length)
      } else {
        const res = await api.mails.listWithTotal(undefined, folder === 'ALL' ? '' : folder, PAGE_SIZE, off)
        items = res.items
        setTotalCount(res.total || 0)
        more = items.length >= PAGE_SIZE
      }
      if (id !== reqId.current) return
      setEmails(prev => append ? [...prev, ...items] : items)
      if (!append) listCache.current[`${folder}:${debouncedSearch}`] = items
      setOffset(off)
      setHasMore(more)
    } catch {
      if (id !== reqId.current) return
      if (!append) setEmails([])
      setHasMore(false)
    } finally {
      if (id === reqId.current) { setLoading(false); setLoadingMore(false) }
    }
  }, [folder, debouncedSearch])

  const listKey = `${folder}:${debouncedSearch}`

  useEffect(() => {
    const keyChanged = prevListKeyRef.current !== listKey
    prevListKeyRef.current = listKey
    if (keyChanged) {
      const cached = listCache.current[listKey]
      if (cached) {
        setEmails(cached)
        setOffset(0)
        setHasMore(true)
        return
      }
      resetList()
      fetchPage(0, false)
      return
    }
    delete listCache.current[listKey]
    fetchPage(0, false)
  }, [listKey, refresh, fetchPage, resetList])

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

  useEffect(() => {
    const detailId = searchParams?.get('id')
    if (detailId && !selectedId) {
      const id = parseInt(detailId, 10)
      if (!isNaN(id)) {
        handleSelect(id)
      }
    }
  }, [searchParams])

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

  const folderLabelMap: Record<string, string> = {
    INBOX: '收件箱', Sent: '已发送', Drafts: '草稿箱', Trash: '已删除', SPAM: '垃圾邮件', STARRED: '标星邮件', DEFERRED: '稍后处理', Archive: '归档',
  }

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
    listRef.current?.scrollTo(0, 0)
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleMove = async (folder: string) => {
    if (!selectedId) return
    try {
      await api.mails.move(selectedId, folder)
      toast.success('邮件已移动')
    } catch {
      toast.error('移动失败，请重试')
      return
    }
    setFolderMoveOpen(false)
    resetDetail()
    setRefresh(n => n + 1)
  }

  const handleMarkRead = async () => {
    if (!selectedId) return
    try {
      await api.mails.markRead(selectedId)
      toast.success(detail?.email.is_read ? '已标记为未读' : '已标记为已读')
    } catch {
      toast.error('操作失败，请重试')
      return
    }
    resetDetail()
    setRefresh(n => n + 1)
  }

  const handleReply = async () => {
    if (!detail) return
    const to = detail.email.from
    const subject = 'Re: ' + (detail.email.subject || '')
    const body = replyText.trim()
    const messageId = detail.email.message_id || ''
    router.push(`/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&account_id=${detail.email.account_id}${messageId ? '&message_id=' + encodeURIComponent(messageId) : ''}`)
  }

  const handleReplyAll = async () => {
    if (!detail) return
    const to = detail.email.from
    const cc = detail.email.to && detail.email.to !== detail.email.from ? detail.email.to : ''
    const subject = 'Re: ' + (detail.email.subject || '')
    const messageId = detail.email.message_id || ''
    router.push(`/compose?to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&account_id=${detail.email.account_id}${messageId ? '&message_id=' + encodeURIComponent(messageId) : ''}`)
  }

  const handleForward = async () => {
    if (!detail) return
    const subject = 'Fwd: ' + (detail.email.subject || '')
    const body = '\n\n---------- 转发的邮件 ----------\n发件人: ' + (detail.email.from_name || detail.email.from) + '\n日期: ' + detail.email.date + '\n主题: ' + (detail.email.subject || '') + '\n\n' + (detail.email.body_preview || '')
    router.push(`/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&account_id=${detail.email.account_id}`)
  }

  const handleMarkAllRead = async () => {
    const targets = emails.filter(e => !e.is_read)
    try {
      await Promise.all(targets.map(e => api.mails.markRead(e.id)))
    } catch {
      toast.error('操作失败，请重试')
      return
    }
    toast.success(`已将 ${targets.length} 封邮件标记为已读`)
    setEmails(prev => prev.map(e => ({ ...e, is_read: true })))
    setDetail(prev => prev ? { ...prev, email: { ...prev.email, is_read: true } } : prev)
    setRefresh(n => n + 1)
  }

  const handleArchive = async () => {
    if (!selectedId) return
    try {
      await api.mails.move(selectedId, 'Archive')
      toast.success('邮件已归档')
    } catch {
      toast.error('归档失败，请重试')
      return
    }
    resetDetail()
    setRefresh(n => n + 1)
  }

  const handleDeleteRequest = () => {
    setDeleteOpen(true)
  }

  const refreshCounts = useCallback(() => {
    api.mails.counts().catch(() => {})
  }, [])

  const handleDelete = async () => {
    if (!selectedId) return
    try {
      await api.mails.delete(selectedId)
    } catch {
      toast.error('删除失败，请重试')
      return
    }
    toast.success('邮件已删除')
    // 乐观更新：立即从列表移除，总数递减
    setEmails(prev => prev.filter(e => e.id !== selectedId))
    setTotalCount(prev => Math.max(0, prev - 1))
    resetDetail()
    setRefresh(n => n + 1)
  }

  const handleRefresh = async () => {
    setSyncing(true)
    try {
      await api.sync.all()
    } catch {}
    setSyncing(false)
    setRefresh(n => n + 1)
    refreshCounts()
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

  // 按 今天/昨天/上周/更早 分组
  const groupedEmails = useMemo(() => {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    const startOfLastWeek = new Date(startOfToday); startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
    const groups: { label: string; items: Email[] }[] = [
      { label: '今天', items: [] },
      { label: '昨天', items: [] },
      { label: '上周', items: [] },
      { label: '更早', items: [] },
    ]
    for (const email of sortedEmails) {
      const d = new Date(email.date)
      if (d >= startOfToday) groups[0].items.push(email)
      else if (d >= startOfYesterday) groups[1].items.push(email)
      else if (d >= startOfLastWeek) groups[2].items.push(email)
      else groups[3].items.push(email)
    }
    return groups.filter(g => g.items.length > 0)
  }, [sortedEmails])

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    fetchPage(offset + PAGE_SIZE, true)
  }

  return (
    <AppShell showSidebar={showSidebar}>
      <div className="flex h-full">
        {/* Email list */}
        <div className="w-[420px] border-r shrink-0 flex flex-col" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
          {/* Toolbar */}
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold" style={{ color: 'var(--foreground)' }}>
                  {filterTabs.find(t => t.value === folder)?.label || folderLabelMap[folder] || '收件箱'}
                </span>
                <span className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>共 {totalCount || emails.length} 封</span>
                <div className="flex items-center gap-1 h-7 px-2 rounded-[6px]" style={{ backgroundColor: 'var(--muted)', padding: '4px 8px' }}>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--foreground-secondary)' }}>全部账号</span>
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--foreground-secondary)' }} />
                </div>
              </div>
               <div className="flex items-center gap-2">
<Tooltip text="刷新" side="bottom">
                   <button onClick={handleRefresh} className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}>
                     <RefreshCw className={`w-4 h-4 ${loading || syncing ? 'animate-spin' : ''}`} style={{ color: 'var(--foreground-secondary)' }} />
                   </button>
                   </Tooltip>

               </div>
            </div>
               <form onSubmit={e => e.preventDefault()} className="flex items-center gap-2 mt-3">
                 {emails.length > 0 && (
                   <div className="shrink-0 mt-0.5 cursor-pointer" onClick={handleSelectAll} title={selectAllChecked ? '取消全选' : '全选当前页邮件'}>
                     {selectAllChecked ? (
                       <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
                         <Check className="w-3 h-3" style={{ color: '#fff' }} />
                       </div>
                     ) : (
                       <div className="w-5 h-5 rounded-md border-2" style={{ borderColor: 'rgba(139,115,85,0.4)' }} />
                     )}
                   </div>
                 )}
                 <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 rounded-[8px] outline-none text-sm placeholder:text-[var(--muted-foreground)]"
                    style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
                    placeholder="搜索邮件..." />
                </div>
              </form>
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
              groupedEmails.map((group) => (
                <div key={group.label}>
                  <div className="px-5 pt-3 pb-1 text-[11px] font-semibold sticky top-0 z-10" style={{ color: 'var(--foreground-tertiary)', backgroundColor: 'var(--background)' }}>
                    {group.label}（{group.items.length}）
                  </div>
                  {group.items.map((email) => (
                    <div key={email.id} className={`border-b transition-colors ${selectedId === email.id ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]'}`} style={{ borderColor: 'var(--card-border)' }}>
                        <MailItem email={email} brand={email.account_brand} folder={folder} selected={selectedId === email.id} checked={selectedIds.has(email.id)} onSelect={handleSelect} onToggle={toggleSelect} density={mailDensity} />
                     </div>
                  ))}
                </div>
              ))
            )}
            {hasMore && emails.length > 0 && !loadingMore && (
              <button onClick={loadMore}
                className="w-full flex items-center justify-center gap-2 py-3 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--primary)', backgroundColor: 'var(--card)' }}
              >
                加载更多
              </button>
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
                   <Tooltip text="删除"><button onClick={handleDeleteRequest} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Trash2 className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   <Tooltip text="回复"><button onClick={handleReply} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Reply className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   <Tooltip text="回复全部"><button onClick={handleReplyAll} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Reply className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   <Tooltip text="转发"><button onClick={handleForward} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Forward className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   <Tooltip text="全部已读"><button onClick={handleMarkAllRead} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><MailCheck className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
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
                           { value: 'INBOX', label: '收件箱' },
                           { value: 'Sent', label: '已发送' },
                           { value: 'Archive', label: '归档' },
                           { value: 'STARRED', label: '标星邮件' },
                           { value: 'Drafts', label: '草稿箱' },
                           { value: 'Trash', label: '已删除' },
                           { value: 'SPAM', label: '垃圾邮件' },
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
                    第 {selectedId ? (emails.findIndex(e => e.id === selectedId) + 1) : 0} 封，共 {totalCount || emails.length} 封
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
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: getAccountAvatarBg({ brand_color: detail.email.account_brand }) }}
                >
                  {(() => {
                    const name = (detail.email.from_name || detail.email.from).trim()
                    if (!name) return '🐱'
                    const parts = name.replace(/@.*$/, '').replace(/[._-]/g, ' ').trim().split(/\s+/).filter(Boolean)
                    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
                    return parts[0]?.[0]?.toUpperCase() || '🐱'
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
                className="text-[15px] leading-7 [&_img]:max-w-full [&_img]:h-auto"
                style={{ color: 'var(--foreground)' }}
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(resolveCIDRefs(detail.body_html, detail.email.id)) || '<p>' + (detail.email.body_preview || '(无正文内容)') + '</p>' }}
                suppressHydrationWarning
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
                    <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>输入内容后将自动带入邮件主题</span>
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
