'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import type { Account, MailStats } from '@/types'
import {
  User, Palette, Archive, Info,
  Plus, Trash2, RefreshCw, Check, Edit,
  Folder, FileText, ChevronDown,
  Minus, ExternalLink,
  Sun, Moon, Monitor,
  CheckCircle as CheckCircleIcon,
  Grid2x2, Columns2,
  GitRepository, BookRead, ChatSmile3, AlarmWarning,
} from '@/lib/icons'

// ── 账号管理 ──────────────────────────────────────────────
// MOCK 假数据（上线前删除）
const MOCK_ACCOUNTS: Account[] = [
  { id: 1, name: 'Gmail', email: 'jingle@gmail.com', imap_host: 'imap.gmail.com', imap_port: 993, smtp_host: 'smtp.gmail.com', smtp_port: 587, auth_type: 'password', username: 'jingle', use_idle: true, brand_color: '#ea4335', created_at: '', updated_at: '' },
  { id: 2, name: 'Outlook', email: 'jingle@outlook.com', imap_host: 'outlook.office365.com', imap_port: 993, smtp_host: 'smtp.office365.com', smtp_port: 587, auth_type: 'password', username: 'jingle', use_idle: true, brand_color: '#0078d4', created_at: '', updated_at: '' },
  { id: 3, name: 'QQ', email: 'jingle@qq.com', imap_host: 'imap.qq.com', imap_port: 993, smtp_host: 'smtp.qq.com', smtp_port: 587, auth_type: 'password', username: 'jingle', use_idle: false, brand_color: '#12b7f5', created_at: '', updated_at: '' },
]

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

  const load = () => {
    // MOCK 假数据（上线前删除）
    setAccounts(MOCK_ACCOUNTS)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      setShowForm(false)
      setForm({ name: '', email: '', imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587, username: '', password: '', use_idle: false })
      load()
    } catch (e: any) { alert(e.message) }
  }
  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此账号？')) return
    setAccounts(prev => prev.filter(a => a.id !== id))
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

  const brandColorMap: Record<string, string> = { gmail: '#ea4335', outlook: '#0078d4', qq: '#12b7f5', netease: '#e53e3e' }
  const getSyncBadge = (a: Account) => {
    if (a.use_idle) return { label: 'IDLE · 实时', color: '#5b8c5a', bg: '#edf5ec', dotColor: '#5b8c5a' }
    return { label: 'IDLE · 同步中', color: '#c9a96e', bg: '#faf3e8', dotColor: '#c9a96e' }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>账号管理</h2>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>管理你的邮箱账号和同步设置</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-xl text-[13px] font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> 添加邮箱账号
        </button>
      </div>

      {showForm && (
        <div className="p-6 rounded-[16px]" style={{ border: '1px solid rgba(229,217,196,1)' }}>
          <div className="grid grid-cols-2 gap-3">
            {(['name', 'email', 'imap_host', 'smtp_host'] as const).map(f => (
              <input key={f} placeholder={f} value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: e.target.value })}
                className="border rounded-lg px-3 h-9 text-sm outline-none bg-[var(--card)]" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
            ))}
            {(['imap_port', 'smtp_port'] as const).map(f => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>{f === 'imap_port' ? 'IMAP' : 'SMTP'}</span>
                <input type="number" value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: Number(e.target.value) })}
                  className="border rounded-lg px-3 h-9 text-sm outline-none bg-[var(--card)] w-20" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
              </div>
            ))}
            <input placeholder="用户名" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              className="border rounded-lg px-3 h-9 text-sm outline-none bg-[var(--card)] col-span-1" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
            <input type="password" placeholder="密码" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="border rounded-lg px-3 h-9 text-sm outline-none bg-[var(--card)] col-span-1" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input type="checkbox" id="idle" checked={form.use_idle} onChange={e => setForm({ ...form, use_idle: e.target.checked })} className="accent-[var(--primary)]" />
            <label htmlFor="idle" className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>启用 IMAP IDLE（实时推送）</label>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleCreate} className="px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">
              {editingId ? '保存修改' : '保存'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="px-4 h-9 border rounded-lg text-sm hover:bg-[var(--muted)]" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground-tertiary)' }}>取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm py-8" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center text-sm py-12" style={{ color: 'var(--muted-foreground)' }}>暂无账号，点击「添加账号」配置</div>
      ) : (
        <div className="space-y-5">
          {accounts.map(a => {
            const ac = brandColorMap[a.name?.toLowerCase()] || a.brand_color || '#6366f1'
            const sync = getSyncBadge(a)
            const isExpanded = expandedId === a.id
            return (
              <div key={a.id}
                className="rounded-[16px] overflow-hidden transition-shadow"
                style={{
                  border: '0.7px solid rgba(229,217,196,1)',
                  backgroundColor: 'var(--card)',
                  boxShadow: '0 2px 12px rgba(139,115,85,0.06)',
                }}
              >
                {/* Card header */}
                <div className="px-6 py-6 flex items-center justify-between"
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  {/* Left: avatar + info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[18px] font-bold shrink-0" style={{ backgroundColor: ac }}>
                      {a.name?.[0]?.toUpperCase() || a.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[16px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>{a.name}</div>
                      <div className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>{a.email}</div>
                    </div>
                  </div>
                  {/* Right: sync badge + buttons */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px]" style={{ backgroundColor: sync.bg }}>
                      <div className="w-2.25 h-2.25 rounded-full shrink-0" style={{ backgroundColor: sync.dotColor }} />
                      <span className="text-[12px] font-medium" style={{ color: sync.color }}>{sync.label}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(a) }}
                      className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--muted)]"
                      title="编辑"
                      style={{ backgroundColor: 'rgba(243,237,227,1)' }}
                    >
                      <Edit className="w-[18px] h-[18px] shrink-0" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}
                      className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-[rgba(253,242,242,1)]"
                      title="删除"
                      style={{ backgroundColor: 'rgba(253,242,242,1)' }}
                    >
                      <Trash2 className="w-[18px] h-[18px] shrink-0" />
                    </button>
                  </div>
                </div>
                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-4" style={{ borderTop: '1px solid rgba(229,217,196,1)' }}>
                    <div className="grid grid-cols-4 gap-3">
                      {([
                        { label: '认证方式', value: a.auth_type === 'password' ? '授权码' : 'OAuth 2.0' },
                        { label: 'IMAP 服务器', value: `${a.imap_host}:${a.imap_port}` },
                        { label: 'SMTP 服务器', value: `${a.smtp_host}:${a.smtp_port}` },
                        { label: '已同步邮件', value: '5,832 封' },
                      ] as const).map(item => (
                        <div key={item.label}
                          className="rounded-[12px] p-4"
                          style={{ backgroundColor: 'rgba(251,247,240,1)' }}
                        >
                          <div className="text-[11px]" style={{ color: 'rgba(184,168,138,1)' }}>{item.label}</div>
                          <div className="text-[14px] font-medium mt-1" style={{ color: 'rgba(61,43,31,1)' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add account card */}
          <div
            className="rounded-[16px] cursor-pointer transition-all hover:opacity-80"
            style={{
              border: '2px dashed rgba(201,169,110,1)',
              backgroundColor: 'rgba(254,249,240,1)',
              padding: '24px',
            }}
            onClick={() => setShowForm(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201,169,110,1)' }}>
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-[16px] font-semibold" style={{ color: 'rgba(201,169,110,1)' }}>添加邮箱账号</div>
                <div className="text-[13px] mt-0.5" style={{ color: 'rgba(184,168,138,1)' }}>支持 Gmail、Outlook、QQ邮箱、网易、iCloud 等</div>
              </div>
            </div>
          </div>
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
        <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'rgba(107,143,163,1)' }} />
        <h2 className="text-[20px] font-bold leading-none" style={{ color: 'rgba(61,43,31,1)' }}>外观设置</h2>
      </div>
      <div className="rounded-[16px] overflow-hidden" style={{ border: '0.7px solid rgba(229,217,196,1)', backgroundColor: 'var(--card)', boxShadow: '0 2px 12px rgba(139,115,85,0.06)' }}>
        <div style={{ padding: '24px' }}>
        {/* Theme */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid rgba(229,217,196,1)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>主题模式</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>选择界面明暗主题</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {themes.map(t => {
              const Icon = t.icon
              const active = settings.theme === t.id
              return (
                <button key={t.id} onClick={() => setSetting('theme', t.id)}
                  className={btnBase}
                  style={{
                    backgroundColor: active ? 'rgba(196,61,61,1)' : 'rgba(243,237,227,1)',
                    color: active ? '#ffffff' : 'rgba(107,91,79,1)',
                    fontFamily: active ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: active ? '#ffffff' : 'rgba(107,91,79,1)' }} />
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Accent color */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid rgba(229,217,196,1)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>主题色</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>选择界面强调色</div>
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
                    <CheckCircleIcon className="w-5 h-5 shrink-0 text-white" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Font size */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid rgba(229,217,196,1)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>字体大小</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>调整邮件正文与界面文字大小</div>
          </div>
          <div className="flex items-center" style={{ gap: '12px' }}>
            <button onClick={() => {
              const idx = sizes.indexOf(settings.font_size as any)
              const next = sizes[Math.max(0, idx - 1)]
              setSetting('font_size', next)
            }} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(243,237,227,1)', color: 'rgba(107,91,79,1)' }}>
              <Minus className="w-4 h-4" style={{ color: 'rgba(107,91,79,1)' }} />
            </button>
            <div className="px-4 py-1.5 rounded-lg" style={{ border: '0.7px solid rgba(229,217,196,1)', backgroundColor: 'rgba(251,247,240,1)', minWidth: 95, textAlign: 'center' }}>
              <span className="text-[14px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>
                {sizeLabels[settings.font_size || 'medium']}
              </span>
            </div>
            <button onClick={() => {
              const idx = sizes.indexOf(settings.font_size as any)
              const next = sizes[Math.min(sizes.length - 1, idx + 1)]
              setSetting('font_size', next)
            }} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(243,237,227,1)', color: 'rgba(107,91,79,1)' }}>
              <Plus className="w-4 h-4" style={{ color: 'rgba(107,91,79,1)' }} />
            </button>
          </div>
        </div>

        {/* Density */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid rgba(229,217,196,1)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>列表密度</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>调整邮件列表的行间距</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {(['舒适', '紧凑'] as const).map(item => {
              const active = settings.mail_density === (item === '舒适' ? 'comfortable' : 'compact')
              return (
                <button key={item} onClick={() => setSetting('mail_density', item === '舒适' ? 'comfortable' : 'compact')}
                  className={active ? btnActive : btnBase}
                  style={{
                    backgroundColor: active ? 'rgba(196,61,61,1)' : 'rgba(243,237,227,1)',
                    color: active ? '#ffffff' : 'rgba(107,91,79,1)',
                    fontFamily: active ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                  }}
                >{item}</button>
              )
            })}
          </div>
        </div>

        {/* Layout */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid rgba(229,217,196,1)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>默认布局</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>选择收件箱的默认视图布局</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {[{ label: '三栏', id: 'three', icon: Grid2x2 }, { label: '双栏', id: 'two', icon: Columns2 }].map(item => {
              const active = settings.layout_density === item.id
              return (
                <button key={item.id} onClick={() => setSetting('layout_density', item.id)}
                  className={btnBase}
                  style={{
                    backgroundColor: active ? 'rgba(196,61,61,1)' : 'rgba(243,237,227,1)',
                    color: active ? '#ffffff' : 'rgba(107,91,79,1)',
                    fontFamily: active ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                  }}
                >
                  <item.icon className="w-4 h-4" style={{ color: active ? '#ffffff' : 'rgba(107,91,79,1)' }} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Animation */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>动画效果</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>开启或关闭界面过渡动画</div>
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

  useEffect(() => {
    api.mails.stats().then(d => setStats(d ?? null)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const storageBytes = stats?.storage_bytes || 0
  const storageCap = 50 * 1024 * 1024 * 1024
  const storagePct = Math.min((storageBytes / storageCap) * 100, 100)

  function formatBytes(b: number): string {
    if (b === 0) return '0 B'
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(b) / Math.log(k))
    return (b / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'rgba(91,140,90,1)' }} />
        <span className="text-[20px] font-bold" style={{ color: 'rgba(61,43,31,1)' }}>归档目录</span>
      </div>

      <div style={{ border: '0.7px solid rgba(229,217,196,1)', backgroundColor: 'var(--card)', boxShadow: '0 2px 12px rgba(139,115,85,0.06)', borderRadius: '16px', padding: '24px' }}>
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid rgba(229,217,196,1)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>归档根目录</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>邮件 .eml 文件与附件的存储路径</div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ border: '0.7px solid rgba(229,217,196,1)', backgroundColor: 'rgba(251,247,240,1)' }}>
              <Folder className="w-[18px] h-[18px] shrink-0" style={{ color: 'rgba(201,169,110,1)' }} />
              <span className="text-[13px]" style={{ color: 'rgba(61,43,31,1)' }}>/mnt/nas/lzmail/archives</span>
            </div>
            <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(243,237,227,1)' }}>
              <Edit className="w-[18px] h-[18px] shrink-0" style={{ color: 'rgba(107,91,79,1)' }} />
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(229,217,196,1)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>目录结构</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>当前归档文件的组织方式预览</div>
          </div>
          <div className="mt-4 p-5 rounded-xl" style={{ border: '0.7px solid rgba(229,217,196,1)', backgroundColor: 'rgba(251,247,240,1)' }}>
            <div className="space-y-1 text-[13px]">
              <div className="flex items-center gap-2">
                <Folder className="w-[18px] h-[18px] shrink-0" style={{ color: 'rgba(201,169,110,1)' }} />
                <span className="font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>lzmail/</span>
              </div>
              <div style={{ paddingLeft: '24px' }} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Folder className="w-[18px] h-[18px] shrink-0" style={{ color: 'rgba(201,169,110,1)' }} />
                  <span className="font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>archives/</span>
                </div>
                <div style={{ paddingLeft: '24px' }} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Folder className="w-[16px] h-[16px] shrink-0" style={{ color: 'rgba(201,169,110,1)' }} />
                    <span className="font-medium" style={{ color: 'rgba(107,91,79,1)' }}>acc_gmail_001/</span>
                  </div>
                  <div style={{ paddingLeft: '24px' }} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Folder className="w-[16px] h-[16px] shrink-0" style={{ color: 'rgba(201,169,110,1)' }} />
                      <span className="font-medium" style={{ color: 'rgba(107,91,79,1)' }}>2025/</span>
                    </div>
                    <div style={{ paddingLeft: '24px' }} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Folder className="w-[16px] h-[16px] shrink-0" style={{ color: 'rgba(201,169,110,1)' }} />
                        <span className="font-medium" style={{ color: 'rgba(107,91,79,1)' }}>01/</span>
                      </div>
                      <div style={{ paddingLeft: '24px' }} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-[16px] h-[16px] shrink-0" style={{ color: 'rgba(139,115,85,1)' }} />
                          <span className="text-[13px]" style={{ color: 'rgba(107,91,79,1)' }}>msg_a1b2c3d4.eml</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-[16px] h-[16px] shrink-0" style={{ color: 'rgba(139,115,85,1)' }} />
                          <span className="text-[13px]" style={{ color: 'rgba(107,91,79,1)' }}>msg_e5f6g7h8.eml</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ paddingLeft: '48px' }} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Folder className="w-[16px] h-[16px] shrink-0" style={{ color: 'rgba(201,169,110,1)' }} />
                    <span className="font-medium" style={{ color: 'rgba(107,91,79,1)' }}>attachments/</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between" style={{ padding: '20px 0' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>存储统计</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>当前归档文件占用的磁盘空间</div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <div className="text-[20px] font-bold leading-none" style={{ color: 'rgba(61,43,31,1)' }}>{formatBytes(storageBytes * 0.75)}</div>
              <div className="text-[11px] mt-1" style={{ color: 'rgba(184,168,138,1)' }}>.eml 文件</div>
            </div>
            <div className="text-center">
              <div className="text-[20px] font-bold leading-none" style={{ color: 'rgba(61,43,31,1)' }}>{formatBytes(storageBytes * 0.25)}</div>
              <div className="text-[11px] mt-1" style={{ color: 'rgba(184,168,138,1)' }}>附件</div>
            </div>
            <div className="text-center">
              <div className="text-[20px] font-bold leading-none" style={{ color: 'rgba(61,43,31,1)' }}>{(stats?.total_emails || 12847).toLocaleString()}</div>
              <div className="text-[11px] mt-1" style={{ color: 'rgba(184,168,138,1)' }}>邮件总数</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'rgba(107,91,79,1)' }} />
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: 'rgba(61,43,31,1)' }}>自动清理</h3>
            <p className="text-[13px] mt-0.5" style={{ color: 'rgba(139,115,85,1)' }}>定期清理过期归档文件</p>
          </div>
        </div>
        <select
          onChange={e => api.settings.set({ auto_cleanup_days: e.target.value })}
          className="text-[13px] border rounded-[8px] px-3 h-9 bg-transparent outline-none"
          style={{ borderColor: 'rgba(229,217,196,1)', color: 'var(--foreground)' }}
        >
          <option value="30">30天</option>
          <option value="90">90天</option>
          <option value="180">180天</option>
          <option value="0">永不清理</option>
        </select>
      </div>
    </div>
  )
}

// ── 关于 ──────────────────────────────────────────────────
function AboutPanel() {
  const techInfo = [
    { title: '技术栈', color: 'rgba(196,61,61,1)', items: [
      '前端：Next.js + React + Tailwind CSS',
      '后端：Go (Echo框架)',
      '数据库：SQLite (WAL模式)',
      '部署：Docker 容器化',
    ]},
    { title: '邮件协议', color: 'rgba(91,140,90,1)', items: [
      'IMAP (IDLE + Poll)',
      'SMTP 发信',
      'SSE 实时推送',
      'OAuth 2.0 / 授权码',
    ]},
    { title: '运行信息', color: 'rgba(107,143,163,1)', items: [
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
        <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'rgba(201,169,110,1)' }} />
        <h2 className="text-[20px] font-bold leading-none" style={{ color: 'rgba(61,43,31,1)' }}>关于</h2>
      </div>
      <div className="rounded-[16px] overflow-hidden" style={{ border: '0.7px solid rgba(229,217,196,1)', backgroundColor: 'var(--card)', boxShadow: '0 2px 12px rgba(139,115,85,0.06)', padding: '24px' }}>
        {/* 产品信息区 */}
        <div className="flex items-center gap-6 pb-6" style={{ borderBottom: '1px solid rgba(229,217,196,1)' }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
            style={{ backgroundColor: 'rgba(196,61,61,1)' }}
          >LZ</div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[24px] font-bold leading-none" style={{ color: 'rgba(61,43,31,1)' }}>LZMail</h2>
              <span className="text-xs px-3 py-1 rounded-lg font-semibold" style={{ backgroundColor: 'rgba(237,245,236,1)', color: 'rgba(91,140,90,1)' }}>v2.1.0</span>
            </div>
            <p className="text-[14px] mt-2" style={{ color: 'rgba(139,115,85,1)' }}>NAS 自托管邮件客户端 — 统一管理 Gmail、Outlook、QQ邮箱、网易、iCloud 等多平台邮件，数据完全存储于本地，隐私可控。</p>
            <p className="text-[13px] mt-1" style={{ color: 'rgba(184,168,138,1)' }}>专为懒猫微服 NAS 优化，兼容任何支持 Docker 的 NAS 环境。</p>
          </div>
        </div>

        {/* 技术信息：三列彩色点列表 */}
        <div className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            {techInfo.map(col => (
              <div key={col.title}>
                <div className="text-[12px] font-semibold mb-3" style={{ color: 'rgba(184,168,138,1)' }}>{col.title}</div>
                <div className="space-y-2.5">
                  {col.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.25 h-2.25 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                      <span className="text-[13px]" style={{ color: 'rgba(107,91,79,1)' }}>{item}</span>
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
                style={{ backgroundColor: 'rgba(243,237,227,1)', padding: '8px 16px', gap: '8px' }}
              >
                <link.icon className="w-[18px] h-[18px]" style={{ color: 'rgba(61,43,31,1)' }} />
                <span className="text-[13px] font-medium" style={{ color: 'rgba(61,43,31,1)' }}>{link.label}</span>
              </a>
            ))}
            <a href="#"
              className="flex items-center gap-2 rounded-lg transition-all"
              style={{ backgroundColor: 'rgba(253,242,242,1)', padding: '8px 16px', gap: '8px' }}
            >
              <updateLink.icon className="w-[18px] h-[18px]" style={{ color: 'rgba(196,61,61,1)' }} />
              <span className="text-[13px] font-medium" style={{ color: 'rgba(196,61,61,1)' }}>{updateLink.label}</span>
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

export default function SettingsPage() {
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
          <div className="w-[5px] h-8 rounded-[2px]" style={{ backgroundColor: 'rgba(196,61,61,1)' }} />
          <div>
            <h1 className="text-[28px] font-bold leading-none" style={{ color: 'rgba(61,43,31,1)' }}>设置</h1>
            <p className="text-[13px] mt-1" style={{ color: 'rgba(139,115,85,1)' }}>管理账号、外观与归档配置</p>
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
                  backgroundColor: isActive ? 'rgba(196,61,61,1)' : 'rgba(243,237,227,1)',
                  color: isActive ? '#ffffff' : 'rgba(107,91,79,1)',
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

export const dynamic = 'force-dynamic'
