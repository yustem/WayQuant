"""Record an explicitly completed visual review; never infer it from PDF creation."""
import hashlib,json,sys
from datetime import datetime,timezone
from pathlib import Path
if '--confirm-reviewed' not in sys.argv:
    raise SystemExit('Inspect all eight current final PNG pages before passing --confirm-reviewed.')
OUT=Path(__file__).resolve().parents[1]/'evidence';records=[]
for variant in ['default','large']:
    for lang in ['EN','RU']:
        pdf=OUT/f'reports/final-{variant}-{lang}.pdf'
        pages=[]
        for page in [1,2]:
            png=pdf.with_name(f'{pdf.stem}-{page}.png');assert png.is_file() and png.stat().st_mtime>=pdf.stat().st_mtime
            pages.append({'file':png.relative_to(OUT).as_posix(),'sha256':hashlib.sha256(png.read_bytes()).hexdigest(),'status':'PASS','observation':'Individually viewed: chart/table/text present, monetary digits readable, no visible clipping, overlap or unintended blank page.'})
        records.append({'pdf':pdf.name,'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'pages':pages})
result={'reviewedUtc':datetime.now(timezone.utc).isoformat(),'method':'Assistant individually inspected each rendered page through local image viewing after the final browser export. This is visual evidence, not a user or external-expert certification.','layoutStatus':'PASS','localizationStatus':'PARTIAL','notes':['Russian disclaimer renders correctly; legacy report headings/sections remain English.','Long run IDs wrap within their metadata column; no characters are clipped.','Existing print template uses a text WayQuant heading rather than a graphical logo.'],'reports':records}
(OUT/'pdf-visual-review.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print('Recorded explicit visual review of all eight final report pages with source/image hashes.')
