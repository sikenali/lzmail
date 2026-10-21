#!/usr/bin/env node
// 本地 E2E 服务：静态托管 frontend/out，并把 /api/* 代理到后端。
// 用法：BACKEND_URL=http://127.0.0.1:18080 E2E_PORT=18081 node serve.mjs
import http from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('.', import.meta.url))
const ROOT = process.env.E2E_STATIC || join(dir, '..', '..', 'frontend', 'out')
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:18080'
const PORT = Number(process.env.E2E_PORT || 18081)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.webp': 'image/webp',
}

function fileOrNull(p) {
  const f = join(ROOT, p)
  if (!f.startsWith(ROOT)) return null
  try {
    const s = statSync(f)
    return s.isFile() ? f : null
  } catch {
    return null
  }
}

function resolve(path) {
  for (const c of [path, `${path}.html`, `${path}/index.html`, '/404.html']) {
    const f = fileOrNull(c)
    if (f) return { file: f, status: c === '/404.html' ? 404 : 200 }
  }
  return null
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')

  if (url.pathname.startsWith('/api/')) {
    const upstream = new URL(url.pathname + url.search, BACKEND)
    const headers = { ...req.headers, host: upstream.host }
    delete headers['connection']
    delete headers['keep-alive']
    const upstreamReq = http.request(
      { method: req.method, hostname: upstream.hostname, port: upstream.port, path: upstream.pathname + upstream.search, headers },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers)
        upstreamRes.pipe(res)
      }
    )
    upstreamReq.on('error', (e) => {
      res.writeHead(502, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: `backend unreachable: ${e.message}` }))
    })
    req.pipe(upstreamReq)
    return
  }

  const hit = resolve(url.pathname)
  if (!hit) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('404 not found')
    return
  }
  res.writeHead(hit.status, {
    'content-type': MIME[extname(hit.file)] || 'application/octet-stream',
    'cache-control': 'no-store',
  })
  createReadStream(hit.file).pipe(res)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[e2e] serve http://127.0.0.1:${PORT}  static=${ROOT}  api→${BACKEND}`)
})
