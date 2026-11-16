'use client'
import { useSyncExternalStore } from 'react'

// 视口宽度是外部可变状态：必须用 useSyncExternalStore，
// 否则在客户端首次渲染时读 window.innerWidth 会与 SSR 结果不一致，
// 触发 hydration mismatch。getServerSnapshot 固定返回 false（桌面版），
// 与 SSR HTML 保持一致，水合后自动切到真实视口。
function subscribe(callback: () => void) {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

function getSnapshot(breakpoint: number) {
  return window.innerWidth < breakpoint
}

function getServerSnapshot() {
  return false
}

export function useIsMobile(breakpoint = 768): boolean {
  return useSyncExternalStore(subscribe, () => getSnapshot(breakpoint), getServerSnapshot)
}
