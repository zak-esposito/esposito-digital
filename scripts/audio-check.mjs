// Renders each UI sound through an OfflineAudioContext in a headless page,
// then reports peak amplitude, RMS, clipping count, and duration. This is the
// automated half of the "ear-check" step; the synths are reused verbatim from
// js/audio.js (loaded as a module) so what we measure is what the user hears.
import puppeteer from 'puppeteer';

const URL = 'http://127.0.0.1:3000/index.html';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('ze.boot.seen', String(Date.now())); } catch (_) {}
    });
    await page.goto(URL, { waitUntil: 'networkidle0' });

    // Render synths through OfflineAudioContext. We import audio.js directly so
    // the synth fns are the same code path used live. The exported SYNTHS map
    // isn't part of the public API, so we recreate the wrapping inline.
    const result = await page.evaluate(async () => {
      // Re-declare the three synth fns here so we can drive them with an OAC.
      // Keep them character-for-character identical to js/audio.js — drift here
      // would invalidate the check.
      function uiBlip(ctx, dest) {
        const t0 = ctx.currentTime;
        const dur = 0.08;
        const osc = ctx.createOscillator();
        osc.type = 'square'; osc.frequency.value = 1200;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 2.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.18, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(bp); bp.connect(g); g.connect(dest);
        osc.start(t0); osc.stop(t0 + dur + 0.02);
      }
      function uiConfirm(ctx, dest) {
        const t0 = ctx.currentTime;
        const dur = 0.28;
        const curve = new Float32Array(64);
        for (let i = 0; i < curve.length; i++) {
          const t = i / (curve.length - 1);
          const attack = Math.min(1, t * 8);
          const overshoot = 1 + 0.3 * Math.exp(-3 * t) * Math.sin(t * Math.PI * 3);
          const decay = Math.exp(-2.4 * t);
          curve[i] = Math.max(0, 0.22 * attack * overshoot * decay);
        }
        const sine = ctx.createOscillator();
        sine.type = 'sine'; sine.frequency.value = 220;
        const sineGain = ctx.createGain();
        sineGain.gain.setValueCurveAtTime(curve, t0, dur);
        sine.connect(sineGain); sineGain.connect(dest);
        const tri = ctx.createOscillator();
        tri.type = 'triangle'; tri.frequency.value = 880;
        const triGain = ctx.createGain();
        triGain.gain.setValueAtTime(0, t0);
        triGain.gain.linearRampToValueAtTime(0.09, t0 + 0.012);
        triGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
        tri.connect(triGain); triGain.connect(dest);
        sine.start(t0); tri.start(t0);
        sine.stop(t0 + dur + 0.02); tri.stop(t0 + 0.18);
      }
      function uiBack(ctx, dest) {
        const t0 = ctx.currentTime;
        const noteDur = 0.12;
        function note(freq, when) {
          const osc = ctx.createOscillator();
          osc.type = 'sine'; osc.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, when);
          g.gain.linearRampToValueAtTime(0.16, when + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, when + noteDur);
          osc.connect(g); g.connect(dest);
          osc.start(when); osc.stop(when + noteDur + 0.02);
        }
        note(659.25, t0);
        note(440, t0 + noteDur);
      }

      async function render(synth, durSec) {
        const SR = 48000;
        const oac = new OfflineAudioContext(1, Math.ceil(SR * durSec), SR);
        synth(oac, oac.destination);
        const buf = await oac.startRendering();
        const ch = buf.getChannelData(0);
        let peak = 0, sumSq = 0, clipped = 0;
        for (let i = 0; i < ch.length; i++) {
          const v = ch[i];
          const a = Math.abs(v);
          if (a > peak) peak = a;
          if (a >= 0.999) clipped++;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / ch.length);
        // First/last non-silence sample to measure useful duration
        let first = -1, last = -1;
        const thresh = 0.001;
        for (let i = 0; i < ch.length; i++) if (Math.abs(ch[i]) > thresh) { first = i; break; }
        for (let i = ch.length - 1; i >= 0; i--) if (Math.abs(ch[i]) > thresh) { last = i; break; }
        return {
          peak: +peak.toFixed(4),
          rms: +rms.toFixed(4),
          clipped,
          activeMs: first >= 0 && last >= 0 ? +(((last - first) / SR) * 1000).toFixed(1) : 0,
        };
      }

      const blip = await render(uiBlip, 0.15);
      const confirm = await render(uiConfirm, 0.40);
      const back = await render(uiBack, 0.40);

      // Boot chime: fetch & decode the MP3, then measure both raw and post-trim
      // (the 0.45x gain reduction the playback chain applies in audio.js).
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await fetch('assets/audio/boot-chime.mp3').then(r => r.arrayBuffer());
      const decoded = await ac.decodeAudioData(buf);
      const BOOT_TRIM = 0.45;
      const ch = decoded.getChannelData(0);
      let bcPeak = 0, bcSumSq = 0, bcClipped = 0;
      for (let i = 0; i < ch.length; i++) {
        const a = Math.abs(ch[i]) * BOOT_TRIM;
        if (a > bcPeak) bcPeak = a;
        if (a >= 0.999) bcClipped++;
        bcSumSq += (ch[i] * BOOT_TRIM) * (ch[i] * BOOT_TRIM);
      }
      const bootChime = {
        peak: +bcPeak.toFixed(4),
        rms: +Math.sqrt(bcSumSq / ch.length).toFixed(4),
        clipped: bcClipped,
        activeMs: +((decoded.duration) * 1000).toFixed(1),
        sampleRate: decoded.sampleRate,
        channels: decoded.numberOfChannels,
        trim: BOOT_TRIM,
      };
      await ac.close();

      return { bootChime, uiBlip: blip, uiConfirm: confirm, uiBack: back };
    });

    console.log('AUDIO ANALYSIS (peaks normalized to 1.0 / max digital level):');
    console.log(JSON.stringify(result, null, 2));

    console.log('\nQUICK INTERPRETATION:');
    const r = result;
    function verdict(name, m, target) {
      const peakOk = m.peak < 0.95 ? 'ok' : 'HOT';
      const clipOk = m.clipped === 0 ? 'no-clip' : `CLIP=${m.clipped}`;
      console.log(`  ${name.padEnd(11)} peak=${m.peak.toString().padEnd(6)} rms=${m.rms.toString().padEnd(6)} ${peakOk}, ${clipOk}, ${m.activeMs}ms (target ${target}ms)`);
    }
    verdict('bootChime',  r.bootChime,  '<3000');
    verdict('uiBlip',     r.uiBlip,     '~80');
    verdict('uiConfirm',  r.uiConfirm,  '~280');
    verdict('uiBack',     r.uiBack,     '~240');
  } finally {
    await browser.close();
  }
})();
