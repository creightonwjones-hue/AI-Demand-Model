// Browser regressions from the phase 3 final review: node scripts/ui/regressions.cjs (preview server on :4173).
const { chromium } = require('playwright');
const decode = h => JSON.parse(Buffer.from(h.replace(/^#s=/, '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
(async () => {
  const b = await chromium.launch(); const results = {};
  const page = async () => { const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto('http://localhost:4173/'); await p.waitForSelector('#app[data-ready]', { state: 'attached' }); await p.waitForTimeout(300); return p; };
  // 1. A drag survives re-renders (timeline playing) and does not snap to the minimum.
  let p = await page();
  await p.click('button.cond'); await p.click('.time .play');
  const hd = await p.$('.cc[data-id="riskFree"] .cc-hd[data-q="2028Q1"]'); const bx = await hd.boundingBox();
  await p.mouse.move(bx.x + 3, bx.y + 3); await p.mouse.down(); await p.mouse.move(bx.x + 3, bx.y - 10, { steps: 3 });
  await p.waitForTimeout(1300); await p.mouse.move(bx.x + 3, bx.y - 15, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(900);
  const v = (decode(await p.evaluate(() => location.hash)).overrides.riskFree || {})['2028Q1'];
  results.dragSurvivesRerender = v !== undefined && v > 0.5;
  await p.close();
  // 2. Keyboard edits keep focus on the handle.
  p = await page(); await p.click('button.cond');
  await p.focus('.cc[data-id="riskFree"] .cc-hd[tabindex="0"]'); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(800);
  results.keyboardKeepsFocus = await p.evaluate(() => !!document.activeElement && document.activeElement.classList.contains('cc-hd'));
  await p.close();
  // 3. Two quick "+" clicks on a setting both count.
  p = await page(); await p.click('button.cond');
  await p.click('.cc[data-id="priceElasticity"] .cc-step[data-step="0.1"]'); await p.click('.cc[data-id="priceElasticity"] .cc-step[data-step="0.1"]', { delay: 5 });
  await p.waitForTimeout(1200);
  results.quickEditsCount = (await p.textContent('.cc[data-id="priceElasticity"] .cc-val')).trim() === '1.20';
  await p.close();
  // 4. Panning inside a deal zoom keeps the deal open.
  p = await page();
  const ids = await p.$$eval('path.halo', ps => ps.map(x => x.dataset.edge)); const id = ids.find(x => /debt-clouds/.test(x));
  await p.$eval(`path.halo[data-edge="${id}"]`, el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(700);
  await p.mouse.move(300, 700); await p.mouse.down(); await p.mouse.move(420, 640, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
  results.panKeepsZoom = !!(await p.$('.dp'));
  await p.close();
  console.log(JSON.stringify(results)); await b.close();
  process.exit(Object.values(results).every(Boolean) ? 0 : 1);
})();
