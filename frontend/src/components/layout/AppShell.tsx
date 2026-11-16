'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { TopNav } from './TopNav'
import { PageFooter } from './PageFooter'
import { Sidebar } from './Sidebar'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { AccountModal } from '@/components/account/AccountModal'
import { ComposeModal } from '@/components/compose/ComposeModal'
import { ContactsModal } from '@/components/contacts/ContactsModal'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSettings } from '@/hooks/useSettings'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { settings } = useSettings()
  const navMode = (settings.nav_mode === 'sidebar' ? 'sidebar' : 'topbar') as 'topbar' | 'sidebar'
  const [hash, setHash] = useState('')

  useEffect(() => {
    const onHash = () => setHash(window.location.hash.replace('#', ''))
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const closeModals = useCallback(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setHash('')
  }, [])

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

  const openHash = (name: string) => {
    window.location.hash = name
    setHash(name)
  }

  // Mobile always uses top nav with dropdown
  const showSidebar = !isMobile && navMode === 'sidebar'

  return (
    <div className="flex h-dvh" style={{ backgroundColor: 'var(--color-bg-main)' }}>
      {showSidebar && (
        <Suspense fallback={null}>
          <Sidebar key={navMode} />
        </Suspense>
      )}
      <div className={`flex flex-col flex-1 min-w-0 ${showSidebar ? '' : 'w-full'}`}>
        <Suspense fallback={null}>
          <TopNav
            onOpenSettings={() => openHash('settings')}
            onOpenAddAccount={() => openHash('account')}
          />
        </Suspense>
        <main className="flex-1 overflow-auto scroll-contain">{children}</main>
        <PageFooter
          onCompose={() => openHash('compose')}
          onContacts={() => openHash('contact')}
        />
      </div>
      <SettingsModal open={hash === 'settings'} onClose={closeModals} />
      <AccountModal open={hash === 'account'} onClose={closeModals} />
      <ComposeModal open={hash === 'compose'} onClose={closeModals} params={{}} />
      <ContactsModal open={hash === 'contact'} onClose={closeModals} />
    </div>
  )
}
