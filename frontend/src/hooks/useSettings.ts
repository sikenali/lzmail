'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'

type Settings = Record<string, string>

const defaults: Settings = {
  language: 'zh-CN',
  font_size: 'medium',
  reply_behavior: 'include',
  mail_density: 'comfortable',
  default_inbox: 'unified',
  page_size: '50',
  auto_sync: 'true',
  minimize_to_tray: 'false',
  theme: 'light',
  accent_color: '#3b82f6',
  sidebar_color: '#ffffff',
  layout_density: 'comfortable',
  desktop_notify: 'true',
  sound_notify: 'true',
  daily_digest: 'false',
  new_mail_notify: 'true',
  important_only: 'false',
  sync_fail_alert: 'true',
  send_confirm: 'false',
  notify_timing: 'all_day',
  auto_archive: 'true',
  keep_attachments: 'true',
  compress_attachments: 'false',
  auto_cleanup: 'true',
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [loading, setLoading] = useState(true)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    api.settings.get().then((s) => {
      setSettings((prev) => ({ ...defaults, ...s }))
      setLoading(false)
    }).catch(() => {
      setSettings(defaults)
      setLoading(false)
    })
  }, [])

  const setSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    api.settings.set({ [key]: value }).catch(() => {})
  }, [])

  const setSettingsBatch = useCallback((batch: Record<string, string>) => {
    setSettings((prev) => ({ ...prev, ...batch }))
    api.settings.set(batch).catch(() => {})
  }, [])

  return { settings, loading, setSetting, setSettingsBatch }
}
