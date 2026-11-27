"""Two isolated mutation experiments; never write to production engine files."""
import hashlib,importlib.util,json,math,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'docs/audit/2026-11-27/evidence';TEMP=ROOT/'.verification-audit/mutations';TEMP.mkdir(parents=True,exist_ok=True)
engine=ROOT/'backend/app/engine/fair_monte_carlo.py';browser=ROOT/'frontend/src/engine.js'
original={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [engine,browser]}
source=engine.read_text().replace('annual_total = annual_primary + annual_secondary','annual_total = annual_primary')
mutant=TEMP/'drop_secondary.py';mutant.write_text(source)
spec=importlib.util.spec_from_file_location('audit_mutant',mutant);module=importlib.util.module_from_spec(spec);sys.modules[spec.name]=module;spec.loader.exec_module(module)
c=module.OpenFairInput(1,1,1,plm_min=100,plm_mode=100,plm_max=100,slef_prob=1,slm_min=50,slm_mode=50,slm_max=50)
actual=module.FairMonteCarloEngine(c).run_simulation()['ale'];expected=150;bound=6*math.sqrt(150**2/c.iterations)
records=[{'mutation':'drop all secondary loss from annual total','expectedALE':expected,'observedMutantALE':actual,'sixSEBound':bound,'killed':abs(actual-expected)>bound}]
text=browser.read_text().replace('return arr[lo] + (arr[hi]-arr[lo])*(index-lo);','return 0;')
mutant=TEMP/'zero_quantiles.mjs';mutant.write_text(text)
js=f"import {{runOpenFairMonteCarlo as run}} from {json.dumps(mutant.as_uri())};const x=run({{lefMin:1,lefMode:1,lefMax:1,plmMin:100,plmMode:100,plmMax:100,slefProb:0,slmMin:0,slmMode:0,slmMax:0}},10000);console.log(JSON.stringify({{var95:x.var95,var99:x.var99}}));"
p=subprocess.run(['node','--input-type=module','-e',js],capture_output=True,text=True,check=True);r=json.loads(p.stdout)
records.append({'mutation':'replace every browser quantile with zero','reference':'Poisson(1) severity 100 has positive P95=300 and P99=400','observed':r,'killed':r['var95']==0 and r['var99']==0})
assert all(r['killed'] for r in records)
for path,digest in original.items():assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest
(OUT/'mutation-checks.json').write_text(json.dumps({'experiments':records,'productionFilesUnchanged':original},indent=2))
print('Both isolated mutants killed; original engines unchanged.')
for filename in ['drop_secondary.py','zero_quantiles.mjs']:
    (TEMP/filename).unlink(missing_ok=True)
