# Performance and resource report

Overall **PARTIAL**: actual local timings/resources are measured; sustained load, prolonged usage and production SLAs are not verified. Benchmarks did not justify a scientific algorithm rewrite.

## Environment and procedure

Windows 11 build 26300, Python 3.12.14 / NumPy 2.5.5, Node 24.14.1, Vite 6.4.6, headless installed Microsoft Edge through Playwright 1.62.1. Dependencies and execution commands are recorded in baseline/final evidence. Results are observations on this workstation, without CPU affinity or a controlled container; other ordinary host processes may exist. JS core benchmarks run under Node; separately, actual bundled browser-worker/UI wall times are recorded. Do not equate those environments.

`experiments.py` runs two cases × five sizes × eight fixed seeds sequentially per engine. Per-run wall time, process CPU milliseconds and RSS-after are in `python-experiments.json` / `browser-experiments.json`. NumPy process memory is also sampled every 2ms; the maximum can miss short peaks. CPU milliseconds measure process CPU consumption, not whole-machine utilization.

Sampled NumPy peak RSS: **128,012,288 bytes**. Node records end-of-run RSS, not sampled peak. Runtime/import/cache allocations are included; these numbers are not proof of Docker memory-limit safety.

## Heavy-tail case: measured medians

| Engine | Years | Seeds | Median wall ms | Median process CPU ms | Max observed RSS-after bytes |
|---|---:|---:|---:|---:|---:|
| numpy | 1,000 | 8 | 3.299 | 0.000 | 106,258,432 |
| numpy | 10,000 | 8 | 7.554 | 7.812 | 106,299,392 |
| numpy | 50,000 | 8 | 25.712 | 31.250 | 106,291,200 |
| numpy | 100,000 | 8 | 49.361 | 46.875 | 105,508,864 |
| numpy | 250,000 | 8 | 131.511 | 125.000 | 106,487,808 |
| browser | 1,000 | 8 | 1.159 | 0.000 | 137,842,688 |
| browser | 10,000 | 8 | 8.018 | 15.000 | 137,945,088 |
| browser | 50,000 | 8 | 38.531 | 47.000 | 144,666,624 |
| browser | 100,000 | 8 | 77.691 | 78.000 | 171,900,928 |
| browser | 250,000 | 8 | 199.841 | 203.000 | 162,033,664 |

Short operations can record zero CPU milliseconds because OS process accounting is coarse; this does not mean zero work. The largest supported size is 250000 years subject to the two-million-event budget. These cases exercise a real synthetic preset and a constant Poisson oracle, not every allowed worst-case parameter combination. All reported mean checks pass independently derived six-standard-error bounds; timing alone is not correctness evidence. See [mathematical report](MATHEMATICAL_VALIDATION.md) for P99/ES sampling instability.

## Real browser application

Built production assets served on loopback 4176; API requests intentionally aborted so real browser-worker execution is measured and fallback provenance is visible. Initial readiness includes page load and first real result, not just an HTML response. Each consecutive Execute uses the unchanged explicit seed.

- Initial page-to-first-metric readiness: **1007 ms**.
- Twelve consecutive 50000-year executions: **461–491 ms**, median **472.5 ms**. This includes the existing 375ms debounce, request/fallback and rendering; it is not engine CPU time.
- Worker lifecycle: **13 created / 13 terminated**, including initial computation.
- Observed runtime origins: http://127.0.0.1:4176; page errors: 0.
- Chromium endpoint `Documents`: 2.
- Chromium endpoint `Nodes`: 7605.
- Chromium endpoint `JSHeapUsedSize`: 2.63217e+07.
- Chromium endpoint `JSHeapTotalSize`: 9.79763e+07.

These endpoint heap/node observations and matched worker counts do not establish absence of long-term leaks. Rapid navigation and UI interaction regressions pass, but input latency percentiles, React render profiling, search keystroke latency and report-generation latency were not benchmarked; no favorable numbers are invented.

## Real API latency

`api_performance.py` sends 12 sequential same-origin-contract loopback HTTP requests with three repeats at each size, seed zero, no controls and actual default numeric inputs. Returned metric snapshots match within each repeated input/seed case. Wall time includes HTTP/serialization. No-controls residual is a copy of baseline, so this is not a two-simulation control workload.

| Years | Repeats | Median HTTP wall ms |
|---|---:|---:|
| 1,000 | 3 | 22.936 |
| 10,000 | 3 | 33.274 |
| 50,000 | 3 | 31.214 |
| 250,000 | 3 | 168.234 |

## Production assets

Sizes below are actual final built files. Gzip sizes use local gzip compression and may differ slightly from the build tool/server settings. They are not claims about network throughput.

| Asset | Bytes | Gzip bytes |
|---|---:|---:|
| `assets/index-F0-B8ED8.css` | 43,679 | 9,148 |
| `assets/index-uo2lV5i5.js` | 311,187 | 93,713 |
| `assets/simulation.worker-CBhRxtxm.js` | 4,537 | 2,300 |
| `index.html` | 665 | 419 |

Production typecheck/build passes; bundled worker is actually executed in the browser audit. Architecture source text is included intentionally for the existing code viewer. No proven bundle bottleneck justified removing that functionality.

## Remaining measurement gaps

**NOT VERIFIED:** sustained multi-client load, maximum-budget container memory enforcement, clean-machine boot, prolonged heap growth, thermal/CPU saturation, actual native-zoom performance, printer/export interruption and production WAN latency. **PARTIAL:** slider/search/chart responsiveness is functionally exercised but not quantified as frame-time/input-latency distributions. Follow-up: isolate the intended deployment hardware, run bounded mixed workloads over a longer session, retain CPU/heap/worker/request traces, and measure input/search/render/export latency separately. Preserve every existing mathematical check while optimizing demonstrated bottlenecks.
