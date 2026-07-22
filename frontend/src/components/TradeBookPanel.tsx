import type { FXFwdTrade, SwapTrade } from '../types/cva'

interface Props {
  swaps: SwapTrade[]
  fxForwards: FXFwdTrade[]
  onSwapsChange: (swaps: SwapTrade[]) => void
  onFxForwardsChange: (fwds: FXFwdTrade[]) => void
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function fmtM(n: number) {
  return `${(n / 1_000_000).toFixed(1)}M`
}

export function TradeBookPanel({ swaps, fxForwards, onSwapsChange, onFxForwardsChange }: Props) {
  function addSwap() {
    onSwapsChange([
      ...swaps,
      { id: uid(), notional: 5_000_000, fixed_rate: 0.045, tenor_years: 5, pay_fixed: true },
    ])
  }

  function addFxFwd() {
    onFxForwardsChange([
      ...fxForwards,
      { id: uid(), notional_base: 5_000_000, forward_rate: 1.10, tenor_years: 2, long_base: true },
    ])
  }

  function removeSwap(id: string) {
    onSwapsChange(swaps.filter(s => s.id !== id))
  }

  function removeFxFwd(id: string) {
    onFxForwardsChange(fxForwards.filter(f => f.id !== id))
  }

  const totalTrades = swaps.length + fxForwards.length

  return (
    <div className="panel">
      <h3>Trade Book ({totalTrades})</h3>
      <div className="trade-list">
        {swaps.map(sw => (
          <div key={sw.id} className="trade-row">
            <span className="trade-badge swap">Swap</span>
            <span className="trade-details">
              {sw.pay_fixed ? 'Pay' : 'Recv'} {(sw.fixed_rate * 100).toFixed(2)}%
              &nbsp;&middot;&nbsp;{sw.tenor_years}Y
              &nbsp;&middot;&nbsp;{fmtM(sw.notional)}
            </span>
            <button className="trade-remove" onClick={() => removeSwap(sw.id)} title="Remove">x</button>
          </div>
        ))}
        {fxForwards.map(fx => (
          <div key={fx.id} className="trade-row">
            <span className="trade-badge fxfwd">FX Fwd</span>
            <span className="trade-details">
              {fx.long_base ? 'Long' : 'Short'} {fmtM(fx.notional_base)} @ {fx.forward_rate.toFixed(4)}
              &nbsp;&middot;&nbsp;{fx.tenor_years}Y
            </span>
            <button className="trade-remove" onClick={() => removeFxFwd(fx.id)} title="Remove">x</button>
          </div>
        ))}
        {totalTrades === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>No trades - add one below.</p>
        )}
      </div>
      <div className="trade-add-buttons">
        <button className="btn-secondary" onClick={addSwap}>+ Swap</button>
        <button className="btn-secondary" onClick={addFxFwd}>+ FX Forward</button>
      </div>
    </div>
  )
}
