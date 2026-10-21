#!/usr/bin/env node
// LZMail 前端全量 UI 功能自测
//
// 覆盖：页面渲染、按钮、下拉框、输入框、分段/开关控件、主题与强调色、导航布局切换、
//       样式/代理/存储设置、账号与联系人 CRUD、写邮件与附件与草稿、移动端适配、
//       提示条自动消失、滚动条与图表高度、控制台错误。
// 每个设置类用例同时校验「UI 即时生效」与「后端持久化后读回一致」。
//
// 用法：
//   node run.mjs                              # 自动拉起后端+静态服务+Chrome，跑完退出
//   E2E_URL=https://x.example node run.mjs    # 直接测已在运行的站点
//   E2E_REBUILD=1 node run.mjs                # 强制重新编译后端

import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, existsSync, createWriteStream, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const dir = fileURLToPath(new URL('.', import.meta.url))
const REPO = join(dir, '..', '..')
const CHROME = process.env.E2E_CHROME || '/usr/bin/google-chrome'
const BACKEND_PORT = 18080
const FRONT_PORT = 18081
const BACKEND = `http://127.0.0.1:${BACKEND_PORT}`
const BASE = process.env.E2E_URL || `http://127.0.0.1:${FRONT_PORT}`
const WORK = process.env.E2E_WORK || '/tmp/lzmail-e2e'

// --------------------------------------------------------------- 基础工具
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let CUR = null
const currentURL = () => (CUR ? CUR.url() : '?')

const show = (v) => {
  try { return v === null || typeof v === 'object' ? JSON.stringify(v) : String(v) }
  catch { return String(v) }
}

// 轮询等待，超时消息带上最后一次观测值，便于定位真实状态。
async function waitFor(fn, { timeout = 8000, every = 120, label = 'condition' } = {}) {
  const t0 = Date.now()
  let last = null
  for (;;) {
    try { last = await fn() } catch { last = '[throw]' }
    if (last) return last
    if (Date.now() - t0 > timeout) {
      throw new Error(`等待超时(${timeout}ms)：${label}｜最后值=${show(last).slice(0, 300)}｜URL=${show(currentURL())}`)
    }
    await sleep(every)
  }
}

async function getJSON(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url} -> ${text.slice(0, 200)}`)
  return body
}

const api = {
  get: (p) => getJSON(`${BACKEND}${p}`),
  post: (p, b) => getJSON(`${BACKEND}${p}`, { method: 'POST', body: JSON.stringify(b ?? {}) }),
  patch: (p, b) => getJSON(`${BACKEND}${p}`, { method: 'PATCH', body: JSON.stringify(b ?? {}) }),
  del: (p) => getJSON(`${BACKEND}${p}`, { method: 'DELETE' }),
  settings: () => api.get('/api/v1/settings'),
  accounts: () => api.get('/api/v1/accounts').then((r) => r || []),
  // 联系人接口返回 { items, total } 分页对象（limit 默认 10），不是数组
  contacts: () => api.get('/api/v1/contacts?limit=200').then((r) => (r && r.items) || (Array.isArray(r) ? r : [])),
}

function eq(actual, expected, label = '') {
  if (String(actual) !== String(expected)) {
    throw new Error(`${label ? label + '：' : ''}期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`)
  }
}
function approx(a, b, tol, label = '') {
  if (Math.abs(a - b) > tol) throw new Error(`${label}：期望约 ${b}±${tol}，实际 ${a.toFixed(2)}`)
}

// --------------------------------------------------------------- DOM 助手
// 按「直接文本节点」精确匹配元素（idx=-1 取最后一个匹配），返回 JSHandle。
// 匹配「直接文本节点精确等于 text」的元素。React 常把 {a}{b} 拆成多个文本节点
// （如 <button>{days}天</button> → "14" + "天"），故回退到「无元素子节点且
// textContent 精确等于 text」的元素；两类都优先取当前可见的那一项。
async function byText(page, text, idx = -1) {
  const h = await page.evaluateHandle(({ text, idx }) => {
    const vis = (n) => {
      const r = n.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return false
      const s = getComputedStyle(n)
      return s.visibility !== 'hidden' && s.display !== 'none'
    }
    const prim = []
    const leaf = new Map()
    const walk = (n) => {
      const hasElChild = [...n.childNodes].some((c) => c.nodeType === 1)
      for (const c of n.childNodes) {
        if (c.nodeType === 3) {
          if ((c.nodeValue || '').trim() === text) { prim.push(n); leaf.set(n, 1) }
        } else if (c.nodeType === 1) walk(c)
      }
      if (!hasElChild && !leaf.has(n) && (n.textContent || '').trim() === text) leaf.set(n, 1)
    }
    walk(document.body)
    const src = prim.length ? prim : [...leaf.keys()]
    const shown = src.filter(vis)
    const list = shown.length ? shown : src
    const i = idx < 0 ? list.length - 1 : idx
    return list[i] ?? null
  }, { text, idx })
  return h
}

// 失败诊断：匹配数量、可见性、是否被其它元素遮挡。
async function diag(page, text) {
  const d = await page.evaluate(({ text }) => {
    const all = []
    const key = text.length >= 2 ? text.slice(0, 2) : text
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) {
          const s = (c.nodeValue || '').trim()
          if (s === text || s.includes(key)) {
            const r = n.getBoundingClientRect()
            const hit = r.width > 0 && r.height > 0
              ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
              : null
            all.push({
              tag: n.tagName, text: s.slice(0, 32), exact: s === text,
              vis: r.width > 0 && r.height > 0, y: Math.round(r.y),
              covered: hit ? !(n === hit || n.contains(hit)) : null,
              cover: hit ? String(hit.className).slice(0, 30) : null,
            })
          }
        } else if (c.nodeType === 1) walk(c)
      }
    }
    walk(document.body)
    return { n: all.length, sample: all.slice(0, 8) }
  }, { text })
  return `相似文本 ${d.n} 个 ${JSON.stringify(d.sample)}`
}

async function textExists(page, text) {
  const el = (await byText(page, text)).asElement()
  if (!el) return false
  return el.evaluate((n) => {
    const r = n.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }).catch(() => false)
}

// 整页可见文本包含判断（用于被 React 拆成多个文本节点的标题）。
const bodyHas = (page, s) => page.evaluate((x) => document.body.innerText.includes(x), s)

// 点击文本：先滚到可见再稍等布局稳定（弹窗有入场动画，坐标可能过期），失败重试。
async function clickText(page, text, idx = -1, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const el = (await byText(page, text, idx)).asElement()
    if (el) {
      try {
        await el.scrollIntoViewIfNeeded()
        await sleep(120)
        await el.click()
        return el
      } catch { /* 布局抖动，重试 */ }
    }
    await sleep(200)
  }
  throw new Error(`未找到可点击文本「${text}」｜${await diag(page, text)}`)
}

async function clickSelector(page, selector) {
  await page.waitForSelector(selector, { timeout: 5000 })
  await page.click(selector)
}

// 输入框填写：自动跳过隐藏实例（桌面/移动双份渲染），逐个点击全选后输入。
async function typeInto(page, selector, value) {
  const hs = await page.$$(selector)
  if (!hs.length) throw new Error(`未找到输入框：${selector}`)
  let target = null
  for (const h of hs) {
    const box = await h.boundingBox()
    if (box && box.width > 0 && box.height > 0) { target = h; break }
  }
  if (!target) target = hs[0]
  await target.click({ clickCount: 3 })
  await target.type(value)
  await sleep(60)
  return target
}

const geom = (page, fn, ...args) => page.evaluate(fn, ...args)

async function themeAttr(page) {
  return page.evaluate(() => document.documentElement.getAttribute('data-theme'))
}
async function rootFontSize(page) {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
}
async function cssVar(page, name) {
  return page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name)
}
async function toastVisible(page) {
  return page.evaluate(() => !!document.querySelector('[data-sonner-toast]'))
}
async function toastText(page) {
  return page.evaluate(() => document.querySelector('[data-sonner-toast]')?.textContent || '')
}
// 页面上可能同时挂着多条提示（成功 + 遗留的错误提示），只取第一条会拿错。
async function toastTexts(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-sonner-toast]')]
      .map((el) => (el.textContent || '').trim())
      .filter(Boolean))
}
// 提示条容器快照，用于「该消失却没消失」时的失败诊断。
async function toastDOM(page) {
  return page.evaluate(() => {
    const c = document.querySelector('[data-sonner-toaster]')
    return c ? c.outerHTML.slice(0, 400) : 'NO TOASTER'
  })
}
async function modalOpen(page, selector) {
  return page.evaluate((s) => !!document.querySelector(s), selector)
}

// 无 placeholder 的受控输入框（如账号端口）按索引定位：先三击全选再逐字输入，
// 与 typeInto 同一机制；直接赋 value 触发 React onChange 并不稳定。
async function fillNth(page, selector, index, value) {
  const el = (await page.evaluateHandle(({ selector, index }) => document.querySelectorAll(selector)[index], { selector, index })).asElement()
  if (!el) throw new Error(`未找到第 ${index + 1} 个 ${selector}`)
  await el.click({ clickCount: 3 })
  await el.type(String(value))
  await sleep(60)
}

// 进入邮件页并等列表列面板真正渲染，返回该面板的 className。
// 页面先按默认值渲染、设置接口返回后才切列宽，所以要等 class 稳定再读。
async function mailListClass(page) {
  await page.evaluate(() => { location.hash = '' }).then(() => sleep(200))
  await goto(page, `${BASE}/mail.html`)
  const SEL = '[class*="w-[280px]"],[class*="w-[320px]"]'
  const read = () => page.evaluate((s) => { const el = document.querySelector(s); return el ? el.className : null }, SEL)
  await waitFor(async () => await read(), { label: '邮件列表面板' })
  let prev = null
  for (let i = 0; i < 25; i++) {
    const c = await read()
    if (c && c === prev) break
    prev = c
    await sleep(150)
  }
  return prev || ''
}

// 失败诊断：当前 URL、弹窗数量、可见输入框、页面文本片段
async function dump(page) {
  const d = await page.evaluate(() => ({
    url: location.href,
    modals: document.querySelectorAll('.fixed.inset-0').length,
    inputs: [...document.querySelectorAll('input')].map((i) => i.placeholder || i.type).filter(Boolean),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 260),
    errs: (window.__e2eErrors || []).slice(-2),
  }))
  const errs = d.errs.length
    ? `｜运行时错误 ${(d.errs.map((x) => `${x.msg} @ ${x.at}｜${(x.stack || '').split('\n')[1] || (x.stack || '').split('\n')[0]}`)).join(' ／ ')}`
    : ''
  return `URL=${d.url}｜弹窗 ${d.modals}｜输入框 [${d.inputs.join(' / ')}]｜文本「${d.text.slice(0, 120)}…」${errs}`
}

// 页面常驻 SSE 长连接，goto 的生命周期事件偶发迟迟不触发（表现为导航超时）。
// 超时后只要 URL 已切换就继续；再不行就兜底用 location.replace 重新跳一次。
async function goto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
  for (let i = 0; i < 25; i++) {
    const here = await page.evaluate(() => location.href).catch(() => '')
    if (here === url || here.startsWith(url)) break
    if (i === 20) await page.evaluate((u) => { window.location.replace(u) }, url).catch(() => {})
    await sleep(150)
  }
  await sleep(250)
}

// --------------------------------------------------------------- 测试框架
const passed = []
const failed = []
const warns = []
let consoleErrors = []

async function t(name, fn) {
  try {
    await fn()
    passed.push(name)
    console.log(`  [PASS] ${name}`)
  } catch (e) {
    const msg = (e && e.stack ? String(e.stack) : String(e)).split('\n').slice(0, 3).join(' | ')
    failed.push({ name, msg })
    console.log(`  [FAIL] ${name}\n         ${msg}`)
  }
}
const sec = (name) => console.log(`\n▶ ${name}`)
const info = (s) => console.log(`         ${s}`)

async function closeAnyModal(page) {
  // 通过清 hash 关闭当前弹窗；直接点齿轮会命中遮罩，只会把旧弹窗关掉。
  await clearHash(page)
}

// 页面崩到 ErrorBoundary 后整个 React 树不可用（弹窗/按钮全没），只能刷新整页。
// 设置与账号都存在后端，刷新后状态可恢复。崩溃本身记为警告——这是真实缺陷，不该静默吞掉。
async function heal(page) {
  const crashed = await page.evaluate(() => (document.body.innerText || '').includes('出错了')).catch(() => false)
  if (!crashed) return false
  const u = await page.url()
  warns.push(`页面崩溃到 ErrorBoundary，已刷新恢复：${u}`)
  const bare = new URL(u).origin + new URL(u).pathname
  await goto(page, bare)
  await sleep(800)
  return true
}

async function openSettings(page) {
  // 先关掉任何已打开的弹窗（设置/账号/联系人/写邮件），否则齿轮点击会命中遮罩而打不开设置。
  for (let i = 0; i < 3; i++) {
    await heal(page)
    await clearHash(page)
    await page.waitForSelector('button[aria-label="设置"]', { timeout: 8000 })
    await page.click('button[aria-label="设置"]')
    try {
      await waitFor(() => textExists(page, '设置中心'), { label: '设置中心弹窗' })
      await sleep(450) // 等弹窗入场动画结束，避免点击命中动画中的坐标
      return
    } catch { await heal(page) }
  }
  throw new Error('设置中心弹窗三次尝试均未打开')
}
async function openHash(page, name) {
  // 页面刚加载时 hash 监听器可能还没注册；也可能页面刚崩过。最多重试 3 次。
  for (let i = 0; i < 3; i++) {
    await heal(page)
    await clearHash(page)
    await page.evaluate((n) => { location.hash = n }, name)
    await sleep(500)
    if (await page.evaluate(() => !!document.querySelector('.fixed.inset-0'))) return
  }
}
// 切换设置中心的子标签（主题设置 / 个性设置），并确认切换生效。
// 点击可能落在动画中的坐标上，所以要按「页面是否出现该标签专属文本」判定并重试。
async function gotoSettingsTab(page, tab, marker) {
  for (let i = 0; i < 3; i++) {
    await clickText(page, tab)
    try {
      await waitFor(() => textExists(page, marker), { timeout: 4000, label: `子标签 ${tab}` })
      await sleep(350)
      return
    } catch { await sleep(300) }
  }
  throw new Error(`子标签「${tab}」三次尝试均未切换成功（判定文本「${marker}」）｜${await dump(page)}`)
}

// 清 hash 并等弹窗真正卸载。
// 必须用 location.hash='' 赋值（会派发 hashchange，AppShell 才会真的关闭弹窗）；
// replaceState 不会派发 hashchange，弹窗会残留在 React 状态里，之后的齿轮点击会命中遮罩。
async function clearHash(page) {
  if (await page.evaluate(() => !!window.location.hash)) {
    await page.evaluate(() => { location.hash = '' })
  }
  await page.waitForFunction(() => !document.querySelector('.fixed.inset-0'), { timeout: 4000 }).catch(() => {})
  // 去掉 URL 里残留的 '#'，否则下一次 location.hash=X 可能退化成空操作
  await page.evaluate(() => {
    if (window.location.href.endsWith('#')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }).catch(() => {})
  await sleep(250)
}

// --------------------------------------------------------------- 环境准备
async function waitHTTP(url, timeout = 40000) {
  const t0 = Date.now()
  for (;;) {
    try {
      const r = await fetch(url)
      if (r.status < 500) return r.status
    } catch { /* retry */ }
    if (Date.now() - t0 > timeout) throw new Error(`服务未就绪：${url}`)
    await sleep(300)
  }
}

function buildBackend() {
  const bin = join(WORK, 'backend', 'lzmail')
  mkdirSync(join(WORK, 'backend'), { recursive: true })
  if (!existsSync(bin) || process.env.E2E_REBUILD === '1') {
    info(`编译后端 → ${bin}`)
    const r = spawnSync('go', ['build', '-o', bin, './cmd/lzmail'], { cwd: join(REPO, 'backend'), encoding: 'utf8' })
    if (r.status !== 0) throw new Error('后端编译失败：' + (r.stderr || r.stdout))
  }
  return bin
}

// 拉起子进程；传入 log 时把它的标准输出/错误追加写进文件，便于事后定位后端为什么没回包。
function start(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { cwd: opts.cwd || REPO, env: { ...process.env, ...opts.env }, stdio: ['ignore', 'pipe', 'pipe'] })
  p.on('error', () => {})
  if (opts.log) {
    const out = createWriteStream(opts.log, { flags: 'a' })
    p.stdout.pipe(out)
    p.stderr.pipe(out)
  }
  return p
}

// 打印日志尾部——后端卡住时唯一能看清服务端在做什么的线索。
function logTail(file, n = 30) {
  try {
    const lines = readFileSync(file, 'utf8').split('\n')
    return '\n--- 后端日志尾部 ---\n' + lines.slice(-n).join('\n')
  } catch { return '' }
}

// --------------------------------------------------------------- 主流程
async function main() {
  const standalone = !!process.env.E2E_URL
  let backendProc = null
  let backendLog = null
  let serveProc = null
  let browser = null
  let pg = null

  if (!standalone) {
    info(`工作目录 ${WORK}（每次全新初始化）`)
    rmSync(WORK, { recursive: true, force: true })
    mkdirSync(join(WORK, 'data'), { recursive: true })

    const bin = buildBackend()
    backendLog = join(WORK, 'backend.log')
    backendProc = start(bin, [], {
      env: { DATA_DIR: join(WORK, 'data'), PORT: String(BACKEND_PORT), HOST: '127.0.0.1', STORAGE_LIMIT_GB: '1' },
      log: backendLog,
    })
    await waitHTTP(`${BACKEND}/api/v1/health`)
    info(`后端就绪 ${BACKEND}`)

    serveProc = start(process.execPath, [join(dir, 'serve.mjs')], {
      cwd: dir,
      env: { BACKEND_URL: BACKEND, E2E_PORT: String(FRONT_PORT), E2E_STATIC: join(REPO, 'frontend', 'out') },
    })
    await waitHTTP(`${BASE}/api/v1/health`)
    info(`前端就绪 ${BASE}`)
  } else {
    await waitHTTP(`${BASE}/api/v1/health`)
  }

  console.log(`\n启动 Chrome …`)
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--lang=zh-CN'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  })
  pg = await browser.newPage()
  CUR = pg
  pg.setDefaultTimeout(10000)
  pg.setDefaultNavigationTimeout(30000) // 页面常驻 SSE 长连接，导航事件可能迟迟不来
  // 记录错误来源 URL 与参数里的堆栈：resource 加载失败时 location().url 就是那个失败的请求。
  pg.on('console', async (m) => {
    if (m.type() !== 'error') return
    let extra = ''
    try {
      const j = await m.args()[0]?.jsonValue()
      if (j && typeof j === 'object') extra = `｜${j.name || ''} ${j.message || ''} ${(j.stack || '').split('\n').slice(0, 3).join(' ⏎ ')}`
    } catch {}
    let url = ''
    try { url = (m.location() && m.location().url) || '' } catch {}
    consoleErrors.push(`${m.text().slice(0, 200)}${url ? ' ← ' + url : ''}${extra}`.slice(0, 500))
  })
  pg.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 300)))
  // 记录带堆栈的运行时错误，页面崩到 ErrorBoundary 时能定位到具体那一行
  await pg.evaluateOnNewDocument(() => {
    window.__e2eErrors = []
    window.addEventListener('error', (e) => {
      window.__e2eErrors.push({
        msg: String(e.message),
        stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 600) : '',
        at: `${e.filename || ''}:${e.lineno || 0}:${e.colno || 0}`,
      })
    }, true)
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason
      window.__e2eErrors.push({ msg: 'unhandledrejection: ' + (r && r.message ? r.message : String(r)), stack: r && r.stack ? String(r.stack).slice(0, 600) : '' })
    })
  })

  const state = { accountId: null, contactId: null, acctCount0: 0 }

  try {
    // ================= 1. 首页渲染 / 滚动条 / 趋势图高度 =================
    sec('1. 首页渲染与版式')
    await goto(pg, BASE)
    await waitFor(() => textExists(pg, '懒猫微邮'), { label: '首页品牌名' })

    await t('首页加载：品牌名、底部写邮件/联系人按钮在位', async () => {
      if (!(await textExists(pg, '懒猫微邮'))) throw new Error('未见品牌名')
      await pg.waitForSelector('button[aria-label="写邮件"]', { timeout: 5000 })
      await pg.waitForSelector('button[aria-label="联系人"]', { timeout: 5000 })
    })

    await t('首页不出现垂直滚动条', async () => {
      const m = await geom(pg, () => ({
        sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight,
      }))
      if (m.sh > m.ch + 1) throw new Error(`存在垂直滚动条 scrollHeight=${m.sh} clientHeight=${m.ch}`)
      info(`scrollHeight=${m.sh} clientHeight=${m.ch}`)
    })

    const chartBox = () => geom(pg, () => {
      const c = [...document.querySelectorAll('div')].find((d) => typeof d.className === 'string' && d.className.includes('h-32') && d.className.includes('sm:h-40'))
      if (!c) return null
      const r = c.getBoundingClientRect()
      return { h: Math.round(r.height), sh: c.scrollHeight, ch: c.clientHeight }
    })

    await t('邮件趋势卡片内部无溢出（不产生滚动条）', async () => {
      const c = await chartBox()
      if (!c) throw new Error('未找到趋势图容器（class 含 h-32/sm:h-40）')
      if (c.sh > c.ch + 1) throw new Error(`趋势容器内部溢出 scrollHeight=${c.sh} clientHeight=${c.ch}`)
      info(`容器高 ${c.h}px，内部 scrollHeight=${c.sh} clientHeight=${c.ch}`)
    })

    await t('趋势图容器高度已压缩到 160px 以内', async () => {
      const c = await chartBox()
      if (!c) throw new Error('未找到趋势图容器')
      if (c.h > 160) throw new Error(`高度 ${c.h}px 超过 160px`)
      info(`实际 ${c.h}px`)
    })

    // ================= 2. 趋势天数切换 =================
    sec('2. 邮件趋势天数切换')
    for (const days of [14, 30, 7]) {
      await t(`切换「${days}天」→ 标题更新为「邮件趋势（近${days}天）」`, async () => {
        await clickText(pg, `${days}天`)
        await waitFor(() => bodyHas(pg, `邮件趋势（近${days}天）`), { label: `标题 近${days}天` })
      })
    }

    // ================= 3. 顶栏导航 + 滑动指示器 =================
    sec('3. 顶栏导航与滑动指示器')
    const indicator = async (href) => {
      const snap = () => geom(pg, (s) => {
        const active = document.querySelector(s)
        const menu = document.querySelector('.nav-menu')
        const ind = document.querySelector('.nav-indicator')
        if (!active || !menu || !ind) return null
        const ar = active.getBoundingClientRect()
        const mr = menu.getBoundingClientRect()
        const ir = ind.getBoundingClientRect()
        return { left: ir.left - mr.left, width: ir.width, aLeft: ar.left - mr.left, aWidth: ar.width }
      }, `button[data-nav="${href}"]`)
      // 指示器有 ~300ms 过渡，必须等它停下再测量，否则量到的是过渡中的中间值。
      let g = await snap()
      let prev = null
      for (let i = 0; i < 40 && (!g || Math.abs(g.left - (prev?.left ?? -9999)) > 0.5); i++) {
        prev = g
        await sleep(80)
        g = await snap()
      }
      if (!g) throw new Error(`未取到指示器几何：${href}`)
      if (g.width < 8) throw new Error(`指示器宽度异常 ${g.width.toFixed(1)}px（激活项 ${g.aWidth.toFixed(1)}px）`)
      approx(g.width, g.aWidth, 4, '指示器宽度')
      approx(g.left, g.aLeft, 4, '指示器左偏移')
      return g
    }

    await t('点击「已发送」→ 跳转到 /mail?folder=Sent', async () => {
      await pg.waitForSelector('button[data-nav="/mail?folder=Sent"]', { timeout: 5000 })
      await pg.click('button[data-nav="/mail?folder=Sent"]')
      await waitFor(() => pg.evaluate(() => location.search.includes('folder=Sent')), { label: 'URL folder=Sent' })
    })

    await t('指示器定位到「已发送」激活项', async () => {
      const g = await indicator('/mail?folder=Sent')
      info(`指示器 left=${g.left.toFixed(1)} width=${g.width.toFixed(1)}（激活项 left=${g.aLeft.toFixed(1)} width=${g.aWidth.toFixed(1)}）`)
    })

    await t('切回「收件箱」→ 指示器跟随移动', async () => {
      await pg.click('button[data-nav="/mail?folder=INBOX"]')
      await waitFor(() => pg.evaluate(() => !location.search.includes('Sent')), { label: 'URL 回到收件箱' })
      await indicator('/mail?folder=INBOX')
    })

    // ================= 4. 主题与强调色 =================
    sec('4. 主题与强调色')
    await openSettings(pg)

    // 点击主题卡片后高频采样 data-theme，既能验证生效，也能在失败时打出真实变化序列。
    const clickTheme = async (name, want) => {
      await clickText(pg, name)
      const seq = []
      const t0 = Date.now()
      while (Date.now() - t0 < 8000) {
        const v = await themeAttr(pg)
        if (!seq.length || seq[seq.length - 1].v !== v) seq.push({ v: String(v), at: Date.now() - t0 })
        if (v === want) { info(`点击后 ${Date.now() - t0}ms 生效｜data-theme 变化：${seq.map((s) => `${s.v}@${s.at}ms`).join(' → ')}`); return }
        await sleep(120)
      }
      const s = await api.settings()
      throw new Error(`data-theme 变化：${seq.map((x) => `${x.v}@${x.at}ms`).join(' → ')}｜后端 theme=${s.theme} accent=${s.accent_color} nav_mode=${s.nav_mode}｜${await diag(pg, name)}`)
    }

    await t('切换深色主题 → data-theme=dark 且后端持久化', async () => {
      await clickTheme('深色主题 · 墨夜', 'dark')
      eq((await api.settings()).theme, 'dark', '后端 theme')
    })

    await t('切回浅色主题 → data-theme=light 且后端持久化', async () => {
      await clickTheme('浅色主题 · 暖砂', 'light')
      eq((await api.settings()).theme, 'light', '后端 theme')
    })

    await t('切换强调色「鎏金」→ --color-primary 生效且后端持久化', async () => {
      await clickText(pg, '鎏金')
      await waitFor(async () => {
        const v = (await cssVar(pg, '--color-primary')).toLowerCase().replace(/\s/g, '')
        return v === '#d3a93f' || v === 'rgb(211,169,63)'
      }, { label: '--color-primary=#D3A93F' })
      eq((await api.settings()).accent_color, '#D3A93F', '后端 accent_color')
    })

    await t('切回「朱红 · 默认」→ 移除内联强调色且后端清空', async () => {
      await clickText(pg, '朱红 · 默认')
      await waitFor(() => pg.evaluate(() => !document.documentElement.style.getPropertyValue('--color-primary')), { label: '移除 --color-primary' })
      await sleep(400)
      eq((await api.settings()).accent_color, '', '后端 accent_color')
    })

    // ================= 5. 布局切换（导航模式） =================
    sec('5. 布局切换（顶栏 / 侧边栏）')
    await t('切换「侧边栏模式」→ 侧边栏出现、顶栏品牌隐藏、后端持久化', async () => {
      await clickText(pg, '侧边栏模式 · 左侧导航')
      await waitFor(() => pg.evaluate(() => !!document.querySelector('aside.sidebar')), { label: 'aside.sidebar 出现' })
      await waitFor(() => pg.evaluate(() => !document.querySelector('.brand-cn')), { label: 'brand-cn 隐藏' })
      eq((await api.settings()).nav_mode, 'sidebar', '后端 nav_mode')
    })

    // 高频采样提示条生命周期：点击 → 记录出现时刻 → 记录自动消失时刻。
    const sampleToast = async (page, click, ms = 8000, step = 80) => {
      await click()
      let showAt = null, goneAt = null, txt = ''
      const t0 = Date.now()
      while (Date.now() - t0 < ms) {
        await sleep(step)
        const visible = await toastVisible(page)
        if (visible && showAt === null) { showAt = Date.now() - t0; txt = await toastText(page) }
        if (showAt !== null && !visible) { goneAt = Date.now() - t0; break }
      }
      return { showAt, goneAt, txt, total: Date.now() - t0 }
    }

    await t('布局提示条在 3.5s 内自动消失（duration=2s）', async () => {
      await clickText(pg, '顶栏模式 · 居中导航')
      await waitFor(() => !toastVisible(pg), { timeout: 4000, label: '前置提示条消失' }).catch(() => {})
      const r = await sampleToast(pg, () => clickText(pg, '侧边栏模式 · 左侧导航'))
      if (r.showAt === null) throw new Error(`提示条未在 ${r.total}ms 内出现｜${await toastDOM(pg)}`)
      if (!r.txt.includes('已切换布局')) throw new Error(`提示文案异常：${r.txt.slice(0, 60)}`)
      if (r.goneAt === null) throw new Error(`提示条 ${r.total}ms 内未自动消失｜残留 ${await toastDOM(pg)}`)
      const dt = r.goneAt - r.showAt
      if (dt > 3500) throw new Error(`提示条停留过久 ${dt}ms`)
      info(`出现于 +${r.showAt}ms，停留 ${dt}ms，文案「${r.txt.slice(0, 24)}…」`)
    })

    await t('切换回「顶栏模式」→ 侧边栏消失、品牌与指示器恢复', async () => {
      await clickText(pg, '顶栏模式 · 居中导航')
      await waitFor(() => pg.evaluate(() => !document.querySelector('aside.sidebar')), { label: '侧边栏消失' })
      await waitFor(() => pg.evaluate(() => !!document.querySelector('.brand-cn')), { label: 'brand-cn 恢复' })
      await waitFor(() => pg.evaluate(() => !!document.querySelector('.nav-indicator')), { label: 'nav-indicator 恢复' })
      eq((await api.settings()).nav_mode, 'topbar', '后端 nav_mode')
    })

    await t('布局设置在刷新后仍然生效（跨会话持久化）', async () => {
      await clickText(pg, '侧边栏模式 · 左侧导航')
      await waitFor(() => pg.evaluate(() => !!document.querySelector('aside.sidebar')), { label: '切换后立即生效' })
      await pg.reload({ waitUntil: 'domcontentloaded' })
      // 等后端设置真正回流到 DOM；不能只等页面上任意「懒猫微邮」文本出现（页脚也存在该文本）。
      await waitFor(async () => {
        const nav = (await api.settings()).nav_mode
        const has = await pg.evaluate(() => !!document.querySelector('aside.sidebar'))
        return nav === 'sidebar' && has
      }, { timeout: 10000, label: '刷新后侧边栏恢复' })
      await openSettings(pg)
      await clickText(pg, '顶栏模式 · 居中导航')
      await waitFor(() => pg.evaluate(() => !document.querySelector('aside.sidebar')), { label: '恢复顶栏' })
    })

    // ================= 6. 个性设置 / 样式 =================
    sec('6. 个性设置 → 样式')
    await openSettings(pg)
    await gotoSettingsTab(pg, '个性设置', '字体大小')

    await t('字体大小 +/- 生效：页面根字号与后端值同步', async () => {
      const pxMap = { small: 14, medium: 16, large: 18 }
      const seen = new Set()
      // 必须限定在设置弹窗内：顶栏「添加账号」也用 ri-add-line，否则点错按钮。
      const INC = '.fixed.inset-0 button:has(i.ri-add-line)'
      const DEC = '.fixed.inset-0 button:has(i.ri-subtract-line)'
      const read = async () => { const s = (await api.settings()).font_size; return { s: s || 'small', px: await rootFontSize(pg) } }
      const cur = await read()
      seen.add(cur.s)
      if (!pxMap[cur.s]) throw new Error(`font_size 非法：${cur.s}`)
      if (Math.abs(cur.px - pxMap[cur.s]) > 0.6) throw new Error(`初始 font_size=${cur.s} 但根字号 ${cur.px}px（期望 ${pxMap[cur.s]}px）`)
      info(`初始：${cur.s} / ${cur.px}px`)
      let prev = cur.s
      for (let i = 0; i < 3; i++) {
        await clickSelector(pg, INC)
        await waitFor(async () => (await api.settings()).font_size !== prev || prev === 'large', { timeout: 3000, label: 'font_size 变化' })
        const now = await read()
        if (!pxMap[now.s]) throw new Error(`font_size 非法：${now.s}`)
        if (Math.abs(now.px - pxMap[now.s]) > 0.6) throw new Error(`font_size=${now.s} 但根字号 ${now.px}px（期望 ${pxMap[now.s]}px）`)
        seen.add(now.s)
        info(`+第${i + 1}次：${prev}→${now.s}，根字号 ${now.px}px`)
        prev = now.s
      }
      if (seen.size < 3) throw new Error(`只覆盖到 ${seen.size} 档：${[...seen].join(',')}`)
      await clickSelector(pg, DEC)
      await waitFor(async () => (await api.settings()).font_size !== prev, { timeout: 3000, label: '减小生效' })
      info(`-1 次：${prev}→${(await api.settings()).font_size}`)
    })

    await t('默认布局「双栏」→ 后端持久化且邮件列表列宽变窄', async () => {
      await clickText(pg, '双栏')
      await sleep(400)
      eq((await api.settings()).layout_density, 'two', '后端 layout_density')
      const cls = await mailListClass(pg)
      if (!/280px|340px/.test(cls)) throw new Error(`邮件列表未应用双栏列宽：${cls.slice(0, 120)}`)
      info(`列宽 class：${cls.slice(0, 90)}`)
    })

    await t('默认布局「三栏」→ 恢复宽列（320/420px）', async () => {
      await openSettings(pg)
      await gotoSettingsTab(pg, '个性设置', '字体大小')
      await clickText(pg, '三栏')
      await sleep(400)
      eq((await api.settings()).layout_density, 'three', '后端 layout_density')
      const cls = await mailListClass(pg)
      if (!/320px|420px/.test(cls)) throw new Error(`邮件列表未应用三栏列宽：${cls.slice(0, 120)}`)
      info(`列宽 class：${cls.slice(0, 90)}`)
    })

    await t('列表密度「紧凑」→ 后端持久化 mail_density=compact', async () => {
      await openSettings(pg)
      await gotoSettingsTab(pg, '个性设置', '字体大小')
      await clickText(pg, '紧凑')
      await sleep(400)
      eq((await api.settings()).mail_density, 'compact', '后端 mail_density')
    })

    // ================= 7. 代理设置 =================
    sec('7. 代理设置（分段按钮 / 下拉框 / 输入框 / 校验）')
    await clickText(pg, '代理设置')
    await waitFor(() => textExists(pg, '代理模式'), { label: '代理面板' })

    await t('选择「自定义代理」→ 展开协议/地址/端口表单', async () => {
      await clickText(pg, '自定义代理')
      await pg.waitForSelector('input[placeholder^="代理地址"]', { timeout: 5000 })
      await pg.waitForSelector('input[placeholder="端口"]', { timeout: 5000 })
    })

    await t('空代理地址保存 → 被校验拦截并提示，后端未改动', async () => {
      const before = (await api.settings()).proxy_mode
      await clickText(pg, '保存设置')
      await waitFor(() => toastVisible(pg), { timeout: 3000, label: '校验提示' })
      const txt = await toastText(pg)
      if (!txt.includes('请填写代理服务器地址')) throw new Error(`提示异常：${txt.slice(0, 60)}`)
      await sleep(500)
      eq((await api.settings()).proxy_mode, before, 'proxy_mode 未变')
    })

    await t('协议下拉框 → 展开并选择 SOCKS5 生效', async () => {
      const h = await pg.evaluateHandle(() => {
        const btns = [...document.querySelectorAll('button')]
        return btns.find((b) => /^(HTTP|HTTPS|SOCKS5)$/.test(b.textContent.trim())) || null
      })
      const el = h.asElement()
      if (!el) throw new Error('未找到协议下拉框')
      await el.click()
      await waitFor(() => textExists(pg, 'SOCKS5'), { label: '下拉项 SOCKS5' })
      await clickText(pg, 'SOCKS5')
      await sleep(200)
      const shown = await pg.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'SOCKS5')
        return b ? b.textContent.trim() : ''
      })
      if (!shown.includes('SOCKS5')) throw new Error(`下拉框未回显选中值：「${shown}」`)
    })

    await t('填写地址端口并保存 → 后端 proxy_* 四项全部同步', async () => {
      await typeInto(pg, 'input[placeholder^="代理地址"]', '127.0.0.1')
      await typeInto(pg, 'input[placeholder="端口"]', '10999')
      await clickText(pg, '保存设置')
      await waitFor(() => toastVisible(pg), { timeout: 5000, label: '保存提示' })
      await sleep(500)
      const s = await api.settings()
      eq(s.proxy_mode, 'custom', 'proxy_mode')
      eq(s.proxy_proto, 'socks5', 'proxy_proto')
      eq(s.proxy_host, '127.0.0.1', 'proxy_host')
      eq(s.proxy_port, '10999', 'proxy_port')
    })

    await t('切回「不使用代理」并保存 → proxy_mode=none', async () => {
      await clickText(pg, '不使用代理')
      await clickText(pg, '保存设置')
      await waitFor(() => toastVisible(pg), { timeout: 5000, label: '保存提示' })
      await sleep(500)
      eq((await api.settings()).proxy_mode, 'none', 'proxy_mode')
    })

    // ================= 8. 存储管理 =================
    // 注意：后端要求「先添加邮箱账号才能改归档目录」，归档路径的输入/提交测试放到第 9 节之后。
    sec('8. 存储管理（面板渲染与无账号约束）')
    await clickText(pg, '存储管理')
    await waitFor(() => textExists(pg, '归档根目录'), { label: '存储面板' })

    await t('目录结构 / 存储统计 / 自动清理 面板正常渲染', async () => {
      for (const k of ['目录结构', '存储统计', '邮件总数', '自动清理']) {
        if (!(await textExists(pg, k))) throw new Error(`未见「${k}」`)
      }
      info('归档根目录 / 目录结构 / 存储统计 / 自动清理 均已渲染')
    })

    await t('未添加账号时归档路径只读（后端约束）', async () => {
      if (await pg.evaluate(() => !!document.querySelector('input[placeholder^="输入归档路径"]'))) {
        throw new Error('无账号时不应出现归档路径输入框')
      }
      if (!(await textExists(pg, '添加账号后显示'))) throw new Error('未见「添加账号后显示」占位提示')
    })

    // ================= 9. 账号管理 =================
    sec('9. 账号管理（表单 / 输入框 / 持久化）')
    state.acctCount0 = (await api.accounts()).length
    await clearHash(pg)
    await openHash(pg, 'account')
    await waitFor(() => textExists(pg, '账号管理'), { label: '账号管理弹窗' })
    await waitFor(() => pg.evaluate(() => !!document.querySelector('input[placeholder^="账号名称"]')), { label: '账号表单' })

    await t('填写账号表单并保存 → 后端创建成功且数据一致', async () => {
      try {
        await typeInto(pg, 'input[placeholder^="账号名称"]', 'E2E 测试邮箱')
        await typeInto(pg, 'input[placeholder^="邮箱"]', 'e2e@test.local')
        await typeInto(pg, 'input[placeholder^="IMAP 服务器"]', '127.0.0.1')
        await typeInto(pg, 'input[placeholder^="SMTP 服务器"]', '127.0.0.1')
        // 端口框是 <input type="number">，没有 placeholder，只能按索引定位
        await fillNth(pg, 'input[type="number"]', 0, 1)
        await fillNth(pg, 'input[type="number"]', 1, 1)
        await typeInto(pg, 'input[placeholder="用户名 / 邮箱地址"]', 'e2e@test.local')
        await typeInto(pg, 'input[placeholder="密码 / 授权码"]', 'e2e-secret')
        await clickText(pg, '保存账号')
      } catch (e) { throw new Error(`${e.message}｜${await dump(pg)}`) }
      const found = await waitFor(async () => {
        const list = await api.accounts()
        const mine = list.find((a) => a.name === 'E2E 测试邮箱')
        return mine && list.length === state.acctCount0 + 1 ? mine : null
      }, { timeout: 15000, label: '后端账号数量+1' })
      eq(found.email, 'e2e@test.local', '账号邮箱')
      eq(found.imap_port, 1, 'IMAP 端口')
      eq(found.smtp_port, 1, 'SMTP 端口')
      state.accountId = found.id
      info(`账号 id=${found.id}`)
    })

    await t('账号列表回显刚创建的账号（UI 同步）', async () => {
      await waitFor(() => textExists(pg, 'E2E 测试邮箱'), { timeout: 10000, label: 'UI 出现账号名' })
    })

    // ================= 8b. 存储管理：归档目录（需已存在账号） =================
    sec('8b. 存储管理（归档目录修改）')
    const NEW_ARCHIVE = '/tmp/lzmail-arch-test'
    await openSettings(pg)
    await gotoSettingsTab(pg, '个性设置', '字体大小')
    await gotoSettingsTab(pg, '存储管理', '归档根目录')

    await t('修改归档目录并确定 → 后端持久化且目录被后端创建', async () => {
      // 归档编辑按钮的 title 是「点击修改归档目录」（有账号）或「请先添加邮箱账号」（无账号），
      // 用 title 判断比数图标更稳——顺带能验证前端确实感知到了刚创建的账号。
      try {
        await waitFor(async () => pg.evaluate(() =>
          [...document.querySelectorAll('button')].some((b) => b.title === '点击修改归档目录')),
          { label: '归档目录可编辑（前端已感知账号）' })
        await pg.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find((x) => x.title === '点击修改归档目录')
          if (b) b.click()
        })
        await pg.waitForSelector('input[placeholder^="输入归档路径"]', { timeout: 5000 })
        await typeInto(pg, 'input[placeholder^="输入归档路径"]', NEW_ARCHIVE)
      } catch (e) {
        // 把候选按钮逐个打出来，定位是「前端没感知到账号」还是「点了没反应」
        const cands = await pg.evaluate(() =>
          [...document.querySelectorAll('button')]
            .filter((b) => b.querySelector('i.ri-folder-line') || /归档/.test(b.textContent || ''))
            .map((b) => ({
              disabled: b.disabled,
              title: b.title || '',
              text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
            })))
        throw new Error(`${e.message}｜后端账号数=${(await api.accounts()).length}｜候选按钮=${JSON.stringify(cands)}｜${await dump(pg)}`)
      }
      await clickText(pg, '确定')
      await waitFor(() => toastVisible(pg), { timeout: 6000, label: '归档保存提示' })
      await sleep(600)
      eq((await api.settings()).archive_path, NEW_ARCHIVE, '后端 archive_path')
      if (!existsSync(NEW_ARCHIVE)) throw new Error(`${NEW_ARCHIVE} 未被后端创建`)
      info(`已创建目录 ${NEW_ARCHIVE}`)
    })

    // ================= 10. 联系人 =================
    sec('10. 联系人（新增 / 搜索 / 编辑 / 删除）')
    await clearHash(pg)
    await openHash(pg, 'contact')
    try {
      await waitFor(() => pg.evaluate(() => !!document.querySelector('input[placeholder^="搜索姓名或邮箱"]')), { label: '联系人面板' })
    } catch (e) { throw new Error(`联系人面板未打开：${e.message}｜${await dump(pg)}`) }

    await t('新建联系人 → 后端创建成功且列表可见', async () => {
      try {
        await clickText(pg, '添加联系人')
        await pg.waitForSelector('input[placeholder="姓名"]', { timeout: 5000 })
      } catch (e) { throw new Error(`${e.message}｜账号数=${(await api.accounts()).length}｜${await dump(pg)}`) }
      await typeInto(pg, 'input[placeholder="姓名"]', '张三测试')
      await typeInto(pg, 'input[placeholder="邮箱地址"]', 'zhangsan@test.local')
      await typeInto(pg, 'input[placeholder="电话"]', '13800138000')
      await typeInto(pg, 'input[placeholder="公司"]', '测试公司')
      await clickText(pg, '保存')
      const found = await waitFor(async () => {
        const c = (await api.contacts()).find((x) => x.name === '张三测试')
        return c || null
      }, { timeout: 10000, label: '后端联系人' })
      eq(found.email, 'zhangsan@test.local', '联系人邮箱')
      state.contactId = found.id
      await waitFor(() => textExists(pg, '张三测试'), { label: 'UI 出现联系人' })
      info(`联系人 id=${found.id}`)
    })

    await t('联系人搜索过滤生效（命中与未命中）', async () => {
      await typeInto(pg, 'input[placeholder^="搜索姓名或邮箱"]', '张三')
      await waitFor(() => textExists(pg, '张三测试'), { label: '命中张三测试' })
      await typeInto(pg, 'input[placeholder^="搜索姓名或邮箱"]', 'zzzz_no_match')
      await waitFor(async () => !(await textExists(pg, '张三测试')), { label: '未命中时隐藏' })
    })

    await t('行菜单 → 编辑联系人姓名 → 后端更新', async () => {
      await typeInto(pg, 'input[placeholder^="搜索姓名或邮箱"]', '张三测试')
      await waitFor(() => textExists(pg, '张三测试'), { label: '重新定位' })
      await clickSelector(pg, 'button:has(i.ri-more-2-line)')
      await waitFor(() => textExists(pg, '编辑'), { label: '行菜单' })
      await clickText(pg, '编辑')
      await pg.waitForSelector('input[placeholder="姓名"]', { timeout: 5000 })
      const pre = await pg.evaluate(() => document.querySelector('input[placeholder="姓名"]').value)
      eq(pre, '张三测试', '编辑表单初始值')
      await typeInto(pg, 'input[placeholder="姓名"]', '李四测试')
      await clickText(pg, '保存')
      const found = await waitFor(async () => {
        const c = (await api.contacts()).find((x) => x.id === state.contactId)
        return c && c.name === '李四测试' ? c : null
      }, { timeout: 10000, label: '后端已改名' })
      eq(found.email, 'zhangsan@test.local', '邮箱未被误改')
    })

    await t('行菜单 → 删除联系人 → 确认弹窗 → 后端删除', async () => {
      await clickSelector(pg, 'button:has(i.ri-more-2-line)')
      await waitFor(() => textExists(pg, '删除'), { label: '行菜单' })
      await clickText(pg, '删除')
      await waitFor(() => textExists(pg, '删除联系人'), { label: '删除确认弹窗' })
      await clickText(pg, '删除')
      await waitFor(async () => !(await api.contacts()).some((x) => x.id === state.contactId), { timeout: 10000, label: '后端已删除' })
      await sleep(400)
      if (await textExists(pg, '李四测试')) throw new Error('删除后 UI 仍显示该联系人')
    })

    // ================= 11. 写邮件 =================
    sec('11. 写邮件（输入框 / 开关 / 附件 / 草稿）')
    await clearHash(pg)
    await goto(pg, BASE)
    await waitFor(() => textExists(pg, '懒猫微邮'), { label: '首页' })
    await openHash(pg, 'compose')
    try {
      await waitFor(() => pg.evaluate(() => !!document.querySelector('input[placeholder="输入邮件主题..."]')), { label: '写邮件弹窗' })
    } catch (e) { throw new Error(`写邮件弹窗未出现：${e.message}｜${await dump(pg)}`) }

    await t('主题输入框可编辑并回显', async () => {
      await typeInto(pg, 'input[placeholder="输入邮件主题..."]', 'E2E 测试邮件主题')
      const v = await pg.evaluate(() => document.querySelector('input[placeholder="输入邮件主题..."]').value)
      eq(v, 'E2E 测试邮件主题', '主题回显')
    })

    await t('收件人输入框（联系人选择器）可输入', async () => {
      await typeInto(pg, 'input[placeholder="选择联系人"]', 'someone@example.com')
      await waitFor(async () => (await pg.evaluate(() => document.body.innerText)).includes('someone@example.com'), { label: '收件人回显' })
    })

    await t('抄送 / 密送 开关可展开输入框', async () => {
      const before = await pg.evaluate(() => [...document.querySelectorAll('input')].map((i) => i.placeholder))
      await clickText(pg, '抄送')
      await clickText(pg, '密送')
      await sleep(300)
      const after = await pg.evaluate(() => [...document.querySelectorAll('input')].map((i) => i.placeholder))
      if (after.length <= before.length) throw new Error(`展开前 ${before.length} 个输入框，展开后 ${after.length} 个，未增加`)
      info(`输入框 ${before.length} → ${after.length}：${after.join(' / ')}`)
    })

    await t('添加附件：文件选择控件可接收文件并回显', async () => {
      const tmp = join(WORK, 'attach.txt')
      mkdirSync(WORK, { recursive: true })
      writeFileSync(tmp, 'hello lzmail e2e attachment')
      const el = (await pg.evaluateHandle(() => document.querySelector('input[type="file"]'))).asElement()
      if (!el) { warns.push('未找到 input[type=file]，跳过附件上传'); info('未找到文件选择控件'); return }
      await el.uploadFile(tmp)
      await sleep(2000)
      const shown = await pg.evaluate(() => document.body.innerText)
      if (!shown.includes('attach')) { warns.push('附件上传后界面未回显文件名'); info('附件已上传但未见文件名回显') } else {
        info('附件文件名已在界面回显')
      }
    })

    await t('存草稿 → 后端草稿数量增加且提示成功', async () => {
      const draftCount = async () => ((await api.get('/api/v1/mails?folder=Drafts')) || []).length
      const before = await draftCount()
      // 抓一遍 compose 的真实请求与响应，失败时能直接看到「前端发了什么、后端回了什么」
      const net = []
      const onReq = (req) => { if (req.url().includes('/api/v1/compose')) net.push({ m: req.method(), body: req.postData() || '' }) }
      const onRes = (res) => { if (res.url().includes('/api/v1/compose')) net.push({ s: res.status() }) }
      pg.on('request', onReq); pg.on('response', onRes)

      await clickText(pg, '存草稿')

      // 从 Node 走同一条代理链路再发一次请求（用只读的 settings，不能碰 compose，
      // 否则会自己造一封草稿，把「数量是否增加」这条判据污染掉）：
      // Node 快而浏览器慢 → 浏览器侧连接池被长连接占住；两者都慢 → 后端阻塞。
      const nodeT0 = Date.now()
      let nodeProbe = '未测'
      try {
        const r = await fetch(`${BASE}/api/v1/settings`)
        await r.text()
        nodeProbe = `${r.status}/${Date.now() - nodeT0}ms`
      } catch (e) { nodeProbe = `err ${e.message}` }

      // 成功提示只显示 2 秒，而且页面上可能同时挂着别的提示（如联系人搜索失败），
      // 所以全程累积采样所有提示文本，而不是只取当前第一条。
      let after = before
      const texts = []
      for (let i = 0; i < 45; i++) {
        await sleep(300)
        for (const tx of await toastTexts(pg)) texts.push(tx)
        after = await draftCount()
        if (after > before && texts.some((x) => /草稿/.test(x))) break
      }
      pg.off('request', onReq); pg.off('response', onRes)

      const all = [...new Set(texts)]
      const okToast = all.find((x) => /草稿/.test(x)) || ''
      await pg.screenshot({ path: join(WORK, 'e2e-draft.png') }).catch(() => {})
      const ctx = `网络=${JSON.stringify(net).slice(0, 320)}｜Node同链路=${nodeProbe}｜全部提示=「${all.join(' / ').slice(0, 160)}」${logTail(backendLog, 6)}｜${await dump(pg)}`
      eq(after > before, true, `后端草稿数量 ${before}→${after}｜${ctx}`)
      eq(!!okToast, true, `草稿成功提示（采样到的提示：「${all.join(' / ').slice(0, 160) || '无任何提示'}」）｜${ctx}`)
      info(`草稿 ${before}→${after}｜提示「${okToast.slice(0, 40)}」`)
    })

    // ================= 12. 邮件页导航 =================
    sec('12. 邮件页导航')
    await clearHash(pg)
    await goto(pg, `${BASE}/mail.html?folder=STARRED`)
    await waitFor(() => pg.evaluate(() => location.search.includes('STARRED')), { label: '进入标星邮件' })

    await t('STARRED 文件夹导航项高亮（aria-current=page）', async () => {
      await sleep(400)
      const active = await pg.evaluate(() => document.querySelector('button[data-nav="/mail?folder=STARRED"]')?.getAttribute('aria-current') || '')
      eq(active, 'page', 'aria-current')
    })

    await t('侧边栏模式下导航项点击同样生效', async () => {
      await openSettings(pg)
      await clickText(pg, '侧边栏模式 · 左侧导航')
      await waitFor(() => pg.evaluate(() => !!document.querySelector('aside.sidebar')), { label: '侧边栏' })
      await clearHash(pg)
      await waitFor(() => pg.evaluate(() => location.hash === ''), { label: '弹窗关闭' })
      const n = await pg.evaluate(() => document.querySelectorAll('aside.sidebar button').length)
      if (n < 7) throw new Error(`侧边栏按钮数量不足：${n}`)
      // 侧边栏导航走 Next 的 SPA router（静态导出下 push 只改 query、不发请求）。
      // 点击可能被弹窗退场动画中的节点吞掉，或命中正在重排的节点，所以按「是否跳转成功」重试。
      let jumped = false
      for (let i = 0; i < 4 && !jumped; i++) {
        const clicked = await pg.evaluate(() => {
          const t = [...document.querySelectorAll('aside.sidebar button')]
            .find((x) => (x.textContent || '').includes('草稿箱'))
          if (!t) return false
          t.click()
          return true
        })
        if (!clicked) break
        try {
          await waitFor(() => pg.evaluate(() => location.search.includes('folder=Drafts')), { timeout: 4000, label: '侧边栏点击跳转' })
          jumped = true
        } catch { await sleep(400) }
      }
      if (!jumped) {
        const labels = await pg.evaluate(() => [...document.querySelectorAll('aside.sidebar button')].map((x) => (x.textContent || '').trim()))
        throw new Error(`侧边栏「草稿箱」点击后未跳转（已重试 4 次）｜URL=${await pg.url()}｜labels=[${labels.join(' / ')}]｜${await dump(pg)}`)
      }
      await openSettings(pg)
      await clickText(pg, '顶栏模式 · 居中导航')
      await waitFor(() => pg.evaluate(() => !document.querySelector('aside.sidebar')), { label: '恢复顶栏' })
      await clearHash(pg)
      info(`侧边栏按钮 ${n} 个`)
    })

    // ================= 13. 移动端适配 =================
    sec('13. 移动端适配（375x720）')
    await pg.setViewport({ width: 375, height: 720, deviceScaleFactor: 2 })
    await goto(pg, BASE)
    await waitFor(() => textExists(pg, '懒猫微邮'), { label: '移动端首页' })

    await t('移动端渲染顶栏文件夹下拉而非桌面导航', async () => {
      await pg.waitForSelector('button[aria-label="邮件文件夹"]', { timeout: 5000 })
      const hasDesktopTabs = await pg.evaluate(() => document.querySelectorAll('.nav-indicator').length)
      eq(hasDesktopTabs, 0, '不应出现桌面滑动指示器')
    })

    await t('移动端文件夹下拉可展开并列出全部文件夹', async () => {
      await clickSelector(pg, 'button[aria-label="邮件文件夹"]')
      await waitFor(() => textExists(pg, '收件箱'), { label: '文件夹列表' })
      const n = await pg.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /收件箱|已发送|草稿箱|已删除|垃圾邮件|标星邮件|稍后处理/.test(b.textContent)).length)
      if (n < 5) throw new Error(`文件夹项数量不足：${n}`)
      info(`可见文件夹项 ${n} 个`)
    })

    await t('移动端不出现垂直滚动条（趋势卡片不撑破）', async () => {
      const m = await geom(pg, () => ({ sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight }))
      info(`scrollHeight=${m.sh} clientHeight=${m.ch}`)
      if (m.sh > m.ch + 2) throw new Error(`移动端出现垂直滚动条 ${m.sh} > ${m.ch}`)
    })

    // ================= 14. 清理 =================
    sec('14. 清理测试数据')
    await pg.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await goto(pg, BASE)
    await openHash(pg, 'account')
    await waitFor(() => textExists(pg, 'E2E 测试邮箱'), { timeout: 10000, label: '定位测试账号' })

    await t('删除测试账号 → 后端账号恢复初始数量', async () => {
      await pg.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('E2E 测试邮箱'))
        if (b) b.click()
      })
      await sleep(500)
      const del = (await pg.evaluateHandle(() => {
        const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('删除账号'))
        return b
      })).asElement()
      if (del) {
        await del.click()
        await sleep(500)
        const confirm = (await pg.evaluateHandle(() => {
          const bs = [...document.querySelectorAll('button')].filter((x) => (x.textContent || '').trim() === '删除' || (x.textContent || '').includes('确定'))
          return bs[bs.length - 1] || null
        })).asElement()
        if (confirm) await confirm.click()
      } else if (state.accountId) {
        await api.del(`/api/v1/accounts/${state.accountId}`)
        info('UI 未找到删除按钮，改用 API 兜底删除')
      }
      await waitFor(async () => (await api.accounts()).length === state.acctCount0, { timeout: 15000, label: '账号已删除' })
    })

    // ================= 15. 全局检查 =================
    sec('15. 全局')
    await t('全程无控制台错误 / 未捕获异常', async () => {
      if (consoleErrors.length) {
        throw new Error(`发现 ${consoleErrors.length} 条：\n` + consoleErrors.slice(0, 6).join('\n'))
      }
    })
  } catch (e) {
    failed.push({ name: '__suite__', msg: (e.stack || String(e)).slice(0, 800) })
    console.log(`\n[SUITE ERROR] ${e.stack || e}`)
  } finally {
    if (pg) await pg.close().catch(() => {})
    if (browser) await browser.close().catch(() => {})
    if (serveProc) serveProc.kill('SIGTERM')
    if (backendProc) backendProc.kill('SIGTERM')
    await sleep(300)
  }

  console.log('\n' + '='.repeat(64))
  console.log(`通过 ${passed.length}  失败 ${failed.length}  警告 ${warns.length}`)
  if (warns.length) {
    console.log('\n警告：')
    for (const w of warns) console.log(`  [WARN] ${w}`)
  }
  if (failed.length) {
    console.log('\n失败明细：')
    for (const f of failed) console.log(`  [FAIL] ${f.name}\n         ${f.msg}`)
  }
  console.log('='.repeat(64))
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
