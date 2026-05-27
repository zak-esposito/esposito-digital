import puppeteer from 'puppeteer';
import { mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'temporary screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const existing = readdirSync(OUT_DIR).filter((f) => f.startsWith('screenshot-'));
const nextNum = existing.length
  ? Math.max(...existing.map((f) => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0'))) + 1
  : 1;

const url = 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// Seed localStorage to skip the boot intro so we land directly on the menu.
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem('ze.boot.seen', '1'); } catch (_) {}
});

await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
// Let fonts settle.
await new Promise((r) => setTimeout(r, 1500));
// Land mid-animation — orbit cycle is 20s, so ~13s puts both glows
// past the halfway swing of their elliptical path.
await new Promise((r) => setTimeout(r, 13000));

const out = join(OUT_DIR, `screenshot-${nextNum}.png`);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log(`Saved: ${out}`);
