import math
from dataclasses import replace
import numpy as np
import pytest
from app.engine.fair_monte_carlo import OpenFairInput, FairMonteCarloEngine, lognormal_params

def config(**kwargs):
    return replace(OpenFairInput(1, 1, 1, plm_min=100, plm_mode=100, plm_max=100, slef_prob=0), **kwargs)

@pytest.mark.parametrize('values', [(0,0,0), (100,100,100)])
def test_secondary_constants(values):
    e = FairMonteCarloEngine(config())
    assert np.all(e._sample_lognormal_tail(*values, 10000) == values[0])

def test_slm_mode_p95_and_mean():
    mu, sigma = lognormal_params(20,100,500)
    assert 20 + math.exp(mu-sigma*sigma) == pytest.approx(100)
    assert 20 + math.exp(mu+sigma*1.6448536269514722) == pytest.approx(500)
    x = FairMonteCarloEngine(config())._sample_lognormal_tail(20,100,500,300000)
    assert x.mean() == pytest.approx(20+math.exp(mu+sigma*sigma/2),rel=.015)
    assert np.quantile(x,.95) == pytest.approx(500,rel=.02)

@pytest.mark.parametrize('a,m,b', [(0,2,10),(0,0,10),(0,10,10),(3,3,3)])
def test_pert_moments(a,m,b):
    x=FairMonteCarloEngine(config())._sample_beta_pert(a,m,b,4,200000)
    assert x.min() >= a and x.max() <= b
    assert x.mean() == pytest.approx((a+4*m+b)/6, abs=.025)

@pytest.mark.parametrize('changes', [dict(random_seed=-1),dict(iterations=0),dict(iterations=1000.5),dict(plm_min=-1),dict(lef_mode=math.nan),dict(lef_max=math.inf),dict(lef_mode=2),dict(lef_max=101),dict(lef_min=100,lef_mode=100,lef_max=100,iterations=250000),dict(slm_min=0,slm_mode=0,slm_max=1)])
def test_invalid(changes):
    with pytest.raises(ValueError): config(**changes)

def run(**kwargs): return FairMonteCarloEngine(config(**kwargs)).run_simulation()

def test_zero_and_compound_poisson():
    assert run(lef_min=0,lef_mode=0,lef_max=0)['ale'] == 0
    assert run(plm_min=0,plm_mode=0,plm_max=0,slm_min=0,slm_mode=0,slm_max=0,slef_prob=1)['ale'] == 0
    r=run(iterations=100000)
    assert r['ale'] == pytest.approx(100,rel=.015)
    assert r['zero_loss_prob_pct']/100 == pytest.approx(math.exp(-1),abs=.006)
    assert r['cyber_var_99'] >= r['cyber_var_95'] >= r['percentiles'][4]['total']
    assert all(a['prob']>=b['prob'] for a,b in zip(r['lec_curve'],r['lec_curve'][1:]))
    assert run(lef_min=2,lef_mode=2,lef_max=2)['ale'] > r['ale']
    assert run(plm_min=200,plm_mode=200,plm_max=200)['ale'] > r['ale']

def test_reproducibility():
    a,b=run(),run()
    a.pop('compute_time_ms'); b.pop('compute_time_ms')
    assert a==b

def test_quantile_ties_and_cvar():
    x=np.array([0.]*900+[100.]*100)
    import time
    r=FairMonteCarloEngine(config())._compile_metrics(x,x,x,time.perf_counter())
    assert r['percentiles'][0]['exceed_prob']==10
    assert r['tail_cvar_99']==100
    assert sum(b['count'] for b in r['histogram_bins'])==100

def test_actual_event_budget_before_allocating_severity():
    class CountsOnly:
        def poisson(self, lam):
            x=np.zeros(len(lam),dtype=int); x[0]=2000001; return x
    engine=FairMonteCarloEngine(config())
    engine.rng=CountsOnly()
    with pytest.raises(ValueError,match='memory budget'):
        engine.run_simulation()
