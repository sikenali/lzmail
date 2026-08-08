'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { EmailDetail } from '@/types'
import { ArrowLeft, Archive, Trash2, Star, ChevronUp, ChevronDown, MoreHorizontal, Reply, Forward, Paperclip, Send, Clock, Bold, Italic, Link, Eye } from '@/lib/icons'
import { toast } from 'sonner'
import { getAccountAvatarBg } from '@/lib/icons'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function shiftColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`
}

function getAvatarBg(email: EmailDetail['email']): string {
  const brand = (email as any).account_brand
  if (brand) return brand
  return 'var(--primary)'
}

function getAvatarText(email: EmailDetail['email']): string {
  const name = (email.from_name || email.from).trim()
  if (!name) return '?'
  const parts = name.replace(/@.*$/, '').replace(/[._-]/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0]?.[0]?.toUpperCase() || '?'
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return '?'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[Math.min(i, 3)]
}

function getFileIcon(mime: string): string {
  if (!mime) return '📄'
  const m = mime.toLowerCase()
  if (m.includes('pdf')) return '📕'
  if (m.includes('image')) return '🖼️'
  if (m.includes('zip') || m.includes('rar') || m.includes('tar')) return '📦'
  if (m.includes('word') || m.includes('document')) return '📘'
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv')) return '📗'
  if (m.includes('powerpoint') || m.includes('presentation')) return '📙'
  if (m.includes('video')) return '🎬'
  if (m.includes('audio')) return '🎵'
  if (m.includes('text')) return '📄'
  return '📎'
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

  const handleArchive = async () => {
    if (!detail) return
    await api.mails.move(detail.email.id, 'Archive').catch(() => {})
    router.push('/mail')
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
    if (!detail) return
    replyBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => replyBoxRef.current?.querySelector('textarea')?.focus(), 300)
  }

  const forward = () => {
    if (!detail) return
    const body = detail.body_html || detail.email.body_preview || ''
    router.push(`/compose?account_id=${detail.email.account_id}&subject=${encodeURIComponent('Fwd: ' + (detail.email.subject || ''))}&body=${encodeURIComponent(body)}`)
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
  const senderName = email.from_name || email.from
  const avatarBg = getAvatarBg(email)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 h-14 border-b shrink-0" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-1">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><ArrowLeft className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} /></button>
          <button onClick={handleDelete} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--danger-bg)] rounded-[8px]"><Trash2 className="w-4 h-4" style={{ color: 'var(--danger)' }} /></button>
          <button onClick={handleStar} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]">
            <Star className={`w-4 h-4 ${email.is_starred ? 'fill-yellow-400 text-yellow-400' : ''}`} style={{ color: email.is_starred ? undefined : 'var(--foreground-tertiary)' }} />
          </button>
          <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--card-border)' }} />
           <button onClick={handleArchive} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]" title="归档"><Archive className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} /></button>
           <button onClick={() => { replyBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); replyBoxRef.current?.querySelector('textarea')?.focus() }} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]" title="回复"><Reply className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} /></button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><ChevronUp className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} /></button>
          <button onClick={() => router.push('/mail')} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]"><ChevronDown className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-[920px] mx-auto px-8 py-6 space-y-6">
          {/* Subject */}
          <div>
            {email.is_starred && (
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1" style={{ backgroundColor: 'var(--gold-bg)', color: 'var(--gold)' }}>
                  <Star className="w-3 h-3 fill-yellow-400" /> 已标星
                </span>
              </div>
            )}
            <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>{email.subject || '(无主题)'}</h1>
          </div>

          {/* Sender info */}
          <div className="flex items-start gap-3 pb-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: avatarBg }}
            >
              {getAvatarText(email)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>{senderName}</span>
                    <span className="text-[12px] shrink-0" style={{ color: 'var(--foreground-tertiary)' }}>{`<${email.from}>`}</span>
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>
                    收件人: {email.to}
                  </div>
                  <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                    <Clock className="w-3 h-3 shrink-0" />
                    {formatDate(email.date)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={focusReply} className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium transition-colors hover:opacity-90" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                    <Reply className="w-3.5 h-3.5" /> 回复
                  </button>
                  <button onClick={forward} className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium transition-colors hover:opacity-90 border" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground-secondary)', backgroundColor: 'var(--card)' }}>
                    <Forward className="w-3.5 h-3.5" style={{ color: 'var(--foreground-tertiary)' }} /> 转发
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />
                <span className="text-[13px] font-medium" style={{ color: 'var(--foreground)' }}>{attachments.length} 个附件</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att) => (
                  <a key={att.id} href={api.mails.attachmentUrl(email.id, att.id)}
                    download={att.filename}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors hover:bg-[var(--accent)] group"
                    style={{ borderColor: 'var(--card-border)' }}
                  >
                    <span className="text-[20px] shrink-0">{getFileIcon(att.mime_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate" style={{ color: 'var(--foreground)' }}>{att.filename}</div>
                      <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{formatSize(att.size)}</div>
                    </div>
                    <Eye className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--primary)' }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          {body_html ? (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
              <iframe
                srcDoc={body_html}
                className="w-full border-0"
                style={{ minHeight: '400px', backgroundColor: '#fff' }}
                title="邮件正文"
                sandbox="allow-scripts"
              />
            </div>
          ) : (
            <div className="rounded-xl p-4 text-sm leading-7" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--foreground-secondary)' }}>
              <p>{email.body_preview || '(无正文内容)'}</p>
            </div>
          )}

          {/* Reply box */}
          <div id="reply-area" ref={replyBoxRef} className="rounded-xl border" style={{ borderColor: 'var(--card-border)' }}>
            <div className="px-4 py-3 border-b text-sm font-medium" style={{ borderColor: 'var(--card-border)', color: 'var(--foreground-tertiary)' }}>快捷回复</div>
            <div className="p-4">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="输入回复内容..."
                rows={4}
                className="w-full outline-none text-sm bg-transparent resize-none"
                style={{ color: 'var(--foreground)' }}
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
                <div className="flex items-center gap-1">
                  {[Bold, Italic, Link, Paperclip].map((Icon, i) => (
                    <button key={i} className="w-8 h-8 flex items-center justify-center hover:bg-[var(--accent)] rounded-[8px]">
                      <Icon className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />
                    </button>
                  ))}
                </div>
                <button onClick={handleReply} disabled={!replyText.trim()}
                  className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  <Send className="w-4 h-4" /> 发送
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
