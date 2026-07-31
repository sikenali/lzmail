'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { ArrowLeft, Send, Paperclip, Bold, Italic, Link, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Account } from '@/types'

export default function ComposePage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState(0)
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.accounts.list().then(list => {
      setAccounts(list)
      if (list.length > 0) setAccountId(list[0].id)
    }).catch(() => {})
  }, [])

  const handleSend = async () => {
    if (!to) { toast.error('请输入收件人'); return }
    if (!accountId) { toast.error('请选择发件账号'); return }
    setSending(true)
    try {
      await api.compose({
        account_id: accountId,
        to,
        cc,
        subject,
        body_text: body,
        body_html: '',
      })
      toast.success('邮件已发送')
      router.push('/')
    } catch (err: any) {
      toast.error(err?.message || '发送失败')
    }
    setSending(false)
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full max-w-[860px] mx-auto bg-[var(--card)] border-x" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-5 h-14 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-lg"><ArrowLeft className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
            <span className="text-sm font-semibold">新邮件</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-lg"><Paperclip className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-lg"><Trash2 className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
            <div className="w-px h-5 bg-[var(--border)] mx-1" />
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? '发送中...' : '发送'}
            </button>
          </div>
        </div>

        <div className="px-5 py-3 space-y-0">
          <div className="flex items-center gap-3 border-b py-2.5">
            <span className="text-sm text-[var(--foreground-tertiary)] w-12 shrink-0">发件</span>
            <select
              value={accountId}
              onChange={e => setAccountId(Number(e.target.value))}
              className="flex-1 outline-none text-sm bg-transparent"
            >
              {accounts.length === 0 && <option value={0}>暂无账号</option>}
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} &lt;{a.email}&gt;</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 border-b py-2.5">
            <span className="text-sm text-[var(--foreground-tertiary)] w-12 shrink-0">收件人</span>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="输入邮箱地址..." className="flex-1 outline-none text-sm bg-transparent placeholder:text-[var(--muted-foreground)]" />
            <button onClick={() => setShowCc(!showCc)} className="text-xs text-[var(--primary)] hover:underline shrink-0">抄送</button>
          </div>
          {showCc && (
            <div className="flex items-center gap-3 border-b py-2.5">
              <span className="text-sm text-[var(--foreground-tertiary)] w-12 shrink-0">抄送</span>
              <input value={cc} onChange={e => setCc(e.target.value)} placeholder="抄送给..." className="flex-1 outline-none text-sm bg-transparent placeholder:text-[var(--muted-foreground)]" />
            </div>
          )}
          <div className="border-b py-2.5">
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="主题" className="w-full outline-none text-sm bg-transparent placeholder:text-[var(--muted-foreground)]" />
          </div>
        </div>

        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="写邮件..." className="flex-1 px-5 py-3 outline-none text-sm bg-transparent resize-none placeholder:text-[var(--muted-foreground)]" />

        <div className="flex items-center justify-between px-5 py-3 border-t">
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded"><Bold className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded"><Italic className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded"><Link className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded"><Paperclip className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span>Shift + Enter 换行</span>
            <span>·</span>
            <span>Ctrl + Enter 发送</span>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
