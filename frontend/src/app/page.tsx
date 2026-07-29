'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MailList } from '@/components/mail/MailList'
import { api } from '@/lib/api'
import type { Account, Email } from '@/types'

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [emails, setEmails] = useState<Email[]>([])

  useEffect(() => {
    api.accounts.list().then(setAccounts).catch(() => {})
    api.mails.list().then(setEmails).catch(() => {})
  }, [])

  return (
    <AppShell accounts={accounts}>
      <MailList emails={emails} />
    </AppShell>
  )
}
