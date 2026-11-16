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
    name: '浅色主题 · 暖砂',
    desc: '当前默认，长时间阅读邮件不易疲劳',
    skin: '#FBF7F0',
    topbar: '#FFFFFF',
    content: '#F3EDE3',
    previewBg: '#F7EED4',
  },
  {
    id: 'dark',
    name: '深色主题 · 墨夜',
    desc: '夜间或暗光环境邮件阅读更护眼',
    skin: '#1E1E24',
    topbar: '#2A2A32',
    content: '#3A3A42',
    previewBg: '#333A45',
  },
]

const ACCENTS: AccentOption[] = [
  { key: 'default', name: '朱红 · 默认', color: '#BE3B2E', value: '' },
  { key: '#d3a93f', name: '鎏金', color: '#D3A93F', value: '#D3A93F' },
  { key: '#3e8c6e', name: '玉绿', color: '#3E8C6E', value: '#3E8C6E' },
  { key: '#4a72a8', name: '云蓝', color: '#4A72A8', value: '#4A72A8' },
  { key: '#2f3640', name: '黛墨', color: '#2F3640', value: '#2F3640' },
]

const LAYOUTS: LayoutOption[] = [
  { id: 'topbar', name: '顶栏模式 · 居中导航', desc: '六大模块在顶栏居中排布，右上角统一为返回与设置' },
  { id: 'sidebar', name: '侧边栏模式 · 左侧导航', desc: '七大模块在左侧竖列居中排布，顶栏不显示图标文字' },
]

const LAYOUT_TAB_COLORS = ['#BE3B2E', '#D3A93F', '#3E8C6E', '#4A72A8', '#BE3B2E', '#D3A93F']
const LAYOUT_SIDE_COLORS = ['#D3A93F', '#BE3B2E', '#3E8C6E', '#4A72A8', '#2F3640']

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
    <div className="flex flex-col gap-5" style={{ maxWidth: 1620 }}>
      {/* 外观主题 Card */}
      <div style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', borderRadius: 16, padding: cardPadding }}>
        <div style={{ fontSize: cardTitleSize, fontWeight: 500, color: 'var(--foreground)' }}>外观主题</div>
        <div className={isMobile ? 'flex gap-3' : 'flex gap-6'} style={{ marginTop: isMobile ? 14 : 20 }}>
          {THEMES.map(theme => {
            const active = selectedTheme === theme.id
            return (
              <div
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={isMobile ? 'flex flex-col gap-3 relative' : 'flex flex-col gap-6 relative'}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: '0.7px solid ' + (active ? 'var(--color-primary)' : 'var(--card-border)'),
                  backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--card)',
                  borderRadius: 14,
                  padding: mockupPadding,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  className="absolute"
                  style={{ top: 14, right: 14, zIndex: 2, width: 22, height: 22, borderRadius: 9999, backgroundColor: active ? 'var(--color-primary)' : 'transparent', border: active ? 'none' : '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {active && <Check className="w-4 h-4 text-white" />}
                </div>
                <div className="flex flex-col justify-between" style={{ width: '100%', height: isMobile ? 96 : 128, borderRadius: 8, padding: mockupPadding, backgroundColor: theme.previewBg }}>
                  <div style={{ width: '100%', height: isMobile ? 22 : 28, borderRadius: 5, backgroundColor: theme.topbar }} />
                  <div style={{ width: '100%', height: isMobile ? 40 : 54, borderRadius: 6, backgroundColor: theme.content }} />
                </div>
                <div>
                  <div style={{ fontSize: nameSize, fontWeight: 500, color: 'var(--foreground)' }}>{theme.name}</div>
                  <div style={{ fontSize: descSize, color: 'var(--foreground-tertiary)', marginTop: descMargin }}>{theme.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 强调色 Card */}
      <div style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', borderRadius: 16, padding: cardPadding }}>
        <div style={{ fontSize: cardTitleSize, fontWeight: 500, color: 'var(--foreground)' }}>强调色</div>
        <div className="flex" style={{ gap: isMobile ? 10 : 40, marginTop: isMobile ? 14 : 24, flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: isMobile ? 'space-around' : undefined }}>
          {ACCENTS.map(accent => {
            const active = selectedAccent === accent.value
            return (
              <div
                key={accent.key}
                onClick={() => handleSelectAccent(accent.value)}
                className="flex flex-col items-center"
                style={{ gap: isMobile ? 8 : 16, cursor: 'pointer' }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ width: isMobile ? 40 : 80, height: isMobile ? 40 : 80, borderRadius: 9999, backgroundColor: accent.color, transition: 'all 0.2s' }}
                >
                  {active && <Check className={isMobile ? 'w-5 h-5 text-white' : 'w-[30px] h-[30px] text-white'} />}
                </div>
                <div
                  style={{
                    fontSize: isMobile ? 11 : 15,
                    color: active ? 'var(--foreground)' : 'var(--foreground-secondary)',
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {accent.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 布局切换 Card */}
      <div style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', borderRadius: 16, padding: cardPadding }}>
        <div style={{ fontSize: cardTitleSize, fontWeight: 500, color: 'var(--foreground)' }}>布局切换</div>
        <div className={isMobile ? 'flex gap-2' : 'flex gap-6'} style={{ marginTop: isMobile ? 12 : 20 }}>
          {LAYOUTS.map(lay => {
            const active = selectedLayout === lay.id
            return (
              <div
                key={lay.id}
                onClick={() => handleSelectLayout(lay.id)}
                className={isMobile ? 'flex flex-col gap-2 relative' : 'flex flex-col gap-6 relative'}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: active ? '0.7px solid var(--color-primary)' : '0.7px solid var(--card-border)',
                  backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--card)',
                  borderRadius: 14,
                  padding: isMobile ? 10 : mockupPadding,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  className="absolute"
                  style={{ top: 10, right: 10, zIndex: 2, width: badgeSize, height: badgeSize, borderRadius: 9999, backgroundColor: active ? 'var(--color-primary)' : 'transparent', border: active ? 'none' : '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {active && <Check className={isMobile ? 'w-3 h-3 text-white' : 'w-4 h-4 text-white'} />}
                </div>
                {/* Layout Mockup */}
                <div style={{ width: '100%', height: layout.h, borderRadius: 8, padding: layout.pad, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.5)', overflow: 'hidden', minWidth: 0 }}>
                  {lay.id === 'topbar' ? (
                    /* Topbar mockup */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <div style={{ height: layout.barH, display: 'flex', alignItems: 'center', padding: `0 ${layout.barPad}px`, gap: layout.barGap, flexShrink: 0, minWidth: 0 }}>
                        <div style={{ width: layout.dot, height: layout.dotH, borderRadius: '50%', backgroundColor: '#BE3B2E', flexShrink: 0 }} />
                        <div style={{ width: layout.p1W, height: layout.p1H, borderRadius: 3, backgroundColor: '#2F3640', flexShrink: 0 }} />
                        <div style={{ width: layout.p2W, height: layout.p2H, borderRadius: 3, backgroundColor: '#A7A296', flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', gap: layout.tabGap, justifyContent: 'center', overflow: 'hidden', minWidth: 0 }}>
                          {Array.from({ length: layout.tabN }).map((_, i) => (
                            <div key={i} style={{ width: layout.tabW, height: layout.tabH, borderRadius: 50, backgroundColor: LAYOUT_TAB_COLORS[i % LAYOUT_TAB_COLORS.length], opacity: 0.7, flexShrink: 0 }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: layout.rightGap, marginLeft: 'auto', flexShrink: 0 }}>
                          <div style={{ width: layout.dot, height: layout.dotH, borderRadius: '50%', backgroundColor: '#D6CDC8' }} />
                          <div style={{ width: layout.dot, height: layout.dotH, borderRadius: '50%', backgroundColor: '#D6CDC8' }} />
                        </div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', gap: layout.bodyGap, padding: `${layout.bodyPad}px 0 0`, minWidth: 0 }}>
                        <div style={{ width: layout.listW, borderRadius: 6, backgroundColor: '#E2DDD2', flexShrink: 0 }} />
                        <div style={{ flex: 1, borderRadius: 6, backgroundColor: '#E6E2D8', minWidth: 0 }} />
                      </div>
                    </div>
                  ) : (
                    /* Sidebar mockup */
                    <div style={{ flex: 1, display: 'flex', backgroundColor: 'rgba(245,241,230,1)', borderRadius: 8, minWidth: 0 }}>
                      <div style={{ width: layout.sbW, display: 'flex', flexDirection: 'column', gap: layout.sbGap, alignItems: 'center', justifyContent: 'center', padding: `${layout.sbPad}px 0`, flexShrink: 0, backgroundColor: '#fff', borderRight: '1px solid #f0ebe3' }}>
                        {LAYOUT_SIDE_COLORS.map((c, i) => (
                          <div key={i} style={{ width: layout.sbItemW, height: layout.sbItemH, borderRadius: 50, backgroundColor: c, opacity: 0.7 }} />
                        ))}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `${layout.bodyPad}px 0 0 ${layout.bodyGap}px`, minWidth: 0 }}>
                        <div style={{ height: layout.barH, display: 'flex', alignItems: 'center', gap: layout.barGap, marginBottom: layout.bodyGap, flexShrink: 0, minWidth: 0 }}>
                          <div style={{ width: layout.dot, height: layout.dotH, borderRadius: '50%', backgroundColor: '#BE3B2E', flexShrink: 0 }} />
                          <div style={{ width: layout.p1W, height: layout.p1H, borderRadius: 3, backgroundColor: '#2F3640', flexShrink: 0 }} />
                          <div style={{ width: layout.p2W, height: layout.p2H, borderRadius: 3, backgroundColor: '#A7A296', flexShrink: 0 }} />
                          <div style={{ flex: 1 }} />
                          <div style={{ display: 'flex', gap: layout.rightGap, flexShrink: 0 }}>
                            <div style={{ width: layout.dot, height: layout.dotH, borderRadius: '50%', backgroundColor: '#D6CDC8' }} />
                            <div style={{ width: layout.dot, height: layout.dotH, borderRadius: '50%', backgroundColor: '#D6CDC8' }} />
                          </div>
                        </div>
                        <div style={{ flex: 1, borderRadius: 6, backgroundColor: '#E6E2D8', minWidth: 0 }} />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: layout.nameSize, fontWeight: 500, color: 'var(--foreground)' }}>{lay.name}</div>
                  <div style={{ fontSize: layout.descSize, color: 'var(--foreground-tertiary)', marginTop: descMargin, lineHeight: 1.35 }}>{lay.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
