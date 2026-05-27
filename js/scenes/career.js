const STATS = [
  { label: 'Base', value: 'Llanelli, Wales' },
  { label: 'Licence', value: 'BSc Computer Science — Cardiff University' },
  { label: 'Status', value: 'Final Year · Predicted First' },
];

const TIMELINE = [
  {
    num: '01',
    title: 'Cardiff University',
    body: 'BSc Computer Science, final year. On track for a First. Dissertation: LLM response personalisation research.',
  },
  {
    num: '02',
    title: 'Renishaw PLC — Placement Year',
    body: 'Built production-critical tools in C#, .NET, WPF and SQL Server running on live manufacturing lines.',
  },
  {
    num: '03',
    title: 'Airbus Cyber Security CTF',
    body: '2nd place finish. Penetration testing and exploit challenges.',
  },
];

const SKILLS = ['C#', '.NET', 'React', 'TypeScript', 'Node.js', 'Python', 'AI / LLMs'];

function renderStats() {
  return STATS.map(
    (s) => `
      <div class="career__stat">
        <dt class="career__stat-label">${s.label}</dt>
        <dd class="career__stat-value">${s.value}</dd>
      </div>
    `
  ).join('');
}

function renderTimeline() {
  return TIMELINE.map(
    (t) => `
      <li class="career__entry">
        <span class="career__entry-num">${t.num}</span>
        <div class="career__entry-body">
          <h3 class="career__entry-title">${t.title}</h3>
          <p class="career__entry-desc">${t.body}</p>
        </div>
      </li>
    `
  ).join('');
}

function renderSkills() {
  return SKILLS.map((s) => `<li class="career__skill">${s}</li>`).join('');
}

export function renderCareer(view) {
  return `
    <section class="scene scene--career" data-scene="career" aria-labelledby="scene-title">
      <div class="scene__watermark" aria-hidden="true"><svg><use href="#${view.icon}"/></svg></div>
      <div class="career">
        <div class="career__portrait">
          <div class="career__portrait-frame">
            <span class="career__portrait-corner career__portrait-corner--tl" aria-hidden="true"></span>
            <span class="career__portrait-corner career__portrait-corner--tr" aria-hidden="true"></span>
            <span class="career__portrait-corner career__portrait-corner--bl" aria-hidden="true"></span>
            <span class="career__portrait-corner career__portrait-corner--br" aria-hidden="true"></span>
            <img class="career__portrait-img" src="brand_assets/about-photo.webp" alt="Portrait of Zak Esposito" loading="lazy" decoding="async" />
            <div class="career__portrait-overlay" aria-hidden="true"></div>
            <div class="career__portrait-scan" aria-hidden="true"></div>
          </div>
          <div class="career__portrait-meta">
            <span class="career__portrait-tag">Driver No.</span>
            <strong class="career__portrait-num">01</strong>
          </div>
        </div>

        <div class="career__profile">
          <header class="career__header">
            <span class="career__eyebrow">${view.index} · Driver Profile</span>
            <h2 class="career__name" id="scene-title">Zak Esposito</h2>
            <p class="career__callsign">Call sign &mdash; <span>ZE</span></p>
          </header>

          <dl class="career__stats">
            ${renderStats()}
          </dl>

          <section class="career__section" aria-label="Career timeline">
            <h3 class="career__section-title">
              <span class="career__section-tick" aria-hidden="true"></span>
              Career Laps
            </h3>
            <ol class="career__timeline">
              ${renderTimeline()}
            </ol>
          </section>

          <section class="career__section" aria-label="Skills">
            <h3 class="career__section-title">
              <span class="career__section-tick" aria-hidden="true"></span>
              Loadout
            </h3>
            <ul class="career__skills">
              ${renderSkills()}
            </ul>
          </section>
        </div>
      </div>
    </section>
  `;
}
