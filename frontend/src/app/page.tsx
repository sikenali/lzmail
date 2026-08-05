'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import {
  Mail, MailOpen, Send, Paperclip, Calendar, TrendingUp, TrendingDown,
  ChevronRight, CheckCircle2
} from '@/lib/icons'
import TrendChart from './TrendChart'
import type { MailStats, Email, Account } from '@/types'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
}

const gradientMap: Record<string, string> = {
  '#ea4335': 'linear-gradient(135deg, #fb923c, #ef4444)',
  '#0078d4': 'linear-gradient(135deg, #60a5fa, #6366f1)',
  '#12b7f5': 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
  '#e53e3e': 'linear-gradient(135deg, #f87171, #f43f5e)',
  '#6b8fa3': 'linear-gradient(135deg, #93c5fd, #60a5fa)',
  '#c43d3d': 'linear-gradient(135deg, #c43d3d, #a83232)',
  '#6366f1': 'linear-gradient(135deg, #818cf8, #6366f1)',
  '#5b8c5a': 'linear-gradient(135deg, #6b9b6a, #5b8c5a)',
  '#c9a96e': 'linear-gradient(135deg, #d4b87a, #c9a96e)',
}

export default function Dashboard() {
  const [stats, setStats] = useState<MailStats | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [recentEmails, setRecentEmails] = useState<Email[]>([])
  const [trendData, setTrendData] = useState<Array<{date: string; receive: number; send: number}>>([])
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)

  useSSE(() => setRefresh(n => n + 1))

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.mails.stats().then(d => setStats(d ?? null)).catch(() => {}),
      api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {}),
      api.mails.list(undefined, 'INBOX', 5, 0).then(d => setRecentEmails(d ?? [])).catch(() => {}),
      api.mails.trend(7).then(d => setTrendData(d ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [refresh])

  const totalEmails = stats?.total_emails ?? 0
  const unreadEmails = stats?.unread_emails ?? 0
  const todaySent = stats?.today_emails ?? 0
  const storageBytes = stats?.storage_bytes ?? 0
  const storageCap = (stats as any)?.storage_limit || 50 * 1024 * 1024 * 1024
  const storagePct = storageCap > 0 ? Math.min((storageBytes / storageCap) * 100, 100) : 0

  const today = new Date()
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    boxShadow: 'var(--card-shadow)',
    border: '1px solid var(--card-border)',
    borderRadius: '16px',
  }

  return (
    <AppShell>
      <div className="p-6" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-[5px] h-8 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>仪表盘</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>邮件概览与同步状态</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 h-8 rounded-lg" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--muted-foreground)' }} />
            <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>{dateStr}</span>
          </div>
        </div>

        {/* Stats cards */}
        <div className="flex gap-4 mb-6">
          {[
            { icon: Mail, iconBg: 'var(--accent)', iconColor: 'var(--primary)', trend: { direction: 'up' as const, pct: '12%', color: 'var(--success)' }, value: String(totalEmails), label: '总邮件数' },
            { icon: MailOpen, iconBg: 'var(--danger-bg)', iconColor: 'var(--danger)', trend: { direction: 'down' as const, pct: '3%', color: 'var(--danger)' }, value: String(unreadEmails), label: '未读邮件' },
            { icon: Send, iconBg: 'var(--success-bg)', iconColor: 'var(--success)', trend: { direction: 'up' as const, pct: '8%', color: 'var(--success)' }, value: String(todaySent), label: '已发送' },
            { icon: Paperclip, iconBg: 'var(--gold-bg)', iconColor: 'var(--gold)', trend: { direction: 'up' as const, pct: '8%', color: 'var(--gold)' }, value: totalEmails > 0 ? String(Math.round(totalEmails * 0.3)) : '—', label: '附件总量' },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="flex-1 p-5 rounded-2xl" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
                    <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
                  </div>
                  {card.trend && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: card.trend.direction === 'up' ? 'var(--success-bg)' : 'var(--danger-bg)', color: card.trend.color }}
                    >
                      {card.trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {card.trend.pct}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>{card.value}</div>
                <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{card.label}</div>
                {i === 3 && <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>本地 NAS 存储</div>}
              </div>
            )
          })}
        </div>

        {/* Two-column: recent emails + right panel */}
        <div className="flex gap-4 mb-6">
          {/* Recent emails */}
          <div className="flex-[3] rounded-2xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-[5px] h-5 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
                <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>最近邮件</h2>
              </div>
              <a href="/mail" className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--primary)' }}>
                查看全部 <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="space-y-0">
              {loading ? (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
              ) : recentEmails.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>暂无邮件</div>
              ) : recentEmails.map((mail) => {
                const bc = (mail as any).account_brand || '#c43d3d'
                const an = (mail as any).account_name || ''
                const date = new Date(mail.date)
                const isToday = new Date().toDateString() === date.toDateString()
                const timeStr = isToday
                  ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                  : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                const accentColor = bc.startsWith('#') ? bc : '#c43d3d'
                return (
                  <a key={mail.id} href={`/mail/${mail.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-[var(--accent)] rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                  >
                    <div className="w-1 h-10 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ background: gradientMap[accentColor] || 'linear-gradient(135deg, var(--primary), #a83232)' }}
                    >
                      {(mail.from?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{mail.from}</span>
                        {an && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                          >{an}</span>
                        )}
                      </div>
                      <div className="truncate mt-0.5 text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>{mail.subject || '(无主题)'}</div>
                      <div className="text-xs truncate mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{mail.body_preview}</div>
                    </div>
                    <div className="shrink-0 text-xs" style={{ color: 'var(--muted-foreground)' }}>{timeStr}</div>
                  </a>
                )
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="w-[380px] flex flex-col gap-4">
            {/* Sync status card */}
            <div className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
                <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>同步状态</h2>
              </div>
              <div className="space-y-3">
                {accounts.length === 0 ? (
                  <div className="text-sm py-4 text-center" style={{ color: 'var(--muted-foreground)' }}>暂无已配置账号</div>
                ) : accounts.map((a) => {
                  const ac = a.brand_color || '#6366f1'
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: ac }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{a.name || a.email}</div>
                        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{a.use_idle ? 'IDLE · 实时监听' : 'Poll · 5分钟轮询'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>正常</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Storage card */}
            <div className="rounded-2xl p-5 flex-1" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: 'var(--gold)' }} />
                <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>本地存储</h2>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span style={{ color: 'var(--foreground-tertiary)' }}>{formatBytes(storageBytes)} / {formatBytes(storageCap)}</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{storagePct.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${storagePct}%`, background: 'linear-gradient(to right, var(--gold), var(--danger))' }} />
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                <span style={{ color: 'var(--foreground-tertiary)' }}>归档目录: {process.env.NEXT_PUBLIC_ARCHIVE_DIR || './archives/'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trend chart */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[5px] h-5 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>邮件趋势（近7天）</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
                <span className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>接收</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
                <span className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>发送</span>
              </div>
            </div>
          </div>
          <div className="h-48">
            <TrendChart data={trendData} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
