'use client'
import { MailItem } from './MailItem'
import type { Email } from '@/types'

export function MailList({ emails }: { emails: Email[] }) {
  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        暂无邮件
      </div>
    )
  }

  return (
    <div className="divide-y">
      {emails.map((email) => (
        <MailItem key={email.id} email={email} onSelect={(id) => window.location.href = `/mail/${id}`} />
      ))}
    </div>
  )
}
