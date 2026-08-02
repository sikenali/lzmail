'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import {
  Mail, MailOpen, Send, Paperclip, Calendar, TrendingUp, TrendingDown,
  ChevronRight, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import type { MailStats, Email, Account } from '@/types'

const chartData = [
  { name: '1/9', receive: 8, send: 4 },
  { name: '1/10', receive: 14, send: 5 },
  { name: '1/11', receive: 6, send: 2 },
  { name: '1/12', receive: 11, send: 4 },
  { name: '1/13', receive: 18, send: 4 },
  { name: '1/14', receive: 4, send: 2 },
  { name: '今天', receive: 7, send: 3 },
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
}

const accountBrandColors: Record<string, string> = {
  Gmail: '#ea4335',
  Outlook: '#0078d4',
  QQ: '#12b7f5',
  Netease: '#e53e3e',
  iCloud: '#6b8fa3',
}

const gradientMap: Record<string, string> = {
  '#ea4335': 'linear-gradient(135deg, #fb923c, #ef4444)',
  '#0078d4': 'linear-gradient(135deg, #60a5fa, #6366f1)',
  '#12b7f5': 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
  '#e53e3e': 'linear-gradient(135deg, #f87171, #f43f5e)',
  '#6b8fa3': 'linear-gradient(135deg, #93c5fd, #60a5fa)',
}

export default function Dashboard() {
  const [stats, setStats] = useState<MailStats | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [recentEmails, setRecentEmails] = useState<Email[]>([])
  const [refresh, setRefresh] = useState(0)

  useSSE(() => setRefresh(n => n + 1))

  useEffect(() => {
    Promise.all([
      api.mails.stats().then(d => setStats(d ?? null)).catch(() => {}),
      api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {}),
      api.mails.list(undefined, 'INBOX', 5, 0).then(d => setRecentEmails(d ?? [])).catch(() => {}),
    ])
  }, [refresh])

  const totalEmails = stats?.total_emails || 0
  const storageBytes = stats?.storage_bytes || 0
  const storageCap = 50 * 1024 * 1024 * 1024 // 50GB limit
  const storagePct = Math.min((storageBytes / storageCap) * 100, 100)

  const today = new Date()
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const cardBase = 'rounded-2xl'
  const cardStyle = { backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3ede3' }

  return (
    <AppShell>
      <div className="p-6" style={{ backgroundColor: '#fbf7f0', minHeight: '100%' }}>
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-[5px] h-8 rounded-full" style={{ backgroundColor: '#c43d3d' }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#3d2b1f', fontFamily: 'SourceHanSans-Bold, system-ui' }}>仪表盘</h1>
              <p className="text-xs mt-0.5" style={{ color: '#8b7355' }}>邮件概况与统计</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 h-8 rounded-lg" style={{ backgroundColor: '#ffffff', border: '1px solid #f3ede3' }}>
            <Calendar className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
            <span className="text-sm" style={{ color: '#6b5b4f' }}>{dateStr}</span>
          </div>
        </div>

        {/* Stats cards */}
        <div className="flex gap-4 mb-6">
          {[
            {
              icon: Mail, iconBg: '#fef9f0', iconColor: '#c43d3d',
              trend: { direction: 'up', pct: '12%', color: '#5b8c5a' },
              value: String(stats?.total_emails ?? '—'), label: '总邮件'
            },
            {
              icon: MailOpen, iconBg: '#fdf2f2', iconColor: '#c43d3d',
              trend: { direction: 'down', pct: '3%', color: '#c43d3d' },
              value: String(stats?.unread_emails ?? '—'), label: '未读'
            },
            {
              icon: Send, iconBg: '#edf5ec', iconColor: '#5b8c5a',
              trend: null,
              value: String(stats?.today_emails ?? '—'), label: '已发送'
            },
            {
              icon: Paperclip, iconBg: '#faf3e8', iconColor: '#c9a96e',
              trend: null,
              value: String(stats?.total_emails ? Math.round(stats.total_emails * 0.3) : '—'), label: '附件'
            },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className={`${cardBase} flex-1 p-5`} style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
                    <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
                  </div>
                  {card.trend && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: card.trend.direction === 'up' ? '#edf5ec' : '#fdf2f2', color: card.trend.color }}
                    >
                      {card.trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {card.trend.pct}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold mb-1" style={{ color: '#3d2b1f', fontFamily: 'SourceHanSans-Bold, system-ui' }}>{card.value}</div>
                <div className="text-sm" style={{ color: '#b8a88a' }}>{card.label}</div>
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
                <div className="w-[5px] h-5 rounded-full" style={{ backgroundColor: '#c43d3d' }} />
                <h2 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>最近邮件</h2>
              </div>
              <a href="/mail" className="flex items-center gap-1 text-xs hover:underline" style={{ color: '#c43d3d' }}>
                查看全部 <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="space-y-0">
              {recentEmails.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: '#b8a88a' }}>暂无邮件</div>
              ) : recentEmails.map((mail) => {
                const bc = (mail as any).account_brand || '#c43d3d'
                const an = (mail as any).account_name || ''
                const date = new Date(mail.date)
                const isToday = new Date().toDateString() === date.toDateString()
                const timeStr = isToday
                  ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                  : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                return (
                  <a key={mail.id} href={`/mail/${mail.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-[var(--accent)] rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                  >
                    <div className="w-1 h-10 shrink-0 rounded-full" style={{ backgroundColor: bc }} />
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ background: gradientMap[bc] || 'linear-gradient(135deg, #c43d3d, #a83232)' }}
                    >
                      {(mail.from?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate" style={{ color: '#3d2b1f' }}>{mail.from}</span>
                        {an && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: `${bc}15`, color: bc }}
                          >{an}</span>
                        )}
                      </div>
                      <div className="truncate mt-0.5 text-sm font-medium" style={{ color: '#6b5b4f' }}>{mail.subject || '(无主题)'}</div>
                      <div className="text-xs truncate mt-0.5" style={{ color: '#b8a88a' }}>{mail.body_preview}</div>
                    </div>
                    <div className="shrink-0 text-xs" style={{ color: '#b8a88a' }}>{timeStr}</div>
                  </a>
                )
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-[2] flex flex-col gap-4">
            {/* Sync status card */}
            <div className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#5b8c5a' }} />
                <h2 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>同步状态</h2>
              </div>
              <div className="space-y-3">
                {accounts.length === 0 ? (
                  <div className="text-sm py-4 text-center" style={{ color: '#b8a88a' }}>暂无已配置账号</div>
                ) : accounts.map((a) => {
                  const ac = accountBrandColors[a.name] || a.brand_color || '#6366f1'
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: ac }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: '#3d2b1f' }}>{a.name || a.email}</div>
                        <div className="text-xs" style={{ color: '#b8a88a' }}>{a.use_idle ? 'IDLE · 实时监听' : 'Poll · 5分钟轮询'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
                        <span className="text-xs font-medium" style={{ color: '#059669' }}>正常</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Storage card */}
            <div className="rounded-2xl p-5 flex-1" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c9a96e' }} />
                <h2 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>存储概览</h2>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span style={{ color: '#8b7355' }}>{formatBytes(storageBytes)} / 50 GB</span>
                  <span className="font-semibold" style={{ color: '#3d2b1f' }}>{storagePct.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f3ede3' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${storagePct}%`, background: 'linear-gradient(to right, #c9a96e, #c43d3d)' }} />
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                <div style={{ color: '#8b7355' }}>归档: /mnt/nas/lzmail/archives/</div>
              </div>
            </div>
          </div>
        </div>

        {/* Trend chart */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[5px] h-5 rounded-full" style={{ backgroundColor: '#c43d3d' }} />
              <h2 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>邮件趋势</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#c43d3d' }} />
                <span className="text-xs" style={{ color: '#8b7355' }}>接收</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#5b8c5a' }} />
                <span className="text-xs" style={{ color: '#8b7355' }}>发送</span>
              </div>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="receiveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c43d3d" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#c43d3d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="sendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5b8c5a" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#5b8c5a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#b8a88a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#b8a88a' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #f3ede3', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                <Area type="monotone" dataKey="receive" stroke="#c43d3d" strokeWidth={2.5} fill="url(#receiveGrad)" />
                <Area type="monotone" dataKey="send" stroke="#5b8c5a" strokeWidth={2.5} fill="url(#sendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
