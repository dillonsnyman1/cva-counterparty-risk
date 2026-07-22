import type { CounterpartyParams } from '../types/cva'

interface Props {
  params: CounterpartyParams
  onChange: (p: CounterpartyParams) => void
}

export function CounterpartyPanel({ params, onChange }: Props) {
  function set<K extends keyof CounterpartyParams>(key: K, value: CounterpartyParams[K]) {
    onChange({ ...params, [key]: value })
  }

  const hazardRate = params.cds_spread_bps / (10_000 * Math.max(1 - params.recovery_rate, 1e-6))

  return (
    <div className="panel">
      <h3>Counterparty</h3>

      <div className="form-field">
        <label>CDS Spread (bps)</label>
        <input
          type="number"
          min={0}
          max={2000}
          step={10}
          value={params.cds_spread_bps}
          onChange={e => set('cds_spread_bps', Number(e.target.value))}
        />
        <input
          type="range"
          min={0}
          max={1000}
          step={10}
          value={params.cds_spread_bps}
          onChange={e => set('cds_spread_bps', Number(e.target.value))}
        />
      </div>

      <div className="form-field">
        <label>Recovery Rate</label>
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={params.recovery_rate}
          onChange={e => set('recovery_rate', Number(e.target.value))}
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={params.recovery_rate}
          onChange={e => set('recovery_rate', Number(e.target.value))}
        />
      </div>

      <p style={{ fontSize: 12, color: 'var(--text)', margin: 0, fontFamily: 'var(--mono)' }}>
        Hazard rate: {(hazardRate * 100).toFixed(3)}%
      </p>
    </div>
  )
}
