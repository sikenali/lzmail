'use client'
import { useState } from 'react'

interface DeleteConfirmProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirm({ open, onConfirm, onCancel }: DeleteConfirmProps) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--foreground)' }}>确认删除</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>确定要删除这封邮件吗？此操作不可撤销。</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--foreground-secondary)', backgroundColor: 'var(--muted)' }}
          >
            取消
          </button>
          <button
            onClick={() => { onConfirm(); onCancel() }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--danger)' }}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
