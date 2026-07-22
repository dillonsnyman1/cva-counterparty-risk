export interface SwapTrade {
  id: string
  notional: number
  fixed_rate: number
  tenor_years: number
  pay_fixed: boolean
}

export interface FXFwdTrade {
  id: string
  notional_base: number
  forward_rate: number
  tenor_years: number
  long_base: boolean
}

export interface CounterpartyParams {
  cds_spread_bps: number
  recovery_rate: number
}

export interface MarketParams {
  r0: number
  kappa: number
  theta: number
  sigma_r: number
  s0: number
  r_foreign: number
  sigma_fx: number
  rho: number
}

export interface SimulationParams {
  n_scenarios: number
  n_steps: number
  seed: number
}

export interface CVAResponse {
  times: number[]
  ee: number[]
  pfe_95: number[]
  epe: number
  cva_bps: number
  cva_usd: number
  trade_labels: string[]
  cva_by_trade: number[]
}

// ---- defaults ----

export const DEFAULT_SWAPS: SwapTrade[] = [
  { id: 'sw-1', notional: 10_000_000, fixed_rate: 0.045, tenor_years: 5, pay_fixed: true },
  { id: 'sw-2', notional: 5_000_000, fixed_rate: 0.035, tenor_years: 3, pay_fixed: false },
]

export const DEFAULT_FX_FORWARDS: FXFwdTrade[] = [
  { id: 'fx-1', notional_base: 8_000_000, forward_rate: 1.1335, tenor_years: 2, long_base: true },
]

export const DEFAULT_COUNTERPARTY: CounterpartyParams = {
  cds_spread_bps: 150,
  recovery_rate: 0.40,
}

export const DEFAULT_MARKET: MarketParams = {
  r0: 0.045,
  kappa: 0.10,
  theta: 0.045,
  sigma_r: 0.010,
  s0: 1.10,
  r_foreign: 0.030,
  sigma_fx: 0.10,
  rho: -0.20,
}

export const DEFAULT_SIMULATION: SimulationParams = {
  n_scenarios: 500,
  n_steps: 60,
  seed: 42,
}
