import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const enabled=Boolean(process.env.WAYQUANT_PLAYWRIGHT_MODULE);
for(const scenario of ['charts','language','offline-fonts'])test(`audit accessibility/reliability: ${scenario}`,{skip:!enabled},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage(),origins=new Set();
  page.on('request',r=>{if(/^https?:/.test(r.url()))origins.add(new URL(r.url()).origin);});
  await page.route('**/api/v1/simulate',r=>r.abort());
  await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');await page.locator('.context-bar-metric').first().waitFor();
  if(scenario==='charts') {
   for(const [label,id] of [['Loss exceedance curve','lec'],['Annual loss histogram','histogram']]) {
    const svg=page.getByRole('img',{name:label,exact:true});assert.equal(await svg.count(),1);
    await svg.focus();const first=await page.locator(`[data-chart-readout="${id}"]`).innerText();
    await svg.press('End');assert.notEqual(await page.locator(`[data-chart-readout="${id}"]`).innerText(),first);
    await svg.press('Home');assert.equal(await page.locator(`[data-chart-readout="${id}"]`).innerText(),first);
   }
  }else if(scenario==='language') {
   for(const lang of ['RU','EN']) {await page.getByRole('button',{name:lang,exact:true}).click();assert.equal(await page.locator('html').getAttribute('lang'),lang.toLowerCase());}
  }else assert.deepEqual([...origins].filter(origin=>!origin.startsWith('http://127.0.0.1')&&!origin.startsWith('http://localhost')),[]);
 }finally{await browser.close();}
});
