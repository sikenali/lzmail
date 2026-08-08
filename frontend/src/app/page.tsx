'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import {
  Mail, MailOpen, Send, Paperclip, TrendingUp, TrendingDown,
  ChevronRight, getAccountAvatarBg
} from '@/lib/icons'
import { DateTimePicker } from '@/components/DateTimePicker'
import type { MailStats, Email, Account } from '@/types'

const TrendChart = dynamic(() => import('./TrendChart'), { ssr: false })

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

const brandAvatarBg: Record<string, string> = {
  '#ea4335': '#fdf2f2',
  '#0078d4': '#edf2fc',
  '#12b7f5': '#edfafe',
  '#e53e3e': '#fdf2f2',
  '#5b8c5a': '#edf5ec',
  '#c9a96e': '#faf3e8',
}

export default function Dashboard() {
  const [stats, setStats] = useState<MailStats | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [recentEmails, setRecentEmails] = useState<Email[]>([])
  const [trendData, setTrendData] = useState<Array<{date: string; receive: number; send: number}>>([])
  const [syncStatus, setSyncStatus] = useState<Record<number, string>>({})
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(false)

  useSSE(
    () => setRefresh(n => n + 1),
    undefined,
    (data) => {
      if (!data.account_id) return
      setSyncStatus(prev => ({ ...prev, [Number(data.account_id)]: data.status }))
    },
  )

  useEffect(() => {
    Promise.all([
      api.mails.stats().then(d => setStats(d ?? null)).catch(() => {}),
      api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {}),
      api.mails.list(undefined, 'INBOX', 5, 0).then(d => setRecentEmails(d ?? [])).catch(() => {}),
      api.mails.trend(7).then(d => setTrendData(d ?? [])).catch(() => {}),
      api.sync.status().then(d => setSyncStatus(d ?? {})).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [refresh])

  const totalEmails = stats?.total_emails ?? 0
  const unreadEmails = stats?.unread_emails ?? 0
  const todaySent = stats?.today_emails ?? 0
  const storageBytes = stats?.storage_bytes ?? 0
  const storageCap = stats?.storage_limit || 0
  const storagePct = storageCap > 0 ? Math.round(((storageBytes / storageCap) * 100)) : 0

  const [selectedDate, setSelectedDate] = useState(() => {
    const t = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`
  })

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid rgba(229,217,196,1)',
    borderRadius: '16px',
  }

  const statCards = [
    { icon: Mail, iconBg: '#fdf2f2', iconColor: '#c43d3d', trendUp: true, trendNote: '较上月', label: '总邮件数', note: '较上月' },
    { icon: MailOpen, iconBg: '#fef9f0', iconColor: '#c9a96e', trendUp: true, trendNote: '较昨日', label: '未读邮件', note: '较昨日' },
    { icon: Send, iconBg: '#edf5ec', iconColor: '#5b8c5a', trendUp: true, trendNote: '较上月', label: '已发送', note: '较上月' },
    { icon: Paperclip, iconBg: '#f0f4f7', iconColor: '#6b8fa3', trendUp: null, label: '附件总量', note: '本地 NAS 存储' },
  ]
  const statValues = [
    formatNumber(totalEmails),
    formatNumber(unreadEmails),
    formatNumber(todaySent),
    storageBytes > 0 ? formatBytes(storageBytes) : '—',
  ]

  return (
    <AppShell>
      <div className="px-10 py-8" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-[5px] h-8 rounded-[2px]" style={{ backgroundColor: 'rgba(196,61,61,1)' }} />
            <div>
              <h1 className="text-[28px] font-bold leading-none" style={{ color: 'rgba(61,43,31,1)' }}>仪表盘</h1>
              <p className="text-[13px] mt-1" style={{ color: 'rgba(139,115,85,1)' }}>邮件概览与同步状态</p>
            </div>
          </div>
          <DateTimePicker value={selectedDate} onChange={setSelectedDate} />
        </div>

        {/* Stats cards */}
        <div className="flex gap-5 mt-8">
          {statCards.map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="flex-1 p-6" style={cardStyle}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px]" style={{ color: 'var(--foreground-tertiary)' }}>{card.label}</span>
                   <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
                    <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
                  </div>
                </div>
                <div className="text-[36px] leading-none font-bold mt-5" style={{ color: 'var(--foreground)' }}>{statValues[i]}</div>
                {card.trendUp != null ? (
                  <div className="flex items-center gap-1 mt-4">
                    {card.trendUp ? <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} /> : <TrendingDown className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />}
                    <span className="text-xs ml-0.5" style={{ color: 'var(--muted-foreground)' }}>{card.note}</span>
                  </div>
                ) : (
                  <div className="text-xs mt-4" style={{ color: 'var(--muted-foreground)' }}>{card.note}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Two-column: recent emails + right panel */}
        <div className="flex gap-5 mt-8">
          {/* Recent emails */}
          <div className="flex-[3] p-6" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
              <div className="w-[4px] h-5 rounded-[2px]" style={{ backgroundColor: 'rgba(196,61,61,1)' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'rgba(61,43,31,1)' }}>最近邮件</h2>
              </div>
              <Link href="/mail" className="flex items-center gap-1 text-[13px] font-medium hover:underline" style={{ color: 'rgba(196,61,61,1)' }}>
                查看全部 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="mt-5">
              {loading ? (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
              ) : recentEmails.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>暂无邮件</div>
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
                  <a key={mail.id} href={`/mail/${mail.id}`}
                    className="flex items-center gap-4 py-4 transition-colors cursor-pointer group"
                  >
                    <div className="w-[4px] h-[40px] rounded-[2px] shrink-0" style={{ backgroundColor: accentColor }} />
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                      style={{ backgroundColor: brandAvatarBg[accentColor] || '#fdf2f2', color: accentColor }}
                    >
                      {(mail.from?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{mail.subject || '(无主题)'}</span>
                        <span className="shrink-0 text-xs" style={{ color: 'var(--muted-foreground)' }}>{timeStr}</span>
                      </div>
                      <div className="text-[13px] truncate mt-1" style={{ color: 'var(--foreground-tertiary)' }}>{mail.body_preview}</div>
                    </div>
                    {!mail.is_read && (
                      <span className="w-[9px] h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--primary)' }} />
                    )}
                  </a>
                )
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="w-[380px] flex flex-col gap-5">
            {/* Sync status card */}
            <div className="p-6" style={cardStyle}>
              <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-sm" style={{ backgroundColor: 'rgba(91,140,90,1)' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'rgba(61,43,31,1)' }}>同步状态</h2>
              </div>
              <div className="mt-5">
                {accounts.length === 0 ? (
                  <div className="text-sm py-4 text-center" style={{ color: 'var(--muted-foreground)' }}>暂无已配置账号</div>
                ) : accounts.map((a) => {
                  const ac = getAccountAvatarBg(a)
                  const syncState = syncStatus[a.id]
                  const syncing = syncState === 'syncing'
                  const syncErr = syncState === 'error'
                  const dotColor = syncing ? 'var(--gold)' : syncErr ? 'var(--danger)' : 'var(--success)'
                  const statusText = syncing ? '同步中' : syncErr ? '异常' : '在线'
                  return (
                    <div key={a.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: ac }}>
                          {(a.name || a.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium leading-tight" style={{ color: 'var(--foreground)' }}>{a.name || a.email}</div>
                          <div className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{a.use_idle ? 'IDLE · 实时' : 'Poll · 每5分钟'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-[9px] h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                        <span className="text-xs font-medium" style={{ color: dotColor }}>{statusText}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Storage overview card */}
            <div className="p-6" style={cardStyle}>
              <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-sm" style={{ backgroundColor: 'rgba(201,169,110,1)' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'rgba(61,43,31,1)' }}>本地存储</h2>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px]" style={{ color: 'var(--foreground-secondary)' }}>已使用</span>
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--foreground)' }}>{formatBytes(storageBytes)} / {formatBytes(storageCap)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden mt-2" style={{ backgroundColor: 'var(--muted)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${storagePct}%`, backgroundColor: 'var(--gold)' }} />
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                {[
                  { label: '邮件 .eml', value: storageBytes > 0 ? formatBytes(storageBytes * 0.75) : '0 B' },
                  { label: '附件', value: storageBytes > 0 ? formatBytes(storageBytes * 0.25) : '0 B' },
                ].map((s, i) => (
                  <div key={i} className="flex-1 bg-[var(--background)] rounded-xl p-3">
                    <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{s.label}</div>
                    <div className="text-base font-bold mt-0.5" style={{ color: 'var(--foreground)' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trend chart */}
        <div className="p-6 mt-8 rounded-[16px]" style={{ ...cardStyle, border: '1px solid rgba(229,217,196,1)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-sm" style={{ backgroundColor: 'rgba(107,143,163,1)' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'rgba(61,43,31,1)' }}>邮件趋势（近7天）</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-[13px] h-3 rounded-sm" style={{ backgroundColor: 'var(--primary)' }} />
                <span className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>接收</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[13px] h-3 rounded-sm" style={{ backgroundColor: 'var(--success)' }} />
                <span className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>发送</span>
              </div>
            </div>
          </div>
          <div className="h-48 mt-6">
            <TrendChart data={trendData} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
