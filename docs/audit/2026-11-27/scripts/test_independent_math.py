"""Independent analytical references; no production functions used to calculate expectations."""
import json, math, sys, time
from dataclasses import replace
from pathlib import Path
import numpy as np
import pytest
from scipy import integrate, optimize, stats
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'backend'))
from app.engine.fair_monte_carlo import FairMonteCarloEngine, OpenFairInput, lognormal_params

def cfg(**changes):
    return replace(OpenFairInput(1,1,1,plm_min=100,plm_mode=100,plm_max=100,slef_prob=0,slm_min=20,slm_mode=100,slm_max=500),**changes)

def pert(a,m,b,g):
    if a==b:return a,0
    alpha=1+g*(m-a)/(b-a);beta=1+g*(b-m)/(b-a)
    return a+(b-a)*alpha/(alpha+beta),(b-a)**2*alpha*beta/((alpha+beta)**2*(alpha+beta+1))

def lognormal_reference(a,m,q):
    if a==m==q:return m,0,None
    z=stats.norm.ppf(.95)
    sigma=optimize.brentq(lambda x:x*x+z*x-math.log((q-a)/(m-a)),0,20,xtol=1e-14)
    mu=math.log(m-a)+sigma*sigma
    distribution=stats.lognorm(s=sigma,loc=a,scale=math.exp(mu))
    return distribution.mean(),distribution.var(),(mu,sigma)

def moments(c):
    lm,lv=pert(c.lef_min,c.lef_mode,c.lef_max,c.lef_gamma)
    pm,pv=pert(c.plm_min,c.plm_mode,c.plm_max,c.plm_gamma)
    sm,sv,_=lognormal_reference(c.slm_min,c.slm_mode,c.slm_max)
    mean=pm+c.slef_prob*sm
    second=pv+pm*pm+2*pm*c.slef_prob*sm+c.slef_prob*(sv+sm*sm)
    return lm*mean,lm*second+lv*mean*mean

class Capture(FairMonteCarloEngine):
    def _compile_metrics(self,total,primary,secondary,*args):
        self.samples=(total.copy(),primary.copy(),secondary.copy())
        return super()._compile_metrics(total,primary,secondary,*args)

@pytest.mark.parametrize('a,m,b',[(0,2,10),(0,0,10),(0,10,10),(3,3,3)])
@pytest.mark.parametrize('g',[1,4,8])
def test_pert_against_beta_cdf_and_analytic_moments(a,m,b,g):
    n=80000;x=FairMonteCarloEngine(cfg())._sample_beta_pert(a,m,b,g,n)
    mean,var=pert(a,m,b,g)
    assert np.all((a<=x)&(x<=b))
    assert abs(x.mean()-mean)<=6*math.sqrt(var/n)+1e-12
    if a!=b:
        distribution=stats.beta(1+g*(m-a)/(b-a),1+g*(b-m)/(b-a),loc=a,scale=b-a)
        assert stats.kstest(x,distribution.cdf).pvalue>1e-6

@pytest.mark.parametrize('a,m,q',[(20,100,500),(0,1,2),(250000,950000,8500000),(1e-12,2e-12,1e-9)])
def test_shifted_lognormal_independent_root_and_probability(a,m,q):
    expected_mean,variance,reference=lognormal_reference(a,m,q)
    actual=lognormal_params(a,m,q)
    assert actual==pytest.approx(reference,rel=1e-12,abs=1e-12)
    mu,sigma=actual
    assert a+math.exp(mu-sigma*sigma)==pytest.approx(m,rel=1e-12)
    assert stats.lognorm.ppf(.95,sigma,loc=a,scale=math.exp(mu))==pytest.approx(q,rel=1e-12)
    n=150000;x=FairMonteCarloEngine(cfg())._sample_lognormal_tail(a,m,q,n)
    assert abs(x.mean()-expected_mean)<=6*math.sqrt(variance/n)
    lo,hi=stats.binom.interval(1-1e-8,n,.95)
    assert lo<=np.count_nonzero(x<=q)<=hi
    assert x.max()>q # P95 is demonstrably not a clipping limit.

@pytest.mark.parametrize('p',[0,.3,1])
@pytest.mark.parametrize('primary',[0,100])
def test_poisson_bernoulli_aggregation_and_zero_mass(p,primary):
    c=cfg(lef_min=2,lef_mode=2,lef_max=2,plm_min=primary,plm_mode=primary,plm_max=primary,slef_prob=p,slm_min=50,slm_mode=50,slm_max=50,iterations=100000)
    e=Capture(c);result=e.run_simulation();total,pr,se=e.samples
    mean,variance=moments(c)
    assert len(total)==c.iterations and np.array_equal(total,pr+se)
    assert np.isfinite(total).all() and (total>=0).all()
    assert abs(total.mean()-mean)<=6*math.sqrt(variance/c.iterations)+1e-10
    zero=math.exp(-2*(1 if primary else p))
    assert abs(np.mean(total==0)-zero)<=6*math.sqrt(zero*(1-zero)/c.iterations)+1e-12
    assert result['ale']==pytest.approx(total.mean(),abs=.0051)

@pytest.mark.parametrize('n',[1000,1001,1101])
def test_manual_quantiles_rank_tail_ties_and_histogram(n):
    values=np.array([0 if i%7 else i*13 for i in range(n)],dtype=float)
    ordered=sorted(values.tolist())
    def quantile(p):
        at=(n-1)*p;lo=math.floor(at);hi=math.ceil(at)
        return ordered[lo]*(hi-at)+ordered[hi]*(at-lo) if hi!=lo else ordered[lo]
    e=FairMonteCarloEngine(cfg(iterations=n))
    thresholds=[0,100,1000,10000]
    r=e._compile_metrics(values,values/2,values/2,time.perf_counter(),thresholds)
    assert r['cyber_var_95']==pytest.approx(quantile(.95),abs=.0051)
    assert r['cyber_var_99']==pytest.approx(quantile(.99),abs=.0051)
    count=math.ceil(.01*n)
    assert r['tail_cvar_99']==pytest.approx(sum(ordered[-count:])/count,abs=.0051)
    for point in r['lec_curve']:
        events=sum(x>point['loss'] for x in ordered)
        expected=100*events/n
        # Division/multiplication order differs: permit four IEEE-754 ULPs,
        # while requiring recovery of the exact independent exceedance count.
        assert abs(point['prob']-expected)<=4*abs(np.spacing(expected))
        assert round(point['prob']/100*n)==events
    assert sum(b['count'] for b in r['histogram_bins'])==sum(x>0 for x in ordered)
    assert sum(b['density_pct'] for b in r['histogram_bins'])==pytest.approx(100,abs=1e-10)

def test_mixed_poisson_moments_and_threshold_changes_do_not_change_losses():
    c=cfg(lef_min=.2,lef_mode=.8,lef_max=2.5,plm_min=20,plm_mode=100,plm_max=600,slef_prob=.7,iterations=250000)
    mean,var=moments(c)
    a=Capture(c);r=a.run_simulation();b=Capture(replace(c,sec_materiality_threshold=0));q=b.run_simulation()
    assert abs(a.samples[0].mean()-mean)<=6*math.sqrt(var/c.iterations)
    assert np.array_equal(a.samples[0],b.samples[0])
    for key in ['ale','cyber_var_95','cyber_var_99','tail_cvar_99','zero_loss_prob_pct']:assert r[key]==q[key]
    rate_mean,_=pert(c.lef_min,c.lef_mode,c.lef_max,c.lef_gamma)
    alpha=1+c.lef_gamma*(c.lef_mode-c.lef_min)/(c.lef_max-c.lef_min)
    beta=1+c.lef_gamma*(c.lef_max-c.lef_mode)/(c.lef_max-c.lef_min)
    expected_zero=integrate.quad(lambda u:math.exp(-c.lef_min-(c.lef_max-c.lef_min)*u)*stats.beta.pdf(u,alpha,beta),0,1)[0]
    assert abs(r['zero_loss_prob_pct']/100-expected_zero)<=6*math.sqrt(expected_zero*(1-expected_zero)/c.iterations)

FIXTURES=json.loads((ROOT/'docs/audit/2026-11-27/evidence/ui-fixtures.json').read_text(encoding='utf-8'))
PRESETS=[(a,t,p) for a,scenarios in FIXTURES['presets'].items() for t,p in scenarios.items()]

@pytest.mark.parametrize('asset,threat,p',PRESETS,ids=[f'{a}-{t}' for a,t,_ in PRESETS])
def test_actual_synthetic_presets_have_feasible_contracts_and_analytic_means(asset,threat,p):
    c=OpenFairInput(p['lefMin'],p['lefMode'],p['lefMax'],lef_gamma=p['lefGamma'],plm_min=p['plmMin'],plm_mode=p['plmMode'],plm_max=p['plmMax'],plm_gamma=p['plmGamma'],slef_prob=p['slefProb'],slm_min=p['slmMin'],slm_mode=p['slmMode'],slm_max=p['slmMax'],iterations=10000)
    mean,var=moments(c)
    result=FairMonteCarloEngine(c).run_simulation()
    assert abs(result['ale']-mean)<=6*math.sqrt(var/c.iterations)+.01

def test_independent_control_scaling_and_governance_identity():
    from app.main import SimulationRequest,simulate
    from dataclasses import asdict
    c=cfg(iterations=100000,slef_prob=.5)
    controls=[dict(id='a',annual_cost=10,lef_reduction=.2,plm_reduction=.3,slm_reduction=.4),dict(id='b',annual_cost=20,lef_reduction=.1,plm_reduction=.2,slm_reduction=.1)]
    result=simulate(SimulationRequest(**asdict(c),controls=controls))
    expected=replace(c,lef_min=.72,lef_mode=.72,lef_max=.72,plm_min=56,plm_mode=56,plm_max=56,slm_min=10.8,slm_mode=54,slm_max=270)
    mean,var=moments(expected)
    assert abs(result['residual']['ale']-mean)<=6*math.sqrt(var/c.iterations)+.01
    for name in ['lef_min','plm_min','slm_min']:assert result['metadata']['residual_inputs'][name]==pytest.approx(getattr(expected,name))
    g=result['governance'];assert g['annual_control_spend']==30
    assert g['net_benefit']==pytest.approx(g['prevented_annual_loss']-30,abs=.011)
    assert g['rosi_percentage']==pytest.approx(g['net_benefit']/30*100,abs=.04)
