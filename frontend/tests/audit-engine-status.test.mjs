import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
test('audit: sidebar reports actual API/worker/error provenance in EN/RU',{skip:!process.env.WAYQUANT_PLAYWRIGHT_MODULE},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined),headless:true});
 try {
  const page=await browser.newPage();let source='api';
  const fixture=JSON.parse(fs.readFileSync(new URL('../../docs/audit/2026-11-27/evidence/api-default.json',import.meta.url)));
  await page.route('**/api/v1/simulate',route=>source==='api'?route.fulfill({json:fixture}):source==='worker'?route.abort():route.fulfill({status:500,body:'Injected error'}));
  await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');
  const ready=()=>page.waitForFunction(()=>!document.querySelector('.context-bar-actions button:last-child').disabled);
  await ready();
  const status=page.locator('[data-testid="compute-engine-status"]');
  assert.equal(await status.innerText(),'NumPy API');
  source='worker';await page.locator('.context-bar-actions button').last().click();await ready();
  assert.equal(await status.innerText(),'Browser worker');
  await page.getByRole('button',{name:'RU',exact:true}).click();assert.equal(await status.innerText(),'Web Worker браузера');
  source='error';await page.locator('.context-bar-actions button').last().click();await ready();
  assert.equal(await status.innerText(),'Ошибка расчёта');
  await page.getByRole('button',{name:'EN',exact:true}).click();assert.equal(await status.innerText(),'Calculation failed');
 }finally{await browser.close();}
});
