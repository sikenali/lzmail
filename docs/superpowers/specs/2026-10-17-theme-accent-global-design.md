# 主题色 / 强调色 全局切换生效 — 设计文档

日期：2026-10-17
范围：`frontend/src/hooks/useSettings.ts`、`frontend/src/components/settings/ThemeSettings.tsx`
参考规范：`bid-maker/docs/DESIGN.md` §4.2 / §4.3 / §5

## 1. 问题

设置中心的「外观主题」与「强调色」在点击后不能全站生效：

- 主题（浅色/深色）切换**已经**全局生效：`applyTheme` 给 `<html>` 设置 `data-theme`，`globals.css` 的 `[data-theme="dark"]` 同时覆盖传统变量（`--primary` 等）与 DESIGN 变量（`--color-*`）；全项目 0 处使用 Tailwind `dark:` 变体，故不需要 `.dark` class。
- 强调色切换**不全局**：`applyAccentColor` 只写 `--primary` / `--primary-light`，而代码中 `var(--primary)` 有 37 处、`var(--color-primary)` 有 29 处（新弹框、TopNav、PageFooter 等用后者）。因此点强调色，DESIGN token 的使用点不变。
- 强调色用**内联** `--primary` 覆盖，会盖住 `[data-theme="dark"]` 的默认主色。
- 色值不符规范：当前调色板 `#c43d3d/#c9a96e/#5b8c5a/#6b8fa3/#3d2b1f`，DESIGN.md §4.3 要求 `#BE3B2E/#D3A93F/#3E8C6E/#4A72A8/#2F3640`；主题卡预览底色/激活态（§4.2）也不符。

## 2. 决策

1. **双轨镜像**（已确认）：保留 `--primary` 与 `--color-*` 两套变量，强调色写入时同时镜像到两套，改动小、风险低、立即全局生效。不做单源统一（会改变全站大量颜色，回归面大）。
2. **默认强调色跟随主题**（已确认）：选「朱红·默认」时清除内联覆盖，回落到主题默认主色（浅 `#C0392B` / 深 `#E05050`，严格符合 §5）；非默认色才写入内联覆盖。
3. 主题切换维持 `data-theme` 机制不变。

## 3. 设计

### 3.1 调色板与卡片样式（ThemeSettings.tsx）

- `THEMES`：`light.previewBg` → `#F7EED4`；`dark.previewBg` → `#333A45`（§4.2；`topbar` / `content` 缩略条保留现值）。移除 `system`（上一轮已完成）。
- 激活态卡片：背景 `var(--color-primary-soft)`、边框 `var(--color-primary)`（当前仅改背景，边框仍是 `--card-border`）；勾选徽标底色用 `var(--color-primary)`。
- `ACCENTS` 替换为 §4.3 规范值：
  - 朱红·默认 `#BE3B2E`
  - 鎏金 `#D3A93F`
  - 玉绿 `#3E8C6E`
  - 云蓝 `#4A72A8`
  - 黛墨 `#2F3640`
- 可见的选中文字：选中时加粗（§4.3）。

### 3.2 全局生效机制（useSettings.ts）

新增单一入口 `applyAccent(color: string | null)`：

- `color` 为 `null` 或未设置（默认）→ 移除 `documentElement` 上的内联
  `--primary`、`--primary-light`、`--color-primary`、`--color-primary-soft`，
  使两套变量回落到主题（`data-theme`）默认值。
- `color` 为具体色值 → 同时写入：
  - `--primary` = color
  - `--primary-light` = color + `1A`（约 10% 透明，浅/深底自动适配）
  - `--color-primary` = color
  - `--color-primary-soft` = color + `1A`
- 持久化：`localStorage['lzmail_accent_color']`；默认以空串 sentinel 表示「跟随主题」，兼容旧值 `#BE3B2E` / `#c43d3d`（视为默认）。
- 初始加载、`api.settings.get()` 成功分支、异常分支都调用同一 `applyAccent`，避免两套 token 分叉。
- `setSetting('accent_color', value)` 内委托 `applyAccent`。
- `applyTheme` 不变；切换主题时，若存在非默认强调色，其内联覆盖继续生效；若为默认，则自动跟随新主题。

### 3.3 立即全局生效

变量写在 `documentElement` 上即全局作用，无需 reload。点击主题或强调色后，传统 token（37 处）与 DESIGN token（29 处）的使用点同时更新。

## 4. 非目标

- 不统一两套 token、不改 `globals.css` 基础定义。
- 不改「布局切换」`layout_density` 逻辑。
- 不改字体大小 / 动画开关等其它设置项。

## 5. 验证

1. `npm run build` 通过，`npx tsc` 无新增错误。
2. headless 截图：`#settings` 浅色、深色各一张，确认主题卡预览底色与激活态符合 §4.2。
3. 选「玉绿」后截图，确认 TopNav / PageFooter / 四个弹框（`--color-primary`）与其它区域（`--primary`）同步变绿。
4. 选「朱红·默认」后截图，确认回落主题默认红（浅 `#C0392B` / 深 `#E05050`）。
5. 刷新页面确认强调色持久化；切主题确认默认强调色跟随、非默认色保持。
