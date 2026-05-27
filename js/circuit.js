// Drifting "circuit node" field behind the main menu. Tiny nodes wander
// slowly across the viewport, wrap at edges, and link with thin lines when
// they're near each other — a slow-breathing wireframe diagram.

const REDUCED_MOTION_MQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const MOBILE_MQ = window.matchMedia('(max-width: 768px)');

const NODE_COUNT_DESKTOP = 12;
const NODE_COUNT_MOBILE = 6;
const NODE_RADIUS = 2.4;          // px
const NODE_OPACITY = 0.25;
const LINK_DISTANCE = 200;        // px
const LINK_OPACITY = 0.1;
const LINK_WIDTH = 0.5;
const ACCENT = '16, 185, 129';

// Drift speed expressed at 30 fps in the brief (0.15–0.25 px/frame).
// Convert to px/sec so time-delta animation looks the same at any rate.
const SPEED_MIN = 0.15 * 30;
const SPEED_MAX = 0.25 * 30;

const FRAME_INTERVAL_MS = 1000 / 30;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function nodeCount() {
  return MOBILE_MQ.matches ? NODE_COUNT_MOBILE : NODE_COUNT_DESKTOP;
}

export function initCircuit() {
  const canvas = document.querySelector('[data-circuit-canvas]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let nodes = [];
  let rafId = 0;
  let lastFrameTs = 0;
  let lastStepTs = 0;

  function seedNodes() {
    const count = nodeCount();
    nodes = new Array(count).fill(null).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(SPEED_MIN, SPEED_MAX);
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Reseed if node count or canvas dimensions change so positions stay
    // in-bounds and the count matches the breakpoint.
    if (nodes.length !== nodeCount() || nodes.length === 0) {
      seedNodes();
    } else {
      // Re-clamp existing nodes into the new viewport.
      for (const n of nodes) {
        if (n.x < 0) n.x = 0;
        if (n.x > width) n.x = width;
        if (n.y < 0) n.y = 0;
        if (n.y > height) n.y = height;
      }
    }
    draw();
  }

  function step(dtMs) {
    const dt = dtMs / 1000;
    for (const n of nodes) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      // Wrap around the edges.
      if (n.x < -NODE_RADIUS) n.x = width + NODE_RADIUS;
      else if (n.x > width + NODE_RADIUS) n.x = -NODE_RADIUS;
      if (n.y < -NODE_RADIUS) n.y = height + NODE_RADIUS;
      else if (n.y > height + NODE_RADIUS) n.y = -NODE_RADIUS;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Links (drawn first so nodes sit on top).
    ctx.lineWidth = LINK_WIDTH;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > LINK_DISTANCE) continue;
        // Fade the line as nodes drift apart so connections feel alive.
        const alpha = LINK_OPACITY * (1 - dist / LINK_DISTANCE);
        ctx.strokeStyle = `rgba(${ACCENT}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Nodes.
    ctx.fillStyle = `rgba(${ACCENT}, ${NODE_OPACITY})`;
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    if (!lastFrameTs) lastFrameTs = ts;
    const elapsed = ts - lastStepTs;
    if (elapsed < FRAME_INTERVAL_MS) return;
    const dt = lastStepTs ? elapsed : FRAME_INTERVAL_MS;
    lastStepTs = ts;
    step(dt);
    draw();
  }

  function start() {
    if (rafId) return;
    lastStepTs = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function applyMotionPolicy() {
    if (REDUCED_MOTION_MQ.matches) {
      stop();
      // Draw a single static frame so the field still reads as a diagram.
      draw();
    } else {
      start();
    }
  }

  // The router toggles body.is-scene on every route change. When we're on
  // a scene the canvas is display:none anyway, so we also pause the RAF
  // loop to avoid burning frames behind a hidden layer.
  function applyRoutePolicy() {
    const onScene = document.body.classList.contains('is-scene');
    if (onScene || REDUCED_MOTION_MQ.matches) {
      stop();
    } else {
      start();
    }
  }

  resize();
  applyMotionPolicy();

  window.addEventListener('resize', resize);
  REDUCED_MOTION_MQ.addEventListener('change', applyMotionPolicy);
  MOBILE_MQ.addEventListener('change', () => {
    // Reseed to hit the new node count immediately.
    seedNodes();
    draw();
  });

  // Watch body class changes (router toggles is-scene/is-menu).
  const bodyObserver = new MutationObserver(applyRoutePolicy);
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Pause when the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else applyRoutePolicy();
  });
}
