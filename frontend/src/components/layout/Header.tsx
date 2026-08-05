'use client'
import { Search, Settings } from '@/lib/icons'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export function Header({ onCompose }: { onCompose: () => void }) {
  const pathname = usePathname()
  const [searchFocused, setSearchFocused] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'ok' | 'error'>('ok')

  const showSearch = pathname === '/' || pathname === '/mail' || pathname === '/contacts' || pathname.startsWith('/mail/')
  const showSync = pathname !== '/contacts'
  const showSettings = pathname !== '/settings'

  return (
    <div className="flex items-center justify-between h-16 px-8 shrink-0" style={{ backgroundColor: 'var(--background)' }}>
      <div className="flex items-center gap-4 shrink-0">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
          <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-none stroke-current" strokeWidth="1.8" style={{ color: 'var(--primary-foreground)' }}>
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <polyline points="22,4 12,13 2,4" fill="none" />
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[22px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>LZMail</span>
          <span className="text-xs leading-none" style={{ color: 'var(--foreground-tertiary)' }}>懒猫微服</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {showSearch && (
          <div className="relative w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px]" style={{ color: 'var(--foreground-tertiary)' }} />
            <input
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
          </div>
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
