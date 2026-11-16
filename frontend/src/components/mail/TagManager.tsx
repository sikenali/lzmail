'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Email, Tag } from '@/types'
import { Tag as TagIcon, Plus, X } from '@/lib/icons'

export function TagManager({ email, onClose }: { email: Email; onClose: () => void }) {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [emailTags, setEmailTags] = useState<Tag[]>([])
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.tags.list(email.account_id).then(t => setAllTags(t || [])).catch(() => {})
    api.tags.getEmailTags(email.id).then(t => setEmailTags(t || [])).catch(() => {})
  }, [email.id, email.account_id])

  const apply = async (tagIds: number[]) => {
    setBusy(true)
    try {
      const res = await api.tags.setEmailTags(email.id, tagIds)
      setEmailTags(res || [])
    } catch {
      toast.error('保存标签失败')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (tag: Tag) => {
    const cur = emailTags.map(t => t.id)
    if (cur.includes(tag.id)) apply(cur.filter(id => id !== tag.id))
    else apply([...cur, tag.id])
  }

  const removeEmailTag = (id: number) => {
    apply(emailTags.map(t => t.id).filter(x => x !== id))
  }

  const create = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    try {
      const t = await api.tags.create({ name, account_id: email.account_id })
      setAllTags(prev => (prev.some(x => x.id === t.id) ? prev : [...prev, t]))
      await apply([...emailTags.map(x => x.id), t.id])
      setNewName('')
    } catch {
      toast.error('创建标签失败')
    } finally {
      setBusy(false)
    }
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 24,
    padding: '0 8px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 500,
    border: `0.7px solid ${active ? 'var(--primary)' : 'var(--card-border)'}`,
    backgroundColor: active ? 'var(--primary-light)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--foreground-secondary)',
    cursor: 'pointer',
  })

  return (
    <div className="w-[240px] p-3 rounded-[12px]" style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', boxShadow: '0 8px 28px rgba(0,0,0,0.14)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: 'var(--foreground)' }}>
          <TagIcon className="w-4 h-4" style={{ color: 'var(--primary)' }} /> 标签
        </span>
        <button onClick={onClose} aria-label="关闭" className="w-6 h-6 flex items-center justify-center rounded transition-colors" style={{ color: 'var(--foreground-tertiary)' }}><X className="w-4 h-4" /></button>
      </div>

      {emailTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {emailTags.map(t => (
            <span key={t.id} style={chipStyle(true)}>
              {t.name}
              <button onClick={() => removeEmailTag(t.id)} aria-label={`移除 ${t.name}`} className="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-[rgba(0,0,0,0.08)]"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {allTags.map(t => {
            const active = emailTags.some(x => x.id === t.id)
            return <button key={t.id} onClick={() => toggle(t)} disabled={busy} style={chipStyle(active)}>{t.name}</button>
          })}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create() } }}
          placeholder="新标签名称"
          className="flex-1 min-w-0 h-8 px-2.5 rounded-[8px] outline-none text-[12px]"
          style={{ backgroundColor: 'var(--background)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
        />
        <button onClick={create} disabled={busy || !newName.trim()} aria-label="创建标签"
          className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <p className="mt-2 text-[11px]" style={{ color: 'var(--foreground-tertiary)' }}>点击标签为本封邮件添加/移除，回车创建并应用。</p>
    </div>
  )
}
