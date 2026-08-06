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

export function useSSE(onMailNew?: () => void, onMailUpdated?: () => void, onSyncStatus?: (status: string, accountId: string) => void) {
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
            onSyncStatusRef.current?.(data.status, String(data.account_id ?? ''))
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
