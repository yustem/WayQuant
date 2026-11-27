import json,sys
from dataclasses import asdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT/'backend'))
from fastapi.testclient import TestClient
from app.main import app
from app.engine.fair_monte_carlo import OpenFairInput
OUT=ROOT/'docs/audit/2026-11-27/evidence'
base=asdict(OpenFairInput(1,1,1,iterations=1000));client=TestClient(app,raise_server_exceptions=False);rows=[]
def check(name,updates,expected,drop=()):
 data={**base,**updates}
 for key in drop:data.pop(key,None)
 response=client.post('/api/v1/simulate',content=json.dumps(data),headers={'Content-Type':'application/json'})
 row={'case':name,'fields':{k:repr(v)[:120] for k,v in updates.items()},'omitted':list(drop),'expectedStatus':expected,'actualStatus':response.status_code,'status':'PASS' if response.status_code==expected else 'FAIL'}
 rows.append(row)
for field in base:
 for name,value in [('null',None),('negative',-1),('nan',float('nan')),('infinity',float('inf')),('wrong-object',{}),('wrong-array',[]),('boolean',True)]:check(f'{field}/{name}',{field:value},422)
for name,values in [
 ('iterations-too-small',{'iterations':999}),('iterations-too-large',{'iterations':250001}),('iterations-fractional',{'iterations':1000.5}),('seed-too-large',{'random_seed':4294967296}),
 ('probability-too-large',{'slef_prob':1.01}),('mode-below-min',{'lef_mode':.5}),('mode-above-max',{'lef_mode':2}),('shape-too-small',{'lef_gamma':.99}),('shape-too-large',{'plm_gamma':8.01}),
 ('rate-too-large',{'lef_min':101,'lef_mode':101,'lef_max':101}),('event-budget',{'lef_min':100,'lef_mode':100,'lef_max':100,'iterations':250000}),('severity-cap',{'plm_max':1e12+1}),('infeasible-lognormal',{'slm_min':0,'slm_mode':0,'slm_max':1}),('unsupported-sigma',{'slm_min':0,'slm_mode':1,'slm_max':1e12}),
 ('seed-string',{'random_seed':'1'}),('fraction-string',{'slef_prob':'0.5'})]:check(name,values,422)
for name,values in [('seed-zero',{'random_seed':0}),('seed-max',{'random_seed':4294967295}),('zero-frequency',{'lef_min':0,'lef_mode':0,'lef_max':0}),('zero-secondary',{'slm_min':0,'slm_mode':0,'slm_max':0}),('scientific-notation-severity',{'plm_min':1e3}),('small-positive',{'plm_min':1e-12})]:check(name,values,200)
control=dict(id='audit',annual_cost=1,lef_reduction=.1,plm_reduction=.1,slm_reduction=.1)
for key,value in [('annual_cost',-1),('annual_cost',1e12+1),('annual_cost','1'),('lef_reduction',-.1),('plm_reduction',.96),('slm_reduction',float('nan')),('enabled','true')]:check('control/'+key+'/'+str(value),{'controls':[{**control,key:value}]},422)
check('duplicate-controls',{'controls':[control,control]},422)
check('too-many-controls',{'controls':[{**control,'id':str(i)} for i in range(33)]},422)
for field in ['lef_min','lef_mode','lef_max','plm_min','plm_mode','plm_max','slm_min','slm_mode','slm_max']:check('missing/'+field,{},422,[field])
check('documented-optional-defaults',{},200,['iterations','random_seed','slef_prob','lef_gamma','plm_gamma','sec_materiality_threshold'])
(OUT/'validation-matrix.json').write_text(json.dumps({'cases':rows,'jsonUndefined':'NOT APPLICABLE: JSON has no undefined; omission is tested.','identifiers':'Asset/threat/currency identifiers are UI-owned closed catalogs, not backend fields; API accepts a numeric scenario contract.'},indent=2),encoding='utf-8')
assert all(row['status']=='PASS' for row in rows),[row for row in rows if row['status']=='FAIL']
cors={}
for origin in ['http://localhost:5173','https://example.invalid']:
 r=client.options('/api/v1/simulate',headers={'Origin':origin,'Access-Control-Request-Method':'POST'});cors[origin]={'status':r.status_code,'allowOrigin':r.headers.get('access-control-allow-origin')}
assert cors['http://localhost:5173']['allowOrigin']=='http://localhost:5173'
assert cors['https://example.invalid']['allowOrigin'] is None
(OUT/'cors.json').write_text(json.dumps(cors,indent=2))
print(json.dumps({'validationCases':len(rows),'passed':len(rows),'cors':'PASS'}))
