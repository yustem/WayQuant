import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

test('context dropdown keyboard/pointer semantics, desktop scroll isolation and mobile flow',
 {skip:!process.env.WAYQUANT_PLAYWRIGHT_MODULE},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().endsWith('/api/v1/simulate'))requests.push(r.postDataJSON());});
  await page.goto(process.env.WAYQUANT_UX_URL||'http://127.0.0.1:5173');
  await page.locator('.context-bar-metric').first().waitFor();
  const asset=page.locator('#context-asset'),threat=page.locator('#context-threat');
  for(const trigger of [asset,threat]) {
   const original=await trigger.innerText();
   await trigger.click();
   const nativeOptions=await trigger.locator('..').locator('select option').allTextContents();
   assert.deepEqual(await page.locator('.context-select-menu').getByRole('option').allTextContents(),nativeOptions);
   assert.equal(await page.locator('.context-select-menu').getByRole('option',{selected:true}).count(),1);
   await trigger.press('End');
   const last=await page.locator('.context-select-menu').getByRole('option').last().getAttribute('id');
   assert.equal(await trigger.getAttribute('aria-activedescendant'),last);
   await trigger.press('Escape');
   assert.equal(await page.getByRole('listbox').count(),0);
   assert.equal(await trigger.innerText(),original,'Escape must not commit');
   await trigger.press('Home');
   await trigger.press('ArrowDown');
   assert.equal(await trigger.getAttribute('aria-activedescendant'),await page.locator('.context-select-menu').getByRole('option').nth(1).getAttribute('id'));
   await trigger.press('ArrowUp'); await trigger.press('Enter');
   assert.equal(await trigger.innerText(),nativeOptions[0]);
   await trigger.click(); await trigger.press('End'); await trigger.press('Enter');
   assert.equal(await trigger.innerText(),nativeOptions.at(-1));
   assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
   await trigger.click(); await trigger.press('Tab');
   assert.equal(await page.getByRole('listbox').count(),0);
   await trigger.click(); await page.locator('.brand-wordmark').click();
   assert.equal(await page.getByRole('listbox').count(),0);
   await trigger.focus(); await trigger.press(nativeOptions[0][0]); await trigger.press('Enter');
   assert.equal(await trigger.innerText(),nativeOptions[0],'Type-ahead keeps option labels intact');
  }
  await asset.click(); await page.getByRole('option',{name:'Federal ACH Clearing & Settlement Engine (DORA)',exact:true}).click();
  await threat.click(); await page.getByRole('option',{name:'CI/CD Pipeline & Dependency Poisoning',exact:true}).click();
  await asset.click();
  if(process.env.WAYQUANT_SHELL_OUTPUT) {
   await fs.mkdir(process.env.WAYQUANT_SHELL_OUTPUT,{recursive:true});
   await page.screenshot({path:path.join(process.env.WAYQUANT_SHELL_OUTPUT,'asset-menu.png')});
  }
  await page.setViewportSize({width:1440,height:850});
  await page.locator('.context-select-menu').waitFor({state:'hidden'});
  assert.equal(await page.getByRole('listbox').count(),0,'Resize dismisses detached menus');
  await page.waitForTimeout(1200);
  assert.equal(requests.at(-1).lef_min,0.13,'Existing context handler must load the same ACH/dependency preset');
  assert.equal(requests.at(-1).random_seed,42001);
  const nav=page.locator('.sidebar-navigation button');
  assert.equal(await nav.count(),5);
  for(const viewport of [{width:1920,height:1080},{width:1440,height:900},{width:1280,height:720},{width:1024,height:600}]) {
   await page.setViewportSize(viewport);
   for(let i=0;i<5;i++) {
    await nav.nth(i).click();
    const workspace=page.locator('.workspace-scroll');
    await workspace.evaluate(e=>e.scrollTop=0);
    const sidebarBefore=await page.locator('aside').boundingBox();
    const headerBefore=await page.locator('.context-header').boundingBox();
    const asideScroll=await page.locator('aside').evaluate(e=>e.scrollTop);
    const box=await workspace.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.wheel(0,800);
    await page.waitForTimeout(150);
    const scroll=await workspace.evaluate(e=>({top:e.scrollTop,overflows:e.scrollHeight>e.clientHeight}));
    if(scroll.overflows) assert.ok(scroll.top>0,`${viewport.width}/module ${i}: workspace wheel scroll`);
    assert.deepEqual(await page.locator('aside').boundingBox(),sidebarBefore);
    assert.deepEqual(await page.locator('.context-header').boundingBox(),headerBefore);
    assert.equal(await page.locator('aside').evaluate(e=>e.scrollTop),asideScroll);
    assert.equal(await page.evaluate(()=>window.scrollY),0);
    assert.ok(headerBefore.height<160,'Compact header height');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>window.innerHeight),false,'No global desktop scrollbar');
    if(process.env.WAYQUANT_SHELL_OUTPUT&&viewport.width===1440) {
     await fs.mkdir(process.env.WAYQUANT_SHELL_OUTPUT,{recursive:true});
     await page.screenshot({path:path.join(process.env.WAYQUANT_SHELL_OUTPUT,`desktop-module-${i}.png`)});
    }
   }
   // Sidebar overflow never displaces the context header or scrolls the workspace.
   const workspace=page.locator('.workspace-scroll');
   const before=await workspace.evaluate(e=>e.scrollTop);
   await page.locator('aside').evaluate(e=>e.scrollTop=0);
   await page.mouse.move(150,300);await page.mouse.wheel(0,600);await page.waitForTimeout(100);
   assert.equal(await workspace.evaluate(e=>e.scrollTop),before);
   assert.equal(await page.evaluate(()=>window.scrollY),0);
  }
  await page.setViewportSize({width:390,height:844});
  await nav.first().click();
  await asset.click();
  const menu=await page.getByRole('listbox').boundingBox();
  assert.ok(menu.x>=0&&menu.x+menu.width<=390&&menu.y>=0&&menu.y+menu.height<=844);
  await asset.press('Escape');
  await page.locator('.fair-decomposition').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>window.scrollY)>0);
  assert.equal(await page.locator('.context-header').evaluate(e=>Math.round(e.getBoundingClientRect().top)),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
});
