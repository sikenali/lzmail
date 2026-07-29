'use client'
import { AppShell } from '@/components/layout/AppShell'
import { Settings, User, Bell, Palette, Shield, HardDrive, Info } from 'lucide-react'
import { usePathname } from 'next/navigation'

const tabs = [
  { icon: Settings, label: '通用', key: 'general' },
  { icon: User, label: '账号', key: 'account' },
  { icon: Bell, label: '通知', key: 'notification' },
  { icon: Palette, label: '外观', key: 'appearance' },
  { icon: Shield, label: '安全', key: 'security' },
  { icon: HardDrive, label: '存储', key: 'storage' },
  { icon: Info, label: '关于', key: 'about' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentTab = pathname.split('/').pop() || 'general'

  return (
    <AppShell>
      <div className="flex h-full">
        <div className="w-[220px] border-r shrink-0 bg-[var(--card)]">
          <div className="px-5 py-4 border-b">
            <h1 className="text-sm font-semibold">设置</h1>
          </div>
          <div className="p-3 space-y-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = currentTab === tab.key
              return (
                <a
                  key={tab.key}
                  href={`/settings/${tab.key}`}
                  className={`flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
                      : 'text-[var(--foreground-tertiary)] hover:bg-[var(--accent)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </a>
              )
            })}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </AppShell>
  )
}
