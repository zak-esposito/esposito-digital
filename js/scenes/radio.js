import { audioBus } from '../audio.js';

const CONTACT_EMAIL = 'zak@espositodigital.co.uk';
const FORM_ACTION = `https://formsubmit.co/${CONTACT_EMAIL}`;
const GITHUB_HANDLE = 'zak-esposito';
const LINKEDIN_HANDLE = 'zakesposito';

// GitHub and LinkedIn aren't in the SVG sprite; inline minimal marks here.
const GITHUB_SVG = `
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.94c.575.108.79-.25.79-.555 0-.275-.012-1.18-.018-2.14-3.205.7-3.882-1.36-3.882-1.36-.522-1.33-1.276-1.683-1.276-1.683-1.043-.713.08-.7.08-.7 1.155.082 1.763 1.187 1.763 1.187 1.026 1.76 2.692 1.252 3.348.957.103-.745.402-1.252.73-1.54-2.558-.292-5.247-1.28-5.247-5.694 0-1.258.45-2.285 1.187-3.09-.12-.293-.515-1.467.112-3.057 0 0 .967-.31 3.17 1.18a10.96 10.96 0 0 1 5.77 0c2.2-1.49 3.166-1.18 3.166-1.18.63 1.59.234 2.764.115 3.057.74.805 1.185 1.832 1.185 3.09 0 4.425-2.694 5.397-5.26 5.683.413.355.78 1.057.78 2.13 0 1.54-.014 2.78-.014 3.157 0 .307.21.668.795.554A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"/>
  </svg>
`;

const LINKEDIN_SVG = `
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>
  </svg>
`;

function renderForm() {
  return `
    <form class="radio-form" action="${FORM_ACTION}" method="POST" data-radio-form>
      <input type="hidden" name="_subject" value="New transmission from zakesposito.dev">
      <input type="hidden" name="_captcha" value="false">
      <input type="hidden" name="_template" value="table">
      <input type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true" class="radio-form__honey">

      <span class="radio-form__corner radio-form__corner--tl" aria-hidden="true"></span>
      <span class="radio-form__corner radio-form__corner--tr" aria-hidden="true"></span>
      <span class="radio-form__corner radio-form__corner--bl" aria-hidden="true"></span>
      <span class="radio-form__corner radio-form__corner--br" aria-hidden="true"></span>
      <div class="radio-form__scan" aria-hidden="true"></div>

      <div class="radio-form__field">
        <label class="radio-form__label" for="radio-name">
          <span class="radio-form__label-dot" aria-hidden="true"></span>
          Call Sign
        </label>
        <input
          id="radio-name"
          class="radio-form__input"
          type="text"
          name="name"
          autocomplete="name"
          required
          placeholder="Your name"
        >
      </div>

      <div class="radio-form__field">
        <label class="radio-form__label" for="radio-email">
          <span class="radio-form__label-dot" aria-hidden="true"></span>
          Frequency
        </label>
        <input
          id="radio-email"
          class="radio-form__input"
          type="email"
          name="email"
          autocomplete="email"
          required
          placeholder="you@example.com"
        >
      </div>

      <div class="radio-form__field">
        <label class="radio-form__label" for="radio-message">
          <span class="radio-form__label-dot" aria-hidden="true"></span>
          Transmission
        </label>
        <textarea
          id="radio-message"
          class="radio-form__input radio-form__input--textarea"
          name="message"
          rows="5"
          required
          placeholder="What's on the radio?"
        ></textarea>
      </div>

      <button class="radio-form__submit" type="submit" data-radio-submit>
        <span class="radio-form__submit-label">Send Transmission</span>
        <svg class="radio-form__submit-arrow" aria-hidden="true"><use href="#icon-arrow"/></svg>
        <span class="radio-form__submit-pulse" aria-hidden="true"></span>
      </button>
    </form>
  `;
}

function renderDirect() {
  return `
    <div class="radio-direct" aria-label="Direct contact channels">
      <span class="radio-direct__divider" aria-hidden="true">
        <span></span>
        <em>Direct Channels</em>
        <span></span>
      </span>

      <ul class="radio-direct__list">
        <li class="radio-direct__row">
          <span class="radio-direct__tag">FREQ</span>
          <a class="radio-direct__link" href="mailto:${CONTACT_EMAIL}">
            <span class="radio-direct__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="1.5"/>
                <path d="M3.5 6.5l8.5 7 8.5-7"/>
              </svg>
            </span>
            <span class="radio-direct__handle">${CONTACT_EMAIL}</span>
            <svg class="radio-direct__chevron" aria-hidden="true"><use href="#icon-arrow"/></svg>
          </a>
        </li>

        <li class="radio-direct__row">
          <span class="radio-direct__tag">GIT</span>
          <a class="radio-direct__link" href="https://github.com/${GITHUB_HANDLE}" target="_blank" rel="noopener">
            <span class="radio-direct__icon" aria-hidden="true">${GITHUB_SVG}</span>
            <span class="radio-direct__handle">${GITHUB_HANDLE}</span>
            <svg class="radio-direct__chevron" aria-hidden="true"><use href="#icon-arrow"/></svg>
          </a>
        </li>

        <li class="radio-direct__row">
          <span class="radio-direct__tag">LNK</span>
          <a class="radio-direct__link" href="https://linkedin.com/in/${LINKEDIN_HANDLE}" target="_blank" rel="noopener">
            <span class="radio-direct__icon" aria-hidden="true">${LINKEDIN_SVG}</span>
            <span class="radio-direct__handle">in/${LINKEDIN_HANDLE}</span>
            <svg class="radio-direct__chevron" aria-hidden="true"><use href="#icon-arrow"/></svg>
          </a>
        </li>
      </ul>
    </div>
  `;
}

export function renderRadio(view) {
  return `
    <section class="scene scene--radio" data-scene="radio" aria-labelledby="scene-title">
      <div class="scene__watermark" aria-hidden="true"><svg><use href="#${view.icon}"/></svg></div>

      <div class="radio">
        <header class="radio__head">
          <span class="radio__eyebrow">${view.index} &middot; Pit Radio</span>
          <h2 class="radio__title" id="scene-title">Open Channel</h2>
          <p class="radio__subtitle">Drop a transmission. Response guaranteed within 48 hours.</p>
        </header>

        ${renderForm()}
        ${renderDirect()}
      </div>
    </section>
  `;
}

export function initRadio(sceneContainer) {
  const form = sceneContainer.querySelector('[data-radio-form]');
  if (!form) return;

  const inputs = form.querySelectorAll('.radio-form__input');
  inputs.forEach((el) => {
    el.addEventListener('focus', () => audioBus.play('uiBlip'));
  });

  const submitBtn = form.querySelector('[data-radio-submit]');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      // Native form validation will block invalid submissions; the click sound
      // still plays so the gesture feels acknowledged either way.
      audioBus.play('uiConfirm');
    });
  }

  const direct = sceneContainer.querySelectorAll('.radio-direct__link');
  direct.forEach((link) => {
    link.addEventListener('mouseenter', () => audioBus.play('uiBlip'));
    link.addEventListener('click', () => audioBus.play('uiConfirm'));
  });
}
