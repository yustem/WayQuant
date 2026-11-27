# International reporting

WayQuant defaults to English on first use. An explicitly chosen English/Russian
preference is stored locally, per application origin. Invalid or unavailable
storage falls back to English without preventing language switching. No model
parameter is inferred from language or paper preferences.

The executive report reads the existing confirmed run, including baseline,
residual and governance outputs. It does not implement a second set of financial
equations. Changing language or paper format does not execute a simulation.
The complete audit JSON remains the reproducibility artifact; the PDF is an
executive summary of that same result.

## Paper and presentation

- A4 is the international default in both languages; US Letter is an explicit option.
- CSS requests the selected paper size with 19 mm (approximately 0.75 inch) margins.
  Browser/printer settings can override CSS; verify the print dialog's selection.
- The report uses a white background, a light-background variant of the original
  logo geometry, restrained separators and a single footer number per page.
- English uses American English dates and numeric separators. Russian uses its
  locale's dates and number separators. ISO currency identifiers are explicit.
  Currency values use the existing reporting units; no FX conversion is implied.
- Metadata includes the actual computational engine, version, run ID, seed,
  iteration count, selected context and relevant thresholds. The report date is
  the date of generation in the viewer's local timezone.
- Excluded controls show hypothetical costs; selected annual expenditure includes
  enabled controls only. Modeled benefits are estimates, not guaranteed savings.
- VaR95 is the 95th percentile of modeled annual losses, not an estimator confidence
  interval. ROSI is analysis of the selected scenario, not an optimization algorithm.

Technical identifiers, code excerpts, framework names, acronyms and ISO currency
codes intentionally retain their standardized forms across languages. Human-facing
labels, chart descriptions, report prose, search results and error explanations
use the selected language. Source code displayed in Architecture remains source code.

## Scientific references and boundaries

NIST references provide risk-management context; numerical control reductions are
scenario assumptions, not NIST estimates or certification. References checked:

- [NIST CSF 2.0, CSWP 29](https://doi.org/10.6028/NIST.CSWP.29), February 2024.
- [NIST SP 1303](https://csrc.nist.gov/pubs/sp/1303/final), October 2024,
  enterprise risk management integration guidance.
- [NIST IR 8286A Rev. 1](https://csrc.nist.gov/pubs/ir/8286/a/r1/final), December 2025,
  scenario identification, likelihood/impact estimation and risk registers.

These publications support terminology and contextual category references; they
do not establish empirical calibration of the preset coefficients. Full Open FAIR
standard-text conformance was not independently established. See the existing
[model contract](MODEL.md) for preserved assumptions and limitations.

Public deployment and printer-specific behavior require their own verification.
Local PDF exports do not establish successful exports from an unpublished public URL.
