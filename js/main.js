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
function installFirstGestureUnlock() {
  const events = ['pointerdown', 'keydown', 'touchstart'];
  const handler = () => {
    audioBus.unlock();
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
    btn.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
    btn.setAttribute('title', muted ? 'Unmute audio' : 'Mute audio');
    if (iconUse) {
      iconUse.setAttribute('href', muted ? '#icon-volume-x' : '#icon-volume');
    }
  }

  sync(audioBus.isMuted());

  btn.addEventListener('click', () => {
    audioBus.unlock();
    const next = !audioBus.isMuted();
    audioBus.setMuted(next);
    sync(next);
  });
}

function boot() {
  exposeForTuning();
  installFirstGestureUnlock();
  installMenuAudio();
  installMuteToggle();
  initRouter();
  initBoot();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
