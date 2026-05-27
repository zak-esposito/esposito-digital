import { audioBus } from './audio.js';
import { playSceneLeave, resetMenuTiles } from './motion.js';
import { renderCareer } from './scenes/career.js';
import { renderGarage, initGarage } from './scenes/garage.js';
import { renderRadio, initRadio } from './scenes/radio.js';
import { renderTimeTrial, initTimeTrial } from './scenes/timetrial.js';

const VIEWS = {
  '/': { kind: 'menu', name: 'Main Menu' },
  '/career': { kind: 'scene', name: 'Career', index: '00', mode: 'career', icon: 'icon-helmet', render: renderCareer },
  '/garage': { kind: 'scene', name: 'Garage', index: '01', mode: 'garage', icon: 'icon-wrench', render: renderGarage, onMount: initGarage },
  '/timetrial': { kind: 'scene', name: 'Time Trial', index: '02', mode: 'timetrial', icon: 'icon-speedo', render: renderTimeTrial, onMount: initTimeTrial },
  '/radio': { kind: 'scene', name: 'Pit Radio', index: '03', mode: 'radio', icon: 'icon-mic', render: renderRadio, onMount: initRadio },
};

const HOME = '/';

function readRoute() {
  const raw = window.location.hash.replace(/^#/, '') || HOME;
  return raw in VIEWS ? raw : HOME;
}

function renderScene(view) {
  return `
    <section class="scene scene--${view.mode}" data-scene="${view.mode}" aria-labelledby="scene-title">
      <div class="scene__watermark" aria-hidden="true"><svg><use href="#${view.icon}"/></svg></div>
      <div class="scene__inner">
        <span class="scene__index">${view.index} &middot; Mode</span>
        <h2 class="scene__title" id="scene-title">${view.name}</h2>
        <p class="scene__placeholder">Scene under construction</p>
      </div>
    </section>
  `;
}

export function initRouter() {
  const menu = document.querySelector('[data-view="menu"]');
  const sceneContainer = document.querySelector('[data-scene-container]');
  const modeName = document.querySelector('[data-mode-name]');
  const menuPanel = document.querySelector('.hud-top__panel--menu');
  const scenePanel = document.querySelector('.hud-top__panel--scene');
  const announcer = document.querySelector('[data-route-announce]');
  const body = document.body;

  if (!menu || !sceneContainer) {
    console.warn('[router] required DOM nodes missing');
    return;
  }

  let renderToken = 0;

  async function render(route) {
    const token = ++renderToken;
    const view = VIEWS[route];
    const oldScene = sceneContainer.querySelector('.scene');

    if (oldScene) {
      await playSceneLeave(oldScene);
      if (token !== renderToken) return;
    }

    if (view.kind === 'menu') {
      sceneContainer.innerHTML = '';
      sceneContainer.hidden = true;
      menu.hidden = false;
      menuPanel.hidden = false;
      scenePanel.hidden = true;
      body.classList.remove('is-scene');
      body.classList.add('is-menu');
      document.title = 'Zak Esposito';
      modeName.textContent = '—';
      if (announcer) announcer.textContent = 'Main menu';
      resetMenuTiles();
    } else {
      menu.hidden = true;
      sceneContainer.hidden = false;
      sceneContainer.innerHTML = typeof view.render === 'function' ? view.render(view) : renderScene(view);
      menuPanel.hidden = true;
      scenePanel.hidden = false;
      body.classList.remove('is-menu');
      body.classList.add('is-scene');
      document.title = `${view.name} · Zak Esposito`;
      modeName.textContent = view.name;
      if (announcer) announcer.textContent = `${view.name} loaded`;
      if (typeof view.onMount === 'function') view.onMount(sceneContainer);
    }
  }

  function goHome() {
    if (readRoute() === HOME) return;
    window.location.hash = `#${HOME}`;
  }

  window.addEventListener('hashchange', () => render(readRoute()));

  document.querySelectorAll('[data-back]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      audioBus.play('uiBack');
      goHome();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const target = e.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
    }
    if (readRoute() !== HOME) audioBus.play('uiBack');
    goHome();
  });

  render(readRoute());
}
