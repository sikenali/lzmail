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
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', animation: 'fadeIn 0.25s ease', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        className="settings-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: isMobile ? '100%' : '90vw',
          maxWidth: isMobile ? '100%' : 1100,
          height: isMobile ? '100dvh' : '86vh',
          maxHeight: isMobile ? undefined : '86vh',
          backgroundColor: 'var(--color-bg-secondary)',
          border: isMobile ? 'none' : '0.6px solid var(--color-border)',
          borderRadius: isMobile ? 0 : 'var(--modal-radius)',
          boxShadow: isMobile ? 'none' : 'var(--modal-shadow)',
          padding: isMobile ? '16px 16px 0' : '24px 28px',
          paddingTop: isMobile ? 'calc(16px + env(safe-area-inset-top))' : 24,
          overflow: 'hidden',
          animation: 'scaleIn 0.25s var(--ease)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: isMobile ? 12 : 16, marginBottom: isMobile ? 0 : 4, flexShrink: 0, borderBottom: isMobile ? 'none' : '0.6px solid var(--color-border-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, backgroundColor: 'rgba(var(--tech-cyan-rgb), 0.12)', border: '0.6px solid rgba(var(--tech-cyan-rgb), 0.3)', borderRadius: 9999, flexShrink: 0 }}>
                <Settings style={{ fontSize: 18, width: 18, height: 18, color: 'var(--tech-cyan)' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <h2 style={{ fontSize: isMobile ? 17 : 18, fontWeight: 600, letterSpacing: '0.3px', color: 'var(--color-text-primary)', margin: 0, lineHeight: '24px', fontFamily: 'var(--font-display)' }}>设置中心</h2>
              {!isMobile && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, lineHeight: '18px', fontFamily: 'var(--font-family-cn)', letterSpacing: '0.5px' }}>选择要进入的设置界面</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, backgroundColor: 'transparent', borderRadius: 9999, color: 'var(--color-text-muted)', border: 'none', flexShrink: 0, cursor: 'pointer', transition: 'background-color var(--t-fast) ease, color var(--t-fast) ease' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(var(--tech-cyan-rgb), 0.12)'; e.currentTarget.style.color = 'var(--tech-cyan)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            <i className="ri-close-line" style={{ fontSize: 18 }}></i>
          </button>
        </div>

        {/* Panel Body */}
        <div className="settings-panel-body" style={{ flex: 1, minHeight: 0, gap: isMobile ? 12 : 16, display: 'flex', flexDirection: isMobile ? 'column' : 'row', paddingTop: isMobile ? 12 : 16 }}>
          {/* Nav List — DESIGN-1 §5.3：200px 紧凑科技版，激活态左侧 3px 电光青发光条 */}
          <nav
            style={isMobile
              ? { flexShrink: 0, backgroundColor: 'var(--color-bg-white)', border: '0.6px solid var(--color-border-soft)', borderRadius: 12, padding: 6, display: 'flex', flexDirection: 'row', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }
              : { width: 200, flexShrink: 0, backgroundColor: 'var(--color-bg-white)', border: '0.6px solid var(--color-border-soft)', borderRadius: 'var(--radius-md)', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}
          >
            {MENU_ITEMS.map(item => {
              const Icon = item.icon
              const active = activeKey === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveKey(item.key)}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? 8 : 10,
                    height: 42,
                    padding: isMobile ? '0 14px' : '0 12px',
                    borderRadius: 8,
                    backgroundColor: active ? 'rgba(var(--tech-cyan-rgb), 0.10)' : 'transparent',
                    color: active ? 'var(--tech-cyan)' : 'var(--color-text-body)',
                    fontWeight: active ? 600 : 500,
                    border: 'none',
                    cursor: 'pointer',
                    width: isMobile ? 'auto' : '100%',
                    flexShrink: 0,
                    textAlign: 'left',
                    transition: 'background-color var(--t-fast) ease, color var(--t-fast) ease',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {active && !isMobile && (
                    <span
                      aria-hidden
                      style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 22, borderRadius: '0 2px 2px 0', backgroundColor: 'var(--tech-cyan)', boxShadow: '0 0 8px rgba(var(--tech-cyan-rgb), 0.5)' }}
                    />
                  )}
                  <Icon style={{ fontSize: 17, width: 17, height: 17, flexShrink: 0, color: active ? 'var(--tech-cyan)' : 'var(--color-text-muted)' }} />
                  <span style={{ fontSize: isMobile ? 14 : 13, whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Content */}
          <div className="settings-panel-content" style={{ flex: 1, minWidth: 0, paddingRight: isMobile ? 0 : 4, paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
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
