# Test matrix and coverage limits

Final automated regression accounting: **186 tests executed, 186 PASS, 0 FAIL, 0 skipped**. This total comprises 36 repository Python tests, 91 independent mathematical tests and 59 frontend tests with browser tests explicitly enabled. See [final-summary.json](evidence/final-summary.json), [command results](evidence/final-checks.json), [Python XML](evidence/final-pytest.xml), [math XML](evidence/final-math.xml) and [frontend log](evidence/final-frontend-tests.log). Exploratory/failing-before/remediation reruns are not added to that total.

## Baseline

The original 25 Python and 16 enabled frontend tests passed after installing missing local audit tooling. Original typecheck/build/pip-check passed. The initial environment did not have pytest; this is recorded as setup failure, not concealed as a baseline test result. No lint command exists. Baseline test logs are `baseline-python-tests.log` / `baseline-frontend-tests.log`; safe checkpoint and metadata precede production edits. Later tests demonstrate failures in behavior not covered by the original suite.

## Executed coverage

| Area | Status | Procedure and evidence |
|---|---|---|
| Scientific identities/distributions | PASS | 91 tests in `scripts/test_independent_math.py`; independent SciPy roots/CDFs/quadrature and hand order statistics; `final-math.xml` |
| PRNG/determinism | PASS | 12-million-draw independent BigInt oracle, repeated fresh-engine runs, seed limits and explicit UI zero; `engine.test.mjs`, `audit-reliability.test.mjs` |
| API boundary matrix | PASS | 146 named cases with actual/expected HTTP status; [validation-matrix.json](evidence/validation-matrix.json) |
| API request typing | FIXED | Bool/string/nan/inf/order/resource limits, duplicate IDs; `tests/test_audit_boundaries.py`, `final-pytest.xml` |
| API concurrency/health/schema | PASS | Existing tests exercise one-job gate/429, route/health/OpenAPI and isolation; `final-pytest.xml` |
| Response provenance | FIXED | Five mutated real response cases: count, seed, negative loss, empty arrays and invalid probability must not commit results; `audit-reliability.test.mjs` |
| API failure/recovery | PASS | HTTP 400/422/429/500/504 are errors; 404/405/501/502/503 use disclosed real worker fallback; malformed JSON is error; each can subsequently execute successfully; `audit-failure-matrix.test.mjs` |
| Unavailable network | PASS | Browser tests abort real API routes, then execute the real bundled worker; no fabricated analytical response fixtures used for fallback |
| Deadline | FIXED | Never-resolving API route and controlled browser clock past 31 seconds; recoverable error, no false metrics or stuck Execute; `audit-reliability.test.mjs` |
| Worker resources | FIXED | Clone failure, error-message, runtime error, abort and already-aborted signal each terminate once; `worker-client.test.mjs` |
| Stale/draft results | FIXED | Failed recompute and invalid/empty draft visibly previous, draft restored on blur, export eligibility gated; `audit-reliability.test.mjs`, `engine.test.mjs` |
| Global Execute | FIXED | All five modules; configured 25000 iterations/123456 seed; progress/loading; repeated busy clicks produce exactly one request; same complete numeric snapshot per module; `command-palette.test.mjs` |
| Latest-result/cancellation | PASS | Existing rapid input/slider and worker/result eligibility tests reject stale commit; `ux.test.mjs`, `engine.test.mjs` |
| Dropdowns | PASS | Four shared custom selects, options/values/labels, fixed height, ellipsis, keyboard/typeahead/escape/outside click and native handler preservation; `context-select.test.mjs`, `shell.test.mjs` |
| Toolbar/scrolling | PASS | Desktop element coordinates before/after real scroll across five modules; independent sidebar/workspace, mobile normal flow; `shell.test.mjs`, `header.test.mjs` |
| Global search | PASS | Actual index targets in both languages, keyboard shortcuts/navigation/focus/outside/empty/cross-module behavior; scenario review does not mutate or run; explicit selector confirmation uses original handlers; `command-palette.test.mjs` |
| Scientific/unit disclosures | FIXED | Schematic preview, event-sum/marginal quantiles/log floor, no-FX currency labels, finite huge display domain and accurate architecture in EN/RU; `audit-disclosures.test.mjs` |
| Keyboard charts/language/fonts | FIXED | Existing point/bin data traversed by keys, document language updated, no remote font dependency; `audit-accessibility.test.mjs` |
| All-module responsive geometry | PASS | 60 combinations: 5 modules × 2 languages × widths 2560/1920/1440/1280/768/390; [final-browser-layouts.json](evidence/final-browser-layouts.json) |
| Automated accessibility | PASS | 10 axe scans, 0 violations under configured WCAG 2 A/AA through 2.2 tags; incomplete rules preserved; [final-axe.json](evidence/final-axe.json) |
| Zoom-equivalent layout | PARTIAL | CSS viewport/DPR scales 100/125/150/200% in both languages; not native browser zoom; `final-zoom-equivalents.json` |
| Reports | PASS | Four actual PDFs and JSONs, long names/large values/four controls, two pages each; print geometry and every rendered page reviewed; `final-reports.json`, `pdf-validation.json`, `pdf-visual-review.json` |
| Mutation resistance | PASS | Two isolated mutants detected, production hashes unaffected by experiment; `mutation-checks.json` |
| Valid-output regression | PASS | 80 exact pre-audit/current comparisons per engine, timing excluded; `python-valid-output-regression.json`, `browser-valid-output-regression.json` |
| Build/package | PASS | `final-build.log`, `wheel-build.log`, `package-smoke.json`; built UI/worker actually run on port 4176 |
| Dependency/config scans | PASS | Local npm/pip scans have no reported advisories after targeted pip update; configuration regression and CORS checks; scope in security report |
| Browser CI configuration | PARTIAL | Local enabled suite passes; actual GitHub-hosted Ubuntu execution unavailable (WQ-024) |

## Validation matrix semantics

`scripts/validation_matrix.py` records null, omitted required/defaulted fields, negative/zero/scientific/extreme/small values, bad types, bool/string coercion, nonfinite JSON values, probabilities, parameter order, infeasible SLM calibration, iterations/seeds/control costs/effectiveness/duplicates/count and memory budget. The exact 146 cases are listed in the machine-readable matrix; it is not an exhaustive Cartesian product.

Numbers remain numbers: scientific notation in valid JSON is accepted; numeric strings and booleans in numeric fields are rejected. Float-valued whole numbers do not replace integer-only iteration/seed contracts. Empty browser drafts are uncommitted and visibly restore to the last valid value on blur. Blank seed has the existing explicit fallback one, while explicit zero remains zero. Selection catalogs are closed UI definitions; asset/threat/currency identifiers are not API numeric-contract fields. JSON has no `undefined`: **NOT APPLICABLE**, with omission tested instead. Risk appetite is a UI display/query setting; the API's annual-loss engine does not have an asset/threat/FX lookup service.

## Honest gaps and remaining procedures

| Status | Untested or incompletely tested scope | Exact next verification |
|---|---|---|
| NOT VERIFIED | Native browser zoom, real screen reader, additional browser engines and mobile devices | Edge/Chrome 125/150/200% real zoom in every module; NVDA/JAWS reading and focus order; Firefox/WebKit/device checklist |
| PARTIAL | Full language parity | Translate/review legacy RU report English sections and raw API/worker errors, then add assertions for each state |
| NOT VERIFIED | OS kill/refresh during compute, forcibly corrupted worker protocol, printer cancellation/download-disk interruption | Exercise with actual process interruption and browser dialogs; confirm no stale success and clean restart |
| PARTIAL | Long-running rapid locale/currency/scenario navigation under load | Prolonged scripted session plus heap/worker/request traces and final exported snapshot checks |
| NOT VERIFIED | Docker startup, memory enforcement, proxy/TLS/headers/rate limiting, clean-machine setup | Build/run Compose on a Docker host; verify effective limits, routes, health, hardened public ingress and new installation |
| NOT VERIFIED | Remote CI | Initialize/restore a real Git repository, run committed workflow on Ubuntu and retain artifacts/logs |
| NOT VERIFIED | Full SAST/DAST, history secret scan, external security review | Run appropriate tools on a versioned deployment with an agreed threat model; do not infer absence of vulnerabilities from dependency scans |
| NOT VERIFIED | Empirical calibration, predictive accuracy, regulatory/standard certification | Obtain independent loss/control-outcome datasets, define validation protocol and commission applicable expert assessment |
| NOT VERIFIED | Lint | Select/configure a lint policy and run it; no invented successful lint count |

## Test quality and recorded failures

Independent expected values are not obtained by calling the production function under test. API negative tests mutate copies of a real matching response only to challenge the trust boundary; real worker/model/exports are used for result calculations. Statistical mean tolerances derive from analytic variance. Initial mathematical one-ULP oracle failures were corrected with an exact-count check; no production formula or expected risk estimate was adjusted.

Initial browser audit failures caused by the harness assuming English after RU traversal and assuming execution increments seed are retained in `review-browser-audit.log`. The failure-matrix harness initially looked for fallback text inside the sidebar even though the visible notice is in the workspace; its retained log is `failure-matrix-initial-harness.log`. The assertion now checks the exact visible notice. These are disclosed test-harness corrections, not hidden product regressions.
