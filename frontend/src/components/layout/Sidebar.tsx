'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Inbox, Star, Clock, Send, FileText, Trash2, Plus, Settings, Contact, Edit } from '@/lib/icons'
import { api } from '@/lib/api'
import type { Account } from '@/types'

const navItems = [
  { icon: LayoutDashboard, label: '仪表盘', href: '/', badgeKey: 'unread' },
  { icon: Inbox, label: '收件箱', href: '/mail', badgeKey: 'inbox_unread' },
  { icon: Star, label: '标星邮件', href: '/mail?folder=STARRED' },
  { icon: Clock, label: '稍后处理', href: '/mail?folder=DEFERRED' },
  { icon: Send, label: '已发送', href: '/mail?folder=Sent' },
  { icon: FileText, label: '草稿箱', href: '/mail?folder=Drafts', badgeKey: 'drafts', badgeStyle: 'gold' },
  { icon: Trash2, label: '垃圾邮件', href: '/mail?folder=SPAM' },
]

// Sidebar remounts on every route change; keep the pill's last position in module
// scope so a fresh mount can slide continuously from the previous nav item.
let lastSliderPos: { top: number; height: number } | null = null

export function Sidebar({ currentPath }: { currentPath: string }) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [syncStatus, setSyncStatus] = useState<Record<number, string>>({})
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [sliderPos, setSliderPos] = useState<{ top: number; height: number } | null>(lastSliderPos)

  useEffect(() => {
    api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {})
    api.mails.counts().then(d => setCounts(d ?? null)).catch(() => {})
    api.sync.status().then(d => setSyncStatus(d ?? {})).catch(() => {})
  }, [])

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
    const el = navRefs.current[activeIndex]
    if (!el) return
    const target = { top: el.offsetTop, height: el.offsetHeight }
    lastSliderPos = target
    setSliderPos(target)
  }, [activeIndex])

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: 24, paddingBottom: 24, paddingLeft: 16, paddingRight: 16, backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
      <div>
        <Link href="/compose"
          className="flex items-center justify-center gap-2 w-full h-[48px] rounded-[12px] text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)', paddingLeft: 20, paddingRight: 20 }}
        >
          <Edit className="w-[18px] h-[18px]" style={{ color: 'rgba(255,255,255,0.9)' }} />
          <span className="text-[15px] font-semibold">写邮件</span>
        </Link>
      </div>

      <div style={{ paddingTop: 24 }}>
        <div className="space-y-1" style={{ position: 'relative' }}>
          {sliderPos && (
            <div className="nav-slider" style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: sliderPos.height,
              backgroundColor: 'var(--primary-light)',
              borderRadius: 8,
              transform: `translateY(${sliderPos.top}px)`,
              transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
              pointerEvents: 'none',
            }} />
          )}
          {navItems.map((item, i) => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                ref={el => { navRefs.current[i] = el }}
                className="flex items-center gap-2 rounded-[8px] transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  padding: '12px 16px',
                }}
              >
                <item.icon className="w-[20px] h-[20px] shrink-0" style={{ color: active ? 'var(--primary)' : 'var(--foreground-secondary)' }} />
                <span className="flex-1 text-[14px]" style={{
                  color: active ? 'var(--primary)' : 'var(--foreground)',
                  fontWeight: active ? '600' : '500',
                }}>{item.label}</span>
                {item.badgeKey && counts && counts[item.badgeKey] > 0 && (
                  <span className="h-[22px] min-w-[22px] px-1.5 rounded-full flex items-center justify-center text-[11px]"
                    style={{
                      backgroundColor: item.badgeStyle === 'gold' ? 'var(--muted)' : 'var(--primary)',
                      color: item.badgeStyle === 'gold' ? 'var(--foreground-secondary)' : '#fff',
                      fontWeight: item.badgeStyle === 'gold' ? '500' : '600',
                    }}
                  >{counts[item.badgeKey]}</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

  <div className="mx-4" style={{ marginTop: 16, marginBottom: 0, height: 1, backgroundColor: 'var(--sidebar-border)' }} />

      <div className="space-y-1" style={{ paddingTop: 16 }}>
        {[
          { icon: Contact, label: '联系人', href: '/contacts' },
          { icon: Settings, label: '设置', href: '/settings' },
        ].map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2 rounded-[8px] transition-colors"
              style={{ padding: '12px 16px', backgroundColor: active ? 'var(--primary-light)' : 'transparent' }}
            >
              <item.icon className="w-[20px] h-[20px] shrink-0" style={{ color: active ? 'var(--primary)' : 'var(--foreground-secondary)' }} />
              <span className="flex-1 text-[14px]" style={{
                color: active ? 'var(--primary)' : 'var(--foreground)',
                fontWeight: active ? '600' : '500',
              }}>{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="mx-4" style={{ marginTop: 16, marginBottom: 0, height: 1, backgroundColor: 'var(--sidebar-border)' }} />

      <div className="flex-1 overflow-auto" style={{ paddingTop: 16, paddingLeft: 16, paddingRight: 16 }}>
        <div className="text-[11px] font-semibold" style={{ color: 'var(--muted-foreground)', padding: '0 16px' }}>邮箱账号</div>
        <div style={{ paddingTop: 16 }} className="space-y-1">
          {accounts.map((a) => {
            const ac = a.brand_color || '#ea4335'
            const syncState = syncStatus[a.id]
            const dotColor = syncState === 'syncing' ? 'var(--gold)' : syncState === 'error' ? 'var(--danger)' : 'var(--success)'
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
      </div>
    </div>
  )
}
