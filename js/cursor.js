// Custom cursor: a dot that snaps to the pointer and a ring that lerps
// toward it for a subtle "catching up" feel. Desktop only — the system
// cursor stays on coarse pointers (and is restored if the pointer becomes
// coarse mid-session, e.g. laptop tablet mode).

const FINE_POINTER_MQ = window.matchMedia('(pointer: fine)');
const REDUCED_MOTION_MQ = window.matchMedia('(prefers-reduced-motion: reduce)');

const HOVER_SELECTOR =
  'a[href], button, .tile, .bay, input, textarea, [role="menuitem"]';
const RING_LERP = 0.25;
const PUNCH_MS = 20;

export function initCursor() {
  let dot = null;
  let ring = null;
  let dotInner = null;
  let ringInner = null;
  let rafId = 0;
  let punchTimer = 0;
  let active = false;
  let visible = false;
  let mouseX = 0;
  let mouseY = 0;
  let ringX = 0;
  let ringY = 0;
  let hoverDepth = 0;

  function show() {
    if (visible) return;
    visible = true;
    dot.classList.add('is-visible');
    ring.classList.add('is-visible');
  }

  function hide() {
    if (!visible) return;
    visible = false;
    dot.classList.remove('is-visible');
    ring.classList.remove('is-visible');
  }

  function setHover(on) {
    dot.classList.toggle('is-hover', on);
    ring.classList.toggle('is-hover', on);
  }

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!visible) {
      // Seed ring at the dot's first known position so it doesn't sweep
      // from the top-left corner on the first frame.
      ringX = mouseX;
      ringY = mouseY;
      show();
    }
  }

  function onDocLeave() {
    hide();
  }

  function onMouseDown() {
    dot.classList.add('is-punch');
    clearTimeout(punchTimer);
    punchTimer = setTimeout(() => {
      dot.classList.remove('is-punch');
    }, PUNCH_MS);
  }

  function isHoverTarget(node) {
    return node && node.nodeType === 1 && node.closest(HOVER_SELECTOR);
  }

  function onPointerOver(e) {
    const target = isHoverTarget(e.target);
    if (!target) return;
    // Only count when we cross into the hover element from outside it.
    const from = e.relatedTarget;
    if (from && target.contains(from)) return;
    hoverDepth++;
    if (hoverDepth === 1) setHover(true);
  }

  function onPointerOut(e) {
    const target = isHoverTarget(e.target);
    if (!target) return;
    const to = e.relatedTarget;
    if (to && target.contains(to)) return;
    hoverDepth = Math.max(0, hoverDepth - 1);
    if (hoverDepth === 0) setHover(false);
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    if (REDUCED_MOTION_MQ.matches) {
      ringX = mouseX;
      ringY = mouseY;
    } else {
      ringX += (mouseX - ringX) * RING_LERP;
      ringY += (mouseY - ringY) * RING_LERP;
    }
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
  }

  function activate() {
    if (active) return;
    active = true;

    dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dotInner = document.createElement('span');
    dot.appendChild(dotInner);

    ring = document.createElement('div');
    ring.className = 'cursor-ring';
    ringInner = document.createElement('span');
    ring.appendChild(ringInner);

    document.body.append(dot, ring);
    document.documentElement.classList.add('has-custom-cursor');

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('mouseleave', onDocLeave);
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);

    rafId = requestAnimationFrame(tick);
  }

  function deactivate() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    clearTimeout(punchTimer);

    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mouseleave', onDocLeave);
    document.removeEventListener('pointerover', onPointerOver);
    document.removeEventListener('pointerout', onPointerOut);

    document.documentElement.classList.remove('has-custom-cursor');
    dot?.remove();
    ring?.remove();
    dot = ring = dotInner = ringInner = null;
    visible = false;
    hoverDepth = 0;
  }

  function syncPointerMode() {
    if (FINE_POINTER_MQ.matches) activate();
    else deactivate();
  }

  syncPointerMode();
  FINE_POINTER_MQ.addEventListener('change', syncPointerMode);
}
