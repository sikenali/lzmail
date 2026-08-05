// =============================================================
// MOCK 假数据 —— 仅用于还原设计图展示效果
// 【上线前删除】删除本文件并移除 page.tsx 中对它的引用即可
// =============================================================
import type { Email, EmailDetail } from '@/types'

export const MOCK_EMAILS: Email[] = [
  {
    id: 1001, account_id: 1, uid: 101, folder: 'INBOX',
    subject: '【重要】版本更新通知：V2.3.0 已上线',
    from: 'LZMail Team', to: 'user@example.com', cc: '',
    date: '2026-07-15T09:30:00+08:00',
    body_preview: '本次更新带来全新的邮件检索体验，支持多账户批量归档与更智能的智能分类功能，欢迎体验。',
    is_read: false, is_starred: false, has_attachments: false,
    archive_path: '', message_id: '<mock-1>', created_at: '2026-07-15T09:30:00+08:00',
    account_name: 'Gmail', account_brand: '#ea4335',
  },
  {
    id: 1002, account_id: 2, uid: 102, folder: 'INBOX',
    subject: '本周技术周报 & 团队 OKR 回顾',
    from: '前端小组', to: 'user@example.com', cc: '',
    date: '2026-07-14T18:02:00+08:00',
    body_preview: '各位好，本周前端小组完成了 3 个迭代需求，交付 8 个组件，修复线上缺陷 12 个，整体进度正常。',
    is_read: false, is_starred: false, has_attachments: true,
    archive_path: '', message_id: '<mock-2>', created_at: '2026-07-14T18:02:00+08:00',
    account_name: 'Outlook', account_brand: '#0078d4',
  },
  {
    id: 1003, account_id: 1, uid: 103, folder: 'INBOX',
    subject: '你的季度账单已生成',
    from: 'Service Billing', to: 'user@example.com', cc: '',
    date: '2026-07-14T10:15:00+08:00',
    body_preview: '您好，您本季度的账单明细如下，请于 7 月 30 日前完成核对与支付。',
    is_read: true, is_starred: false, has_attachments: true,
    archive_path: '', message_id: '<mock-3>', created_at: '2026-07-14T10:15:00+08:00',
    account_name: 'Gmail', account_brand: '#ea4335',
  },
  {
    id: 1004, account_id: 2, uid: 104, folder: 'INBOX',
    subject: '产品评审会会议纪要（7/13）',
    from: '产品经理 Anna', to: 'user@example.com', cc: '',
    date: '2026-07-13T16:45:00+08:00',
    body_preview: '会议讨论了两点：一是确定了下季度路线图优先级，二是评审了新版消息通知交互稿。',
    is_read: true, is_starred: true, has_attachments: false,
    archive_path: '', message_id: '<mock-4>', created_at: '2026-07-13T16:45:00+08:00',
    account_name: 'Outlook', account_brand: '#0078d4',
  },
  {
    id: 1005, account_id: 1, uid: 105, folder: 'INBOX',
    subject: '数据同步任务执行报告',
    from: 'Noreply Report', to: 'user@example.com', cc: '',
    date: '2026-07-13T09:00:00+08:00',
    body_preview: '本期共同步 2,418 封邮件，失败 3 封，均已重试成功。',
    is_read: false, is_starred: false, has_attachments: true,
    archive_path: '', message_id: '<mock-5>', created_at: '2026-07-13T09:00:00+08:00',
    account_name: 'Gmail', account_brand: '#ea4335',
  },
  {
    id: 1006, account_id: 2, uid: 106, folder: 'INBOX',
    subject: '欢迎加入 LZMail 内测计划 🎉',
    from: 'LZMail Team', to: 'user@example.com', cc: '',
    date: '2026-07-12T14:20:00+08:00',
    body_preview: '恭喜你成为内测用户，我们将为你开放全部高级功能，期待你的反馈。',
    is_read: true, is_starred: false, has_attachments: false,
    archive_path: '', message_id: '<mock-6>', created_at: '2026-07-12T14:20:00+08:00',
    account_name: 'Outlook', account_brand: '#0078d4',
  },
  {
    id: 1007, account_id: 1, uid: 107, folder: 'INBOX',
    subject: '【公告】存储空间升级通知',
    from: 'LZMail Admin', to: 'user@example.com', cc: '',
    date: '2026-07-11T11:30:00+08:00',
    body_preview: '为提供更好的服务，免费存储空间将由 10GB 升级至 50GB，已自动生效。',
    is_read: false, is_starred: true, has_attachments: false,
    archive_path: '', message_id: '<mock-7>', created_at: '2026-07-11T11:30:00+08:00',
    account_name: 'Gmail', account_brand: '#ea4335',
  },
  {
    id: 1008, account_id: 2, uid: 108, folder: 'INBOX',
    subject: '本周社区精选：优秀实践分享',
    from: 'LZMail 社区', to: 'user@example.com', cc: '',
    date: '2026-07-10T20:10:00+08:00',
    body_preview: '本周社区精选了 5 篇高质量文章，涵盖性能优化、安全最佳实践等话题。',
    is_read: true, is_starred: false, has_attachments: true,
    archive_path: '', message_id: '<mock-8>', created_at: '2026-07-10T20:10:00+08:00',
    account_name: 'Outlook', account_brand: '#0078d4',
  },
]

export const MOCK_DETAIL: EmailDetail = {
  email: MOCK_EMAILS[0],
  attachments: [
    { id: 1, email_id: 1001, filename: '版本更新说明.pdf', mime_type: 'application/pdf', size: 245760, path: '/mock/1.pdf' },
    { id: 2, email_id: 1001, filename: '更新日志.md', mime_type: 'text/markdown', size: 15360, path: '/mock/2.md' },
  ],
  body_html: `
    <div>
      <p>各位用户：</p>
      <p>我们很高兴地宣布 <strong>LZMail V2.3.0</strong> 正式上线！本次更新带来以下亮点：</p>
      <ul>
        <li>全新的邮件检索体验，支持全文搜索</li>
        <li>多账户批量归档与标签管理</li>
        <li>更智能的自动分类功能</li>
        <li>大幅提升的同步性能</li>
      </ul>
      <p>升级不会影响你现有的邮件数据，请放心使用。</p>
      <p>感谢你的支持！</p>
    </div>
  `,
}
