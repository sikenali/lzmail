'use client'
import { useState, useEffect, useRef, useLayoutEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { NavSlider } from '@/components/layout/NavSlider'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import type { Account, MailStats, StorageTreeNode } from '@/types'
import type { SyncStatusData } from '@/hooks/useSSE'
import {
  User, Palette, Archive, Info, Globe, X, Settings,
  Plus, Trash2, Check, Edit,
  Folder, FileText, ChevronDown,
  Minus,
  Sun, Moon, Monitor,
  Columns2,
  GitRepository, BookRead, ChatSmile3, AlarmWarning,
  LayoutRow, CollapseVertical,
  Layout2,
  Eye, EyeOff, Mail,
  RefreshCw,
} from '@/lib/icons'
import { getAccountAvatarBg, Contact } from '@/lib/icons'
import { DeleteConfirm } from '@/components/DeleteConfirm'

// ── Provider Logo Icon ──────────────────────────────────────
const providerLogoStyle: Record<string, { bg: string; color: string }> = {
  gmail:  { bg: '#ea4335', color: 'white' },
  outlook:{ bg: '#0078d4', color: 'white' },
  qq:     { bg: '#12b7f5', color: 'white' },
  netease:{ bg: '#e53e3e', color: 'white' },
  icloud: { bg: '#7c9a5f', color: 'white' },
  yahoo:  { bg: '#721c90', color: 'white' },
  other:  { bg: '#5b6abf', color: 'white' },
  auto:   { bg: 'var(--muted)', color: 'var(--foreground-tertiary)' },
}
function ProviderLogo({ provider, size = 18 }: { provider: string; size?: number }) {
  const s = providerLogoStyle[provider] || providerLogoStyle.auto
  return (
    <span className="shrink-0 flex items-center justify-center rounded"
      style={{ width: size, height: size, backgroundColor: s.bg, color: s.color }}>
      <Mail className="w-3 h-3" />
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
        className="flex items-center gap-2 w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors hover:bg-[var(--muted)]"
         style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
       >
         {'provider' in (selected || {}) && selected?.provider ? <ProviderLogo provider={selected.provider} size={16} /> : null}
         <span className="flex-1 text-left truncate">{selected?.label || value}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--foreground-tertiary)' }} />
      </button>
      {open && (
         <div className="absolute z-50 top-full mt-1 left-0 w-full rounded-lg overflow-hidden shadow-lg"
           style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', minWidth: width }}
         >
           {options.map(opt => (
             <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
               className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)] flex items-center gap-2"
               style={{ color: opt.value === value ? 'var(--primary)' : 'var(--foreground)' }}
             >
               {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />}
               {'provider' in opt && opt.provider ? <ProviderLogo provider={opt.provider} size={18} /> : null}
               {opt.label}
             </button>
           ))}
         </div>
      )}
    </div>
  )
}

// ── 账号管理 ──────────────────────────────────────────────
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

function AccountPanel() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
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
    const [syncProgress, setSyncProgress] = useState<SyncStatusData | null>(null)
    const [lastSyncedAt, setLastSyncedAt] = useState<Record<number, number>>({})
    // 记录每个账号进入 error 的时间，用于过滤短暂抖动
    const [errorSince, setErrorSince] = useState<Record<number, number>>({})
    useSSE(undefined, undefined, (data: SyncStatusData) => {
      if (!data.account_id) return
      const id = Number(data.account_id)
      setSyncStatus(prev => ({ ...prev, [id]: data.status }))
      if (data.status === 'syncing') {
        setSyncProgress(data)
      } else {
        setSyncProgress(null)
      }
      if (data.last_synced_at) {
        setLastSyncedAt(prev => { const next = { ...prev }; next[id] = data.last_synced_at!; return next })
      }
      // 进入 error 时记录时间
      if (data.status === 'error') {
        setErrorSince(prev => prev[id] ? prev : { ...prev, [id]: Date.now() })
      } else if (data.status === 'ok') {
        // 恢复后清除 error 记录
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
  useEffect(() => { load() }, [])

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
      setShowForm(false)
      setEditingId(null)
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

  const handleDelete = async (id: number) => {
    setDeleteTarget(id)
  }
  const handleConfirmDelete = async () => {
    if (deleteTarget === null) return
    try {
      await api.accounts.delete(deleteTarget)
      toast.success('账号已删除')
      load()
    } catch (e: any) { toast.error(e.message || '删除失败') }
    finally { setDeleteTarget(null) }
  }

  const handleEdit = (a: Account) => {
    setForm({
      name: a.name || '', email: a.email, imap_host: a.imap_host,
      imap_port: a.imap_port, smtp_host: a.smtp_host, smtp_port: a.smtp_port,
      username: a.username, password: '', use_idle: a.use_idle,
      access_token: '', token_type: '', expiry: '', scope: '', provider: a.provider || '', auth_method: a.auth_method || 'password',
    })
    setProvider(detectProvider(a.email))
    setShowForm(true)
    setEditingId(a.id)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !form.email || !form.imap_host || !form.smtp_host) { toast.error('请填写邮箱地址和服务器信息'); return }
    setSaving(true)
    try {
      await api.accounts.update(editingId, {
        name: form.name, email: form.email, imap_host: form.imap_host,
        imap_port: form.imap_port, smtp_host: form.smtp_host, smtp_port: form.smtp_port,
        username: form.username, password: form.password || undefined, use_idle: form.use_idle,
        auth_method: form.auth_method || 'password',
        provider: form.provider || undefined,
      })
      setShowForm(false)
      setEditingId(null)
      load()
      toast.success('账号已更新')
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

   const getSyncBadge = (a: Account) => {
     if (a.use_idle) return { label: 'IDLE · 实时', color: 'var(--success)', bg: 'var(--success-bg)', dotColor: 'var(--success)' }
     return { label: '轮询', color: 'var(--muted-foreground)', bg: 'var(--accent)', dotColor: 'var(--muted-foreground)' }
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'var(--teal)' }} />
          <h2 className="text-[20px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>账号管理</h2>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); setEditingId(null) }}
          className="flex items-center gap-2 px-4 h-9 bg-[var(--primary)] text-white rounded-lg text-[13px] font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> 添加账号
        </button>
      </div>

      {showForm && (
        <div className="p-6 rounded-[16px]" style={{ border: '1px solid var(--card-border)', backgroundColor: 'var(--card)' }}>
          <div className="text-[14px] font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            {editingId ? '编辑账号' : '新建账号'}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs shrink-0" style={{ color: 'var(--foreground-tertiary)' }}>邮箱服务商：</span>
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--accent)', border: '0.7px solid var(--card-border)' }}>
                <span className="font-semibold" style={{ color: activeProvider.brand }}>{activeProvider.label}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input placeholder={activeProvider ? `账号名称（${activeProvider.label}）` : '账号名称（如：Gmail）'} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            <input placeholder={activeProvider ? `邮箱：${activeProvider.emailHint}` : '邮箱：例如 xxx@example.com'} value={form.email} onChange={e => handleEmailChange(e.target.value)}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            <input placeholder={activeProvider ? `IMAP：${activeProvider.imapHost}` : 'IMAP 服务器（如 imap.qq.com）'} value={form.imap_host} onChange={e => setForm({ ...form, imap_host: e.target.value })}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            <div className="flex items-center gap-2">
              <span className="text-xs shrink-0" style={{ color: 'var(--foreground-tertiary)' }}>IMAP 端口</span>
              <input type="number" value={form.imap_port} onChange={e => setForm({ ...form, imap_port: Number(e.target.value) })}
                className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent w-20" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            </div>
            <input placeholder={activeProvider ? `SMTP：${activeProvider.smtpHost}` : 'SMTP 服务器（如 smtp.qq.com）'} value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            <div className="flex items-center gap-2">
              <span className="text-xs shrink-0" style={{ color: 'var(--foreground-tertiary)' }}>SMTP 端口</span>
              <input type="number" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: Number(e.target.value) })}
                className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent w-20" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            </div>
            <input placeholder={activeProvider ? `用户名：${activeProvider.usernameHint}` : '用户名 / 邮箱地址'} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent col-span-1" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            {form.auth_method !== 'oauth2' && (
              <div className="relative col-span-1">
                <input type={showPassword ? 'text' : 'password'} placeholder={editingId ? '留空则不修改密码' : (activeProvider ? `密码：${activeProvider.passwordTip}` : '密码 / 授权码')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="h-9 px-3 rounded-lg outline-none text-sm bg-transparent w-full" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)', paddingRight: '36px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--accent)]" aria-label={showPassword ? '隐藏密码' : '显示密码'}>
                  {showPassword ? <EyeOff className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} /> : <Eye className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />}
                </button>
              </div>
            )}
            {form.auth_method === 'oauth2' && !editingId && (
              <div className="col-span-1 text-xs flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-tertiary)' }}>
                <span>已授权</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>OAuth</span>
              </div>
            )}
            {(provider === 'gmail' || provider === 'outlook') && !editingId && (
              <button type="button" onClick={() => handleOAuthLogin(provider as Exclude<ProviderKey, 'auto' | 'other'>)}
                className="h-9 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0"
                style={{ border: '1px solid var(--card-border)', color: 'var(--foreground-tertiary)', backgroundColor: 'var(--muted)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                OAuth 授权
              </button>
            )}
          </div>

          {activeProvider && (
            <div className="mt-3 px-3 py-2.5 rounded-lg text-xs leading-5 flex items-start gap-2"
              style={{ backgroundColor: 'var(--accent)', border: '0.7px solid var(--card-border)', color: 'var(--foreground-tertiary)' }}>
              <span className="shrink-0 font-semibold" style={{ color: activeProvider.brand }}>{activeProvider.label}</span>
              <span>{activeProvider.guide}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <input type="checkbox" id="idle" checked={form.use_idle} onChange={e => setForm({ ...form, use_idle: e.target.checked })} className="accent-[var(--primary)]" />
            <label htmlFor="idle" className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>启用 IMAP IDLE（实时推送）</label>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={handleCancel} className="px-4 h-10 rounded-lg text-sm hover:bg-[var(--muted)] transition-all" style={{ border: '1px solid var(--card-border)', color: 'var(--foreground-tertiary)' }}>取消</button>
            <button onClick={editingId ? handleSaveEdit : handleCreate} disabled={saving}
              className="px-4 h-10 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all">
              {saving ? '保存中...' : (editingId ? '保存修改' : '保存')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm py-8" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 rounded-[16px]" style={{ border: '0.7px dashed var(--card-border)', backgroundColor: 'var(--card)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--gold-bg)' }}>
            <Plus className="w-6 h-6" style={{ color: 'var(--gold)' }} />
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>暂无邮箱账号</div>
          <div className="text-xs mt-1" style={{ color: 'var(--foreground-tertiary)' }}>点击右上角「添加账号」配置你的邮箱</div>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(a => {
            const ac = getAccountAvatarBg(a)
             const isSyncing = syncStatus[a.id] === 'syncing'
             // error 持续超过 30 秒才视为真正的异常，之前阶段显示"待同步"
             const ERROR_GRACE_MS = 30_000
             const isErrored = syncStatus[a.id] === 'error' && (!errorSince[a.id] || (Date.now() - errorSince[a.id]) > ERROR_GRACE_MS)
            const progressPct = syncProgress && syncProgress.account_id === String(a.id) && syncProgress.total
              ? Math.min(100, Math.round((syncProgress.processed || 0) / syncProgress.total * 100))
              : 0
            const folderProgress = syncProgress && syncProgress.account_id === String(a.id) && syncProgress.folders_total
              ? `${syncProgress.folders_done}/${syncProgress.folders_total}`
              : null
            const currentFolder = syncProgress && syncProgress.account_id === String(a.id) && syncProgress.folder
              ? syncProgress.folder
              : null
            const syncState = isSyncing
              ? { label: `${progressPct}%`, color: 'var(--gold)', bg: 'var(--gold-bg)', dotColor: 'var(--gold)' }
              : isErrored
              ? { label: '异常', color: 'var(--danger)', bg: 'var(--danger-bg)', dotColor: 'var(--danger)' }
              : getSyncBadge(a)
            const isExpanded = expandedId === a.id
            return (
              <div key={a.id} className="rounded-[16px] overflow-hidden relative" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)' }}>
                {/* 同步进度背景条 */}
                {isSyncing && (
                  <div className="absolute left-0 bottom-0 h-[3px] transition-all duration-300" style={{ width: `${progressPct}%`, backgroundColor: 'var(--gold)' }} />
                )}
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: ac }}>
                      {a.name?.[0]?.toUpperCase() || a.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{a.name || a.email}</div>
                      <div className="text-[12px] truncate" style={{ color: 'var(--foreground-tertiary)' }}>{a.email}</div>
                    </div>
                      {/* 同步状态徽章 - 移到账号信息右边 */}
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: syncState.bg, color: syncState.color }}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'animate-pulse' : ''}`} style={{ backgroundColor: syncState.dotColor }} />
                          {isSyncing ? `${progressPct}%` : syncState.label}
                        </div>
                        {isSyncing && currentFolder && (
                          <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{currentFolder} {folderProgress ? `(${folderProgress})` : ''}</div>
                        )}
                        {!isSyncing && lastSyncedAt[a.id] && (
                          <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{formatLastSync(lastSyncedAt[a.id])}</div>
                        )}
                      </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(a) }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] transition-colors" title="编辑">
                      <Edit className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--danger-bg)] transition-colors" title="删除">
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                    </button>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--foreground-tertiary)' }} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                    {/* 同步详情 */}
                    <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <div className={`w-2 h-2 rounded-full ${isSyncing ? 'animate-pulse' : ''}`} style={{ backgroundColor: isErrored ? 'var(--danger)' : isSyncing ? 'var(--gold)' : 'var(--success)' }} />
                      <span className="text-[12px]" style={{ color: 'var(--foreground)' }}>
                        {isSyncing ? `同步中 · ${currentFolder || '正在处理'} ${folderProgress ? `(${folderProgress})` : ''}` :
                         isErrored ? '连接异常，请稍后重试' :
                         `已同步 ${formatLastSync(lastSyncedAt[a.id] || 0)} 前`}
                      </span>
                      {isSyncing && (
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, backgroundColor: 'var(--gold)' }} />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: '认证方式', value: a.auth_method === 'oauth2' ? 'OAuth 2.0' : '授权码' },
                        { label: 'IMAP 服务器', value: `${a.imap_host}:${a.imap_port}` },
                        { label: 'SMTP 服务器', value: `${a.smtp_host}:${a.smtp_port}` },
                        { label: '同步模式', value: a.use_idle ? 'IDLE 实时' : 'Poll 轮询' },
                        ...(a.auth_method === 'oauth2' && a.provider ? [
                          { label: '服务商', value: a.provider === 'gmail' ? 'Gmail' : a.provider === 'outlook' ? 'Outlook' : a.provider === 'netease' ? '网易126' : a.provider === 'yahoo' ? 'Yahoo' : a.provider === 'other' ? 'Exchange' : a.provider },
                        ] : []),
                      ].map(item => (
                        <div key={item.label} className="rounded-lg p-3" style={{ backgroundColor: 'var(--accent)' }}>
                          <div className="text-[11px]" style={{ color: 'var(--foreground-tertiary)' }}>{item.label}</div>
                          <div className="text-[13px] font-medium mt-0.5" style={{ color: 'var(--foreground)' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <DeleteConfirm
        open={deleteTarget !== null}
        title="删除账号"
        message="确定要删除此账号吗？删除后相关邮件数据也将一并清除。"
        confirmText="删除"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
function AppearancePanel() {
  const { settings, setSetting } = useSettings()

  const themes = [
    { name: '浅色', id: 'light', icon: Sun },
    { name: '深色', id: 'dark', icon: Moon },
    { name: '跟随系统', id: 'system', icon: Monitor },
  ]
  const accentColors = [
    { name: '朱红', value: '#c43d3d' },
    { name: '云蓝', value: '#6b8fa3' },
    { name: '玉绿', value: '#5b8c5a' },
    { name: '金色', value: '#c9a96e' },
    { name: '墨色', value: '#3d2b1f' },
  ]

  const sizeLabels: Record<string, string> = { small: '小 (14px)', medium: '中 (16px)', large: '大 (18px)' }
  const sizes: Array<'small'|'medium'|'large'> = ['small', 'medium', 'large']

  const btnBase = 'flex items-center gap-2 px-4 h-10 rounded-lg transition-all text-[13px]'
  const btnActive = 'flex items-center gap-2 px-4 h-10 rounded-lg transition-all text-[13px] font-semibold'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'var(--teal)' }} />
        <h2 className="text-[20px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>外观设置</h2>
      </div>
      <div className="rounded-[16px] overflow-hidden" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '24px' }}>
        {/* Theme */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>主题模式</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>选择界面明暗主题</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {themes.map(t => {
              const Icon = t.icon
              const active = settings.theme === t.id
              return (
                <button key={t.id} onClick={() => setSetting('theme', t.id)}
                  className={btnBase}
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
                    color: active ? '#ffffff' : 'var(--foreground-secondary)',
                    fontFamily: active ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: active ? '#ffffff' : 'var(--foreground-secondary)' }} />
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Accent color */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>主题色</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>选择界面强调色</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {accentColors.map(c => {
              const active = settings.accent_color === c.value
              return (
                <button key={c.value} title={c.name} onClick={() => setSetting('accent_color', c.value)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{ backgroundColor: c.value }}
                >
                  {active && (
                    <Check className="w-4 h-4 shrink-0 text-white" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Font size */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>字体大小</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>调整邮件正文与界面文字大小</div>
          </div>
          <div className="flex items-center" style={{ gap: '12px' }}>
            <button onClick={() => {
              const idx = sizes.indexOf((settings.font_size || 'medium') as 'small'|'medium'|'large')
              const next = sizes[Math.max(0, idx - 1)]
              setSetting('font_size', next)
            }} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)' }}>
              <Minus className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
            </button>
            <div className="px-4 py-1.5 rounded-lg" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--accent)', minWidth: 95, textAlign: 'center' }}>
              <span className="text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
                {sizeLabels[settings.font_size || 'medium']}
              </span>
            </div>
            <button onClick={() => {
              const idx = sizes.indexOf((settings.font_size || 'medium') as 'small'|'medium'|'large')
              const next = sizes[Math.min(sizes.length - 1, idx + 1)]
              setSetting('font_size', next)
            }} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)' }}>
              <Plus className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Density */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>列表密度</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>调整邮件列表的行间距</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {(['舒适', '紧凑'] as const).map((item, idx) => {
              const active = settings.mail_density === (item === '舒适' ? 'comfortable' : 'compact')
              const DensityIcon = idx === 0 ? LayoutRow : CollapseVertical
              return (
                <button key={item} onClick={() => setSetting('mail_density', item === '舒适' ? 'comfortable' : 'compact')}
                  className={active ? 'flex items-center gap-2 px-4 h-10 rounded-lg transition-all text-[13px] font-semibold' : 'flex items-center gap-2 px-4 h-10 rounded-lg transition-all text-[13px]'}
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
                    color: active ? '#ffffff' : 'var(--foreground-secondary)',
                    fontFamily: active ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                  }}
                >
                  <DensityIcon className="w-[18px] h-[18px] shrink-0" />
                  {item}
                </button>
              )
            })}
          </div>
        </div>

        {/* Layout */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>默认布局</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>选择收件箱的默认视图布局</div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {[{ label: '三栏', id: 'three', icon: Columns2 }, { label: '双栏', id: 'two', icon: Layout2 }].map(item => {
              const active = settings.layout_density === item.id
              return (
                <button key={item.id} onClick={() => setSetting('layout_density', item.id)}
                  className={btnBase}
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'var(--muted)',
                    color: active ? '#ffffff' : 'var(--foreground-secondary)',
                    fontFamily: active ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                  }}
                >
                  <item.icon className="w-4 h-4" style={{ color: active ? '#ffffff' : 'var(--foreground-secondary)' }} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Animation */}
        <div className="flex items-center justify-between" style={{ padding: '20px 0' }}>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>动画效果</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>开启或关闭界面过渡动画</div>
          </div>
          <button onClick={() => setSetting('animations', settings.animations === 'true' ? 'false' : 'true')}
            className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${(settings.animations || 'true') === 'true' ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${(settings.animations || 'true') === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

// ── Directory Tree Picker ─────────────────────────────────
type DirNode = { name: string; is_dir: boolean; path: string; subdirs?: DirNode[] }

function DirTree({ entries, basePath, onSelect, selected, depth = 0 }: {
  entries: DirNode[]; basePath: string; onSelect: (path: string) => void; selected: string; depth?: number
}) {
  return (
    <div className="space-y-0.5">
      {entries.map(e => {
        const isSelected = selected === e.path
        return (
          <div key={e.path}>
            <button
              onClick={() => e.is_dir && onSelect(e.path)}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-[6px] text-[12px] transition-colors hover:bg-[var(--accent)]"
              style={{
                backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                color: isSelected ? 'var(--primary)' : 'var(--foreground-secondary)',
                paddingLeft: `${12 + depth * 16}px`,
                cursor: e.is_dir ? 'pointer' : 'default',
              }}
            >
              <span style={{ color: e.is_dir ? 'var(--gold)' : 'var(--foreground-tertiary)', fontSize: '14px' }}>
                {e.is_dir ? '📁' : '📄'}
              </span>
              <span className="truncate">{e.name}</span>
            </button>
            {e.subdirs && e.subdirs.length > 0 && (
              <DirTree entries={e.subdirs} basePath={basePath} onSelect={onSelect} selected={selected} depth={depth + 1} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── 归档 ──────────────────────────────────────────────────
function StorageTreeView({ root }: { root: StorageTreeNode }) {
  const renderNode = (node: StorageTreeNode, depth: number) => {
    const isDir = node.is_dir
    return (
      <div key={node.path}>
        <div
          className="flex items-center gap-2 rounded-[6px]"
          style={{ paddingLeft: depth * 24 }}
        >
          {isDir ? (
            <Folder className="w-[17px] h-[17px] shrink-0" style={{ color: 'var(--gold)' }} />
          ) : (
            <FileText className="w-[17px] h-[17px] shrink-0" style={{ color: 'var(--foreground-tertiary)' }} />
          )}
          <span
            className="truncate"
            style={{
              fontSize: depth <= 1 ? 14 : 13,
              fontWeight: depth <= 1 ? 600 : 500,
              color: isDir ? 'var(--foreground)' : 'var(--foreground-secondary)',
            }}
          >
            {node.name}{isDir ? '/' : ''}
          </span>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="mt-[3px] space-y-[3px]">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
      )}
    </div>
  )
}
  return renderNode(root, 0)
}

function ProxyPanel() {
  const { settings, setSetting } = useSettings()
  const [proxyMode, setProxyMode] = useState(settings.proxy_mode || 'none')
  const [proxyProto, setProxyProto] = useState(settings.proxy_proto || 'http')
  const [proxyHost, setProxyHost] = useState(settings.proxy_host || '')
  const [proxyPort, setProxyPort] = useState(settings.proxy_port || '1080')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setProxyMode(settings.proxy_mode || 'none')
    setProxyProto(settings.proxy_proto || 'http')
    setProxyHost(settings.proxy_host || '')
    setProxyPort(settings.proxy_port || '1080')
  }, [settings.proxy_mode, settings.proxy_proto, settings.proxy_host, settings.proxy_port])

  const handleSave = async () => {
    setSaving(true)
    setSetting('proxy_mode', proxyMode)
    if (proxyMode === 'custom') {
      setSetting('proxy_proto', proxyProto)
      setSetting('proxy_host', proxyHost)
      setSetting('proxy_port', proxyPort)
    }
    await new Promise(r => setTimeout(r, 300))
    setSaving(false)
    toast.success('代理设置已保存，重启服务后生效')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'var(--teal)' }} />
        <h2 className="text-[20px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>代理设置</h2>
      </div>

      <div className="rounded-[16px]" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '24px' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>代理模式</div>
              <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>选择 IMAP 连接使用的代理方式</div>
            </div>
          </div>
          <div className="flex items-center" style={{ gap: '8px' }}>
            {([
              { value: 'none', label: '不使用代理', icon: X },
              { value: 'global', label: '全局代理', icon: Globe },
              { value: 'custom', label: '自定义代理', icon: Settings },
            ] as const).map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  onClick={() => setProxyMode(opt.value)}
                  className="flex items-center gap-2 px-4 h-10 rounded-lg transition-all text-[13px]"
                  style={{
                    backgroundColor: proxyMode === opt.value ? 'var(--primary)' : 'var(--muted)',
                    color: proxyMode === opt.value ? '#ffffff' : 'var(--foreground-secondary)',
                    fontFamily: proxyMode === opt.value ? 'SourceHanSans-SemiBold, system-ui' : 'SourceHanSans-Medium, system-ui',
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: proxyMode === opt.value ? '#ffffff' : 'var(--foreground-secondary)' }} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {proxyMode === 'custom' && (
          <div style={{ padding: '24px', borderTop: '1px solid var(--card-border)' }}>
            <div className="text-[15px] font-semibold mb-4" style={{ color: 'var(--foreground)' }}>自定义代理</div>
            <div className="flex items-center gap-3 flex-wrap">
              <CustomSelect
                value={proxyProto}
                width={110}
                onChange={v => setProxyProto(v)}
                options={[
                  { value: 'http', label: 'HTTP' },
                  { value: 'https', label: 'HTTPS' },
                  { value: 'socks5', label: 'SOCKS5' },
                ]}
              />
              <input
                value={proxyHost}
                onChange={e => setProxyHost(e.target.value)}
                placeholder="代理地址，如 127.0.0.1"
                className="flex-1 min-w-[160px] h-10 px-3 rounded-lg outline-none text-[13px]"
                style={{ backgroundColor: 'var(--muted)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
              />
              <input
                value={proxyPort}
                onChange={e => setProxyPort(e.target.value)}
                placeholder="端口"
                className="w-24 h-10 px-3 rounded-lg outline-none text-[13px]"
                style={{ backgroundColor: 'var(--muted)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
              />
            </div>
          </div>
        )}

        <div style={{ padding: '24px', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 h-10 bg-[var(--primary)] text-white rounded-[8px] text-[14px] font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? '保存中…' : '保存设置'}
          </button>
        </div>
      </div>

      <div className="text-[12px]" style={{ color: 'var(--foreground-tertiary)' }}>
        <div>• 不使用代理：直连邮件服务器</div>
        <div className="mt-1">• 全局代理：自动使用系统环境变量 http_proxy/https_proxy</div>
        <div className="mt-1">• 自定义代理：填写代理服务器协议、地址和端口，支持 HTTP/HTTPS/SOCKS5</div>
        <div className="mt-1">• 修改代理设置后，新添加的账号将生效</div>
      </div>
    </div>
  )
}

function StoragePanel() {
  const [stats, setStats] = useState<MailStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { settings, setSetting } = useSettings()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [editingPath, setEditingPath] = useState(false)
  const [pathInput, setPathInput] = useState('')
  const [dirEntries, setDirEntries] = useState<DirNode[]>([])
  const [dirLoading, setDirLoading] = useState(false)
  const [dirError, setDirError] = useState('')
  const [treeOpen, setTreeOpen] = useState(false)
  const treeRef = useRef<HTMLDivElement>(null)
  const [storageRoot, setStorageRoot] = useState<StorageTreeNode | null>(null)

  const archiveDir = settings.archive_dir || ''
  const archivePath = settings.archive_path || archiveDir || ''
  const hasAccount = accounts.length > 0

  useEffect(() => {
    const loadAccounts = () => {
      api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {})
    }
    loadAccounts()
    const ch = new BroadcastChannel('lzmail_accounts')
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'accounts:updated') loadAccounts()
    }
    ch.addEventListener('message', handler)
    return () => ch.close()
  }, [])

  useEffect(() => {
    api.mails.stats().then(d => setStats(d ?? null)).catch(() => {}).finally(() => setLoading(false))
    api.storage.tree(archivePath).then(res => setStorageRoot(res.root)).catch(() => setStorageRoot(null))
  }, [archivePath])

  // archivePath 异步加载完成后同步到 pathInput（仅在尚未编辑时同步）
  const pathInputTouched = useRef(false)

  const reloadTree = () => {
    api.storage.tree(archivePath).then(res => setStorageRoot(res.root)).catch(() => setStorageRoot(null))
  }
  useEffect(() => {
    if (archivePath && !pathInputTouched.current) setPathInput(archivePath)
  }, [archivePath])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (treeRef.current && !treeRef.current.contains(e.target as Node)) {
        setTreeOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadDirTree = async (path: string) => {
    if (!path) return
    setDirLoading(true)
    setDirError('')
    try {
      const res = await api.storage.list(path)
      setDirEntries(res.entries)
      setTreeOpen(true)
    } catch (e: any) {
      setDirError(e.message)
      setDirEntries([])
    } finally {
      setDirLoading(false)
    }
  }

  const handleStartEdit = () => {
    if (!hasAccount) {
      toast.error('请先添加邮箱账号后再修改归档目录')
      return
    }
    setPathInput(archivePath)
    setEditingPath(true)
    // 从服务端实际根目录加载目录树，避免 archive_path 超出允许根目录时报错
    loadDirTree(archiveDir)
  }

  const handleSavePath = () => {
    const p = pathInput.trim()
    if (!p) return
    setSetting('archive_path', p)
    setEditingPath(false)
    setTreeOpen(false)
    toast.success('归档目录已更新')
  }

  const handleCancelEdit = () => {
    setEditingPath(false)
    setTreeOpen(false)
    setDirError('')
  }

  const handleSelectDir = (path: string) => {
    setPathInput(path)
    loadDirTree(path)
  }

  const storageBytes = stats?.storage_bytes ?? 0
  const totalEmails = stats?.total_emails ?? 0
  const storageCap = stats?.storage_limit || 0
  const storagePct = storageCap > 0 ? Math.min((storageBytes / storageCap) * 100, 100) : 0
  const contactCount = stats?.contact_count ?? 0

  function formatBytes(b: number): string {
    if (b === 0) return '0 B'
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(b) / Math.log(k))
    return (b / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
  }

  const cleanupDays = parseInt(settings.auto_cleanup_days || '30')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'var(--success)' }} />
        <h2 className="text-[20px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>归档目录</h2>
      </div>

      <div className="rounded-[16px]" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {/* Archive path */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>归档根目录</div>
              <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>邮件 .eml 文件与附件的存储路径</div>
            </div>
            {!editingPath ? (
              <button onClick={handleStartEdit} disabled={!hasAccount} title={!hasAccount ? '请先添加邮箱账号' : '点击修改归档目录'}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all hover:opacity-80 disabled:cursor-not-allowed disabled:hover:opacity-100"
                style={{ backgroundColor: 'var(--accent)', border: '0.7px solid var(--card-border)', color: 'var(--foreground-secondary)', opacity: hasAccount ? 1 : 0.5 }}>
                <Folder className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                <span className="font-mono">{hasAccount ? archivePath : '添加账号后显示'}</span>
                <Edit className="w-3.5 h-3.5" style={{ color: 'var(--foreground-tertiary)' }} />
              </button>
            ) : (
              <div className="flex-1 max-w-[600px] ml-8">
                <div className="flex items-center gap-2">
                  <input value={pathInput} onChange={e => { pathInputTouched.current = true; setPathInput(e.target.value) }}
                    className="flex-1 h-10 px-3 rounded-lg outline-none text-[13px] font-mono bg-transparent"
                    style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
                    placeholder="输入归档路径，如 ~/lzmail/archives"
                  />
                  <button onClick={handleSavePath}
                    className="px-3 h-10 rounded-lg text-[12px] font-medium transition-all"
                    style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
                  >确定</button>
                  <button onClick={handleCancelEdit}
                    className="px-3 h-10 rounded-lg text-[12px] font-medium transition-all"
                    style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground-tertiary)' }}
                  >取消</button>
                </div>
                <div className="relative mt-2" ref={treeRef}>
                  {dirLoading && (
                    <div className="text-[12px] py-2" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
                  )}
                  {dirError && (
                    <div className="text-[12px] py-2" style={{ color: 'var(--danger)' }}>{dirError}</div>
                  )}
                  {treeOpen && dirEntries.length > 0 && (
                    <div className="rounded-[8px] p-2 max-h-48 overflow-y-auto"
                      style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--background)' }}>
                      <div className="text-[11px] font-semibold px-2 pb-1" style={{ color: 'var(--muted-foreground)' }}>目录层级</div>
                      <DirTree entries={dirEntries} basePath={pathInput} onSelect={handleSelectDir} selected={pathInput} />
                    </div>
                  )}
                  {treeOpen && dirEntries.length === 0 && !dirLoading && !dirError && (
                    <div className="text-[12px] py-2" style={{ color: 'var(--muted-foreground)' }}>空目录</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {editingPath && (
            <div className="mt-3 px-3 py-2 rounded-lg text-[11px] leading-5" style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground-tertiary)' }}>
              修改归档路径后，新建的邮件将存储到新目录。已有邮件仍保留在原路径。重启服务后生效。
            </div>
          )}
        </div>

        {/* Directory structure */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>目录结构</div>
              <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>当前归档文件的组织方式预览</div>
            </div>
            <button onClick={reloadTree}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)' }}>
              <RefreshCw className="w-3.5 h-3.5" /> 刷新
            </button>
          </div>
          <div className="mt-4 rounded-[12px] p-5 max-h-[360px] overflow-auto"
            style={{ backgroundColor: 'var(--accent)', border: '0.7px solid var(--card-border)' }}>
            {storageRoot ? (
              <StorageTreeView root={storageRoot} />
            ) : (
              <div className="text-[12px] py-2" style={{ color: 'var(--muted-foreground)' }}>暂无可预览的目录结构</div>
            )}
          </div>
        </div>

        {/* Storage stats */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="text-[15px] font-semibold mb-4" style={{ color: 'var(--foreground)' }}>存储统计</div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{formatBytes(storageBytes * 0.75)}</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>邮件 .eml</div>
            </div>
            <div className="text-center">
              <div className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{formatBytes(storageBytes * 0.25)}</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>附件</div>
            </div>
            <div className="text-center">
              <div className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{totalEmails.toLocaleString()}</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>邮件总数</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--foreground-tertiary)' }}>已使用</span>
                <span style={{ color: 'var(--foreground)' }}>{formatBytes(storageBytes)} / {formatBytes(storageCap)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${storagePct}%`, backgroundColor: 'var(--gold)' }} />
              </div>
            </div>
            <div className="text-center min-w-[80px]">
              <div className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{contactCount.toLocaleString()}</div>
              <div className="flex items-center justify-center gap-1 mt-1" style={{ color: 'var(--foreground-tertiary)' }}>
                <Contact className="w-3 h-3" />
                <span className="text-[11px]">联系人</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auto cleanup */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>自动清理</div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>定期清理过期归档文件</div>
          </div>
          <CustomSelect
            value={String(cleanupDays)}
            width={140}
            onChange={(v) => setSetting('auto_cleanup_days', v)}
            options={[
              { value: '0', label: '永不清理' },
              { value: '30', label: '30 天' },
              { value: '90', label: '90 天' },
              { value: '180', label: '180 天' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

// ── 关于 ──────────────────────────────────────────────────
function AboutPanel() {
  const [appVersion, setAppVersion] = useState('')
  useEffect(() => {
    fetch(`/version.json?t=${Date.now()}`).then(r => r.json()).then(d => setAppVersion(d.version)).catch(() => {})
  }, [])
  const techInfo = [
    { title: '技术栈', color: 'var(--primary)', items: [
      '前端：Next.js + React + Tailwind CSS',
      '后端：Go (Echo框架)',
      '数据库：SQLite (WAL模式)',
      '部署：Docker 容器化',
    ]},
    { title: '邮件协议', color: 'var(--success)', items: [
      'IMAP (IDLE + Poll)',
      'SMTP 发信',
      'SSE 实时推送',
      'OAuth 2.0 / 授权码',
    ]},
    { title: '运行信息', color: 'var(--teal)', items: [
      '运行时长：持续运行中',
    ]},
  ]

  const links = [
    { icon: GitRepository, label: 'GitHub', href: 'https://github.com/sikenali/lzmail' },
    { icon: BookRead, label: '使用文档', href: 'https://github.com/sikenali/lzmail#readme' },
    { icon: ChatSmile3, label: '反馈问题', href: 'https://github.com/sikenali/lzmail/issues' },
  ]
  const updateLink = { icon: AlarmWarning, label: '检查更新', href: 'https://github.com/sikenali/lzmail/releases' }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-[4px] h-6 rounded-[2px]" style={{ backgroundColor: 'var(--gold)' }} />
        <h2 className="text-[20px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>关于</h2>
      </div>
      <div className="rounded-[16px] overflow-hidden" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '24px' }}>
        {/* 产品信息区 */}
        <div className="flex items-center gap-6 pb-6" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
            <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px' }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#ffffff" />
              <polyline points="22,6 12,13 2,6" fill="none" stroke="var(--primary)" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[24px] font-bold leading-none" style={{ color: 'var(--foreground)' }}>LZMail</h2>
              <span className="text-xs px-3 py-1 rounded-lg font-semibold" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>{appVersion ? `v${appVersion}` : 'v1.0.0'}</span>
            </div>
            <p className="text-[14px] mt-2" style={{ color: 'var(--foreground-tertiary)' }}>统一管理 Gmail、Outlook、QQ邮箱、网易、iCloud 等多平台邮件，数据完全存储于本地，隐私可控。</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--muted-foreground)' }}>@2026 Web邮件客户端 Powered by LightOS</p>
          </div>
        </div>

        {/* 技术信息：三列彩色点列表 */}
        <div className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            {techInfo.map(col => (
              <div key={col.title}>
                <div className="text-[12px] font-semibold mb-3" style={{ color: 'var(--muted-foreground)' }}>{col.title}</div>
                <div className="space-y-2.5">
                  {col.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.25 h-2.25 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                      <span className="text-[13px]" style={{ color: 'var(--foreground-secondary)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 链接按钮 */}
        <div className="pt-4">
          <div className="flex items-center" style={{ gap: '16px' }}>
            {links.map(link => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg transition-all"
                style={{ backgroundColor: 'var(--muted)', padding: '8px 16px', gap: '8px' }}
              >
                <link.icon className="w-[18px] h-[18px]" style={{ color: 'var(--foreground)' }} />
                <span className="text-[13px] font-medium" style={{ color: 'var(--foreground)' }}>{link.label}</span>
              </a>
            ))}
            <a href={updateLink.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg transition-all"
              style={{ backgroundColor: 'var(--danger-bg)', padding: '8px 16px', gap: '8px' }}
            >
              <updateLink.icon className="w-[18px] h-[18px]" style={{ color: 'var(--primary)' }} />
              <span className="text-[13px] font-medium" style={{ color: 'var(--primary)' }}>{updateLink.label}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────
const TABS = [
  { key: 'account',  label: '账号管理', icon: User },
  { key: 'appearance', label: '外观设置', icon: Palette },
  { key: 'proxy',    label: '代理设置',  icon: Globe },
  { key: 'storage',  label: '归档目录',    icon: Archive },
  { key: 'about',    label: '关于',    icon: Info },
] as const

function SettingsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { settings } = useSettings()
  const [active, setActive] = useState('account')
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [pressing, setPressing] = useState<number | null>(null)
  const animationsEnabled = (settings.animations || 'true') === 'true'

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && Object.hasOwn({ account: 1, appearance: 1, storage: 1, about: 1 }, tab)) setActive(tab)
  }, [searchParams])

  const panels: Record<string, React.FC> = { account: AccountPanel, appearance: AppearancePanel, proxy: ProxyPanel, storage: StoragePanel, about: AboutPanel }
  const Panel = panels[active]

  const handleTabClick = (key: string) => {
    setActive(key)
    router.replace(`/settings?tab=${key}`)
  }

  return (
    <AppShell>
      <div className="flex" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        {/* 左侧竖列标签 */}
        <div className="w-[200px] shrink-0 py-8 px-4 relative" style={{ borderRight: '1px solid var(--card-border)' }}>
          <div className="text-[13px] font-semibold mb-4" style={{ color: 'var(--foreground-tertiary)', paddingLeft: 12 }}>设置</div>
          <div className="space-y-1" style={{ position: 'relative' }}>
            {/* Jelly 滑移指示器 */}
            {(() => {
              const activeIdx = TABS.findIndex(t => t.key === active)
              const activeEl = tabBtnRefs.current[activeIdx]
              const top = activeEl ? activeEl.offsetTop + 2 : 0
              const pressedEl = pressing !== null ? tabBtnRefs.current[pressing] : null
              const pressedHeight = pressedEl ? Math.max(44, pressedEl.offsetHeight - 4) : null
              return (
                <NavSlider
                  enabled={animationsEnabled}
                  top={top}
                  height={44}
                  pressedHeight={pressedHeight}
                  className="left-1.5 right-1.5"
                  backgroundColor="var(--primary)"
                  borderRadius={10}
                />
              )
            })()}
            {TABS.map((tab, i) => {
              const Icon = tab.icon
              const isActive = active === tab.key
              const isPressed = pressing === i
              return (
                <button key={tab.key}
                  ref={el => { tabBtnRefs.current[i] = el }}
                  onClick={() => handleTabClick(tab.key)}
                  onMouseDown={() => setPressing(i)}
                  onMouseUp={() => setPressing(null)}
                  onMouseLeave={() => setPressing(null)}
                  className="flex items-center gap-3 w-full h-[44px] px-3 rounded-[10px] text-[14px] font-medium relative z-10"
                  style={{
                    backgroundColor: 'transparent',
                    color: isActive ? '#ffffff' : 'var(--foreground-secondary)',
                    textAlign: 'left',
                    ...(animationsEnabled ? {} : { transition: 'color 0.2s ease, background-color 0.2s ease' }),
                  }}
                >
                  {animationsEnabled ? (
                    <motion.span
                      animate={isPressed ? { scale: [1, 0.85, 1.05, 1], rotate: [0, -5, 5, 0] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                    </motion.span>
                  ) : (
                    <span style={{ display: 'inline-flex' }}>
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                    </span>
                  )}
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 py-8 px-10 overflow-auto">
          <div className="max-w-[720px]">
            <Panel />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中...</div></div>}>
      <SettingsPageInner />
    </Suspense>
  )
}

export const dynamic = 'force-dynamic'
