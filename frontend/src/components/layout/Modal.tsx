'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  width = 'max-w-lg',
  closeOnClickOverlay = true,
  closeOnEsc = true,
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: string
  closeOnClickOverlay?: boolean
  closeOnEsc?: boolean
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!closeOnEsc) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, closeOnEsc])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s ease' }}
      onClick={closeOnClickOverlay ? onClose : undefined}
    >
      <div
        className={`w-full ${width} max-h-[86vh] flex flex-col rounded-2xl shadow-2xl`}
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--card-border)',
          animation: 'scaleIn 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || icon) && (
          <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--primary-light)' }}>
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && <h2 className="text-[16px] font-bold leading-tight" style={{ color: 'var(--foreground)' }}>{title}</h2>}
                {subtitle && <p className="text-[12px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--muted)] transition-all shrink-0"
              style={{ color: 'var(--foreground-tertiary)' }}
            >
              <i className="ri-close-line w-5 h-5"></i>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--card-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
