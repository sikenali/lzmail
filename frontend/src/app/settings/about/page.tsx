'use client'
import { ExternalLink } from 'lucide-react'

export default function AboutSettings() {
  return (
    <div className="max-w-[680px] mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">关于 LZMail</h2>
        <p className="text-sm text-[var(--muted-foreground)]">版本信息和系统状态</p>
      </div>

      <div className="p-8 rounded-xl border bg-[var(--card)] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">LZ</div>
        <h3 className="text-lg font-semibold">LZMail</h3>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">自托管 NAS 邮件客户端</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-xs bg-[var(--muted)] px-2 py-0.5 rounded">v1.2.0</span>
          <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">Build 20240115</span>
        </div>
        <div className="mt-4 space-x-3">
          <button className="text-xs text-[var(--primary)] hover:underline">检查更新</button>
          <button className="text-xs text-[var(--primary)] hover:underline">发送反馈</button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">技术信息</h3>
        </div>
        <div className="space-y-4 border rounded-xl p-5 bg-[var(--card)]">
          {[
            ['Go 版本', '1.25.0'],
            ['Next.js', '15.5.22'],
            ['数据库', 'SQLite (modernc.org)'],
            ['运行时', 'Node.js 20.10.0'],
            ['操作系统', 'Linux (Docker)'],
            ['许可证', 'MIT License'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0">
              <span className="text-sm text-[var(--foreground-secondary)]">{k}</span>
              <span className="text-sm font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">相关链接</h3>
        <div className="space-y-2">
          {[
            { label: 'GitHub 仓库', href: '#' },
            { label: '使用文档', href: '#' },
            { label: '查看许可证', href: '#' },
          ].map((link) => (
            <a key={link.label} href={link.href}
              className="flex items-center justify-between px-4 py-3 rounded-lg border hover:bg-[var(--accent)] transition-colors">
              <span className="text-sm">{link.label}</span>
              <ExternalLink className="w-4 h-4 text-[var(--muted-foreground)]" />
            </a>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-xl border bg-[var(--card)]">
        <h3 className="text-sm font-semibold mb-3">系统服务状态</h3>
        <div className="space-y-2">
          {[
            ['API 服务', '正常', 'text-emerald-500'],
            ['SSE 同步', '正常', 'text-emerald-500'],
            ['IMAP 连接', '正常', 'text-emerald-500'],
            ['SMTP 服务', '正常', 'text-emerald-500'],
          ].map(([s, st, c]) => (
            <div key={s} className="flex items-center justify-between text-sm py-1.5">
              <span className="text-[var(--foreground-secondary)]">{s}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className={c}>{st}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
