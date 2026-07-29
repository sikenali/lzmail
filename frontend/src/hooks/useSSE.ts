'use client'
import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'

export function useSSE(onMailNew?: () => void, onMailUpdated?: () => void) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMailNewRef = useRef(onMailNew)
  const onMailUpdatedRef = useRef(onMailUpdated)
  onMailNewRef.current = onMailNew
  onMailUpdatedRef.current = onMailUpdated

  useEffect(() => {
    let stopped = false

    function connect() {
      if (stopped) return
      try {
        const es = new EventSource(`${api.events.url()}`)
        eventSourceRef.current = es

        es.addEventListener('mail:new', () => onMailNewRef.current?.())
        es.addEventListener('mail:updated', () => onMailUpdatedRef.current?.())
        es.addEventListener('mail:sent', () => onMailNewRef.current?.())
        es.addEventListener('sync:status', (e) => console.log('sync:', e.data))

        es.onerror = () => {
          es.close()
          eventSourceRef.current = null
          timerRef.current = setTimeout(connect, 5000)
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
