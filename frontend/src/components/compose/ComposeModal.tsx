'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { Modal } from '@/components/layout/Modal'
import { Paperclip, Send, X, ChevronDown, Clock, Mail, Check } from '@/lib/icons'
const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor').then(m => m.RichTextEditor), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>编辑器加载中...</div>,
})
import { DateTimePicker } from '@/components/DateTimePicker'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/useSettings'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Account, ComposePayload } from '@/types'
import ContactPicker from '@/components/compose/ContactPicker'
import { DeleteConfirm } from '@/components/DeleteConfirm'

export interface ComposeParams {
  to?: string
  cc?: string
  bcc?: string
  subject?: string
  accountId?: number
  body?: string
  draftId?: number
  replyTo?: string
}

export function ComposeModal({ open, onClose, params }: { open: boolean; onClose: () => void; params?: ComposeParams }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const isMobile = useIsMobile()
  const [accountId, setAccountId] = useState(0)
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const editorRef = useRef<any>(null)
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ name: string; size: number; file?: File }>>([])
  const [scheduleAt, setScheduleAt] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [showSenderPicker, setShowSenderPicker] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draftId, setDraftId] = useState<number | null>(null)
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false)
  const { settings } = useSettings()
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)

  useEffect(() => {
    api.accounts.list().then(list => {
      const accounts = list || []
      setAccounts(accounts)
      if (accounts.length > 0) setAccountId(params?.accountId ?? accounts[0].id)
    }).catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open) return
    if (params?.to) setTo(params.to)
    if (params?.cc) setCc(params.cc)
    if (params?.bcc) setBcc(params.bcc)
    if (params?.subject) setSubject(params.subject)
    if (params?.body) { setBody(params.body); setTimeout(() => editorRef.current?.setContent?.(params.body!), 100) }
    if (params?.replyTo) setReplyTo(params.replyTo)
    if (params?.draftId) setDraftId(params.draftId)
  }, [open, params])

  useEffect(() => {
    if (accountId === 0 && accounts.length > 0) setAccountId(accounts[0].id)
  }, [accounts])

  useEffect(() => {
    if (!draftId) return
    api.mails.getDraft(draftId).then(d => {
      if (!d) return
      setTo(d.to || '')
      setCc(d.cc || '')
      setBcc(d.bcc || '')
      setSubject(d.subject || '')
      if (d.body_html) { setBody(d.body_html); setTimeout(() => editorRef.current?.setContent?.(d.body_html), 100) }
      if (d.account_id) setAccountId(d.account_id)
    }).catch((e: any) => toast.error(e?.message || '读取草稿失败'))
  }, [draftId])

  // 更新已有草稿（PATCH）；失败抛出供调用方提示
  const patchExistingDraft = async () => {
    if (!draftId) return
    const res = await fetch(`/api/v1/compose/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId, to, cc, bcc, subject,
        body_text: editorRef.current?.getText() || body,
        body_html: editorRef.current?.getHTML() || body,
        attachments: [],
      })
    })
    if (!res.ok) {
      let msg = ''
      try { msg = JSON.parse(await res.text()).error || '' } catch {}
      throw new Error(msg || `草稿更新失败（HTTP ${res.status}）`)
    }
    const data = await res.json()
    if (data.id) setDraftId(data.id)
  }

  useEffect(() => {
    if (!open || sending || savingDraft) return
    const hasContent = to || cc || subject || body
    if (!hasContent) return
    const timer = setInterval(() => {
      if (sending || savingDraft) return
      const data = { account_id: accountId, to, cc, bcc, subject, body_text: editorRef.current?.getText() || '', body_html: editorRef.current?.getHTML() || body, draft: true }
      setAutoSaving(true)
      // 已有草稿 → 更新同一行，避免每 60s 生成重复草稿；新建草稿记下 id 供后续自动保存复用
      const p = draftId
        ? patchExistingDraft()
        : api.compose(data).then(res => { const id = (res as unknown as { id?: number })?.id; if (id) setDraftId(id) })
      p.then(() => setLastAutoSaveTime(new Date())).catch(() => {}).finally(() => setAutoSaving(false))
    }, 60000)
    return () => clearInterval(timer)
  }, [to, cc, bcc, subject, body, accountId, sending, savingDraft, open, draftId])

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

  const handleSend = () => {
    if (!to) { toast.warning('请输入收件人'); return }
    if (!accountId) { toast.warning('请选择发件账号'); return }
    if (!subject) { toast.warning('请输入邮件主题'); return }
    if ((settings.send_confirm || 'false') === 'true') {
      setSendConfirmOpen(true)
      return
    }
    doSend()
  }

  const doSend = async () => {
    setSending(true)
    toast.info('正在发送...')
    try {
      const uploadedAttachments = []
      for (const att of attachments) {
        if (att.file) {
          const uploaded = await api.uploadAttachment(att.file)
          uploadedAttachments.push({ filename: uploaded.filename, path: uploaded.path })
        }
      }
      const data: ComposePayload = {
        account_id: accountId, to, cc, bcc, subject,
        body_text: editorRef.current?.getText() || body,
        body_html: editorRef.current?.getHTML() || body,
        attachments: uploadedAttachments,
      }
      if (replyTo) { data.reply_to = replyTo; data.references = replyTo }
      if (scheduleAt) {
        const tzOff = new Date().getTimezoneOffset()
        const sign = tzOff <= 0 ? '+' : '-'
        const abs = Math.abs(tzOff)
        const tz = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
        data.schedule_at = `${scheduleAt}:00${tz}`
      }
      await api.compose(data)
      toast.success('邮件已发送')
      const recipients = [...(to ? to.split(',') : []), ...(cc ? cc.split(',') : []), ...(bcc ? bcc.split(',') : [])]
        .map(e => e.trim()).filter(e => e.includes('@'))
      if (recipients.length > 0) {
        try {
          await Promise.all(recipients.map(email =>
            api.contacts.create({ name: email.split('@')[0], email, account_id: accountId })
          ))
        } catch {}
      }
      setTo(''); setCc(''); setBcc(''); setSubject(''); setBody(''); setAttachments([]); setScheduleAt('')
      // 从草稿发出：删除草稿行，避免草稿箱残留（已发送邮件保留在 Sent）
      if (draftId) {
        const did = Number(draftId)
        api.mails.delete(did).catch(() => {})
        setDraftId(null)
      }
      onClose()
    } catch (err: any) {
      toast.error(err?.message || '发送失败')
    } finally {
      setSending(false)
    }
  }

  const handleSaveDraft = async () => {
    if (sending || savingDraft) return
    setSavingDraft(true)
    try {
      if (draftId) {
        await patchExistingDraft()
        toast.success('草稿已更新')
      } else {
        const res = await api.compose({
          account_id: accountId, to, cc, bcc, subject,
          body_text: editorRef.current?.getText() || body,
          body_html: editorRef.current?.getHTML() || body,
          draft: true,
        })
        const newDraftId = (res as unknown as { id?: number })?.id
        toast.success('草稿已保存')
        if (newDraftId) setDraftId(newDraftId)
      }
    } catch (err: any) {
      toast.error(err?.message || '保存失败')
    }
    setSavingDraft(false)
  }

  const handleAttach = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(f => {
      if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} 超过50MB限制`); return }
      setAttachments(prev => [...prev, { name: f.name, size: f.size, file: f }])
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleAttach(e.target.files)
    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleAttach(e.dataTransfer.files)
  }

  const selectedAccount = accounts.find(a => a.id === accountId)

  if (!open) return null

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        icon={<i className="ri-quill-pen-line" style={{ fontSize: 26, color: 'var(--color-primary)' }}></i>}
        title={draftId ? '编辑草稿' : '写邮件'}
        subtitle={draftId ? '修改草稿内容' : '新建邮件消息'}
        width={900}
        height="90vh"
        maxHeight={800}
      >
        {/* Form body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 14px' : '16px 24px' }}>
          {/* Sender */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12 }}>
            <span style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-cn)' }}>发件人</span>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: 38, borderRadius: 8, padding: '0 14px', backgroundColor: 'var(--color-bg-secondary)', border: '0.7px solid var(--color-border)', cursor: 'pointer', transition: 'border-color var(--transition-base)' }}
                onClick={() => setShowSenderPicker(v => !v)}
              >
                <span style={{ width: 24, height: 24, borderRadius: 9999, backgroundColor: selectedAccount?.brand_color || 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {(selectedAccount?.name || 'G')[0].toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, textAlign: 'left', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-family-cn)' }}>
                  {selectedAccount?.email || '选择账号'}
                </span>
                {accounts.length > 1 && (
                  <ChevronDown style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--color-text-muted)', transform: showSenderPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                )}
              </button>
              {showSenderPicker && accounts.length > 1 && (
                <div style={{ position: 'absolute', zIndex: 9999, top: '100%', left: 0, marginTop: 4, borderRadius: 12, overflow: 'hidden', backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 240 }}>
                  {accounts.map(account => (
                    <div key={account.id}
                      className="hover-row"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background-color var(--transition-base)' }}
                      onClick={() => { setAccountId(account.id); setShowSenderPicker(false) }}>
                      <span style={{ width: 24, height: 24, borderRadius: 9999, backgroundColor: account.brand_color || 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {(account.name || 'G')[0].toUpperCase()}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-family-cn)' }}>{account.email}</span>
                      {account.id === accountId && <Check style={{ width: 14, height: 14, color: 'var(--color-primary)' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
            <span style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-cn)' }}>收件人</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ContactPicker value={to} onSelect={emails => setTo(emails.join(', '))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {!showCc && <button onClick={() => setShowCc(true)} style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-info)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-cn)' }}>抄送</button>}
              {!showBcc && <button onClick={() => setShowBcc(true)} style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-info)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-cn)' }}>密送</button>}
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
              <span style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-cn)' }}>抄送</span>
              <div style={{ display: 'flex', alignItems: 'center', height: 38, borderRadius: 8, flex: 1, padding: '0 14px', backgroundColor: 'var(--color-bg-secondary)', border: '0.7px solid var(--color-border)' }}>
                <input value={cc} onChange={e => setCc(e.target.value)} placeholder="输入邮箱地址..."
                  style={{ flex: 1, minWidth: 0, outline: 'none', fontSize: 13, backgroundColor: 'transparent', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }} />
                <button onClick={() => setShowCc(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} /></button>
              </div>
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
              <span style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-cn)' }}>密送</span>
              <div style={{ display: 'flex', alignItems: 'center', height: 38, borderRadius: 8, flex: 1, padding: '0 14px', backgroundColor: 'var(--color-bg-secondary)', border: '0.7px solid var(--color-border)' }}>
                <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="输入邮箱地址..."
                  style={{ flex: 1, minWidth: 0, outline: 'none', fontSize: 13, backgroundColor: 'transparent', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }} />
                <button onClick={() => setShowBcc(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} /></button>
              </div>
            </div>
          )}

          {/* Subject */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
            <span style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-cn)' }}>主题</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 38, borderRadius: 8, flex: 1, padding: '0 14px', backgroundColor: 'var(--color-bg-secondary)', border: '0.7px solid var(--color-border)' }}>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="输入邮件主题..."
                style={{ flex: 1, minWidth: 0, outline: 'none', fontSize: 13, backgroundColor: 'transparent', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }} />
            </div>
          </div>

          {/* Body */}
          <RichTextEditor
            ref={editorRef}
            value={body}
            onChange={setBody}
            placeholder="开始撰写邮件正文..."
            className="h-[300px]"
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12 }}>
              {attachments.map((att, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '0.7px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', fontSize: 12 }}>
                  <Paperclip style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
                  <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }}>{att.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>({(att.size / 1024).toFixed(0)}KB)</span>
                  <button onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? undefined : 'space-between', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 8 : 0, padding: isMobile ? '10px 12px' : '12px 24px', paddingBottom: isMobile ? 'calc(10px + env(safe-area-inset-bottom))' : 12, flexShrink: 0, borderTop: '1px solid var(--color-border-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexBasis: isMobile ? '100%' : undefined }}>
            <input ref={fileInputRef} type="file" multiple accept="*/*" onChange={handleFileChange} className="hidden" />
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, cursor: 'pointer', transition: 'all var(--transition-base)', backgroundColor: dragOver ? 'rgba(231,76,60,0.1)' : 'var(--color-bg-secondary)', border: dragOver ? '1.5px dashed var(--color-primary)' : 'none', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-family-cn)' }}>
              <Paperclip style={{ width: 16, height: 16, flexShrink: 0 }} /> 添加附件
            </label>
            {!isMobile && <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>最大 50MB，支持拖拽上传</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexBasis: isMobile ? '100%' : undefined }}>
            <button onClick={() => setScheduleAt(scheduleAt ? '' : new Date().toISOString().slice(0, 10) + 'T' + new Date().toTimeString().slice(0, 5))}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, transition: 'all var(--transition-base)', backgroundColor: scheduleAt ? 'rgba(231,76,60,0.1)' : 'var(--color-bg-secondary)', color: scheduleAt ? 'var(--color-error)' : 'var(--color-text-secondary)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-family-cn)' }}>
              <Clock style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 500 }}>{scheduleAt ? '取消定时' : '定时发送'}</span>
              <ChevronDown style={{ width: 12, height: 12, flexShrink: 0, color: 'var(--color-text-muted)' }} />
            </button>
            {lastAutoSaveTime && !isMobile && (
              <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: autoSaving ? 'var(--color-warning)' : 'var(--color-success)', display: 'inline-block' }} />
                自动保存 {lastAutoSaveTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={handleSaveDraft} disabled={savingDraft}
              style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : undefined, gap: 6, height: 36, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '0.7px solid var(--color-border)', opacity: savingDraft ? 0.5 : 1, whiteSpace: 'nowrap', flex: isMobile ? '1 1 auto' : undefined, fontFamily: 'var(--font-family-cn)' }}>
              <Paperclip style={{ width: 16, height: 16, flexShrink: 0 }} /> {savingDraft ? '保存中...' : '存草稿'}
            </button>
            <button onClick={handleSend} disabled={sending}
              style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : undefined, gap: 6, height: 36, padding: '0 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', opacity: sending ? 0.5 : 1, whiteSpace: 'nowrap', flex: isMobile ? '1 1 auto' : undefined, fontFamily: 'var(--font-family-cn)' }}>
              <Send style={{ width: 16, height: 16, flexShrink: 0 }} /> {sending ? '发送中...' : '发送'}
            </button>
          </div>
        </div>

        {/* Schedule at */}
        {scheduleAt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: isMobile ? '10px 12px' : '12px 24px', paddingBottom: isMobile ? 'calc(10px + env(safe-area-inset-bottom))' : 12, borderTop: '1px solid var(--color-border-soft)' }}>
            <DateTimePicker value={scheduleAt} onChange={setScheduleAt} />
            <button onClick={() => setScheduleAt('')} style={{ fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-cn)' }}>取消定时</button>
          </div>
        )}
        <DeleteConfirm
          open={sendConfirmOpen}
          title="确认发送"
          message={`确定将邮件发送给「${to}」吗？${scheduleAt ? '（已设置定时发送）' : ''}`}
          confirmText="发送"
          onConfirm={doSend}
          onCancel={() => setSendConfirmOpen(false)}
        />
      </Modal>
    </>
  )
}