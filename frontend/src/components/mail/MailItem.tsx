'use client'
import { Check, Paperclip, Star } from '@/lib/icons'
import type { Email } from '@/types'

const categoryTag = (email: Email): { label: string; bg: string; color: string } | null => {
  const s = (email.subject || email.from || '').toLowerCase()
  if (s.includes('azure') || s.includes('账单')) return { label: '工作', bg: '#fdf2f2', color: '#c43d3d' }
  if (s.includes('github')) return { label: '工作', bg: '#fdf2f2', color: '#c43d3d' }
  if (s.includes('旅行') || s.includes('攻略')) return { label: '旅行', bg: '#fef9f0', color: '#c9a96e' }
  if (s.includes('release') || s.includes('update')) return { label: '订阅', bg: '#edf5f6', color: '#6b8fa3' }
  return null
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const today = new Date()
  const sameDay = today.toDateString() === date.toDateString()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (sameDay) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (yesterday.toDateString() === date.toDateString()) return '昨天'
  const lastWeek = new Date(); lastWeek.setDate(today.getDate() - 6)
  if (date >= lastWeek && date < yesterday) {
    const diff = Math.floor((new Date(yesterday).setHours(0,0,0,0) - date.setHours(0,0,0,0)) / 86400000) + 1
    return `${diff}天前`
  }
  return `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`
}

const senderInitials = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/)
  if (parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name || '?')[0]?.toUpperCase() || '?'
}

export function MailItem({ email, brand, selected = false, onSelect }: {
  email: Email; brand?: string; selected?: boolean; onSelect: (id: number) => void
}) {
  const bc = (brand || email.account_brand || '#c43d3d')
  const brandColor = bc.startsWith('#') ? bc : '#c43d3d'
  const unread = email.is_read === false
  const subjectWeight = selected || unread ? '600' : '500'
  const senderWeight = selected || unread ? '600' : '500'
  const timeStr = formatTime(email.date)
  const tag = categoryTag(email)

  return (
    <div onClick={() => onSelect(email.id)}
      className="flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors"
      style={{
        backgroundColor: selected ? 'var(--muted)' : 'transparent',
        borderLeft: selected ? '2.7px solid var(--primary)' : '2.7px solid transparent',
      }}
    >
      {/* Checkbox */}
      <div className="mt-0.5 shrink-0">
        {selected ? (
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
            <Check className="w-3 h-3" style={{ color: '#fff' }} />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border" style={{ borderColor: 'var(--card-border)' }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: brandColor }}>
              {senderInitials(email.from)}
            </div>
            <span className="text-[14px] truncate" style={{ color: 'var(--foreground)', fontWeight: senderWeight }}>
              {email.from_name || email.from}
            </span>
          </div>
          <span className="text-[11px] shrink-0" style={{ color: 'var(--muted-foreground)' }}>{timeStr}</span>
        </div>

        <div className="text-[14px] truncate mt-1" style={{ color: 'var(--foreground)', fontWeight: subjectWeight }}>{email.subject || '(无主题)'}</div>

        <div className="text-[13px] leading-5 mt-0.5 line-clamp-2" style={{ color: 'var(--foreground-tertiary)' }}>{email.body_preview}</div>

        <div className="flex items-center gap-2 mt-2">
          {tag && (
            <span className="h-[18px] px-2 rounded-md flex items-center text-[10px] font-medium" style={{ backgroundColor: tag.bg, color: tag.color }}>{tag.label}</span>
          )}
          {email.has_attachments && (
            <span className="flex items-center gap-0.5 text-[11px] text-[var(--muted-foreground)]">
              <Paperclip className="w-3 h-3" /> 附件
            </span>
          )}
        </div>
      </div>

      {/* Right: star (selected) or unread dot */}
      <div className="shrink-0 mt-1">
        {selected ? (
          <Star className="w-4 h-4" style={{ color: 'var(--gold)', fill: 'var(--gold)' }} />
        ) : unread ? (
          <span className="w-[9px] h-2 rounded-full block" style={{ backgroundColor: 'var(--primary)' }} />
        ) : null}
      </div>
    </div>
  )
}