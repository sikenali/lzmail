'use client'
import React from 'react'

function icon(name: string) {
  return React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    function Icon({ className, style, ...props }, ref) {
      return <i ref={ref} className={`${name} ${className || ''}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }} {...props} />
    }
  )
}

export const Mail = icon('ri-mail-line')
export const GoogleLine = icon('ri-google-line')
export const MicrosoftLine = icon('ri-microsoft-line')
export const QqLine = icon('ri-qq-line')
export const AppleLine = icon('ri-apple-line')
export const MagicLine = icon('ri-magic-line')
export const MailOpen = icon('ri-mail-open-line')
export const Search = icon('ri-search-line')
export const Settings = icon('ri-settings-3-line')
export const Star = icon('ri-star-line')
export const Clock = icon('ri-time-line')
export const Send = icon('ri-send-plane-line')
export const FileText = icon('ri-draft-line')
export const AlertTriangle = icon('ri-alert-line')
export const Plus = icon('ri-add-line')
export const ChevronDown = icon('ri-arrow-down-s-line')
export const Trash2 = icon('ri-delete-bin-line')
export const Paperclip = icon('ri-attachment-2')
export const RefreshCw = icon('ri-refresh-line')
export const ArrowLeft = icon('ri-arrow-left-s-line')
export const Sun = icon('ri-sun-line')
export const User = icon('ri-user-line')
export const ChevronRight = icon('ri-arrow-right-s-line')
export const ChevronLeft = icon('ri-arrow-left-s-line')
export const ChevronUp = icon('ri-arrow-up-s-line')
export const MoreHorizontal = icon('ri-more-2-line')
export const Reply = icon('ri-reply-line')
export const Forward = icon('ri-corner-up-right-line')
export const Italic = icon('ri-italic')
export const X = icon('ri-close-line')
export const Check = icon('ri-check-line')
export const Edit = icon('ri-edit-line')
export const Info = icon('ri-information-line')
export const Folder = icon('ri-folder-line')
export const Tags = icon('ri-price-tag-line')
export const Tag = icon('ri-price-tag-2-line')
export const FolderMove = icon('ri-folder-transfer-line')
export const Code = icon('ri-code-line')
export const Download = icon('ri-download-line')
export const Inbox = icon('ri-inbox-line')
export const Heading1 = icon('ri-heading')
export const Heading2 = icon('ri-heading')
export const Quote = icon('ri-double-quotes-l')
export const List = icon('ri-list-unordered')
export const ListOrdered = icon('ri-list-ordered')
export const Columns2 = icon('ri-layout-column-line')
export const Contact = icon('ri-contacts-book-line')
export const UserAdd = icon('ri-user-add-line')
export const ArrowUpDown = icon('ri-arrow-up-down-line')
export const MailCheck = icon('ri-mail-check-line')
export const LayoutRow = icon('ri-layout-row-line')
export const Layout2 = icon('ri-layout-2-line')
export const CollapseVertical = icon('ri-collapse-vertical-fill')
export const Globe = icon('ri-globe-line')
export const TrendingUp = icon('ri-arrow-up-line')
export const TrendingDown = icon('ri-arrow-down-line')
export const Calendar = icon('ri-calendar-line')
export const Phone = icon('ri-phone-line')
export const Bold = icon('ri-bold')
export const Underline = icon('ri-underline')
export const Image = icon('ri-image-line')
export const Link = icon('ri-link')
export const Table = icon('ri-table-line')
export const Minus = icon('ri-subtract-line')
export const Eye = icon('ri-eye-line')
export const EyeOff = icon('ri-eye-off-line')

export const PROVIDER_AVATAR_BG: Record<string, string> = {
  gmail:  '#ea4335',
  outlook:'#0078d4',
  qq:     '#12b7f5',
  netease:'#e53e3e',
  icloud: '#7c9a5f',
  yahoo:  '#721c90',
  other:  '#6366f1',
}

export function getAccountAvatarBg(account: { brand_color?: string; provider?: string; auth_method?: string }): string {
  if (account.brand_color) return account.brand_color
  const provider = (account.provider || '').toLowerCase()
  return PROVIDER_AVATAR_BG[provider] || '#6366f1'
}
