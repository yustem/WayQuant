import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

// Opt-in browser regression: set WAYQUANT_PLAYWRIGHT_MODULE and WAYQUANT_UX_URL.
test('stable status, committed sliders, latest result and localized methodology',
 {skip: !process.env.WAYQUANT_PLAYWRIGHT_MODULE}, async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage(); const errors=[], requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/v1/simulate',async route=>{
   requests.push(route.request().postDataJSON());
   await new Promise(resolve=>setTimeout(resolve,600));
   try{await route.abort();}catch{} // Exercise cancellation followed by real worker fallback.
  });
  await page.goto(process.env.WAYQUANT_UX_URL || 'http://127.0.0.1:4174');
  await page.getByRole('button',{name:'1. Open FAIR Inputs',exact:false}).first().click();
  const status=page.getByTestId('compute-status');
  // Compare content coordinates, accounting for the workspace's independent scroll.
  const initial=await status.evaluate(e=>({y:e.getBoundingClientRect().top+window.scrollY+(e.closest('.workspace-scroll')?.scrollTop||0),height:e.getBoundingClientRect().height}));
  const notice=page.getByRole('button',{name:'Synthetic scenario',exact:true});
  await notice.focus(); await page.locator('#scenario-explanation').waitFor();
  assert.match(await page.locator('#scenario-explanation').innerText(),/not NIST/);
  await notice.press('Escape'); assert.equal(await page.locator('#scenario-explanation').count(),0);
  const slider=page.getByRole('slider').first();
  await slider.focus();
  const before=requests.length;
  await slider.press('ArrowRight'); await slider.press('ArrowRight'); await slider.press('ArrowLeft');
  assert.equal(await slider.inputValue(),'4.5');
  await page.waitForTimeout(1600);
  assert.equal(requests.length,before+1,'Rapid commits should debounce to one request');
  assert.equal(requests.at(-1).lef_gamma,4.5);
  const requestCount=requests.length;
  const bounds=await slider.boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height/2);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width*.8,bounds.y+bounds.height/2,{steps:30});
  const finalValue=Number(await slider.inputValue());
  await page.waitForTimeout(450);
  assert.equal(requests.length,requestCount,'Dragging must not issue intermediate simulations');
  await page.mouse.up(); await page.waitForTimeout(1600);
  assert.equal(requests.length,requestCount+1);
  assert.equal(requests.at(-1).lef_gamma,finalValue);

  const after=await status.evaluate(e=>({y:e.getBoundingClientRect().top+window.scrollY+(e.closest('.workspace-scroll')?.scrollTop||0),height:e.getBoundingClientRect().height}));assert.equal(after.y,initial.y);assert.equal(after.height,initial.height);
  assert.equal(await page.getByText('Computing on the server...', {exact:true}).count(),0);
  await page.getByRole('button',{name:'RU',exact:true}).click();
  await page.getByRole('button',{name:'Синтетический сценарий',exact:true}).click();
  assert.match(await page.locator('#scenario-explanation').innerText(),/не оценка NIST|не оценка|а не оценка/);
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await page.waitForTimeout(1600);
  await page.getByRole('button',{name:'4. Executive Report',exact:false}).first().click();
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download Simulation Audit JSON',exact:false}).click();
  const file=await download; let json='';for await(const chunk of await file.createReadStream())json+=chunk;
  assert.equal(JSON.parse(json).request.lef_gamma,finalValue);
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
});
