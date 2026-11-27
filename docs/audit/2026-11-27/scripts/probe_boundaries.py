import json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'backend'))
from fastapi.testclient import TestClient
from app.main import app
from app.engine.fair_monte_carlo import OpenFairInput

OUT=ROOT/'docs/audit/2026-11-27/evidence'
base={'lef_min':.25,'lef_mode':.85,'lef_max':2.4,'lef_gamma':4,'plm_min':180000,'plm_mode':650000,'plm_max':2400000,'plm_gamma':4,'slef_prob':.65,'slm_min':250000,'slm_mode':950000,'slm_max':8500000,'iterations':50000,'random_seed':42001,'sec_materiality_threshold':2500000,'controls':[]}
client=TestClient(app,raise_server_exceptions=False)
valid=client.post('/api/v1/simulate',json=base)
(OUT/'api-default.json').write_text(json.dumps(valid.json(),indent=2),encoding='utf-8')
cases=[]
for key,value in [('random_seed',True),('iterations','1000'),('lef_min',float('nan')),('plm_max',float('inf')),('slm_mode',None),('random_seed',-1),('slef_prob',1.1)]:
    payload={**base,key:value}
    response=client.post('/api/v1/simulate',content=json.dumps(payload),headers={'Content-Type':'application/json'})
    cases.append({'field':key,'value':str(value),'status':response.status_code,'body':response.text[:250]})
phase=sys.argv[1] if len(sys.argv)>1 else 'baseline'
(OUT/f'{phase}-boundary-probes.json').write_text(json.dumps(cases,indent=2),encoding='utf-8')
print(json.dumps(cases,indent=2))
