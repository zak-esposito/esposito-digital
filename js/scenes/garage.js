import { audioBus } from '../audio.js';

const PROJECTS = [
  {
    id: 'grademyrun',
    name: 'GradeMyRun',
    accent: '#10B981',
    tagline: 'Live 5K age-grading calculator.',
    livery: 'stopwatch',
    spec: {
      team: 'Solo',
      stack: 'React · TypeScript · Tailwind CSS',
      status: 'LIVE',
      url: 'grademyrun.com',
      urlHref: 'https://grademyrun.com',
      blurb: 'Live 5K age-grading calculator. Find out how good your time really is for your age.',
      shot: 'brand_assets/grademyrun-hero.webp',
      shotAlt: 'GradeMyRun hero screenshot',
    },
  },
  {
    id: 'snap2shop',
    name: 'Snap2Shop',
    accent: '#60A5FA',
    tagline: 'AI product ID. Snap. Find.',
    livery: 'lens',
    spec: {
      team: 'Solo',
      stack: 'React · TypeScript',
      status: 'BUILT',
      blurb: 'AI-powered product identification. Photograph a product and find where to buy it online.',
      shot: 'brand_assets/snap2shop-screenshot.webp',
      shotAlt: 'Snap2Shop screenshot',
    },
  },
  {
    id: 'ventureforge',
    name: 'VentureForge',
    accent: '#F59E0B',
    tagline: 'AI R&D lab for solo founders.',
    livery: 'spark',
    spec: {
      team: 'Solo',
      stack: 'React · TypeScript · Gemini AI',
      status: 'BUILT',
      blurb: 'AI-powered R&D lab for solo founders. Validate startup ideas with deep reasoning and real-time market research.',
      shot: 'brand_assets/ventureforge-screenshot.webp',
      shotAlt: 'VentureForge screenshot',
    },
  },
  {
    id: 'houseedge',
    name: 'HouseEdge',
    accent: '#A78BFA',
    tagline: 'Group project · team build.',
    livery: 'chip',
    isTeam: true,
    spec: {
      team: 'Group Project',
      stack: 'React · TypeScript · Recharts · Anthropic Claude API',
      status: 'BUILT',
      blurb: 'Gamified FinTech simulation for gambling risk education. Play with virtual chips to experience the house edge, while a live analytics layer surfaces loss chasing and bet escalation in real time.',
      contribution: 'Group project. Zak built the behaviour analytics layer: TypeScript interface set, loss chasing detection, bet escalation tracking, live bankroll chart (Recharts), and the dual-mode InsightsPanel. Also set up the shared repo, branching workflow, and integration documentation.',
      shot: 'brand_assets/houseedge-screenshot.png',
      shotAlt: 'HouseEdge screenshot',
    },
  },
];

const LIVERIES = {
  // stopwatch — pace/timing motif (GradeMyRun)
  stopwatch: `
    <g transform="translate(155, 56)">
      <circle cx="0" cy="0" r="8.5" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <line x1="0" y1="-10.5" x2="0" y2="-8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="0" y2="-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="4" y2="2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="1.1" fill="currentColor"/>
    </g>
  `,
  // lens — camera motif (Snap2Shop)
  lens: `
    <g transform="translate(155, 56)">
      <circle cx="0" cy="0" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="0" cy="0" r="5.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <circle cx="0" cy="0" r="2" fill="currentColor"/>
      <circle cx="-3" cy="-3" r="0.9" fill="currentColor" opacity="0.7"/>
    </g>
  `,
  // spark — energy motif (VentureForge)
  spark: `
    <g transform="translate(150, 46)">
      <path d="M 6 0 L -2 10 L 2.5 10 L -1 20 L 8 8 L 3.5 8 Z" fill="currentColor"/>
    </g>
  `,
  // chip — card/poker motif (HouseEdge)
  chip: `
    <g transform="translate(143, 50)">
      <rect x="0" y="0" width="22" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <rect x="3" y="3" width="6.5" height="4.5" rx="0.6" fill="currentColor"/>
      <line x1="12" y1="4.5" x2="19" y2="4.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
      <line x1="12" y1="8" x2="19" y2="8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
      <line x1="12" y1="11.5" x2="17" y2="11.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
    </g>
  `,
};

// Side-profile racing-car silhouette. Same chassis across all four projects;
// the accent colour and the livery glyph differentiate them.
function carSvg(project) {
  const livery = LIVERIES[project.livery] || '';
  return `
    <svg class="bay__car-svg" viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="--c-accent:${project.accent};">
      <ellipse class="bay__car-shadow" cx="160" cy="110" rx="118" ry="3.2"/>

      <!-- Rear wing endplate + blade -->
      <path class="bay__car-wing" d="M 268 22 L 304 22 L 304 30 L 292 30 L 292 64 L 286 64 L 286 30 L 268 30 Z"/>
      <line class="bay__car-wing-edge" x1="304" y1="22" x2="304" y2="64"/>

      <!-- Main body silhouette -->
      <path class="bay__car-body" d="M 14 94
        L 32 80
        L 80 78
        L 96 64
        L 132 54
        L 150 42
        L 196 40
        L 218 50
        L 238 60
        L 268 62
        L 282 66
        L 296 78
        L 308 94
        Z"/>

      <!-- Canopy glass tint -->
      <path class="bay__car-canopy" d="M 132 54 L 150 42 L 196 40 L 218 50 L 200 52 L 156 52 Z"/>

      <!-- Side intake -->
      <path class="bay__car-intake" d="M 100 70 L 128 64 L 128 72 L 100 76 Z"/>

      <!-- Front splitter -->
      <line class="bay__car-splitter" x1="8" y1="94" x2="40" y2="94"/>

      <!-- Door / livery slot -->
      <g class="bay__car-livery">${livery}</g>

      <!-- Wheels -->
      <g class="bay__car-wheel">
        <circle cx="68" cy="92" r="18"/>
        <circle class="bay__car-rim" cx="68" cy="92" r="10"/>
        <circle class="bay__car-hub" cx="68" cy="92" r="3"/>
      </g>
      <g class="bay__car-wheel">
        <circle cx="252" cy="92" r="18"/>
        <circle class="bay__car-rim" cx="252" cy="92" r="10"/>
        <circle class="bay__car-hub" cx="252" cy="92" r="3"/>
      </g>
    </svg>
  `;
}

function renderBay(project) {
  const teamChip = project.isTeam
    ? `<span class="bay__chip">Team Project</span>`
    : '';
  return `
    <button type="button" class="bay" data-project="${project.id}" aria-label="Inspect ${project.name}" style="--c-accent:${project.accent};">
      <span class="bay__corner bay__corner--tl" aria-hidden="true"></span>
      <span class="bay__corner bay__corner--tr" aria-hidden="true"></span>
      <span class="bay__corner bay__corner--bl" aria-hidden="true"></span>
      <span class="bay__corner bay__corner--br" aria-hidden="true"></span>
      <span class="bay__bayno" aria-hidden="true">Bay 0${PROJECTS.indexOf(project) + 1}</span>
      <div class="bay__car">${carSvg(project)}</div>
      <div class="bay__floor" aria-hidden="true"></div>
      <div class="bay__meta">
        <div class="bay__name-row">
          <h3 class="bay__name">${project.name}</h3>
          ${teamChip}
        </div>
        <p class="bay__tagline">${project.tagline}</p>
      </div>
      <span class="bay__prompt">
        Inspect
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    </button>
  `;
}

function renderSpecSheet(project) {
  const s = project.spec;
  const isLive = s.status === 'LIVE';
  const bayNo = String(PROJECTS.indexOf(project) + 1).padStart(2, '0');
  const teamChip = project.isTeam
    ? `<span class="spec-sheet__chip">Team Project</span>`
    : '';
  const contributionBlock = s.contribution
    ? `<p class="spec-sheet__contribution"><span class="spec-sheet__contribution-label">My role</span> ${s.contribution}</p>`
    : '';
  const urlBlock = s.urlHref
    ? `<a class="spec-sheet__url" href="${s.urlHref}" target="_blank" rel="noopener">
         Open Track
         <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
       </a>`
    : '';

  return `
    <header class="spec-sheet__head">
      <span class="spec-sheet__eyebrow">Spec Sheet</span>
      <div class="spec-sheet__title-row">
        <h3 class="spec-sheet__title">${project.name}</h3>
        ${teamChip}
      </div>
      <p class="spec-sheet__blurb">${s.blurb}</p>
      ${contributionBlock}
    </header>

    <div class="spec-sheet__monitor">
      <span class="spec-sheet__monitor-led" aria-hidden="true"></span>
      <span class="spec-sheet__monitor-bay" aria-hidden="true">Cam ${bayNo}</span>
      <div class="spec-sheet__monitor-frame">
        <img class="spec-sheet__monitor-img" src="${s.shot}" alt="${s.shotAlt}" loading="lazy" />
        <div class="spec-sheet__monitor-scan" aria-hidden="true"></div>
      </div>
    </div>

    <dl class="spec-sheet__stats">
      <div class="spec-sheet__stat">
        <dt>Team</dt>
        <dd>${s.team}</dd>
      </div>
      <div class="spec-sheet__stat">
        <dt>Stack</dt>
        <dd>${s.stack}</dd>
      </div>
      <div class="spec-sheet__stat">
        <dt>Status</dt>
        <dd>
          <span class="spec-sheet__status${isLive ? ' is-live' : ''}">${s.status}</span>
        </dd>
      </div>
    </dl>

    ${urlBlock}
  `;
}

export function renderGarage(view) {
  const lineup = PROJECTS.map(renderBay).join('');
  return `
    <section class="scene scene--garage" data-scene="garage" data-state="lineup" aria-labelledby="scene-title">
      <div class="scene__watermark" aria-hidden="true"><svg><use href="#${view.icon}"/></svg></div>

      <div class="garage" data-garage>
        <header class="garage__head">
          <span class="garage__eyebrow">${view.index} · Garage</span>
          <h2 class="garage__title" id="scene-title">Garage</h2>
          <p class="garage__subtitle">Four projects, four builds. Pick a bay to inspect.</p>
        </header>

        <div class="garage__stage">
          <div class="garage__lineup" data-lineup>
            ${lineup}
          </div>

          <aside class="spec-sheet" data-spec aria-live="polite" aria-hidden="true"></aside>
        </div>

        <button type="button" class="garage__back-to-lineup" data-back-to-lineup hidden>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Back to Garage
        </button>
      </div>
    </section>
  `;
}

export function initGarage(sceneContainer) {
  const garage = sceneContainer.querySelector('[data-garage]');
  if (!garage) return;

  const lineup = garage.querySelector('[data-lineup]');
  const spec = garage.querySelector('[data-spec]');
  const backBtn = garage.querySelector('[data-back-to-lineup]');
  const scene = sceneContainer.querySelector('.scene--garage');

  let mode = 'lineup'; // 'lineup' | 'inspect'
  let activeId = null;

  function enterInspect(projectId) {
    const project = PROJECTS.find((p) => p.id === projectId);
    if (!project) return;
    activeId = projectId;
    mode = 'inspect';

    lineup.querySelectorAll('.bay').forEach((b) => {
      b.classList.toggle('is-selected', b.dataset.project === projectId);
    });

    spec.innerHTML = renderSpecSheet(project);
    spec.style.setProperty('--c-accent', project.accent);
    spec.setAttribute('aria-hidden', 'false');

    scene.dataset.state = 'inspect';
    backBtn.hidden = false;
    // Defer focus shift so the spring animation isn't interrupted by scroll.
    setTimeout(() => {
      const title = spec.querySelector('.spec-sheet__title');
      if (title) title.setAttribute('tabindex', '-1');
      if (title && typeof title.focus === 'function') title.focus({ preventScroll: true });
    }, 320);
  }

  function exitInspect() {
    if (mode !== 'inspect') return;
    mode = 'lineup';
    const lastId = activeId;
    activeId = null;

    scene.dataset.state = 'lineup';
    backBtn.hidden = true;
    spec.setAttribute('aria-hidden', 'true');

    lineup.querySelectorAll('.bay').forEach((b) => {
      b.classList.remove('is-selected');
    });

    // Refocus the bay the user came from so keyboard flow doesn't jump.
    if (lastId) {
      const target = lineup.querySelector(`.bay[data-project="${lastId}"]`);
      if (target) target.focus({ preventScroll: true });
    }

    // Clear spec content after the slide-out completes so the DOM stays light.
    setTimeout(() => {
      if (mode === 'lineup') spec.innerHTML = '';
    }, 360);
  }

  lineup.addEventListener('click', (e) => {
    const bay = e.target.closest('.bay');
    if (!bay || !lineup.contains(bay)) return;
    audioBus.play('uiConfirm');
    enterInspect(bay.dataset.project);
  });

  lineup.addEventListener('mouseenter', (e) => {
    const bay = e.target.closest && e.target.closest('.bay');
    if (!bay) return;
    audioBus.play('uiBlip');
  }, true);

  backBtn.addEventListener('click', () => {
    audioBus.play('uiBack');
    exitInspect();
  });

  // Intercept ESC in inspect mode so it returns to the lineup rather than
  // unwinding all the way back to the main menu. Capture-phase + stopImmediate
  // prevents the router's document-level ESC handler from also firing.
  function handleKeydown(e) {
    if (!document.body.contains(garage)) {
      document.removeEventListener('keydown', handleKeydown, true);
      return;
    }
    if (e.key !== 'Escape') return;
    if (mode !== 'inspect') return;
    e.stopImmediatePropagation();
    e.preventDefault();
    audioBus.play('uiBack');
    exitInspect();
  }
  document.addEventListener('keydown', handleKeydown, true);
}
