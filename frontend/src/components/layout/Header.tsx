'use client'
import { Search, SquarePen, Settings } from 'lucide-react'

export function Header({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex items-center justify-between h-14 px-4 border-b bg-background">
      <div className="flex items-center gap-2 flex-1">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="搜索邮件..."
        />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onCompose} className="p-2 hover:bg-accent rounded-lg transition-colors">
          <SquarePen className="w-4 h-4" />
        </button>
        <button onClick={() => window.location.href = '/settings'} className="p-2 hover:bg-accent rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
