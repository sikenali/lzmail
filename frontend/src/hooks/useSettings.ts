'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'

export type Settings = Record<string, string> & {
  api_key?: string
}

const defaults: Settings = {
  language: 'zh-CN',
  font_size: 'small',
  reply_behavior: 'include',
  mail_density: 'comfortable',
  default_inbox: 'unified',
  page_size: '50',
  auto_sync: 'true',
  minimize_to_tray: 'false',
  theme: 'light',
  accent_color: '#c43d3d',
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
  archive_path: (() => {
    if (typeof navigator === 'undefined') return ''
    const isWin = navigator.userAgent.includes('Windows')
    const ua = navigator.userAgent
    const winMatch = ua.match(/Windows NT \d+\.\d+;.*?; (.+?)\)/)
    const user = isWin ? (winMatch ? winMatch[1] : 'User') : (typeof process !== 'undefined' && process.env?.USER ? process.env.USER : 'user')
    return isWin ? `C:\\Users\\${user}\\Documents\\lzmail\\archives` : `/home/${user}/lzmail/archives`
  })(),
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

  const applyAccentColor = (color: string) => {
    document.documentElement.style.setProperty('--primary', color)
    document.documentElement.style.setProperty('--primary-light', color + '15')
    localStorage.setItem('lzmail_accent_color', color)
  }

  const applyFontSize = (size: string) => {
    const sizes: Record<string, string> = { small: '14px', medium: '16px', large: '18px' }
    document.documentElement.style.fontSize = sizes[size] || '16px'
    localStorage.setItem('lzmail_font_size', size)
  }

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    // Initialize theme IMMEDIATELY to prevent flash of wrong theme
    const saved = localStorage.getItem('lzmail_theme')
    const initialTheme = saved && ['light', 'dark', 'system'].includes(saved)
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    applyTheme(initialTheme)

    // Apply saved accent color immediately
    const savedAccent = localStorage.getItem('lzmail_accent_color')
    if (savedAccent) {
      document.documentElement.style.setProperty('--primary', savedAccent)
      document.documentElement.style.setProperty('--primary-light', savedAccent + '15')
    }

    // Apply saved font size immediately
    const savedFontSize = localStorage.getItem('lzmail_font_size')
    if (savedFontSize) applyFontSize(savedFontSize)

    // Apply saved animations state immediately
    const savedAnimations = localStorage.getItem('lzmail_animations')
    if (savedAnimations === 'false') {
      document.body.classList.add('no-animations')
    }

    // System theme: listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const currentTheme = localStorage.getItem('lzmail_theme') || initialTheme
      if (currentTheme === 'system') {
        applyTheme('system')
      }
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    api.settings.get().then((s) => {
      setSettings((prev) => ({ ...defaults, ...s }))
      // Apply theme: prefer the user's explicit localStorage choice, fall back to API, then defaults
      const apiTheme = s?.theme
      const localStorageTheme = localStorage.getItem('lzmail_theme')
      const themeToApply = (localStorageTheme && ['light', 'dark', 'system'].includes(localStorageTheme)
        ? localStorageTheme
        : (apiTheme && ['light', 'dark', 'system'].includes(apiTheme) ? apiTheme : defaults.theme)) as 'light' | 'dark' | 'system'
      applyTheme(themeToApply)
      // Apply accent color
      const accentColor = s?.accent_color || defaults.accent_color
      applyAccentColor(accentColor)
      // Apply animations
      const anims = s?.animations || defaults.animations
      if (anims === 'false') {
        document.body.classList.add('no-animations')
      } else {
        document.body.classList.remove('no-animations')
      }
    }).catch(() => {
      setSettings(defaults)
      // Use saved theme or system preference on error
      applyTheme(initialTheme)
      // Apply saved accent color
      const savedAccent = localStorage.getItem('lzmail_accent_color')
      if (savedAccent) applyAccentColor(savedAccent)
      // Apply saved animations
      if (savedAnimations === 'false') {
        document.body.classList.add('no-animations')
      }
    }).finally(() => {
      setLoading(false)
    })

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [])

  const setSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    api.settings.set({ [key]: value }).catch(() => {})

    if (key === 'theme') {
      applyTheme(value)
      localStorage.setItem('lzmail_theme', value)
    }
    if (key === 'accent_color') {
      applyAccentColor(value)
    }
    if (key === 'font_size') {
      applyFontSize(value)
    }
    if (key === 'animations') {
      if (value === 'false') {
        document.body.classList.add('no-animations')
      } else {
        document.body.classList.remove('no-animations')
      }
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
