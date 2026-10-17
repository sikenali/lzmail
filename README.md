# LZMail — 懒猫微邮

<p align="center">
  <strong>自托管 · 多账号聚合 · IMAP 实时同步 · 本地归档 · 移动端支持</strong>
</p>

<p align="center">
  <img alt="Go" src="https://img.shields.io/badge/Go-1.25-00ADD8?logo=go&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-Embedded-003B57?logo=sqlite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
</p>

## 软件说明

懒猫微邮（LZMail）是一款面向 NAS / 私有部署场景的自托管邮件客户端，支持多邮箱账号聚合管理、IMAP 实时同步、邮件本地归档与全文检索。后端采用 Go + 嵌入式 SQLite，前端基于 Next.js 15，同时支持桌面浏览器与移动端访问，提供完整的邮件管理与联系人功能。

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
| 移动端适配 | 响应式布局，手机/平板均可正常使用，移动端专属交互优化 |

## 部署说明

### LPK 部署

```bash
cd lzc && bash package.sh        # 本地打包生成 .lpk
lzc-cli lpk install cloud.lazycat.app.lzmail-<版本>.lpk
```

访问应用：`https://<子域名>.<域名>`

## 软件声明

### 重要声明

1. **无官方隶属关系**
   本工具与 Microsoft、Google 及其他邮箱服务商不存在官方合作、授权、从属关系，使用本工具操作邮箱账户，必须严格遵守对应邮箱服务商用户协议、服务条款及风控规则。

2. **数据存储与安全责任**
   邮箱账号、密码等敏感凭证仅保存在本地 SQLite 数据库中。服务器 / 部署环境的运维安全、访问权限管控、防泄露防护工作由使用者全权负责，开发者不承担因服务器漏洞、配置不当导致的数据泄露责任。

3. **平台接口限制说明**
   各大邮箱服务商存在 API 调用频次限制、安全策略动态更新机制，使用工具过程中若出现接口限流、登录拦截、账号受限等问题，请根据服务商官方规范自行调整使用方式。

### 责任划分

- 因违规使用工具、违背邮箱平台协议、服务器防护不足、人为误操作所造成的账号封禁、数据丢失、隐私泄露、经济损失、行政处罚及民事 / 刑事责任，全部由**终端使用者自行承担**。
- 工具开发者不对工具运行稳定性、持续性、适配性做保证，对于使用本工具产生的一切直接、间接损失与潜在风险，不承担任何赔偿、兜底及法律责任。

### 商标声明

**懒猫微服™** 为企业注册商标，**懒猫微邮™** 属于未注册商标，两者之间没有关联关系。本开源项目仅用于个人学习与交流，非懒猫微服官方发布的邮件应用。

## License

[MIT](./LICENSE)

<p align="center">Powered by LightOS · Made for LCMD</p>
