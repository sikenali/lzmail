'use client'
import { useState } from 'react'
import { LayoutRow, Globe, Folder } from '@/lib/icons'
import { Seg } from '@/components/ui/Seg'
import { StyleSettings } from './StyleSettings'
import { ProxySettings } from './ProxySettings'
import { StorageSettings } from './StorageSettings'

type SubTab = 'style' | 'proxy' | 'storage'

const SUB_TABS = [
  { key: 'style', label: '样式设置', icon: <LayoutRow style={{ fontSize: 16, width: 16, height: 16, color: 'var(--color-text-muted)' }} /> },
  { key: 'proxy', label: '代理设置', icon: <Globe style={{ fontSize: 16, width: 16, height: 16, color: 'var(--color-text-muted)' }} /> },
  { key: 'storage', label: '存储管理', icon: <Folder style={{ fontSize: 16, width: 16, height: 16, color: 'var(--color-text-muted)' }} /> },
] as const

export function PersonalSettings() {
  const [subTab, setSubTab] = useState<SubTab>('style')

  return (
    <div>
      {/* 面板内切换 — DESIGN.md §2.3.4 类型 C：灰底槽 + 白色滑动块 */}
      <div style={{ marginBottom: 16 }}>
        <Seg<SubTab>
          value={subTab}
          onChange={setSubTab}
          options={SUB_TABS.map(t => ({ value: t.key, label: t.label, icon: t.icon }))}
        />
      </div>
      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
        {subTab === 'style' && <StyleSettings />}
        {subTab === 'proxy' && <ProxySettings />}
        {subTab === 'storage' && <StorageSettings />}
      </div>
    </div>
  )
}
