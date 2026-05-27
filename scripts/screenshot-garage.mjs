// Screenshots the Garage scene in both lineup and inspect states.
// Usage: node scripts/screenshot-garage.mjs
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = 'http://127.0.0.1:3000/index.html#/garage';
const OUT = resolve(process.cwd(), 'scripts', 'shots');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    // Skip the boot overlay so we land directly on the scene.
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('ze.boot.seen', String(Date.now())); } catch (_) {}
    });

    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(500);

    const lineup = resolve(OUT, 'garage-lineup.png');
    await page.screenshot({ path: lineup, fullPage: false });
    console.log(`  → ${lineup}`);

    // Click the GradeMyRun bay to enter inspect mode.
    await page.click('.bay[data-project="grademyrun"]');
    await sleep(550);

    const inspect = resolve(OUT, 'garage-inspect-grademyrun.png');
    await page.screenshot({ path: inspect, fullPage: false });
    console.log(`  → ${inspect}`);

    const inspectFull = resolve(OUT, 'garage-inspect-grademyrun-full.png');
    await page.screenshot({ path: inspectFull, fullPage: true });
    console.log(`  → ${inspectFull}`);
  } finally {
    await browser.close();
  }
})();
