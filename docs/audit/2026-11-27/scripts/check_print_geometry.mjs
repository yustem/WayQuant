import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.join(root,'docs/audit/2026-11-27/evidence'),data=[];
const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined),headless:true});
try {
 for(const variant of ['default','large']) {
  const json=JSON.parse(await fs.readFile(path.join(out,`reports/review2-${variant}-EN.json`),'utf8'));
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.route('**/api/v1/simulate',r=>r.abort());await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');
  await page.locator('.context-bar-metric').first().waitFor();
  // Replay the actual exported request through the existing UI, never substitute report results.
  if(variant==='large') {
   await page.locator('#context-asset').click();await page.getByRole('option',{name:'Federal ACH Clearing & Settlement Engine (DORA)',exact:true}).click();
   await page.locator('#context-threat').click();await page.getByRole('option',{name:'CI/CD Pipeline & Dependency Poisoning',exact:true}).click();
   await page.locator('.sidebar-navigation button').first().click();
   for(const id of ['lefMin','lefMode','lefMax'])await page.locator(`#fair-${id}`).fill('8');
   for(const id of ['plmMin','plmMode','plmMax','slmMin','slmMode','slmMax'])await page.locator(`#fair-${id}`).fill('1000000000000');
   await page.locator('#fair-slmMax').blur();await page.waitForTimeout(1400);
   await page.locator('.sidebar-navigation button').nth(2).click();
   for(const button of await page.locator('[data-search-control] button').all())await button.click();
   await page.waitForTimeout(1400);
  }
  await page.locator('.sidebar-navigation button').nth(3).click();await page.locator('.report-pages').waitFor();
  await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);
  const values=await page.locator('.report-pages .report-kpi > div:last-child').evaluateAll(es=>es.map(e=>{
   const range=document.createRange();range.selectNodeContents(e);const r=range.getBoundingClientRect(),b=e.getBoundingClientRect();return{text:e.textContent.trim(),textWidth:r.width,boxWidth:b.width,overflow:r.right>b.right+1||r.left<b.left-1};
  }));
  data.push({variant,values});await page.close();
 }
}finally{await fs.writeFile(path.join(out,'final-print-geometry.json'),JSON.stringify(data,null,2));await browser.close();}
assert.equal(data.flatMap(row=>row.values).filter(value=>value.overflow).length,0,'Printed monetary values must fit their content boxes');
console.log(JSON.stringify(data));
