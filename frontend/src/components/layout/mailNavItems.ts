import type { CSSProperties } from 'react'

export type NavItemColor = 'red' | 'gold' | 'green' | 'blue' | 'navy' | 'gray' | 'warning'

export type MailNavItem = {
  label: string
  href: string
  icon: string
  color: NavItemColor
}

export const MAIL_NAV_ITEMS: MailNavItem[] = [
  { label: '收件箱',   href: '/mail?folder=INBOX',    icon: 'ri-inbox-line',        color: 'red' },
  { label: '标星邮件', href: '/mail?folder=STARRED',  icon: 'ri-star-line',         color: 'gold' },
  { label: '稍后处理', href: '/mail?folder=DEFERRED', icon: 'ri-time-line',         color: 'green' },
  { label: '已发送',   href: '/mail?folder=Sent',     icon: 'ri-send-plane-line',   color: 'blue' },
  { label: '草稿箱',   href: '/mail?folder=Drafts',   icon: 'ri-draft-line',        color: 'green' },
  { label: '已删除',   href: '/mail?folder=Trash',    icon: 'ri-delete-bin-line',   color: 'gray' },
  { label: '垃圾邮件', href: '/mail?folder=SPAM',     icon: 'ri-alert-line',        color: 'warning' },
]

/** 色族 → 图标 CSS 变量（与 globals.css 的 .nav-tab--* 规则一一对应） */
export const NAV_ITEM_COLOR_VARS: Record<NavItemColor, string> = {
  red: 'var(--brand-red)',
  gold: 'var(--brand-gold-strong)',
  green: 'var(--brand-green)',
  blue: 'var(--brand-blue)',
  navy: 'var(--brand-navy)',
  gray: 'var(--brand-gray)',
  warning: 'var(--color-warning)',
}

/**
 * 图标的 CSS 颜色。
 * 激活态仅朱红系改主色（朱红与主色同源，红上加红会糊），其余色族保持品牌色。
 */
export function navIconColor(color: NavItemColor, active: boolean): CSSProperties['color'] {
  if (active && color === 'red') return 'var(--color-primary)'
  return NAV_ITEM_COLOR_VARS[color]
}

/** 侧边栏等「激活态图标统一主色」的场景（DESIGN.md 2.2） */
export function sidebarIconColor(color: NavItemColor, active: boolean): CSSProperties['color'] {
  return active ? 'var(--color-primary)' : NAV_ITEM_COLOR_VARS[color]
}
