'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { Account } from '@/types'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--app-background)' }}>
      <Header onCompose={() => { window.location.href = '/compose' }} />
      <div className="flex flex-1 min-h-0">
        <div className="w-[240px] flex flex-col bg-[var(--sidebar-bg)] border-r shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
          <Sidebar currentPath={pathname} />
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
