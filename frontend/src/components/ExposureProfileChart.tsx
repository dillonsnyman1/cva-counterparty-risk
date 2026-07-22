import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CVAResponse } from '../types/cva'

interface Props {
  result: CVAResponse
}

function fmtUsd(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toFixed(0)}`
}

export function ExposureProfileChart({ result }: Props) {
  const data = result.times.map((t, i) => ({
    t: parseFloat(t.toFixed(2)),
    ee: result.ee[i],
    pfe95: result.pfe_95[i],
  }))

  const maxY = Math.max(...result.pfe_95) * 1.05

  return (
    <div className="chart-card">
      <h3>Exposure Profile</h3>
      <p className="chart-subtitle">
        Expected Exposure (EE) and 95th-percentile Potential Future Exposure (PFE) across Monte Carlo
        scenarios. The hump shape reflects the balance between rates diverging over time and approaching
        maturity with fewer remaining cash flows.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="t"
            label={{ value: 'Years', position: 'insideBottomRight', offset: -4, fontSize: 12 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={v => fmtUsd(v as number)}
            domain={[0, maxY]}
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip
            formatter={(v, name) => [
              fmtUsd(Number(v ?? 0)),
              name === 'ee' ? 'Expected Exposure' : 'PFE 95%',
            ]}
            labelFormatter={l => `Year ${l}`}
          />
          <Legend
            formatter={v => (v === 'ee' ? 'Expected Exposure (EE)' : 'PFE 95%')}
          />
          <Line
            type="monotone"
            dataKey="ee"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="pfe95"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
