'use client'

export default function SecuritySettings() {
  return (
    <div className="max-w-[680px] mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">安全设置</h2>
        <p className="text-sm text-[var(--muted-foreground)]">管理密码和账户安全</p>
      </div>

      <div className="space-y-4">
        {[
          { title: '登录密码', desc: '保护您的 LZMail 账户安全', action: '修改', badge: '' },
          { title: '应用密码', desc: '为第三方邮件客户端生成专用密码', action: '管理', badge: '4 个' },
          { title: '两步验证', desc: '添加额外的安全保护层，推荐开启', action: '启用', badge: '' },
          { title: 'SSL/TLS 加密', desc: '启用安全的邮件传输加密', action: '', badge: '已启用' },
          { title: '加密选项', desc: '选择邮件存储加密方式', action: '配置', badge: 'AES-256' },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b">
            <div>
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{item.desc}</div>
            </div>
            <div className="flex items-center gap-2">
              {item.badge && <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">{item.badge}</span>}
              {item.action && <button className="text-sm text-[var(--primary)] hover:underline">{item.action}</button>}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">活动会话</h3>
        <div className="space-y-3">
          {[
            { device: 'Chrome on Windows', ip: '192.168.1.100', lastActive: '当前会话', current: true },
            { device: 'Safari on macOS', ip: '192.168.1.101', lastActive: '2 小时前', current: false },
            { device: 'Mail App on iOS', ip: '192.168.1.102', lastActive: '昨天', current: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl border bg-[var(--card)]">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.device}</span>
                  {s.current && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">当前</span>}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.ip} · {s.lastActive}</div>
              </div>
              {!s.current && <button className="text-xs text-red-500 hover:underline">退出</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
