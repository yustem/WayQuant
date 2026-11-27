"""Reproducible convergence, parity and observed resource measurements."""
import importlib.util,json,math,statistics,subprocess,sys,time,threading
from pathlib import Path
import psutil
import numpy as np
from scipy import stats
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'docs/audit/2026-11-27/evidence'
sys.path.insert(0,str(Path(__file__).parent));sys.path.insert(0,str(ROOT/'backend'))
from test_independent_math import cfg,moments,pert,lognormal_reference
from app.engine.fair_monte_carlo import FairMonteCarloEngine,OpenFairInput

fixture=json.loads((OUT/'ui-fixtures.json').read_text(encoding='utf-8'))
heavy=fixture['presets']['payment_gw']['ransomware']
constant=dict(lefMin=1,lefMode=1,lefMax=1,lefGamma=4,plmMin=100,plmMode=100,plmMax=100,plmGamma=4,slefProb=0,slmMin=0,slmMode=0,slmMax=0)
cases={'constant-poisson':constant,'synthetic-heavy-tail':heavy}
counts=[1000,10000,50000,100000,250000];seeds=[11,103,1009,42001,65537,100003,777777,4294967295]
jobs=[{'case':name,'params':params,'n':n,'seed':seed,'threshold':2500000} for name,params in cases.items() for n in counts for seed in seeds]
(OUT/'experiment-inputs.json').write_text(json.dumps(jobs,indent=2),encoding='utf-8')
records=[];process=psutil.Process();peak=[process.memory_info().rss];running=[True]
def monitor():
 while running[0]:peak[0]=max(peak[0],process.memory_info().rss);time.sleep(.002)
thread=threading.Thread(target=monitor,daemon=True);thread.start()
for item in jobs:
 p=item['params'];c=OpenFairInput(p['lefMin'],p['lefMode'],p['lefMax'],lef_gamma=p.get('lefGamma',4),plm_min=p['plmMin'],plm_mode=p['plmMode'],plm_max=p['plmMax'],plm_gamma=p.get('plmGamma',4),slef_prob=p['slefProb'],slm_min=p['slmMin'],slm_mode=p['slmMode'],slm_max=p['slmMax'],iterations=item['n'],random_seed=item['seed'])
 expected,variance=moments(c)
 start=time.perf_counter();cpu=time.process_time();result=FairMonteCarloEngine(c).run_simulation()
 record={'case':item['case'],'n':item['n'],'seed':item['seed'],'ale':result['ale'],'var95':result['cyber_var_95'],'var99':result['cyber_var_99'],'cvar99':result['tail_cvar_99'],'zero':result['zero_loss_prob_pct'],'wallMs':(time.perf_counter()-start)*1000,'cpuMs':(time.process_time()-cpu)*1000,'rssAfter':process.memory_info().rss,'expectedALE':expected,'aleSE':math.sqrt(variance/item['n'])}
 assert abs(record['ale']-expected)<=6*record['aleSE']+.01
 records.append(record)
running[0]=False;thread.join()
(OUT/'python-experiments.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
p=subprocess.run(['node',str(Path(__file__).with_name('experiment_browser.mjs')),str(OUT/'experiment-inputs.json')],cwd=ROOT,capture_output=True,text=True,timeout=240)
(OUT/'browser-experiments.log').write_text(p.stdout+p.stderr,encoding='utf-8');assert p.returncode==0,p.stderr
browser=json.loads((OUT/'browser-experiments.json').read_text())
for b,a in zip(browser,records):assert abs(b['ale']-a['expectedALE'])<=6*a['aleSE']+1e-7
summary=[]
for engine,data in [('numpy',records),('browser',browser)]:
 for name in cases:
  for n in counts:
   rows=[r for r in data if r['case']==name and r['n']==n]
   ref=next(r for r in records if r['case']==name and r['n']==n)
   summary.append({'engine':engine,'case':name,'n':n,'seeds':len(rows),'meanALE':statistics.mean(r['ale'] for r in rows),'expectedALE':ref['expectedALE'],'aleRMSE':math.sqrt(statistics.mean((r['ale']-ref['expectedALE'])**2 for r in rows)),'var95Range':[min(r['var95'] for r in rows),max(r['var95'] for r in rows)],'var99Range':[min(r['var99'] for r in rows),max(r['var99'] for r in rows)],'cvar99Range':[min(r['cvar99'] for r in rows),max(r['cvar99'] for r in rows)],'medianWallMs':statistics.median(r['wallMs'] for r in rows),'maxObservedRssAfter':max(r['rssAfter'] for r in rows)})
for row in summary:
 if row['case']=='constant-poisson':
  row['exactVaR95']=float(stats.poisson.ppf(.95,1)*100);row['exactVaR99']=float(stats.poisson.ppf(.99,1)*100)
  q=stats.poisson.ppf(.99,1)
  row['exactRankLimitES99']=100*(stats.poisson.sf(q-1,1)+q*(.01-stats.poisson.sf(q,1)))/.01
(OUT/'convergence-summary.json').write_text(json.dumps({'runsPerEngine':len(jobs),'numpySampledPeakRssBytes':peak[0],'rssSamplingIntervalMs':2,'note':'Node records end-of-run RSS, not peak; measurements include runtime/cache and are not isolated container guarantees. Tail ranges are observed across eight seeds, not confidence intervals.','summary':summary},indent=2),encoding='utf-8')
print(json.dumps({'pythonRuns':len(records),'browserRuns':len(browser),'sixSEMeanChecks':'PASS','numpySampledPeakRssBytes':peak[0]}))
