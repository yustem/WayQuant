import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

// Uses the real browser worker; no financial fixtures or modified calculations.
test('Executive Report prints exactly two A4 pages with disclaimer and long context',
 {skip:!process.env.WAYQUANT_PLAYWRIGHT_MODULE},async()=>{
 const {chromium}=await import(pathToFileURL(process.env.WAYQUANT_PLAYWRIGHT_MODULE).href);
 const browser=await chromium.launch({channel:process.env.WAYQUANT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.route('**/api/v1/simulate',route=>route.abort());
  await page.goto(process.env.WAYQUANT_PRINT_URL || 'http://127.0.0.1:4175');
  await page.getByText('Backend unavailable',{exact:false}).waitFor();
  for(const variant of ['default','long-context']) {
   await page.getByRole('button',{name:'EN',exact:true}).click();
   if(variant==='long-context') {
    await page.locator('#context-asset').click();
    await page.getByRole('option',{name:'Federal ACH Clearing & Settlement Engine (DORA)',exact:true}).click();
    await page.locator('#context-threat').click();
    await page.getByRole('option',{name:'CI/CD Pipeline & Dependency Poisoning',exact:true}).click();
    await page.getByRole('button',{name:'3. NIST Controls',exact:false}).first().click();
    // The existing portfolio cards toggle their actual scenario controls.
    for(const text of ['Dynamic SBOM Generation','Internal Artifact Proxy','Pre-Release Dynamic Package','Policy-as-Code Enforcement']) {
     await page.getByText(text,{exact:false}).first().click();
    }
    await page.getByText('Backend unavailable',{exact:false}).waitFor();
   }
   await page.getByRole('button',{name:'4. Executive Report',exact:false}).first().click();
   await page.locator('.report-pages').waitFor();
   await page.evaluate(()=>document.fonts.ready);
   for(const lang of ['EN','RU']) {
    await page.getByRole('button',{name:lang,exact:true}).click();
    await page.locator('.report-pages').waitFor();
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('[data-testid="compute-status"]').isVisible(),false);
    assert.equal(await page.locator('aside').isVisible(),false);
    assert.equal(await page.locator('.report-pages').evaluate(e=>e.getBoundingClientRect().top),0);
    const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
    assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,2,`${variant}/${lang}`);
    assert.match(await page.locator('.print-page-1').innerText(),lang==='EN'?/Baseline ALE/:/Исходные ожидаемые годовые потери/);
    assert.match(await page.locator('.print-page-1').innerText(),/LEC/);
    assert.match(await page.locator('.print-page-1').innerText(),/50[\s,\u00a0]000/);
    assert.match(await page.locator('.print-page-1').innerText(),lang==='EN'?/not NIST effectiveness/:/а не оценка эффективности NIST/);
    assert.match(await page.locator('.print-page-2').innerText(),lang==='EN'?/Methodology and reproducibility metadata/:/Методология и воспроизводимость/);
    assert.match(await page.locator('.print-page-2').innerText(),lang==='EN'?/Security investment/:/Инвестиции в защиту/);
    if(variant==='long-context') {
     assert.equal(await page.locator('.report-controls-table tbody tr').count(),4);
     assert.equal((await page.locator('.report-controls-table').innerText()).match(lang==='EN'?/ACTIVE/g:/ВКЛЮЧЕНА/g)?.length,4);
    }
    if(process.env.WAYQUANT_PRINT_OUTPUT) {
     await fs.mkdir(process.env.WAYQUANT_PRINT_OUTPUT,{recursive:true});
     await fs.writeFile(path.join(process.env.WAYQUANT_PRINT_OUTPUT,`${variant}-${lang}.pdf`),pdf);
    }
    await page.emulateMedia({media:'screen'});
   }
  }
 } finally {await browser.close();}
});
