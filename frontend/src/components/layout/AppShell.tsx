'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AccountSwitcher } from './AccountSwitcher'
import type { Account } from '@/types'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-[var(--background)]">
      <div className="w-[var(--sidebar-width)] flex flex-col bg-[var(--card)] border-r shrink-0">
        <div className="flex items-center gap-2 px-5 h-[var(--header-height)] border-b">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">LZ</div>
          <span className="text-sm font-semibold">LZMail</span>
        </div>
        <Sidebar currentPath={pathname} />
        <div className="flex-1" />
        <AccountSwitcher
          current={null}
          onSwitch={() => {}}
          onAdd={() => window.location.href = '/settings/account'}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header onCompose={() => window.location.href = '/compose'} onSetting={() => window.location.href = '/settings/general'} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
