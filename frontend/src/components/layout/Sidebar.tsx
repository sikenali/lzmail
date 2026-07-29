'use client'
import { LayoutDashboard, Mail, Star, Clock, Send, FileText, AlertTriangle } from 'lucide-react'

const items = [
  { icon: LayoutDashboard, label: '仪表盘', folder: 'DASHBOARD', href: '/' },
  { icon: Mail, label: '所有邮件', folder: 'ALL', href: '/mail' },
  { icon: Star, label: '标星邮件', folder: 'STARRED', href: '/mail?folder=STARRED' },
  { icon: Clock, label: '稍后处理', folder: 'DEFERRED', href: '/mail?folder=DEFERRED' },
  { icon: Send, label: '已发送', folder: 'SENT', href: '/mail?folder=SENT' },
  { icon: FileText, label: '草稿', folder: 'DRAFTS', href: '/mail?folder=DRAFTS' },
  { icon: AlertTriangle, label: '垃圾邮件', folder: 'SPAM', href: '/mail?folder=SPAM' },
]

export function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <div className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = item.href === currentPath
        return (
          <a
            key={item.folder}
            href={item.href}
            className={`flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
                : 'text-[var(--foreground-tertiary)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </a>
        )
      })}
    </div>
  )
}
