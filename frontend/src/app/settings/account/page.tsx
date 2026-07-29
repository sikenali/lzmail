'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import type { Account } from '@/types'

const brandColorMap: Record<string, string> = {
  gmail: '#ea4335', outlook: '#0078d4', qq: '#12b7f5', netease: '#e53e3e',
}

export default function AccountSettings() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', imap_host: '', imap_port: 993,
    smtp_host: '', smtp_port: 587, username: '', password: '', auth_type: 'password', use_idle: false,
  })

  const load = () => {
    api.accounts.list().then(list => { setAccounts(list || []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreate = async () => {
    try {
      await api.accounts.create(form as any)
      setShowForm(false)
      setForm({ name: '', email: '', imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587, username: '', password: '', auth_type: 'password', use_idle: false })
      load()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此账号？')) return
    try {
      await api.accounts.delete(id)
      load()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="max-w-[680px] mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">邮箱账号</h2>
          <p className="text-sm text-[var(--muted-foreground)]">管理您的邮箱账号和同步设置</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> 添加账号
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl border space-y-4 bg-[var(--card)]">
          <div className="grid grid-cols-2 gap-3">
            {(['name', 'email', 'imap_host', 'smtp_host'] as const).map(f => (
              <input key={f} placeholder={f} value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})}
                className="border rounded-lg px-3 h-9 text-sm outline-none bg-transparent" />
            ))}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--foreground-tertiary)]">IMAP</span>
              <input type="number" value={form.imap_port} onChange={e => setForm({...form, imap_port: Number(e.target.value)})}
                className="border rounded-lg px-3 h-9 text-sm outline-none bg-transparent w-20" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--foreground-tertiary)]">SMTP</span>
              <input type="number" value={form.smtp_port} onChange={e => setForm({...form, smtp_port: Number(e.target.value)})}
                className="border rounded-lg px-3 h-9 text-sm outline-none bg-transparent w-20" />
            </div>
            <input placeholder="用户名" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
              className="border rounded-lg px-3 h-9 text-sm outline-none bg-transparent" />
            <input type="password" placeholder="密码" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="border rounded-lg px-3 h-9 text-sm outline-none bg-transparent" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="use_idle" checked={form.use_idle} onChange={e => setForm({...form, use_idle: e.target.checked})} className="accent-[var(--primary)]" />
            <label htmlFor="use_idle" className="text-xs text-[var(--foreground-tertiary)]">启用 IMAP IDLE（实时推送）</label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">保存</button>
            <button onClick={() => setShowForm(false)} className="px-4 h-9 border rounded-lg text-sm text-[var(--foreground-tertiary)] hover:bg-[var(--accent)]">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm text-[var(--muted-foreground)]">加载中...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center text-sm text-[var(--muted-foreground)] py-12">暂无账号，点击上方按钮添加</div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-4 bg-[var(--card)] rounded-xl border hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: brandColorMap[a.name.toLowerCase()] || a.brand_color || '#6366f1' }}>
                {a.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{a.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">已同步</span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{a.email}</div>
                <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                  IMAP: {a.imap_host}:{a.imap_port} · SMTP: {a.smtp_host}:{a.smtp_port}
                </div>
              </div>
              <button onClick={() => handleDelete(a.id)} className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-lg text-[var(--foreground-tertiary)] hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
