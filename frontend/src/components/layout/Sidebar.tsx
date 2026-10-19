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
    const onHash = () => {
      setPathname(window.location.pathname)
      setSearchParams(new URLSearchParams(window.location.search))
    }
    window.addEventListener('popstate', onHash)
    return () => window.removeEventListener('popstate', onHash)
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
    <aside className="sidebar" style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-white)', borderRight: '0.7px solid var(--color-border-soft)' }}>
      {/* Logo */}
      <div
        style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, borderBottom: '0.7px solid var(--color-border-soft)', cursor: 'pointer' }}
        onClick={() => router.push('/')}
      >
        <img src="/logo.png" alt="懒猫微邮" style={{ width: 24, height: 24, display: 'block', flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          懒猫微邮
        </span>
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {sidebarItems.map(item => {
          const active = isActive(item.href, pathname, searchParams)
          const unreadBadge = item.href === '/mail?folder=INBOX' && inboxUnread > 0
          return (
            <button
              key={item.href}
              onClick={() => handleClick(item.href)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: active ? 'var(--color-primary-soft)' : 'transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-family-cn)',
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                textAlign: 'left',
                transition: 'background-color 150ms ease, color 150ms ease',
                position: 'relative',
              }}
            >
              <i className={item.icon} style={{ fontSize: 16, width: 16, height: 16, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.label}</span>
              {unreadBadge && (
                <span style={{
                  minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9999,
                  backgroundColor: 'var(--color-primary)', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {inboxUnread > 99 ? '99+' : inboxUnread}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ height: 44, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '0.7px solid var(--color-border-soft)', fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {unreadTotal > 0 ? `${unreadTotal} 封未读` : ''}
        </span>
      </div>
    </aside>
  )
}
