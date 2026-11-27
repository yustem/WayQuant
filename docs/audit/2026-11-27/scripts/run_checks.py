"""Run original tests/builds with UTF-8 logs and machine-readable command results."""
import json, os, subprocess, sys, time, shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'docs/audit/2026-11-27/evidence'
phase=sys.argv[1] if len(sys.argv)>1 else 'baseline'
runtime=Path(os.environ.get('WAYQUANT_PLAYWRIGHT_MODULE',ROOT/'.verification-audit/tools/node_modules/playwright/index.mjs'))
if not runtime.is_file(): raise RuntimeError('Set WAYQUANT_PLAYWRIGHT_MODULE to an installed Playwright index.mjs')
npm=shutil.which('npm.cmd' if os.name=='nt' else 'npm')
if not npm: raise RuntimeError('npm is required')
env=dict(os.environ,PYTHONUTF8='1',WAYQUANT_PLAYWRIGHT_MODULE=str(runtime),WAYQUANT_UX_URL='http://127.0.0.1:5173',WAYQUANT_PRINT_URL='http://127.0.0.1:5173')
commands=[
 ('python-tests',[sys.executable,'-m','pytest','-q','--junitxml='+str(OUT/f'{phase}-pytest.xml')],ROOT),
 ('independent-math',[sys.executable,'-m','pytest','-q','-p','no:cacheprovider',str(Path(__file__).with_name('test_independent_math.py')),'--junitxml='+str(OUT/f'{phase}-math.xml')],ROOT),
 ('typecheck',[npm,'run','typecheck'],ROOT/'frontend'),
 ('frontend-tests',['node','--test','--test-concurrency=1','--test-reporter=spec',*[str(p) for p in sorted((ROOT/'frontend/tests').glob('*.test.mjs'))]],ROOT),
 ('build',[npm,'run','build'],ROOT/'frontend'),
 ('pip-check',[sys.executable,'-m','pip','check'],ROOT),
]
results=[]
for name,command,cwd in commands:
    started=time.perf_counter()
    try:
        p=subprocess.run(command,cwd=cwd,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=300)
        log=p.stdout+'\nSTDERR:\n'+p.stderr
        result={'name':name,'command':command,'returncode':p.returncode,'seconds':round(time.perf_counter()-started,3)}
    except subprocess.TimeoutExpired as exc:
        log=str(exc);result={'name':name,'returncode':None,'error':'timeout'}
    (OUT/f'{phase}-{name}.log').write_text(log,encoding='utf-8')
    results.append(result)
    (OUT/f'{phase}-checks.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print(json.dumps(result),flush=True)
print('No lint script/configuration is present in package.json; lint is NOT VERIFIED (not silently treated as passed).',flush=True)
