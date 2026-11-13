// Hollowpine interface: HUD, the tabbed menu (pack, craft, build, research, map, system) and chest transfer.
import { ITEMS, RECIPES, TECH, STRUCTS, TIER_NAMES, STRUCT_BY_ID } from './data.js';
import { SIZE, HALF } from './world.js';

const $ = (id) => document.getElementById(id);
const P = {
  log: 'M3 9h14a3 3 0 0 1 0 6H3a3 3 0 0 1 0-6zM17 10.2a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 0 0 0-3.6z', stick: 'M4 18L18 4l2 2L6 20zM12 10l6 1-1 2-6-1z', stone: 'M5 16l2-7 6-3 6 4 1 6-5 3H8z',
  fiber: 'M11 21C10 14 8 9 5 5c4 2 6 6 7 10 0-5 1-9 4-12-1 5-1 10-2 18z', rope: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', cloth: 'M4 6l16-1v13l-16 1zM4 10l16-1v1l-16 1z',
  bone: 'M6 4a2.5 2.5 0 0 0-1 4.8L15.2 19A2.5 2.5 0 1 0 19 15.2L8.8 5A2.5 2.5 0 0 0 6 4z', ore: 'M4 17l3-8 5-4 6 3 2 7-4 4H8zM9 12l3-2 2 3-3 2z', ingot: 'M6 9h12l3 7H3z',
  scrap: 'M5 5l6 2 3-3 2 5 4 2-4 3 1 5-5-2-4 3-1-5-5-3 5-2z', powder: 'M8 4h8l-1 3c3 2 4 5 4 8a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5c0-3 1-6 4-8z',
  gear: 'M12 2l2 3 3-1 1 3 3 1-1 3 3 2-3 2 1 3-3 1-1 3-3-1-2 3-2-3-3 1-1-3-3-1 1-3-3-2 3-2-1-3 3-1 1-3 3 1zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  chip: 'M6 6h12v12H6zM9 2h2v3H9zM13 2h2v3h-2zM9 19h2v3H9zM13 19h2v3h-2zM2 9h3v2H2zM2 13h3v2H2zM19 9h3v2h-3zM19 13h3v2h-3z',
  berry: 'M8 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM16 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 14a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM11 3h2v6h-2z', mushroom: 'M3 12a9 8 0 0 1 18 0zM10 13h4l1 8H9z',
  meat: 'M5 9a6 5 0 1 1 9 5l5 5-2 2-5-5A6 5 0 0 1 5 9z', can: 'M7 4h10v3H7zM7 8h10v12H7z', bottle: 'M10 2h4v4l2 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-3z', med: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  arrow: 'M3 21l2-6L17 3h4v4L9 19z', ammo: 'M5 9a2 4 0 0 1 4 0v11H5zM10 9a2 4 0 0 1 4 0v11h-4zM15 9a2 4 0 0 1 4 0v11h-4z', axe: 'M10 3h3v18h-3zM13 5c4 0 7 2 7 5s-3 4-7 4z', pick: 'M11 6h2v16h-2zM2 9c6-7 14-7 20 0-6-3-14-3-20 0z',
  club: 'M10 12h4l1 10H9zM8 3h8l1 9H7z', spear: 'M11 9h2v13h-2zM12 1l4 8H8z', blade: 'M11 16h2v6h-2zM8 14h8v2H8zM10 14V4l2-3 2 3v10z', torch: 'M10 11h4l-1 11h-2zM12 1c4 4 5 6 3 10H9C7 7 9 5 12 1z',
  bow: 'M6 2c12 2 12 18 0 20v-2c9-2 9-14 0-16zM5 3h1.5v18H5zM3 11.2h16v1.6H3z', pistol: 'M3 7h17v4h-9l-1 3H8l1 6H4l1-9H3z', rifle: 'M1 10h14l1-2h7v3h-6l-1 2H9l-2 5H3l2-5H1z',
  smg: 'M2 8h18v3h-4v2h-3l1 7h-4l-1-7H8l-1 4H3l2-6H2z', shotgun: 'M1 9h22v2H1zM3 12h14v2H9l-2 5H3l2-5H3z', armor: 'M6 3l4 2h4l4-2 3 4-3 2v12H6V9L3 7z',
  hammer: 'M3 4h13v6H3zM9 10h3v12H9z',
  crop: 'M12 22c-4 0-6-3-6-7s3-6 6-6 6 2 6 6-2 7-6 7zM11 9c0-3-2-5-5-6 4-1 6 1 6 4 0-3 2-5 6-4-3 1-5 3-5 6z', seed: 'M8 14a3 4 0 1 0 0.1 0zM16 12a2.5 3.5 0 1 0 0.1 0zM12 4a2.5 3.5 0 1 0 0.1 0z',
};
let iconSrc = null;
export const setIconSource = (f) => { iconSrc = f; };
export const icon = (id) => { const src = iconSrc && ITEMS[id] ? iconSrc(id) : null; if (src) return `<img class="ico" src="${src}" alt="" draggable="false">`; const it = ITEMS[id]; return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" fill="${it ? it.tint : '#9da38d'}" d="${P[it ? it.icon : 'gear'] || P.gear}"/></svg>`; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CATS = [['weapon', 'Weapons'], ['tool', 'Tools'], ['armor', 'Armor'], ['ammo', 'Ammunition'], ['food', 'Food & water'], ['med', 'Medicine'], ['seed', 'Seeds'], ['res', 'Materials']];

export function createUI(G) {
  const U = { open: false, tab: 'pack', selItem: null };
  const body = $('uiBody'), tabsEl = $('tabs');
  const costHtml = (cost) => `<span class="cost">${Object.entries(cost).map(([k, n]) => `<span class="${G.count(k) < n ? 'lack' : ''}">${esc(ITEMS[k].n)} <b class="num">${G.count(k)}/${n}</b></span>`).join('')}</span>`;

  // ---- HUD
  const bars = { hp: $('bHp'), food: $('bFood'), water: $('bWater'), stam: $('bStam') };
  let hotKey = '';
  U.hud = () => {
    const p = G.P; bars.hp.style.width = p.hp + '%'; bars.food.style.width = p.food + '%'; bars.water.style.width = p.water + '%'; bars.stam.style.width = p.stam + '%';
    const key = G.hot.map((id, i) => id + ':' + (id ? G.count(id) : 0)).join() + G.sel;
    if (key !== hotKey) { hotKey = key; $('hotbar').innerHTML = G.hot.map((id, i) => `<button class="slot${i === G.sel ? ' sel' : ''}" data-slot="${i}"><span class="k">${i + 1}</span>${id && G.count(id) ? icon(id) + (ITEMS[id].max > 1 ? `<span class="q num">${G.count(id)}</span>` : '') : ''}</button>`).join(''); }
  };
  $('hotbar').addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-slot]'); if (b) { e.preventDefault(); G.select(+b.dataset.slot); } });
  let lastClock = '', lastStatus = '', lastAmmo = '', lastPrompt = '', lastZone = '';
  U.clock = (t, sub) => { if (t + sub !== lastClock) { lastClock = t + sub; $('clockT').textContent = t; $('clockS').textContent = sub; } };
  U.status = (arr) => { const s = arr.join('|'); if (s !== lastStatus) { lastStatus = s; $('status').innerHTML = arr.map((a) => `<span>${esc(a)}</span>`).join(''); } };
  U.ammo = (html) => { if (html !== lastAmmo) { lastAmmo = html; $('ammo').innerHTML = html; } };
  U.prompt = (html) => { if (html !== lastPrompt) { lastPrompt = html; $('prompt').innerHTML = html; } };
  U.zone = (s) => { if (s !== lastZone) { lastZone = s; $('zone').textContent = s; } };
  U.toast = (text, cls = '', ms = 2600) => { const t = document.createElement('div'); t.className = 'toast ' + cls; t.textContent = text; const box = $('toasts'); box.appendChild(t); while (box.children.length > 6) box.firstChild.remove(); setTimeout(() => t.remove(), ms); };
  const gains = new Map(); let gainT = 0;
  U.gain = (id, n) => { gains.set(id, (gains.get(id) || 0) + n); clearTimeout(gainT); gainT = setTimeout(() => { for (const [k, v] of gains) U.toast(`+${v} ${ITEMS[k].n}`); gains.clear(); }, 120); };
  const cc = $('compassCv').getContext('2d');
  U.compass = (yaw) => {
    const w = 840, h = 52; cc.clearRect(0, 0, w, h); cc.textAlign = 'center'; cc.shadowColor = '#000'; cc.shadowBlur = 4;
    const deg = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
    for (let a = 0; a < 360; a += 15) { let d = a - deg; if (d > 180) d -= 360; if (d < -180) d += 360; if (Math.abs(d) > 70) continue; const x = w / 2 + d * 6, big = a % 90 === 0; cc.fillStyle = big ? '#e2a43a' : 'rgba(232,226,207,0.8)'; cc.fillRect(x - 1, big ? 30 : 36, 2, big ? 16 : 8); if (a % 45 === 0) { cc.font = (big ? '700 26px' : '500 19px') + ' "Saira Condensed", sans-serif'; cc.fillText({ 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }[a], x, 24); } }
    cc.fillStyle = '#fff'; cc.beginPath(); cc.moveTo(w / 2 - 6, 52); cc.lineTo(w / 2 + 6, 52); cc.lineTo(w / 2, 43); cc.fill();
  };

  // ---- tabs
  const tabList = () => { const t = [['pack', 'Pack'], ['craft', 'Craft'], ['build', 'Build'], ['research', 'Research'], ['map', 'Map']]; if (G.chest) t.unshift(['chest', 'Chest']); t.push(['system', 'System']); return t; };
  function renderTabs() { tabsEl.innerHTML = tabList().map(([k, n]) => `<button data-tab="${k}" class="${k === U.tab ? 'on' : ''}">${n}</button>`).join('') + '<button class="x" data-close="1" aria-label="Close">Close ✕</button>'; }
  tabsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.close) U.close(); else { U.tab = b.dataset.tab; G.sfx('ui'); U.render(); } });
  U.show = (tab) => { U.open = true; if (tab) U.tab = tab; $('ui').hidden = false; U.render(); };
  U.close = () => { if (!U.open) return; U.open = false; $('ui').hidden = true; G.chest = null; G.onClose(); };
  U.render = () => { if (!U.open) return; if (U.tab === 'chest' && !G.chest) U.tab = 'pack'; renderTabs(); const sy = body.scrollTop; body.innerHTML = R[U.tab](); if (U.tab === 'map') drawMap(); body.scrollTop = sy; };

  const R = {
    pack() {
      G.syncSlots(); const S = G.slots, n = Math.max(30, Math.ceil(S.length / 6) * 6);
      const slot = (id, drop, from, key) => { const it = id && ITEMS[id]; return `<div class="islot${it ? ' has' : ''}${id && U.selItem === id ? ' sel' : ''}" data-drop="${drop}"${it ? ` data-drag="${id}" data-from="${from}" title="${esc(it.n)}"` : ''}>${key ? `<span class="k">${key}</span>` : ''}${it ? icon(id) + (it.max > 1 ? `<span class="q num">×${G.count(id)}</span>` : '') + (G.armor === id && from[0] === 'g' ? '<span class="w">Worn</span>' : '') : ''}</div>`; };
      let grid = ''; for (let i = 0; i < n; i++) grid += slot(S[i] && G.count(S[i]) ? S[i] : null, 'g:' + i, 'g:' + i);
      let belt = ''; G.hot.forEach((id, i) => { belt += slot(id && G.count(id) ? id : null, 'b:' + i, 'b:' + i, i + 1); });
      const p = G.P, bar = (l, v, c) => `<div class="ivit"><span>${l}</span><i><b style="width:${Math.round(v)}%;background:${c}"></b></i><em class="num">${Math.round(v)}</em></div>`;
      const k = U.selItem && G.inv[U.selItem] > 0 ? U.selItem : null, it = k && ITEMS[k];
      let d = '<div class="idetail"><span class="label">Nothing selected</span><p>Click an item to inspect it. Drag items onto the belt (keys 1 to 8) or the clothing slot. Right-click uses, wears or belts an item. Drag an item outside this window to drop it on the ground.</p></div>';
      if (it) {
        const usable = it.food || it.water || it.hp, w = it.w;
        d = `<div class="idetail"><div class="ihead">${icon(k)}<div><span class="label">${esc(CATS.find((c) => c[0] === it.cat)[1])}${w && w.era ? ' · ' + w.era : ''}</span><h3>${esc(it.n)}</h3></div></div><p>${esc(it.d)}</p>
        ${w ? `<p class="num">${w.kind === 'gun' ? `Damage ${w.dmg}${w.pellets > 1 ? '×' + w.pellets : ''} · ${w.rpm} rpm · ${w.mag} rounds · ${ITEMS[w.ammo].n}` : w.kind === 'bow' ? `Damage ${w.dmg} · ${ITEMS[w.ammo].n}` : `Damage ${w.dmg} · reach ${w.range} m${w.tree >= 1 ? ' · fells trees' : ''}${w.ore >= 1 ? ' · mines rock' : ''}`}</p>` : ''}
        <div class="row">${usable ? `<button class="btn" data-use="${k}">${it.food ? 'Eat' : it.water ? 'Drink' : 'Use'}</button>` : ''}${it.armor ? `<button class="btn" data-wear="${k}">${G.armor === k ? 'Take off' : 'Wear'}</button>` : ''}<button class="btn ghost" data-drop-item="${k}">${G.count(k) > 1 ? 'Drop all' : 'Drop'}</button>${G.count(k) > 1 ? `<button class="btn ghost" data-drop-one="${k}">Drop one</button>` : ''}</div>
        ${it.cat !== 'res' && it.cat !== 'armor' && it.cat !== 'ammo' ? `<span class="label">Belt slot</span><div class="row">${G.hot.map((h, i) => `<button class="btn sm ${h === k ? '' : 'ghost'}" data-hot="${i}">${i + 1}</button>`).join('')}</div>` : ''}</div>`;
      }
      return `<div class="inv"><div class="invL"><span class="ilbl">Clothing</span>${slot(G.armor && G.count(G.armor) ? G.armor : null, 'armor', 'armor')}<span class="ihint">${G.armor ? Math.round(ITEMS[G.armor].armor * 100) + '% protection' : 'No armor'}</span><span class="ilbl">Vitals</span>${bar('Health', p.hp, 'var(--blood)')}${bar('Food', p.food, 'var(--amber)')}${bar('Water', p.water, 'var(--water)')}</div>
      <div class="invC"><span class="ilbl">Inventory</span><div class="igrid">${grid}</div><span class="ilbl">Belt</span><div class="ibelt">${belt}</div></div><div class="invR">${d}</div></div>`;
    },
    craft() {
      const lvl = G.tableLevel(); let h = '';
      for (let t = 0; t <= 3; t++) {
        const list = RECIPES.filter((r) => r.tier === t); if (!list.length) continue;
        h += `<div class="sec"><h3>${t ? 'Tier ' + 'I'.repeat(t) + ' · ' : ''}${TIER_NAMES[t]}</h3><span>${t ? (lvl >= t ? 'Research table in reach' : `Stand near a Research Table ${'I'.repeat(t)}`) : 'Craft anywhere'}</span></div><div class="list">`;
        for (const r of list) { const i = RECIPES.indexOf(r), s = G.recipeState(r), it = ITEMS[r.id]; h += `<div class="rec${s.locked ? ' locked' : ''}">${icon(r.id)}<div><div class="nm">${esc(it.n)}${r.n > 1 ? ` <small>×${r.n}</small>` : ''}${r.st ? ` <small>· at ${{ fire: 'a campfire', furnace: 'a furnace', water: 'fresh water' }[r.st]}</small>` : ''}</div>${costHtml(r.cost)}</div><button class="btn sm" data-craft="${i}" ${s.ok ? '' : 'disabled'} title="${esc(s.why || '')}">${s.ok ? 'Craft' : esc(s.why)}</button></div>`; }
        h += '</div>';
      }
      return h;
    },
    build() {
      let h = '<p class="label">Pick a blueprint, place its ghost, then carry materials to it and hold E. R or the wheel turns it. Hold X on any structure to take it down. Building pieces go up in thatch: craft a Building Hammer, hold it and press E on a piece to upgrade it to wood, then stone, then metal.</p>';
      for (const cat of ['Camp', 'Farming', 'Building', 'Defense', 'Research']) { h += `<div class="sec"><h3>${cat}</h3></div><div class="cards bcards">`; for (const s of STRUCTS.filter((q) => q.cat === cat)) { const locked = s.tech && !G.tech.has(s.tech); h += `<button class="card bcard" data-build="${s.id}" ${locked ? 'disabled' : ''}><img src="${G.thumb(s.id)}" alt="" width="112" height="84"><span class="bc"><b>${esc(s.n)}</b>${locked ? '<span class="tag">Needs research</span>' : s.tiered ? '<span class="tag go">Thatch · upgrade with a hammer</span>' : ''}<p>${esc(s.d)}</p>${costHtml(s.cost)}</span></button>`; } h += '</div>'; }
      return h;
    },
    research() {
      const lvl = G.tableLevel();
      let h = `<div class="sec"><h3>Research</h3><span>Scrap in pack: <b class="num">${G.count('scrap')}</b> · ${lvl ? `Research Table ${'I'.repeat(lvl)} in reach` : 'No research table in reach. Build one from the Build tab; scrap comes from crates, wrecks and scavengers.'}</span></div><div class="tiers">`;
      for (let t = 1; t <= 3; t++) {
        h += `<div><div class="sec"><h3>${'I'.repeat(t)} · ${TIER_NAMES[t]}</h3></div><div class="list">`;
        for (const n of TECH.filter((q) => q.tier === t)) { const s = G.techState(n), nm = n.n || ITEMS[n.id].n; h += `<button class="card" data-tech="${n.id}" ${s === 'ok' ? '' : 'disabled'}><b>${esc(nm)}</b><span class="tag ${s === 'done' ? 'ok' : s === 'ok' ? 'go' : ''}">${{ done: 'Learned', ok: `Research · ${n.cost} scrap`, poor: `${n.cost} scrap`, req: 'Needs ' + (n.req ? (ITEMS[n.req] ? ITEMS[n.req].n : n.req) : ''), table: `${n.cost} scrap · needs Table ${'I'.repeat(t)}` }[s]}</span></button>`; }
        h += '</div></div>';
      }
      return h + '</div>';
    },
    map() { return '<div id="mapWrap"><canvas id="mapCv" width="1024" height="1024"></canvas><span class="label">Places appear once you have walked to them. North is up.</span></div>'; },
    chest() {
      const c = G.chest.inv, side = (inv, to) => { const ids = Object.keys(inv).filter((k) => inv[k] > 0); return ids.length ? `<div class="grid">${ids.map((k) => `<button class="tile" data-move="${k}" data-to="${to}" title="${esc(ITEMS[k].n)}">${icon(k)}<span class="q num">${inv[k]}</span></button>`).join('')}</div>` : '<p class="label">Empty</p>'; };
      return `<div class="cols" style="grid-template-columns:1fr 1fr"><div><div class="sec"><h3>Your pack</h3><span>Tap to store the whole stack</span></div>${side(G.inv, 1)}</div><div><div class="sec"><h3>Chest</h3><span>Tap to take</span></div>${side(c, 0)}</div></div>`;
    },
    system() {
      const s = G.settings, seg = (k, opts) => `<div class="seg">${opts.map(([v, n]) => `<button data-set="${k}" data-v="${v}" class="${s[k] === v ? 'on' : ''}">${n}</button>`).join('')}</div>`;
      return `<div class="sec"><h3>Game</h3><span>${esc(G.saveInfo())}</span></div><div class="row"><button class="btn" data-sys="resume">Resume</button><button class="btn ghost" data-sys="save">Save now</button><button class="btn ghost" data-sys="${U.confirmNew ? 'new2' : 'new'}">${U.confirmNew ? 'Really erase this save and start over?' : 'New game'}</button></div>
      <div class="sec"><h3>Settings</h3></div><div class="list">
      <div class="opt"><span class="label">Graphics</span>${seg('quality', [[0, 'Low'], [1, 'Medium'], [2, 'High']])}<span class="label">applies on next load</span></div>
      <div class="opt"><label class="label" for="setSens">Look speed</label><input type="range" id="setSens" min="0.3" max="2.5" step="0.1" value="${s.sens}"></div>
      <div class="opt"><label class="label" for="setVol">Volume</label><input type="range" id="setVol" min="0" max="1" step="0.05" value="${s.vol}"></div>
      <div class="opt"><span class="label">Vertical look</span>${seg('invert', [[0, 'Normal'], [1, 'Inverted']])}</div></div>
      <div class="sec"><h3>Controls</h3></div><div class="keys"><span><b>WASD</b> move</span><span><b>Mouse</b> look (click to capture)</span><span><b>Shift</b> sprint</span><span><b>Space</b> jump</span><span><b>C</b> crouch</span><span><b>Left click</b> swing, fire, place</span><span><b>Right click</b> aim down sights</span><span><b>R</b> reload · turn blueprint</span><span><b>E</b> use, gather, add material</span><span><b>X (hold)</b> dismantle</span><span><b>1 to 8, wheel</b> hotbar</span><span><b>Tab</b> pack and crafting</span><span><b>B</b> building book</span><span><b>M</b> map</span><span><b>F</b> flashlight</span><span><b>Q</b> cancel blueprint</span></div>`;
    },
  };
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return; const d = b.dataset;
    if (d.item) U.selItem = d.item; else if (d.use) G.useItem(d.use); else if (d.wear) G.wear(d.wear); else if (d.dropItem) { G.dropItem(d.dropItem, G.count(d.dropItem)); U.selItem = null; } else if (d.dropOne) G.dropItem(d.dropOne, 1);
    else if (d.hot) G.assign(+d.hot, U.selItem); else if (d.craft) G.craft(RECIPES[+d.craft], e.shiftKey ? 5 : 1); else if (d.build) { G.startBuild(d.build); return; }
    else if (d.tech) G.research(d.tech); else if (d.move) G.chestMove(d.move, d.to === '1');
    else if (d.set) G.setSetting(d.set, +d.v);
    else if (d.sys === 'resume') { U.close(); return; } else if (d.sys === 'save') G.saveNow(true); else if (d.sys === 'new') U.confirmNew = true; else if (d.sys === 'new2') { U.confirmNew = false; G.newGame(); return; }
    if (!d.sys || d.sys !== 'new') if (!d.sys) U.confirmNew = false;
    U.render();
  });
  // inventory drag and drop (mouse and touch)
  let drag = null;
  const quick = (id) => { const it = ITEMS[id]; if (it.food || it.water || it.hp) G.useItem(id); else if (it.armor) G.wear(id); else if (it.cat !== 'res' && it.cat !== 'ammo' && !G.hot.includes(id)) { const i = G.hot.findIndex((h) => !h || !G.count(h)); if (i >= 0) G.assign(i, id); } };
  body.addEventListener('pointerdown', (e) => { const el = e.target.closest('[data-drag]'); if (!el || e.button === 2) return; drag = { id: el.dataset.drag, from: el.dataset.from, x: e.clientX, y: e.clientY, ghost: null }; });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return; if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 7) { const g = document.createElement('div'); g.className = 'idrag'; g.innerHTML = icon(drag.id); document.body.appendChild(g); drag.ghost = g; }
    if (drag.ghost) { drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; }
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return; const d = drag; drag = null; if (!d.ghost) { U.selItem = d.id; G.sfx('ui'); U.render(); return; }
    d.ghost.remove(); const el = document.elementFromPoint(e.clientX, e.clientY), t = el && el.closest('[data-drop]'); if (!U.open) return;
    if (!t) { const r = document.querySelector('#ui .box').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { G.dropItem(d.id, G.count(d.id)); U.selItem = null; U.render(); } return; }
    const to = t.dataset.drop, [fk, fi] = d.from.split(':'), [tk, ti] = to.split(':'), it = ITEMS[d.id];
    if (tk === 'armor') { if (it.armor) G.armor = d.id; }
    else if (tk === 'b') { if (it.cat === 'res' || it.cat === 'ammo' || it.cat === 'armor') { U.toast('That cannot go on the belt', 'bad'); } else if (fk === 'b') { const a = G.hot[+ti]; G.hot[+ti] = d.id; G.hot[+fi] = a; } else G.assign(+ti, d.id); }
    else if (tk === 'g') { if (fk === 'b') G.hot[+fi] = null; else if (fk === 'armor') G.armor = null; else { const S = G.slots; while (S.length <= Math.max(+ti, +fi)) S.push(null); const a = S[+ti]; S[+ti] = S[+fi]; S[+fi] = a; } }
    G.sfx('pickup'); U.selItem = d.id; U.render();
  });
  window.addEventListener('pointercancel', () => { if (drag && drag.ghost) drag.ghost.remove(); drag = null; });
  body.addEventListener('contextmenu', (e) => { const el = e.target.closest('[data-drag]'); if (!el) return; e.preventDefault(); quick(el.dataset.drag); U.selItem = el.dataset.drag; U.render(); });
  body.addEventListener('dblclick', (e) => { const el = e.target.closest('[data-drag]'); if (el) { quick(el.dataset.drag); U.render(); } });
  body.addEventListener('input', (e) => { if (e.target.id === 'setSens') G.setSetting('sens', +e.target.value); if (e.target.id === 'setVol') G.setSetting('vol', +e.target.value); });

  // ---- map
  let mapImg = null;
  function drawMap() {
    const cv = $('mapCv'), c = cv.getContext('2d'), n = cv.width;
    if (!mapImg) { mapImg = document.createElement('canvas'); mapImg.width = mapImg.height = 512; G.W.drawMap(mapImg); }
    c.imageSmoothingEnabled = true; c.drawImage(mapImg, 0, 0, n, n);
    const X = (x) => (x + HALF) / SIZE * n;
    c.textAlign = 'center'; c.font = '700 21px "Saira Condensed", sans-serif'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.75)';
    for (const p of G.W.pois) {
      const x = X(p.x), y = X(p.z); if (!p.found) { c.fillStyle = 'rgba(232,226,207,0.5)'; c.font = '700 22px "Saira Condensed", sans-serif'; c.strokeText('?', x, y + 7); c.fillText('?', x, y + 7); continue; }
      c.fillStyle = { danger: '#cf4a3c', town: '#e2a43a', harbor: '#5aa9cc', peak: '#ffffff', camp: '#86b45c', cabin: '#c9a37a', site: '#e8e2cf' }[p.kind] || '#fff';
      c.beginPath(); if (p.kind === 'peak') { c.moveTo(x, y - 9); c.lineTo(x + 8, y + 6); c.lineTo(x - 8, y + 6); } else if (p.kind === 'danger') { c.moveTo(x, y - 8); c.lineTo(x + 8, y); c.lineTo(x, y + 8); c.lineTo(x - 8, y); } else c.arc(x, y, p.kind === 'town' || p.kind === 'harbor' ? 8 : 5.5, 0, 6.3); c.closePath(); c.stroke(); c.fill();
      c.font = (p.kind === 'town' || p.kind === 'harbor' ? '700 24px' : '500 19px') + ' "Saira Condensed", sans-serif'; c.fillStyle = '#e8e2cf'; c.strokeText(p.n.toUpperCase(), x, y - 13); c.fillText(p.n.toUpperCase(), x, y - 13);
    }
    for (const s of G.homes()) { c.fillStyle = '#86b45c'; c.strokeRect(X(s.x) - 5, X(s.z) - 5, 10, 10); c.fillRect(X(s.x) - 5, X(s.z) - 5, 10, 10); }
    const px = X(G.P.x), py = X(G.P.z); c.save(); c.translate(px, py); c.rotate(-G.P.yaw); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -14); c.lineTo(9, 10); c.lineTo(0, 5); c.lineTo(-9, 10); c.closePath(); c.stroke(); c.fill(); c.restore();
  }
  return U;
}
