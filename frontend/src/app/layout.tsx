import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LZMail',
  description: 'Self-hosted NAS email client',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
