'use client'
import { Search, Settings } from '@/lib/icons'
import { useState } from 'react'

export function Header({ onCompose }: { onCompose: () => void }) {
  const [searchFocused, setSearchFocused] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'ok' | 'error'>('ok')

  return (
    <div className="flex items-center justify-between h-16 px-6 border-b shrink-0" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" style={{ color: 'var(--primary-foreground)' }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold leading-none" style={{ color: 'var(--foreground)' }}>LZMail</span>
          <span className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>懒猫微服</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
          <input
            className="w-full h-10 pl-9 pr-4 rounded-lg outline-none text-sm"
            style={{
              backgroundColor: 'var(--muted)',
              border: 'none',
              color: 'var(--foreground)',
            }}
            placeholder="搜索邮件、联系人..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>

        <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg" style={{ backgroundColor: syncStatus === 'ok' ? 'var(--success-bg)' : syncStatus === 'error' ? 'var(--danger-bg)' : 'var(--accent)' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: syncStatus === 'ok' ? 'var(--success)' : syncStatus === 'error' ? 'var(--danger)' : 'var(--gold)' }} />
          <span className="text-xs font-medium" style={{ color: syncStatus === 'ok' ? 'var(--success)' : syncStatus === 'error' ? 'var(--danger)' : 'var(--gold)' }}>
            {syncStatus === 'ok' ? '已同步' : syncStatus === 'error' ? '同步失败' : '同步中'}
          </span>
        </div>

        <a href="/settings" className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--accent)] transition-colors">
          <Settings className="w-5 h-5" style={{ color: 'var(--foreground-secondary)' }} />
        </a>

        <div className="w-10 h-10 ml-1 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer"
          style={{ backgroundColor: 'var(--gold)' }}
        >LZ</div>
      </div>
    </div>
  )
}
