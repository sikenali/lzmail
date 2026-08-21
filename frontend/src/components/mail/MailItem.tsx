'use client'
import { Check, Paperclip, Star, User } from '@/lib/icons'
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
}

const MemoizedMailItem = React.memo(function MailItem({ email, brand, selected = false, checked = false, onSelect, onToggle, onStar, folder, density = 'comfortable' }: MailItemProps) {
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
  const avatarContent = (isSent ? (email.to?.trim() || email.from?.trim()) : (email.from_name?.trim() || email.from?.trim()))
    ? displayInitial
    : '🐱'
  const senderAvatarURL = email.sender_avatar_url || ''

  const compact = density === 'compact'
  const avatarSize = compact ? '24px' : '32px'
  const avatarFontSize = compact ? '10px' : '10px'
  const senderFontSize = compact ? '13px' : '14px'
  const subjectFontSize = compact ? '13px' : '14px'
  const previewFontSize = compact ? '12px' : '13px'
  const timeFontSize = compact ? '10px' : '11px'
  const attachmentIconSize = compact ? 'w-2 h-2' : 'w-3 h-3'
  const attachmentFontSize = compact ? '10px' : '11px'

  const isChecked = checked

  const rowStyle = {
    padding: compact ? '8px 20px' : '16px 20px',
    minHeight: compact ? '40px' : '57px',
    backgroundColor: selected ? 'var(--muted)' : 'transparent',
    borderLeft: selected ? '2.7px solid var(--primary)' : '2.7px solid transparent',
  }
  return (
    <div onClick={() => onSelect(email.id)} title="查看详情"
      className="flex items-start gap-3 cursor-pointer transition-colors"
      style={rowStyle}
    >
{/* Checkbox */}
          <div className="mt-0.5 shrink-0" onClick={(e) => { e.stopPropagation(); onToggle?.(email.id) }}>
        {isChecked ? (
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
            <Check className="w-3 h-3" style={{ color: '#fff' }} />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-md border-2" style={{ borderColor: 'rgba(139,115,85,0.4)' }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {senderAvatarURL ? (
              <img src={senderAvatarURL} alt="" className="rounded-full shrink-0 object-cover" style={{ width: avatarSize, height: avatarSize }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className="rounded-full shrink-0 overflow-hidden" style={{ backgroundColor: brandColor, width: avatarSize, height: avatarSize }}>
                <User className="w-[60%] h-[60%] text-white" style={{ margin: 'auto', display: 'block' }} />
              </div>
            )}
            <span className="truncate" style={{ color: 'var(--foreground)', fontWeight: senderWeight, fontSize: senderFontSize }}>
              {displayName}
            </span>
          </div>
          <span className="shrink-0" style={{ color: 'var(--muted-foreground)', fontSize: timeFontSize }}>{timeStr}</span>
        </div>

        <div className="truncate mt-1" style={{ color: 'var(--foreground)', fontWeight: subjectWeight, fontSize: subjectFontSize }}>{email.subject || '(无主题)'}</div>

        <div className="line-clamp-2 mt-0.5" style={{ color: 'var(--foreground-tertiary)', fontSize: previewFontSize, lineHeight: 1.5 }}>{email.body_preview}</div>

        <div className="flex items-center gap-2 mt-2">
          {email.has_attachments && (
            <span className="flex items-center gap-0.5" style={{ color: 'var(--muted-foreground)', fontSize: attachmentFontSize }}>
              <Paperclip className={attachmentIconSize} /> 附件
            </span>
          )}
        </div>
      </div>

      {/* Right: star (selected) or unread dot */}
      <div className="shrink-0 mt-1">
        {selected ? (
          <button
            onClick={(e) => { e.stopPropagation(); onStar?.(email.id, !email.is_starred) }}
            className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-[var(--accent)]"
            title={email.is_starred ? '取消标星' : '标星'}
          >
            <Star className="w-4 h-4" style={{ color: 'var(--gold)', fill: 'var(--gold)' }} />
          </button>
        ) : unread ? (
          <span className="w-[9px] h-2 rounded-full block" style={{ backgroundColor: 'var(--primary)' }} />
        ) : null}
      </div>
    </div>
  )
}, (prev, next) => {
  return prev.email.id === next.email.id &&
    prev.selected === next.selected &&
    prev.checked === next.checked &&
    prev.brand === next.brand &&
    prev.email.is_read === next.email.is_read &&
    prev.email.is_starred === next.email.is_starred &&
    prev.email.subject === next.email.subject &&
    prev.email.body_preview === next.email.body_preview &&
    prev.email.from_name === next.email.from_name &&
    prev.email.to === next.email.to &&
    prev.email.has_attachments === next.email.has_attachments &&
    prev.email.sender_avatar_url === next.email.sender_avatar_url &&
    prev.folder === next.folder
})

export const MailItem = MemoizedMailItem