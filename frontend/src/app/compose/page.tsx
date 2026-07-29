'use client'
import { ArrowLeft, Send, Paperclip } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ComposePage() {
  const router = useRouter()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-14 border-b">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-accent rounded-lg transition-colors"><Paperclip className="w-4 h-4" /></button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity">
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <input placeholder="收件人" className="w-full border-b pb-2 outline-none text-sm bg-transparent" />
        <input placeholder="主题" className="w-full border-b pb-2 outline-none text-sm bg-transparent" />
        <textarea placeholder="写邮件..." className="w-full flex-1 outline-none text-sm bg-transparent resize-none" rows={20} />
      </div>
    </div>
  )
}
