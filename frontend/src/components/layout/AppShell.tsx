'use client'
import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { Account } from '@/types'

function SidebarWithPath() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const qs = searchParams ? searchParams.toString() : ''
  const fullPath = qs ? `${pathname}?${qs}` : pathname
  return <Sidebar currentPath={fullPath} />
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Trigger page transition animation on route change.
  // AppShell is rendered inside each page, so it remounts on every navigation:
  // animate <main> whenever the path changes (disabled via the .no-animations toggle).
  useEffect(() => {
    if (document.body.classList.contains('no-animations')) return
    const main = document.querySelector('main')
    if (!main) return
    const raf = requestAnimationFrame(() => {
      main.classList.remove('page-enter')
      void main.offsetWidth
      main.classList.add('page-enter')
    })
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--app-background)' }}>
      <Header onCompose={() => { window.location.href = '/compose' }} />
      <div className="flex flex-1 min-h-0">
        <div className="w-[240px] flex flex-col shrink-0" style={{ backgroundColor: 'var(--background)' }}>
          <Suspense fallback={null}><SidebarWithPath /></Suspense>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
