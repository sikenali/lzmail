'use client'
import { Inbox, Star, Clock, Send, FileText, AlertTriangle } from 'lucide-react'

const items = [
  { icon: Inbox, label: '收件箱', folder: 'INBOX' },
  { icon: Star, label: '标星邮件', folder: 'STARRED' },
  { icon: Clock, label: '稍后处理', folder: 'DEFERRED' },
  { icon: Send, label: '已发送', folder: 'SENT' },
  { icon: FileText, label: '草稿', folder: 'DRAFTS' },
  { icon: AlertTriangle, label: '垃圾邮件', folder: 'SPAM' },
]

export function Sidebar({ currentFolder, onSelect }: { currentFolder: string; onSelect: (f: string) => void }) {
  return (
    <div className="w-48 flex flex-col gap-1 p-2 border-r h-full">
      {items.map((item) => (
        <button
          key={item.folder}
          onClick={() => onSelect(item.folder)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            currentFolder === item.folder ? 'bg-accent font-medium' : 'hover:bg-accent/50'
          }`}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </button>
      ))}
    </div>
  )
}
