'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, ChevronDown, Check } from '@/lib/icons'
import type { Contact } from '@/types'

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

export default function ContactPicker({
  value = '',
  onSelect,
  placeholder = '选择联系人',
}: {
  value?: string
  onSelect?: (emails: string[]) => void
  placeholder?: string
}) {
  const [allContacts, setAllContacts] = useState<Contact[]>(MOCK_CONTACTS)
  const [filtered, setFiltered] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const wrapperRef = useRef<HTMLDivElement>(null)
  const MAX_DISPLAY = 10

  // 解析已有值
  useEffect(() => {
    if (value) {
      const emails = value.split(',').map(s => s.trim()).filter(Boolean)
      const ids = new Set<string>()
      allContacts.forEach(c => { if (emails.includes(c.email)) ids.add(String(c.id)) })
      setSelected(ids)
    }
  }, [value, allContacts])

  useEffect(() => {
    api.contacts.list().then(list => {
      if (list && list.length > 0) {
        setAllContacts(list)
        applyFilter(query, showAll, list)
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

  const applyFilter = (q: string, all: boolean, contacts?: Contact[]) => {
    setQuery(q)
    setShowAll(all)
    const source = contacts || allContacts
    const lower = q.trim().toLowerCase()
    if (lower.length === 0) {
      setFiltered(all ? source : source.slice(0, MAX_DISPLAY))
    } else {
      setFiltered(source.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower)
      ))
    }
  }

  const hasMore = allContacts.length > MAX_DISPLAY && !showAll && query.trim().length === 0

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
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); applyFilter(e.target.value, showAll) }}
          onFocus={() => { if (!open) setOpen(true); if (filtered.length === 0) applyFilter('', false) }}
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
              onChange={e => { setQuery(e.target.value); applyFilter(e.target.value, showAll) }}
              placeholder="搜索姓名或邮箱..."
              className="w-full outline-none text-[13px] bg-transparent"
              style={{ color: 'var(--foreground)', placeholderColor: 'var(--muted-foreground)' }}
              autoFocus
            />
          </div>

          {/* 联系人列表 */}
          {filtered.length === 0 && query.trim().length > 0 ? (
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
              onClick={() => applyFilter('', true)}
            >
              <span>查看全部 {allContacts.length} 位联系人</span>
              <ChevronDown className="w-3.5 h-3.5" />
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
