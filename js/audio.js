const STORAGE_KEY = 'ze.audio.muted';
const SOUND_NAMES = ['bootChime', 'uiBlip', 'uiConfirm', 'uiBack'];

function readStoredMute() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === '1') return { value: true, stored: true };
    if (raw === '0') return { value: false, stored: true };
  } catch (_) { /* localStorage blocked */ }
  return { value: false, stored: false };
}

function writeStoredMute(value) {
  try { localStorage.setItem(STORAGE_KEY, value ? '1' : '0'); } catch (_) {}
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// bootChime — sample-based (assets/audio/boot-chime.mp3). Preloaded in unlock().
const BOOT_CHIME_URL = 'assets/audio/boot-chime.mp3';

// uiBlip — square wave 80ms, bandpass at 1.2kHz, gain envelope 0→0.18→0.
function uiBlip(ctx, dest) {
  const t0 = ctx.currentTime;
  const dur = 0.08;

  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 1200;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1200;
  bp.Q.value = 2.5;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.18, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(bp);
  bp.connect(g);
  g.connect(dest);

  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// uiConfirm — two-osc thunk: 220Hz sine body + 880Hz triangle shimmer, spring-curve gain.
function uiConfirm(ctx, dest) {
  const t0 = ctx.currentTime;
  const dur = 0.28;

  // Spring-curve envelope: fast attack, slight overshoot, settle, exp tail.
  const curve = new Float32Array(64);
  for (let i = 0; i < curve.length; i++) {
    const t = i / (curve.length - 1);
    const attack = Math.min(1, t * 8);
    const overshoot = 1 + 0.3 * Math.exp(-3 * t) * Math.sin(t * Math.PI * 3);
    const decay = Math.exp(-2.4 * t);
    curve[i] = Math.max(0, 0.22 * attack * overshoot * decay);
  }

  const sine = ctx.createOscillator();
  sine.type = 'sine';
  sine.frequency.value = 220;
  const sineGain = ctx.createGain();
  sineGain.gain.setValueCurveAtTime(curve, t0, dur);
  sine.connect(sineGain);
  sineGain.connect(dest);

  const tri = ctx.createOscillator();
  tri.type = 'triangle';
  tri.frequency.value = 880;
  const triGain = ctx.createGain();
  triGain.gain.setValueAtTime(0, t0);
  triGain.gain.linearRampToValueAtTime(0.09, t0 + 0.012);
  triGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
  tri.connect(triGain);
  triGain.connect(dest);

  sine.start(t0);
  tri.start(t0);
  sine.stop(t0 + dur + 0.02);
  tri.stop(t0 + 0.18);
}

// uiBack — descending two-note E5 → A4, 240ms total.
function uiBack(ctx, dest) {
  const t0 = ctx.currentTime;
  const noteDur = 0.12;

  function note(freq, when) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.16, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + noteDur);

    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + noteDur + 0.02);
  }

  note(659.25, t0);
  note(440, t0 + noteDur);
}

const SYNTHS = { uiBlip, uiConfirm, uiBack };

class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bootBuffer = null;
    this.bootLoading = null;
    const stored = readStoredMute();
    // First visit under reduced-motion auto-mutes; explicit user choice always wins later.
    this.muted = stored.stored ? stored.value : prefersReducedMotion();
    if (!stored.stored && this.muted) writeStoredMute(true);
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this._preloadBoot();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  _preloadBoot() {
    if (this.bootBuffer || this.bootLoading) return this.bootLoading;
    this.bootLoading = fetch(BOOT_CHIME_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((bytes) => this.ctx.decodeAudioData(bytes))
      .then((buf) => { this.bootBuffer = buf; return buf; })
      .catch((err) => {
        console.warn('[audio] boot-chime load failed:', err);
        this.bootLoading = null;
        return null;
      });
    return this.bootLoading;
  }

  _playBoot() {
    const play = (buffer) => {
      if (!buffer) return;
      if (this.muted) return;
      if (!this.ctx || this.ctx.state !== 'running') return;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      // Sample peaks near 0 dBFS; UI synths peak around -14 dBFS. Attenuate so
      // the boot chime sits in the same loudness family as the chimes that
      // follow it, instead of blasting on first visit.
      const trim = this.ctx.createGain();
      trim.gain.value = 0.45;
      src.connect(trim);
      trim.connect(this.master);
      src.start(0);
    };
    if (this.bootBuffer) {
      play(this.bootBuffer);
    } else if (this.bootLoading) {
      this.bootLoading.then(play);
    }
  }

  isUnlocked() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  isMuted() {
    return this.muted;
  }

  setMuted(value) {
    const next = !!value;
    if (next === this.muted) return;
    this.muted = next;
    writeStoredMute(next);
    if (this.master && this.ctx) {
      const target = next ? 0 : 1;
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(name) {
    if (this.muted) return;
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (name === 'bootChime') {
      this._playBoot();
      return;
    }
    const synth = SYNTHS[name];
    if (!synth) return;
    synth(this.ctx, this.master);
  }

  sounds() {
    return SOUND_NAMES.slice();
  }
}

export const audioBus = new AudioBus();
