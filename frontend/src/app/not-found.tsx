'use client'
import Link from 'next/link'
import { ChevronLeft } from '@/lib/icons'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4" style={{ backgroundColor: 'var(--background)' }}>
      <div className="text-center">
        <div className="text-[80px] font-bold leading-none" style={{ color: 'var(--primary)' }}>404</div>
        <h1 className="text-[20px] sm:text-[24px] font-bold mt-3" style={{ color: 'var(--foreground)' }}>页面不存在</h1>
        <p className="text-[14px] sm:text-[15px] mt-2" style={{ color: 'var(--foreground-tertiary)' }}>您访问的页面不存在或已被移动</p>
        <Link href="/" className="inline-flex items-center gap-1.5 mt-6 px-5 py-2.5 rounded-[10px] font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--primary)', color: '#fff', fontSize: 14 }}>
          <ChevronLeft className="w-4 h-4" /> 返回首页
        </Link>
      </div>
    </div>
  )
}
