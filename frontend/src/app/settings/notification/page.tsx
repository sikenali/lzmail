'use client'
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

export default function NotificationSettings() {
  const { settings, setSetting, loading } = useSettings()

  if (loading) return null

  return (
    <div className="max-w-[680px] mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">通知设置</h2>
        <p className="text-sm text-[var(--muted-foreground)]">管理邮件通知和提醒方式</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">通知方式</h3>
        <div className="space-y-4">
          <Toggle label="桌面通知" desc="在桌面显示新邮件弹窗"
            value={settings.desktop_notify === 'true'}
            onToggle={() => setSetting('desktop_notify', settings.desktop_notify === 'true' ? 'false' : 'true')} />
          <Toggle label="声音提醒" desc="新邮件到达时播放提示音"
            value={settings.sound_notify === 'true'}
            onToggle={() => setSetting('sound_notify', settings.sound_notify === 'true' ? 'false' : 'true')} />
          <Toggle label="邮件摘要" desc="每天发送一封邮件摘要到您的主邮箱"
            value={settings.daily_digest === 'true'}
            onToggle={() => setSetting('daily_digest', settings.daily_digest === 'true' ? 'false' : 'true')} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">邮件提醒</h3>
        <div className="space-y-4">
          <Toggle label="新邮件通知" desc="收到新邮件时发送通知"
            value={settings.new_mail_notify === 'true'}
            onToggle={() => setSetting('new_mail_notify', settings.new_mail_notify === 'true' ? 'false' : 'true')} />
          <Toggle label="仅通知重要邮件" desc="只对来自星标联系人的邮件发通知"
            value={settings.important_only === 'true'}
            onToggle={() => setSetting('important_only', settings.important_only === 'true' ? 'false' : 'true')} />
          <Toggle label="同步失败提醒" desc="邮箱同步失败时发送通知"
            value={settings.sync_fail_alert === 'true'}
            onToggle={() => setSetting('sync_fail_alert', settings.sync_fail_alert === 'true' ? 'false' : 'true')} />
          <Toggle label="发送成功确认" desc="邮件发送成功后显示确认"
            value={settings.send_confirm === 'true'}
            onToggle={() => setSetting('send_confirm', settings.send_confirm === 'true' ? 'false' : 'true')} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">通知时机</h3>
        <div className="space-y-3">
          {[
            { label: '全天', desc: '随时接收通知', value: 'all_day' },
            { label: '仅工作时间', desc: '09:00 - 18:00', value: 'work_hours' },
            { label: '自定义', desc: '设置静音时间段', value: 'custom' },
          ].map((item) => (
            <label key={item.value} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-[var(--accent)]">
              <input type="radio" name="timing" checked={settings.notify_timing === item.value}
                onChange={() => setSetting('notify_timing', item.value)}
                className="accent-[var(--primary)]" />
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{item.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
