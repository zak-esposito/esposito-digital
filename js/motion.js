import { audioBus } from './audio.js';

const REDUCED_MOTION_MQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const COARSE_POINTER_MQ = window.matchMedia('(pointer: coarse)');

const TILT_MAX_DEG = 8;
const TILT_LIFT_PX = 6;
const TILT_RESET_MS = 200;
const SELECT_MS = 200;
const SELECT_HOLD_MS = 180;
const SCENE_LEAVE_MS = 240;

const reduced = () => REDUCED_MOTION_MQ.matches;
const coarse = () => COARSE_POINTER_MQ.matches;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const TX_BG_BORDER = 'background 240ms var(--ease-smooth), border-color 240ms var(--ease-smooth)';

const tiltState = new WeakMap();

function installTilt(tile) {
  const state = { rafId: 0, pending: null, active: false };

  const apply = () => {
    state.rafId = 0;
    if (!state.active || !state.pending) return;
    const e = state.pending;
    state.pending = null;
    const rect = tile.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = clamp((px - 0.5) * 2, -1, 1) * TILT_MAX_DEG;
    const rotX = clamp((0.5 - py) * 2, -1, 1) * TILT_MAX_DEG;
    tile.style.transform =
      `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(${TILT_LIFT_PX}px)`;
  };

  const onMove = (e) => {
    if (!state.active) return;
    state.pending = e;
    if (!state.rafId) state.rafId = requestAnimationFrame(apply);
  };

  const onEnter = () => {
    if (reduced() || coarse()) return;
    if (tile.classList.contains('is-selecting') || tile.classList.contains('is-dimmed')) return;
    state.active = true;
    tile.style.transition = TX_BG_BORDER;
    tile.addEventListener('mousemove', onMove);
  };

  const onLeave = () => {
    if (!state.active) return;
    stopTilt(tile, true);
  };

  state.onMove = onMove;
  tiltState.set(tile, state);

  tile.addEventListener('mouseenter', onEnter);
  tile.addEventListener('mouseleave', onLeave);
}

function stopTilt(tile, animateReset) {
  const s = tiltState.get(tile);
  if (!s) return;
  s.active = false;
  if (s.onMove) tile.removeEventListener('mousemove', s.onMove);
  if (s.rafId) { cancelAnimationFrame(s.rafId); s.rafId = 0; }
  s.pending = null;
  if (animateReset) {
    tile.style.transition = `transform ${TILT_RESET_MS}ms var(--ease-smooth), ${TX_BG_BORDER}`;
    tile.style.transform = '';
    setTimeout(() => {
      if (!tile.classList.contains('is-selecting') && !tile.classList.contains('is-dimmed')) {
        tile.style.transition = '';
      }
    }, TILT_RESET_MS + 30);
  }
}

let selectInFlight = false;

function runSelect(grid, selected) {
  const tiles = grid.querySelectorAll('.tile');
  tiles.forEach((t) => stopTilt(t, false));
  tiles.forEach((t) => {
    t.style.transition = reduced()
      ? 'opacity 120ms linear'
      : `transform ${SELECT_MS}ms var(--ease-spring), opacity ${SELECT_MS}ms var(--ease-smooth)`;
    if (t === selected) {
      t.classList.add('is-selecting');
      t.classList.remove('is-dimmed');
      t.style.transform = reduced() ? '' : 'scale(1.05)';
      t.style.opacity = '';
    } else {
      t.classList.add('is-dimmed');
      t.classList.remove('is-selecting');
      t.style.transform = reduced() ? '' : 'scale(0.92)';
      t.style.opacity = '0.4';
    }
  });
}

export function resetMenuTiles() {
  document.querySelectorAll('.tile').forEach((t) => {
    t.classList.remove('is-selecting', 'is-dimmed');
    t.style.transition = 'none';
    t.style.transform = '';
    t.style.opacity = '';
    void t.offsetHeight;
    t.style.transition = '';
  });
  selectInFlight = false;
}

function installTileSelect() {
  const grid = document.querySelector('.tile-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile || !grid.contains(tile)) return;
    const href = tile.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    if (selectInFlight) { e.preventDefault(); return; }

    e.preventDefault();
    selectInFlight = true;
    runSelect(grid, tile);

    const delay = reduced() ? 0 : SELECT_HOLD_MS;
    setTimeout(() => {
      selectInFlight = false;
      if (window.location.hash === href) {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        window.location.hash = href;
      }
    }, delay);
  });
}

// 2x2 grid arrow-key navigation: ← → ↑ ↓ move focus between tiles, wrapping
// at edges. Home/End jump to first/last. Enter/Space activate the tile link.
function installArrowNav() {
  const grid = document.querySelector('.tile-grid');
  if (!grid) return;

  const isArrowKey = (k) =>
    k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight';

  // Auto-focus tile 00 when the user presses an arrow key with no tile focused.
  // Keeps the footer hint discoverable without needing Tab first.
  document.addEventListener('keydown', (e) => {
    if (!isArrowKey(e.key)) return;
    if (grid.offsetParent === null) return;
    const tiles = grid.querySelectorAll('.tile');
    if (!tiles.length) return;
    if (grid.contains(document.activeElement)) return;
    const target = e.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
    }
    e.preventDefault();
    tiles[0].focus();
    audioBus.play('uiBlip');
  });

  grid.addEventListener('keydown', (e) => {
    const tiles = Array.from(grid.querySelectorAll('.tile'));
    if (!tiles.length) return;
    const current = document.activeElement;
    const idx = tiles.indexOf(current);
    if (idx === -1 && !['Home', 'End'].includes(e.key)) return;

    // Grid is 2 columns desktop, 1 column mobile. Detect actual column count
    // from computed style so arrow nav matches the visual layout.
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const rows = Math.ceil(tiles.length / cols);

    let next = -1;
    switch (e.key) {
      case 'ArrowRight':
        next = (idx + 1) % tiles.length;
        break;
      case 'ArrowLeft':
        next = (idx - 1 + tiles.length) % tiles.length;
        break;
      case 'ArrowDown': {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const nextRow = (row + 1) % rows;
        next = Math.min(nextRow * cols + col, tiles.length - 1);
        break;
      }
      case 'ArrowUp': {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const prevRow = (row - 1 + rows) % rows;
        next = Math.min(prevRow * cols + col, tiles.length - 1);
        break;
      }
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tiles.length - 1;
        break;
      default:
        return;
    }

    if (next < 0 || next === idx) return;
    e.preventDefault();
    tiles[next].focus();
    audioBus.play('uiBlip');
  });
}

export function playSceneLeave(scene) {
  if (!scene) return Promise.resolve();
  if (reduced()) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      scene.removeEventListener('animationend', finish);
      resolve();
    };
    scene.addEventListener('animationend', finish);
    scene.classList.add('is-leaving');
    setTimeout(finish, SCENE_LEAVE_MS + 60);
  });
}

export function initMotion() {
  document.querySelectorAll('.tile').forEach(installTilt);
  installTileSelect();
  installArrowNav();
}
