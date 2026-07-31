'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AccountSwitcher } from './AccountSwitcher'
import type { Account } from '@/types'

const brandGradient = 'linear-gradient(135deg, #3b82f6, #4f46e5)'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--app-background)' }}>
      <div className="w-[var(--sidebar-width)] flex flex-col bg-[var(--sidebar-bg)] border-r shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center gap-3 px-5 h-[var(--header-height)] border-b shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: brandGradient }}
          >LZ</div>
           <span className="text-base font-bold" style={{ color: 'var(--foreground)', fontFamily: 'SourceHanSans-Bold, system-ui' }}>LZMail</span>
         </div>
         <Sidebar currentPath={pathname} />
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
