# UI/UX, accessibility and report audit

Overall **PARTIAL**: the tested five-module layout and interactions pass, while native zoom/assistive technologies and complete language coverage remain incomplete. The existing dark branding, original logo and adapted logo variant were preserved. Corrections target demonstrated integrity/accessibility/presentation defects, without redesigning unrelated approved screens.

## Running application evidence

Regression tests use a real headless Edge browser against the current Vite application. The final independent browser audit uses the **built production assets** on loopback port 4176, including the actual bundled worker. It checks five modules × English/Russian × six viewports: 2560×1440, 1920×1080, 1440×900, 1280×720, 768×1024 and 390×844. All 60 tested states have no unintended horizontal document overflow; desktop states have no document vertical scrollbar. See [geometry](evidence/final-browser-layouts.json) and `evidence/screens/final-1440-{EN,RU}-module-{0…4}.png`. All ten final 1440 screenshots were visually inspected. Before screenshots were captured from the preserved checkpoint served separately on 4178.

`shell.test.mjs` scrolls the actual workspace in every module and compares sidebar/header coordinates before and after; it also checks independent sidebar scrolling when content is taller than the viewport. This is behavioral browser evidence, not a source-only claim that sticky positioning should work. Mobile layouts return to normal document flow; print CSS removes the fixed/viewport constraints.

## Module and interaction review

| Area | Status | Observed result / evidence |
|---|---|---|
| Branding/language switcher | PASS | Logo remains legible/proportional on dark background; concise existing descriptor; consistent segment geometry; screenshot review and layout tests |
| Four context dropdowns | PASS | Shared `ContextSelect`, 44px control height, single-line values, ellipsis/title, readable expanded long labels, focus and selected states; no native popup styling; `context-select.test.mjs` |
| Fixed context toolbar | PASS | Adjacent compact asset/threat fields, preserved icons/tooltips, readable metrics, search, one reset/execute pair; `header.test.mjs`, responsive geometry |
| Execute behavior | FIXED | User-authorized all-module execution, same explicit seed, dashboard progress/results, no concurrent duplicate; command-palette regression |
| Open FAIR Inputs | PASS | Visible descriptive labels, consistent input heights/alignment, separate formula/thresholds/results, invalid drafts disclosed; layout/disclosure tests |
| Dashboard | FIXED | Previous-result badge, honest loss-quantile/bin-mass/log-floor labels, selected-currency threshold, keyboard data access, finite huge appetite SVG; regressions |
| NIST/ROSI | PASS | Actual control toggles and annual cost/effect data retained; no automated optimizer added; module rendering and mathematical control tests |
| Report | PASS | Current-result gating, actual JSON and print output, long context/large monetary values fit; print tests and rendered artifacts |
| Architecture | FIXED | Actual imported source shown; English/Russian description now correctly names NumPy, not a nonexistent SciPy runtime dependency; disclosure regression |
| Engine status footer | FIXED | Actual NumPy API / browser-worker source and neutral computing / previous-result / error labels replace false static online/server wording; `audit-engine-status.test.mjs` checks API→worker→error in EN/RU |
| Global search | PASS | Actual catalog-built index; real destinations; localized controls; meaningful focus/scroll/highlight; no silent computation or scenario commit |

## Command palette verification

`buildSearchIndex` reads the same translations, presets, risk parameter definitions, real percentile levels and threat-control catalog as the UI. The index contains actual five modules, eight assets, eight threats, current parameters/metrics, 32 catalog controls, analytical/report/architecture sections. Entries dependent on unavailable results are disabled and explained, not fake navigation targets.

`command-palette.test.mjs` verifies Ctrl+K and Meta/Cmd+K, click opening, input focus, categorized case-insensitive partial matching, empty/no-match/special/long queries, arrows/Enter, Escape/outside dismissal and restored opener focus. It visits actual targets in both languages and checks that navigation does not send simulation requests. Asset/threat and controls belonging to another threat open the original selector at the relevant option; **selection is not committed by search**. Explicit confirmation in that selector invokes the existing handler. Search does not reset parameters or execute a simulation.

## Accessibility

Ten final axe-core 4.14.1 scans (five modules × two languages) report **zero violations** for configured WCAG 2 A/AA through 2.2 tags. [final-axe.json](evidence/final-axe.json) preserves passes and incomplete rules. Demonstrated naming/contrast failures were fixed; visible button names now match accessible names, shortcut decoration is outside the trigger name, iteration captions use actual state, and HTML language tracks RU/EN.

Focusable named LEC/histogram SVGs now expose existing point/bin values through arrows, Home/End and Escape with live readouts. Dialog focus is managed by a modal dialog and restored on close; listbox selection/active descendant is tracked. Existing keyboard/portal/dropdown behavior is exercised. This is **not a claim of complete WCAG AA conformance**, a screen-reader certification or a complete review of every dynamic state.

CSS viewport/DPR equivalents of 100/125/150/200% were checked, but they do not exercise native browser zoom. Real Edge/Chrome zoom, NVDA/JAWS, Firefox/WebKit and physical mobile devices are **NOT VERIFIED**. The governing external reference is [WCAG 2.2](https://www.w3.org/TR/WCAG22/); automated checks alone cannot establish every criterion.

## Report and export evidence

Four final reports use genuine simulations: default and large supported severity/rate cases, each in EN/RU. The large case selects the long ACH/dependency labels and all four applicable controls; no result payload is substituted. Each artifact has two A4 pages, no unintended blank page, readable chart/table content and full monetary digits. All eight final PNG pages rendered by Poppler were individually inspected. [final-reports.json](evidence/final-reports.json), [PDF checks](evidence/pdf-validation.json), [visual review](evidence/pdf-visual-review.json) and [print geometry](evidence/final-print-geometry.json) support this status. The actual files are in `evidence/reports/final-*.pdf/.json`.

Before correction, three large monetary values exceeded print KPI content boxes by 11–21px (`print-geometry.log` and review2 renders). Conditional smaller long-number typography plus wrapping fallback now fits the same values without altering the data. Printed layout returns to normal flow, hides the application shell and preserves page breaks.

Report generation dates use the existing UTC ISO date, so captures near Moscow midnight display the previous UTC date. JSON snapshots retain raw parameters, seed, n, units, selected controls and engine metadata; print reports are executive summaries and do not replace that complete reproducibility artifact. Run IDs/time are expected to differ across fresh executions even when numeric results are identical. Header, dashboards and report read the same committed result.

**PARTIAL language parity:** Russian text renders correctly, but legacy report headings/body sections, some dashboard terminology and raw API/worker errors remain English. This audit does not claim complete Russian translation. No visual logo is included in the existing print report template; the text WayQuant heading renders correctly, while both UI logo assets are preserved. Browser-native print-dialog cancellation, other PDF engines/printers, export disk failures and extended portfolios beyond the actual four-controls-per-threat catalog are **NOT VERIFIED / NOT APPLICABLE as appropriate**; no imaginary larger report feature was invented.

## Outstanding UI actions

Complete native zoom and assistive-technology testing; complete RU presentation/error/report translation with product review; verify additional browser engines/devices; repeat all module/print tests after those changes. Preserve the original handlers, underlying values and approved visual direction throughout.
