'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useSettings } from '@/hooks/useSettings'
import { Plus, Mail as MailIcon, MoreVertical, ChevronDown, Star, Send, Phone, MoreHorizontal, UserAdd, ArrowUpDown, X } from '@/lib/icons'
import type { Contact } from '@/types'

// MOCK 假数据（上线前删除）
const MOCK_CONTACTS: Contact[] = [
  { id: 1, name: '张伟', email: 'zhangwei@qq.com', phone: '138-0000-1234', title: '产品经理', company: '腾讯', account_id: 1, created_at: '', updated_at: '' },
  { id: 2, name: '刘芳', email: 'liufang@outlook.com', phone: '139-0000-5678', title: '设计师', company: '阿里', account_id: 1, created_at: '', updated_at: '' },
  { id: 3, name: '王明', email: 'wangming@gmail.com', phone: '137-0000-9012', title: '工程师', company: '字节', account_id: 2, created_at: '', updated_at: '' },
  { id: 4, name: '李娜', email: 'lina@163.com', phone: '136-0000-3456', title: '市场总监', company: '华为', account_id: 2, created_at: '', updated_at: '' },
  { id: 5, name: '赵强', email: 'zhaoqiang@icloud.com', phone: '135-0000-7890', title: '运营', company: '小米', account_id: 1, created_at: '', updated_at: '' },
  { id: 6, name: '陈静', email: 'chenjing@company.com', phone: '134-0000-1111', title: '财务', company: '京东', account_id: 2, created_at: '', updated_at: '' },
  { id: 7, name: '孙磊', email: 'sunlei@partner.com', phone: '133-0000-2222', title: '销售', company: '百度', account_id: 1, created_at: '', updated_at: '' },
  { id: 8, name: '周雪', email: 'zhouxue@qq.com', phone: '132-0000-3333', title: 'HR', company: '美团', account_id: 2, created_at: '', updated_at: '' },
]

const avatarColors: Record<string, { bg: string; text: string }> = {
  '张': { bg: 'rgba(253,242,242,1)', text: '#c43d3d' },
  '刘': { bg: 'rgba(237,245,236,1)', text: '#5b8c5a' },
  '王': { bg: 'rgba(240,244,247,1)', text: '#6b8fa3' },
  '李': { bg: 'rgba(254,249,240,1)', text: '#c9a96e' },
  '赵': { bg: 'rgba(253,242,242,1)', text: '#c43d3d' },
  '陈': { bg: 'rgba(237,245,236,1)', text: '#5b8c5a' },
  '孙': { bg: 'rgba(240,244,247,1)', text: '#6b8fa3' },
  '周': { bg: 'rgba(254,249,240,1)', text: '#c9a96e' },
}

function getAvatarStyle(name: string) {
  const initial = name?.[0] || '?'
  return avatarColors[initial] || { bg: 'rgba(243,237,227,1)', text: '#8b7355' }
}

function ContactCard({ contact }: { contact: Contact }) {
  const style = getAvatarStyle(contact.name)
  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: '#ffffff',
        border: '0.7px solid rgba(229,217,196,1)',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 12px rgba(139,115,85,0.06)',
        flex: 1,
      }}
    >
      {/* Header: avatar + name/title + star */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 56, height: 56, borderRadius: 9999, backgroundColor: style.bg }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, color: style.text }}>
            {contact.name?.[0] || '?'}
          </span>
        </div>
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16, fontWeight: 600, color: '#3d2b1f', lineHeight: '22px' }}>
              {contact.name || '(无名)'}
            </span>
            <Star className="w-4 h-4 shrink-0" style={{ color: '#b8a88a' }} />
          </div>
          {contact.title && (
            <span style={{ fontSize: 13, color: '#8b7355', lineHeight: '18px' }}>
              {contact.title}
            </span>
          )}
        </div>
      </div>

      {/* Info: email + phone */}
      <div className="flex flex-col gap-2 mb-4">
        {contact.email && (
          <div className="flex items-center gap-2">
            <MailIcon className="w-4 h-4 shrink-0" style={{ color: '#b8a88a' }} />
            <span style={{ fontSize: 13, color: '#6b5b4f' }}>{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 shrink-0" style={{ color: '#b8a88a' }} />
            <span style={{ fontSize: 13, color: '#6b5b4f' }}>{contact.phone}</span>
          </div>
        )}
      </div>

      {/* Action: 发邮件 button */}
      <div className="mt-auto">
        <button
          className="flex items-center justify-center gap-2 w-full h-[37px] rounded-[8px]"
          style={{
            backgroundColor: style.bg,
            color: style.text,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <SendPlane className="w-[14px] h-[14px]" style={{ color: style.text }} />
          发邮件
        </button>
      </div>
    </div>
  )
}

function ContactTableRow({ contact, density }: { contact: Contact; density: string }) {
  const style = getAvatarStyle(contact.name)
  const rowHeight = density === 'compact' ? 40 : 57
  return (
    <div
      className="flex items-center"
      style={{ height: rowHeight, padding: '0 16px' }}
    >
      {/* Name */}
      <div className="flex items-center gap-3" style={{ width: 220, flexShrink: 0 }}>
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: density === 'compact' ? 24 : 32, height: density === 'compact' ? 24 : 32, borderRadius: 9999, backgroundColor: style.bg }}
        >
          <span style={{ fontSize: density === 'compact' ? 10 : 12, fontWeight: 600, color: style.text }}>
            {contact.name?.[0] || '?'}
          </span>
        </div>
        <span style={{ fontSize: density === 'compact' ? 13 : 14, fontWeight: 500, color: '#3d2b1f' }}>
          {contact.name || '(无名)'}
        </span>
      </div>

      {/* Email */}
      <div style={{ width: 308, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: '#6b5b4f' }}>{contact.email || '—'}</span>
      </div>

      {/* Phone */}
      <div style={{ width: 198, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: '#6b5b4f' }}>{contact.phone || '—'}</span>
      </div>

      {/* Company */}
      <div style={{ width: 198, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: '#6b5b4f' }}>{contact.company || '—'}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2" style={{ width: 132, flexShrink: 0 }}>
        <button
          className="flex items-center justify-center"
          style={{ width: density === 'compact' ? 28 : 32, height: density === 'compact' ? 28 : 32, borderRadius: 8, backgroundColor: style.bg }}
          title="发邮件"
        >
          <MailIcon className="w-4 h-4" style={{ color: style.text }} />
        </button>
        <button
          className="flex items-center justify-center"
          style={{ width: density === 'compact' ? 28 : 32, height: density === 'compact' ? 28 : 32, borderRadius: 8, backgroundColor: 'rgba(243,237,227,1)' }}
          title="更多"
        >
          <MoreHorizontal className="w-4 h-4" style={{ color: '#6b5b4f' }} />
        </button>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const { settings } = useSettings()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '', title: '' })

  useEffect(() => {
    // MOCK 假数据（上线前删除）
    setContacts(MOCK_CONTACTS)
    setLoading(false)
  }, [])

  const density = settings.mail_density || 'comfortable'

  return (
    <AppShell>
      <div className="px-10 py-8" style={{ backgroundColor: 'var(--background)', minHeight: '100%' }}>
        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="shrink-0" style={{ width: 5, height: 32, borderRadius: 2, backgroundColor: 'rgba(107,143,163,1)' }} />
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#3d2b1f', lineHeight: '36px', margin: 0 }}>
                联系人
              </h1>
              <p style={{ fontSize: 13, color: '#8b7355', lineHeight: '18px', margin: '4px 0 0' }}>
                管理您的联系人列表
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 h-[47px] px-5 rounded-[12px] text-[14px] font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'rgba(107,143,163,1)', color: '#ffffff' }}
          >
            <UserAdd className="w-4 h-4" />
            添加联系人
          </button>
        </div>

        {/* Featured contacts grid */}
        {!loading && contacts.length > 0 && (
          <div className="mb-8" style={{ paddingTop: 32 }}>
            <div className="flex gap-5" style={{ display: 'flex' }}>
              {contacts.slice(0, 4).map((c) => (
                <ContactCard key={c.id} contact={c} />
              ))}
            </div>
          </div>
        )}

        {/* Table section */}
        <div
          className="rounded-[16px]"
          style={{
            backgroundColor: '#ffffff',
            padding: 24,
          }}
        >
          {/* Table title bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0" style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: 'rgba(107,143,163,1)' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#3d2b1f' }}>
                全部联系人
              </span>
              <span
                className="flex items-center justify-center"
                style={{
                  width: 42,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: 'rgba(240,244,247,1)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#6b8fa3',
                }}
              >
                {contacts.length}人
              </span>
            </div>
            <button
              className="flex items-center gap-1 h-8 px-3 rounded-[8px]"
              style={{ backgroundColor: 'rgba(243,237,227,1)', fontSize: 12, fontWeight: 500, color: '#6b5b4f' }}
            >
              按名称
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table header */}
          <div
            className="flex items-center"
            style={{ height: 41, padding: '0 16px', marginBottom: 0 }}
          >
            <div style={{ width: 220, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b8a88a' }}>姓名</span>
            </div>
            <div style={{ width: 308, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b8a88a' }}>邮箱</span>
            </div>
            <div style={{ width: 198, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b8a88a' }}>电话</span>
            </div>
            <div style={{ width: 198, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b8a88a' }}>公司</span>
            </div>
            <div style={{ width: 132, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b8a88a' }}>操作</span>
            </div>
          </div>

          {/* Table body */}
          <div className="flex flex-col" style={{ paddingTop: 4 }}>
            {loading ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--muted)' }}>
                  <MailIcon className="w-8 h-8" style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--foreground-tertiary)' }}>暂无联系人</p>
              </div>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  style={{ borderBottom: '1px solid rgba(229,217,196,1)' }}
                >
                  <ContactTableRow contact={c} density={density} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add contact modal */}
        {showAddForm && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            onClick={() => setShowAddForm(false)}
          >
            <div
              className="bg-[var(--card)] rounded-[16px] p-6 w-[440px]"
              style={{ border: '1px solid rgba(229,217,196,1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>新建联系人</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[var(--muted)]"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--foreground-tertiary)' }} />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  placeholder="姓名"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full h-[40px] px-4 rounded-[8px] outline-none text-[14px] bg-transparent"
                  style={{ border: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground)' }}
                />
                <input
                  placeholder="邮箱地址"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full h-[40px] px-4 rounded-[8px] outline-none text-[14px] bg-transparent"
                  style={{ border: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground)' }}
                />
                <input
                  placeholder="电话"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full h-[40px] px-4 rounded-[8px] outline-none text-[14px] bg-transparent"
                  style={{ border: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground)' }}
                />
                <input
                  placeholder="公司"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  className="w-full h-[40px] px-4 rounded-[8px] outline-none text-[14px] bg-transparent"
                  style={{ border: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground)' }}
                />
                <input
                  placeholder="职位"
                  value={newContact.title}
                  onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                  className="w-full h-[40px] px-4 rounded-[8px] outline-none text-[14px] bg-transparent"
                  style={{ border: '0.7px solid rgba(229,217,196,1)', color: 'var(--foreground)' }}
                />
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 h-9 rounded-[8px] text-[14px] hover:bg-[var(--muted)]"
                    style={{ border: '1px solid rgba(229,217,196,1)', color: 'var(--foreground-tertiary)' }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      if (!newContact.name || !newContact.email) return
                      // MOCK 假数据（上线前删除）
                      const newId = Math.max(...contacts.map((c) => c.id), 0) + 1
                      setContacts((prev) => [
                        ...prev,
                        {
                          id: newId,
                          name: newContact.name,
                          email: newContact.email,
                          phone: newContact.phone,
                          company: newContact.company,
                          title: newContact.title,
                          account_id: 1,
                          created_at: '',
                          updated_at: '',
                        },
                      ])
                      setShowAddForm(false)
                      setNewContact({ name: '', email: '', phone: '', company: '', title: '' })
                    }}
                    className="px-4 h-9 bg-[var(--primary)] text-white rounded-[8px] text-[14px] font-medium hover:opacity-90"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export const dynamic = 'force-dynamic'
