'use client'
import { useSettings } from '@/hooks/useSettings'
import { Minus, Plus, Columns2, Layout2, LayoutRow, CollapseVertical, Layout3, LayoutGrid } from '@/lib/icons'

const layouts = [
  { key: 'topbar', name: '顶栏模式 · 居中导航', desc: '文件夹导航在顶栏居中排布，左侧为品牌标识，右侧统一为搜索、设置与头像', color: '#C0392B' },
  { key: 'sidebar', name: '侧边栏模式 · 左侧导航', desc: '七大模块在左侧竖列居中排布，顶栏保留品牌与搜索操作入口', color: '#4A72A8' },
]

function TopbarMockup({ activeColor }: { activeColor: string }) {
  return (
    <div style={{ width: '100%', height: 90, borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ height: 32, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, borderBottom: '1px solid #f0ebe3' }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: activeColor, flexShrink: 0 }} />
        <div style={{ width: 32, height: 6, borderRadius: 3, backgroundColor: '#1F1D1A', flexShrink: 0 }} />
        <div style={{ width: 1, height: 14, backgroundColor: '#e5dfD3', margin: '0 4px' }} />
        <div style={{ flex: 1, display: 'flex', gap: 3, justifyContent: 'center' }}>
          {[activeColor, '#D3A93F', '#3E8C6E', activeColor, '#4A72A8'].map((c, i) => (
            <div key={i} style={{ width: 22, height: 18, borderRadius: 4, backgroundColor: c + '22', border: `1px solid ${c}55` }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#e5dfD3' }} />
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 6, padding: '6px 8px' }}>
        <div style={{ flex: 1, borderRadius: 4, backgroundColor: '#f7f3ea' }} />
        <div style={{ width: 60, borderRadius: 4, backgroundColor: '#f7f3ea' }} />
      </div>
    </div>
  )
}

function SidebarMockup({ activeColor }: { activeColor: string }) {
  return (
    <div style={{ width: '100%', height: 90, borderRadius: 8, overflow: 'hidden', display: 'flex', flexShrink: 0 }}>
      <div style={{ width: 28, backgroundColor: '#fff', borderRight: '1px solid #f0ebe3', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6, gap: 5 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: activeColor, opacity: 0.8 }} />
        {[activeColor, '#D3A93F', '#3E8C6E', '#4A72A8', activeColor].map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: c + (i === 1 ? '44' : '18'), border: `1px solid ${c}33` }} />
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 28, display: 'flex', alignItems: 'center', padding: '0 6px', gap: 5, borderBottom: '1px solid #f0ebe3' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: activeColor, opacity: 0.6 }} />
          <div style={{ width: 24, height: 4, borderRadius: 2, backgroundColor: '#1F1D1A', opacity: 0.3 }} />
          <div style={{ flex: 1 }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#e5dfD3' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 4, padding: '5px 6px' }}>
          <div style={{ flex: 1, borderRadius: 4, backgroundColor: '#f7f3ea' }} />
          <div style={{ width: 40, borderRadius: 4, backgroundColor: '#f7f3ea' }} />
        </div>
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
          <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)', marginBottom: 16 }}>布局切换</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {layouts.map(layout => {
              const active = navMode === layout.key
              return (
                <button
                  key={layout.key}
                  onClick={() => setSetting('nav_mode', layout.key)}
                  style={{
                    position: 'relative',
                    borderRadius: 14,
                    border: active ? `1.5px solid ${layout.color}` : '0.7px solid var(--color-border-soft)',
                    backgroundColor: active ? layout.color + '08' : 'transparent',
                    cursor: 'pointer',
                    padding: 20,
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-family-cn)',
                  }}
                >
                  {/* Check mark */}
                  {active && (
                    <div style={{ position: 'absolute', top: 14, right: 14, width: 22, height: 22, borderRadius: 6, backgroundColor: layout.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ri-check-line" style={{ fontSize: 14, color: '#fff' }} />
                    </div>
                  )}
                  {/* Mockup */}
                  <div style={{ width: '100%', flexShrink: 0 }}>
                    {layout.key === 'topbar' ? <TopbarMockup activeColor={layout.color} /> : <SidebarMockup activeColor={layout.color} />}
                  </div>
                  {/* Info */}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{layout.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: '18px' }}>{layout.desc}</div>
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
