'use client'
import { Search, Bell, Settings } from 'lucide-react'

export function Header({ onCompose, onSetting }: { onCompose: () => void, onSetting?: () => void }) {
  return (
    <div className="flex items-center justify-between h-[var(--header-height)] px-6 border-b bg-white" style={{ borderColor: '#f3f4f6' }}>
      <div className="flex items-center gap-3 flex-1 max-w-[480px]">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
          <input
            className="w-full h-9 pl-9 pr-3 rounded-lg outline-none text-sm placeholder:text-sm"
            style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              color: '#1e293b',
            }}
            placeholder="搜索邮件、联系人..."
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" style={{ color: '#6b7280' }} />
        </button>
        <button onClick={onSetting} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <Settings className="w-5 h-5" style={{ color: '#6b7280' }} />
        </button>
        <div className="w-9 h-9 ml-1 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ background: 'linear-gradient(to bottom right, #34d399, #14b8a6)' }}
        >
          LZ
        </div>
      </div>
    </div>
  )
}
