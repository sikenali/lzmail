'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Sun, Settings, Info } from '@/lib/icons'
import { ThemeSettings } from './ThemeSettings'
import { PersonalSettings } from './PersonalSettings'
import { AboutSettings } from './AboutSettings'

type MainTab = 'theme' | 'personal' | 'about'

const MENU_ITEMS = [
  { key: 'theme' as MainTab, label: '主题设置', icon: Sun },
  { key: 'personal' as MainTab, label: '个性设置', icon: Settings },
  { key: 'about' as MainTab, label: '关于', icon: Info },
]

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeKey, setActiveKey] = useState<MainTab>('theme')

  useEffect(() => {
    if (open) {
      setActiveKey('theme')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1320,
          maxWidth: '94vw',
          height: '86vh',
          maxHeight: 900,
          backgroundColor: 'var(--color-bg-secondary)',
          border: '0.7px solid var(--color-border-soft)',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
          padding: '28px 32px',
          overflow: 'hidden',
          animation: 'scaleIn 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, backgroundColor: 'var(--color-primary-soft)', borderRadius: 12, flexShrink: 0 }}>
              <Settings style={{ width: 26, height: 26, color: 'var(--color-primary)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: '28px', fontFamily: 'var(--font-family-cn)' }}>设置中心</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: '18px', fontFamily: 'var(--font-family-cn)' }}>选择要进入的设置界面</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, backgroundColor: 'var(--color-bg-white)', borderRadius: 9999, color: 'var(--color-text-secondary)', border: 'none', flexShrink: 0, cursor: 'pointer', transition: 'all var(--transition-base)' }}
            title="关闭"
          >
            <i className="ri-close-line" style={{ fontSize: 20 }}></i>
          </button>
        </div>

        {/* Panel Body */}
        <div style={{ flex: 1, minHeight: 0, gap: 20, display: 'flex' }}>
          {/* Nav List */}
          <nav
            style={{ width: 240, flexShrink: 0, backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border-soft)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}
          >
            {MENU_ITEMS.map(item => {
              const Icon = item.icon
              const active = activeKey === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveKey(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    height: 52,
                    padding: '0 20px',
                    borderRadius: 12,
                    backgroundColor: active ? 'var(--color-primary-soft)' : 'transparent',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-body)',
                    fontWeight: active ? 500 : 400,
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all var(--transition-base)',
                    fontFamily: 'var(--font-family-cn)',
                  }}
                >
                  <Icon style={{ width: 20, height: 20, flexShrink: 0, color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                  <span style={{ fontSize: 15, whiteSpace: 'nowrap' }}>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0, paddingRight: 4, overflowY: 'auto' }}>
            <div style={{ padding: 4 }}>
              {activeKey === 'theme' && <ThemeSettings />}
              {activeKey === 'personal' && <PersonalSettings />}
              {activeKey === 'about' && <AboutSettings />}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
