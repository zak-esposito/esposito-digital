// Screenshots the boot overlay (PRESS START) and the cascaded menu.
// Usage: node scripts/screenshot-boot.mjs
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = 'http://127.0.0.1:4321/index.html';
const OUT = resolve(process.cwd(), 'scripts', 'shots');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  const file = resolve(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  → ${file}`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // ---------- 1) FIRST VISIT — wait for PRESS START phase ----------
    console.log('[1/4] First visit — capture PRESS START');
    let page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.removeItem('ze.boot.seen'); } catch (_) {}
    });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    // PRESS START fires at t=1400ms after class is added (rAF after main.js runs)
    await sleep(2000);
    await shot(page, '01-press-start');
    await page.close();

    // ---------- 2) FIRST VISIT — advance & capture cascaded menu ----------
    console.log('[2/4] First visit — advance, capture cascaded menu');
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.removeItem('ze.boot.seen'); } catch (_) {}
    });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(1600); // overlay visible, PRESS START shown
    // Click somewhere safe (outside skip button) to trigger advance
    await page.mouse.click(720, 450);
    // wait for cascade total ≈ 3*60 + 300 + buffer
    await sleep(900);
    await shot(page, '02-cascade-menu');
    await page.close();

    // ---------- 3) RETURN VISIT — should skip ----------
    console.log('[3/4] Return visit — boot should be skipped');
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('ze.boot.seen', String(Date.now())); } catch (_) {}
    });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(400);
    const overlayHiddenReturn = await page.evaluate(() => {
      const el = document.getElementById('boot-overlay');
      if (!el) return 'removed';
      const cs = getComputedStyle(el);
      return cs.display;
    });
    console.log(`   overlay state on return visit: ${overlayHiddenReturn}`);
    await shot(page, '03-return-visit');
    await page.close();

    // ---------- 4) MOBILE — should always skip ----------
    console.log('[4/4] Mobile — boot should be skipped');
    page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.removeItem('ze.boot.seen'); } catch (_) {}
    });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(400);
    const overlayHiddenMobile = await page.evaluate(() => {
      const el = document.getElementById('boot-overlay');
      if (!el) return 'removed';
      const cs = getComputedStyle(el);
      return cs.display;
    });
    console.log(`   overlay state on mobile: ${overlayHiddenMobile}`);
    await shot(page, '04-mobile');
    await page.close();

    console.log('done.');
  } finally {
    await browser.close();
  }
})();
