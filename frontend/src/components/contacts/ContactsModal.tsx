'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Modal } from '@/components/layout/Modal'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/useSettings'
import { Plus, Mail as MailIcon, Star, Send, Phone, MoreHorizontal, UserAdd, ArrowUpDown, X, Trash2, Edit, Search, ChevronLeft, ChevronRight } from '@/lib/icons'
import { ContactFormModal } from './ContactFormModal'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Tooltip } from '@/components/Tooltip'
import type { Contact } from '@/types'

const AVATAR_COLOR_PAIRS = [
  { bg: 'rgba(253,242,242,1)', text: '#c43d3d' },
  { bg: 'rgba(237,245,236,1)', text: '#5b8c5a' },
  { bg: 'rgba(240,244,247,1)', text: '#6b8fa3' },
  { bg: 'rgba(254,249,240,1)', text: '#c9a96e' },
  { bg: 'rgba(253,235,242,1)', text: '#a855f7' },
  { bg: 'rgba(254,240,238,1)', text: '#ea580c' },
  { bg: 'rgba(224,242,254,1)', text: '#0891b2' },
  { bg: 'rgba(243,237,227,1)', text: '#8b7355' },
]

function getAvatarStyle(name: string) {
  if (!name) return AVATAR_COLOR_PAIRS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0
  }
  const idx = Math.abs(hash) % AVATAR_COLOR_PAIRS.length
  return AVATAR_COLOR_PAIRS[idx]
}

const emptyForm = { name: '', email: '', phone: '', company: '', title: '' }
const PAGE_SIZE = 10

export function ContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { settings } = useSettings()
  const isMobile = useIsMobile()
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
  const [sortAsc, setSortAsc] = 0 > 0 ? useState(true) : useState(true)
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
    if (!open) return
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
  }, [open])

  useEffect(() => {
    if (open && selectedAccountId !== null) {
      load(searchQ, page, selectedAccountId)
    } else if (open) {
      setLoading(false)
    }
  }, [open, selectedAccountId, page])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showForm) onClose()
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, showForm])

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

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<i className="ri-contacts-book-line" style={{ fontSize: 26, color: 'var(--color-primary)' }}></i>}
      title="联系人"
      subtitle="管理您的联系人列表"
      width={1100}
      height="85vh"
      headerExtra={isMobile ? undefined : (
        <>
          <div className="relative">
            <i className="ri-search-line" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--color-text-muted)' }}></i>
            <input
              value={searchQ}
              onChange={e => handleSearch(e.target.value)}
              placeholder="搜索姓名或邮箱..."
              className="w-[200px] h-[36px] pl-9 pr-8 rounded-[8px] outline-none text-[13px]"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }}
            />
            {searchQ && (
              <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {accounts.length > 1 && (
            <select
              value={selectedAccountId ?? ''}
              onChange={e => { setPage(0); setSelectedAccountId(Number(e.target.value)) }}
              className="h-[36px] px-3 rounded-[8px] text-[13px] outline-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }}
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
          )}
        </>
      )}
    >
      {/* Content */}
      <div className={`flex-1 overflow-auto ${isMobile ? 'p-3' : 'p-6'}`} style={{ minHeight: 0 }}>
          {isMobile && (
            <div className="flex flex-col gap-2 mb-3">
              <div className="relative">
                <i className="ri-search-line" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--color-text-muted)' }}></i>
                <input
                  value={searchQ}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="搜索姓名或邮箱..."
                  className="w-full h-[40px] pl-9 pr-8 rounded-[8px] outline-none text-[13px]"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }}
                />
                {searchQ && (
                  <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {accounts.length > 1 && (
                <select
                  value={selectedAccountId ?? ''}
                  onChange={e => { setPage(0); setSelectedAccountId(Number(e.target.value)) }}
                  className="h-[40px] px-3 rounded-[8px] text-[13px] outline-none w-full"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.email}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          {/* Table section */}
          <div className="rounded-[16px] overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-secondary)', padding: isMobile ? 12 : 20, border: '1px solid var(--color-border-soft)' }}>
            <div style={{ minWidth: isMobile ? undefined : 800 }}>
              {/* Table title bar */}
              <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', rowGap: 8 }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: 'var(--color-primary)' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }}>{searchQ ? `搜索 "${searchQ}"` : '全部联系人'}</span>
                  <span className="flex items-center justify-center" style={{ width: 40, height: 20, borderRadius: 6, backgroundColor: 'var(--color-primary-soft)', fontSize: 11, fontWeight: 500, color: 'var(--color-primary)' }}>
                    {total}人
                  </span>
                  <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 h-[32px] px-3 rounded-[8px] text-[13px] font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-cn)' }}
                  >
                    <UserAdd className="w-4 h-4" />
                    添加联系人
                  </button>
                </div>
                <button
                  onClick={() => setSortAsc(a => !a)}
                  className="flex items-center gap-1 h-7 px-3 rounded-[8px]"
                  style={{ backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-family-cn)' }}
                >
                  {sortAsc ? '按名称' : '按名称↓'}
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Table header */}
              {!isMobile && (
              <div className="flex items-center" style={{ height: 36, padding: '0 12px', marginBottom: 0 }}>
                <div style={{ width: 180, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>姓名</span></div>
                <div style={{ width: 240, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>邮箱</span></div>
                <div style={{ width: 160, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>电话</span></div>
                <div style={{ width: 160, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>公司</span></div>
                <div style={{ width: 100, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>操作</span></div>
              </div>
              )}

              {/* Table body */}
              <div className="flex flex-col" style={{ paddingTop: 4 }}>
                {loading ? (
                  <div className="text-center py-10 text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
                ) : sorted.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--muted)' }}>
                      <MailIcon className="w-7 h-7" style={{ color: 'var(--muted-foreground)' }} />
                    </div>
                    <p className="text-sm" style={{ color: 'var(--foreground-tertiary)' }}>暂无联系人</p>
                  </div>
                ) : (
                  sorted.map((c) => {
                    const s = getAvatarStyle(c.name)
                    const rowHeight = density === 'compact' ? 40 : 52
                    return (
                      <div key={c.id} style={{ borderBottom: '1px solid var(--card-border)', position: 'relative' }}>
                        {isMobile ? (
                          <div className="flex items-center gap-3" style={{ padding: '10px 4px' }}>
                            <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: s.bg }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: s.text }}>{c.name?.[0] || '?'}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || '(无名)'}</div>
                              <div style={{ fontSize: 12, color: 'var(--foreground-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email || '—'}</div>
                              {(c.phone || c.company) && (
                                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                                  {[c.phone, c.company].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                              <Tooltip text="发邮件">
                                <button
                                  onClick={() => { onClose(); router.push(`/compose?to=${encodeURIComponent(c.email)}`) }}
                                  className="flex items-center justify-center"
                                  style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: s.bg }}
                                  aria-label="发邮件"
                                >
                                  <MailIcon className="w-4 h-4" style={{ color: s.text }} />
                                </button>
                              </Tooltip>
                              <Tooltip text="更多">
                                <button
                                  onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                                  className="flex items-center justify-center"
                                  style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'var(--muted)' }}
                                  aria-label="更多"
                                >
                                  <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        ) : (
                        <div className="flex items-center" style={{ height: rowHeight, padding: '0 12px' }}>
                          <div className="flex items-center gap-3" style={{ width: 180, flexShrink: 0 }}>
                            <div className="flex items-center justify-center shrink-0" style={{ width: density === 'compact' ? 24 : 30, height: density === 'compact' ? 24 : 30, borderRadius: 9999, backgroundColor: s.bg }}>
                              <span style={{ fontSize: density === 'compact' ? 10 : 12, fontWeight: 600, color: s.text }}>{c.name?.[0] || '?'}</span>
                            </div>
                            <span style={{ fontSize: density === 'compact' ? 13 : 14, fontWeight: 500, color: 'var(--foreground)' }}>{c.name || '(无名)'}</span>
                          </div>
                          <div style={{ width: 240, flexShrink: 0 }}>
                            <span style={{ fontSize: 13, color: 'var(--foreground-secondary)' }}>{c.email || '—'}</span>
                          </div>
                          <div style={{ width: 160, flexShrink: 0 }}>
                            <span style={{ fontSize: 13, color: 'var(--foreground-secondary)' }}>{c.phone || '—'}</span>
                          </div>
                          <div style={{ width: 160, flexShrink: 0 }}>
                            <span style={{ fontSize: 13, color: 'var(--foreground-secondary)' }}>{c.company || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2" style={{ width: 100, flexShrink: 0 }}>
                            <Tooltip text="发邮件">
                              <button
                                onClick={() => { onClose(); router.push(`/compose?to=${encodeURIComponent(c.email)}`) }}
                                className="flex items-center justify-center"
                                style={{ width: density === 'compact' ? 26 : 30, height: density === 'compact' ? 26 : 30, borderRadius: 8, backgroundColor: s.bg }}
                                aria-label="发邮件"
                              >
                                <MailIcon className="w-4 h-4" style={{ color: s.text }} />
                              </button>
                            </Tooltip>
                            <Tooltip text="更多">
                              <button
                                onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                                className="flex items-center justify-center"
                                style={{ width: density === 'compact' ? 26 : 30, height: density === 'compact' ? 26 : 30, borderRadius: 8, backgroundColor: 'var(--muted)' }}
                                aria-label="更多"
                              >
                                <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                        )}
                        {menuId === c.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />
                            <div className="absolute right-4 z-50 mt-1 rounded-[10px] py-1 shadow-lg" style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', width: 110 }}>
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
                <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--card-border)', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--foreground-tertiary)' }}>共 {total} 条，第 {page + 1} / {totalPages} 页</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-1 h-7 px-3 rounded-[8px] text-[13px]"
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
                          className="h-7 w-7 rounded-[8px] text-[13px] flex items-center justify-center"
                          style={{ backgroundColor: page === p ? 'var(--teal)' : 'var(--muted)', color: page === p ? '#fff' : 'var(--foreground-secondary)' }}
                        >
                          {p + 1}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="flex items-center gap-1 h-7 px-3 rounded-[8px] text-[13px]"
                      style={{ backgroundColor: 'var(--muted)', color: page >= totalPages - 1 ? 'var(--muted-foreground)' : 'var(--foreground-secondary)', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1 }}
                    >
                      下一页 <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit contact modal */}
        <ContactFormModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditingId(null) }}
          contact={editingId ? contacts.find(c => c.id === editingId) : null}
          accountId={selectedAccountId ?? accounts[0]?.id ?? 0}
          onSave={(updated) => {
            if (editingId) {
              setContacts(prev => prev.map(c => c.id === editingId ? { ...c, ...updated } : c))
            } else {
              setContacts(prev => [...prev, updated])
              setTotal(t => t + 1)
            }
          }}
        />
    </Modal>
  )
}