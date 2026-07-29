'use client'
import { useParams } from 'next/navigation'
import { MailDetail } from '@/components/mail/MailDetail'

export default function MailPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="h-full overflow-auto">
      <MailDetail id={parseInt(id)} />
    </div>
  )
}
