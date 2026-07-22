from pydantic import BaseModel, Field


class SwapTrade(BaseModel):
    notional: float = Field(gt=0)
    fixed_rate: float = Field(gt=0)
    tenor_years: int = Field(ge=1, le=30)
    pay_fixed: bool = True


class FXForwardTrade(BaseModel):
    notional_base: float = Field(gt=0)
    forward_rate: float = Field(gt=0)
    tenor_years: int = Field(ge=1, le=10)
    long_base: bool = True


class CounterpartyParams(BaseModel):
    cds_spread_bps: float = Field(ge=0, default=150.0)
    recovery_rate: float = Field(ge=0, le=1, default=0.40)


class MarketParams(BaseModel):
    r0: float = Field(default=0.045)
    kappa: float = Field(gt=0, default=0.10)
    theta: float = Field(default=0.045)
    sigma_r: float = Field(gt=0, default=0.010)
    s0: float = Field(gt=0, default=1.10)
    r_foreign: float = Field(default=0.030)
    sigma_fx: float = Field(gt=0, default=0.10)
    rho: float = Field(ge=-1, le=1, default=-0.20)


class SimulationParams(BaseModel):
    n_scenarios: int = Field(ge=100, le=5000, default=500)
    n_steps: int = Field(ge=12, le=260, default=60)
    seed: int = Field(ge=0, default=42)


class CVARequest(BaseModel):
    swaps: list[SwapTrade] = []
    fx_forwards: list[FXForwardTrade] = []
    counterparty: CounterpartyParams = CounterpartyParams()
    market: MarketParams = MarketParams()
    simulation: SimulationParams = SimulationParams()


class CVAResponse(BaseModel):
    times: list[float]
    ee: list[float]
    pfe_95: list[float]
    epe: float
    cva_bps: float
    cva_usd: float
    trade_labels: list[str]
    cva_by_trade: list[float]
