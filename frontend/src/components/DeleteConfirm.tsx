'use client'
import { useState } from 'react'
import { AlertTriangle } from '@/lib/icons'

interface DeleteConfirmProps {
  open: boolean
  title?: string
  message?: string
  confirmText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirm({ open, title = '确认删除', message = '确定要删除吗？此操作不可撤销。', confirmText = '删除', onConfirm, onCancel }: DeleteConfirmProps) {
  const [confirming, setConfirming] = useState(false)
  if (!open) return null
  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm()
      onCancel()
    } catch {
      // 操作失败，保持弹框打开让用户重试
    } finally {
      setConfirming(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" />
      <div
        className="relative w-[90%] max-w-[400px] rounded-[14px] p-6 shadow-lg"
        style={{ backgroundColor: 'var(--color-bg-card)', border: '0.6px solid var(--color-border)', boxShadow: 'var(--modal-shadow)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--danger-bg)', border: '0.6px solid color-mix(in srgb, var(--danger) 25%, transparent)' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>{title}</h3>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="px-4 h-9 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
            style={{ border: '0.6px solid var(--color-border)', color: 'var(--foreground-tertiary)', backgroundColor: 'transparent' }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="px-4 h-9 rounded-lg text-[13px] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ backgroundColor: 'var(--danger)' }}
          >
            {confirming ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
