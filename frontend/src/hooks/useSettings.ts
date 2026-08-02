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
  animations: 'true',
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [loading, setLoading] = useState(true)
  const loaded = useRef(false)

  // Apply theme to document element
  const applyTheme = (theme: string) => {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    
    // Initialize theme before fetching settings (use system/localStorage default)
    const saved = localStorage.getItem('lzmail_theme')
    const initialTheme = saved && ['light', 'dark', 'system'].includes(saved) 
      ? saved 
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    applyTheme(initialTheme)

    api.settings.get().then((s) => {
      setSettings((prev) => ({ ...defaults, ...s }))
      // Apply theme from settings or fallback
      const themeToApply = (s?.theme || defaults.theme) as 'light' | 'dark' | 'system'
      applyTheme(themeToApply)
    }).catch(() => {
      setSettings(defaults)
      // Use saved theme or system preference on error
      applyTheme(initialTheme)
    })
    setLoading(false)
  }, [])

  const setSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    api.settings.set({ [key]: value }).catch(() => {})
    
    // If theme changed, apply it immediately and save to localStorage
    if (key === 'theme') {
      applyTheme(value)
      localStorage.setItem('lzmail_theme', value)
    }
  }, [])

  const setSettingsBatch = useCallback((batch: Record<string, string>) => {
    setSettings((prev) => ({ ...prev, ...batch }))
    api.settings.set(batch).catch(() => {})
    
    if (batch.theme) {
      applyTheme(batch.theme)
      localStorage.setItem('lzmail_theme', batch.theme)
    }
  }, [])

  return { settings, loading, setSetting, setSettingsBatch }
}
