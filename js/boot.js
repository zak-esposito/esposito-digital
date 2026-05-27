import { audioBus } from './audio.js';
import { initMotion } from './motion.js';

const STORAGE_KEY = 'ze.boot.seen';
const TILE_STAGGER_MS = 60;
const TILE_ENTER_MS = 300;
const OVERLAY_EXIT_MS = 200;

const REDUCED_MOTION_MQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const COARSE_POINTER_MQ = window.matchMedia('(pointer: coarse)');
const SMALL_VIEWPORT_MQ = window.matchMedia('(max-width: 768px)');

let easterEgg = false;
let advancing = false;

const hasSeen = () => {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch (_) { return false; }
};
const markSeen = () => {
  try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (_) {}
};
const clearSeen = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
};

const reduced = () => REDUCED_MOTION_MQ.matches;
const isMobile = () => COARSE_POINTER_MQ.matches || SMALL_VIEWPORT_MQ.matches;

const getOverlay = () => document.getElementById('boot-overlay');
const getTiles = () => Array.from(document.querySelectorAll('.tile-grid .tile'));

function resetEasterEggHash() {
  if (!easterEgg) return;
  const base = window.location.pathname + window.location.search;
  history.replaceState(null, '', `${base}#/`);
}

function removeOverlay() {
  const overlay = getOverlay();
  if (overlay) overlay.remove();
}

function exitOverlay(overlay) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      overlay.remove();
      resolve();
    };
    overlay.addEventListener('transitionend', finish, { once: true });
    overlay.classList.add('boot-overlay--exit');
    setTimeout(finish, OVERLAY_EXIT_MS + 120);
  });
}

function cascadeTiles() {
  const tiles = getTiles();
  document.body.classList.remove('is-booting');
  document.body.classList.add('boot-cascading');

  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add('boot-tile-enter');
      audioBus.play('uiBlip');
    }, i * TILE_STAGGER_MS);
  });

  const total = (Math.max(tiles.length - 1, 0)) * TILE_STAGGER_MS + TILE_ENTER_MS + 60;
  return new Promise((resolve) => setTimeout(resolve, total));
}

async function advance(overlay) {
  if (advancing) return;
  advancing = true;

  audioBus.unlock();
  audioBus.play('bootChime');

  await Promise.all([exitOverlay(overlay), cascadeTiles()]);

  markSeen();
  resetEasterEggHash();
  document.body.classList.remove('boot-cascading');
  document.documentElement.classList.remove('boot-pending');
  initMotion();
}

function attachAdvanceHandlers(overlay) {
  const skipBtn = overlay.querySelector('[data-boot-skip]');

  const trigger = () => {
    cleanup();
    advance(overlay);
  };

  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Tab' || e.key === 'Shift') return;
    trigger();
  };
  const onPointer = () => trigger();
  const onSkipClick = (e) => { e.stopPropagation(); trigger(); };

  function cleanup() {
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('pointerdown', onPointer, true);
    if (skipBtn) skipBtn.removeEventListener('click', onSkipClick);
  }

  window.addEventListener('keydown', onKey, true);
  window.addEventListener('pointerdown', onPointer, true);
  if (skipBtn) skipBtn.addEventListener('click', onSkipClick);
}

function runFullSequence() {
  const overlay = getOverlay();
  if (!overlay) { initMotion(); return; }

  document.body.classList.add('is-booting');
  requestAnimationFrame(() => overlay.classList.add('boot-overlay--phase1'));
  attachAdvanceHandlers(overlay);
}

function runQuickReveal() {
  removeOverlay();
  document.documentElement.classList.remove('boot-pending');
  document.body.classList.remove('is-booting');
  document.body.classList.add('boot-quick');
  initMotion();
}

function runInstantReveal() {
  removeOverlay();
  document.documentElement.classList.remove('boot-pending');
  document.body.classList.remove('is-booting');
  document.body.classList.add('boot-instant');
  initMotion();
}

export function initBoot() {
  easterEgg = window.location.hash === '#/boot';

  if (easterEgg) {
    clearSeen();
    if (reduced()) {
      runInstantReveal();
      markSeen();
      resetEasterEggHash();
      return;
    }
    runFullSequence();
    return;
  }

  if (isMobile() || hasSeen()) {
    runQuickReveal();
    return;
  }

  if (reduced()) {
    runInstantReveal();
    markSeen();
    return;
  }

  runFullSequence();
}
