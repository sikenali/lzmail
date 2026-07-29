'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import { Mail, MailOpen, Send, Activity, ChevronRight, Calendar, TrendingUp, TrendingDown, Eye, Inbox } from 'lucide-react'
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
    api.mails.stats().then(d => setStats(d ?? null)).catch(() => {})
    api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {})
    api.mails.list(undefined, 'INBOX', 5, 0).then(d => setRecentEmails(d ?? [])).catch(() => {})
  }, [refresh])

  const totalEmails = stats?.total_emails || 0
  const totalDonutVal = stats?.total_emails || 0

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

  const storageBytes = stats?.storage_bytes || 0
  const storageCap = 50 * 1024 * 1024 * 1024
  const storagePct = Math.min((storageBytes / storageCap) * 100, 100)

  return (
    <AppShell>
      <div className="min-h-screen" style={{ backgroundColor: '#f5f6f8' }}>
        <div className="max-w-[1200px] mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1e293b' }}>仪表盘</h1>
              <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>邮件概况与统计</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg" style={{ borderColor: '#e5e7eb' }}>
              <Calendar className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
              <span className="text-sm" style={{ color: '#475569' }}>最近7天</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
                  <Inbox className="w-5 h-5" style={{ color: '#2563eb' }} />
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ecfdf5' }}>
                  <TrendingUp className="w-3 h-3" style={{ color: '#10b981' }} />
                  <span className="text-xs font-semibold" style={{ color: '#059669' }}>12%</span>
                </div>
              </div>
              <div className="text-3xl font-bold mb-0.5" style={{ color: '#1e293b' }}>{stats?.total_emails ?? '—'}</div>
              <div className="text-sm" style={{ color: '#94a3b8' }}>总邮件数</div>
            </div>

            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fffbeb' }}>
                  <MailOpen className="w-5 h-5" style={{ color: '#d97706' }} />
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fef2f2' }}>
                  <TrendingDown className="w-3 h-3" style={{ color: '#ef4444' }} />
                  <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>3%</span>
                </div>
              </div>
              <div className="text-3xl font-bold mb-0.5" style={{ color: '#1e293b' }}>{stats?.unread_emails ?? '—'}</div>
              <div className="text-sm" style={{ color: '#94a3b8' }}>未读邮件</div>
            </div>

            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
                  <Send className="w-5 h-5" style={{ color: '#059669' }} />
                </div>
              </div>
              <div className="text-3xl font-bold mb-0.5" style={{ color: '#1e293b' }}>{stats?.today_emails ?? '—'}</div>
              <div className="text-sm" style={{ color: '#94a3b8' }}>本周已发送</div>
            </div>

            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#eef2ff' }}>
                  <Activity className="w-5 h-5" style={{ color: '#4f46e5' }} />
                </div>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#34d399' }} />
              </div>
              <div className="text-3xl font-bold mb-0.5" style={{ color: '#1e293b' }}>{stats ? `${stats.account_count}/${stats.account_count}` : '—'}</div>
              <div className="text-sm" style={{ color: '#94a3b8' }}>账号同步正常</div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3 bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: '#1e293b' }}>邮件收发趋势</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="text-xs" style={{ color: '#64748b' }}>接收</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-xs" style={{ color: '#64748b' }}>发送</span>
                  </div>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="receiveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="sendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.08} />
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

            <div className="col-span-2 bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: '#1e293b' }}>邮件来源分布</h2>
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
                    <text x="118" y="108" textAnchor="middle" fill="#1e293b" fontSize="24" fontFamily="system-ui" fontWeight="400">{totalDonut}</text>
                    <text x="118" y="130" textAnchor="middle" fill="#94a3b8" fontSize="11">总计</text>
                  </svg>
                </div>
                <div className="w-full mt-4 space-y-2">
                  {donutSegments.map((a) => (
                    <div key={a.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      <span className="text-xs flex-1 truncate" style={{ color: '#475569' }}>{a.label}</span>
                      <span className="text-xs font-semibold" style={{ color: '#1e293b' }}>{a.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3 bg-white rounded-2xl" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
                <h2 className="text-sm font-semibold" style={{ color: '#1e293b' }}>最近邮件</h2>
                <a href="/mail" className="flex items-center gap-1 text-sm hover:underline" style={{ color: '#3b82f6' }}>
                  查看全部 <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
              {recentEmails.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm" style={{ color: '#94a3b8' }}>暂无邮件，请先配置邮箱账号</div>
              ) : (
                recentEmails.map((mail) => {
                  const brandColor = (mail as any).account_brand || brandColors[0]
                  const accountName = (mail as any).account_name || ''
                  let avatarGradient = 'from-orange-400 to-red-500'
                  if (brandColor === '#0078d4') avatarGradient = 'from-blue-400 to-indigo-500'
                  else if (brandColor === '#12b7f5') avatarGradient = 'from-cyan-400 to-sky-500'
                  else if (brandColor === '#e53e3e') avatarGradient = 'from-red-400 to-rose-500'
                  const date = new Date(mail.date)
                  const isToday = new Date().toDateString() === date.toDateString()
                  const timeStr = isToday
                    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                    : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                  return (
                    <a key={mail.id} href={`/mail/${mail.id}`}
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors border-b last:border-b-0 hover:bg-gray-50" style={{ borderColor: '#f9fafb' }}
                    >
                      <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: brandColor }} />
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 bg-gradient-to-br ${avatarGradient}`}>
                        {(mail.from?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate" style={{ color: '#1e293b' }}>{mail.from}</span>
                          {accountName && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: brandColor + '1a', color: brandColor }}>{accountName}</span>
                          )}
                        </div>
                        <div className="text-sm font-medium truncate mt-0.5" style={{ color: '#334155' }}>{mail.subject || '(无主题)'}</div>
                        <div className="text-xs truncate mt-0.5" style={{ color: '#94a3b8' }}>{mail.body_preview}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs whitespace-nowrap" style={{ color: '#94a3b8' }}>{timeStr}</span>
                      </div>
                    </a>
                  )
                })
              )}
            </div>

            <div className="col-span-2 bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#1e293b' }}>同步状态</h2>
              <div className="space-y-3">
                {accounts.length === 0 ? (
                  <div className="text-sm py-4 text-center" style={{ color: '#94a3b8' }}>暂无已配置账号</div>
                ) : (
                  accounts.map((a) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: a.brand_color || '#6366f1' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: '#1e293b' }}>{a.name || a.email}</div>
                        <div className="text-xs" style={{ color: '#94a3b8' }}>{a.use_idle ? 'IDLE · 实时监听中' : 'Poll · 5分钟轮询'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#34d399' }} />
                        <span className="text-xs font-medium" style={{ color: '#059669' }}>正常</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-4 border-t" style={{ borderColor: '#f3f4f6' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#64748b' }}>本地存储用量</span>
                  <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>{stats ? formatBytes(storageBytes) : '—'} / 50 GB</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${storagePct}%`, background: 'linear-gradient(to right, #3b82f6, #6366f1)' }} />
                </div>
                <div className="text-xs mt-1.5" style={{ color: '#94a3b8' }}>归档目录: /mnt/nas/lzmail/archives/</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
