import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

test('static deployment: subpath assets, real deterministic worker, no API, five modules and exports',
 {skip:!process.env.WAYQUANT_STATIC_URL||!process.env.WAYQUANT_PLAYWRIGHT_MODULE},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:1000}}),requests=[],failures=[],errors=[];
  await p.addInitScript(()=>{const RealWorker=window.Worker;window.__workerJobs=0;window.Worker=class extends RealWorker{postMessage(...args){window.__workerJobs++;return super.postMessage(...args);}};});
  p.on('request',r=>requests.push(r.url()));p.on('requestfailed',r=>failures.push(r.url()));p.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.WAYQUANT_STATIC_URL);await p.locator('.context-bar-metric').first().waitFor();
  const ready=()=>p.waitForFunction(()=>!document.querySelector('.context-bar-actions button:last-child').disabled);
  await ready();assert.equal(await p.locator('html').getAttribute('lang'),'en');
  assert.match(await p.locator('[data-testid="compute-engine-status"]').innerText(),/Browser worker/);
  assert.equal(await p.locator('.brand-symbol').evaluate(e=>e.complete&&e.naturalWidth>0),true);
  const readRun=async()=>{
   await p.locator('.sidebar-navigation button').nth(3).click();await p.locator('.report-pages').waitFor();
   const dl=p.waitForEvent('download');await p.locator('[data-search-target="report-json"]').click();let json='';const file=await dl;for await(const c of await file.createReadStream())json+=c;return JSON.parse(json);
  };
  const run=await readRun();assert.equal(run.metadata.engine,'browser-mulberry32');
  const q=run.request;const params={lefMin:q.lef_min,lefMode:q.lef_mode,lefMax:q.lef_max,lefGamma:q.lef_gamma,plmMin:q.plm_min,plmMode:q.plm_mode,plmMax:q.plm_max,plmGamma:q.plm_gamma,slefProb:q.slef_prob,slmMin:q.slm_min,slmMode:q.slm_mode,slmMax:q.slm_max};
  // Run the unbundled, audited engine in the same browser runtime: Math library
  // rounding may differ between Node and Chromium, even with the same PRNG.
  const engineSource=await fs.readFile(new URL('../src/engine.js',import.meta.url),'utf8');
  const reference=await p.evaluate(async({source,params,q})=>{
   const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
   try{return (await import(url)).runOpenFairMonteCarlo(params,q.iterations,q.random_seed,q.sec_materiality_threshold);}finally{URL.revokeObjectURL(url);}
  },{source:engineSource,params,q});
  const strip=x=>{const result=structuredClone(x);delete result.elapsedMs;return result;};
  assert.deepEqual(strip(run.baseline),strip(reference),'deployed bundled worker equals the audited local JS engine exactly');
  await p.locator('#context-seed').fill('0');await p.locator('#context-seed').blur();await ready();await p.waitForTimeout(600);await ready();
  const zero=await readRun();assert.equal(zero.request.random_seed,0);
  for(let module=0;module<5;module++){
   await p.locator('.sidebar-navigation button').nth(module).click();const before=await p.evaluate(()=>window.__workerJobs);
   const execute=p.locator('.context-bar-actions button').last();await execute.click();
   await p.waitForFunction(()=>document.querySelector('.context-bar-actions button:last-child').disabled);
   assert.equal(await execute.getAttribute('aria-busy'),'true');
   await execute.evaluate(e=>{e.click();e.click();});await ready();const repeated=await readRun();
   assert.equal(await p.evaluate(()=>window.__workerJobs),before+1,'busy duplicate clicks do not create additional jobs');
   assert.equal(repeated.request.random_seed,0);assert.deepEqual(strip(repeated.baseline),strip(zero.baseline));
  }
  for(const lang of ['EN','RU']){
   await p.getByRole('button',{name:lang,exact:true}).click();
   for(let module=0;module<5;module++){
    await p.locator('.sidebar-navigation button').nth(module).click();assert.ok((await p.locator('.workspace-content h1').innerText()).length);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const workspace=p.locator('.workspace-scroll');await workspace.evaluate(e=>e.scrollTop=0);
    const sidebarBefore=await p.locator('aside').boundingBox(),headerBefore=await p.locator('.context-header').boundingBox();
    const box=await workspace.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.wheel(0,800);await p.waitForTimeout(100);
    const scroll=await workspace.evaluate(e=>({top:e.scrollTop,overflows:e.scrollHeight>e.clientHeight}));if(scroll.overflows)assert.ok(scroll.top>0);
    assert.deepEqual(await p.locator('aside').boundingBox(),sidebarBefore);assert.deepEqual(await p.locator('.context-header').boundingBox(),headerBefore);assert.equal(await p.evaluate(()=>window.scrollY),0);
    await workspace.evaluate(e=>e.scrollTop=0);
    if(lang==='EN'&&process.env.WAYQUANT_STATIC_OUTPUT){await fs.mkdir(process.env.WAYQUANT_STATIC_OUTPUT,{recursive:true});await p.screenshot({path:path.join(process.env.WAYQUANT_STATIC_OUTPUT,`module-${module}.png`)});}
   }
   await p.locator('.command-trigger').click();await p.getByRole('dialog').getByRole('combobox').fill('ALE');assert.ok(await p.locator('.command-result').count());await p.keyboard.press('Escape');
  }
  await p.getByRole('button',{name:'EN',exact:true}).click();
  await p.locator('#context-asset').click();await p.getByRole('option',{name:'Federal ACH Clearing & Settlement Engine (DORA)',exact:true}).click();
  await p.locator('#context-threat').click();await p.getByRole('option',{name:'CI/CD Pipeline & Dependency Poisoning',exact:true}).click();await ready();
  await p.locator('#context-iterations').click();await p.getByRole('option',{name:'25,000',exact:true}).click();
  await p.locator('#context-currency').click();await p.getByRole('option',{name:'EUR (€)',exact:true}).click();await ready();
  await p.locator('.sidebar-navigation button').nth(2).click();await p.locator('[data-search-control] button').first().click();await ready();
  const controlled=await readRun();assert.equal(controlled.request.controls.length,1);assert.equal(controlled.request.context.currency,'EUR');assert.equal(controlled.request.iterations,25000);
  await p.locator('.sidebar-navigation button').first().click();
  const slider=p.getByRole('slider').first();const previous=await slider.inputValue();await slider.focus();await slider.press('ArrowRight');await slider.press('Tab');await p.waitForTimeout(600);await ready();
  assert.notEqual(await slider.inputValue(),previous,'real slider changes its parameter');
  await p.locator('.context-bar-actions button').first().click();await ready();const reset=await readRun();
  assert.deepEqual(reset.request,controlled.request,'Reset restores the selected asset/threat parameters and retains seed, iterations, currency and controls');
  assert.deepEqual(strip(reset.baseline),strip(controlled.baseline));
  for(const lang of ['EN','RU']){
   await p.getByRole('button',{name:lang,exact:true}).click();
   assert.equal(await p.locator('.report-heading img').evaluate(e=>e.complete&&e.naturalWidth>0),true);
   for(const paper of ['A4','Letter']){
    await p.locator('#report-paper').selectOption(paper);await p.emulateMedia({media:'print'});const pdf=await p.pdf({preferCSSPageSize:true,printBackground:true});assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,2);await p.emulateMedia({media:'screen'});
    if(process.env.WAYQUANT_STATIC_OUTPUT){await fs.mkdir(process.env.WAYQUANT_STATIC_OUTPUT,{recursive:true});await fs.writeFile(path.join(process.env.WAYQUANT_STATIC_OUTPUT,`public-${lang}-${paper}.pdf`),pdf);}
   }
  }
  for(const width of [1920,1280,390]){await p.setViewportSize({width,height:900});for(let module=0;module<5;module++){await p.locator('.sidebar-navigation button').nth(module).click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}}
  await p.setViewportSize({width:1440,height:1000});await p.getByRole('button',{name:'EN',exact:true}).click();await p.locator('.sidebar-navigation button').nth(1).click();
  if(process.env.WAYQUANT_STATIC_OUTPUT){await p.screenshot({path:path.join(process.env.WAYQUANT_STATIC_OUTPUT,'dashboard.png')});await fs.writeFile(path.join(process.env.WAYQUANT_STATIC_OUTPUT,'default-run.json'),JSON.stringify(run,null,2));}
  await p.reload();await p.locator('.context-bar-metric').first().waitFor();
  assert.deepEqual(requests.filter(u=>/\/api\/|localhost|127\.0\.0\.1:8000/.test(u)),[],'no API or loopback-backend requests');
  const origin=new URL(process.env.WAYQUANT_STATIC_URL).origin;assert.deepEqual([...new Set(requests.filter(u=>/^https?:/.test(u)).map(u=>new URL(u).origin))],[origin]);
  assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
