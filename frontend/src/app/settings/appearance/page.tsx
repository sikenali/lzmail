'use client'
import { Check } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'

const themes = [
  { name: '浅色模式', desc: '明亮的默认主题', id: 'light', prev: 'from-slate-100 to-slate-200' },
  { name: '深色模式', desc: '护眼的暗色主题', id: 'dark', prev: 'from-slate-700 to-slate-900' },
  { name: '跟随系统', desc: '根据系统设置自动切换', id: 'system', prev: 'from-slate-100 to-slate-700' },
]

const accentColors = [
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '绿色', value: '#10b981' },
  { name: '橙色', value: '#f59e0b' },
  { name: '红色', value: '#ef4444' },
  { name: '粉色', value: '#ec4899' },
]

const sidebarColors = [
  { name: '默认', value: '#ffffff' },
  { name: '浅灰', value: '#f8fafc' },
  { name: '石板', value: '#f1f5f9' },
  { name: '深色', value: '#1e293b' },
  { name: '靛蓝', value: '#eef2ff' },
]

export default function AppearanceSettings() {
  const { settings, setSetting, loading } = useSettings()

  if (loading) return null

  return (
    <div className="max-w-[680px] mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">外观设置</h2>
        <p className="text-sm text-[var(--muted-foreground)]">自定义 LZMail 的外观和主题</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">主题模式</h3>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <div key={t.id} onClick={() => setSetting('theme', t.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${settings.theme === t.id ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'hover:border-[var(--primary)]'}`}>
              <div className={`h-16 rounded-lg mb-3 bg-gradient-to-br ${t.prev} flex items-center justify-center`}>
                {t.id === 'dark' ? (
                  <div className="w-5 h-5 rounded bg-slate-600 border border-slate-500" />
                ) : (
                  <div className="w-5 h-5 rounded bg-white border border-slate-200" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{t.desc}</div>
                </div>
                {settings.theme === t.id && <Check className="w-4 h-4 text-[var(--primary)]" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">主题色</h3>
        <div className="flex gap-3">
          {accentColors.map((c) => (
            <button key={c.value} title={c.name} onClick={() => setSetting('accent_color', c.value)}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${settings.accent_color === c.value ? 'ring-2 ring-offset-2 ring-[var(--primary)]' : ''}`}
              style={{ backgroundColor: c.value }}>
              {settings.accent_color === c.value && <Check className="w-4 h-4 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">侧边栏颜色</h3>
        <div className="flex gap-3">
          {sidebarColors.map((c) => (
            <div key={c.value} className="text-center">
              <button title={c.name} onClick={() => setSetting('sidebar_color', c.value)}
                className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${settings.sidebar_color === c.value ? 'border-[var(--primary)]' : 'border-transparent hover:border-[var(--border)]'}`}
                style={{ backgroundColor: c.value }}>
                {settings.sidebar_color === c.value && <Check className="w-4 h-4 text-[var(--primary)]" />}
              </button>
              <div className="text-[10px] text-[var(--muted-foreground)] mt-1">{c.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">布局密度</h3>
        <div className="space-y-2">
          {[
            { label: '紧凑', desc: '在屏幕显示更多内容', id: 'compact' },
            { label: '舒适', desc: '默认的间距和大小', id: 'comfortable' },
            { label: '宽松', desc: '宽敞的阅读体验', id: 'spacious' },
          ].map((item) => (
            <label key={item.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-[var(--accent)]">
              <input type="radio" name="density" checked={settings.layout_density === item.id}
                onChange={() => setSetting('layout_density', item.id)}
                className="accent-[var(--primary)]" />
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{item.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
