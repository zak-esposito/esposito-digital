const SFX_STORAGE_KEY = 'ze.audio.sfxMuted';
const MUSIC_STORAGE_KEY = 'ze.audio.musicMuted';
const SOUND_NAMES = ['bootChime', 'uiBlip', 'uiConfirm', 'uiBack'];

const BG_MUSIC_URL = 'assets/audio/bg-music.mp3';
const MUSIC_TARGET_GAIN = 0.35;
const MUSIC_FADE_SECONDS = 2;

function readStoredFlag(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === '1') return { value: true, stored: true };
    if (raw === '0') return { value: false, stored: true };
  } catch (_) { /* localStorage blocked */ }
  return { value: false, stored: false };
}

function writeStoredFlag(key, value) {
  try { localStorage.setItem(key, value ? '1' : '0'); } catch (_) {}
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
    this.master = null;       // SFX bus
    this.musicGain = null;    // Music bus (independent of SFX)
    this.musicEl = null;      // HTMLAudioElement source for bg music
    this.musicSrc = null;     // MediaElementAudioSourceNode
    this.musicStarted = false;
    this.musicStartTimer = null;
    this.bootBuffer = null;
    this.bootLoading = null;

    const sfx = readStoredFlag(SFX_STORAGE_KEY);
    // First visit under reduced-motion auto-mutes SFX; explicit user choice always wins later.
    this.sfxMuted = sfx.stored ? sfx.value : prefersReducedMotion();
    if (!sfx.stored && this.sfxMuted) writeStoredFlag(SFX_STORAGE_KEY, true);

    const music = readStoredFlag(MUSIC_STORAGE_KEY);
    // Music defaults to unmuted on first visit; reduced-motion does NOT auto-mute it.
    this.musicMuted = music.stored ? music.value : false;

    this._onVisibility = this._onVisibility.bind(this);
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.sfxMuted ? 0 : 1;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0; // starts silent; faded in by startMusic()
      this.musicGain.connect(this.ctx.destination);

      this._preloadBoot();
      this._prepareMusic();
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

  _prepareMusic() {
    if (this.musicEl) return;
    const el = new Audio(BG_MUSIC_URL);
    el.loop = true;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    // Element volume stays at 1.0; the musicGain node is what we modulate.
    el.volume = 1;
    this.musicEl = el;
    try {
      this.musicSrc = this.ctx.createMediaElementSource(el);
      this.musicSrc.connect(this.musicGain);
    } catch (err) {
      console.warn('[audio] bg-music source failed:', err);
    }
  }

  _playBoot() {
    const play = (buffer) => {
      if (!buffer) return;
      if (this.sfxMuted) return;
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

  // Begin background music with a fade-in. Call after unlock() and after a user
  // gesture. `delayMs` lets the caller stagger music behind the boot chime
  // (boot path = 1500ms; return-visitor path = 0).
  startMusic({ delayMs = 0 } = {}) {
    if (this.musicStarted) return;
    if (!this.ctx || !this.musicEl || !this.musicGain) return;
    this.musicStarted = true;

    const begin = () => {
      if (this.musicMuted) return; // user pre-muted before fade kicked off
      if (document.visibilityState === 'hidden') return;

      this._fadeMusicTo(MUSIC_TARGET_GAIN, MUSIC_FADE_SECONDS);
      const p = this.musicEl.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => console.warn('[audio] music play blocked:', err));
      }
    };

    if (delayMs > 0) {
      this.musicStartTimer = setTimeout(begin, delayMs);
    } else {
      begin();
    }
  }

  _fadeMusicTo(target, seconds) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const g = this.musicGain.gain;
    const current = g.value;
    g.cancelScheduledValues(now);
    g.setValueAtTime(current, now);
    g.linearRampToValueAtTime(target, now + Math.max(0.01, seconds));
  }

  _onVisibility() {
    if (!this.musicEl) return;
    if (document.visibilityState === 'hidden') {
      if (!this.musicEl.paused) this.musicEl.pause();
    } else if (this.musicStarted && !this.musicMuted) {
      const p = this.musicEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }

  isUnlocked() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  // ── SFX controls ────────────────────────────────────────────────────────
  isSfxMuted() { return this.sfxMuted; }

  setSfxMuted(value) {
    const next = !!value;
    if (next === this.sfxMuted) return;
    this.sfxMuted = next;
    writeStoredFlag(SFX_STORAGE_KEY, next);
    if (this.master && this.ctx) {
      const target = next ? 0 : 1;
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
    }
  }

  toggleSfxMute() {
    this.setSfxMuted(!this.sfxMuted);
    return this.sfxMuted;
  }

  // ── Music controls ──────────────────────────────────────────────────────
  isMusicMuted() { return this.musicMuted; }

  setMusicMuted(value) {
    const next = !!value;
    if (next === this.musicMuted) return;
    this.musicMuted = next;
    writeStoredFlag(MUSIC_STORAGE_KEY, next);

    if (!this.musicEl) return;
    if (next) {
      this._fadeMusicTo(0, 0.2);
      // Pause shortly after the fade completes so we stop wasting decode cycles.
      setTimeout(() => {
        if (this.musicMuted && this.musicEl && !this.musicEl.paused) this.musicEl.pause();
      }, 220);
    } else if (this.musicStarted) {
      // User unmuted after music had already been scheduled to start.
      if (document.visibilityState !== 'hidden') {
        const p = this.musicEl.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
      this._fadeMusicTo(MUSIC_TARGET_GAIN, 0.4);
    }
  }

  toggleMusicMute() {
    this.setMusicMuted(!this.musicMuted);
    return this.musicMuted;
  }

  play(name) {
    if (this.sfxMuted) return;
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
