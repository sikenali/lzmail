# 主题色 / 强调色 全局切换生效 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让设置中心的「外观主题」与「强调色」点击后立即全站生效，并把色值/样式对齐 DESIGN.md §4.2/§4.3/§5。

**架构：** 采用「双轨镜像」——保留传统 `--primary*` 与 DESIGN `--color-primary*` 两套 CSS 变量；新增单一入口 `applyAccent()`，切换强调色时同时写入两套（默认色则清除内联覆盖，回落到主题默认主色）。主题切换维持既有 `data-theme` 机制。CSS 变量写在 `documentElement` 上即全局生效，无需 reload。

**技术栈：** Next.js 15（`output: 'export'`）、React 19、TypeScript、Tailwind v4、CSS 自定义属性。

**验证方式说明：** 项目无单元测试框架，验证采用 `npm run build` + headless Chrome（CDP）读取 `getComputedStyle` 断言，命令与预期输出见任务 3、4。

**参考设计文档：** `docs/superpowers/specs/2026-10-17-theme-accent-global-design.md`

---

## 文件结构

- 修改：`frontend/src/hooks/useSettings.ts` — 新增 `DEFAULT_ACCENT`、`normalizeAccent()`（导出）、`applyAccent()`；移除 `applyAccentColor()`；`defaults.accent_color` 改为 `''`；初始加载 / API 成功 / API 异常 / `setSetting` 各处统一走 `applyAccent`。
- 修改：`frontend/src/components/settings/ThemeSettings.tsx` — `ACCENTS` 换成 §4.3 规范值并新增 `value` 字段；`THEMES` 预览底色改 §4.2 值；主题激活卡边框/背景/徽标改用 DESIGN token；强调色选中态按 `value` 判定、选中文字加粗。
- 不改：`frontend/src/app/globals.css`（双轨镜像策略下基础定义保持不变）。
- 不涉及：`layout_density`（布局切换）、`setSettingsBatch`（全项目无调用，属死代码，保持原样）。

---

### 任务 1：`useSettings.ts` 统一强调色应用入口

**文件：**
- 修改：`frontend/src/hooks/useSettings.ts`

- [ ] **步骤 1：把 `defaults.accent_color` 改为「跟随主题」空串 sentinel**

将：
```ts
  theme: 'light',
  accent_color: '#c43d3d',
  sidebar_color: '#ffffff',
```
改为：
```ts
  theme: 'light',
  accent_color: '',
  sidebar_color: '#ffffff',
```

- [ ] **步骤 2：新增常量与导出的 `normalizeAccent()`**

在 `defaults` 定义之后、`export function useSettings()` 之前插入：
```ts
export const DEFAULT_ACCENT = ''
const LEGACY_DEFAULT_ACCENTS = ['#BE3B2E', '#C43D3D', '#c43d3d']

// 归一化强调色：空值 / 旧默认值统一视为「跟随主题」。
export function normalizeAccent(color?: string | null): string {
  if (!color) return DEFAULT_ACCENT
  return LEGACY_DEFAULT_ACCENTS.includes(color) ? DEFAULT_ACCENT : color
}
```

- [ ] **步骤 3：用 `applyAccent()` 替换 `applyAccentColor()`**

将：
```ts
  const applyAccentColor = (color: string) => {
    document.documentElement.style.setProperty('--primary', color)
    document.documentElement.style.setProperty('--primary-light', color + '15')
    localStorage.setItem('lzmail_accent_color', color)
  }
```
替换为：
```ts
  // 双轨镜像：同时写入传统 token 与 DESIGN token，使全站跟随强调色。
  // 默认色（空）则移除内联覆盖，回落到主题默认主色。
  const applyAccent = (color?: string | null) => {
    const root = document.documentElement
    const value = normalizeAccent(color)
    const soft = value ? value + '1A' : ''
    const vars: [string, string][] = [
      ['--primary', value],
      ['--primary-light', soft],
      ['--color-primary', value],
      ['--color-primary-soft', soft],
    ]
    vars.forEach(([name, v]) => {
      if (v) root.style.setProperty(name, v)
      else root.style.removeProperty(name)
    })
    localStorage.setItem('lzmail_accent_color', value)
  }
```

- [ ] **步骤 4：初始加载改为调用 `applyAccent`**

将：
```ts
    // Apply saved accent color immediately
    const savedAccent = localStorage.getItem('lzmail_accent_color')
    if (savedAccent) {
      document.documentElement.style.setProperty('--primary', savedAccent)
      document.documentElement.style.setProperty('--primary-light', savedAccent + '15')
    }
```
替换为：
```ts
    // Apply saved accent color immediately
    applyAccent(localStorage.getItem('lzmail_accent_color'))
```

- [ ] **步骤 5：API 成功分支改为调用 `applyAccent`**

将：
```ts
      // Apply accent color
      const accentColor = s?.accent_color || defaults.accent_color
      applyAccentColor(accentColor)
```
替换为：
```ts
      // Apply accent color (localStorage 的显式选择优先，其次 API，再次默认)
      const lsAccent = localStorage.getItem('lzmail_accent_color')
      applyAccent(lsAccent !== null ? lsAccent : s?.accent_color)
```

- [ ] **步骤 6：API 异常分支改为调用 `applyAccent`**

将：
```ts
      // Apply saved accent color
      const savedAccent = localStorage.getItem('lzmail_accent_color')
      if (savedAccent) applyAccentColor(savedAccent)
```
替换为：
```ts
      // Apply saved accent color
      applyAccent(localStorage.getItem('lzmail_accent_color'))
```

- [ ] **步骤 7：`setSetting` 委托 `applyAccent`**

将：
```ts
    if (key === 'accent_color') {
      applyAccentColor(value)
    }
```
替换为：
```ts
    if (key === 'accent_color') {
      applyAccent(value)
    }
```

- [ ] **步骤 8：确认无残留引用**

运行：`cd frontend && grep -rn "applyAccentColor" src/`
预期：无输出（退出码 1）。

- [ ] **步骤 9：类型检查**

运行：`cd frontend && npm run build`
预期：构建成功（输出 `✓ Exporting` 及路由表），无 TypeScript 错误。

- [ ] **步骤 10：Commit**

```bash
cd /home/jingle/opc/lzmail
git add frontend/src/hooks/useSettings.ts
git commit -m "feat(settings): 强调色双轨镜像全局生效，默认色跟随主题"
```

---

### 任务 2：`ThemeSettings.tsx` 色值与激活态对齐规范

**文件：**
- 修改：`frontend/src/components/settings/ThemeSettings.tsx`

- [ ] **步骤 1：`AccentOption` 接口新增 `value` 字段**

将：
```ts
interface AccentOption {
  key: string
  name: string
  color: string
}
```
改为：
```ts
interface AccentOption {
  key: string
  name: string
  color: string
  value: string
}
```

- [ ] **步骤 2：`ACCENTS` 换成 DESIGN.md §4.3 规范值**

将：
```ts
const ACCENTS: AccentOption[] = [
  { key: '#c43d3d', name: '朱红 · 默认', color: '#C43D3D' },
  { key: '#c9a96e', name: '鎏金', color: '#C9A96E' },
  { key: '#5b8c5a', name: '玉绿', color: '#5B8C5A' },
  { key: '#6b8fa3', name: '云蓝', color: '#6B8FA3' },
  { key: '#3d2b1f', name: '黛墨', color: '#3D2B1F' },
]
```
替换为：
```ts
const ACCENTS: AccentOption[] = [
  { key: 'default', name: '朱红 · 默认', color: '#BE3B2E', value: '' },
  { key: '#d3a93f', name: '鎏金', color: '#D3A93F', value: '#D3A93F' },
  { key: '#3e8c6e', name: '玉绿', color: '#3E8C6E', value: '#3E8C6E' },
  { key: '#4a72a8', name: '云蓝', color: '#4A72A8', value: '#4A72A8' },
  { key: '#2f3640', name: '黛墨', color: '#2F3640', value: '#2F3640' },
]
```

- [ ] **步骤 3：`THEMES` 预览底色改为 §4.2 值**

将（浅色项）：
```ts
    skin: '#FBF7F0',
    topbar: '#FFFFFF',
    content: '#F3EDE3',
    previewBg: '#FBF7F0',
```
改为：
```ts
    skin: '#FBF7F0',
    topbar: '#FFFFFF',
    content: '#F3EDE3',
    previewBg: '#F7EED4',
```
将（深色项）：
```ts
    skin: '#1E1E24',
    topbar: '#2A2A32',
    content: '#3A3A42',
    previewBg: '#1E1E24',
```
改为：
```ts
    skin: '#1E1E24',
    topbar: '#2A2A32',
    content: '#3A3A42',
    previewBg: '#333A45',
```

- [ ] **步骤 4：导入 `normalizeAccent`**

将：
```ts
import { useSettings } from '@/hooks/useSettings'
```
改为：
```ts
import { useSettings, normalizeAccent } from '@/hooks/useSettings'
```

- [ ] **步骤 5：选中态用归一化后的 `value` 初始化与同步**

将：
```ts
  const [selectedAccent, setSelectedAccent] = useState(settings.accent_color || '#c43d3d')
```
改为：
```ts
  const [selectedAccent, setSelectedAccent] = useState(normalizeAccent(settings.accent_color))
```
将：
```ts
    setSelectedAccent(settings.accent_color || '#c43d3d')
```
改为：
```ts
    setSelectedAccent(normalizeAccent(settings.accent_color))
```

- [ ] **步骤 6：`handleSelectAccent` 传 `value`**

将：
```ts
  const handleSelectAccent = (color: string) => {
    setSelectedAccent(color)
    setSetting('accent_color', color)
  }
```
改为：
```ts
  const handleSelectAccent = (value: string) => {
    setSelectedAccent(value)
    setSetting('accent_color', value)
  }
```

- [ ] **步骤 7：主题激活卡边框/背景/徽标改用 DESIGN token**

将：
```tsx
                onClick={() => handleSelectTheme(theme.id)}
                className="flex flex-col gap-6 relative"
                style={{
                  flex: 1,
                  border: '0.7px solid var(--card-border)',
                  backgroundColor: active ? 'var(--primary-light)' : 'var(--card)',
                  borderRadius: 14,
                  padding: 24,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  className="absolute"
                  style={{ top: 14, right: 14, zIndex: 2, width: 22, height: 22, borderRadius: 9999, backgroundColor: active ? 'var(--primary)' : 'transparent', border: active ? 'none' : '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
```
替换为：
```tsx
                onClick={() => handleSelectTheme(theme.id)}
                className="flex flex-col gap-6 relative"
                style={{
                  flex: 1,
                  border: '0.7px solid ' + (active ? 'var(--color-primary)' : 'var(--card-border)'),
                  backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--card)',
                  borderRadius: 14,
                  padding: 24,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  className="absolute"
                  style={{ top: 14, right: 14, zIndex: 2, width: 22, height: 22, borderRadius: 9999, backgroundColor: active ? 'var(--color-primary)' : 'transparent', border: active ? 'none' : '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
```

> 注：布局切换卡的激活态不在本次范围，保持原样。

- [ ] **步骤 8：强调色按 `value` 判定、点击传 `value`、选中文字加粗**

将：
```ts
            const active = selectedAccent === accent.color
```
改为：
```ts
            const active = selectedAccent === accent.value
```
将：
```tsx
                onClick={() => handleSelectAccent(accent.color)}
```
改为：
```tsx
                onClick={() => handleSelectAccent(accent.value)}
```
将：
```ts
                    fontWeight: active ? 500 : 400,
```
改为：
```ts
                    fontWeight: active ? 700 : 400,
```

- [ ] **步骤 9：构建校验**

运行：`cd frontend && npm run build`
预期：构建成功，无 TypeScript 错误。

- [ ] **步骤 10：Commit**

```bash
cd /home/jingle/opc/lzmail
git add frontend/src/components/settings/ThemeSettings.tsx
git commit -m "style(settings): 主题/强调色卡对齐 DESIGN.md §4.2/§4.3 并接入选中态"
```

---

### 任务 3：端到端验证（截图 + 计算样式断言）

**文件：**
- 创建（临时，不入库）：`/tmp/opencode/verify-accent.py`

- [ ] **步骤 1：构建并导出静态站点**

运行：`cd frontend && npm run build`
预期：`frontend/out/` 下 `index.html`、`settings.html` 等生成。

- [ ] **步骤 2：启动静态服务器与 Chrome（远程调试）**

运行：
```bash
cd /home/jingle/opc/lzmail/frontend/out && setsid python3 -m http.server 8791 </dev/null >/tmp/opencode/srv.log 2>&1 & disown
setsid google-chrome --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9222 --user-data-dir=/tmp/opencode/chrome-prof </dev/null >/tmp/opencode/chrome.log 2>&1 & disown
sleep 4
curl -s http://127.0.0.1:9222/json/version | grep -o '"Browser": *"[^"]*"'
```
预期：输出包含 `Chrome/...`。

- [ ] **步骤 3：写入 CDP 验证脚本**

创建 `/tmp/opencode/verify-accent.py`：
```python
import asyncio, json, urllib.request
import websockets

URL = "http://localhost:8791/index.html#settings"

CLICK_SWATCH = """
(() => {
  const name = {label};
  const el = [...document.querySelectorAll('div')]
    .find(d => d.children.length === 0 && d.textContent.trim() === name);
  if (!el) return 'NOT_FOUND';
  el.parentElement.click();
  return 'OK';
})()
"""

READ_VARS = """
(() => {
  const s = getComputedStyle(document.documentElement);
  return JSON.stringify({
    legacy: s.getPropertyValue('--primary').trim(),
    design: s.getPropertyValue('--color-primary').trim(),
  });
})()
"""

async def main():
    targets = json.load(urllib.request.urlopen("http://127.0.0.1:9222/json"))
    page = next(t for t in targets if t.get("type") == "page")
    async with websockets.connect(page["webSocketDebuggerUrl"], max_size=None) as ws:
        mid = 0
        async def call(method, params=None):
            nonlocal mid
            mid += 1
            await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
            while True:
                m = json.loads(await ws.recv())
                if m.get("id") == mid:
                    return m.get("result", {})
        await call("Page.enable")
        await call("Runtime.enable")
        await call("Page.navigate", {"url": URL})
        await asyncio.sleep(5)

        async def click(label):
            r = await call("Runtime.evaluate", {"expression": CLICK_SWATCH.replace("{label}", json.dumps(label)), "returnByValue": True})
            await asyncio.sleep(0.6)
            v = await call("Runtime.evaluate", {"expression": READ_VARS, "returnByValue": True})
            return json.loads(v["result"]["value"])

        green = await click("玉绿")
        print("玉绿:", green)
        assert green["legacy"] == "#3E8C6E", green
        assert green["design"] == "#3E8C6E", green

        default = await click("朱红 · 默认")
        print("默认:", default)
        assert default["legacy"].upper() == "#C0392B", default
        assert default["design"].upper() == "#C0392B", default

        print("PASS")

asyncio.run(main())
```

- [ ] **步骤 4：运行断言**

运行：`cd /tmp/opencode && python3 verify-accent.py`
预期：输出
```
玉绿: {'legacy': '#3E8C6E', 'design': '#3E8C6E'}
默认: {'legacy': '#C0392B', 'design': '#C0392B'}
PASS
```
（若默认断言读到 `#c0392b`，`.upper()` 已兼容大小写。）

- [ ] **步骤 5：截图确认主题与激活态**

运行：
```bash
google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=8000 --window-size=1440,900 --screenshot=/tmp/opencode/theme-light.png "http://localhost:8791/index.html#settings"
```
预期：外观主题卡浅色预览底为 `#F7EED4`，选中卡为浅朱红底 + 朱红边框；强调色五个色盘为规范色值，选中项文字加粗。

手动将强调色切到「玉绿」后再次截图：预期 TopNav 设置图标、PageFooter、以及四个弹框中所有主色元素同步变绿。

- [ ] **步骤 6：清理验证进程**

运行：
```bash
pkill -f "[r]emote-debugging-port=9222"; pkill -f "[h]ttp.server 8791"; echo cleaned
```
预期：`cleaned`。

---

### 任务 4：收尾与提交

- [ ] **步骤 1：确认工作区仅含预期改动**

运行：`cd /home/jingle/opc/lzmail && git status --short`
预期：仅 `frontend/src/hooks/useSettings.ts`、`frontend/src/components/settings/ThemeSettings.tsx` 的改动已提交（若任务 1、2 已分别 commit，则此处应为 clean；`frontend/out/` 若被追踪则忽略）。

- [ ] **步骤 2：推送（仅在用户要求时）**

运行：`git push`
预期：推送到 `origin/main`。

---

## 自检

**1. 规格覆盖度：**
- §3.1 调色板与卡片样式 → 任务 2 步骤 2/3/7/8。
- §3.2 全局生效机制（applyAccent、sentinel、兼容旧值、各分支统一、setSetting 委托）→ 任务 1 步骤 1–7。
- §3.3 立即全局生效 → 由 CSS 变量写在 `documentElement` 保证，任务 3 步骤 4 断言。
- §5 验证（build、浅/深截图、玉绿全局、默认回落、持久化）→ 任务 3。
- §4 非目标（不改 globals.css、不改 layout_density、不改其它设置）→ 文件结构明确排除。

**2. 占位符扫描：** 无 TBD/TODO；每个代码步骤均为完整代码块；命令与预期输出均具体。

**3. 类型一致性：**
- `normalizeAccent(color?: string | null): string` 在任务 1 步骤 2 定义，任务 2 步骤 4–5 导入并使用，签名一致。
- `applyAccent(color?: string | null)` 在任务 1 步骤 3 定义，步骤 4–7 调用，实参类型兼容。
- `AccentOption.value: string` 在任务 2 步骤 1 定义，步骤 2 赋值，步骤 8 读取，一致。
- CSS 变量名 `--primary / --primary-light / --color-primary / --color-primary-soft` 在任务 1 步骤 3 写入、任务 3 步骤 3 断言，两端一致。
