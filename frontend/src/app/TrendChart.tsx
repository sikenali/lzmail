'use client'
import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type TrendPoint = { date: string; receive: number; send: number }

function useThemeColor(varName: string, fallback: string) {
  const [color, setColor] = useState(fallback)
  useEffect(() => {
    const update = () => setColor(document.documentElement.style.getPropertyValue(varName) || fallback)
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme'] })
    return () => obs.disconnect()
  }, [varName, fallback])
  return color
}

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const tickColor = useThemeColor('--foreground-tertiary', '#a09080')

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--muted-foreground)' }}>
        暂无趋势数据
      </div>
    )
  }

  const chartData = data.map(d => ({ name: d.date, receive: d.receive, send: d.send }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="receiveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" style={{ stopColor: 'var(--primary)', stopOpacity: 0.15 }} />
            <stop offset="95%" style={{ stopColor: 'var(--primary)', stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id="sendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" style={{ stopColor: 'var(--success)', stopOpacity: 0.15 }} />
            <stop offset="95%" style={{ stopColor: 'var(--success)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: tickColor }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: tickColor }} />
        <Tooltip
          formatter={(value, name) => {
            const label = name === 'send' ? '发送' : name === 'receive' ? '接收' : name
            return [value, label]
          }}
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            boxShadow: 'var(--card-shadow)',
            color: 'var(--foreground)',
          }}
          labelStyle={{ color: 'var(--foreground-secondary)' }}
        />
        <Area type="monotone" dataKey="receive" stroke="var(--primary)" strokeWidth={2} fill="url(#receiveGrad)" />
        <Area type="monotone" dataKey="send" stroke="var(--success)" strokeWidth={2} fill="url(#sendGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
