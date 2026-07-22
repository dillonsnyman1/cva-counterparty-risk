import { useEffect, useState } from 'react'
import './App.css'
import { computeCva } from './api/client'
import { CounterpartyPanel } from './components/CounterpartyPanel'
import { CvaAttributionChart } from './components/CvaAttributionChart'
import { CvaSummaryCards } from './components/CvaSummaryCards'
import { ExposureProfileChart } from './components/ExposureProfileChart'
import { MarketPanel } from './components/MarketPanel'
import { TradeBookPanel } from './components/TradeBookPanel'
import {
  DEFAULT_COUNTERPARTY,
  DEFAULT_FX_FORWARDS,
  DEFAULT_MARKET,
  DEFAULT_SIMULATION,
  DEFAULT_SWAPS,
} from './types/cva'
import type {
  CounterpartyParams,
  CVAResponse,
  FXFwdTrade,
  MarketParams,
  SimulationParams,
  SwapTrade,
} from './types/cva'

type Tab = 'exposure' | 'attribution'

const TABS: [Tab, string][] = [
  ['exposure', 'Exposure Profile'],
  ['attribution', 'CVA Attribution'],
]

export default function App() {
  const [swaps, setSwaps] = useState<SwapTrade[]>(DEFAULT_SWAPS)
  const [fxForwards, setFxForwards] = useState<FXFwdTrade[]>(DEFAULT_FX_FORWARDS)
  const [counterparty, setCounterparty] = useState<CounterpartyParams>(DEFAULT_COUNTERPARTY)
  const [market, setMarket] = useState<MarketParams>(DEFAULT_MARKET)
  const [simulation, setSimulation] = useState<SimulationParams>(DEFAULT_SIMULATION)
  const [result, setResult] = useState<CVAResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('exposure')

  function run() {
    if (swaps.length + fxForwards.length === 0) {
      setError('Add at least one trade to the book.')
      return
    }
    setLoading(true)
    setError(null)
    computeCva(swaps, fxForwards, counterparty, market, simulation)
      .then(res => {
        setResult(res)
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Computation failed'))
      .finally(() => setLoading(false))
  }

  // auto-run on mount with defaults
  useEffect(() => {
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <header className="app-header">
        <h1>CVA Counterparty Credit Risk</h1>
        <p className="header-tagline">
          Monte Carlo Credit Valuation Adjustment over a netting set of IR swaps and FX forwards.
        </p>
        <p className="header-background">
          Simulates correlated interest rate (Hull-White) and FX (log-normal GBM) paths to compute
          Expected Exposure, PFE-95, and CVA for a bilateral netting set. CVA is decomposed per trade
          using incremental attribution. Counterparty default probability is derived from CDS spreads via
          a flat hazard rate model.
        </p>
      </header>

      <div className="controls-row">
        <TradeBookPanel
          swaps={swaps}
          fxForwards={fxForwards}
          onSwapsChange={setSwaps}
          onFxForwardsChange={setFxForwards}
        />
        <CounterpartyPanel params={counterparty} onChange={setCounterparty} />
        <MarketPanel
          market={market}
          simulation={simulation}
          onMarketChange={setMarket}
          onSimulationChange={setSimulation}
        />
      </div>

      <div className="run-bar">
        <button className="run-button" onClick={run} disabled={loading}>
          {loading ? 'Computing...' : 'Run CVA'}
        </button>
        {result && !loading && (
          <span className="run-info">
            {simulation.n_scenarios} scenarios - {simulation.n_steps} steps
          </span>
        )}
      </div>

      {error && <div className="status-message error">{error}</div>}
      {loading && !result && <div className="status-message">Running Monte Carlo simulation...</div>}

      {result && (
        <>
          <CvaSummaryCards result={result} counterparty={counterparty} />

          <nav className="tab-nav">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                className={`tab-button ${tab === key ? 'active' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="tab-content">
            {tab === 'exposure' && <ExposureProfileChart result={result} />}
            {tab === 'attribution' && <CvaAttributionChart result={result} />}
          </div>
        </>
      )}
    </>
  )
}
