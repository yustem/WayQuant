import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runOpenFairMonteCarlo as run} from '../src/engine.js';
const params={lefMin:1,lefMode:1,lefMax:1,plmMin:100,plmMode:100,plmMax:100,slefProb:0,slmMin:0,slmMode:0,slmMax:0};
for(const value of [NaN,-1,-Infinity,'100',null,true])test(`audit: reject invalid browser threshold ${String(value)}`,()=>{
 assert.throws(()=>run(params,1000,42,value),/threshold/i);
});
test('audit: positive Infinity retains the intentional disabled-threshold sentinel',()=>{
 assert.equal(run(params,1000,42,Infinity).secMaterialityExceedProb,0);
});
test('audit: nonfinite custom LEC thresholds cannot produce fabricated exceedance points',()=>{
 assert.throws(()=>run(params,1000,42,Infinity,[NaN]),/threshold/i);
});
