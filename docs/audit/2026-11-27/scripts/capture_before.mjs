// Render the preserved baseline on its own Vite port; never restore it over current source.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.route('**/api/v1/simulate',r=>r.abort());
 await page.goto('http://127.0.0.1:4178');await page.locator('.context-bar-metric').first().waitFor();
 for(const lang of ['EN','RU']){
  await page.getByRole('button',{name:lang,exact:true}).click();
  for(let module=0;module<5;module++){
   await page.locator('.sidebar-navigation button').nth(module).click();
   await page.locator('.workspace-content h1').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(root,`docs/audit/2026-11-27/evidence/screens/before-1440-${lang}-module-${module}.png`)});
  }
 }
}finally{await browser.close();}
console.log('Captured ten actual baseline module/language screenshots on isolated port 4178.');
