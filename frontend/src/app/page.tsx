'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import {
  Mail, MailOpen, Send, RefreshCw,
  ChevronRight, getAccountAvatarBg, Contact
} from '@/lib/icons'
import { DateTimePicker } from '@/components/DateTimePicker'
import type { MailStats, Email, Account } from '@/types'

const TrendChart = dynamic(() => import('./TrendChart'), { ssr: false })

import { formatBytes, formatNumber } from '@/lib/format'

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
  const syncingCount = accounts.filter(a => syncStatus[a.id] === 'syncing').length
  const errorCount = accounts.filter(a => syncStatus[a.id] === 'error').length
  const statusText = syncingCount > 0 ? `同步中 ${syncingCount}` : errorCount > 0 ? `异常 ${errorCount}` : '运行正常'
  const statusClass = syncingCount > 0 ? 'warning' : errorCount > 0 ? 'failed' : ''

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-card)',
    boxShadow: 'var(--shadow-md)',
    border: '0.6px solid var(--color-border)',
    borderRadius: '14px',
  }

  const statCards = [
    { icon: Mail, statClass: 'stat-success', label: '总邮件数' },
    { icon: MailOpen, statClass: 'stat-warning', label: '未读邮件' },
    { icon: Send, statClass: 'stat-info', label: '已发送' },
    { icon: Contact, statClass: 'stat-success', label: '联系人' },
  ]
  const statValues = [
    formatNumber(totalEmails),
    formatNumber(unreadEmails),
    formatNumber(todaySent),
    formatNumber(contactCount),
  ]

  return (
    <AppShell>
      <div className="workspace-page">
        {/* §4.1 结果页标题行（复用 lzc2vsdx ResultView） */}
        <div className="result-title-row">
          <div className="title-left">
            <h1>仪表盘</h1>
            {accounts.length > 0 && (
              <span className={`status-pill ${statusClass}`}>
                <i className={syncingCount > 0 ? 'ri-loader-4-line' : errorCount > 0 ? 'ri-error-warning-line' : 'ri-checkbox-circle-line'} />
                {statusText}
              </span>
            )}
          </div>
          <div className="title-actions">
            <button
              className="soft-action"
              onClick={() => setRefresh(n => n + 1)}
              title="刷新概览"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
            <DateTimePicker value={selectedDate} onChange={setSelectedDate} />
          </div>
        </div>

        {/* §4.4 统计卡（复用 lzc2vsdx ResultView 结构） */}
        <div className="stats-row">
          {statCards.map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className={`stat-card ${card.statClass}`}>
                <div className="stat-texts">
                  <strong>{statValues[i]}</strong>
                  <span>{card.label}</span>
                </div>
                <Icon className="stat-icon" />
              </div>
            )
          })}
        </div>

        {/* lzc2vsdx 工作区双栏：左列操作面板 + 右列预览卡片 */}
        <div className="workspace-columns">
          {/* 左列：账号同步 / 本地存储 */}
          <div className="left-column">
            <section className="card panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <span className="title-bar" />
                <span className="title-text">账号同步</span>
                <span className="title-desc">实时状态</span>
              </div>
              <div className="type-list">
                {accounts.length === 0 ? (
                  <div className="type-card" style={{ cursor: 'default' }}>
                    <span className="type-icon" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
                      <i className="ri-user-add-line" />
                    </span>
                    <span className="type-texts">
                      <span className="type-title">暂无已配置账号</span>
                      <span className="type-desc">在设置中心添加邮箱账号</span>
                    </span>
                  </div>
                ) : accounts.map((a) => {
                  const ac = getAccountAvatarBg(a)
                  const syncState = syncStatus[a.id]
                  const prog = syncProgress[a.id]
                  const syncing = syncState === 'syncing'
                  const syncErr = syncState === 'error'
                  const modeLabel = prog?.mode === 'poll' ? 'Poll · 1分钟' : 'IDLE · 实时'
                  return (
                    <div key={a.id} className="type-card" style={{ cursor: 'default' }}>
                      <span className="type-icon" style={{ background: ac, color: '#fff', fontWeight: 700, fontSize: 14 }}>
                        {(a.name || a.email)?.[0]?.toUpperCase() || '?'}
                      </span>
                      <span className="type-texts">
                        <span className="type-title">{a.name || a.email}</span>
                        <span className="type-desc">{a.email} · {modeLabel}</span>
                      </span>
                      <span className={`status-pill ${syncErr ? 'failed' : syncing ? 'warning' : ''}`} style={{ flexShrink: 0 }}>
                        <i className={syncing ? 'ri-loader-4-line' : syncErr ? 'ri-error-warning-line' : 'ri-checkbox-circle-line'} />
                        {syncing ? '同步中' : syncErr ? '异常' : '在线'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="card panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <span className="title-bar" style={{ background: 'var(--brand-gold-strong)', boxShadow: '0 0 6px color-mix(in srgb, var(--brand-gold-strong) 45%, transparent)' }} />
                <span className="title-text">本地存储</span>
                <span className="title-desc">附件占用</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>附件已用</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{formatBytes(storageBytes)} / {formatBytes(storageCap)}</span>
              </div>
              <div style={{ height: 8, borderRadius: 9999, overflow: 'hidden', marginTop: 8, background: 'var(--color-bg-secondary)' }}>
                <div style={{ height: '100%', width: `${storagePct}%`, background: 'var(--brand-gold-strong)', borderRadius: 9999, transition: 'width var(--t-base) ease' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div className="tech-panel" style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>容量上限</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{formatBytes(storageCap)}</div>
                </div>
                <div className="tech-panel" style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>剩余空间</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{formatBytes(Math.max(0, storageCap - storageBytes))}</div>
                </div>
              </div>
            </section>
          </div>

          {/* 右列：最近邮件 / 邮件趋势 */}
          <div className="right-column">
            <section className="card preview-card">
              <div className="preview-header">
                <div className="preview-title-left">
                  <span className="title-bar" />
                  <span className="title-text">最近邮件</span>
                  <span className="title-desc">最新 5 封</span>
                </div>
                <Link href="/mail" className="soft-action filled">
                  查看全部 <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div style={{ marginTop: 12, maxHeight: 168, overflowY: 'auto' }}>
                {loading ? (
                  <div className="text-center py-6 sm:py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
                ) : recentEmails.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>暂无邮件</div>
                ) : recentEmails.map((mail) => {
                  const bc = mail.account_brand || '#00D4AA'
                  const accentColor = bc.startsWith('#') ? bc : '#00D4AA'
                  const date = new Date(mail.date)
                  const isToday = new Date().toDateString() === date.toDateString()
                  const pad = (n: number) => String(n).padStart(2, '0')
                  const timeStr = isToday
                    ? `${pad(date.getHours())}:${pad(date.getMinutes())}`
                    : `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`
                  return (
                    <a key={mail.id} href={`/mail?id=${mail.id}`}
                      className="flex items-center gap-3 sm:gap-4 py-3 transition-colors cursor-pointer group"
                      style={{ borderTop: '0.6px solid var(--color-border-soft)' }}
                    >
                      <div className="w-[3px] h-[34px] rounded-[2px] shrink-0" style={{ backgroundColor: accentColor }} />
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                        style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 14%, transparent)`, color: accentColor, boxShadow: `inset 0 0 0 0.6px color-mix(in srgb, ${accentColor} 28%, transparent)` }}
                      >
                        {(mail.from?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 sm:gap-3">
                          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>{mail.subject || '(无主题)'}</span>
                          <span className="shrink-0 text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{timeStr}</span>
                        </div>
                        <div className="text-[12px] truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{mail.body_preview}</div>
                      </div>
                      {!mail.is_read && (
                        <span className="w-[8px] h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--tech-cyan)', boxShadow: '0 0 8px rgba(var(--tech-cyan-rgb), 0.55)' }} />
                      )}
                    </a>
                  )
                })}
              </div>
            </section>

            <section className="card preview-card">
              <div className="preview-header">
                <div className="preview-title-left">
                  <span className="title-bar" />
                  <span className="title-text">邮件趋势（近{trendDays}天）</span>
                  <span className="title-desc">接收 / 发送</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                    <span style={{ width: 13, height: 3, borderRadius: 2, background: 'var(--tech-cyan)' }} />接收
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                    <span style={{ width: 13, height: 3, borderRadius: 2, background: 'var(--color-success)' }} />发送
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {[7, 14, 30].map((days) => (
                      <button
                        key={days}
                        onClick={() => setTrendDays(days)}
                        style={{
                          height: 26,
                          padding: '0 10px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 500,
                          backgroundColor: trendDays === days ? 'var(--tech-cyan)' : 'var(--color-bg-secondary)',
                          color: trendDays === days ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                          border: trendDays === days ? 'none' : '0.6px solid var(--color-border-soft)',
                          cursor: 'pointer',
                          boxShadow: trendDays === days ? '0 0 12px rgba(var(--tech-cyan-rgb), 0.28)' : 'none',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {days}天
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-40" style={{ marginTop: 12 }}>
                <TrendChart data={trendData} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
