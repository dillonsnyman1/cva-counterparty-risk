import type { MarketParams, SimulationParams } from '../types/cva'

interface Props {
  market: MarketParams
  simulation: SimulationParams
  onMarketChange: (m: MarketParams) => void
  onSimulationChange: (s: SimulationParams) => void
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function MarketPanel({ market, simulation, onMarketChange, onSimulationChange }: Props) {
  function setM<K extends keyof MarketParams>(key: K, value: MarketParams[K]) {
    onMarketChange({ ...market, [key]: value })
  }

  function setSim<K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) {
    onSimulationChange({ ...simulation, [key]: value })
  }

  return (
    <div className="panel">
      <h3>Market & Simulation</h3>

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text)', margin: '0 0 8px' }}>
        Rate Curve (Hull-White)
      </p>
      <div className="form-row">
        <Field label="r0" value={market.r0} onChange={v => setM('r0', v)} min={-0.02} max={0.20} step={0.001} />
        <Field label="theta" value={market.theta} onChange={v => setM('theta', v)} min={-0.02} max={0.20} step={0.001} />
      </div>
      <div className="form-row">
        <Field label="kappa" value={market.kappa} onChange={v => setM('kappa', v)} min={0.01} max={2} step={0.01} />
        <Field label="sigma_r" value={market.sigma_r} onChange={v => setM('sigma_r', v)} min={0.001} max={0.10} step={0.001} />
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text)', margin: '12px 0 8px' }}>
        FX (EUR/USD)
      </p>
      <div className="form-row">
        <Field label="S0" value={market.s0} onChange={v => setM('s0', v)} min={0.5} max={3} step={0.01} />
        <Field label="r_foreign" value={market.r_foreign} onChange={v => setM('r_foreign', v)} min={-0.02} max={0.20} step={0.001} />
      </div>
      <div className="form-row">
        <Field label="sigma_fx" value={market.sigma_fx} onChange={v => setM('sigma_fx', v)} min={0.01} max={0.50} step={0.01} />
        <Field label="rho (r,FX)" value={market.rho} onChange={v => setM('rho', v)} min={-0.99} max={0.99} step={0.01} />
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text)', margin: '12px 0 8px' }}>
        Monte Carlo
      </p>
      <div className="form-field">
        <label>Scenarios: {simulation.n_scenarios}</label>
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={simulation.n_scenarios}
          onChange={e => setSim('n_scenarios', Number(e.target.value))}
        />
      </div>
      <Field
        label="Seed"
        value={simulation.seed}
        onChange={v => setSim('seed', Math.max(0, Math.floor(v)))}
        min={0}
        max={99999}
        step={1}
      />
    </div>
  )
}
