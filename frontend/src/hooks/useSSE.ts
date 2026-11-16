'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export interface SyncStatusData {
  account_id: string
  status: string
  folder?: string
  total?: number
  processed?: number
  folders_total?: number
  folders_done?: number
  last_synced_at?: number
  mode?: 'idle' | 'poll'
}

// 全应用共用同一条 SSE 长连接。
// 之前每个 useSSE 调用点各自 new EventSource（TopNav / Sidebar / 各页面 / 账号弹窗），
// 再叠加断线重连，很快会占满浏览器「每个主机最多 6 个 HTTP/1.1 连接」的上限，
// 导致其余请求（存草稿、联系人搜索）排队甚至超时失败。
// 这里把订阅者集中到一条连接上：有人订阅就保持连接，无人订阅即关闭。
const subscribers = {
  onMailNew: new Set<() => void>(),
  onMailUpdated: new Set<() => void>(),
  onSyncStatus: new Set<(data: SyncStatusData) => void>(),
}
let sharedEs: EventSource | null = null
let sharedTimer: ReturnType<typeof setTimeout> | null = null
let refCount = 0

function emitMailNew() { subscribers.onMailNew.forEach(fn => fn()) }
function emitMailUpdated() { subscribers.onMailUpdated.forEach(fn => fn()) }

function connectShared() {
  if (sharedEs) sharedEs.close()
  sharedEs = new EventSource(api.events.url())
  sharedEs.onopen = () => {}
  sharedEs.addEventListener('mail:new', () => emitMailNew())
  sharedEs.addEventListener('mail:updated', () => emitMailUpdated())
  sharedEs.addEventListener('sync:status', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as SyncStatusData
      subscribers.onSyncStatus.forEach(fn => fn(data))
      if (data.status === 'ok' || data.status === 'completed') emitMailUpdated()
    } catch {}
  })
  sharedEs.onerror = () => {
    // 先关掉再重连；sharedEs 始终指向当前实例，因此卸载时的 close() 一定能生效。
    sharedEs?.close()
    sharedEs = null
    if (refCount > 0) sharedTimer = setTimeout(connectShared, 3000)
  }
}

function ensureShared() {
  if (refCount === 0) {
    refCount++
    if (!sharedEs) connectShared()
  } else {
    refCount++
  }
}

function dropShared() {
  refCount = Math.max(0, refCount - 1)
  if (refCount === 0) {
    if (sharedTimer) clearTimeout(sharedTimer)
    sharedTimer = null
    sharedEs?.close()
    sharedEs = null
  }
}

export function useSSE(onMailNew?: () => void, onMailUpdated?: () => void, onSyncStatus?: (data: SyncStatusData) => void) {
  const onMailNewRef = useRef(onMailNew)
  const onMailUpdatedRef = useRef(onMailUpdated)
  const onSyncStatusRef = useRef(onSyncStatus)
  onMailNewRef.current = onMailNew
  onMailUpdatedRef.current = onMailUpdated
  onSyncStatusRef.current = onSyncStatus

  // 每个调用点注册一次固定身份的包装函数，通过 ref 读最新回调，
  // 这样组件重渲染不会注销/重连那条共享连接。
  useEffect(() => {
    const hNew = () => onMailNewRef.current?.()
    const hUpdated = () => onMailUpdatedRef.current?.()
    const hSync = (data: SyncStatusData) => onSyncStatusRef.current?.(data)
    subscribers.onMailNew.add(hNew)
    subscribers.onMailUpdated.add(hUpdated)
    subscribers.onSyncStatus.add(hSync)
    ensureShared()
    return () => {
      subscribers.onMailNew.delete(hNew)
      subscribers.onMailUpdated.delete(hUpdated)
      subscribers.onSyncStatus.delete(hSync)
      dropShared()
    }
  }, [])
}
