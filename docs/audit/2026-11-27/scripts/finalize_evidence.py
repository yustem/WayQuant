"""Summarize real final logs; fail if a required local check has not passed."""
import collections, hashlib, json, re, sys, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];AUDIT=ROOT/'docs/audit/2026-11-27';OUT=AUDIT/'evidence'
def read(name):return json.loads((OUT/name).read_text(encoding='utf-8'))
checks=read('final-checks.json');assert len(checks)==6 and all(x['returncode']==0 for x in checks)
totals={'tests':0,'passed':0,'failed':0,'skipped':0}
suites=[]
for file in ['final-pytest.xml','final-math.xml']:
    attrs=ET.parse(OUT/file).getroot().find('testsuite').attrib
    n=int(attrs['tests']);failed=int(attrs['failures'])+int(attrs['errors']);skipped=int(attrs['skipped'])
    suites.append({'evidence':file,'tests':n,'passed':n-failed-skipped,'failed':failed,'skipped':skipped})
log=(OUT/'final-frontend-tests.log').read_text(encoding='utf-8')
counts={k:int(re.search(r'\b'+k+r' (\d+)',log).group(1)) for k in ['tests','pass','fail','skipped']}
suites.append({'evidence':'final-frontend-tests.log','tests':counts['tests'],'passed':counts['pass'],'failed':counts['fail'],'skipped':counts['skipped']})
for row in suites:
    for key in totals:totals[key]+=row[key]
assert totals['failed']==totals['skipped']==0
axe=read('final-axe.json');assert len(axe)==10 and not any(row['violations'] for row in axe)
layouts=read('final-browser-layouts.json');assert len(layouts)==60 and not any(row['bodyOverflow'] for row in layouts)
reports=read('final-reports.json');assert len(reports)==4 and all(row['pages']==2 for row in reports)
matrix=read('validation-matrix.json');cases=matrix['cases'];assert all(x['status']=='PASS' for x in cases)
summary={'status':'PASS','tests':totals,'suites':suites,'validationCases':len(cases),'browserLayouts':len(layouts),'axeScans':len(axe),'axeViolations':0,'actualPdfExports':len(reports),'statisticalRuns':len(read('python-experiments.json'))+len(read('browser-experiments.json'))}
(OUT/'final-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
baseline={x['path']:x for x in read('baseline-manifest.json')}
paths={ROOT/path for path in baseline}
for folder in ['frontend/src','frontend/tests','tests','backend']:
    paths.update(p for p in (ROOT/folder).rglob('*') if p.suffix in {'.py','.js','.ts','.tsx','.mjs','.css'} and '__pycache__' not in p.parts)
current=[];changes=[]
patterns={'private-key':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),'aws-access-key':re.compile(r'\bAKIA[A-Z0-9]{16}\b'),'github-token':re.compile(r'\b(?:ghp|gho|ghs)_[A-Za-z0-9]{36,}\b')}
secret_hits=[]
for p in sorted(paths):
    rel=p.relative_to(ROOT).as_posix()
    if not p.is_file():changes.append({'path':rel,'change':'removed'});continue
    data=p.read_bytes();digest=hashlib.sha256(data).hexdigest();current.append({'path':rel,'bytes':len(data),'sha256':digest})
    if rel not in baseline:changes.append({'path':rel,'change':'added'})
    elif digest!=baseline[rel]['sha256']:changes.append({'path':rel,'change':'modified','before':baseline[rel]['sha256'],'after':digest})
    if p.suffix in {'.py','.js','.ts','.tsx','.mjs','.json','.md','.yml','.yaml','.bat','.ps1','.html','.conf'}:
        content=data.decode('utf-8',errors='replace')
        for name,pattern in patterns.items():
            n=len(pattern.findall(content))
            if n:secret_hits.append({'path':rel,'pattern':name,'count':n,'values':'REDACTED'})
(OUT/'final-source-manifest.json').write_text(json.dumps(current,indent=2),encoding='utf-8')
(OUT/'source-changes.json').write_text(json.dumps(changes,indent=2),encoding='utf-8')
(OUT/'static-security.json').write_text(json.dumps({'filesInScope':len(current),'credentialPatterns':list(patterns),'potentialCredentialHits':secret_hits,'limitations':'Small deterministic signature scan; not a full secret/history/SAST audit. No Git history exists.','productionReview':{'apiAuth':'absent; local-only use','tls':'external deployment responsibility','rateLimit':'concurrency gate only; no time-based client limiter','nginxBodyLimit':'64k on API location','dockerExecution':'NOT VERIFIED','publicDeployment':'NOT VERIFIED'}},indent=2),encoding='utf-8')
print(json.dumps(summary))
