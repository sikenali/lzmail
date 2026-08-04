import type { Metadata } from 'next'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import './globals.css'
import './remixicon.css'

export const metadata: Metadata = {
  title: 'LZMail',
  description: 'Self-hosted NAS email client',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  )
}
