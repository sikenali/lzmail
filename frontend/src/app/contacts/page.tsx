'use client'
import { ArrowLeft, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ContactsPage() {
  const router = useRouter()

  return (
    <div className="p-6 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>
      <h1 className="text-xl font-semibold mb-6">联系人</h1>
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm gap-2">
        <User className="w-4 h-4" />
        暂无联系人
      </div>
    </div>
  )
}
