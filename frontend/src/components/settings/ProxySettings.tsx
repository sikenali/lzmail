'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { X, Globe, Settings } from '@/lib/icons'

export function ProxySettings() {
  const { settings } = useSettings()
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
    if (proxyMode === 'custom' && !proxyHost.trim()) {
      toast.error('请填写代理服务器地址')
      return
    }
    const portNum = Number(proxyPort)
    if (proxyMode === 'custom' && (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535)) {
      toast.error('代理端口需为 1-65535 的整数')
      return
    }
    setSaving(true)
    try {
      // 单次原子写，避免 4 个并发 POST 相互覆盖（lost update）
      const payload: Record<string, string> = { proxy_mode: proxyMode }
      if (proxyMode === 'custom') {
        payload.proxy_proto = proxyProto
        payload.proxy_host = proxyHost.trim()
        payload.proxy_port = String(portNum)
      }
      await api.settings.set(payload)
      toast.success('代理设置已保存，重启服务后生效')
    } catch (e: any) {
      toast.error(e?.message || '代理设置保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ borderRadius: 16, border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>代理模式</div>
              <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>选择 IMAP 连接使用的代理方式</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {([
              { value: 'none', label: '不使用代理', icon: X },
              { value: 'global', label: '全局代理', icon: Globe },
              { value: 'custom', label: '自定义代理', icon: Settings },
            ] as const).map(opt => {
              const Icon = opt.icon
              return (
                <button key={opt.value} onClick={() => setProxyMode(opt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 16px',
                    height: 40,
                    borderRadius: 8,
                    fontSize: 13,
                    backgroundColor: proxyMode === opt.value ? 'var(--primary)' : 'var(--muted)',
                    color: proxyMode === opt.value ? '#ffffff' : 'var(--foreground-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon style={{ fontSize: 16, width: 16, height: 16, flexShrink: 0, color: proxyMode === opt.value ? '#ffffff' : 'var(--foreground-secondary)' }} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
        {proxyMode === 'custom' && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>自定义代理</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
              <CustomSelect value={proxyProto} width={110} onChange={v => setProxyProto(v)}
                options={[{ value: 'http', label: 'HTTP' }, { value: 'https', label: 'HTTPS' }, { value: 'socks5', label: 'SOCKS5' }]} />
              <input value={proxyHost} onChange={e => setProxyHost(e.target.value)} placeholder="代理地址，如 127.0.0.1"
                style={{ flex: 1, minWidth: 160, height: 40, padding: '0 12px', borderRadius: 8, outline: 'none', fontSize: 13, backgroundColor: 'var(--muted)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
              <input value={proxyPort} onChange={e => setProxyPort(e.target.value)} placeholder="端口"
                style={{ width: 96, height: 40, padding: '0 12px', borderRadius: 8, outline: 'none', fontSize: 13, backgroundColor: 'var(--muted)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }} />
            </div>
          </div>
        )}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSave} disabled={saving}
            style={{
              padding: '0 16px',
              height: 40,
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {saving ? '保存中…' : '保存设置'}
          </button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--foreground-tertiary)' }}>
        <div>• 不使用代理：直连邮件服务器</div>
        <div style={{ marginTop: 4 }}>• 全局代理：自动使用系统环境变量 http_proxy/https_proxy</div>
        <div style={{ marginTop: 4 }}>• 自定义代理：填写代理服务器协议、地址和端口，支持 HTTP/HTTPS/SOCKS5</div>
        <div style={{ marginTop: 4 }}>• 修改代理设置后，新添加的账号将生效</div>
      </div>
    </div>
  )
}
