# Security and reliability report

Overall: **PARTIAL**. Tested local failure handling and numeric boundaries are substantially improved. This snapshot has no authentication/TLS/client rate-limiting layer and has not been assessed as an Internet-facing deployment. No source, loss inputs or reports were uploaded to external audit services; dependency tools query package/advisory metadata only.

## Threat model and security boundaries

The intended verified use is a local workstation application: loopback Vite/API processes or a separately reviewed deployment. User inputs are numeric scenario assumptions, closed UI asset/threat/currency catalogs and assumed NIST control coefficients. The API accepts numeric scenarios and opaque unique control IDs; it does not execute code, read arbitrary user paths, query SQL, store a portfolio or perform file uploads. The frontend uses React text/SVG rendering rather than untrusted HTML injection. Architecture examples are rendered as text. Source review found no active database, auth, remote storage, eval-based model evaluation or arbitrary upload pipeline; those attack surfaces are **NOT APPLICABLE to this implementation**, not generally safe in future integrations.

The trust boundary is independent of the UI. `main.py::SimulationRequest/ControlItem` rejects incompatible types and invalid mathematical/resource combinations before model execution. NaN/Infinity rejection now serializes safely as 422 without reflecting unsafe raw input/context. The API permits one active simulation per process using a `BoundedSemaphore`; request isolation/gate release are exercised in existing tests. Iterations≤250000, max rate≤100, n×max rate≤2m, realized events≤2m, bounded severity/sigma and ≤32 controls limit allocations. Multiple server processes multiply those budgets.

The frontend now checks API result count/provenance/metric domains/arrays before committing a result. This prevents demonstrated malformed/stale/mismatched responses from appearing current; it is not cryptographic attestation that an untrusted server actually sampled the model.

## Executed security evidence

| Check | Status | Evidence / interpretation |
|---|---|---|
| API validation | FIXED | [146 cases](evidence/validation-matrix.json), boundary tests and safe 422 regression; canonical JSON types now required |
| CORS | PASS | [cors.json](evidence/cors.json): configured allowed origin accepted, unapproved origin not granted browser access. CORS is not authentication and does not stop nonbrowser callers. |
| API host binding | FIXED | Compose API publication changed to `127.0.0.1:8000:8000`; `test_deployment_policy.py` verifies it. Internal container routing remains intact in configuration, not runtime-certified. |
| npm advisories | PASS | [npm-audit.json](evidence/npm-audit.json): 0 advisories in the scanned lockfile, 186 reported dependencies. This is a database snapshot, not a zero-vulnerability guarantee. |
| pip advisories | FIXED | [before](evidence/pip-audit.json) / [after](evidence/pip-audit-fixed.json): local pip 25.0.1→26.3, no remaining reported advisories in scanned environment. Initial 12 advisory records represent 6 unique IDs, not 12 independently exploitable API flaws; Python-version mitigations matter. |
| Dependency consistency | PASS | `final-pip-check.log`; application runtime dependency ranges/lockfile were not bulk-upgraded |
| Signature credential scan | PASS | [static-security.json](evidence/static-security.json): no hits for the explicitly listed private-key/AWS/GitHub patterns in recorded files. This small scan does not replace history scanning or full secret detection. |
| Unexpected remote requests | FIXED | Removed Google Fonts stylesheet. Production browser audit observed only its loopback origin; [final-browser-performance.json](evidence/final-browser-performance.json). Proxy API requests remain same-origin. |
| Source/package integrity | PASS | Checkpoint/final SHA-256 manifests; wheel imports from an isolated target outside source working directory; no Git identity fabricated |
| Public deployment hardening | NOT VERIFIED | No live Docker/proxy/TLS/auth/rate-limiter inspection or penetration test; public use withheld |

## Failure behavior

Connection refusal/interrupted requests use a genuine worker fallback, explicitly disclosed. HTTP 404/405/501/502/503 trigger that same unavailable-service policy. HTTP 400/422/429/500/504, invalid JSON and invalid result schemas surface an error instead of quietly substituting success. The fallback PRNG differs from NumPy, and the UI/JSON provenance identifies which engine ran. No demonstration-data fallback exists in the tested path.

A 30-second deadline covers the API/worker operation after the existing 375 ms debounce. On timeout the request is aborted, worker terminated if present, loading stopped and a recoverable error shown. Cleanup aborts outdated requests; stale callbacks check the abort signal before committing. Previous metrics remain visible only with a fixed-toolbar previous-result label; report eligibility requires the current request key, committed valid inputs, no error and no loading. Worker synchronous clone failures now terminate the allocated worker, as do error/abort paths.

The single global Execute action is busy/disabled during execution and an imperative ref lock prevents duplicate rapid clicks. It navigates to the dashboard and retriggers computation with the same selected seed. A parameter change can cancel/replace the prior job through the existing effect; cancellation is not proof that a Python server computation stops immediately after a disconnected client. Server admission control limits active work until it finishes.

Evidence: `audit-failure-matrix.test.mjs` (11 HTTP/schema/recovery cases), `audit-reliability.test.mjs`, `worker-client.test.mjs` (5 termination cases), existing latest-result tests, and `command-palette.test.mjs` (all-module deterministic execution with repeated busy clicks). Final test totals are in [TEST_MATRIX.md](TEST_MATRIX.md), not inferred from paragraphs here.

## Outstanding security and operational limits

1. **NOT VERIFIED — public deployment:** Compose web port 3000 is still published on host interfaces; binding the API alone does not secure the proxied `/api` route. Supply TLS, appropriate access control, reviewed exposure, request/body/time/client-rate limits, headers and monitoring before public use. Do not add a speculative auth subsystem to the local product as an audit side effect.
2. **NOT VERIFIED — Docker enforcement:** 512 MiB/one CPU/single-worker declarations and a healthcheck exist, but Docker was unavailable. Build/run the stack, inspect effective limits and observe high-budget inputs/health/recovery. Images/dependency ranges are not immutable deployment digests; record the actual release image/dependency set.
3. **PARTIAL — exhaustion defense:** API gate/resource caps are tested, but the direct development API has no explicit HTTP body limit or per-client time-based limiter. Nginx configuration sets a 64k API body limit and 30-second read timeout. Sustained adversarial load was not run.
4. **PARTIAL — error presentation:** Safe numeric validation is fixed, but legacy API/worker error messages and report headings are not fully Russian-localized. Server exception trace/redaction and all deployment error paths need additional review before processing sensitive enterprise data.
5. **NOT VERIFIED — lifecycle beyond test window:** OS process termination, real print/download interruption, prolonged heap growth, other browser engines, real assistive technology and clean-machine/VPN combinations remain untested.
6. **PARTIAL — reproducible release provenance:** frontend npm lock exists; Python uses supported ranges, code revision fields can be null, and this snapshot has no Git history. Restore version control, set build/API revision variables, archive environment/image hashes and execute the actual CI job (WQ-024).
7. **NOT VERIFIED — private disclosure channel:** `SECURITY.md` explicitly lacks a verified security contact. The owner must establish one for public service/distribution operations.

The launcher explicitly bypasses HTTP proxying for loopback checks, resolves the existing localhost API proxy on IPv4, checks health and fails with logs when ports/dependencies/readiness are wrong. Both project services were started and the API restarted from updated source for final testing. A local successful launch does not demonstrate compatibility with every VPN driver or firewall configuration.

Primary deployment reference: [Docker publishing ports](https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/) explains host publication and loopback scope; effective application exposure still requires testing the entire web/API stack.
