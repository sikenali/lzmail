'use client'
import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown } from '@/lib/icons'

export function CustomSelect({
  value,
  options,
  onChange,
  width = 120,
}: {
  value: string
  options: Array<{ value: string; label: string; provider?: string }>
  onChange: (v: string) => void
  width?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors hover:bg-[var(--muted)]"
        style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
      >
        <span className="flex-1 text-left truncate">{selected?.label || value}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--foreground-tertiary)' }} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-full rounded-lg overflow-hidden shadow-lg"
          style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', minWidth: width }}
        >
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)] flex items-center gap-2"
              style={{ color: opt.value === value ? 'var(--primary)' : 'var(--foreground)' }}
            >
              {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
