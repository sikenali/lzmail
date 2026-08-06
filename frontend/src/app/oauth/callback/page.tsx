'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('正在处理 OAuth 授权...')

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

    api.oauth.callback(provider, code, state).then(async (resp) => {
      if (!resp?.access_token) {
        setStatus('error')
        setMessage('获取授权信息失败')
        return
      }
      const expiresAt = new Date(Date.now() + (resp.expires_in || 3600) * 1000).toISOString()
      const isGmail = provider === 'gmail'
      await api.accounts.create({
        name: isGmail ? 'Gmail 账号' : 'Outlook 账号',
        imap_host: isGmail ? 'imap.gmail.com' : 'outlook.office365.com',
        smtp_host: isGmail ? 'smtp.gmail.com' : 'smtp.office365.com',
        username: isGmail ? 'user@gmail.com' : 'user@outlook.com',
        auth_method: 'oauth2',
        provider: provider,
        access_token: resp.access_token,
        token_type: (resp as any).token_type || 'Bearer',
        expiry: expiresAt,
        scope: resp.scope || '',
      })
      setStatus('success')
      setMessage('OAuth 授权成功，正在跳转...')
      setTimeout(() => router.push('/settings'), 1500)
    }).catch((e: any) => {
      setStatus('error')
      setMessage(e?.message || '授权失败，请重试')
    })
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="text-center space-y-4" style={{ color: 'var(--foreground)' }}>
        <div className="text-4xl">
          {status === 'loading' ? '⏳' : status === 'success' ? '✅' : '❌'}
        </div>
        <div className="text-lg font-medium">{message}</div>
        <div className="text-sm" style={{ color: 'var(--foreground-tertiary)' }}>
          {status === 'error' && (
            <button onClick={() => router.push('/settings')}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ border: '1px solid var(--card-border)', backgroundColor: 'var(--muted)' }}>
              返回设置
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
