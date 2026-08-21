'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { api } from '@/lib/api'
import { Paperclip, Send, X, ChevronDown, Clock } from '@/lib/icons'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { DateTimePicker } from '@/components/DateTimePicker'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { Account, Contact, ComposePayload } from '@/types'
import ContactPicker from '@/components/compose/ContactPicker'

function ComposePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState(0)
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [editorReady, setEditorReady] = useState(false)
  const editorRef = useRef<any>(null)
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ name: string, size: number, file?: File }>>([])
  const [scheduleAt, setScheduleAt] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [showSenderPicker, setShowSenderPicker] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draftId, setDraftId] = useState<number | null>(null)

  useEffect(() => {
    api.accounts.list().then(list => {
      const accounts = list || []
      setAccounts(accounts)
      if (accounts.length > 0) setAccountId(accounts[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const toParam = searchParams?.get('to')
    const ccParam = searchParams?.get('cc')
    const bccParam = searchParams?.get('bcc')
    const subjectParam = searchParams?.get('subject')
    const accountIdParam = searchParams?.get('account_id')
    const bodyParam = searchParams?.get('body')
    const draftIdParam = searchParams?.get('draft_id')
    if (toParam) setTo(toParam)
    if (ccParam) setCc(ccParam)
    if (bccParam) setBcc(bccParam)
    if (subjectParam) setSubject(subjectParam)
    if (accountIdParam) setAccountId(Number(accountIdParam))
    if (bodyParam) { setBody(bodyParam); editorRef.current?.setContent?.(bodyParam) }
    const messageIdParam = searchParams?.get('message_id')
    if (messageIdParam) setReplyTo(messageIdParam)
    if (draftIdParam) setDraftId(Number(draftIdParam))
  }, [searchParams])

  // 账号加载完成后应用URL参数中的account_id(若初始值不在列表中)
  useEffect(() => {
    if (accountId === 0 && accounts.length > 0) {
      setAccountId(accounts[0].id)
    }
  }, [accounts])

  // 编辑草稿时加载草稿内容
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
    }).catch(() => {})
  }, [draftId])

  const handleSend = async () => {
    if (!to) { toast.warning('请输入收件人'); return }
    if (!accountId) { toast.warning('请选择发件账号'); return }
    if (!subject) { toast.warning('请输入邮件主题'); return }
    setSending(true)
    toast.info('正在发送...')
    try {
      // 上传附件（如果有）
      const uploadedAttachments = []
      for (const att of attachments) {
        if (att.file) {
          const uploaded = await api.uploadAttachment(att.file)
          uploadedAttachments.push({ filename: uploaded.filename, path: uploaded.path })
        }
      }
      const data: ComposePayload = {
        account_id: accountId,
        to,
        cc,
        bcc,
        subject,
        body_text: editorRef.current?.getText() || body,
        body_html: editorRef.current?.getHTML() || body,
        attachments: uploadedAttachments,
      }
      if (replyTo) {
        data.reply_to = replyTo
        data.references = replyTo
      }
      if (scheduleAt) {
        const tzOff = new Date().getTimezoneOffset()
        const sign = tzOff <= 0 ? '+' : '-'
        const abs = Math.abs(tzOff)
        const tz = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
        data.schedule_at = `${scheduleAt}:00${tz}`
      }
      await api.compose(data)
      toast.success('邮件已发送')
      // 发送后自动保存收件人/抄送/密送到联系人
      const recipients = [...(to ? to.split(',') : []), ...(cc ? cc.split(',') : []), ...(bcc ? bcc.split(',') : [])]
        .map(e => e.trim())
        .filter(e => e.includes('@'))
      if (recipients.length > 0) {
        try {
          await Promise.all(recipients.map(email =>
            api.contacts.create({ name: email.split('@')[0], email, account_id: accountId })
          ))
        } catch {}
      }
      setTo(''); setCc(''); setBcc(''); setSubject(''); setBody(''); setAttachments([]); setScheduleAt('')
      router.push('/mail')
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
        // 更新现有草稿
        const res = await fetch(`/api/v1/compose/drafts/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_id: accountId,
            to, cc, bcc, subject,
            body_text: editorRef.current?.getText() || body,
            body_html: editorRef.current?.getHTML() || body,
            attachments: [],
          })
        })
        const data = await res.json()
        if (data.id) {
          toast.success('草稿已更新')
          router.replace(`/compose?draft_id=${data.id}`)
        } else {
          toast.success('草稿已更新')
        }
      } else {
        // 新建草稿
        const res = await api.compose({
          account_id: accountId,
          to, cc, bcc, subject,
          body_text: editorRef.current?.getText() || body,
          body_html: editorRef.current?.getHTML() || body,
          draft: true,
        })
        const draftId = (res as any)?.id
        if (draftId) {
          toast.success('草稿已保存')
          router.replace(`/compose?draft_id=${draftId}`)
        } else {
          toast.success('草稿已保存')
          router.push('/mail?folder=Drafts')
        }
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

  return (
    <AppShell>
      <div className="h-full overflow-auto" style={{ backgroundColor: 'var(--background)' }}>
        <div className="px-12 py-8">
          {/* 页面标题区 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-[5px] h-8 rounded-[2px]" style={{ backgroundColor: 'rgba(196,61,61,1)' }} />
              <div>
                <h1 className="text-[28px] font-bold leading-none" style={{ color: 'rgba(61,43,31,1)' }}>
                  {draftId ? '编辑草稿' : '写邮件'}
                </h1>
                <p className="text-[13px] mt-1" style={{ color: 'rgba(139,115,85,1)' }}>
                  {draftId ? '修改草稿内容' : '新建邮件消息'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSaveDraft} disabled={savingDraft}
                className="flex items-center gap-2 h-[47px] px-5 rounded-[12px] text-[14px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)', border: '0.7px solid rgba(229,217,196,1)' }}>
                <Paperclip className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /> {savingDraft ? '保存中...' : '存草稿'}
              </button>
              <button onClick={handleSend} disabled={sending}
                className="flex items-center gap-2 h-[47px] px-6 rounded-[12px] text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                <Send className="w-[18px] h-[18px]" style={{ color: '#ffffff' }} /> {sending ? '发送中...' : '发送'}
              </button>
            </div>
          </div>

          {/* 编辑卡片 */}
          <div className="mt-8 rounded-[16px] px-12 py-8"
            style={{ backgroundColor: 'var(--card)', border: '0.7px solid rgba(229,217,196,1)', boxShadow: '0 2px 12px rgba(139,115,85,0.06)' }}>
            {/* 发件人 */}
            <div className="flex items-center gap-4 pb-4">
              <span className="w-[61px] shrink-0 text-[14px] font-semibold" style={{ color: 'var(--foreground-secondary)' }}>发件人</span>
              <div className="relative flex-1 min-w-0">
                <button
                  className="flex items-center gap-2 w-full h-[41px] rounded-[8px] px-4 transition-all hover:border-[rgba(196,61,61,0.4)]"
                  style={{ backgroundColor: 'var(--background)', border: '0.7px solid rgba(229,217,196,1)' }}
                  onClick={() => setShowSenderPicker(v => !v)}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: selectedAccount?.brand_color || 'var(--gmail)' }}>
                    {(selectedAccount?.name || 'G')[0].toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0 text-[14px] font-medium text-left truncate"
                    style={{ color: 'var(--foreground)' }}>
                    {selectedAccount?.email || '选择账号'}
                  </span>
                  {accounts.length > 1 && (
                    <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-200"
                      style={{ color: 'var(--foreground-tertiary)', transform: showSenderPicker ? 'rotate(180deg)' : 'none' }} />
                  )}
                </button>
                {showSenderPicker && accounts.length > 1 && (
                  <div className="absolute z-50 top-full mt-1 left-0 rounded-[12px] overflow-hidden"
                    style={{ backgroundColor: '#ffffff', border: '0.7px solid rgba(229,217,196,1)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 240 }}>
                    {accounts.map(account => (
                      <div key={account.id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[rgba(243,237,227,1)]"
                        onClick={() => { setAccountId(account.id); setShowSenderPicker(false) }}>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: account.brand_color || 'var(--gmail)' }}>
                          {(account.name || 'G')[0].toUpperCase()}
                        </span>
                        <span className="flex-1 min-w-0 text-[13px] font-medium truncate" style={{ color: 'var(--foreground)' }}>{account.email}</span>
                        {account.id === accountId && (
                          <span className="text-[12px] shrink-0" style={{ color: 'rgba(196,61,61,1)' }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 收件人 */}
            <div className="flex items-center gap-4 pt-4 pb-4">
              <span className="w-[61px] shrink-0 text-[14px] font-semibold" style={{ color: 'var(--foreground-secondary)' }}>收件人</span>
              <ContactPicker
                value={to}
                onSelect={emails => setTo(emails.join(', '))}
              />
              <div className="flex items-center gap-2 shrink-0">
                {!showCc && <button onClick={() => setShowCc(true)} className="text-[13px] font-medium hover:opacity-70" style={{ color: '#6b8fa3' }}>抄送</button>}
                {!showBcc && <button onClick={() => setShowBcc(true)} className="text-[13px] font-medium hover:opacity-70" style={{ color: '#6b8fa3' }}>密送</button>}
              </div>
            </div>

            {/* 抄送 */}
            {showCc && (
              <div className="flex items-center gap-4 pt-4 pb-4">
                <span className="w-[61px] shrink-0 text-[14px] font-semibold" style={{ color: 'var(--foreground-secondary)' }}>抄送</span>
                <div className="flex items-center h-[41px] rounded-[8px] flex-1 px-4"
                  style={{ backgroundColor: 'var(--background)', border: '0.7px solid rgba(229,217,196,1)' }}>
                  <input value={cc} onChange={e => setCc(e.target.value)} placeholder="输入邮箱地址..."
                    className="flex-1 min-w-0 outline-none text-[14px] bg-transparent placeholder:text-[var(--muted-foreground)]"
                    style={{ color: 'var(--foreground)' }} />
                  <button onClick={() => setShowCc(false)} className="shrink-0"><X className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} /></button>
                </div>
              </div>
            )}

            {/* 密送 */}
            {showBcc && (
              <div className="flex items-center gap-4 pt-4 pb-4">
                <span className="w-[61px] shrink-0 text-[14px] font-semibold" style={{ color: 'var(--foreground-secondary)' }}>密送</span>
                <div className="flex items-center h-[41px] rounded-[8px] flex-1 px-4"
                  style={{ backgroundColor: 'var(--background)', border: '0.7px solid rgba(229,217,196,1)' }}>
                  <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="输入邮箱地址..."
                    className="flex-1 min-w-0 outline-none text-[14px] bg-transparent placeholder:text-[var(--muted-foreground)]"
                    style={{ color: 'var(--foreground)' }} />
                  <button onClick={() => setShowBcc(false)} className="shrink-0"><X className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} /></button>
                </div>
              </div>
            )}

            {/* 主题 */}
            <div className="flex items-center gap-4 pt-4 pb-4">
              <span className="w-[61px] shrink-0 text-[14px] font-semibold" style={{ color: 'var(--foreground-secondary)' }}>主题</span>
              <div className="flex items-center h-[41px] rounded-[8px] flex-1 px-4"
                style={{ backgroundColor: 'var(--background)', border: '0.7px solid rgba(229,217,196,1)' }}>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="输入邮件主题..."
                  className="flex-1 min-w-0 outline-none text-[14px] bg-transparent placeholder:text-[var(--muted-foreground)]"
                  style={{ color: 'var(--foreground)' }} />
              </div>
            </div>

            {/* 正文 */}
            <RichTextEditor
              ref={editorRef}
              value={body}
              onChange={setBody}
              placeholder="开始撰写邮件正文..."
              className="h-[360px]"
            />

            {/* 附件列表 */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px]"
                    style={{ borderColor: 'rgba(229,217,196,1)', backgroundColor: 'var(--background)' }}>
                    <Paperclip className="w-3.5 h-3.5" style={{ color: 'var(--foreground-tertiary)' }} />
                    <span className="max-w-[150px] truncate" style={{ color: 'var(--foreground)' }}>{att.name}</span>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>({(att.size / 1024).toFixed(0)}KB)</span>
                    <button onClick={() => removeAttachment(i)} className="hover:opacity-70"><X className="w-3.5 h-3.5" style={{ color: 'var(--foreground-tertiary)' }} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* 底部操作区 */}
            <div className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" multiple accept="*/*" onChange={handleFileChange} className="hidden" id="attach-input" />
                <label htmlFor="attach-input"
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className="flex items-center gap-2 h-8 px-4 rounded-[8px] cursor-pointer transition-all"
                  style={{
                    backgroundColor: dragOver ? 'var(--danger-bg)' : 'var(--muted)',
                    border: dragOver ? '1.5px dashed var(--primary)' : 'none',
                    color: 'var(--foreground-secondary)',
                  }}>
                  <Paperclip className="w-[18px] h-[18px]" style={{ color: 'var(--foreground-secondary)' }} /> 添加附件
                </label>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>最大 50MB，支持拖拽上传</span>
              </div>
              <button onClick={() => setScheduleAt(scheduleAt ? '' : new Date().toISOString().slice(0, 10) + 'T' + new Date().toTimeString().slice(0, 5))}
                className="flex items-center gap-2 h-[32px] px-3 rounded-[8px] transition-all hover:opacity-80"
                style={{ backgroundColor: scheduleAt ? 'var(--danger-bg)' : 'var(--muted)', borderColor: scheduleAt ? 'var(--danger)' : 'transparent', borderWidth: scheduleAt ? 0 : 0, borderStyle: 'solid' }}>
                <Clock className="w-4 h-4" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: scheduleAt ? 'var(--danger)' : 'var(--foreground-secondary)' }} />
                <span className="text-[12px] font-medium" style={{ color: scheduleAt ? 'var(--danger)' : 'var(--foreground-secondary)' }}>{scheduleAt ? '取消定时' : '定时发送'}</span>
                <ChevronDown className="w-3 h-3" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground-tertiary)' }} />
              </button>
            </div>

            {/* 定时时间选择 */}
            {scheduleAt && (
              <div className="flex items-center gap-3 pt-4">
                <DateTimePicker value={scheduleAt} onChange={setScheduleAt} />
                <button onClick={() => setScheduleAt('')} className="text-xs hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>取消定时</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function ComposePage() {
  return (
    <Suspense fallback={null}>
      <ComposePageInner />
    </Suspense>
  )
}

export const dynamic = 'force-dynamic'
