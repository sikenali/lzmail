'use client'
import { Search, Settings, User } from '@/lib/icons'
import { getAccountAvatarBg } from '@/lib/icons'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import type { Account } from '@/types'

function getInitials(name: string): string {
  const clean = name.replace(/@.*$/, '').replace(/[._-]/g, ' ').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] || name?.[0] || '?').toUpperCase()
}

export function Header({ onCompose }: { onCompose: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const { settings } = useSettings()
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [userAccount, setUserAccount] = useState<Account | null>(null)
  const accountsChannel = new BroadcastChannel('lzmail_accounts')

  useEffect(() => {
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

  const showSearch = pathname === '/' || pathname === '/mail' || pathname === '/contacts' || pathname.startsWith('/mail/')
  const showSettings = pathname !== '/settings'

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQ.trim()
    if (!q) return
    router.push(`/mail?q=${encodeURIComponent(q)}`)
  }

  // Avatar color: prefer brand_color, fall back to provider color
  const avatarBg = userAccount ? getAccountAvatarBg(userAccount) : (settings.accent_color || 'var(--primary)')
  const avatarText = userAccount
    ? getInitials(userAccount.name || userAccount.email)
    : 'LZ'

  return (
    <div className="flex items-center justify-between h-16 px-8 shrink-0" style={{ backgroundColor: 'var(--background)' }}>
      <div className="flex items-center gap-4 shrink-0" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#ffffff" />
            <polyline points="22,6 12,13 2,6" fill="none" stroke="var(--primary)" strokeWidth="2" />
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[22px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>LZMail</span>
          <span className="text-xs leading-none" style={{ color: 'var(--foreground-tertiary)' }}>Unofficial Web Client-懒猫微邮</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {showSettings && (
          <Link href="/settings" className="w-10 h-10 flex items-center justify-center rounded-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--muted)' }}>
            <Settings className="w-5 h-5" style={{ color: 'var(--foreground-secondary)' }} />
          </Link>
        )}

        {/* User avatar - uses account brand_color or accent color */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
          style={{ backgroundColor: avatarBg }}
          title={userAccount?.name || '未登录'}
          onClick={() => router.push('/settings?tab=account')}
        >
          {avatarText}
        </div>
      </div>
    </div>
  )
}
