'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, ChevronDown, Check } from '@/lib/icons'
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

export default function ContactPicker({
  value = '',
  onSelect,
  placeholder = '选择联系人',
}: {
  value?: string
  onSelect?: (emails: string[]) => void
  placeholder?: string
}) {
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [filtered, setFiltered] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const MAX_DISPLAY = 10
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 解析已有值
  useEffect(() => {
    if (value && allContacts.length > 0) {
      const emails = value.split(',').map(s => s.trim()).filter(Boolean)
      const ids = new Set<string>()
      allContacts.forEach(c => { if (emails.includes(c.email)) ids.add(String(c.id)) })
      setSelected(ids)
    }
  }, [value, allContacts])

  useEffect(() => {
    api.contacts.list(undefined, 200, 0).then(result => {
      if (result && result.items && result.items.length > 0) {
        setAllContacts(result.items)
        setFiltered(result.items.slice(0, MAX_DISPLAY))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const doSearch = async (q: string) => {
    setQuery(q)
    if (q.trim().length === 0) {
      setFiltered(showAll ? allContacts : allContacts.slice(0, MAX_DISPLAY))
      return
    }
    setLoading(true)
    try {
      const result = await api.contacts.search(q, undefined, 50, 0)
      setFiltered(result?.items || [])
    } catch {
      setFiltered([])
    }
    setLoading(false)
  }

  const handleInputChange = (q: string) => {
    setQuery(q)
    setOpen(true)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => doSearch(q), 200)
  }

  const toggleShowAll = () => {
    const next = !showAll
    setShowAll(next)
    if (query.trim().length === 0) {
      setFiltered(next ? allContacts : allContacts.slice(0, MAX_DISPLAY))
    }
  }

  const hasMore = allContacts.length > MAX_DISPLAY && !showAll && query.trim().length === 0 && allContacts.length > 0

  const toggleSelect = (contact: Contact) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(String(contact.id))) next.delete(String(contact.id))
      else next.add(String(contact.id))
      return next
    })
  }

  const handleConfirm = () => {
    const emails = [...selected].map(id => {
      const c = allContacts.find(cc => String(cc.id) === id)
      return c?.email || ''
    }).filter(Boolean)
    if (emails.length > 0 && onSelect) onSelect(emails)
    setQuery('')
    setOpen(false)
    setSelected(new Set())
  }

  const selectedCount = selected.size

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      {/* 输入区域 */}
      <div
        className="flex items-center gap-2 h-[41px] rounded-[8px] px-3 cursor-text"
        style={{ backgroundColor: 'var(--background)', border: '0.7px solid rgba(229,217,196,1)' }}
        onClick={() => setOpen(true)}
      >
        {/* 已选联系人标签 */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            {[...selected].map(id => {
              const c = allContacts.find(cc => String(cc.id) === id)
              if (!c) return null
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[11px] font-medium shrink-0"
                  style={{ backgroundColor: 'rgba(243,237,227,1)', color: 'rgba(107,91,79,1)' }}
                >
                  {c.email}
                  <button
                    onClick={e => { e.stopPropagation(); toggleSelect(c) }}
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-[rgba(196,61,61,0.1)]"
                    style={{ color: 'rgba(184,168,138,1)' }}
                  >
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              )
            })}
          </div>
        )}

        <input
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => { if (!open) setOpen(true); if (filtered.length === 0 && allContacts.length > 0) setFiltered(allContacts.slice(0, MAX_DISPLAY)) }}
          placeholder={selectedCount === 0 ? placeholder : ''}
          className="flex-1 min-w-0 outline-none text-[14px] bg-transparent"
          style={{ color: 'var(--foreground)' }}
          autoComplete="off"
          onClick={e => e.stopPropagation()}
        />
        <button
          onClick={e => { e.stopPropagation(); setOpen(true) }}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-[rgba(243,237,227,1)]"
          style={{ color: 'var(--foreground-secondary)' }}
          title="选择联系人"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 弹框 */}
      {open && (
        <div
          className="absolute z-50 top-full mt-1 left-0 rounded-[12px] overflow-hidden"
          style={{
            backgroundColor: '#ffffff',
            border: '0.7px solid rgba(229,217,196,1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            minWidth: 300,
            maxWidth: 380,
          }}
        >
          {/* 搜索栏 */}
          <div className="px-3 py-2.5 border-b" style={{ borderColor: 'rgba(229,217,196,1)' }}>
            <input
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="搜索姓名或邮箱..."
              className="w-full outline-none text-[13px] bg-transparent"
              style={{ color: 'var(--foreground)' }}
              autoFocus
            />
          </div>

          {/* 联系人列表 */}
          {loading ? (
            <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              搜索中...
            </div>
          ) : filtered.length === 0 && query.trim().length > 0 ? (
            <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              未找到匹配的联系人
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto py-1">
              {filtered.map(contact => {
                const style = getAvatarStyle(contact.name)
                const isSelected = selected.has(String(contact.id))
                return (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors"
                    style={{ backgroundColor: isSelected ? 'rgba(243,237,227,0.5)' : 'transparent' }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(243,237,227,1)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                    onClick={() => toggleSelect(contact)}
                  >
                    {/* 勾选框 */}
                    <div
                      className="w-5 h-5 rounded shrink-0 flex items-center justify-center transition-all"
                      style={{
                        border: isSelected ? '1.5px solid rgba(196,61,61,1)' : '1.5px solid rgba(229,217,196,1)',
                        backgroundColor: isSelected ? 'rgba(196,61,61,1)' : 'transparent',
                      }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {/* 头像 */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {contact.name?.[0] || '?'}
                    </div>
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate" style={{ color: 'var(--foreground)' }}>{contact.name}</div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--muted-foreground)' }}>{contact.email}</div>
                    </div>
                    {contact.company && (
                      <span className="text-[11px] shrink-0" style={{ color: 'rgba(184,168,138,1)' }}>{contact.company}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* 更多按钮 */}
          {hasMore && (
            <div
              className="flex items-center gap-1.5 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(243,237,227,1)]"
              style={{ borderTop: '0.7px solid rgba(229,217,196,1)', color: 'rgba(107,91,79,1)', fontSize: 12 }}
              onClick={e => { e.stopPropagation(); toggleShowAll() }}
            >
              <span>查看全部 {allContacts.length} 位联系人</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          )}

          {/* 搜索结果显示计数 */}
          {query.trim().length > 0 && !loading && (
            <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--muted-foreground)', borderTop: '0.7px solid rgba(229,217,196,1)' }}>
              找到 {filtered.length} 位联系人
            </div>
          )}

          {/* 底部操作栏 */}
          {selectedCount > 0 && (
            <div
              className="flex items-center justify-end gap-2 px-4 py-2.5"
              style={{ borderTop: '0.7px solid rgba(229,217,196,1)' }}
              onClick={e => e.stopPropagation()}
            >
              <span className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                已选 {selectedCount} 位
              </span>
              <button
                className="px-4 h-[30px] rounded-[8px] text-[13px] font-medium transition-opacity hover:opacity-85"
                style={{ backgroundColor: 'rgba(196,61,61,1)', color: '#ffffff' }}
                onClick={handleConfirm}
              >
                确认
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
