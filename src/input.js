// Unified keyboard / mouse / touch input.
export function createInput(canvas) {
  const keys = new Set();
  const st = { mx: 0, my: 0, dash: false, camDX: 0, camDY: 0, zoom: 0, touch: false, anyKey: null };
  const joyEl = document.getElementById('joy'), knob = document.getElementById('joyknob');
  let joyId = null, joyX = 0, joyY = 0, jx = 0, jy = 0;
  const cams = new Map();
  let pinch = 0;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'ShiftLeft') st.dash = true;
    st.anyKey = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  const reset = () => { keys.clear(); joyEnd(); cams.clear(); pinch = 0; };
  window.addEventListener('blur', reset);

  function joyEnd() { joyId = null; jx = jy = 0; joyEl.classList.remove('on'); }
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      st.touch = true;
      if (joyId === null && e.clientX < window.innerWidth * 0.45) {
        joyId = e.pointerId; joyX = e.clientX; joyY = e.clientY; jx = jy = 0;
        joyEl.style.left = joyX + 'px'; joyEl.style.top = joyY + 'px'; knob.style.transform = 'translate(-50%,-50%)';
        joyEl.classList.add('on');
        return;
      }
    }
    cams.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (cams.size === 2) { const [a, b] = [...cams.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === joyId) {
      let dx = e.clientX - joyX, dy = e.clientY - joyY; const d = Math.hypot(dx, dy), R = 56;
      if (d > R) { dx *= R / d; dy *= R / d; }
      jx = dx / R; jy = dy / R;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      return;
    }
    const c = cams.get(e.pointerId);
    if (!c) return;
    if (cams.size === 2) {
      c.x = e.clientX; c.y = e.clientY;
      const [a, b] = [...cams.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) st.zoom += (pinch - d) * 0.06;
      pinch = d;
      return;
    }
    st.camDX += e.clientX - c.x; st.camDY += e.clientY - c.y;
    c.x = e.clientX; c.y = e.clientY;
  });
  const up = (e) => { if (e.pointerId === joyId) joyEnd(); cams.delete(e.pointerId); pinch = 0; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('wheel', (e) => { st.zoom += Math.sign(e.deltaY) * 2.2; e.preventDefault(); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  const dashBtn = document.getElementById('dashbtn');
  dashBtn.addEventListener('pointerdown', (e) => { st.dash = true; if (e.pointerType === 'touch') st.touch = true; e.preventDefault(); });

  st.poll = () => {
    let x = jx, y = -jy;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    st.mx = x; st.my = y;
    st.rot = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
  };
  st.consume = () => { st.dash = false; st.camDX = st.camDY = 0; st.zoom = 0; st.anyKey = null; };
  st.reset = reset;
  return st;
}
