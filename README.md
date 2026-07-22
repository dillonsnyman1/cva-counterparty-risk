# CVA Counterparty Credit Risk Engine

[![CI/CD](https://github.com/dillonsnyman1/cva-counterparty-risk/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/dillonsnyman1/cva-counterparty-risk/actions/workflows/ci-cd.yml)

A full-stack Monte Carlo CVA engine over a netting set of vanilla IR swaps and FX forwards, with exposure profiles and per-trade CVA attribution.

- **Backend**: Python + FastAPI - Hull-White rate simulation, log-normal GBM FX, Vasicek closed-form swap pricing, flat hazard rate CVA integral
- **Frontend**: React + Vite + TypeScript dashboard (exposure profile, CVA attribution by trade)

> **Live demo**: [placeholder](https://placeholder) - build a netting set of IR swaps and FX forwards, adjust CDS spread and recovery rate, and explore Expected Exposure, PFE-95, and CVA attribution across trades.
>
> The backend is fully stateless: all Monte Carlo simulation and CVA computation is done in-request with no database or storage of any kind.

> **Disclaimer**: Simplified demo built for portfolio purposes. Not a production risk system and should not be used for regulatory reporting or live risk management. All data is synthetic.
