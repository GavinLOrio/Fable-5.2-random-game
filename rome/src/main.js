import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { createWorld, part, T, mergeGeometries, litMat, toX, toZ, CS, XMIN, XMAX, ZMIN, ZMAX } from './world.js';
import { buildCity, collideCity, surfaceAt, inside, STEP, gableRoof } from './city.js';
import { makeHuman, poseHuman, addGhost, setFlash, makeHorse, poseHorse, makeShip, poseShip, charMat } from './models.js';
import { PLACES, ITEMS, STOCK, PRICE, NPCS, FOES, WILD, CAMPS, QUESTS, WRECKS, HUNTS } from './data.js';
import { createFx } from '../../src/fx.js';
import { createInput } from './input.js';
import { initAudio, sfx, musicTick, setVolumes, suspendAudio } from './audio.js';
import { clamp, lerp, damp, angleLerp, smoothstep, TAU } from '../../src/util.js';
import { createUI } from './ui.js';

const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');
const SET_KEY = 'aquila-settings-v3', slotKey = (n) => 'aquila2-slot-' + n;
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
const PRESET = { low: { res: 0.7, shadows: false, bloom: false, view: 2, foliage: 0.4, ao: false }, med: { res: 0.85, shadows: true, bloom: true, view: 3, foliage: 0.7, ao: false }, high: { res: 1, shadows: true, bloom: true, view: 4, foliage: 1, ao: true } };
const S = Object.assign({ quality: isTouch ? 'med' : 'high', ...PRESET[isTouch ? 'med' : 'high'], autoRes: true, look: isTouch ? 'drag' : 'move', sens: 1, invertY: false, autoCam: true, master: 0.8, music: 0.5, sfx: 0.9, difficulty: 'normal', hud: 1, fps: false, numbers: true }, store.get(SET_KEY) || {});
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
  const wopts = { viewChunks: S.view, foliage: S.foliage, shadows: S.shadows, fog: 0.003, shadowSize: isTouch ? 2048 : 4096 };
  const world = createWorld(scene, wopts);
  const fx = createFx(scene, camera);
  const input = createInput(canvas);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4, stencilBuffer: true }));
  composer.addPass(new RenderPass(scene, camera));
  // ambient occlusion: soft contact shadows in corners, under eaves and around feet
  const gtao = new GTAOPass(scene, camera, 256, 256, undefined, { radius: 1.5, distanceExponent: 1.5, thickness: 1.3, scale: 1.3, samples: 12, distanceFallOff: 1, screenSpaceRadius: false }, { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1.4, rings: 2, samples: 12 });
  composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.7, 0.95);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  // final colour grade: a little more contrast and saturation, warm highlights, cool shadows, soft vignette
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        vec3 col = mix(vec3(l), c.rgb, 1.2); col = (col - 0.5) * 1.09 + 0.5;
        col += vec3(0.022, 0.008, -0.022) * smoothstep(0.4, 1.0, l) + vec3(-0.014, 0.0, 0.022) * smoothstep(0.5, 0.0, l);
        col *= 1.0 - smoothstep(0.42, 0.95, length(vUv - 0.5)) * 0.36;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a); }`,
  }));
  let W = 1, H = 1, dynRes = 1;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    const pr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2) * S.res * dynRes);
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false); composer.setPixelRatio(pr); composer.setSize(W, H);
    camera.aspect = W / H; camera.fov = W < H ? 62 : 50; camera.updateProjectionMatrix();
    fx.setScale((H * pr) / (2 * Math.tan((camera.fov * Math.PI) / 360)));
  }
  window.addEventListener('resize', resize);
  function applySettings(rebuild) {
    wopts.viewChunks = S.view; wopts.shadows = S.shadows; wopts.fog = 1.87 / (0.86 * S.view * CS);
    if (rebuild || wopts.foliage !== S.foliage) { wopts.foliage = S.foliage; world.rebuildAll(); }
    bloom.enabled = S.bloom; gtao.enabled = !!S.ao; setVolumes(S.master, S.music, S.sfx); input.setFree(S.look === 'move' && !isTouch);
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
    invuln: 0, stag: 0, hurtT: 0, vy: 0, climb: null, pushT: 0, sneak: false, lastHurt: 99, stIdle: 0, ph: 0, mv: 0, speed: 0, kills: 0, time: 0, slot: 1, name: 'Marcus',
  };
  let mode = 'loading', time = 0, rt = 0, camYaw = 0, camPitch = 0.42, camDist = 10, camDistT = 10, camClear = 10, combat = 0, saveT = 0, slotNow = 1;
  const camTarget = new THREE.Vector3();
  const QS = {};                 // quest id -> { state: 'locked' | 'avail' | 'active' | 'done', step }
  let tracked = 'm1';
  const discovered = new Set(), campsDone = new Set(), known = new Set(), done = new Set();   // known: seen on the map; done: cleared forts / wrecks / hunts
  let way = null;
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
  let nearSite = null, nearObs = null, allObs = null;
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
    allObs = nearObs;
    if (PL.ship && PL.shipPos && PL.mode !== 'ship' && Math.hypot(PL.shipPos.x - PL.x, PL.shipPos.z - PL.z) < 90) { const sp = PL.shipPos, so = [{ x: sp.x, z: sp.z, hw: 1.45, hd: 7.6, c: Math.cos(sp.rot), s: Math.sin(sp.rot), h: 0, top: 1.28, deck: 1 }]; allObs = allObs ? allObs.concat(so) : so; }
    for (const c of camps) if (c.obs && Math.hypot(c.x - PL.x, c.z - PL.z) < 140) allObs = allObs ? allObs.concat(c.obs) : c.obs;
  }
  const _o = { x: 0, z: 0 };
  // can an entity at height y stand at (x, z)? Solid ground, or a pier / roof / wall top within reach
  function standOk(x, z, y, swimmer) { if (!world.inBounds(x, z)) return false; if (swimmer) return true; const t = world.getHeight(x, z); return t > 0.32 || surfaceAt(allObs, x, z, y, t) > t + 0.01; }
  // move a circle with collision; returns true if it moved freely. b.hit is the wall it ran into, if any
  function moveBody(b, dx, dz, r, water) {
    _o.x = b.x + dx; _o.z = b.z + dz; b.hit = null;
    if (water) {
      if (world.sailable(_o.x, _o.z)) { b.x = _o.x; b.z = _o.z; return true; }
      if (world.sailable(_o.x, b.z)) { b.x = _o.x; return false; }
      if (world.sailable(b.x, _o.z)) { b.z = _o.z; return false; }
      return false;
    }
    const y = b.y ?? 0;
    if (y < world.getHeight(b.x, b.z) + 2.5) world.collideProps(_o, r);
    if (allObs) { const h = collideCity(_o, r, allObs, y); if (h) b.hit = { ob: h.ob, nx: h.nx, nz: h.nz }; }
    const sw = b.canSwim;
    if (standOk(_o.x, _o.z, y, sw)) { b.x = _o.x; b.z = _o.z; return !b.hit; }
    if (standOk(_o.x, b.z, y, sw)) { b.x = _o.x; return false; }
    if (standOk(b.x, _o.z, y, sw)) { b.z = _o.z; return false; }
    return false;
  }
  // gravity and footing: step up small ledges at once, fall off edges
  function settle(b, dt) {
    const g = surfaceAt(allObs, b.x, b.z, b.y, world.getHeight(b.x, b.z));
    if (b.canSwim && g < -0.95) {   // deep water: float with head and shoulders out
      if (b.y > -0.95 && !b.swim) { b.vy = (b.vy || 0) - 34 * dt; b.y += b.vy * dt; b.air = true; if (b.y <= -1.02) { fx.burst(b.x, 0.1, b.z, 26, 6, 0.75, 0.85, 0.9, { life: 0.7, size: 0.7, up: 0.8 }); sfx.splash(); } else return; }
      b.y = -1.02; b.vy = 0; b.air = false; b.swim = true; return;
    }
    b.swim = false;
    if (b.y > g + 0.06 || b.vy > 0) { b.vy = (b.vy || 0) - 34 * dt; b.y += b.vy * dt; b.air = true; if (b.y <= g && b.vy <= 0) { b.y = g; b.vy = 0; b.air = false; } }
    else { b.y = g; b.vy = 0; b.air = false; }
  }
  const climbable = (ob, y) => ob.top - y > STEP && ob.top - y < 70 && (ob.r == null || ob.stand);
  // line of sight between two points, blocked by buildings taller than both
  function sight(ax, az, ay, bx, bz, by) {
    if (!allObs) return true;
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 1.4), eye = Math.min(ay, by) + 1.5;
    for (let k = 1; k < n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; for (const o of allObs) if (!o.plat && o.top > eye && inside(o, x, z)) return false; }
    return true;
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
  const susMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 0.3), fog: false }), alertMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.3, 0.2), fog: false });
  const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 30, 8, 1, true); beamGeo.translate(0, 15, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.9, 0.3), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const findMark = new THREE.Group(); findMark.add(new THREE.Mesh(beamGeo, beamMat), new THREE.Mesh(markerGeo, markerMat)); findMark.children[1].position.y = 1.4; findMark.children[1].scale.setScalar(1.6); findMark.visible = false; scene.add(findMark);
  const objBeam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.7, 0.25), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); objBeam.scale.set(1.1, 9, 1.1); objBeam.visible = false; scene.add(objBeam);
  // arrows / javelins
  const shotGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4); shotGeo.rotateX(Math.PI / 2);
  const shotMesh = new THREE.InstancedMesh(shotGeo, new THREE.MeshBasicMaterial({ color: 0x3a2a1a }), 40); shotMesh.count = 0; shotMesh.frustumCulled = false; scene.add(shotMesh);
  const chestGeo = mergeGeometries([part(new THREE.BoxGeometry(1.5, 0.9, 1.0), 0x7a4a25, T(0, 0.45, 0)), part(new THREE.BoxGeometry(1.56, 0.16, 1.06), 0xd9ad4e, T(0, 0.9, 0)), part(new THREE.BoxGeometry(0.2, 0.94, 1.06), 0xd9ad4e, T(-0.5, 0.45, 0)), part(new THREE.BoxGeometry(0.2, 0.94, 1.06), 0xd9ad4e, T(0.5, 0.45, 0))]);
  const tentGeo = mergeGeometries([part(gableRoof(3.2, 4.4, 2.1), 0x7a5a3a, T(-4, 0, -3, 1, 1, 1, 0, 0.5, 0)), part(gableRoof(3.2, 4.4, 2.1), 0x6a4a34, T(4.5, 0, -2, 1, 1, 1, 0, -0.6, 0)), part(new THREE.CylinderGeometry(0.9, 1.1, 0.3, 7), 0x5a5048, T(0, 0.15, 3)), part(new THREE.ConeGeometry(0.5, 1.1, 5), [3.2, 1.4, 0.3], T(0, 0.8, 3))]);
  const wreckGeo = mergeGeometries([part(new THREE.CylinderGeometry(0.16, 0.2, 7, 6), 0x4a3524, T(0, 1.2, 0, 1, 1, 1, 0.25, 0, 0.3)), part(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 5), 0x4a3524, T(0.7, 3.4, 0.6, 1, 1, 1, 0.25, 0, 1.87)), part(new THREE.BoxGeometry(2.2, 1.6, 0.05), 0xb8ad94, T(0.7, 2.5, 0.62, 1, 1, 1, 0.25, 0, 0.3)), part(new THREE.BoxGeometry(2.4, 1.2, 6), 0x5a4028, T(-1.2, -0.9, -1, 1, 1, 1, 0.5, 0.3, 0.6))]);
  const wrecks = WRECKS.map(([lat, lon, lvl], i) => ({ i, key: 'W' + i, lvl, lat, lon, x: 0, z: 0, ready: false, mesh: null }));
  const hunts = HUNTS.map(([lat, lon, lvl, foe, name, pack], i) => ({ i, key: 'H' + i, lvl, lat, lon, foe, name, pack, x: 0, z: 0, ready: false, spawned: false, boss: null, told: false }));
  const forts = world.sites.filter((q) => q.kind === 'fort'), towers = world.sites.filter((q) => q.kind === 'tower');
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
    npcs.push({ key: d.key, d, h, mark, x: d.x, z: d.z, y: surfaceAt(allObs, d.x, d.z, world.getHeight(d.x, d.z), world.getHeight(d.x, d.z)), facing: Math.PI, stale: false, name: d.npc === 'merchant' ? 'Merchant' : NPCS[d.npc].name });
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
      poseHuman(n.h, { t: rt + i * 1.7, talk: dist < 5 && n.d.kind !== 'shop', mv: 0, ph: 0, atk: -1, kind: 0, block: 0, dead: 0 });
      n.mark.position.y = 2.5 + Math.sin(rt * 3 + i) * 0.12; n.mark.rotation.y = rt * 2;
    }
    // townsfolk
    const s = nearSite, want = s && ['urbs', 'city', 'town', 'oppidum'].includes(s.kind) && cities.get(s.id) ? (s.kind === 'urbs' ? 9 : 6) : 0;
    while (civs.length < want) {
      const a = Math.random() * TAU, r = 6 + Math.random() * s.r * 0.6, x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
      if (!world.walkable(x, z)) { if (Math.random() < 0.2) break; continue; }
      const base = CIV_LOOKS[(Math.random() * CIV_LOOKS.length) | 0], dark = ['egypt', 'punic', 'east'].includes(s.style);
      const h = makeHuman(dark ? { ...base, skin: 0xc08a5a } : base); scene.add(h.g);
      civs.push({ h, x, z, y: world.getHeight(x, z), facing: a, tx: x, tz: z, wait: Math.random() * 3, ph: Math.random() * 6, site: s });
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
      settle(c, dt || 0.016); c.h.g.position.set(c.x, c.y, c.z); c.h.g.rotation.y = c.facing;
      poseHuman(c.h, { t: rt + i * 2.3, mv, ph: c.ph, atk: -1, kind: 0, block: 0, dead: 0 });
    }
  }

  // =====================================================================
  // Foes
  // =====================================================================
  function spawnFoe(type, x, z, lvl, group) {
    const def = FOES[type], d = DIFF[S.difficulty];
    const model = def.beast ? makeHorse({ wolf: 1, coat: def.coat ?? 0x6a6a70, dark: def.dark ?? 0x3a3a40, size: def.size, wide: def.wide }) : makeHuman(def.look);
    const bs = def.beast ? (def.size ?? 0.5) / 0.5 : 1;
    scene.add(model.g);
    const wp = def.look && def.look.weapon;
    const f = {
      type, def, lvl, group, model, x, z, y: world.getHeight(x, z), facing: Math.random() * TAU, r: def.beast ? 0.6 * bs : 0.5,
      hp: def.hp * (1 + 0.14 * (lvl - 1)) * d.hp, dmg: def.dmg * (1 + 0.09 * (lvl - 1)) * d.dmg, st: 'chase', t: 0, cd: 0.6 + Math.random() * 1.5, ph: Math.random() * 6, mv: 0,
      reach: def.beast ? 1.6 + 0.5 * bs : wp === 'hasta' ? 3.3 : wp === 'gallic' ? 3.0 : 2.5, strafe: Math.random() < 0.5 ? 1 : -1, flash: 0, dead: 0, kx: 0, kz: 0, atkKind: 0, aware: group !== 'wild' && group !== 'camp', hx: x, hz: z, pt: Math.random() * 3, sus: 0, alertT: 0, vy: 0, cl: null,
    };
    f.maxHp = f.hp; foes.push(f);
    f.mark = new THREE.Mesh(markerGeo, susMat); f.mark.position.y = def.beast ? 3.6 : 2.5; f.mark.visible = false; model.g.add(f.mark);
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
    PL.climb = null;
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
    f.hp -= dmg; f.flash = 0.1; f.cl = null; if (!f.aware) alertFoe(f); setFlash(f.model, true);
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
  function alertFoe(f) {
    for (const o of foes) if (!o.dead && !o.aware && (o === f || (o.group === f.group && Math.hypot(o.x - f.x, o.z - f.z) < 24))) { o.aware = true; o.sus = 1; o.alertT = 1.6; o.cd = Math.max(o.cd, 0.5); }
    sfx.alert();
  }
  function assassinate(f) {
    const above = PL.y - f.y > 1.6;
    PL.facing = Math.atan2(f.x - PL.x, f.z - PL.z); PL.climb = null;
    if (above) { PL.x = f.x - Math.sin(PL.facing) * 0.8; PL.z = f.z - Math.cos(PL.facing) * 0.8; PL.vy = -6; }
    PL.atk = { t: 0, dur: 0.45, kind: 2, hit: true, lunge: 0 }; PL.invuln = Math.max(PL.invuln, 0.5); PL.sneak = false;
    const tough = f.def.boss || f.def.elite;
    if (S.numbers) fx.number(f.x, f.y + 3.2, f.z, tough ? 'Ambushed' : 'Assassinated', 'crit');
    fx.addShake(0.2);
    hitFoe(f, tough ? f.maxHp * 0.6 : f.hp + 1, true, Math.sin(PL.facing), Math.cos(PL.facing));
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
      f.alertT -= dt;
      if (f.cl) {   // scaling a wall after the player
        f.y += 3.6 * dt; f.mv = 1; f.ph += dt * 9; f.facing = Math.atan2(-f.cl.nx, -f.cl.nz);
        if (f.y >= f.cl.ob.top) { f.y = f.cl.ob.top; f.x -= f.cl.nx * 0.8; f.z -= f.cl.nz * 0.8; f.cl = null; }
        continue;
      }
      if (!f.aware) {
        // patrol near home, turning now and then
        f.pt -= dt;
        if (f.pt <= 0) { f.pt = 2.5 + Math.random() * 4; if (Math.random() < 0.55) { const a = Math.random() * TAU, r = 2 + Math.random() * 7; f.tx = f.hx + Math.cos(a) * r; f.tz = f.hz + Math.sin(a) * r; f.look = null; } else { f.tx = null; f.look = f.facing + (Math.random() - 0.5) * 2.6; } }
        let pm = 0;
        if (f.tx != null) { const ex = f.tx - f.x, ez = f.tz - f.z, el = Math.hypot(ex, ez); if (el > 0.7) { moveBody(f, (ex / el) * 1.6 * dt, (ez / el) * 1.6 * dt, f.r); f.facing = angleLerp(f.facing, Math.atan2(ex, ez), 1 - Math.exp(-4 * dt)); pm = 0.4; } else f.tx = null; }
        else if (f.look != null) f.facing = angleLerp(f.facing, f.look, 1 - Math.exp(-2 * dt));
        f.mv = damp(f.mv, pm, 8, dt); f.ph += dt * (f.def.beast ? 12 : 7) * f.mv; settle(f, dt);
        // sight cone and hearing
        const ahead = Math.sin(f.facing) * nx + Math.cos(f.facing) * nz, up = PL.y - f.y;
        const vr = (PL.sneak ? 15 : 27) * (up > 2.2 ? 0.35 : 1) * (world.state.night > 0.5 ? 0.7 : 1);
        f.losT = (f.losT || 0) - dt; if (f.losT <= 0) { f.losT = 0.2; f.los = d < vr && sight(f.x, f.z, f.y, PL.x, PL.z, PL.y); }
        const see = PL.mode !== 'ship' && d < vr && ahead > 0.42 && f.los;
        const hear = PL.mode !== 'ship' && Math.abs(up) < 2.5 && d < (PL.mode === 'horse' ? 10 : PL.sneak || PL.mv < 0.2 ? 0.75 : 3.8);
        if (see || hear) f.sus += dt * (hear ? 3.2 : lerp(2.4, 0.75, d / vr)); else f.sus = Math.max(0, f.sus - dt * 0.45);
        if (f.sus >= 1) alertFoe(f);
        continue;
      }
      if (f.group !== 'wild' && f.group.slice(0, 4) !== 'camp' ? false : d > 58) { f.aware = false; f.sus = 0; f.hx = f.x; f.hz = f.z; f.st = 'chase'; continue; }
      combat = Math.max(combat, d < 40 ? 3 : 0);
      let mvx = 0, mvz = 0, sp = f.def.spd, face = Math.atan2(dx, dz);
      const range = f.def.ranged ? 13 : f.reach * 0.8;
      f.cd -= dt; f.t -= dt;
      if (PL.mode === 'ship') { f.st = 'chase'; f.mv = 0; continue; }
      if (f.st === 'stag') { if (f.t <= 0) { f.st = 'chase'; f.cd = Math.max(f.cd, 0.4); } }
      else if (f.st === 'windup') {
        if (f.t <= 0) {
          f.st = 'strike'; f.t = 0.16;
          if (f.def.ranged) { shots.push({ x: f.x, y: f.y + 1.4, z: f.z, vx: nx * 27, vz: nz * 27, vy: (PL.y + 1.1 - f.y - 1.4) / Math.max(0.15, d / 27), life: 1.6, dmg: f.dmg, foe: f, mine: false }); sfx.arrow(); }
          else {
            if (f.def.beast) { f.kx += nx * 14; f.kz += nz * 14; }
            const fd = Math.sin(f.facing) * nx + Math.cos(f.facing) * nz;
            if (d < f.reach + 0.6 && fd > 0.35 && Math.abs(PL.y - f.y) < 1.8) hurtPlayer(f.dmg, f.x, f.z, f); else sfx.swing();
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
      if (f.hit && !f.def.beast && f.st === 'chase' && PL.y > f.y + 1.2 && climbable(f.hit.ob, f.y)) { f.pushT = (f.pushT || 0) + dt; if (f.pushT > 0.35) { f.cl = f.hit; f.pushT = 0; f.vy = 0; } } else f.pushT = 0;
      const kd = Math.exp(-8 * dt); f.kx *= kd; f.kz *= kd;
      f.mv = damp(f.mv, Math.min(1, ml) * (sp / f.def.spd), 10, dt); f.ph += dt * (f.def.beast ? 16 : 9) * f.mv;
      f.facing = angleLerp(f.facing, face, 1 - Math.exp(-9 * dt));
      settle(f, dt);
    }
  }
  function drawFoes() {
    for (const f of foes) {
      f.model.g.position.set(f.x, f.y, f.z); f.model.g.rotation.y = f.facing;
      const mk = f.mark; mk.visible = !f.dead && (f.alertT > 0 || (!f.aware && f.sus > 0.04));
      if (mk.visible) { mk.material = f.alertT > 0 ? alertMat : susMat; mk.scale.setScalar(f.alertT > 0 ? 1.5 : 0.5 + f.sus); mk.rotation.y = rt * 3; }
      if (f.def.beast) { poseHorse(f.model, f.ph, f.mv); f.model.g.rotation.z = f.dead * 1.5; f.model.g.position.y -= f.dead * 0.2; }
      else {
        let atk = -1;
        if (f.st === 'windup') atk = (1 - f.t / f.dur) * 0.35; else if (f.st === 'strike') atk = 0.35 + (1 - f.t / 0.16) * 0.4; else if (f.st === 'recover') atk = Math.min(1, 0.75 + (1 - f.t / 0.55) * 0.25);
        if (f.st === 'recover' && f.t < 0.2) atk = -1;
        poseHuman(f.model, { t: rt + f.ph, climb: !!f.cl, air: f.air && !f.cl, mv: f.mv, ph: f.ph, atk, kind: f.atkKind, ranged: f.def.ranged, block: f.def.guard && f.aware && f.st === 'chase' ? 0.6 : 0, dead: f.dead, stag: f.st === 'stag' ? 1 : 0 });
      }
    }
  }
  function updateShots(dt) {
    let n = 0;
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.x += s.vx * dt; s.z += s.vz * dt; s.y += (s.vy || 0) * dt; s.life -= dt;
      let gone = s.life <= 0 || world.getHeight(s.x, s.z) > s.y;
      if (!gone && allObs) for (const o of allObs) if (!o.plat && o.top > s.y && inside(o, s.x, s.z)) { gone = true; break; }
      if (!gone && s.mine) { for (const f of foes) if (!f.dead && (f.x - s.x) ** 2 + (f.z - s.z) ** 2 < 0.9 && Math.abs(f.y + 1 - s.y) < 1.6) { const l = Math.hypot(s.vx, s.vz); hitFoe(f, s.dmg, true, s.vx / l, s.vz / l); gone = true; break; } }
      else if (!gone && (PL.x - s.x) ** 2 + (PL.z - s.z) ** 2 < 0.6 && Math.abs(PL.y + 1 - s.y) < 1.5 && PL.invuln <= 0) { hurtPlayer(s.dmg, s.x - s.vx, s.z - s.vz, null); gone = true; }
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
          if (d < (st.stealth ? 70 : 85) && PL.mode !== 'ship') {
            if (killGroup) removeGroup(killGroup.key);
            killGroup = { key, id, list: spawnGroup(st.foes, p[0], p[1], st.lvl, key), x: p[0], z: p[1] };
            if (st.stealth) for (const f of killGroup.list) f.aware = false;
            ui.toast(st.obj, st.stealth ? 'They have not seen you' : 'Battle', 2.6);
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
        const bx = (dx, dz, hw, hd, rot, h) => ({ x: c.x + dx, z: c.z + dz, hw, hd, c: Math.cos(rot), s: Math.sin(rot), h, top: y + h });
        c.obs = [bx(-4, -3, 1.1, 2.1, 0.5, 1.7), bx(4.5, -2, 1.1, 2.1, -0.6, 1.7), bx(0, -1, 0.78, 0.53, 0, 0.9), { x: c.x, z: c.z + 3, r: 1.0, h: 0.5, top: y + 0.5, stand: 1 }];
      } else if (d > 320 && c.mesh) { scene.remove(c.mesh); c.mesh = null; c.obs = null; c.spawned = false; removeGroup('camp' + c.i); }
      if (c.mesh) c.chest.rotation.z = done ? 0.5 : 0;
      if (d < 90 && !done && !c.spawned && PL.mode !== 'ship') { c.spawned = true; const pool = WILD[world.regionAt(c.x, c.z)].filter((t) => t !== 'lupus'); const list = spawnGroup([[pool[0], 3], [pool[pool.length - 1], 1]], c.x, c.z, c.lvl, 'camp' + c.i); for (const f of list) f.group = 'camp' + c.i; }
    }
    // wild encounters
    wildT -= dt;
    if (wildT <= 0) {
      wildT = 28 + Math.random() * 30;
      const lvl = Math.max(1, PL.level - 1 + ((Math.random() * 3) | 0) - 1);
      if (PL.mode !== 'ship' && !PL.swim && !nearSite && !killGroup && foes.length < 3 && !world.sites.some((s) => Math.hypot(s.x - PL.x, s.z - PL.z) < s.r + 130)) {
        const pool = WILD[world.regionAt(PL.x, PL.z)] || ['latro'], type = pool[(Math.random() * pool.length) | 0];
        const a = PL.facing + (Math.random() - 0.5) * 1.6, p = [PL.x + Math.sin(a) * 52, PL.z + Math.cos(a) * 52];
        if (world.walkable(p[0], p[1])) { const list = spawnGroup([[type, type === 'lupus' ? 3 : 2 + ((Math.random() * 2) | 0)]], p[0], p[1], lvl, 'wild'); for (const f of list) f.aware = false; }
      }
    }
    // enemy outposts
    for (const s of forts) {
      const d = Math.hypot(s.x - PL.x, s.z - PL.z), cleared = done.has(s.id);
      if (s.chestMesh == null && cities.get(s.id) && s.chest) { s.chestMesh = new THREE.Mesh(chestGeo, charMat); s.chestMesh.castShadow = true; s.chestMesh.position.set(s.chest.x, world.siteH(s), s.chest.z); scene.add(s.chestMesh); }
      if (s.chestMesh) s.chestMesh.rotation.z = cleared ? 0.5 : 0;
      if (d < 125 && !cleared && !s.spawned && PL.mode !== 'ship' && cities.get(s.id)) {
        s.spawned = true; const key = 'fort:' + s.id, lv = s.lvl, rg = FOES[s.foe].ranged ? 'latro' : s.foe, sh = s.foe === 'numida' ? 'numida' : 'sagittarius';
        s.cap = spawnFoe('praefectus', s.x + 1, s.z - 3.5, lv + 1, key);
        s.guards = [s.cap];
        for (const [ox, oz, ty] of [[-13, 9, rg], [13, 9, rg], [-11, -13, rg], [12, -12, rg], [-17, 1, sh], [17, -1, sh], [2, 15, rg]]) s.guards.push(spawnFoe(ty, s.x + ox, s.z + oz, lv, key));
        for (const f of s.guards) { f.aware = false; f.hx = f.x; f.hz = f.z; }
      } else if (d > 320 && s.spawned) { removeGroup('fort:' + s.id); s.spawned = false; }
      if (d < s.r + 46 && !cleared && !s.told) { s.told = true; ui.toast(s.name, 'Enemy outpost · kill the captain and take the strongbox', 4.2); }
      if (d > 200) s.told = false;
    }
    // wrecks and hunts
    for (const w of wrecks) {
      if (!w.ready) { w.ready = true; let px = toX(w.lon), pz = toZ(w.lat), ok = false; for (let r = 0; r < 500 && !ok; r += 10) for (let a = 0; a < TAU; a += 0.5) { const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r, f = world.landF(x, z); if (world.inBounds(x, z) && f < 0.4 && f > 0.14) { px = x; pz = z; ok = true; break; } } w.x = px; w.z = pz; }
      const d = Math.hypot(w.x - PL.x, w.z - PL.z);
      if (d < 420 && !w.mesh) { w.mesh = new THREE.Mesh(wreckGeo, charMat); w.mesh.position.set(w.x, 0, w.z); w.mesh.rotation.y = w.i * 1.3; scene.add(w.mesh); }
      else if (d > 520 && w.mesh) { scene.remove(w.mesh); w.mesh = null; }
      if (d < 240 && !known.has(w.key)) { known.add(w.key); ui.note('A wreck lies offshore. Swim out and dive for it.'); }
    }
    for (const h of hunts) {
      if (!h.ready) { const p = snapWalk(toX(h.lon), toZ(h.lat)); h.x = p[0]; h.z = p[1]; h.ready = true; }
      const d = Math.hypot(h.x - PL.x, h.z - PL.z), fin = done.has(h.key);
      if (d < 260 && !known.has(h.key)) known.add(h.key);
      if (d < 95 && !fin && !h.spawned && PL.mode !== 'ship') {
        h.spawned = true; h.boss = spawnFoe(h.foe, h.x, h.z, h.lvl, 'hunt' + h.i); h.boss.aware = false;
        if (h.pack) for (const f of spawnGroup([[h.pack, 3]], h.x, h.z, h.lvl, 'hunt' + h.i)) f.aware = false;
      } else if (d > 300 && h.spawned && !fin) { removeGroup('hunt' + h.i); h.spawned = false; h.boss = null; h.told = false; }
      if (h.spawned && !fin && d < 70 && !h.told) { h.told = true; ui.toast(h.name, 'Beast hunt', 3.4); }
      if (h.boss && h.boss.dead && !fin) { done.add(h.key); const r = 110 + 45 * h.lvl; PL.den += r; sfx.quest(); ui.toast('Hunt complete', h.name, 3.4); ui.note(`The pelt sells for ${r} denarii`); save(true); }
    }
    for (const c of camps) if (c.ready && !known.has('C' + c.i) && Math.hypot(c.x - PL.x, c.z - PL.z) < 240) known.add('C' + c.i);
    // discovery
    for (const s of world.sites) if (!known.has(s.id) && Math.hypot(s.x - PL.x, s.z - PL.z) < s.r + (s.kind === 'fort' || s.kind === 'tower' ? 90 : 28)) {
      known.add(s.id);
      if (s.kind === 'fort') { sfx.alert(); ui.note(`Enemy outpost sighted: ${s.name}`); }
      else if (s.kind === 'tower') { ui.note(`Watchtower sighted: ${s.name}. Climb it to survey the land.`); }
      else { discovered.add(s.id); sfx.discover(); ui.toast(s.name, 'Discovered · fast travel unlocked', 3.4); gainXp(25); }
      save(true);
    }
    for (const s of world.sites) if (known.has(s.id) && !discovered.has(s.id) && s.kind !== 'fort' && s.kind !== 'tower' && Math.hypot(s.x - PL.x, s.z - PL.z) < s.r + 28) { discovered.add(s.id); sfx.discover(); ui.toast(s.name, 'Discovered · fast travel unlocked', 3.4); gainXp(25); save(true); }
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
  function placePlayer(x, z) { const p = snapWalk(x, z); PL.x = p[0]; PL.z = p[1]; PL.y = world.getHeight(PL.x, PL.z); PL.vy = 0; PL.climb = null; PL.sneak = false; PL.atk = null; horse.g.visible = false; horseAt = null; }
  function entryOf(s) { const o = s.kind === 'pyramids' ? [14, 26] : s.kind === 'oppidum' ? [3, 5] : s.kind === 'tower' ? [0, 6] : [2.5, 5]; return [s.x + o[0], s.z + o[1]]; }
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
    if (PL.swim) {
      for (const w of wrecks) if (!done.has(w.key) && Math.hypot(w.x - PL.x, w.z - PL.z) < 7.5) { prompt = { text: 'Dive to the wreck', fn: () => {
        done.add(w.key); const r = 90 + 38 * w.lvl; PL.den += r; sfx.coin(); sfx.splash(); gainXp(70 + 12 * w.lvl); ui.toast('Wreck plundered', `+${r} denarii`, 3);
        const pool = (STOCK[world.regionAt(w.x, w.z)] || STOCK.Italia).filter((id) => !PL.owned.includes(id)); if (pool.length && Math.random() < 0.45) { const id = pool[(Math.random() * pool.length) | 0]; PL.owned.push(id); ui.note(`Salvaged: ${ITEMS[id].name}`); autoEquip(id); }
        fx.burst(PL.x, 0.2, PL.z, 30, 6, 0.75, 0.85, 0.9, { life: 0.8, size: 0.7, up: 0.8 }); save(true); } }; return; }
      if (allObs) for (const b of allObs) if ((b.plat || b.deck) && b.r == null && b.top < 3 && inside(b, PL.x, PL.z, 1.4)) { prompt = { text: b.deck ? 'Climb aboard' : 'Climb out', fn: () => {
        const dx = PL.x - b.x, dz = PL.z - b.z, lx = clamp(dx * b.c - dz * b.s, -b.hw + 0.5, b.hw - 0.5), lz = clamp(dx * b.s + dz * b.c, -b.hd + 0.5, b.hd - 0.5);
        PL.x = b.x + lx * b.c + lz * b.s; PL.z = b.z - lx * b.s + lz * b.c; PL.y = b.top; PL.swim = false; PL.vy = 0; sfx.splash(); } }; return; }
      return;
    }
    for (const s of towers) if (!discovered.has(s.id) && s.topY && PL.y > s.topY - 0.4 && Math.hypot(s.x - PL.x, s.z - PL.z) < 3.4) { prompt = { text: 'Survey the land', fn: () => {
      let n = 0; for (const q of world.sites) if (!known.has(q.id) && Math.hypot(q.x - s.x, q.z - s.z) < 1500) { known.add(q.id); n++; }
      for (const c of camps) { if (!c.ready) { const p = snapWalk(toX(c.lon), toZ(c.lat)); c.x = p[0]; c.z = p[1]; c.ready = true; } if (Math.hypot(c.x - s.x, c.z - s.z) < 1500) known.add('C' + c.i); }
      for (const w of wrecks) if (w.ready && Math.hypot(w.x - s.x, w.z - s.z) < 1500) known.add(w.key);
      for (const h of hunts) if (h.ready && Math.hypot(h.x - s.x, h.z - s.z) < 1500) known.add(h.key);
      discovered.add(s.id); sfx.quest(); gainXp(80); ui.toast('Land surveyed', `${n} new places marked on your map`, 4); save(true); } }; return; }
    for (const s of forts) if (!done.has(s.id) && s.chest && Math.hypot(s.chest.x - PL.x, s.chest.z - PL.z) < 3.2) {
      if (s.cap && !s.cap.dead) { prompt = { text: 'Kill the captain first', fn: () => {} }; return; }
      prompt = { text: 'Take the strongbox', fn: () => {
        done.add(s.id); discovered.add(s.id); const r = 90 + 34 * s.lvl; PL.den += r; sfx.coin(); sfx.quest(); gainXp(160 + 45 * s.lvl); ui.toast('Outpost cleared', `${s.name} · +${r} denarii`, 4);
        const pool = (STOCK[s.region] || STOCK.Italia).filter((id) => !PL.owned.includes(id)); if (pool.length && Math.random() < 0.5) { const id = pool[(Math.random() * pool.length) | 0]; PL.owned.push(id); ui.note(`Found: ${ITEMS[id].name}`); autoEquip(id); }
        save(true); } }; return;
    }
    if (findStep) { prompt = { text: 'Search', fn: () => { const { id, st } = findStep; const done = () => advance(id); if (st.say) say(st.say, done); else done(); } }; return; }
    if (PL.mode === 'foot' && !PL.climb) for (const f of foes) {
      if (f.dead || f.aware) continue;
      const dx = PL.x - f.x, dz = PL.z - f.z, d = Math.hypot(dx, dz) || 1, up = PL.y - f.y;
      const behind = (Math.sin(f.facing) * dx + Math.cos(f.facing) * dz) / d < 0.3;
      if ((d < 2.7 && Math.abs(up) < 1.2 && behind) || (up > 1.6 && up < 14 && d < 4.8)) { prompt = { text: up > 1.6 ? 'Assassinate from above' : 'Assassinate', kill: true, fn: () => assassinate(f) }; return; }
    }
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
      if (PL.shipPos && Math.hypot(PL.shipPos.x - PL.x, PL.shipPos.z - PL.z) < 8.5 && PL.y > 0.6) { prompt = { text: 'Set sail', fn: () => embark(null) }; return; }
      const s = world.nearestSite(PL.x, PL.z, (p) => p.port);
      if (s && (Math.hypot(s.dock.x - PL.x, s.dock.z - PL.z) < 7 || (s.pierEnd && Math.hypot(s.pierEnd.x - PL.x, s.pierEnd.z - PL.z) < 9))) { prompt = { text: 'Set sail', fn: () => embark(s) }; return; }
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
    sfx.death(); PL.atk = null; mode = 'dead'; input.unlock();
    const respawn = () => { const s = world.nearestSite(PL.x, PL.z, (p) => discovered.has(p.id) && p.kind !== 'site' && p.kind !== 'tower') || world.siteById.ravenna; for (const f of foes) f.model.g.removeFromParent(); foes.length = 0; killGroup = null; for (const c of camps) c.spawned = false; for (const q of forts) q.spawned = false; for (const h of hunts) { h.spawned = false; h.boss = null; } setMode('foot'); const e = entryOf(s); placePlayer(e[0], e[1]); PL.hp = PL.maxHp; PL.st = 100; PL.invuln = 2; combat = 0; mode = 'play'; };
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
  function pushOut(o, r) { const dx = PL.x - o.x, dz = PL.z - o.z, d2 = dx * dx + dz * dz; if (d2 < r * r && d2 > 1e-5 && Math.abs(PL.y - o.y) < 1.6) { const d = Math.sqrt(d2), k = (r - d) / d; if (standOk(PL.x + dx * k, PL.z + dz * k, PL.y)) { PL.x += dx * k; PL.z += dz * k; } } }
  function updatePlayer(dt) {
    PL.time += dt; PL.invuln -= dt; PL.dodgeCd -= dt; PL.hurtT -= dt; PL.lastHurt += dt; PL.comboT -= dt; PL.stag -= dt;
    if (PL.comboT <= 0) PL.combo = 0;
    let ix = input.mx, iy = input.my, act = (a) => input.hit(a);
    if (G.bot) { const b = botInput(); ix = b.x; iy = b.y; act = (a) => b.act === a; }
    if (G.drive) { ix = G.drive.x; iy = G.drive.y; act = (a) => G.drive.act === a; camYaw = 0; }
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
      if (act('jump')) {   // dive overboard
        PL.shipPos = { x: PL.x, z: PL.z, rot: PL.facing }; setMode('foot'); PL.x += Math.cos(PL.facing) * 3.2; PL.z -= Math.sin(PL.facing) * 3.2; PL.y = 1.4; PL.vy = 4; PL.swim = false; PL.air = true; updateCities();
      }
      return;
    }
    PL.canSwim = PL.mode === 'foot';
    if (PL.swim) {   // swimming: no fighting, just strokes
      PL.atk = null; PL.blocking = false; PL.sneak = false; PL.climb = null;
      if (moving) { moveBody(PL, wx * 4.4 * mag * dt, wz * 4.4 * mag * dt, 0.45); PL.facing = angleLerp(PL.facing, Math.atan2(wx, wz), 1 - Math.exp(-6 * dt)); if (Math.random() < dt * 9) fx.spawn(PL.x + (Math.random() - 0.5), 0.08, PL.z + (Math.random() - 0.5), 0, 0.6, 0, 0.6, 0.6, 0.75, 0.85, 0.9, 0); }
      PL.mv = damp(PL.mv, moving ? mag : 0, 8, dt); PL.ph += dt * 5.5 * Math.max(0.25, PL.mv);
      settle(PL, dt); PL.st = Math.min(100, PL.st + 12 * dt);
      if (PL.lastHurt > 6 && PL.hp < PL.maxHp) PL.hp = Math.min(PL.maxHp, PL.hp + PL.maxHp * 0.02 * dt);
      return;
    }
    const riding = PL.mode === 'horse';
    if (PL.climb) {   // on a wall: push towards it to go up, pull away to go down, dodge to let go
      const c = PL.climb, into = moving ? -(wx * c.nx + wz * c.nz) : 0;
      PL.facing = Math.atan2(-c.nx, -c.nz); PL.atk = null; PL.blocking = false;
      if (act('jump') || PL.stag > 0) { PL.climb = null; PL.x += c.nx * 0.3; PL.z += c.nz * 0.3; PL.vy = PL.stag > 0 ? 0 : 5; sfx.dodge(); }
      else {
        const vy = !moving ? 0 : into > -0.4 ? 4.6 : -5.5;
        PL.y += vy * dt; PL.mv = damp(PL.mv, vy ? 1 : 0, 12, dt); PL.ph += dt * 9 * PL.mv; PL.vy = 0;
        if (PL.y >= c.ob.top - 0.02) { PL.y = c.ob.top; PL.x -= c.nx * 0.85; PL.z -= c.nz * 0.85; PL.climb = null; }
        else if (vy < 0 && PL.y <= surfaceAt(allObs, PL.x, PL.z, PL.y, world.getHeight(PL.x, PL.z)) + 0.02) PL.climb = null;
        PL.st = Math.min(100, PL.st + 12 * dt);
        return;
      }
    }
    if (act('sneak') && !riding) { PL.sneak = !PL.sneak; ui.note(PL.sneak ? 'Sneaking: slower, quieter and harder to see' : 'Standing'); }
    if (act('mount') && PL.horse && !PL.atk && !PL.air) { PL.sneak = false; setMode(riding ? 'foot' : 'horse'); }
    if (act('eat') && PL.panis > 0 && PL.hp < PL.maxHp) { PL.panis--; PL.hp = Math.min(PL.maxHp, PL.hp + PL.maxHp * 0.45); sfx.eat(); fx.burst(PL.x, PL.y + 1.2, PL.z, 12, 3, 0.6, 2.6, 0.8, { life: 0.6, size: 0.4 }); if (S.numbers) fx.number(PL.x, PL.y + 2.3, PL.z, '+' + Math.round(PL.maxHp * 0.45), 'heal'); }
    if (act('pilum') && PL.pila > 0 && !PL.atk && !riding) {
      let best = null, bd = 26; for (const f of foes) { if (f.dead) continue; const d = Math.hypot(f.x - PL.x, f.z - PL.z); if (d < bd) { bd = d; best = f; } }
      const a = best ? Math.atan2(best.x - PL.x, best.z - PL.z) : PL.facing; PL.facing = a; PL.pila--;
      shots.push({ x: PL.x, y: PL.y + 1.5, z: PL.z, vx: Math.sin(a) * 34, vz: Math.cos(a) * 34, vy: best ? (best.y + 1 - PL.y - 1.5) / Math.max(0.1, bd / 34) : 0, life: 1.1, dmg: (26 + 4 * PL.level), mine: true }); sfx.throw();
      PL.atk = { t: 0, dur: 0.4, kind: 2, hit: true, lunge: 0 };
    }
    if (act('attack') && PL.stag <= 0 && prompt && prompt.kill && !riding) { prompt.fn(); prompt = null; }
    else if (act('attack') && PL.stag <= 0) { PL.sneak = false; if (riding) setMode('foot'); else if (!PL.atk) startAttack(); else if (PL.atk.t > PL.atk.dur * 0.35) PL.queued = true; }
    const wasBlock = PL.blocking;
    PL.blocking = (G.bot ? false : input.block) && !riding && !PL.atk && PL.dodgeT <= 0 && PL.stag <= 0 && PL.st > 0;
    PL.blockT = PL.blocking ? (wasBlock ? PL.blockT + dt : 0) : 0;
    // jump: Space or the jump button; works on foot and on horseback
    if (act('jump') && !PL.air && PL.stag <= 0 && PL.dodgeT <= 0) { PL.vy = riding ? 8.5 : 9.4; PL.air = true; sfx.dodge(); }
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
            if (Math.abs(f.y - PL.y) < 2 && d < w.reach + f.r + (heavy ? 0.4 : 0) && (Math.sin(PL.facing) * dx + Math.cos(PL.facing) * dz) / d > arc) hitFoe(f, w.dmg * (1 + 0.07 * (PL.level - 1)) * (heavy ? 1.8 : 1) * (0.9 + Math.random() * 0.2), heavy, dx / d, dz / d);
          }
        }
        if (a.t >= a.dur) { PL.atk = null; if (PL.queued) startAttack(); }
      }
      if (moving) {
        const road = world.roadDist(PL.x, PL.z) < 4.5;
        const base = riding ? 17 * (road ? 1.25 : 1) : 7.4 * (road ? 1.1 : 1);
        const k = PL.atk ? 0.2 : PL.blocking ? 0.45 : PL.sneak ? 0.5 : 1;
        const e = 1.2, slope = (world.getHeight(PL.x + wx * e, PL.z + wz * e) - PL.y) / e;
        sp = mag * k * clamp(1 - Math.max(0, slope - 0.25) * 1.1, 0.35, 1);
        moveBody(PL, wx * base * sp * dt, wz * base * sp * dt, riding ? 0.8 : 0.45);
        const hw = PL.hit;
        if (hw && !riding && !PL.atk && climbable(hw.ob, PL.y) && -(wx * hw.nx + wz * hw.nz) > 0.7) { PL.pushT += dt; if (PL.pushT > 0.22) { PL.climb = hw; PL.pushT = 0; PL.vy = 0; sfx.dodge(); } } else PL.pushT = 0;
        if (!PL.atk) PL.facing = angleLerp(PL.facing, Math.atan2(wx, wz), 1 - Math.exp(-(riding ? 6 : 13) * dt));
        if (riding && sp > 0.4) sfx.hoof();
      }
    }
    PL.mv = damp(PL.mv, sp, 12, dt); PL.ph += dt * (riding ? 15 : 10.5) * PL.mv;
    if (PL.mode === 'foot') { for (const n of npcs) pushOut(n, 0.75); for (const c of civs) pushOut(c, 0.7); }
    settle(PL, dt);
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
    return { v: 2, at: Date.now(), name: PL.name, level: PL.level, place: (world.nearestSite(PL.x, PL.z) || {}).name, time: PL.time, chapter: (QUESTS.find((q) => q.main && QS[q.id].state === 'active') || { name: 'Epilogue' }).name,
      pl: { x: PL.x, z: PL.z, facing: PL.facing, hp: PL.hp, level: PL.level, xp: PL.xp, den: PL.den, panis: PL.panis, pila: PL.pila, owned: PL.owned, eq: PL.eq, horse: PL.horse, ship: PL.ship, shipPos: PL.shipPos, mode: PL.mode === 'horse' ? 'foot' : PL.mode, kills: PL.kills },
      qs: QS, tracked, disc: [...discovered], camps: [...campsDone], known: [...known], done: [...done], tod: world.state.tod };
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
    discovered.clear(); campsDone.clear(); known.clear(); done.clear(); way = null; for (const q of forts) { q.spawned = false; q.told = false; } for (const h of hunts) { h.spawned = false; h.boss = null; h.told = false; }
    for (const n of ['fort', 'hunt']) for (let i = foes.length - 1; i >= 0; i--) if (foes[i].group.startsWith(n)) { foes[i].model.g.removeFromParent(); foes.splice(i, 1); }
    const p = data && data.pl;
    Object.assign(PL, { hp: 100, level: 1, xp: 0, den: 30, panis: 2, pila: 2, owned: ['pugio', 'noshield', 'tunica', 'nohelm'], eq: { weapon: 'pugio', shield: 'noshield', armor: 'tunica', helmet: 'nohelm' }, horse: false, ship: false, shipPos: null, mode: 'foot', kills: 0, time: 0, atk: null, st: 100, invuln: 1, facing: Math.PI }, p ? { ...p, owned: [...p.owned], eq: { ...p.eq } } : {});
    PL.time = data ? data.time || 0 : 0;
    initQuests(data && data.qs); tracked = data ? data.tracked : 'm1';
    if (data) { for (const id of data.disc) { discovered.add(id); known.add(id); } for (const c of data.camps) campsDone.add(c); for (const k of data.known || []) known.add(k); for (const k of data.done || []) done.add(k); world.state.tod = data.tod ?? 0.36; } else world.state.tod = 0.34;
    recompute(); if (!p) PL.hp = PL.maxHp;
    const rv = world.siteById.ravenna;
    if (!p) { const e = snapWalk(rv.x - 3, rv.z + 22); PL.x = e[0]; PL.z = e[1]; discovered.add('ravenna'); known.add('ravenna'); }
    const m = PL.mode; PL.mode = 'foot'; horse.g.visible = false; horseAt = null;
    if (m === 'ship' && world.sailable(PL.x, PL.z)) setMode('ship'); else { const q = snapWalk(PL.x, PL.z); PL.x = q[0]; PL.z = q[1]; camDistT = 10; }
    PL.y = PL.mode === 'ship' ? 0 : world.getHeight(PL.x, PL.z);
    buildHero(); syncNpcDefs(); world.applySky();
    camYaw = 0; camPitch = 0.42; camTarget.set(PL.x, PL.y + 1.5, PL.z);
    world.streamChunks(PL.x, PL.z, 14); updateCities();
    ui.close(); mode = 'play'; $('title').hidden = true; $('hud').hidden = false; combat = 0; wildT = 30;
    if (!data) {
      ui.toast('The Die Is Cast', 'January, 49 BC', 4.5);
      ui.hint(isTouch ? 'Drag the left side of the screen to move, and the right side to look around.' : S.look === 'move' ? 'Move with WASD. Click the game once, then just move your finger on the trackpad to look around. Esc frees the pointer.' : 'Move with WASD. Drag the mouse or trackpad to look around.');
      ui.hint(isTouch ? 'Push against a wall to climb it, and jump to let go. Tap the mask button to sneak.' : 'Push against a wall to climb it. Press C to sneak. Enemies only see what is in front of them: strike from behind or from above to assassinate.');
      ui.hint('Follow the marker on the compass. A golden light marks who to speak to.');
      ui.hint(isTouch ? 'In a fight: tap the sword to strike and hold the shield to block. The arrow button jumps.' : 'In a fight: J or click to strike, hold K or right-click to block, F to throw a pilum. Space jumps.');
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
        poseHuman(hero, { t: rt, mv: 0, ph: 0, atk: -1, kind: 0, block: 0, dead: 0 });
      } else {
        hero.g.position.set(PL.x, PL.y + (riding ? 0.78 + horse.body.position.y : 0) + (PL.swimK || 0) * 0.86, PL.z); hero.g.rotation.set(0, PL.facing, 0);
        if (PL.dodgeT > 0) hero.g.rotation.x = (1 - PL.dodgeT / 0.34) * TAU * (Math.sin(PL.facing) * PL.dx + Math.cos(PL.facing) * PL.dz > 0 ? 1 : -1);
        PL.swimK = damp(PL.swimK || 0, PL.swim ? (PL.mv > 0.15 ? 1 : 0.3) : 0, 6, dt);
        poseHuman(hero, { t: rt, sneak: PL.sneak && !PL.climb, air: PL.air && !PL.climb && !PL.swim && !riding, swim: PL.swim, climb: !!PL.climb, mv: riding ? 0 : PL.mv, ph: PL.ph, atk: PL.atk ? PL.atk.t / PL.atk.dur : -1, kind: PL.atk ? PL.atk.kind : 0, block: PL.blocking ? 1 : 0, dead: mode === 'dead' ? 1 : 0, ride: riding, stag: PL.stag > 0 ? 1 : 0 });
        hero.g.visible = !(PL.hurtT > 0 && Math.floor(rt * 30) % 2 === 0);
        if (riding) { horse.g.position.set(PL.x, PL.y, PL.z); horse.g.rotation.y = PL.facing; poseHorse(horse, PL.ph, PL.mv); }
        else if (horseAt) { horse.g.position.set(horseAt.x, horseAt.y, horseAt.z); horse.g.rotation.y = horseAt.rot; poseHorse(horse, 0, 0); if (Math.hypot(horseAt.x - PL.x, horseAt.z - PL.z) > 70) { horse.g.visible = false; horseAt = null; } }
        if (PL.ship && PL.shipPos) { const d = Math.hypot(PL.shipPos.x - PL.x, PL.shipPos.z - PL.z); ship.g.visible = d < 900; if (ship.g.visible) { ship.g.position.set(PL.shipPos.x, 0.45 + Math.sin(rt * 1.1) * 0.12, PL.shipPos.z); ship.g.rotation.y = PL.shipPos.rot; poseShip(ship, rt, 0); } } else ship.g.visible = false;
      }
    }
    drawFoes();
    const tt = mode === 'title' ? null : trackedTarget();
    objBeam.visible = !!tt && Math.hypot(tt.x - PL.x, tt.z - PL.z) > 45;
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
        const x = camTarget.x + dxq * t, z = camTarget.z + dzq * t, y = camTarget.y + spq * t;
        for (const b of nearObs) {
          if (b.plat || y > b.top + (b.roof || 0) || camTarget.y - 0.6 > b.top + (b.roof || 0)) continue;
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
      for (const a of ['map', 'bag', 'log', 'menu']) if (input.hit(a)) { input.unlock(); ui.open(a); break; }
      if (mode === 'play') step(dt);
    } else if (mode === 'dialog') { if (input.hit('interact') || input.hit('attack') || input.hit('jump')) nextLine(); }
    else if (mode === 'ui') { if (input.hit('menu')) ui.close(); else for (const a of ['map', 'bag', 'log']) if (input.hit(a)) { ui.open(a); break; } }
    const vx = mode === 'title' ? world.siteById.roma.x : PL.x, vz = mode === 'title' ? world.siteById.roma.z : PL.z;
    world.streamChunks(vx, vz, 1); world.streamRoads(vx, vz);
    cityT -= dt; if (cityT <= 0) { cityT = 0.3; if (mode !== 'title') updateCities(); }
    const live = mode === 'play' || mode === 'dialog' || mode === 'dead' || mode === 'title';
    if (mode !== 'title' && mode !== 'loading') updatePeople(live ? dt : 0);
    const tt = drawWorld(dt);
    updateCamera(dt);
    world.update(dt, rt, vx, mode === 'title' ? 0 : PL.y, vz, camera, mode === 'play' ? dt : 0);
    fx.update(live ? dt : 0, W, H);
    if (mode !== 'title' && mode !== 'loading') { ui.hud(dt, tt, camYaw, prompt && mode === 'play' ? prompt.text : null, foes, input.free && !input.locked && !input.hover && mode === 'play'); if (savedT > 0) { savedT -= dt; if (savedT <= 0) $('saved').classList.remove('on'); } const v = +$('vignette').style.opacity || 0; if (v > 0) $('vignette').style.opacity = Math.max(0, v - dt * 2.4); }
    const reg = mode === 'title' ? 'Italia' : world.regionAt(PL.x, PL.z);
    musicTick({ war: foes.some((f) => f.aware && !f.dead), sea: PL.mode === 'ship', east: ['Aegyptus', 'Syria', 'Iudaea', 'Cilicia', 'Africa', 'Pontus'].includes(reg), night: world.state.night > 0.5 });
    renderer.toneMappingExposure = world.state.exposure;
    if ($('mapscr').hidden) composer.render();   // the map covers the whole screen, so skip drawing the world behind it
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
    xpNeed, known, done, way: () => way, setWay: (w) => { way = w; },
    spots: () => {
      const out = [];
      for (const c of camps) if (known.has('C' + c.i)) out.push({ x: c.x, z: c.z, type: 'camp', done: campsDone.has(c.i), name: 'Bandit camp', lvl: c.lvl });
      for (const w of wrecks) if (known.has(w.key)) out.push({ x: w.x, z: w.z, type: 'wreck', done: done.has(w.key), name: 'Sunken wreck', lvl: w.lvl });
      for (const h of hunts) if (known.has(h.key)) out.push({ x: h.x, z: h.z, type: 'hunt', done: done.has(h.key), name: h.name, lvl: h.lvl });
      return out;
    },
    activities: () => [['Places discovered', world.sites.filter((q) => q.kind !== 'fort' && q.kind !== 'tower' && discovered.has(q.id)).length, world.sites.filter((q) => q.kind !== 'fort' && q.kind !== 'tower').length], ['Outposts cleared', forts.filter((q) => done.has(q.id)).length, forts.length], ['Watchtowers surveyed', towers.filter((q) => discovered.has(q.id)).length, towers.length], ['Bandit camps looted', campsDone.size, camps.length], ['Wrecks plundered', wrecks.filter((w) => done.has(w.key)).length, wrecks.length], ['Beasts hunted', hunts.filter((h) => done.has(h.key)).length, hunts.length]],
    quit: () => { save(true); for (const f of foes) f.model.g.removeFromParent(); foes.length = 0; mode = 'title'; $('hud').hidden = true; ui.title(); }, shipPos: () => (PL.mode === 'ship' ? { x: PL.x, z: PL.z } : PL.shipPos),
  });
  input.canLock = () => mode === 'play' || mode === 'dialog';
  input.onUnlock = () => { if (mode === 'play') ui.open('menu'); };
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });
  window.addEventListener('pointerdown', () => { if (mode !== 'title' && mode !== 'loading') initAudio(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (mode === 'play') ui.open('menu'); suspendAudio(true); } else suspendAudio(false); });
  window.addEventListener('pagehide', () => save(true));
  window.__a = { known, done, forts, towers, wrecks, hunts, camps, input, get camYaw() { return camYaw; }, cities, spawnFoe, get obs() { return allObs; }, PL, G, S, world, foes, npcs, QS, discovered, get mode() { return mode; }, get tracked() { return tracked; }, get prompt() { return prompt; }, trackedTarget,
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
