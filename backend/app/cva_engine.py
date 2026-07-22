import numpy as np

from app.models import CVARequest, CVAResponse, FXForwardTrade, MarketParams, SwapTrade


# ---------------------------------------------------------------------------
# Vasicek / Hull-White bond pricing
# ---------------------------------------------------------------------------

def _hw_bond_vec(tau: float, r_vec: np.ndarray, kappa: float, theta: float, sigma: float) -> np.ndarray:
    """
    Vasicek analytical bond price for a vector of short rates.
    P(t, t+tau) = exp(log_A - B * r),  tau >= 0.
    """
    n = len(r_vec)
    if tau <= 0.0:
        return np.ones(n)
    b = (1.0 - np.exp(-kappa * tau)) / kappa
    log_a = (b - tau) * (kappa**2 * theta - sigma**2 / 2.0) / kappa**2 \
            - sigma**2 * b**2 / (4.0 * kappa)
    return np.exp(log_a - b * r_vec)


# ---------------------------------------------------------------------------
# Derivative pricing (vectorised over scenarios)
# ---------------------------------------------------------------------------

def _swap_mtm_vec(
    t: float,
    r_vec: np.ndarray,
    sw: SwapTrade,
    m: MarketParams,
) -> np.ndarray:
    """
    Par-rate formula for an annual-coupon swap.
    At simulation time t, price the remaining cash flows using the current
    short rate r (frozen-reset approximation for the floating leg).

    V = notional * (par_rate(t) - K) * annuity(t)   [pay-fixed sign]
    """
    coupon_dates = np.arange(1, sw.tenor_years + 1, dtype=float)
    remaining = coupon_dates[coupon_dates > t]

    if len(remaining) == 0:
        return np.zeros(len(r_vec))

    # Bond prices for each remaining annual coupon
    taus = remaining - t                                                    # (n_rem,)
    b_arr = (1.0 - np.exp(-m.kappa * taus)) / m.kappa                      # (n_rem,)
    log_a_arr = (b_arr - taus) * (m.kappa**2 * m.theta - m.sigma_r**2 / 2.0) / m.kappa**2 \
                - m.sigma_r**2 * b_arr**2 / (4.0 * m.kappa)
    # shape (n_rem, n_scenarios)
    P_coupons = np.exp(log_a_arr[:, None] - b_arr[:, None] * r_vec[None, :])

    tau_N = float(sw.tenor_years) - t
    P_N = _hw_bond_vec(tau_N, r_vec, m.kappa, m.theta, m.sigma_r)

    annuity = P_coupons.sum(axis=0)                                         # (n_scenarios,)
    par_rate = (1.0 - P_N) / np.maximum(annuity, 1e-12)

    v = sw.notional * (par_rate - sw.fixed_rate) * annuity
    return v if sw.pay_fixed else -v


def _fxfwd_mtm_vec(
    t: float,
    r_vec: np.ndarray,
    s_vec: np.ndarray,
    fx: FXForwardTrade,
    m: MarketParams,
) -> np.ndarray:
    """
    FX forward MtM using covered-interest-parity forward and HW domestic discount.
    V = notional_base * (F(t,T) - K) * P_d(t,T)
    """
    tau = float(fx.tenor_years) - t
    if tau <= 0.0:
        return np.zeros(len(r_vec))

    P_d = _hw_bond_vec(tau, r_vec, m.kappa, m.theta, m.sigma_r)
    F_t = s_vec * np.exp((r_vec - m.r_foreign) * tau)
    v = fx.notional_base * (F_t - fx.forward_rate) * P_d
    return v if fx.long_base else -v


# ---------------------------------------------------------------------------
# Monte Carlo simulation
# ---------------------------------------------------------------------------

def _simulate(n_scenarios: int, n_steps: int, max_tenor: float, m: MarketParams, seed: int = 42):
    """
    Simulate correlated (rate, FX spot) paths via Euler-Maruyama.
    Returns times (n_steps+1,), R (n_steps+1, n_scenarios), S (n_steps+1, n_scenarios).
    """
    dt = max_tenor / n_steps
    times = np.linspace(0.0, max_tenor, n_steps + 1)

    R = np.empty((n_steps + 1, n_scenarios))
    S = np.empty((n_steps + 1, n_scenarios))
    R[0] = m.r0
    S[0] = m.s0

    sqrt_dt = np.sqrt(dt)
    rho_compl = np.sqrt(max(1.0 - m.rho**2, 0.0))

    rng = np.random.default_rng(seed)
    for i in range(n_steps):
        W1 = rng.standard_normal(n_scenarios)
        W2 = rng.standard_normal(n_scenarios)
        Z1 = W1
        Z2 = m.rho * W1 + rho_compl * W2

        r = R[i]
        R[i + 1] = r + m.kappa * (m.theta - r) * dt + m.sigma_r * sqrt_dt * Z1
        S[i + 1] = S[i] * np.exp(
            (r - m.r_foreign - 0.5 * m.sigma_fx**2) * dt + m.sigma_fx * sqrt_dt * Z2
        )

    return times, R, S


# ---------------------------------------------------------------------------
# Exposure and CVA helpers
# ---------------------------------------------------------------------------

def _netting_exposure(
    times: np.ndarray,
    R: np.ndarray,
    S: np.ndarray,
    swaps: list[SwapTrade],
    fx_forwards: list[FXForwardTrade],
    m: MarketParams,
) -> np.ndarray:
    """
    Compute netting-set MtM for every (time, scenario).
    Returns V_net of shape (n_steps+1, n_scenarios).
    """
    n_t, n_s = R.shape
    V_net = np.zeros((n_t, n_s))
    for i, t in enumerate(times):
        for sw in swaps:
            V_net[i] += _swap_mtm_vec(t, R[i], sw, m)
        for fx in fx_forwards:
            V_net[i] += _fxfwd_mtm_vec(t, R[i], S[i], fx, m)
    return V_net


def _profiles(V_net: np.ndarray):
    """EE and PFE95 profiles from netting exposure matrix."""
    pos = np.maximum(V_net, 0.0)
    ee = pos.mean(axis=1)
    pfe95 = np.percentile(pos, 95, axis=1)
    return ee, pfe95


def _cva_from_ee(
    times: np.ndarray,
    ee: np.ndarray,
    hazard: float,
    recovery: float,
    r0: float,
) -> float:
    """
    Discrete CVA integral.
    CVA = (1-R) * Σ_i D(t_i) * EE(t_i) * dPD(t_{i-1}, t_i)
    """
    cva = 0.0
    for i in range(1, len(times)):
        t = times[i]
        t_prev = times[i - 1]
        D = np.exp(-r0 * t)
        dPD = np.exp(-hazard * t_prev) - np.exp(-hazard * t)
        cva += D * ee[i] * dPD
    return cva * (1.0 - recovery)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def compute_cva(req: CVARequest) -> CVAResponse:
    if not req.swaps and not req.fx_forwards:
        raise ValueError("At least one trade is required")

    m = req.market
    cp = req.counterparty
    sim = req.simulation

    max_tenor = max(
        [sw.tenor_years for sw in req.swaps] + [fx.tenor_years for fx in req.fx_forwards]
    )

    times, R, S = _simulate(sim.n_scenarios, sim.n_steps, float(max_tenor), m, sim.seed)

    # Full netting set
    V_net = _netting_exposure(times, R, S, req.swaps, req.fx_forwards, m)
    ee, pfe95 = _profiles(V_net)
    epe = float(ee[1:].mean()) if len(ee) > 1 else 0.0

    hazard = cp.cds_spread_bps / (10_000.0 * max(1.0 - cp.recovery_rate, 1e-6))
    cva_usd = _cva_from_ee(times, ee, hazard, cp.recovery_rate, m.r0)

    total_notional = sum(sw.notional for sw in req.swaps) + sum(
        fx.notional_base for fx in req.fx_forwards
    )
    cva_bps = cva_usd / total_notional * 10_000.0 if total_notional > 0 else 0.0

    # Per-trade incremental CVA attribution
    all_trades: list[SwapTrade | FXForwardTrade] = list(req.swaps) + list(req.fx_forwards)
    trade_labels: list[str] = []
    cva_by_trade: list[float] = []

    for idx, trade in enumerate(all_trades):
        if isinstance(trade, SwapTrade):
            direction = "Pay-Fixed" if trade.pay_fixed else "Recv-Fixed"
            label = f"Swap {idx + 1} ({direction}, {trade.tenor_years}Y)"
            swaps_without = [s for j, s in enumerate(req.swaps) if j != idx]
            fxfwds_without = req.fx_forwards
        else:
            swap_idx = idx - len(req.swaps)
            direction = "Long" if trade.long_base else "Short"
            label = f"FX Fwd {swap_idx + 1} ({direction}, {trade.tenor_years}Y)"
            swaps_without = req.swaps
            fxfwds_without = [f for j, f in enumerate(req.fx_forwards) if j != swap_idx]

        trade_labels.append(label)

        if swaps_without or fxfwds_without:
            V_without = _netting_exposure(times, R, S, swaps_without, fxfwds_without, m)
            ee_without, _ = _profiles(V_without)
            cva_without = _cva_from_ee(times, ee_without, hazard, cp.recovery_rate, m.r0)
            incremental = cva_usd - cva_without
        else:
            incremental = cva_usd

        cva_by_trade.append(round(incremental, 2))

    return CVAResponse(
        times=times.tolist(),
        ee=ee.tolist(),
        pfe_95=pfe95.tolist(),
        epe=round(epe, 2),
        cva_bps=round(cva_bps, 4),
        cva_usd=round(cva_usd, 2),
        trade_labels=trade_labels,
        cva_by_trade=cva_by_trade,
    )
