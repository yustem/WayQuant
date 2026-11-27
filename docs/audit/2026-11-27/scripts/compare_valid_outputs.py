import importlib.machinery,importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'docs/audit/2026-11-27/evidence';sys.path.insert(0,str(ROOT/'backend'))
from app.engine.fair_monte_carlo import FairMonteCarloEngine,OpenFairInput
loader=importlib.machinery.SourceFileLoader('audit_before_engine',str(OUT/'baseline-python-engine.txt'))
spec=importlib.util.spec_from_loader(loader.name,loader);old=importlib.util.module_from_spec(spec);sys.modules[spec.name]=old;loader.exec_module(old)
jobs=json.loads((OUT/'experiment-inputs.json').read_text())
for item in jobs:
 p=item['params'];kw=dict(lef_min=p['lefMin'],lef_mode=p['lefMode'],lef_max=p['lefMax'],lef_gamma=p.get('lefGamma',4),plm_min=p['plmMin'],plm_mode=p['plmMode'],plm_max=p['plmMax'],plm_gamma=p.get('plmGamma',4),slef_prob=p['slefProb'],slm_min=p['slmMin'],slm_mode=p['slmMode'],slm_max=p['slmMax'],iterations=item['n'],random_seed=item['seed'])
 a=old.FairMonteCarloEngine(old.OpenFairInput(**kw)).run_simulation();b=FairMonteCarloEngine(OpenFairInput(**kw)).run_simulation()
 a.pop('compute_time_ms');b.pop('compute_time_ms');assert a==b
(OUT/'python-valid-output-regression.json').write_text(json.dumps({'cases':len(jobs),'matched':len(jobs),'comparison':'Exact equality of every returned value except compute_time_ms; same valid inputs and seeds, pre-audit vs current.'},indent=2))
print(f'All {len(jobs)} valid Python-engine outputs match the pre-audit engine exactly.')
