'use client'
import { useState, useEffect } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useIsMobile } from '@/hooks/useIsMobile'

export function AboutSettings() {
  const [appVersion, setAppVersion] = useState('')
  const currentYear = new Date().getFullYear()
  const isMobile = useIsMobile()

  useEffect(() => {
    fetch(`/version.json?t=${Date.now()}`).then(r => r.json()).then(d => {
      if (d.version) setAppVersion(`V${d.version}`)
    }).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1620 }}>
      {/* About Card — DESIGN.md §A.5：min-height:480px，由内容决定高度，避免长文案被挤压 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg-card)',
          border: '0.6px solid var(--color-border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-md)',
          minHeight: isMobile ? 420 : 480,
          padding: isMobile ? '32px 20px' : '40px 32px',
        }}
      >
        {/* Logo Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? 96 : 118,
            height: isMobile ? 96 : 118,
            borderRadius: 9999,
            border: '0.6px solid rgba(var(--tech-cyan-rgb), 0.3)',
            backgroundColor: 'rgba(var(--tech-cyan-rgb), 0.10)',
            boxShadow: '0 0 28px rgba(var(--tech-cyan-rgb), 0.22)',
          }}
        >
          <img
            src="/logo.png"
            alt="懒猫微邮"
            width={isMobile ? 44 : 52}
            height={isMobile ? 44 : 52}
            style={{ width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, display: 'block' }}
          />
        </div>

        {/* Brand Name */}
        <div style={{ marginTop: isMobile ? 24 : 32, fontSize: isMobile ? 21 : 24, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.2, fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
          懒猫微邮
        </div>

        {/* Slogan */}
        <div style={{ marginTop: isMobile ? 12 : 16, fontSize: isMobile ? 14 : 16, color: 'var(--foreground-secondary)', lineHeight: 1.4 }}>
          专业的Web邮箱客户端
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
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: isMobile ? 24 : 32, cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
          >
            <i className="ri-github-line" style={{ fontSize: isMobile ? 30 : 34, color: 'var(--tech-cyan)', transition: 'text-shadow var(--t-fast) ease' }}></i>
          </a>
        </Tooltip>

        {/* Copyright */}
        <div style={{ marginTop: isMobile ? 24 : 32, fontSize: 14, color: 'var(--foreground-tertiary)' }}>
          © {currentYear} 懒猫微邮 · sikenali
        </div>
      </div>
    </div>
  )
}
