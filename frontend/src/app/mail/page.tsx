'use client'
import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MailItem } from '@/components/mail/MailItem'
import { useSSE, useDebounce } from '@/hooks/useSSE'
import { useSettings } from '@/hooks/useSettings'
import { useIsMobile } from '@/hooks/useIsMobile'
import { api } from '@/lib/api'
import { Archive, Trash2, Star, ChevronUp, ChevronDown, Reply, Forward, Paperclip, Send, Clock, MailCheck, Search, Tags, FolderMove, Mail, RefreshCw, Download, Check, User, AlertTriangle } from '@/lib/icons'
import { getAccountAvatarBg } from '@/lib/icons'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Email, EmailDetail } from '@/types'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Skeleton } from '@/components/Skeleton'
import { sanitizeHTML } from '@/lib/sanitize'
import { Tooltip } from '@/components/Tooltip'
import { RichTextEditor, RichTextEditorHandle } from '@/components/editor/RichTextEditor'
import { toast } from 'sonner'

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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
  const listCache = useRef<Record<string, Email[]>>({})
  const reqId = useRef(0)
  const prevListKeyRef = useRef('')
  const [firstLoad, setFirstLoad] = useState(true)
  const [storeEmpty, setStoreEmpty] = useState<boolean | null>(null)
  const storeEmptyRef = useRef<boolean | null>(null)
  const scrollHandlerRef = useRef<() => void>(() => {})
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const replyEditorRef = useRef<RichTextEditorHandle>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const detailCache = useRef<Map<number, EmailDetail>>(new Map())
  const { settings } = useSettings()
  const mailDensity: 'comfortable' | 'compact' = (settings.mail_density as 'comfortable' | 'compact') || 'comfortable'
  const listWidth = settings.layout_density === 'two' ? 'md:w-[280px] lg:w-[340px]' : 'md:w-[320px] lg:w-[420px]'

  const isMobile = useIsMobile()

  const selectAllChecked = useMemo(() => emails.length > 0 && selectedIds.size > 0 && [...emails].every(e => selectedIds.has(e.id)), [emails, selectedIds])
  const handleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedIds(new Set())
    } else {
      const allIds = new Set(emails.map(e => e.id))
      setSelectedIds(allIds)
    }
  }

  // 搜索态下“全选”只能作用于已加载的搜索结果（后端无 all_in_search 语义）
  const searching = Boolean(debouncedSearch && debouncedSearch.trim())
  const bulkTarget = () => selectAllChecked
    ? (searching
      ? { allInFolder: false, ids: emails.map(e => e.id) as number[] | undefined, folder: undefined as string | undefined, count: emails.length }
      : { allInFolder: true, ids: undefined as number[] | undefined, folder: folder === 'ALL' ? '' : folder, count: totalCount })
    : { allInFolder: false, ids: Array.from(selectedIds) as number[] | undefined, folder: undefined as string | undefined, count: selectedIds.size }

  useSSE(() => {
    setRefresh(n => n + 1)
    refreshCounts()
  }, () => {
    setRefresh(n => n + 1)
    refreshCounts()
  })

  const loadAccounts = useCallback(async () => {
    try {
      const accs = await api.accounts.list()
      const empty = !accs || accs.length === 0
      storeEmptyRef.current = empty
      setStoreEmpty(empty)
    } catch {
      // 账号列表查不到就按「有账号」处理，把错误交给列表请求自己去提示，
      // 否则 storeEmpty 停在 unknown，列表永远不加载也永远不报错
      storeEmptyRef.current = false
      setStoreEmpty(false)
    }
  }, [])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const resetList = useCallback(() => {
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
      setFirstLoad(false)
      if (!append) listCache.current[`${folder}:${debouncedSearch}`] = items
      setOffset(off)
      setHasMore(more)
    } catch {
      if (id !== reqId.current) return
      if (!append) {
        setEmails([])
        setTotalCount(0)
        // 仅在「确认空库」时静默：未知(null)或确认有账号都应当如实报错
        if (storeEmptyRef.current !== true) {
          toast.error('邮件列表加载失败，请检查网络或后端服务')
        }
      }
      setHasMore(false)
    } finally {
      if (id === reqId.current) { setLoading(false); setLoadingMore(false) }
    }
  }, [folder, debouncedSearch])

  const listKey = `${folder}:${debouncedSearch}`

  useEffect(() => {
    // 账号状态未知时先不动作：空库不必白发一次列表请求，有账号也避免先闪骨架再被清空
    if (storeEmpty === null) return
    if (storeEmpty) {
      if (searchParams?.get('id')) router.replace(`/mail?folder=${encodeURIComponent(folder)}`)
      setEmails([])
      setTotalCount(0)
      setHasMore(false)
      setLoading(false)
      setLoadingMore(false)
      return
    }
    const keyChanged = prevListKeyRef.current !== listKey
    prevListKeyRef.current = listKey
    if (keyChanged) {
      const cached = listCache.current[listKey]
      resetList()
      if (cached) setEmails(cached)
    }
    fetchPage(0, false)
  }, [listKey, refresh, fetchPage, resetList, storeEmpty, searchParams, router])

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
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        router.push('/compose')
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape') {
        setFolderMoveOpen(false)
        setDeleteOpen(false)
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [router])

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
    const cached = detailCache.current.get(id)
    if (cached) { setDetail(cached); return cached }
    try {
      const d = await api.mails.get(id)
      if (d) detailCache.current.set(id, d)
      setDetail(d)
      return d
    } catch { setDetail(null); toast.error('邮件加载失败，请重试'); return null }
  }, [])

  const filterTabs = [
    { label: '所有邮件', value: 'ALL' },
    { label: '已标星', value: 'STARRED' },
  ]

  const folderLabelMap: Record<string, string> = {
    INBOX: '收件箱', Sent: '已发送', Drafts: '草稿箱', Trash: '已删除', SPAM: '垃圾邮件', STARRED: '标星邮件', DEFERRED: '稍后处理', Archive: '归档',
  }

  const handleSelect = useCallback(async (id: number) => {
    if (selectedIds.size > 1 && !selectedIds.has(id)) {
      setSelectedIds(new Set([id]))
    }
    // 草稿箱：点击邮件进入编辑模式
    if (folder === 'Drafts') {
      let draft: Awaited<ReturnType<typeof api.mails.getDraft>>
      try {
        draft = await api.mails.getDraft(id)
      } catch (e: any) {
        toast.error(e?.message || '读取草稿失败')
        return
      }
      if (draft) {
        router.push(`/compose?draft_id=${id}&to=${encodeURIComponent(draft.to)}&cc=${encodeURIComponent(draft.cc)}&subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body_html || draft.body_text)}&account_id=${draft.account_id}${draft.message_id ? '&message_id=' + encodeURIComponent(draft.message_id) : ''}`)
        return
      }
    }
    setSelectedId(id)
    if (isMobile) setMobileView('detail')
    const d = await loadDetail(id)
    if (d) {
      const email = emails.find(e => e.id === id)
      if (email && !email.is_read) {
        api.mails.markRead(id).catch(() => {})
      }
      // 同步更新本地列表的 is_read 状态
      setEmails(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e))
    }
  }, [loadDetail, emails, selectedIds, folder, router])

  const resetDetail = () => {
    setSelectedId(null)
    setDetail(null)
    setReplyText('')
    setMobileView('list')
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
    if (!selectedId && selectedIds.size === 0) return
    try {
      if (selectedIds.size > 1 || selectAllChecked) {
        const bt = bulkTarget()
        await api.mails.bulk({
          action: 'move',
          all_in_folder: bt.allInFolder,
          folder: bt.folder,
          ids: bt.ids,
          destination_folder: folder
        })
        const count = bt.count
        toast.success(`已移动 ${count} 封邮件`)
        if (selectAllChecked) {
          setRefresh(n => n + 1)
        } else {
          setEmails(prev => prev.filter(e => !selectedIds.has(e.id)))
          setTotalCount(prev => Math.max(0, prev - count))
        }
      } else {
        await api.mails.move(selectedId!, folder)
        toast.success('邮件已移动')
        detailCache.current.delete(selectedId!)
      }
    } catch {
      toast.error('移动失败，请重试')
      return
    }
    setFolderMoveOpen(false)
    resetDetail()
    setSelectedIds(new Set())
    setRefresh(n => n + 1)
    refreshCounts()
  }

  const handleMarkRead = async () => {
    if (!selectedId && selectedIds.size === 0) return
    try {
      if (selectedIds.size > 1 || selectAllChecked) {
        // When detail is null (bulk select without opening), check first selected email
        const targetEmail = detail?.email || emails.find(e => selectedIds.has(e.id))
        const isRead = targetEmail?.is_read ?? false
        const bt = bulkTarget()
        await api.mails.bulk({
          action: isRead ? 'mark_unread' : 'mark_read',
          all_in_folder: bt.allInFolder,
          folder: bt.folder,
          ids: bt.ids
        })
        const count = bt.count
        toast.success(`已标记 ${count} 封邮件为${isRead ? '未读' : '已读'}`)
        if (selectAllChecked) {
          setRefresh(n => n + 1)
        } else {
          setEmails(prev => prev.map(e => selectedIds.has(e.id) ? { ...e, is_read: !isRead } : e))
        }
      } else {
        // 单封切换读/未读：后端无单封 unread 端点，走 bulk(ids)
        const isRead = detail?.email.is_read ?? false
        await api.mails.bulk({ action: isRead ? 'mark_unread' : 'mark_read', ids: [selectedId!] })
        toast.success(isRead ? '已标记为未读' : '已标记为已读')
        setEmails(prev => prev.map(e => e.id === selectedId ? { ...e, is_read: !isRead } : e))
      }
    } catch {
      toast.error('操作失败，请重试')
      return
    }
    resetDetail()
    setSelectedIds(new Set())
    setRefresh(n => n + 1)
  }

  const handleBulk = async (action: string) => {
    try {
      const bt = bulkTarget()
      await api.mails.bulk({
        action,
        all_in_folder: bt.allInFolder,
        folder: bt.folder,
        ids: bt.ids
      })
      const count = bt.count
      if (action === 'mark_read' || action === 'mark_unread') {
        const newRead = action === 'mark_read'
        setEmails(prev => prev.map(e => bt.ids?.includes(e.id) ? { ...e, is_read: newRead } : e))
      }
      toast.success(`已处理 ${count} 封邮件`)
      setSelectedIds(new Set())
      setSelectedId(null)
      setDetail(null)
      setRefresh(n => n + 1)
      refreshCounts()
    } catch {
      toast.error('操作失败，请重试')
    }
  }

  const handleReply = async () => {
    if (!detail) return
    const to = detail.email.from
    const subject = 'Re: ' + (detail.email.subject || '')
    const body = replyEditorRef.current?.getHTML() || replyText.trim()
    const messageId = detail.email.message_id || ''
    router.push(`/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&account_id=${detail.email.account_id}${messageId ? '&message_id=' + encodeURIComponent(messageId) : ''}`)
  }

  const handleReplyAll = async () => {
    if (!detail) return
    const to = detail.email.from
    const cc = detail.email.to && detail.email.to !== detail.email.from ? detail.email.to : ''
    const subject = 'Re: ' + (detail.email.subject || '')
    const body = replyEditorRef.current?.getHTML() || replyText.trim()
    const messageId = detail.email.message_id || ''
    router.push(`/compose?to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&account_id=${detail.email.account_id}${messageId ? '&message_id=' + encodeURIComponent(messageId) : ''}`)
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
      if (targets.length === 0) {
        toast.info('当前文件夹邮件已全部读')
        return
      }
      await api.mails.bulk({
        action: 'mark_read',
        all_in_folder: !searching,
        folder: !searching ? (folder === 'ALL' ? '' : folder) : undefined,
        ids: searching ? targets.map(e => e.id) : undefined
      })
    } catch {
      toast.error('操作失败，请重试')
      return
    }
    toast.success(`已将 ${targets.length} 封邮件标记为已读`)
    setEmails(prev => prev.map(e => ({ ...e, is_read: true })))
    setDetail(prev => prev ? { ...prev, email: { ...prev.email, is_read: true } } : prev)
    setRefresh(n => n + 1)
  }

  const handleDeleteRequest = () => {
    setDeleteOpen(true)
  }

  const refreshCounts = useCallback(() => {
    api.mails.counts().catch(() => {})
  }, [])

  useEffect(() => {
    const handler = () => {
      setRefresh(n => n + 1)
      refreshCounts()
    }
    window.addEventListener('lzmail:refresh-mail', handler)
    return () => window.removeEventListener('lzmail:refresh-mail', handler)
  }, [refreshCounts])

  useEffect(() => {
    // 空库（无账号）时不重载列表，只轻量复查账号，避免定时刷新造成无谓重渲染
    const timer = setInterval(() => {
      if (storeEmptyRef.current === true) { loadAccounts(); return }
      setRefresh(n => n + 1)
      refreshCounts()
    }, 30 * 60 * 1000)
    return () => clearInterval(timer)
  }, [loadAccounts, refreshCounts])

  const handleDelete = async () => {
    if (!selectedId && selectedIds.size === 0) return
    try {
      if (selectedIds.size > 1 || selectAllChecked) {
        const bt = bulkTarget()
        await api.mails.bulk({
          action: 'delete',
          all_in_folder: bt.allInFolder,
          folder: bt.folder,
          ids: bt.ids
        })
        const count = bt.count
        toast.success(`已删除 ${count} 封邮件`)
        if (selectAllChecked) {
          setRefresh(n => n + 1)
        } else {
          setEmails(prev => prev.filter(e => !selectedIds.has(e.id)))
          setTotalCount(prev => Math.max(0, prev - count))
        }
        setSelectedIds(new Set())
      } else {
        await api.mails.delete(selectedId!)
        toast.success('邮件已删除')
        setEmails(prev => prev.filter(e => e.id !== selectedId))
        setTotalCount(prev => Math.max(0, prev - 1))
        detailCache.current.delete(selectedId!)
      }
    } catch {
      toast.error('删除失败，请重试')
      return
    }
    resetDetail()
    setSelectedIds(new Set())
    setRefresh(n => n + 1)
    refreshCounts()
    if (selectedId !== null) detailCache.current.delete(selectedId)
  }

  const handleRefresh = async () => {
    if (syncing || storeEmpty === true) return
    setSyncing(true)
    let synced = false
    try {
      await api.sync.all()
      synced = true
    } catch (e: any) {
      toast.error(e?.message || '同步失败，请重试')
    }
    await loadAccounts()
    setSyncing(false)
    setRefresh(n => n + 1)
    refreshCounts()
    if (synced) toast.success('已同步最新邮件')
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

  // Mobile more-actions dropdown
  const [moreOpen, setMoreOpen] = useState(false)
  const MoreActionsDropdown = useCallback(() => {
    if (!detail) return null
    return (
      <div className="relative">
        <button onClick={() => setMoreOpen(v => !v)} className="w-9 h-9 flex items-center justify-center rounded-[8px] hover:bg-[var(--muted)] transition-colors" style={{ backgroundColor: 'var(--muted)' }}>
          <i className="ri-more-2-line w-5 h-5" style={{ color: 'var(--foreground-secondary)' }}></i>
        </button>
        {moreOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 rounded-[10px] py-1 shadow-lg w-40" style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)' }}>
              <button onClick={() => { setMoreOpen(false); handleDeleteRequest() }} className="w-full px-3 py-2.5 text-left text-[13px] hover:bg-[var(--muted)] flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <i className="ri-delete-bin-line w-4 h-4"></i> 删除
              </button>
              <button onClick={() => { setMoreOpen(false); handleReplyAll() }} className="w-full px-3 py-2.5 text-left text-[13px] hover:bg-[var(--muted)] flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <i className="ri-reply-line w-4 h-4"></i> 回复全部
              </button>
              <button onClick={() => { setMoreOpen(false); handleMarkAllRead() }} className="w-full px-3 py-2.5 text-left text-[13px] hover:bg-[var(--muted)] flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <i className="ri-mail-check-line w-4 h-4"></i> 全部已读
              </button>
              <button onClick={() => {
                setMoreOpen(false)
                if (!selectedId) return
                const newStarred = !detail.email.is_starred
                setDetail(prev => prev ? { ...prev, email: { ...prev.email, is_starred: newStarred } } : prev)
                setEmails(prev => prev.map(e => e.id === selectedId ? { ...e, is_starred: newStarred } : e))
                api.mails.markStar(selectedId, newStarred).then(() => {
                  refreshCounts()
                }).catch(() => {
                  setDetail(prev => prev ? { ...prev, email: { ...prev.email, is_starred: !newStarred } } : prev)
                  setEmails(prev => prev.map(e => e.id === selectedId ? { ...e, is_starred: !newStarred } : e))
                  toast.error('标星失败，请重试')
                })
              }} className="w-full px-3 py-2.5 text-left text-[13px] hover:bg-[var(--muted)] flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <i className={`ri-star${detail.email.is_starred ? '-fill' : '-line'} w-4 h-4`} style={{ color: detail.email.is_starred ? 'var(--gold)' : 'var(--foreground-secondary)' }}></i>
                {detail.email.is_starred ? '取消标星' : '标星'}
              </button>
              <button onClick={() => { setMoreOpen(false); setFolderMoveOpen(v => !v) }} className="w-full px-3 py-2.5 text-left text-[13px] hover:bg-[var(--muted)] flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <i className="ri-folder-transfer-line w-4 h-4"></i> 移动到
              </button>
            </div>
          </>
        )}
      </div>
    )
  }, [moreOpen, detail, selectedId, handleDeleteRequest, handleReplyAll, handleMarkAllRead, refreshCounts])

  return (
    <AppShell>
      <div className="flex h-full relative">
        {/* Email list */}
        <div className={`${mobileView === 'detail' ? 'hidden md:flex' : 'flex'} w-full ${listWidth} border-r shrink-0 flex flex-col`} style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
          {/* Mobile top bar when in detail view */}
          {mobileView === 'detail' && (
            <div className="flex items-center h-12 px-4 shrink-0 md:hidden border-b" style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--card-border)' }}>
              <button onClick={() => setMobileView('list')} className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--primary)' }}>
                <i className="ri-arrow-left-s-line w-5 h-5"></i> 返回
              </button>
              <span className="flex-1 text-center text-sm font-semibold truncate px-4" style={{ color: 'var(--foreground)' }}>
                {filterTabs.find(t => t.value === folder)?.label || folderLabelMap[folder] || '收件箱'}
              </span>
              <div className="w-16" />
            </div>
          )}

          {/* Toolbar */}
          <div className={`${isMobile ? 'px-4 py-3' : 'px-5 py-4'} border-b`} style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold" style={{ color: 'var(--foreground)' }}>
                  {filterTabs.find(t => t.value === folder)?.label || folderLabelMap[folder] || '收件箱'}
                </span>
                <span className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>共 {totalCount || emails.length} 封</span>
              </div>
               <div className="flex items-center gap-2">
<Tooltip text="刷新" side="bottom">
                  <button onClick={handleRefresh} disabled={storeEmpty === true} className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-all duration-200 hover:opacity-80 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--muted)', opacity: storeEmpty ? 0.35 : 1 }}>
                    <RefreshCw className={`w-4 h-4 ${(firstLoad && loading) || syncing ? 'animate-spin' : ''}`} style={{ color: 'var(--foreground-secondary)', opacity: storeEmpty ? 0.5 : 1, animationDuration: '0.8s' }} />
                  </button>
</Tooltip>
               </div>
            </div>
               <form onSubmit={e => e.preventDefault()} className="flex items-center gap-2 mt-3">
                  {emails.length > 0 && (
                    <div className="shrink-0 mt-0.5 cursor-pointer" onClick={handleSelectAll} title={selectAllChecked ? '取消全选' : (searching ? '全选当前页搜索结果' : '全选当前文件夹邮件')}>
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
                    <input ref={searchInputRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
                      className="w-full h-10 pl-9 pr-8 rounded-[8px] outline-none text-sm placeholder:text-[var(--muted-foreground)]"
                      style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
                      placeholder="搜索邮件..." />
                    {searchQ && (
                      <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)' }}>
                        <i className="ri-close-line w-3 h-3"></i>
                      </button>
                    )}
                 </div>
               </form>
          </div>

          {/* Email list */}
          <div ref={listRef} className="flex-1 overflow-auto">
            {firstLoad && loading ? (
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
                        <MailItem email={email} brand={email.account_brand} folder={folder} selected={selectedId === email.id} checked={selectedIds.has(email.id)} onSelect={handleSelect} onToggle={toggleSelect}                         onStar={async (id, starred) => {
                          const prev = !starred
                          setEmails(ems => ems.map(e => e.id === id ? { ...e, is_starred: starred } : e))
                          try {
                            await api.mails.markStar(id, starred)
                            refreshCounts()
                          } catch {
                            setEmails(ems => ems.map(e => e.id === id ? { ...e, is_starred: prev } : e))
                            toast.error('标星失败，请重试')
                          }
                        }} density={mailDensity} isMobile={isMobile && mobileView !== 'detail'} />
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

          {/* Bulk action toolbar - shows when emails are selected */}
          {selectedIds.size > 0 && (
            <div className="px-5 py-3 border-t flex items-center gap-3" style={{ borderColor: 'var(--card-border)' }}>
              <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                已选择 {selectAllChecked ? `全部 ${totalCount} 封` : `${selectedIds.size} 封`}
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <Tooltip text="标记已读"><button onClick={() => handleBulk('mark_read')} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[var(--muted)] transition-colors"><MailCheck className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                <Tooltip text="标记未读"><button onClick={() => handleBulk('mark_unread')} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[var(--muted)] transition-colors"><Mail className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                <Tooltip text="移动到"><button onClick={() => setFolderMoveOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[var(--muted)] transition-colors"><FolderMove className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                <Tooltip text="删除"><button onClick={handleDeleteRequest} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[var(--muted)] transition-colors"><Trash2 className="w-4 h-4" style={{ color: 'var(--danger)' }} /></button></Tooltip>
              </div>
            </div>
          )}
        </div>

        {/* Email detail */}
        <div className={`${mobileView === 'detail' ? 'fixed inset-0 z-30 bg-[var(--background)] overflow-auto md:static md:inset-auto md:z-auto md:flex-1' : 'hidden md:flex-1'}`}>
          {detail ? (
            <div className="max-w-[780px] mx-auto px-4 py-4 md:px-8 md:py-6 space-y-6 pb-24 md:pb-6">
              {/* Mobile top action bar */}
              <div className="flex items-center justify-between px-0 py-3 border-b md:hidden" style={{ borderColor: 'var(--card-border)', paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
                <button onClick={() => setMobileView('list')} className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--primary)' }}>
                  <i className="ri-arrow-left-s-line w-5 h-5"></i> 返回
                </button>
                <span className="text-sm font-semibold truncate flex-1 px-2" style={{ color: 'var(--foreground)' }}>
                  {detail.email.subject ? detail.email.subject.substring(0, 20) + (detail.email.subject.length > 20 ? '...' : '') : '(无主题)'}
                </span>
                <MoreActionsDropdown />
              </div>

              {/* PC/Tablet toolbar */}
              <div className="hidden md:flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
<div className="flex items-center gap-1">
                  <Tooltip text="删除"><button onClick={handleDeleteRequest} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Trash2 className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                  <Tooltip text="回复"><button onClick={handleReply} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Reply className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                  <Tooltip text="回复全部"><button onClick={handleReplyAll} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Reply className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                  <Tooltip text="转发"><button onClick={handleForward} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Forward className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   <Tooltip text="全部已读"><button onClick={handleMarkAllRead} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><MailCheck className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button></Tooltip>
                   <Tooltip text={detail.email.is_starred ? '取消标星' : '标星'}><button onClick={async () => {
                     if (!selectedId) return
                     const newStarred = !detail.email.is_starred
                     setDetail(prev => prev ? { ...prev, email: { ...prev.email, is_starred: newStarred } } : prev)
                     setEmails(prev => prev.map(e => e.id === selectedId ? { ...e, is_starred: newStarred } : e))
                     try {
                       await api.mails.markStar(selectedId, newStarred)
                       refreshCounts()
                     } catch {
                       setDetail(prev => prev ? { ...prev, email: { ...prev.email, is_starred: !newStarred } } : prev)
                       setEmails(prev => prev.map(e => e.id === selectedId ? { ...e, is_starred: !newStarred } : e))
                       toast.error('标星失败，请重试')
                     }
                   }} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}>
                     <Star className="w-[18px] h-[18px]" style={{ color: detail.email.is_starred ? 'var(--gold)' : 'var(--foreground-secondary)', fill: detail.email.is_starred ? 'var(--gold)' : 'none' }} />
                   </button></Tooltip>
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
                    <Tooltip text={detail.email.is_starred ? '取消标星' : '标星'}>
                    <button
                      onClick={async () => {
                        if (!selectedId) return
                        const newStarred = !detail.email.is_starred
                        setDetail(prev => prev ? { ...prev, email: { ...prev.email, is_starred: newStarred } } : prev)
                        setEmails(prev => prev.map(e => e.id === selectedId ? { ...e, is_starred: newStarred } : e))
                        try {
                          await api.mails.markStar(selectedId, newStarred)
                          refreshCounts()
                        } catch {
                          setDetail(prev => prev ? { ...prev, email: { ...prev.email, is_starred: !newStarred } } : prev)
                          setEmails(prev => prev.map(e => e.id === selectedId ? { ...e, is_starred: !newStarred } : e))
                          toast.error('标星失败，请重试')
                        }
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-all hover:opacity-80"
                      style={{ backgroundColor: 'var(--muted)' }}
                      aria-label={detail.email.is_starred ? '取消标星' : '标星'}
                    >
                      <Star className="w-[18px] h-[18px]" style={{ color: detail.email.is_starred ? 'var(--gold)' : 'var(--foreground-secondary)', fill: detail.email.is_starred ? 'var(--gold)' : 'none' }} />
                    </button>
                    </Tooltip>
                 </div>
              </div>

              {/* From info */}
              <div className="flex items-start gap-4 p-4 rounded-[12px]" style={{ backgroundColor: 'var(--muted)' }}>
                {detail.email.sender_avatar_url || detail.email.recipient_avatar_url ? (
                  <img src={detail.email.recipient_avatar_url && detail.email.folder === 'Sent' ? detail.email.recipient_avatar_url : detail.email.sender_avatar_url} alt="" className="w-10 h-10 rounded-full shrink-0 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: getAccountAvatarBg({ brand_color: detail.email.account_brand }) }}
                  >
                    <User className="w-[60%] h-[60%] text-white" style={{ margin: 'auto', display: 'block' }} />
                  </div>
                )}
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

              {/* Reload body button */}
              {detail.email.body_preview && !detail.body_html && (
                <div className="p-4 text-center" style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning)' }}>
                  <button onClick={async () => {
                    try {
                      const res = await api.mails.reextractBody(detail.email.id);
                      if (res?.body_html) setDetail(prev => prev ? { ...prev, body_html: res.body_html } : prev);
                      else toast.error('未解析到正文内容')
                    } catch {
                      toast.error('正文重新加载失败，请重试')
                    }
                  }} className="text-sm px-4 py-2 rounded bg-[var(--warning)] text-[var(--warning-foreground)]">
                    重新加载正文
                  </button>
                </div>
              )}

              {/* Attachments */}
              {detail.attachments && detail.attachments.length > 0 && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--background)', border: '0.7px solid var(--border)' }}>
                  <div className="text-[14px] font-semibold mb-3" style={{ color: 'var(--foreground)' }}>附件（{detail.attachments.length}个）</div>
                  <div className="flex flex-wrap gap-2">
                    {detail.attachments.map((att, i) => (
                      <button key={att.id} onClick={async () => {
                        try {
                          const resp = await fetch(api.mails.attachmentUrl(detail.email.id, att.id))
                          if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
                          const blob = await resp.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.download = att.filename; a.click()
                          URL.revokeObjectURL(url)
                        } catch { toast.error('附件下载失败，请重试') }
                      }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-opacity hover:opacity-70"
                        style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--border)', cursor: 'pointer' }}>
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: i % 2 === 0 ? 'var(--danger-bg)' : 'var(--success-bg)' }}>
                          <Paperclip className="w-4 h-4" style={{ color: i % 2 === 0 ? 'var(--danger)' : 'var(--success)' }} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium max-w-[160px] truncate" style={{ color: 'var(--foreground)' }}>{att.filename}</span>
                          {att.size > 10 * 1024 * 1024 && (
                            <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] px-1 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                              <AlertTriangle className="w-3 h-3" /> 大文件
                            </span>
                          )}
                          <span className="block text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                            {(att.size / 1024).toFixed(0)} KB
                          </span>
                        </span>
                        <Download className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick reply */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)' }}>
                <div className="text-[14px] font-semibold mb-3" style={{ color: 'var(--foreground)' }}>快捷回复</div>
                <RichTextEditor ref={replyEditorRef} value={replyText} onChange={setReplyText} placeholder="输入回复内容..." className="min-h-[120px] h-[120px]" />
                <div className="flex items-center justify-between mt-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>输入内容后将自动带入邮件主题</span>
                    <Tooltip text="发送">
                    <button onClick={handleReply} disabled={!replyText.trim() && !replyEditorRef.current?.getText().trim()}
                      className="flex items-center gap-2 px-4 h-9 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                      <Send className="w-4 h-4" /> 发送
                    </button>
                    </Tooltip>
                </div>
              </div>

              {/* Mobile bottom action bar */}
              <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center md:hidden" style={{ backgroundColor: 'var(--card)', borderTop: '1px solid var(--card-border)', height: 'calc(48px + env(safe-area-inset-bottom))', padding: '0 16px', paddingBottom: 'env(safe-area-inset-bottom)', boxSizing: 'border-box' }}>
                <button onClick={handleReply} className="flex-1 flex items-center justify-center gap-2 h-full rounded-lg font-medium transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                  <i className="ri-reply-line w-5 h-5"></i> 回复
                </button>
                <button onClick={handleForward} className="flex-1 flex items-center justify-center gap-2 h-full rounded-lg font-medium transition-opacity hover:opacity-80 ml-2" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)' }}>
                  <i className="ri-corner-up-right-line w-5 h-5"></i> 转发
                </button>
              </div>
            </div>
          ) : selectedIds.size > 1 ? (
            <div className="max-w-[780px] mx-auto px-8 py-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold" style={{ color: 'var(--foreground)' }}>
                  已选择 {selectedIds.size} 封邮件
                </h2>
                <button onClick={() => setSelectedIds(new Set())} className="text-sm" style={{ color: 'var(--primary)' }}>
                  清除选择
                </button>
              </div>
              {Array.from(selectedIds).slice(0, 5).map(id => {
                const email = emails.find(e => e.id === id)
                if (!email) return null
                return (
                  <div key={email.id} onClick={() => { setSelectedIds(new Set([email.id])); handleSelect(email.id) }}
                    className="p-4 rounded-xl cursor-pointer transition-colors hover:bg-[var(--muted)]"
                    style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ backgroundColor: getAccountAvatarBg({ brand_color: email.account_brand }) }}>
                        <User className="w-[60%] h-[60%] text-white" style={{ margin: 'auto', display: 'block' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate" style={{ color: 'var(--foreground)' }}>{email.from_name || email.from}</span>
                          <span className="text-xs shrink-0" style={{ color: 'var(--muted-foreground)' }}>{formatTime(email.date)}</span>
                        </div>
                        <div className="truncate mt-0.5 font-medium" style={{ color: 'var(--foreground)' }}>{email.subject || '(无主题)'}</div>
                        <div className="truncate text-sm mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>{email.body_preview}</div>
                        {email.has_attachments && (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            <Paperclip className="w-3 h-3" /> 有附件
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {selectedIds.size > 5 && (
                <div className="text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  及其他 {selectedIds.size - 5} 封邮件...
                </div>
              )}
            </div>
            ) : firstLoad && loading ? (
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
