# CVA Counterparty Credit Risk Engine

[![CI/CD](https://github.com/dillonsnyman1/cva-counterparty-risk/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/dillonsnyman1/cva-counterparty-risk/actions/workflows/ci-cd.yml)

A full-stack Monte Carlo CVA engine over a netting set of vanilla IR swaps and FX forwards, with exposure profiles and per-trade CVA attribution.

- **Backend**: Python + FastAPI - Hull-White rate simulation, log-normal GBM FX, Vasicek closed-form swap pricing, flat hazard rate CVA integral
- **Frontend**: React + Vite + TypeScript dashboard (exposure profile, CVA attribution by trade)

> **Live demo**: [d1m60pgtu4frd9.cloudfront.net](https://d1m60pgtu4frd9.cloudfront.net) - build a netting set of IR swaps and FX forwards, adjust CDS spread and recovery rate, and explore Expected Exposure, PFE-95, and CVA attribution across trades.
>
> The backend is fully stateless: all Monte Carlo simulation and CVA computation is done in-request with no database or storage of any kind.

---

## Methodology

### Simulation

The engine runs N correlated scenarios over a discrete time grid out to the longest trade maturity. Two state variables are simulated at each step:

**Domestic short rate** (Hull-White 1-factor):
```
r(t+dt) = r(t) + κ(θ - r(t)) dt + σ_r √dt Z₁
```

**FX spot** (log-normal GBM):
```
S(t+dt) = S(t) exp((r(t) - r_f - ½σ_fx²) dt + σ_fx √dt Z₂)
```

Correlation between the rate and FX drivers is introduced via Cholesky decomposition of the two Brownian increments.

### Trade pricing

At each simulation time step, trades are priced analytically against the simulated state variables rather than through nested simulation.

**IR swaps** use Vasicek closed-form zero-coupon bond prices P(t,T) = exp(log A - B·r) under the Hull-White model (Brigo-Mercurio Ch.3). The swap MtM is the difference between floating and fixed leg values, computed from remaining coupon dates forward of the current time step.

**FX forwards** are marked via covered interest parity: F(t,T) = S(t) exp((r_d - r_f) τ), discounted back with the domestic discount factor.

### Exposure and CVA

The netting set value is the sum of all trade MtMs at each path and time step. Exposure is taken as the positive part:

- **EE(t)** - mean of max(V_net, 0) across scenarios
- **PFE-95(t)** - 95th percentile of max(V_net, 0)
- **EPE** - time-average of EE

CVA uses a flat hazard rate derived from the counterparty CDS spread and recovery rate:

```
λ = CDS_bps / (10000 (1 - R))
CVA = (1 - R) Σᵢ D(tᵢ) EE(tᵢ) [exp(-λ tᵢ₋₁) - exp(-λ tᵢ)]
```

Per-trade attribution is computed as incremental CVA: total CVA minus CVA of the netting set with that trade removed.

---

## Run locally

```bash
# Install root dev dependency (concurrently)
npm install

# Start both servers
npm run dev
```

Frontend runs on http://localhost:5173, backend on http://localhost:8000. The frontend proxies `/api` to the backend in dev mode.

To run just the backend:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Tests:
```bash
cd backend && pytest
```

---

> **Disclaimer**: Simplified demo built for portfolio purposes. Not a production risk system and should not be used for regulatory reporting or live risk management. All data is synthetic.
