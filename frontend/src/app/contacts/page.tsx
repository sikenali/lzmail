'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Mail as MailIcon, MoreHorizontal, UserAdd, ArrowUpDown, X, Trash2, Edit, Phone, Send, ChevronLeft, ChevronRight } from '@/lib/icons'
import { ContactFormModal } from '@/components/contacts/ContactFormModal'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { useDebounce } from '@/hooks/useSSE'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Tooltip } from '@/components/Tooltip'
import type { Contact } from '@/types'

/* 头像色板走主题变量，随浅色/深空主题自动切换，避免深色模式下的高亮色块 */
const AVATAR_COLOR_PAIRS = [
  { bg: 'var(--brand-green-soft)', text: 'var(--brand-green)' },
  { bg: 'var(--brand-gold-soft)', text: 'var(--brand-gold-strong)' },
  { bg: 'var(--brand-blue-soft)', text: 'var(--brand-blue)' },
  { bg: 'var(--brand-red-soft)', text: 'var(--brand-red)' },
  { bg: 'var(--color-info-soft)', text: 'var(--color-info)' },
  { bg: 'var(--color-warning-soft)', text: 'var(--color-warning)' },
  { bg: 'var(--color-success-soft)', text: 'var(--color-success)' },
  { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)' },
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

const PAGE_SIZE = 10

export default function ContactsPage() {
  const router = useRouter()
  const { settings } = useSettings()
  const isMobile = useIsMobile()
  const [accounts, setAccounts] = useState<{ id: number; email: string }[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const debouncedSearchQ = useDebounce(searchQ, 300)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
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
      load(debouncedSearchQ, page, selectedAccountId)
    } else {
      setLoading(false)
    }
  }, [selectedAccountId, page, debouncedSearchQ])

  useEffect(() => {
    setPage(0)
  }, [debouncedSearchQ])

  const handleSearch = (q: string) => {
    setSearchQ(q)
  }

  const density = settings.mail_density || 'comfortable'

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const openCreate = () => {
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (c: Contact) => {
    setEditingId(c.id)
    setShowForm(true)
    setMenuId(null)
  }

  const deleteContact = async (c: Contact) => {
    try {
      await api.contacts.delete(c.id)
      setContacts(prev => prev.filter(x => x.id !== c.id))
      setTotal(t => Math.max(0, t - 1))
      toast.success('已删除联系人')
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
    setMenuId(null)
  }

  const sorted = useMemo(() => [...contacts].sort((a, b) => {
    const r = (a.name || '').localeCompare(b.name || '', 'zh')
    return sortAsc ? r : -r
  }), [contacts, sortAsc])

  return (
    <AppShell>
      <div className="workspace-page">
        {/* §4.1 标题行（复用 lzc2vsdx ResultView） */}
        <div className="result-title-row">
          <div className="title-left">
            <h1>联系人</h1>
            <span className="status-pill">
              <i className="ri-contacts-book-line" />
              {total} 人
            </span>
            <span className="title-desc">管理您的联系人列表</span>
          </div>
          <div className="title-actions" style={{ flexWrap: 'wrap' }}>
            {accounts.length > 1 && (
              <select
                value={selectedAccountId ?? ''}
                onChange={e => { setPage(0); setSelectedAccountId(Number(e.target.value)) }}
                className="h-[36px] px-3 rounded-[8px] text-[13px] outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '0.6px solid var(--color-border)', color: 'var(--foreground)', fontFamily: 'var(--font-family-cn)' }}
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.email}</option>
                ))}
              </select>
            )}
            <div className="relative" style={{ width: isMobile ? '100%' : 220 }}>
              <i className="ri-search-line" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-muted)' }} />
              <input
                value={searchQ}
                onChange={e => handleSearch(e.target.value)}
                placeholder="搜索姓名或邮箱..."
                className="w-full h-[36px] pl-8 pr-8 rounded-[8px] outline-none text-[13px]"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '0.6px solid var(--color-border)', color: 'var(--foreground)' }}
              />
              {searchQ && (
                <button onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={openCreate}
              disabled={accounts.length === 0}
              title={accounts.length === 0 ? '请先在「账号管理」中添加邮箱账号' : undefined}
              className="save-btn"
              style={{ opacity: accounts.length === 0 ? 0.45 : 1, cursor: accounts.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              <UserAdd className="w-4 h-4" />
              添加联系人
            </button>
          </div>
        </div>

        {/* lzc2vsdx 工作区双栏：左列常用联系人 + 右列联系人表格 */}
        <div className="workspace-columns">
          <div className="left-column">
            <section className="card panel-card">
              <div className="panel-header">
                <span className="title-bar" />
                <span className="title-text">常用联系人</span>
                <span className="title-desc">快速发信</span>
              </div>
              <div className="type-list">
                {loading ? (
                  <div className="type-desc" style={{ padding: '12px 4px' }}>加载中...</div>
                ) : contacts.length === 0 ? (
                  <div className="type-card" style={{ cursor: 'default' }}>
                    <span className="type-icon" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
                      <i className="ri-contacts-line" />
                    </span>
                    <span className="type-texts">
                      <span className="type-title">暂无联系人</span>
                      <span className="type-desc">点击右上角「添加联系人」</span>
                    </span>
                  </div>
                ) : contacts.slice(0, 6).map((c) => {
                  const s = getAvatarStyle(c.name)
                  return (
                    <div key={c.id} className="type-card" style={{ cursor: 'default' }}>
                      <span className="type-icon" style={{ background: s.bg, color: s.text, fontWeight: 700, fontSize: 14 }}>
                        {c.name?.[0] || '?'}
                      </span>
                      <span className="type-texts">
                        <span className="type-title">{c.name || '(无名)'}</span>
                        <span className="type-desc">{c.email || c.phone || '—'}</span>
                      </span>
                      <button
                        disabled={!c.email}
                        onClick={() => { if (!c.email) return; router.push(`/compose?to=${encodeURIComponent(c.email)}`) }}
                        className="check-badge active"
                        style={{ border: 'none', cursor: c.email ? 'pointer' : 'not-allowed', opacity: c.email ? 1 : 0.4 }}
                        aria-label="发邮件"
                        title="发邮件"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="right-column">
            <section className="card preview-card" style={{ overflowX: 'auto' }}>
              <div className="preview-header">
                <div className="preview-title-left">
                  <span className="title-bar" />
                  <span className="title-text">{searchQ ? `搜索 "${searchQ}"` : '全部联系人'}</span>
                  <span className="title-desc">{total} 人</span>
                </div>
                <button
                  onClick={() => setSortAsc(a => !a)}
                  className="soft-action"
                  style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                >
                  {sortAsc ? '按名称' : '按名称↓'}
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div style={{ minWidth: isMobile ? undefined : 980, marginTop: 12 }}>
          {/* Table header */}
          {!isMobile && (
          <div className="flex items-center" style={{ height: 41, padding: '0 16px', marginBottom: 0 }}>
            <div style={{ width: 220, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>姓名</span></div>
            <div style={{ width: 308, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>邮箱</span></div>
            <div style={{ width: 198, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>电话</span></div>
            <div style={{ width: 198, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>公司</span></div>
            <div style={{ width: 132, flexShrink: 0 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>操作</span></div>
          </div>
          )}

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
                    {isMobile ? (
                      <div className="flex items-center gap-3" style={{ padding: '10px 4px' }}>
                        <div className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 9999, backgroundColor: s.bg }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: s.text }}>{c.name?.[0] || '?'}</span>
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
                          <Tooltip text={c.email ? "发邮件" : "该联系人无邮箱地址"}>
                            <button
                              disabled={!c.email}
                              onClick={() => { if (!c.email) return; router.push(`/compose?to=${encodeURIComponent(c.email)}`) }}
                              className="flex items-center justify-center"
                              style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: s.bg, opacity: c.email ? 1 : 0.4, cursor: c.email ? 'pointer' : 'not-allowed' }}
                              aria-label="发邮件"
                            >
                              <MailIcon className="w-4 h-4" style={{ color: s.text }} />
                            </button>
                          </Tooltip>
                          <Tooltip text="更多">
                            <button
                              onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                              className="flex items-center justify-center"
                              style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'var(--muted)' }}
                              aria-label="更多"
                            >
                              <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    ) : (
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
                        <Tooltip text={c.email ? "发邮件" : "该联系人无邮箱地址"}>
                          <button
                            disabled={!c.email}
                            onClick={() => { if (!c.email) return; router.push(`/compose?to=${encodeURIComponent(c.email)}`) }}
                            className="flex items-center justify-center"
                            style={{ width: density === 'compact' ? 28 : 32, height: density === 'compact' ? 28 : 32, borderRadius: 8, backgroundColor: s.bg, opacity: c.email ? 1 : 0.4, cursor: c.email ? 'pointer' : 'not-allowed' }}
                            aria-label="发邮件"
                          >
                            <MailIcon className="w-4 h-4" style={{ color: s.text }} />
                          </button>
                        </Tooltip>
                        <Tooltip text="更多">
                          <button
                            onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                            className="flex items-center justify-center"
                            style={{ width: density === 'compact' ? 28 : 32, height: density === 'compact' ? 28 : 32, borderRadius: 8, backgroundColor: 'var(--muted)' }}
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
                        <div className="absolute right-4 z-50 mt-1 rounded-[10px] py-1 shadow-lg" style={{ backgroundColor: 'var(--card)', border: '0.6px solid var(--color-border)', width: 120 }}>
                          <button
                            onClick={() => openEdit(c)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-[var(--muted)]"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <Edit className="w-3.5 h-3.5" /> 编辑
                          </button>
                          <button
                            onClick={() => { setDeleteTarget(c); setMenuId(null) }}
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
            <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid var(--card-border)', flexWrap: 'wrap', gap: 8 }}>
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
                      style={{ backgroundColor: page === p ? 'var(--tech-cyan)' : 'var(--muted)', color: page === p ? 'var(--color-on-primary)' : 'var(--foreground-secondary)', fontFamily: 'var(--font-mono)' }}
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
            </section>
          </div>
        </div>

        {/* Add/Edit contact modal */}
        <ContactFormModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditingId(null) }}
          contact={editingId ? contacts.find(c => c.id === editingId) : null}
          accountId={selectedAccountId ?? accounts[0]?.id ?? 0}
          hasAccount={accounts.length > 0}
          onSave={(updated) => {
            if (editingId) {
              setContacts(prev => prev.map(c => c.id === editingId ? { ...c, ...updated } : c))
            } else {
              setContacts(prev => [...prev, updated])
              setTotal(t => t + 1)
            }
          }}
        />

        {/* 删除确认 */}
        <DeleteConfirm
          open={deleteTarget !== null}
          title="删除联系人"
          message={deleteTarget ? `确定删除「${deleteTarget.name || deleteTarget.email}」吗？此操作不可撤销。` : '确定删除该联系人吗？'}
          onConfirm={async () => {
            if (deleteTarget) await deleteContact(deleteTarget)
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
