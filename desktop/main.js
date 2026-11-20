const { app, BrowserWindow, Menu, dialog, shell } = require('electron')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const net = require('net')
const path = require('path')

let backend = null
let mainWindow = null
let baseUrl = ''

function backendBinaryPath() {
  const name = process.platform === 'win32' ? 'lzmail.exe' : 'lzmail'
  if (app.isPackaged) return path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', name)
  return path.join(__dirname, 'bin', name)
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address()
      const port = typeof address === 'object' && address ? address.port : 0
      srv.close(() => resolve(port))
    })
  })
}

function waitForHealth(port, timeoutMs = 25000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error('后端启动超时'))
        return
      }
      setTimeout(check, 350)
    }
    const check = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/api/v1/health', timeout: 1200 }, res => {
        res.resume()
        if (res.statusCode === 200) resolve()
        else retry()
      })
      req.on('timeout', () => req.destroy())
      req.on('error', retry)
    }
    check()
  })
}

function startBackend(port) {
  const dataDir = path.join(app.getPath('userData'), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  const logPath = path.join(app.getPath('userData'), 'backend.log')
  const logStream = fs.createWriteStream(logPath, { flags: 'a' })

  backend = spawn(backendBinaryPath(), [], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      LZMAIL_NO_BROWSER: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  })
  backend.stdout.pipe(logStream)
  backend.stderr.pipe(logStream)
  backend.on('exit', code => {
    logStream.write(`\n[backend exited] code=${code}\n`)
    if (code !== 0 && !app.isQuitting) {
      dialog.showErrorBox('LZMail 后端已退出', `后端进程退出码：${code}\n日志：${logPath}`)
    }
  })
}

async function createWindow() {
  const port = await findFreePort()
  startBackend(port)
  await waitForHealth(port)
  baseUrl = `http://127.0.0.1:${port}`

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'LZMail',
    backgroundColor: '#0A0F18',
    autoHideMenuBar: true,
    icon: app.isPackaged ? path.join(process.resourcesPath, 'icon.png') : path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(baseUrl)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(baseUrl)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  await mainWindow.loadURL(baseUrl)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    createWindow().catch(err => {
      dialog.showErrorBox('LZMail 启动失败', String(err && err.message ? err.message : err))
      app.quit()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow().catch(() => {})
      }
    })
  })
}

app.on('before-quit', () => {
  app.isQuitting = true
  if (backend && !backend.killed) {
    backend.kill()
    backend = null
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
