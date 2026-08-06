'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Plus, ChevronDown } from '@/lib/icons'
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
  inputRef,
  onSelect,
  value,
  placeholder = '选择联系人',
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>
  onSelect: (contact: Contact) => void
  value?: string
  placeholder?: string
}) {
  const router = useRouter()
  const [allContacts, setAllContacts] = useState<Contact[]>(MOCK_CONTACTS)
  const [filtered, setFiltered] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRefInternal = useRef<HTMLInputElement>(null)
  const resolvedRef = inputRef || inputRefInternal
  const MAX_DISPLAY = 5

  useEffect(() => {
    api.contacts.list().then(list => {
      if (list && list.length > 0) setAllContacts(list)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowAll(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const applyFilter = (q: string, showAllContacts: boolean) => {
    setQuery(q)
    setShowAll(showAllContacts)
    const lower = q.trim().toLowerCase()
    if (lower.length === 0) {
      setFiltered(showAllContacts ? allContacts : allContacts.slice(0, MAX_DISPLAY))
    } else {
      const matches = allContacts.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower)
      )
      setFiltered(matches)
    }
  }

  const visibleContacts = filtered
  const hasMore = allContacts.length > MAX_DISPLAY && !showAll && query.trim().length === 0

  const handleOpen = () => {
    setOpen(true)
    if (filtered.length === 0) {
      applyFilter('', false)
    }
    resolvedRef.current?.focus()
  }

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      <div
        className="flex items-center gap-2 h-[41px] rounded-[8px] px-4 cursor-text"
        style={{ backgroundColor: 'var(--background)', border: '0.7px solid rgba(229,217,196,1)' }}
        onClick={handleOpen}
      >
        <input
          ref={resolvedRef}
          value={query}
          onChange={e => applyFilter(e.target.value, false)}
          onFocus={() => { setOpen(true); if (filtered.length === 0) applyFilter('', false) }}
          placeholder={placeholder}
          className="flex-1 min-w-0 outline-none text-[14px] bg-transparent"
          style={{ color: 'var(--foreground)' }}
          autoComplete="off"
        />
        <button
          onClick={e => { e.stopPropagation(); router.push('/contacts') }}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-[rgba(243,237,227,1)]"
          style={{ color: 'var(--foreground-secondary)' }}
          title="打开联系人"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 left-0 rounded-[12px] overflow-hidden"
          style={{
            backgroundColor: '#ffffff',
            border: '0.7px solid rgba(229,217,196,1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            minWidth: 280,
            maxWidth: 360,
          }}
        >
          {/* 空状态 */}
          {filtered.length === 0 && query.trim().length > 0 && (
            <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              未找到匹配的联系人
            </div>
          )}

          {/* 联系人列表 */}
          {filtered.length > 0 && (
            <div className="max-h-64 overflow-y-auto py-1">
              {visibleContacts.map(contact => {
                const style = getAvatarStyle(contact.name)
                return (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(243,237,227,1)]"
                    onClick={() => {
                      onSelect(contact)
                      setQuery('')
                      setOpen(false)
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {contact.name?.[0] || '?'}
                    </div>
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

          {/* 查看全部 */}
          {hasMore && (
            <div
              className="flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(243,237,227,1)]"
              style={{ borderTop: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground-secondary)', fontSize: 12 }}
              onClick={() => applyFilter('', true)}
            >
              <span>查看全部 {allContacts.length} 位联系人</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
