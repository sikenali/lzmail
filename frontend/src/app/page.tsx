'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import {
  Mail, MailOpen, Send, TrendingUp, TrendingDown,
  ChevronRight, getAccountAvatarBg, Contact
} from '@/lib/icons'
import { DateTimePicker } from '@/components/DateTimePicker'
import type { MailStats, Email, Account } from '@/types'

const TrendChart = dynamic(() => import('./TrendChart'), { ssr: false })

import { formatBytes, formatNumber } from '@/lib/format'

const brandAvatarBg: Record<string, string> = {
  '#ea4335': '#fdf2f2',
  '#0078d4': '#edf2fc',
  '#12b7f5': '#edfafe',
  '#e53e3e': '#fdf2f2',
  '#5b8c5a': '#edf5ec',
  '#c9a96e': '#faf3e8',
  '#6b8fa3': '#f0f4f7',
  '#3d2b1f': '#f5f0e8',
}

export default function Dashboard() {
  const [stats, setStats] = useState<MailStats | null>(null)
  const [sentCount, setSentCount] = useState(0)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [recentEmails, setRecentEmails] = useState<Email[]>([])
  const [trendData, setTrendData] = useState<Array<{date: string; receive: number; send: number}>>([])
  const [syncStatus, setSyncStatus] = useState<Record<number, string>>({})
  const [syncProgress, setSyncProgress] = useState<Record<number, import('@/hooks/useSSE').SyncStatusData>>({})
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [trendDays, setTrendDays] = useState(7)
  const trendCache = useRef<Record<number, Array<{date: string; receive: number; send: number}>>>({})

  useSSE(
    () => setRefresh(n => n + 1),
    undefined,
    (data) => {
      if (!data.account_id) return
      const id = Number(data.account_id)
      setSyncStatus(prev => ({ ...prev, [id]: data.status }))
      if (data.status === 'syncing') {
        setSyncProgress(prev => ({ ...prev, [id]: data }))
      } else {
        setSyncProgress(prev => { const next = { ...prev }; delete next[id]; return next })
      }
    },
  )

  useEffect(() => {
    setLoading(true)
    const guard = <T,>(p: Promise<T>) => p.then(d => (d ?? (undefined as unknown)) as T).catch(() => undefined as unknown as T)
    Promise.all([
      guard(api.mails.stats(undefined, selectedDate)).then(d => d && setStats(d)),
      guard(api.mails.counts()).then(d => d && setSentCount(d.sent ?? 0)),
      guard(api.accounts.list()).then(d => d && setAccounts(d)),
      guard(api.mails.list(undefined, 'INBOX', 5, 0)).then(d => d && setRecentEmails(d)),
      guard(api.sync.status()).then(d => d && setSyncStatus(d)),
    ]).finally(() => {
      setLoading(false)
    })
  }, [refresh, selectedDate])

  useEffect(() => {
    if (trendCache.current[trendDays]) {
      setTrendData(trendCache.current[trendDays])
      return
    }
    api.mails.trend(trendDays).then(d => {
      const data = d ?? []
      trendCache.current[trendDays] = data
      setTrendData(data)
    }).catch(() => {})
  }, [trendDays])

  const totalEmails = stats?.total_emails ?? 0
  const unreadEmails = stats?.unread_emails ?? 0
  const todaySent = sentCount
  const storageBytes = stats?.storage_bytes ?? 0
  const storageCap = stats?.storage_limit || 0
  const storagePct = storageCap > 0 ? Math.round(((storageBytes / storageCap) * 100)) : 0
  const contactCount = stats?.contact_count ?? 0

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '0.7px solid var(--card-border)',
    borderRadius: '16px',
  }

  const statCards = [
    { icon: Mail, iconBg: 'var(--danger-bg)', iconColor: 'var(--primary)', trendUp: true, trendNote: '较上月', label: '总邮件数', note: '较上月' },
    { icon: MailOpen, iconBg: 'var(--gold-bg)', iconColor: 'var(--gold)', trendUp: true, trendNote: '较昨日', label: '未读邮件', note: '较昨日' },
    { icon: Send, iconBg: 'var(--success-bg)', iconColor: 'var(--success)', trendUp: true, trendNote: '较上月', label: '已发送', note: '较上月' },
    { icon: Contact, iconBg: 'var(--danger-bg)', iconColor: 'var(--primary)', trendUp: null, label: '联系人', note: '同步自邮箱' },
  ]
  const statValues = [
    formatNumber(totalEmails),
    formatNumber(unreadEmails),
    formatNumber(todaySent),
    formatNumber(contactCount),
  ]

  return (
    <AppShell>
      <div className="px-3 py-4 sm:px-5 sm:py-5 md:px-8 md:py-6" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[5px] h-7 rounded-[2px] shrink-0" style={{ backgroundColor: 'var(--primary)' }} />
            <div className="min-w-0">
              <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold leading-none truncate" style={{ color: 'var(--foreground)' }}>仪表盘</h1>
              <p className="text-[11px] sm:text-[12px] md:text-[13px] mt-0.5 truncate" style={{ color: 'var(--foreground-tertiary)' }}>邮件概览与同步状态</p>
            </div>
          </div>
          <DateTimePicker value={selectedDate} onChange={setSelectedDate} />
        </div>

        {/* Stats cards - 2-column on mobile, 4-column on tablet+ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-5 md:mt-6">
          {statCards.map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="p-3 sm:p-4 md:p-5" style={cardStyle}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] md:text-[12px]" style={{ color: 'var(--foreground-tertiary)' }}>{card.label}</span>
                   <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-[8px] sm:rounded-[10px] flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" style={{ color: card.iconColor }} />
                  </div>
                </div>
                <div className="text-[20px] sm:text-[24px] md:text-[28px] leading-none font-bold mt-2 sm:mt-3 md:mt-4" style={{ color: 'var(--foreground)' }}>{statValues[i]}</div>
                {card.trendUp != null ? (
                  <div className="flex items-center gap-1 mt-1.5 sm:mt-2 md:mt-3">
                    {card.trendUp ? <TrendingUp className="w-3 h-3" style={{ color: 'var(--success)' }} /> : <TrendingDown className="w-3 h-3" style={{ color: 'var(--danger)' }} />}
                    <span className="text-[10px] sm:text-[11px] md:text-xs ml-0.5" style={{ color: 'var(--muted-foreground)' }}>{card.note}</span>
                  </div>
                ) : (
                  <div className="text-[10px] sm:text-[11px] md:text-xs mt-1.5 sm:mt-2 md:mt-3" style={{ color: 'var(--muted-foreground)' }}>{card.note}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Two-column: recent emails + right panel - stacks on mobile */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-5 md:gap-5 mt-4 sm:mt-5 md:mt-6">
          {/* Recent emails */}
          <div className="flex-[3] min-w-0 p-4 sm:p-5 md:p-6" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-[4px] h-5 rounded-[2px] shrink-0" style={{ backgroundColor: 'var(--primary)' }} />
              <h2 className="text-[13px] sm:text-[14px] font-bold truncate" style={{ color: 'var(--foreground)' }}>最近邮件</h2>
              </div>
              <Link href="/mail" className="flex items-center gap-1 text-[12px] sm:text-[13px] font-medium hover:underline shrink-0" style={{ color: 'var(--primary)' }}>
                查看全部 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="mt-4 sm:mt-5">
              {loading ? (
                <div className="text-center py-6 sm:py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
              ) : recentEmails.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>暂无邮件</div>
              ) : recentEmails.map((mail) => {
                const bc = mail.account_brand || '#c43d3d'
                const accentColor = bc.startsWith('#') ? bc : '#c43d3d'
                const date = new Date(mail.date)
                const isToday = new Date().toDateString() === date.toDateString()
                const pad = (n: number) => String(n).padStart(2, '0')
                const timeStr = isToday
                  ? `${pad(date.getHours())}:${pad(date.getMinutes())}`
                  : `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`
                return (
                  <a key={mail.id} href={`/mail?id=${mail.id}`}
                    className="flex items-center gap-3 sm:gap-4 py-3 sm:py-4 transition-colors cursor-pointer group"
                  >
                    <div className="w-[4px] h-[36px] sm:h-[40px] rounded-[2px] shrink-0" style={{ backgroundColor: accentColor }} />
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                      style={{ backgroundColor: brandAvatarBg[accentColor] || '#fdf2f2', color: accentColor }}
                    >
                      {(mail.from?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 sm:gap-3">
                        <span className="text-[13px] sm:text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{mail.subject || '(无主题)'}</span>
                        <span className="shrink-0 text-[10px] sm:text-xs" style={{ color: 'var(--muted-foreground)' }}>{timeStr}</span>
                      </div>
                      <div className="text-[12px] sm:text-[13px] truncate mt-0.5 sm:mt-1" style={{ color: 'var(--foreground-tertiary)' }}>{mail.body_preview}</div>
                    </div>
                    {!mail.is_read && (
                      <span className="w-[9px] h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--primary)' }} />
                    )}
                  </a>
                )
              })}
            </div>
          </div>

          {/* Right panel - stacks below on mobile */}
          <div className="flex flex-col gap-4 sm:gap-5 md:gap-5 flex-[2] md:flex-[2]">
            {/* Sync status card */}
            <div className="p-4 sm:p-5 md:p-6" style={cardStyle}>
              <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-1 h-5 rounded-sm shrink-0" style={{ backgroundColor: 'rgba(91,140,90,1)' }} />
              <h2 className="text-[13px] sm:text-[14px] font-bold truncate" style={{ color: 'var(--foreground)' }}>同步状态</h2>
              </div>
              <div className="mt-4 sm:mt-5">
                {accounts.length === 0 ? (
                  <div className="text-sm py-3 text-center" style={{ color: 'var(--muted-foreground)' }}>暂无已配置账号</div>
                ) : accounts.map((a) => {
                  const ac = getAccountAvatarBg(a)
                  const syncState = syncStatus[a.id]
                  const prog = syncProgress[a.id]
                  const syncing = syncState === 'syncing'
                  const syncErr = syncState === 'error'
                  const dotColor = syncing ? 'var(--gold)' : syncErr ? 'var(--danger)' : 'var(--success)'
                  const statusText = syncing ? '同步中' : syncErr ? '异常' : (prog?.mode === 'poll' ? '轮询' : '在线')
                  const modeLabel = prog?.mode === 'poll' ? 'Poll · 1分钟' : 'IDLE · 实时'
                  return (
                    <div key={a.id} className="flex items-center justify-between py-2.5 sm:py-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: ac }}>
                          {(a.name || a.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] sm:text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--foreground)' }}>{a.name || a.email}</div>
                          <div className="text-[10px] sm:text-[11px] leading-tight mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>{modeLabel}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <span className="w-[8px] h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        <span className="text-[10px] sm:text-xs font-medium" style={{ color: dotColor }}>{statusText}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Storage overview card */}
            <div className="p-4 sm:p-5 md:p-6" style={cardStyle}>
              <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-1 h-5 rounded-sm shrink-0" style={{ backgroundColor: 'rgba(201,169,110,1)' }} />
              <h2 className="text-[13px] sm:text-[14px] font-bold truncate" style={{ color: 'var(--foreground)' }}>本地存储</h2>
              </div>
              <div className="mt-4 sm:mt-5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] sm:text-[13px]" style={{ color: 'var(--foreground-secondary)' }}>附件已用</span>
                  <span className="text-[12px] sm:text-[13px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{formatBytes(storageBytes)} / {formatBytes(storageCap)}</span>
                </div>
                <div className="h-1.5 sm:h-2 rounded-full overflow-hidden mt-1.5 sm:mt-2" style={{ backgroundColor: 'var(--muted)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${storagePct}%`, backgroundColor: 'var(--gold)' }} />
                </div>
              </div>
              <div className="text-[10px] sm:text-[11px] mt-2 sm:mt-3" style={{ color: 'var(--muted-foreground)' }}>
                统计口径：附件占用（.eml 邮件正文文件不计入）
              </div>
            </div>
          </div>
        </div>

        {/* Trend chart - full width on all sizes */}
        <div className="p-4 sm:p-5 md:p-6 mt-4 sm:mt-5 md:mt-6 rounded-[16px]" style={cardStyle}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="w-1 h-5 rounded-sm shrink-0" style={{ backgroundColor: 'var(--teal)' }} />
              <h2 className="text-[13px] sm:text-[14px] font-bold" style={{ color: 'var(--foreground)' }}>邮件趋势（近{trendDays}天）</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-[13px] h-3 rounded-sm" style={{ backgroundColor: 'var(--primary)' }} />
                <span className="text-[10px] sm:text-xs" style={{ color: 'var(--foreground-tertiary)' }}>接收</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[13px] h-3 rounded-sm" style={{ backgroundColor: 'var(--success)' }} />
                <span className="text-[10px] sm:text-xs" style={{ color: 'var(--foreground-tertiary)' }}>发送</span>
              </div>
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => setTrendDays(days)}
                    className="h-6 sm:h-[26px] px-2.5 sm:px-3 rounded-full text-[11px] sm:text-[12px] font-medium transition-all"
                    style={{
                      backgroundColor: trendDays === days ? 'var(--primary)' : 'var(--muted)',
                      color: trendDays === days ? '#fff' : 'var(--foreground-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {days}天
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="h-36 sm:h-44 mt-3 sm:mt-4">
            <TrendChart data={trendData} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
