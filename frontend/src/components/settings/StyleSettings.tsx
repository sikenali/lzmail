'use client'
import { useSettings } from '@/hooks/useSettings'
import { Minus, Plus, Columns2, Layout2, LayoutRow, CollapseVertical } from '@/lib/icons'
import { Seg } from '@/components/ui/Seg'

export function StyleSettings() {
  const { settings, setSetting } = useSettings()
  const sizeLabels: Record<string, string> = { small: '小 (14px)', medium: '中 (16px)', large: '大 (18px)' }
  const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large']
  const section = { borderBottom: '1px solid var(--card-border)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', ...section, gap: 12, flexWrap: 'wrap' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', ...section, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>默认布局</div>
              <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>选择收件箱的默认视图布局</div>
            </div>
            <Seg<'three' | 'two'>
              value={(settings.layout_density || 'three') as 'three' | 'two'}
              onChange={v => setSetting('layout_density', v)}
              options={[
                { value: 'three', label: '三栏', icon: <Columns2 style={{ fontSize: 16, width: 16, height: 16, color: 'var(--color-text-muted)' }} /> },
                { value: 'two', label: '双栏', icon: <Layout2 style={{ fontSize: 16, width: 16, height: 16, color: 'var(--color-text-muted)' }} /> },
              ]}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', ...section, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>列表密度</div>
              <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>调整邮件列表的行间距</div>
            </div>
            <Seg<'comfortable' | 'compact'>
              value={(settings.mail_density || 'comfortable') as 'comfortable' | 'compact'}
              onChange={v => setSetting('mail_density', v)}
              options={[
                { value: 'comfortable', label: '舒适', icon: <LayoutRow style={{ fontSize: 18, width: 18, height: 18, color: 'var(--color-text-muted)' }} /> },
                { value: 'compact', label: '紧凑', icon: <CollapseVertical style={{ fontSize: 18, width: 18, height: 18, color: 'var(--color-text-muted)' }} /> },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
