'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { ArrowLeft, Send, Paperclip, Trash2, Plus, Bold, Italic, Link, Clock } from 'lucide-react'
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

  useEffect(() => {
    api.accounts.list().then(list => {
      setAccounts(list)
      if (list.length > 0) setAccountId(list[0].id)
    }).catch(() => {})
  }, [])

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

  const handleSend = async () => {
    if (!to) { toast.error('请输入收件人'); return }
    if (!accountId) { toast.error('请选择发件账号'); return }
    setSending(true)
    try {
      await api.compose({
        account_id: accountId,
        to,
        cc: '',
        subject,
        body_text: body,
        body_html: '',
      })
      toast.success('邮件已发送')
      setTo(''); setSubject(''); setBody('')
      router.push('/')
    } catch (err: any) {
      toast.error(err?.message || '发送失败')
    }
    setSending(false)
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full" style={{ backgroundColor: '#fbf7f0' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b shrink-0 bg-white" style={{ borderColor: '#f3ede3' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#f5f0e8]">
              <ArrowLeft className="w-4 h-4" style={{ color: '#6b5b4f' }} />
            </button>
            <span className="text-sm font-semibold" style={{ color: '#3d2b1f' }}>新邮件</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-medium hover:bg-[#f5f0e8]" style={{ color: '#6b5b4f' }}>
              <Clock className="w-4 h-4" /> 定时发送
            </button>
            <button onClick={handleSaveDraft} disabled={savingDraft} className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-medium hover:bg-[#f5f0e8] disabled:opacity-50" style={{ color: '#6b5b4f' }}>
              <Paperclip className="w-4 h-4" /> {savingDraft ? '保存中...' : '存草稿'}
            </button>
            <button onClick={handleSend} disabled={sending}
              className="flex items-center gap-2 px-4 h-9 bg-[#c43d3d] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {sending ? '发送中...' : '发送'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-[860px] mx-auto bg-white rounded-xl mx-6 my-4 p-6 shadow-sm" style={{ border: '1px solid #f3ede3' }}>
            <div className="space-y-0">
              {/* From */}
              <div className="flex items-center gap-4 py-3 border-b" style={{ borderColor: '#f5f0e8' }}>
                <span className="text-sm w-12 shrink-0" style={{ color: '#8b7355' }}>发件</span>
                <select
                  value={accountId}
                  onChange={e => setAccountId(Number(e.target.value))}
                  className="flex-1 outline-none text-sm bg-transparent"
                  style={{ color: '#3d2b1f' }}
                >
                  {accounts.length === 0 && <option value={0}>暂无账号</option>}
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} &lt;{a.email}&gt;</option>)}
                </select>
              </div>
              {/* To */}
              <div className="flex items-center gap-4 py-3 border-b" style={{ borderColor: '#f5f0e8' }}>
                <span className="text-sm w-12 shrink-0" style={{ color: '#8b7355' }}>收件人</span>
                <input value={to} onChange={e => setTo(e.target.value)} placeholder="输入邮箱地址..."
                  className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#b8a88a]"
                  style={{ color: '#3d2b1f' }}
                />
              </div>
              {/* Subject */}
              <div className="flex items-center gap-4 py-3 border-b" style={{ borderColor: '#f5f0e8' }}>
                <span className="text-sm w-12 shrink-0" style={{ color: '#8b7355' }}>主题</span>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="主题"
                  className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#b8a88a]"
                  style={{ color: '#3d2b1f' }}
                />
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 py-3 border-b" style={{ borderColor: '#f5f0e8' }}>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#f5f0e8]">
                <Bold className="w-4 h-4" style={{ color: '#6b5b4f' }} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#f5f0e8]">
                <Italic className="w-4 h-4" style={{ color: '#6b5b4f' }} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#f5f0e8]">
                <Link className="w-4 h-4" style={{ color: '#6b5b4f' }} />
              </button>
              <div className="w-px h-5 bg-[#f3ede3] mx-1" />
              <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#f5f0e8]">
                <Paperclip className="w-4 h-4" style={{ color: '#6b5b4f' }} />
              </button>
            </div>

            {/* Body */}
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="写邮件..."
              className="w-full h-64 outline-none text-sm bg-transparent resize-none placeholder:text-[#b8a88a]"
              style={{ color: '#3d2b1f' }}
            />

            {/* Bottom bar */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-xs" style={{ color: '#b8a88a' }}>
                <span>Shift + Enter 换行</span>
                <span>·</span>
                <span>Ctrl + Enter 发送</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-medium hover:bg-[#f5f0e8]" style={{ color: '#6b5b4f' }}>
                  <Paperclip className="w-4 h-4" /> 添加附件
                </button>
                <button className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-medium hover:bg-[#f5f0e8]" style={{ color: '#6b5b4f' }}>
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
