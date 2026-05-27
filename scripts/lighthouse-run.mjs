// Run Lighthouse against the local dev server via Puppeteer, bypassing the
// chrome-launcher temp-cleanup bug on Windows.
import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import { URL } from 'url';

const TARGET = 'http://localhost:3000';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=9222'],
  });

  try {
    const wsEndpoint = browser.wsEndpoint();
    const port = new URL(wsEndpoint).port;

    const result = await lighthouse(TARGET, {
      port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 1.75,
        disabled: false,
      },
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
      },
    });

    const cats = result.lhr.categories;
    const score = (c) => Math.round(c.score * 100);
    console.log(`Performance:   ${score(cats.performance)}`);
    console.log(`Accessibility: ${score(cats.accessibility)}`);
    console.log(`Best Practices: ${score(cats['best-practices'])}`);

    const audits = result.lhr.audits;

    // -------- Accessibility detail --------
    const a11yFailures = Object.values(audits).filter(
      (a) => a.scoreDisplayMode === 'binary' && a.score === 0 &&
             cats.accessibility.auditRefs.find((r) => r.id === a.id)
    );
    if (a11yFailures.length) {
      console.log('\nAccessibility failures:');
      a11yFailures.forEach((a) => {
        console.log(`  - ${a.id}: ${a.title}`);
        const items = a.details?.items || [];
        items.slice(0, 8).forEach((it) => {
          const sel = it.node?.selector || it.node?.snippet?.slice(0, 80) || '';
          const expl = it.node?.explanation || it.explanation || '';
          console.log(`      • ${sel}`);
          if (expl) console.log(`        ${expl.replace(/\s+/g, ' ').slice(0, 200)}`);
        });
        if (items.length > 8) console.log(`      … and ${items.length - 8} more`);
      });
    }

    // -------- Best Practices detail --------
    const bpFailures = Object.values(audits).filter(
      (a) => a.scoreDisplayMode === 'binary' && a.score === 0 &&
             cats['best-practices'].auditRefs.find((r) => r.id === a.id)
    );
    if (bpFailures.length) {
      console.log('\nBest Practices failures:');
      bpFailures.forEach((a) => console.log(`  - ${a.id}: ${a.title}`));
    }

    // -------- Performance metrics --------
    console.log('\nPerformance metrics:');
    ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time',
     'cumulative-layout-shift', 'speed-index', 'interactive'].forEach((id) => {
      const a = audits[id];
      if (a) console.log(`  ${id}: ${a.displayValue} (score ${Math.round((a.score || 0) * 100)})`);
    });

    // -------- Top performance opportunities --------
    const perfOpps = Object.values(audits)
      .filter((a) => a.details?.type === 'opportunity' && a.numericValue > 0)
      .sort((a, b) => b.numericValue - a.numericValue)
      .slice(0, 8);
    if (perfOpps.length) {
      console.log('\nTop performance opportunities:');
      perfOpps.forEach((a) => console.log(`  - ${a.id}: ${Math.round(a.numericValue)}ms · ${a.title}`));
    }

    // -------- Diagnostics with non-1 score --------
    const diagnostics = Object.values(audits)
      .filter((a) => cats.performance.auditRefs.find((r) => r.id === a.id && r.group === 'diagnostics'))
      .filter((a) => a.score !== null && a.score < 1)
      .slice(0, 8);
    if (diagnostics.length) {
      console.log('\nDiagnostics:');
      diagnostics.forEach((a) => console.log(`  - ${a.id}: ${a.displayValue || a.title}`));
    }
  } finally {
    await browser.close();
  }
})();
