'use client'

function LogoIcon({ size = 20 }: { size?: number }) {
  const svgSize = 12
  return (
    <div
      className="rounded-lg flex items-center justify-center"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: 'var(--color-primary)',
      }}
    >
      <svg viewBox="0 0 24 24" style={{ width: `${svgSize}px`, height: `${svgSize}px` }}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#ffffff" />
        <polyline points="22,6 12,13 2,6" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
      </svg>
    </div>
  )
}

export function PageFooter({
  onCompose,
  onContacts,
}: {
  onCompose: () => void
  onContacts: () => void
}) {
  return (
    <footer
      style={{
        height: '58px',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'linear-gradient(180deg, var(--color-bg-white) 0%, var(--color-bg-secondary) 100%)',
        borderTop: '1px solid var(--color-border-soft)',
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center gap-2 shrink-0"
        style={{ cursor: 'pointer' }}
        onClick={() => { window.location.href = '/' }}
      >
        <LogoIcon size={20} />
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--color-text-body)',
            fontFamily: 'var(--font-family-cn)',
          }}
        >
          懒猫微邮
        </span>
      </div>

      <div className="flex items-center gap-2 mx-auto">
        <button
          onClick={onCompose}
          className="nav-btn"
          title="写邮件"
        >
          <i className="ri-quill-pen-line icon"></i>
        </button>
        <button
          onClick={onContacts}
          className="nav-btn"
          title="联系人"
        >
          <i className="ri-contacts-book-line icon"></i>
        </button>
      </div>

      <span
        style={{
          fontSize: '14px',
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
            color: 'var(--color-primary)',
            textDecoration: 'none',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          LightOS
        </a>
      </span>
    </footer>
  )
}