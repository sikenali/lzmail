'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useSettings, normalizeAccent } from '@/hooks/useSettings'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Check } from '@/lib/icons'

interface ThemeOption {
  id: string
  name: string
  desc: string
  skin: string
  topbar: string
  content: string
  previewBg: string
}

interface AccentOption {
  key: string
  name: string
  color: string
  value: string
}

interface LayoutOption {
  id: 'topbar' | 'sidebar'
  name: string
  desc: string
}

const THEMES: ThemeOption[] = [
  {
    id: 'light',
    name: '浅色 · 星云',
    desc: '默认科技浅色，界面清晰，长时间阅读邮件不易疲劳',
    skin: '#F4F7FA',
    topbar: '#FFFFFF',
    content: '#EEF2F7',
    previewBg: '#EAF2F8',
  },
  {
    id: 'dark',
    name: '深色 · 深空',
    desc: '深空科技底色，夜间或暗光环境处理邮件更护眼',
    skin: '#0A0F18',
    topbar: '#151D2C',
    content: '#0F1623',
    previewBg: '#0A0F18',
  },
]

const ACCENTS: AccentOption[] = [
  { key: 'default', name: '电光青 · 默认', color: '#00D4AA', value: '' },
  { key: '#FFB347', name: '鎏金', color: '#FFB347', value: '#FFB347' },
  { key: '#00A878', name: '玉绿', color: '#00A878', value: '#00A878' },
  { key: '#4A9EFF', name: '云蓝', color: '#4A9EFF', value: '#4A9EFF' },
  { key: '#FF4D6D', name: '珊瑚', color: '#FF4D6D', value: '#FF4D6D' },
]

const LAYOUTS: LayoutOption[] = [
  { id: 'topbar', name: '顶栏模式 · 居中导航', desc: '邮件模块在顶栏居中排布，右上角统一为设置与账号入口' },
  { id: 'sidebar', name: '侧边栏模式 · 左侧导航', desc: '邮件模块在左侧竖列居中排布，顶栏仅显示页面标题' },
]

const LAYOUT_TAB_COLORS = ['#00D4AA', '#FFB347', '#00A878', '#4A9EFF', '#FF4D6D', '#FFB347']
const LAYOUT_SIDE_COLORS = ['#FFB347', '#00D4AA', '#00A878', '#4A9EFF', '#FF4D6D']

export function ThemeSettings() {
  const { settings, setSetting } = useSettings()
  const isMobile = useIsMobile()
  const [selectedTheme, setSelectedTheme] = useState(settings.theme || 'light')
  const [selectedAccent, setSelectedAccent] = useState(normalizeAccent(settings.accent_color))
  const normNav = (v?: string) => (v === 'sidebar' ? 'sidebar' : 'topbar')
  const [selectedLayout, setSelectedLayout] = useState(normNav(settings.nav_mode))

  useEffect(() => {
    setSelectedTheme(settings.theme || 'light')
    setSelectedAccent(normalizeAccent(settings.accent_color))
    setSelectedLayout(normNav(settings.nav_mode))
  }, [settings.theme, settings.accent_color, settings.nav_mode])

  const handleSelectTheme = (id: string) => {
    setSelectedTheme(id)
    setSetting('theme', id)
  }

  const handleSelectAccent = (value: string) => {
    setSelectedAccent(value)
    setSetting('accent_color', value)
  }

  const handleSelectLayout = (id: string) => {
    setSelectedLayout(id)
    setSetting('nav_mode', id)
    toast.success(`已切换布局：${LAYOUTS.find(l => l.id === id)?.name || ''}`)
  }

  const cardPadding = isMobile ? '16px 16px' : '24px 28px'
  const cardTitleSize = isMobile ? 15 : 17
  const nameSize = isMobile ? 14 : 16
  const descSize = isMobile ? 12 : 14
  const descMargin = isMobile ? 6 : 8
  const mockupPadding = isMobile ? 12 : 16
  const badgeSize = isMobile ? 18 : 22
  const layout = isMobile
    ? {
        h: 76, pad: 8, barH: 22, barPad: 6, barGap: 4, dot: 6, dotH: 5,
        p1W: 16, p1H: 4, p2W: 11, p2H: 4, tabW: 18, tabH: 6, tabN: 3, tabGap: 4,
        bodyPad: 6, bodyGap: 6, listW: 44, sbW: 32, sbPad: 6, sbGap: 6, sbItemW: 24, sbItemH: 6, rightGap: 3,
        nameSize: 13, descSize: 11,
      }
    : {
        h: 150, pad: 16, barH: 32, barPad: 12, barGap: 8, dot: 11, dotH: 10,
        p1W: 25, p1H: 6, p2W: 17, p2H: 6, tabW: 31, tabH: 10, tabN: 6, tabGap: 8,
        bodyPad: 12, bodyGap: 12, listW: 85, sbW: 56, sbPad: 12, sbGap: 12, sbItemW: 44, sbItemH: 9, rightGap: 4,
        nameSize: 16, descSize: 14,
      }

  return (
    <div className="settings-view">
      {/* §6.2 外观主题 Card（复用 lzc2vsdx ThemeSettingsView） */}
      <section className="theme-card">
        <h3 className="card-title">外观主题</h3>
        <div className="mode-grid">
          {THEMES.map(theme => {
            const active = selectedTheme === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                className={`mode-card ${active ? 'active' : ''}`}
                onClick={() => handleSelectTheme(theme.id)}
                aria-pressed={active}
              >
                {active && (
                  <span className="check-badge theme">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <span className={`thumb ${theme.id === 'light' ? 'thumb-light' : 'thumb-dark'}`}>
                  <span className="thumb-bar" />
                  <span className="thumb-content" />
                </span>
                <span className="mode-name">{theme.name}</span>
                <span className="mode-desc">{theme.desc}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* §6.3 强调色 Card */}
      <section className="theme-card">
        <h3 className="card-title">强调色</h3>
        <div className="accent-row">
          {ACCENTS.map(accent => {
            const active = selectedAccent === accent.value
            return (
              <button
                key={accent.key}
                type="button"
                className="accent-item"
                onClick={() => handleSelectAccent(accent.value)}
                aria-pressed={active}
              >
                <span className={`accent-swatch ${active ? 'active' : ''}`} style={{ background: accent.color }}>
                  {active && <Check className="w-5 h-5" style={{ color: accent.color === '#FFB347' ? '#0A1628' : '#FFFFFF' }} />}
                </span>
                <span className={`accent-name ${active ? 'active' : ''}`}>{accent.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* §6.4 布局切换 Card */}
      <section className="theme-card">
        <h3 className="card-title">布局切换</h3>
        <div className="layout-grid">
          {LAYOUTS.map(lay => {
            const active = selectedLayout === lay.id
            return (
              <button
                key={lay.id}
                type="button"
                className={`layout-card ${active ? 'active' : ''}`}
                onClick={() => handleSelectLayout(lay.id)}
                aria-pressed={active}
              >
                {active && (
                  <span className="check-badge theme">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                {lay.id === 'topbar' ? (
                  <span className="mockup mock-topbar">
                    <span className="mock-topbar-bar">
                      <span className="nav-dot" /><span className="nav-dot" /><span className="nav-dot" />
                      <span className="nav-dot" /><span className="nav-dot" /><span className="nav-dot" />
                      <span className="actions-dot" /><span className="actions-dot" />
                    </span>
                    <span className="mock-topbar-content">
                      <span className="block block-wide" /><span className="block" />
                    </span>
                  </span>
                ) : (
                  <span className="mockup mock-sidebar">
                    <span className="mock-sidebar-rail">
                      <span className="rail-dot" /><span className="rail-dot" /><span className="rail-dot" />
                      <span className="rail-dot" /><span className="rail-dot" /><span className="rail-dot" />
                    </span>
                    <span className="mock-sidebar-main">
                      <span className="main-title" />
                      <span className="block block-wide" /><span className="block" />
                    </span>
                  </span>
                )}
                <span className="layout-name">{lay.name}</span>
                <span className="layout-desc">{lay.desc}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
