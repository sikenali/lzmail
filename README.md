# LZMail — 自托管邮件客户端

<p align="center">
  <strong>本地 IMAP 同步 · 邮件归档存储 · 多账号聚合管理</strong>
</p>

<p align="center">
  <img alt="Go" src="https://img.shields.io/badge/Go-1.25-00ADD8?logo=go&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-Embedded-003B57?logo=sqlite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
</p>

## 软件介绍

LZMail 是一款面向 NAS / 私有部署场景的自托管邮件客户端，支持多邮箱账号聚合管理、IMAP 实时同步、邮件本地归档与全文检索。后端采用 Go + 嵌入式 SQLite，前端基于 Next.js 15，提供仪表盘、收件箱、写邮件、联系人、设置等完整功能模块。

**核心功能**

| 功能 | 说明 |
|------|------|
| 多账号管理 | Gmail、Outlook、QQ、网易、iCloud 等，IMAP/SMTP 配置持久化，密码 AES 加密存储 |
| IMAP 同步 | IDLE 实时推送 / Polling 轮询双模式，增量同步，断线重连 |
| 邮件归档 | 本地 `.eml` 归档存储，支持附件解压，按账号→年→月目录结构组织 |
| 邮件收发 | 完整收件箱（所有/未读/附件/标星），邮件详情，快捷回复，附件下载 |
| 邮件撰写 | 发件人选择、收件人/抄送、主题、富文本工具栏（粗体/斜体/链接/附件）、定时发送 |
| 联系人管理 | 卡片视图 / 表格视图双模式，字母分组，搜索过滤，新建联系人 |
| 仪表盘统计 | 总邮件/未读/已发送/附件 四维统计，趋势折线图，同步状态，存储用量 |
| 实时通知 | SSE（Server-Sent Events）推送新邮件 / 已发送事件，页面自动刷新 |
| 主题与外观 | 浅色/深色/跟随系统，朱红/云蓝/玉绿/金色/墨色 主题色，字号/密度/布局调节 |
| 设置管理 | 账号管理、外观设置、归档配置（目录/结构/统计/清理）、关于信息 |

## 代码架构

```
lzmail/
├── backend/
│   ├── cmd/lzmail/main.go           # 服务入口：配置加载、DB 初始化、路由注册、同步引擎启动
│   ├── internal/
│   │   ├── api/                     # HTTP API 层
│   │   │   ├── router.go            # 路由注册（REST + SSE）
│   │   │   ├── accounts.go          # 账号 CRUD
│   │   │   ├── mails.go             # 邮件列表/详情/搜索/统计/标记/删除
│   │   │   ├── compose.go           # 邮件撰写与 SMTP 发送
│   │   │   ├── contacts.go          # 联系人 CRUD
│   │   │   ├── settings.go          # 设置键值存取
│   │   │   ├── events.go            # SSE 事件推送
│   │   │   ├── bodycache.go         # 邮件正文 HTML 缓存
│   │   │   └── eml.go               # EML 解析与附件提取
│   │   ├── sync/                    # IMAP 同步引擎
│   │   │   ├── engine.go            # 同步调度、增量更新、断线重连
│   │   │   └── imap.go              # IMAP 连接管理、IDLE/Poll 模式
│   │   ├── store/                   # 数据访问层（SQLite）
│   │   │   ├── db.go                # 数据库连接、WAL 模式、自动迁移
│   │   │   ├── accounts.go          # 账号增删查（密码加解密）
│   │   │   ├── emails.go            # 邮件增删改查、搜索、统计
│   │   │   ├── contacts.go          # 联系人增删改查
│   │   │   └── settings.go          # 设置 KV 存取
│   │   ├── sse/                     # SSE Hub
│   │   │   └── hub.go               # 事件广播、客户端管理
│   │   ├── crypto/                  # 密码加解密（AES-GCM）
│   │   ├── archive/                 # EML 归档写入
│   │   │   └── eml.go
│   │   ├── config/                  # 环境变量配置
│   │   │   └── config.go
│   │   └── models/                  # 数据模型
│   │       ├── account.go
│   │       ├── email.go
│   │       └── contact.go
├── frontend/
│   ├── src/
│   │   ├── app/                     # Next.js App Router 页面
│   │   │   ├── page.tsx             # 仪表盘
│   │   │   ├── mail/
│   │   │   │   ├── page.tsx         # 收件箱（列表 + 筛选 + 搜索）
│   │   │   │   └── [id]/page.tsx    # 邮件详情（正文/附件/回复）
│   │   │   ├── compose/page.tsx     # 写邮件
│   │   │   ├── contacts/page.tsx    # 联系人（卡片/表格）
│   │   │   └── settings/
│   │   │       ├── page.tsx         # 设置（账号/外观/归档/关于 Tab）
│   │   │       └── layout.tsx
│   │   ├── components/layout/       # 全局布局组件
│   │   │   ├── AppShell.tsx         # 三栏骨架（侧边栏 + 顶栏 + 主内容）
│   │   │   ├── Sidebar.tsx          # 侧边栏（导航/分类/账号列表）
│   │   │   └── Header.tsx           # 顶栏（搜索/同步状态/头像）
│   │   ├── components/mail/         # 邮件组件
│   │   │   ├── MailItem.tsx
│   │   │   └── MailList.tsx
│   │   ├── hooks/
│   │   │   ├── useSSE.ts            # SSE 连接与事件监听
│   │   │   └── useSettings.ts       # 设置持久化与主题切换
│   │   ├── lib/
│   │   │   └── api.ts               # API 请求封装
│   │   └── types/
│   │       └── index.ts             # TypeScript 类型定义
│   └── public/
└── package.json                     # 根目录并发脚本（concurrently）
```

## 部署说明

### 环境要求

- Go ≥ 1.25
- Node.js ≥ 20
- npm / pnpm

### 开发模式

同时启动后端 + 前端热更新：

```bash
npm run dev
```

后端监听 `:8080`，前端开发服务器 `:3000`，通过代理请求后端 API。

### 生产构建

**后端**（交叉编译为单文件二进制）：

```bash
cd backend
go build -o lzmail ./cmd/lzmail/
```

**前端**（Next.js standalone 输出）：

```bash
cd frontend
npm run build
```

**一键构建**（根目录）：

```bash
npm run build
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | 后端 HTTP 服务端口 |
| `DATA_DIR` | `./data` | SQLite 数据库目录 |
| `ARCHIVE_DIR` | `./archives` | 邮件 EML 归档根目录 |

### Docker 部署

```dockerfile
FROM golang:1.25-alpine AS backend
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend ./
RUN go build -o lzmail ./cmd/lzmail/

FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM alpine:latest
COPY --from=backend /app/lzmail /lzmail
COPY --from=frontend /app/frontend/.next /app/.next
COPY --from=frontend /app/frontend/node_modules /app/node_modules
COPY --from=frontend /app/frontend/package.json /app/
WORKDIR /app
EXPOSE 8080
CMD ["/lzmail"]
```

### Nginx 配置

```nginx
server {
  listen 80;
  server_name mail.your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
  }

  location /api/v1/events {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
  }
}
```

## 声明

1. **使用目的**：本工具面向个人 / 小团队私有部署，用于管理自有邮箱账号。
2. **数据安全**：邮件密码采用 AES-GCM 加密存储，邮件正文与附件归档于本地磁盘，不上传至第三方服务器。
3. **免责声明**：本工具按"现有状态"提供，不作任何形式的明示或默示保证。作者或版权持有人不对因使用本工具而产生的数据丢失、隐私泄露或其他责任负责。

## License

[MIT](./LICENSE)
