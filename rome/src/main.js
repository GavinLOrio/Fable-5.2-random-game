import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld, part, T, mergeGeometries, litMat, toX, toZ, CS, XMIN, XMAX, ZMIN, ZMAX } from './world.js';
import { buildCity, collideCity } from './city.js';
import { makeHuman, poseHuman, addGhost, setFlash, makeHorse, poseHorse, makeShip, poseShip, charMat } from './models.js';
import { PLACES, ITEMS, STOCK, PRICE, NPCS, FOES, WILD, CAMPS, QUESTS } from './data.js';
import { createFx } from '../../src/fx.js';
import { createInput } from './input.js';
import { initAudio, sfx, musicTick, setVolumes, suspendAudio } from './audio.js';
import { clamp, lerp, damp, angleLerp, smoothstep, TAU } from '../../src/util.js';
import { createUI } from './ui.js';

const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');
const SET_KEY = 'aquila-settings-v1', slotKey = (n) => 'aquila-slot-' + n;
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
const PRESET = { low: { res: 0.8, shadows: false, bloom: false, view: 2, foliage: 0.4 }, med: { res: 1, shadows: true, bloom: false, view: 3, foliage: 0.7 }, high: { res: 1, shadows: true, bloom: true, view: 4, foliage: 1 } };
const S = Object.assign({ quality: isTouch ? 'low' : 'med', ...PRESET[isTouch ? 'low' : 'med'], autoRes: true, sens: 1, invertY: false, autoCam: true, master: 0.8, music: 0.5, sfx: 0.9, difficulty: 'normal', hud: 1, fps: false, numbers: true }, store.get(SET_KEY) || {});
const DIFF = { easy: { hp: 0.8, dmg: 0.6 }, normal: { hp: 1, dmg: 1 }, hard: { hp: 1.25, dmg: 1.4 } };
const MILE = 3.39; // world units per Roman mile

function boot() {
  const canvas = $('c');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { $('loadText').textContent = 'This device could not start 3D graphics (WebGL).'; return; }
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 3200);
  const wopts = { viewChunks: S.view, foliage: S.foliage, shadows: S.shadows, fog: 0.003 };
  const world = createWorld(scene, wopts);
  const fx = createFx(scene, camera);
  const input = createInput(canvas);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: isTouch ? 0 : 4, stencilBuffer: true }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.7, 0.95);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  let W = 1, H = 1, dynRes = 1;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    const pr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 1.5) * S.res * dynRes);
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false); composer.setPixelRatio(pr); composer.setSize(W, H);
    camera.aspect = W / H; camera.fov = W < H ? 62 : 50; camera.updateProjectionMatrix();
    fx.setScale((H * pr) / (2 * Math.tan((camera.fov * Math.PI) / 360)));
  }
  window.addEventListener('resize', resize);
  function applySettings(rebuild) {
    wopts.viewChunks = S.view; wopts.shadows = S.shadows; wopts.fog = 1.87 / (0.86 * S.view * CS);
    if (rebuild || wopts.foliage !== S.foliage) { wopts.foliage = S.foliage; world.rebuildAll(); }
    bloom.enabled = S.bloom; setVolumes(S.master, S.music, S.sfx);
    document.documentElement.style.setProperty('--hs', S.hud); $('fps').hidden = !S.fps;
    world.applySky(); resize(); store.set(SET_KEY, S);
  }

  // =====================================================================
  // State
  // =====================================================================
  const PL = {
    x: 0, z: 0, y: 0, facing: 0, hp: 100, maxHp: 100, st: 100, level: 1, xp: 0, den: 30, panis: 2, pila: 2,
    owned: ['pugio', 'noshield', 'tunica', 'nohelm'], eq: { weapon: 'pugio', shield: 'noshield', armor: 'tunica', helmet: 'nohelm' },
    horse: false, ship: false, shipPos: null, mode: 'foot', atk: null, combo: 0, comboT: 0, queued: false, blocking: false, blockT: 0, dodgeT: 0, dodgeCd: 0, dx: 0, dz: 1,
    invuln: 0, stag: 0, hurtT: 0, lastHurt: 99, stIdle: 0, ph: 0, mv: 0, speed: 0, kills: 0, time: 0, slot: 1, name: 'Marcus',
  };
  let mode = 'loading', time = 0, rt = 0, camYaw = 0, camPitch = 0.42, camDist = 10, camDistT = 10, camClear = 10, combat = 0, saveT = 0, slotNow = 1;
  const camTarget = new THREE.Vector3();
  const QS = {};                 // quest id -> { state: 'locked' | 'avail' | 'active' | 'done', step }
  let tracked = 'm1';
  const discovered = new Set(), campsDone = new Set();
  const foes = [], npcs = [], civs = [], shots = [];
  const G = { bot: false, god: false };
  const QBY = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
  const xpNeed = (l) => 80 + 70 * (l - 1) + 12 * (l - 1) * (l - 1);
  const item = (id) => ITEMS[id];
  const defence = () => item(PL.eq.armor).def + item(PL.eq.helmet).def;
  const recompute = () => { PL.maxHp = 100 + 14 * (PL.level - 1); PL.hp = Math.min(PL.hp, PL.maxHp); };

  // ---------- positions ----------
  function snapWalk(x, z) {
    if (world.walkable(x, z)) return [x, z];
    for (let r = 6; r < 160; r += 6) for (let a = 0; a < TAU; a += 6 / r) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (world.walkable(px, pz)) return [px, pz]; }
    return [x, z];
  }
  const posCache = new Map();
  function stepPos(st, defOff) {
    const key = JSON.stringify([st.at, st.off || defOff]);
    let p = posCache.get(key);
    if (!p) {
      const off = st.off || defOff || [0, 0];
      if (typeof st.at === 'string') { const s = world.siteById[st.at]; p = snapWalk(s.x + off[0], s.z + off[1]); }
      else p = snapWalk(toX(st.at[1]) + off[0], toZ(st.at[0]) + off[1]);
      posCache.set(key, p);
    }
    return p;
  }
  const TALK_OFF = [4, 9];
  const posOf = (st) => stepPos(st, st.t === 'talk' ? TALK_OFF : [0, 0]);

  // ---------- settlements ----------
  const reservedFor = (site) => {
    const out = [[-11, 11.5, 5], [2.5, 5, 4], [TALK_OFF[0], TALK_OFF[1], 3]];
    for (const q of QUESTS) { const list = q.steps.slice(); for (const st of list) if (st.at === site.id) { const o = st.off || (st.t === 'talk' ? TALK_OFF : [0, 0]); out.push([o[0], o[1], st.t === 'kill' ? 11 : 4]); } }
    return out;
  };
  const cities = new Map();
  let nearSite = null, nearObs = null;
  function updateCities() {
    let built = false;
    nearSite = null; let bd = 1e9;
    for (const s of world.sites) {
      const d = Math.hypot(s.x - PL.x, s.z - PL.z);
      if (d < bd) { bd = d; nearSite = s; }
      let c = cities.get(s.id);
      if (!c && d < 620 && !built) { c = buildCity(s, world, reservedFor(s)); if (c.mesh) scene.add(c.mesh); cities.set(s.id, c); built = true; }
      if (c && c.mesh) c.mesh.visible = d < (S.view + 1.5) * CS;
    }
    nearObs = nearSite && bd < nearSite.r + 80 && cities.get(nearSite.id) ? cities.get(nearSite.id).obs : null;
    if (nearSite && bd > nearSite.r + 80) nearSite = null;
  }
  const _o = { x: 0, z: 0 };
  // move a circle with collision; returns true if it moved freely
  function moveBody(b, dx, dz, r, water) {
    _o.x = b.x + dx; _o.z = b.z + dz;
    if (!water) { world.collideProps(_o, r); if (nearObs) collideCity(_o, r, nearObs); }
    const ok = water ? world.sailable : world.walkable;
    if (ok(_o.x, _o.z)) { b.x = _o.x; b.z = _o.z; return true; }
    if (ok(_o.x, b.z)) { b.x = _o.x; return false; }
    if (ok(b.x, _o.z)) { b.z = _o.z; return false; }
    return false;
  }

  // ---------- player models ----------
  let hero = null;
  function buildHero() {
    if (hero) hero.g.removeFromParent();
    hero = makeHuman({ tunic: 0x9a2a22, armor: PL.eq.armor === 'tunica' ? 'none' : PL.eq.armor, helmet: PL.eq.helmet, weapon: PL.eq.weapon, shield: PL.eq.shield, hair: 0x3a2a1a, cloak: PL.eq.armor === 'musculata' ? 0xa01818 : undefined });
    addGhost(hero); scene.add(hero.g);
  }
  const horse = makeHorse(); horse.g.visible = false; scene.add(horse.g);
  let horseAt = null;
  const ship = makeShip(); ship.g.visible = false; scene.add(ship.g);
  const markerGeo = new THREE.OctahedronGeometry(0.28, 0), markerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 0.7), fog: false });
  const markerMatQ = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 2.2, 3), fog: false });
  const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 30, 8, 1, true); beamGeo.translate(0, 15, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.9, 0.3), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const findMark = new THREE.Group(); findMark.add(new THREE.Mesh(beamGeo, beamMat), new THREE.Mesh(markerGeo, markerMat)); findMark.children[1].position.y = 1.4; findMark.children[1].scale.setScalar(1.6); findMark.visible = false; scene.add(findMark);
  const objBeam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.7, 0.25), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); objBeam.scale.set(2.2, 9, 2.2); objBeam.visible = false; scene.add(objBeam);
  // arrows / javelins
  const shotGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4); shotGeo.rotateX(Math.PI / 2);
  const shotMesh = new THREE.InstancedMesh(shotGeo, new THREE.MeshBasicMaterial({ color: 0x3a2a1a }), 40); shotMesh.count = 0; shotMesh.frustumCulled = false; scene.add(shotMesh);
  const chestGeo = mergeGeometries([part(new THREE.BoxGeometry(1.5, 0.9, 1.0), 0x7a4a25, T(0, 0.45, 0)), part(new THREE.BoxGeometry(1.56, 0.16, 1.06), 0xd9ad4e, T(0, 0.9, 0)), part(new THREE.BoxGeometry(0.2, 0.94, 1.06), 0xd9ad4e, T(-0.5, 0.45, 0)), part(new THREE.BoxGeometry(0.2, 0.94, 1.06), 0xd9ad4e, T(0.5, 0.45, 0))]);
  const tentGeo = mergeGeometries([part(new THREE.CylinderGeometry(1, 1, 1, 3), 0x7a5a3a, T(-4, 1.05, -3, 2.2, 4.2, 1.4, Math.PI / 2, 0.5, 0)), part(new THREE.CylinderGeometry(1, 1, 1, 3), 0x6a4a34, T(4.5, 1.05, -2, 2.2, 4.2, 1.4, Math.PI / 2, -0.6, 0)), part(new THREE.CylinderGeometry(0.9, 1.1, 0.3, 7), 0x5a5048, T(0, 0.15, 3)), part(new THREE.ConeGeometry(0.5, 1.1, 5), [3.2, 1.4, 0.3], T(0, 0.8, 3))]);
  const camps = CAMPS.map(([lat, lon, lvl, reward, den], i) => ({ i, lvl, reward, den, x: 0, z: 0, ready: false, spawned: false, mesh: null, chest: null, lat, lon }));

  // =====================================================================
  // Quests
  // =====================================================================
  const ui = createUI({ $, S, PL, QS, QUESTS, QBY, ITEMS, STOCK, PRICE, world, discovered, isTouch, PRESET, MILE, api: {} });
  const api = ui.ctx.api;
  function initQuests(saved) {
    for (const q of QUESTS) QS[q.id] = saved && saved[q.id] ? { ...saved[q.id] } : { state: q.main ? (q.id === 'm1' ? 'active' : 'locked') : q.req ? 'locked' : 'avail', step: 0 };
    refreshAvail();
  }
  function refreshAvail() { for (const q of QUESTS) if (!q.main && QS[q.id].state === 'locked' && (!q.req || QS[q.req].state === 'done')) QS[q.id].state = 'avail'; }
  const curStep = (id) => QBY[id].steps[QS[id].step];
  const activeIds = () => QUESTS.filter((q) => QS[q.id].state === 'active').map((q) => q.id);
  function objectiveOf(id) { const st = QS[id]; if (!st) return null; if (st.state === 'active') return curStep(id); if (st.state === 'avail') return QBY[id].steps[0]; return null; }
  function trackedTarget() {
    if (!QS[tracked] || (QS[tracked].state !== 'active' && QS[tracked].state !== 'avail')) tracked = activeIds().find((i) => QBY[i].main) || activeIds()[0] || null;
    const st = tracked && objectiveOf(tracked);
    if (!st) return null;
    const p = posOf(st);
    return { x: p[0], z: p[1], text: st.obj, q: QBY[tracked] };
  }
  function give(g) {
    if (!g) return;
    for (const id of g.items || []) if (!PL.owned.includes(id)) { PL.owned.push(id); ui.note(`Received: ${ITEMS[id].name}`); autoEquip(id); }
    if (g.den) { PL.den += g.den; ui.note(`+${g.den} denarii`); }
    if (g.horse && !PL.horse) { PL.horse = true; ui.note('You now own a horse'); ui.hint(isTouch ? 'Tap the horse button to mount or dismount.' : 'Press H to mount or dismount your horse. It is faster on Roman roads.'); }
    if (g.ship && !PL.ship) {
      PL.ship = true; const s = world.nearestSite(PL.x, PL.z, (p) => p.port);
      PL.shipPos = { x: s.moor.x, z: s.moor.z, rot: 0 }; ui.note('You now command a ship');
      ui.hint('Your galley waits in the harbour. Go to the harbour sign at any port to set sail.');
    }
  }
  function autoEquip(id) {
    const it = ITEMS[id], cur = ITEMS[PL.eq[it.slot]];
    const better = it.slot === 'weapon' ? it.dmg > cur.dmg : it.slot === 'shield' ? it.block > cur.block : it.def > cur.def;
    if (better) { PL.eq[it.slot] = id; buildHero(); }
  }
  function gainXp(v) {
    PL.xp += v;
    while (PL.xp >= xpNeed(PL.level)) { PL.xp -= xpNeed(PL.level); PL.level++; recompute(); PL.hp = PL.maxHp; sfx.levelup(); ui.toast(`Level ${PL.level}`, 'Health and damage increased', 2.6); fx.burst(PL.x, PL.y + 1, PL.z, 30, 6, 3, 2.2, 0.8, { life: 0.8, size: 0.5 }); }
  }
  function advance(id) {
    const q = QBY[id], st = QS[id], step = q.steps[st.step];
    give(step.give);
    st.step++;
    if (st.step >= q.steps.length) {
      st.state = 'done'; st.step = 0;
      const r = q.reward || {};
      give({ items: r.items, den: r.den }); if (r.xp) gainXp(r.xp);
      sfx.quest(); ui.toast(q.main ? 'Chapter complete' : 'Quest complete', q.name, 3.6);
      if (q.main) { const i = QUESTS.indexOf(q), nx = QUESTS[i + 1]; if (nx && nx.main) { QS[nx.id].state = 'active'; tracked = nx.id; setTimeout(() => { if (mode === 'play') ui.toast(nx.name, nx.date, 4); }, 4200); } }
      refreshAvail();
      if (tracked === id) tracked = null;
    } else { sfx.step(); ui.note('Objective updated'); }
    syncNpcDefs(); save(true);
  }
  function startSide(id) { QS[id].state = 'active'; QS[id].step = 0; tracked = id; }

  // ---------- NPCs ----------
  let npcDefs = [];
  function syncNpcDefs() {
    npcDefs = [];
    for (const q of QUESTS) {
      const st = objectiveOf(q.id);
      if (st && st.t === 'talk') { const p = posOf(st); npcDefs.push({ key: q.id + ':' + QS[q.id].step + ':' + QS[q.id].state, npc: st.npc, x: p[0], z: p[1], quest: q.id, kind: QS[q.id].state === 'avail' ? 'giver' : 'quest' }); }
    }
    for (const s of world.sites) if (['urbs', 'city', 'town', 'oppidum'].includes(s.kind)) { const p = snapWalk(s.x - 11, s.z + 9.2); npcDefs.push({ key: 'shop:' + s.id, npc: 'merchant', x: p[0], z: p[1], kind: 'shop', site: s }); }
    for (const n of npcs) { const d = npcDefs.find((k) => k.key === n.key); if (!d) { n.stale = true; n.mark.visible = false; } }
  }
  function spawnNpc(d) {
    const look = d.npc === 'merchant' ? { tunic: [0x8a6a3a, 0x4a6a5a, 0x7a4a5a][d.site.id.length % 3], hair: 0x3a2a1a, beard: d.site.id.length % 2, skin: ['egypt', 'punic', 'east'].includes(d.site.style) ? 0xc08a5a : 0xe0b08a } : NPCS[d.npc].look;
    const h = makeHuman(look);
    const mark = new THREE.Mesh(markerGeo, d.kind === 'giver' ? markerMatQ : markerMat); mark.position.y = 2.5; mark.visible = d.kind !== 'shop'; h.g.add(mark);
    scene.add(h.g);
    npcs.push({ key: d.key, d, h, mark, x: d.x, z: d.z, y: world.getHeight(d.x, d.z), facing: Math.PI, stale: false, name: d.npc === 'merchant' ? 'Merchant' : NPCS[d.npc].name });
  }
  const CIV_LOOKS = [{ tunic: 0xd8cdb4 }, { tunic: 0x8a6a4a, beard: 1 }, { female: 1, tunic: 0x7a8a9a, hair: 0x2a1a10 }, { female: 1, tunic: 0xb89a6a, stripe: 0x8a2a22, hair: 0x4a3018 }, { toga: 1, hair: 0x8a8378 }, { tunic: 0x6a7a5a, hair: 0x1a120c }, { tunic: 0x9a8a6a, bald: 1, hair: 0x7a7468 }];
  function updatePeople(dt) {
    // quest / shop NPCs
    for (const d of npcDefs) if (!npcs.some((n) => n.key === d.key) && Math.hypot(d.x - PL.x, d.z - PL.z) < 240) spawnNpc(d);
    for (let i = npcs.length - 1; i >= 0; i--) {
      const n = npcs[i], dist = Math.hypot(n.x - PL.x, n.z - PL.z);
      if (dist > 300 || (n.stale && dist > 70)) { n.h.g.removeFromParent(); npcs.splice(i, 1); continue; }
      if (dist < 9) n.facing = angleLerp(n.facing, Math.atan2(PL.x - n.x, PL.z - n.z), 1 - Math.exp(-5 * dt));
      n.h.g.position.set(n.x, n.y, n.z); n.h.g.rotation.y = n.facing;
      poseHuman(n.h, { mv: 0, ph: rt * 1.2 + i, atk: -1, kind: 0, block: 0, dead: 0 });
      n.mark.position.y = 2.5 + Math.sin(rt * 3 + i) * 0.12; n.mark.rotation.y = rt * 2;
    }
    // townsfolk
    const s = nearSite, want = s && ['urbs', 'city', 'town', 'oppidum'].includes(s.kind) && cities.get(s.id) ? (s.kind === 'urbs' ? 9 : 6) : 0;
    while (civs.length < want) {
      const a = Math.random() * TAU, r = 6 + Math.random() * s.r * 0.6, x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
      if (!world.walkable(x, z)) { if (Math.random() < 0.2) break; continue; }
      const base = CIV_LOOKS[(Math.random() * CIV_LOOKS.length) | 0], dark = ['egypt', 'punic', 'east'].includes(s.style);
      const h = makeHuman(dark ? { ...base, skin: 0xc08a5a } : base); scene.add(h.g);
      civs.push({ h, x, z, y: 0, facing: a, tx: x, tz: z, wait: Math.random() * 3, ph: Math.random() * 6, site: s });
    }
    for (let i = civs.length - 1; i >= 0; i--) {
      const c = civs[i];
      if (c.site !== s || Math.hypot(c.x - PL.x, c.z - PL.z) > 200) { c.h.g.removeFromParent(); civs.splice(i, 1); continue; }
      let mv = 0;
      if (c.wait > 0) { c.wait -= dt; if (c.wait <= 0) { const a = Math.random() * TAU, r = Math.random() * c.site.r * 0.7; c.tx = c.site.x + Math.cos(a) * r; c.tz = c.site.z + Math.sin(a) * r; } }
      else {
        const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz);
        if (d < 1) c.wait = 1.5 + Math.random() * 5;
        else { const ox = c.x, oz = c.z; moveBody(c, (dx / d) * 1.7 * dt, (dz / d) * 1.7 * dt, 0.45); if (Math.hypot(c.x - ox, c.z - oz) < 0.6 * 1.7 * dt) { c.stuck = (c.stuck || 0) + dt; if (c.stuck > 0.6) { c.wait = 0.5; c.stuck = 0; } } c.facing = angleLerp(c.facing, Math.atan2(dx, dz), 1 - Math.exp(-6 * dt)); mv = 0.55; c.ph += dt * 6; }
      }
      c.y = world.getHeight(c.x, c.z); c.h.g.position.set(c.x, c.y, c.z); c.h.g.rotation.y = c.facing;
      poseHuman(c.h, { mv, ph: c.ph, atk: -1, kind: 0, block: 0, dead: 0 });
    }
  }

  // =====================================================================
  // Foes
  // =====================================================================
  function spawnFoe(type, x, z, lvl, group) {
    const def = FOES[type], d = DIFF[S.difficulty];
    const model = def.beast ? makeHorse({ wolf: 1, coat: 0x6a6a70, dark: 0x3a3a40 }) : makeHuman(def.look);
    scene.add(model.g);
    const wp = def.look && def.look.weapon;
    const f = {
      type, def, lvl, group, model, x, z, y: world.getHeight(x, z), facing: Math.random() * TAU, r: def.beast ? 0.6 : 0.5,
      hp: def.hp * (1 + 0.14 * (lvl - 1)) * d.hp, dmg: def.dmg * (1 + 0.09 * (lvl - 1)) * d.dmg, st: 'chase', t: 0, cd: 0.6 + Math.random() * 1.5, ph: Math.random() * 6, mv: 0,
      reach: def.beast ? 2.0 : wp === 'hasta' ? 3.3 : wp === 'gallic' ? 3.0 : 2.5, strafe: Math.random() < 0.5 ? 1 : -1, flash: 0, dead: 0, kx: 0, kz: 0, atkKind: 0, aware: group !== 'wild' && group !== 'camp',
    };
    f.maxHp = f.hp; foes.push(f);
    return f;
  }
  function spawnGroup(list, x, z, lvl, group) {
    const out = [];
    for (const [type, n] of list) for (let k = 0; k < n; k++) { const a = Math.random() * TAU, r = 2 + Math.random() * 7; const p = snapWalk(x + Math.cos(a) * r, z + Math.sin(a) * r); out.push(spawnFoe(type, p[0], p[1], lvl, group)); }
    return out;
  }
  function removeGroup(group) { for (let i = foes.length - 1; i >= 0; i--) if (foes[i].group === group) { foes[i].model.g.removeFromParent(); foes.splice(i, 1); } }
  function hurtPlayer(dmg, fx0, fz0, f) {
    if (PL.invuln > 0 || PL.hp <= 0 || G.god) return;
    const dx = fx0 - PL.x, dz = fz0 - PL.z, d = Math.hypot(dx, dz) || 1;
    const front = Math.sin(PL.facing) * (dx / d) + Math.cos(PL.facing) * (dz / d) > 0.15;
    if (PL.blocking && front && PL.mode === 'foot') {
      if (PL.blockT < 0.25) { sfx.parry(); fx.burst(PL.x + dx / d * 0.7, PL.y + 1.3, PL.z + dz / d * 0.7, 14, 6, 3, 2.6, 1.2, { life: 0.3, size: 0.35 }); if (f) { f.st = 'stag'; f.t = 1.2; } if (S.numbers) fx.number(PL.x, PL.y + 2.3, PL.z, 'Parry', 'crit'); return; }
      const blk = item(PL.eq.shield).block; PL.st -= dmg * 1.3; dmg *= 1 - blk; sfx.clang();
      fx.burst(PL.x + dx / d * 0.7, PL.y + 1.2, PL.z + dz / d * 0.7, 6, 4, 2.5, 2, 1, { life: 0.25, size: 0.3 });
      if (PL.st <= 0) { PL.st = 0; PL.stag = 0.7; PL.blocking = false; ui.note('Guard broken'); }
    } else { sfx.hurt(); fx.addShake(0.3); $('vignette').style.opacity = 0.8; PL.hurtT = 0.25; }
    dmg *= 1 - defence();
    PL.hp -= dmg; PL.lastHurt = 0; combat = 6;
    if (S.numbers && dmg >= 1) fx.number(PL.x, PL.y + 2.2, PL.z, Math.round(dmg), 'hurt');
    if (PL.mode === 'horse' && dmg > 4) setMode('foot');
    if (PL.hp <= 0) { PL.hp = 0; die(); }
  }
  function hitFoe(f, dmg, heavy, dirx, dirz) {
    if (f.dead) return;
    const facingP = Math.sin(f.facing) * -dirx + Math.cos(f.facing) * -dirz > 0.3;
    if (f.def.guard && facingP && !heavy && f.st !== 'stag' && f.st !== 'windup' && Math.random() < f.def.guard) {
      sfx.clang(); fx.burst(f.x - dirx * 0.5, f.y + 1.2, f.z - dirz * 0.5, 6, 4, 2.5, 2.2, 1.2, { life: 0.25, size: 0.3 }); dmg *= 0.25;
      if (S.numbers) fx.number(f.x, f.y + 2.3, f.z, 'Blocked', '');
    } else { sfx.hit(); fx.burst(f.x, f.y + 1.2, f.z, heavy ? 12 : 6, 5, 2.4, 0.4, 0.3, { life: 0.3, size: 0.35 }); }
    f.hp -= dmg; f.flash = 0.1; f.aware = true; setFlash(f.model, true);
    f.kx += dirx * (heavy ? 9 : 3.5); f.kz += dirz * (heavy ? 9 : 3.5);
    if (heavy && !f.def.boss) { f.st = 'stag'; f.t = 0.6; } else if (f.st === 'windup' && !f.def.elite && Math.random() < 0.45) { f.st = 'stag'; f.t = 0.35; }
    if (S.numbers) fx.number(f.x, f.y + 2.1, f.z, Math.round(dmg), heavy ? 'crit' : '');
    combat = 6;
    if (f.hp <= 0) {
      f.dead = 0.001; f.st = 'dead'; sfx.kill(); PL.kills++;
      const dn = f.def.den[0] + Math.floor(Math.random() * (f.def.den[1] - f.def.den[0] + 1));
      if (dn) { PL.den += dn; sfx.coin(); }
      gainXp(Math.round(f.def.xp * (1 + 0.1 * (f.lvl - 1))));
      if (S.numbers) fx.number(f.x, f.y + 2.8, f.z, `+${Math.round(f.def.xp * (1 + 0.1 * (f.lvl - 1)))} xp${dn ? `  +${dn} d` : ''}`, 'xp');
    }
  }
  function updateFoes(dt) {
    let attackers = 0;
    for (const f of foes) if (f.st === 'windup' || f.st === 'strike') attackers++;
    for (let i = foes.length - 1; i >= 0; i--) {
      const f = foes[i];
      if (f.flash > 0) { f.flash -= dt; if (f.flash <= 0) setFlash(f.model, false); }
      const dx = PL.x - f.x, dz = PL.z - f.z, d = Math.hypot(dx, dz) || 0.001, nx = dx / d, nz = dz / d;
      if (f.dead) { f.dead = Math.min(1, f.dead + dt * 2.5); f.t += dt; if (f.t > 3.2) { f.model.g.removeFromParent(); foes.splice(i, 1); } continue; }
      if ((f.group === 'wild' && d > 110) || d > 260) { f.model.g.removeFromParent(); foes.splice(i, 1); continue; }
      if (!f.aware) { if (d < 34 && PL.mode !== 'ship') f.aware = true; else { f.mv = 0; continue; } }
      combat = Math.max(combat, d < 40 ? 3 : 0);
      let mvx = 0, mvz = 0, sp = f.def.spd, face = Math.atan2(dx, dz);
      const range = f.def.ranged ? 13 : f.reach * 0.8;
      f.cd -= dt; f.t -= dt;
      if (PL.mode === 'ship') { f.st = 'chase'; f.mv = 0; continue; }
      if (f.st === 'stag') { if (f.t <= 0) { f.st = 'chase'; f.cd = Math.max(f.cd, 0.4); } }
      else if (f.st === 'windup') {
        if (f.t <= 0) {
          f.st = 'strike'; f.t = 0.16;
          if (f.def.ranged) { shots.push({ x: f.x, y: f.y + 1.4, z: f.z, vx: nx * 27, vz: nz * 27, life: 1.6, dmg: f.dmg, foe: f, mine: false }); sfx.arrow(); }
          else {
            if (f.def.beast) { f.kx += nx * 14; f.kz += nz * 14; }
            const fd = Math.sin(f.facing) * nx + Math.cos(f.facing) * nz;
            if (d < f.reach + 0.6 && fd > 0.35) hurtPlayer(f.dmg, f.x, f.z, f); else sfx.swing();
          }
        } else if (f.t < 0.16) face = f.facing;
      } else if (f.st === 'strike') { face = f.facing; if (f.t <= 0) { f.st = 'recover'; f.t = f.def.slow ? 0.9 : 0.55; } }
      else if (f.st === 'recover') { face = f.facing; if (f.t <= 0) { f.st = 'chase'; f.cd = 0.9 + Math.random() * 1.6; } }
      else {
        if (f.def.ranged && d < 8) { mvx = -nx; mvz = -nz; sp *= 0.8; }
        else if (d > range) { mvx = nx; mvz = nz; }
        else if (f.cd <= 0 && attackers < 2 && PL.hp > 0) { f.st = 'windup'; f.t = f.def.ranged ? 0.7 : f.def.slow ? 0.75 : f.def.beast ? 0.4 : f.def.elite ? 0.55 : 0.5; f.dur = f.t; f.atkKind = f.def.slow ? 2 : (Math.random() * 3) | 0; attackers++; }
        else { mvx = -nz * f.strafe * 0.45 + nx * (d > range * 0.8 ? 0.3 : -0.3); mvz = nx * f.strafe * 0.45 + nz * (d > range * 0.8 ? 0.3 : -0.3); sp *= 0.5; if (Math.random() < dt * 0.3) f.strafe *= -1; }
      }
      // separation
      for (let j = 0; j < foes.length; j++) { const o = foes[j]; if (o === f || o.dead) continue; const ex = f.x - o.x, ez = f.z - o.z, e2 = ex * ex + ez * ez; if (e2 < 1.7 && e2 > 1e-4) { const e = Math.sqrt(e2); mvx += (ex / e) * 0.9; mvz += (ez / e) * 0.9; } }
      if (d < 1.0) { mvx -= nx; mvz -= nz; }
      const ml = Math.hypot(mvx, mvz);
      moveBody(f, (mvx * sp + f.kx) * dt, (mvz * sp + f.kz) * dt, f.r);
      const kd = Math.exp(-8 * dt); f.kx *= kd; f.kz *= kd;
      f.mv = damp(f.mv, Math.min(1, ml) * (sp / f.def.spd), 10, dt); f.ph += dt * (f.def.beast ? 16 : 9) * f.mv;
      f.facing = angleLerp(f.facing, face, 1 - Math.exp(-9 * dt));
      f.y = world.getHeight(f.x, f.z);
    }
  }
  function drawFoes() {
    for (const f of foes) {
      f.model.g.position.set(f.x, f.y, f.z); f.model.g.rotation.y = f.facing;
      if (f.def.beast) { poseHorse(f.model, f.ph, f.mv); f.model.g.rotation.z = f.dead * 1.5; f.model.g.position.y -= f.dead * 0.2; }
      else {
        let atk = -1;
        if (f.st === 'windup') atk = (1 - f.t / f.dur) * 0.35; else if (f.st === 'strike') atk = 0.35 + (1 - f.t / 0.16) * 0.4; else if (f.st === 'recover') atk = Math.min(1, 0.75 + (1 - f.t / 0.55) * 0.25);
        if (f.st === 'recover' && f.t < 0.2) atk = -1;
        poseHuman(f.model, { mv: f.mv, ph: f.ph, atk, kind: f.atkKind, ranged: f.def.ranged, block: f.def.guard && f.st === 'chase' ? 0.5 : 0, dead: f.dead, stag: f.st === 'stag' ? 1 : 0 });
      }
    }
  }
  function updateShots(dt) {
    let n = 0;
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.x += s.vx * dt; s.z += s.vz * dt; s.life -= dt;
      let gone = s.life <= 0 || world.getHeight(s.x, s.z) > s.y;
      if (!gone && s.mine) { for (const f of foes) if (!f.dead && (f.x - s.x) ** 2 + (f.z - s.z) ** 2 < 0.9) { const l = Math.hypot(s.vx, s.vz); hitFoe(f, s.dmg, true, s.vx / l, s.vz / l); gone = true; break; } }
      else if (!gone && (PL.x - s.x) ** 2 + (PL.z - s.z) ** 2 < 0.6 && PL.invuln <= 0) { hurtPlayer(s.dmg, s.x - s.vx, s.z - s.vz, null); gone = true; }
      if (gone) { shots.splice(i, 1); continue; }
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    for (const s of shots) { if (n >= 40) break; e.set(0, Math.atan2(s.vx, s.vz), 0); shotMesh.setMatrixAt(n++, m.compose(p.set(s.x, s.y, s.z), q.setFromEuler(e), sc)); }
    shotMesh.count = n; shotMesh.instanceMatrix.needsUpdate = true;
  }

  // =====================================================================
  // World events: quests in the field, camps, wild encounters, discovery
  // =====================================================================
  let wildT = 25, killGroup = null, findStep = null;
  function updateEvents(dt) {
    // quest steps
    findStep = null; findMark.visible = false;
    for (const id of activeIds()) {
      const st = curStep(id), p = posOf(st), d = Math.hypot(p[0] - PL.x, p[1] - PL.z);
      if (st.t === 'goto' && d < (st.r || 20)) { const done = () => advance(id); if (st.say) say(st.say, done); else done(); return; }
      if (st.t === 'find') { findMark.visible = d < 300; findMark.position.set(p[0], world.getHeight(p[0], p[1]), p[1]); findMark.children[1].rotation.y = rt * 2; if (d < 3.6) findStep = { id, st }; }
      if (st.t === 'kill') {
        const key = 'q:' + id + ':' + QS[id].step;
        if (!killGroup || killGroup.key !== key) {
          if (d < 85 && PL.mode !== 'ship') {
            if (killGroup) removeGroup(killGroup.key);
            killGroup = { key, id, list: spawnGroup(st.foes, p[0], p[1], st.lvl, key), x: p[0], z: p[1] };
            ui.toast(st.obj, 'Battle', 2.6);
            if (st.say) say(st.say);
          }
        } else if (killGroup.list.every((f) => f.dead)) {
          killGroup = null;
          const done = () => advance(id); if (st.after) say(st.after, done); else done();
          return;
        } else if (d > 190) { removeGroup(key); killGroup = null; ui.note('You left the fight'); }
      }
    }
    // bandit camps
    for (const c of camps) {
      if (!c.ready) { const p = snapWalk(toX(c.lon), toZ(c.lat)); c.x = p[0]; c.z = p[1]; c.ready = true; }
      const d = Math.hypot(c.x - PL.x, c.z - PL.z), done = campsDone.has(c.i);
      if (d < 260 && !c.mesh) {
        c.mesh = new THREE.Group(); const y = world.getHeight(c.x, c.z);
        const t = new THREE.Mesh(tentGeo, charMat); t.castShadow = true; c.chest = new THREE.Mesh(chestGeo, charMat); c.chest.position.set(0, 0, -1); c.chest.castShadow = true;
        c.mesh.add(t, c.chest); c.mesh.position.set(c.x, y, c.z); scene.add(c.mesh);
      } else if (d > 320 && c.mesh) { scene.remove(c.mesh); c.mesh = null; c.spawned = false; removeGroup('camp' + c.i); }
      if (c.mesh) c.chest.rotation.z = done ? 0.5 : 0;
      if (d < 90 && !done && !c.spawned && PL.mode !== 'ship') { c.spawned = true; const pool = WILD[world.regionAt(c.x, c.z)].filter((t) => t !== 'lupus'); const list = spawnGroup([[pool[0], 3], [pool[pool.length - 1], 1]], c.x, c.z, c.lvl, 'camp' + c.i); for (const f of list) f.group = 'camp' + c.i; }
    }
    // wild encounters
    wildT -= dt;
    if (wildT <= 0) {
      wildT = 28 + Math.random() * 30;
      const lvl = Math.max(1, PL.level - 1 + ((Math.random() * 3) | 0) - 1);
      if (PL.mode !== 'ship' && !nearSite && !killGroup && foes.length < 3 && !world.sites.some((s) => Math.hypot(s.x - PL.x, s.z - PL.z) < s.r + 130)) {
        const pool = WILD[world.regionAt(PL.x, PL.z)] || ['latro'], type = pool[(Math.random() * pool.length) | 0];
        const a = PL.facing + (Math.random() - 0.5) * 1.6, p = [PL.x + Math.sin(a) * 52, PL.z + Math.cos(a) * 52];
        if (world.walkable(p[0], p[1])) { const list = spawnGroup([[type, type === 'lupus' ? 3 : 2 + ((Math.random() * 2) | 0)]], p[0], p[1], lvl, 'wild'); for (const f of list) f.aware = false; }
      }
    }
    // discovery
    for (const s of world.sites) if (!discovered.has(s.id) && Math.hypot(s.x - PL.x, s.z - PL.z) < s.r + 28) {
      discovered.add(s.id); sfx.discover(); ui.toast(s.name, 'Discovered · fast travel unlocked', 3.4); gainXp(25); save(true);
    }
  }

  // =====================================================================
  // Travel modes
  // =====================================================================
  function setMode(m) {
    if (m === PL.mode) return;
    if (m === 'horse') { sfx.horse(); horse.g.visible = true; horseAt = null; PL.atk = null; }
    if (PL.mode === 'horse' && m !== 'horse') horseAt = { x: PL.x, z: PL.z, y: PL.y, rot: PL.facing };
    if (m === 'ship') { sfx.sail(); horse.g.visible = false; horseAt = null; }
    PL.mode = m; PL.speed = 0;
    camDistT = m === 'ship' ? 34 : m === 'horse' ? 13 : 10;
  }
  function fade(fn) { const f = $('fade'); f.classList.add('on'); setTimeout(() => { fn(); world.streamChunks(PL.x, PL.z, 12); updateCities(); camTarget.set(PL.x, PL.y + 1.5, PL.z); setTimeout(() => f.classList.remove('on'), 120); }, 380); }
  function placePlayer(x, z) { const p = snapWalk(x, z); PL.x = p[0]; PL.z = p[1]; PL.y = world.getHeight(PL.x, PL.z); PL.atk = null; horse.g.visible = false; horseAt = null; }
  function entryOf(s) { const o = s.kind === 'pyramids' ? [14, 26] : s.kind === 'oppidum' ? [3, 5] : [2.5, 5]; return [s.x + o[0], s.z + o[1]]; }
  function fastTravel(id) {
    const s = world.siteById[id];
    if (!discovered.has(id)) return;
    if (combat > 0 && foes.some((f) => f.aware && !f.dead)) { ui.note('You cannot travel while enemies are near'); return; }
    sfx.travel(); ui.close();
    fade(() => { if (PL.mode === 'ship') PL.shipPos = { x: PL.x, z: PL.z, rot: PL.facing }; setMode('foot'); for (const f of foes.slice()) { f.model.g.removeFromParent(); } foes.length = 0; killGroup = null; const e = entryOf(s); placePlayer(e[0], e[1]); camYaw = 0; save(true); });
  }
  function embark(site) {
    fade(() => { if (site) PL.shipPos = { x: site.moor.x, z: site.moor.z, rot: Math.atan2(site.sea.x - site.moor.x, site.sea.z - site.moor.z) }; PL.x = PL.shipPos.x; PL.z = PL.shipPos.z; PL.facing = PL.shipPos.rot; setMode('ship'); if (!world.sailable(PL.x, PL.z) && site) { PL.x = site.sea.x; PL.z = site.sea.z; } });
  }
  function disembark(x, z, anchor) { fade(() => { PL.shipPos = anchor || { x: PL.x, z: PL.z, rot: PL.facing }; setMode('foot'); placePlayer(x, z); save(true); }); }
  function landNear() {
    for (let r = 6; r <= 30; r += 4) for (let a = 0; a < TAU; a += 0.35) { const x = PL.x + Math.cos(a) * r, z = PL.z + Math.sin(a) * r; if (world.walkable(x, z) && world.getHeight(x, z) > 0.6) return [x, z]; }
    return null;
  }

  // ---------- interaction ----------
  let prompt = null, landT = 0, landSpot = null;
  function findPrompt(dt) {
    prompt = null;
    if (PL.mode === 'ship') {
      const s = world.nearestSite(PL.x, PL.z, (p) => p.port);
      if (s && Math.hypot(s.moor.x - PL.x, s.moor.z - PL.z) < 34) { prompt = { text: `Dock at ${s.name}`, fn: () => disembark(s.dock.x, s.dock.z, { x: s.moor.x, z: s.moor.z, rot: PL.facing }) }; return; }
      landT -= dt; if (landT <= 0) { landT = 0.4; landSpot = landNear(); }
      if (landSpot) prompt = { text: 'Go ashore', fn: () => disembark(landSpot[0], landSpot[1]) };
      return;
    }
    if (findStep) { prompt = { text: 'Search', fn: () => { const { id, st } = findStep; const done = () => advance(id); if (st.say) say(st.say, done); else done(); } }; return; }
    let best = null, bd = 3.6;
    for (const n of npcs) { const d = Math.hypot(n.x - PL.x, n.z - PL.z); if (d < bd && !(n.stale && n.d.kind !== 'shop')) { bd = d; best = n; } }
    if (best) {
      const d = best.d;
      if (d.kind === 'shop') prompt = { text: 'Trade with the merchant', fn: () => ui.shop(d.site) };
      else prompt = { text: `Talk to ${best.name.split(' ').slice(-1)[0] === 'Caesar' ? 'Caesar' : best.name}`, fn: () => talk(best) };
      return;
    }
    for (const c of camps) if (c.mesh && !campsDone.has(c.i) && Math.hypot(c.x - PL.x, c.z - 1 - PL.z) < 3.4) {
      if (foes.some((f) => f.group === 'camp' + c.i && !f.dead)) { prompt = { text: 'Defeat the bandits first', fn: () => {} }; return; }
      prompt = { text: 'Open the strongbox', fn: () => { campsDone.add(c.i); PL.den += c.den; sfx.coin(); sfx.step(); ui.note(`+${c.den} denarii`); if (c.reward && !PL.owned.includes(c.reward)) { PL.owned.push(c.reward); ui.note(`Found: ${ITEMS[c.reward].name}`); autoEquip(c.reward); } gainXp(60); save(true); } }; return;
    }
    if (PL.ship) {
      const s = world.nearestSite(PL.x, PL.z, (p) => p.port);
      if (s && Math.hypot(s.dock.x - PL.x, s.dock.z - PL.z) < 9) { prompt = { text: 'Set sail', fn: () => embark(s) }; return; }
      if (PL.shipPos && Math.hypot(PL.shipPos.x - PL.x, PL.shipPos.z - PL.z) < 22) { prompt = { text: 'Board your ship', fn: () => embark(null) }; return; }
    }
  }
  function talk(n) {
    const d = n.d, id = d.quest, st = QS[id];
    if (n.stale) return;
    sfx.click();
    if (st.state === 'avail') { const q = QBY[id], s0 = q.steps[0]; say(s0.say, () => { startSide(id); ui.toast(q.name, 'Quest started', 2.8); advance(id); }); return; }
    const step = curStep(id);
    say(step.say, () => advance(id));
  }

  // ---------- dialogue ----------
  let dlg = null;
  function say(lines, done) {
    if (!lines || !lines.length) { if (done) done(); return; }
    dlg = { lines, i: 0, done, at: performance.now() }; mode = 'dialog'; $('dialog').hidden = false; $('prompt').hidden = true; input.reset(); showLine();
    if (G.bot) while (dlg) nextLine(true);
  }
  function showLine() { const [who, text] = dlg.lines[dlg.i]; $('dname').textContent = who === 'You' ? PL.name : who; $('dname').hidden = !who; $('dtext').textContent = text; $('dtext').className = who ? '' : 'narr'; sfx.talk(); }
  function nextLine(force) {
    if (!dlg || (!force && performance.now() - dlg.at < 280)) return;
    dlg.at = performance.now();
    if (++dlg.i >= dlg.lines.length) { const d = dlg.done; dlg = null; $('dialog').hidden = true; mode = 'play'; input.reset(); if (d) d(); } else showLine();
  }
  $('dialog').addEventListener('click', () => nextLine());

  // =====================================================================
  // Player
  // =====================================================================
  function die() {
    sfx.death(); PL.atk = null; mode = 'dead';
    const respawn = () => { const s = world.nearestSite(PL.x, PL.z, (p) => discovered.has(p.id) && p.kind !== 'site') || world.siteById.ravenna; for (const f of foes) f.model.g.removeFromParent(); foes.length = 0; killGroup = null; for (const c of camps) c.spawned = false; setMode('foot'); const e = entryOf(s); placePlayer(e[0], e[1]); PL.hp = PL.maxHp; PL.st = 100; PL.invuln = 2; combat = 0; mode = 'play'; };
    if (G.bot) { G.deaths = (G.deaths || 0) + 1; respawn(); return; }
    setTimeout(() => ui.dead(() => fade(respawn)), 900);
  }
  function startAttack() {
    const w = item(PL.eq.weapon), kind = PL.combo % 3;
    let best = null, bd = 7.5;
    for (const f of foes) { if (f.dead) continue; const d = Math.hypot(f.x - PL.x, f.z - PL.z); const fr = Math.sin(PL.facing) * (f.x - PL.x) + Math.cos(PL.facing) * (f.z - PL.z); if (d < bd && (fr > -1 || d < 3)) { bd = d; best = f; } }
    if (best) PL.facing = Math.atan2(best.x - PL.x, best.z - PL.z);
    PL.atk = { t: 0, dur: (kind === 2 ? 0.56 : 0.4) / w.spd, kind, hit: false, lunge: best ? clamp(bd - w.reach * 0.7, 0, 2.2) : 0.8 };
    PL.combo++; PL.comboT = 0.9; PL.queued = false; sfx.swing();
  }
  function updatePlayer(dt) {
    PL.time += dt; PL.invuln -= dt; PL.dodgeCd -= dt; PL.hurtT -= dt; PL.lastHurt += dt; PL.comboT -= dt; PL.stag -= dt;
    if (PL.comboT <= 0) PL.combo = 0;
    let ix = input.mx, iy = input.my, act = (a) => input.hit(a);
    if (G.bot) { const b = botInput(); ix = b.x; iy = b.y; act = (a) => b.act === a; }
    const fxw = -Math.sin(camYaw), fzw = -Math.cos(camYaw), rxw = Math.cos(camYaw), rzw = -Math.sin(camYaw);
    let wx = rxw * ix + fxw * iy, wz = rzw * ix + fzw * iy; const mag = Math.min(1, Math.hypot(wx, wz));
    if (mag > 0.08) { const l = Math.hypot(wx, wz); wx /= l; wz /= l; }
    const moving = mag > 0.08 && PL.stag <= 0;
    if (PL.mode === 'ship') {
      const tgt = moving ? 26 * mag : 0; PL.speed = damp(PL.speed, tgt, moving ? 0.9 : 0.6, dt);
      if (moving) PL.facing = angleLerp(PL.facing, Math.atan2(wx, wz), 1 - Math.exp(-1.3 * dt));
      const ox = PL.x, oz = PL.z;
      if (!moveBody(PL, Math.sin(PL.facing) * PL.speed * dt, Math.cos(PL.facing) * PL.speed * dt, 2, true)) PL.speed *= Math.exp(-3 * dt);
      if (Math.hypot(PL.x - ox, PL.z - oz) < 0.2 * PL.speed * dt) PL.speed *= 0.9;
      PL.y = 0; PL.mv = PL.speed / 26;
      if (PL.speed > 4 && Math.random() < dt * 30) fx.spawn(PL.x - Math.sin(PL.facing) * 8 + (Math.random() - 0.5) * 3, 0.2, PL.z - Math.cos(PL.facing) * 8 + (Math.random() - 0.5) * 3, 0, 0.4, 0, 1.2, 1.4, 0.7, 0.85, 0.9, 0);
      if (PL.hp < PL.maxHp) PL.hp = Math.min(PL.maxHp, PL.hp + PL.maxHp * 0.03 * dt);
      return;
    }
    const riding = PL.mode === 'horse';
    if (act('mount') && PL.horse && !PL.atk) setMode(riding ? 'foot' : 'horse');
    if (act('eat') && PL.panis > 0 && PL.hp < PL.maxHp) { PL.panis--; PL.hp = Math.min(PL.maxHp, PL.hp + PL.maxHp * 0.45); sfx.eat(); fx.burst(PL.x, PL.y + 1.2, PL.z, 12, 3, 0.6, 2.6, 0.8, { life: 0.6, size: 0.4 }); if (S.numbers) fx.number(PL.x, PL.y + 2.3, PL.z, '+' + Math.round(PL.maxHp * 0.45), 'heal'); }
    if (act('pilum') && PL.pila > 0 && !PL.atk && !riding) {
      let best = null, bd = 26; for (const f of foes) { if (f.dead) continue; const d = Math.hypot(f.x - PL.x, f.z - PL.z); if (d < bd) { bd = d; best = f; } }
      const a = best ? Math.atan2(best.x - PL.x, best.z - PL.z) : PL.facing; PL.facing = a; PL.pila--;
      shots.push({ x: PL.x, y: PL.y + 1.5, z: PL.z, vx: Math.sin(a) * 34, vz: Math.cos(a) * 34, life: 1.1, dmg: (26 + 4 * PL.level), mine: true }); sfx.throw();
      PL.atk = { t: 0, dur: 0.4, kind: 2, hit: true, lunge: 0 };
    }
    if (act('attack') && PL.stag <= 0) { if (riding) setMode('foot'); else if (!PL.atk) startAttack(); else if (PL.atk.t > PL.atk.dur * 0.35) PL.queued = true; }
    const wasBlock = PL.blocking;
    PL.blocking = (G.bot ? false : input.block) && !riding && !PL.atk && PL.dodgeT <= 0 && PL.stag <= 0 && PL.st > 0;
    PL.blockT = PL.blocking ? (wasBlock ? PL.blockT + dt : 0) : 0;
    if (act('dodge') && PL.dodgeCd <= 0 && PL.st >= 22 && !riding && PL.stag <= 0) {
      PL.dodgeT = 0.34; PL.dodgeCd = 0.62; PL.st -= 24; PL.invuln = Math.max(PL.invuln, 0.32); PL.atk = null; PL.stIdle = 0;
      if (moving) { PL.dx = wx; PL.dz = wz; } else { PL.dx = -Math.sin(PL.facing); PL.dz = -Math.cos(PL.facing); }
      sfx.dodge();
    }
    let sp = 0;
    if (PL.dodgeT > 0) { PL.dodgeT -= dt; for (let k = 0; k < 2; k++) moveBody(PL, PL.dx * 15 * dt / 2, PL.dz * 15 * dt / 2, 0.45); sp = 1; }
    else {
      if (PL.atk) {
        const a = PL.atk, w = item(PL.eq.weapon); a.t += dt;
        if (a.t < a.dur * 0.45 && a.lunge > 0) moveBody(PL, Math.sin(PL.facing) * a.lunge / (a.dur * 0.45) * dt, Math.cos(PL.facing) * a.lunge / (a.dur * 0.45) * dt, 0.45);
        if (!a.hit && a.t >= a.dur * 0.45) {
          a.hit = true; const heavy = a.kind === 2, arc = heavy ? 0.55 : 0.1;
          for (const f of foes) {
            if (f.dead) continue; const dx = f.x - PL.x, dz = f.z - PL.z, d = Math.hypot(dx, dz) || 1;
            if (d < w.reach + f.r + (heavy ? 0.4 : 0) && (Math.sin(PL.facing) * dx + Math.cos(PL.facing) * dz) / d > arc) hitFoe(f, w.dmg * (1 + 0.07 * (PL.level - 1)) * (heavy ? 1.8 : 1) * (0.9 + Math.random() * 0.2), heavy, dx / d, dz / d);
          }
        }
        if (a.t >= a.dur) { PL.atk = null; if (PL.queued) startAttack(); }
      }
      if (moving) {
        const road = world.roadDist(PL.x, PL.z) < 4.5;
        const base = riding ? 17 * (road ? 1.25 : 1) : 7.4 * (road ? 1.1 : 1);
        const k = PL.atk ? 0.2 : PL.blocking ? 0.45 : 1;
        const e = 1.2, slope = (world.getHeight(PL.x + wx * e, PL.z + wz * e) - PL.y) / e;
        sp = mag * k * clamp(1 - Math.max(0, slope - 0.25) * 1.1, 0.35, 1);
        moveBody(PL, wx * base * sp * dt, wz * base * sp * dt, riding ? 0.8 : 0.45);
        if (!PL.atk) PL.facing = angleLerp(PL.facing, Math.atan2(wx, wz), 1 - Math.exp(-(riding ? 6 : 13) * dt));
        if (riding && sp > 0.4) sfx.hoof();
      }
    }
    PL.mv = damp(PL.mv, sp, 12, dt); PL.ph += dt * (riding ? 15 : 10.5) * PL.mv;
    PL.y = world.getHeight(PL.x, PL.z);
    PL.stIdle += dt; if (PL.blocking) PL.stIdle = Math.min(PL.stIdle, 0.3);
    if (PL.stIdle > 0.7) PL.st = Math.min(100, PL.st + 26 * dt);
    if (PL.lastHurt > 6 && combat <= 0 && PL.hp < PL.maxHp) PL.hp = Math.min(PL.maxHp, PL.hp + PL.maxHp * 0.035 * dt);
  }

  // ---------- test bot ----------
  function botInput() {
    const out = { x: 0, y: 0, act: null };
    let best = null, bd = 60; for (const f of foes) { if (f.dead || !f.aware) continue; const d = Math.hypot(f.x - PL.x, f.z - PL.z); if (d < bd) { bd = d; best = f; } }
    let tx, tz;
    if (best) {
      tx = best.x; tz = best.z;
      if (foes.some((f) => f.st === 'windup' && f.t < 0.22 && Math.hypot(f.x - PL.x, f.z - PL.z) < f.reach + 1) && PL.dodgeCd <= 0 && PL.st > 25) out.act = 'dodge';
      else if (bd < item(PL.eq.weapon).reach + 0.3) out.act = 'attack';
      if (PL.hp < PL.maxHp * 0.4 && PL.panis > 0) out.act = 'eat';
      G.fs = bd > 4 ? (G.fs || 0) + 1 : 0; if (G.fs > 240) { G.fs = 0; const q = snapWalk(best.x + 1.5, best.z + 1.5); PL.x = q[0]; PL.z = q[1]; }
    } else { const t = trackedTarget(); if (!t) return out; tx = t.x; tz = t.z; if (Math.hypot(tx - PL.x, tz - PL.z) > 40) { const a = Math.atan2(PL.x - tx, PL.z - tz) + (Math.random() - 0.5); const p = snapWalk(tx + Math.sin(a) * 30, tz + Math.cos(a) * 30); if (PL.mode !== 'foot') setMode('foot'); PL.x = p[0]; PL.z = p[1]; killGroup && removeGroup(killGroup.key); killGroup = null; } if (prompt && Math.random() < 0.2) prompt.fn(); G.bs = (G.bs || 0) + 1; if (G.bs > 90) { G.bs = 0; if (Math.hypot(PL.x - (G.bx || 0), PL.z - (G.bz || 0)) < 3) { const q = snapWalk(tx + 1.5, tz + 1.5); PL.x = q[0]; PL.z = q[1]; } G.bx = PL.x; G.bz = PL.z; } }
    const dx = tx - PL.x, dz = tz - PL.z, d = Math.hypot(dx, dz) || 1;
    if (d > 1.6) { out.x = dx / d; out.y = -dz / d; }
    camYaw = 0;
    return out;
  }

  // =====================================================================
  // Save / load
  // =====================================================================
  function snapshot() {
    return { v: 1, at: Date.now(), name: PL.name, level: PL.level, place: (world.nearestSite(PL.x, PL.z) || {}).name, time: PL.time, chapter: (QUESTS.find((q) => q.main && QS[q.id].state === 'active') || { name: 'Epilogue' }).name,
      pl: { x: PL.x, z: PL.z, facing: PL.facing, hp: PL.hp, level: PL.level, xp: PL.xp, den: PL.den, panis: PL.panis, pila: PL.pila, owned: PL.owned, eq: PL.eq, horse: PL.horse, ship: PL.ship, shipPos: PL.shipPos, mode: PL.mode === 'horse' ? 'foot' : PL.mode, kills: PL.kills },
      qs: QS, tracked, disc: [...discovered], camps: [...campsDone], tod: world.state.tod };
  }
  let savedT = 0;
  function save(auto) {
    if (mode === 'title' || mode === 'loading' || PL.hp <= 0) return false;
    const ok = store.set(slotKey(slotNow), snapshot());
    if (ok) { $('saved').classList.add('on'); savedT = 1.6; } else if (!auto) ui.note('Could not save: storage is unavailable');
    saveT = 0; return ok;
  }
  function startGame(slot, data) {
    slotNow = slot; for (const f of foes) f.model.g.removeFromParent(); foes.length = 0; killGroup = null; shots.length = 0; for (const n of npcs) n.h.g.removeFromParent(); npcs.length = 0; for (const c of camps) c.spawned = false;
    discovered.clear(); campsDone.clear();
    const p = data && data.pl;
    Object.assign(PL, { hp: 100, level: 1, xp: 0, den: 30, panis: 2, pila: 2, owned: ['pugio', 'noshield', 'tunica', 'nohelm'], eq: { weapon: 'pugio', shield: 'noshield', armor: 'tunica', helmet: 'nohelm' }, horse: false, ship: false, shipPos: null, mode: 'foot', kills: 0, time: 0, atk: null, st: 100, invuln: 1, facing: Math.PI }, p ? { ...p, owned: [...p.owned], eq: { ...p.eq } } : {});
    PL.time = data ? data.time || 0 : 0;
    initQuests(data && data.qs); tracked = data ? data.tracked : 'm1';
    if (data) { for (const id of data.disc) discovered.add(id); for (const c of data.camps) campsDone.add(c); world.state.tod = data.tod ?? 0.36; } else world.state.tod = 0.34;
    recompute(); if (!p) PL.hp = PL.maxHp;
    const rv = world.siteById.ravenna;
    if (!p) { const e = snapWalk(rv.x - 3, rv.z + 22); PL.x = e[0]; PL.z = e[1]; discovered.add('ravenna'); }
    const m = PL.mode; PL.mode = 'foot'; horse.g.visible = false; horseAt = null;
    if (m === 'ship' && world.sailable(PL.x, PL.z)) setMode('ship'); else { const q = snapWalk(PL.x, PL.z); PL.x = q[0]; PL.z = q[1]; camDistT = 10; }
    PL.y = PL.mode === 'ship' ? 0 : world.getHeight(PL.x, PL.z);
    buildHero(); syncNpcDefs(); world.applySky();
    camYaw = 0; camPitch = 0.42; camTarget.set(PL.x, PL.y + 1.5, PL.z);
    world.streamChunks(PL.x, PL.z, 14); updateCities();
    ui.close(); mode = 'play'; $('title').hidden = true; $('hud').hidden = false; combat = 0; wildT = 30;
    if (!data) {
      ui.toast('The Die Is Cast', 'January, 49 BC', 4.5);
      ui.hint(isTouch ? 'Drag the left side of the screen to move, and the right side to look around.' : 'Move with WASD. Drag the mouse or trackpad to look around.');
      ui.hint('Follow the marker on the compass. A golden light marks who to speak to.');
      ui.hint(isTouch ? 'In a fight: tap the sword to strike, hold the shield to block, and use the arrows to dodge.' : 'In a fight: J or click to strike, hold K or right-click to block, Space to dodge, F to throw a pilum.');
      save(true);
    }
  }

  // =====================================================================
  // Frame
  // =====================================================================
  function step(dt) {
    time += dt; combat -= dt;
    updatePlayer(dt);
    if (mode !== 'play') return;
    updateFoes(dt); updateShots(dt);
    if (mode !== 'play') return;
    updateEvents(dt);
    if (mode !== 'play') return;
    findPrompt(dt);
    if ((input.hit('interact') || (G.bot && false)) && prompt) prompt.fn();
    saveT += dt; if (saveT > 45 && combat <= 0) save(true);
  }
  function drawWorld(dt) {
    const riding = PL.mode === 'horse', sailing = PL.mode === 'ship';
    if (hero) {
      if (sailing) {
        const bob = Math.sin(rt * 1.1) * 0.15; ship.g.visible = true; ship.g.position.set(PL.x, 0.45 + bob, PL.z); ship.g.rotation.y = PL.facing; poseShip(ship, rt, PL.mv);
        hero.g.position.set(PL.x - Math.sin(PL.facing) * 2.5, 1.3 + bob, PL.z - Math.cos(PL.facing) * 2.5); hero.g.rotation.set(0, PL.facing, 0);
        poseHuman(hero, { mv: 0, ph: rt, atk: -1, kind: 0, block: 0, dead: 0 });
      } else {
        hero.g.position.set(PL.x, PL.y + (riding ? 0.78 + horse.body.position.y : 0), PL.z); hero.g.rotation.set(0, PL.facing, 0);
        if (PL.dodgeT > 0) hero.g.rotation.x = (1 - PL.dodgeT / 0.34) * TAU * (Math.sin(PL.facing) * PL.dx + Math.cos(PL.facing) * PL.dz > 0 ? 1 : -1);
        poseHuman(hero, { mv: riding ? 0 : PL.mv, ph: PL.ph, atk: PL.atk ? PL.atk.t / PL.atk.dur : -1, kind: PL.atk ? PL.atk.kind : 0, block: PL.blocking ? 1 : 0, dead: mode === 'dead' ? 1 : 0, ride: riding, stag: PL.stag > 0 ? 1 : 0 });
        hero.g.visible = !(PL.hurtT > 0 && Math.floor(rt * 30) % 2 === 0);
        if (riding) { horse.g.position.set(PL.x, PL.y, PL.z); horse.g.rotation.y = PL.facing; poseHorse(horse, PL.ph, PL.mv); }
        else if (horseAt) { horse.g.position.set(horseAt.x, horseAt.y, horseAt.z); horse.g.rotation.y = horseAt.rot; poseHorse(horse, 0, 0); if (Math.hypot(horseAt.x - PL.x, horseAt.z - PL.z) > 70) { horse.g.visible = false; horseAt = null; } }
        if (PL.ship && PL.shipPos) { const d = Math.hypot(PL.shipPos.x - PL.x, PL.shipPos.z - PL.z); ship.g.visible = d < 900; if (ship.g.visible) { ship.g.position.set(PL.shipPos.x, 0.45 + Math.sin(rt * 1.1) * 0.12, PL.shipPos.z); ship.g.rotation.y = PL.shipPos.rot; poseShip(ship, rt, 0); } } else ship.g.visible = false;
      }
    }
    drawFoes();
    const tt = mode === 'title' ? null : trackedTarget();
    objBeam.visible = !!tt && Math.hypot(tt.x - PL.x, tt.z - PL.z) > 14;
    if (objBeam.visible) objBeam.position.set(tt.x, world.getHeight(tt.x, tt.z), tt.z);
    return tt;
  }
  function updateCamera(dt) {
    if (mode === 'title') { const s = world.siteById.roma, a = rt * 0.05 + 0.4; camera.position.set(s.x + Math.sin(a) * 120, world.siteH(s) + 46, s.z + Math.cos(a) * 120); camera.lookAt(s.x, world.siteH(s) + 6, s.z); return; }
    if (mode === 'play') {
      camYaw -= input.camDX * 0.0052 * S.sens + input.rot * dt * 2.2;
      camPitch = clamp(camPitch + input.camDY * 0.004 * S.sens * (S.invertY ? -1 : 1), 0.12, 1.25);
      const lim = PL.mode === 'ship' ? [18, 70] : [5, 26]; camDistT = clamp(camDistT + input.zoom, lim[0], lim[1]);
      if (S.autoCam && PL.mv > 0.4 && performance.now() - input.lastLook > 1600 && !foes.some((f) => f.aware && !f.dead)) {
        let d = (PL.facing + Math.PI - camYaw) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
        if (Math.abs(d) < 2.2) camYaw += d * Math.min(1, dt * (PL.mode === 'foot' ? 0.9 : 1.4));
      }
    }
    camDist = damp(camDist, camDistT * (W < H ? 1.2 : 1), 4, dt);
    // keep buildings from coming between the camera and the player
    let clear = camDist;
    if (nearObs && nearSite && PL.mode !== 'ship') {
      const cpq = Math.cos(camPitch), spq = Math.sin(camPitch), dxq = Math.sin(camYaw) * cpq, dzq = Math.cos(camYaw) * cpq, gy = world.siteH(nearSite);
      scan: for (let t = 1.2; t < camDist; t += 0.5) {
        const x = camTarget.x + dxq * t, z = camTarget.z + dzq * t, y = camTarget.y + spq * t - gy;
        for (const b of nearObs) {
          if (y > (b.h ?? 7)) continue;
          const ex = x - b.x, ez = z - b.z;
          if (b.r != null ? ex * ex + ez * ez < (b.r + 0.4) * (b.r + 0.4) : Math.abs(ex * b.c - ez * b.s) < b.hw + 0.4 && Math.abs(ex * b.s + ez * b.c) < b.hd + 0.4) { clear = Math.max(1.4, t - 0.6); break scan; }
        }
      }
    }
    camClear = damp(camClear, clear, clear < camClear ? 40 : 3, dt);
    const camD = Math.min(camDist, camClear);
    const ty = PL.y + (PL.mode === 'ship' ? 3 : PL.mode === 'horse' ? 2.4 : 1.6);
    camTarget.x = damp(camTarget.x, PL.x, 12, dt); camTarget.z = damp(camTarget.z, PL.z, 12, dt); camTarget.y = damp(camTarget.y, ty, 8, dt);
    const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
    const cx = camTarget.x + Math.sin(camYaw) * cp * camD, cz = camTarget.z + Math.cos(camYaw) * cp * camD;
    const cy = Math.max(camTarget.y + sp * camD, world.getHeight(cx, cz) + 1.2, 1.0);
    const sh = fx.shake * fx.shake;
    camera.position.set(cx + (Math.random() - 0.5) * sh, cy + (Math.random() - 0.5) * sh, cz + (Math.random() - 0.5) * sh);
    camera.lookAt(camTarget.x, camTarget.y, camTarget.z);
  }

  let lastT = performance.now(), perfT = 0, perfN = 0, perfSkip = 1, cityT = 0, fpsT = 0, fpsN = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = (now - lastT) / 1000; lastT = now;
    const dt = Math.min(0.05, Math.max(0, raw)); rt += dt;
    input.poll();
    if (mode === 'play') {
      for (const a of ['map', 'bag', 'log', 'menu']) if (input.hit(a)) { ui.open(a); break; }
      if (mode === 'play') step(dt);
    } else if (mode === 'dialog') { if (input.hit('interact') || input.hit('attack') || input.hit('dodge')) nextLine(); }
    else if (mode === 'ui' && input.hit('menu')) ui.close();
    const vx = mode === 'title' ? world.siteById.roma.x : PL.x, vz = mode === 'title' ? world.siteById.roma.z : PL.z;
    world.streamChunks(vx, vz, 1); world.streamRoads(vx, vz);
    cityT -= dt; if (cityT <= 0) { cityT = 0.3; if (mode !== 'title') updateCities(); }
    const live = mode === 'play' || mode === 'dialog' || mode === 'dead' || mode === 'title';
    if (mode !== 'title' && mode !== 'loading') updatePeople(live ? dt : 0);
    const tt = drawWorld(dt);
    updateCamera(dt);
    world.update(dt, rt, vx, mode === 'title' ? 0 : PL.y, vz, camera, mode === 'play' ? dt : 0);
    fx.update(live ? dt : 0, W, H);
    if (mode !== 'title' && mode !== 'loading') { ui.hud(dt, tt, camYaw, prompt && mode === 'play' ? prompt.text : null, foes); if (savedT > 0) { savedT -= dt; if (savedT <= 0) $('saved').classList.remove('on'); } const v = +$('vignette').style.opacity || 0; if (v > 0) $('vignette').style.opacity = Math.max(0, v - dt * 2.4); }
    const reg = mode === 'title' ? 'Italia' : world.regionAt(PL.x, PL.z);
    musicTick({ war: foes.some((f) => f.aware && !f.dead), sea: PL.mode === 'ship', east: ['Aegyptus', 'Syria', 'Iudaea', 'Cilicia', 'Africa', 'Pontus'].includes(reg), night: world.state.night > 0.5 });
    renderer.toneMappingExposure = world.state.exposure;
    composer.render();
    input.consume();
    if (raw < 0.25) {
      perfT += raw; perfN++; fpsT += raw; fpsN++;
      if (fpsT > 0.5) { if (S.fps) $('fps').textContent = Math.round(fpsN / fpsT) + ' fps'; fpsT = 0; fpsN = 0; }
      if (perfT > 2.5) { if (perfSkip > 0) perfSkip--; else if (S.autoRes) { const ft = perfT / perfN; if (ft > 1 / 36 && dynRes > 0.55) { dynRes = Math.max(0.55, dynRes - 0.12); resize(); perfSkip = 1; } else if (ft < 1 / 56 && dynRes < 1) { dynRes = Math.min(1, dynRes + 0.06); resize(); perfSkip = 2; } } perfT = 0; perfN = 0; }
    }
  }

  // =====================================================================
  // Wiring
  // =====================================================================
  Object.assign(api, {
    mode: () => mode, setMode: (m) => { mode = m; input.reset(); }, save, startGame, fastTravel, applySettings, slotKey, store, initAudio, sfx,
    slotNow: () => slotNow, setSlot: (n) => { slotNow = n; }, tracked: () => tracked, track: (id) => { tracked = id; }, objectiveOf, posOf, buildHero, combat: () => combat > 0 && foes.some((f) => f.aware && !f.dead),
    quit: () => { save(true); for (const f of foes) f.model.g.removeFromParent(); foes.length = 0; mode = 'title'; $('hud').hidden = true; ui.title(); }, shipPos: () => (PL.mode === 'ship' ? { x: PL.x, z: PL.z } : PL.shipPos),
  });
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });
  window.addEventListener('pointerdown', () => { if (mode !== 'title' && mode !== 'loading') initAudio(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (mode === 'play') ui.open('menu'); suspendAudio(true); } else suspendAudio(false); });
  window.addEventListener('pagehide', () => save(true));
  window.__a = { PL, G, S, world, foes, npcs, QS, discovered, get mode() { return mode; }, get tracked() { return tracked; }, get prompt() { return prompt; }, trackedTarget,
    sim(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) { if (mode === 'play') { step(dt); updatePeople(dt); cityT -= dt; if (cityT <= 0) { cityT = 0.3; updateCities(); } } else if (mode === 'dialog') nextLine(true); else break; } return mode; },
    start: (slot = 1) => startGame(slot, null), tp(id) { const s = world.siteById[id]; const e = entryOf(s); placePlayer(e[0], e[1]); world.streamChunks(PL.x, PL.z, 30); updateCities(); camTarget.set(PL.x, PL.y + 1.5, PL.z); }, cam(y, p, d) { camYaw = y; camPitch = p; camDistT = camDist = d; }, give, setMode, advance, ui, fastTravel, save, nextLine: () => nextLine(true) };

  applySettings();
  world.streamChunks(world.siteById.roma.x, world.siteById.roma.z, 40);
  const rm = world.siteById.roma; cities.set('roma', buildCity(rm, world, reservedFor(rm))); scene.add(cities.get('roma').mesh);
  mode = 'title'; $('loading').hidden = true; ui.title();
  requestAnimationFrame(frame);
}
window.addEventListener('error', (e) => { const t = document.getElementById('loadText'); if (t && !document.getElementById('loading').hidden) t.textContent = 'Something went wrong while loading: ' + e.message; });
setTimeout(boot, 30);
