import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const enabled=Boolean(process.env.WAYQUANT_PLAYWRIGHT_MODULE);
const url=process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173';

for(const status of [400,422,429,500,504,404,405,501,502,503,'invalid-json']) {
 test(`audit failure/recovery matrix: HTTP ${status}`,{skip:!enabled},async()=>{
  const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
  const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined),headless:true});
  try {
   const page=await browser.newPage();let recover=false;
   await page.route('**/api/v1/simulate',route=>recover?route.abort():route.fulfill({status:status==='invalid-json'?200:status,contentType:'application/json',body:status==='invalid-json'?'{malformed':JSON.stringify({detail:'Injected failure'})}));
   await page.goto(url);
   const fallback=[404,405,501,502,503].includes(status);
   if(fallback) {
    await page.locator('.context-bar-metric').first().waitFor();
    assert.equal(await page.getByRole('alert').count(),0);
    assert.equal(await page.getByText('Backend unavailable — simulation completed locally in this browser.',{exact:true}).isVisible(),true);
   } else {
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('.context-bar-metric').count(),0);
    assert.equal(await page.locator('.context-bar-actions button:last-child').isDisabled(),false);
   }
   recover=true;
   await page.locator('.context-bar-actions button').last().click();
   await page.locator('.context-bar-metric').first().waitFor();
   await page.waitForFunction(()=>!document.querySelector('.context-bar-actions button:last-child').disabled);
   assert.equal(await page.getByRole('alert').count(),0);
   assert.equal(await page.locator('.context-result-status').count(),0);
  }finally{await browser.close();}
 });
}
