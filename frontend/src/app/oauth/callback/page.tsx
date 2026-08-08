'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
      setStatus('form')
    }).catch((e: any) => {
      setStatus('error')
      setMessage(e?.message || '授权失败，请重试')
    })
  }, [searchParams])

  const handleSubmit = async () => {
    if (!email.trim() || !tokenData) return
    setStatus('loading')
    setMessage('正在保存账号...')
    try {
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      const isGmail = tokenData.provider === 'gmail'
      await api.accounts.create({
        name,
        email: email.trim(),
        imap_host: isGmail ? 'imap.gmail.com' : 'outlook.office365.com',
        smtp_host: isGmail ? 'smtp.gmail.com' : 'smtp.office365.com',
        username: email.trim(),
        auth_method: 'oauth2',
        provider: tokenData.provider,
        access_token: tokenData.access_token,
        token_type: 'Bearer',
        expiry: expiresAt,
        scope: tokenData.scope || '',
      })
      setStatus('success')
      setMessage('授权成功，正在跳转...')
      setTimeout(() => router.push('/settings'), 1200)
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
              <button onClick={() => router.push('/settings')}
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

  return (
    <AppShell>
      <div className="flex items-center justify-center py-20" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        <div className="text-center space-y-4" style={{ color: 'var(--foreground)' }}>
          <div className="text-4xl">{status === 'loading' ? '⏳' : status === 'success' ? '✅' : '❌'}</div>
          <div className="text-lg font-medium">{message}</div>
          {status === 'error' && (
            <button onClick={() => router.push('/settings')}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ border: '1px solid var(--card-border)', backgroundColor: 'var(--muted)', color: 'var(--foreground-tertiary)' }}>
              返回设置
            </button>
          )}
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
            <div className="text-4xl">⏳</div>
            <div className="text-lg font-medium">正在处理 OAuth 授权...</div>
          </div>
        </div>
      </AppShell>
    }>
      <OAuthCallbackInner />
    </Suspense>
  )
}
