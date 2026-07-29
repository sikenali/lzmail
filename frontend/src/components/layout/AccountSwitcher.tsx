'use client'
import { ChevronUp, Plus } from 'lucide-react'
import type { Account } from '@/types'

export function AccountSwitcher({
  accounts,
  current,
  onSwitch,
  onAdd,
}: {
  accounts: Account[]
  current: Account | null
  onSwitch: (a: Account | null) => void
  onAdd: () => void
}) {
  return (
    <div className="p-3 border-t">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: current?.brand_color || '#6366f1' }}
        />
        <span className="text-sm truncate flex-1">
          {current ? current.email : '所有账户'}
        </span>
        <button onClick={onAdd} className="p-1 hover:bg-accent rounded">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  )
}
