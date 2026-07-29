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
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {})
  }, [])

  const activeAccount = current || accounts[0] || null

  return (
    <div className="border-t px-4 py-3" style={{ borderColor: '#f3f4f6' }}>
      <div className="flex items-center gap-3 rounded-lg p-2" style={{ backgroundColor: '#f9fafb' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: 'linear-gradient(to bottom right, #f87171, #dc2626)' }}
        >
          {activeAccount ? (activeAccount.name?.[0] || activeAccount.email?.[0] || 'G').toUpperCase() : 'A'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: '#1e293b' }}>
            {activeAccount?.email || '未配置账号'}
          </div>
          <div className="text-[10px] truncate" style={{ color: '#94a3b8' }}>
            {activeAccount ? '已同步 · 2分钟前' : '点击添加邮箱账号'}
          </div>
        </div>
        {accounts.length > 1 && (
          <button onClick={() => setOpen(!open)} className="shrink-0">
            <ChevronUp className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
          </button>
        )}
        {!activeAccount && (
          <button onClick={onAdd} className="shrink-0">
            <Plus className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
          </button>
        )}
      </div>
      {open && accounts.length > 1 && (
        <div className="mt-1 space-y-0.5">
          {accounts.map(a => (
            <button key={a.id} onClick={() => { onSwitch(a); setOpen(false) }}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-gray-100"
              style={{ color: '#475569' }}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold"
                style={{ backgroundColor: a.brand_color || '#6366f1' }}
              >{(a.name || a.email)?.[0]?.toUpperCase() || '?'}</div>
              <span className="truncate">{a.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
