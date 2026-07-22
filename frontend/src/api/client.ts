import type {
  CounterpartyParams,
  CVAResponse,
  FXFwdTrade,
  MarketParams,
  SimulationParams,
  SwapTrade,
} from '../types/cva'

const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(
      (payload as { detail?: string } | null)?.detail ??
        `Request failed (${res.status})`
    )
  }
  return res.json() as Promise<T>
}

export function computeCva(
  swaps: SwapTrade[],
  fxForwards: FXFwdTrade[],
  counterparty: CounterpartyParams,
  market: MarketParams,
  simulation: SimulationParams,
): Promise<CVAResponse> {
  return post<CVAResponse>('/api/cva/compute', {
    swaps: swaps.map(({ id: _id, ...rest }) => rest),
    fx_forwards: fxForwards.map(({ id: _id, ...rest }) => rest),
    counterparty,
    market,
    simulation,
  })
}
