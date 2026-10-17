'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useSSE } from '@/hooks/useSSE'
import { api } from '@/lib/api'
import type { Account } from '@/types'
import type { SyncStatusData } from '@/hooks/useSSE'
import {
  Plus, Trash2, Check, Edit, ChevronDown, User, Eye, EyeOff, Mail, X, RefreshCw, Settings,
} from '@/lib/icons'
import { getAccountAvatarBg } from '@/lib/icons'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { createPortal } from 'react-dom'

const providerLogoStyle: Record<string, { bg: string; color: string }> = {
  gmail:  { bg: '#ea4335', color: 'white' },
  outlook:{ bg: '#0078d4', color: 'white' },
  qq:     { bg: '#12b7f5', color: 'white' },
  netease:{ bg: '#e53e3e', color: 'white' },
  icloud: { bg: '#7c9a5f', color: 'white' },
  yahoo:  { bg: '#721c90', color: 'white' },
  other:  { bg: '#5b6abf', color: 'white' },
  auto:   { bg: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' },
}
function ProviderLogo({ provider, size = 18 }: { provider: string; size?: number }) {
  const s = providerLogoStyle[provider] || providerLogoStyle.auto
  return (
    <span className="shrink-0 flex items-center justify-center rounded"
      style={{ width: size, height: size, backgroundColor: s.bg, color: s.color }}>
      <Mail style={{ width: size * 0.6, height: size * 0.6 }} />
    </span>
  )
}
function CustomSelect({
    value, options, onChange, width = 120,
  }: {
    value: string
    options: Array<{ value: string; label: string; provider?: string }>
    onChange: (v: string) => void
    width?: number
  }) {
   const [open, setOpen] = useState(false)
   const ref = useRef<HTMLDivElement>(null)

   useEffect(() => {
     const handler = (e: MouseEvent) => {
       if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
     }
     document.addEventListener('mousedown', handler)
     return () => document.removeEventListener('mousedown', handler)
   }, [])

   const selected = options.find(o => o.value === value)
   return (
     <div ref={ref} className="relative" style={{ width }}>
       <button
         onClick={() => setOpen(!open)}
         className="flex items-center gap-2 w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors"
         style={{ backgroundColor: 'var(--color-bg-secondary)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)' }}
       >
         {'provider' in (selected || {}) && selected?.provider ? <ProviderLogo provider={selected.provider} size={16} /> : null}
         <span className="flex-1 text-left truncate">{selected?.label || value}</span>
         <ChevronDown style={{ width: 14, height: 14, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--color-text-muted)' }} />
       </button>
       {open && (
          <div className="absolute z-50 top-full mt-1 left-0 w-full rounded-lg overflow-hidden shadow-lg"
            style={{ backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', minWidth: width }}
          >
            {options.map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--color-bg-secondary)] flex items-center gap-2"
                style={{ color: opt.value === value ? 'var(--color-primary)' : 'var(--color-text-primary)', backgroundColor: opt.value === value ? 'var(--color-bg-secondary)' : 'transparent' }}
              >
                {opt.value === value && <Check style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--color-primary)' }} />}
                {'provider' in opt && opt.provider ? <ProviderLogo provider={opt.provider} size={18} /> : null}
                {opt.label}
              </button>
            ))}
          </div>
       )}
     </div>
   )
 }

type ProviderKey = 'auto' | 'gmail' | 'outlook' | 'qq' | 'netease' | 'icloud' | 'yahoo' | 'other'

const PROVIDER_CONFIG: Record<Exclude<ProviderKey, 'auto' | 'other'>, {
  label: string; brand: string;
  domains: string[];
  imapHost: string; imapPort: number; smtpHost: string; smtpPort: number;
  nameHint: string; emailHint: string; usernameHint: string; passwordTip: string; guide: string;
}> = {
  gmail: {
    label: 'Gmail', brand: '#ea4335',
    domains: ['gmail.com', 'googlemail.com'],
    imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587,
    nameHint: 'Gmail 账号', emailHint: 'xxx@gmail.com',
    usernameHint: '完整 Gmail 邮箱地址', passwordTip: '应用专用密码（16位）',
    guide: 'Gmail 需开启「两步验证」，再到 Google 账号 → 安全 → 应用专用密码生成 16 位密码，输入该应用密码而非登录密码。',
  },
  outlook: {
    label: 'Outlook', brand: '#0078d4',
    domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'],
    imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp-mail.outlook.com', smtpPort: 587,
    nameHint: 'Outlook / Hotmail 账号', emailHint: 'xxx@outlook.com',
    usernameHint: '使用完整邮箱地址', passwordTip: '微软账号密码或应用密码',
    guide: 'Outlook 即可使用微软账号密码；若开启双重验证，请在账号安全设置中创建应用密码后使用。',
  },
  qq: {
    label: 'QQ邮箱', brand: '#12b7f5',
    domains: ['qq.com'],
    imapHost: 'imap.qq.com', imapPort: 993, smtpHost: 'smtp.qq.com', smtpPort: 465,
    nameHint: 'QQ 邮箱账号', emailHint: 'xxx@qq.com',
    usernameHint: 'QQ 邮箱完整地址', passwordTip: '授权码（非QQ密码）',
    guide: '进入 QQ 邮箱 → 设置 → 账户，开启「IMAP/SMTP 服务」后生成授权码，此处填写授权码而非 QQ 登录密码。',
  },
   netease: {
     label: '网易126', brand: '#e53e3e',
    domains: ['163.com', '126.com', 'yeah.net', 'vip.163.com'],
    imapHost: 'imap.163.com', imapPort: 993, smtpHost: 'smtp.163.com', smtpPort: 465,
    nameHint: '网易邮箱账号', emailHint: 'xxx@163.com',
    usernameHint: '网易邮箱完整地址', passwordTip: '客户端授权码（非登录密码）',
    guide: '网易邮箱在 设置 → POP3/SMTP/IMAP 中开启服务，生成专属客户端授权码后在此输入，勿使用登录密码。',
  },
  icloud: {
    label: 'iCloud', brand: '#7c9a5f',
    domains: ['icloud.com', 'me.com'],
    imapHost: 'imap.mail.me.com', imapPort: 993, smtpHost: 'smtp.mail.me.com', smtpPort: 587,
    nameHint: 'iCloud 账号', emailHint: 'xxx@icloud.com',
    usernameHint: 'iCloud 完整邮箱地址', passwordTip: 'App 专用密码',
    guide: 'iCloud 需在 appleid.apple.com → 登录与安全 → App 专用密码 生成专用密码，再用它而非 iCloud 登录密码。',
  },
  yahoo: {
    label: 'Yahoo', brand: '#721c90',
    domains: ['yahoo.com', 'ymail.com', 'yahoo.co.jp', 'yahoo.co.uk', 'yahoo.de', 'yahoo.fr'],
    imapHost: 'imap.mail.yahoo.com', imapPort: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 587,
    nameHint: 'Yahoo 账号', emailHint: 'xxx@yahoo.com',
    usernameHint: '完整 Yahoo 邮箱地址', passwordTip: 'Yahoo 应用密码（非登录密码）',
    guide: 'Yahoo 需生成「应用密码」：登录 Yahoo 账号 → 账户信息 → 账户安全 → 应用密码，生成后输入此处。',
  },
}

function detectProvider(email: string): ProviderKey {
  const domain = (email || '').split('@')[1]?.toLowerCase().trim() || ''
  if (!domain) return 'auto'
  for (const [key, p] of Object.entries(PROVIDER_CONFIG)) {
    if (p.domains.includes(domain)) return key as ProviderKey
  }
  return 'other'
}

export function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState({
     name: '', email: '', imap_host: '', imap_port: 993,
     smtp_host: '', smtp_port: 587, username: '', password: '', use_idle: true,
     access_token: '', token_type: '', expiry: '', scope: '', provider: '', auth_method: 'password',
    })
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)
    const [provider, setProvider] = useState<ProviderKey>('auto')
    const [showPassword, setShowPassword] = useState(false)
     const [syncStatus, setSyncStatus] = useState<Record<number, string>>({})
     const [syncProgress, setSyncProgress] = useState<Record<number, SyncStatusData>>({})
     const [lastSyncedAt, setLastSyncedAt] = useState<Record<number, number>>({})
     const [errorSince, setErrorSince] = useState<Record<number, number>>({})

     useSSE(undefined, undefined, (data: SyncStatusData) => {
       if (!data.account_id) return
       const id = Number(data.account_id)
        setSyncStatus(prev => ({ ...prev, [id]: data.status }))
        if (data.status === 'syncing') {
          setSyncProgress(prev => ({ ...prev, [id]: data }))
        } else {
          setSyncProgress(prev => { const next = { ...prev }; delete next[id]; return next })
        }
       if (data.last_synced_at) {
         setLastSyncedAt(prev => { const next = { ...prev }; next[id] = data.last_synced_at!; return next })
       }
       if (data.status === 'error') {
         setErrorSince(prev => prev[id] ? prev : { ...prev, [id]: Date.now() })
       } else if (data.status === 'ok') {
         setErrorSince(prev => { const n = { ...prev }; delete n[id]; return n })
       }
     })

   const oauthProviders = ['gmail', 'outlook'] as const

   const configFor = (key: ProviderKey) =>
     key === 'auto' || key === 'other' ? null : PROVIDER_CONFIG[key]

   const activeProvider = configFor(provider === 'auto' ? detectProvider(form.email) : provider)

   const resetForm = () => {
     setForm({ name: '', email: '', imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587, username: '', password: '', use_idle: true, access_token: '', token_type: '', expiry: '', scope: '', provider: '', auth_method: 'password' })
     setProvider('auto')
     setShowPassword(false)
   }

   const handleOAuthLogin = async (key: Exclude<ProviderKey, 'auto' | 'other'>) => {
     try {
       const apiUrl = typeof window !== 'undefined' ? window.location.origin : ''
       const resp = await api.oauth.authUrl(key, `${apiUrl}/v1/oauth/${key}/callback`)
       if (!resp?.auth_url) { toast.error('未配置 OAuth 客户端凭据'); return }
       sessionStorage.setItem('oauth_state', resp.state)
       sessionStorage.setItem('oauth_provider', key)
       window.location.href = resp.auth_url
     } catch (e: any) {
       toast.error(e.message || 'OAuth 授权失败')
     }
   }

   const applyProviderHosts = (key: Exclude<ProviderKey, 'auto' | 'other'>) => {
     const p = PROVIDER_CONFIG[key]
     setProvider(key)
     setForm(f => ({
       ...f,
       imap_host: p.imapHost, imap_port: p.imapPort,
       smtp_host: p.smtpHost, smtp_port: p.smtpPort,
     }))
   }

   const handleEmailChange = (v: string) => {
     const detected = detectProvider(v)
     if (detected !== 'auto' && detected !== 'other' && provider === 'auto') {
       applyProviderHosts(detected)
       setForm(f => ({ ...f, email: v, name: f.name || PROVIDER_CONFIG[detected].nameHint }))
     } else {
       setForm(f => ({ ...f, email: v }))
     }
   }

   const load = () => {
     setLoading(true)
     api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {}).finally(() => setLoading(false))
   }
   useEffect(() => { if (open) load() }, [open])

   useEffect(() => {
     if (!open) { resetForm(); setSelectedId(null) }
   }, [open])

   const handleCreate = async () => {
     if (!form.email || !form.imap_host || !form.smtp_host) { toast.error('请填写邮箱地址和服务器信息'); return }
     setSaving(true)
     try {
       const result = await api.accounts.create({
         name: form.name, email: form.email, imap_host: form.imap_host,
         imap_port: form.imap_port, smtp_host: form.smtp_host, smtp_port: form.smtp_port,
         username: form.username, password: form.password || undefined, use_idle: form.use_idle,
         auth_method: form.auth_method || 'password',
         provider: form.provider || '',
         access_token: form.access_token || undefined,
         token_type: form.token_type || undefined,
         expiry: form.expiry || undefined,
         scope: form.scope || undefined,
       })
       toast.success('账号添加成功，正在同步邮件…')
       setSelectedId(null)
       resetForm()
       load()
       new BroadcastChannel('lzmail_accounts').postMessage({ type: 'accounts:updated' })
       const newId = result?.id
       if (newId) {
         setTimeout(() => api.sync.account(newId).catch(() => {}), 500)
       }
     } catch (e: any) {
       toast.error(e.message || '添加失败')
     } finally {
       setSaving(false)
     }
   }

   const handleDelete = async (id: number) => { setDeleteTarget(id) }
   const handleConfirmDelete = async () => {
     if (deleteTarget === null) return
     try {
       await api.accounts.delete(deleteTarget)
       toast.success('账号已删除')
       if (selectedId === deleteTarget) { setSelectedId(null); resetForm() }
       load()
     } catch (e: any) { toast.error(e.message || '删除失败') }
     finally { setDeleteTarget(null) }
   }

   const handleSelectAccount = (a: Account) => {
     setSelectedId(a.id)
     setForm({
       name: a.name || '', email: a.email, imap_host: a.imap_host,
       imap_port: a.imap_port, smtp_host: a.smtp_host, smtp_port: a.smtp_port,
       username: a.username, password: '', use_idle: a.use_idle,
       access_token: '', token_type: '', expiry: '', scope: '', provider: a.provider || '', auth_method: a.auth_method || 'password',
     })
     setProvider(detectProvider(a.email))
     setShowPassword(false)
   }

   const handleNewAccount = () => {
     setSelectedId(null)
     resetForm()
   }

   const handleSaveEdit = async () => {
     if (!selectedId || !form.email || !form.imap_host || !form.smtp_host) { toast.error('请填写邮箱地址和服务器信息'); return }
     setSaving(true)
     try {
       await api.accounts.update(selectedId, {
         name: form.name, email: form.email, imap_host: form.imap_host,
         imap_port: form.imap_port, smtp_host: form.smtp_host, smtp_port: form.smtp_port,
         username: form.username, password: form.password || undefined, use_idle: form.use_idle,
         auth_method: form.auth_method || 'password',
         provider: form.provider || undefined,
       })
       load()
       toast.success('账号已更新')
     } catch (e: any) {
       toast.error(e.message || '保存失败')
     } finally {
       setSaving(false)
     }
   }

   const getSyncBadge = (a: Account, state: string, mode: string) => {
     if (state === 'syncing') return { label: '同步中', color: 'var(--color-warning)', bg: 'rgba(243,156,18,0.1)', dotColor: 'var(--color-warning)' }
     if (state === 'error') return { label: '异常', color: 'var(--color-error)', bg: 'rgba(231,76,60,0.1)', dotColor: 'var(--color-error)' }
     if (mode === 'poll') return { label: '轮询 · 1分钟', color: 'var(--color-text-muted)', bg: 'var(--color-bg-secondary)', dotColor: 'var(--color-text-muted)' }
     return { label: 'IDLE · 实时', color: 'var(--color-success)', bg: 'rgba(78,155,122,0.1)', dotColor: 'var(--color-success)' }
   }

   const formatLastSync = (ts: number) => {
     if (!ts) return ''
     const d = new Date(ts * 1000)
     const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
     const diff = Math.floor((Date.now() / 1000) - ts)
     let rel: string
     if (diff < 60) rel = '刚刚'
     else if (diff < 3600) rel = `${Math.floor(diff / 60)} 分钟前`
     else if (diff < 86400) rel = `${Math.floor(diff / 3600)} 小时前`
     else rel = `${Math.floor(diff / 86400)} 天前`
     return `${dateStr} · ${rel}`
   }

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

   if (!open) return null

   const isEditing = selectedId !== null
   const selectedAccount = accounts.find(a => a.id === selectedId)

   return createPortal(
     <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s ease', zIndex: 1000 }} onClick={onClose}>
       <div
         style={{
           display: 'flex',
           flexDirection: 'column',
           width: 1000,
           maxWidth: '94vw',
           height: '85vh',
           maxHeight: 700,
           backgroundColor: 'var(--color-bg-white)',
           border: '1px solid var(--color-border-soft)',
           borderRadius: 16,
           boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
           padding: '24px 28px',
           overflow: 'hidden',
           animation: 'scaleIn 0.2s ease',
         }}
         onClick={(e) => e.stopPropagation()}
       >
         {/* Header */}
         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 20, flexShrink: 0, borderBottom: '1px solid var(--color-border-soft)' }}>
           <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, backgroundColor: 'var(--color-primary-soft)', borderRadius: 12, flexShrink: 0 }}>
               <Settings style={{ width: 26, height: 26, color: 'var(--color-primary)' }} />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
               <h2 className="font-bold" style={{ fontSize: 20, color: 'var(--color-text-primary)', margin: 0, lineHeight: 26, fontFamily: 'var(--font-family-cn)' }}>账号管理</h2>
               <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 18, fontFamily: 'var(--font-family-cn)' }}>{isEditing ? `编辑：${selectedAccount?.name || selectedAccount?.email || ''}` : '添加新的邮箱账号'}</p>
             </div>
           </div>
           <button
             onClick={onClose}
             style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, backgroundColor: 'var(--color-bg-secondary)', borderRadius: 9999, color: 'var(--color-text-secondary)', border: 'none', flexShrink: 0, cursor: 'pointer', transition: 'all var(--transition-base)' }}
             title="关闭"
           >
             <i className="ri-close-line" style={{ fontSize: 18 }}></i>
           </button>
         </div>

          {/* Body: Left list + Right form */}
          <div style={{ flex: 1, minHeight: 0, gap: 20, display: 'flex', paddingTop: 20, height: '100%', boxSizing: 'border-box' }}>
            {/* Left: Account list */}
            <nav style={{ width: 240, flexShrink: 0, backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-soft)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
             {/* Add new button */}
             <button
               onClick={handleNewAccount}
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: 10,
                 height: 44,
                 padding: '0 14px',
                 borderRadius: 10,
                 backgroundColor: !isEditing ? 'var(--color-bg-white)' : 'transparent',
                 color: !isEditing ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                 fontWeight: !isEditing ? 500 : 400,
                 border: 'none',
                 cursor: 'pointer',
                 width: '100%',
                 textAlign: 'left',
                 transition: 'all var(--transition-base)',
                 boxShadow: !isEditing ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                 fontFamily: 'var(--font-family-cn)',
               }}
             >
               <Plus style={{ width: 18, height: 18, flexShrink: 0 }} />
               <span style={{ fontSize: 14 }}>新建账号</span>
             </button>

             <div style={{ height: 1, backgroundColor: 'var(--color-border-soft)', margin: '4px 0' }}></div>

             {/* Account list */}
             {loading ? (
               <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>加载中...</div>
             ) : accounts.length === 0 ? (
               <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>暂无账号</div>
             ) : (
               accounts.map(a => {
                 const ac = getAccountAvatarBg(a)
                 const isSelected = selectedId === a.id
                 const state = syncStatus[a.id]
                 const prog = syncProgress[a.id]
                 const syncState = getSyncBadge(a, state, prog?.mode || (a.use_idle ? 'idle' : 'poll'))
                 const isSyncing = state === 'syncing'
                 const progressPct = prog && prog.total ? Math.min(100, Math.round((prog.processed || 0) / prog.total * 100)) : 0
                 return (
                   <button
                     key={a.id}
                     onClick={() => handleSelectAccount(a)}
                     style={{
                       display: 'flex',
                       alignItems: 'center',
                       gap: 10,
                       height: 52,
                       padding: '0 12px',
                       borderRadius: 10,
                       backgroundColor: isSelected ? 'var(--color-bg-white)' : 'transparent',
                       border: 'none',
                       cursor: 'pointer',
                       width: '100%',
                       textAlign: 'left',
                       transition: 'all var(--transition-base)',
                       boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                     }}
                   >
                     <div style={{ width: 32, height: 32, borderRadius: 9999, backgroundColor: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                       <User style={{ width: '60%', height: '60%', color: 'white', display: 'block', margin: 'auto' }} />
                     </div>
                     <div style={{ flex: 1, minWidth: 0 }}>
                       <div style={{ fontSize: 13, fontWeight: 500, color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {a.name || a.email}
                       </div>
                       <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {a.email}
                       </div>
                     </div>
                     <div style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: syncState.dotColor, flexShrink: 0, animation: isSyncing ? 'pulse 1.5s ease infinite' : 'none' }}></div>
                   </button>
                 )
               })
             )}
           </nav>

            {/* Right: Form */}
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: 4 }}>
              <div className="p-1" style={{ paddingBottom: 16 }}>
               <div className="p-5 rounded-[12px]" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-soft)' }}>
                 <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16, fontFamily: 'var(--font-family-cn)' }}>
                   {isEditing ? '编辑账号' : '新建账号'}
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                   <span style={{ fontSize: 12, flexShrink: 0, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>邮箱服务商：</span>
                   <CustomSelect
                     value={provider}
                     width={140}
                     onChange={(v) => {
                       const key = v as ProviderKey
                       if (key === 'auto' || key === 'other') setProvider(key)
                       else applyProviderHosts(key as Exclude<ProviderKey, 'auto' | 'other'>)
                     }}
                    options={[
                       { value: 'auto', label: '自动识别', provider: 'auto' },
                       { value: 'gmail', label: 'Gmail', provider: 'gmail' },
                       { value: 'outlook', label: 'Outlook', provider: 'outlook' },
                       { value: 'qq', label: 'QQ邮箱', provider: 'qq' },
                       { value: 'netease', label: '网易126', provider: 'netease' },
                       { value: 'icloud', label: 'iCloud', provider: 'icloud' },
                       { value: 'yahoo', label: 'Yahoo', provider: 'yahoo' },
                       { value: 'other', label: 'Exchange', provider: 'other' },
                     ]}
                   />
                   {activeProvider && (
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, fontSize: 12, backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)' }}>
                       <span style={{ fontWeight: 600, color: activeProvider.brand }}>{activeProvider.label}</span>
                     </div>
                   )}
                 </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4, fontFamily: 'var(--font-family-cn)' }}>账号名称</label>
                      <input placeholder={activeProvider ? `账号名称（${activeProvider.label}）` : '账号名称（如：Gmail）'} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        className="h-9 px-3 rounded-lg outline-none text-sm w-full" style={{ backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4, fontFamily: 'var(--font-family-cn)' }}>邮箱地址</label>
                      <input placeholder={activeProvider ? `邮箱：${activeProvider.emailHint}` : '邮箱：例如 xxx@example.com'} value={form.email} onChange={e => handleEmailChange(e.target.value)}
                        className="h-9 px-3 rounded-lg outline-none text-sm w-full" style={{ backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4, fontFamily: 'var(--font-family-cn)' }}>IMAP 服务器</label>
                      <input placeholder={activeProvider ? `IMAP：${activeProvider.imapHost}` : 'IMAP 服务器（如 imap.qq.com）'} value={form.imap_host} onChange={e => setForm({ ...form, imap_host: e.target.value })}
                        className="h-9 px-3 rounded-lg outline-none text-sm w-full" style={{ backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4, fontFamily: 'var(--font-family-cn)' }}>IMAP 端口</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="number" value={form.imap_port} onChange={e => setForm({ ...form, imap_port: Number(e.target.value) })}
                          className="h-9 px-3 rounded-lg outline-none text-sm flex-1" style={{ backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4, fontFamily: 'var(--font-family-cn)' }}>SMTP 服务器</label>
                      <input placeholder={activeProvider ? `SMTP：${activeProvider.smtpHost}` : 'SMTP 服务器（如 smtp.qq.com）'} value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })}
                        className="h-9 px-3 rounded-lg outline-none text-sm w-full" style={{ backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4, fontFamily: 'var(--font-family-cn)' }}>SMTP 端口</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="number" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: Number(e.target.value) })}
                          className="h-9 px-3 rounded-lg outline-none text-sm flex-1" style={{ backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4, fontFamily: 'var(--font-family-cn)' }}>用户名</label>
                      <input placeholder={activeProvider ? `用户名：${activeProvider.usernameHint}` : '用户名 / 邮箱地址'} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                        className="h-9 px-3 rounded-lg outline-none text-sm w-full" style={{ backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)', boxSizing: 'border-box' }} />
                    </div>
                    {form.auth_method !== 'oauth2' && (
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4, fontFamily: 'var(--font-family-cn)' }}>密码</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showPassword ? 'text' : 'password'} placeholder={isEditing ? '留空则不修改密码' : (activeProvider ? `密码：${activeProvider.passwordTip}` : '密码 / 授权码')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                            className="h-9 px-3 rounded-lg outline-none text-sm w-full" style={{ backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-primary)', paddingRight: 36, fontFamily: 'var(--font-family-cn)', boxSizing: 'border-box' }} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
                            {showPassword ? <EyeOff style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} /> : <Eye style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} />}
                          </button>
                        </div>
                      </div>
                    )}
                   {form.auth_method === 'oauth2' && !isEditing && (
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, fontSize: 12, backgroundColor: 'var(--color-bg-white)', color: 'var(--color-text-muted)' }}>
                       <span>已授权</span>
                       <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', borderRadius: 4, backgroundColor: 'var(--color-primary)', color: 'white' }}>OAuth</span>
                     </div>
                   )}
                   {(provider === 'gmail' || provider === 'outlook') && !isEditing && (
                     <button type="button" onClick={() => handleOAuthLogin(provider as Exclude<ProviderKey, 'auto' | 'other'>)}
                       style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '0.7px solid var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-white)', cursor: 'pointer' }}>
                       <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                       OAuth 授权
                     </button>
                   )}
                 </div>
                 {activeProvider && (
                   <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, fontSize: 12, lineHeight: '20px', display: 'flex', alignItems: 'flex-start', gap: 8, backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                     <span style={{ flexShrink: 0, fontWeight: 600, color: activeProvider.brand }}>{activeProvider.label}</span>
                     <span style={{ fontFamily: 'var(--font-family-cn)' }}>{activeProvider.guide}</span>
                   </div>
                 )}
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                   <input type="checkbox" id="idle" checked={form.use_idle} onChange={e => setForm({ ...form, use_idle: e.target.checked })} style={{ accentColor: 'var(--color-primary)' }} />
                   <label htmlFor="idle" style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)', cursor: 'pointer' }}>启用 IMAP IDLE（实时推送）</label>
                 </div>
                 <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                   <button onClick={() => { resetForm(); setSelectedId(null) }} style={{ padding: '0 16px', height: 40, borderRadius: 8, fontSize: 13, cursor: 'pointer', backgroundColor: 'var(--color-bg-white)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-cn)' }}>
                     重置
                   </button>
                   <button onClick={isEditing ? handleSaveEdit : handleCreate} disabled={saving}
                     style={{ padding: '0 16px', height: 40, backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', opacity: saving ? 0.5 : 1, fontFamily: 'var(--font-family-cn)' }}>
                     {saving ? '保存中...' : (isEditing ? '保存修改' : '保存账号')}
                   </button>
                 </div>
               </div>

               {/* Account details when editing */}
               {isEditing && selectedAccount && (
                 <div className="p-5 rounded-[12px] mt-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-soft)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--color-border-soft)' }}>
                     <div style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: syncStatus[selectedAccount.id] === 'syncing' ? 'var(--color-warning)' : syncStatus[selectedAccount.id] === 'error' ? 'var(--color-error)' : 'var(--color-success)', animation: syncStatus[selectedAccount.id] === 'syncing' ? 'pulse 1.5s ease infinite' : 'none' }}></div>
                     <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }}>
                       {syncStatus[selectedAccount.id] === 'syncing' ? '同步中' : syncStatus[selectedAccount.id] === 'error' ? '连接异常' : `已同步 ${formatLastSync(lastSyncedAt[selectedAccount.id] || 0)}`}
                     </span>
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                     {[
                       { label: '认证方式', value: selectedAccount.auth_method === 'oauth2' ? 'OAuth 2.0' : '授权码' },
                       { label: 'IMAP 服务器', value: `${selectedAccount.imap_host}:${selectedAccount.imap_port}` },
                       { label: 'SMTP 服务器', value: `${selectedAccount.smtp_host}:${selectedAccount.smtp_port}` },
                       { label: '同步模式', value: syncProgress[selectedAccount.id]?.mode === 'poll' ? 'Poll · 1分钟' : 'IDLE 实时' },
                     ].map(item => (
                       <div key={item.label} style={{ borderRadius: 8, padding: '10px 12px', backgroundColor: 'var(--color-bg-white)' }}>
                         <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-cn)' }}>{item.label}</div>
                         <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2, color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }}>{item.value}</div>
                       </div>
                     ))}
                   </div>
                   <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                     <button onClick={() => api.sync.account(selectedAccount.id).then(() => toast.success('同步已启动')).catch(e => toast.error(e.message || '同步失败'))}
                       style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, borderRadius: 8, fontSize: 13, cursor: 'pointer', backgroundColor: 'var(--color-bg-white)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-cn)' }}>
                       <RefreshCw style={{ width: 14, height: 14 }} />
                       立即同步
                     </button>
                     <button onClick={() => handleDelete(selectedAccount.id)}
                       style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, borderRadius: 8, fontSize: 13, cursor: 'pointer', backgroundColor: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', color: 'var(--color-error)', fontFamily: 'var(--font-family-cn)' }}>
                       <Trash2 style={{ width: 14, height: 14 }} />
                       删除账号
                     </button>
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
       </div>
     </div>,
     document.body
   )
}