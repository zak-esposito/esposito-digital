// Verifies accessibility + performance pass: keyboard nav, focus rings, ARIA,
// reduced-motion auto-mute, lazy-loading, audio deferral.
// Usage: node scripts/verify-a11y.mjs
import puppeteer from 'puppeteer';

const URL = 'http://localhost:3000/';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}${detail ? ' — ' + detail : ''}`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // ============================================================
    //  PART A — Normal session (boot disabled via localStorage.seen)
    // ============================================================
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Skip boot overlay
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('ze.boot.seen', String(Date.now()));
    });

    // Track audio resource requests
    const audioRequests = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('boot-chime') || url.endsWith('.mp3')) audioRequests.push(url);
    });

    await page.goto(URL, { waitUntil: 'networkidle0' });

    // -------- Skip link present + becomes visible on focus --------
    const skipLink = await page.$('.skip-link');
    record('Skip link present', !!skipLink);

    // -------- ARIA on menu tiles --------
    const menuAria = await page.evaluate(() => {
      const grid = document.querySelector('.tile-grid');
      const tiles = grid?.querySelectorAll('.tile');
      return {
        gridRole: grid?.getAttribute('role'),
        gridLabel: grid?.getAttribute('aria-label'),
        tileCount: tiles?.length || 0,
        tileRoles: Array.from(tiles || []).map((t) => t.getAttribute('role')),
      };
    });
    record('role="menu" on tile grid', menuAria.gridRole === 'menu', `got "${menuAria.gridRole}"`);
    record('aria-label on tile grid', !!menuAria.gridLabel);
    record('All 4 tiles have role="menuitem"',
      menuAria.tileCount === 4 && menuAria.tileRoles.every((r) => r === 'menuitem'));

    // -------- Mute button ARIA --------
    const muteAria = await page.evaluate(() => {
      const btn = document.querySelector('[data-mute]');
      return {
        pressed: btn?.getAttribute('aria-pressed'),
        label: btn?.getAttribute('aria-label'),
      };
    });
    record('Mute button has aria-pressed', muteAria.pressed !== null);
    record('Mute button has aria-label', !!muteAria.label);

    // -------- Audio NOT loaded before gesture --------
    record('Audio file not fetched before gesture', audioRequests.length === 0,
      `requests=${audioRequests.length}`);

    // -------- aria-live announcement region --------
    const announcer = await page.$('[data-route-announce]');
    record('aria-live route announcer present', !!announcer);

    // -------- Keyboard: Tab reaches first tile --------
    await page.keyboard.press('Tab'); // skip-link
    await page.keyboard.press('Tab'); // mute btn (or first tile depending on order)
    // We don't know exact tab order, so search for first tile focused by tabbing
    let tabCount = 0;
    let firstTileFocused = false;
    for (let i = 0; i < 8; i++) {
      const focused = await page.evaluate(() => document.activeElement?.classList?.contains('tile'));
      if (focused) { firstTileFocused = true; break; }
      await page.keyboard.press('Tab');
      tabCount++;
    }
    record('Tab reaches a tile', firstTileFocused);

    // -------- Focus ring is visible (computed style check) --------
    const focusRingApplied = await page.evaluate(() => {
      const tile = document.activeElement;
      if (!tile?.classList?.contains('tile')) return null;
      const cs = getComputedStyle(tile);
      return {
        borderColor: cs.borderColor,
        boxShadow: cs.boxShadow,
      };
    });
    record('Focused tile has visible focus styling',
      !!focusRingApplied?.boxShadow && focusRingApplied.boxShadow !== 'none',
      `box-shadow=${focusRingApplied?.boxShadow?.slice(0, 60)}…`);

    // -------- Arrow key nav between tiles --------
    const beforeArrow = await page.evaluate(() => document.activeElement?.dataset?.mode);
    await page.keyboard.press('ArrowRight');
    const afterArrowRight = await page.evaluate(() => document.activeElement?.dataset?.mode);
    record('ArrowRight moves focus to next tile',
      beforeArrow !== afterArrowRight && !!afterArrowRight,
      `${beforeArrow} → ${afterArrowRight}`);

    await page.keyboard.press('ArrowDown');
    const afterArrowDown = await page.evaluate(() => document.activeElement?.dataset?.mode);
    record('ArrowDown moves focus to tile below',
      afterArrowDown !== afterArrowRight,
      `${afterArrowRight} → ${afterArrowDown}`);

    await page.keyboard.press('ArrowLeft');
    const afterArrowLeft = await page.evaluate(() => document.activeElement?.dataset?.mode);
    record('ArrowLeft moves focus to previous tile',
      afterArrowLeft !== afterArrowDown);

    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Home');
    const afterHome = await page.evaluate(() => document.activeElement?.dataset?.mode);
    record('Home jumps to first tile', afterHome === 'career', `got ${afterHome}`);

    await page.keyboard.press('End');
    const afterEnd = await page.evaluate(() => document.activeElement?.dataset?.mode);
    record('End jumps to last tile', afterEnd === 'radio', `got ${afterEnd}`);

    // -------- Enter activates a tile (navigate to /career) --------
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 350));
    const careerLoaded = await page.evaluate(() => {
      return {
        hash: window.location.hash,
        sceneEl: !!document.querySelector('.scene--career'),
        title: document.querySelector('#scene-title')?.textContent,
        announcement: document.querySelector('[data-route-announce]')?.textContent,
      };
    });
    record('Enter activates tile + scene loads',
      careerLoaded.hash === '#/career' && careerLoaded.sceneEl,
      `hash=${careerLoaded.hash}, scene=${careerLoaded.sceneEl}`);
    record('Scene announcement updated',
      /Career/.test(careerLoaded.announcement || ''),
      `"${careerLoaded.announcement}"`);

    // -------- ESC returns to menu --------
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 350));
    const backToMenu = await page.evaluate(() => ({
      hash: window.location.hash,
      menuVisible: !document.querySelector('[data-view="menu"]')?.hidden,
    }));
    record('ESC returns to menu', backToMenu.hash === '#/' && backToMenu.menuVisible);

    // -------- Career portrait lazy --------
    await page.goto(URL + '#/career', { waitUntil: 'networkidle0' });
    const careerLazy = await page.$eval('.career__portrait-img', (img) => ({
      lazy: img.getAttribute('loading'),
      alt: img.getAttribute('alt'),
    }));
    record('Career portrait loading="lazy"', careerLazy.lazy === 'lazy', `loading=${careerLazy.lazy}`);
    record('Career portrait has alt', !!careerLazy.alt);

    // -------- Garage TEAM PROJECT chip readable --------
    await page.goto(URL + '#/garage', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-spec]', { timeout: 5000 });
    const teamChipText = await page.$eval('.bay__chip', (el) => el.textContent.trim()).catch(() => null);
    record('Garage TEAM PROJECT chip rendered', teamChipText === 'Team Project',
      `text="${teamChipText}"`);

    // -------- Spec sheet aria-live --------
    const specAria = await page.$eval('[data-spec]', (el) => el.getAttribute('aria-live'));
    record('Spec sheet aria-live="polite"', specAria === 'polite');

    // -------- Garage bay lazy --------
    await page.click('[data-project="grademyrun"]');
    await page.waitForSelector('.spec-sheet__monitor-img', { timeout: 5000 });
    const monImg = await page.$eval('.spec-sheet__monitor-img', (img) => img.getAttribute('loading'));
    record('Garage spec sheet image loading="lazy"', monImg === 'lazy');

    // ============================================================
    //  PART B — prefers-reduced-motion auto-mute on first visit
    // ============================================================
    const reducedPage = await browser.newPage();
    await reducedPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    // Fresh storage
    await reducedPage.evaluateOnNewDocument(() => {
      try { localStorage.clear(); } catch (_) {}
    });
    await reducedPage.goto(URL, { waitUntil: 'networkidle0' });
    const muted = await reducedPage.evaluate(() => window.ze?.audio?.isMuted());
    record('Reduced motion auto-mutes audio on first visit', muted === true, `muted=${muted}`);

    // ============================================================
    //  PART C — Pit Radio form labels
    // ============================================================
    await page.goto(URL + '#/radio', { waitUntil: 'networkidle0' });
    const radioForm = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.radio-form__label'));
      const inputs = Array.from(document.querySelectorAll('.radio-form__input:not(.radio-form__honey)'));
      return {
        labelCount: labels.length,
        labelsLinked: labels.every((l) => l.getAttribute('for')),
        inputsRequired: inputs.every((i) => i.hasAttribute('required')),
        submitFocusable: !!document.querySelector('[data-radio-submit]')?.tabIndex !== -1,
      };
    });
    record('All form labels have for=', radioForm.labelsLinked);
    record('All required inputs marked required', radioForm.inputsRequired);
    record('Submit button reachable', radioForm.submitFocusable);

    // ============================================================
    //  PART D — Final tally
    // ============================================================
    const passed = results.filter((r) => r.ok).length;
    const total = results.length;
    console.log(`\n=== ${passed}/${total} checks passed ===`);
    if (passed !== total) {
      console.log('FAILED:');
      results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.detail || ''}`));
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
})();
