import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined});const out=path.resolve(process.env.WAYQUANT_INTERNATIONAL_OUTPUT||'output/pdf/international');await fs.mkdir(out,{recursive:true});
try{for(const variant of ['large','negative']){
 const p=await browser.newPage({viewport:{width:1440,height:1000}});
 if(variant==='large')await p.route('**/api/v1/simulate',r=>r.abort());
 await p.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');await p.locator('.context-bar-metric').first().waitFor();
 await p.locator('.sidebar-navigation button').first().click();
 for(const id of ['lefMin','lefMode','lefMax'])await p.locator('#fair-'+id).fill(variant==='large'?'8':'0');
 if(variant==='large')for(const id of ['plmMin','plmMode','plmMax','slmMin','slmMode','slmMax'])await p.locator('#fair-'+id).fill('1000000000000');
 await p.locator('#context-seed').fill(variant==='large'?'4294967295':'777');await p.locator('#context-seed').blur();
 if(variant==='large'){await p.locator('#context-currency').click();await p.getByRole('option',{name:'EUR (€)',exact:true}).click();}
 await p.waitForFunction(()=>!document.querySelector('.context-bar-actions button:last-child').disabled);
 await p.locator('.sidebar-navigation button').nth(2).click();
 for(const button of await p.locator('[data-search-control] button').all())await button.click();
 await p.waitForFunction(()=>!document.querySelector('.context-bar-actions button:last-child').disabled);
 await p.locator('.sidebar-navigation button').nth(3).click();await p.locator('.report-pages').waitFor();
 const wait=p.waitForEvent('download');await p.locator('[data-search-target="report-json"]').click();const dl=await wait;let json='';for await(const c of await dl.createReadStream())json+=c;const data=JSON.parse(json);
 if(variant==='negative')assert.equal(data.governance.rosiPct,-100);
 assert.equal(data.request.controls.length,4);
 await fs.writeFile(path.join(out,variant+'.json'),json);
 for(const [lang,paper] of [['EN','Letter'],['RU','A4']]){
  await p.getByRole('button',{name:lang,exact:true}).click();await p.locator('#report-paper').selectOption(paper);await p.emulateMedia({media:'print'});
  const pdf=await p.pdf({preferCSSPageSize:true,printBackground:true});await fs.writeFile(path.join(out,`${variant}-${lang}-${paper}.pdf`),pdf);
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,2);
  const sizes=await p.locator('.report-kpi > div:last-child').evaluateAll(es=>es.map(e=>({value:e.textContent,overflow:e.scrollWidth>e.clientWidth+1})));assert.equal(sizes.some(x=>x.overflow),false,JSON.stringify(sizes));
  await p.emulateMedia({media:'screen'});
 }await p.close();
}}finally{await browser.close();}console.log('Large and negative-ROSI real reports passed; four active controls, two currencies, seeds and both engines.');
