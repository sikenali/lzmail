'use client'
import { useState, useEffect } from 'react'
import { Tooltip } from '@/components/Tooltip'

export function AboutSettings() {
  const [appVersion, setAppVersion] = useState('')
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetch(`/version.json?t=${Date.now()}`).then(r => r.json()).then(d => {
      if (d.version) setAppVersion(`V${d.version}`)
    }).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1620 }}>
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
          <img
            src="/logo.png"
            alt="懒猫微邮"
            width={52}
            height={52}
            style={{ width: 52, height: 52, display: 'block' }}
          />
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
          版本：{appVersion || '开发版'}
        </div>

        {/* GitHub Link */}
        <Tooltip text="访问 GitHub 仓库" side="bottom">
          <a
            href="https://github.com/sikenali/lzmail"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="访问 GitHub 仓库"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 32, cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
          >
            <i className="ri-github-line" style={{ fontSize: 34, color: 'var(--foreground-secondary)' }}></i>
          </a>
        </Tooltip>

        {/* Copyright */}
        <div style={{ marginTop: 32, fontSize: 14, color: 'var(--foreground-tertiary)' }}>
          © {currentYear} 懒猫微邮 · sikenali
        </div>
      </div>
    </div>
  )
}
