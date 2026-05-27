// Polish pass: edge-case verification + screenshot round.
// Usage: node scripts/polish-pass.mjs [round]
//   round defaults to "r1"; pass "r2" for the verification round.
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROUND = (process.argv[2] || 'r1').trim();
const URL = 'http://127.0.0.1:3000/index.html';
const OUT = resolve(process.cwd(), 'scripts', 'shots', `polish-${ROUND}`);
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clearBootSeen(page) {
  await page.evaluateOnNewDocument(() => {
    try { localStorage.removeItem('ze.boot.seen'); } catch (_) {}
  });
}
async function clearBootViaCDP(page) {
  await page.evaluateOnNewDocument(() => {
    try { localStorage.removeItem('ze.boot.seen'); } catch (_) {}
  });
}
async function skipBoot(page) {
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('ze.boot.seen', String(Date.now())); } catch (_) {}
  });
}

async function shot(page, name, opts = {}) {
  const file = resolve(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: !!opts.full });
  console.log(`  -> ${file}`);
  return file;
}

async function withDesktop(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  return page;
}
async function withMobile(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  return page;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const findings = [];

  try {
    // ---------------- EDGE CASES ----------------

    // E1) Pit Radio empty submit -> verify HTML5 validation fires
    console.log('[E1] Pit Radio empty submit');
    {
      const page = await withDesktop(browser);
      await skipBoot(page);
      await page.goto(`${URL}#/radio`, { waitUntil: 'networkidle0' });
      await sleep(400);
      // Click submit on empty form
      await page.click('[data-radio-submit]');
      await sleep(250);
      const result = await page.evaluate(() => {
        const name = document.getElementById('radio-name');
        const email = document.getElementById('radio-email');
        const msg = document.getElementById('radio-message');
        return {
          formExists: !!document.querySelector('[data-radio-form]'),
          novalidate: document.querySelector('[data-radio-form]')?.hasAttribute('novalidate'),
          nameInvalid: name?.validity?.valueMissing === true,
          emailInvalid: email?.validity?.valueMissing === true,
          msgInvalid: msg?.validity?.valueMissing === true,
          firstInvalid: document.querySelector(':invalid')?.id || null,
          activeElement: document.activeElement?.id || null,
        };
      });
      console.log('   ', JSON.stringify(result));
      if (result.novalidate) findings.push('Pit Radio: novalidate still present');
      if (!result.nameInvalid || !result.emailInvalid || !result.msgInvalid) {
        findings.push('Pit Radio: required fields not marked invalid on empty submit');
      }
      await shot(page, 'e1-radio-empty-submit');
      await page.close();
    }

    // E2) Slow 3G boot — boot starts before audio decodes; should degrade
    console.log('[E2] Slow 3G boot — audio degrades gracefully');
    {
      const page = await withDesktop(browser);
      const consoleErrs = [];
      page.on('pageerror', (err) => consoleErrs.push('pageerror: ' + err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrs.push('console.error: ' + msg.text());
      });
      await clearBootViaCDP(page); // throttled mode: set localStorage via CDP before goto
      const client = await page.target().createCDPSession();
      await client.send('Network.enable');
      // Slow 3G profile: 400 Kbps down, 400 ms RTT — boot HTML parses fast, but
      // the 50KB boot-chime.mp3 still in flight when user advances.
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 400,
        downloadThroughput: (400 * 1024) / 8,
        uploadThroughput: (400 * 1024) / 8,
      });
      try {
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
      } catch (e) {
        findings.push(`Slow 3G: goto failed (${e.message})`);
      }
      // Give boot script a moment to attach
      await sleep(1800);
      // Capture pre-advance state
      const pre = await page.evaluate(() => {
        const overlay = document.getElementById('boot-overlay');
        const menu = document.querySelector('[data-view="menu"]');
        return {
          overlayExists: !!overlay,
          overlayDisplay: overlay ? getComputedStyle(overlay).display : null,
          menuExists: !!menu,
          menuHidden: menu ? menu.hidden : null,
          bootBuffer: window.ze?.audio?.bootBuffer ? 'present' : 'pending',
          bootLoading: !!window.ze?.audio?.bootLoading,
        };
      });
      console.log('    pre-advance:', JSON.stringify(pre));
      // Advance via click (this should call audioBus.unlock() then attempt bootChime)
      await page.mouse.click(720, 450);
      await sleep(800);
      const post = await page.evaluate(() => {
        const overlay = document.getElementById('boot-overlay');
        const menu = document.querySelector('[data-view="menu"]');
        return {
          overlayDisplay: overlay ? getComputedStyle(overlay).display : 'removed',
          menuHidden: menu ? menu.hidden : null,
        };
      });
      console.log('    post-advance:', JSON.stringify(post));
      // Restore network so the screenshot completes quickly
      await client.send('Network.emulateNetworkConditions', {
        offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
      });
      await sleep(800);
      await shot(page, 'e2-slow3g-after-advance');
      if (consoleErrs.length > 0) {
        findings.push(`Slow 3G boot produced ${consoleErrs.length} error(s): ${consoleErrs.join(' | ')}`);
      }
      await page.close();
    }

    // E3) Garage: back mid-inspect
    console.log('[E3] Garage back mid-inspect — state resets cleanly');
    {
      const page = await withDesktop(browser);
      await skipBoot(page);
      await page.goto(`${URL}#/garage`, { waitUntil: 'networkidle0' });
      await sleep(400);
      await page.click('.bay[data-project="snap2shop"]');
      await sleep(120); // mid-inspect: animation still in flight
      // Click main-menu back
      await page.click('[data-back]');
      await sleep(500);
      // Navigate back to garage and check it renders fresh in lineup mode
      await page.goto(`${URL}#/garage`, { waitUntil: 'networkidle0' });
      await sleep(500);
      const state = await page.evaluate(() => {
        const scene = document.querySelector('.scene--garage');
        const spec = document.querySelector('[data-spec]');
        const selected = document.querySelectorAll('.bay.is-selected').length;
        return {
          dataState: scene?.dataset?.state || null,
          specHidden: spec?.getAttribute('aria-hidden'),
          selectedCount: selected,
          specHasContent: !!(spec?.innerHTML?.trim()),
        };
      });
      console.log('   ', JSON.stringify(state));
      if (state.dataState !== 'lineup') findings.push(`Garage: after back-mid-inspect, state is "${state.dataState}", expected "lineup"`);
      if (state.selectedCount !== 0) findings.push(`Garage: ${state.selectedCount} bay still marked is-selected after back`);
      if (state.specHasContent) findings.push('Garage: spec sheet still contains content after back-mid-inspect');
      await shot(page, 'e3-garage-after-back-mid-inspect');
      await page.close();
    }

    // ---------------- SCREENSHOT ROUND ----------------

    // S1) Boot PRESS START
    console.log('[S1] Boot PRESS START');
    {
      const page = await withDesktop(browser);
      await clearBootSeen(page);
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(1700); // post-PRESS START phase
      await shot(page, 's1-boot-press-start');
      await page.close();
    }

    // S2) Menu desktop
    console.log('[S2] Menu desktop');
    {
      const page = await withDesktop(browser);
      await skipBoot(page);
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(600);
      await shot(page, 's2-menu-desktop');
      await shot(page, 's2-menu-desktop-full', { full: true });
      await page.close();
    }

    // S3..S6) Four scenes desktop
    const scenes = [
      { hash: 'career', name: 's3-career' },
      { hash: 'garage', name: 's4-garage' },
      { hash: 'timetrial', name: 's5-timetrial' },
      { hash: 'radio', name: 's6-radio' },
    ];
    for (const s of scenes) {
      console.log(`[${s.name}] ${s.hash} desktop`);
      const page = await withDesktop(browser);
      await skipBoot(page);
      await page.goto(`${URL}#/${s.hash}`, { waitUntil: 'networkidle0' });
      await sleep(600);
      await shot(page, s.name);
      await shot(page, `${s.name}-full`, { full: true });
      await page.close();
    }

    // S7) Garage inspect — verify Cam number per bay
    console.log('[S7] Garage inspect — Cam number check');
    {
      const checks = [
        { id: 'grademyrun', expected: 'Cam 01' },
        { id: 'snap2shop', expected: 'Cam 02' },
        { id: 'ventureforge', expected: 'Cam 03' },
        { id: 'houseedge', expected: 'Cam 04' },
      ];
      for (const c of checks) {
        const page = await withDesktop(browser);
        await skipBoot(page);
        await page.goto(`${URL}#/garage`, { waitUntil: 'networkidle0' });
        await sleep(300);
        await page.click(`.bay[data-project="${c.id}"]`);
        await sleep(550);
        const camText = await page.evaluate(() => {
          const el = document.querySelector('.spec-sheet__monitor-bay');
          return el ? el.textContent.trim() : null;
        });
        const ok = camText === c.expected;
        console.log(`    ${c.id}: ${camText} ${ok ? 'OK' : '!= ' + c.expected}`);
        if (!ok) findings.push(`Garage cam label mismatch for ${c.id}: got "${camText}", expected "${c.expected}"`);
        await shot(page, `s7-garage-${c.id}-inspect`);
        await page.close();
      }
    }

    // S8) Menu mobile 390px
    console.log('[S8] Menu mobile 390px');
    {
      const page = await withMobile(browser);
      await skipBoot(page);
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await sleep(600);
      await shot(page, 's8-menu-mobile');
      await shot(page, 's8-menu-mobile-full', { full: true });
      await page.close();
    }

    // ---------------- SUMMARY ----------------
    console.log('\n========== SUMMARY ==========');
    if (findings.length === 0) {
      console.log('  All checks passed.');
    } else {
      console.log(`  ${findings.length} finding(s):`);
      findings.forEach((f) => console.log(`   - ${f}`));
    }
  } finally {
    await browser.close();
  }
})();
