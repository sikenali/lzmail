# LZMail — NAS 邮件客户端设计文档

## 概述

LZMail 是一款运行在 NAS（主推懒猫微服）上的自托管邮件客户端，兼容任何支持 Docker 部署的 NAS 环境。用户通过单一 Web 界面统一管理 Gmail、Outlook、QQ 邮箱、网易邮箱、iCloud、新浪邮箱等多个平台的邮件。所有邮件数据存储在本地 NAS，隐私可控。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js + React + Tailwind CSS v4.2.1 + Framer Motion v12.40.0 |
| 前端组件 | Lucide React v0.577.0、Sonner v2.0.7、Recharts v3.8.1 |
| 后端 | Go |
| 数据库 | SQLite (WAL 模式) |
| 邮件协议 | IMAP (IDLE/Poll) + SMTP |
| 实时通信 | SSE (Server-Sent Events) |
| 部署 | Docker |

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                  Browser (Next.js)                   │
│  SSR pages | React components | Tailwind | Framer   │
│  SSE ←→ REST API ←→ LocalStorage 缓存              │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/SSE
┌──────────────────────▼──────────────────────────────┐
│              Go 单体 (lzmail-server)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ REST API │  │ SSE Push │  │ IMAP Sync Engine  │   │
│  │ (Echo)   │  │   Hub    │  │ (goroutine pool)  │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│  ┌──────────────────────────────────────────────┐    │
│  │            SQLite (WAL 模式)                    │    │
│  │  accounts | folders | emails | contacts       │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

- Go 单体对外暴露 REST API + SSE 端点
- 每个邮箱账号启动一个 goroutine，跑 IMAP IDLE（支持降级到 Poll）
- SQLite WAL 模式，支持并发读写
- Next.js 负责 SSR + 前端渲染，API 全部走 Go

## 路由结构

| 路径 | 页面 |
|---|---|
| `/` | 仪表盘（概览） |
| `/mail` | 收件箱（默认统一收件箱） |
| `/mail?account=xx` | 按邮箱筛选 |
| `/mail/:id` | 邮件详情 |
| `/compose` | 写邮件 |
| `/contacts` | 联系人 |
| `/settings` | 设置（账号管理、归档目录、外观） |

## 界面布局

```
┌──────┬──────────────────────────────────────────────┐
│      │  搜索栏  │  写邮件  │  设置  │  头像          │
│ 侧栏 ├──────────────────────────────────────────────┤
│      │                                              │
│ 所有 │  ┌────────────────┐                          │
│ 收件 │  │ 邮件列表        │  邮件预览/详情区域      │
│ 标星 │  │ - Gmail: 主题   │                         │
│ 稍后 │  │ - QQ:   主题    │  (右侧分栏)             │
│ 已发 │  │ - 163:  主题    │                          │
│ 草稿 │  └────────────────┘                          │
│ 垃圾 │                                              │
│      │                                              │
│ ──── │                                              │
│ 分类 │                                              │
│      │                                              │
│      │                                              │
│ ──── │                                              │
│ 📧   │             左侧三栏+右侧详情                │
│ Gmail│                                              │
│ 账号+│ 移动端：Drawer侧栏 + 上下堆叠                 │
│ 管理 │                                              │
└──────┴──────────────────────────────────────────────┘
```

左下角区域展示当前活跃账号，点击弹出切换面板，支持快捷切换上下文和添加新账号。

### 移动端适配
- 侧栏 → Drawer 滑动菜单
- 邮件列表/详情 → 全屏切换（列表→详情）
- 触控友好间距

### 视觉亮点
- 每个邮箱使用独立品牌色标识
- 邮件列表左侧彩色竖条标识来源
- 明暗主题切换（Tailwind CSS dark mode）
- Framer Motion：列表入场、邮件展开、滑动手势

## 存储设计

### SQLite 核心库
存储账号配置、邮件元数据（ID、主题、发件人、时间、文件夹、已读状态、附件索引等）、联系人。WAL 模式，正文只存摘要。

### .eml 归档

```
NAS 归档目录
└── lzmail/
    └── archives/
        └── <account_id>/
            └── YYYY/
                └── MM/
                    ├── <message_id>.eml
                    └── attachments/
                        └── <message_id>/
                            ├── photo.jpg
                            └── document.pdf
```

- IMAP FETCH 新邮件时，.eml 写入归档目录，附件解出到 attachments/
- SQLite 存邮件摘要 + .eml 路径
- 邮件详情从 .eml 文件解析渲染
- 附件下载直接返回文件

## 同步引擎

```
每个账号独立 goroutine
  ├── IDLE 监听（Gmail/Outlook/QQ）
  │    └── 新邮件推送到 SSE → 前端即时通知
  ├── Poll 定时轮询（网易/iCloud/新浪/自定义IMAP）
  │    └── 增量同步（只拉新 UID）
  └── 发信通过 SMTP，发完通过 SSE 通知

Sync Pipeline:
  1. IDLE 监听 / Poll 定时触发
  2. FETCH 新邮件 (UID)
  3. 写 .eml 归档
  4. 解压附件
  5. 写 SQLite 摘要
  6. SSE 推送通知
```

重启后自动扫描 SQLite 账号列表，恢复所有 goroutine。

## 邮箱授权方式

| 邮箱平台 | 认证方式 | 实时同步 | 发送邮件 |
|---|---|---|---|
| Gmail | OAuth 2.0 / 应用密码 | IDLE | SMTP |
| Outlook | OAuth 2.0 / 应用密码 | IDLE | SMTP |
| QQ 邮箱 | 授权码 | IDLE | SMTP |
| 网易邮箱 (163/126/yeah) | 授权码 | Poll | SMTP |
| iCloud | 应用专用密码 | Poll | SMTP |
| 新浪邮箱 | 授权码 | Poll | SMTP |
| 自定义 IMAP/SMTP | 账号密码 | Poll | SMTP |

Gmail/Outlook 提供 OAuth 双通道，Go 后端内嵌 OAuth 回调 server。

## 后端 API 设计

### REST 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/v1/accounts | 账号列表 |
| POST | /api/v1/accounts | 添加账号 |
| DELETE | /api/v1/accounts/:id | 删除账号 |
| GET | /api/v1/mails | 邮件列表（支持分页/筛选） |
| GET | /api/v1/mails/:id | 邮件详情 |
| POST | /api/v1/mails/:id/star | 标星 |
| POST | /api/v1/mails/:id/read | 标记已读 |
| DELETE | /api/v1/mails/:id | 删除邮件 |
| POST | /api/v1/compose | 发送邮件 |
| PUT | /api/v1/compose/draft | 保存草稿 |
| GET | /api/v1/contacts | 联系人列表 |
| GET | /api/v1/attachments/:id | 附件下载 |
| GET | /api/v1/sync/status | 同步状态 |
| GET | /api/v1/events | SSE 事件流 |

### SSE 事件类型

- `mail:new` — 新邮件到达
- `mail:updated` — 邮件状态变更
- `sync:status` — 同步进度

## 非功能需求

- 单用户私有部署，不涉及用户隔离
- Docker 容器化一键部署
- 响应式设计，桌面/平板/手机适配
- 邮件本地完整备份（.eml 格式），迁移零依赖
