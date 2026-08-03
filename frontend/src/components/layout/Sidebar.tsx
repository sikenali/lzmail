'use client'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Mail, Star, Clock, Send, FileText, AlertTriangle, Plus, ChevronDown } from '@/lib/lucide-remix'
import { api } from '@/lib/api'
import type { Account } from '@/types'

const navItems = [
  { icon: LayoutDashboard, label: '仪表盘', href: '/' },
  { icon: Mail, label: '收件箱', href: '/mail', badge: -1 },
  { icon: Star, label: '标星', href: '/mail?folder=STARRED' },
  { icon: Clock, label: '稍后', href: '/mail?folder=DEFERRED' },
  { icon: Send, label: '已发送', href: '/mail?folder=SENT' },
  { icon: FileText, label: '草稿', href: '/mail?folder=DRAFTS', badge: -2 },
  { icon: AlertTriangle, label: '垃圾', href: '/mail?folder=SPAM' },
]

const categories = [
  { icon: '📁', label: '工作' },
  { icon: '👤', label: '个人' },
  { icon: '📰', label: '订阅' },
  { icon: '✈️', label: '旅行' },
]

const accountBrandColors: Record<string, string> = {
  Gmail: '#ea4335',
  Outlook: '#0078d4',
  QQ: '#12b7f5',
  Netease: '#e53e3e',
  iCloud: '#6b8fa3',
}

export function Sidebar({ currentPath }: { currentPath: string }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [catOpen, setCatOpen] = useState(true)
  const [accOpen, setAccOpen] = useState(true)
  const [badgeUnread, setBadgeUnread] = useState<number | null>(null)
  const [badgeDraft, setBadgeDraft] = useState<number | null>(null)

  useEffect(() => {
    api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {})
    Promise.all([
      api.mails.stats(),
      api.mails.list(undefined, 'DRAFTS', 1, 0).then(list => list?.length ?? 0).catch(() => 0),
    ]).then(([stats, draftCount]) => {
      if (stats) { setBadgeUnread(stats.unread_emails) }
      setBadgeDraft(typeof draftCount === 'number' ? draftCount : null)
    }).catch(() => {})
  }, [])

  const isActive = (href: string) => {
    if (currentPath === href) return true
    // For /mail paths with folder params, match by folder
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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b shrink-0" style={{ borderColor: '#f3ede3' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#c43d3d', borderRadius: '8px' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold leading-none" style={{ color: '#3d2b1f', fontFamily: 'SourceHanSans-Bold, system-ui' }}>LZMail</span>
          <span className="text-[10px] leading-none mt-0.5" style={{ color: '#8b7355' }}>懒猫微服</span>
        </div>
      </div>

      {/* Write button */}
      <div className="px-4 pt-4 pb-2">
        <a href="/compose"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#c43d3d', borderRadius: '12px' }}
        >
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" style={{ color: '#fff' }}>
            <path d="M3 5h2V3a1 1 0 00-1-1H4a1 1 0 00-1 1v2zm16 0h2V3a1 1 0 00-1-1h-1a1 1 0 00-1 1v2zM5 19H3v2a1 1 0 001 1h1a1 1 0 001-1v-2zm14 0h2v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-2zM12 3L5 9l1.5 1.5L12 6l5.5 4.5L19 9 12 3zM5 15l7 7 7-7-1.5-1.5L12 19l-5.5-5.5L5 15z"/>
          </svg>
          写邮件
        </a>
      </div>

      {/* Nav menu */}
      <div className="flex-1 px-3 py-2 space-y-0.5 overflow-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <a key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: active ? '#f3ede3' : 'transparent',
                color: active ? '#c43d3d' : '#6b5b4f',
                fontWeight: active ? '600' : '400',
                borderRadius: '8px',
              }}
            >
              <item.icon className="w-4 h-4 shrink-0" style={{ color: active ? '#c43d3d' : '#6b5b4f' }} />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: active ? '#c43d3d' : '#f3ede3', color: active ? '#fff' : '#8b7355', borderRadius: '9999px' }}
                >{item.badge === -1 ? (badgeUnread ?? '—') : item.badge === -2 ? (badgeDraft ?? '—') : item.badge}</span>
              )}
            </a>
          )
        })}
      </div>

      {/* Divider */}
      <div className="mx-4 my-2 h-px" style={{ backgroundColor: '#e5d9c4' }} />

      {/* Categories */}
      <div className="px-3 py-2">
        <button onClick={() => setCatOpen(!catOpen)} className="flex items-center gap-1 px-2 py-1 text-xs font-semibold" style={{ color: '#b8a88a' }}>
          <ChevronDown className={`w-3 h-3 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
          分类
        </button>
        {catOpen && (
          <div className="mt-1 space-y-0.5">
            {categories.map((cat) => (
              <div key={cat.label} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-[#f5f0e8]" style={{ color: '#6b5b4f', borderRadius: '8px' }}>
                <span className="text-xs">{cat.icon}</span>
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 my-2 h-px" style={{ backgroundColor: '#e5d9c4' }} />

      {/* Account list */}
      <div className="px-3 py-2">
        <button onClick={() => setAccOpen(!accOpen)} className="flex items-center gap-1 px-2 py-1 text-xs font-semibold" style={{ color: '#b8a88a' }}>
          <ChevronDown className={`w-3 h-3 transition-transform ${accOpen ? 'rotate-180' : ''}`} />
          邮箱账号
        </button>
        {accOpen && (
          <div className="mt-1 space-y-0.5">
            {accounts.map((a) => {
              const ac = accountBrandColors[a.name] || a.brand_color || '#6366f1'
              return (
                <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-[#f5f0e8]" style={{ color: '#6b5b4f', borderRadius: '8px' }}>
                  <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ backgroundColor: ac, borderRadius: '9999px' }}>
                    {(a.name || a.email)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="flex-1 truncate text-xs">{a.name || a.email}</span>
                  <ChevronDown className="w-3 h-3 shrink-0" style={{ color: '#b8a88a' }} />
                </div>
              )
            })}
            <a href="/settings"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: '#b8a88a', borderRadius: '8px' }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs">添加账号</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
