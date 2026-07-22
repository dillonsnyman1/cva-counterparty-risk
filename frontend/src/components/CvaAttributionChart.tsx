import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CVAResponse } from '../types/cva'

interface Props {
  result: CVAResponse
}

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']

function fmtUsd(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(3)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

export function CvaAttributionChart({ result }: Props) {
  const data = result.trade_labels.map((label, i) => ({
    label,
    cva: result.cva_by_trade[i],
  }))

  return (
    <div className="chart-card">
      <h3>CVA Attribution by Trade</h3>
      <p className="chart-subtitle">
        Incremental CVA contribution per trade - the change in total CVA when each trade is removed from the
        netting set. Netting means individual contributions do not necessarily sum to the portfolio CVA.
        Negative values indicate netting benefit.
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={v => fmtUsd(v as number)}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={160}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={v => [fmtUsd(Number(v ?? 0)), 'Incremental CVA']}
            labelFormatter={l => `${l}`}
          />
          <Bar dataKey="cva" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={_.cva >= 0 ? COLORS[index % COLORS.length] : '#94a3b8'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
