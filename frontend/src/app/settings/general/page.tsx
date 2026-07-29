'use client'
import { useSettings } from '@/hooks/useSettings'

export default function GeneralSettings() {
  const { settings, setSetting, loading } = useSettings()

  if (loading) return null

  return (
    <div className="max-w-[680px] mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">通用设置</h2>
        <p className="text-sm text-[var(--muted-foreground)]">管理 LZMail 的基本设置</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">语言</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">界面显示语言</div>
          </div>
          <select className="text-sm border rounded-lg px-3 h-9 bg-transparent outline-none"
            value={settings.language}
            onChange={(e) => setSetting('language', e.target.value)}>
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">默认字体大小</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">邮件阅读区域字体大小</div>
          </div>
          <select className="text-sm border rounded-lg px-3 h-9 bg-transparent outline-none"
            value={settings.font_size}
            onChange={(e) => setSetting('font_size', e.target.value)}>
            <option value="small">小</option>
            <option value="medium">中</option>
            <option value="large">大</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">回复行为</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">回复时默认包含原始邮件内容</div>
          </div>
          <select className="text-sm border rounded-lg px-3 h-9 bg-transparent outline-none"
            value={settings.reply_behavior}
            onChange={(e) => setSetting('reply_behavior', e.target.value)}>
            <option value="include">包含原文</option>
            <option value="exclude">不包含原文</option>
            <option value="quote">仅引用选中内容</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">邮件密度</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">邮件列表的显示密度</div>
          </div>
          <select className="text-sm border rounded-lg px-3 h-9 bg-transparent outline-none"
            value={settings.mail_density}
            onChange={(e) => setSetting('mail_density', e.target.value)}>
            <option value="compact">紧凑</option>
            <option value="comfortable">舒适</option>
            <option value="spacious">宽松</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">默认收件箱</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">打开 LZMail 时默认显示的邮箱</div>
          </div>
          <select className="text-sm border rounded-lg px-3 h-9 bg-transparent outline-none"
            value={settings.default_inbox}
            onChange={(e) => setSetting('default_inbox', e.target.value)}>
            <option value="unified">统一收件箱</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">每页显示邮件数</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">收件箱每页显示的邮件数量</div>
          </div>
          <select className="text-sm border rounded-lg px-3 h-9 bg-transparent outline-none"
            value={settings.page_size}
            onChange={(e) => setSetting('page_size', e.target.value)}>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">自动同步</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">开启后自动同步所有邮箱</div>
          </div>
          <div onClick={() => setSetting('auto_sync', settings.auto_sync === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer ${settings.auto_sync === 'true' ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform ${settings.auto_sync === 'true' ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">启动时最小化到托盘</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">应用程序启动后自动最小化</div>
          </div>
          <div onClick={() => setSetting('minimize_to_tray', settings.minimize_to_tray === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer ${settings.minimize_to_tray === 'true' ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform ${settings.minimize_to_tray === 'true' ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </div>
        </div>
      </div>
    </div>
  )
}
