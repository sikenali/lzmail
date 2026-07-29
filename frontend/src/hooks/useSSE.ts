'use client'
import { useEffect, useRef } from 'react'

const SSE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export function useSSE(onMailNew?: () => void, onMailUpdated?: () => void) {
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(`${SSE_URL}/api/v1/events`)
    eventSourceRef.current = es

    es.addEventListener('mail:new', () => onMailNew?.())
    es.addEventListener('mail:updated', () => onMailUpdated?.())
    es.addEventListener('sync:status', (e) => console.log('sync:', e.data))

    es.onerror = () => {
      es.close()
      setTimeout(() => {
        new EventSource(`${SSE_URL}/api/v1/events`)
      }, 5000)
    }

    return () => es.close()
  }, [onMailNew, onMailUpdated])
}
