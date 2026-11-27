import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const enabled=!!process.env.WAYQUANT_PLAYWRIGHT_MODULE;
test('international defaults, persistent preference, safe storage fallback and localized errors',{skip:!enabled},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined});
 try {
  const context=await browser.newContext(),page=await context.newPage();let count=0;
  await page.route('**/api/v1/simulate',r=>{count++;return r.fulfill({status:422,json:{detail:[{msg:'SLM requires floor < mode < P95'}]}});});
  await page.goto(process.env.WAYQUANT_UX_URL);await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  const before=count;await page.getByRole('button',{name:'RU',exact:true}).click();
  assert.match(await page.getByRole('alert').innerText(),/Проверьте вторичный ущерб/);
  assert.equal(count,before,'language must not trigger computation');
  const state=await context.storageState();await context.close();
  const restored=await browser.newContext({storageState:state}),p=await restored.newPage();
  await p.goto(process.env.WAYQUANT_UX_URL);await p.locator('.sidebar-navigation').waitFor();assert.equal(await p.locator('html').getAttribute('lang'),'ru');
  await restored.close();
  const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}}));
  const b=await blocked.newPage();await b.goto(process.env.WAYQUANT_UX_URL);await b.locator('.sidebar-navigation').waitFor();assert.equal(await b.locator('html').getAttribute('lang'),'en');await b.getByRole('button',{name:'RU',exact:true}).click();assert.equal(await b.locator('html').getAttribute('lang'),'ru');await blocked.close();
 }finally{await browser.close();}
});

test('real executive reports preserve result values across EN/RU and A4/Letter',{skip:!enabled},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined});
 const out=process.env.WAYQUANT_INTERNATIONAL_OUTPUT;
 try {
  for(const engine of ['api','worker']) {
   const page=await browser.newPage({viewport:{width:1440,height:1000}});
   if(engine==='worker')await page.route('**/api/v1/simulate',r=>r.abort());
   await page.goto(process.env.WAYQUANT_UX_URL);await page.locator('.context-bar-metric').first().waitFor();
   for(const variant of ['default','long']){
    if(variant==='long'){
     await page.locator('#context-asset').click();await page.getByRole('option',{name:'Federal ACH Clearing & Settlement Engine (DORA)',exact:true}).click();
     await page.locator('#context-threat').click();await page.getByRole('option',{name:'CI/CD Pipeline & Dependency Poisoning',exact:true}).click();
     await page.locator('#context-currency').click();await page.getByRole('option',{name:'EUR (€)',exact:true}).click();
     await page.locator('#context-iterations').click();await page.getByRole('option',{name:'25,000',exact:true}).click();
     await page.locator('#context-seed').fill('0');await page.locator('#context-seed').blur();
     await page.locator('.sidebar-navigation button').nth(2).click();await page.locator('[data-search-control] button').first().waitFor();
     await page.locator('[data-search-control] button').first().click();
     await page.waitForFunction(()=>!document.querySelector('.context-bar-actions button:last-child').disabled);
    }
    await page.locator('.sidebar-navigation button').nth(3).click();await page.locator('.report-pages').waitFor();
    const dl=page.waitForEvent('download');await page.locator('[data-search-target="report-json"]').click();const download=await dl;let json='';for await(const chunk of await download.createReadStream())json+=chunk;const run=JSON.parse(json);
    if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,`${engine}-${variant}.json`),json);}
    for(const lang of ['EN','RU']){
     await page.getByRole('button',{name:lang,exact:true}).click();
     assert.equal(await page.locator('#report-paper').inputValue(),'A4');
     for(const paper of ['A4','Letter']){
      await page.locator('#report-paper').selectOption(paper);
      const text=await page.locator('.report-pages').innerText();
      assert.equal((text.match(lang==='EN'?/Page [12] of 2/g:/Страница [12] из 2/g)||[]).length,2);
      assert.ok(!/STRICTLY CONFIDENTIAL|Optimization|95% confidence/.test(text));
      if(lang==='RU')assert.ok(!/Baseline|Expected|Annual|ACTIVE|EXCLUDED|Run Metadata|Loss Threshold/.test(text));
      assert.ok(text.includes(run.runId));assert.ok(text.includes(engine==='api'?'NumPy':'Mulberry32'));
      const currency=run.request.context.currency,locale=lang==='EN'?'en-US':'ru-RU';
      for(const value of [run.baseline.ale,run.baseline.var95,run.residual.var95,run.governance.netBenefit])assert.ok(text.includes(new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:0}).format(value)));
      await page.emulateMedia({media:'print'});const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
      assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,2,`${engine}/${variant}/${lang}/${paper}`);
      const overflow=await page.locator('.report-pages').evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(overflow,false);
      if(out)await fs.writeFile(path.join(out,`${engine}-${variant}-${lang}-${paper}.pdf`),pdf);
      await page.emulateMedia({media:'screen'});
     }
     await page.locator('#report-paper').selectOption('A4');
    }
    await page.getByRole('button',{name:'EN',exact:true}).click();
   }
   await page.close();
  }
 }finally{await browser.close();}
});
