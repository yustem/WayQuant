import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

test('four shared fixed-height context dropdowns retain values, labels and keyboard behavior',
 {skip:!process.env.WAYQUANT_PLAYWRIGHT_MODULE},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/v1/simulate',route=>route.abort()); // Isolate this form test using the existing worker fallback.
  await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');
  assert.equal(await page.locator('aside select:visible').count(),0);
  assert.equal(await page.locator('aside [role="combobox"]').count(),4);
  for(const width of [1280,390]) {
   await page.setViewportSize({width,height:720});
   for(const language of ['EN','RU']) {
    await page.getByRole('button',{name:language,exact:true}).click();
    for(const id of ['asset','threat','iterations','currency']) {
     const trigger=page.locator(`#context-${id}`);
     await trigger.scrollIntoViewIfNeeded();
     const initial=await trigger.innerText();
     const parent=trigger.locator('..');
     const options=await parent.locator('select option').allTextContents();
     const height=await parent.evaluate(e=>e.getBoundingClientRect().height);
     const style=await trigger.evaluate(e=>({height:e.getBoundingClientRect().height,radius:getComputedStyle(e).borderRadius,space:getComputedStyle(e.querySelector('span')).whiteSpace,ellipsis:getComputedStyle(e.querySelector('span')).textOverflow}));
     assert.deepEqual(style,{height:44,radius:'8px',space:'nowrap',ellipsis:'ellipsis'});
     assert.equal(await trigger.getAttribute('title'),initial);
     await trigger.click();
     const menu=page.locator('.context-select-menu');
     assert.deepEqual(await menu.getByRole('option').allTextContents(),options,`${width}/${language}/${id}: expanded options`);
     assert.equal(await menu.getByRole('option',{selected:true}).count(),1);
     const rect=await menu.boundingBox(),anchor=await trigger.boundingBox();
     assert.ok(rect.x>=0&&rect.x+rect.width<=width&&rect.y>=0&&rect.y+rect.height<=720,'Menu stays in viewport');
     assert.ok(Math.abs(rect.y-anchor.y-anchor.height-8)<1||Math.abs(anchor.y-rect.y-rect.height-8)<1,'Menu remains anchored above or below trigger');
     await trigger.press('End');await trigger.press('Enter');
     assert.equal(await trigger.innerText(),options.at(-1));
     assert.equal(await parent.evaluate(e=>e.getBoundingClientRect().height),height,'Long selections must not move surrounding fields');
     assert.equal(await trigger.evaluate(e=>e.getBoundingClientRect().height),44);
     assert.equal(await trigger.getAttribute('title'),options.at(-1));
     assert.equal(await parent.locator('select').inputValue(),await parent.locator('select option').last().getAttribute('value'));
     await trigger.click();await trigger.press('Home');await trigger.press('Escape');
     assert.equal(await trigger.innerText(),options.at(-1),'Escape does not change selection');
     await trigger.click();await trigger.press('Tab');
     assert.equal(await page.getByRole('listbox').count(),0);
    }
   }
  }
  await page.setViewportSize({width:1280,height:900});
  const iterations=page.locator('#context-iterations');
  await iterations.click();
  const request=page.waitForRequest(r=>r.url().endsWith('/api/v1/simulate')&&r.postDataJSON()?.iterations===25000);
  await page.locator('.context-select-menu').getByRole('option',{name:'25,000',exact:true}).click();
  assert.equal((await request).postDataJSON().iterations,25000,'Original numeric iteration handler is preserved');
  if(process.env.WAYQUANT_DROPDOWN_OUTPUT) {
   await fs.mkdir(process.env.WAYQUANT_DROPDOWN_OUTPUT,{recursive:true});
   await page.locator('#context-currency').click();
   await page.screenshot({path:path.join(process.env.WAYQUANT_DROPDOWN_OUTPUT,'currency-menu.png')});
  }
  assert.deepEqual(errors,[]);
 }finally {await browser.close();}
});
