'use client'
import { ArrowLeft, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'

export default function SettingsPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587, username: '', password: '', use_idle: false })

  const handleSubmit = async () => {
    await api.accounts.create({ ...form } as any)
    router.push('/')
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>
      <h1 className="text-xl font-semibold mb-6">设置</h1>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">邮箱账号</h2>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 text-sm text-primary hover:opacity-80">
              <Plus className="w-4 h-4" /> 添加账号
            </button>
          </div>
          {showForm && (
            <div className="space-y-3 border rounded-lg p-4">
              <input placeholder="名称" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border-b pb-2 outline-none text-sm bg-transparent" />
              <input placeholder="邮箱地址" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border-b pb-2 outline-none text-sm bg-transparent" />
              <input placeholder="IMAP 服务器" value={form.imap_host} onChange={e => setForm({...form, imap_host: e.target.value})} className="w-full border-b pb-2 outline-none text-sm bg-transparent" />
              <input placeholder="SMTP 服务器" value={form.smtp_host} onChange={e => setForm({...form, smtp_host: e.target.value})} className="w-full border-b pb-2 outline-none text-sm bg-transparent" />
              <input placeholder="用户名" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full border-b pb-2 outline-none text-sm bg-transparent" />
              <input type="password" placeholder="密码" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border-b pb-2 outline-none text-sm bg-transparent" />
              <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity">保存</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
