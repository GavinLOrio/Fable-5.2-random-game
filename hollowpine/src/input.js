// Hollowpine input: keyboard and mouse (pointer lock, with a drag-to-look fallback) and touch.
export function createInput(canvas) {
  const keys = new Set(), pressed = new Set();
  const st = { mx: 0, my: 0, lookX: 0, lookY: 0, fire: false, aim: false, sprint: false, use: false, wheel: 0, touch: false, locked: false, canLock: () => true, onUnlock: null, onFirst: null, dragLook: false };
  let selfExit = false, mouseFire = false, mouseAim = false, btnFire = false, btnAim = false, btnUse = false, joyId = null, joyX = 0, joyY = 0, jx = 0, jy = 0, drag = null, first = false, lockFailAt = 0, fails = 0;
  const failed = () => { lockFailAt = performance.now(); if (++fails >= 2) st.dragLook = true; };
  const joyEl = document.getElementById('joy'), knob = document.getElementById('joyknob');
  const KEY = { Space: 'jump', KeyE: 'use', KeyR: 'reload', KeyB: 'build', Tab: 'pack', KeyI: 'pack', KeyM: 'map', KeyC: 'crouch', KeyF: 'light', KeyX: 'dismantle', KeyQ: 'cancel', Escape: 'menu', KeyG: 'rotate' };
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'SELECT'); };
  const gesture = () => { if (!first) { first = true; if (st.onFirst) st.onFirst(); } };
  window.addEventListener('keydown', (e) => {
    if (typing()) return; gesture();
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    if (e.repeat) return; keys.add(e.code);
    if (KEY[e.code]) pressed.add(KEY[e.code]);
    if (/^Digit[1-8]$/.test(e.code)) pressed.add('slot' + e.code[5]);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  const reset = () => { keys.clear(); pressed.clear(); mouseFire = mouseAim = btnFire = btnAim = btnUse = false; joyId = null; jx = jy = 0; drag = null; if (joyEl) joyEl.classList.remove('on'); };
  window.addEventListener('blur', reset);
  st.reset = reset;

  const lock = () => { if (!canvas.requestPointerLock || st.dragLook || performance.now() - lockFailAt < 1500) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(failed); } catch (e) { failed(); } };
  st.lock = lock;
  st.unlock = () => { if (document.pointerLockElement === canvas) { selfExit = true; try { document.exitPointerLock(); } catch (e) { /* ignore */ } } };
  document.addEventListener('pointerlockchange', () => { const was = st.locked; st.locked = document.pointerLockElement === canvas; if (st.locked) fails = 0; if (was && !st.locked) { mouseFire = mouseAim = false; if (!selfExit && st.onUnlock) st.onUnlock(); selfExit = false; } });
  document.addEventListener('pointerlockerror', failed);
  document.addEventListener('mousemove', (e) => { if (st.locked) { st.lookX += e.movementX; st.lookY += e.movementY; } });

  canvas.addEventListener('pointerdown', (e) => {
    gesture();
    if (e.pointerType === 'touch') {
      st.touch = true; document.body.classList.add('touch');
      if (joyId === null && e.clientX < window.innerWidth * 0.4) { joyId = e.pointerId; joyX = e.clientX; joyY = e.clientY; jx = jy = 0; joyEl.style.left = joyX + 'px'; joyEl.style.top = joyY + 'px'; knob.style.transform = 'translate(-50%,-50%)'; joyEl.classList.add('on'); }
      else if (!drag) drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      return;
    }
    if (!st.canLock()) return;
    if (!st.locked && !st.dragLook) { lock(); return; }
    if (e.button === 0) mouseFire = true; else if (e.button === 2) mouseAim = true;
    if (st.dragLook) { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === joyId) { let dx = e.clientX - joyX, dy = e.clientY - joyY; const d = Math.hypot(dx, dy), R = 54; if (d > R) { dx *= R / d; dy *= R / d; } jx = dx / R; jy = dy / R; knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; return; }
    if (drag && e.pointerId === drag.id) { const k = e.pointerType === 'touch' ? 2.2 : 1.4; st.lookX += (e.clientX - drag.x) * k; st.lookY += (e.clientY - drag.y) * k; drag.x = e.clientX; drag.y = e.clientY; }
    else if (st.dragLook && !st.locked && e.pointerType !== 'touch' && st.canLock() && e.buttons === 0) { st.lookX += Math.max(-50, Math.min(50, e.movementX)); st.lookY += Math.max(-50, Math.min(50, e.movementY)); }
  });
  const up = (e) => { if (e.pointerId === joyId) { joyId = null; jx = jy = 0; joyEl.classList.remove('on'); } if (drag && e.pointerId === drag.id) drag = null; if (e.pointerType !== 'touch') { if (e.button === 0) mouseFire = false; if (e.button === 2) mouseAim = false; } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseFire = false; if (e.button === 2) mouseAim = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); st.wheel += Math.sign(e.deltaY); }, { passive: false });

  for (const b of document.querySelectorAll('[data-act]')) {
    const act = b.dataset.act;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); gesture(); if (e.pointerType === 'touch') { st.touch = true; document.body.classList.add('touch'); } if (act === 'fire') btnFire = true; else if (act === 'aim') { btnAim = !btnAim; b.classList.toggle('on', btnAim); } else { if (act === 'use') btnUse = true; pressed.add(act); } try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => { if (act === 'fire') btnFire = false; if (act === 'use') btnUse = false; });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  st.poll = () => {
    let x = jx, y = -jy;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1; if (keys.has('KeyD')) x += 1; if (keys.has('KeyA')) x -= 1;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    st.mx = x; st.my = y; st.fire = mouseFire || btnFire; st.aim = mouseAim || btnAim; st.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || (st.touch && l > 0.92 && jy < -0.8); st.use = keys.has('KeyE') || btnUse; st.shift = keys.has('ShiftLeft') || keys.has('ShiftRight');
  };
  st.hit = (a) => pressed.has(a);
  st.consume = () => { st.lookX = st.lookY = 0; st.wheel = 0; pressed.clear(); };
  st.clearFire = () => { mouseFire = false; btnFire = false; };
  return st;
}
