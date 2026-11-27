"""Stop only verified audit-owned Vite processes, then probe both main services."""
import json,shutil,urllib.request
from pathlib import Path
import psutil
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'docs/audit/2026-11-27/evidence'
for name,port in [('preview.pid',4176),('checkpoint-vite.pid',4178)]:
    file=ROOT/'.verification-audit'/name
    if not file.exists():continue
    pid=int(file.read_text().strip())
    if not psutil.pid_exists(pid):continue
    process=psutil.Process(pid);args=process.cmdline()
    assert len(args)>2 and Path(args[1]).resolve()==(ROOT/'frontend/node_modules/vite/bin/vite.js').resolve(),args
    assert args[args.index('--port')+1]==str(port),args
    process.terminate();process.wait(timeout=5)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}));results={}
for port in [4176,4178,5173,8000]:
    try:
        route='/api/v1/health' if port==8000 else '/'
        with opener.open(f'http://127.0.0.1:{port}{route}',timeout=2) as response:results[str(port)]={'reachable':True,'status':response.status}
    except Exception as error:results[str(port)]={'reachable':False,'reason':type(error).__name__}
assert results['5173']['reachable'] and results['8000']['reachable']
assert not results['4176']['reachable'] and not results['4178']['reachable']
results['dockerCommandAvailable']=shutil.which('docker') is not None
(OUT/'final-services.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results))
