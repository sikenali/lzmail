'use client'
import { useEffect, useState } from 'react'
import { HardDrive, Archive, Database, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useSettings } from '@/hooks/useSettings'

function Toggle({ value, onToggle, label, desc }: { value: boolean; onToggle: () => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{desc}</div>
      </div>
      <div onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer ${value ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'}`}>
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </div>
    </div>
  )
}

export default function StorageSettings() {
  const { settings, setSetting, loading } = useSettings()
  const [stats, setStats] = useState<{ total_emails: number; storage_bytes: number } | null>(null)

  useEffect(() => {
    api.mails.stats().then(setStats).catch(() => {})
  }, [])

  if (loading) return null

  const storageMB = stats ? (stats.storage_bytes / 1024 / 1024).toFixed(1) : '0'
  const totalMB = parseFloat(storageMB)
  const limitMB = 51200
  const usedPct = Math.min((totalMB / limitMB) * 100, 100)

  return (
    <div className="max-w-[680px] mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">存储管理</h2>
        <p className="text-sm text-[var(--muted-foreground)]">管理邮件归档和本地存储</p>
      </div>

      <div className="p-5 rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium">本地存储</div>
            <div className="text-xs text-[var(--muted-foreground)]">邮件归档存储路径: /mnt/nas/lzmail/archives/</div>
          </div>
        </div>
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span>已使用 {storageMB} MB / 50 GB</span>
            <span className="text-[var(--foreground-tertiary)]">{usedPct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-[var(--muted)] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500" style={{ width: `${usedPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Database, label: '邮件数据', size: `${storageMB} MB`, count: `${stats?.total_emails || 0} 封`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Archive, label: '附件文件', size: '—', count: '—', color: 'text-violet-600', bg: 'bg-violet-50' },
          { icon: Trash2, label: '缓存数据', size: '—', count: '—', color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="p-4 rounded-xl border bg-[var(--card)]">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">{item.count}</span>
              </div>
              <div className="text-sm font-semibold">{item.size}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{item.label}</div>
            </div>
          )
        })}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">归档策略</h3>
        <div className="space-y-4">
          <Toggle label="自动归档" desc="同步后将邮件归档到本地"
            value={settings.auto_archive === 'true'}
            onToggle={() => setSetting('auto_archive', settings.auto_archive === 'true' ? 'false' : 'true')} />
          <Toggle label="保留附件" desc="归档时保留邮件附件"
            value={settings.keep_attachments === 'true'}
            onToggle={() => setSetting('keep_attachments', settings.keep_attachments === 'true' ? 'false' : 'true')} />
          <Toggle label="压缩附件" desc="归档附件自动压缩以节省空间"
            value={settings.compress_attachments === 'true'}
            onToggle={() => setSetting('compress_attachments', settings.compress_attachments === 'true' ? 'false' : 'true')} />
          <Toggle label="自动清理" desc="超过 90 天的缓存自动清理"
            value={settings.auto_cleanup === 'true'}
            onToggle={() => setSetting('auto_cleanup', settings.auto_cleanup === 'true' ? 'false' : 'true')} />
        </div>
      </div>
    </div>
  )
}
