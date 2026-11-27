"""Build the final registry from the preserved before-fix findings and actual evidence."""
import collections,json,re
from pathlib import Path
AUDIT=Path(__file__).resolve().parents[1]
before={}
for line in (AUDIT/'FINDINGS_WORKING.md').read_text(encoding='utf-8').splitlines():
    if line.startswith('| WQ-'):
        match=re.match(r'\| (WQ-\d+) \| (P\d) \| [A-Z]+ \| (.*) \|\s*$',line)
        assert match,line
        before[match[1]]={'severity':match[2],'reproduction':match[3]}
rows=[
 ('frontend/src/App.tsx','computation useEffect','Reliability','No deadline across API/worker execution','Abort after 30 seconds, stop loading, retain a visible error and allow retry','baseline-added-reliability.log','final-frontend-tests.log'),
 ('frontend/src/apiValidation.ts','validateSimulationResponse (called by App computation effect)','Provenance','Only shallow finite-value checks on the API result','Validate requested iterations, input/control provenance, metric domains and analytical structures before committing results','baseline-added-reliability.log','final-frontend-tests.log'),
 ('backend/app/main.py','safe_validation_error','API validation','Default error serialization reflected nonfinite input/context','Return field locations/types/messages as safe 422 JSON','baseline-boundary-probes.json','final-pytest.xml'),
 ('backend/app/main.py','ControlItem / SimulationRequest','API validation','Pydantic coercion conflicted with strict numeric contract','Require canonical JSON types; preserve ordinary integer-to-float numeric compatibility','baseline-float-coercion.log','validation-matrix.json'),
 ('frontend/src/workerClient.ts','runInWorker','Resource cleanup','Synchronous postMessage exception bypassed termination','Catch postMessage errors and use common cleanup','baseline-worker-cleanup.log','final-frontend-tests.log'),
 ('frontend/src/App.tsx','resultsReady / context-result-status','Result freshness','Fixed toolbar omitted stale-result status','Label previous results during changes, invalid drafts, loading and errors','baseline-freshness.log','final-frontend-tests.log'),
 ('frontend/src/App.tsx','hasInvalidFairDraft / resultsReady','Input presentation','Uncommitted drafts were not visibly distinguished','Disclose restoration on blur and block result-ready/export state for invalid drafts','baseline-freshness.log','final-frontend-tests.log'),
 ('frontend/src/App.tsx','I18N / MiniDistributionCurve / histogram presentation','Scientific disclosure','A schematic preview and bin mass could be interpreted as numerical density','Label schematic illustration and conditional histogram bin probability mass','baseline-disclosures.log','final-frontend-tests.log'),
 ('docker-compose.yml','services.api.ports','Deployment','Host API port published on all interfaces','Bind host API port to loopback; preserve container network routing','baseline-deployment-policy.log','final-pytest.xml'),
 ('.venv','local pip installer','Dependency security','Outdated local installer with advisory records','Update only local pip from 25.0.1 to 26.3 and rescan; no bulk runtime upgrades','pip-audit.json','pip-audit-fixed.json'),
 ('frontend/src/App.tsx','I18N.archTab.subtitle','Documentation','Both language descriptions overstated production dependencies','Describe the actual NumPy core; SciPy is an audit oracle only','baseline-ru-architecture.log','final-frontend-tests.log'),
 ('frontend/src/App.tsx','FAIR decomposition / LEC / percentile table','Scientific disclosure','Compact mnemonic and chart conventions lacked qualification','Add annual event-sum definition, nonadditive marginal-quantile note and 10000 log-domain floor disclosure','baseline-disclosures.log','final-frontend-tests.log'),
 ('frontend/src/App.tsx','threshold metric / sidebar currency helper','Units','Hardcoded USD and missing no-conversion disclosure','Use selected unit symbol; disclose that currency selection does not convert values','baseline-disclosures.log','final-frontend-tests.log'),
 ('frontend/src/App.tsx','context-bar-actions Execute title','Accessibility','Accessible iteration caption used a hardcoded count','Derive caption from current iteration state','baseline-accessibility-interactions.log','final-frontend-tests.log'),
 ('frontend/src/CommandPalette.tsx; frontend/src/index.css; frontend/src/commandPalette.css','toolbar accessible names / color pairs','Accessibility','Names did not contain visible labels; demonstrated low-contrast pairs','Align names and visible text; separate decorative shortcut hint; adjust proven color failures','review-axe.json','final-axe.json'),
 ('frontend/src/App.tsx; frontend/src/index.css','report-kpi monetary typography','Print layout','Large numbers exceeded print-media KPI boxes','Use smaller type only for long formatted monetary values and a wrapping fallback','print-geometry.log','final-print-geometry.json'),
 ('frontend/index.html','font stylesheet links','Offline operation','Unnecessary external Google Fonts request','Remove external stylesheet and use existing system fallback stack','review2-browser-performance.json','final-browser-performance.json'),
 ('frontend/src/App.tsx','LECChart / AnnualLossHistogram keyboard handlers','Chart accessibility','Point data available only through pointer hover','Focusable named SVGs; arrows/Home/End/Escape and live readout of existing data','baseline-accessibility-interactions.log','final-frontend-tests.log'),
 ('frontend/src/App.tsx','executeSimulation / executionLock','Execution behavior','Navigation-only global action and hidden +137 seed update','User-authorized correction: run from every module with configured seed, navigate to dashboard, gate concurrent clicks','global-execution-correction.log','final-frontend-tests.log'),
 ('frontend/src/App.tsx','language useEffect','Localization accessibility','HTML language remained English after switching RU','Synchronize document language with selected presentation language','baseline-accessibility-interactions.log','final-frontend-tests.log'),
 ('frontend/src/engine.js; backend/app/engine/fair_monte_carlo.py','runOpenFairMonteCarlo / run_simulation','Engine validation','Explicit invalid query thresholds reached computation','Validate finite nonnegative custom LEC thresholds; preserve browser Infinity sentinel for optional query','baseline-engine-threshold.log','final-math.xml'),
 ('frontend/src/App.tsx','LECChart domain expansion','Chart reliability','Finite appetite multiplied by 1.15 overflowed the SVG domain','Saturate display expansion only; preserve threshold and all calculated values','baseline-extreme-appetite.log','final-frontend-tests.log'),
 ('frontend/src/App.tsx','context-seed onChange','Seed integrity','Number(value) || 1 replaced explicitly supported zero','Preserve zero; disclose existing blank-input fallback to one','baseline-zero-seed.log','final-frontend-tests.log'),
 ('.github/workflows/ci.yml; frontend/tests/*.test.mjs','browser regression job / browser launch options','CI coverage','Default npm test silently skipped opt-in browser regressions','Explicit isolated pinned Playwright, enabled environment and portable browser selection; remote Linux execution pending','baseline-frontend-tests.log','final-frontend-tests.log'),
 ('frontend/src/App.tsx','App / Bottom Engine Telemetry Footer','Computational provenance','Static online/server labels contradicted real worker and error paths','Show actual API/worker source only for current results, neutral computing, previous/no-result/error states in EN/RU','baseline-engine-status.log','final-frontend-tests.log'),
]
records=[]
for n,row in enumerate(rows,1):
    ident=f'WQ-{n:03}';file,fn,subsystem,cause,fix,old,new=row
    for evidence in [old,new]:assert (AUDIT/'evidence'/evidence).is_file(),evidence
    records.append({'id':ident,**before[ident],'subsystem':subsystem,'file':file,'function':fn,'rootCause':cause,'impact':before[ident]['reproduction'],'expectedBehavior':fix,'remediation':fix,'status':'PARTIAL' if n==24 else 'FIXED','regressionStatus':'PARTIAL' if n==24 else 'PASS','beforeEvidence':'evidence/'+old,'afterEvidence':'evidence/'+new,'remaining':'Run the actual GitHub-hosted Ubuntu job on a real repository/commit.' if n==24 else None})
counts={'confirmed':len(records),'bySeverity':dict(collections.Counter(x['severity'] for x in records)),'corrected':sum(x['status']=='FIXED' for x in records),'unresolved':sum(x['status']!='FIXED' for x in records)}
(AUDIT/'findings.json').write_text(json.dumps({'counts':counts,'findings':records},indent=2,ensure_ascii=False),encoding='utf-8')
lines=['# Final findings registry','','The preserved [before-fix record](FINDINGS_WORKING.md) documents observed failures. This registry is the final status; PARTIAL is not counted as corrected.','','| ID | Severity | Subsystem / exact location | Root cause and correction | Final status | Before / after evidence |','|---|---|---|---|---|---|']
for x in records:lines.append(f"| {x['id']} | {x['severity']} | `{x['file']}` — `{x['function']}` | {x['rootCause']}. {x['remediation']}. | {x['status']} | [before]({x['beforeEvidence']}) / [after]({x['afterEvidence']}) |")
(AUDIT/'FINDINGS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps(counts))
