# LZMail — 懒猫微邮

<p align="center">
  <strong>自托管 · 多账号聚合 · IMAP 实时同步 · 本地归档</strong>
</p>

<p align="center">
  <img alt="Go" src="https://img.shields.io/badge/Go-1.25-00ADD8?logo=go&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-Embedded-003B57?logo=sqlite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
</p>

## 软件介绍

懒猫微邮（LZMail）是一款面向 NAS / 私有部署场景的自托管邮件客户端，支持多邮箱账号聚合管理、IMAP 实时同步、邮件本地归档与全文检索。后端采用 Go + 嵌入式 SQLite，前端基于 Next.js 15，提供仪表盘、收件箱、写邮件、联系人、设置等完整功能模块。

**核心功能**

| 功能 | 说明 |
|------|------|
| 多账号管理 | Gmail、Outlook、QQ、网易、iCloud、Yahoo、Exchange 等，支持 OAuth 2.0 / 授权码双模式，密码 AES 加密存储 |
| IMAP 同步 | IDLE 实时推送 / Polling 轮询双模式，连接复用（单文件夹仅握手一次），断线自动重连，TCP KeepAlive |
| 批量写入 | 邮件元数据批量 UPSERT，1000 封邮件从 N 次 DB round-trip 降为 1 次 |
| IDLE 保活 | 60s IDLE 续期 + 30s TCP KeepAlive，防止 NAT 路由静默断连 |
| 邮件归档 | 本地 `.eml` 原始归档存储，附件独立保存与下载，按 `账号→年→月` 目录结构组织 |
| 邮件收发 | 收件箱（所有/未读/附件/标星），邮件详情，快捷回复，附件下载，文件夹移动 |
| 邮件撰写 | 发件人选择、收件人/抄送/密送、主题、富文本工具栏（粗体/斜体/链接/附件）、定时发送 |
| 联系人管理 | 卡片视图 / 表格视图双模式，字母分组，搜索过滤，IMAP 通讯录同步 |
| 仪表盘统计 | 总邮件/未读/已发送/附件 四维统计，趋势折线图，同步状态，存储用量 |
| 实时通知 | SSE（Server-Sent Events）推送新邮件 / 已发送事件，页面自动刷新 |
| 主题与外观 | 浅色/深色/跟随系统，朱红/云蓝/玉绿/金色/墨色 主题色，字号/密度/布局调节 |
| 归档目录 | 可视化目录树导航，支持自定义归档路径与自动清理策略 |

## 代码架构

```
lzmail/
├── backend/
│   ├── cmd/lzmail/main.go           # 服务入口：配置加载、DB 初始化、路由注册、同步引擎启动
│   └── internal/
│       ├── api/                     # HTTP API 层
│       │   ├── router.go            # 路由注册（REST + SSE + OAuth）
│       │   ├── accounts.go          # 账号 CRUD（OAuth2 / 授权码）
│       │   ├── mails.go             # 邮件列表/详情/搜索/统计/标记/删除/移动
│       │   ├── compose.go           # 邮件撰写与 SMTP 发送
│       │   ├── contacts.go          # 联系人 CRUD
│       │   ├── settings.go          # 设置键值存取
│       │   ├── events.go            # SSE 事件推送
│       │   ├── bodycache.go         # 邮件正文 HTML 缓存（5分钟 TTL）
│       │   ├── eml.go               # EML 正文提取（HTML/纯文本）
│       │   ├── oauth.go             # OAuth 授权流程
│       │   ├── storage.go           # 归档目录浏览/树状结构
│       │   └── sync.go              # 同步触发接口
│       ├── sync/                    # IMAP 同步引擎
│       │   ├── engine.go            # 同步调度、增量更新、断线重连
│       │   ├── imap.go              # IMAP 连接管理、IDLE/Poll 模式
│       │   └── writeback.go         # 标志写回（已读/星标/删除/移动）
│       ├── store/                   # 数据访问层（SQLite）
│       │   ├── db.go                # 数据库连接、WAL 模式、自动迁移（v1→v4）
│       │   ├── accounts.go          # 账号增删查（密码加解密）
│       │   ├── emails.go            # 邮件增删改查、批量 UPSERT、搜索、统计
│       │   ├── contacts.go          # 联系人增删改查
│       │   └── settings.go          # 设置 KV 存取
│       ├── sse/                     # SSE Hub
│       │   └── hub.go               # 事件广播、客户端管理
│       ├── crypto/                  # 密码加解密（AES-GCM）
│       ├── archive/                 # EML 归档写入
│       │   ├── eml.go               # .eml 落盘
│       │   └── parse.go             # RFC822 解析（正文/附件）
│       ├── config/                  # 环境变量配置
│       │   └── config.go
│       ├── models/                  # 数据模型
│       │   ├── account.go
│       │   ├── email.go
│       │   ├── contact.go
│       │   └── oauth.go
│       └── providers/               # 邮箱服务商配置
│           ├── factory.go           # 服务商连接工厂
│           ├── manager.go           # OAuth 管理器
│           └── token_source.go      # OAuth Token 刷新
├── frontend/
│   ├── src/
│   │   ├── app/                     # Next.js App Router 页面
│   │   │   ├── page.tsx             # 仪表盘
│   │   │   ├── mail/
│   │   │   │   ├── page.tsx         # 收件箱（列表+筛选+搜索+内嵌详情）
│   │   │   │   └── [id]/page.tsx    # 邮件详情（正文/附件/回复）
│   │   │   ├── compose/page.tsx     # 写邮件
│   │   │   ├── contacts/page.tsx    # 联系人（卡片/表格）
│   │   │   └── settings/
│   │   │       ├── page.tsx         # 设置（账号/外观/归档/关于 Tab）
│   │   │       └── layout.tsx
│   │   ├── components/layout/       # 全局布局组件
│   │   │   ├── AppShell.tsx         # 三栏骨架（侧边栏+顶栏+主内容）
│   │   │   ├── Sidebar.tsx          # 侧边栏（导航/分类/账号列表）
│   │   │   ├── Header.tsx           # 顶栏（Logo/搜索/同步状态/头像）
│   │   │   └── AccountSwitcher.tsx  # 账号切换器
│   │   ├── components/mail/         # 邮件组件
│   │   │   ├── MailItem.tsx
│   │   │   └── MailList.tsx
│   │   ├── hooks/
│   │   │   ├── useSSE.ts            # SSE 连接与事件监听
│   │   │   └── useSettings.ts       # 设置持久化与主题切换
│   │   ├── lib/
│   │   │   ├── api.ts               # API 请求封装
│   │   │   └── icons.tsx            # 图标组件与共享工具函数
│   │   └── types/
│   │       └── index.ts             # TypeScript 类型定义
│   └── public/
└── package.json                     # 根目录并发脚本（concurrently）
```

## 部署说明

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | 后端 HTTP 服务端口 |
| `DATA_DIR` | `./data` | SQLite 数据库目录 |
| `ARCHIVE_DIR` | `./archives` | 邮件 EML 归档根目录 |
| `STORAGE_LIMIT_GB` | `50` | 邮件存储容量上限（GB） |

### Docker Compose 部署（推荐）

```yaml
# docker-compose.yml
services:
  lzmail:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        GO_BASE_IMAGE: ${GO_BASE_IMAGE:-golang:1.25-alpine}
        NODE_BASE_IMAGE: ${NODE_BASE_IMAGE:-node:20-alpine}
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8080}
    image: lzmail:latest
    container_name: lzmail-app
    ports:
      - "3000:3000"
      - "8080:8080"
    volumes:
      - lzmail_data:/app/data
      - lzmail_archives:/app/archives
    environment:
      - BACKEND_PORT=8080
      - FRONTEND_PORT=3000
      - DATA_DIR=/app/data
      - ARCHIVE_DIR=/app/archives
      - STORAGE_LIMIT_GB=${STORAGE_LIMIT_GB:-50}
      - TZ=${TZ:-Asia/Shanghai}
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://127.0.0.1:8080/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  lzmail_data:
    driver: local
  lzmail_archives:
    driver: local
```

```bash
# 1. 克隆项目
git clone https://github.com/sikenali/lzmail.git
cd lzmail

# 2. （可选）复制并修改环境变量
cp .env.docker.example .env

# 3. 构建并启动
docker-compose up -d

# 4. 查看状态与日志
docker-compose ps
docker-compose logs -f

# 5. 升级（重建镜像并保留数据）
docker-compose up -d --build
```

服务启动后访问 `http://localhost:3000`。

- **数据持久化**：数据库存于卷 `lzmail_data`，邮件归档存于卷 `lzmail_archives`，升级重建不会丢失数据。
- **远程访问**：将 `NEXT_PUBLIC_API_URL` 改为 `http://<服务器IP>:8080` 后需重新构建（`docker-compose up -d --build`）。
- **镜像加速**：构建阶段拉取不稳定的场景，可将 `GO_BASE_IMAGE` / `NODE_BASE_IMAGE` 指向内部镜像缓存或 registry mirror。

## 重要声明

1. **无官方隶属关系**
   本工具与 Microsoft、Google 及其他邮箱服务商不存在官方合作、授权、从属关系，使用本工具操作邮箱账户，必须严格遵守对应邮箱服务商用户协议、服务条款及风控规则。

2. **数据存储与安全责任**
   邮箱账号、密码等敏感凭证仅保存在本地 SQLite 数据库中。服务器 / 部署环境的运维安全、访问权限管控、防泄露防护工作由使用者全权负责，开发者不承担因服务器漏洞、配置不当导致的数据泄露责任。

3. **平台接口限制说明**
   各大邮箱服务商存在 API 调用频次限制、安全策略动态更新机制，使用工具过程中若出现接口限流、登录拦截、账号受限等问题，请根据服务商官方规范自行调整使用方式。

## 责任划分

- 因违规使用工具、违背邮箱平台协议、服务器防护不足、人为误操作所造成的账号封禁、数据丢失、隐私泄露、经济损失、行政处罚及民事 / 刑事责任，全部由**终端使用者自行承担**。
- 工具开发者不对工具运行稳定性、持续性、适配性做保证，对于使用本工具产生的一切直接、间接损失与潜在风险，不承担任何赔偿、兜底及法律责任。

## 商标声明

**懒猫微服™** 为企业注册商标，**懒猫微邮™** 属于未注册商标，两者之间没有关联关系。本开源项目仅用于个人学习与交流，非懒猫微服官方发布的邮件应用。

## License

[MIT](./LICENSE)

<p align="center">Powered by LightOS · Made for LCMD</p>
