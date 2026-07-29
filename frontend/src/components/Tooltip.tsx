'use client'
import React from 'react'

export function Tooltip({ children, text, side = 'top' }: {
  children: React.ReactNode
  text: string
  side?: 'top' | 'bottom'
}) {
  const position = side === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2'
  return (
    <div className="group relative inline-flex">
      {children}
      <span
        className={`absolute ${position} left-1/2 -translate-x-1/2 px-2 py-1 rounded-[6px] text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 shadow-sm`}
        style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
      >
        {text}
      </span>
    </div>
  )
}