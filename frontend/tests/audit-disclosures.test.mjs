import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const enabled=Boolean(process.env.WAYQUANT_PLAYWRIGHT_MODULE);
for(const scenario of ['preview','units','interpretation','logarithmic','extreme-appetite','architecture'])test(`audit scientific disclosure: ${scenario}`,{skip:!enabled},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage();await page.route('**/api/v1/simulate',route=>route.abort());
  await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');
  await page.locator('.context-bar-metric').first().waitFor();
  if(scenario==='architecture') {
   await page.locator('.sidebar-navigation button').nth(4).click();
   for(const lang of ['EN','RU']) {
    await page.getByRole('button',{name:lang,exact:true}).click();
    assert.doesNotMatch(await page.locator('.workspace-content').innerText(),/NumPy\/SciPy/);
   }
  }else if(scenario==='preview') {
   await page.getByRole('button',{name:'1. Open FAIR Inputs',exact:false}).click();
   assert.match(await page.locator('.calibration-grid').innerText(),/Schematic distribution illustration/);
  }else if(scenario==='units') {
   await page.locator('#context-currency').click();await page.getByRole('option',{name:'EUR (€)',exact:true}).click();
   await page.waitForTimeout(1000);
   assert.match(await page.locator('[data-search-target="thresholdExceedance"]').innerText(),/€/);
   assert.match(await page.locator('aside').innerText(),/no FX conversion/);
  }else if(scenario==='interpretation') {
   assert.match(await page.locator('#search-percentiles').innerText(),/Marginal component quantiles do not add/);
   await page.getByRole('button',{name:'1. Open FAIR Inputs',exact:false}).click();
   assert.match(await page.locator('.fair-decomposition').innerText(),/Σ/);
  }else if(scenario==='logarithmic') {
   await page.getByRole('checkbox',{name:'Logarithmic X-Axis',exact:true}).check();
   assert.match(await page.locator('#search-lec').locator('..').locator('..').locator('..').innerText(),/10,000/);
  }else {
   await page.getByRole('button',{name:'1. Open FAIR Inputs',exact:false}).click();
   await page.locator('#risk-appetite').fill('1.7e308');await page.locator('#risk-appetite').blur();
   await page.getByRole('button',{name:'2. Simulation Dashboard',exact:false}).click();await page.waitForTimeout(1000);
   const svg=page.locator('.report-lec-svg');
   assert.equal(await svg.evaluate(e=>/NaN|Infinity/.test(e.outerHTML)),false);
  }
 }finally{await browser.close();}
});
