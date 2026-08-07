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
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-[90%] max-w-[400px] rounded-[16px] p-6 shadow-lg"
        style={{ backgroundColor: 'var(--card)', border: '0.7px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--danger-bg)' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>{title}</h3>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 h-9 rounded-lg text-[13px] font-medium transition-colors"
            style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground-tertiary)', backgroundColor: 'var(--muted)' }}
          >
            取消
          </button>
          <button
            onClick={() => { onConfirm(); onCancel() }}
            className="px-4 h-9 rounded-lg text-[13px] font-medium text-white transition-opacity hover:opacity-85"
            style={{ backgroundColor: 'var(--danger)' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
