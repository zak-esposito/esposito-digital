import puppeteer from 'puppeteer';
import { readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = join(__dirname, 'temporary screenshots');
const url = process.argv[2];
const customWidth = parseInt(process.argv[3]) || 1440;
const VIEWPORT = { width: customWidth, height: 900 };

if (!url) {
  console.error('Usage: node screenshot.mjs <url> [width]');
  process.exit(1);
}

mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Auto-increment screenshot number
const existing = readdirSync(SCREENSHOT_DIR).filter(f => f.startsWith('screenshot-'));
const nextNum = existing.length > 0
  ? Math.max(...existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0'))) + 1
  : 1;

const outPath = join(SCREENSHOT_DIR, `screenshot-${nextNum}.png`);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport(VIEWPORT);
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

// Wait for fonts to load
await new Promise(r => setTimeout(r, 1000));

// Scroll through the page to trigger IntersectionObserver animations
await page.evaluate(async () => {
  const distance = 300;
  const delay = 200;
  const scrollHeight = document.body.scrollHeight;
  let current = 0;
  while (current < scrollHeight) {
    window.scrollBy(0, distance);
    current += distance;
    await new Promise(r => setTimeout(r, delay));
  }
  // Wait at bottom for final animations
  await new Promise(r => setTimeout(r, 500));
  // Scroll back to top for full-page capture
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 500));
});

// Wait for all reveal animations to complete
await new Promise(r => setTimeout(r, 1500));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: ${outPath}`);
