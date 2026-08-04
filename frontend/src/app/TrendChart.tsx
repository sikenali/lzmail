'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type TrendPoint = { date: string; receive: number; send: number }

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const chartData = data.length > 0
    ? data.map(d => ({ name: d.date, receive: d.receive, send: d.send }))
    : [
        { name: '周一', receive: 8, send: 4 },
        { name: '周二', receive: 14, send: 5 },
        { name: '周三', receive: 6, send: 2 },
        { name: '周四', receive: 11, send: 4 },
        { name: '周五', receive: 18, send: 4 },
        { name: '周六', receive: 4, send: 2 },
        { name: '周日', receive: 7, send: 3 },
      ]

  return (
    <ResponsiveContainer width="100%" height={192}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="receiveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="sendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
        <Tooltip
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
