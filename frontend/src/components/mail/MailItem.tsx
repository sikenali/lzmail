'use client'
import { Check, Paperclip, Star, User } from '@/lib/icons'
import { Tooltip } from '@/components/Tooltip'
import type { Email } from '@/types'
import React from 'react'

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
    const yesterdayMid = new Date(yesterday)
    yesterdayMid.setHours(0, 0, 0, 0)
    const dateMid = new Date(date)
    dateMid.setHours(0, 0, 0, 0)
    const diff = Math.floor((yesterdayMid.getTime() - dateMid.getTime()) / 86400000) + 1
    return `${diff}天前`
  }
  const sameYear = date.getFullYear() === today.getFullYear()
  if (sameYear) return `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}

const senderInitials = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/)
  if (parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name || '?')[0]?.toUpperCase() || '?'
}

type MailItemProps = {
  email: Email
  brand?: string
  selected?: boolean
  checked?: boolean
  onSelect: (id: number) => void
  onToggle?: (id: number) => void
  onStar?: (id: number, starred: boolean) => void
  folder?: string
  density?: 'comfortable' | 'compact'
  isMobile?: boolean
}

const MemoizedMailItem = React.memo(function MailItem({ email, brand, selected = false, checked = false, onSelect, onToggle, onStar, folder, density = 'comfortable', isMobile = false }: MailItemProps) {
   const bc = (brand || email.account_brand || '#c43d3d')
  const brandColor = bc.startsWith('#') ? bc : '#c43d3d'
  const unread = email.is_read === false
  const subjectWeight = selected || unread ? '600' : '500'
  const senderWeight = selected || unread ? '600' : '500'
  const timeStr = formatTime(email.date)
  const isSent = folder === 'Sent'
  const displayName = isSent ? (email.to || '我') : (email.from_name || email.from)
  const displayInitial = isSent
    ? (email.to ? email.to[0]?.toUpperCase() || '?' : '?')
    : senderInitials(email.from)
  const senderAvatarURL = email.sender_avatar_url || ''
  const recipientAvatarURL = email.recipient_avatar_url || ''
  // 已发送邮件显示收件人头像，其他显示发件人头像
  const avatarURL = isSent ? (recipientAvatarURL || senderAvatarURL) : senderAvatarURL

  const compact = density === 'compact'
  const mobile = isMobile
  const avatarSize = mobile ? '32px' : (compact ? '24px' : '32px')
  const senderFontSize = mobile ? '13px' : (compact ? '13px' : '14px')
  const subjectFontSize = mobile ? '13px' : (compact ? '13px' : '14px')

  const isChecked = checked

  const rowStyle = {
    padding: mobile ? '12px 14px' : (compact ? '8px 20px' : '16px 20px'),
    minHeight: mobile ? '52px' : (compact ? '40px' : '57px'),
    backgroundColor: selected ? 'var(--muted)' : 'transparent',
    borderLeft: selected ? '2.7px solid var(--primary)' : '2.7px solid transparent',
  }
  return (
    <div onClick={() => onSelect(email.id)} title="查看详情"
      className="flex items-center gap-3 cursor-pointer transition-colors"
      style={rowStyle}
    >
      {/* Checkbox - hidden on mobile */}
      {!mobile && (
        <div className="mt-0.5 shrink-0" onClick={(e) => { e.stopPropagation(); onToggle?.(email.id) }}>
          {isChecked ? (
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
              <Check className="w-3 h-3" style={{ color: '#fff' }} />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md border-2" style={{ borderColor: 'rgba(139,115,85,0.4)' }} />
          )}
        </div>
      )}

      {/* Avatar */}
      {avatarURL ? (
        <img src={avatarURL} alt="" className="rounded-full shrink-0 object-cover" style={{ width: avatarSize, height: avatarSize }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      ) : (
        <div className="rounded-full shrink-0 overflow-hidden" style={{ backgroundColor: brandColor, width: avatarSize, height: avatarSize }}>
          <User className="w-[60%] h-[60%] text-white" style={{ margin: 'auto', display: 'block' }} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate" style={{ color: 'var(--foreground)', fontWeight: senderWeight, fontSize: senderFontSize }}>
            {displayName}
          </span>
          {!mobile && (
            <span className="shrink-0 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{timeStr}</span>
          )}
        </div>
        <div className="truncate mt-0.5" style={{ color: 'var(--foreground)', fontWeight: subjectWeight, fontSize: subjectFontSize }}>{email.subject || '(无主题)'}</div>
        {!mobile && (
          <>
            <div className="line-clamp-2 mt-0.5" style={{ color: 'var(--foreground-tertiary)', fontSize: '13px', lineHeight: 1.5 }}>{email.body_preview}</div>
            <div className="flex items-center gap-2 mt-2">
              {email.has_attachments && (
                <span className="flex items-center gap-0.5" style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
                  <Paperclip className="w-3 h-3" /> 附件
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: star (selected) or unread dot - hidden on mobile */}
      {!mobile && (
        <div className="shrink-0">
          {selected ? (
            <Tooltip text={email.is_starred ? '取消标星' : '标星'}>
              <button onClick={(e) => { e.stopPropagation(); onStar?.(email.id, !email.is_starred) }} className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-[var(--accent)]" aria-label={email.is_starred ? '取消标星' : '标星'}>
                <Star className="w-4 h-4" style={{ color: email.is_starred ? 'var(--gold)' : 'var(--muted-foreground)', fill: email.is_starred ? 'var(--gold)' : 'none' }} />
              </button>
            </Tooltip>
          ) : unread ? (
            <span className="w-[9px] h-2 rounded-full block" style={{ backgroundColor: 'var(--primary)' }} />
          ) : null}
        </div>
      )}
    </div>
  )
}, (prev, next) => {
  return prev.email.id === next.email.id &&
    prev.selected === next.selected &&
    prev.checked === next.checked &&
    prev.density === next.density &&
    prev.folder === next.folder &&
    prev.email.is_read === next.email.is_read &&
    prev.email.is_starred === next.email.is_starred
})

export const MailItem = MemoizedMailItem