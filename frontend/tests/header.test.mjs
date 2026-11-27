import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

test('fixed header contains the original reset/execute actions and compact context without overflow',
 {skip:!process.env.WAYQUANT_PLAYWRIGHT_MODULE},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/v1/simulate',route=>route.abort());
  await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');
  await page.locator('.context-bar-metric').first().waitFor();
  await page.getByRole('button',{name:'1. Open FAIR Inputs',exact:false}).click();
  const reset=page.getByRole('button',{name:'Reset baseline — Reset to Asset Reference Baseline',exact:true});
  const execute=page.getByRole('button',{name:/^Execute simulation \(50[\s,]000 N\)$/});
  assert.equal(await reset.count(),1);assert.equal(await execute.count(),1);
  assert.equal(await page.locator('.workspace-content').getByRole('button',{name:/Reset to Asset Reference Baseline|Execute Simulation/}).count(),0);
  await page.locator('#fair-lefMin').fill('0.33');await page.locator('#fair-lefMin').blur();
  await reset.click();
  assert.equal(await page.locator('#fair-lefMin').inputValue(),'0.25');
  const seed=await page.locator('#context-seed').inputValue();
  await execute.click();
  await page.getByRole('heading',{name:'Monte Carlo Stochastic Simulation Dashboard',exact:true}).waitFor();
  assert.equal(await page.locator('#context-seed').inputValue(),seed,'Execute opens the dashboard without altering the explicit seed');
  for(const width of [1920,1440,1280,1024,390]) {
   await page.setViewportSize({width,height:900});
   for(const language of ['EN','RU']) {
    await page.getByRole('button',{name:language,exact:true}).click();
    const header=page.locator('.context-header');
    await header.scrollIntoViewIfNeeded();
    assert.equal(await header.locator('.context-bar-item svg').count(),2);
    assert.equal(await header.locator('.context-bar-actions button').count(),2);
    assert.equal(await header.locator('.context-bar-metric').count(),3);
    const headerBox=await header.boundingBox();
    assert.ok(headerBox.height<(width>=1024?145:200),`${width}/${language}: compact height`);
    assert.equal(await header.evaluate(e=>e.scrollWidth>e.clientWidth),false);
    const groups=await header.locator('.context-bar-fields, .context-bar-metrics, .context-bar-actions').evaluateAll(es=>es.map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})));
    for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++) {
     const a=groups[i],b=groups[j];
     assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${width}/${language}: header groups overlap`);
    }
    const fields=await header.locator('.context-bar-value').evaluateAll(es=>es.map(e=>({title:e.title,text:e.textContent,wrap:getComputedStyle(e).whiteSpace,overflow:getComputedStyle(e).textOverflow})));
    for(const field of fields) {assert.equal(field.title,field.text);assert.equal(field.wrap,'nowrap');assert.equal(field.overflow,'ellipsis');}
    if(process.env.WAYQUANT_HEADER_OUTPUT) {
     await fs.mkdir(process.env.WAYQUANT_HEADER_OUTPUT,{recursive:true});
     await header.screenshot({path:path.join(process.env.WAYQUANT_HEADER_OUTPUT,`${width}-${language}.png`)});
    }
   }
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
