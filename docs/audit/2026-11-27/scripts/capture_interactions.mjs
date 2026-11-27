import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.route('**/api/v1/simulate',r=>r.abort());await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:4176');
 await page.locator('.context-bar-metric').first().waitFor();
 for(const lang of ['EN','RU']){
  await page.getByRole('button',{name:lang,exact:true}).click();
  await page.locator('.sidebar-navigation button').first().click();
  await page.locator('.fair-decomposition').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(root,`docs/audit/2026-11-27/evidence/screens/final-FAIR-${lang}.png`)});
  await page.locator('.command-trigger').click();await page.getByRole('dialog').getByRole('combobox').fill('ALE');
  assert.ok(await page.locator('.command-result').count()>0);
  await page.screenshot({path:path.join(root,`docs/audit/2026-11-27/evidence/screens/final-command-${lang}.png`)});
  await page.keyboard.press('Escape');
 }
 await page.locator('#context-asset').click();
 await page.screenshot({path:path.join(root,'docs/audit/2026-11-27/evidence/screens/final-asset-options-RU.png')});
}finally{await browser.close();}
console.log('Captured real FAIR panels, nonempty command palette and expanded asset selector.');
