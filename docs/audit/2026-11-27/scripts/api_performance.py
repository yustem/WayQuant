"""Bounded real loopback API benchmark; no remote service, proxy or forged result."""
import json,time,urllib.request,statistics
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'evidence'
payload=json.loads((OUT/'api-default.json').read_text())['metadata']['inputs']
payload['controls']=[];payload['random_seed']=0
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
records=[]
for n in [1000,10000,50000,250000]:
    expected=None
    for repeat in range(3):
        body=json.dumps({**payload,'iterations':n}).encode()
        request=urllib.request.Request('http://127.0.0.1:8000/api/v1/simulate',data=body,headers={'Content-Type':'application/json'})
        start=time.perf_counter()
        with opener.open(request,timeout=35) as response: data=json.load(response);status=response.status
        elapsed=(time.perf_counter()-start)*1000
        assert status==200 and data['baseline']['iterations']==n and data['metadata']['inputs']['random_seed']==0
        metrics={k:data['baseline'][k] for k in ['ale','cyber_var_95','cyber_var_99','tail_cvar_99']}
        if expected is None:expected=metrics
        assert metrics==expected
        records.append({'iterations':n,'repeat':repeat+1,'httpStatus':status,'wallMs':elapsed,'reportedCoreMs':data['baseline']['compute_time_ms'],'seed':0,'metrics':metrics})
(OUT/'api-performance.json').write_text(json.dumps({'requests':records,'summary':[{'iterations':n,'repeats':3,'medianHttpWallMs':statistics.median(r['wallMs'] for r in records if r['iterations']==n)} for n in [1000,10000,50000,250000]],'scope':'Sequential loopback requests against current project API; includes serialization; no controls; not sustained load or an Internet SLA.'},indent=2),encoding='utf-8')
print('12 real API benchmark requests passed; repeated seed-zero metric snapshots are identical at each iteration count.')
