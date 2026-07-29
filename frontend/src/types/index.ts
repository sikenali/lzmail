export interface Account {
  id: number
  name: string
  email: string
  imap_host: string
  imap_port: number
  smtp_host: string
  smtp_port: number
  auth_type: string
  auth_method: string
  provider: string
  username: string
  use_idle: boolean
  brand_color: string
  created_at: string
  updated_at: string
}

export interface Email {
  id: number
  account_id: number
  uid: number
  folder: string
  subject: string
  from: string
  from_name: string
  to: string
  cc: string
  date: string
  body_preview: string
  is_read: boolean
  is_starred: boolean
  has_attachments: boolean
  archive_path: string
  message_id: string
  created_at: string
  account_name?: string
  account_brand?: string
}

export interface Attachment {
  id: number
  email_id: number
  filename: string
  mime_type: string
  size: number
  path: string
}

export interface Contact {
  id: number
  name: string
  email: string
  phone?: string
  company?: string
  title?: string
  account_id: number
  created_at: string
  updated_at: string
}

export interface MailStats {
  total_emails: number
  unread_emails: number
  today_emails: number
  account_count: number
  storage_bytes: number
  storage_limit?: number
  contact_count?: number
}

export interface EmailDetail {
  email: Email
  attachments: Attachment[]
  body_html: string
  schedule_at?: string
}

export interface ComposePayload {
  account_id: number
  to: string
  cc: string
  bcc: string
  subject: string
  body_text: string
  body_html: string
  schedule_at?: string
  draft?: boolean
  attachments?: Array<{ filename: string; path: string }>
  reply_to?: string
  references?: string
}

export interface StorageTreeNode {
  name: string
  is_dir: boolean
  path: string
  children?: StorageTreeNode[]
}
