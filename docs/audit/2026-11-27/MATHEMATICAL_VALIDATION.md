# Mathematical and statistical validation

Status: **PASS for the tested implementation contract; NOT VERIFIED for empirical predictive validity or official Open FAIR conformance.** Evidence: [91 independent tests](evidence/final-math.xml), [160 controlled statistical runs](evidence/convergence-summary.json), [Python exact regression](evidence/python-valid-output-regression.json), [browser exact regression](evidence/browser-valid-output-regression.json). Reproduce with `scripts/test_independent_math.py`, `experiments.py`, and `compare_valid_outputs.py/.mjs`.

## Annual model and independent references

For each simulated year, draw a rate Λ from modified Beta-PERT. Draw N conditional on Λ from Poisson(Λ). For each of those N events, draw primary loss P, an independent Bernoulli trigger B with probability p, and secondary severity S when triggered. Annual loss is **L = Σ(j=1…N) [Pj + Bj Sj]**. Rates are events/year; p is a conditional per-event probability, not another annual frequency.

The production locations are `backend/app/engine/fair_monte_carlo.py::{OpenFairInput,lognormal_params,FairMonteCarloEngine._sample_beta_pert,_sample_lognormal_tail,run_simulation,_compile_metrics}` and `frontend/src/engine.js::{createPRNG,sampleBetaPERT,samplePoisson,computeLognormalParams,runOpenFairMonteCarlo}`. Frontend/API orchestration of residual inputs is in `App.tsx`'s computation effect and `backend/app/main.py::simulate`. These are exact function locations, not independent reference implementations.

| Quantity | Definition/reference | Observed implementation and verification |
|---|---|---|
| PERT | α=1+γ(m−a)/(b−a); β=1+γ(b−m)/(b−a); X=a+(b−a)U, U~Beta(α,β) | Mean a+(b−a)α/(α+β), variance (b−a)²αβ/[(α+β)²(α+β+1)]. Independent SciPy Beta CDF KS checks plus analytic moments; endpoint modes and degenerate constants tested. γ allowed 1…8. |
| Poisson | E[N\|Λ]=Var[N\|Λ]=Λ | NumPy Poisson and exact browser sum of Knuth chunks ≤20. Constant-loss Poisson reference quantiles, zero probability and high-rate resource tests. No normal approximation substituted. |
| Secondary occurrence | E[BS]=p E[S]; E[(BS)²]=p E[S²] | p=0, p=0.3 and p=1 tested; triggers apply only to actual incidents. No secondary loss in event-free years. |
| Shifted lognormal | S=a+exp(Y), Y~Normal(μ,σ²) | Independent Brent root solves σ²+z95σ=log[(q−a)/(m−a)]; compare μ=log(m−a)+σ² with production's stable algebraic root. Verify mode a+exp(μ−σ²)=m, P95 a+exp(μ+z95σ)=q. |
| Lognormal mean/variance | E[S]=a+exp(μ+σ²/2); Var[S]=(exp(σ²)−1)exp(2μ+σ²) | Independent SciPy lognormal and sample moments. P95 exceedance counts checked against a prespecified binomial interval. Samples above P95 demonstrate it is not clipped. |
| Annual mean | E[L] = E[Λ] × (E[P] + p E[S]) | All 64 actual asset/threat presets compared with independently derived moments. Default heavy-tail analytic ALE=2,813,325.9877527696 units/year. |
| Annual variance | Let μX=E[P]+pE[S], E[X²]=E[P²]+2pE[P]E[S]+pE[S²]. Var[L]=E[Λ]E[X²]+Var[Λ]μX² | Mixed-Poisson moment oracle sets the sampling-error tolerance; no fitted expected value from the production sample. |
| Zero monetary loss | For strictly positive incident losses: E[exp(−Λ)]. With primary=0 and secondary positive: E[exp(−pΛ)] | Independent quadrature/Poisson thinning. If both severities can be zero, N=0 and L=0 differ; tests cover constant-zero losses. |
| ALE | Sample arithmetic mean of annual totals | NumPy rounds returned KPI to cents; browser retains binary64 values. Tests accommodate only the documented API cent rounding. |
| VaR | Linear empirical quantile: h=(n−1)p, interpolate sorted observations at floor(h), ceil(h) | Hand-built reference arrays, ties and zero mass. Matches NumPy's default linear method (Hyndman–Fan type 7). |
| ES99 / CVaR99 | Mean of largest n−floor(.99n)=ceil(.01n) losses | Rank-tail convention verified on known arrays and a discrete Poisson example. Not the same as averaging every value ≥VaR99 in distributions with ties. |
| LEC | 100×count(L>x)/n | Strict exceedance, exact tie handling; thresholds do not alter losses. Residual uses baseline grid in each engine. |
| Histogram | Counts only L>0; each displayed bin is 100×count/nonzero years | Bin counts plus zero years recover n. Mass sums to 100% when positive years exist; all-zero case has zero mass. This is conditional bin probability, not a density per monetary unit. |
| Threshold metric | 100×count(L>scenario threshold)/n | Annual **total-loss** exceedance; historical `sec_materiality_threshold` name does not make it a legal materiality test or a secondary-only loss statistic. |

## Calibration feasibility and boundaries

Nonconstant SLM requires **0 ≤ floor < mode < P95**, with σ≤2.5. All three equal gives a constant including zero. Other endpoint equalities are infeasible under the declared shifted-lognormal mode/P95 contract and must be rejected. The legacy field `slm_max` means P95, not maximum or truncation. This pre-existing version-3 methodology was not replaced during the audit. PERT equal endpoints are constants. Rates ≤100, severities ≤1e12, n=1000…250000, n×max rate≤2,000,000 and sampled events≤2,000,000 bound resource use; not every combination of maximum n and maximum rate is supported.

Validation-only corrections reject NaN/negative/non-number browser threshold arguments and nonfinite/negative/empty custom LEC grids in both engines before random sampling. The browser's default positive-Infinity sentinel intentionally disables its optional exceedance query; API monetary thresholds remain finite. Before failures are preserved in `baseline-engine-threshold.log`, `baseline-lec-threshold-js.log` and `baseline-lec-threshold-python.log`. No valid sampling formula changed; 80 exact before/after cases per engine remain equal.

The complete [engine diff](evidence/core-validation-diff.txt) shows only those entry-point validation guards. All other production scientific source is unchanged relative to the preserved audit baseline.

## Randomness and reproducibility

Python uses NumPy `default_rng` (PCG64 in this installed version). Browser uses 32-bit Mulberry32, Box–Muller normals, Gamma/Beta construction and exact Poisson chunking. An independent BigInt state oracle checks 12 million Mulberry32 draws including state wraparound. Fresh engines/workers with identical inputs, n and seed repeat within their own runtime implementation, excluding elapsed time/timestamp/run ID. The explicit seed range is 0…4294967295; zero now survives UI input unchanged.

The engines consume different streams and draws. They are equivalent model implementations within tested distributional criteria, not bit-identical engines. Mulberry32 is not a cryptographic or scientifically certified RNG; this audit does not establish high-dimensional independence, period suitability for every possible workload, or cross-version bitwise stability. Baseline/residual reuse the seed, but changed event counts change draw alignment; this is **not a true event-paired common-random-number construction**. Small control differences require uncertainty analysis rather than assuming every empirical VaR/ALE comparison is monotone.

## Statistical experiments and tolerances

Two actual cases (constant Poisson severity and the default synthetic heavy-tail preset), five n values (1000,10000,50000,100000,250000), and eight fixed seeds (11,103,1009,42001,65537,100003,777777,4294967295) yield 80 runs per engine. Raw results are `python-experiments.json` and `browser-experiments.json`; `experiment-inputs.json` records exact inputs.

Acceptance was defined using analytic variance: sample-mean deviation ≤6×sqrt(Var[L]/n), with only documented rounding allowance. Independent distribution tests use KS p>1e−6; lognormal P95 counts use a 1−1e−8 binomial interval. These are conservative fixed-seed implementation checks, not a posterior predictive validation study or proof for all distributions/seeds.

Observed NumPy heavy-tail P99 ranges across eight seeds were approximately 16.813m–21.577m at n=1000, 18.621m–19.546m at n=50000 and 19.027m–19.219m at n=250000. At n=1000, ES99 ranges approximately 22.704m–29.909m. These are **observed ranges, not confidence intervals**. A thousand years leaves only ten rank-tail observations; it is inadequate for precise P99/ES99 decisions. Even the supported maximum has scenario-dependent Monte Carlo uncertainty; cent/integer display precision is not estimator accuracy. RMSE need not decline monotonically for a particular set of eight seeds.

One initial independent LEC assertion failed because two algebraically identical percentage expressions differed by one binary64 ULP. The expectation was corrected to four ULP plus recovery of the exact integer exceedance count, not to a broad percentage tolerance. The initial failure remains in `independent-math-initial.log/xml`. Production output was unchanged. Other initial browser-audit failures were harness language/seed-wait assumptions and are retained separately; they are not counted as scientific defects.

Two isolated mutants (omitting all secondary annual loss; returning zero browser quantiles) were detected by independent mean/Poisson-quantile expectations. Original engine hashes were checked unchanged by the mutation experiments; temporary mutant source copies are removed after testing. See `mutation-checks.json` and the reproducible mutation script.

## Controls, finance and methodology limits

For each component k, remaining scale is **Mk=∏controls(1−reductionk)**. Rate/PLM/SLM triplets are multiplied by those scales; γ and conditional secondary probability remain unchanged. All selected costs are annualized input assumptions. Independent fixtures verify multiplicative application, enabled flags, no-controls identity, duplicate-ID rejection, cost summation, positive/zero-cost cases and governance equations.

Governance currently defines prevented ALE=max(0,baseline ALE−residual ALE), net benefit=prevented ALE−annual cost, ROSI=100×net benefit/cost when cost>0, otherwise zero. The clamp can hide negative Monte Carlo differences; zero-cost ROSI=0 is a display convention, not a finite economic return. Neither was silently redefined. Overlapping controls are **assumed independent multiplicative scale factors**; causal overlap/double counting is not empirically resolved. There is no calibrated dependency/copula model, parameter-uncertainty layer, inflation/discounting or multi-year cost cash-flow model. “Optimization” denotes manual what-if analysis.

No empirical dataset supports these presets or control coefficients. Synthetic scenarios are disclosed. NIST mapping does not certify effectiveness; DORA references do not establish compliance. Complete Open FAIR standards were behind authentication, so full standard conformance is NOT VERIFIED. Changes to those assumptions require an explicit methodological decision and validation data, not a cosmetic or numerical patch.

## Primary references

- [NIST Engineering Statistics Handbook: lognormal distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3669.htm) supports unshifted lognormal moments/quantiles; shifting and floor/mode/P95 calibration above are independently derived.
- [NumPy percentile documentation](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html) and [NumPy random generator documentation](https://numpy.org/doc/stable/reference/random/index.html); local versions and exact runtime are recorded in baseline/final environment evidence.
- [NIST CSF 2.0, NIST CSWP 29, 26 February 2024](https://doi.org/10.6028/NIST.CSWP.29) is a risk-management framework reference, not a source for the application's numerical control reductions.
- Open Group O-RA/O-RT publication entry points were accessed but full text required authentication: [O-RA](https://pubs.opengroup.org/security/o-ra/), [O-RT](https://pubs.opengroup.org/security/o-rt/). No certification or full-text conformance finding is asserted.
