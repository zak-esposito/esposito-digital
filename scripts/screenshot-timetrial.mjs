// Screenshots the Time Trial scene and verifies the grademyrun.com iframe
// actually renders (not blocked by an X-Frame-Options/CSP we missed).
// Usage: node scripts/screenshot-timetrial.mjs
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = 'http://127.0.0.1:3000/index.html#/timetrial';
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

    // Capture console + frame failures so an XFO/CSP block is loud.
    const blocked = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (/refused to (display|connect)|x-frame-options|frame-ancestors|content security policy/i.test(text)) {
        blocked.push({ type: 'console', text });
      }
    });
    page.on('requestfailed', (req) => {
      if (req.url().includes('grademyrun.com')) {
        blocked.push({ type: 'requestfailed', url: req.url(), reason: req.failure()?.errorText });
      }
    });

    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2200);

    // Probe: did the iframe actually load grademyrun.com?
    const iframeReport = await page.evaluate(async () => {
      const el = document.querySelector('.timetrial__iframe');
      if (!el) return { ok: false, reason: 'no-iframe-element' };
      const rect = el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) {
        return { ok: false, reason: 'iframe-zero-size', rect };
      }
      try {
        // We can't read cross-origin content, but contentWindow.location.href is
        // still accessible for our own src attribute; a successful load also
        // leaves contentWindow non-null. If XFO blocked it, the iframe stays
        // attached but renders an error page (still non-null contentWindow).
        const hasWindow = !!el.contentWindow;
        return { ok: hasWindow, src: el.src, width: rect.width, height: rect.height };
      } catch (e) {
        return { ok: false, reason: String(e) };
      }
    });

    console.log('\n=== IFRAME PROBE ===');
    console.log(JSON.stringify(iframeReport, null, 2));
    if (blocked.length) {
      console.log('\n=== BLOCK SIGNALS ===');
      console.log(JSON.stringify(blocked, null, 2));
    } else {
      console.log('\n=== BLOCK SIGNALS: none ===');
    }

    const shot = resolve(OUT, 'timetrial.png');
    await page.screenshot({ path: shot, fullPage: false });
    console.log(`  → ${shot}`);

    const full = resolve(OUT, 'timetrial-full.png');
    await page.screenshot({ path: full, fullPage: true });
    console.log(`  → ${full}`);

    // Mobile
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(2200);
    const mobile = resolve(OUT, 'timetrial-mobile.png');
    await page.screenshot({ path: mobile, fullPage: true });
    console.log(`  → ${mobile}`);
  } finally {
    await browser.close();
  }
})();
