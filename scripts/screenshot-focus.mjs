import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'temporary screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { try { localStorage.setItem('ze.boot.seen', '1'); } catch (_) {} });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

await new Promise((r) => setTimeout(r, 1200));

// Press ArrowDown with focus on body to trigger auto-focus on tile 00.
await page.evaluate(() => document.body.focus());
await page.keyboard.press('ArrowDown');
await new Promise((r) => setTimeout(r, 400));

const out1 = join(OUT_DIR, 'focus-tile-00.png');
await page.screenshot({ path: out1 });
console.log('Saved:', out1);

// Move focus to tile 01 to verify arrow-driven focus + blip path.
await page.keyboard.press('ArrowRight');
await new Promise((r) => setTimeout(r, 400));
const out2 = join(OUT_DIR, 'focus-tile-01.png');
await page.screenshot({ path: out2 });
console.log('Saved:', out2);

await browser.close();
