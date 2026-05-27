import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'temporary screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

// Headless Chromium reports (pointer: none) by default — patch matchMedia
// so the cursor module's (pointer: fine) check passes.
await page.evaluateOnNewDocument(() => {
  const orig = window.matchMedia.bind(window);
  window.matchMedia = (query) => {
    if (query === '(pointer: fine)') {
      return { matches: true, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {},
        dispatchEvent: () => false };
    }
    return orig(query);
  };
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  try { localStorage.setItem('ze.boot.seen', '1'); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 800));

// Move into the first tile so it is hovered. Two moves: one to seed the
// cursor and reveal it, then one over the tile so the ring catches up.
const tile = await page.$('.tile[data-mode="career"]');
const box = await tile.boundingBox();
const cx = Math.round(box.x + box.width * 0.6);
const cy = Math.round(box.y + box.height * 0.45);

await page.mouse.move(cx - 200, cy - 200);
await new Promise((r) => setTimeout(r, 150));
await page.mouse.move(cx, cy, { steps: 20 });
// Give the ring lerp enough frames to settle so both elements are visible
// together in the shot.
await new Promise((r) => setTimeout(r, 600));

const out = join(OUT_DIR, 'cursor-over-tile.png');
await page.screenshot({ path: out });
console.log('Saved:', out);

await browser.close();
