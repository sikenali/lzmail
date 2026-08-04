'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { Account } from '@/types'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--app-background)' }}>
      <div className="w-[240px] flex flex-col bg-[var(--sidebar-bg)] border-r shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
        <Sidebar currentPath={pathname} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header onCompose={() => { window.location.href = '/compose' }} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
