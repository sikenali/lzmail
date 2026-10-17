'use client'
import { Search, getAccountAvatarBg } from '@/lib/icons'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import type { Account } from '@/types'

type NavItem = {
  label: string
  href: string
  icon: string
}

const navItems: NavItem[] = [
  { label: '收件箱', href: '/mail?folder=INBOX', icon: 'ri-inbox-line' },
  { label: '标星邮件', href: '/mail?folder=STARRED', icon: 'ri-star-line' },
  { label: '稍后处理', href: '/mail?folder=DEFERRED', icon: 'ri-time-line' },
  { label: '已发送', href: '/mail?folder=Sent', icon: 'ri-send-plane-line' },
  { label: '草稿箱', href: '/mail?folder=Drafts', icon: 'ri-draft-line' },
  { label: '已删除', href: '/mail?folder=Trash', icon: 'ri-delete-bin-line' },
  { label: '垃圾邮件', href: '/mail?folder=SPAM', icon: 'ri-alert-line' },
]

function getInitials(name: string): string {
  const clean = name.replace(/@.*$/, '').replace(/[._-]/g, ' ').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] || name?.[0] || '?').toUpperCase()
}

function isActive(href: string, current: string): boolean {
  if (current === href) return true
  if (href.startsWith('/mail') && current.startsWith('/mail')) {
    try {
      const hFolder = new URL(href, 'http://x').searchParams.get('folder')
      const cFolder = new URL(current, 'http://x').searchParams.get('folder')
      if (hFolder && cFolder && hFolder === cFolder) return true
      if (!hFolder && !cFolder) return true
    } catch { return false }
  }
  return false
}

function getPageTitle(path: string): string {
  if (path.startsWith('/mail?folder=INBOX') || path === '/mail?folder=INBOX') return '收件箱'
  if (path.startsWith('/mail?folder=STARRED')) return '标星邮件'
  if (path.startsWith('/mail?folder=DEFERRED')) return '稍后处理'
  if (path.startsWith('/mail?folder=Sent')) return '已发送'
  if (path.startsWith('/mail?folder=Drafts')) return '草稿箱'
  if (path.startsWith('/mail?folder=Trash')) return '已删除'
  if (path.startsWith('/mail?folder=SPAM')) return '垃圾邮件'
  if (path.startsWith('/mail')) return '邮件'
  if (path.startsWith('/contacts')) return '联系人'
  if (path.startsWith('/compose')) return '写邮件'
  if (path.startsWith('/settings')) return '设置'
  if (path === '/') return '仪表盘'
  return ''
}

function LogoIcon({ size = 26 }: { size?: number }) {
  const svgSize = size === 26 ? 14 : 12
  return (
    <div
      className="rounded-lg flex items-center justify-center"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: 'var(--color-primary)',
      }}
    >
      <svg viewBox="0 0 24 24" style={{ width: `${svgSize}px`, height: `${svgSize}px` }}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#ffffff" />
        <polyline points="22,6 12,13 2,6" fill="none" stroke="white" strokeWidth="2" />
      </svg>
    </div>
  )
}

export function TopNav({
  onOpenSettings,
  onOpenAddAccount,
}: {
  onOpenSettings?: () => void
  onOpenAddAccount?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { settings } = useSettings()
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [userAccount, setUserAccount] = useState<Account | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [inboxUnread, setInboxUnread] = useState(0)
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSearch(window.location.search)
  }, [pathname])

  const fullPath = pathname + search
  const pageTitle = getPageTitle(fullPath)

  const showSearch = pathname === '/' || pathname === '/mail' || pathname === '/contacts' || pathname.includes('?id=')

  useEffect(() => {
    const accountsChannel = new BroadcastChannel('lzmail_accounts')
    const fetch = () => {
      api.accounts.list().then(d => {
        if (d && d.length > 0) setUserAccount(d[0])
      }).catch(() => {})
    }
    fetch()
    accountsChannel.addEventListener('message', (e) => {
      if (e.data?.type === 'accounts:updated') fetch()
    })
    return () => accountsChannel.close()
  }, [])

  const fetchCounts = useCallback(() => {
    api.mails.counts().then(d => {
      if (d) {
        setUnreadCount(d.unread ?? 0)
        setInboxUnread(d.inbox_unread ?? 0)
      }
    }).catch(() => {})
  }, [])

  useSSE(fetchCounts, fetchCounts)
  useEffect(() => { fetchCounts() }, [])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQ.trim()
    if (!q) return
    router.push(`/mail?q=${encodeURIComponent(q)}`)
  }

  const avatarBg = userAccount ? getAccountAvatarBg(userAccount) : (settings.accent_color || 'var(--color-primary)')
  const avatarText = userAccount
    ? getInitials(userAccount.name || userAccount.email)
    : 'LZ'

  return (
    <header
      style={{
        height: '72px',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--color-bg-white)',
        borderBottom: '0.7px solid var(--color-border-soft)',
        flexShrink: 0,
      }}
    >
      <div
        className="nav-left"
        onClick={() => router.push('/')}
      >
        <LogoIcon size={26} />
        <span
          className="brand-cn"
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family-cn)',
            lineHeight: 1.2,
            transition: 'color var(--transition-base)',
          }}
        >
          懒猫微邮
        </span>
        <div
          style={{
            width: '2px',
            height: '20px',
            backgroundColor: 'var(--color-border)',
          }}
        ></div>
        <span
          style={{
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-family-cn)',
            lineHeight: 1.2,
          }}
        >
          {pageTitle}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          {navItems.map(item => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: isActive(item.href, fullPath) ? 'var(--color-primary-soft)' : 'transparent',
                color: isActive(item.href, fullPath) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-family-cn)',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all var(--transition-base)',
              }}
              title={item.label}
            >
              <div style={{ position: 'relative' }}>
                <i
                  className={item.icon}
                  style={{
                    fontSize: '16px',
                    width: '16px',
                    height: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                ></i>
                {item.href === '/mail?folder=INBOX' && inboxUnread > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-8px',
                      minWidth: '16px',
                      height: '16px',
                      padding: '0 2px',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 700,
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                    }}
                  >
                    {inboxUnread > 99 ? '99+' : inboxUnread}
                  </span>
                )}
              </div>
              <span className="truncate hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        {showSearch && (
          <form
            onSubmit={submitSearch}
            className="hidden md:flex items-center relative"
            style={{ marginRight: '4px' }}
          >
            <Search
              className="absolute"
              style={{
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '14px',
                height: '14px',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              ref={searchInputRef}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                height: '32px',
                paddingLeft: '30px',
                paddingRight: '12px',
                width: '160px',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '13px',
                backgroundColor: searchFocused ? 'var(--color-bg-white)' : 'var(--color-bg-secondary)',
                border: `0.7px solid ${searchFocused ? 'var(--color-primary)' : 'var(--color-border)'}`,
                color: 'var(--color-text-primary)',
                transition: 'all var(--transition-base)',
                fontFamily: 'var(--font-family-cn)',
              }}
              placeholder="搜索邮件..."
            />
          </form>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="nav-btn"
            title="设置"
          >
            <i className="ri-settings-3-line icon"></i>
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 2px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-error)',
                  color: '#ffffff',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}

        {onOpenAddAccount && (
          <button
            onClick={onOpenAddAccount}
            className="nav-btn"
            title="添加账号"
          >
            <i className="ri-add-line icon"></i>
          </button>
        )}

        {userAccount && (
          <div
            className="flex items-center justify-center cursor-pointer"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: avatarBg,
              transition: 'opacity var(--transition-base)',
              flexShrink: 0,
            }}
            title={userAccount.name || userAccount.email}
            onClick={() => onOpenSettings?.()}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff' }}>{avatarText}</span>
          </div>
        )}
      </div>
    </header>
  )
}