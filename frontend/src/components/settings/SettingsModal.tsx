'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Sun, Settings, Info } from '@/lib/icons'
import { ThemeSettings } from './ThemeSettings'
import { PersonalSettings } from './PersonalSettings'
import { AboutSettings } from './AboutSettings'
import { useIsMobile } from '@/hooks/useIsMobile'

type MainTab = 'theme' | 'personal' | 'about'

const MENU_ITEMS = [
  { key: 'theme' as MainTab, label: '主题设置', icon: Sun },
  { key: 'personal' as MainTab, label: '个性设置', icon: Settings },
  { key: 'about' as MainTab, label: '关于', icon: Info },
]

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeKey, setActiveKey] = useState<MainTab>('theme')
  const isMobile = useIsMobile()

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
          width: isMobile ? '100%' : 1320,
          maxWidth: isMobile ? '100%' : '94vw',
          height: isMobile ? '100dvh' : '86vh',
          maxHeight: isMobile ? undefined : 900,
          backgroundColor: 'var(--color-bg-secondary)',
          border: isMobile ? 'none' : '0.7px solid var(--color-border-soft)',
          borderRadius: isMobile ? 0 : 16,
          boxShadow: isMobile ? 'none' : '0 8px 40px rgba(0,0,0,0.1)',
          padding: isMobile ? '16px 16px 0' : '28px 32px',
          paddingTop: isMobile ? 'calc(16px + env(safe-area-inset-top))' : 28,
          overflow: 'hidden',
          animation: 'scaleIn 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: isMobile ? 12 : 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, backgroundColor: 'var(--color-primary-soft)', borderRadius: 12, flexShrink: 0 }}>
                <Settings style={{ width: 26, height: 26, color: 'var(--color-primary)' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: '28px', fontFamily: 'var(--font-family-cn)' }}>设置中心</h2>
              {!isMobile && (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: '18px', fontFamily: 'var(--font-family-cn)' }}>选择要进入的设置界面</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, backgroundColor: 'var(--color-bg-white)', borderRadius: 9999, color: 'var(--color-text-secondary)', border: 'none', flexShrink: 0, cursor: 'pointer', transition: 'all var(--transition-base)' }}
          >
            <i className="ri-close-line" style={{ fontSize: 20 }}></i>
          </button>
        </div>

        {/* Panel Body */}
        <div style={{ flex: 1, minHeight: 0, gap: isMobile ? 12 : 20, display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Nav List */}
          <nav
            style={isMobile
              ? { flexShrink: 0, backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border-soft)', borderRadius: 12, padding: 6, display: 'flex', flexDirection: 'row', gap: 6, overflowX: 'auto' }
              : { width: 240, flexShrink: 0, backgroundColor: 'var(--color-bg-white)', border: '0.7px solid var(--color-border-soft)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}
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
                    gap: isMobile ? 8 : 14,
                    height: isMobile ? 40 : 52,
                    padding: isMobile ? '0 14px' : '0 20px',
                    borderRadius: isMobile ? 8 : 12,
                    backgroundColor: active ? 'var(--color-primary-soft)' : 'transparent',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-body)',
                    fontWeight: active ? 500 : 400,
                    border: 'none',
                    cursor: 'pointer',
                    width: isMobile ? 'auto' : '100%',
                    flexShrink: 0,
                    textAlign: 'left',
                    transition: 'all var(--transition-base)',
                    fontFamily: 'var(--font-family-cn)',
                  }}
                >
                  <Icon style={{ width: 20, height: 20, flexShrink: 0, color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                  <span style={{ fontSize: isMobile ? 14 : 15, whiteSpace: 'nowrap' }}>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0, paddingRight: isMobile ? 0 : 4, paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
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
