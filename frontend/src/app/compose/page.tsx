'use client'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { ComposeModal } from '@/components/compose/ComposeModal'

function ComposePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const params = {
    to: searchParams?.get('to') ?? undefined,
    cc: searchParams?.get('cc') ?? undefined,
    bcc: searchParams?.get('bcc') ?? undefined,
    subject: searchParams?.get('subject') ?? undefined,
    accountId: searchParams?.get('account_id') ? Number(searchParams.get('account_id')) : undefined,
    body: searchParams?.get('body') ?? undefined,
    draftId: searchParams?.get('draft_id') ? Number(searchParams.get('draft_id')) : undefined,
    replyTo: searchParams?.get('message_id') ?? undefined,
  }

  return (
    <AppShell>
      <div className="flex items-center justify-center h-full">
        <ComposeModal open={true} onClose={() => router.push('/mail')} params={params} />
      </div>
    </AppShell>
  )
}

export default function ComposePage() {
  return (
    <Suspense fallback={null}>
      <ComposePageInner />
    </Suspense>
  )
}

export const dynamic = 'force-dynamic'
