'use client'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Inbox, Star, Clock, Send, FileText, Trash2, Plus, Settings, Contact, PenNib } from '@/lib/icons'
import { api } from '@/lib/api'
import type { Account } from '@/types'

const navItems = [
  { icon: LayoutDashboard, label: '仪表盘', href: '/', badge: 3 },
  { icon: Inbox, label: '收件箱', href: '/mail', badge: 27 },
  { icon: Star, label: '标星邮件', href: '/mail?folder=STARRED' },
  { icon: Clock, label: '稍后处理', href: '/mail?folder=DEFERRED' },
  { icon: Send, label: '已发送', href: '/mail?folder=SENT' },
  { icon: FileText, label: '草稿箱', href: '/mail?folder=DRAFTS', badge: 5, badgeStyle: 'gold' },
  { icon: Contact, label: '联系人', href: '/contacts' },
  { icon: Trash2, label: '垃圾邮件', href: '/mail?folder=SPAM' },
  { icon: Settings, label: '设置', href: '/settings' },
]

const categories = [
  { label: '工作', color: '#c43d3d' },
  { label: '个人', color: '#5b8c5a' },
  { label: '订阅', color: '#6b8fa3' },
  { label: '旅行', color: '#c9a96e' },
]

export function Sidebar({ currentPath }: { currentPath: string }) {
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {})
  }, [])

  const isActive = (href: string) => {
    if (currentPath === href) return true
    if (href.startsWith('/mail') && currentPath?.startsWith('/mail')) {
      const getFolder = (p: string) => {
        try { return new URL(p, 'http://x').searchParams.get('folder') } catch { return null }
      }
      const hFolder = getFolder(href)
      const cFolder = getFolder(currentPath)
      if (hFolder && cFolder && hFolder === cFolder) return true
      if (!hFolder && !cFolder) return true
    }
    return false
  }

  return (
    <div className="flex flex-col h-full py-6">
      <div className="px-4">
        <a href="/compose"
          className="flex items-center justify-center gap-2 w-full h-[48px] rounded-[12px] text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'rgba(196,61,61,1)' }}
        >
          <PenNib className="w-[18px] h-[18px]" style={{ color: '#ffffff' }} />
          <span className="text-[15px] font-semibold">写邮件</span>
        </a>
      </div>

      <div className="px-4 mt-6">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <a key={item.href} href={item.href}
                className="flex items-center gap-3 rounded-[8px] transition-colors"
                style={{
                  backgroundColor: active ? 'rgba(243,237,227,1)' : 'transparent',
                  padding: '12px 16px',
                }}
              >
                <item.icon className="w-[22px] h-[22px] shrink-0" style={{ color: active ? 'rgba(196,61,61,1)' : 'rgba(107,91,79,1)' }} />
                <span className="flex-1 text-[14px]" style={{
                  color: active ? 'rgba(196,61,61,1)' : 'rgba(61,43,31,1)',
                  fontWeight: active ? '600' : '500',
                }}>{item.label}</span>
                {item.badge != null && (
                  <span className="h-[22px] min-w-[22px] px-1.5 rounded-full flex items-center justify-center text-[11px]"
                    style={{
                      backgroundColor: item.badgeStyle === 'gold' ? 'rgba(229,217,196,1)' : 'rgba(196,61,61,1)',
                      color: item.badgeStyle === 'gold' ? 'rgba(107,91,79,1)' : '#fff',
                      fontWeight: item.badgeStyle === 'gold' ? '500' : '600',
                    }}
                  >{item.badge}</span>
                )}
              </a>
            )
          })}
        </div>
      </div>

      <div className="mx-4 mt-4 mb-0 h-px" style={{ backgroundColor: 'rgba(229,217,196,1)' }} />

      <div className="px-4">
        <div className="px-4 text-[11px] font-semibold mb-1" style={{ color: 'rgba(184,168,138,1)' }}>分类</div>
        <div className="space-y-1 mt-1">
          {categories.map((cat) => (
            <a key={cat.label} href="/mail"
              className="flex items-center gap-3 rounded-[8px] text-[13px] font-medium hover:bg-[var(--muted)] transition-colors"
              style={{ color: 'var(--foreground)', padding: '8px 16px', backgroundColor: 'transparent' }}
            >
              <span className="w-[13px] h-3 rounded-[2px] shrink-0" style={{ backgroundColor: cat.color }} />
              <span>{cat.label}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4 mb-0 h-px" style={{ backgroundColor: 'rgba(229,217,196,1)' }} />

      <div className="flex-1 px-4 overflow-auto">
        <div className="px-4 text-[11px] font-semibold mb-1" style={{ color: 'rgba(184,168,138,1)' }}>邮箱账号</div>
        <div className="space-y-1 mt-1">
          {accounts.map((a) => {
            const ac = a.brand_color || '#ea4335'
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-[8px] transition-colors hover:bg-[var(--muted)] cursor-pointer"
                style={{ padding: '8px 16px' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: ac }}>
                  {(a.name || a.email)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium leading-tight truncate" style={{ color: 'rgba(61,43,31,1)' }}>{a.name || a.email}</div>
                  <div className="text-[11px] leading-tight truncate mt-0.5" style={{ color: 'rgba(184,168,138,1)' }}>{a.email}</div>
                </div>
                <div className="w-[9px] h-2 rounded-full shrink-0" style={{ backgroundColor: a.brand_color === '#c9a96e' ? 'rgba(201,169,110,1)' : 'rgba(91,140,90,1)' }} />
              </div>
            )
          })}
          <div className="flex items-center gap-3 rounded-[8px] transition-colors hover:bg-[var(--muted)] cursor-pointer"
            style={{ padding: '8px 16px' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border" style={{ borderColor: 'rgba(201,169,110,1)', borderStyle: 'solid', borderWidth: '0.7px' }}>
              <Plus className="w-[18px] h-[18px]" style={{ color: 'rgba(201,169,110,1)' }} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: 'rgba(201,169,110,1)' }}>添加账号</span>
          </div>
        </div>
      </div>
    </div>
  )
}
