'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/useSettings'
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
    previewBg: '#FBF7F0',
  },
  {
    id: 'dark',
    name: '深色主题 · 墨夜',
    desc: '夜间或暗光环境邮件阅读更护眼',
    skin: '#1E1E24',
    topbar: '#2A2A32',
    content: '#3A3A42',
    previewBg: '#1E1E24',
  },
  {
    id: 'system',
    name: '跟随系统',
    desc: '根据操作系统主题自动切换',
    skin: '#E8E8E8',
    topbar: '#F5F5F5',
    content: '#D0D0D0',
    previewBg: '#E8E8E8',
  },
]

const ACCENTS: AccentOption[] = [
  { key: '#c43d3d', name: '朱红 · 默认', color: '#C43D3D' },
  { key: '#c9a96e', name: '鎏金', color: '#C9A96E' },
  { key: '#5b8c5a', name: '玉绿', color: '#5B8C5A' },
  { key: '#6b8fa3', name: '云蓝', color: '#6B8FA3' },
  { key: '#3d2b1f', name: '黛墨', color: '#3D2B1F' },
]

const LAYOUTS: LayoutOption[] = [
  { id: 'three', name: '三栏模式 · 完整视图', desc: '文件夹、列表、详情三栏并排，信息密度最高' },
  { id: 'two', name: '双栏模式 · 精简视图', desc: '列表与详情并排，文件夹收起节省空间' },
]

export function ThemeSettings() {
  const { settings, setSetting } = useSettings()
  const [selectedTheme, setSelectedTheme] = useState(settings.theme || 'light')
  const [selectedAccent, setSelectedAccent] = useState(settings.accent_color || '#c43d3d')
  const [selectedLayout, setSelectedLayout] = useState(settings.layout_density || 'three')

  useEffect(() => {
    setSelectedTheme(settings.theme || 'light')
    setSelectedAccent(settings.accent_color || '#c43d3d')
    setSelectedLayout(settings.layout_density || 'three')
  }, [settings.theme, settings.accent_color, settings.layout_density])

  const handleSelectTheme = (id: string) => {
    setSelectedTheme(id)
    setSetting('theme', id)
  }

  const handleSelectAccent = (color: string) => {
    setSelectedAccent(color)
    setSetting('accent_color', color)
  }

  const handleSelectLayout = (id: string) => {
    setSelectedLayout(id)
    setSetting('layout_density', id)
    toast.success(`已切换布局：${LAYOUTS.find(l => l.id === id)?.name || ''}`)
  }

  const handleResetAll = () => {
    setSetting('theme', 'light')
    setSetting('accent_color', '#c43d3d')
    setSetting('layout_density', 'three')
    toast.success('已恢复默认')
  }

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 1620 }}>
      {/* Page Header Card */}
      <div style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', borderRadius: 16, padding: '20px 24px' }}>
        <div className="flex justify-between items-start gap-6">
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-2" style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>
              <span>首页</span>
              <span style={{ color: 'var(--foreground-tertiary)' }}>/</span>
              <span>设置中心</span>
              <span style={{ color: 'var(--foreground-tertiary)' }}>/</span>
              <span style={{ color: 'var(--foreground-secondary)', fontWeight: 500 }}>主题设置</span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--foreground)', margin: '12px 0 0 0', letterSpacing: -0.5, lineHeight: 1.2 }}>主题设置</h1>
              <p style={{ fontSize: 15, color: 'var(--foreground-secondary)', margin: '8px 0 0 0' }}>统一切换外观底色、强调色与导航布局模式，修改即时生效</p>
            </div>
          </div>
          <button
            onClick={handleResetAll}
            className="inline-flex items-center gap-2 transition-all"
            style={{ padding: '0 20px', height: 48, border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', borderRadius: 12, fontSize: 15, color: 'var(--foreground-secondary)', cursor: 'pointer', flexShrink: 0 }}
          >
            <i className="ri-restart-line w-[18px] h-[18px]"></i>
            恢复默认
          </button>
        </div>
      </div>

      {/* 外观主题 Card */}
      <div style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>外观主题</div>
        <div className="flex gap-6" style={{ marginTop: 20 }}>
          {THEMES.map(theme => {
            const active = selectedTheme === theme.id
            return (
              <div
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className="flex flex-col gap-6 relative"
                style={{
                  flex: 1,
                  border: '0.7px solid var(--card-border)',
                  backgroundColor: active ? 'var(--primary-light)' : 'var(--card)',
                  borderRadius: 14,
                  padding: 24,
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
                <div className="flex flex-col justify-between" style={{ width: '100%', height: 128, borderRadius: 8, padding: 16, backgroundColor: theme.previewBg }}>
                  <div style={{ width: '100%', height: 28, borderRadius: 5, backgroundColor: theme.topbar }} />
                  <div style={{ width: '100%', height: 54, borderRadius: 6, backgroundColor: theme.content }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--foreground)' }}>{theme.name}</div>
                  <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)', marginTop: 8 }}>{theme.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 强调色 Card */}
      <div style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>强调色</div>
        <div className="flex" style={{ gap: 40, marginTop: 24 }}>
          {ACCENTS.map(accent => {
            const active = selectedAccent === accent.color
            return (
              <div
                key={accent.key}
                onClick={() => handleSelectAccent(accent.color)}
                className="flex flex-col items-center"
                style={{ gap: 16, cursor: 'pointer' }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ width: 80, height: 80, borderRadius: 9999, backgroundColor: accent.color, transition: 'all 0.2s' }}
                >
                  {active && <Check className="w-[30px] h-[30px] text-white" />}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: active ? 'var(--foreground)' : 'var(--foreground-secondary)',
                    fontWeight: active ? 500 : 400,
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
      <div style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>布局切换</div>
        <div className="flex gap-6" style={{ marginTop: 20 }}>
          {LAYOUTS.map(layout => {
            const active = selectedLayout === layout.id
            return (
              <div
                key={layout.id}
                onClick={() => handleSelectLayout(layout.id)}
                className="flex flex-col gap-6 relative"
                style={{
                  flex: 1,
                  border: '0.7px solid var(--card-border)',
                  backgroundColor: active ? 'var(--primary-light)' : 'var(--card)',
                  borderRadius: 14,
                  padding: 24,
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
                <div style={{ width: '100%', height: 150, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.5)' }}>
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
                  <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--foreground)' }}>{layout.name}</div>
                  <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)', marginTop: 8 }}>{layout.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
