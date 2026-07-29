'use client'
import { useEffect, useState } from 'react'
import { ChevronUp, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import type { Account } from '@/types'

export function AccountSwitcher({
  current,
  onSwitch,
  onAdd,
}: {
  current: Account | null
  onSwitch: (a: Account | null) => void
  onAdd: () => void
}) {
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    api.accounts.list().then(setAccounts).catch(() => {})
  }, [])

  const activeAccount = current || accounts[0] || null

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: activeAccount?.brand_color || '#6366f1' }}
        >
          {(activeAccount?.name || activeAccount?.email || 'A')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{activeAccount?.name || activeAccount?.email || '未配置账号'}</div>
          <div className="text-xs text-[var(--muted-foreground)] truncate">{activeAccount?.email || '点击添加邮箱账号'}</div>
        </div>
        <button onClick={onAdd} className="w-6 h-6 flex items-center justify-center hover:bg-[var(--accent)] rounded transition-colors">
          <Plus className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
        </button>
        {accounts.length > 1 && <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)]" />}
      </div>
    </div>
  )
}
