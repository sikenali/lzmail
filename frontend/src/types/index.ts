export interface Account {
  id: number
  name: string
  email: string
  imap_host: string
  imap_port: number
  smtp_host: string
  smtp_port: number
  auth_type: string
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
}

export interface Contact {
  id: number
  name: string
  email: string
  account_id: number
  created_at: string
  updated_at: string
}
