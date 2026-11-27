import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined),headless:true}),data=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.route('**/api/v1/simulate',r=>r.abort());await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');
 await page.locator('.context-bar-metric').first().waitFor();
 for(const lang of ['EN','RU']) {
  await page.getByRole('button',{name:lang,exact:true}).click();
  for(let module=0;module<5;module++) {
   await page.locator('.sidebar-navigation button').nth(module).click();
   await page.addScriptTag({path:path.join(root,'.verification-audit/tools/node_modules/axe-core/axe.min.js')});
   const result=await page.evaluate(async()=>{
    const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
    return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),passes:r.passes.length,incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};
   });data.push({lang,module,...result});
  }
 }
}finally{await fs.writeFile(path.join(root,'docs/audit/2026-11-27/evidence/final-axe.json'),JSON.stringify(data,null,2));await browser.close();}
console.log(JSON.stringify({scans:data.length,violations:data.reduce((n,r)=>n+r.violations.length,0)}));
