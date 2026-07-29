'use client'
import { ArrowLeft, Star, Trash2, Paperclip } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MailDetail({ id }: { id: number }) {
  const router = useRouter()

  return (
    <div className="p-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">邮件主题 #{id}</h1>
            <p className="text-sm text-muted-foreground">发件人</p>
            <p className="text-sm text-muted-foreground">收件人</p>
            <p className="text-sm text-muted-foreground">时间</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-accent rounded-lg transition-colors"><Star className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-accent rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="border rounded-lg p-4 min-h-[200px] text-sm">
          邮件正文（从 .eml 加载）
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1"><Paperclip className="w-4 h-4" /> 附件</p>
          <p className="text-sm text-muted-foreground">暂无附件</p>
        </div>
      </div>
    </div>
  )
}
