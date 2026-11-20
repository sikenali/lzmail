'use client'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile } from '@/hooks/useIsMobile'

export function Modal({
  open,
  onClose,
  icon,
  title,
  subtitle,
  width = 900,
  height = '86vh',
  maxHeight,
  headerExtra,
  footer,
  children,
  closeOnClickOverlay = true,
  closeOnEsc = true,
}: {
  open: boolean
  onClose: () => void
  icon?: React.ReactNode
  title?: string
  subtitle?: string
  width?: number
  height?: string
  maxHeight?: number
  headerExtra?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  closeOnClickOverlay?: boolean
  closeOnEsc?: boolean
}) {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open || !closeOnEsc) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, closeOnEsc])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', animation: 'fadeIn 0.25s ease', zIndex: 1000 }}
      onClick={closeOnClickOverlay ? onClose : undefined}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: isMobile ? '100%' : width,
          maxWidth: isMobile ? '100%' : '94vw',
          height: isMobile ? '100dvh' : height,
          maxHeight: isMobile ? undefined : (maxHeight ? `${maxHeight}px` : undefined),
          backgroundColor: 'var(--color-bg-white)',
          border: isMobile ? 'none' : '0.6px solid var(--color-border)',
          borderRadius: isMobile ? 0 : 'var(--modal-radius)',
          boxShadow: isMobile ? 'none' : 'var(--modal-shadow)',
          overflow: 'hidden',
          animation: 'scaleIn 0.25s var(--ease)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || icon) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              padding: isMobile ? '12px 16px' : '20px 24px',
              paddingTop: isMobile ? 'calc(12px + env(safe-area-inset-top))' : 20,
              flexShrink: 0,
              borderBottom: '1px solid var(--color-border-soft)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, minWidth: 0 }}>
              {icon && (
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, backgroundColor: 'rgba(var(--tech-cyan-rgb), 0.12)', border: '0.6px solid rgba(var(--tech-cyan-rgb), 0.3)', borderRadius: 9999, flexShrink: 0 }}
                >
                  {icon}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                {title && (
                  <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.3px', color: 'var(--color-text-primary)', margin: 0, lineHeight: '24px', fontFamily: 'var(--font-display)' }}>
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, lineHeight: '18px', fontFamily: 'var(--font-family-cn)' }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {headerExtra}
              <button
                onClick={onClose}
                aria-label="关闭"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, backgroundColor: 'transparent', borderRadius: 9999, color: 'var(--color-text-muted)', border: 'none', flexShrink: 0, cursor: 'pointer', transition: 'background-color var(--t-fast) ease, color var(--t-fast) ease' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(var(--tech-cyan-rgb), 0.12)'; e.currentTarget.style.color = 'var(--tech-cyan)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
              >
                <i className="ri-close-line" style={{ fontSize: 18 }}></i>
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{ padding: isMobile ? '12px 16px' : '12px 24px', paddingBottom: isMobile ? 'calc(12px + env(safe-area-inset-bottom))' : 12, flexShrink: 0, borderTop: '1px solid var(--color-border-soft)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
