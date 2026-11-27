# Reproducing this audit

Start with [FINAL_AUDIT_REPORT.md](FINAL_AUDIT_REPORT.md) and [RELEASE_READINESS.md](RELEASE_READINESS.md). Seven required technical reports, [final findings](FINDINGS.md), raw evidence and executable scripts are colocated here. Status meanings: **PASS** verified within stated scope; **FAIL** confirmed defect; **FIXED** confirmed defect corrected/retested; **PARTIAL** incomplete verification; **NOT VERIFIED** insufficient evidence/access; **NOT APPLICABLE** absent from this architecture. No status implies certification.

## Preserved baseline

`.verification-audit/checkpoint` contains the 74-file pre-remediation snapshot. `evidence/baseline-*.json/log/xml` record its hashes, environment and test outcomes. Existing user backups were preserved. Do **not** capture a new baseline over these files: `capture_baseline.py` now refuses overwrite. There is no Git repository/commit in this snapshot; use source manifests and checkpoint comparisons. `.verification-*` directories are ignored local artifacts; preserve or archive the checkpoint separately when distributing this audit. Core pre-audit sources are also retained as `evidence/baseline-python-engine.txt` and `baseline-browser-engine.txt` for exact comparison scripts.

## Local prerequisites

The recorded environment is Windows 11, PowerShell, Python 3.12.14, Node 24.14.1, NumPy 2.5.5, installed Microsoft Edge. Application dependency files remain the production authority; independent SciPy/statistical/PDF/browser tools are **audit-only**, not backend runtime requirements. Versions used include pytest 9.2.0, SciPy 1.18.1, psutil 7.2.2, pypdf 6.21.4, build 1.6.1, pip-audit 2.10.1, Playwright 1.62.1 and axe-core 4.14.1. Poppler `pdftoppm` is required for page rendering; the script uses its recorded Codex runtime location and should be adjusted to a locally installed Poppler if different.

Example setup in a separately reviewed local environment (internet needed only for dependency/tool installation and advisory databases):

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -e '.[api,test]'
.venv/Scripts/python.exe -m pip install scipy==1.18.1 psutil==7.2.2 pypdf==6.21.4 pip-audit==2.10.1
npm.cmd --prefix frontend ci
npm.cmd install --prefix .verification-audit/tools --no-save --ignore-scripts playwright@1.62.1 axe-core@4.14.1
```

The current audited workspace already has the required tooling. Do not blindly recreate its venv. Local audit tool installs do not alter application requirements/lockfiles. The build process installs its own isolated setuptools/wheel dependencies. Package/advisory queries do not upload source or loss data.

## Start and execute regression tests

```powershell
./start.ps1 -NoBrowser
$env:WAYQUANT_PLAYWRIGHT_MODULE = (Resolve-Path '.verification-audit/tools/node_modules/playwright/index.mjs').Path
$env:WAYQUANT_UX_URL = 'http://127.0.0.1:5173'
$env:WAYQUANT_PRINT_URL = 'http://127.0.0.1:5173'
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider docs/audit/2026-11-27/scripts/test_independent_math.py
node --test --test-concurrency=1 frontend/tests/*.test.mjs
npm.cmd --prefix frontend run typecheck
npm.cmd --prefix frontend run build
.venv/Scripts/python.exe -m pip check
```

The browser module variable is mandatory: ordinary `npm test` without it intentionally skips browser tests. The CI workflow now explicitly installs/enables Playwright, but actual remote Ubuntu execution is pending. Browser tests choose installed Edge on Windows and Playwright Chromium on other platforms. `run_checks.py final` is the Windows orchestrator used for the preserved final logs; it uses the recorded Codex Playwright path and loopback 5173. Adjust that recorded path if reproducing elsewhere. Run browser tests serially because the real API intentionally has one admission slot. No lint runner exists.

## Independent experiments and API validation

Run timing experiments sequentially after other browser jobs to reduce self-induced contention:

```powershell
node docs/audit/2026-11-27/scripts/extract_fixtures.cjs
.venv/Scripts/python.exe docs/audit/2026-11-27/scripts/validation_matrix.py
.venv/Scripts/python.exe docs/audit/2026-11-27/scripts/experiments.py
.venv/Scripts/python.exe docs/audit/2026-11-27/scripts/compare_valid_outputs.py
node docs/audit/2026-11-27/scripts/compare_valid_outputs.mjs
.venv/Scripts/python.exe docs/audit/2026-11-27/scripts/mutation_checks.py
.venv/Scripts/python.exe docs/audit/2026-11-27/scripts/api_performance.py
```

Fixtures are extracted from actual TS definitions; they are not invented reference risk results. Independent references use hand mathematics/SciPy, not production calculations. Experiments use fixed inputs/seeds and n, so numeric outputs repeat within the recorded engine/runtime; elapsed time/RSS may differ. Mutation experiments create two isolated copies and remove their source files afterward; original production files are never changed. `probe_boundaries.py` and baseline failure logs preserve earlier defects; do not overwrite before-fix evidence to make it look current.

## Production browser, accessibility and export audit

Serve the built frontend on a separate loopback port, e.g. `npm.cmd --prefix frontend run preview -- --host 127.0.0.1 --port 4176 --strictPort`, in an appropriate background process. Then:

```powershell
$env:WAYQUANT_UX_URL = 'http://127.0.0.1:4176'
$env:WAYQUANT_AUDIT_PHASE = 'final'
node docs/audit/2026-11-27/scripts/browser_audit.mjs
node docs/audit/2026-11-27/scripts/check_print_geometry.mjs
.venv/Scripts/python.exe docs/audit/2026-11-27/scripts/render_reports.py
```

These scripts intentionally force real browser-worker fallback; unit/API tests and the separate HTTP benchmark exercise the backend. They create 60 layout records, 10 axe scans, zoom-equivalent records, worker lifecycle measurements and four actual JSON/PDF pairs. **Individually inspect every rendered page** after regenerating reports, then record human/model visual-review results separately; automatic page/text/box checks do not establish visual quality. Current evidence is in `pdf-visual-review.json`. Native browser zoom and real screen readers still require additional verification.

To recreate before screenshots, serve the preserved checkpoint frontend (with access to the installed node_modules) on isolated 4178 and run `capture_before.mjs`. Do not copy baseline source back over current files.

## Packaging, security and evidence checks

```powershell
.venv/Scripts/python.exe -m build --outdir .verification-audit/dist
.venv/Scripts/python.exe docs/audit/2026-11-27/scripts/package_smoke.py
npm.cmd --prefix frontend audit --json
.venv/Scripts/python.exe -m pip_audit --format json
.venv/Scripts/python.exe docs/audit/2026-11-27/scripts/finalize_evidence.py
.venv/Scripts/python.exe docs/audit/2026-11-27/scripts/write_findings.py
.venv/Scripts/python.exe docs/audit/2026-11-27/scripts/write_performance_report.py
```

`finalize_evidence.py` derives counters from real XML/logs, checks expected browser/matrix artifacts and writes scoped source/hash/signature-scan evidence. It does not certify untested deployment/accessibility/empirical validity. The performance writer uses actual recorded measurements. No production service is published by these commands. The final local application remains on 5173/8000; audit-only preview/checkpoint servers are stopped after verification.
