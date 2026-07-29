'use client'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AccountSwitcher } from './AccountSwitcher'
import type { Account } from '@/types'

export function AppShell({
  accounts,
  children,
}: {
  accounts: Account[]
  children: React.ReactNode
}) {
  const [currentFolder, setCurrentFolder] = useState('INBOX')
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null)

  return (
    <div className="flex h-screen bg-background">
      <div className="flex flex-col border-r">
        <Sidebar currentFolder={currentFolder} onSelect={setCurrentFolder} />
        <AccountSwitcher
          accounts={accounts}
          current={currentAccount}
          onSwitch={setCurrentAccount}
          onAdd={() => window.location.href = '/settings'}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <Header onCompose={() => window.location.href = '/compose'} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
