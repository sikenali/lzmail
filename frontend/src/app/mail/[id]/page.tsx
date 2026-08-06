'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { EmailDetail } from '@/types'
import { ArrowLeft, Archive, Trash2, Star, ChevronUp, ChevronDown, MoreHorizontal, Reply, Forward, Paperclip, Send, Clock, Bold, Italic, Link, MailQuestion } from '@/lib/icons'
import { toast } from 'sonner'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function shiftColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`
}

export default function MailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<EmailDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const replyBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const numId = parseInt(id)
    api.mails.get(numId).then(d => {
      setDetail(d)
      api.mails.markRead(numId).catch(() => {})
    }).catch(() => setDetail(null)).finally(() => setLoading(false))
  }, [id])

  const handleStar = async () => {
    if (!detail) return
    const starred = !detail.email.is_starred
    await api.mails.markStar(detail.email.id, starred).catch(() => {})
    setDetail({ ...detail, email: { ...detail.email, is_starred: starred } })
  }

  const handleDelete = async () => {
    if (!detail) return
    await api.mails.delete(detail.email.id).catch(() => {})
    router.push('/mail')
  }
  const handleReply = async () => {
    if (!detail || !replyText.trim()) return
    try {
      await api.compose({
        account_id: detail.email.account_id,
        to: detail.email.from,
        cc: '',
        bcc: '',
        subject: 'Re: ' + (detail.email.subject || ''),
        body_text: replyText,
        body_html: '',
      })
      setReplyText('')
      toast.success('回复已发送')
    } catch (e: any) {
      toast.error(e.message || '发送失败')
    }
  }

  const focusReply = () => {
    if (detail && !detail.email.from) return
    replyBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const forward = () => {
    if (!detail) return
    router.push(`/compose?subject=${encodeURIComponent('Fwd: ' + (detail.email.subject || ''))}&body=${encodeURIComponent(replyText || '')}`)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">加载中...</div>
    )
  }

  if (!detail) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">邮件不存在</div>
    )
  }

  const { email, attachments, body_html } = detail
  const date = new Date(email.date)

  return (
    <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-6 h-14 border-b shrink-0" style={{ borderColor: 'rgba(229,217,196,1)' }}>
        <div className="flex items-center gap-1">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><ArrowLeft className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
          <button onClick={handleDelete} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><Trash2 className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
          <button onClick={handleStar} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]">
            <Star className={`w-4 h-4 ${email.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--foreground-tertiary)]'}`} />
          </button>
          <div className="w-px h-5 bg-[rgba(229,217,196,1)] mx-1" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><ChevronUp className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
          <button onClick={() => router.push('/mail')} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><ChevronDown className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
          <button onClick={() => { const el = document.getElementById('reply-area'); el?.scrollIntoView({ behavior: 'smooth' }) }} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><MoreHorizontal className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-[920px] mx-auto px-8 py-6 space-y-6">
          <div>
            {email.is_starred && (
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-600 text-xs font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400" /> 已标星
                </span>
              </div>
            )}
            <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">{email.subject || '(无主题)'}</h1>
          </div>

          <div className="flex items-start gap-3 pb-6 border-b" style={{ borderColor: 'rgba(229,217,196,1)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
              style={{ background: (email as any).account_brand
                ? `linear-gradient(135deg, ${(email as any).account_brand}, ${shiftColor((email as any).account_brand)})`
                : 'linear-gradient(135deg, var(--primary), #a83232)' }}
            >
              {email.from[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-[var(--foreground)]">{email.from}</span>
                  <span className="text-sm text-[var(--muted-foreground)] ml-2">&lt;{email.from}&gt;</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={focusReply} className="flex items-center gap-2 px-3 h-8 border rounded-[8px] text-sm text-[var(--foreground-tertiary)] hover:bg-[var(--accent)]" style={{ borderColor: 'rgba(229,217,196,1)' }}><Reply className="w-3.5 h-3.5" /> 回复</button>
                  <button onClick={forward} className="flex items-center gap-2 px-3 h-8 border rounded-[8px] text-sm text-[var(--foreground-tertiary)] hover:bg-[var(--accent)]" style={{ borderColor: 'rgba(229,217,196,1)' }}><Forward className="w-3.5 h-3.5" /> 转发</button>
                </div>
              </div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                收件人: {email.to} · {formatDate(email.date)}
              </div>
            </div>
          </div>

          {attachments && attachments.length > 0 && (
            <div className="border rounded-xl p-4" style={{ borderColor: 'rgba(229,217,196,1)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4 text-[var(--foreground-tertiary)]" />
                <span className="text-sm font-medium">{attachments.length} 个附件</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <a key={att.id} href={api.mails.attachmentUrl(email.id, att.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-[8px] border text-sm hover:bg-[var(--accent)]"
                    style={{ borderColor: 'rgba(229,217,196,1)' }}
                  >
                    <Paperclip className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                    <span className="text-[var(--foreground-secondary)]">{att.filename}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">({att.size > 0 ? (att.size / 1024).toFixed(1) + ' KB' : '?'})</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {body_html ? (
            <iframe
              srcDoc={body_html}
              className="w-full border-0"
              style={{ minHeight: '400px' }}
              title="邮件正文"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="text-sm text-[var(--foreground-secondary)] leading-7">
              <p>{email.body_preview || '(无正文内容)'}</p>
            </div>
          )}

          <div ref={replyBoxRef} className="border rounded-xl" style={{ borderColor: 'rgba(229,217,196,1)' }}>
            <div className="px-4 py-3 border-b text-sm text-[var(--foreground-tertiary)]" style={{ borderColor: 'rgba(229,217,196,1)' }}>快捷回复</div>
            <div className="p-4">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="输入回复内容..."
                rows={4}
                className="w-full outline-none text-sm bg-transparent resize-none placeholder:text-[var(--muted-foreground)]"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><Bold className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><Italic className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><Link className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><Paperclip className="w-4 h-4 text-[var(--foreground-tertiary)]" /></button>
                </div>
                <button onClick={handleReply} className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  <Send className="w-4 h-4" style={{ color: '#ffffff' }} /> 发送
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
