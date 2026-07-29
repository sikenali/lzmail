import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LZMail',
  description: 'Self-hosted NAS email client',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
