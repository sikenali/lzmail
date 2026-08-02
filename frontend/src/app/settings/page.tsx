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
} from 'lucide-react'

// ── 账号管理 ──────────────────────────────────────────────
function AccountPanel() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '', email: '', imap_host: '', imap_port: 993,
    smtp_host: '', smtp_port: 587, username: '', password: '', use_idle: false,
  })

  const load = () => {
    api.accounts.list().then(list => { setAccounts(list || []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      if (editingId) {
        // Edit: use PATCH with existing account data + changes
        const existing = accounts.find(a => a.id === editingId)
        if (!existing) { alert('账号不存在'); return }
        await api.accounts.update(editingId, {
          ...existing,
          name: form.name || existing.name,
          email: form.email || existing.email,
          imap_host: form.imap_host || existing.imap_host,
          imap_port: form.imap_port || existing.imap_port,
          smtp_host: form.smtp_host || existing.smtp_host,
          smtp_port: form.smtp_port || existing.smtp_port,
          username: form.username || existing.username,
          use_idle: form.use_idle,
        } as any)
        setEditingId(null)
      } else {
        await api.accounts.create(form as any)
      }
      setShowForm(false)
      setForm({ name: '', email: '', imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587, username: '', password: '', use_idle: false })
      load()
    } catch (e: any) { alert(e.message) }
  }
  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此账号？')) return
    await api.accounts.delete(id).catch(() => {})
    load()
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
          <h2 className="text-base font-semibold" style={{ color: '#3d2b1f' }}>账号管理</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8b7355' }}>管理你的邮箱账号和同步设置</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 h-9 bg-[#c43d3d] text-white rounded-xl text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> 添加账号
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl border space-y-4" style={{ borderColor: '#f3ede3', backgroundColor: '#faf8f5' }}>
          <div className="grid grid-cols-2 gap-3">
            {(['name', 'email', 'imap_host', 'smtp_host'] as const).map(f => (
              <input key={f} placeholder={f} value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: e.target.value })}
                className="border rounded-lg px-3 h-9 text-sm outline-none bg-white" style={{ borderColor: '#f3ede3', color: '#3d2b1f' }} />
            ))}
            {(['imap_port', 'smtp_port'] as const).map(f => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#8b7355' }}>{f === 'imap_port' ? 'IMAP' : 'SMTP'}</span>
                <input type="number" value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: Number(e.target.value) })}
                  className="border rounded-lg px-3 h-9 text-sm outline-none bg-white w-20" style={{ borderColor: '#f3ede3', color: '#3d2b1f' }} />
              </div>
            ))}
            <input placeholder="用户名" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              className="border rounded-lg px-3 h-9 text-sm outline-none bg-white col-span-1" style={{ borderColor: '#f3ede3', color: '#3d2b1f' }} />
            <input type="password" placeholder="密码" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="border rounded-lg px-3 h-9 text-sm outline-none bg-white col-span-1" style={{ borderColor: '#f3ede3', color: '#3d2b1f' }} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="idle" checked={form.use_idle} onChange={e => setForm({ ...form, use_idle: e.target.checked })} className="accent-[#c43d3d]" />
            <label htmlFor="idle" className="text-xs" style={{ color: '#8b7355' }}>启用 IMAP IDLE（实时推送）</label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 h-9 bg-[#c43d3d] text-white rounded-lg text-sm font-medium hover:opacity-90">
              {editingId ? '保存修改' : '保存'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="px-4 h-9 border rounded-lg text-sm hover:bg-[#f5f0e8]" style={{ borderColor: '#f3ede3', color: '#8b7355' }}>取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm py-8" style={{ color: '#b8a88a' }}>加载中...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center text-sm py-12" style={{ color: '#b8a88a' }}>暂无账号，点击「添加账号」配置</div>
      ) : (
        <div className="space-y-3">
          {accounts.map(a => {
            const ac = brandColorMap[a.name?.toLowerCase()] || a.brand_color || '#6366f1'
            const syncMode = a.use_idle ? 'IDLE 实时推送' : 'Poll 5分钟轮询'
            return (
              <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border hover:shadow-sm transition-shadow" style={{ borderColor: '#f3ede3', backgroundColor: '#ffffff' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: ac }}>
                  {a.name?.[0]?.toUpperCase() || a.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: '#3d2b1f' }}>{a.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#edf5ec', color: '#5b8c5a' }}>已同步</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#8b7355' }}>{a.email}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px]" style={{ color: '#b8a88a' }}>{syncMode}</span>
                    <span className="text-[10px]" style={{ color: '#b8a88a' }}>IMAP: {a.imap_host}:{a.imap_port}</span>
                  </div>
                </div>
                <button onClick={() => handleEdit(a)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f0e8]" title="编辑">
                  <Edit className="w-4 h-4" style={{ color: '#8b7355' }} />
                </button>
                <button onClick={load} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f0e8]" title="刷新同步">
                  <RefreshCw className="w-4 h-4" style={{ color: '#8b7355' }} />
                </button>
                <button onClick={() => handleDelete(a.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#fdf2f2]" title="删除">
                  <Trash2 className="w-4 h-4" style={{ color: '#c43d3d' }} />
                </button>
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
    { name: '浅色', desc: '温暖明亮', id: 'light', icon: '☀️' },
    { name: '深色', desc: '护眼舒适', id: 'dark', icon: '🌙' },
    { name: '跟随系统', desc: '自动切换', id: 'system', icon: '💻' },
  ]
  const accentColors = [
    { name: '朱红', value: '#c43d3d' }, { name: '云蓝', value: '#3b82f6' },
    { name: '玉绿', value: '#5b8c5a' }, { name: '金色', value: '#c9a96e' },
    { name: '墨色', value: '#6b5b4f' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c43d3d' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>主题</h3>
        </div>
        <div className="flex gap-3">
          {themes.map(t => {
            const active = settings.theme === t.id
            return (
              <button key={t.id} onClick={() => setSetting('theme', t.id)}
                className={`flex-1 p-4 rounded-xl border text-center transition-all ${active ? 'border-[#c43d3d] shadow-sm' : 'border-[#f3ede3] hover:border-[#e5d9c4]'}`}
                style={{ backgroundColor: active ? '#fef9f0' : '#ffffff' }}
              >
                <div className="text-2xl mb-2">{t.icon}</div>
                <div className="text-sm font-medium" style={{ color: active ? '#c43d3d' : '#3d2b1f' }}>{t.name}</div>
                <div className="text-xs mt-0.5" style={{ color: '#b8a88a' }}>{t.desc}</div>
                {active && <Check className="w-4 h-4 mx-auto mt-2 text-[#c43d3d]" />}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c9a96e' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>主题色</h3>
        </div>
        <div className="flex gap-3">
          {accentColors.map(c => (
            <button key={c.value} title={c.name} onClick={() => setSetting('accent_color', c.value)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${settings.accent_color === c.value ? 'ring-2 ring-offset-2' : 'hover:opacity-80'}`}
              style={{ backgroundColor: c.value, boxShadow: settings.accent_color === c.value ? `0 0 0 2px ${c.value}` : undefined }}
            >
              {settings.accent_color === c.value && <Check className="w-4 h-4 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#5b8c5a' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>字体大小</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const sizes: Array<'small'|'medium'|'large'> = ['small', 'medium', 'large']
            const next = sizes[Math.max(0, sizes.indexOf(settings.font_size as any) - 1)]
            setSetting('font_size', next)
          }} className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#f5f0e8]" style={{ borderColor: '#f3ede3' }}>
            <Minus className="w-4 h-4" style={{ color: '#8b7355' }} />
          </button>
          <span className="text-sm font-medium w-12 text-center" style={{ color: '#3d2b1f' }}>
            {settings.font_size === 'small' ? '小' : settings.font_size === 'large' ? '大' : '中'}
          </span>
          <button onClick={() => {
            const sizes: Array<'small'|'medium'|'large'> = ['small', 'medium', 'large']
            const next = sizes[Math.min(sizes.length - 1, sizes.indexOf(settings.font_size as any) + 1)]
            setSetting('font_size', next)
          }} className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#f5f0e8]" style={{ borderColor: '#f3ede3' }}>
            <Plus className="w-4 h-4" style={{ color: '#8b7355' }} />
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c9a96e' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>密度</h3>
        </div>
        <div className="flex gap-3">
          {(['紧凑', '舒适'] as const).map(item => {
            const active = settings.mail_density === (item === '紧凑' ? 'compact' : 'comfortable')
            return (
              <button key={item} onClick={() => setSetting('mail_density', item === '紧凑' ? 'compact' : 'comfortable')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-[#c43d3d] text-white' : 'bg-[#f5f0e8] text-[#8b7355] hover:bg-[#e5d9c4]'}`}
              >{item}</button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#5b8c5a' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>布局</h3>
        </div>
        <div className="flex gap-3">
          {[
            { label: '三栏', id: 'three' },
            { label: '双栏', id: 'two' },
          ].map(item => {
            const active = settings.layout_density === item.id
            return (
              <button key={item.id} onClick={() => setSetting('layout_density', item.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-[#c43d3d] text-white' : 'bg-[#f5f0e8] text-[#8b7355] hover:bg-[#e5d9c4]'}`}
              >{item.label}</button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#5b8c5a' }} />
          <div>
            <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>动画效果</h3>
            <p className="text-xs mt-0.5" style={{ color: '#8b7355' }}>启用界面过渡动画</p>
          </div>
        </div>
        <button onClick={() => setSetting('animations', settings.animations === 'true' ? 'false' : 'true')}
          className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${(settings.animations || 'true') === 'true' ? 'bg-[#5b8c5a]' : 'bg-[#e5d9c4]'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${(settings.animations || 'true') === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
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
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c9a96e' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>根目录</h3>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: '#f3ede3', backgroundColor: '#faf8f5' }}>
          <Folder className="w-5 h-5 shrink-0" style={{ color: '#c9a96e' }} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: '#3d2b1f' }}>/mnt/nas/lzmail/archives/</div>
            <div className="text-xs mt-0.5" style={{ color: '#8b7355' }}>邮件归档存储路径</div>
          </div>
          <button className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-medium hover:bg-[#f5f0e8] shrink-0" style={{ color: '#8b7355', border: '1px solid #f3ede3' }}>
            修改
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#5b8c5a' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>目录结构</h3>
        </div>
        <div className="p-4 rounded-xl border" style={{ borderColor: '#f3ede3', backgroundColor: '#ffffff' }}>
          <div className="font-mono text-sm space-y-1" style={{ color: '#6b5b4f' }}>
            {[
              { indent: 0, icon: <ChevronDown className="w-4 h-4" style={{ color: '#8b7355' }} />, label: 'archives' },
              { indent: 1, icon: <ChevronDown className="w-4 h-4" style={{ color: '#8b7355' }} />, label: 'account_1' },
              { indent: 2, icon: <ChevronDown className="w-4 h-4" style={{ color: '#8b7355' }} />, label: '2024' },
              { indent: 3, icon: <ChevronDown className="w-4 h-4" style={{ color: '#8b7355' }} />, label: '01' },
              { indent: 4, icon: <FileText className="w-4 h-4" style={{ color: '#8b7355' }} />, label: 'email_001.eml' },
              { indent: 4, icon: <FileText className="w-4 h-4" style={{ color: '#8b7355' }} />, label: 'email_002.eml' },
              { indent: 4, icon: <Folder className="w-4 h-4" style={{ color: '#c9a96e' }} />, label: 'attachments' },
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
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c43d3d' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>存储统计</h3>
        </div>
        {loading ? (
          <div className="text-sm py-4 text-center" style={{ color: '#b8a88a' }}>加载中...</div>
        ) : (
          <div className="p-4 rounded-xl border" style={{ borderColor: '#f3ede3', backgroundColor: '#faf8f5' }}>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span style={{ color: '#8b7355' }}>{formatBytes(storageBytes)} / 50 GB</span>
                <span className="font-semibold" style={{ color: '#3d2b1f' }}>{storagePct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f3ede3' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${storagePct}%`, background: 'linear-gradient(to right, #c9a96e, #c43d3d)' }} />
              </div>
            </div>
            <div className="flex gap-4 text-xs">
              {[['已用', formatBytes(storageBytes)], ['剩余', formatBytes(storageCap - storageBytes)]].map(([label, val]) => (
                <div key={label} style={{ color: '#8b7355' }}>
                  <div className="font-semibold" style={{ color: '#3d2b1f' }}>{val}</div>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c43d3d' }} />
          <div>
            <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>自动清理</h3>
            <p className="text-xs mt-0.5" style={{ color: '#8b7355' }}>定期清理过期归档文件</p>
          </div>
        </div>
        <select
          onChange={e => api.settings.set({ auto_cleanup_days: e.target.value })}
          className="text-sm border rounded-lg px-3 h-9 bg-transparent outline-none"
          style={{ borderColor: '#f3ede3', color: '#3d2b1f' }}
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
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, #c43d3d, #a83232)' }}
        >LZ</div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#3d2b1f', fontFamily: 'SourceHanSans-Bold, system-ui' }}>LZMail</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#fef9f0', color: '#c43d3d' }}>v1.2.0</span>
            <span className="text-xs" style={{ color: '#8b7355' }}>自托管 NAS 邮件客户端</span>
          </div>
          <p className="text-xs mt-1" style={{ color: '#b8a88a' }}>简洁、高效、安全的企业级邮件管理工具</p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#5b8c5a' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>技术信息</h3>
        </div>
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#f3ede3' }}>
          {[
            ['Go 版本', '1.25.0'], ['Next.js', '15.5.22'], ['数据库', 'SQLite (modernc.org)'],
            ['运行时', 'Node.js 20.10.0'], ['操作系统', 'Linux (Docker)'], ['许可证', 'MIT License'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 hover:bg-[#faf8f5]" style={{ borderColor: '#f5f0e8' }}>
              <span className="text-sm" style={{ color: '#6b5b4f' }}>{k}</span>
              <span className="text-sm font-medium" style={{ color: '#3d2b1f' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c9a96e' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>服务协议</h3>
        </div>
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#f3ede3' }}>
          {[
            ['用户协议', '#'], ['隐私政策', '#'], ['开源许可', '#'],
          ].map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 hover:bg-[#faf8f5] transition-colors"
              style={{ borderColor: '#f5f0e8', color: '#3d2b1f' }}
            >
              <span className="text-sm">{label}</span>
              <ExternalLink className="w-4 h-4" style={{ color: '#8b7355' }} />
            </a>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#5b8c5a' }} />
          <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>运行状态</h3>
        </div>
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#f3ede3' }}>
          {[
            ['API 服务', '运行中'], ['SSE 同步', '运行中'], ['IMAP 连接', '正常'], ['SMTP 服务', '正常'],
          ].map(([s, st]) => (
            <div key={s} className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 hover:bg-[#faf8f5]" style={{ borderColor: '#f5f0e8' }}>
              <span className="text-sm" style={{ color: '#6b5b4f' }}>{s}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5b8c5a' }} />
                <span className="text-sm font-medium" style={{ color: '#5b8c5a' }}>{st}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { icon: '📦', label: 'GitHub 仓库' }, { icon: '📖', label: '使用文档' },
          { icon: '💬', label: '反馈建议' }, { icon: '🔔', label: '更新日志' },
        ].map(link => (
          <a key={link.label} href="#"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-[#faf8f5] transition-colors"
            style={{ borderColor: '#f3ede3', color: '#6b5b4f' }}
          >
            <span>{link.icon}</span>{link.label}
          </a>
        ))}
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
      <div className="p-6" style={{ backgroundColor: '#fbf7f0', minHeight: '100%' }}>
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-[5px] h-8 rounded-full" style={{ backgroundColor: '#c9a96e' }} />
          <div>
            <h1 className="text-[28px] font-bold" style={{ color: '#3d2b1f', fontFamily: 'SourceHanSans-Bold, system-ui' }}>设置</h1>
            <p className="text-xs mt-0.5" style={{ color: '#8b7355' }}>自定义你的 LZMail</p>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 inline-flex" style={{ border: '1px solid #f3ede3' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = active === tab.key
            return (
              <button key={tab.key} onClick={() => setActive(tab.key)}
                className="flex items-center gap-2 px-5 h-10 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: isActive ? '#c43d3d' : 'transparent',
                  color: isActive ? '#ffffff' : '#8b7355',
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 内容区 */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#f3ede3', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Panel />
        </div>
      </div>
    </AppShell>
  )
}
