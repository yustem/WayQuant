"""Read-only inventory and non-destructive audit checkpoint; run from repo root."""
import hashlib, json, platform, shutil, subprocess, sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'docs/audit/2026-11-27/evidence'
CHECKPOINT = ROOT / '.verification-audit/checkpoint'
if (OUT/'baseline-manifest.json').exists():
    raise SystemExit('Baseline already exists; refusing to overwrite preserved pre-remediation evidence.')
EXCLUDED = {'.git', '.venv', 'venv', 'node_modules', 'dist', '__pycache__', '.pytest_cache', 'audit'}
manifest = []
for file in sorted(ROOT.rglob('*')):
    relative = file.relative_to(ROOT)
    if not file.is_file() or any(p in EXCLUDED or p.startswith('.verification-') for p in relative.parts):
        continue
    data = file.read_bytes()
    manifest.append({'path': relative.as_posix(), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    destination = CHECKPOINT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists(): shutil.copy2(file, destination)
OUT.mkdir(parents=True, exist_ok=True)
(OUT/'baseline-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
git = shutil.which('git') or str(Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe')
commands = {
    'git_status': [git,'status','--short','--branch'],
    'git_commit': [git,'rev-parse','HEAD'],
    'node': ['node','--version'],
    'npm': ['cmd.exe','/d','/c','npm.cmd','--version'],
    'pip_freeze': [sys.executable,'-m','pip','freeze'],
}
results = {'captured_utc':datetime.now(timezone.utc).isoformat(), 'platform':platform.platform(), 'python':sys.version,
           'root':str(ROOT), 'checkpoint':str(CHECKPOINT), 'files':len(manifest),
           'baseline_notes':['No .git directory present; branch/commit/diff unavailable.',
               'Initial pytest invocation failed: local venv lacked pytest. Installing audit/test tools without changing application dependency files.',
               'Latest toolbar/search work is included in this audit baseline; prior .verification-* checkpoints preserved.']}
for name, command in commands.items():
    try:
        p = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=60)
        results[name] = {'command':command,'returncode':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
    except Exception as exc: results[name] = {'error':str(exc)}
(OUT/'baseline-environment.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(f'Captured {len(manifest)} source files; checkpoint preserved at {CHECKPOINT}. Git unavailable: repository has no .git directory.')
