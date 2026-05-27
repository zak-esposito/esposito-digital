// Screenshots the Career scene at desktop width.
// Usage: node scripts/screenshot-career.mjs
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = 'http://127.0.0.1:3000/index.html#/career';
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
    await sleep(600);

    const file = resolve(OUT, 'career-desktop.png');
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  → ${file}`);

    // Also capture a full-page version in case content scrolls.
    const fileFull = resolve(OUT, 'career-desktop-full.png');
    await page.screenshot({ path: fileFull, fullPage: true });
    console.log(`  → ${fileFull}`);
  } finally {
    await browser.close();
  }
})();
