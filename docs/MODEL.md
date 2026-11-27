# Model contract version 3

PERT uses alpha=1+gamma*(mode-low)/(high-low) and
beta=1+gamma*(high-mode)/(high-low), gamma in [1,8]. Equal endpoints are constant.

Secondary loss X has a hard floor a and X=a+exp(Y), Y~Normal(mu,sigma²).
For a < m < q, m is the exact mode and q is P95. With z=1.6448536269514722:

    r = log(q-a) - log(m-a)
    sigma = 2*r / (sqrt(z*z+4*r)+z)
    mu = log(m-a) + sigma*sigma

Thus mode(X)=m, P95(X)=q and E[X]=a+exp(mu+sigma²/2).
No clipping or arbitrary positive floor is applied. If a=m=q, X is constant,
including exactly zero. Other endpoint modes are rejected as incompatible with
this Lognormal contract. Supported sigma is at most 2.5; larger models are rejected.
The legacy API field `slm_max` means q, not a maximum. This is a breaking methodological
change from 2.4. No deterministic historical number should be used for comparison.

The annual count N conditional on a sampled rate is Poisson(rate). ALE estimates
E[N]*(E[primary]+p_secondary*E[secondary]). VaR uses linear empirical quantiles.
CVaR99 averages the largest ceil(0.01*n) observations (rank-based tail estimate).
LEC is the empirical strict probability P(L>x), in percent. Ties are counted exactly.
Histograms condition on positive losses. Their bins cover the entire sample.
Baseline and residual curves use common monetary thresholds.
Explicit custom LEC grids must be non-empty collections of finite, non-negative
monetary values. They are validated before drawing any samples. The browser
engine's positive-Infinity default secondary-threshold sentinel intentionally
disables that optional exceedance query; NaN, negative, and non-number thresholds
are rejected. API monetary thresholds remain finite and non-negative.

Limits: 1000–250000 years, rate <=100, iterations*maximum_rate <=2000000,
actual events <=2000000, input severities <=1e12, 32 API controls maximum.
The sampled-count check runs before event-level arrays are allocated.
Each API process permits one simulation at a time. Container configuration uses
one worker and a 512 MiB memory limit. Multi-process deployments multiply the budget.

Controls independently multiply frequency and severity scales. No causal or
empirical calibration is implied. Negative Monte Carlo risk reduction is currently
clamped to zero for governance display; small differences require uncertainty analysis.
These are predictive model quantiles, not estimator confidence intervals.
