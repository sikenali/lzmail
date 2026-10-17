'use client'
import { useState } from 'react'
import { LayoutRow, Globe, Folder } from '@/lib/icons'
import { StyleSettings } from './StyleSettings'
import { ProxySettings } from './ProxySettings'
import { StorageSettings } from './StorageSettings'

type SubTab = 'style' | 'proxy' | 'storage'

const SUB_TABS = [
  { key: 'style', label: '样式设置', icon: LayoutRow },
  { key: 'proxy', label: '代理设置', icon: Globe },
  { key: 'storage', label: '存储管理', icon: Folder },
] as const

export function PersonalSettings() {
  const [subTab, setSubTab] = useState<SubTab>('style')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {SUB_TABS.map(t => {
          const Icon = t.icon
          const active = subTab === t.key
          return (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 14px',
                height: 36,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                backgroundColor: active ? 'var(--teal)' : 'var(--muted)',
                color: active ? '#ffffff' : 'var(--foreground-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Icon style={{ width: 16, height: 16, color: active ? '#ffffff' : 'var(--foreground-secondary)' }} />
              {t.label}
            </button>
          )
        })}
      </div>
      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
        {subTab === 'style' && <StyleSettings />}
        {subTab === 'proxy' && <ProxySettings />}
        {subTab === 'storage' && <StorageSettings />}
      </div>
    </div>
  )
}
