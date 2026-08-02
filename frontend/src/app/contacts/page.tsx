'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { Search, Plus, MoreVertical, ChevronDown, Mail as MailIcon, Phone, Building, X } from 'lucide-react'
import type { Contact } from '@/types'

const gradients = [
  'from-orange-400 to-red-500', 'from-blue-400 to-indigo-500', 'from-cyan-400 to-blue-500',
  'from-red-400 to-pink-500', 'from-purple-400 to-pink-500', 'from-green-400 to-emerald-500',
]

const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', email: '' })

  useEffect(() => {
    api.contacts.list().then(list => setContacts(list || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const [loadingSearch, setLoadingSearch] = useState(false)
  const [filtered, setFiltered] = useState<Contact[]>([])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(contacts)
      return
    }
    setLoadingSearch(true)
    api.contacts.search(search).then(list => setFiltered(list || [])).catch(() => setFiltered(contacts)).finally(() => setLoadingSearch(false))
  }, [search, contacts])

  const grouped: Record<string, Contact[]> = {}
  for (const c of filtered) {
    const letter = (c.name?.[0] || '#').toUpperCase()
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(c)
  }

  const availableLetters = ALPHABET.filter(l => grouped[l])

  return (
    <AppShell>
      <div className="p-6" style={{ backgroundColor: '#fbf7f0', minHeight: '100%' }}>
        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-[5px] h-8 rounded-full" style={{ backgroundColor: '#6b8fa3' }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#3d2b1f', fontFamily: 'SourceHanSans-Bold, system-ui' }}>联系人</h1>
              <p className="text-xs mt-0.5" style={{ color: '#8b7355' }}>管理你的联系人</p>
            </div>
          </div>
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 h-10 bg-[#6b8fa3] text-white rounded-xl text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> 添加联系人
          </button>
        </div>

        {/* Search + view toggle */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-white rounded-xl outline-none text-sm placeholder:text-[#b8a88a]"
              style={{ border: '1px solid #f3ede3', color: '#3d2b1f' }}
              placeholder="搜索联系人..."
            />
          </div>
          <div className="flex items-center gap-1 bg-white rounded-xl border p-1" style={{ borderColor: '#f3ede3' }}>
            {showAddForm && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddForm(false)}>
              <div className="bg-white rounded-2xl p-6 w-[400px] mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>新建联系人</h3>
                  <button onClick={() => setShowAddForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f0e8]">
                    <X className="w-4 h-4" style={{ color: '#8b7355' }} />
                  </button>
                </div>
                <div className="space-y-3">
                  <input placeholder="姓名" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border outline-none text-sm bg-transparent" style={{ borderColor: '#f3ede3', color: '#3d2b1f' }} />
                  <input placeholder="邮箱地址" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border outline-none text-sm bg-transparent" style={{ borderColor: '#f3ede3', color: '#3d2b1f' }} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAddForm(false)} className="px-4 h-9 border rounded-lg text-sm hover:bg-[#f5f0e8]" style={{ borderColor: '#f3ede3', color: '#8b7355' }}>取消</button>
                    <button onClick={async () => {
                      if (!newContact.email) return
                      await api.contacts.create(newContact)
                      setShowAddForm(false)
                      setNewContact({ name: '', email: '' })
                      window.location.reload()
                    }} className="px-4 h-9 bg-[#6b8fa3] text-white rounded-lg text-sm font-medium hover:opacity-90">保存</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <button onClick={() => setView('grid')} className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors ${view === 'grid' ? 'bg-[#6b8fa3] text-white' : 'text-[#8b7355] hover:bg-[#f5f0e8]'}`}>
              卡片
            </button>
            <button onClick={() => setView('table')} className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors ${view === 'table' ? 'bg-[#6b8fa3] text-white' : 'text-[#8b7355] hover:bg-[#f5f0e8]'}`}>
              列表
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: '#b8a88a' }}>加载中...</div>
        ) : view === 'grid' ? (
          <>
            {/* Grid view */}
            <div className="space-y-6">
              {availableLetters.map(letter => (
                <div key={letter} id={`letter-${letter}`}>
                  <div className="sticky top-0 bg-[#fbf7f0] z-10 pb-2 mb-3 border-b" style={{ borderColor: '#f3ede3' }}>
                    <span className="text-lg font-semibold" style={{ color: '#3d2b1f' }}>{letter}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {grouped[letter].map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 p-4 bg-white rounded-2xl border hover:shadow-sm transition-shadow cursor-pointer"
                        style={{ borderColor: '#f3ede3' }}
                      >
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradients[(c.id % gradients.length)]} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                          {(c.name?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: '#3d2b1f' }}>{c.name || '(无名)'}</div>
                          <div className="text-xs truncate" style={{ color: '#8b7355' }}>{c.email}</div>
                        </div>
                        <button className="w-8 h-8 flex items-center justify-center hover:bg-[#f5f0e8] rounded-lg">
                          <MoreVertical className="w-4 h-4" style={{ color: '#8b7355' }} />
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
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#f3ede3' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#f3ede3' }}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: '#c43d3d' }} />
                  <span className="font-semibold text-sm" style={{ color: '#3d2b1f' }}>联系人列表</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fef9f0', color: '#c43d3d' }}>{filtered.length}</span>
                </div>
                <button className="flex items-center gap-1 text-xs text-[#8b7355] hover:bg-[#f5f0e8] px-3 h-8 rounded-lg">
                  排序 <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-[#8b7355]" style={{ borderBottom: '1px solid #f3ede3' }}>
                    <th className="text-left px-6 py-3 font-medium w-[220px]">姓名</th>
                    <th className="text-left px-6 py-3 font-medium">邮箱</th>
                    <th className="text-left px-6 py-3 font-medium">电话</th>
                    <th className="text-left px-6 py-3 font-medium">公司</th>
                    <th className="text-left px-6 py-3 font-medium w-[132px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-[#faf8f5] transition-colors" style={{ borderBottom: '1px solid #f5f0e8' }}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradients[(c.id % gradients.length)]} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                            {(c.name?.[0] || '?').toUpperCase()}
                          </div>
                          <span className="text-sm font-medium" style={{ color: '#3d2b1f' }}>{c.name || '(无名)'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm" style={{ color: '#6b5b4f' }}>{c.email}</td>
                      <td className="px-6 py-3 text-sm" style={{ color: '#6b5b4f' }}>—</td>
                      <td className="px-6 py-3 text-sm" style={{ color: '#6b5b4f' }}>—</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f0e8]">
                            <MailIcon className="w-4 h-4" style={{ color: '#8b7355' }} />
                          </button>
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f0e8]">
                            <MoreVertical className="w-4 h-4" style={{ color: '#8b7355' }} />
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
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f5f0e8' }}>
              <MailIcon className="w-8 h-8" style={{ color: '#b8a88a' }} />
            </div>
            <p className="text-sm" style={{ color: '#b8a88a' }}>暂无联系人</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
