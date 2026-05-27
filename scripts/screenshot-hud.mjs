import puppeteer from 'puppeteer';
import { mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = join(__dirname, '..', 'temporary screenshots');
const url = process.argv[2] || 'http://localhost:3000';

mkdirSync(SCREENSHOT_DIR, { recursive: true });
const existing = readdirSync(SCREENSHOT_DIR).filter((f) => f.startsWith('screenshot-'));
const nextNum = existing.length > 0
  ? Math.max(...existing.map((f) => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0'))) + 1
  : 1;
const fullPath = join(SCREENSHOT_DIR, `screenshot-${nextNum}-hud-full.png`);
const cropPath = join(SCREENSHOT_DIR, `screenshot-${nextNum}-hud-topright.png`);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// Skip the boot overlay so the HUD chrome is visible immediately.
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem('ze.boot.seen', String(Date.now())); } catch (_) {}
});

await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1200));

await page.screenshot({ path: fullPath });

const handle = await page.$('.hud-top');
if (handle) {
  const box = await handle.boundingBox();
  if (box) {
    await page.screenshot({
      path: cropPath,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
  }
}

await browser.close();
console.log('Full HUD:', fullPath);
console.log('Cropped:', cropPath);
