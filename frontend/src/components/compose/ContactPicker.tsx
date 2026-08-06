'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Plus, ChevronDown } from '@/lib/icons'
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
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filtered, setFiltered] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const MAX_DISPLAY = 5

  // Load all contacts once
  useEffect(() => {
    api.contacts.list().then(list => setContacts(list || [])).catch(() => {})
  }, [])

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
        setShowAll(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (q: string) => {
    setQuery(q)
    setShowAll(false)
    if (q.trim().length > 0) {
      api.contacts.search(q).then(list => setFiltered(list || [])).catch(() => {
        const lower = q.toLowerCase()
        setFiltered(contacts.filter(c =>
          c.name.toLowerCase().includes(lower) ||
          c.email.toLowerCase().includes(lower)
        ))
      })
    } else {
      setFiltered([])
    }
  }

  const visibleContacts = showAll ? filtered : filtered.slice(0, MAX_DISPLAY)
  const hasMore = filtered.length > MAX_DISPLAY

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      <div
        className="flex items-center gap-2 h-[41px] rounded-[8px] px-4 cursor-text"
        style={{ backgroundColor: 'var(--background)', border: '0.7px solid rgba(229,217,196,1)' }}
        onClick={() => { setOpen(true); inputRef?.current?.focus() }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => { setOpen(true); if (!query.trim()) handleSearch('') }}
          placeholder={placeholder}
          className="flex-1 min-w-0 outline-none text-[14px] bg-transparent"
          style={{ color: 'var(--foreground)', placeholderColor: 'var(--muted-foreground)' }}
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

      {open && filtered.length > 0 && (
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

          {hasMore && !showAll && (
            <div
              className="flex items-center justify-between px-4 py-2 cursor-pointer transition-colors"
              style={{ borderTop: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground-secondary)' }}
              onClick={() => setShowAll(true)}
            >
              <span className="text-[12px]">查看全部 {filtered.length} 位联系人</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
