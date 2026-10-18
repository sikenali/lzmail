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
  id: string
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
  { id: 'three', name: '三栏模式 · 完整视图', desc: '文件夹、列表、详情三栏并排，信息密度最高' },
  { id: 'two', name: '双栏模式 · 精简视图', desc: '列表与详情并排，文件夹收起节省空间' },
]

export function ThemeSettings() {
  const { settings, setSetting } = useSettings()
  const isMobile = useIsMobile()
  const [selectedTheme, setSelectedTheme] = useState(settings.theme || 'light')
  const [selectedAccent, setSelectedAccent] = useState(normalizeAccent(settings.accent_color))
  const [selectedLayout, setSelectedLayout] = useState(settings.layout_density || 'three')

  useEffect(() => {
    setSelectedTheme(settings.theme || 'light')
    setSelectedAccent(normalizeAccent(settings.accent_color))
    setSelectedLayout(settings.layout_density || 'three')
  }, [settings.theme, settings.accent_color, settings.layout_density])

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
    setSetting('layout_density', id)
    toast.success(`已切换布局：${LAYOUTS.find(l => l.id === id)?.name || ''}`)
  }

  const cardPadding = isMobile ? '16px 16px' : '24px 28px'
  const cardTitleSize = isMobile ? 15 : 17
  const nameSize = isMobile ? 14 : 16
  const descSize = isMobile ? 12 : 14
  const descMargin = isMobile ? 6 : 8
  const mockupPadding = isMobile ? 12 : 16

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
        <div className={isMobile ? 'flex gap-3' : 'flex gap-6'} style={{ marginTop: isMobile ? 14 : 20 }}>
          {LAYOUTS.map(layout => {
            const active = selectedLayout === layout.id
            return (
              <div
                key={layout.id}
                onClick={() => handleSelectLayout(layout.id)}
                className={isMobile ? 'flex flex-col gap-3 relative' : 'flex flex-col gap-6 relative'}
                style={{
                  flex: 1,
                  border: '0.7px solid var(--card-border)',
                  backgroundColor: active ? 'var(--primary-light)' : 'var(--card)',
                  borderRadius: 14,
                  padding: mockupPadding,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  className="absolute"
                  style={{ top: 14, right: 14, zIndex: 2, width: 22, height: 22, borderRadius: 9999, backgroundColor: active ? 'var(--primary)' : 'transparent', border: active ? 'none' : '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {active && <Check className="w-4 h-4 text-white" />}
                </div>
                {/* Layout Mockup */}
                <div style={{ width: '100%', height: isMobile ? 104 : 150, borderRadius: 8, padding: mockupPadding, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.5)' }}>
                  {layout.id === 'three' ? (
                    <div className="flex flex-col" style={{ flex: 1 }}>
                      <div className="flex items-center gap-2" style={{ height: 32, backgroundColor: '#fff', borderRadius: 6, padding: '0 12px' }}>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 11, height: 10, borderRadius: 9999, backgroundColor: '#C43D3D' }} />
                          <div style={{ width: 25, height: 6, borderRadius: 9999, backgroundColor: '#2F3640' }} />
                          <div style={{ width: 17, height: 6, borderRadius: 9999, backgroundColor: '#A7A296' }} />
                        </div>
                        <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
                          <div style={{ width: 9, height: 8, borderRadius: 9999, backgroundColor: '#D6CDC8' }} />
                          <div style={{ width: 9, height: 8, borderRadius: 9999, backgroundColor: '#D6CDC8' }} />
                        </div>
                      </div>
                      <div className="flex gap-3" style={{ flex: 1, marginTop: 12 }}>
                        <div style={{ width: 85, borderRadius: 6, backgroundColor: '#E2DDD2' }} />
                        <div style={{ flex: 1, borderRadius: 6, backgroundColor: '#E6E2D8' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex" style={{ flex: 1, backgroundColor: 'rgba(245,241,230,1)', borderRadius: 8 }}>
                      <div className="flex flex-col items-center justify-center" style={{ gap: 12, padding: '12px 0', width: 56 }}>
                        <div style={{ width: 44, height: 9, borderRadius: 9999, backgroundColor: '#C9A96E' }} />
                        <div style={{ width: 44, height: 9, borderRadius: 9999, backgroundColor: '#C43D3D' }} />
                        <div style={{ width: 44, height: 9, borderRadius: 9999, backgroundColor: '#5B8C5A' }} />
                        <div style={{ width: 44, height: 9, borderRadius: 9999, backgroundColor: '#6B8FA3' }} />
                        <div style={{ width: 44, height: 9, borderRadius: 9999, backgroundColor: '#2F3640' }} />
                      </div>
                      <div className="flex flex-col" style={{ flex: 1, padding: '12px 0 0 12px' }}>
                        <div className="flex items-center gap-2" style={{ height: 32, backgroundColor: '#fff', borderRadius: 6, padding: '0 12px', marginBottom: 12 }}>
                          <div className="flex items-center gap-2">
                            <div style={{ width: 11, height: 10, borderRadius: 9999, backgroundColor: '#C43D3D' }} />
                            <div style={{ width: 25, height: 6, borderRadius: 9999, backgroundColor: '#2F3640' }} />
                            <div style={{ width: 17, height: 6, borderRadius: 9999, backgroundColor: '#A7A296' }} />
                          </div>
                          <div className="flex gap-1" style={{ marginLeft: 'auto' }}>
                            <div style={{ width: 9, height: 8, borderRadius: 9999, backgroundColor: '#D6CDC8' }} />
                            <div style={{ width: 9, height: 8, borderRadius: 9999, backgroundColor: '#D6CDC8' }} />
                          </div>
                        </div>
                        <div style={{ flex: 1, borderRadius: 6, backgroundColor: '#E6E2D8' }} />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: nameSize, fontWeight: 500, color: 'var(--foreground)' }}>{layout.name}</div>
                  <div style={{ fontSize: descSize, color: 'var(--foreground-tertiary)', marginTop: descMargin }}>{layout.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
