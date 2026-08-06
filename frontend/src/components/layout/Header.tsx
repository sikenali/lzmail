'use client'
import { Search, Settings } from '@/lib/icons'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useSSE } from '@/hooks/useSSE'

export function Header({ onCompose }: { onCompose: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'ok' | 'error'>('ok')

  useSSE(undefined, undefined, (status) => {
    if (status === 'syncing') setSyncStatus('syncing')
    else if (status === 'error') setSyncStatus('error')
    else setSyncStatus('ok')
  })

  const showSearch = pathname === '/' || pathname === '/mail' || pathname === '/contacts' || pathname.startsWith('/mail/')
  const showSync = pathname !== '/contacts'
  const showSettings = pathname !== '/settings'

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQ.trim()
    if (!q) return
    router.push(`/mail?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="flex items-center justify-between h-16 px-8 shrink-0" style={{ backgroundColor: 'var(--background)' }}>
      <div className="flex items-center gap-4 shrink-0" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#ffffff" />
            <polyline points="22,6 12,13 2,6" fill="none" stroke="#c43d3d" strokeWidth="2" />
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[22px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>LZMail</span>
          <span className="text-xs leading-none" style={{ color: 'var(--foreground-tertiary)' }}>懒猫微服</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {showSearch && (
          <form onSubmit={submitSearch} className="relative w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px]" style={{ color: 'var(--foreground-tertiary)' }} />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="w-full h-10 pl-11 pr-4 rounded-lg outline-none text-sm"
              style={{
                backgroundColor: 'var(--muted)',
                border: '0.7px solid var(--card-border)',
                color: 'var(--foreground)',
              }}
              placeholder="搜索邮件、联系人..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </form>
        )}

        {showSync && (
          <div className="flex items-center gap-2 px-3 h-8 rounded-lg" style={{ backgroundColor: syncStatus === 'ok' ? 'var(--success-bg)' : syncStatus === 'error' ? 'var(--danger-bg)' : 'var(--accent)' }}>
            <div className="w-[9px] h-2 rounded-full" style={{ backgroundColor: syncStatus === 'ok' ? 'var(--success)' : syncStatus === 'error' ? 'var(--danger)' : 'var(--gold)' }} />
            <span className="text-xs font-medium" style={{ color: syncStatus === 'ok' ? 'var(--success)' : syncStatus === 'error' ? 'var(--danger)' : 'var(--gold)' }}>
              {syncStatus === 'ok' ? '已同步' : syncStatus === 'error' ? '同步失败' : '同步中'}
            </span>
          </div>
        )}

        {showSettings && (
          <a href="/settings" className="w-10 h-10 flex items-center justify-center rounded-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--muted)' }}>
            <Settings className="w-5 h-5" style={{ color: 'var(--foreground-secondary)' }} />
          </a>
        )}

        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--gold)' }}
        >LZ</div>
      </div>
    </div>
  )
}
