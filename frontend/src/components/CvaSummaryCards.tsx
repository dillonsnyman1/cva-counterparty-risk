import type { CounterpartyParams, CVAResponse } from '../types/cva'

interface Props {
  result: CVAResponse
  counterparty: CounterpartyParams
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="summary-card">
      <div className="summary-card-label">{label}</div>
      <div className="summary-card-value">{value}</div>
      {sub && <div className="summary-card-sub">{sub}</div>}
    </div>
  )
}

function fmtUsd(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(3)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

export function CvaSummaryCards({ result, counterparty }: Props) {
  const hazard = counterparty.cds_spread_bps / (10_000 * Math.max(1 - counterparty.recovery_rate, 1e-6))

  return (
    <div className="summary-cards">
      <Card
        label="CVA"
        value={fmtUsd(result.cva_usd)}
        sub={`${result.cva_bps.toFixed(2)} bps of notional`}
      />
      <Card
        label="Expected Positive Exposure"
        value={fmtUsd(result.epe)}
        sub="Time-averaged EE"
      />
      <Card
        label="Hazard Rate"
        value={`${(hazard * 100).toFixed(3)}%`}
        sub={`${counterparty.cds_spread_bps} bps CDS / ${(counterparty.recovery_rate * 100).toFixed(0)}% RR`}
      />
      <Card
        label="Peak EE"
        value={fmtUsd(Math.max(...result.ee))}
        sub={`Peak PFE-95: ${fmtUsd(Math.max(...result.pfe_95))}`}
      />
    </div>
  )
}
