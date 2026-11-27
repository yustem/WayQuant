# Release readiness

## Verdict: NO-GO for public production release

The final verified local build passes its automated regression suite and bounded scientific checks. That does not close material deployment and verification gaps. This verdict applies to claiming a stable public production release, not to asserting that local research use is broken.

**25 confirmed findings: P0 0, P1 3, P2 20, P3 2; 24 FIXED, 1 PARTIAL.** The unresolved finding is WQ-024: opt-in browser regressions are now explicitly enabled in CI configuration and pass locally, but the actual GitHub/Linux workflow has not run. There are no reproduced unresolved P0/P1 regressions in the tested domain. Gaps below are tracked separately from defect counts.

Evidence: [186 passing tests / zero failures or skips](evidence/final-summary.json), [all six build/check commands](evidence/final-checks.json), [final findings](FINDINGS.md), [full scope/limits](FINAL_AUDIT_REPORT.md).

## Required public-release gates

| Gate | Current status | Concrete closure procedure |
|---|---|---|
| Real revision and CI | PARTIAL | Restore/create a real Git checkout; review and commit changes; run `.github/workflows/ci.yml` on GitHub Ubuntu with all browser tests enabled; retain logs and set frontend/API revision variables. No commit/branch was fabricated for this snapshot. |
| Deployable stack | NOT VERIFIED | On a Docker-enabled host, build/run Compose; test web→API proxy, health, one-worker admission, effective memory/CPU limits, startup/restart and bounded worst-case inputs. Archive actual image/dependency versions. |
| Public exposure/security | NOT VERIFIED | Decide the intended audience/exposure. Verify TLS, appropriate access control, client request/rate/body/time limits, security headers, secrets/log handling, monitoring and a private disclosure contact. API loopback binding alone does not protect a public web proxy. |
| Accessibility and language | PARTIAL | Test genuine 125/150/200% browser zoom and NVDA/JAWS in every module; finish RU report/error strings; verify additional browser/device combinations. Automated axe scans have zero violations but are not certification. |
| Reliability under prolonged use | PARTIAL | Run a sustained navigation/input/scenario/locale workload with worker/request/heap traces; exercise OS/server interruption, refresh and real print/download cancellation; verify recovery and immutable exports. |
| Scientific claims | PARTIAL | Keep explicit synthetic/FAIR-inspired/uncertainty disclaimers. If the release claims empirical predictive accuracy, calibrated NIST effects or official conformance, supply suitable independent data and expert validation before making those claims. |

No auth platform, scientific redefinition or deployment infrastructure was added speculatively. These are required verifications/decisions for a production claim; they are not user approvals inferred from a skill.

## Verified capabilities

- Current project starts on loopback; launcher checks both services and proxy health. Source changes are checkpointed; backups remain.
- One Execute action runs from all five modules using configured n and seed, including zero; duplicate busy clicks do not enqueue runs. Deterministic numeric snapshots repeat within each engine.
- PERT/Poisson/Bernoulli/shifted-lognormal annual model and estimators pass independent tests; 80 valid-output comparisons per engine match the preserved baseline exactly except timing.
- Invalid API types/nonfinite data and invalid engine query thresholds fail safely; result provenance, stale state, timeouts and worker cleanup are tested.
- Global search targets actual entities and requires explicit original-selector confirmation to change asset/threat context.
- All five modules work in tested responsive states with stationary desktop sidebar/header and independently scrolling workspace.
- Four genuine JSON/PDF pairs export correctly; all eight rendered pages were reviewed; large sums fit print boxes.
- Typecheck, production assets/worker, wheel/sdist and isolated package import pass; scanned dependency sets have no remaining reported advisories.

## Methodology that must remain explicit

The presets/control coefficients are synthetic assumptions; component independence and multiplicative controls are not empirically established. Baseline/residual same seeds do not create truly paired events. Governance clamps negative sampled prevented ALE to zero and uses zero for zero-cost ROSI; these conventions are preserved/disclosed. VaR/ES are predictive sample risk measures, not confidence intervals. P99/ES99 at 1000 years are unstable; the largest supported n is not universally sufficient for every heavy tail. Currency selects units with no FX conversion. JSON plus engine/runtime/model/seed/n is needed for reproduction; print summaries alone are insufficient. Full Open FAIR standard text/certification, regulatory compliance and real-world predictive performance are **NOT VERIFIED**.

## Regression/release procedure

Follow [README.md](README.md) to reproduce local checks, then close the gates above on the actual release environment. Re-run the independent tests, browser regressions, failure injections, dependency scans and actual print/export inspection after any change affecting those boundaries. Review [source-changes.json](evidence/source-changes.json) against the preserved baseline; valid numerical deviations require an explicit scientific explanation rather than updating golden values. Do not change the verdict to GO merely because the build passes.
