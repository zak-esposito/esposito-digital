import { audioBus } from '../audio.js';

const TRACK_URL = 'https://grademyrun.com';
const TRACK_HREF = 'https://grademyrun.com';

const SPEEDO_SVG = `
  <svg class="speedo__dial" viewBox="0 0 120 80" aria-hidden="true">
    <!-- Outer arc (220° sweep from -200° to 20°) -->
    <path
      class="speedo__arc-bg"
      d="M 14 70 A 46 46 0 1 1 106 70"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      opacity="0.38"
    />
    <!-- Lit progress arc — width animated via stroke-dashoffset -->
    <path
      class="speedo__arc"
      d="M 14 70 A 46 46 0 1 1 106 70"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      pathLength="100"
      stroke-dasharray="100"
    />
    <!-- Tick marks every 22° -->
    <g class="speedo__ticks" stroke="currentColor" stroke-width="1">
      <line x1="14" y1="70" x2="20" y2="68" />
      <line x1="19.5" y1="50" x2="25" y2="51" />
      <line x1="33" y1="34" x2="36.5" y2="38" />
      <line x1="52" y1="25" x2="53" y2="30" />
      <line x1="68" y1="25" x2="67" y2="30" />
      <line x1="87" y1="34" x2="83.5" y2="38" />
      <line x1="100.5" y1="50" x2="95" y2="51" />
      <line x1="106" y1="70" x2="100" y2="68" />
    </g>
    <!-- Needle pivot at (60, 70). Initial angle = -200° (resting). -->
    <g class="speedo__needle-group">
      <line
        class="speedo__needle"
        x1="60" y1="70" x2="60" y2="28"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
      <circle class="speedo__hub" cx="60" cy="70" r="3.5" fill="currentColor" />
      <circle cx="60" cy="70" r="1.5" fill="#04070A" />
    </g>
  </svg>
`;

export function renderTimeTrial(view) {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  const frameContent = isMobile
    ? `
            <img
              class="timetrial__static"
              src="brand_assets/grademyrun-hero.webp"
              alt="GradeMyRun preview"
              loading="lazy"
            />
            <span class="timetrial__static-note" aria-hidden="true">Full experience on desktop</span>
            <div class="timetrial__scan" aria-hidden="true"></div>`
    : `
            <iframe
              class="timetrial__iframe"
              src="${TRACK_URL}"
              title="GradeMyRun — live embed"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allow="clipboard-write"
            ></iframe>
            <div class="timetrial__scan" aria-hidden="true"></div>`;

  return `
    <section class="scene scene--timetrial" data-scene="timetrial" aria-labelledby="scene-title">
      <div class="scene__watermark" aria-hidden="true"><svg><use href="#${view.icon}"/></svg></div>

      <div class="timetrial">
        <header class="timetrial__head">
          <span class="timetrial__eyebrow">${view.index} &middot; Time Trial</span>
          <h2 class="timetrial__title" id="scene-title">Time Trial</h2>
          <p class="timetrial__subtitle">Take GradeMyRun for a lap.</p>
        </header>

        <div class="timetrial__hud" data-hud>
          <span class="timetrial__corner timetrial__corner--tl" aria-hidden="true"></span>
          <span class="timetrial__corner timetrial__corner--tr" aria-hidden="true"></span>
          <span class="timetrial__corner timetrial__corner--bl" aria-hidden="true"></span>
          <span class="timetrial__corner timetrial__corner--br" aria-hidden="true"></span>

          <div class="timetrial__bar timetrial__bar--top">
            <span class="timetrial__label">
              <span class="timetrial__label-dot" aria-hidden="true"></span>
              Track 01
              <span class="timetrial__label-name">— GradeMyRun</span>
            </span>
            <span class="timetrial__live" aria-label="Live embed">
              <span class="timetrial__live-led" aria-hidden="true"></span>
              Live Feed
            </span>
          </div>

          <div class="timetrial__frame">${frameContent}
          </div>

          <div class="timetrial__bar timetrial__bar--bottom">
            <div class="timetrial__speedo speedo">
              ${SPEEDO_SVG}
              <div class="speedo__readout">
                <strong class="speedo__value" data-speedo-value>000</strong>
                <span class="speedo__unit">km/h</span>
              </div>
            </div>
            <div class="timetrial__lap" aria-label="Lap counter">
              <span class="timetrial__lap-label">Lap</span>
              <strong class="timetrial__lap-value">01</strong>
              <span class="timetrial__lap-sep">/</span>
              <span class="timetrial__lap-total">01</span>
            </div>
          </div>
        </div>

        <a class="timetrial__cta" href="${TRACK_HREF}" target="_blank" rel="noopener" data-cta>
          Open Full Track
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>
    </section>
  `;
}

export function initTimeTrial(sceneContainer) {
  const hud = sceneContainer.querySelector('[data-hud]');
  if (!hud) return;

  const cta = sceneContainer.querySelector('[data-cta]');
  if (cta) {
    cta.addEventListener('mouseenter', () => audioBus.play('uiBlip'));
    cta.addEventListener('click', () => audioBus.play('uiConfirm'));
  }

  const valueEl = hud.querySelector('[data-speedo-value]');
  const arcEl = hud.querySelector('.speedo__arc');
  const needleGroup = hud.querySelector('.speedo__needle-group');
  if (!valueEl || !arcEl || !needleGroup) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Needle sweep range: -110° (rest) to +110° (max), pivoting on (60, 70).
  // The visual arc spans roughly 220°, so the needle ranges across that span.
  const MIN_ANGLE = -110;
  const MAX_ANGLE = 110;
  const MAX_SPEED = 327; // top-end of GradeMyRun-themed speedo, just for flavour

  function setSpeedo(progress) {
    // progress in [0, 1] → angle + value + arc length
    const clamped = Math.max(0, Math.min(1, progress));
    const angle = MIN_ANGLE + clamped * (MAX_ANGLE - MIN_ANGLE);
    const value = Math.round(clamped * MAX_SPEED);
    needleGroup.setAttribute('transform', `rotate(${angle.toFixed(2)} 60 70)`);
    arcEl.setAttribute('stroke-dashoffset', String(100 - clamped * 100));
    valueEl.textContent = value.toString().padStart(3, '0');
  }

  if (reduce) {
    // Hold at a steady mid-throttle figure rather than animating.
    setSpeedo(0.65);
    return;
  }

  // Idle warm-up to a cruise speed, then a slow sinusoidal breath so the HUD
  // feels alive without being distracting.
  const startedAt = performance.now();
  const RAMP_MS = 1800;
  const CRUISE = 0.72;
  const BREATH_AMP = 0.08;
  const BREATH_PERIOD = 5200;
  let rafId = 0;

  function tick(now) {
    if (!document.body.contains(hud)) return; // scene torn down
    const t = now - startedAt;
    let progress;
    if (t < RAMP_MS) {
      const r = t / RAMP_MS;
      // ease-out quad
      progress = CRUISE * (1 - (1 - r) * (1 - r));
    } else {
      const phase = ((t - RAMP_MS) / BREATH_PERIOD) * Math.PI * 2;
      progress = CRUISE + Math.sin(phase) * BREATH_AMP;
    }
    setSpeedo(progress);
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  // Best-effort cleanup if the scene container is wiped while we're animating.
  const observer = new MutationObserver(() => {
    if (!document.body.contains(hud)) {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    }
  });
  observer.observe(sceneContainer, { childList: true, subtree: false });
}
