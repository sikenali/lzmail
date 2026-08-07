'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Account, Email, Contact, MailStats } from '@/types'

const DEBOUNCE_MS = 300

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
}

export function useSSE(onMailNew?: () => void, onMailUpdated?: () => void, onSyncStatus?: (data: SyncStatusData) => void) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMailNewRef = useRef(onMailNew)
  const onMailUpdatedRef = useRef(onMailUpdated)
  const onSyncStatusRef = useRef(onSyncStatus)
  onMailNewRef.current = onMailNew
  onMailUpdatedRef.current = onMailUpdated
  onSyncStatusRef.current = onSyncStatus

  useEffect(() => {
    let stopped = false
    let reconnectAttempts = 0

    function connect() {
      if (stopped) return
      try {
        const es = new EventSource(`${api.events.url()}`)
        eventSourceRef.current = es
        reconnectAttempts = 0

        es.addEventListener('mail:new', () => onMailNewRef.current?.())
        es.addEventListener('mail:updated', () => onMailUpdatedRef.current?.())
        es.addEventListener('mail:sent', () => onMailNewRef.current?.())
        es.addEventListener('sync:status', (e) => {
          try {
            const data = JSON.parse(e.data)
            onSyncStatusRef.current?.(data)
          } catch {}
        })

        es.onerror = () => {
          es.close()
          eventSourceRef.current = null
          reconnectAttempts++
          const delay = Math.min(5000 * Math.pow(1.5, reconnectAttempts), 30000)
          timerRef.current = setTimeout(connect, delay)
        }
      } catch {}
    }

    connect()

    return () => {
      stopped = true
      if (timerRef.current) clearTimeout(timerRef.current)
      eventSourceRef.current?.close()
    }
  }, [])
}
