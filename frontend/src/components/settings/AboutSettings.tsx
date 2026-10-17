'use client'
import { useState, useEffect } from 'react'

export function AboutSettings() {
  const [appVersion, setAppVersion] = useState('V1.0.0')
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetch(`/version.json?t=${Date.now()}`).then(r => r.json()).then(d => {
      if (d.version) setAppVersion(`V${d.version}`)
    }).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1620 }}>
      {/* Page Header Card */}
      <div style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--foreground-tertiary)' }}>
              <span>首页</span>
              <span style={{ color: 'var(--foreground-tertiary)' }}>/</span>
              <span>设置中心</span>
              <span style={{ color: 'var(--foreground-tertiary)' }}>/</span>
              <span style={{ color: 'var(--foreground-secondary)', fontWeight: 500 }}>关于</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--foreground)', margin: '12px 0 0 0', letterSpacing: -0.5, lineHeight: 1.2 }}>关于</h1>
              <p style={{ fontSize: 15, color: 'var(--foreground-secondary)', margin: '8px 0 0 0' }}>版本信息、开源仓库与版权声明</p>
            </div>
          </div>
        </div>
      </div>

      {/* About Card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--card)',
          border: '0.7px solid var(--card-border)',
          borderRadius: 16,
          height: 525,
        }}
      >
        {/* Logo Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 118,
            height: 118,
            borderRadius: 9999,
            border: '0.7px solid var(--card-border)',
            backgroundColor: 'var(--primary-light)',
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 52, height: 52 }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#C43D3D" />
            <polyline points="22,6 12,13 2,6" fill="none" stroke="#ffffff" strokeWidth="2" />
          </svg>
        </div>

        {/* Brand Name */}
        <div style={{ marginTop: 32, fontSize: 24, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.2 }}>
          懒猫微邮
        </div>

        {/* Slogan */}
        <div style={{ marginTop: 16, fontSize: 16, color: 'var(--foreground-secondary)', lineHeight: 1.4 }}>
          邮件Web管理平台
        </div>

        {/* Unofficial tag */}
        <div style={{ marginTop: 8, fontSize: 14, color: 'var(--foreground-tertiary)', lineHeight: 1.4 }}>
          Unofficial Web Client
        </div>

        {/* Version */}
        <div style={{ marginTop: 8, fontSize: 14, color: 'var(--foreground-tertiary)', lineHeight: 1.4 }}>
          版本：{appVersion}
        </div>

        {/* GitHub Link */}
        <a
          href="https://github.com/sikenali/lzmail"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 32, cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
          title="访问 GitHub 仓库"
        >
          <i className="ri-github-line" style={{ fontSize: 34, color: 'var(--foreground-secondary)' }}></i>
        </a>

        {/* Copyright */}
        <div style={{ marginTop: 32, fontSize: 14, color: 'var(--foreground-tertiary)' }}>
          © {currentYear} 懒猫微邮 · sikenali
        </div>
      </div>
    </div>
  )
}
