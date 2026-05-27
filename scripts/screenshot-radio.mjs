// Screenshots the Pit Radio scene (idle, focused input, hovered submit).
// Usage: node scripts/screenshot-radio.mjs
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = 'http://127.0.0.1:3000/index.html#/radio';
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
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('ze.boot.seen', String(Date.now())); } catch (_) {}
    });

    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(500);

    const idle = resolve(OUT, 'radio-idle.png');
    await page.screenshot({ path: idle, fullPage: false });
    console.log(`  → ${idle}`);

    const idleFull = resolve(OUT, 'radio-idle-full.png');
    await page.screenshot({ path: idleFull, fullPage: true });
    console.log(`  → ${idleFull}`);

    // Focus the email input to capture the green-glow focus state
    await page.focus('#radio-email');
    await sleep(220);
    const focused = resolve(OUT, 'radio-focused.png');
    await page.screenshot({ path: focused, fullPage: true });
    console.log(`  → ${focused}`);

    // Hover the submit button to capture the active HUD state
    await page.hover('[data-radio-submit]');
    await sleep(220);
    const hover = resolve(OUT, 'radio-submit-hover.png');
    await page.screenshot({ path: hover, fullPage: true });
    console.log(`  → ${hover}`);

    // Mobile viewport
    await page.setViewport({ width: 414, height: 896, deviceScaleFactor: 2 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(400);
    const mobile = resolve(OUT, 'radio-mobile.png');
    await page.screenshot({ path: mobile, fullPage: true });
    console.log(`  → ${mobile}`);
  } finally {
    await browser.close();
  }
})();
