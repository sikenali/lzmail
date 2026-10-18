import type { Metadata, Viewport } from 'next'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#232324' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('lzmail_theme');var dark=false;if(t==='dark'){dark=true}else if(t==='light'){dark=false}else{var mq=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');dark=!!(mq&&mq.matches)}document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.style.colorScheme=dark?'dark':'light'}catch(e){}})()` }}
          suppressHydrationWarning
        />
        <noscript>
          <script dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light'` }} />
        </noscript>
      </head>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  )
}
