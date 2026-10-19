'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'

type SidebarItem = {
  label: string
  href: string
  icon: string
}

const sidebarItems: SidebarItem[] = [
  { label: '收件箱',   href: '/mail?folder=INBOX',      icon: 'ri-inbox-line' },
  { label: '标星邮件', href: '/mail?folder=STARRED',    icon: 'ri-star-line' },
  { label: '稍后处理', href: '/mail?folder=DEFERRED',   icon: 'ri-time-line' },
  { label: '已发送',   href: '/mail?folder=Sent',       icon: 'ri-send-plane-line' },
  { label: '草稿箱',   href: '/mail?folder=Drafts',     icon: 'ri-draft-line' },
  { label: '已删除',   href: '/mail?folder=Trash',      icon: 'ri-delete-bin-line' },
  { label: '垃圾邮件', href: '/mail?folder=SPAM',       icon: 'ri-alert-line' },
]

function isActive(href: string, currentPathname: string, currentSearchParams: URLSearchParams): boolean {
  if (currentPathname === href) return true
  if (href.startsWith('/mail') && currentPathname.startsWith('/mail')) {
    const hFolder = new URL(href, 'http://x').searchParams.get('folder')
    const cFolder = currentSearchParams.get('folder')
    if (hFolder && cFolder && hFolder === cFolder) return true
    if (!hFolder && !cFolder) return true
  }
  return false
}

export function Sidebar() {
  const router = useRouter()
  const [inboxUnread, setInboxUnread] = useState(0)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [pathname, setPathname] = useState('')
  const [searchParams, setSearchParams] = useState(new URLSearchParams())

  useEffect(() => {
    setPathname(window.location.pathname)
    setSearchParams(new URLSearchParams(window.location.search))
    const onPop = () => {
      setPathname(window.location.pathname)
      setSearchParams(new URLSearchParams(window.location.search))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const fetchCounts = useCallback(() => {
    api.mails.counts().then(d => {
      if (d) {
        setInboxUnread(d.inbox_unread ?? 0)
        setUnreadTotal(d.unread ?? 0)
      }
    }).catch(() => {})
  }, [])

  useSSE(fetchCounts, fetchCounts)
  useEffect(() => { fetchCounts() }, [fetchCounts])

  const handleClick = (href: string) => {
    router.push(href)
  }

  return (
    <aside className="sidebar" style={{ width: 76, flexShrink: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-white)', borderRight: '0.7px solid var(--color-border-soft)' }}>
      {/* Logo */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0 10px' }}>
        <button
          title="首页"
          onClick={() => router.push('/')}
          style={{
            width: 40, height: 40, borderRadius: 12,
            border: 'none', cursor: 'pointer',
            backgroundColor: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-primary-soft)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <img src="/logo.png" alt="懒猫微邮" style={{ width: 22, height: 22, display: 'block', opacity: 0.85 }} />
        </button>
      </div>

      {/* Nav items — rail style */}
      <nav style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, overflowY: 'auto', padding: '0 6px' }}>
        {sidebarItems.map(item => {
          const active = isActive(item.href, pathname, searchParams)
          const unreadBadge = item.href === '/mail?folder=INBOX' && inboxUnread > 0
          return (
            <button
              key={item.href}
              onClick={() => handleClick(item.href)}
              title={item.label}
              style={{
                width: 56,
                padding: '10px 0 8px',
                borderRadius: 14,
                border: 'none',
                backgroundColor: active ? 'var(--color-primary-soft)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                transition: 'background-color 0.2s ease',
                position: 'relative',
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--color-primary-soft)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <i className={item.icon} style={{ fontSize: 22, width: 22, height: 22, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)', transition: 'color 0.2s ease' }} />
              <span style={{ fontSize: 11, lineHeight: '1.2', color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)', whiteSpace: 'nowrap', fontWeight: active ? 500 : 400, transition: 'color 0.2s ease' }}>{item.label}</span>
              {unreadBadge && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  minWidth: 16, height: 16, padding: '0 4px', borderRadius: 9999,
                  backgroundColor: 'var(--color-primary)', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {inboxUnread > 99 ? '99+' : inboxUnread}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0 14px' }}>
        <span style={{
          fontSize: 10.5, lineHeight: '1.2', color: 'var(--color-text-muted)',
          whiteSpace: 'nowrap', cursor: 'default',
          fontFamily: 'var(--font-family-cn)',
        }}>
          {unreadTotal > 0 ? `${unreadTotal} 未读` : ''}
        </span>
      </div>
    </aside>
  )
}
