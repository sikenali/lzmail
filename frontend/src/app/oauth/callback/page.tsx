'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { AppShell } from '@/components/layout/AppShell'

function OAuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'form'>('loading')
  const [message, setMessage] = useState('正在处理 OAuth 授权...')
  const [tokenData, setTokenData] = useState<{
    provider: string
    access_token: string
    expires_in: number
    scope?: string
  } | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const storedState = sessionStorage.getItem('oauth_state')
    const provider = sessionStorage.getItem('oauth_provider') || 'gmail'
    sessionStorage.removeItem('oauth_state')
    sessionStorage.removeItem('oauth_provider')

    if (!state || state !== storedState) {
      setStatus('error')
      setMessage('授权状态校验失败，请重试')
      return
    }
    if (!code) {
      setStatus('error')
      setMessage('未收到授权码，请重试')
      return
    }

    api.oauth.callback(provider, code, state).then((resp) => {
      if (!resp?.access_token) {
        setStatus('error')
        setMessage('获取授权信息失败')
        return
      }
      const isGmail = resp.provider === 'gmail' || provider === 'gmail'
      setTokenData({
        provider: resp.provider || provider,
        access_token: resp.access_token,
        expires_in: resp.expires_in,
        scope: resp.scope,
      })
      setName(isGmail ? 'Gmail 账号' : 'Outlook 账号')
      setEmail('')
      setStatus('form')
    }).catch((e: any) => {
      setStatus('error')
      setMessage(e?.message || '授权失败，请重试')
    })
  }, [searchParams])

  // Countdown timer on success
  useEffect(() => {
    if (status !== 'success') return
    setCountdown(3)
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/#account')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [status, router])

  const handleSubmit = async () => {
    if (!email.trim()) { toast.error('请填写邮箱地址'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error('邮箱格式不正确'); return }
    if (!tokenData) return
    setStatus('loading')
    setMessage('正在保存账号...')
    try {
      const expSec = (Number.isFinite(tokenData.expires_in) && tokenData.expires_in > 0) ? tokenData.expires_in : 3600
      const expiresAt = new Date(Date.now() + expSec * 1000).toISOString()
      const isGmail = tokenData.provider === 'gmail'
      const result = await api.accounts.create({
        name,
        email: email.trim(),
        imap_host: isGmail ? 'imap.gmail.com' : 'outlook.office365.com',
        smtp_host: isGmail ? 'smtp.gmail.com' : 'smtp.office365.com',
        username: email.trim(),
        imap_port: 993,
        smtp_port: 587,
        auth_method: 'oauth2',
        provider: tokenData.provider,
        access_token: tokenData.access_token,
        token_type: 'Bearer',
        expiry: expiresAt,
        scope: tokenData.scope || '',
      })
      setStatus('success')
      setMessage('授权成功，正在跳转...')
      try { new BroadcastChannel('lzmail_accounts').postMessage({ type: 'accounts:updated' }) } catch {}
      if (result?.id) setTimeout(() => api.sync.account(result.id).catch(() => {}), 1000)
    } catch (e: any) {
      setStatus('error')
      setMessage(e?.message || '保存失败，请重试')
    }
  }

  if (status === 'form' && tokenData) {
    const isGmail = tokenData.provider === 'gmail'
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <div className="text-center">
              <div className="text-3xl mb-2">{isGmail ? '📧' : '📬'}</div>
              <div className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>授权成功</div>
              <div className="text-xs mt-1" style={{ color: 'var(--foreground-tertiary)' }}>请完善账号信息并保存</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--foreground-tertiary)' }}>账号名称</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                  style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--muted)', color: 'var(--foreground)' }} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--foreground-tertiary)' }}>邮箱地址（用于 IMAP/SMTP 登录）</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder={`user@${isGmail ? 'gmail.com' : 'outlook.com'}`}
                  className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                  style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--muted)', color: 'var(--foreground)' }} />
              </div>
              <button onClick={handleSubmit}
                className="w-full h-10 rounded-lg text-sm font-medium text-white hover:opacity-90"
                style={{ backgroundColor: 'var(--primary)' }}>
                保存账号
              </button>
              <button onClick={() => router.push('/#account')}
                className="w-full h-9 rounded-lg text-sm"
                style={{ border: '1px solid var(--card-border)', color: 'var(--foreground-tertiary)', backgroundColor: 'var(--muted)' }}>
                取消
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (status === 'success') {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgb(34,197,94)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>授权成功</div>
            <div className="text-sm" style={{ color: 'var(--foreground-tertiary)' }}>
              将在 {countdown} 秒后跳转...
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center justify-center py-20" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        <div className="text-center space-y-4" style={{ color: 'var(--foreground)' }}>
          {status === 'loading' ? (
            <>
              <div className="w-12 h-12 mx-auto rounded-full border-2 border-t-transparent flex items-center justify-center animate-spin"
                style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
              <div className="text-lg font-medium">{message}</div>
            </>
          ) : status === 'error' ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgb(239,68,68)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div className="text-lg font-medium">{message}</div>
              <button onClick={() => router.push('/#account')}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--card-border)', backgroundColor: 'var(--muted)', color: 'var(--foreground-tertiary)' }}>
                返回账号管理
              </button>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center py-20" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
          <div className="text-center space-y-4" style={{ color: 'var(--foreground)' }}>
            <div className="w-12 h-12 mx-auto rounded-full border-2 border-t-transparent flex items-center justify-center animate-spin"
              style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
            <div className="text-lg font-medium">正在处理 OAuth 授权...</div>
          </div>
        </div>
      </AppShell>
    }>
      <OAuthCallbackInner />
    </Suspense>
  )
}
