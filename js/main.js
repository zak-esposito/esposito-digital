import { initRouter } from './router.js';
import { audioBus } from './audio.js';
import { initBoot } from './boot.js';

function exposeForTuning() {
  const ns = (window.ze = window.ze || {});
  ns.audio = audioBus;
}

// Interim first-gesture unlock so audio is testable before the boot sequence wires
// PRESS START. The explicit boot handler also calls unlock() — that's fine,
// unlock() is idempotent.
//
// For return visitors who skip the boot overlay, this is also where bg music
// gets seeded — the first user gesture (tile hover/click, key, touch) starts
// it with the same 2s fade-in as the boot path uses, but with no delay since
// there's no boot chime to land first.
function installFirstGestureUnlock() {
  const events = ['pointerdown', 'keydown', 'touchstart'];
  const handler = () => {
    audioBus.unlock();
    audioBus.startMusic({ delayMs: 0 });
    events.forEach((e) => window.removeEventListener(e, handler, true));
  };
  events.forEach((e) => window.addEventListener(e, handler, true));
}

function installMenuAudio() {
  document.querySelectorAll('.tile').forEach((tile) => {
    tile.addEventListener('mouseenter', () => {
      audioBus.play('uiBlip');
    });
    tile.addEventListener('click', () => {
      audioBus.unlock();
      audioBus.play('uiConfirm');
    });
  });
}

function installMuteToggle() {
  const btn = document.querySelector('[data-mute]');
  if (!btn) return;

  const iconUse = btn.querySelector('.mute-btn__icon use');

  function sync(muted) {
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    const label = muted ? 'Enable sound effects' : 'Toggle sound effects';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    if (iconUse) {
      iconUse.setAttribute('href', muted ? '#icon-volume-x' : '#icon-volume');
    }
  }

  sync(audioBus.isSfxMuted());

  btn.addEventListener('click', () => {
    audioBus.unlock();
    const next = !audioBus.isSfxMuted();
    audioBus.setSfxMuted(next);
    sync(next);
  });
}

function installMusicToggle() {
  const btn = document.querySelector('[data-music-mute]');
  if (!btn) return;

  const iconUse = btn.querySelector('.mute-btn__icon use');

  function sync(muted) {
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    const label = muted ? 'Enable music' : 'Toggle music';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    if (iconUse) {
      iconUse.setAttribute('href', muted ? '#icon-music-x' : '#icon-music');
    }
  }

  sync(audioBus.isMusicMuted());

  btn.addEventListener('click', () => {
    audioBus.unlock();
    audioBus.startMusic({ delayMs: 0 });
    const next = !audioBus.isMusicMuted();
    audioBus.setMusicMuted(next);
    sync(next);
  });
}

function boot() {
  exposeForTuning();
  installFirstGestureUnlock();
  installMenuAudio();
  installMuteToggle();
  installMusicToggle();
  initRouter();
  initBoot();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
