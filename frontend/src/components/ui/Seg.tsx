'use client'

/* 面板内分段控件 — DESIGN.md §2.3.4 类型 C：灰底槽 + 白色滑动块。
   Props:
   - options: [{ value, label, icon? }]
   - value: 当前选中 value
   - onChange: 切换回调
   - size: 'md'（默认，条目高 36）/ 'sm'（条目高 32） */
export function Seg<T extends string>({ options, value, onChange, size = 'md' }: {
  options: { value: T; label: string; icon?: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
  size?: 'md' | 'sm'
}) {
  const h = size === 'md' ? 36 : 32
  return (
    <div
      role="group"
      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 4, backgroundColor: 'var(--color-bg-secondary)', border: '0.7px solid var(--color-border-soft)', borderRadius: 10, maxWidth: '100%', overflowX: 'auto' }}
    >
      {options.map(o => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px',
              height: h, borderRadius: 7, fontSize: 13,
              backgroundColor: active ? 'var(--color-bg-white)' : 'transparent',
              color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
              fontWeight: active ? 600 : 500,
              border: 'none', cursor: 'pointer', transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-family-cn)',
            }}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
