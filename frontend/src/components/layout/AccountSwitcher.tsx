'use client'
import { useEffect, useState } from 'react'
import { ChevronUp, Plus } from '@/lib/icons'
import { api } from '@/lib/api'
import type { Account } from '@/types'

const brandGradient = 'linear-gradient(135deg, #3b82f6, #4f46e5)'
const accountsChannel = new BroadcastChannel('lzmail_accounts')

function AuthBadge({ account }: { account: Account }) {
  if (account.auth_method !== 'oauth2') return null
  const color = account.provider === 'gmail' ? '#ea4335' : '#0078d4'
  return (
    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
      style={{ backgroundColor: `${color}18`, color }}>
      OAuth
    </span>
  )
}

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

  const fetchAccounts = () => {
    api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {})
  }

  useEffect(() => {
    fetchAccounts()
    accountsChannel.addEventListener('message', (e) => {
      if (e.data?.type === 'accounts:updated') fetchAccounts()
    })
    return () => accountsChannel.close()
  }, [])

  const activeAccount = current || accounts[0] || null

  return (
    <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 rounded-lg p-2" style={{ backgroundColor: 'var(--muted)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: brandGradient }}
        >
          {activeAccount ? (activeAccount.name?.[0] || activeAccount.email?.[0] || 'G').toUpperCase() : 'A'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>
            {activeAccount?.email || '未配置账号'}
          </div>
          <div className="text-[10px] truncate" style={{ color: 'var(--muted-foreground)' }}>
            {activeAccount ? (activeAccount.auth_method === 'oauth2' ? 'OAuth 2.0 · 已授权' : '已同步 · 2分钟前') : '点击添加邮箱账号'}
          </div>
        </div>
        {accounts.length > 1 && (
          <button onClick={() => setOpen(!open)} className="shrink-0">
            <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--foreground-tertiary)' }} />
          </button>
        )}
        {!activeAccount && (
          <button onClick={onAdd} className="shrink-0">
            <Plus className="w-3.5 h-3.5" style={{ color: 'var(--foreground-tertiary)' }} />
          </button>
        )}
      </div>
      {open && accounts.length > 1 && (
        <div className="mt-1 space-y-0.5">
          {accounts.map(a => (
            <button key={a.id} onClick={() => { onSwitch(a); setOpen(false) }}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-[var(--accent)]"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold"
                style={{ backgroundColor: a.brand_color || '#6366f1' }}
              >{(a.name || a.email)?.[0]?.toUpperCase() || '?'}</div>
              <span className="truncate flex-1 text-left">{a.email}</span>
              <AuthBadge account={a} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
