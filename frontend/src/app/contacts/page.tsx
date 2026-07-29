'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Mail as MailIcon, Star, Send, Phone, MoreHorizontal, UserAdd, ArrowUpDown, X, Trash2, Edit, Search, ChevronLeft, ChevronRight } from '@/lib/icons'
import type { Contact } from '@/types'

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
const PAGE_SIZE = 10

export default function ContactsPage() {
  const router = useRouter()
  const { settings } = useSettings()
  const [accounts, setAccounts] = useState<{ id: number; email: string }[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [sortAsc, setSortAsc] = useState(true)
  const [menuId, setMenuId] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const reqId = useRef(0)

  const load = useCallback(async (q = '', pg = 0, accountId: number | null = null) => {
    const id = ++reqId.current
    setLoading(true)
    try {
      const data = q
        ? await api.contacts.search(q, accountId ?? undefined, PAGE_SIZE, pg * PAGE_SIZE)
        : await api.contacts.list(accountId ?? undefined, PAGE_SIZE, pg * PAGE_SIZE)
      if (id !== reqId.current) return
      setContacts(data?.items || [])
      setTotal(data?.total || 0)
    } catch {
      if (id !== reqId.current) return
      setContacts([]); setTotal(0)
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadAccounts = () => {
      api.accounts.list().then(list => {
        const accs = list || []
        setAccounts(accs)
        if (accs.length > 0) {
          setSelectedAccountId(prev => prev ?? accs[0].id)
        } else {
          setContacts([]); setTotal(0); setLoading(false)
        }
      }).catch(() => {
        setAccounts([]); setContacts([]); setTotal(0); setLoading(false)
      })
    }
    loadAccounts()
    const ch = new BroadcastChannel('lzmail_accounts')
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'accounts:updated') loadAccounts()
    }
    ch.addEventListener('message', handler)
    return () => ch.close()
  }, [])

  useEffect(() => {
    if (selectedAccountId !== null) {
      load(searchQ, page, selectedAccountId)
    } else {
      setLoading(false)
    }
  }, [selectedAccountId, page])

  const handleSearch = (q: string) => {
    setSearchQ(q)
    setPage(0)
    load(q, 0, selectedAccountId)
  }

  const density = settings.mail_density || 'comfortable'

  const totalPages = Math.ceil(total / PAGE_SIZE)

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
    if (!form.name || !form.email) { toast.error('请填写姓名和邮箱'); return }
    setSaving(true)
    const extra = { phone: form.phone, company: form.company, title: form.title }
    const accountId = selectedAccountId ?? accounts[0]?.id ?? 0
    try {
      if (editingId) {
        await api.contacts.update(editingId, { name: form.name, email: form.email, account_id: accountId, ...extra })
        setContacts(prev => prev.map(c => c.id === editingId ? { ...c, name: form.name, email: form.email, account_id: accountId, ...extra } : c))
        toast.success('联系人已更新')
      } else {
        const created = await api.contacts.create({ name: form.name, email: form.email, account_id: accountId, ...extra })
        setContacts(prev => [...prev, { ...created, ...extra, id: created.id, account_id: accountId }])
        setTotal(t => t + 1)
        toast.success('联系人已添加')
      }
    } catch (e: any) {
      toast.error(e.message || '保存失败')
      if (editingId) {
        setContacts(prev => prev.map(c => c.id === editingId ? { ...c, name: form.name, email: form.email, ...extra } : c))
      }
    } finally {
      setSaving(false)
      setShowForm(false)
      setEditingId(null)
    }
  }

  const deleteContact = async (c: Contact) => {
    try {
      await api.contacts.delete(c.id)
      setContacts(prev => prev.filter(x => x.id !== c.id))
      setTotal(t => Math.max(0, t - 1))
      toast.success('已删除联系人')
    } catch {
      toast.error('删除失败')
    }
    setMenuId(null)
  }

  const sorted = useMemo(() => [...contacts].sort((a, b) => {
    const r = (a.name || '').localeCompare(b.name || '', 'zh')
    return sortAsc ? r : -r
  }), [contacts, sortAsc])

  const style = getAvatarStyle(form.name)

  return (
    <AppShell>
      <div className="px-10 py-8" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        {/* 标题行 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="shrink-0" style={{ width: 5, height: 32, borderRadius: 2, backgroundColor: 'rgba(107,143,163,1)' }} />
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--foreground)', lineHeight: '36px', margin: 0 }}>
                联系人
              </h1>
              <p style={{ fontSize: 13, color: 'var(--foreground-tertiary)', lineHeight: '18px', margin: '4px 0 0' }}>
                管理您的联系人列表
              </p>
            </div>
          </div>
          {/* 账号选择器 */}
          {accounts.length > 1 && (
            <select
              value={selectedAccountId ?? ''}
              onChange={e => { setPage(0); setSelectedAccountId(Number(e.target.value)) }}
              className="h-[40px] px-3 rounded-[8px] text-[13px] outline-none"
              style={{ backgroundColor: 'var(--muted)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
          )}
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-[280px]" style={{ flexShrink: 0 }}>
            <input
              value={searchQ}
              onChange={e => handleSearch(e.target.value)}
              placeholder="搜索姓名或邮箱..."
              className="w-full h-[40px] pl-9 pr-4 rounded-[8px] outline-none text-[13px]"
              style={{ backgroundColor: 'var(--muted)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
            />
            {searchQ && (
              <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(184,168,138,1)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 h-[40px] px-5 rounded-[10px] text-[14px] font-medium transition-opacity hover:opacity-90 shrink-0"
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
                    backgroundColor: 'var(--card)',
                    border: '0.7px solid var(--card-border)',
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
                        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)', lineHeight: '22px' }}>{c.name || '(无名)'}</span>
                        <Star className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                      </div>
                      {c.title && <span style={{ fontSize: 13, color: 'var(--foreground-tertiary)', lineHeight: '18px' }}>{c.title}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mb-4">
                    {c.email && (
                      <div className="flex items-center gap-2">
                        <MailIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                        <span style={{ fontSize: 13, color: 'var(--foreground-secondary)' }}>{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                        <span style={{ fontSize: 13, color: 'var(--foreground-secondary)' }}>{c.phone}</span>
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
        <div className="rounded-[16px]" style={{ backgroundColor: 'var(--card)', padding: 24 }}>
          {/* Table title bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0" style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: 'rgba(107,143,163,1)' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>{searchQ ? `搜索 "${searchQ}"` : '全部联系人'}</span>
              <span className="flex items-center justify-center" style={{ width: 42, height: 22, borderRadius: 6, backgroundColor: 'var(--teal-light)', fontSize: 12, fontWeight: 500, color: 'var(--teal)' }}>
                {total}人
              </span>
            </div>
            <button
              onClick={() => setSortAsc(a => !a)}
              className="flex items-center gap-1 h-8 px-3 rounded-[8px]"
              style={{ backgroundColor: 'var(--muted)', fontSize: 12, fontWeight: 500, color: 'var(--foreground-secondary)' }}
            >
              {sortAsc ? '按名称' : '按名称↓'}
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table header */}
          <div className="flex items-center" style={{ height: 41, padding: '0 16px', marginBottom: 0 }}>
            <div style={{ width: 220, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>姓名</span></div>
            <div style={{ width: 308, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>邮箱</span></div>
            <div style={{ width: 198, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>电话</span></div>
            <div style={{ width: 198, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>公司</span></div>
            <div style={{ width: 132, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>操作</span></div>
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
                  <div key={c.id} style={{ borderBottom: '1px solid var(--card-border)', position: 'relative' }}>
                    <div className="flex items-center" style={{ height: rowHeight, padding: '0 16px' }}>
                      <div className="flex items-center gap-3" style={{ width: 220, flexShrink: 0 }}>
                        <div className="flex items-center justify-center shrink-0" style={{ width: density === 'compact' ? 24 : 32, height: density === 'compact' ? 24 : 32, borderRadius: 9999, backgroundColor: s.bg }}>
                          <span style={{ fontSize: density === 'compact' ? 10 : 12, fontWeight: 600, color: s.text }}>{c.name?.[0] || '?'}</span>
                        </div>
                        <span style={{ fontSize: density === 'compact' ? 13 : 14, fontWeight: 500, color: 'var(--foreground)' }}>{c.name || '(无名)'}</span>
                      </div>
                      <div style={{ width: 308, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, color: 'var(--foreground-secondary)' }}>{c.email || '—'}</span>
                      </div>
                      <div style={{ width: 198, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, color: 'var(--foreground-secondary)' }}>{c.phone || '—'}</span>
                      </div>
                      <div style={{ width: 198, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, color: 'var(--foreground-secondary)' }}>{c.company || '—'}</span>
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
                          style={{ width: density === 'compact' ? 28 : 32, height: density === 'compact' ? 28 : 32, borderRadius: 8, backgroundColor: 'var(--muted)' }}
                          title="更多"
                        >
                          <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
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

          {/* Pagination */}
          {!loading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: 13, color: 'var(--foreground-tertiary)' }}>共 {total} 条，第 {page + 1} / {totalPages} 页</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 h-8 px-3 rounded-[8px] text-[13px]"
                  style={{ backgroundColor: 'var(--muted)', color: page === 0 ? 'var(--muted-foreground)' : 'var(--foreground-secondary)', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> 上一页
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number
                  if (totalPages <= 5) {
                    p = i
                  } else if (page < 3) {
                    p = i
                  } else if (page > totalPages - 4) {
                    p = totalPages - 5 + i
                  } else {
                    p = page - 2 + i
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="h-8 w-8 rounded-[8px] text-[13px] flex items-center justify-center"
                      style={{ backgroundColor: page === p ? 'var(--teal)' : 'var(--muted)', color: page === p ? '#fff' : 'var(--foreground-secondary)' }}
                    >
                      {p + 1}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 h-8 px-3 rounded-[8px] text-[13px]"
                  style={{ backgroundColor: 'var(--muted)', color: page >= totalPages - 1 ? 'var(--muted-foreground)' : 'var(--foreground-secondary)', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1 }}
                >
                  下一页 <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit contact modal */}
        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={() => setShowForm(false)}>
            <div className="bg-[var(--card)] rounded-[16px] p-6 w-[440px]" style={{ border: '1px solid var(--card-border)' }} onClick={(e) => e.stopPropagation()}>
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
