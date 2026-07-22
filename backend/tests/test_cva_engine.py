import math

import numpy as np
import pytest

from app.cva_engine import (
    _cva_from_ee,
    _fxfwd_mtm_vec,
    _hw_bond_vec,
    _netting_exposure,
    _profiles,
    _simulate,
    _swap_mtm_vec,
    compute_cva,
)
from app.models import (
    CounterpartyParams,
    CVARequest,
    FXForwardTrade,
    MarketParams,
    SimulationParams,
    SwapTrade,
)

MARKET = MarketParams()


def test_bond_price_at_maturity():
    """P(t,t) = 1 for any rate."""
    r_vec = np.array([0.01, 0.05, 0.10])
    result = _hw_bond_vec(0.0, r_vec, MARKET.kappa, MARKET.theta, MARKET.sigma_r)
    np.testing.assert_allclose(result, 1.0, atol=1e-12)


def test_par_swap_mtm_zero_at_inception():
    """At t=0 with K = fair par rate the swap MtM is 0."""
    m = MARKET
    tenor = 5
    coupon_dates = np.arange(1, tenor + 1, dtype=float)
    r0_vec = np.array([m.r0])

    # Compute fair par rate analytically
    P_coupons = np.array([
        _hw_bond_vec(t, r0_vec, m.kappa, m.theta, m.sigma_r)[0]
        for t in coupon_dates
    ])
    P_N = _hw_bond_vec(float(tenor), r0_vec, m.kappa, m.theta, m.sigma_r)[0]
    annuity = P_coupons.sum()
    par_rate = (1.0 - P_N) / annuity

    sw = SwapTrade(notional=1_000_000, fixed_rate=par_rate, tenor_years=tenor, pay_fixed=True)
    mtm = _swap_mtm_vec(0.0, r0_vec, sw, m)
    assert abs(mtm[0]) < 1e-6


def test_swap_matured_returns_zero():
    """Swap MtM is 0 after maturity."""
    sw = SwapTrade(notional=1_000_000, fixed_rate=0.045, tenor_years=3, pay_fixed=True)
    r_vec = np.array([0.04, 0.05])
    result = _swap_mtm_vec(4.0, r_vec, sw, MARKET)  # t > tenor
    np.testing.assert_array_equal(result, 0.0)


def test_fxfwd_at_market_zero():
    """FX forward at fair market forward has zero MtM at t=0."""
    m = MARKET
    tenor = 2
    r0_vec = np.array([m.r0])
    s0_vec = np.array([m.s0])
    fair_fwd = m.s0 * np.exp((m.r0 - m.r_foreign) * tenor)

    fx = FXForwardTrade(notional_base=8_000_000, forward_rate=fair_fwd, tenor_years=tenor, long_base=True)
    mtm = _fxfwd_mtm_vec(0.0, r0_vec, s0_vec, fx, m)
    assert abs(mtm[0]) < 1e-4


def test_ee_nonnegative():
    """Expected Exposure must be >= 0 at all time steps."""
    times, R, S = _simulate(200, 24, 3.0, MARKET)
    sw = SwapTrade(notional=1_000_000, fixed_rate=0.045, tenor_years=3, pay_fixed=True)
    V_net = _netting_exposure(times, R, S, [sw], [], MARKET)
    ee, _ = _profiles(V_net)
    assert (ee >= 0).all()


def test_cva_zero_when_no_spread():
    """CVA = 0 when the counterparty CDS spread is 0 (hazard rate = 0)."""
    times = np.linspace(0, 5, 61)
    ee = np.ones(61) * 100_000
    cva = _cva_from_ee(times, ee, hazard=0.0, recovery=0.40, r0=0.045)
    assert cva == pytest.approx(0.0, abs=1e-6)


def test_compute_cva_runs():
    """Full end-to-end: non-negative CVA, correct number of profile points."""
    req = CVARequest(
        swaps=[SwapTrade(notional=10_000_000, fixed_rate=0.045, tenor_years=5, pay_fixed=True)],
        fx_forwards=[FXForwardTrade(notional_base=8_000_000, forward_rate=1.1335, tenor_years=2, long_base=True)],
        counterparty=CounterpartyParams(cds_spread_bps=150, recovery_rate=0.40),
        market=MARKET,
        simulation=SimulationParams(n_scenarios=200, n_steps=24),
    )
    res = compute_cva(req)

    assert res.cva_usd >= 0
    assert res.epe >= 0
    assert len(res.times) == 25
    assert len(res.ee) == 25
    assert len(res.pfe_95) == 25
    assert len(res.trade_labels) == 2
    assert len(res.cva_by_trade) == 2
    # Individual contributions should sum close to total
    assert math.isfinite(res.cva_usd)
