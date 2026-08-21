'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
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
}

export function useSSE(onMailNew?: () => void, onMailUpdated?: () => void, onSyncStatus?: (data: SyncStatusData) => void) {
  const onMailNewRef = useRef(onMailNew)
  const onMailUpdatedRef = useRef(onMailUpdated)
  const onSyncStatusRef = useRef(onSyncStatus)
  onMailNewRef.current = onMailNew
  onMailUpdatedRef.current = onMailUpdated
  onSyncStatusRef.current = onSyncStatus

  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (es) {
        es.close()
      }
      es = new EventSource(api.events.url())
      es.onopen = () => {}
      es.addEventListener('mail:new', (e: MessageEvent) => {
        onMailNewRef.current?.()
      })
      es.addEventListener('mail:updated', (e: MessageEvent) => {
        onMailUpdatedRef.current?.()
      })
      es.addEventListener('sync:status', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as SyncStatusData
          onSyncStatusRef.current?.(data)
          if (data.status === 'ok' || data.status === 'completed') {
            onMailUpdatedRef.current?.()
          }
        } catch {}
      })
      es.onerror = () => {
        es?.close()
        es = null
        reconnectTimer = setTimeout(connect, 3000)
      }
    }
    connect()
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      es?.close()
    }
  }, [])
}
