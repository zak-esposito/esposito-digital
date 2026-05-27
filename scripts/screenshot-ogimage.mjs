// Captures the menu at 1200x630 for use as og-image.png.
// Usage: node scripts/screenshot-ogimage.mjs
import puppeteer from 'puppeteer';
import { resolve } from 'node:path';

const URL = 'http://127.0.0.1:3000/index.html';
const OUT = resolve(process.cwd(), 'og-image.png');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    // Use deviceScaleFactor 1 so the saved PNG is exactly 1200x630.
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('ze.boot.seen', String(Date.now())); } catch (_) {}
    });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(700);
    await page.screenshot({ path: OUT, fullPage: false, type: 'png' });
    console.log(`og-image saved -> ${OUT}`);
  } finally {
    await browser.close();
  }
})();
