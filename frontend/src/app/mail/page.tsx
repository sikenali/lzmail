'use client'
import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MailItem } from '@/components/mail/MailItem'
import { useSSE, useDebounce } from '@/hooks/useSSE'
import { api } from '@/lib/api'
import { Mail, RefreshCw, Filter, ChevronDown, ChevronUp, Archive, Trash2, MailCheck, Clock, Paperclip, Search, Check, Tags, FolderMove, Star, Bold, Italic, Underline, Send, Download, Calendar, ArrowLeft, ChevronRight } from '@/lib/icons'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Email, EmailDetail } from '@/types'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Skeleton } from '@/components/Skeleton'
// MOCK 假数据（上线前删除）：import { MOCK_EMAILS, MOCK_DETAIL } from '@/lib/mockMailData'
import { MOCK_EMAILS, MOCK_DETAIL } from '@/lib/mockMailData'

function MailPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [folder, setFolder] = useState(searchParams?.get('folder') || 'INBOX')
  const [searchQ, setSearchQ] = useState(searchParams?.get('q') || '')
  const debouncedSearch = useDebounce(searchQ, 300)
  const [refresh, setRefresh] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<EmailDetail | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [folderMoveOpen, setFolderMoveOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sortAsc, setSortAsc] = useState(false)
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const dateFilterRef = useRef<HTMLDivElement>(null)
  // 日历面板的月份（用于切换）
  const [calFromYear, setCalFromYear] = useState(new Date().getFullYear())
  const [calFromMonth, setCalFromMonth] = useState(new Date().getMonth())
  const [calToYear, setCalToYear] = useState(new Date().getFullYear())
  const [calToMonth, setCalToMonth] = useState(new Date().getMonth())

  useSSE(() => setRefresh(n => n + 1))

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target as Node)) {
        setDateFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const formatDate = (d: string) => {
    if (!d) return ''
    const dt = new Date(d)
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    return `${y}年${m}月${day}日`
  }

  const formatDateISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // ── 日历网格组件 ──────────────────────────────────────────────
  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
  const CalendarGrid = ({
    year, month, mode, selected, onSelect,
  }: {
    year: number; month: number; mode: 'from' | 'to'
    selected?: string; onSelect: (d: string) => void
  }) => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = formatDateISO(new Date())
    const prevMonth = () => {
      if (mode === 'from') setCalFromMonth(m => { if (m === 0) { setCalFromYear(y => y - 1); return 11 } return m - 1 })
      else setCalToMonth(m => { if (m === 0) { setCalToYear(y => y - 1); return 11 } return m - 1 })
    }
    const nextMonth = () => {
      if (mode === 'from') setCalFromMonth(m => { if (m === 11) { setCalFromYear(y => y + 1); return 0 } return m + 1 })
      else setCalToMonth(m => { if (m === 11) { setCalToYear(y => y + 1); return 0 } return m + 1 })
    }
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7) cells.push(null)
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors hover:bg-[rgba(243,237,227,1)]" style={{ color: 'var(--foreground-secondary)' }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--foreground)' }}>{year}年{month + 1}月</span>
          <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors hover:bg-[rgba(243,237,227,1)]" style={{ color: 'var(--foreground-secondary)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-center text-[11px] font-medium py-1" style={{ color: 'rgba(184,168,138,1)' }}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />
            const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = ds === today
            const isSelected = ds === selected
            return (
              <button
                key={i}
                onClick={() => onSelect(ds)}
                className="h-8 flex items-center justify-center rounded-[6px] text-[12px] font-medium transition-all"
                style={{
                  color: isSelected ? '#ffffff' : isToday ? 'rgba(196,61,61,1)' : 'var(--foreground)',
                  backgroundColor: isSelected ? 'rgba(196,61,61,1)' : isToday ? 'rgba(253,242,242,1)' : 'transparent',
                }}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const handleFromSelect = (d: string) => {
    setFromDate(d)
    if (toDate && d > toDate) setToDate(d)
  }
  const handleToSelect = (d: string) => {
    setToDate(d)
    if (fromDate && d < fromDate) setFromDate(d)
  }

  const loadEmails = useCallback(async () => {
    setLoading(true)
    try {
      const data = debouncedSearch
        ? await api.mails.search(debouncedSearch)
        : await api.mails.list(undefined, folder === 'ALL' ? '' : folder, 50, 0, fromDate || undefined, toDate || undefined)
      setEmails(data || [])
    } catch { setEmails([]) }
    setLoading(false)
  }, [folder, debouncedSearch, fromDate, toDate])

  useEffect(() => { loadEmails() }, [loadEmails, refresh])

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
    if (d) api.mails.markRead(id).catch(() => {})
  }, [loadDetail])

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
    router.refresh()
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

  const sortedEmails = [...emails].sort((a, b) => {
    const r = new Date(b.date).getTime() - new Date(a.date).getTime()
    return sortAsc ? -r : r
  })

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
                 <button onClick={handleRefresh} className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}>
                   <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--foreground-secondary)' }} />
                 </button>
                 <div ref={dateFilterRef} className="relative">
                   <button onClick={() => setDateFilterOpen(v => !v)} className="flex items-center gap-2 h-[32px] px-3 rounded-[8px] transition-all hover:opacity-80" style={{ backgroundColor: fromDate || toDate ? 'rgba(196,61,61,0.08)' : 'var(--muted)', borderColor: (fromDate || toDate) ? 'rgba(196,61,61,0.3)' : 'transparent', borderWidth: fromDate || toDate ? '1px' : '0', borderStyle: 'solid' }}>
                     <Calendar className="w-4 h-4" style={{ color: (fromDate || toDate) ? 'rgba(196,61,61,1)' : 'var(--foreground-secondary)' }} />
                     <span className="text-[12px] font-medium" style={{ color: (fromDate || toDate) ? 'rgba(196,61,61,1)' : 'var(--foreground-secondary)' }}>
                       {fromDate || toDate ? formatDate(fromDate || '') + (toDate ? ' ~ ' + formatDate(toDate) : '') : '日期'}
                     </span>
                     <ChevronDown className="w-3 h-3" style={{ color: 'var(--foreground-tertiary)' }} />
                   </button>
                   {dateFilterOpen && (
                     <div
                       className="absolute z-50 top-full mt-1 right-0 rounded-[12px] overflow-hidden"
                       style={{ backgroundColor: '#ffffff', border: '0.7px solid rgba(229,217,196,1)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: 16, width: 340 }}
                       onClick={e => e.stopPropagation()}
                     >
                       {/* 标签 */}
                       <div className="flex gap-6 mb-3">
                         <div>
                           <div className="text-[11px] font-semibold mb-2" style={{ color: 'rgba(184,168,138,1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>开始日期</div>
                           <CalendarGrid
                             year={calFromYear} month={calFromMonth} mode="from"
                             selected={fromDate} onSelect={handleFromSelect}
                           />
                         </div>
                         <div>
                           <div className="text-[11px] font-semibold mb-2" style={{ color: 'rgba(184,168,138,1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>结束日期</div>
                           <CalendarGrid
                             year={calToYear} month={calToMonth} mode="to"
                             selected={toDate} onSelect={handleToSelect}
                           />
                         </div>
                       </div>
                       {/* 快捷日期 */}
                       <div className="flex flex-wrap gap-1.5 mb-3">
                         {([
                           { label: '今天', from: '', to: '' },
                           { label: '昨天', from: 'yesterday', to: 'yesterday' },
                           { label: '近7天', from: '7d', to: '' },
                           { label: '近30天', from: '30d', to: '' },
                           { label: '本月', from: 'thisMonth', to: '' },
                         ] as const).map(({ label, from, to }) => (
                           <button
                             key={label}
                             onClick={() => {
                               const now = new Date()
                               const y = now.getFullYear()
                               const m = String(now.getMonth() + 1).padStart(2, '0')
                               const d = String(now.getDate()).padStart(2, '0')
                               const todayStr = `${y}-${m}-${d}`
                               const setDates = (f: string, t: string) => {
                                 if (f === 'yesterday' || f === todayStr) setFromDate(todayStr)
                                 else if (f === '7d') { const d = new Date(); d.setDate(d.getDate() - 7); setFromDate(formatDateISO(d)); setToDate(todayStr) }
                                 else if (f === '30d') { const d = new Date(); d.setDate(d.getDate() - 30); setFromDate(formatDateISO(d)); setToDate(todayStr) }
                                 else if (f === 'thisMonth') { const d = new Date(); d.setDate(1); setFromDate(formatDateISO(d)); setToDate(todayStr) }
                                 else { setFromDate(f); setFromDate(t) }
                               }
                               setDates(from, to)
                               setDateFilterOpen(false)
                               setRefresh(n => n + 1)
                             }}
                             className="px-2.5 h-[26px] rounded-[6px] text-[11px] font-medium transition-all"
                             style={{ backgroundColor: 'rgba(243,237,227,1)', color: 'rgba(107,91,79,1)' }}
                           >
                             {label}
                           </button>
                         ))}
                       </div>
                       {/* 操作按钮 */}
                       <div className="flex gap-2 pt-2" style={{ borderTop: '0.7px solid rgba(229,217,196,1)' }}>
                         <button
                           onClick={() => { setFromDate(''); setToDate(''); setDateFilterOpen(false); setRefresh(n => n + 1) }}
                           className="flex-1 h-[32px] rounded-[8px] text-[12px] font-medium transition-opacity hover:opacity-80"
                           style={{ border: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground-tertiary)' }}
                         >清除</button>
                         <button
                           onClick={() => { setDateFilterOpen(false); setRefresh(n => n + 1) }}
                           className="flex-1 h-[32px] rounded-[8px] text-[12px] font-medium transition-opacity hover:opacity-80"
                           style={{ backgroundColor: 'rgba(196,61,61,1)', color: '#ffffff' }}
                         >确定</button>
                       </div>
                     </div>
                   )}
                 </div>
                 <button className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}>
                   <Filter className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
                 </button>
              </div>
            </div>
            <form onSubmit={e => { e.preventDefault(); loadEmails() }} className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
               <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                 className="w-full h-10 pl-9 pr-4 rounded-[8px] outline-none text-sm placeholder:text-[var(--muted-foreground)]"
                 style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
                 placeholder="搜索邮件..." />
            </form>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-4 py-2.5 border-b" style={{ borderColor: 'var(--card-border)' }}>
            {filterTabs.map((t) => (
              <button key={t.value} onClick={() => { setFolder(t.value); setSearchQ('') }}
                className={`px-3 h-7 rounded-[6px] text-xs whitespace-nowrap transition-colors ${folder === t.value ? 'font-medium' : ''}`}
                style={{
                  backgroundColor: folder === t.value ? 'var(--muted)' : 'transparent',
                  color: folder === t.value ? 'var(--foreground-secondary)' : 'var(--foreground-tertiary)',
                }}
              >{t.label}</button>
            ))}
            <button onClick={() => setSortAsc(a => !a)} className="ml-auto flex items-center gap-1 px-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] rounded-[8px]">
              排序 {sortAsc ? '↑' : '↓'} <ChevronDown className="w-3 h-3" />
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
              sortedEmails.map((email) => (
                <div key={email.id} className={`border-b transition-colors ${selectedId === email.id ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]'}`} style={{ borderColor: 'var(--card-border)' }}>
                  <MailItem email={email} brand={(email as any).account_brand} selected={selectedId === email.id} onSelect={handleSelect} />
                </div>
              ))
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
                  <button onClick={handleArchive} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Archive className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button>
                  <button onClick={handleDeleteRequest} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Trash2 className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button>
                  <button onClick={() => { setSelectedId(null); setDetail(null); }} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><MailCheck className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button>
                  <button onClick={() => handleMove('DEFERRED')} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Clock className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button>
                  </div>
                  <div className="w-px h-6 bg-[var(--card-border)]" />
                  <div className="flex items-center gap-1 relative">
                  <button onClick={() => setFolderMoveOpen(o => !o)} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><FolderMove className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button>
                  <button onClick={handleMarkRead} className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)' }}><Tags className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /></button>
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
                   <span className="h-5 px-3 rounded-[6px] text-[11px] font-medium flex items-center" style={{ backgroundColor: '#fdf2f2', color: '#c43d3d' }}>工作</span>
                   {detail.email.is_starred && <Star className="w-5 h-5" style={{ color: 'var(--gold)' }} />}
                </div>
              </div>

              {/* From info */}
              <div className="flex items-start gap-4 p-4 rounded-[12px]" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
                  style={{ backgroundColor: (detail.email as any).account_brand || '#ea4335' }}
                >
                  {(detail.email.from?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[15px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{detail.email.from}</span>
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
                      <button key={i} className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[var(--muted)]">
                        <Icon className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} />
                      </button>
                    ))}
                  </div>
                  <button onClick={handleReply} disabled={!replyText.trim()}
                    className="flex items-center gap-2 px-4 h-9 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                    <Send className="w-4 h-4" /> 发送
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

export default function MailPage() {
  return <Suspense><MailPageInner /></Suspense>
}

export const dynamic = 'force-dynamic'
