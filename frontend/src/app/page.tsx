'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import { Mail, Users, HardDrive, Activity, ChevronRight } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import type { MailStats, Email, Account } from '@/types'

const chartData = [
  { name: '周一', receive: 8, send: 4 },
  { name: '周二', receive: 14, send: 5 },
  { name: '周三', receive: 6, send: 2 },
  { name: '周四', receive: 11, send: 4 },
  { name: '周五', receive: 18, send: 4 },
  { name: '周六', receive: 4, send: 2 },
  { name: '周日', receive: 7, send: 3 },
]

function resolveBrandColor(val: string, fallback = '#3b82f6'): string {
  return val.startsWith('#') ? val : fallback
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
}

const brandColors = ['#ea4335', '#0078d4', '#12b7f5', '#e53e3e', '#f59e0b', '#8b5cf6']

export default function Dashboard() {
  const [stats, setStats] = useState<MailStats | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [recentEmails, setRecentEmails] = useState<Email[]>([])
  const [refresh, setRefresh] = useState(0)

  useSSE(() => setRefresh(n => n + 1))

  useEffect(() => {
    api.mails.stats().then(setStats).catch(() => {})
    api.accounts.list().then(setAccounts).catch(() => {})
    api.mails.list(undefined, 'INBOX', 5, 0).then(setRecentEmails).catch(() => {})
  }, [refresh])

  const statCards = [
    { icon: Mail, label: '今日邮件', value: String(stats?.today_emails ?? '—'), bg: 'bg-blue-50', color: 'text-blue-600' },
    { icon: Users, label: '已配置账号', value: String(stats?.account_count ?? '—'), bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { icon: HardDrive, label: '存储占用', value: stats ? formatBytes(stats.storage_bytes) : '—', bg: 'bg-violet-50', color: 'text-violet-600' },
    { icon: Activity, label: '同步状态', value: '正常', bg: 'bg-orange-50', color: 'text-orange-600' },
  ]

  const totalStorage = 50 * 1024 * 1024 * 1024
  const storagePercent = stats ? Math.min((stats.storage_bytes / totalStorage) * 100, 100) : 0

  const totalEmails = stats?.total_emails || 0
  const donutSegments = accounts.length > 0
    ? accounts.map((a, i) => ({
        color: a.brand_color || brandColors[i % brandColors.length],
        label: a.name || a.email,
        count: Math.round(totalEmails / accounts.length),
      }))
    : [{ color: '#94a3b8', label: '暂无数据', count: 0 }]

  const totalDonut = donutSegments.reduce((s, x) => s + x.count, 0) || 1
  const circumference = 2 * Math.PI * 106
  let offset = 0

  return (
    <AppShell>
      <div className="p-6 space-y-5 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">仪表盘</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {stats ? `共 ${stats.total_emails} 封邮件，${stats.unread_emails} 封未读` : '欢迎回来'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-[var(--foreground-tertiary)]">实时同步</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-[var(--card)] rounded-xl p-4 border shadow-sm">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="text-2xl font-semibold">{s.value}</div>
                <div className="text-sm text-[var(--muted-foreground)]">{s.label}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-[var(--card)] rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">邮件收发趋势</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                  <span className="text-xs text-[var(--muted-foreground)]">接收</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                  <span className="text-xs text-[var(--muted-foreground)]">发送</span>
                </div>
              </div>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="receiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="receive" stroke="#3b82f6" strokeWidth={2.5} fill="url(#receiveGrad)" />
                  <Area type="monotone" dataKey="send" stroke="#10b981" strokeWidth={2.5} fill="url(#sendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[var(--card)] rounded-xl border shadow-sm p-5">
            <h2 className="text-sm font-semibold mb-4">邮件来源分布</h2>
            <div className="flex flex-col items-center">
              <div className="relative w-44 h-44">
                <svg viewBox="0 0 236 236" className="w-full h-full -rotate-90">
                  {donutSegments.map((s, i) => {
                    const ratio = s.count / totalDonut
                    const dash = ratio * circumference
                    const gap = circumference - dash
                    const o = offset
                    offset += dash
                    return (
                      <circle key={i} cx="118" cy="118" r="106" fill="none"
                        stroke={s.color} strokeWidth="24"
                        strokeDasharray={`${dash} ${gap}`}
                        strokeLinecap="butt"
                        transform={`rotate(${o * 360 / circumference} 118 118)`}
                      />
                    )
                  })}
                  <text x="118" y="108" textAnchor="middle" fill="#1e293b" fontSize="24" fontFamily="system-ui" fontWeight="600">{totalDonut}</text>
                  <text x="118" y="132" textAnchor="middle" fill="#94a3b8" fontSize="11">总计</text>
                </svg>
              </div>
              <div className="w-full mt-4 space-y-2.5">
                {donutSegments.map((a) => (
                  <div key={a.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                    <span className="text-xs text-[var(--foreground-secondary)] flex-1 truncate">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3 bg-[var(--card)] rounded-xl border shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h2 className="text-sm font-semibold">最近邮件</h2>
              <a href="/mail" className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline">
                查看全部 <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            {recentEmails.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">暂无邮件，请先配置邮箱账号</div>
            ) : (
              recentEmails.map((mail) => {
                const brandColor = resolveBrandColor((mail as any).account_brand || '')
                const name = (mail as any).account_name || ''
                const date = new Date(mail.date)
                const isToday = new Date().toDateString() === date.toDateString()
                const timeStr = isToday
                  ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                  : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                return (
                  <a key={mail.id} href={`/mail/${mail.id}`}
                    className={`flex items-center gap-3 px-5 py-3 hover:bg-[var(--accent)] cursor-pointer transition-colors border-b last:border-b-0 ${!mail.is_read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: brandColor }} />
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ backgroundColor: brandColor }}>
                      {(mail.from?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate ${!mail.is_read ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--foreground-secondary)]'}`}>{mail.from}</span>
                        {name && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ backgroundColor: brandColor + '1a', color: brandColor }}>{name}</span>}
                      </div>
                      <div className={`text-sm truncate ${!mail.is_read ? 'font-medium text-[var(--foreground)]' : 'text-[var(--foreground-secondary)]'}`}>{mail.subject || '(无主题)'}</div>
                      <div className="text-xs text-[var(--muted-foreground)] truncate">{mail.body_preview}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">{timeStr}</span>
                    </div>
                  </a>
                )
              })
            )}
          </div>

          <div className="col-span-2 space-y-4">
            <div className="bg-[var(--card)] rounded-xl border shadow-sm p-5">
              <h2 className="text-sm font-semibold mb-4">同步状态</h2>
              <div className="space-y-3">
                {accounts.length === 0 ? (
                  <div className="text-sm text-[var(--muted-foreground)] py-4 text-center">暂无已配置账号</div>
                ) : (
                  accounts.map((a) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: a.brand_color || '#6366f1' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--foreground)]">{a.name || a.email}</div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">{a.use_idle ? 'IDLE · 实时监听中' : 'Poll · 5分钟轮询'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs text-emerald-600">正常</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--muted-foreground)]">本地存储用量</span>
                  <span className="text-xs font-semibold">{stats ? formatBytes(stats.storage_bytes) : '—'} / 50 GB</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all" style={{ width: `${storagePercent}%` }} />
                </div>
                <div className="text-[10px] text-[var(--muted-foreground)] mt-1.5">
                  归档目录: /mnt/nas/lzmail/archives/
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
