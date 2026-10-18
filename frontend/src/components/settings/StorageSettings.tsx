'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/useSettings'
import { api } from '@/lib/api'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import type { MailStats, StorageTreeNode } from '@/types'
import { Folder, FileText, RefreshCw, Trash2, Edit, Contact } from '@/lib/icons'

type DirNode = { name: string; is_dir: boolean; path: string; subdirs?: DirNode[] }

function DirTree({ entries, onSelect, selected, depth = 0 }: {
  entries: DirNode[]; onSelect: (path: string) => void; selected: string; depth?: number
}) {
  return (
    <div className="space-y-0.5">
      {entries.map(e => {
        const isSelected = selected === e.path
        return (
          <div key={e.path}>
            <button
              onClick={() => e.is_dir && onSelect(e.path)}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-[6px] text-[12px] transition-colors hover:bg-[var(--accent)]"
              style={{
                backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                color: isSelected ? 'var(--primary)' : 'var(--foreground-secondary)',
                paddingLeft: `${12 + depth * 16}px`,
                cursor: e.is_dir ? 'pointer' : 'default',
              }}
            >
              <span style={{ color: e.is_dir ? 'var(--gold)' : 'var(--foreground-tertiary)', fontSize: '14px' }}>
                {e.is_dir ? '📁' : '📄'}
              </span>
              <span className="truncate">{e.name}</span>
            </button>
            {e.subdirs && e.subdirs.length > 0 && (
              <DirTree entries={e.subdirs} onSelect={onSelect} selected={selected} depth={depth + 1} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function StorageTreeView({ root }: { root: StorageTreeNode }) {
  const renderNode = (node: StorageTreeNode, depth: number) => {
    const isDir = node.is_dir
    return (
      <div key={node.path}>
        <div className="flex items-center gap-2 rounded-[6px]" style={{ paddingLeft: depth * 24 }}>
          {isDir ? (
                <Folder className="w-[17px] h-[17px] shrink-0" style={{ fontSize: 17, color: 'var(--gold)' }} />
          ) : (
                <FileText className="w-[17px] h-[17px] shrink-0" style={{ fontSize: 17, color: 'var(--foreground-tertiary)' }} />
          )}
          <span className="truncate" style={{ fontSize: depth <= 1 ? 14 : 13, fontWeight: depth <= 1 ? 600 : 500, color: isDir ? 'var(--foreground)' : 'var(--foreground-secondary)' }}>
            {node.name}{isDir ? '/' : ''}
          </span>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="mt-[3px] space-y-[3px]">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }
  return renderNode(root, 0)
}

function formatBytes(b: number): string {
  if (b === 0) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(b) / Math.log(k))
  return (b / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
}

export function StorageSettings() {
  const [stats, setStats] = useState<MailStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { settings, loading: settingsLoading, setSetting } = useSettings()
  const [accounts, setAccounts] = useState<Array<{ id: number; name?: string; email: string }>>([])
  const [editingPath, setEditingPath] = useState(false)
  const [pathInput, setPathInput] = useState('')
  const [dirEntries, setDirEntries] = useState<DirNode[]>([])
  const [dirLoading, setDirLoading] = useState(false)
  const [dirError, setDirError] = useState('')
  const [treeOpen, setTreeOpen] = useState(false)
  const treeRef = useRef<HTMLDivElement>(null)
  const [storageRoot, setStorageRoot] = useState<StorageTreeNode | null>(null)
  const [cleanupAccountId, setCleanupAccountId] = useState<number>(0)
  const [cleanupConfirm, setCleanupConfirm] = useState<{ acc: { id: number; name?: string; email: string }; days: number; count: number } | null>(null)

  const archiveDir = settings.archive_dir || ''
  const archivePath = settings.archive_path || archiveDir || ''
  const hasAccount = accounts.length > 0

  useEffect(() => {
    const loadAccounts = () => {
      api.accounts.list().then(d => setAccounts(d ?? [])).catch(() => {})
    }
    loadAccounts()
    const ch = new BroadcastChannel('lzmail_accounts')
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'accounts:updated') loadAccounts()
    }
    ch.addEventListener('message', handler)
    return () => ch.close()
  }, [])

  useEffect(() => {
    api.mails.stats().then(d => setStats(d ?? null)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // 目录树必须在设置（服务端真实归档路径）加载完成后拉取，
    // 否则会用浏览器默认推断路径（/home/user/...）请求导致 400。
    if (settingsLoading) return
    api.storage.tree(archivePath).then(res => setStorageRoot(res.root)).catch(() => setStorageRoot(null))
  }, [archivePath, settingsLoading])

  const pathInputTouched = useRef(false)
  const reloadTree = () => {
    api.storage.tree(archivePath).then(res => setStorageRoot(res.root)).catch(() => setStorageRoot(null))
  }
  useEffect(() => {
    if (archivePath && !pathInputTouched.current) setPathInput(archivePath)
  }, [archivePath])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (treeRef.current && !treeRef.current.contains(e.target as Node)) setTreeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadDirTree = async (path: string) => {
    if (!path) return
    setDirLoading(true); setDirError('')
    try {
      const res = await api.storage.list(path)
      setDirEntries(res.entries); setTreeOpen(true)
    } catch (e: any) { setDirError(e.message); setDirEntries([]) }
    finally { setDirLoading(false) }
  }

  const handleStartEdit = () => {
    if (!hasAccount) { toast.error('请先添加邮箱账号后再修改归档目录'); return }
    setPathInput(archivePath); setEditingPath(true)
    loadDirTree(archiveDir)
  }
  const handleSavePath = async () => {
    const p = pathInput.trim()
    if (!p) return
    try {
      await api.settings.set({ archive_path: p })
      setSetting('archive_path', p) // 同步本地 settings，立即刷新显示的归档路径与目录树（幂等）
      toast.success('归档目录已更新，重启服务后生效')
      setEditingPath(false)
      setTreeOpen(false)
    } catch (e: any) {
      toast.error(e?.message || '归档目录保存失败')
    }
  }
  const handleCancelEdit = () => { setEditingPath(false); setTreeOpen(false); setDirError('') }
  const handleSelectDir = (path: string) => { setPathInput(path); loadDirTree(path) }

  const storageBytes = stats?.storage_bytes ?? 0
  const totalEmails = stats?.total_emails ?? 0
  const storageCap = stats?.storage_limit || 0
  const storagePct = storageCap > 0 ? Math.min((storageBytes / storageCap) * 100, 100) : 0
  const contactCount = stats?.contact_count ?? 0

  const cleanupDays = parseInt(settings.auto_cleanup_days || '30')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ borderRadius: 16, border: '0.7px solid var(--card-border)', backgroundColor: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>归档根目录</div>
              <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>邮件 .eml 文件与附件的存储路径</div>
            </div>
            {!editingPath ? (
              <button onClick={handleStartEdit} disabled={!hasAccount} title={!hasAccount ? '请先添加邮箱账号' : '点击修改归档目录'}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, backgroundColor: 'var(--accent)', border: '0.7px solid var(--card-border)', color: 'var(--foreground-secondary)', opacity: hasAccount ? 1 : 0.5, cursor: hasAccount ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                <Folder style={{ fontSize: 16, width: 16, height: 16, color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'monospace' }}>{hasAccount ? archivePath : '添加账号后显示'}</span>
                <Edit style={{ fontSize: 14, width: 14, height: 14, color: 'var(--foreground-tertiary)' }} />
              </button>
            ) : (
              <div className="flex-1 max-w-[600px] ml-8">
                <div className="flex items-center gap-2">
                  <input value={pathInput} onChange={e => { pathInputTouched.current = true; setPathInput(e.target.value) }}
                    className="flex-1 h-10 px-3 rounded-lg outline-none text-[13px] font-mono bg-transparent"
                    style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground)' }}
                    placeholder="输入归档路径，如 ~/lzmail/archives" />
                  <button onClick={handleSavePath} className="px-3 h-10 rounded-lg text-[12px] font-medium transition-all" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>确定</button>
                  <button onClick={handleCancelEdit} className="px-3 h-10 rounded-lg text-[12px] font-medium transition-all" style={{ border: '0.7px solid var(--card-border)', color: 'var(--foreground-tertiary)' }}>取消</button>
                </div>
                <div className="relative mt-2" ref={treeRef}>
                  {dirLoading && <div className="text-[12px] py-2" style={{ color: 'var(--muted-foreground)' }}>加载中...</div>}
                  {dirError && <div className="text-[12px] py-2" style={{ color: 'var(--danger)' }}>{dirError}</div>}
                  {treeOpen && dirEntries.length > 0 && (
                    <div className="rounded-[8px] p-2 max-h-48 overflow-y-auto" style={{ border: '0.7px solid var(--card-border)', backgroundColor: 'var(--background)' }}>
                      <div className="text-[11px] font-semibold px-2 pb-1" style={{ color: 'var(--muted-foreground)' }}>目录层级</div>
                      <DirTree entries={dirEntries} onSelect={handleSelectDir} selected={pathInput} />
                    </div>
                  )}
                  {treeOpen && dirEntries.length === 0 && !dirLoading && !dirError && (
                    <div className="text-[12px] py-2" style={{ color: 'var(--muted-foreground)' }}>空目录</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {editingPath && (
            <div className="mt-3 px-3 py-2 rounded-lg text-[11px] leading-5" style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground-tertiary)' }}>
              修改归档路径后，新建的邮件将存储到新目录。已有邮件仍保留在原路径。重启服务后生效。
            </div>
          )}
        </div>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>目录结构</div>
              <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>当前归档文件的组织方式预览</div>
            </div>
            <button onClick={reloadTree} className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground-secondary)' }}>
              <RefreshCw className="w-3.5 h-3.5" /> 刷新
            </button>
          </div>
          <div className="mt-4 rounded-[12px] p-5 max-h-[280px] overflow-auto" style={{ backgroundColor: 'var(--accent)', border: '0.7px solid var(--card-border)' }}>
            {storageRoot ? <StorageTreeView root={storageRoot} /> : (
              <div className="text-[12px] py-2" style={{ color: 'var(--muted-foreground)' }}>暂无可预览的目录结构</div>
            )}
          </div>
        </div>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>存储统计</div>
          <div className="flex items-center gap-8">
            <div className="text-center"><div className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{formatBytes(storageBytes)}</div><div className="text-[11px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>附件占用</div></div>
            <div className="text-center"><div className="text-[22px] font-bold" style={{ color: 'var(--muted-foreground)' }}>—</div><div className="text-[11px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>邮件 .eml（未计入）</div></div>
            <div className="text-center"><div className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{totalEmails.toLocaleString()}</div><div className="text-[11px] mt-1" style={{ color: 'var(--foreground-tertiary)' }}>邮件总数</div></div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1.5"><span style={{ color: 'var(--foreground-tertiary)' }}>已使用</span><span style={{ color: 'var(--foreground)' }}>{formatBytes(storageBytes)} / {formatBytes(storageCap)}</span></div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${storagePct}%`, backgroundColor: 'var(--gold)' }} />
              </div>
            </div>
            <div className="text-center min-w-[80px]"><div className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>{contactCount.toLocaleString()}</div><div className="flex items-center justify-center gap-1 mt-1" style={{ color: 'var(--foreground-tertiary)' }}><Contact className="w-3 h-3" /><span className="text-[11px]">联系人</span></div></div>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--foreground)' }}>自动清理</div>
              <div style={{ fontSize: 14, color: 'var(--foreground-tertiary)' }}>定期清理已删除的邮件</div>
            </div>
            <div className="flex items-center gap-2">
              <CustomSelect value={String(cleanupDays)} width={110} onChange={(v) => setSetting('auto_cleanup_days', v)}
                options={[{ value: '0', label: '永不清理' }, { value: '30', label: '30 天' }, { value: '90', label: '90 天' }, { value: '180', label: '180 天' }]} />
              {accounts.length > 1 && (
                <CustomSelect value={cleanupAccountId ? String(cleanupAccountId) : String(accounts[0].id)} width={160} onChange={(v) => setCleanupAccountId(Number(v))}
                  options={accounts.map(a => ({ value: String(a.id), label: a.name || a.email }))} />
              )}
              {accounts.length > 0 && (
                <button onClick={async () => {
                  const acc = accounts.find(a => a.id === cleanupAccountId) || accounts[0]
                  const d = parseInt(settings.auto_cleanup_days || '30') || 30
                  if (d === 0) { toast.info('自动清理未启用'); return }
                  try {
                    const preview = await api.cleanup.preview(acc.id, d)
                    if (preview.count === 0) { toast.success(`${acc.name || acc.email} 没有需要清理的邮件`); return }
                    setCleanupConfirm({ acc, days: d, count: preview.count })
                  } catch (e: any) { toast.error(e.message || '获取清理预览失败') }
                }} className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12px] font-medium transition-all hover:opacity-80" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '0.7px solid var(--danger-border)' }}>
                  <Trash2 className="w-3.5 h-3.5" /> 立即清理
                </button>
              )}
            </div>
          </div>
          <DeleteConfirm
            open={!!cleanupConfirm}
            title="清理过期邮件"
            message={cleanupConfirm ? `将删除「${cleanupConfirm.acc.name || cleanupConfirm.acc.email}」中超过 ${cleanupConfirm.days} 天的 ${cleanupConfirm.count} 封已删除邮件，此操作不可撤销。` : ''}
            confirmText="清理"
            onConfirm={async () => {
              if (!cleanupConfirm) return
              try {
                const res = await api.cleanup.run(cleanupConfirm.acc.id, cleanupConfirm.days)
                toast.success(`${cleanupConfirm.acc.name || cleanupConfirm.acc.email}: ${res.message}`)
                api.mails.stats().then(d => setStats(d ?? null)).catch(() => {})
              } catch (e: any) { toast.error(e.message || '清理失败') }
              finally { setCleanupConfirm(null) }
            }}
            onCancel={() => setCleanupConfirm(null)}
          />
          {accounts.length === 0 && (
            <div className="text-[12px] px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground-tertiary)' }}>请先添加邮箱账号后启用自动清理</div>
          )}
        </div>
      </div>
    </div>
  )
}
