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
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease', zIndex: 1000 }}
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
          border: isMobile ? 'none' : '0.7px solid var(--color-border-soft)',
          borderRadius: isMobile ? 0 : 18,
          boxShadow: isMobile ? 'none' : '0 12px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'scaleIn 0.3s ease',
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
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, backgroundColor: 'var(--color-primary-soft)', borderRadius: 12, flexShrink: 0 }}
                >
                  {icon}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                {title && (
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: '26px', fontFamily: 'var(--font-family-cn)' }}>
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: '18px', fontFamily: 'var(--font-family-cn)' }}>
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, backgroundColor: 'var(--color-bg-secondary)', borderRadius: 9999, color: 'var(--color-text-secondary)', border: 'none', flexShrink: 0, cursor: 'pointer', transition: 'all var(--transition-base)' }}
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
