'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LayoutDashboard, Inbox, Star, Clock, Send, FileText, Trash2, AlertTriangle, Plus, Edit, getAccountAvatarBg } from '@/lib/icons'
import { NavSlider } from '@/components/layout/NavSlider'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import { useSettings } from '@/hooks/useSettings'
import { toast } from 'sonner'
import type { Account } from '@/types'
import type { SyncStatusData } from '@/hooks/useSSE'

type NavItem = {
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>
  label: string
  href: string
  badgeKey?: string
  badgeStyle?: string
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: '仪表盘', href: '/', badgeKey: 'unread' },
  { icon: Inbox, label: '收件箱', href: '/mail', badgeKey: 'inbox_unread' },
  { icon: Star, label: '标星邮件', href: '/mail?folder=STARRED', badgeKey: 'starred' },
  { icon: Clock, label: '稍后处理', href: '/mail?folder=DEFERRED' },
  { icon: Send, label: '已发送', href: '/mail?folder=Sent' },
  { icon: FileText, label: '草稿箱', href: '/mail?folder=Drafts', badgeKey: 'drafts', badgeStyle: 'gold' },
  { icon: Trash2, label: '已删除', href: '/mail?folder=Trash', badgeKey: 'trash' },
  { icon: AlertTriangle, label: '垃圾邮件', href: '/mail?folder=SPAM' },
]

export function Sidebar({ currentPath }: { currentPath: string }) {
  const router = useRouter()
  const { settings } = useSettings()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [syncStatus, setSyncStatus] = useState<Record<number, string>>({})
  // error 进入时间，用于过滤短暂抖动
  const [errorSince, setErrorSince] = useState<Record<number, number>>({})
  const [syncProgress, setSyncProgress] = useState<SyncStatusData | null>(null)
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const lastSliderPosRef = useRef<{ top: number; height: number } | null>(null)
  const [sliderPos, setSliderPos] = useState<{ top: number; height: number } | null>(lastSliderPosRef.current)
  const [pressing, setPressing] = useState<number | null>(null)
  const animationsEnabled = (settings.animations || 'true') === 'true'

  useEffect(() => {
    api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {})
    api.mails.counts().then(d => setCounts(d ?? null)).catch(() => {})
    api.sync.status().then(d => setSyncStatus(d ?? {})).catch(() => {})
  }, [])

  // 账号列表变化时（添加/删除），重新获取同步状态
  useEffect(() => {
    if (accounts.length > 0) {
      api.sync.status().then(d => setSyncStatus(d ?? {})).catch(() => {})
    }
  }, [accounts])

  const refreshCounts = useCallback(async () => {
    try {
      const d = await api.mails.counts()
      setCounts(d ?? null)
    } catch {}
  }, [])

  useSSE(
    () => {
      refreshCounts()
      toast('📬 收到新邮件', { description: '邮件列表已自动刷新' })
    },
    refreshCounts,
    (data: SyncStatusData) => {
      if (!data.account_id) return
      const id = Number(data.account_id)
      setSyncStatus(prev => ({ ...prev, [id]: data.status }))
      if (data.status === 'syncing') setSyncProgress(data)
      else setSyncProgress(null)
      if (data.status === 'error') {
        setErrorSince(prev => prev[id] ? prev : { ...prev, [id]: Date.now() })
      } else if (data.status === 'ok') {
        setErrorSince(prev => { const n = { ...prev }; delete n[id]; return n })
      }
      refreshCounts()
    },
  )

  const isActive = (href: string) => {
    if (currentPath === href) return true
    if (href.startsWith('/mail') && currentPath?.startsWith('/mail')) {
      const getFolder = (p: string) => {
        try { return new URL(p, 'http://x').searchParams.get('folder') } catch { return null }
      }
      const hFolder = getFolder(href)
      const cFolder = getFolder(currentPath)
      if (hFolder && cFolder && hFolder === cFolder) return true
      if (!hFolder && !cFolder) return true
    }
    return false
  }

  const activeIndex = navItems.findIndex(item => isActive(item.href))

    // Highlight pill: on a fresh mount it starts where the previous route's pill
  // was, then this effect runs AFTER the browser paints that old position, so
  // the transform transition glides it to the current nav item. On the first
  // ever load there is no previous position, so it just appears.
  useEffect(() => {
    if (activeIndex < 0) {
      setSliderPos(null)
      lastSliderPosRef.current = null
      return
    }
    const el = navRefs.current[activeIndex]
    if (!el) return
    const target = { top: el.offsetTop, height: el.offsetHeight }
    lastSliderPosRef.current = target
    setSliderPos(target)
  }, [activeIndex])

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: 24, paddingBottom: 24, paddingLeft: 16, paddingRight: 16, backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
      <div>
        <Link href="/compose"
          className="flex items-center justify-center gap-2 w-full h-[48px] rounded-[12px] transition-opacity hover:brightness-110"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          <Edit className="w-[18px] h-[18px]" style={{ color: 'rgba(255,255,255,0.9)' }} />
          <span className="text-[15px] font-semibold">写邮件</span>
        </Link>
      </div>

      <div style={{ paddingTop: 24 }}>
        <div className="space-y-1" style={{ position: 'relative' }}>
          {(() => {
            const activeEl = navRefs.current[activeIndex]
            const pressedEl = pressing !== null ? navRefs.current[pressing] : null
            const pressedHeight = pressedEl ? Math.max(44, pressedEl.offsetHeight - 4) : null
            if (activeIndex < 0) return null
            return (
              <NavSlider
                enabled={animationsEnabled}
                top={sliderPos ? sliderPos.top : 0}
                height={sliderPos ? sliderPos.height : 44}
                pressedHeight={pressedHeight}
                className="left-0 right-0"
                backgroundColor="var(--primary)"
                borderRadius={8}
              />
            )
          })()}
          {navItems.map((item, i) => {
            const active = isActive(item.href)
            const isPressed = pressing === i
            return (
              <Link key={item.href} href={item.href} prefetch={false}
                ref={el => { navRefs.current[i] = el }}
                onMouseDown={() => setPressing(i)}
                onMouseUp={() => setPressing(null)}
                onMouseLeave={() => setPressing(null)}
                className="flex items-center gap-2 rounded-[8px] transition-colors relative z-10"
                style={{
                  backgroundColor: 'transparent',
                  padding: '12px 16px',
                }}
              >
                  {animationsEnabled ? (
                    <motion.span
                      animate={isPressed ? { scale: [1, 0.85, 1.05, 1], rotate: [0, -5, 5, 0] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <item.icon className="w-[20px] h-[20px] shrink-0" style={{ color: active ? '#ffffff' : 'var(--foreground-tertiary)' }} />
                    </motion.span>
                  ) : (
                    <span style={{ display: 'inline-flex' }}>
                      <item.icon className="w-[20px] h-[20px] shrink-0" style={{ color: active ? '#ffffff' : 'var(--foreground-tertiary)' }} />
                    </span>
                  )}
                  <span className="flex-1 text-[14px]" style={{
                    color: active ? '#ffffff' : 'var(--foreground)',
                    fontWeight: active ? '600' : '500',
                  }}>{item.label}</span>
                {item.badgeKey && counts && counts[item.badgeKey] > 0 && (
                  <span className="h-[22px] min-w-[22px] px-1.5 rounded-full flex items-center justify-center text-[11px]"
                    style={{
                      backgroundColor: item.badgeStyle === 'gold'
                        ? (active ? 'var(--gold)' : 'var(--muted)')
                        : (active ? '#ffffff' : 'var(--primary)'),
                      color: item.badgeStyle === 'gold'
                        ? (active ? 'var(--primary)' : 'var(--foreground-secondary)')
                        : (active ? 'var(--primary)' : '#fff'),
                      fontWeight: item.badgeStyle === 'gold' ? '500' : '600',
                    }}
                  >{counts[item.badgeKey]}</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

        <div className="flex-1 overflow-auto" style={{ paddingTop: 16, paddingLeft: 16, paddingRight: 16 }}>
        {accounts.length > 0 && (
          <>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--muted-foreground)', padding: '0 16px' }}>邮箱账号</div>
            <div style={{ paddingTop: 16 }} className="space-y-1">
              {accounts.map((a) => {
            const ac = getAccountAvatarBg(a)
            const syncState = syncStatus[a.id]
            // error 持续超过 30 秒才视为真正的异常
            const ERROR_GRACE_MS = 30_000
            const isError = syncState === 'error' && (!errorSince[a.id] || (Date.now() - errorSince[a.id]) > ERROR_GRACE_MS)
            const dotColor = syncState === 'syncing' ? 'var(--gold)' : isError ? 'var(--danger)' : 'var(--success)'
            return (
              <div key={a.id}
                className="flex items-center gap-2 rounded-[8px] transition-colors cursor-pointer"
                style={{ padding: '8px 16px', backgroundColor: 'transparent' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: ac }}>
                  {(a.name || a.email)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--foreground)' }}>{a.name || a.email}</div>
                  <div className="text-[11px] leading-tight truncate mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{a.email}</div>
                </div>
                <div className="w-[9px] h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
              </div>
            )
          })}
          <a href="#"
            className="flex items-center gap-2 rounded-[8px] transition-colors cursor-pointer"
            style={{ padding: '8px 16px', backgroundColor: 'transparent' }}
            onClick={(e) => { e.preventDefault(); router.push('/settings?tab=account') }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ border: '0.7px dashed var(--gold)' }}
            >
              <Plus className="w-[18px] h-[18px]" style={{ color: 'var(--gold)' }} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--gold)' }}>添加账号</span>
          </a>
          </div>
          </>
        )}
        {/* 同步进度条 */}
        {syncProgress && syncProgress.status === 'syncing' && syncProgress.total && syncProgress.total > 0 && (
          <div className="mt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--accent)' }}>
            <div className="flex items-center gap-2">
              <div className="w-[8px] h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--gold)' }} />
              <span className="text-[11px] font-medium truncate" style={{ color: 'var(--foreground-secondary)' }}>
                {syncProgress.folder ? `同步 ${syncProgress.folder}` : '同步中'}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
              <div className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${Math.min(100, Math.round((syncProgress.processed || 0) / syncProgress.total * 100))}%`, backgroundColor: 'var(--gold)' }}
              />
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {syncProgress.processed}/{syncProgress.total} 封
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
