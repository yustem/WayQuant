# Historical local release checkpoint

This is a preserved earlier checkpoint, not the current publication status. See
[3.0.0 publication verification](release/3.0.0/VERIFICATION.md) and the later
[comprehensive audit](audit/2026-11-27/FINAL_AUDIT_REPORT.md). Historical results
and gates below retain their original scope.

# Local release verification

Status: NOT READY for an unconditional public release.

Verified on Windows with Python 3.12.14, NumPy 2.3.5 and Node 24.14.1:

- 25 pytest tests passed; no failures or skips. One Starlette/httpx deprecation warning.
- 4 Node regression tests passed, including stale-export rejection.
- TypeScript check and Vite 6.4.6 production build passed.
- npm reported zero vulnerabilities after the toolchain update; production audit also passed.
- FastAPI Uvicorn startup and real health endpoint passed.
- TestClient exercised simulation, invalid inputs, busy worker, OpenAPI and governance.
- Static browser-worker demo and API-backed UI passed headless Microsoft Edge smoke checks.
- Slider keyboard change 4 -> 4.5 was reflected in the downloaded browser-run request.
- API-backed drag exported gamma 6.5 in both request and server metadata.
- No page JavaScript errors in either smoke check. Print output contained two pages.
- One headless drag/frame sample measured a maximum frame gap of 6 ms; this is not
  a cross-device performance guarantee.
- Python wheel and source distribution built; wheel installed into a separate target
  and imported for the benchmark. Reproducibility example ran successfully.

Single-run full-engine benchmarks (cold-start noise included):

| Years | Full wall time, ms | ALE |
|---:|---:|---:|
| 10000 | 43.49 | 2522392.52 |
| 50000 | 28.42 | 2512270.50 |
| 100000 | 54.34 | 2503736.50 |
| 250000 | 209.05 | 2523009.14 |

Inputs are those in examples/reproduce.py, seed 42001. These measurements exclude
HTTP and UI rendering. They are observations, not promised latency limits.

Remaining release gates:

1. Docker build/start: NOT VERIFIED; Docker is not available in this environment.
2. Hosted HTTPS deployment and remote GitHub Actions: NOT VERIFIED; nothing published.
3. Owner identity, original-code provenance and authorization for Apache-2.0 must
   be confirmed. CITATION.cff is intentionally incomplete pending verified authors.
4. Bundled production dependency notices were collected, but a full transitive
   license/provenance review has not been completed.
5. App-wide ts-nocheck is removed, but legacy implicit-any/null settings remain
   permissive. The slider and worker client are explicitly typed; the whole UI
   should not be described as fully strictly typed.
6. Python dependencies are ranges, not a complete reproducibility lock; archive
   the exact environment with a scientific result.

The inactive root prototype and local ZIP backups were archived outside the
repository in the sibling wayquant-local-archive directory. Copies were checked
with SHA-256 before removing their originals from the repository. Generated and
verification directories are excluded by .gitignore. No Git repository existed,
so no Git checkpoint or commit could be created.
