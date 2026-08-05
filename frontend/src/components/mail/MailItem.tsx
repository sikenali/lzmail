'use client'
import { Paperclip, Star } from '@/lib/icons'
import type { Email } from '@/types'

const avatarGradients: Record<string, string> = {
  '#ea4335': 'from-red-400 to-red-600',
  '#0078d4': 'from-blue-400 to-indigo-600',
  '#12b7f5': 'from-cyan-400 to-sky-600',
  '#e53e3e': 'from-red-500 to-rose-600',
}

const defaultGradients = [
  'from-orange-400 to-red-500', 'from-blue-400 to-indigo-500',
  'from-cyan-400 to-blue-500', 'from-red-400 to-pink-500',
  'from-purple-400 to-pink-500', 'from-green-400 to-emerald-500',
]

function resolveBrand(val: string, fallback = '#3b82f6'): string {
  return val?.startsWith('#') ? val : fallback
}

export function MailItem({ email, brand, onSelect }: { email: Email; brand?: string; onSelect: (id: number) => void }) {
  const date = new Date(email.date)
  const isToday = new Date().toDateString() === date.toDateString()
  const timeStr = isToday
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  const barColor = resolveBrand(brand || '')
  const gradient = avatarGradients[barColor] || defaultGradients[(email.id || 0) % defaultGradients.length]
  const brandName = email.account_name || ''

  return (
    <div onClick={() => onSelect(email.id)}
      className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors duration-200 border-b border-transparent hover:border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-900/30"
    >
      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[10px] font-semibold shrink-0`}>
        {(email.from?.[0] || '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{email.from}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{email.subject || '(无主题)'}</span>
          {email.is_starred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />}
        </div>
        <div className="text-xs truncate mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{email.body_preview}</div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {brandName && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0"
              style={{ backgroundColor: barColor + '1a', color: barColor }}
            >
              {brandName}
            </span>
          )}
          {email.has_attachments && (
            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md shrink-0"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-tertiary)' }}
            >
              <Paperclip className="w-2.5 h-2.5" /> 附件
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end justify-start gap-1 shrink-0 self-start pt-0.5">
        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--foreground-tertiary)' }}>{timeStr}</span>
      </div>
    </div>
  )
}