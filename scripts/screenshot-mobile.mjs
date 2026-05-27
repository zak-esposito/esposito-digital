// Step 12: mobile pass — screenshots at 390px (iPhone 14 Pro) for each scene.
// Usage: node scripts/screenshot-mobile.mjs
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = 'http://127.0.0.1:3000/index.html';
const OUT = resolve(process.cwd(), 'scripts', 'shots');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCENES = [
  { hash: '', name: 'mobile-01-menu' },
  { hash: '#/career', name: 'mobile-02-career' },
  { hash: '#/garage', name: 'mobile-03-garage-lineup' },
  { hash: '#/timetrial', name: 'mobile-04-timetrial' },
  { hash: '#/radio', name: 'mobile-05-radio' },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    for (const scene of SCENES) {
      const page = await browser.newPage();
      await page.setViewport({
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await page.evaluateOnNewDocument(() => {
        try { localStorage.setItem('ze.boot.seen', String(Date.now())); } catch (_) {}
      });
      await page.goto(BASE + scene.hash, { waitUntil: 'networkidle0' });
      await sleep(700);

      const fileVis = resolve(OUT, `${scene.name}.png`);
      await page.screenshot({ path: fileVis, fullPage: false });
      console.log(`  → ${fileVis}`);

      const fileFull = resolve(OUT, `${scene.name}-full.png`);
      await page.screenshot({ path: fileFull, fullPage: true });
      console.log(`  → ${fileFull}`);

      await page.close();
    }

    // Bonus: Garage inspect state (clicks first bay)
    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('ze.boot.seen', String(Date.now())); } catch (_) {}
    });
    await page.goto(BASE + '#/garage', { waitUntil: 'networkidle0' });
    await sleep(700);
    await page.click('.bay[data-project="grademyrun"]');
    await sleep(700);
    const inspectFile = resolve(OUT, 'mobile-03b-garage-inspect.png');
    await page.screenshot({ path: inspectFile, fullPage: false });
    console.log(`  → ${inspectFile}`);
    const inspectFull = resolve(OUT, 'mobile-03b-garage-inspect-full.png');
    await page.screenshot({ path: inspectFull, fullPage: true });
    console.log(`  → ${inspectFull}`);
    await page.close();

    console.log('done.');
  } finally {
    await browser.close();
  }
})();
