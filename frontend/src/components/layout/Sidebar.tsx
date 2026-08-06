'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Inbox, Star, Clock, Send, FileText, Trash2, Plus, Settings, Contact, Edit } from '@/lib/icons'
import { api } from '@/lib/api'
import type { Account } from '@/types'

const navItems = [
  { icon: LayoutDashboard, label: '仪表盘', href: '/', badge: 3 },
  { icon: Inbox, label: '收件箱', href: '/mail', badge: 27 },
  { icon: Star, label: '标星邮件', href: '/mail?folder=STARRED' },
  { icon: Clock, label: '稍后处理', href: '/mail?folder=DEFERRED' },
  { icon: Send, label: '已发送', href: '/mail?folder=SENT' },
  { icon: FileText, label: '草稿箱', href: '/mail?folder=DRAFTS', badge: 5, badgeStyle: 'gold' },
  { icon: Trash2, label: '垃圾邮件', href: '/mail?folder=SPAM' },
]

export function Sidebar({ currentPath }: { currentPath: string }) {
  const router = useRouter()
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
    <div className="flex flex-col h-full" style={{ paddingTop: 24, paddingBottom: 24, paddingLeft: 16, paddingRight: 16 }}>
      <div>
        <a href="/compose"
          className="flex items-center justify-center gap-2 w-full h-[48px] rounded-[12px] text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'rgba(196,61,61,1)', paddingLeft: 20, paddingRight: 20 }}
        >
          <Edit className="w-[18px] h-[18px]" style={{ color: 'rgba(255,255,255,0.9)' }} />
          <span className="text-[15px] font-semibold">写邮件</span>
        </a>
      </div>

      <div style={{ paddingTop: 24 }}>
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <a key={item.href} href={item.href}
                className="flex items-center gap-2 rounded-[8px] transition-colors"
                style={{
                  backgroundColor: active ? 'rgba(243,237,227,1)' : 'transparent',
                  padding: '12px 16px',
                }}
              >
                <item.icon className="w-[20px] h-[20px] shrink-0" style={{ color: active ? 'rgba(196,61,61,1)' : 'rgba(107,91,79,1)' }} />
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

  <div className="mx-4" style={{ marginTop: 16, marginBottom: 0, height: 1, backgroundColor: 'rgba(229,217,196,1)' }} />

      <div className="space-y-1" style={{ paddingTop: 16 }}>
        {[
          { icon: Contact, label: '联系人', href: '/contacts' },
          { icon: Settings, label: '设置', href: '/settings' },
        ].map(item => {
          const active = isActive(item.href)
          return (
            <a key={item.href} href={item.href}
              className="flex items-center gap-2 rounded-[8px] transition-colors"
              style={{ padding: '12px 16px', backgroundColor: active ? 'rgba(243,237,227,1)' : 'transparent' }}
            >
              <item.icon className="w-[20px] h-[20px] shrink-0" style={{ color: active ? 'rgba(196,61,61,1)' : 'rgba(107,91,79,1)' }} />
              <span className="flex-1 text-[14px]" style={{
                color: active ? 'rgba(196,61,61,1)' : 'rgba(61,43,31,1)',
                fontWeight: active ? '600' : '500',
              }}>{item.label}</span>
            </a>
          )
        })}
      </div>

      <div className="mx-4" style={{ marginTop: 16, marginBottom: 0, height: 1, backgroundColor: 'rgba(229,217,196,1)' }} />

      <div className="flex-1 overflow-auto" style={{ paddingTop: 16, paddingLeft: 16, paddingRight: 16 }}>
        <div className="text-[11px] font-semibold" style={{ color: 'rgba(184,168,138,1)', padding: '0 16px' }}>邮箱账号</div>
        <div style={{ paddingTop: 16 }} className="space-y-1">
          {accounts.map((a) => {
            const ac = a.brand_color || '#ea4335'
            const isGold = a.brand_color === '#c9a96e'
            return (
              <div key={a.id}
                className="flex items-center gap-2 rounded-[8px] transition-colors cursor-pointer"
                style={{ padding: '8px 16px', backgroundColor: 'transparent' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: ac }}>
                  {(a.name || a.email)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium leading-tight truncate" style={{ color: 'rgba(61,43,31,1)' }}>{a.name || a.email}</div>
                  <div className="text-[11px] leading-tight truncate mt-0.5" style={{ color: 'rgba(184,168,138,1)' }}>{a.email}</div>
                </div>
                <div className="w-[9px] h-2 rounded-full shrink-0" style={{ backgroundColor: isGold ? 'rgba(201,169,110,1)' : 'rgba(91,140,90,1)' }} />
              </div>
            )
          })}
          <a href="#"
            className="flex items-center gap-2 rounded-[8px] transition-colors cursor-pointer"
            style={{ padding: '8px 16px', backgroundColor: 'transparent' }}
            onClick={(e) => { e.preventDefault(); router.push('/settings?tab=account') }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ border: '0.7px dashed rgba(201,169,110,1)' }}
            >
              <Plus className="w-[18px] h-[18px]" style={{ color: 'rgba(201,169,110,1)' }} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: 'rgba(201,169,110,1)' }}>添加账号</span>
          </a>
        </div>
      </div>
    </div>
  )
}
