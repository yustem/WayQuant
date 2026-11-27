import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.join(root,'docs/audit/2026-11-27/evidence');
const playwright=process.env.WAYQUANT_PLAYWRIGHT_MODULE;
if(!playwright)throw new Error('Set WAYQUANT_PLAYWRIGHT_MODULE to an installed Playwright index.mjs.');
const {chromium}=await import(pathToFileURL(playwright).href);
const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined),headless:true});
const url=process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173';
const phase=process.env.WAYQUANT_AUDIT_PHASE||'final';
await fs.mkdir(path.join(out,'screens'),{recursive:true});await fs.mkdir(path.join(out,'reports'),{recursive:true});
const errors=[],network=[],layouts=[],accessibility=[],performanceData={},reportData=[];
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>network.push(r.url()));
await page.addInitScript(()=>{
 const ActualWorker=window.Worker;window.__workerAudit={created:0,terminated:0};
 window.Worker=class extends ActualWorker {
  constructor(...args){super(...args);window.__workerAudit.created++;}
  terminate(){window.__workerAudit.terminated++;return super.terminate();}
 };
});
await page.route('**/api/v1/simulate',route=>route.abort());
const start=Date.now();await page.goto(url);await page.locator('.context-bar-metric').first().waitFor();
performanceData.initialReadyMs=Date.now()-start;
const nav=page.locator('.sidebar-navigation button');
const resolutions=[{width:2560,height:1440},{width:1920,height:1080},{width:1440,height:900},{width:1280,height:720},{width:768,height:1024},{width:390,height:844}];
try {
 for(const viewport of resolutions) {
  await page.setViewportSize(viewport);
  for(const lang of ['EN','RU']) {
   await page.getByRole('button',{name:lang,exact:true}).click();
   for(let module=0;module<5;module++) {
    await nav.nth(module).click();
    if(module===3)await page.locator('.report-pages').waitFor();
    const metrics=await page.evaluate(()=>({bodyOverflow:document.documentElement.scrollWidth>window.innerWidth,documentScroll:document.documentElement.scrollHeight>window.innerHeight,headerHeight:document.querySelector('.context-header').getBoundingClientRect().height}));
    layouts.push({viewport,lang,module,...metrics});
    assert.equal(metrics.bodyOverflow,false);
    if(viewport.width>=1024)assert.equal(metrics.documentScroll,false);
    if(viewport.width===1440) {
     await page.locator('.workspace-content h1').scrollIntoViewIfNeeded();
     await page.screenshot({path:path.join(out,'screens',`${phase}-1440-${lang}-module-${module}.png`)});
    }
   }
  }
 }
 // Automated WCAG rules are supporting evidence, never full WCAG certification.
 await page.setViewportSize({width:1440,height:900});
 for(const lang of ['EN','RU']) {
  await page.getByRole('button',{name:lang,exact:true}).click();
  for(let module=0;module<5;module++) {
   await nav.nth(module).click();
   await page.addScriptTag({path:path.join(root,'.verification-audit/tools/node_modules/axe-core/axe.min.js')});
   const result=await page.evaluate(async()=>{
    const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
    return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:r.passes.length,incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};
   });
   accessibility.push({lang,module,...result});
  }
 }
 // Layout/DPR equivalents of desktop zoom; native browser zoom remains a manual check.
 const zoom=[];
 for(const scale of [1,1.25,1.5,2]) {
  const context=await browser.newContext({viewport:{width:Math.floor(1440/scale),height:Math.floor(900/scale)},deviceScaleFactor:scale});
  const p=await context.newPage();await p.route('**/api/v1/simulate',route=>route.abort());await p.goto(url);await p.locator('.context-bar-metric').first().waitFor();
  for(const lang of ['EN','RU']) {
   await p.getByRole('button',{name:lang,exact:true}).click();
   await p.locator('.sidebar-navigation button').first().click();
   zoom.push({emulatedScale:scale,lang,overflow:await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),type:'Equivalent CSS viewport + DPR; not native browser zoom'});
  }
  await context.close();
 }
 await fs.writeFile(path.join(out,`${phase}-zoom-equivalents.json`),JSON.stringify(zoom,null,2));
 // Repeat genuine browser-worker simulations and verify worker lifecycle.
 await page.setViewportSize({width:1440,height:900});await page.getByRole('button',{name:'EN',exact:true}).click();await nav.nth(1).click();
 const times=[];const execute=page.locator('.context-bar-actions button').last();
 for(let i=0;i<12;i++) {
  await page.waitForFunction(()=>!document.querySelector('.context-bar-actions button:last-child').disabled);
  const before=await page.locator('#context-seed').inputValue(),t=Date.now();
  await execute.click();
  await page.waitForFunction(()=>document.querySelector('.context-bar-actions button:last-child').disabled);
  await page.waitForFunction(()=>!document.querySelector('.context-bar-actions button:last-child').disabled);
  times.push(Date.now()-t);
  assert.equal(await page.locator('#context-seed').inputValue(),before);
 }
 performanceData.repeatedWorkerRunWallMs=times;
 performanceData.workerLifecycle=await page.evaluate(()=>window.__workerAudit);
 assert.equal(performanceData.workerLifecycle.created,performanceData.workerLifecycle.terminated);
 const session=await page.context().newCDPSession(page);await session.send('Performance.enable');
 performanceData.chromiumMetrics=(await session.send('Performance.getMetrics')).metrics.filter(m=>['JSHeapUsedSize','JSHeapTotalSize','TaskDuration','Nodes','Documents'].includes(m.name));
 await session.detach();
 // Actual exports: default and large constant severities, both languages.
 for(const variant of ['default','large']) {
  await page.getByRole('button',{name:'EN',exact:true}).click();
  if(variant==='large') {
   await page.locator('#context-asset').click();await page.getByRole('option',{name:'Federal ACH Clearing & Settlement Engine (DORA)',exact:true}).click();
   await page.locator('#context-threat').click();await page.getByRole('option',{name:'CI/CD Pipeline & Dependency Poisoning',exact:true}).click();
   await nav.first().click();
   for(const id of ['lefMin','lefMode','lefMax'])await page.locator(`#fair-${id}`).fill('8');
   for(const id of ['plmMin','plmMode','plmMax','slmMin','slmMode','slmMax'])await page.locator(`#fair-${id}`).fill('1000000000000');
   await page.locator('#fair-slmMax').blur();
   await page.waitForTimeout(1800);
   await nav.nth(2).click();
   for(const button of await page.locator('[data-search-control] button').all())await button.click();
   await page.waitForTimeout(1800);
  }
  for(const lang of ['EN','RU']) {
   await page.getByRole('button',{name:lang,exact:true}).click();await nav.nth(3).click();await page.locator('.report-pages').waitFor();
   const report=page.locator('.report-pages');
   const overflow=await report.locator('.report-kpi > div:last-child').evaluateAll(es=>es.map(e=>{
    const range=document.createRange();range.selectNodeContents(e);const text=range.getBoundingClientRect(),box=e.getBoundingClientRect();
    return {text:e.textContent.trim(),overflow:text.right>box.right+1||text.left<box.left-1};
   }));
   const download=page.waitForEvent('download');await page.getByRole('button',{name:/Download Simulation Audit JSON|Скачать JSON/}).click();
   const file=await download;let data='';for await(const chunk of await file.createReadStream())data+=chunk;
   const audit=JSON.parse(data);await fs.writeFile(path.join(out,'reports',`${phase}-${variant}-${lang}.json`),data);
   await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);
   const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
   await fs.writeFile(path.join(out,'reports',`${phase}-${variant}-${lang}.pdf`),pdf);
   const pages=(pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length;
   reportData.push({variant,lang,pages,kpiOverflow:overflow,seed:audit.request.random_seed,iterations:audit.request.iterations,currency:audit.request.context.currency,ale:audit.baseline.ale,var95:audit.baseline.var95,activeControls:audit.request.controls.length});
   assert.equal(pages,2);
   await page.emulateMedia({media:'screen'});
  }
 }
 performanceData.networkOrigins=[...new Set(network.filter(u=>/^https?:/.test(u)).map(u=>new URL(u).origin))];
 performanceData.pageErrors=errors;assert.deepEqual(errors,[]);
}finally{
 await fs.writeFile(path.join(out,`${phase}-browser-layouts.json`),JSON.stringify(layouts,null,2));
 await fs.writeFile(path.join(out,`${phase}-axe.json`),JSON.stringify(accessibility,null,2));
 await fs.writeFile(path.join(out,`${phase}-browser-performance.json`),JSON.stringify(performanceData,null,2));
 await fs.writeFile(path.join(out,`${phase}-reports.json`),JSON.stringify(reportData,null,2));
 await browser.close();
}
console.log(JSON.stringify({layouts:layouts.length,axeRuns:accessibility.length,axeViolations:accessibility.reduce((s,r)=>s+r.violations.length,0),reports:reportData.length,largeKpiOverflows:reportData.flatMap(r=>r.kpiOverflow).filter(x=>x.overflow).length,pageErrors:errors.length}));
