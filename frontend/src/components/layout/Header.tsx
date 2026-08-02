'use client'
import { Search, Settings, Sun, Moon, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useState } from 'react'

export function Header({ onCompose }: { onCompose: () => void }) {
  const { settings, setSetting } = useSettings()
  const [searchFocused, setSearchFocused] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'ok' | 'error'>('ok')

  const handleThemeToggle = () => {
    const currentTheme = settings.theme as 'light' | 'dark' | 'system'
    let nextTheme: 'light' | 'dark' | 'system'
    if (currentTheme === 'light') nextTheme = 'dark'
    else if (currentTheme === 'dark') nextTheme = 'system'
    else nextTheme = 'light'
    setSetting('theme', nextTheme)
  }

  return (
    <div className="flex items-center justify-between h-16 px-6 border-b shrink-0" style={{ backgroundColor: '#fbf7f0', borderColor: '#f3ede3' }}>
      {/* Logo (left side of header) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: '#c43d3d', borderRadius: '8px' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" style={{ color: '#fff' }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold leading-none" style={{ color: '#3d2b1f', fontFamily: 'SourceHanSans-Bold, system-ui' }}>LZMail</span>
          <span className="text-[10px] leading-none mt-0.5" style={{ color: '#8b7355' }}>懒猫微服</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-[320px] mx-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8b7355' }} />
          <input
            className="w-full h-10 pl-9 pr-4 rounded-lg outline-none text-sm"
            style={{
              backgroundColor: '#f3ede3',
              border: 'none',
              color: '#3d2b1f',
            }}
            placeholder="搜索邮件、联系人..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Sync status */}
        <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg" style={{ backgroundColor: syncStatus === 'ok' ? '#edf5ec' : syncStatus === 'error' ? '#fdf2f2' : '#fef9f0' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: syncStatus === 'ok' ? '#5b8c5a' : syncStatus === 'error' ? '#c43d3d' : '#c9a96e' }} />
          <span className="text-xs font-medium" style={{ color: syncStatus === 'ok' ? '#5b8c5a' : syncStatus === 'error' ? '#c43d3d' : '#c9a96e' }}>
            {syncStatus === 'ok' ? '已同步' : syncStatus === 'error' ? '同步失败' : '同步中'}
          </span>
        </div>

        {/* Settings */}
        <a href="/settings/general" className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#f3ede3] transition-colors">
          <Settings className="w-5 h-5" style={{ color: '#6b5b4f' }} />
        </a>

        {/* Theme toggle */}
        <button onClick={handleThemeToggle} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#f3ede3] transition-colors">
          {((settings.theme as 'light' | 'dark' | 'system') === 'dark' ||
            ((settings.theme as 'light' | 'dark' | 'system') === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) ?
            <Moon className="w-5 h-5" style={{ color: '#6b5b4f' }} /> :
            <Sun className="w-5 h-5" style={{ color: '#6b5b4f' }} />
          }
        </button>

        {/* Avatar */}
        <div className="w-10 h-10 ml-1 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer"
          style={{ backgroundColor: '#c9a96e', borderRadius: '9999px' }}
        >LZ</div>
      </div>
    </div>
  )
}
