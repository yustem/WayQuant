import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

test('global search navigates real targets in EN/RU without silently changing scenarios',
 {skip:!process.env.WAYQUANT_PLAYWRIGHT_MODULE},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/v1/simulate',route=>{requests.push(route.request().postDataJSON());return route.abort();});
  await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');
  await page.locator('.context-bar-metric').first().waitFor();
  const dialog=page.getByRole('dialog');
  const search=()=>dialog.getByRole('combobox');
  const open=async(query='')=>{await page.locator('.command-trigger').click();await search().fill(query);};
  const choose=async(id)=>{await dialog.locator(`[data-command-id="${id}"]`).click();await dialog.waitFor({state:'hidden'});};
  const highlight=async(selector)=>{await page.locator(`${selector}.search-target-highlight`).waitFor();};
  const selectedValue=id=>page.locator(id).evaluate(e=>e.previousElementSibling.value);
  const originalAsset=await selectedValue('#context-asset');
  const originalThreat=await selectedValue('#context-threat');
  const originalSeed=await page.locator('#context-seed').inputValue();

  for(const lang of ['EN','RU']) {
   await page.getByRole('button',{name:lang,exact:true}).click();
   await open();
   assert.equal(await dialog.locator('[data-command-id^="module-"]').count(),5);
   assert.equal(await dialog.locator('[data-command-id^="asset-"]').count(),8);
   assert.equal(await dialog.locator('[data-command-id^="threat-"]').count(),8);
   assert.equal(await dialog.locator('[data-command-id^="control-"]').count(),32);
   assert.ok(await dialog.locator('[data-command-id^="parameter-"]').count()>=17);
   assert.ok(await dialog.locator('[data-command-id^="report-"]').count()>=6);
   await search().fill('zzzz-no-entity-987');
   assert.equal(await dialog.getByRole('option').count(),0);
   assert.match(await dialog.innerText(),lang==='EN'?/No matching results/:/Совпадений не найдено/);
   await search().fill('vAr');
   assert.ok(await dialog.getByRole('option').count()>0,'Case-insensitive matching');
   await search().press('Escape');
   assert.equal(await page.locator('.command-trigger').evaluate(e=>e===document.activeElement),true);

   // Both modifier shortcuts work, focus is trapped, Escape restores its origin.
   await page.locator('#context-seed').focus();
   await page.keyboard.press('Control+k');await search().waitFor();
   assert.equal(await search().evaluate(e=>e===document.activeElement),true);
   await search().press('Tab');
   assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true);
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#context-seed').evaluate(e=>e===document.activeElement),true);
   await page.keyboard.press('Meta+k');await search().waitFor();
   await page.mouse.click(2,2);await dialog.waitFor({state:'hidden'});

   await open('LEF');await choose('parameter-lefMin');
   await highlight('#fair-lefMin');
   assert.equal(await page.locator('#fair-lefMin').evaluate(e=>e===document.activeElement),true);
   await open('lambda');await choose('parameter-plmGamma');await highlight('#fair-plmGamma');
   assert.equal(await page.locator('#fair-plmGamma input').evaluate(e=>e===document.activeElement),true);
   await open('ALE');await choose('metric-ale');await highlight('[data-search-target="ale"]');
   await open('EDR');await choose('control-ransomware-edr');await highlight('[data-search-control="edr"]');
   assert.equal(await page.locator('[data-search-control="edr"] button').getAttribute('aria-pressed'),'false','Search must not toggle controls');
   await open(lang==='EN'?'loss exceedance':'кривая');await choose('section-search-lec');await highlight('#search-lec');
   await open('Run Metadata');await choose('report-metadata');await highlight('[data-search-target="report-metadata"]');
   await open('Docker');await choose('architecture-docker');await highlight('[data-search-target="architecture-viewer"]');
   assert.match(await page.locator('[data-search-target="architecture-viewer"]').innerText(),/docker|Docker/);

   // Arrow keys and Enter navigate to the actual module, not a decorative match.
   await open('Open FAIR');await search().press('ArrowDown');await search().press('ArrowUp');
   const active=await search().getAttribute('aria-activedescendant');
   assert.equal(await dialog.locator('[aria-selected="true"]').getAttribute('id'),active);
   await search().press('Enter');await dialog.waitFor({state:'hidden'});
   assert.equal(await page.locator('.sidebar-navigation [aria-current="page"]').count(),1);
   const before=requests.length;
   await open('ACH');await choose('asset-ach_clearing');
   await page.locator('#context-asset[aria-expanded="true"]').waitFor();
   const assetOption=page.locator('.context-select-menu [data-active="true"]');
   assert.match(await assetOption.innerText(),lang==='EN'?/Federal ACH/:/Федеральный.*ACH/);
   assert.equal(await selectedValue('#context-asset'),originalAsset);
   await page.locator('#context-asset').press('Escape');
   await open(lang==='EN'?'DDoS':'DDoS');await choose('threat-ddos');
   await page.locator('#context-threat[aria-expanded="true"]').waitFor();
   assert.match(await page.locator('.context-select-menu [data-active="true"]').innerText(),/DDoS/);
   assert.equal(await selectedValue('#context-threat'),originalThreat);
   await page.locator('#context-threat').press('Escape');
   await open('UEBA');await choose('control-exfiltration-apt_ueba');
   await page.locator('#context-threat[aria-expanded="true"]').waitFor();
   assert.match(await page.locator('.context-select-menu [data-active="true"]').innerText(),/APT/);
   await page.locator('#context-threat').press('Escape');
   assert.equal(requests.length,before,'Search navigation must not execute or modify a model');
   assert.equal(await page.locator('#context-seed').inputValue(),originalSeed);
   if(process.env.WAYQUANT_SEARCH_OUTPUT) {
    await open(lang==='EN'?'risk':'риск');
    await fs.mkdir(process.env.WAYQUANT_SEARCH_OUTPUT,{recursive:true});
    await page.screenshot({path:path.join(process.env.WAYQUANT_SEARCH_OUTPUT,`palette-${lang}.png`)});
    await search().press('Escape');
   }
  }
  // A separate explicit option confirmation uses the existing context handler.
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await open();
  const destinations=await dialog.locator('[data-command-target]:not([aria-disabled="true"])').evaluateAll(es=>es.map(e=>({id:e.getAttribute('data-command-id'),selector:e.getAttribute('data-command-target')})));
  await search().press('Escape');
  for(const destination of destinations) {
   await open();await choose(destination.id);await highlight(destination.selector);
  }
  await open('ACH');await choose('asset-ach_clearing');
  await page.locator('#context-asset[aria-expanded="true"]').waitFor();
  await page.locator('#context-asset').press('Enter');
  assert.match(await page.locator('#context-asset').innerText(),/Federal ACH/);
  await page.waitForTimeout(1200);
  assert.ok(requests.length>1);
  assert.equal(requests.at(-1).random_seed,Number(originalSeed));
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('global execution from every module preserves the explicit seed, reproducibility and concurrency limits',
 {skip:!process.env.WAYQUANT_PLAYWRIGHT_MODULE},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:720}}),requests=[];
  await page.route('**/api/v1/simulate',async route=>{
   requests.push(route.request().postDataJSON());await new Promise(resolve=>setTimeout(resolve,400));
   try{await route.abort();}catch{} // A newer parameter edit may legitimately abort an older request.
  });
  await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');
  const execute=page.locator('.context-bar-actions button').last();
  const ready=()=>page.waitForFunction(()=>!document.querySelector('.context-bar-actions button:last-child').disabled);
  await ready();
  assert.equal(await page.locator('.workspace-content').getByRole('button',{name:/Run Simulation|Execute Simulation/}).count(),0);
  await page.locator('#context-iterations').click();await page.getByRole('option',{name:'25,000',exact:true}).click();
  await page.locator('#context-seed').fill('123456');await page.locator('#context-seed').blur();await ready();
  await page.waitForTimeout(900);await ready();
  const snapshot=async()=>{
   await page.locator('.sidebar-navigation button').nth(3).click();await page.locator('.report-pages').waitFor();
   const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Download Simulation Audit JSON',exact:true}).click();
   const file=await waiting;let json='';for await(const chunk of await file.createReadStream())json+=chunk;
   const data=JSON.parse(json);delete data.baseline.elapsedMs;delete data.residual.elapsedMs;
   return {baseline:data.baseline,residual:data.residual,governance:data.governance,request:data.request};
  };
  const expected=await snapshot();
  for(let module=0;module<5;module++) {
   await page.locator('.sidebar-navigation button').nth(module).click();const before=requests.length;
   await execute.click();
   await page.waitForFunction(()=>document.querySelector('.context-bar-actions button:last-child').disabled);
   assert.equal(await execute.getAttribute('aria-busy'),'true');
   assert.equal(await execute.locator('.animate-spin').count(),1);
   assert.match(await page.locator('.workspace-content h1').innerText(),/Simulation Dashboard/);
   // Attempt another synchronous click while busy; it must not queue a second job.
   await execute.evaluate(e=>{e.click();e.click();});
   await ready();
   assert.equal(requests.length,before+1,`module ${module}: exactly one execution`);
   assert.equal(requests.at(-1).iterations,25000);
   assert.equal(requests.at(-1).random_seed,123456);
   assert.equal(await page.locator('#context-seed').inputValue(),'123456');
   assert.deepEqual(await snapshot(),expected,`module ${module}: identical numerical results for identical inputs and seed`);
  }
 }finally{await browser.close();}
});
