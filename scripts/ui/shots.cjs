// Screenshots of the canvas page for visual checks: node scripts/ui/shots.cjs <outDir> [url] [suffix]
const { chromium } = require('playwright');
(async () => {
  const [out = '.', url = 'http://localhost:4173/', suffix = ''] = process.argv.slice(2);
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1440, 900], [2560, 1440]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForSelector('#app[data-ready]', { state: 'attached', timeout: 20000 });
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${out}/canvas-${w}${suffix}.png` });
    console.log(w, 'scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
    await p.close();
  }
  const m = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await m.goto('file://' + process.cwd() + '/docs/mockups/canvas-v6.html');
  const frame = await m.$('.frame'); await frame.screenshot({ path: `${out}/mockup.png` });
  console.log('errors', errs); await b.close();
})();
