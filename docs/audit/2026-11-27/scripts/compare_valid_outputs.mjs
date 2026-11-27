import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOpenFairMonteCarlo as current} from '../../../../frontend/src/engine.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.join(root,'docs/audit/2026-11-27/evidence');
const baseline=await fs.readFile(path.join(out,'baseline-browser-engine.txt'),'utf8');
const {runOpenFairMonteCarlo:old}=await import(`data:text/javascript;base64,${Buffer.from(baseline).toString('base64')}`);
const jobs=JSON.parse(await fs.readFile(path.join(out,'experiment-inputs.json'),'utf8'));
for(const item of jobs){const a=old(item.params,item.n,item.seed,item.threshold),b=current(item.params,item.n,item.seed,item.threshold);delete a.elapsedMs;delete b.elapsedMs;assert.deepEqual(a,b);}
await fs.writeFile(path.join(out,'browser-valid-output-regression.json'),JSON.stringify({cases:jobs.length,matched:jobs.length,comparison:'Exact deep equality of every returned value except elapsedMs; same valid inputs and seeds, baseline vs current.'},null,2));
console.log(`All ${jobs.length} valid browser-engine outputs match the pre-audit engine exactly.`);
