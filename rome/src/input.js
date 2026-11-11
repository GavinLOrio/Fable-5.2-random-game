// Keyboard, mouse / trackpad and touch input for Aquila.
export function createInput(canvas) {
  const keys = new Set();
  const st = { mx: 0, my: 0, camDX: 0, camDY: 0, zoom: 0, rot: 0, block: false, touch: false, pressed: new Set(), lastLook: 0 };
  const joyEl = document.getElementById('joy'), knob = document.getElementById('joyknob');
  let joyId = null, joyX = 0, joyY = 0, jx = 0, jy = 0, pinch = 0, rmb = false, btnBlock = false;
  const cams = new Map();
  const KEYMAP = { KeyJ: 'attack', Space: 'dodge', KeyF: 'pilum', KeyE: 'interact', Enter: 'interact', KeyH: 'mount', KeyR: 'eat', KeyM: 'map', KeyI: 'bag', KeyL: 'log', Escape: 'menu', KeyP: 'menu' };
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'SELECT'); };

  window.addEventListener('keydown', (e) => {
    if (typing()) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (KEYMAP[e.code]) st.pressed.add(KEYMAP[e.code]);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  function joyEnd() { joyId = null; jx = jy = 0; joyEl.classList.remove('on'); }
  const reset = () => { keys.clear(); joyEnd(); cams.clear(); pinch = 0; rmb = false; btnBlock = false; st.pressed.clear(); };
  window.addEventListener('blur', reset);

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      st.touch = true;
      if (joyId === null && e.clientX < window.innerWidth * 0.42) {
        joyId = e.pointerId; joyX = e.clientX; joyY = e.clientY; jx = jy = 0;
        joyEl.style.left = joyX + 'px'; joyEl.style.top = joyY + 'px'; knob.style.transform = 'translate(-50%,-50%)'; joyEl.classList.add('on');
        return;
      }
    } else if (e.button === 2) { rmb = true; return; }
    cams.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), mouse: e.pointerType !== 'touch' });
    if (cams.size === 2) { const [a, b] = [...cams.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === joyId) {
      let dx = e.clientX - joyX, dy = e.clientY - joyY; const d = Math.hypot(dx, dy), R = 56;
      if (d > R) { dx *= R / d; dy *= R / d; }
      jx = dx / R; jy = dy / R; knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      return;
    }
    const c = cams.get(e.pointerId);
    if (!c) return;
    if (cams.size === 2) { c.x = e.clientX; c.y = e.clientY; const [a, b] = [...cams.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch > 0) st.zoom += (pinch - d) * 0.05; pinch = d; return; }
    st.camDX += e.clientX - c.x; st.camDY += e.clientY - c.y; c.x = e.clientX; c.y = e.clientY;
    if (Math.abs(c.x - c.sx) + Math.abs(c.y - c.sy) > 6) st.lastLook = performance.now();
  });
  const up = (e) => {
    if (e.pointerId === joyId) joyEnd();
    if (e.button === 2) rmb = false;
    const c = cams.get(e.pointerId);
    // a quick click or tap without dragging is an attack
    if (c && e.type === 'pointerup' && c.mouse && e.button === 0 && performance.now() - c.t < 320 && Math.abs(c.x - c.sx) + Math.abs(c.y - c.sy) < 7) st.pressed.add('attack');
    cams.delete(e.pointerId); pinch = 0;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); st.zoom += Math.max(-4, Math.min(4, e.deltaY * (e.deltaMode ? 0.6 : 0.02))); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // on-screen buttons: data-act="attack" etc.
  for (const b of document.querySelectorAll('[data-act]')) {
    const act = b.dataset.act;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (e.pointerType === 'touch') st.touch = true; if (act === 'block') { btnBlock = true; try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } } else st.pressed.add(act); });
    if (act === 'block') for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => { btnBlock = false; });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  st.poll = () => {
    let x = jx, y = -jy;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    st.mx = x; st.my = y;
    st.rot = (keys.has('KeyE') && false ? 1 : 0) + (keys.has('Period') ? 1 : 0) - (keys.has('Comma') ? 1 : 0);
    st.block = rmb || btnBlock || keys.has('KeyK') || keys.has('ShiftLeft') || keys.has('ShiftRight');
  };
  st.hit = (a) => st.pressed.has(a);
  st.consume = () => { st.camDX = st.camDY = 0; st.zoom = 0; st.pressed.clear(); };
  st.reset = reset;
  return st;
}
