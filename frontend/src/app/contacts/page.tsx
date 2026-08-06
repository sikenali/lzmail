'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import { Plus, Mail as MailIcon, Star, Send, Phone, MoreHorizontal, UserAdd, ArrowUpDown, X, Trash2, Edit } from '@/lib/icons'
import type { Contact } from '@/types'

// MOCK 假数据（上线前删除）
const MOCK_CONTACTS: Contact[] = [
  { id: 1, name: '张伟', email: 'zhangwei@qq.com', phone: '138-0000-1234', title: '产品经理', company: '腾讯', account_id: 1, created_at: '', updated_at: '' },
  { id: 2, name: '刘芳', email: 'liufang@outlook.com', phone: '139-0000-5678', title: '设计师', company: '阿里', account_id: 1, created_at: '', updated_at: '' },
  { id: 3, name: '王明', email: 'wangming@gmail.com', phone: '137-0000-9012', title: '工程师', company: '字节', account_id: 2, created_at: '', updated_at: '' },
  { id: 4, name: '李娜', email: 'lina@163.com', phone: '136-0000-3456', title: '市场总监', company: '华为', account_id: 2, created_at: '', updated_at: '' },
  { id: 5, name: '赵强', email: 'zhaoqiang@icloud.com', phone: '135-0000-7890', title: '运营', company: '小米', account_id: 1, created_at: '', updated_at: '' },
  { id: 6, name: '陈静', email: 'chenjing@company.com', phone: '134-0000-1111', title: '财务', company: '京东', account_id: 2, created_at: '', updated_at: '' },
  { id: 7, name: '孙磊', email: 'sunlei@partner.com', phone: '133-0000-2222', title: '销售', company: '百度', account_id: 1, created_at: '', updated_at: '' },
  { id: 8, name: '周雪', email: 'zhouxue@qq.com', phone: '132-0000-3333', title: 'HR', company: '美团', account_id: 2, created_at: '', updated_at: '' },
]

const avatarColors: Record<string, { bg: string; text: string }> = {
  '张': { bg: 'rgba(253,242,242,1)', text: '#c43d3d' },
  '刘': { bg: 'rgba(237,245,236,1)', text: '#5b8c5a' },
  '王': { bg: 'rgba(240,244,247,1)', text: '#6b8fa3' },
  '李': { bg: 'rgba(254,249,240,1)', text: '#c9a96e' },
  '赵': { bg: 'rgba(253,242,242,1)', text: '#c43d3d' },
  '陈': { bg: 'rgba(237,245,236,1)', text: '#5b8c5a' },
  '孙': { bg: 'rgba(240,244,247,1)', text: '#6b8fa3' },
  '周': { bg: 'rgba(254,249,240,1)', text: '#c9a96e' },
}

function getAvatarStyle(name: string) {
  const initial = name?.[0] || '?'
  return avatarColors[initial] || { bg: 'rgba(243,237,227,1)', text: '#8b7355' }
}

const emptyForm = { name: '', email: '', phone: '', company: '', title: '' }

export default function ContactsPage() {
  const router = useRouter()
  const { settings } = useSettings()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [sortAsc, setSortAsc] = useState(true)
  const [menuId, setMenuId] = useState<number | null>(null)

  const load = (fallback = true) => {
    setLoading(true)
    api.contacts.list()
      .then(d => setContacts((d && d.length > 0) ? d : (fallback ? MOCK_CONTACTS : [])))
      .catch(() => { if (fallback) setContacts(MOCK_CONTACTS) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const density = settings.mail_density || 'comfortable'

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (c: Contact) => {
    setEditingId(c.id)
    setForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', company: c.company || '', title: c.title || '' })
    setShowForm(true)
    setMenuId(null)
  }

  const saveContact = async () => {
    if (!form.name || !form.email) { alert('请填写姓名和邮箱'); return }
    setSaving(true)
    const extra = { phone: form.phone, company: form.company, title: form.title }
    try {
      if (editingId) {
        await api.contacts.update(editingId, { name: form.name, email: form.email })
        setContacts(prev => prev.map(c => c.id === editingId ? { ...c, name: form.name, email: form.email, ...extra } : c))
      } else {
        const created = await api.contacts.create({ name: form.name, email: form.email, account_id: 1 })
        setContacts(prev => [...prev, { ...created, ...extra, id: created.id }])
      }
    } catch (e: any) {
      // MOCK 假数据（上线前删除）：后端不可用时仅本地更新
      alert(e.message || '保存失败')
      if (editingId) {
        setContacts(prev => prev.map(c => c.id === editingId ? { ...c, name: form.name, email: form.email, ...extra } : c))
      } else {
        const newId = Math.max(...contacts.map(c => c.id), 0) + 1
        setContacts(prev => [...prev, { id: newId, name: form.name, email: form.email, ...extra, account_id: 1, created_at: '', updated_at: '' }])
      }
    } finally {
      setSaving(false)
      setShowForm(false)
      setEditingId(null)
    }
  }

  const deleteContact = async (c: Contact) => {
    if (!confirm(`确定删除联系人「${c.name}」？`)) return
    try {
      await api.contacts.delete(c.id)
      setContacts(prev => prev.filter(x => x.id !== c.id))
    } catch {
      alert('删除失败')
    }
    setMenuId(null)
  }

  const sorted = [...contacts].sort((a, b) => {
    const r = (a.name || '').localeCompare(b.name || '', 'zh')
    return sortAsc ? r : -r
  })

  const style = getAvatarStyle(form.name)

  return (
    <AppShell>
      <div className="px-10 py-8" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="shrink-0" style={{ width: 5, height: 32, borderRadius: 2, backgroundColor: 'rgba(107,143,163,1)' }} />
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#3d2b1f', lineHeight: '36px', margin: 0 }}>
                联系人
              </h1>
              <p style={{ fontSize: 13, color: '#8b7355', lineHeight: '18px', margin: '4px 0 0' }}>
                管理您的联系人列表
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 h-[47px] px-5 rounded-[12px] text-[14px] font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'rgba(107,143,163,1)', color: '#ffffff' }}
          >
            <UserAdd className="w-4 h-4" />
            添加联系人
          </button>
        </div>

        {/* Featured contacts grid */}
        {!loading && contacts.length > 0 && (
          <div className="mb-8" style={{ paddingTop: 32 }}>
            <div className="flex gap-5" style={{ display: 'flex' }}>
              {contacts.slice(0, 4).map((c) => (
                <div key={c.id}
                  className="flex flex-col"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '0.7px solid rgba(229,217,196,1)',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: '0 2px 12px rgba(139,115,85,0.06)',
                    flex: 1,
                  }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center justify-center shrink-0" style={{ width: 56, height: 56, borderRadius: 9999, backgroundColor: getAvatarStyle(c.name).bg }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: getAvatarStyle(c.name).text }}>
                        {c.name?.[0] || '?'}
                      </span>
                    </div>
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#3d2b1f', lineHeight: '22px' }}>{c.name || '(无名)'}</span>
                        <Star className="w-4 h-4 shrink-0" style={{ color: '#b8a88a' }} />
                      </div>
                      {c.title && <span style={{ fontSize: 13, color: '#8b7355', lineHeight: '18px' }}>{c.title}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mb-4">
                    {c.email && (
                      <div className="flex items-center gap-2">
                        <MailIcon className="w-4 h-4 shrink-0" style={{ color: '#b8a88a' }} />
                        <span style={{ fontSize: 13, color: '#6b5b4f' }}>{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 shrink-0" style={{ color: '#b8a88a' }} />
                        <span style={{ fontSize: 13, color: '#6b5b4f' }}>{c.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-auto">
                    <button
                      onClick={() => router.push(`/compose?to=${encodeURIComponent(c.email)}`)}
                      className="flex items-center justify-center gap-2 w-full h-[37px] rounded-[8px]"
                      style={{ backgroundColor: getAvatarStyle(c.name).bg, color: getAvatarStyle(c.name).text, fontSize: 12, fontWeight: 500 }}
                    >
                      <Send className="w-[14px] h-[14px]" style={{ color: getAvatarStyle(c.name).text }} />
                      发邮件
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table section */}
        <div className="rounded-[16px]" style={{ backgroundColor: '#ffffff', padding: 24 }}>
          {/* Table title bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0" style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: 'rgba(107,143,163,1)' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#3d2b1f' }}>全部联系人</span>
              <span className="flex items-center justify-center" style={{ width: 42, height: 22, borderRadius: 6, backgroundColor: 'rgba(240,244,247,1)', fontSize: 12, fontWeight: 500, color: '#6b8fa3' }}>
                {contacts.length}人
              </span>
            </div>
            <button
              onClick={() => setSortAsc(a => !a)}
              className="flex items-center gap-1 h-8 px-3 rounded-[8px]"
              style={{ backgroundColor: 'rgba(243,237,227,1)', fontSize: 12, fontWeight: 500, color: '#6b5b4f' }}
            >
              {sortAsc ? '按名称' : '按名称↓'}
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table header */}
          <div className="flex items-center" style={{ height: 41, padding: '0 16px', marginBottom: 0 }}>
            <div style={{ width: 220, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#b8a88a' }}>姓名</span></div>
            <div style={{ width: 308, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#b8a88a' }}>邮箱</span></div>
            <div style={{ width: 198, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#b8a88a' }}>电话</span></div>
            <div style={{ width: 198, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#b8a88a' }}>公司</span></div>
            <div style={{ width: 132, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#b8a88a' }}>操作</span></div>
          </div>

          {/* Table body */}
          <div className="flex flex-col" style={{ paddingTop: 4 }}>
            {loading ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--muted)' }}>
                  <MailIcon className="w-8 h-8" style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--foreground-tertiary)' }}>暂无联系人</p>
              </div>
            ) : (
              sorted.map((c) => {
                const s = getAvatarStyle(c.name)
                const rowHeight = density === 'compact' ? 40 : 57
                return (
                  <div key={c.id} style={{ borderBottom: '1px solid rgba(229,217,196,1)', position: 'relative' }}>
                    <div className="flex items-center" style={{ height: rowHeight, padding: '0 16px' }}>
                      <div className="flex items-center gap-3" style={{ width: 220, flexShrink: 0 }}>
                        <div className="flex items-center justify-center shrink-0" style={{ width: density === 'compact' ? 24 : 32, height: density === 'compact' ? 24 : 32, borderRadius: 9999, backgroundColor: s.bg }}>
                          <span style={{ fontSize: density === 'compact' ? 10 : 12, fontWeight: 600, color: s.text }}>{c.name?.[0] || '?'}</span>
                        </div>
                        <span style={{ fontSize: density === 'compact' ? 13 : 14, fontWeight: 500, color: '#3d2b1f' }}>{c.name || '(无名)'}</span>
                      </div>
                      <div style={{ width: 308, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, color: '#6b5b4f' }}>{c.email || '—'}</span>
                      </div>
                      <div style={{ width: 198, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, color: '#6b5b4f' }}>{c.phone || '—'}</span>
                      </div>
                      <div style={{ width: 198, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, color: '#6b5b4f' }}>{c.company || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2" style={{ width: 132, flexShrink: 0 }}>
                        <button
                          onClick={() => router.push(`/compose?to=${encodeURIComponent(c.email)}`)}
                          className="flex items-center justify-center"
                          style={{ width: density === 'compact' ? 28 : 32, height: density === 'compact' ? 28 : 32, borderRadius: 8, backgroundColor: s.bg }}
                          title="发邮件"
                        >
                          <MailIcon className="w-4 h-4" style={{ color: s.text }} />
                        </button>
                        <button
                          onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                          className="flex items-center justify-center"
                          style={{ width: density === 'compact' ? 28 : 32, height: density === 'compact' ? 28 : 32, borderRadius: 8, backgroundColor: 'rgba(243,237,227,1)' }}
                          title="更多"
                        >
                          <MoreHorizontal className="w-4 h-4" style={{ color: '#6b5b4f' }} />
                        </button>
                      </div>
                    </div>
                    {menuId === c.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />
                        <div className="absolute right-4 z-50 mt-1 rounded-[10px] py-1 shadow-lg" style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', width: 120 }}>
                          <button
                            onClick={() => openEdit(c)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-[var(--muted)]"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <Edit className="w-3.5 h-3.5" /> 编辑
                          </button>
                          <button
                            onClick={() => deleteContact(c)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-[var(--danger-bg)]"
                            style={{ color: 'var(--danger)' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> 删除
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Add/Edit contact modal */}
        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={() => setShowForm(false)}>
            <div className="bg-[var(--card)] rounded-[16px] p-6 w-[440px]" style={{ border: '1px solid rgba(229,217,196,1)' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{editingId ? '编辑联系人' : '新建联系人'}</h3>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[var(--muted)]">
                  <X className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />
                </button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: style.bg }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: style.text }}>{form.name?.[0] || '?'}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>头像将根据姓名自动生成</span>
              </div>
              <div className="space-y-3">
                {([
                  { key: 'name', ph: '姓名' },
                  { key: 'email', ph: '邮箱地址' },
                  { key: 'phone', ph: '电话' },
                  { key: 'company', ph: '公司' },
                  { key: 'title', ph: '职位' },
                ] as const).map(f => (
                  <input
                    key={f.key}
                    placeholder={f.ph}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full h-[40px] px-4 rounded-[8px] outline-none text-[14px] bg-transparent"
                    style={{ border: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground)' }}
                  />
                ))}
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 h-9 rounded-[8px] text-[14px] hover:bg-[var(--muted)]" style={{ border: '1px solid rgba(229,217,196,1)', color: 'var(--foreground-tertiary)' }}>
                    取消
                  </button>
                  <button onClick={saveContact} disabled={saving} className="px-4 h-9 bg-[var(--primary)] text-white rounded-[8px] text-[14px] font-medium hover:opacity-90 disabled:opacity-50">
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
