'use client'
import { useSettings } from '@/hooks/useSettings'
import { Minus, Plus, Columns2, Layout2, LayoutRow, CollapseVertical } from '@/lib/icons'

const layouts = [
  { key: 'topbar', name: '顶栏模式 · 居中导航', desc: '六大模块在顶栏居中排布，右上角统一为返回与设置', color: '#C0392B' },
  { key: 'sidebar', name: '侧边栏模式 · 左侧导航', desc: '七大模块在左侧竖列居中排布，顶栏不显示图标文字', color: '#4A72A8' },
]

function TopbarMockup() {
  return (
    <div style={{ width: '100%', height: 150, borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ height: 32, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 11, height: 10, borderRadius: '50%', backgroundColor: '#BE3B2E', flexShrink: 0 }} />
        <div style={{ width: 25, height: 6, borderRadius: 3, backgroundColor: '#2F3640', flexShrink: 0 }} />
        <div style={{ width: 17, height: 6, borderRadius: 3, backgroundColor: '#A7A296', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', gap: 8, justifyContent: 'center', overflow: 'hidden' }}>
          {['#BE3B2E', '#D3A93F', '#3E8C6E', '#4A72A8', '#BE3B2E', '#D3A93F'].map((c, i) => (
            <div key={i} style={{ width: 31, height: 10, borderRadius: 50, backgroundColor: c, opacity: 0.7, flexShrink: 0 }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <div style={{ width: 9, height: 8, borderRadius: '50%', backgroundColor: '#D6CDC8' }} />
          <div style={{ width: 9, height: 8, borderRadius: '50%', backgroundColor: '#D6CDC8' }} />
        </div>
      </div>
      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 12, padding: '12px' }}>
        <div style={{ width: 85, borderRadius: 6, backgroundColor: '#E2DDD2', flexShrink: 0 }} />
        <div style={{ flex: 1, borderRadius: 6, backgroundColor: '#E6E2D8' }} />
      </div>
    </div>
  )
}

function SidebarMockup() {
  return (
    <div style={{ width: '100%', height: 150, borderRadius: 8, backgroundColor: '#f5f1e6', overflow: 'hidden', display: 'flex', flexShrink: 0 }}>
      {/* Sidebar */}
      <div style={{ width: 56, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', padding: '12px 0', flexShrink: 0, backgroundColor: '#fff', borderRight: '1px solid #f0ebe3' }}>
        {[
          { bg: '#D3A93F' },
          { bg: '#BE3B2E' },
          { bg: '#3E8C6E' },
          { bg: '#4A72A8' },
          { bg: '#2F3640' },
        ].map((item, i) => (
          <div key={i} style={{ width: 44, height: 9, borderRadius: 50, backgroundColor: item.bg, opacity: 0.7 }} />
        ))}
      </div>
      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 0 0 12px' }}>
        {/* Header */}
        <div style={{ height: 28, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
          <div style={{ width: 11, height: 10, borderRadius: '50%', backgroundColor: '#BE3B2E', flexShrink: 0 }} />
          <div style={{ width: 25, height: 6, borderRadius: 3, backgroundColor: '#2F3640', flexShrink: 0 }} />
          <div style={{ width: 17, height: 6, borderRadius: 3, backgroundColor: '#A7A296', flexShrink: 0 }} />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ width: 9, height: 8, borderRadius: '50%', backgroundColor: '#D6CDC8' }} />
            <div style={{ width: 9, height: 8, borderRadius: '50%', backgroundColor: '#D6CDC8' }} />
          </div>
        </div>
        {/* Body */}
        <div style={{ flex: 1, borderRadius: 6, backgroundColor: '#E6E2D8' }} />
      </div>
    </div>
  )
}

export function StyleSettings() {
  const { settings, setSetting } = useSettings()
  const sizeLabels: Record<string, string> = { small: '小 (14px)', medium: '中 (16px)', large: '大 (18px)' }
  const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large']
  const section = { borderBottom: '1px solid var(--card-border)' }
  const navMode = settings.nav_mode || 'topbar'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 字体大小 */}
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', ...section }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>字体大小</div>
              <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>调整邮件正文与界面文字大小</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => {
                const idx = sizes.indexOf((settings.font_size || 'medium') as 'small' | 'medium' | 'large')
                setSetting('font_size', sizes[Math.max(0, idx - 1)])
              }} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)', border: 'none', cursor: 'pointer' }}>
                <Minus style={{ fontSize: 16, width: 16, height: 16, color: 'var(--foreground-secondary)' }} />
              </button>
              <div style={{ padding: '6px 16px', borderRadius: 8, border: '0.7px solid var(--card-border)', backgroundColor: 'var(--accent)', minWidth: 95, textAlign: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{sizeLabels[settings.font_size || 'medium']}</span>
              </div>
              <button onClick={() => {
                const idx = sizes.indexOf((settings.font_size || 'medium') as 'small' | 'medium' | 'large')
                setSetting('font_size', sizes[Math.min(sizes.length - 1, idx + 1)])
              }} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)', border: 'none', cursor: 'pointer' }}>
                <Plus style={{ fontSize: 16, width: 16, height: 16, color: 'var(--foreground-secondary)' }} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', ...section }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>默认布局</div>
              <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>选择收件箱的默认视图布局</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {[{ label: '三栏', id: 'three', icon: Columns2 }, { label: '双栏', id: 'two', icon: Layout2 }].map(item => {
                const active = settings.layout_density === item.id
                return (
                  <button key={item.id} onClick={() => setSetting('layout_density', item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px',
                      height: 40, borderRadius: 8, fontSize: 13,
                      backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
                      color: active ? '#ffffff' : 'var(--foreground-secondary)',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <item.icon style={{ fontSize: 16, width: 16, height: 16, color: active ? '#ffffff' : 'var(--foreground-secondary)' }} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', ...section }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>列表密度</div>
              <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>调整邮件列表的行间距</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(['舒适', '紧凑'] as const).map((item, idx) => {
                const active = settings.mail_density === (item === '舒适' ? 'comfortable' : 'compact')
                const DensityIcon = idx === 0 ? LayoutRow : CollapseVertical
                return (
                  <button key={item} onClick={() => setSetting('mail_density', item === '舒适' ? 'comfortable' : 'compact')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px',
                      height: 40, borderRadius: 8, fontSize: 13,
                      backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
                      color: active ? '#ffffff' : 'var(--foreground-secondary)',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <DensityIcon style={{ fontSize: 18, width: 18, height: 18, flexShrink: 0, color: active ? '#ffffff' : 'var(--foreground-secondary)' }} />
                    {item}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 布局切换 */}
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)', marginBottom: 20 }}>布局切换</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {layouts.map(layout => {
              const active = navMode === layout.key
              return (
                <button
                  key={layout.key}
                  onClick={() => setSetting('nav_mode', layout.key)}
                  style={{
                    position: 'relative',
                    borderRadius: 14,
                    border: active ? '0.7px solid var(--color-primary)' : '0.7px solid var(--color-border-soft)',
                    backgroundColor: active ? 'var(--color-primary-soft)' : 'transparent',
                    cursor: 'pointer',
                    padding: 24,
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                    transition: 'all 0.2s',
                    fontFamily: 'var(--font-family-cn)',
                    width: '100%',
                  }}
                >
                  {/* Check */}
                  {active && (
                    <div style={{ position: 'absolute', top: 14, right: 14, width: 22, height: 22, borderRadius: 6, backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ri-check-line" style={{ fontSize: 14, color: '#fff' }} />
                    </div>
                  )}
                  {/* Preview */}
                  <div style={{ width: '100%', height: 150, flexShrink: 0 }}>
                    {layout.key === 'topbar' ? <TopbarMockup /> : <SidebarMockup />}
                  </div>
                  {/* Info */}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: '"SourceHanSans-Medium", var(--font-family-cn)' }}>{layout.name}</div>
                    <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 8, lineHeight: '20px', fontFamily: 'var(--font-family-cn)' }}>{layout.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
