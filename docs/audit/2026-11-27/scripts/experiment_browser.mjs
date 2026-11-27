import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOpenFairMonteCarlo} from '../../../../frontend/src/engine.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const records=[];
for(const item of input) {
 const before=performance.now(),cpu=process.cpuUsage();
 const result=runOpenFairMonteCarlo(item.params,item.n,item.seed,item.threshold);
 const usage=process.cpuUsage(cpu);
 const nonzero=result.histogramBins.reduce((sum,b)=>sum+b.count,0);
 const zeros=Math.round(result.zeroLossProb/100*item.n);
 if(nonzero+zeros!==item.n)throw new Error('Iteration accounting mismatch');
 records.push({case:item.case,n:item.n,seed:item.seed,ale:result.ale,var95:result.var95,var99:result.var99,cvar99:result.cvar99,zero:result.zeroLossProb,thresholdExceedance:result.secMaterialityExceedProb,wallMs:performance.now()-before,cpuMs:(usage.user+usage.system)/1000,rssAfter:process.memoryUsage().rss});
}
fs.writeFileSync(path.join(root,'docs/audit/2026-11-27/evidence/browser-experiments.json'),JSON.stringify(records,null,2));
console.log(`Recorded ${records.length} browser-engine runs with exact sample-count accounting.`);
