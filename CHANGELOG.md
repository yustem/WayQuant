# Changelog

## 3.0.0 — 2026-11-27
- Published the free GitHub Pages edition using the existing browser Web Worker,
  explicit static routing, repository subpath assets and automated verification.
- Unified global Execute Simulation: every module starts a new run using the
  configured deterministic seed, including zero; removed the implicit +137 seed
  increment and prevented duplicate concurrent execution. Regression tests cover
  all five modules and exact reproducibility within each engine/runtime.
- Added persistent EN/RU preference with English as the first-visit default.
- Localized executive reports, search context, chart labels and error presentation.
- Added explicit A4 (default) and US Letter export formats, locale-aware financial
  presentation, original-geometry light-background branding, and complete run metadata.
- Replaced report optimization/confidence-interval wording with scenario analysis
  and modeled-loss percentile terminology. Scientific calculations are unchanged.
- Breaking: secondary loss uses a hard floor, mode and P95 shifted Lognormal.
- Added domain/event budgets, API concurrency protection and health endpoint.
- Added run provenance, stale-result guards and worker-based browser simulation.
- Corrected strict exceedance probabilities, Poisson fallback and histograms.
- Added packaging, regression tests, confirmed Apache-2.0 publication rights and
  Yustem author attribution; preserved historical audit evidence and conclusions.
