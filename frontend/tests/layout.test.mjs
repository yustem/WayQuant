import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

test('responsive screens, visible input labels and separated FAIR thresholds/results',
 {skip:!process.env.WAYQUANT_PLAYWRIGHT_MODULE}, async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.WAYQUANT_UX_URL || 'http://127.0.0.1:5173');
  await page.getByRole('button',{name:'4. Executive Report',exact:false}).first().click();
  await page.locator('.report-pages').waitFor();
  for(const width of [1920,1440,1024,390]) {
   await page.setViewportSize({width,height:1000});
   for(const lang of ['EN','RU']) {
    await page.getByRole('button',{name:lang,exact:true}).click();
    const navigation=page.locator('.sidebar-navigation button');
    for(let screen=0;screen<5;screen++) {
     await navigation.nth(screen).click();
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,`${width}/${lang}/screen ${screen}: page overflow`);
     const missing=await page.locator('input[type="number"], select:visible, [role="combobox"]').evaluateAll(fields=>fields.filter(e=>!e.labels?.length || ![...e.labels].some(l=>l.textContent.trim())).map(e=>e.outerHTML));
     assert.deepEqual(missing,[]);
     if(screen===0) {
      const cards=await page.locator('.calibration-grid > div').evaluateAll(cards=>cards.map(e=>({top:e.getBoundingClientRect().top,input:e.querySelector('input').getBoundingClientRect().top})));
      for(const card of cards) if(Math.abs(card.top-cards[0].top)<1) assert.ok(Math.abs(card.input-cards[0].input)<1,'Calibration inputs must align across adjacent cards');
      const panel=page.locator('.fair-decomposition');
      await panel.scrollIntoViewIfNeeded();
      assert.match(await panel.innerText(),lang==='EN'?/Risk = LEF \(Poisson\) × \[ PLM \(Beta-PERT\) \+ SLEF \(Bernoulli\) × SLM \(Lognormal\) \]/:/Риск = LEF \(Пуассон\) × \[ PLM \(Beta-PERT\) \+ SLEF \(Бернулли\) × SLM \(логнормальное\) \]/);
      assert.equal(await panel.locator('.fair-thresholds input').count(),2);
      assert.equal(await panel.locator('.fair-results input').count(),0);
      assert.equal(await panel.locator('.fair-results dd').count(),2);
      const boxes=await panel.locator('input').evaluateAll(fields=>fields.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
      assert.equal(boxes[0].height,boxes[1].height);
      assert.equal(boxes[0].width,boxes[1].width);
      assert.ok(await panel.locator('label[for="scenario-loss-threshold"]').innerText());
      assert.equal(await panel.evaluate(e=>e.scrollWidth>e.clientWidth),false);
     }
     if(process.env.WAYQUANT_LAYOUT_OUTPUT) {
      await fs.mkdir(process.env.WAYQUANT_LAYOUT_OUTPUT,{recursive:true});
      const file=path.join(process.env.WAYQUANT_LAYOUT_OUTPUT,`${width}-${lang}-${screen}.png`);
      if(screen===0) {
       await page.locator('.fair-decomposition').screenshot({path:file});
       await page.locator('.calibration-grid').screenshot({path:file.replace('.png','-calibration.png')});
      }
      else {await page.locator('h1').scrollIntoViewIfNeeded();await page.screenshot({path:file});}
     }
    }
   }
  }
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
});
