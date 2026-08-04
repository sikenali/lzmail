'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { ArrowLeft, Send, Paperclip, Trash2, Plus, Bold, Italic, Link, Clock } from '@/lib/icons'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Account } from '@/types'

export default function ComposePage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState(0)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [attachments, setAttachments] = useState<Array<{name: string, size: number}>>([])
  const [scheduleAt, setScheduleAt] = useState('')

  useEffect(() => {
    api.accounts.list().then(list => {
      const accounts = list || []
      setAccounts(accounts)
      if (accounts.length > 0) setAccountId(accounts[0].id)
    }).catch(() => {})
  }, [])

  const handleSend = async () => {
    if (!to) { toast.error('请输入收件人'); return }
    if (!accountId) { toast.error('请选择发件账号'); return }
    setSending(true)
    try {
      const data: any = {
        account_id: accountId,
        to,
        cc: '',
        subject,
        body_text: body,
        body_html: '',
      }
      if (scheduleAt) data.schedule_at = scheduleAt
      await api.compose(data)
      toast.success('邮件已发送')
      setTo(''); setSubject(''); setBody(''); setAttachments([]); setScheduleAt('')
      router.push('/')
    } catch (err: any) {
      toast.error(err?.message || '发送失败')
    }
    setSending(false)
  }

  const handleSaveDraft = async () => {
    if (sending || savingDraft) return
    setSavingDraft(true)
    try {
      await api.compose({
        account_id: accountId,
        to, cc: '', subject, body_text: body, body_html: '',
      })
      toast.success('草稿已保存')
    } catch (err: any) {
      toast.error(err?.message || '保存失败')
    }
    setSavingDraft(false)
  }

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(f => {
      if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} 超过50MB限制`); return }
      setAttachments(prev => [...prev, { name: f.name, size: f.size }])
    })
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--background)' }}>
        <div className="flex items-center justify-between px-6 h-16 border-b shrink-0" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--accent)]">
              <ArrowLeft className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
            </button>
            <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>新邮件</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-medium hover:bg-[var(--accent)]" style={{ color: 'var(--foreground-secondary)' }}>
              <Clock className="w-4 h-4" /> 定时发送
            </button>
            <button onClick={handleSaveDraft} disabled={savingDraft} className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-medium hover:bg-[var(--accent)] disabled:opacity-50" style={{ color: 'var(--foreground-secondary)' }}>
              <Paperclip className="w-4 h-4" /> {savingDraft ? '保存中...' : '存草稿'}
            </button>
            <button onClick={handleSend} disabled={sending}
              className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {sending ? '发送中...' : '发送'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-[860px] mx-auto bg-[var(--card)] rounded-xl mx-6 my-4 p-6 shadow-sm" style={{ border: '1px solid var(--card-border)' }}>
            <div className="space-y-0">
              <div className="flex items-center gap-4 py-3 border-b" style={{ borderColor: 'var(--muted)' }}>
                <span className="text-sm w-12 shrink-0" style={{ color: 'var(--foreground-tertiary)' }}>发件</span>
                <select value={accountId} onChange={e => setAccountId(Number(e.target.value))}
                  className="flex-1 outline-none text-sm bg-transparent" style={{ color: 'var(--foreground)' }}>
                  {accounts.length === 0 && <option value={0}>暂无账号</option>}
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} &lt;{a.email}&gt;</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4 py-3 border-b" style={{ borderColor: 'var(--muted)' }}>
                <span className="text-sm w-12 shrink-0" style={{ color: 'var(--foreground-tertiary)' }}>收件人</span>
                <input value={to} onChange={e => setTo(e.target.value)} placeholder="输入邮箱地址..."
                  className="flex-1 outline-none text-sm bg-transparent placeholder:text-[var(--muted-foreground)]" style={{ color: 'var(--foreground)' }} />
              </div>
              <div className="flex items-center gap-4 py-3 border-b" style={{ borderColor: 'var(--muted)' }}>
                <span className="text-sm w-12 shrink-0" style={{ color: 'var(--foreground-tertiary)' }}>主题</span>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="主题"
                  className="flex-1 outline-none text-sm bg-transparent placeholder:text-[var(--muted-foreground)]" style={{ color: 'var(--foreground)' }} />
              </div>
            </div>

            <div className="flex items-center gap-1 py-3 border-b" style={{ borderColor: 'var(--muted)' }}>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--accent)]">
                <Bold className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--accent)]">
                <Italic className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--accent)]">
                <Link className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
              </button>
              <div className="w-px h-5 bg-[var(--border)] mx-1" />
              <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--accent)]">
                <Paperclip className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
              </button>
            </div>

            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="写邮件..."
              className="w-full h-64 outline-none text-sm bg-transparent resize-none placeholder:text-[var(--muted-foreground)]" style={{ color: 'var(--foreground)' }} />

            {attachments.length > 0 && (
              <div className="py-3 border-t" style={{ borderColor: 'var(--muted)' }}>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--foreground-tertiary)' }}>附件 ({attachments.length})</div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--accent)' }}>
                      <Paperclip className="w-3 h-3" style={{ color: 'var(--foreground-tertiary)' }} />
                      <span className="max-w-[150px] truncate" style={{ color: 'var(--foreground)' }}>{att.name}</span>
                      <span style={{ color: 'var(--muted-foreground)' }}>({(att.size / 1024).toFixed(0)}KB)</span>
                      <button onClick={() => removeAttachment(i)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--danger-bg)]">
                        <span style={{ color: 'var(--danger)' }}>✕</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <input type="file" multiple accept="*/*" onChange={handleAttach} className="hidden" id="attach-input" />

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span>Shift + Enter 换行</span>
                <span>·</span>
                <span>Ctrl + Enter 发送</span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="attach-input" className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-medium hover:bg-[var(--accent)] cursor-pointer" style={{ color: 'var(--foreground-secondary)' }}>
                  <Paperclip className="w-4 h-4" /> 添加附件
                </label>
                <button className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-medium hover:bg-[var(--accent)]" style={{ color: 'var(--foreground-secondary)' }}>
                  <Trash2 className="w-4 h-4" /> 删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
