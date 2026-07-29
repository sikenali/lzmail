'use client'
import { motion } from 'framer-motion'
import { Paperclip, Star } from 'lucide-react'
import type { Email } from '@/types'

export function MailItem({ email, onSelect }: { email: Email; onSelect: (id: number) => void }) {
  const date = new Date(email.date)
  const isToday = new Date().toDateString() === date.toDateString()
  const timeStr = isToday
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(email.id)}
      className={`flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-accent/50 ${
        !email.is_read ? 'bg-accent/30 font-medium' : ''
      }`}
    >
      <div className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ backgroundColor: email.is_read ? 'transparent' : '#3b82f6' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm truncate">{email.from}</span>
          {email.is_starred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
        </div>
        <div className="text-sm font-medium truncate">{email.subject}</div>
        <div className="text-xs text-muted-foreground truncate">{email.body_preview}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {email.has_attachments && <Paperclip className="w-3 h-3 text-muted-foreground" />}
        <span className="text-xs text-muted-foreground whitespace-nowrap">{timeStr}</span>
      </div>
    </motion.div>
  )
}
