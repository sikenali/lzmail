'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/#settings')
  }, [router])
  return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--app-background)' }}>
      <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>跳转中...</div>
    </div>
  )
}
