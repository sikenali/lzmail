'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { X } from '@/lib/icons'
import type { Contact } from '@/types'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', animation: 'fadeIn 0.2s ease' }} onClick={onClose}>
      <div className="w-[440px] max-w-full rounded-[14px] p-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '0.6px solid var(--color-border)', boxShadow: 'var(--modal-shadow)', animation: 'scaleIn 0.2s ease' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)', letterSpacing: '0.2px' }}>{editingId ? '编辑联系人' : '新建联系人'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[rgba(0,212,170,0.08)]" style={{ color: 'var(--color-text-muted)', transition: 'color var(--t-fast) ease' }}>
            <X className="w-4 h-4" />
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
              className="w-full h-[40px] px-4 rounded-[8px] outline-none text-[14px]"
              style={{ border: '0.6px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--foreground)', fontFamily: 'var(--font-family-cn)' }}
            />
          ))}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 h-9 rounded-[8px] text-[14px] hover:bg-[var(--muted)]" style={{ border: '0.6px solid var(--color-border)', color: 'var(--foreground-tertiary)' }}>
              取消
            </button>
            <button onClick={saveContact} disabled={saving} className="px-4 h-9 rounded-[8px] text-[14px] font-medium hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: 'var(--tech-cyan)', color: 'var(--color-on-primary)', fontFamily: 'var(--font-display)' }}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
