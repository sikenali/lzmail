'use client'
import { Paperclip, Star } from 'lucide-react'
import type { Email } from '@/types'

const avatarGradients: string[] = [
  'from-orange-400 to-red-500', 'from-blue-400 to-indigo-500',
  'from-cyan-400 to-blue-500', 'from-red-400 to-pink-500',
  'from-purple-400 to-pink-500', 'from-green-400 to-emerald-500',
]

function getInitials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function resolveColor(val: string, fallback = '#3b82f6'): string {
  if (val.startsWith('#')) return val
  return fallback
}

export function MailItem({ email, brand, onSelect }: { email: Email; brand?: string; onSelect: (id: number) => void }) {
  const date = new Date(email.date)
  const isToday = new Date().toDateString() === date.toDateString()
  const timeStr = isToday
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  const initials = getInitials(email.from)
  const barColor = resolveColor(brand || '')
  const badgeColor = resolveColor(brand || '', '#3b82f6')
  const gradientIdx = (email.from.length + email.id) % avatarGradients.length
  const brandName = email.account_name || ''

  return (
    <div onClick={() => onSelect(email.id)}
      className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors hover:bg-[var(--accent)] border-b ${
        !email.is_read ? 'bg-blue-50/30' : ''
      }`}
    >
      <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradients[gradientIdx]} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm truncate ${!email.is_read ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--foreground-secondary)]'}`}>{email.from}</span>
          {email.is_starred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />}
          {brandName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
              style={{ backgroundColor: badgeColor + '1a', color: badgeColor }}
            >
              {brandName}
            </span>
          )}
        </div>
        <div className={`text-sm truncate ${!email.is_read ? 'font-medium text-[var(--foreground)]' : 'text-[var(--foreground-secondary)]'}`}>{email.subject || '(无主题)'}</div>
        <div className="text-xs text-[var(--muted-foreground)] truncate">{email.body_preview}</div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">{timeStr}</span>
        <div className="flex items-center gap-1">
          {email.has_attachments && <Paperclip className="w-3 h-3 text-[var(--muted-foreground)]" />}
          {!email.is_read && <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
        </div>
      </div>
    </div>
  )
}
