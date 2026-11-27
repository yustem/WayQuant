import json, subprocess, shutil, os
from pathlib import Path
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'docs/audit/2026-11-27/evidence';reports=OUT/'reports'
poppler=os.environ.get('WAYQUANT_PDFTOPPM') or shutil.which('pdftoppm')
if not poppler: raise RuntimeError('Install Poppler or set WAYQUANT_PDFTOPPM')
records=[]
for pdf in sorted(reports.glob('final-*.pdf')):
    reader=PdfReader(pdf);texts=[p.extract_text() for p in reader.pages]
    assert len(texts)==2
    assert all(len(text)>500 for text in texts)
    assert not any(bad in '\n'.join(texts) for bad in ['NaN','Infinity','undefined'])
    p=subprocess.run([str(poppler),'-png','-scale-to','1500',str(pdf),str(reports/pdf.stem)],capture_output=True,text=True)
    assert p.returncode==0,p.stderr
    records.append({'pdf':pdf.name,'pages':len(texts),'textLengths':list(map(len,texts)),'status':'PASS','visualInspection':'Pending explicit image review; text/page checks alone do not establish visual quality.'})
(OUT/'pdf-validation.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print(json.dumps(records))
