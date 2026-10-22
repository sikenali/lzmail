# 顶栏七个文件夹标签样式统一 — 设计规格

> 日期：2026-10-22
> 参照：`/home/jingle/opc/DESIGN.md` 2.3「顶栏标签按钮（Tab Bar）统一规范 ★」
> 源实现：`bid-boomerang/src/components/TopNav.vue`（`.nav-center` / `.nav-item`）
> 目标项目：`lzmail` 顶栏 7 个邮件文件夹标签

## 1. 需求

lzmail 顶栏 7 个文件夹标签（收件箱 / 标星邮件 / 稍后处理 / 已发送 / 草稿箱 / 已删除 / 垃圾邮件）
当前样式与 `DESIGN.md` 2.3 的 A 型工具切换标签规范不一致：状态色、过渡曲线、图标配色均为自创，
并且用一个 momowuwen 风格的滑动胶囊（`.nav-indicator`，带内描边 + 投影 + 底部小圆点）表达激活态，
违反 2.3.3「标签只允许用背景色区分状态」「禁止给标签加 border / box-shadow 表现状态」。

## 2. 已确认的设计取舍

| 决策点 | 选择 |
|--------|------|
| 标签形态 | **保留 lzmail 竖排**（图标在上、文字在下，紧凑），不改成 bid-boomerang 的横向 15px |
| 激活指示 | **删除滑动胶囊指示器**，激活底色直接落在标签自身 |
| 图标配色 | **按语义分配品牌色**，在 `globals.css` 新增 `--brand-*` token |

## 3. 新增设计 token（`frontend/src/app/globals.css`）

`lzmail` 目前缺 `--brand-*` / `--t-fast` / `--ease`，按 DESIGN.md 2.3.2 与 2.3.4 补齐。

浅色 `:root`：

```css
--brand-red: #BE3B2E;      --brand-red-strong: #C0392B;  --brand-red-soft: #FBE9E7;
--brand-gold: #C6A45C;     --brand-gold-strong: #D3A93F; --brand-gold-soft: #F7EEE0;
--brand-green: #3E8C6E;    --brand-green-soft: #E4F0EA;
--brand-blue: #4A72A8;     --brand-blue-soft: #E8F0F8;
--brand-navy: #5474A3;
--brand-gray: #8A8578;
--t-fast: 150ms;   --t-base: 200ms;
--ease: cubic-bezier(0.2, 0.7, 0.2, 1);
```

深色 `[data-theme="dark"]`：

```css
--brand-red: #E05050;  --brand-red-strong: #E05050;  --brand-red-soft: #3A2323;
--brand-gold: #D3A93F; --brand-gold-strong: #E0B84A; --brand-gold-soft: #3A3018;
--brand-green: #5CB98C; --brand-green-soft: #1D3329;
--brand-blue: #82AEDD;  --brand-blue-soft: #1B2A3A;
--brand-navy: #82AEDD;
--brand-gray: #A7AEB9;
```

值与 `bid-boomerang/src/assets/global.css` 完全一致，深色模式全部由 CSS 变量驱动。

## 4. 七个文件夹的语义配色

| # | 文件夹 | 图标色 | 色族 | 激活时图标 |
|---|--------|--------|------|-----------|
| 1 | 收件箱 | `var(--brand-red)` | red | `var(--color-primary)` |
| 2 | 标星邮件 | `var(--brand-gold-strong)` | gold | 保持金色 |
| 3 | 稍后处理 | `var(--brand-green)` | green | 保持玉绿 |
| 4 | 已发送 | `var(--brand-blue)` | blue | 保持云蓝 |
| 5 | 草稿箱 | `var(--brand-green)` | green | 保持玉绿 |
| 6 | 已删除 | `var(--brand-gray)` | gray | 保持中性灰 |
| 7 | 垃圾邮件 | `var(--color-warning)` | warning | 保持警示橙 |

激活态「仅朱红系改主色，其余保持品牌色」与 DESIGN.md 2.3.3 一致：
朱红与主色同源，红上加红会糊，故改主色；金 / 绿 / 蓝 / 灰 / 橙与主色异源，保留品牌色以保证
「哪个文件夹」在激活后仍可辨认。

**色族复用说明（第二轮优化）**

六星色板只有 4 个冷暖色，7 个文件夹必然要复用一色。初版给「草稿箱」用 `--brand-navy`（#5474A3），
但与「已发送」的 `--brand-blue`（#4A72A8）同为 hsl ~214°、明度差仅 1 个百分点，浅色下难辨、
深色下两者被压成同一个 `#82AEDD`。故改为「草稿箱」与「稍后处理」共用玉绿：二者语义同属
「待办 / 未完成」，位置相隔一项且图标形状不同，与 DESIGN.md 2.3.2 六星注册表本身复用朱红
（文取星 / 文比星）、鎏金（文制星 / 文价星）的先例一致。`--brand-navy` 仍保留在色板中备用。

## 5. 标签三态与动效（`.nav-token`，对应 bid-boomerang `.nav-item`）

保留竖排形态，只统一状态与动效：

| 状态 | 背景 | 文字 | 图标 | 位移 |
|------|------|------|------|------|
| 默认 | 透明 | `--color-text-secondary` | 品牌色 | — |
| hover（fine pointer） | `--color-bg-secondary` | `--color-text-primary` | 品牌色 | `translateY(-1px)` |
| 激活 | `--color-primary-soft` | `--color-primary` / 600 | 见第 4 节 | 无 |

- 过渡属性仅 `background-color` + `transform`（与 bid-boomerang `.nav-item` 逐字一致），
  `var(--t-fast) var(--ease)` = `150ms cubic-bezier(0.2, 0.7, 0.2, 1)`。
- 尺寸微调两处，向规范靠拢：圆角 `10px → 12px`、标签间距 `2px → 6px`。其余尺寸不变
  （图标 16px、文字 12px、图标与文字间距 2px）。
- 补 `:focus-visible` 焦点环，满足 DESIGN.md 2.3.7 验收清单「键盘可达 + 可见焦点环」。
- 保留 `:active` 按压反馈；`prefers-reduced-motion` 下关闭位移。
- 不引入 `@keyframes`、不加 border / box-shadow 表现状态（2.3.4 禁止项）。

## 6. 删除滑动指示器

删除 `.nav-indicator` 后，以下内容一并清理：

- `globals.css`：`.nav-indicator`、`.nav-indicator::after`、`.nav-indicator.has-interacted::after`
  及其 `no-animations` / `prefers-reduced-motion` 守卫
- `TopNav.tsx`：`indicatorRef`、`navMenuRef`、`updateIndicator()`、`hasInteracted` 状态、
  ResizeObserver + resize + rAF 监听 effect
- 激活态改由标签自身的 `--color-primary-soft` 底色承担，同时消除宽度动画导致的重排

## 7. 数据源统一

新建 `frontend/src/components/layout/mailNavItems.ts`，导出：

- `NavItemColor` 类型（`red | gold | green | blue | navy | gray | warning`）
- `MailNavItem` 类型（`label` / `href` / `icon` / `color`）
- `MAIL_NAV_ITEMS`：7 个文件夹的单一数据源
- `NAV_ITEM_COLOR_VARS`：色族 → CSS 变量名映射
- `navIconColor(color, active)`：返回图标的 CSS 颜色（供 inline style 场景复用）

`TopNav.tsx` 与 `Sidebar.tsx` 共用，删除两处重复数组。
文件夹 → label 映射表保留在 `app/mail/page.tsx`（仅做查找，不重复定义）。

## 8. 改动清单

| 文件 | 改动 |
|------|------|
| `frontend/src/app/globals.css` | 新增 `--brand-*` / `--t-fast` / `--t-base` / `--ease`（浅 + 深）；重写 `.nav-tab`；新增 `.nav-tab__icon` 与 7 个 `.nav-tab--*` 图标色规则；新增 `.nav-center` 容器类（含桌面端溢出滚动修正）；`.nav-menu` 间距 2px→6px、`margin-inline:auto`；删除 `.nav-indicator` 全部规则 |
| `frontend/src/components/layout/mailNavItems.ts` | 新建：共享数据 + 配色映射 |
| `frontend/src/components/layout/TopNav.tsx` | 改用共享数据；图标走品牌色 class；删除指示器逻辑与冗余 inline style；移动端下拉同步品牌色 |
| `frontend/src/components/layout/Sidebar.tsx` | 改用共享数据；图标同步品牌色（激活态图标仍为主色，符合 DESIGN.md 2.2 侧边栏规范） |

## 9. 不在本次范围

- 右侧圆形按钮 `.nav-btn` 的 28px → 40px 统一（DESIGN.md 2.3.7 单列项，本次只改 7 个标签）
- 顶栏品牌区 / 页面标题 / 搜索框 / 头像区
- 移动端布局结构（仅同步图标配色）

## 10. 验收清单（对应 DESIGN.md 2.3.7）

- [ ] 标签间距 `6px`、圆角 `12px`、图标 `16px`、文字 `12px`
- [ ] hover 背景 `--color-bg-secondary` + 上浮 `1px`，过渡 `150ms cubic-bezier(0.2,0.7,0.2,1)`
- [ ] 激活背景 `--color-primary-soft`，文字主色 `600`，朱红系图标改主色、其余保持品牌色，`aria-current="page"`
- [ ] 无 `@keyframes`、无渐变背景、标签位移 ≤ 1px、无 border / box-shadow 状态
- [ ] `:focus-visible` 焦点环可见
- [ ] 深色模式下图标 / 背景 / 文字对比度达标（全部走 CSS 变量）
- [ ] `tsc --noEmit` 与 `next build` 通过
