'use client'
import { useRouter } from 'next/navigation'
import { Tooltip } from '@/components/Tooltip'

function LogoIcon({ size = 20 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="懒猫微邮"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px`, display: 'block', flexShrink: 0 }}
    />
  )
}

export function PageFooter({
  onCompose,
  onContacts,
}: {
  onCompose: () => void
  onContacts: () => void
}) {
  const router = useRouter()
  const actions = (
    <div className="flex items-center gap-2">
      <Tooltip text="写邮件">
        <button onClick={onCompose} className="nav-btn" aria-label="写邮件">
          <i className="ri-quill-pen-line icon"></i>
        </button>
      </Tooltip>
      <Tooltip text="联系人">
        <button onClick={onContacts} className="nav-btn" aria-label="联系人">
          <i className="ri-contacts-book-line icon"></i>
        </button>
      </Tooltip>
    </div>
  )

  const copyright = (fontSize: string) => (
    <span
      style={{
        fontSize,
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-family-cn)',
      }}
    >
      &copy; 2026 懒猫微邮 · Powered by{' '}
      <a
        href="https://lazycat.cloud/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'var(--tech-cyan)',
          textDecoration: 'none',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        LightOS
      </a>
    </span>
  )

  return (
    <footer
      className="px-4 sm:px-8"
      style={{
        height: 'calc(48px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(var(--bg-rgb), 0.78)',
        borderTop: '0.6px solid rgba(var(--tech-cyan-rgb), 0.12)',
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center gap-2 shrink-0"
        style={{ cursor: 'pointer' }}
        onClick={() => router.push('/')}
      >
        <LogoIcon size={18} />
        <span
          className="hidden sm:inline"
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.2px',
          }}
        >
          懒猫微邮
        </span>
      </div>

      {/* 移动端：版权居中 */}
      <div className="flex-1 text-center md:hidden">{copyright('11px')}</div>

      {/* 桌面端：操作图标居中 */}
      <div className="hidden md:flex items-center mx-auto">{actions}</div>

      {/* 移动端：操作图标靠右 */}
      <div className="md:hidden flex items-center shrink-0">{actions}</div>

      {/* 桌面端：版权靠右 */}
      <div className="hidden md:flex items-center shrink-0">{copyright('12px')}</div>
    </footer>
  )
}
