import { XMIN, XMAX, ZMIN, ZMAX } from './world.js';
import { clamp, TAU } from '../../src/util.js';

export function createUI(ctx) {
  const { $, S, PL, QS, QUESTS, QBY, ITEMS, STOCK, PRICE, world, discovered, isTouch, PRESET, MILE, api } = ctx;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let panel = null, inGame = false, toastT = 0;
  const hintQ = []; let hintT = 0;

  // ---------- small notifications ----------
  function toast(title, sub = '', dur = 3) { $('toast').innerHTML = esc(title) + (sub ? `<small>${esc(sub)}</small>` : ''); $('toast').classList.add('on'); toastT = dur; }
  function note(text, dur = 4) { const d = document.createElement('div'); d.textContent = text; d.style.animationDuration = dur + 's'; $('notes').appendChild(d); setTimeout(() => d.remove(), dur * 1000); while ($('notes').children.length > 5) $('notes').firstChild.remove(); }
  function hint(text) { hintQ.push(text); }

  // ---------- generic panel ----------
  function show(title, html, opts = {}) {
    $('pTitle').textContent = title; $('pBody').innerHTML = html; $('panel').className = 'panel' + (opts.narrow ? ' narrow' : ''); $('pClose').hidden = !!opts.noClose;
    $('panelOv').hidden = false; $('mapscr').hidden = true; panel = opts.name || 'x';
    if (api.mode() === 'play' || api.mode() === 'ui') { api.setMode('ui'); inGame = true; }
    $('pBody').scrollTop = 0;
  }
  function close() {
    $('panelOv').hidden = true; $('mapscr').hidden = true; panel = null;
    if (inGame && api.mode() === 'ui') api.setMode('play');
    if (api.mode() === 'title') title();
  }
  $('pClose').onclick = () => { api.sfx.click(); if (panel === 'settings' || panel === 'slots' || panel === 'controls') { if (api.mode() === 'ui') open('menu'); else close(); } else close(); };
  $('pBody').addEventListener('click', (e) => { const b = e.target.closest('[data-do]'); if (!b || b.disabled) return; api.sfx.click(); const [fn, ...a] = b.dataset.do.split(':'); actions[fn](...a, b); });
  $('pBody').addEventListener('input', (e) => { const el = e.target; if (el.dataset.set) setSetting(el.dataset.set, el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value); });

  // ---------- title ----------
  function saves() { return [1, 2, 3].map((n) => api.store.get(api.slotKey(n))); }
  function title() {
    inGame = false; $('title').hidden = false; $('panelOv').hidden = true;
    const sv = saves(), latest = sv.map((s, i) => [s, i + 1]).filter((x) => x[0] && x[0].v === 1).sort((a, b) => b[0].at - a[0].at)[0];
    $('titleBtns').innerHTML = (latest ? `<button class="btn" id="tCont">Continue</button>` : '') + `<button class="btn${latest ? ' alt' : ''}" id="tNew">New game</button>` + (latest ? `<button class="btn alt" id="tLoad">Load game</button>` : '') + `<button class="btn alt" id="tSet">Settings</button>`;
    if (latest) { $('tCont').onclick = () => { api.initAudio(); api.startGame(latest[1], latest[0]); }; $('tLoad').onclick = () => slots('load'); }
    $('tNew').onclick = () => slots('new'); $('tSet').onclick = () => settings();
  }
  const fmtTime = (t) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60); return h ? `${h} h ${m} min` : `${m} min`; };
  let confirmKey = null;
  function slots(kind) {
    const sv = saves();
    const rows = sv.map((s, i) => {
      const n = i + 1, ok = s && s.v === 1, cur = api.mode() !== 'title' && api.slotNow() === n;
      const info = ok ? `<div class="nm">Level ${s.level} · ${esc(s.chapter)}</div><div class="ds">Near ${esc(s.place || 'the road')} · ${fmtTime(s.time || 0)} played · ${new Date(s.at).toLocaleDateString()}</div>` : `<div class="nm">Empty</div><div class="ds">No journey saved here.</div>`;
      const ck = kind + n, sure = confirmKey === ck;
      let btn = '';
      if (kind === 'new') btn = `<button class="btn sm" data-do="slotNew:${n}">${ok ? (sure ? 'Overwrite?' : 'Replace') : 'Begin'}</button>`;
      else if (kind === 'load') btn = `<button class="btn sm" data-do="slotLoad:${n}" ${ok ? '' : 'disabled'}>Load</button>` + (ok ? `<button class="btn sm alt" data-do="slotDel:${n}">${confirmKey === 'del' + n ? 'Sure?' : 'Delete'}</button>` : '');
      else btn = `<button class="btn sm" data-do="slotSave:${n}">${ok && !cur ? (sure ? 'Overwrite?' : 'Save over') : 'Save here'}</button>`;
      return `<div class="row${cur ? ' on' : ''}"><div class="tx"><div class="stt">SLOT ${['I', 'II', 'III'][i]}${cur ? ' · current' : ''}</div>${info}</div>${btn}</div>`;
    }).join('');
    show(kind === 'new' ? 'New game' : kind === 'load' ? 'Load game' : 'Save game', rows + `<div class="muted">Saves are kept in this browser on this device. The game also saves by itself to the current slot.</div>`, { name: 'slots' });
    $('title').hidden = true;
  }

  // ---------- settings ----------
  function setSetting(k, v) {
    if (k === 'quality') { S.quality = v; if (PRESET[v]) Object.assign(S, PRESET[v]); api.applySettings(true); settings(); return; }
    if (['res', 'shadows', 'bloom', 'view', 'foliage'].includes(k)) S.quality = 'custom';
    S[k] = k === 'view' ? +v : k === 'foliage' ? +v : v;
    api.applySettings(k === 'view');
    const q = $('pBody').querySelector('[data-set=quality]'); if (q) q.value = S.quality;
  }
  function settings() {
    const sel = (k, opts) => `<select data-set="${k}" id="set_${k}">${opts.map(([v, l]) => `<option value="${v}"${String(S[k]) === String(v) ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    const rng = (k, a, b, st) => `<input type="range" id="set_${k}" data-set="${k}" min="${a}" max="${b}" step="${st}" value="${S[k]}">`;
    const chk = (k) => `<input type="checkbox" id="set_${k}" data-set="${k}"${S[k] ? ' checked' : ''}>`;
    const row = (label, sub, ctl) => `<label for="${(ctl.match(/id="([^"]+)"/) || [])[1]}">${label}${sub ? `<small>${sub}</small>` : ''}</label>${ctl}`;
    show('Settings', `
      <div class="sect">Graphics</div><div class="set">
        ${row('Quality', 'Low is best for phones. High suits a recent MacBook.', sel('quality', [['low', 'Low'], ['med', 'Medium'], ['high', 'High'], ['custom', 'Custom']]))}
        ${row('Resolution', 'Lower is faster, higher is sharper.', rng('res', 0.5, 1.35, 0.05))}
        ${row('Adjust resolution automatically', 'Lowers resolution when the frame rate drops.', chk('autoRes'))}
        ${row('View distance', '', sel('view', [[2, 'Near'], [3, 'Medium'], [4, 'Far'], [5, 'Very far']]))}
        ${row('Trees and rocks', '', sel('foliage', [[0.4, 'Sparse'], [0.7, 'Normal'], [1, 'Dense']]))}
        ${row('Shadows', '', chk('shadows'))}
        ${row('Glow effects', '', chk('bloom'))}
        ${row('Show frame rate', '', chk('fps'))}
      </div>
      <div class="sect">Controls</div><div class="set">
        ${isTouch ? '' : row('Looking around', 'Move to look suits a trackpad: click the game once, then just slide your finger. Esc frees the pointer.', sel('look', [['move', 'Move the pointer to look'], ['drag', 'Hold and drag to look']]))}
        ${row('Camera sensitivity', '', rng('sens', 0.4, 2.2, 0.1))}
        ${row('Invert vertical look', '', chk('invertY'))}
        ${row('Camera follows your heading', 'Turns the camera behind you while you travel.', chk('autoCam'))}
        ${row('Interface size', '', rng('hud', 0.8, 1.3, 0.05))}
      </div>
      <div class="sect">Game</div><div class="set">
        ${row('Difficulty', 'Changes enemy health and damage.', sel('difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']]))}
        ${row('Damage numbers', '', chk('numbers'))}
      </div>
      <div class="sect">Sound</div><div class="set">
        ${row('Overall volume', '', rng('master', 0, 1, 0.05))}
        ${row('Music', '', rng('music', 0, 1, 0.05))}
        ${row('Effects', '', rng('sfx', 0, 1.2, 0.05))}
      </div>
      <button class="btn alt sm" data-do="controls">Show controls</button>`, { name: 'settings' });
    $('title').hidden = true;
  }
  function controls() {
    const k = isTouch
      ? [['Left side', 'Drag to move'], ['Right side', 'Drag to look, pinch to zoom'], ['Sword', 'Strike. Tap three times for a combo; the third blow is heavy'], ['Shield', 'Hold to block. Raise it just before a blow lands to parry'], ['Arrows', 'Jump'], ['Javelin', 'Throw a pilum at the nearest enemy'], ['Bread', 'Eat to recover health'], ['Horse', 'Mount or dismount'], ['Walls', 'Keep pushing against a wall to climb it'], ['Mask', 'Sneak. From behind or above an unaware enemy, tap the prompt to assassinate']]
      : [['W A S D', 'Move'], ['Look', 'Click the game once, then move the pointer (or hold and drag, if you chose that in Settings). A two-finger sideways swipe also turns the camera'], ['Scroll or pinch', 'Zoom'], ['J or click', 'Strike. Three in a row makes a combo; the third blow is heavy'], ['Walls', 'Keep pushing against a wall to climb it; pull away to climb down, Space to jump off'], ['C', 'Sneak. Enemies see only what is in front of them. From behind or above, strike to assassinate'], ['K, Shift or right-click', 'Hold to block. Raise it just before a blow lands to parry'], ['Space', 'Jump. Small ledges and market stalls can be hopped onto'], ['F', 'Throw a pilum at the nearest enemy'], ['R', 'Eat bread to recover health'], ['E', 'Talk, trade, set sail and other actions'], ['H', 'Mount or dismount your horse'], ['M  I  L', 'Map, gear, quests'], ['Esc', 'Menu']];
    show('Controls', `<div class="keys">${k.map(([a, b]) => `<b>${a}</b><span>${b}</span>`).join('')}</div>`, { name: 'controls' });
  }

  // ---------- gear ----------
  let bagTab = 'weapon';
  const statOf = (it) => it.slot === 'weapon' ? `Damage ${it.dmg} · Speed ${Math.round(it.spd * 100)}% · Reach ${it.reach}` : it.slot === 'shield' ? `Blocks ${Math.round(it.block * 100)}% of a blow` : `Stops ${Math.round(it.def * 100)}% of all damage`;
  function bag() {
    const tabs = [['weapon', 'Weapons'], ['shield', 'Shields'], ['armor', 'Armour'], ['helmet', 'Helmets']];
    const list = PL.owned.filter((id) => ITEMS[id].slot === bagTab).map((id) => { const it = ITEMS[id], on = PL.eq[it.slot] === id; return `<div class="row${on ? ' on' : ''}"><div class="tx"><div class="nm">${esc(it.name)}</div><div class="stt">${statOf(it)}</div><div class="ds">${esc(it.desc)}</div></div><button class="btn sm${on ? ' alt' : ''}" data-do="equip:${id}" ${on ? 'disabled' : ''}>${on ? 'Worn' : 'Equip'}</button></div>`; }).join('');
    show('Gear', `<div class="tabs">${tabs.map(([k, l]) => `<button class="${k === bagTab ? 'on' : ''}" data-do="bagTab:${k}">${l}</button>`).join('')}</div>${list}
      <div class="muted">Level ${PL.level} · ${Math.ceil(PL.hp)} / ${PL.maxHp} health · ${PL.den} denarii · ${PL.panis} bread · ${PL.pila} pila${PL.horse ? ' · horse' : ''}${PL.ship ? ' · galley' : ''}</div>`, { name: 'bag' });
  }
  let shopSite = null;
  function shop(site) {
    shopSite = site;
    const gear = (STOCK[site.region] || []).filter((id) => !PL.owned.includes(id)).map((id) => { const it = ITEMS[id]; return `<div class="row"><div class="tx"><div class="nm">${esc(it.name)}</div><div class="stt">${statOf(it)}</div><div class="ds">${esc(it.desc)}</div></div><button class="btn sm" data-do="buy:${id}" ${PL.den >= it.price ? '' : 'disabled'}>${it.price} d</button></div>`; }).join('');
    show(`Market of ${site.name}`, `<div class="muted">You carry <b>${PL.den} denarii</b>. A legionary earns 225 a year, before Caesar doubles it.</div>
      <div class="row"><div class="tx"><div class="nm">Panis</div><div class="stt">You have ${PL.panis}</div><div class="ds">A round loaf of bread. Eat it to recover nearly half your health.</div></div><button class="btn sm" data-do="buy:panis" ${PL.den >= PRICE.panis && PL.panis < 12 ? '' : 'disabled'}>${PRICE.panis} d</button></div>
      <div class="row"><div class="tx"><div class="nm">Pilum</div><div class="stt">You have ${PL.pila}</div><div class="ds">The legion's heavy javelin. Its soft iron shank bends on impact so it cannot be thrown back.</div></div><button class="btn sm" data-do="buy:pilum" ${PL.den >= PRICE.pilum && PL.pila < 8 ? '' : 'disabled'}>${PRICE.pilum} d</button></div>
      ${gear || '<div class="muted">You already own everything this merchant sells.</div>'}`, { name: 'shop' });
  }
  // ---------- quests ----------
  function log() {
    const t = api.tracked();
    const act = QUESTS.filter((q) => QS[q.id].state === 'active').map((q) => { const st = q.steps[QS[q.id].step]; return `<div class="row${t === q.id ? ' on' : ''}"><div class="tx"><div class="stt">${q.main ? 'MAIN STORY · ' + esc(q.date) : 'SIDE QUEST'} · suggested level ${q.lvl}</div><div class="nm">${esc(q.name)}</div><div class="ds">${esc(st.obj)}</div></div><button class="btn sm${t === q.id ? ' alt' : ''}" data-do="track:${q.id}" ${t === q.id ? 'disabled' : ''}>${t === q.id ? 'Tracked' : 'Track'}</button></div>`; }).join('');
    const av = QUESTS.filter((q) => QS[q.id].state === 'avail').map((q) => `<div class="row${t === q.id ? ' on' : ''}"><div class="tx"><div class="stt">RUMOUR · suggested level ${q.lvl}</div><div class="nm">${esc(q.name)}</div><div class="ds">Someone in ${esc(world.siteById[q.giver.at].name)} is looking for help.</div></div><button class="btn sm${t === q.id ? ' alt' : ''}" data-do="track:${q.id}" ${t === q.id ? 'disabled' : ''}>${t === q.id ? 'Tracked' : 'Track'}</button></div>`).join('');
    const done = QUESTS.filter((q) => QS[q.id].state === 'done').map((q) => `<div class="muted">✓ ${esc(q.name)}</div>`).join('');
    show('Quests', `${act || '<div class="muted">No active quests.</div>'}${av ? '<div class="sect">Rumours</div>' + av : ''}${done ? '<div class="sect">Completed</div>' + done : ''}`, { name: 'log' });
  }
  function menu() {
    show('Aquila', `<div class="col" style="width:100%"><button class="btn" data-do="resume">Resume</button><button class="btn alt" data-do="slots:save">Save game</button><button class="btn alt" data-do="slots:load">Load game</button><button class="btn alt" data-do="settings">Settings</button><button class="btn alt" data-do="controls">Controls</button><button class="btn alt" data-do="quit">Quit to title</button></div>`, { name: 'menu', narrow: true });
  }
  let deadCb = null;
  function dead(cb) { deadCb = cb; show('You have fallen', `<div class="muted">You wake among friends, bandaged and sore. Nothing has been lost but time.</div><button class="btn" data-do="rise">Rise</button>`, { name: 'dead', narrow: true, noClose: true }); }

  const actions = {
    resume: () => close(), settings, controls, slots: (k) => { confirmKey = null; slots(k); }, quit: () => { $('panelOv').hidden = true; panel = null; api.quit(); },
    rise: () => { $('panelOv').hidden = true; panel = null; const cb = deadCb; deadCb = null; cb(); },
    slotNew: (n) => { const s = saves()[n - 1]; if (s && confirmKey !== 'new' + n) { confirmKey = 'new' + n; slots('new'); return; } confirmKey = null; api.initAudio(); api.store.del(api.slotKey(+n)); $('panelOv').hidden = true; panel = null; api.startGame(+n, null); },
    slotLoad: (n) => { const s = saves()[n - 1]; if (!s) return; api.initAudio(); $('panelOv').hidden = true; panel = null; api.startGame(+n, s); },
    slotDel: (n) => { if (confirmKey !== 'del' + n) { confirmKey = 'del' + n; slots('load'); return; } confirmKey = null; api.store.del(api.slotKey(+n)); slots('load'); },
    slotSave: (n) => { const s = saves()[n - 1]; if (s && api.slotNow() !== +n && confirmKey !== 'save' + n) { confirmKey = 'save' + n; slots('save'); return; } confirmKey = null; const prev = api.slotNow(); api.setSlot(+n); if (api.save(false)) note(`Saved to slot ${['I', 'II', 'III'][n - 1]}`); else api.setSlot(prev); slots('save'); },
    bagTab: (k) => { bagTab = k; bag(); },
    equip: (id) => { PL.eq[ITEMS[id].slot] = id; api.buildHero(); api.save(true); bag(); },
    buy: (id) => {
      if (id === 'panis') { if (PL.den < PRICE.panis) return; PL.den -= PRICE.panis; PL.panis++; }
      else if (id === 'pilum') { if (PL.den < PRICE.pilum) return; PL.den -= PRICE.pilum; PL.pila++; }
      else { const it = ITEMS[id]; if (PL.den < it.price || PL.owned.includes(id)) return; PL.den -= it.price; PL.owned.push(id); PL.eq[it.slot] = id; api.buildHero(); note(`Bought and equipped: ${it.name}`); }
      api.sfx.coin(); api.save(true); shop(shopSite);
    },
    track: (id) => { api.track(id); log(); },
    travel: (id) => api.fastTravel(id),
  };

  // ---------- map ----------
  const mapCv = $('mapCv'), mctx = mapCv.getContext('2d');
  let base = null, mv = { s: 1, ox: 0, oy: 0 }, sel = null, mapDirty = false;
  const ptrs = new Map(); let pinch = 0, moved = 0;
  const wx2m = (x) => (x - XMIN) / (XMAX - XMIN) * base.width, wz2m = (z) => (z - ZMIN) / (ZMAX - ZMIN) * base.height;
  function fitMap() {
    const r = Math.min(window.devicePixelRatio || 1, 2); mapCv.width = Math.round(window.innerWidth * r); mapCv.height = Math.round(window.innerHeight * r);
    const min = Math.max(mapCv.width / base.width, mapCv.height / base.height) * 0.999;
    mv.s = clamp(mv.s, min, min * 9); mv.ox = clamp(mv.ox, mapCv.width - base.width * mv.s, 0); mv.oy = clamp(mv.oy, mapCv.height - base.height * mv.s, 0);
  }
  function openMap() {
    if (!base) base = world.makeMap();
    $('mapscr').hidden = false; $('panelOv').hidden = true; panel = 'map'; api.setMode('ui'); inGame = true; sel = null; $('mapCard').hidden = true;
    const r = Math.min(window.devicePixelRatio || 1, 2), min = Math.max(window.innerWidth * r / base.width, window.innerHeight * r / base.height);
    mv.s = min * 2.6; mv.ox = window.innerWidth * r / 2 - wx2m(PL.x) * mv.s; mv.oy = window.innerHeight * r / 2 - wz2m(PL.z) * mv.s;
    fitMap(); mapDirty = true; requestAnimationFrame(drawMap);
  }
  function drawMap() {
    if ($('mapscr').hidden) return;
    requestAnimationFrame(drawMap);
    if (!mapDirty && (performance.now() % 600) > 40) return;
    mapDirty = false;
    const c = mctx, r = Math.min(window.devicePixelRatio || 1, 2), X = (x) => wx2m(x) * mv.s + mv.ox, Y = (z) => wz2m(z) * mv.s + mv.oy;
    c.imageSmoothingEnabled = true; c.fillStyle = '#6a94ac'; c.fillRect(0, 0, mapCv.width, mapCv.height);
    c.drawImage(base, mv.ox, mv.oy, base.width * mv.s, base.height * mv.s);
    c.lineWidth = 1.6 * r; c.strokeStyle = 'rgba(120, 60, 30, 0.6)'; c.setLineDash([5 * r, 4 * r]);
    for (const rp of world.roadPaths) { c.beginPath(); rp.pts.forEach((p, i) => (i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])))); c.stroke(); }
    c.setLineDash([]);
    const zoom = mv.s / (mapCv.width / base.width);
    c.textAlign = 'center'; c.textBaseline = 'top';
    for (const s of world.sites) {
      const x = X(s.x), y = Y(s.z), disc = discovered.has(s.id), big = s.kind === 'urbs' || s.kind === 'city', rad = (big ? 5 : 3.6) * r;
      if (x < -50 || y < -50 || x > mapCv.width + 50 || y > mapCv.height + 50) continue;
      c.beginPath(); if (s.kind === 'camp' || s.kind === 'site' || s.kind === 'ruin' || s.kind === 'pyramids') { c.moveTo(x, y - rad * 1.2); c.lineTo(x + rad * 1.1, y + rad * 0.9); c.lineTo(x - rad * 1.1, y + rad * 0.9); c.closePath(); } else c.arc(x, y, rad, 0, TAU);
      c.fillStyle = disc ? '#8c1d18' : 'rgba(239,227,200,0.85)'; c.fill(); c.lineWidth = 1.5 * r; c.strokeStyle = disc ? '#fbeed0' : '#5c4a36'; c.stroke();
      if (sel === s) { c.beginPath(); c.arc(x, y, rad + 5 * r, 0, TAU); c.strokeStyle = '#d9ad4e'; c.lineWidth = 2.5 * r; c.stroke(); }
      if (disc && (big || zoom > 2.2)) { c.font = `${big ? 800 : 600} ${(big ? 12.5 : 11) * r}px Cinzel, Georgia, serif`; c.lineWidth = 3 * r; c.strokeStyle = 'rgba(239,227,200,0.9)'; c.strokeText(s.name, x, y + rad + 3 * r); c.fillStyle = '#241a10'; c.fillText(s.name, x, y + rad + 3 * r); }
    }
    for (const q of QUESTS) { const st = api.objectiveOf(q.id); if (!st || (QS[q.id].state === 'avail' && api.tracked() !== q.id)) continue; const p = api.posOf(st), x = X(p[0]), y = Y(p[1]), k = (api.tracked() === q.id ? 8 : 5.5) * r; c.beginPath(); c.moveTo(x, y - k); c.lineTo(x + k * 0.75, y); c.lineTo(x, y + k); c.lineTo(x - k * 0.75, y); c.closePath(); c.fillStyle = api.tracked() === q.id ? '#e8b63c' : '#4a8ab8'; c.fill(); c.lineWidth = 1.5 * r; c.strokeStyle = '#241a10'; c.stroke(); }
    const sp = api.shipPos(); if (PL.ship && sp) { const x = X(sp.x), y = Y(sp.z); c.fillStyle = '#1f4a7a'; c.beginPath(); c.moveTo(x - 7 * r, y - 2 * r); c.lineTo(x + 7 * r, y - 2 * r); c.lineTo(x + 4 * r, y + 4 * r); c.lineTo(x - 4 * r, y + 4 * r); c.closePath(); c.fill(); c.fillRect(x - 0.8 * r, y - 9 * r, 1.6 * r, 7 * r); }
    { const x = X(PL.x), y = Y(PL.z); c.save(); c.translate(x, y); c.rotate(Math.PI - PL.facing); c.beginPath(); c.moveTo(0, -9 * r); c.lineTo(6 * r, 7 * r); c.lineTo(0, 3.5 * r); c.lineTo(-6 * r, 7 * r); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2 * r; c.strokeStyle = '#8c1d18'; c.stroke(); c.restore(); }
  }
  function mapCard() {
    const s = sel, d = discovered.has(s.id), dist = Math.round(Math.hypot(s.x - PL.x, s.z - PL.z) / MILE);
    $('mapCard').hidden = false;
    $('mapCard').innerHTML = `<h3>${d ? esc(s.name) : 'Undiscovered place'}<small>${esc(s.region.toUpperCase())} · ${dist} ROMAN MILES</small></h3><p>${d ? esc(s.desc) : 'Travel there on foot, by horse or by sea to learn what it is. Once found, you can return at any time.'}</p>${d ? `<button class="btn sm" id="mcGo">Fast travel</button>` : ''}`;
    if (d) $('mcGo').onclick = () => { api.sfx.click(); api.fastTravel(s.id); };
  }
  mapCv.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } try { mapCv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
  mapCv.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return; const r = Math.min(window.devicePixelRatio || 1, 2);
    if (ptrs.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch); pinch = d; moved = 99; return; }
    mv.ox += (e.clientX - p.x) * r; mv.oy += (e.clientY - p.y) * r; moved += Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y); p.x = e.clientX; p.y = e.clientY; fitMap(); mapDirty = true;
  });
  const mapUp = (e) => {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); pinch = 0;
    if (moved < 8 && e.type === 'pointerup') {
      const r = Math.min(window.devicePixelRatio || 1, 2), px = e.clientX * r, py = e.clientY * r; let best = null, bd = 26 * r;
      for (const s of world.sites) { const d = Math.hypot(wx2m(s.x) * mv.s + mv.ox - px, wz2m(s.z) * mv.s + mv.oy - py); if (d < bd) { bd = d; best = s; } }
      sel = best; if (best) { api.sfx.click(); mapCard(); } else $('mapCard').hidden = true; mapDirty = true;
    }
  };
  mapCv.addEventListener('pointerup', mapUp); mapCv.addEventListener('pointercancel', mapUp);
  function zoomAt(cx, cy, k) { const r = Math.min(window.devicePixelRatio || 1, 2), px = cx * r, py = cy * r, s0 = mv.s; mv.s *= k; fitMap(); const kk = mv.s / s0; mv.ox = px - (px - mv.ox) * kk; mv.oy = py - (py - mv.oy) * kk; fitMap(); mapDirty = true; }
  mapCv.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-clamp(e.deltaY, -60, 60) * 0.004)); }, { passive: false });
  $('mapClose').onclick = () => { api.sfx.click(); close(); };
  window.addEventListener('resize', () => { if (base && !$('mapscr').hidden) { fitMap(); mapDirty = true; } });

  function open(name) { api.sfx.click(); if (name === 'map') openMap(); else if (name === 'bag') bag(); else if (name === 'log') log(); else menu(); }

  // ---------- HUD ----------
  const cc = $('compassCv').getContext('2d');
  let last = {};
  const setTxt = (id, v) => { if (last[id] !== v) { last[id] = v; $(id).textContent = v; } };
  function hud(dt, tt, camYaw, promptText, foes, needClick) {
    if (last.nc !== needClick) { last.nc = needClick; $('lockHint').hidden = !needClick; }
    if (last.snk !== PL.sneak) { last.snk = PL.sneak; $('aSnk').classList.toggle('lit', PL.sneak); }
    $('hpf').style.width = (PL.hp / PL.maxHp * 100).toFixed(1) + '%'; $('stf').style.width = PL.st.toFixed(0) + '%';
    setTxt('lvl', PL.level);
    const purse = `${PL.den}|${PL.panis}|${PL.pila}`;
    if (last.purse !== purse) { last.purse = purse; $('purse').innerHTML = `<span><b>${PL.den}</b> denarii</span>`; $('eatN').textContent = PL.panis; $('pilN').textContent = PL.pila; }
    const st = `${PL.horse}|${PL.mode}|${PL.panis > 0}|${PL.pila > 0}`;
    if (last.st !== st) { last.st = st; $('aMnt').hidden = !PL.horse; $('actions').hidden = PL.mode === 'ship'; $('aSnk').hidden = PL.mode !== 'foot'; $('aEat').classList.toggle('off', PL.panis <= 0); $('aPil').classList.toggle('off', PL.pila <= 0); }
    // compass
    const w = 760, h = 52, heading = -camYaw;
    cc.clearRect(0, 0, w, h); cc.textAlign = 'center'; cc.textBaseline = 'middle';
    const rel = (b) => { let d = (b - heading) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
    cc.fillStyle = 'rgba(18,13,8,0.55)'; cc.fillRect(0, 12, w, 28);
    for (let i = 0; i < 24; i++) { const d = rel(i * TAU / 24); if (Math.abs(d) > 1.5) continue; const x = w / 2 + d / 1.5 * (w / 2), card = i % 6 === 0; cc.fillStyle = card ? '#f6e2a8' : 'rgba(239,227,200,0.55)'; if (card) { cc.font = '800 24px Cinzel, Georgia, serif'; cc.fillText('NESW'[i / 6], x, 27); } else cc.fillRect(x - 1, i % 3 === 0 ? 18 : 22, 2, i % 3 === 0 ? 16 : 8); }
    let obj = '';
    if (tt) {
      const d = rel(Math.atan2(tt.x - PL.x, -(tt.z - PL.z))), x = w / 2 + clamp(d / 1.5, -1, 1) * (w / 2 - 14), dist = Math.hypot(tt.x - PL.x, tt.z - PL.z);
      cc.beginPath(); cc.moveTo(x, 4); cc.lineTo(x + 12, 26); cc.lineTo(x, 48); cc.lineTo(x - 12, 26); cc.closePath(); cc.fillStyle = '#e8b63c'; cc.fill(); cc.lineWidth = 3; cc.strokeStyle = '#241a10'; cc.stroke();
      obj = `${tt.text}|${dist < 25 ? '' : Math.max(1, Math.round(dist / MILE)) + ' Roman miles'}|${tt.q.name}`;
    }
    if (last.obj !== obj) { last.obj = obj; const [a, b, n] = obj.split('|'); $('objective').innerHTML = obj ? `<small>${esc(n)}${b ? ' · ' + b : ''}</small>${esc(a)}` : ''; }
    const pt = promptText || '';
    if (last.pt !== pt) { last.pt = pt; $('prompt').hidden = !pt; $('promptT').textContent = pt; }
    let boss = null, bd = 30; for (const f of foes) { if (f.dead || !f.aware) continue; const d = Math.hypot(f.x - PL.x, f.z - PL.z); if (f.def.boss) { boss = f; break; } if (d < bd) { bd = d; boss = f; } }
    $('foe').hidden = !boss; if (boss) { setTxt('foeName', `${boss.def.name} · level ${boss.lvl}`); $('foeF').style.width = Math.max(0, boss.hp / boss.maxHp * 100).toFixed(1) + '%'; }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
    hintT -= dt; if (hintT <= 0 && hintQ.length && api.mode() === 'play') { note(hintQ.shift(), 8); hintT = 8.5; }
  }

  return { ctx, toast, note, hint, title, open, close, shop, dead, hud, settings };
}
