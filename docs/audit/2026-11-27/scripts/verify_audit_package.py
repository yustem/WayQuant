"""Verify local document links, final counts and artifact integrity without inventing checks."""
import hashlib,json,re
from pathlib import Path
AUDIT=Path(__file__).resolve().parents[1]
names=['FINAL_AUDIT_REPORT.md','MATHEMATICAL_VALIDATION.md','TEST_MATRIX.md','SECURITY_AND_RELIABILITY_REPORT.md','UI_UX_AUDIT.md','PERFORMANCE_REPORT.md','RELEASE_READINESS.md']
for name in names:assert (AUDIT/name).is_file(),name
links=0
for file in AUDIT.glob('*.md'):
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)',file.read_text(encoding='utf-8')):
        if target.startswith(('http:','https:','#')):continue
        assert (file.parent/target.split('#')[0]).exists(),(file.name,target)
        links+=1
summary=json.loads((AUDIT/'evidence/final-summary.json').read_text());assert summary['tests']=={'tests':186,'passed':186,'failed':0,'skipped':0}
findings=json.loads((AUDIT/'findings.json').read_text());assert findings['counts']['confirmed']==25 and findings['counts']['corrected']==24 and findings['counts']['unresolved']==1
visual=json.loads((AUDIT/'evidence/pdf-visual-review.json').read_text())
for report in visual['reports']:
    assert hashlib.sha256((AUDIT/'evidence/reports'/report['pdf']).read_bytes()).hexdigest()==report['sha256']
    for page in report['pages']:assert hashlib.sha256((AUDIT/'evidence'/page['file']).read_bytes()).hexdigest()==page['sha256']
manifest=[]
for file in sorted(AUDIT.rglob('*')):
    if file.is_file() and '__pycache__' not in file.parts and file.name!='audit-artifacts.json':
        data=file.read_bytes();manifest.append({'path':file.relative_to(AUDIT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(AUDIT/'evidence/audit-artifacts.json').write_text(json.dumps({'files':manifest,'notes':'Scope is this audit package, excluding Python caches and this manifest itself. Hashes detect changes, not author identity or external certification.'},indent=2),encoding='utf-8')
print(json.dumps({'requiredReports':len(names),'localLinksVerified':links,'artifactFiles':len(manifest),'artifactBytes':sum(x['bytes'] for x in manifest),'finalTests':summary['tests'],'findings':findings['counts']}))
