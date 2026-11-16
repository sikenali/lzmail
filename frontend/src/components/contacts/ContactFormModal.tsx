'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { X } from '@/lib/icons'
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

export function ContactFormModal({
  open,
  onClose,
  contact,
  accountId,
  hasAccount = true,
  onSave,
}: {
  open: boolean
  onClose: () => void
  contact?: Contact | null
  accountId: number
  hasAccount?: boolean
  onSave?: (contact: Contact) => void
}) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      if (contact) {
        setEditingId(contact.id)
        setForm({ name: contact.name || '', email: contact.email || '', phone: contact.phone || '', company: contact.company || '', title: contact.title || '' })
      } else {
        setEditingId(null)
        setForm(emptyForm)
      }
    }
  }, [open, contact])

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
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const saveContact = async () => {
    if (!form.name || !form.email) { toast.error('请填写姓名和邮箱'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { toast.error('邮箱格式不正确'); return }
    if (form.phone.trim() && !/^[\d\+\-\(\)\s]{6,20}$/.test(form.phone.trim())) { toast.error('电话格式不正确'); return }
    if (!hasAccount) { toast.error('请先在「账号管理」中添加邮箱账号'); return }
    setSaving(true)
    const extra = { phone: form.phone, company: form.company, title: form.title }
    try {
      if (editingId) {
        await api.contacts.update(editingId, { name: form.name, email: form.email, account_id: accountId, ...extra })
        toast.success('联系人已更新')
        onSave?.({ id: editingId, name: form.name, email: form.email, account_id: accountId, ...extra } as Contact)
      } else {
        const created = await api.contacts.create({ name: form.name, email: form.email, account_id: accountId, ...extra })
        const newContact = { ...created, ...extra, id: created.id, account_id: accountId } as Contact
        toast.success('联系人已添加')
        onSave?.(newContact)
      }
      onClose()
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const style = getAvatarStyle(form.name)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto" style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s ease' }} onClick={onClose}>
      <div className="w-[440px] max-w-full rounded-[16px] p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--card-border)', animation: 'scaleIn 0.2s ease' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{editingId ? '编辑联系人' : '新建联系人'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[var(--muted)]">
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
              style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
            />
          ))}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 h-9 rounded-[8px] text-[14px] hover:bg-[var(--muted)]" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground-tertiary)' }}>
              取消
            </button>
            <button onClick={saveContact} disabled={saving} className="px-4 h-9 bg-[var(--primary)] text-white rounded-[8px] text-[14px] font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
