'use client'
import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import type { Account, MailStats } from '@/types'
import {
  User, Palette, Archive, Info,
  Plus, Trash2, RefreshCw, Check, Edit,
  Folder, FileText, ChevronDown,
  Minus, ExternalLink
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>账号管理</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>管理你的邮箱账号和同步设置</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> 添加账号
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl border space-y-4" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--accent)' }}>
          <div className="grid grid-cols-2 gap-3">
            {(['name', 'email', 'imap_host', 'smtp_host'] as const).map(f => (
              <input key={f} placeholder={f} value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: e.target.value })}
                className="border rounded-lg px-3 h-9 text-sm outline-none bg-white" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
            ))}
            {(['imap_port', 'smtp_port'] as const).map(f => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>{f === 'imap_port' ? 'IMAP' : 'SMTP'}</span>
                <input type="number" value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: Number(e.target.value) })}
                  className="border rounded-lg px-3 h-9 text-sm outline-none bg-white w-20" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
              </div>
            ))}
            <input placeholder="用户名" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              className="border rounded-lg px-3 h-9 text-sm outline-none bg-white col-span-1" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
            <input type="password" placeholder="密码" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="border rounded-lg px-3 h-9 text-sm outline-none bg-white col-span-1" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="idle" checked={form.use_idle} onChange={e => setForm({ ...form, use_idle: e.target.checked })} className="accent-[var(--primary)]" />
            <label htmlFor="idle" className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>启用 IMAP IDLE（实时推送）</label>
          </div>
          <div className="flex gap-2">
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
        <div className="space-y-4">
          {accounts.map(a => {
            const ac = brandColorMap[a.name?.toLowerCase()] || a.brand_color || '#6366f1'
            const syncMode = a.use_idle ? 'IDLE 实时推送' : 'Poll 5分钟轮询'
            const isExpanded = expandedId === a.id
            return (
              <div key={a.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--card-border)' }}>
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--accent)] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: ac }}>
                    {a.name?.[0]?.toUpperCase() || a.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{a.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>已同步</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>{a.email}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground-tertiary)' }}>{syncMode}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(a) }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]" title="编辑">
                      <Edit className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--danger-bg)]" title="删除">
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 py-3 border-t space-y-2" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--accent)' }}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        ['IMAP 服务器', `${a.imap_host}:${a.imap_port}`],
                        ['SMTP 服务器', `${a.smtp_host}:${a.smtp_port}`],
                        ['用户名', a.username],
                        ['同步方式', syncMode],
                      ].map(([label, val]) => (
                        <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--card)' }}>
                          <span style={{ color: 'var(--foreground-tertiary)' }}>{label}</span>
                          <span className="font-medium" style={{ color: 'var(--foreground)' }}>{val}</span>
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
    { name: '浅色', id: 'light' },
    { name: '深色', id: 'dark' },
    { name: '跟随系统', id: 'system' },
  ]
  const accentColors = [
    { name: '朱红', value: '#ef4444' },
    { name: '云蓝', value: '#3b82f6' },
    { name: '玉绿', value: '#22c55e' },
    { name: '金色', value: '#eab308' },
    { name: '墨色', value: '#6b7280' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
        <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>外观设置</h2>
      </div>
      <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--card-border)' }}>
        {/* Theme */}
        <div className="flex items-center justify-between px-6 py-4" style={{ height: '80px' }}>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>主题</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>选择界面主题风格</div>
          </div>
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ backgroundColor: 'var(--muted)' }}>
            {themes.map(t => {
              const active = settings.theme === t.id
              return (
                <button key={t.id} onClick={() => setSetting('theme', t.id)}
                  className="px-4 h-9 rounded-md text-sm font-medium transition-all"
                  style={{
                    backgroundColor: active ? 'var(--card)' : 'transparent',
                    color: active ? 'var(--foreground)' : 'var(--foreground-tertiary)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >{t.name}</button>
              )
            })}
          </div>
        </div>

        {/* Accent color */}
        <div className="flex items-center justify-between px-6 py-4" style={{ height: '80px' }}>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>主题色</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>设置强调色</div>
          </div>
          <div className="flex items-center gap-2">
            {accentColors.map(c => {
              const active = settings.accent_color === c.value
              return (
                <button key={c.value} title={c.name} onClick={() => setSetting('accent_color', c.value)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                  style={{ backgroundColor: c.value }}
                >
                  {active && <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Font size */}
        <div className="flex items-center justify-between px-6 py-4" style={{ height: '80px' }}>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>字体</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>调整界面字体大小</div>
          </div>
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
            <button onClick={() => {
              const sizes: Array<'small'|'medium'|'large'> = ['small', 'medium', 'large']
              const next = sizes[Math.max(0, sizes.indexOf(settings.font_size as any) - 1)]
              setSetting('font_size', next)
            }} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)]" style={{ color: 'var(--foreground-tertiary)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <span className="w-24 h-8 flex items-center justify-center text-sm font-medium border-x" style={{ color: 'var(--foreground)', borderColor: 'var(--card-border)' }}>
              {settings.font_size === 'small' ? '小' : settings.font_size === 'large' ? '大' : '中'}
            </span>
            <button onClick={() => {
              const sizes: Array<'small'|'medium'|'large'> = ['small', 'medium', 'large']
              const next = sizes[Math.min(sizes.length - 1, sizes.indexOf(settings.font_size as any) + 1)]
              setSetting('font_size', next)
            }} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)]" style={{ color: 'var(--foreground-tertiary)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>

        {/* Density */}
        <div className="flex items-center justify-between px-6 py-4" style={{ height: '80px' }}>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>密度</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>调整邮件列表显示密度</div>
          </div>
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ backgroundColor: 'var(--muted)' }}>
            {(['舒适', '紧凑'] as const).map(item => {
              const active = settings.mail_density === (item === '舒适' ? 'comfortable' : 'compact')
              return (
                <button key={item} onClick={() => setSetting('mail_density', item === '舒适' ? 'comfortable' : 'compact')}
                  className="px-4 h-9 rounded-md text-sm font-medium transition-all"
                  style={{
                    backgroundColor: active ? 'var(--card)' : 'transparent',
                    color: active ? 'var(--foreground)' : 'var(--foreground-tertiary)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >{item}</button>
              )
            })}
          </div>
        </div>

        {/* Layout */}
        <div className="flex items-center justify-between px-6 py-4" style={{ height: '80px' }}>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>布局</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>选择界面布局方式</div>
          </div>
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ backgroundColor: 'var(--muted)' }}>
            {[{ label: '三栏', id: 'three' }, { label: '双栏', id: 'two' }].map(item => {
              const active = settings.layout_density === item.id
              return (
                <button key={item.id} onClick={() => setSetting('layout_density', item.id)}
                  className="px-4 h-9 rounded-md text-sm font-medium transition-all"
                  style={{
                    backgroundColor: active ? 'var(--card)' : 'transparent',
                    color: active ? 'var(--foreground)' : 'var(--foreground-tertiary)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >{item.label}</button>
              )
            })}
          </div>
        </div>

        {/* Animation */}
        <div className="flex items-center justify-between px-6 py-4" style={{ height: '80px' }}>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>动画效果</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>启用界面过渡动画</div>
          </div>
          <button onClick={() => setSetting('animations', settings.animations === 'true' ? 'false' : 'true')}
            className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${(settings.animations || 'true') === 'true' ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${(settings.animations || 'true') === 'true' ? 'translate-x-5.5' : 'translate-x-0'}`} />
          </button>
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
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: 'var(--gold)' }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>根目录</h3>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--accent)' }}>
          <Folder className="w-5 h-5 shrink-0" style={{ color: 'var(--gold)' }} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>/mnt/nas/lzmail/archives/</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>邮件归档存储路径</div>
          </div>
          <button className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-medium hover:bg-[var(--muted)] shrink-0" style={{ color: 'var(--foreground-tertiary)', border: '1px solid var(--card-border)' }}>
            修改
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>目录结构</h3>
        </div>
        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--card-border)', backgroundColor: '#ffffff' }}>
          <div className="font-mono text-sm space-y-1" style={{ color: 'var(--foreground-secondary)' }}>
            {[
              { indent: 0, icon: <ChevronDown className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />, label: 'archives' },
              { indent: 1, icon: <ChevronDown className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />, label: 'account_1' },
              { indent: 2, icon: <ChevronDown className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />, label: '2024' },
              { indent: 3, icon: <ChevronDown className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />, label: '01' },
              { indent: 4, icon: <FileText className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />, label: 'email_001.eml' },
              { indent: 4, icon: <FileText className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />, label: 'email_002.eml' },
              { indent: 4, icon: <Folder className="w-4 h-4" style={{ color: 'var(--gold)' }} />, label: 'attachments' },
            ].map((node, i) => (
              <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${node.indent * 24}px` }}>
                {node.icon}
                <span>{node.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>存储统计</h3>
        </div>
        {loading ? (
          <div className="text-sm py-4 text-center" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
        ) : (
          <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--accent)' }}>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span style={{ color: 'var(--foreground-tertiary)' }}>{formatBytes(storageBytes)} / 50 GB</span>
                <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{storagePct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-border)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${storagePct}%`, background: 'linear-gradient(to right, var(--gold), var(--primary))' }} />
              </div>
            </div>
            <div className="flex gap-4 text-xs">
              {[['已用', formatBytes(storageBytes)], ['剩余', formatBytes(storageCap - storageBytes)]].map(([label, val]) => (
                <div key={label} style={{ color: 'var(--foreground-tertiary)' }}>
                  <div className="font-semibold" style={{ color: 'var(--foreground)' }}>{val}</div>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>自动清理</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>定期清理过期归档文件</p>
          </div>
        </div>
        <select
          onChange={e => api.settings.set({ auto_cleanup_days: e.target.value })}
          className="text-sm border rounded-lg px-3 h-9 bg-transparent outline-none"
          style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
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
  const techColumns = [
    ['Go 版本', 'Next.js', '数据库'],
    ['1.25.0', '15.5.22', 'SQLite'],
    ['运行时', '操作系统', '许可证'],
    ['Node.js 20.10.0', 'Linux (Docker)', 'MIT License'],
  ]
  const links = [
    { icon: '📦', label: 'GitHub 仓库' },
    { icon: '📖', label: '使用文档' },
    { icon: '💬', label: '反馈建议' },
    { icon: '🔔', label: '更新日志' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
        <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>关于</h2>
      </div>
      <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--card-border)' }}>
        {/* Product info */}
        <div className="flex items-center gap-5 px-6 py-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--primary), #a83232)' }}
          >LZ</div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>LZMail</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'var(--accent)', color: 'var(--primary)' }}>v1.3.0</span>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--foreground-secondary)' }}>自托管 NAS 邮件客户端</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>简洁、高效、安全的企业级邮件管理工具</p>
          </div>
        </div>

        {/* Tech info: 3 columns */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-6">
            {[0, 1, 2].map(col => (
              <div key={col}>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--foreground-tertiary)' }}>{techColumns[0][col]}</div>
                <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{techColumns[1][col]}</div>
                <div className="text-xs mt-2 font-medium" style={{ color: 'var(--foreground-tertiary)' }}>{techColumns[2][col]}</div>
                <div className="text-sm font-medium mt-0.5" style={{ color: 'var(--foreground)' }}>{techColumns[3][col]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Link buttons */}
        <div className="px-6 py-4">
          <div className="flex flex-wrap gap-3">
            {links.map(link => (
              <a key={link.label} href="#"
                className="flex items-center gap-2 px-4 h-10 rounded-xl border text-sm font-medium hover:bg-[var(--accent)] transition-colors"
                style={{ borderColor: 'var(--card-border)', color: 'var(--foreground-secondary)' }}
              >
                <span>{link.icon}</span>{link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────
const TABS = [
  { key: 'account',  label: '账号管理', icon: User },
  { key: 'appearance', label: '外观',   icon: Palette },
  { key: 'storage',  label: '归档',    icon: Archive },
  { key: 'about',    label: '关于',    icon: Info },
] as const

export default function SettingsPage() {
  const [active, setActive] = useState('account')
  const panels: Record<string, React.FC> = { account: AccountPanel, appearance: AppearancePanel, storage: StoragePanel, about: AboutPanel }
  const Panel = panels[active]

  return (
    <AppShell>
      <div className="p-6" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-[5px] h-8 rounded-full" style={{ backgroundColor: 'var(--gold)' }} />
          <div>
            <h1 className="text-[28px] font-bold" style={{ color: 'var(--foreground)', fontFamily: 'SourceHanSans-Bold, system-ui' }}>设置</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>自定义你的 LZMail</p>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 inline-flex" style={{ border: '1px solid var(--card-border)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = active === tab.key
            return (
              <button key={tab.key} onClick={() => setActive(tab.key)}
                className="flex items-center gap-2 px-5 h-10 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--foreground-tertiary)',
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 内容区 */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--card-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Panel />
        </div>
      </div>
    </AppShell>
  )
}
