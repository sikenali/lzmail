'use client'
import { Search, Bell, Settings, SquarePen } from 'lucide-react'

export function Header({ onCompose, onSetting }: { onCompose: () => void, onSetting?: () => void }) {
  return (
    <div className="flex items-center justify-between h-[var(--header-height)] px-6 border-b bg-[var(--card)]">
      <div className="flex items-center gap-3 flex-1 max-w-[480px]">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <input
            className="w-full h-9 pl-9 pr-3 bg-[var(--muted)] rounded-lg outline-none text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            placeholder="搜索邮件..."
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onCompose} className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <SquarePen className="w-4 h-4" />
          写邮件
        </button>
        <button className="w-9 h-9 flex items-center justify-center hover:bg-[var(--accent)] rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-[var(--foreground-tertiary)]" />
        </button>
        <button onClick={onSetting} className="w-9 h-9 flex items-center justify-center hover:bg-[var(--accent)] rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-[var(--foreground-tertiary)]" />
        </button>
        <div className="w-9 h-9 ml-1 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-semibold">
          LJ
        </div>
      </div>
    </div>
  )
}
