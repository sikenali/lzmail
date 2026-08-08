'use client'
import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronDown, ChevronRight, ChevronUp, ArrowLeft } from '@/lib/icons'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const pad = (n: number) => String(n).padStart(2, '0')

function parseValue(value: string): Date {
  if (!value) return new Date()
  // value is in local time (formatted with local getHours/getMinutes),
  // but new Date(isoWithoutTz) parses as UTC, causing timezone drift.
  // Parse components manually to preserve local time.
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return new Date()
  const [, yy, mm, dd, hh, mi] = match
  return new Date(parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), parseInt(hh, 10), parseInt(mi, 10))
}

function TimeStepper({ label, value, step }: { label: string; value: number; step: (d: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex flex-col items-center">
        <button type="button" onClick={() => step(1)}
          className="w-7 h-5 flex items-center justify-center rounded hover:bg-[var(--muted)] transition-colors" style={{ color: 'var(--foreground-tertiary)' }}>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <span className="w-12 text-center text-[15px] font-semibold leading-6 tabular-nums" style={{ color: 'var(--foreground)' }}>{pad(value)}</span>
        <button type="button" onClick={() => step(-1)}
          className="w-7 h-5 flex items-center justify-center rounded hover:bg-[var(--muted)] transition-colors" style={{ color: 'var(--foreground-tertiary)' }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
    </div>
  )
}

export function DateTimePicker({ value, onChange, className }: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    const d = parseValue(value)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = parseValue(value)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  })
  const [hour, setHour] = useState(() => parseValue(value).getHours())
  const [minute, setMinute] = useState(() => parseValue(value).getMinutes())
  const [alignRight, setAlignRight] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      const d = parseValue(value)
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1))
      setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
      setHour(d.getHours())
      setMinute(d.getMinutes())
      const rect = ref.current?.getBoundingClientRect()
      if (rect) setAlignRight(rect.right + 268 > (window.innerWidth || document.documentElement.clientWidth))
    }
  }, [open, value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const isToday = (day: number) => {
    const t = new Date()
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day
  }
  const isSelected = (day: number) =>
    selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day

  const confirm = () => {
    const iso = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}T${pad(hour)}:${pad(minute)}`
    onChange(iso)
    setOpen(false)
  }

  const stepHour = (delta: number) => setHour(h => (h + delta + 24) % 24)
  const stepMinute = (delta: number) => setMinute(m => (m + delta + 60) % 60)

  const committed = parseValue(value)
  const display = value
    ? `${committed.getFullYear()}年${pad(committed.getMonth() + 1)}月${pad(committed.getDate())}日 ${pad(committed.getHours())}:${pad(committed.getMinutes())}`
    : '选择时间'

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm outline-none transition-colors hover:bg-[var(--muted)] cursor-pointer"
        style={{ backgroundColor: 'var(--background)', border: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground)' }}
      >
        <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--foreground-secondary)' }} />
        <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: 'var(--foreground-secondary)' }}>{display}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--foreground-tertiary)' }} />
      </button>

      {open && (
        <div className={`absolute z-50 top-full mt-1 rounded-[12px] ${alignRight ? 'right-0' : 'left-0'}`}
          style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', boxShadow: '0 8px 28px rgba(0,0,0,0.14)', width: 268, padding: 12 }}
        >
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] transition-colors" style={{ color: 'var(--foreground-secondary)' }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--foreground)' }}>{year}年{month + 1}月</span>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] transition-colors" style={{ color: 'var(--foreground-secondary)' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="h-6 flex items-center justify-center text-[11px]"
                style={{ color: i === 0 || i === 6 ? 'var(--danger)' : 'var(--muted-foreground)' }}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (day == null) return <div key={i} className="h-7" />
              const sel = isSelected(day)
              const today = isToday(day)
              return (
                <button key={i} type="button" onClick={() => setSelectedDate(new Date(year, month, day))}
                  className="h-7 flex items-center justify-center rounded-[6px] text-[12px] transition-colors"
                  style={{
                    backgroundColor: sel ? 'var(--primary)' : today ? 'var(--primary-light)' : 'transparent',
                    color: sel ? '#fff' : today ? 'var(--primary)' : 'var(--foreground)',
                    fontWeight: sel || today ? 600 : 400,
                    border: today && !sel ? '0.7px solid var(--primary)' : 'none',
                  }}
                >{day}</button>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-3 mt-3 pt-3" style={{ borderTop: '0.7px solid var(--card-border)' }}>
            <TimeStepper label="时" value={hour} step={stepHour} />
            <span className="text-base font-semibold" style={{ color: 'var(--foreground-tertiary)' }}>:</span>
            <TimeStepper label="分" value={minute} step={stepMinute} />
          </div>

          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '0.7px solid var(--card-border)' }}>
            <button type="button" onClick={() => setOpen(false)}
              className="h-8 px-3 rounded-lg text-[12px] transition-colors hover:bg-[var(--muted)]"
              style={{ color: 'var(--foreground-tertiary)' }}>取消</button>
            <button type="button" onClick={confirm}
              className="h-8 px-4 rounded-lg text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}>确定</button>
          </div>
        </div>
      )}
    </div>
  )
}
