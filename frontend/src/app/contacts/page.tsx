'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Plus, MoreVertical, ChevronDown, Mail as MailIcon, X } from '@/lib/icons'
import type { Contact } from '@/types'

// MOCK 假数据（上线前删除）
const MOCK_CONTACTS: Contact[] = [
  { id: 1, name: '陈小明', email: 'chenxm@company.com', account_id: 1, created_at: '', updated_at: '' },
  { id: 2, name: '李华', email: 'lihua@partner.com', account_id: 1, created_at: '', updated_at: '' },
  { id: 3, name: '王芳', email: 'wangfang@gmail.com', account_id: 2, created_at: '', updated_at: '' },
  { id: 4, name: '张伟', email: 'zhangwei@outlook.com', account_id: 2, created_at: '', updated_at: '' },
  { id: 5, name: '刘洋', email: 'liuyang@icloud.com', account_id: 1, created_at: '', updated_at: '' },
  { id: 6, name: '赵丽', email: 'zhaoli@qq.com', account_id: 2, created_at: '', updated_at: '' },
  { id: 7, name: '孙鹏', email: 'sunpeng@163.com', account_id: 1, created_at: '', updated_at: '' },
  { id: 8, name: '周杰', email: 'zhoujie@gmail.com', account_id: 2, created_at: '', updated_at: '' },
  { id: 9, name: '吴敏', email: 'wumin@company.com', account_id: 1, created_at: '', updated_at: '' },
  { id: 10, name: '郑浩', email: 'zhenghao@outlook.com', account_id: 2, created_at: '', updated_at: '' },
]

const gradients = [
  'from-orange-400 to-red-500', 'from-blue-400 to-indigo-500', 'from-cyan-400 to-blue-500',
  'from-red-400 to-pink-500', 'from-purple-400 to-pink-500', 'from-green-400 to-emerald-500',
]

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'table'>('table')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', email: '' })

  useEffect(() => {
    // MOCK 假数据（上线前删除）
    setContacts(MOCK_CONTACTS)
    setLoading(false)
  }, [])

  const filtered = contacts

  const grouped: Record<string, Contact[]> = {}
  for (const c of filtered) {
    const letter = (c.name?.[0] || '#').toUpperCase()
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(c)
  }

  const availableLetters = Object.keys(grouped).sort()

  return (
    <AppShell>
      <div className="px-10 py-8" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-[5px] h-8 rounded-[2px]" style={{ backgroundColor: 'rgba(107,143,163,1)' }} />
            <div>
              <h1 className="text-[28px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>联系人</h1>
              <p className="text-[13px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>管理您的联系人列表</p>
            </div>
          </div>
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 h-[47px] px-5 rounded-[12px] text-[14px] font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'rgba(107,143,163,1)', color: '#ffffff' }}>
            <Plus className="w-[18px] h-[18px]" /> 添加联系人
          </button>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-1 bg-[var(--card)] rounded-[8px] p-0.5" style={{ border: '1px solid rgba(229,217,196,1)' }}>
            <button onClick={() => setView('grid')} className={`px-3 h-8 rounded-[8px] text-[13px] font-medium transition-colors ${view === 'grid' ? 'bg-[var(--primary)] text-white' : 'text-[var(--foreground-tertiary)] hover:bg-[var(--muted)]'}`}>
              卡片
            </button>
            <button onClick={() => setView('table')} className={`px-3 h-8 rounded-[8px] text-[13px] font-medium transition-colors ${view === 'table' ? 'bg-[var(--primary)] text-white' : 'text-[var(--foreground-tertiary)] hover:bg-[var(--muted)]'}`}>
              列表
            </button>
          </div>
        </div>

        {/* Add contact modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddForm(false)}>
             <div className="bg-[var(--card)] rounded-[16px] p-6 w-[400px] mx-4" style={{ border: '1px solid rgba(229,217,196,1)' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>新建联系人</h3>
                <button onClick={() => setShowAddForm(false)} className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[var(--muted)]">
                  <X className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />
                </button>
              </div>
              <div className="space-y-3">
                 <input placeholder="姓名" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})}
                   className="w-full h-[40px] px-4 rounded-[8px] outline-none text-[14px] bg-transparent" style={{ border: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground)' }} />
                 <input placeholder="邮箱地址" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})}
                   className="w-full h-[40px] px-4 rounded-[8px] outline-none text-[14px] bg-transparent" style={{ border: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground)' }} />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddForm(false)} className="px-4 h-9 rounded-[8px] text-[14px] hover:bg-[var(--muted)]" style={{ border: '1px solid rgba(229,217,196,1)', color: 'var(--foreground-tertiary)' }}>取消</button>
                  <button onClick={async () => {
                    if (!newContact.email) return
                    // MOCK 假数据（上线前删除）
                    const newId = Math.max(...contacts.map(c => c.id), 0) + 1
                    setContacts(prev => [...prev, { id: newId, name: newContact.name, email: newContact.email, account_id: 1, created_at: '', updated_at: '' }])
                    setShowAddForm(false)
                    setNewContact({ name: '', email: '' })
                  }} className="px-4 h-9 bg-[var(--primary)] text-white rounded-[8px] text-[14px] font-medium hover:opacity-90">保存</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
        ) : view === 'grid' ? (
          <>
            {/* Grid view */}
            <div className="space-y-6">
              {availableLetters.map(letter => (
                <div key={letter} id={`letter-${letter}`}>
                  <div className="sticky top-0 bg-[var(--background)] z-10 pb-2 mb-3 border-b" style={{ borderColor: 'rgba(229,217,196,1)' }}>
                    <span className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{letter}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {grouped[letter].map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 p-4 bg-[var(--card)] rounded-[16px] hover:shadow-sm transition-shadow cursor-pointer"
                        style={{ border: '1px solid rgba(229,217,196,1)' }}
                      >
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradients[(c.id % gradients.length)]} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                          {(c.name?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{c.name || '(无名)'}</div>
                          <div className="text-xs truncate" style={{ color: 'var(--foreground-tertiary)' }}>{c.email}</div>
                        </div>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--muted)] rounded-lg">
                          <MoreVertical className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Table view */}
            <div className="bg-[var(--card)] rounded-[16px] overflow-hidden" style={{ border: '1px solid rgba(229,217,196,1)' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(229,217,196,1)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-sm" style={{ backgroundColor: 'var(--primary)' }} />
                  <span className="font-semibold text-[14px]" style={{ color: 'var(--foreground)' }}>联系人列表</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>{filtered.length}</span>
                </div>
                <button className="flex items-center gap-1 text-[13px] text-[var(--foreground-tertiary)] hover:bg-[var(--muted)] px-3 h-8 rounded-[8px]">
                  排序 <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-[13px] text-[var(--foreground-tertiary)]" style={{ borderBottom: '1px solid rgba(229,217,196,1)' }}>
                    <th className="text-left px-6 py-3 font-medium w-[220px]">姓名</th>
                    <th className="text-left px-6 py-3 font-medium">邮箱</th>
                    <th className="text-left px-6 py-3 font-medium">电话</th>
                    <th className="text-left px-6 py-3 font-medium">公司</th>
                    <th className="text-left px-6 py-3 font-medium w-[132px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--accent)] transition-colors" style={{ borderBottom: '1px solid rgba(229,217,196,1)' }}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradients[(c.id % gradients.length)]} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                            {(c.name?.[0] || '?').toUpperCase()}
                          </div>
                          <span className="text-[14px] font-medium" style={{ color: 'var(--foreground)' }}>{c.name || '(无名)'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-[14px]" style={{ color: 'var(--foreground-secondary)' }}>{c.email}</td>
                      <td className="px-6 py-3 text-[14px]" style={{ color: 'var(--foreground-secondary)' }}>—</td>
                      <td className="px-6 py-3 text-[14px]" style={{ color: 'var(--foreground-secondary)' }}>—</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[var(--muted)]">
                            <MailIcon className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />
                          </button>
                          <button className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[var(--muted)]">
                            <MoreVertical className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--muted)' }}>
              <MailIcon className="w-8 h-8" style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--foreground-tertiary)' }}>暂无联系人</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
