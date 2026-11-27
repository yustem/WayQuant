import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPRNG, runOpenFairMonteCarlo as run} from '../src/engine.js';
import {exportConfirmedRun} from '../src/provenance.js';
const base={lefMin:1,lefMode:1,lefMax:1,plmMin:100,plmMode:100,plmMax:100,slefProb:0,slmMin:0,slmMode:0,slmMax:0};

test('Mulberry32 matches a BigInt state oracle for 12 million draws and repeats by seed',()=>{
 const rng=createPRNG(42001), repeat=createPRNG(42001);
 let state=42001n;
 for(let i=0;i<12000000;i++) {
   // BigInt makes the reference state independent of Number precision and wrapping.
   state=(state+0x6d2b79f5n)&0xffffffffn;
   const word=Number(state);
   const mixed=Math.imul(word^(word>>>15),word|1);
   const final=mixed^(mixed+Math.imul(mixed^(mixed>>>7),mixed|61));
   const expected=((final^(final>>>14))>>>0)/4294967296;
   const actual=rng();
   if(actual!==expected) assert.equal(actual,expected,`32-bit oracle mismatch at draw ${i+1}`);
   const repeated=repeat();
   if(actual!==repeated) assert.equal(actual,repeated,`seed mismatch at draw ${i+1}`);
 }
});

test('slefProb must be present as a finite probability',()=>{
 const missing={...base}; delete missing.slefProb;
 const invalid=[missing,...[undefined,null,NaN,Infinity,-Infinity,-.01,1.01,'0.5',true].map(slefProb=>({...base,slefProb}))];
 for(const params of invalid) {
   assert.throws(()=>run(params,1000),/Validation error: slefProb/);
 }
});

test('slefProb=0 disables nonzero secondary severity',()=>{
 const result=run({...base,slefProb:0,slmMin:100,slmMode:100,slmMax:100},10000);
 assert.equal(result.aleSecondary,0);
 assert.equal(result.ale,result.alePrimary);
 assert.ok(result.percentileTable.every(row=>row.secondary===0));
});

test('slefProb=1 applies constant secondary severity to every incident',()=>{
 const result=run({...base,plmMin:10,plmMode:10,plmMax:10,slefProb:1,slmMin:100,slmMode:100,slmMax:100},100000);
 assert.ok(result.aleSecondary>0);
 // Every incident has primary=10 and secondary=100, irrespective of Poisson count.
 assert.ok(Math.abs(result.aleSecondary-10*result.alePrimary)<1e-9);
 assert.ok(Math.abs(result.ale-result.alePrimary-result.aleSecondary)<1e-9);
 for(const row of result.percentileTable) {
   assert.ok(Math.abs(row.secondary-10*row.primary)<1e-9);
 }
 assert.ok(Math.abs(result.aleSecondary-100)<2);
});
test('zero loss, frequency, quantile ties and reproducibility',()=>{
 const zero=run({...base,plmMin:0,plmMode:0,plmMax:0,slefProb:1},10000);
 assert.equal(zero.ale,0);assert.equal(zero.zeroLossProb,100);
 assert.equal(zero.histogramBins.reduce((s,b)=>s+b.count,0),0);
 assert.equal(zero.percentileTable[0].exceedProb,0);
 assert.equal(run({...base,lefMin:0,lefMode:0,lefMax:0},1000).ale,0);
 const a=run(base,100000),b=run(base,100000);delete a.elapsedMs;delete b.elapsedMs;
 assert.deepEqual(a,b);assert.ok(Math.abs(a.ale-100)<2);
 assert.ok(a.var99>=a.var95 && a.var95>=a.var90);
 assert.ok(a.lecPoints.every((p,i,arr)=>!i||p.prob<=arr[i-1].prob));
});
test('shifted lognormal analytic expectation and P95',()=>{
 const a=20,m=100,q=500,z=1.6448536269514722,r=Math.log((q-a)/(m-a));
 const sigma=2*r/(Math.sqrt(z*z+4*r)+z),mu=Math.log(m-a)+sigma*sigma;
 const x=run({...base,plmMin:0,plmMode:0,plmMax:0,slefProb:1,slmMin:a,slmMode:m,slmMax:q},100000);
 const expected=a+Math.exp(mu+sigma*sigma/2);
 assert.ok(Math.abs(x.ale/expected-1)<.03);
 assert.ok(x.maxLoss<=x.histogramBins.at(-1).binEnd);
});
test('exact Poisson at large intensity and resource validation',()=>{
 const x=run({...base,lefMin:30,lefMode:30,lefMax:30},50000);
 assert.ok(Math.abs(x.ale/3000-1)<.01);
 assert.throws(()=>run({...base,lefMax:100},100000));
 assert.throws(()=>run(base,1000,-1));
});
test('export refuses stale/pending results and retains immutable inputs',()=>{
 const x={requestKey:'one',snapshot:{seed:1},metadata:{engine:'test'}};
 assert.throws(()=>exportConfirmedRun(x,'two',false));
 assert.throws(()=>exportConfirmedRun(x,'one',true));
 const y=exportConfirmedRun(x,'one',false);x.snapshot.seed=2;
 assert.equal(y.request.seed,1);
});
