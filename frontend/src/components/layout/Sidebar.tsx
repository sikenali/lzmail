'use client'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Mail, Star, Clock, Send, FileText, AlertTriangle, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import type { Account } from '@/types'

const items = [
  { icon: LayoutDashboard, label: '仪表盘', href: '/' },
  { icon: Mail, label: '所有邮件', href: '/mail', count: 12 },
  { icon: Star, label: '星标', href: '/mail?folder=STARRED' },
  { icon: Clock, label: '稍后处理', href: '/mail?folder=DEFERRED' },
  { icon: Send, label: '已发送', href: '/mail?folder=SENT' },
  { icon: FileText, label: '草稿箱', href: '/mail?folder=DRAFTS', count: 3 },
  { icon: AlertTriangle, label: '垃圾邮件', href: '/mail?folder=SPAM' },
]

const brandGradient = 'linear-gradient(135deg, #3b82f6, #4f46e5)'
const accountBrandColors = ['#ea4335', '#0078d4', '#12b7f5', '#e53e3e', '#f59e0b', '#8b5cf6']

export function Sidebar({ currentPath }: { currentPath: string }) {
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col flex-1">
      <div className="px-4 pt-5 pb-3">
         <a href="/compose"
           className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-white font-semibold text-sm"
           style={{ background: brandGradient }}
         >
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current"><path d="M7.5 5.6L5 7l1.4-2.5L8 2l2.5 1.4L12 3c-.5.9-1.5 2-2.5 2.6zm-4 7.4L5 13l1 2-2-1-2 1 1-2 .5-2zM22 3l-7 14-4-4L22 3zM9 17l2-1 1 2-2 1-1-2z"/></svg>
          写邮件
        </a>
      </div>

      <div className="flex-1 px-3 space-y-0.5">
        {items.map((item) => {
          const active = item.href === currentPath || (currentPath === '/mail' && item.href.startsWith('/mail') && item.href === '/mail')
          return (
            <a key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: active ? 'var(--primary)/10' : 'transparent',
                color: active ? 'var(--foreground)' : 'var(--foreground-tertiary)',
                fontWeight: active ? '600' : '400',
              }}
            >
               <item.icon className="w-4.5 h-4.5" style={{ color: active ? 'var(--primary)' : 'var(--foreground-tertiary)' }} />
              <span className="flex-1">{item.label}</span>
              {item.count !== undefined && (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full`}
                  style={{
                    backgroundColor: active ? 'var(--primary)/10' : item.label === '草稿箱' ? '#fef3c7' : 'var(--primary)/20',
                    color: item.label === '草稿箱' ? '#d97706' : 'white',
                  }}
                >{item.count}</span>
              )}
            </a>
          )
        })}
      </div>

      <div className="px-5 py-3 border-t" style={{ borderColor: '#f3f4f6' }}>
        <div className="text-xs font-semibold mb-3" style={{ color: '#94a3b8' }}>邮箱账号</div>
        <div className="space-y-0.5">
          {accounts.map((a, i) => {
            const ac = a.brand_color || accountBrandColors[i % accountBrandColors.length]
            return (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ padding: '8px 12px' }}>
                <div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: ac, borderRadius: '9999px' }} />
                <span className="text-sm flex-1 truncate" style={{ color: '#475569' }}>{a.name || a.email}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${ac}1a`, color: ac }}>5</span>
              </div>
            )
          })}
          <a href="/settings/account"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50"
            style={{ color: '#94a3b8' }}
          >
            <Plus className="w-4.5 h-4.5" style={{ color: '#9ca3af' }} />
            <span>添加账号</span>
          </a>
        </div>
      </div>
    </div>
  )
}
