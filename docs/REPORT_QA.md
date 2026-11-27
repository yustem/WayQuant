# International executive report QA — 27 November 2026

Scope: localization, international formatting and report presentation. This
refinement does not redefine the scientific model or certify a public deployment.
The previous comprehensive audit remains a historical snapshot; this document
records the later report/localization changes.

## Improvements

English is the first-visit default; an explicit RU/EN preference persists per
browser origin, with a safe fallback when storage is blocked. Localized context,
search labels/aliases, chart captions, error explanations and report prose use the
chosen language. Standard acronyms, software names and source code retain their
technical forms. All existing currency choices remain; no FX conversion is added.

A4 is the default for both languages. US Letter is explicitly selectable. Both
request 19 mm margins. The report has a white background, original-geometry logo
with light-background colors, restrained headings/cards and one footer number per
page. Full run IDs remain on one line in print. The report uses locale-aware dates,
numbers and currencies and identifies the actual engine and selected run inputs.

VaR is described as a modeled-loss percentile, and ROSI as analysis rather than
an optimizer. Excluded controls' hypothetical costs are distinguished from selected
expenditure. Estimated benefits are not described as guaranteed realized savings.
No automatic confidentiality designation is imposed.

## Actual report matrix

Twenty PDFs (40 pages) were generated from real production-build simulations:

- Backend NumPy and real browser Web Worker, each with a default and long-context
  scenario, EN/RU, A4/Letter: 16 PDFs.
- Large EUR severity case with four active controls and seed 4294967295, English
  Letter and Russian A4: two PDFs.
- Zero-frequency USD case with four active controls, seed 777 and ROSI −100%,
  English Letter and Russian A4: two PDFs.

The long-context case uses ACH / dependency poisoning, EUR, 25000 iterations and
seed zero. Default cases use 50000 iterations and seed 42001. Default zero-control
ROSI, positive ROSI, and negative ROSI are covered. No mocked financial results
were substituted for these exports.

Browser assertions compare report monetary strings against the actual downloaded
audit JSON in each locale. They verify actual engine labels, run IDs, paper selection,
two pages, no horizontal overflow and single page-number occurrences. Independent
PDF parsing verifies A4 / Letter dimensions, searchable text and pagination.
All 40 rendered pages were visually reviewed using contact sheets; the English
Letter sample was also inspected at full-page scale. No missing charts, unintended
blank pages, visible clipping or overlapping text were observed in this matrix.

The preserved before example is the preceding audit's actual default worker report,
not a reconstruction with invented values. Its numerical results match the new
default worker report at the same seed. API and worker PRNGs are different; their
numerical results are not claimed to be equal to one another.

Local artifacts: `output/pdf/international/*.pdf` with matching run JSON files;
before/after PNGs and all-page contact sheets in `output/pdf/review/`.
Verification logs, exact file hashes and PDF dimensions are retained in
`.verification-international/` (local verification artifacts).

## Integrity and regressions

SHA-256 comparison confirms that both mathematical engines, API orchestration,
worker protocol/client, provenance/export code and control-coefficient catalog
are byte-for-byte unchanged. TypeScript syntax-tree comparison also confirms that
App's scientific presets, computation effect, execution handler, context handler
and input-validation handler remain unchanged, apart from line-ending normalization.
Only presentation formatters, language state and report rendering were changed.

All 188 final regression tests pass: 36 backend, 91 independent mathematical and
61 frontend tests, with zero failures or skips. The complete frontend suite was
run against the static production build. It covers existing controls/navigation/
execution and the added preference, blocked-storage, localized-error and report-format
cases. Type checking and the production build pass. Final command results are
recorded in the local logs.

With the application running, set `WAYQUANT_PLAYWRIGHT_MODULE` to the installed
Playwright `index.mjs` and `WAYQUANT_UX_URL` / `WAYQUANT_PRINT_URL` to the app origin.
Run `node --test --test-concurrency=1 frontend/tests/*.test.mjs`. Set
`WAYQUANT_INTERNATIONAL_OUTPUT` to an output directory to save the international
test's real PDF/JSON artifacts. The additional large/negative-ROSI smoke scenarios
are reproducible with `node frontend/tests/report-extremes.mjs` from the repository root.

Earlier iterations caught a mobile table overflow, obsolete English-only test
expectations and a lost English search alias in Russian mode. The overflow is now
contained in the report's mobile table viewport; print remains normal document
flow. Tests now check stable selected identifiers across languages and preserve
the bilingual search alias without displaying mixed-language labels. Initial
failures are retained rather than presented as passing runs.

## Modified files

- `frontend/src/App.tsx`: language preference, localized labels/formatters/error
  display, paper selector and integration of the report component.
- `frontend/src/international.ts`: storage fallback, locale formatters and localized
  user-facing error explanations; validation rules themselves are unchanged.
- `frontend/src/ExecutiveReport.tsx` and `executiveReport.css`: localized report,
  paper geometry, financial presentation and confirmed-run metadata.
- `frontend/src/searchIndex.ts`: localized metadata label and retained bilingual alias.
- `frontend/public/wayquant-mark-light.svg`: color-only variant of original paths.
- `frontend/tests/international-report.test.mjs`: real export/preference regressions.
- `frontend/tests/report-extremes.mjs`: reproducible large-value and negative-ROSI export smoke checks.
- `frontend/tests/print.test.mjs`, `layout.test.mjs`, `command-palette.test.mjs`:
  expected localized labels and stable identifier assertions.
- `README.md`, `CHANGELOG.md`, `docs/REPORTING.md`, this QA record: English public
  usage/release documentation and verification scope.

## Remaining boundaries

Browser print dialogs/printers can override CSS paper settings or add their own
headers/footers; users should confirm the requested paper and disable browser
headers/footers. Local storage preference is origin-specific. A public application
URL was not available, so PDF export from an actual public deployment is **NOT
VERIFIED**. This local report gate does not close the earlier deployment/security
verification gates. References and scientific limits are in [REPORTING.md](REPORTING.md).
