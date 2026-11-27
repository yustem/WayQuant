import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
const fixture=JSON.parse(fs.readFileSync(new URL('../../docs/audit/2026-11-27/evidence/api-default.json',import.meta.url)));
const url=process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173';
const enabled=Boolean(process.env.WAYQUANT_PLAYWRIGHT_MODULE);

for(const [name,mutate] of [
 ['mismatched iteration count',data=>{data.baseline.iterations=1000;}],
 ['mismatched provenance seed',data=>{data.metadata.inputs.random_seed=7;}],
 ['negative financial loss',data=>{data.baseline.ale=-1;}],
 ['empty analytical arrays',data=>{data.baseline.lec_curve=[];data.baseline.percentiles=[];}],
 ['invalid exceedance probability',data=>{data.baseline.percentiles[0].exceed_prob=200;}]
]) test(`audit: reject ${name} rather than presenting success`,{skip:!enabled},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage(),data=structuredClone(fixture);mutate(data);
  await page.route('**/api/v1/simulate',route=>route.fulfill({json:data}));
  await page.goto(url);await page.waitForTimeout(900);
  assert.equal(await page.getByRole('alert').count(),1);
  assert.equal(await page.locator('.context-bar-metric').count(),0);
  assert.equal(await page.locator('.workspace-content').getByRole('button',{name:/Download Simulation Audit JSON/}).count(),0);
 }finally{await browser.close();}
});

test('audit: stalled API has bounded failure instead of indefinite computing',{skip:!enabled},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage();await page.clock.install();
  await page.route('**/api/v1/simulate',()=>{});
  await page.goto(url);await page.clock.runFor(800);await page.clock.fastForward(31000);
  assert.equal(await page.getByRole('alert').count(),1);
  assert.equal(await page.locator('.context-bar-actions button:last-child').isDisabled(),false);
  assert.equal(await page.locator('.context-bar-metric').count(),0);
 }finally{await browser.close();}
});

test('audit: previous metrics are explicitly marked when inputs change or calculation fails',{skip:!enabled},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage();let count=0;
  await page.route('**/api/v1/simulate',route=>++count===1?route.fulfill({json:fixture}):route.fulfill({status:500,body:'Injected failure'}));
  await page.goto(url);await page.locator('.context-bar-metric').first().waitFor();
  await page.locator('#context-seed').fill('42002');
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('.context-result-status').isVisible(),true);
  assert.match(await page.locator('.context-result-status').innerText(),/Previous result/);
 }finally{await browser.close();}
});

test('audit: an empty numeric draft is visibly uncommitted, not reported current',{skip:!enabled},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage();await page.route('**/api/v1/simulate',route=>route.fulfill({json:fixture}));
  await page.goto(url);await page.locator('.context-bar-metric').first().waitFor();
  await page.getByRole('button',{name:'1. Open FAIR Inputs',exact:false}).click();
  await page.locator('#fair-lefMin').fill('');
  assert.equal(await page.locator('[data-testid="invalid-draft-notice"]').count(),1);
  assert.equal(await page.locator('.context-result-status').isVisible(),true);
  await page.locator('#fair-lefMin').blur();
  assert.equal(await page.locator('#fair-lefMin').inputValue(),'0.25');
 }finally{await browser.close();}
});

test('audit: explicitly selecting seed zero must not silently substitute seed one',{skip:!enabled},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage(),requests=[];
  await page.route('**/api/v1/simulate',r=>{requests.push(r.request().postDataJSON());return r.abort();});
  await page.goto(url);await page.locator('.context-bar-metric').first().waitFor();
  await page.locator('#context-seed').fill('0');await page.locator('#context-seed').blur();
  assert.equal(await page.locator('#context-seed').inputValue(),'0');
  await page.waitForTimeout(1000);assert.equal(requests.at(-1).random_seed,0);
 }finally{await browser.close();}
});
