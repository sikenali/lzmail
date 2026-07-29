'use client'
import { MailItem } from './MailItem'
import type { Email } from '@/types'

export function MailList({ emails }: { emails: Email[] }) {
  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--muted-foreground)] text-sm">
        暂无邮件
      </div>
    )
  }

  return (
    <div>
      {emails.map((email) => (
        <MailItem key={email.id} email={email} brand={(email as any).account_brand} onSelect={(id) => window.location.href = `/mail/${id}`} />
      ))}
    </div>
  )
}
