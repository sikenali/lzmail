'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Side = 'top' | 'bottom' | 'left' | 'right'

export function Tooltip({
  children,
  text,
  side = 'top',
  delay = 120,
}: {
  children: React.ReactNode
  text?: React.ReactNode
  side?: Side
  delay?: number
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const show = useCallback(() => {
    if (!text) return
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    clearTimer()
    timerRef.current = window.setTimeout(() => setOpen(true), delay)
  }, [text, delay, clearTimer])

  const hide = useCallback(() => {
    clearTimer()
    setOpen(false)
  }, [clearTimer])

  useEffect(() => clearTimer, [clearTimer])

  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const trigger = triggerRef.current
    const bubble = bubbleRef.current
    if (!trigger || !bubble) return
    const gap = 8
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    const t = trigger.getBoundingClientRect()
    const b = bubble.getBoundingClientRect()

    let place: Side = side
    if (place === 'top' && t.top - gap - b.height < 0) place = 'bottom'
    else if (place === 'bottom' && t.bottom + gap + b.height > vh) place = 'top'
    else if (place === 'left' && t.left - gap - b.width < 0) place = 'right'
    else if (place === 'right' && t.right + gap + b.width > vw) place = 'left'

    let top: number
    let left: number
    if (place === 'top' || place === 'bottom') {
      top = place === 'top' ? t.top - gap - b.height : t.bottom + gap
      left = t.left + t.width / 2 - b.width / 2
    } else {
      left = place === 'left' ? t.left - gap - b.width : t.right + gap
      top = t.top + t.height / 2 - b.height / 2
    }
    left = Math.min(Math.max(margin, left), Math.max(margin, vw - b.width - margin))
    top = Math.min(Math.max(margin, top), Math.max(margin, vh - b.height - margin))
    setPos({ top, left })
  }, [open, side, text])

  useEffect(() => {
    if (!open) return
    const onScrollResize = () => hide()
    window.addEventListener('scroll', onScrollResize, true)
    window.addEventListener('resize', onScrollResize)
    return () => {
      window.removeEventListener('scroll', onScrollResize, true)
      window.removeEventListener('resize', onScrollResize)
    }
  }, [open, hide])

  if (!text) return <>{children}</>

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
      >
        {children}
      </span>
      {open && createPortal(
        <div
          ref={bubbleRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            zIndex: 9999,
            pointerEvents: 'none',
            backgroundColor: 'var(--foreground)',
            color: 'var(--background)',
            padding: '5px 9px',
            borderRadius: 7,
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            opacity: pos ? 1 : 0,
            transition: 'opacity 120ms ease',
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  )
}
