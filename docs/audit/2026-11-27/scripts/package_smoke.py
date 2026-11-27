"""Build beforehand, install the wheel in an isolated target, then import away from source."""
import json, os, subprocess, sys, tempfile, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'docs/audit/2026-11-27/evidence'
wheel=next((ROOT/'.verification-audit/dist').glob('*.whl'))
target=ROOT/'.verification-audit/wheel-install'
p=subprocess.run([sys.executable,'-m','pip','install','--no-deps','--upgrade','--target',str(target),str(wheel)],capture_output=True,text=True,encoding='utf-8')
assert p.returncode==0,(p.returncode,p.stdout,p.stderr)
code='''import json,wayquant
from wayquant import OpenFairInput,FairMonteCarloEngine
c=OpenFairInput(0,0,0,random_seed=0)
r=FairMonteCarloEngine(c).run_simulation()
assert r['ale']==r['cyber_var_95']==r['cyber_var_99']==0
assert r['iterations']==50000
print(json.dumps({'module':wayquant.__file__,'ale':r['ale'],'iterations':r['iterations'],'seed':c.random_seed}))'''
with tempfile.TemporaryDirectory(prefix='wayquant-wheel-smoke-') as outside:
    q=subprocess.run([sys.executable,'-c',code],cwd=outside,env=dict(os.environ,PYTHONPATH=str(target),PYTHONUTF8='1'),capture_output=True,text=True,encoding='utf-8')
assert q.returncode==0,q.stderr
result={'status':'PASS','wheel':wheel.name,'isolatedTargetImport':json.loads(q.stdout),'scope':'Wheel with existing venv NumPy; not a fresh operating-system installation.'}
assert str(target) in result['isolatedTargetImport']['module']
with zipfile.ZipFile(wheel) as z:
    result['contents']=z.namelist()
(OUT/'package-smoke.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
