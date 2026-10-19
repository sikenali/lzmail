'use client'
import { useSettings } from '@/hooks/useSettings'
import { Minus, Plus, Columns2, Layout2, LayoutRow, CollapseVertical, Layout3, LayoutGrid } from '@/lib/icons'

export function StyleSettings() {
  const { settings, setSetting } = useSettings()
  const sizeLabels: Record<string, string> = { small: '小 (14px)', medium: '中 (16px)', large: '大 (18px)' }
  const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large']
  const section = { borderBottom: '1px solid var(--card-border)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '0 16px',
                      height: 40,
                      borderRadius: 8,
                      fontSize: 13,
                      backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
                      color: active ? '#ffffff' : 'var(--foreground-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '0 16px',
                      height: 40,
                      borderRadius: 8,
                      fontSize: 13,
                      backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
                      color: active ? '#ffffff' : 'var(--foreground-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <DensityIcon style={{ fontSize: 18, width: 18, height: 18, flexShrink: 0, color: active ? '#ffffff' : 'var(--foreground-secondary)' }} />
                    {item}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>导航布局</div>
              <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>切换文件夹导航显示在侧边栏或顶部</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {[
                { label: '侧边栏', id: 'sidebar', icon: Layout3 },
                { label: '顶栏',   id: 'top',     icon: LayoutGrid },
              ].map(item => (
                <button key={item.id} onClick={() => setSetting('nav_mode', item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 16px',
                    height: 40,
                    borderRadius: 8,
                    fontSize: 13,
                    backgroundColor: settings.nav_mode === item.id ? 'var(--primary)' : 'var(--muted)',
                    color: settings.nav_mode === item.id ? '#ffffff' : 'var(--foreground-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'var(--font-family-cn)',
                  }}
                >
                  <item.icon style={{ fontSize: 16, width: 16, height: 16, color: settings.nav_mode === item.id ? '#ffffff' : 'var(--foreground-secondary)' }} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
