// Verifies edge cases: #/boot easter egg, reduced motion, SKIP button, persistence.
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = 'http://127.0.0.1:4321/index.html';
const OUT = resolve(process.cwd(), 'scripts', 'shots');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: false });

async function newPage(browser, { reducedMotion = false, hasSeen = null, mobile = false } = {}) {
  const page = await browser.newPage();
  if (mobile) {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  } else {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  }
  if (reducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  }
  await page.evaluateOnNewDocument((seen) => {
    try {
      if (seen === true) localStorage.setItem('ze.boot.seen', String(Date.now()));
      else if (seen === false) localStorage.removeItem('ze.boot.seen');
    } catch (_) {}
  }, hasSeen);
  return page;
}

async function inspect(page) {
  return page.evaluate(() => {
    const overlay = document.getElementById('boot-overlay');
    const tiles = Array.from(document.querySelectorAll('.tile')).map((t) => ({
      mode: t.dataset.mode,
      opacity: getComputedStyle(t).opacity,
      transform: getComputedStyle(t).transform,
    }));
    const seen = (() => { try { return localStorage.getItem('ze.boot.seen'); } catch { return null; } })();
    return {
      overlayPresent: !!overlay,
      overlayDisplay: overlay ? getComputedStyle(overlay).display : 'removed',
      htmlClasses: document.documentElement.className,
      bodyClasses: document.body.className,
      tiles,
      seen,
      hash: location.hash,
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // ---- 1) Easter egg #/boot replays intro and resets hash on completion ----
    console.log('[A] Easter egg #/boot');
    {
      const page = await newPage(browser, { hasSeen: true });
      await page.goto(`${URL}#/boot`, { waitUntil: 'networkidle0' });
      await sleep(1700);
      const pressStartState = await inspect(page);
      console.log('  PRESS START state hash:', pressStartState.hash, 'overlay:', pressStartState.overlayDisplay);
      await shot(page, '05-easteregg-press');
      // Click to advance
      await page.mouse.click(720, 450);
      await sleep(1000);
      const afterAdvance = await inspect(page);
      console.log('  after advance: hash=', afterAdvance.hash, 'overlay=', afterAdvance.overlayDisplay, 'seen=', !!afterAdvance.seen);
      await shot(page, '06-easteregg-cascade');
      if (afterAdvance.hash !== '#/') console.warn('  ! expected hash to reset to #/');
      if (afterAdvance.overlayDisplay !== 'removed') console.warn('  ! expected overlay to be removed');
      await page.close();
    }

    // ---- 2) Reduced motion: instant menu, no overlay ----
    console.log('[B] Reduced motion');
    {
      const page = await newPage(browser, { reducedMotion: true, hasSeen: false });
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(300);
      const s = await inspect(page);
      console.log('  overlay=', s.overlayDisplay, 'body=', s.bodyClasses, 'seen=', !!s.seen);
      console.log('  tile opacities:', s.tiles.map((t) => `${t.mode}=${t.opacity}`).join(', '));
      await shot(page, '07-reduced-motion');
      await page.close();
    }

    // ---- 3) SKIP button advances ----
    console.log('[C] SKIP button advances');
    {
      const page = await newPage(browser, { hasSeen: false });
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(1700); // SKIP visible
      await page.click('[data-boot-skip]');
      await sleep(900);
      const s = await inspect(page);
      console.log('  after SKIP: overlay=', s.overlayDisplay, 'tile opacities=', s.tiles.map(t=>t.opacity).join(','));
      await shot(page, '08-skip-button');
      if (s.overlayDisplay !== 'removed') console.warn('  ! expected overlay removed after SKIP');
      await page.close();
    }

    // ---- 4) Keypress advances ----
    console.log('[D] Keypress advances');
    {
      const page = await newPage(browser, { hasSeen: false });
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(1700);
      await page.keyboard.press('Enter');
      await sleep(900);
      const s = await inspect(page);
      console.log('  after Enter: overlay=', s.overlayDisplay, 'seen=', !!s.seen);
      if (s.overlayDisplay !== 'removed') console.warn('  ! expected overlay removed after Enter');
      await page.close();
    }

    console.log('verification done.');
  } finally {
    await browser.close();
  }
})();
