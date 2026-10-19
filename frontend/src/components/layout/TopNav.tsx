'use client'
import { Search, getAccountAvatarBg } from '@/lib/icons'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import { Tooltip } from '@/components/Tooltip'
import { useIsMobile } from '@/hooks/useIsMobile'
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
  return (
    <img
      src="/logo.png"
      alt="懒猫微邮"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px`, display: 'block', flexShrink: 0 }}
    />
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
  const searchParams = useSearchParams()
  const { settings } = useSettings()
  const isMobile = useIsMobile()
  const [folderMenuOpen, setFolderMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [userAccount, setUserAccount] = useState<Account | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [inboxUnread, setInboxUnread] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)
  const navMenuRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  const searchString = searchParams.toString()
  const search = searchString ? `?${searchString}` : ''
  const fullPath = pathname + search
  const pageTitle = getPageTitle(fullPath)

  const showSearch = pathname === '/' || pathname === '/mail' || pathname === '/contacts'

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

  const handleNavClick = (href: string) => {
    setHasInteracted(true)
    const target = new URL(href, 'http://x')
    if (target.pathname === '/mail' && pathname === '/mail') {
      const targetFolder = target.searchParams.get('folder') || 'INBOX'
      const currentFolder = searchParams.get('folder') || 'INBOX'
      if (targetFolder === currentFolder) {
        window.dispatchEvent(new Event('lzmail:refresh-mail'))
      }
    }
    router.push(href)
  }

  const activeHref = navItems.find(item => isActive(item.href, fullPath))?.href

  const navMode = settings.nav_mode || 'topbar'
  const showDesktopTabs = !isMobile && (navMode === 'topbar' || navMode === 'top')
  // 侧边栏模式下左侧已有品牌区，顶栏不再重复显示 logo 与名称
  const hideBrand = !isMobile && navMode === 'sidebar'

  // 将滑动指示器定位到当前激活标签下方
  const updateIndicator = useCallback(() => {
    const menu = navMenuRef.current
    const ind = indicatorRef.current
    if (!menu || !ind) return
    const activeEl = menu.querySelector<HTMLElement>('.nav-tab.is-active')
    if (!activeEl) {
      ind.style.width = '0px'
      return
    }
    const menuRect = menu.getBoundingClientRect()
    const elRect = activeEl.getBoundingClientRect()
    ind.style.width = `${elRect.width}px`
    ind.style.transform = `translateX(${elRect.left - menuRect.left}px)`
  }, [])

  useEffect(() => {
    if (!showDesktopTabs) return
    const raf = requestAnimationFrame(updateIndicator)
    window.addEventListener('resize', updateIndicator)
    const menu = navMenuRef.current
    let ro: ResizeObserver | undefined
    if (menu && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateIndicator)
      ro.observe(menu)
    }
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', updateIndicator)
      ro?.disconnect()
    }
  }, [showDesktopTabs, activeHref, inboxUnread, isMobile, updateIndicator])

  return (
    <header
      className="px-3 sm:px-6"
      style={{
        height: 'calc(72px + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)',
        boxSizing: 'border-box',
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
        {!hideBrand && (
          <>
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
              className="hidden sm:block"
              style={{
                width: '2px',
                height: '20px',
                backgroundColor: 'var(--color-border)',
              }}
            ></div>
          </>
        )}
        <span
          className="hidden sm:inline"
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
        style={isMobile
          ? { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }
          : { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto', overflowY: 'hidden' }
        }
      >
        {isMobile ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setFolderMenuOpen(v => !v)}
              className="nav-btn"
              aria-label="邮件文件夹"
              aria-expanded={folderMenuOpen}
            >
              <i className="ri-folder-2-line icon"></i>
              {inboxUnread > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
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
            </button>
            {folderMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" style={{ backgroundColor: 'transparent' }} onClick={() => setFolderMenuOpen(false)} />
                <div
                  className="absolute z-50 nav-folder-dropdown"
                  style={{
                    top: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 224,
                    maxWidth: 'calc(100vw - 48px)',
                    backgroundColor: 'var(--color-bg-white)',
                    border: '1px solid var(--color-border-soft)',
                    borderRadius: 12,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {navItems.map(item => {
                    const active = isActive(item.href, fullPath)
                    return (
                      <button
                        key={item.href}
                        onClick={() => { setFolderMenuOpen(false); handleNavClick(item.href) }}
                        style={{
                          display: 'flex',
                          width: '100%',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 8,
                          backgroundColor: active ? 'var(--color-primary-soft)' : 'transparent',
                          color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-family-cn)',
                          fontSize: '13px',
                          fontWeight: active ? 500 : 400,
                          textAlign: 'left',
                        }}
                      >
                        <i
                          className={item.icon}
                          style={{ fontSize: '16px', width: '16px', height: '16px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        ></i>
                        <span className="truncate flex-1">{item.label}</span>
                        {item.href === '/mail?folder=INBOX' && inboxUnread > 0 && (
                          <span
                            style={{
                              minWidth: 18,
                              height: 18,
                              padding: '0 5px',
                              borderRadius: 9999,
                              backgroundColor: 'var(--color-primary)',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {inboxUnread > 99 ? '99+' : inboxUnread}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          showDesktopTabs ? (
            <div className="nav-menu" ref={navMenuRef}>
              <div ref={indicatorRef} className={`nav-indicator${hasInteracted ? ' has-interacted' : ''}`} />
              {navItems.map(item => {
                const active = isActive(item.href, fullPath)
                return (
                  <button
                    key={item.href}
                    data-nav={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`nav-tab${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span
                      style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}
                    >
                      <i
                        className={item.icon}
                        style={{
                          fontSize: '15px',
                          width: 15,
                          height: 15,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}
                      ></i>
                    </span>
                    <span
                      style={{ position: 'relative', zIndex: 1, fontSize: 12, lineHeight: 1.2 }}
                    >
                      {item.label}
                    </span>
                    {item.href === '/mail?folder=INBOX' && inboxUnread > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 5,
                          minWidth: 12,
                          height: 12,
                          padding: '0 3px',
                          borderRadius: 9999,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 8,
                          fontWeight: 700,
                          lineHeight: 1,
                          backgroundColor: 'var(--color-primary)',
                          color: '#ffffff',
                          zIndex: 1,
                        }}
                      >
                        {inboxUnread > 99 ? '99+' : inboxUnread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div />
          )
        )}
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
          <Tooltip text="设置" side="bottom">
            <button
              onClick={onOpenSettings}
              className="nav-btn"
              aria-label="设置"
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
          </Tooltip>
        )}

        {onOpenAddAccount && (
          <Tooltip text="添加账号" side="bottom">
            <button
              onClick={onOpenAddAccount}
              className="nav-btn"
              aria-label="添加账号"
            >
              <i className="ri-add-line icon"></i>
            </button>
          </Tooltip>
        )}

        {userAccount && (
          <div
            className="avatar-btn flex items-center justify-center cursor-pointer"
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
          >
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff' }}>{avatarText}</span>
          </div>
        )}
      </div>
    </header>
  )
}