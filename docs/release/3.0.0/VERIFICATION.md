# WayQuant 3.0.0 public release verification

Verified on 2026-11-27. [Repository](https://github.com/yustem/WayQuant) ·
[Live application](https://yustem.github.io/WayQuant/) ·
[Release](https://github.com/yustem/WayQuant/releases/tag/v3.0.0)

## Executed verification

| Check | Actual result |
|---|---|
| Pre-publication checkpoint | Complete original working project archived locally, including environments and earlier verification artifacts; separate source/evidence snapshot and SHA-256 manifests retained. |
| Local final regression | 36 Python + 61 frontend/browser + 91 independent mathematics + 1 static-deployment regression = **189 passing checks**. |
| Remote Linux workflow | [Successful run](https://github.com/yustem/WayQuant/actions/runs/46020491599) on Ubuntu, Python 3.12, Node 22: verify, static and deploy jobs all passed. |
| Python distribution | Wheel and sdist built; remote wheel reinstalled and imported outside the source tree, with a real zero-frequency simulation. |
| Scientific integrity | Seven protected files have byte-for-byte matching pre-publication SHA-256 hashes; all 23 existing test files remain byte-identical. |
| Public application | Anonymous HTTPS/browser session, all five modules, both languages, real simulations and exports passed. |
| Public privacy/network | No API/loopback backend requests, third-party HTTP origins, failed requests or JavaScript errors observed in the tested workload. |
| PDF export | Four real public-site PDFs: EN/RU × A4/US Letter; exactly two pages each. Geometry, extracted text and all eight rendered pages reviewed. |
| Citation | CITATION.cff validated against CFF 1.2.0; verified public pseudonym Yustem; Apache-2.0 rights explicitly confirmed. |

The API-mode frontend suite reports one intentional skip: the separate static
deployment test. The static job executes that test against the actual production
bundle. It is included once in the 189 total, not counted as a skipped check.
The independent 91 are included in the historical 186 and current 189 totals;
they are not added twice. Raw evidence is in [evidence](evidence/).

The first remote run passed its complete verification job but caught a
subpath-preview configuration error in the static job. The preview server needed
`VITE_BASE_PATH=/WayQuant/`, matching the production build. The corrected workflow
then passed without weakening any assertions or changing mathematical code.
Every `main` revision is verified and deployed through the same workflow.
The final release's exact revision and workflow are recorded in its attached
`release-verification.json` after the release revision is deployed and retested.

## Actual public browser coverage

The test uses a fresh browser context without authentication or stored state.
English is the first-visit default. It visits every module in English and Russian,
tests 1920px, 1440px, 1280px and 390px layouts, verifies visible logos and embedded
computation source, and checks fixed toolbar/sidebar geometry while the workspace
scrolls independently. It tests case-insensitive command search, Ctrl+K/Cmd+K,
keyboard selection, real target highlighting, Escape and empty results.

Real asset, threat, iterations and EUR selections, a numeric risk input, a slider,
empty-draft validation, controls, risk metrics, residual results and report exports
are exercised. Reset retains its original selected-context semantics and preserves
seed, iterations, currency and controls. Execute runs from each of five modules;
seed zero stays zero. Synchronous extra clicks while busy produce exactly one
worker job per execution. Repeated results match exactly, excluding elapsed time.

The deployed bundled worker is compared with the unchanged, unbundled local
browser engine running in the **same browser runtime**. All numerical fields,
arrays and quantiles match exactly. This avoids incorrectly demanding bitwise
equality across different JavaScript math libraries or Python's different PRNG.
The public run record identifies `browser-mulberry32`, version 3.0.0 and the actual
deployed commit. Reload, charts, controls, ROSI, JSON and both PDF paper formats
work without a backend. Currency changes label units; no FX conversion is claimed.

## Publication sanitation and preservation

A separate clean Git publication worktree preserves the original local project.
Installed dependencies, virtual environments, build/dist output, local tools,
browser profiles, caches, backups, environment secrets and temporary output were
excluded. Original logo, application source, lockfile, tests, independent reference
tests, final audit reports, raw scientific evidence and verification scripts remain.
The initial public tree is approximately 11 MB; no single file exceeds 1 MB.
Signature scans and staged-file inspection found no credentials or private keys.
No authentication token is stored in the repository or release assets.

Six historical evidence copies redact personal absolute paths. Scientific values
and conclusions are preserved. The original artifact hash manifest is retained
as `original-audit-artifacts.json`; the public-copy manifest records actual copied
bytes. Full unredacted originals stay in the recoverable local checkpoint.

## Scope of changes

- `frontend/src/App.tsx`: explicit build-time browser routing reuses the existing
  worker execution branch, cancellation, validation, provenance and error handling;
  static-mode status text and subpath-safe dark logo path.
- `frontend/src/ExecutiveReport.tsx`, `frontend/index.html`: subpath-safe report
  logo and favicon URLs; no report calculations changed.
- `frontend/vite.config.ts`, `.env.example`: explicit repository base path and
  execution-mode settings; local proxy uses IPv4 loopback.
- New `frontend/tests/static-deployment.test.mjs`: real production/public browser
  regression coverage; existing scientific tests are unchanged.
- `.github/workflows/ci.yml`: pinned official Actions, real Linux/browser checks,
  wheel smoke test, static production checks and free Pages deployment.
- `.gitignore`, `.gitattributes`, packaging metadata, NOTICE, third-party notices,
  CITATION.cff and Zenodo metadata: clean publication and verified attribution.
- README, release/deployment/security documentation, real screenshots and portable
  audit tool launch paths. [Modified original files](evidence/modified-original-files.json).

No scientific algorithm, formula, distribution, PRNG, default, control coefficient,
seed behavior, API contract or scientific regression assertion was changed during
publication. The earlier intentional global Execute correction is documented in
CHANGELOG: execute from every module using the configured seed, without +137.

## Historical audit and remaining scope

The preserved comprehensive audit reported 25 findings: 24 FIXED and WQ-024
PARTIAL because actual remote Linux browser CI had not run. The workflow evidence
above now closes that specific missing verification for public distribution.
Historical files retain their original status and conclusions; the enterprise
infrastructure NO-GO is not rewritten as certification. Public static distribution
and a hardened enterprise API service are different deployment targets.

There are no remaining blockers to the verified public Pages release. Docker
execution, native screen-reader/browser zoom coverage, prolonged enterprise load,
empirical predictive validation and full enterprise infrastructure qualification
remain outside this release verification. One upstream Starlette/httpx deprecation
warning occurs in local Python tests. Python dependencies use supported ranges;
archive the exact environment with a scientific result.

The repository has private GitHub vulnerability reporting enabled. No paid service,
tracking, registration, advertising or hosted simulation API was activated.
Zenodo-compatible metadata is prepared; no Zenodo deposit or DOI is claimed.
