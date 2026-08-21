# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-08-21

### 新增功能
- **邮件标签管理**：支持为邮件创建、管理自定义标签，标签与邮件关联存储，删除邮件时自动清理关联
- **自动清理已删除邮件**：设置页面「归档目录」新增自动清理功能，可配置清理周期（30/90/180天或永不清理），后台每 6 小时自动执行；支持手动立即清理，删除 Trash 文件夹中过期邮件记录
- **标签联动清理**：删除 Trash 邮件时通过 SQLite 外键 CASCADE 自动清除对应标签关联

### 改进
- **IDLE 异常修复**：QQ/网易等邮箱服务器主动关闭 IDLE 连接时不再误报 error 状态，静默重连
- **轮询周期优化**：非 IDLE 模式的轮询周期从 5 分钟缩短为 1 分钟，提升实时性
- **同步状态统一**：仪表盘、设置页、侧边栏三处账号同步状态均从后端 SSE 事件统一读取，不再各自推断
- **SSE 新增 mode 字段**：`sync:status` 事件增加 `mode` 字段（`idle`/`poll`），前端可根据真实模式显示状态标签
- **侧边栏分割线**：导航区与账号列表之间添加视觉分隔线，层级更清晰

### 修复
- 草稿保存后正确返回草稿 ID，前端可立即跳转编辑
- 归档目录默认路径改为 DATA_DIR/archives，移除独立的 ARCHIVE_DIR 配置项
- 删除邮件时双向同步至邮箱服务端 Trash 文件夹
- 收件箱头像颜色按邮件服务商自动匹配
- 仪表盘日期筛选功能
- 发票正文 CSS 样式修复
- 草稿加载 CC/BCC 字段
- 信封图标描边修复
- 代理配置默认值向后兼容
- 批量删除 UI 过清问题
- 草稿角标始终显示数量
- 日志记录通讯录文件夹未找到的情况
- 跳过已标记删除的邮件同步，防止从 Trash 重新拉回
- 联系人文件夹同步日志优化
- 各面板标题间距统一
- 按钮高度统一为 h-10
- 归档保存后 Toast 提示

## [1.1.1] - 2026-08-21

### 新增功能
- IMAP IDLE 实时推送
- 联系人同步优化
- 代理设置 UI 重构

### 修复
- 数据持久化修复
