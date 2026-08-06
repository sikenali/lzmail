'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import type { Account, MailStats } from '@/types'
import {
  User, Palette, Archive, Info,
  Plus, Trash2, Check, Edit,
  Folder, FileText, ChevronDown,
  Minus,
  Sun, Moon, Monitor,
  Grid2x2, Columns2,
  GitRepository, BookRead, ChatSmile3, AlarmWarning,
  LayoutRow, CollapseVertical,
} from '@/lib/icons'

// ── Custom Select Component ─────────────────────────────────────
function CustomSelect({
  value, options, onChange, width = 120,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (v: string) => void
  width?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value)
  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors hover:bg-[var(--muted)]"
        style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
      >
        <span className="flex-1 text-left truncate">{selected?.label || value}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--foreground-tertiary)' }} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-full rounded-lg overflow-hidden shadow-lg"
          style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', minWidth: width }}
        >
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
              style={{ color: opt.value === value ? 'var(--primary)' : 'var(--foreground)' }}
            >
              {opt.value === value && <Check className="w-3.5 h-3.5 inline mr-2 shrink-0" style={{ color: 'var(--primary)' }} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 账号管理 ──────────────────────────────────────────────
function AccountPanel() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '', email: '', imap_host: '', imap_port: 993,
    smtp_host: '', smtp_port: 587, username: '', password: '', use_idle: false,
  })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.imap_host || !form.smtp_host) { alert('请填写必填项'); return }
    setSaving(true)
    try {
      await api.accounts.create({
        name: form.name, email: form.email, imap_host: form.imap_host,
        imap_port: form.imap_port, smtp_host: form.smtp_host, smtp_port: form.smtp_port,
        username: form.username, password: form.password, use_idle: form.use_idle,
      })
      setShowForm(false)
      setEditingId(null)
      setForm({ name: '', email: '', imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587, username: '', password: '', use_idle: false })
      load()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此账号？删除后相关邮件数据也将一并清除。')) return
    try {
      await api.accounts.delete(id)
      load()
    } catch (e: any) { alert(e.message) }
  }

  const handleEdit = (a: Account) => {
    setForm({
      name: a.name || '', email: a.email, imap_host: a.imap_host,
      imap_port: a.imap_port, smtp_host: a.smtp_host, smtp_port: a.smtp_port,
      username: a.username, password: '', use_idle: a.use_idle,
    })
    setShowForm(true)
    setEditingId(a.id)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !form.email || !form.imap_host || !form.smtp_host) { alert('请填写必填项'); return }
    setSaving(true)
    try {
      await api.accounts.update(editingId, {
        name: form.name, email: form.email, imap_host: form.imap_host,
        imap_port: form.imap_port, smtp_host: form.smtp_host, smtp_port: form.smtp_port,
        username: form.username, password: form.password || undefined, use_idle: form.use_idle,
      })
      setShowForm(false)
      setEditingId(null)
      load()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', email: '', imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587, username: '', password: '', use_idle: false })
  }

  const brandColorMap: Record<string, string> = { gmail: '#ea4335', outlook: '#0078d4', qq: '#12b7f5', netease: '#e53e3e' }
  const getSyncBadge = (a: Account) => {
    if (a.use_idle) return { label: 'IDLE · 实时', color: 'var(--success)', bg: 'var(--success-bg)', dotColor: 'var(--success)' }
    return { label: '同步中', color: 'var(--gold)', bg: 'var(--gold-bg)', dotColor: 'var(--gold)' }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'var(--teal)' }} />
          <h2 className="text-[20px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>账号管理</h2>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null) }}
          className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-[13px] font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> 添加账号
        </button>
      </div>

      {showForm && (
        <div className="p-6 rounded-[16px]" style={{ border: '1px solid var(--card-border)', backgroundColor: 'var(--card)' }}>
          <div className="text-[14px] font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            {editingId ? '编辑账号' : '新建账号'}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="账号名称（如：Gmail）" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            <input placeholder="邮箱地址" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            <input placeholder="IMAP 服务器" value={form.imap_host} onChange={e => setForm({ ...form, imap_host: e.target.value })}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            <div className="flex items-center gap-2">
              <span className="text-xs shrink-0" style={{ color: 'var(--foreground-tertiary)' }}>IMAP 端口</span>
              <input type="number" value={form.imap_port} onChange={e => setForm({ ...form, imap_port: Number(e.target.value) })}
                className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent w-20" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            </div>
            <input placeholder="SMTP 服务器" value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            <div className="flex items-center gap-2">
              <span className="text-xs shrink-0" style={{ color: 'var(--foreground-tertiary)' }}>SMTP 端口</span>
              <input type="number" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: Number(e.target.value) })}
                className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent w-20" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            </div>
            <input placeholder="用户名 / 邮箱地址" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent col-span-1" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            <input type="password" placeholder={editingId ? '留空则不修改密码' : '密码 / 授权码'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent col-span-1" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input type="checkbox" id="idle" checked={form.use_idle} onChange={e => setForm({ ...form, use_idle: e.target.checked })} className="accent-[var(--primary)]" />
            <label htmlFor="idle" className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>启用 IMAP IDLE（实时推送）</label>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={handleCancel} className="px-4 h-9 rounded-lg text-sm hover:bg-[var(--muted)]" style={{ border: '1px solid var(--card-border)', color: 'var(--foreground-tertiary)' }}>取消</button>
            <button onClick={editingId ? handleSaveEdit : handleCreate} disabled={saving}
              className="px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? '保存中...' : (editingId ? '保存修改' : '保存')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm py-8" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 rounded-[16px]" style={{ border: '0.7px dashed var(--card-border)', backgroundColor: 'var(--card)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--gold-bg)' }}>
            <Plus className="w-6 h-6" style={{ color: 'var(--gold)' }} />
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>暂无邮箱账号</div>
          <div className="text-xs mt-1" style={{ color: 'var(--foreground-tertiary)' }}>点击右上角「添加账号」配置你的邮箱</div>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(a => {
            const ac = brandColorMap[a.name?.toLowerCase()] || a.brand_color || 'var(--primary)'
            const sync = getSyncBadge(a)
            const isExpanded = expandedId === a.id
            return (
              <div key={a.id} className="rounded-[16px] overflow-hidden" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)' }}>
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: ac }}>
                      {a.name?.[0]?.toUpperCase() || a.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>{a.name || a.email}</div>
                      <div className="text-[12px]" style={{ color: 'var(--foreground-tertiary)' }}>{a.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ backgroundColor: sync.bg, color: sync.color }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sync.dotColor }} />
                      {sync.label}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(a) }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] transition-colors" title="编辑">
                      <Edit className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--danger-bg)] transition-colors" title="删除">
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                    </button>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--foreground-tertiary)' }} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: '认证方式', value: a.auth_type === 'password' ? '授权码' : 'OAuth 2.0' },
                        { label: 'IMAP 服务器', value: `${a.imap_host}:${a.imap_port}` },
                        { label: 'SMTP 服务器', value: `${a.smtp_host}:${a.smtp_port}` },
                        { label: '同步状态', value: a.use_idle ? 'IDLE 实时' : 'Poll 轮询' },
                      ].map(item => (
                        <div key={item.label} className="rounded-lg p-3" style={{ backgroundColor: 'var(--accent)' }}>
                          <div className="text-[11px]" style={{ color: 'var(--foreground-tertiary)' }}>{item.label}</div>
                          <div className="text-[13px] font-medium mt-0.5" style={{ color: 'var(--foreground)' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 外观 ──────────────────────────────────────────────────
function AppearancePanel() {
  const { settings, setSetting } = useSettings()

  const themes = [
    { name: '浅色', id: 'light', icon: Sun },
    { name: '深色', id: 'dark', icon: Moon },
    { name: '跟随系统', id: 'system', icon: Monitor },
  ]
  const accentColors = [
    { name: '朱红', value: '#c43d3d' },
    { name: '云蓝', value: '#6b8fa3' },
    { name: '玉绿', value: '#5b8c5a' },
    { name: '金色', value: '#c9a96e' },
    { name: '墨色', value: '#3d2b1f' },
  ]

  const sizeLabels: Record<string, string> = { small: '小 (14px)', medium: '中 (16px)', large: '大 (18px)' }
  const sizes: Array<'small'|'medium'|'large'> = ['small', 'medium', 'large']

  const btnBase = 'flex items-center gap-2 px-4 h-10 rounded-lg transition-all text-[13px]'
  const btnActive = 'flex items-center gap-2 px-4 h-10 rounded-lg transition-all text-[13px] font-semibold'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'var(--teal)' }} />
        <h2 className="text-[20px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>外观设置</h2>
      </div>
      <div className="rounded-[16px] overflow-hidden" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '24px' }}>
        {/* Theme */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>主题模式</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>选择界面明暗主题</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {themes.map(t => {
              const Icon = t.icon
              const active = settings.theme === t.id
              return (
                <button key={t.id} onClick={() => setSetting('theme', t.id)}
                  className={btnBase}
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
                    color: active ? '#ffffff' : 'var(--foreground-secondary)',
                    fontFamily: active ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: active ? '#ffffff' : 'var(--foreground-secondary)' }} />
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Accent color */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>主题色</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>选择界面强调色</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {accentColors.map(c => {
              const active = settings.accent_color === c.value
              return (
                <button key={c.value} title={c.name} onClick={() => setSetting('accent_color', c.value)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{ backgroundColor: c.value }}
                >
                  {active && (
                    <Check className="w-4 h-4 shrink-0 text-white" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Font size */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>字体大小</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>调整邮件正文与界面文字大小</div>
          </div>
          <div className="flex items-center" style={{ gap: '12px' }}>
            <button onClick={() => {
              const idx = sizes.indexOf(settings.font_size as any)
              const next = sizes[Math.max(0, idx - 1)]
              setSetting('font_size', next)
            }} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)' }}>
              <Minus className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
            </button>
            <div className="px-4 py-1.5 rounded-lg" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--accent)', minWidth: 95, textAlign: 'center' }}>
              <span className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
                {sizeLabels[settings.font_size || 'medium']}
              </span>
            </div>
            <button onClick={() => {
              const idx = sizes.indexOf(settings.font_size as any)
              const next = sizes[Math.min(sizes.length - 1, idx + 1)]
              setSetting('font_size', next)
            }} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)' }}>
              <Plus className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Density */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>列表密度</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>调整邮件列表的行间距</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {(['舒适', '紧凑'] as const).map((item, idx) => {
              const active = settings.mail_density === (item === '舒适' ? 'comfortable' : 'compact')
              const DensityIcon = idx === 0 ? LayoutRow : CollapseVertical
              return (
                <button key={item} onClick={() => setSetting('mail_density', item === '舒适' ? 'comfortable' : 'compact')}
                  className={active ? 'flex items-center gap-2 px-4 h-10 rounded-lg transition-all text-[13px] font-semibold' : 'flex items-center gap-2 px-4 h-10 rounded-lg transition-all text-[13px]'}
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
                    color: active ? '#ffffff' : 'var(--foreground-secondary)',
                    fontFamily: active ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                  }}
                >
                  <DensityIcon className="w-[18px] h-[18px] shrink-0" />
                  {item}
                </button>
              )
            })}
          </div>
        </div>

        {/* Layout */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>默认布局</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>选择收件箱的默认视图布局</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {[{ label: '三栏', id: 'three', icon: Grid2x2 }, { label: '双栏', id: 'two', icon: Columns2 }].map(item => {
              const active = settings.layout_density === item.id
              return (
                <button key={item.id} onClick={() => setSetting('layout_density', item.id)}
                  className={btnBase}
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
                    color: active ? '#ffffff' : 'var(--foreground-secondary)',
                    fontFamily: active ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                  }}
                >
                  <item.icon className="w-4 h-4" style={{ color: active ? '#ffffff' : 'var(--foreground-secondary)' }} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Animation */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>动画效果</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>开启或关闭界面过渡动画</div>
          </div>
          <button onClick={() => setSetting('animations', settings.animations === 'true' ? 'false' : 'true')}
            className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${(settings.animations || 'true') === 'true' ? 'bg-[rgba(91,140,90,1)]' : 'bg-[var(--border)]'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${(settings.animations || 'true') === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

// ── 归档 ──────────────────────────────────────────────────
function StoragePanel() {
  const [stats, setStats] = useState<MailStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { settings, setSetting } = useSettings()

  useEffect(() => {
    api.mails.stats().then(d => setStats(d ?? null)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const storageBytes = stats?.storage_bytes ?? 0
  const totalEmails = stats?.total_emails ?? 0
  const storageCap = (stats as any)?.storage_limit || 50 * 1024 * 1024 * 1024

  function formatBytes(b: number): string {
    if (b === 0) return '0 B'
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(b) / Math.log(k))
    return (b / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
  }

  const cleanupDays = parseInt(settings.auto_cleanup_days || '30')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'var(--success)' }} />
        <h2 className="text-[20px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>归档目录</h2>
      </div>

      <div className="rounded-[16px]" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {/* Archive path */}
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>归档根目录</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>邮件 .eml 文件与附件的存储路径</div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--accent)', border: '0.7px solid var(--card-border)' }}>
            <Folder className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            <span className="text-[13px] font-mono" style={{ color: 'var(--foreground)' }}>/mnt/nas/lzmail/archives</span>
          </div>
        </div>

        {/* Storage stats */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="text-[15px] font-semibold mb-4" style={{ color: 'var(--foreground)' }}>存储统计</div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{formatBytes(storageBytes * 0.75)}</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>邮件 .eml</div>
            </div>
            <div className="text-center">
              <div className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{formatBytes(storageBytes * 0.25)}</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>附件</div>
            </div>
            <div className="text-center">
              <div className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{totalEmails.toLocaleString()}</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>邮件总数</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--foreground-tertiary)' }}>已使用</span>
                <span style={{ color: 'var(--foreground)' }}>{formatBytes(storageBytes)} / {formatBytes(storageCap)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((storageBytes / storageCap) * 100, 100)}%`, backgroundColor: 'var(--gold)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Auto cleanup */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>自动清理</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>定期清理过期归档文件</div>
          </div>
          <CustomSelect
            value={String(cleanupDays)}
            width={140}
            onChange={(v) => setSetting('auto_cleanup_days', v)}
            options={[
              { value: '0', label: '永不清理' },
              { value: '30', label: '30 天' },
              { value: '90', label: '90 天' },
              { value: '180', label: '180 天' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

// ── 关于 ──────────────────────────────────────────────────
function AboutPanel() {
  const techInfo = [
    { title: '技术栈', color: 'var(--primary)', items: [
      '前端：Next.js + React + Tailwind CSS',
      '后端：Go (Echo框架)',
      '数据库：SQLite (WAL模式)',
      '部署：Docker 容器化',
    ]},
    { title: '邮件协议', color: 'var(--success)', items: [
      'IMAP (IDLE + Poll)',
      'SMTP 发信',
      'SSE 实时推送',
      'OAuth 2.0 / 授权码',
    ]},
    { title: '运行信息', color: 'var(--teal)', items: [
      '运行时长：持续运行中',
      'Goroutine 数：8',
      '内存占用：~128 MB',
      'API 版本：v1.3.0',
    ]},
  ]

  const links = [
    { icon: GitRepository, label: 'GitHub' },
    { icon: BookRead, label: '使用文档' },
    { icon: ChatSmile3, label: '反馈问题' },
  ]
  const updateLink = { icon: AlarmWarning, label: '检查更新' }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'var(--gold)' }} />
        <h2 className="text-[20px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>关于</h2>
      </div>
      <div className="rounded-[16px] overflow-hidden" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '24px' }}>
        {/* 产品信息区 */}
        <div className="flex items-center gap-6 pb-6" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
            style={{ backgroundColor: 'var(--primary)' }}
          >LZ</div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[24px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>LZMail</h2>
              <span className="text-xs px-3 py-1 rounded-lg font-semibold" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>v2.1.0</span>
            </div>
            <p className="text-[14px] mt-2" style={{ color: 'var(--foreground-tertiary)' }}>NAS 自托管邮件客户端 — 统一管理 Gmail、Outlook、QQ邮箱、网易、iCloud 等多平台邮件，数据完全存储于本地，隐私可控。</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--muted-foreground)' }}>专为懒猫微服 NAS 优化，兼容任何支持 Docker 的 NAS 环境。</p>
          </div>
        </div>

        {/* 技术信息：三列彩色点列表 */}
        <div className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            {techInfo.map(col => (
              <div key={col.title}>
                <div className="text-[12px] font-semibold mb-3" style={{ color: 'var(--muted-foreground)' }}>{col.title}</div>
                <div className="space-y-2.5">
                  {col.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.25 h-2.25 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                      <span className="text-[13px]" style={{ color: 'var(--foreground-secondary)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 链接按钮 */}
        <div className="pt-4">
          <div className="flex items-center" style={{ gap: '16px' }}>
            {links.map(link => (
              <a key={link.label} href="#"
                className="flex items-center gap-2 rounded-lg transition-all"
                style={{ backgroundColor: 'var(--muted)', padding: '8px 16px', gap: '8px' }}
              >
                <link.icon className="w-[18px] h-[18px]" style={{ color: 'var(--foreground)' }} />
                <span className="text-[13px] font-medium" style={{ color: 'var(--foreground)' }}>{link.label}</span>
              </a>
            ))}
            <a href="#"
              className="flex items-center gap-2 rounded-lg transition-all"
              style={{ backgroundColor: 'var(--danger-bg)', padding: '8px 16px', gap: '8px' }}
            >
              <updateLink.icon className="w-[18px] h-[18px]" style={{ color: 'var(--primary)' }} />
              <span className="text-[13px] font-medium" style={{ color: 'var(--primary)' }}>{updateLink.label}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────
const TABS = [
  { key: 'account',  label: '账号管理', icon: User },
  { key: 'appearance', label: '外观设置', icon: Palette },
  { key: 'storage',  label: '归档目录',    icon: Archive },
  { key: 'about',    label: '关于',    icon: Info },
] as const

function SettingsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [active, setActive] = useState('account')
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && Object.hasOwn({ account: 1, appearance: 1, storage: 1, about: 1 }, tab)) setActive(tab)
  }, [searchParams])
  const panels: Record<string, React.FC> = { account: AccountPanel, appearance: AppearancePanel, storage: StoragePanel, about: AboutPanel }
  const Panel = panels[active]

  return (
    <AppShell>
      <div className="px-10 py-8" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        {/* 页面标题 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-[5px] h-8 rounded-[2px]" style={{ backgroundColor: 'var(--primary)' }} />
          <div>
            <h1 className="text-[28px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>设置</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>管理账号、外观与归档配置</p>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="inline-flex items-center gap-2 h-[40px] mb-8" style={{ backgroundColor: 'transparent' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = active === tab.key
            return (
              <button key={tab.key} onClick={() => { setActive(tab.key); router.replace(`/settings?tab=${tab.key}`) }}
                className="flex items-center gap-2 px-5 h-full rounded-[12px] text-[14px] font-medium transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--primary)' : 'var(--muted)',
                  color: isActive ? '#ffffff' : 'var(--foreground-secondary)',
                  fontFamily: isActive ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 内容区 */}
        <div className="rounded-[16px]" style={{ backgroundColor: 'var(--card)', padding: '32px 40px' }}>
          <Panel />
        </div>
      </div>
    </AppShell>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中...</div></div>}>
      <SettingsPageInner />
    </Suspense>
  )
}

export const dynamic = 'force-dynamic'
