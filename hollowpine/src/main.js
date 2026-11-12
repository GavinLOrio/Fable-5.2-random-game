// Hollowpine: main loop. Player, combat, gathering, building, farming, weather, day and night, saving.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ITEMS, RECIPES, TECH_BY_ID, TECH_GRANTS, STRUCT_BY_ID, LOOT, CROPS, WEATHER } from './data.js';
import { createWorld, HALF, LAKE } from './world.js';
import { createBuild } from './build.js';
import { createMobs, rollLoot } from './entities.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { viewModel } from './models.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1));
const SAVE_KEY = 'hollowpine.save.v1', SET_KEY = 'hollowpine.settings.v1', DAY = 24 * 60;
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
const coarse = matchMedia('(pointer: coarse)').matches;
const settings = Object.assign({ quality: coarse ? 0 : 1, sens: 1, vol: 0.7, invert: 0 }, store.get(SET_KEY) || {});
const Q = [{ pr: 1, shadow: 0, grass: 44, near: 130 }, { pr: 1.5, shadow: 2048, grass: 70, near: 210 }, { pr: 2, shadow: 4096, grass: 96, near: 280 }][settings.quality];

// ---------------------------------------------------------------- renderer and sky
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: settings.quality > 0, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = Q.shadow > 0; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(72, 1, 0.07, 4200); camera.rotation.order = 'YXZ'; scene.add(camera);
scene.fog = new THREE.FogExp2(0x9fb4c0, 0.0016);
const sky = new Sky(); sky.scale.setScalar(4000); scene.add(sky);
const su = sky.material.uniforms; su.turbidity.value = 5; su.rayleigh.value = 1.5; su.mieCoefficient.value = 0.0025; su.mieDirectionalG.value = 0.85;
const dome = new THREE.Mesh(new THREE.SphereGeometry(1900, 16, 10), new THREE.MeshBasicMaterial({ color: 0x8a949a, side: THREE.BackSide, transparent: true, opacity: 0, fog: false, depthWrite: false })); dome.renderOrder = -1; scene.add(dome);
const stars = (() => { const n = 1400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, y = Math.random() * 0.95 + 0.03, r = Math.sqrt(1 - y * y); p[i * 3] = Math.cos(a) * r * 1800; p[i * 3 + 1] = y * 1800; p[i * 3 + 2] = Math.sin(a) * r * 1800; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); m.frustumCulled = false; scene.add(m); return m; })();
const hemi = new THREE.HemisphereLight(0xbfd4e6, 0x4a4634, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.5); scene.add(sun, sun.target);
if (Q.shadow) { sun.castShadow = true; sun.shadow.mapSize.setScalar(Q.shadow); const c = sun.shadow.camera; c.left = c.bottom = -75; c.right = c.top = 75; c.near = 1; c.far = 420; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.06; }
const pool = [...Array(4)].map(() => { const l = new THREE.PointLight(0xffb060, 0, 26, 1.6); scene.add(l); return l; });
const handLight = new THREE.PointLight(0xffa850, 0, 20, 1.5); handLight.position.set(0.3, 0.1, -0.4); camera.add(handLight);
const flash = new THREE.SpotLight(0xf4f6ff, 0, 60, 0.42, 0.5, 1.2); flash.position.set(0.15, -0.1, 0); camera.add(flash, flash.target); flash.target.position.set(0, 0, -5);
const muzzleLight = new THREE.PointLight(0xffc070, 0, 14, 1.5); muzzleLight.position.set(0.2, -0.1, -1); camera.add(muzzleLight);
// sky reflections for metal, water and skin
const pmrem = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(), envSky = new THREE.Mesh(sky.geometry, sky.material); envSky.scale.setScalar(1000); envScene.add(envSky);
const envDome = new THREE.Mesh(new THREE.SphereGeometry(900, 12, 8), dome.material); envScene.add(envDome);
let envRT = null, envT = 0;
function envUpdate(dt) { envT -= dt; if (envT > 0) return; envT = 9; const rt = pmrem.fromScene(envScene, 0, 1, 2000); if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture; }
// drifting clouds
const cloudU = { uT: { value: 0 }, uCover: { value: 0.35 }, uCol: { value: new THREE.Color(1, 1, 1) }, uShade: { value: new THREE.Color(0.6, 0.65, 0.72) }, uOff: { value: new THREE.Vector2() } };
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.ShaderMaterial({ uniforms: cloudU, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vP; varying vec2 vL; uniform vec2 uOff; void main(){ vL = position.xy; vP = position.xy + uOff; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec2 vP; varying vec2 vL; uniform float uT; uniform float uCover; uniform vec3 uCol; uniform vec3 uShade;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + 17.0; a *= 0.5; } return s; }
  void main(){ vec2 p = vP * 0.00042 + vec2(uT * 0.006, uT * 0.0025); float d = fbm(p) + 0.35 * fbm(p * 3.1 - uT * 0.004);
    float a = smoothstep(1.02 - uCover, 1.32 - uCover * 0.8, d); float lit = smoothstep(0.0, 0.5, fbm(p + 0.03) - d + 0.22);
    float fade = 1.0 - smoothstep(2600.0, 6800.0, length(vL)); gl_FragColor = vec4(mix(uShade, uCol, lit), a * fade * 0.94);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` }));
clouds.rotation.x = -Math.PI / 2; clouds.renderOrder = -0.5; clouds.frustumCulled = false; scene.add(clouds);
// post-processing: bloom, colour grade and vignette (medium and high graphics)
let composer = null, bloom = null;
if (settings.quality > 0) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.6, 2.6); composer.addPass(bloom);
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = mix(vec3(l), c.rgb, 1.14); c.rgb = c.rgb * vec3(1.03, 1.0, 0.96); vec2 q = vUv - 0.5; c.rgb *= 1.0 - dot(q, q) * 0.55; gl_FragColor = c; }' }));
  composer.addPass(new OutputPass());
}
const draw = () => { if (composer) composer.render(); else renderer.render(scene, camera); };
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- state
const P = { x: 0, y: 0, z: 0, vy: 0, yaw: 0, pitch: 0, hp: 100, food: 100, water: 100, stam: 100, crouch: false, dead: false, lit: false, moving: false, ground: true, swim: false, stamWait: 0, vx: 0, vz: 0 };
const G = { P, inv: {}, hot: Array(8).fill(null), sel: 0, mags: {}, armor: null, tech: new Set(), time: 0, chest: null, settings, spawn: null, pack: null };
let W, Bd, M, U, started = false, lastSaveAt = 0, weather = { id: 'clear', t: 240 }, wx = { rain: 0, fog: 1, light: 1, sight: 1, cloud: 0 };
const audio = createAudio(), input = createInput(canvas);
input.onFirst = () => audio.init();
G.sfx = (name, at) => audio.play(name, at ? Math.hypot(at.x - P.x, at.z - P.z) : 0);
G.dayFloat = () => G.time / DAY + 8 / 24; G.day = () => Math.floor(G.dayFloat()); const tod = () => (G.dayFloat() % 1) * 24;
G.isNight = () => { const t = tod(); return t < 5.5 || t > 19.5; };
G.sightK = () => wx.sight;
G.count = (id) => G.inv[id] || 0;
G.give = (id, n = 1, quiet) => {
  const it = ITEMS[id]; if (!it || n <= 0) return 0; const add = Math.min(n, it.max - G.count(id)); if (add <= 0) { if (!quiet) U.toast(`Cannot carry more ${it.n}`, 'bad'); return 0; }
  G.inv[id] = G.count(id) + add; if (!quiet) U.gain(id, add);
  if (['tool', 'weapon', 'food', 'med', 'seed'].includes(it.cat) && !G.hot.includes(id)) { const i = G.hot.indexOf(null); if (i >= 0) G.hot[i] = id; }
  dirty = true; return add;
};
G.take = (id, n = 1) => { const c = G.count(id); if (c < n) return false; G.inv[id] = c - n; if (!G.inv[id]) { delete G.inv[id]; if (G.armor === id) G.armor = null; } dirty = true; return true; };
G.select = (i) => { if (G.sel !== i) { G.sel = i; reloadT = 0; drawT = 0; swingT = 0; G.sfx('ui'); } };
G.assign = (slot, id) => { const old = G.hot.indexOf(id); if (old >= 0) G.hot[old] = G.hot[slot]; G.hot[slot] = id; };
G.wear = (id) => { G.armor = G.armor === id ? null : id; G.sfx('craft'); };
G.homes = () => Bd.structs.filter((s) => s.done && (s.type === 'leanto' || s.type.startsWith('research')));
let dirty = false;

// stations
const nearStruct = (pred, r) => Bd.near(P.x, P.z, r, (s) => pred(s) && Math.abs(s.y - P.y) < 4);
G.tableLevel = () => { let l = 0; for (const s of Bd.structs) if (s.done && s.type.startsWith('research') && Math.hypot(s.x - P.x, s.z - P.z) < 8 && Math.abs(s.y - P.y) < 4) l = Math.max(l, +s.type.slice(8)); return l; };
const freshNear = () => (Math.hypot(P.x - LAKE.x, P.z - LAKE.z) < LAKE.r + 4 && W.H(P.x, P.z) < LAKE.y + 1.2) || !!nearStruct((s) => s.type === 'collector' && s.water > 0, 3.5);
const grantsAmmo = (id) => Object.entries(TECH_GRANTS).some(([t, list]) => list.includes(id) && G.tech.has(t));
G.recipeState = (r) => {
  const isAmmo = Object.values(TECH_GRANTS).some((l) => l.includes(r.id));
  if ((TECH_BY_ID[r.id] && !G.tech.has(r.id)) || (isAmmo && !grantsAmmo(r.id))) return { ok: false, locked: true, why: 'Not researched' };
  if (r.tier > G.tableLevel()) return { ok: false, why: 'Needs table ' + 'I'.repeat(r.tier) };
  if (r.st === 'fire' && !nearStruct((s) => s.type === 'campfire' || s.type === 'furnace', 4.5)) return { ok: false, why: 'Needs campfire' };
  if (r.st === 'furnace' && !nearStruct((s) => s.type === 'furnace', 4.5)) return { ok: false, why: 'Needs furnace' };
  if (r.st === 'water' && !freshNear()) return { ok: false, why: 'Needs fresh water' };
  for (const k in r.cost) if (G.count(k) < r.cost[k]) return { ok: false, why: 'Missing materials' };
  if (ITEMS[r.id].max === 1 && G.count(r.id)) return { ok: false, why: 'Already have' };
  return { ok: true };
};
G.craft = (r, times) => { let made = 0; for (let i = 0; i < times; i++) { if (!G.recipeState(r).ok) break; for (const k in r.cost) G.take(k, r.cost[k]); G.give(r.id, r.n); made++; if (r.st === 'water') { const c = nearStruct((s) => s.type === 'collector' && s.water > 0, 3.5); if (c && !(Math.hypot(P.x - LAKE.x, P.z - LAKE.z) < LAKE.r + 4)) c.water--; } } if (made) G.sfx('craft'); else G.sfx('deny'); };
G.techState = (t) => G.tech.has(t.id) ? 'done' : G.tableLevel() < t.tier ? 'table' : t.req && !G.tech.has(t.req) ? 'req' : G.count('scrap') < t.cost ? 'poor' : 'ok';
G.research = (id) => { const t = TECH_BY_ID[id]; if (G.techState(t) !== 'ok') return; G.take('scrap', t.cost); G.tech.add(id); G.sfx('research'); U.toast(`Learned: ${t.n || ITEMS[id].n}`, 'big', 3500); saveNow(); };
G.useItem = (id) => {
  const it = ITEMS[id]; if (!G.count(id) || !(it.food || it.water || it.hp)) return false;
  if (it.hp > 0 && !it.food && !it.water && P.hp >= 100) { U.toast('Already at full health'); return false; }
  G.take(id); P.food = clamp(P.food + (it.food || 0), 0, 100); P.water = clamp(P.water + (it.water || 0), 0, 100); P.hp = clamp(P.hp + (it.hp || 0), 1, 100); if (it.gives) G.give(it.gives, 1, true);
  G.sfx('eat'); return true;
};
G.startBuild = (id) => { U.close(); Bd.start(id); U.toast(`Blueprint: ${STRUCT_BY_ID[id].n}`); };
G.chestMove = (id, toChest) => { const c = G.chest; if (!c) return; if (toChest) { const n = G.count(id); G.take(id, n); c.inv[id] = (c.inv[id] || 0) + n; } else { const got = G.give(id, c.inv[id], true); c.inv[id] -= got; if (!c.inv[id]) delete c.inv[id]; } G.sfx('pickup'); };
G.setSetting = (k, v) => { settings[k] = v; store.set(SET_KEY, settings); if (k === 'vol') audio.setVol(v); };
G.onClose = () => { input.reset(); if (!input.touch) input.lock(); saveNow(); };
G.saveInfo = () => `Day ${G.day() + 1}. ${cloudDoc ? 'Saved to this browser and to your Claude account.' : 'Saved to this browser.'} The game saves by itself every few seconds.`;
G.saveNow = (loud) => { saveNow(true); if (loud) U.toast('Game saved'); };
G.newGame = async () => { store.del(SAVE_KEY); noSave = true; if (cloudDoc) { try { await cloudDoc.set({ t: Date.now(), json: '' }); } catch (e) { /* ignore */ } } location.reload(); };
let noSave = false;

// ---------------------------------------------------------------- saving (browser + private cloud copy)
let cloudDoc = null, cloudAt = 0, cloudBusy = false, cloudSave = null;
const cloudReady = (async () => {
  try {
    if (!window.claude || !window.claude.use) return; const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); if (!db || !user) return; const id = await user.id(); if (!id) return;
    const doc = db.collection('data/users/' + id).doc('save'), snap = await doc.get(); cloudDoc = doc; if (snap.exists) { const d = snap.data(); if (d && d.json) cloudSave = JSON.parse(d.json); }
  } catch (e) { /* cloud save unavailable: the browser copy still works */ }
})();
function snapshot() {
  const T = W.trees, felled = []; for (let i = 0; i < T.alive.length; i++) if (!T.alive[i]) felled.push(i);
  return { v: 1, t: Date.now(), time: Math.round(G.time), P: { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), yaw: +P.yaw.toFixed(3), hp: Math.round(P.hp), food: Math.round(P.food), water: Math.round(P.water) }, inv: G.inv, hot: G.hot, sel: G.sel, mags: G.mags, armor: G.armor, tech: [...G.tech], structs: Bd.save(), felled, nodes: W.nodes.filter((n) => !n.alive).map((n) => [n.id, +n.day.toFixed(2)]), cont: W.containers.filter((c) => c.day > -50 && c.id != null).map((c) => [c.id, +c.day.toFixed(2)]), pois: W.pois.filter((p) => p.found).map((p) => p.id), weather, spawn: G.spawn, pack: G.pack };
}
function saveNow(cloud) {
  if (!started || noSave || P.dead) return; const s = snapshot(), json = JSON.stringify(s); try { localStorage.setItem(SAVE_KEY, json); } catch (e) { /* ignore */ } lastSaveAt = performance.now(); dirty = false;
  if (cloudDoc && !cloudBusy && (cloud || performance.now() - cloudAt > 45000) && json.length < 240000) { cloudBusy = true; cloudAt = performance.now(); cloudDoc.set({ t: s.t, json }).catch(() => {}).then(() => { cloudBusy = false; }); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(true); });
window.addEventListener('pagehide', () => saveNow(true));
try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => { saveNow(true); return {}; }); } catch (e) { /* ignore */ }
function applySave(s) {
  G.time = s.time || 0; Object.assign(P, s.P); P.stam = 100; P.vy = 0; P.dead = false; G.inv = s.inv || {}; for (const k in G.inv) if (!ITEMS[k]) delete G.inv[k];
  G.hot = (s.hot || []).map((h) => (ITEMS[h] ? h : null)); while (G.hot.length < 8) G.hot.push(null); G.sel = s.sel || 0; G.mags = s.mags || {}; G.armor = s.armor || null; G.tech = new Set(s.tech || []);
  Bd.load(s.structs); for (const i of s.felled || []) W.fellTree(i, true); for (const [id, day] of s.nodes || []) if (W.nodes[id]) W.setNode(W.nodes[id], false, day);
  for (const [id, day] of s.cont || []) if (W.containers[id]) W.containers[id].day = day; for (const id of s.pois || []) { const p = W.pois.find((q) => q.id === id); if (p) p.found = true; }
  if (s.weather && WEATHER[s.weather.id]) weather = s.weather; G.spawn = s.spawn || null; G.pack = s.pack || null; if (G.pack) placePack();
}

// ---------------------------------------------------------------- effects
const tracers = [...Array(20)].map(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.7 })); l.frustumCulled = false; l.visible = false; scene.add(l); return { l, t: 0 }; });
let tri = 0;
function tracer(ax, ay, az, bx, by, bz) { const q = tracers[tri++ % tracers.length], p = q.l.geometry.attributes.position; p.setXYZ(0, ax, ay, az); p.setXYZ(1, bx, by, bz); p.needsUpdate = true; q.l.visible = true; q.t = 0.07; }
const PN = 420, pPos = new Float32Array(PN * 3).fill(-999), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pGrav = new Float32Array(PN);
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const parts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })); parts.frustumCulled = false; scene.add(parts);
let pi = 0; const tc = new THREE.Color();
function burst(x, y, z, color, n, speed = 2.5, grav = 9, life = 0.6) { tc.set(color); for (let i = 0; i < n; i++) { const k = pi++ % PN; pPos[k * 3] = x; pPos[k * 3 + 1] = y; pPos[k * 3 + 2] = z; pVel[k * 3] = (Math.random() - 0.5) * speed; pVel[k * 3 + 1] = Math.random() * speed * 0.8; pVel[k * 3 + 2] = (Math.random() - 0.5) * speed; const j = 0.75 + Math.random() * 0.5; pCol[k * 3] = tc.r * j; pCol[k * 3 + 1] = tc.g * j; pCol[k * 3 + 2] = tc.b * j; pLife[k] = life * (0.6 + Math.random() * 0.8); pGrav[k] = grav; } }
function fxUpdate(dt) {
  for (const q of tracers) if (q.t > 0) { q.t -= dt; if (q.t <= 0) q.l.visible = false; }
  for (let k = 0; k < PN; k++) { if (pLife[k] <= 0) continue; pLife[k] -= dt; if (pLife[k] <= 0) { pPos[k * 3 + 1] = -999; continue; } pVel[k * 3 + 1] -= pGrav[k] * dt; pPos[k * 3] += pVel[k * 3] * dt; pPos[k * 3 + 1] += pVel[k * 3 + 1] * dt; pPos[k * 3 + 2] += pVel[k * 3 + 2] * dt; }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  if (muzzleLight.intensity > 0) muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 400);
}
// rain and snow
const RN = 1600, rPos = new Float32Array(RN * 6), rSeed = new Float32Array(RN * 3);
for (let i = 0; i < RN; i++) { rSeed[i * 3] = Math.random() * 40 - 20; rSeed[i * 3 + 1] = Math.random() * 26; rSeed[i * 3 + 2] = Math.random() * 40 - 20; }
const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
const rainMat = new THREE.LineBasicMaterial({ color: 0xb8c8d4, transparent: true, opacity: 0.45, depthWrite: false }), rain = new THREE.LineSegments(rGeo, rainMat); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
function rainUpdate(dt, snow) {
  const n = Math.floor(RN * clamp(wx.rain * 1.3, 0, 1)); rain.visible = n > 8; if (!rain.visible) return; rGeo.setDrawRange(0, n * 2);
  const sp = snow ? 2.6 : 26, len = snow ? 0.05 : 0.7, wind = snow ? 1.2 : 3; rainMat.opacity = snow ? 0.9 : 0.42;
  for (let i = 0; i < n; i++) { let y = rSeed[i * 3 + 1] - sp * dt; if (y < -2) y += 26; rSeed[i * 3 + 1] = y; let x = rSeed[i * 3] + wind * dt; if (x > 20) x -= 40; rSeed[i * 3] = x; const wxp = P.x + x, wz = P.z + rSeed[i * 3 + 2], wy = P.y + y; rPos[i * 6] = wxp; rPos[i * 6 + 1] = wy; rPos[i * 6 + 2] = wz; rPos[i * 6 + 3] = wxp + wind * len / sp * 4; rPos[i * 6 + 4] = wy + len; rPos[i * 6 + 5] = wz; }
  rGeo.attributes.position.needsUpdate = true;
}
// arrows in flight
const arrows = [], arrowGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.8, 5).rotateX(Math.PI / 2), arrowMat = new THREE.MeshLambertMaterial({ color: 0xc9b17a });
function shootArrow(dir, speed, dmg) { const m = new THREE.Mesh(arrowGeo, arrowMat); scene.add(m); arrows.push({ m, x: camera.position.x + dir.x * 0.5, y: camera.position.y - 0.08 + dir.y * 0.5, z: camera.position.z + dir.z * 0.5, vx: dir.x * speed, vy: dir.y * speed, vz: dir.z * speed, dmg, life: 6, stuck: 0 }); }
function arrowsUpdate(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i]; if (a.stuck) { a.stuck -= dt; if (a.stuck <= 0) { scene.remove(a.m); arrows.splice(i, 1); } continue; }
    a.vy -= 12 * dt; const sp = Math.hypot(a.vx, a.vy, a.vz), dx = a.vx / sp, dy = a.vy / sp, dz = a.vz / sp, step = sp * dt;
    const tm = M.ray(a.x, a.y, a.z, dx, dy, dz, step), mob = M.hit.m, head = M.hit.head, tw = W.ray(a.x, a.y, a.z, dx, dy, dz, step);
    if (mob && tm <= tw) { hitMob(mob, a.dmg, head, a.x + dx * tm, a.y + dy * tm, a.z + dz * tm); scene.remove(a.m); arrows.splice(i, 1); continue; }
    const t = Math.min(tw, step); a.x += dx * t; a.y += dy * t; a.z += dz * t; a.m.position.set(a.x, a.y, a.z); a.m.lookAt(a.x + dx, a.y + dy, a.z + dz);
    if (tw < step) { a.stuck = 25; G.sfx('thud', a); } a.life -= dt; if (a.life <= 0) { scene.remove(a.m); arrows.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- combat
let vm = null, vmId = '', swingT = 0, swingDur = 0.5, swingHit = false, cd = 0, reloadT = 0, reloadDur = 1, drawT = 0, kick = 0, ads = 0, firePrev = false, bob = 0, hitT = 0, vigT = 0, useT = 0, dismT = 0, torchOn = false, flashOn = false;
const hand = new THREE.Group(); camera.add(hand);
const vmCache = {};
const held = () => { const id = G.hot[G.sel]; return id && G.count(id) ? id : null; };
function setVM(id) { const key = id && ITEMS[id].w ? id : 'fists'; if (key === vmId) return; vmId = key; if (vm) hand.remove(vm); vm = vmCache[key] || (vmCache[key] = viewModel(key)); hand.add(vm); }
const fwd = new THREE.Vector3(), tmpV = new THREE.Vector3();
function viewDir(spreadDeg = 0) { camera.getWorldDirection(fwd); if (spreadDeg) { const s = spreadDeg * Math.PI / 180; fwd.x += (Math.random() - 0.5) * 2 * s; fwd.y += (Math.random() - 0.5) * 2 * s; fwd.z += (Math.random() - 0.5) * 2 * s; fwd.normalize(); } return fwd; }
function hitMob(m, dmg, head, x, y, z) { const dead = M.damage(m, dmg, head); burst(x, y, z, 0xa01818, head ? 12 : 7, 2.4, 9, 0.5); G.sfx('hit', m); hitT = 0.18; $('hitm').className = dead ? 'kill' : ''; }
function muzzleWorld(out) { const mz = vm && vm.userData.muzzle; out.set(mz ? mz[0] : 0, mz ? mz[1] : 0, mz ? mz[2] : -0.6); return vm ? vm.localToWorld(out) : camera.localToWorld(out); }
function fireGun(id, w) {
  G.mags[id]--; cd = 60 / w.rpm; kick = Math.min(1.6, kick + w.recoil * 0.22); P.pitch += w.recoil * 0.0065 * (ads > 0.5 ? 0.7 : 1); P.yaw += (Math.random() - 0.5) * w.recoil * 0.004;
  const o = camera.position, mz = muzzleWorld(tmpV).clone(), spread = w.spread * (ads > 0.5 ? 0.35 : 1) * (P.moving ? 1.35 : 1) * (P.crouch ? 0.8 : 1);
  for (let i = 0; i < w.pellets; i++) {
    const d = viewDir(spread), max = w.range * 2.2, tm = M.ray(o.x, o.y, o.z, d.x, d.y, d.z, max), mob = M.hit.m, head = M.hit.head, tw = W.ray(o.x, o.y, o.z, d.x, d.y, d.z, max), t = Math.min(tm, tw), hx = o.x + d.x * t, hy = o.y + d.y * t, hz = o.z + d.z * t;
    if (i < 3) tracer(mz.x, mz.y, mz.z, hx, hy, hz);
    if (mob && tm <= tw) hitMob(mob, w.dmg * (t > w.range ? 0.55 : 1), head, hx, hy, hz);
    else if (t < max) { const k = W.rayHit.kind; burst(hx, hy, hz, k === 'tree' ? 0x8a6a45 : k === 'terrain' ? 0x6a5a40 : 0xb0b0a8, 5, 2, 8, 0.4); if (k === 'solid' && W.rayHit.ref.struct && !W.rayHit.ref.struct.def.snap) { /* own structures take no bullet damage */ } }
  }
  muzzleLight.intensity = 85; burst(mz.x, mz.y, mz.z, 0xffd080, 4, 3, 0, 0.06); if (w.smoke) burst(mz.x, mz.y, mz.z, 0xb8b4aa, 16, 1.6, -1.2, 1.6);
  G.sfx('shot_' + w.ammo); M.alertNear(P.x, P.z, 95); dirty = true;
}
function startReload(id, w) { if (reloadT > 0 || (G.mags[id] || 0) >= w.mag || !G.count(w.ammo)) return; reloadT = reloadDur = w.reload; G.sfx('reload'); }
function finishReload(id, w) { const need = w.mag - (G.mags[id] || 0), n = Math.min(need, G.count(w.ammo)); G.take(w.ammo, n); G.mags[id] = (G.mags[id] || 0) + n; G.sfx('reload'); }
const nearNodes = [], nearTrees = [];
function meleeHit(id, w) {
  const o = camera.position, d = viewDir(), tm = M.ray(o.x, o.y, o.z, d.x, d.y, d.z, w.range), mob = M.hit.m, head = M.hit.head, tw = W.ray(o.x, o.y, o.z, d.x, d.y, d.z, w.range);
  if (mob && tm <= tw + 0.3) { hitMob(mob, w.dmg, head, o.x + d.x * tm, o.y + d.y * tm, o.z + d.z * tm); return; }
  const hx = o.x + d.x * tw, hy = o.y + d.y * tw, hz = o.z + d.z * tw, kind = W.rayHit.kind, ref = W.rayHit.ref;
  if (kind === 'tree') {
    if (!w.tree) { U.toast('You need an axe to fell trees', 'bad'); G.sfx('thud'); return; }
    const T = W.trees; T.hp[ref] -= 17 * w.tree / T.s[ref]; G.sfx('chop'); burst(hx, hy, hz, 0xc9a26a, 7, 2.6, 9, 0.5); if (Math.random() < 0.3) G.give('stick', 1);
    if (T.hp[ref] <= 0) { W.fellTree(ref); G.sfx('fall'); const type = T.type[ref]; G.give('log', type === 2 ? 2 : Math.round(3 + T.s[ref] * 1.6)); G.give('stick', ri(1, 3)); }
    return;
  }
  // rocks, ore and wrecks
  let node = kind === 'solid' && ref.node && ref.node.alive ? ref.node : null;
  if (!node) { W.nodesNear(o.x + d.x * 1.6, o.z + d.z * 1.6, 2.6, nearNodes); let bd = 2.4; for (const n of nearNodes) { const t = W.NODE_TYPES[n.type]; if (!n.alive || !t.mine) continue; const dd = Math.hypot(n.x - o.x - d.x * 1.4, n.z - o.z - d.z * 1.4); if (dd < bd) { bd = dd; node = n; } } }
  if (node) {
    const t = W.NODE_TYPES[node.type], pw = t.any ? Math.max(w.ore, w.tree, 0.5) : w.ore; if (!pw) { U.toast('You need a pickaxe for this', 'bad'); G.sfx('thud'); return; }
    node.hp -= 22 * pw; G.sfx('mine'); burst(hx, hy, hz, t.any ? 0xc98a3c : 0xa0a0a0, 7, 3, 9, 0.5); for (const k in t.mine) { const n = ri(t.mine[k][0], t.mine[k][1]); if (n) G.give(k, n); }
    if (node.hp <= 0) { W.setNode(node, false, G.dayFloat()); burst(node.x, node.y + 0.5, node.z, 0x8a8a8a, 18, 4, 9, 0.8); }
    return;
  }
  if (tw < w.range) { G.sfx('thud'); burst(hx, hy, hz, 0x8a8068, 3, 1.5, 9, 0.3); }
}
function combat(dt) {
  const id = held(), it = id && ITEMS[id], w = it && it.w ? it.w : { kind: 'melee', dmg: 8, range: 2.1, rate: 0.5, tree: 0, ore: 0, stam: 4 };
  setVM(id); cd -= dt; const fire = input.fire, pressed = fire && !firePrev; firePrev = fire;
  const aiming = input.aim && w.kind !== 'melee' && reloadT <= 0 && !P.swim; ads = clamp(ads + (aiming ? dt : -dt) * 6, 0, 1);
  torchOn = id === 'torch';
  if (Bd.placing || P.swim) { drawT = 0; return w; }
  if (it && !it.w) { if (pressed && (it.food || it.water || it.hp) && cd <= 0) { if (G.useItem(id)) cd = 0.5; } return w; }
  if (w.kind === 'melee') {
    if (fire && swingT <= 0 && cd <= 0 && P.stam > w.stam) { swingT = swingDur = w.rate; swingHit = false; P.stam -= w.stam; P.stamWait = 0.8; G.sfx('swing'); }
    if (swingT > 0) { swingT -= dt; if (!swingHit && swingT < swingDur * 0.55) { swingHit = true; meleeHit(id, w); } }
  } else if (w.kind === 'gun' || w.reload) {
    const mag = G.mags[id] || 0, cap = w.mag || 1;
    if (reloadT > 0) { reloadT -= dt; if (reloadT <= 0) finishReload(id, { mag: cap, ammo: w.ammo }); }
    else if ((w.auto ? fire : pressed) && cd <= 0) {
      if (mag > 0) { if (w.kind === 'gun') fireGun(id, w); else { G.mags[id]--; cd = 0.4; shootArrow(viewDir(0.4).clone(), w.speed, w.dmg); G.sfx('bow'); kick = 0.6; } if (!G.mags[id] && G.count(w.ammo)) setTimeout(() => { if (held() === id) startReload(id, { mag: cap, ammo: w.ammo, reload: w.reload }); }, 250); }
      else if (G.count(w.ammo)) startReload(id, { mag: cap, ammo: w.ammo, reload: w.reload }); else { G.sfx('empty'); cd = 0.3; if (pressed) U.toast(`No ${ITEMS[w.ammo].n}`, 'bad'); }
    }
    if (input.hit('reload')) startReload(id, { mag: cap, ammo: w.ammo, reload: w.reload });
  } else {   // hunting bow: hold to draw
    if (fire && G.count(w.ammo) && cd <= 0) drawT = Math.min(w.draw, drawT + dt);
    else if (drawT > 0) { if (drawT > 0.15) { const k = drawT / w.draw; G.take(w.ammo); shootArrow(viewDir(1.2 * (1 - k)).clone(), w.speed * (0.35 + 0.65 * k), w.dmg * (0.3 + 0.7 * k)); G.sfx('bow'); cd = 0.35; } drawT = 0; }
    else if (pressed && !G.count(w.ammo)) U.toast('No arrows', 'bad');
  }
  return w;
}
function poseVM(dt, w) {
  if (!vm) return; const sway = Math.sin(bob) * 0.012 * (P.moving ? 1 : 0.2), sw2 = Math.abs(Math.cos(bob)) * 0.014 * (P.moving ? 1 : 0.15);
  kick = Math.max(0, kick - dt * 7);
  const scoped = w.scope && ads > 0.85; vm.visible = !scoped && !Bd.placing; $('scope').hidden = !scoped;
  if (vm.userData.melee) {
    const s = swingT > 0 ? 1 - swingT / swingDur : 0, a = Math.sin(s * Math.PI);
    vm.scale.setScalar(0.62); vm.position.set(0.26 + sway, -0.27 - sw2, -0.5 - (vm.userData.thrust ? a * 0.4 : a * 0.12)); vm.rotation.set(vm.userData.thrust ? 0 : -a * 1.25 + 0.15, vm.userData.thrust ? 0.05 : -0.2 + a * 0.5, vm.userData.thrust ? 0 : -0.25 + a * 0.6);
    if (vmId === 'fists') { vm.position.set(0.17 + sway, -0.2 - sw2, -0.26 - a * 0.22); vm.rotation.set(0.2 - a * 0.3, 0, 0); }
    const f = vm.getObjectByName('flame'); if (f) f.scale.set(0.06, 0.16 + Math.random() * 0.08, 0.06);
  } else {
    const sight = vm.userData.sight || 0.04, rp = reloadT > 0 ? Math.sin((1 - reloadT / reloadDur) * Math.PI) : 0, bowK = vmId === 'bow' ? drawT / 0.75 : 0;
    const SC = 0.5, hx = vmId === 'bow' ? 0.13 : 0.15, hy = vmId === 'bow' ? -0.09 : -0.14, hz = -0.36; vm.scale.setScalar(SC);
    vm.position.set(lerp(hx, 0, ads) + sway * (1 - ads * 0.8), lerp(hy, -sight * SC, ads) - sw2 * (1 - ads * 0.8) - rp * 0.14, lerp(hz, -0.24, ads) + kick * 0.035 + bowK * 0.05);
    vm.rotation.set(kick * 0.09 - rp * 0.7, lerp(vmId === 'bow' ? 0 : 0.03, 0, ads), vmId === 'bow' ? -0.5 * (1 - bowK * 0.4) : rp * 0.4);
    const ar = vm.getObjectByName('arrow'); if (ar) ar.visible = vmId === 'bow' ? G.count('arrow') > 0 : (G.mags.crossbow || 0) > 0; const st = vm.getObjectByName('string'); if (st) st.position.z = -0.1 + bowK * 0.22;
  }
  camera.fov = lerp(camera.fov, 72 / lerp(1, w.zoom || 1, ads) + (input.sprint && P.moving && !P.crouch ? 5 : 0), Math.min(1, dt * 12)); camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------- player
const pp = { x: 0, z: 0 };
function movePlayer(dt) {
  const sens = 0.0023 * settings.sens * (ads > 0.5 ? 0.55 : 1) * (camera.fov / 72);
  P.yaw -= input.lookX * sens; P.pitch = clamp(P.pitch - input.lookY * sens * (settings.invert ? -1 : 1), -1.5, 1.5);
  if (input.hit('crouch')) P.crouch = !P.crouch;
  const wl = W.waterLevel(P.x, P.z), swim = P.y < wl - 1.15 && W.inWater(P.x, P.z); P.swim = swim; if (swim) P.crouch = false;
  const sprint = input.sprint && input.my > 0.3 && P.stam > 1 && !P.crouch && !swim && ads < 0.5, speed = swim ? 2.5 : P.crouch ? 2.1 : sprint ? 7.4 : 4.5;
  const sn = Math.sin(P.yaw), cs = Math.cos(P.yaw), wxv = (input.mx * cs - input.my * sn) * speed, wzv = (-input.mx * sn - input.my * cs) * speed, acc = Math.min(1, dt * (P.ground || swim ? 12 : 3));
  P.vx += (wxv - P.vx) * acc; P.vz += (wzv - P.vz) * acc; P.moving = Math.hypot(P.vx, P.vz) > 0.6;
  if (sprint && P.moving) { P.stam -= 9 * dt; P.stamWait = 0.7; }
  if (input.hit('jump') && (P.ground || swim) && P.stam > 8) { if (!swim) { P.vy = 6.8; P.stam -= 8; P.stamWait = 0.7; P.ground = false; } }
  pp.x = P.x + P.vx * dt; pp.z = P.z + P.vz * dt; pp.x = clamp(pp.x, -HALF + 12, HALF - 12); pp.z = clamp(pp.z, -HALF + 12, HALF - 12);
  // steep rock is not walkable uphill
  const h0 = W.H(P.x, P.z), h1 = W.H(pp.x, pp.z), run = Math.hypot(pp.x - P.x, pp.z - P.z); if (run > 1e-4 && (h1 - h0) / run > 1.25 && P.y < h0 + 0.3) { pp.x = P.x; pp.z = P.z; }
  const g1 = W.resolve(pp, 0.34, P.y, P.crouch ? 1.2 : 1.75); W.collideTrees(pp, 0.34); P.x = pp.x; P.z = pp.z;
  const ground = Math.max(W.H(P.x, P.z), g1);
  P.vy -= 20 * dt; P.y += P.vy * dt;
  if (swim || (P.y < wl - 1.2 && W.inWater(P.x, P.z))) { if (P.y < wl - 1.25) { P.y = Math.max(ground, lerp(P.y, wl - 1.25, Math.min(1, dt * 6))); P.vy = Math.max(P.vy, -1); if (P.y <= wl - 1.2 && P.y > ground) { P.vy = 0; } } P.stam -= 2.5 * dt; P.stamWait = 0.5; if (P.stam <= 0) hurt(4 * dt, null, true); }
  if (P.y <= ground) { if (P.vy < -13) hurt((-P.vy - 13) * 5, null); P.y = ground; P.vy = 0; P.ground = true; }
  else if (P.ground && P.vy <= 0 && P.y - ground < 0.45) { P.y = ground; P.vy = 0; }
  else P.ground = false;
  if (P.moving && P.ground) { const pb = bob; bob += dt * (sprint ? 13 : P.crouch ? 6 : 9); if (Math.floor(pb / Math.PI) !== Math.floor(bob / Math.PI)) G.sfx('step'); }
  const eye = (P.crouch ? 1.05 : 1.65) + (P.moving && P.ground ? Math.abs(Math.sin(bob)) * 0.045 : 0);
  camera.position.set(P.x, lerp(camera.position.y, P.y + eye, Math.min(1, dt * 18)), P.z); if (Math.abs(camera.position.y - P.y - eye) > 1.2) camera.position.y = P.y + eye;
  camera.rotation.set(P.pitch + kick * 0.012, P.yaw, 0);
}
function hurt(d, from, quiet) {
  if (P.dead) return; const armor = G.armor && from ? ITEMS[G.armor].armor : 0; P.hp -= d * (1 - armor); if (!quiet) { vigT = 0.5; G.sfx('hurt'); }
  if (P.hp <= 0) die(from);
}
G.hurtPlayer = (d, m) => hurt(d, m);
G.enemyShot = (m, hit) => {
  const ey = m.y + m.rig.h * 0.8, tx = P.x + (hit ? 0 : rnd(-1.2, 1.2)), ty = P.y + 1.3 + (hit ? 0 : rnd(-0.6, 0.8)), tz = P.z + (hit ? 0 : rnd(-1.2, 1.2));
  tracer(m.x, ey, m.z, tx, ty, tz); G.sfx(m.type === 'warlord' ? 'shot_carbine_ammo' : 'shot_rifle_ammo', m); if (hit) hurt(m.def.dmg, m);
};
G.hitStruct = (s, dmg, m) => { G.sfx('thud', m); burst(s.x, s.y + 1, s.z, 0x8a6a45, 5, 2, 9, 0.4); if (Bd.damage(s, dmg)) U.toast(`${s.def.n} destroyed`, 'bad'); dirty = true; };
let packMesh = null;
function placePack() { if (packMesh) scene.remove(packMesh); packMesh = null; if (!G.pack) return; packMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.35), new THREE.MeshLambertMaterial({ color: 0x7a4a34 })); packMesh.position.set(G.pack.x, G.pack.y + 0.2, G.pack.z); scene.add(packMesh); }
function die(from) {
  P.dead = true; P.hp = 0; const lost = {}; for (const k of Object.keys(G.inv)) if (['res', 'ammo', 'food', 'med', 'seed'].includes(ITEMS[k].cat)) { lost[k] = G.inv[k]; delete G.inv[k]; }
  G.pack = { x: P.x, y: Math.max(P.y, W.waterLevel(P.x, P.z)), z: P.z, inv: lost }; placePack();
  $('deadMsg').textContent = `${from ? `Killed by a ${from.def.n.toLowerCase()}` : 'The island took you'} on day ${G.day() + 1}. Your tools stay with you. Materials, food and ammunition lie in your pack where you fell.`;
  $('dead').hidden = false; input.unlock(); Bd.stop();
}
function respawn() {
  const s = G.spawn || startPos; P.x = s.x; P.z = s.z; P.y = s.y != null ? s.y : W.H(s.x, s.z); P.hp = 70; P.food = Math.max(P.food, 50); P.water = Math.max(P.water, 50); P.stam = 100; P.vy = 0; P.dead = false;
  $('dead').hidden = true; M.clear(); const t = tod(); G.time += ((t < 7 ? 7 - t : 31 - t) / 24) * DAY; noSaveFix(); if (!input.touch) input.lock();
}
const noSaveFix = () => { saveNow(true); };
$('btnRespawn').addEventListener('click', respawn);

// ---------------------------------------------------------------- interaction
let target = null, targetT = 0;
function findTarget() {
  const o = camera.position, d = viewDir(), ox = o.x, oy = o.y, oz = o.z;
  const s = Bd.target(ox, oy, oz, d.x, d.y, d.z, 4.2); if (s) return { kind: 'struct', s };
  const fx = ox + d.x * 1.5, fz = oz + d.z * 1.5, fy = oy + d.y * 1.5;
  const c = M.corpseNear(fx, fy - 0.6, fz, 2.2); if (c) return { kind: 'corpse', m: c };
  if (G.pack && Math.hypot(G.pack.x - fx, G.pack.z - fz) < 2.2) return { kind: 'pack' };
  let best = null, bd = 2.3; for (const q of W.containers) { const dd = Math.hypot(q.x - fx, q.y - fy, q.z - fz); if (dd < bd) { bd = dd; best = q; } } if (best) return { kind: 'crate', c: best };
  W.nodesNear(fx, fz, 2.2, nearNodes); bd = 1.9; for (const n of nearNodes) { if (!n.alive || !W.NODE_TYPES[n.type].give) continue; const dd = Math.hypot(n.x - fx, n.z - fz) + Math.abs(n.y - fy + 0.3) * 0.5; if (dd < bd) { bd = dd; best = n; } } if (best) return { kind: 'node', n: best };
  if (d.y < -0.25 && W.inWater(ox + d.x * 2, oz + d.z * 2) && oy - W.waterLevel(ox, oz) < 2.6) return { kind: 'water', fresh: W.waterLevel(ox + d.x * 2, oz + d.z * 2) > 1 };
  return null;
}
const seedFor = () => { const h = held(); if (h && ITEMS[h].crop) return h; return Object.keys(G.inv).find((k) => ITEMS[k].crop && G.inv[k] > 0) || null; };
function promptFor(t) {
  const K = (k, s) => `<kbd>${input.touch ? 'USE' : k}</kbd>${s}`;
  if (Bd.placing) return `<kbd>${input.touch ? 'HIT' : 'CLICK'}</kbd>${Bd.valid ? 'Place' : 'Cannot place here'} ${STRUCT_BY_ID[Bd.placing].n}<span class="need">${input.touch ? 'TURN rotates' : 'R or wheel rotates · Q cancels'}${Bd.snapped ? ' · snapped' : ''}</span>`;
  if (!t) return '';
  if (t.kind === 'struct') {
    const s = t.s, n = s.def.n;
    if (!s.done) return K('E', `Add material to ${n}`) + `<span class="need">${Bd.needs(s).map(([k, h, need]) => `<span class="${h < need && !G.count(k) ? 'lack' : ''}">${ITEMS[k].n} <b>${h}/${need}</b></span>`).join(' · ')}</span><span class="need">Hold X to cancel the blueprint</span>`;
    const hp = s.hp < s.def.hp ? `<span class="need">Condition ${Math.round(s.hp / s.def.hp * 100)}%</span>` : '';
    if (s.type === 'chest') return K('E', 'Open chest') + hp; if (s.type.startsWith('research')) return K('E', `Use ${n}`) + hp; if (s.type === 'door' || s.type === 'gate') return K('E', s.open ? 'Close' : 'Open') + hp;
    if (s.type === 'leanto') return K('E', 'Sleep until morning') + '<span class="need">Sets your respawn point</span>'; if (s.type === 'campfire' || s.type === 'furnace') return K('E', s.type === 'campfire' ? 'Cook and burn' : 'Smelt') + hp;
    if (s.type === 'collector') return s.water > 0 ? K('E', `Drink rainwater`) + `<span class="need">${s.water} of 6 measures</span>` : `Rain collector<span class="need">Empty. Fills when it rains.</span>`;
    if (s.type === 'plot' || s.type === 'planter') {
      if (!s.crop) { const sd = seedFor(); return sd ? K('E', `Plant ${ITEMS[sd].n}`) : `${n}<span class="need">You have no seeds. Search farms and houses, or harvest wild flax and berries.</span>`; }
      const c = CROPS[s.crop.id]; if (s.crop.g >= 1) return K('E', `Harvest ${c.n}`);
      return (s.crop.wet <= 0 && G.count('water_bottle') ? K('E', `Water the ${c.n.toLowerCase()}`) : c.n) + `<span class="need">${Math.floor(s.crop.g * 100)}% grown · ${s.crop.wet > 0 ? 'soil is moist' : 'soil is dry, growing slowly'}</span>`;
    }
    return n + hp;
  }
  if (t.kind === 'corpse') return K('E', `Search ${t.m.def.n.toLowerCase()}`);
  if (t.kind === 'pack') return K('E', 'Recover your pack');
  if (t.kind === 'crate') return G.dayFloat() - t.c.day < 6 ? `${t.c.n}<span class="need">Already searched</span>` : K('E', `Search ${t.c.n.toLowerCase()}`);
  if (t.kind === 'node') { const nt = W.NODE_TYPES[t.n.type]; return K('E', `${nt.verb} ${nt.n.toLowerCase()}`); }
  if (t.kind === 'water') return t.fresh ? K('E', 'Drink') : 'Sea water<span class="need">Too salty to drink</span>';
  return '';
}
function giveAll(obj) { for (const k in obj) G.give(k, obj[k]); }
function useTarget(t, first) {
  if (!t) return;
  if (t.kind === 'struct') {
    const s = t.s;
    if (!s.done) { if (useT > 0) return; useT = 0.13; const k = Bd.addOne(s, (id) => G.count(id) > 0, (id) => G.take(id)); if (k) { G.sfx(s.done ? 'done' : 'build'); if (s.done) { U.toast(`${s.def.n} built`, 'big'); saveNow(); } dirty = true; } else if (first) { G.sfx('deny'); U.toast('You are not carrying what it needs', 'bad'); } return; }
    if (!first) return;
    if (s.type === 'chest') { G.chest = s; input.unlock(); U.show('chest'); }
    else if (s.type.startsWith('research')) { input.unlock(); U.show('research'); }
    else if (s.type === 'campfire' || s.type === 'furnace') { input.unlock(); U.show('craft'); }
    else if (s.type === 'door' || s.type === 'gate') { Bd.toggle(s); G.sfx('place'); }
    else if (s.type === 'leanto') { const h = tod(); G.spawn = { x: P.x, y: P.y, z: P.z }; if (h > 19 || h < 5) { const skip = ((h < 6 ? 6 - h : 30 - h) / 24) * DAY; G.time += skip; growCrops(skip); P.stam = 100; P.food = Math.max(5, P.food - 12); P.water = Math.max(5, P.water - 14); P.hp = Math.min(100, P.hp + 25); M.clear(); U.toast('You slept until dawn', 'big'); } else U.toast('Respawn point set. You can only sleep after dark.'); saveNow(true); }
    else if (s.type === 'collector' && s.water > 0) { s.water--; P.water = Math.min(100, P.water + 35); G.sfx('eat'); }
    else if (s.type === 'plot' || s.type === 'planter') {
      if (!s.crop) { const sd = seedFor(); if (sd) { G.take(sd); s.crop = { id: ITEMS[sd].crop, g: 0, wet: wx.rain > 0.2 ? 1 : 0.5 }; Bd.setCrop(s); G.sfx('place'); } }
      else if (s.crop.g >= 1) { const c = CROPS[s.crop.id], k = s.type === 'plot' ? 1 : 0.66; for (const id in c.give) G.give(id, Math.max(1, Math.round(ri(c.give[id][0], c.give[id][1]) * k))); s.crop = null; Bd.setCrop(s); G.sfx('pickup'); }
      else if (s.crop.wet <= 0 && G.take('water_bottle')) { G.give('empty_bottle', 1, true); s.crop.wet = 1; G.sfx('eat'); U.toast('Watered'); }
      dirty = true;
    }
    return;
  }
  if (!first) return;
  if (t.kind === 'corpse') { giveAll(M.loot(t.m)); G.sfx('pickup'); }
  else if (t.kind === 'pack') { giveAll(G.pack.inv); G.pack = null; placePack(); G.sfx('pickup'); }
  else if (t.kind === 'crate') { if (G.dayFloat() - t.c.day < 6) return; t.c.day = G.dayFloat(); giveAll(rollLoot(LOOT[t.c.tier], 2 + t.c.tier)); G.sfx('pickup'); }
  else if (t.kind === 'node') { const nt = W.NODE_TYPES[t.n.type]; for (const k in nt.give) { const n = ri(nt.give[k][0], nt.give[k][1]); if (n) G.give(k, n); } if (nt.rare && Math.random() < nt.rare[1]) G.give(nt.rare[0], 1); W.setNode(t.n, false, G.dayFloat()); G.sfx('pickup'); }
  else if (t.kind === 'water' && t.fresh) { P.water = Math.min(100, P.water + 30); G.sfx('eat'); }
}
function growCrops(dt) {
  for (const s of Bd.structs) {
    if (s.type === 'collector' && s.done && wx.rain > 0.2) s.water = Math.min(6, s.water + dt / 45);
    if (!s.crop) continue; const c = CROPS[s.crop.id], was = s.crop.g; if (wx.rain > 0.2) s.crop.wet = 1; else s.crop.wet = Math.max(0, s.crop.wet - dt / DAY);
    if (was < 1) { s.crop.g = Math.min(1, was + dt / (c.days * DAY) * (s.crop.wet > 0 ? 1 : 0.35)); if (Math.floor(s.crop.g * 20) !== Math.floor(was * 20) || s.crop.g >= 1) Bd.growCrop(s); }
  }
}

// ---------------------------------------------------------------- weather and sky
let lightning = 0, nextBolt = 10;
function pickWeather() { const opts = Object.entries(WEATHER).filter(([k]) => k !== weather.id); let tot = 0; for (const [, v] of opts) tot += v.w; let q = Math.random() * tot; for (const [k, v] of opts) { q -= v.w; if (q <= 0) { weather = { id: k, t: rnd(150, 420) }; break; } } if (started) U.toast(`Weather: ${WEATHER[weather.id].n}`); }
const sunDir = new THREE.Vector3(), cDay = new THREE.Color(0xa9bfcc), cDusk = new THREE.Color(0xd8956a), cNight = new THREE.Color(0x05080d), cFog = new THREE.Color(), cGrey = new THREE.Color(0x7d868b), cTmp = new THREE.Color();
function skyUpdate(dt) {
  weather.t -= dt; if (weather.t <= 0) pickWeather();
  const wdef = WEATHER[weather.id], k = Math.min(1, dt / 6); wx.rain = lerp(wx.rain, wdef.rain, k); wx.fog = lerp(wx.fog, wdef.fog, k); wx.light = lerp(wx.light, wdef.light, k); wx.sight = lerp(wx.sight, wdef.sight, k); wx.cloud = lerp(wx.cloud, weather.id === 'clear' ? 0 : weather.id === 'fog' ? 0.75 : weather.id === 'overcast' ? 0.7 : 0.92, k);
  const a = (tod() - 6) / 12 * Math.PI, el = Math.sin(a), day = smooth(-0.08, 0.22, el), dusk = Math.max(0, 1 - Math.abs(el) * 4) * 0.8;
  sunDir.set(Math.cos(a) * 0.86, el, 0.42).normalize(); su.sunPosition.value.copy(sunDir);
  su.turbidity.value = 2.5 + wx.cloud * 14; su.rayleigh.value = lerp(2.4, 0.6, wx.cloud) + dusk * 1.2;
  cFog.copy(cNight).lerp(cDay, day).lerp(cDusk, dusk * day * (1 - wx.cloud)); cTmp.copy(cGrey).multiplyScalar(0.12 + day * 0.88 * (0.55 + wx.light * 0.45)); cFog.lerp(cTmp, wx.cloud);
  if (lightning > 0) { lightning -= dt; cFog.lerp(cTmp.set(0xdfe8ff), Math.min(1, lightning * 4)); }
  cFog.multiplyScalar(1.4);
  scene.fog.color.copy(cFog); scene.fog.density = lerp(scene.fog.density, 0.0015 * wx.fog * (1 + (1 - day) * 0.5), Math.min(1, dt)); dome.material.color.copy(cFog); dome.material.opacity = wx.cloud; dome.position.copy(camera.position);
  renderer.setClearColor(cFog);
  stars.material.opacity = (1 - day) * (1 - wx.cloud); stars.position.copy(camera.position); sky.position.copy(camera.position);
  const nightDir = el < 0.03; sun.color.setHSL(0.09 + day * 0.03, nightDir ? 0.25 : 0.55 - day * 0.3, nightDir ? 0.72 : 0.6 + day * 0.3); if (nightDir) sun.color.set(0x8fa8d8);
  sun.intensity = 1.4 * (nightDir ? 0.22 * (1 - wx.cloud * 0.7) : 0.25 + 2.5 * smooth(0.02, 0.5, el) * wx.light * (1 - wx.cloud * 0.55)) + (lightning > 0 ? 4 : 0);
  tmpV.copy(sunDir); if (nightDir) tmpV.set(-sunDir.x, Math.max(0.35, -sunDir.y), -sunDir.z).normalize();
  sun.position.set(P.x + tmpV.x * 180, P.y + tmpV.y * 180, P.z + tmpV.z * 180); sun.target.position.set(P.x, P.y, P.z);
  hemi.intensity = 1.4 * (0.3 + 1.75 * day * (0.45 + wx.light * 0.55)) + (lightning > 0 ? 2 : 0); hemi.color.copy(cFog).lerp(cTmp.set(0xffffff), 0.35); hemi.groundColor.setRGB(0.25, 0.23, 0.17);
  W.seaMat.color.setRGB(0.03 + 0.08 * day, 0.07 + 0.2 * day, 0.09 + 0.24 * day); W.lakeMat.color.setRGB(0.04 + 0.1 * day, 0.08 + 0.25 * day, 0.09 + 0.24 * day);
  if (weather.id === 'storm') { nextBolt -= dt; if (nextBolt <= 0) { nextBolt = rnd(5, 18); lightning = 0.28; setTimeout(() => audio.play('fall'), rnd(300, 2200)); } }
  rainUpdate(dt, P.y > 135);
  clouds.position.set(camera.position.x, 640, camera.position.z); cloudU.uOff.value.set(camera.position.x, -camera.position.z); cloudU.uT.value += dt; cloudU.uCover.value = 0.3 + wx.cloud * 0.75;
  const cb = (0.08 + day * 0.92) * 1.5; cloudU.uCol.value.setRGB(cb * (1 + dusk * 0.5), cb * (1 - dusk * 0.1), cb * (1 - dusk * 0.4)).multiplyScalar(1 - wx.cloud * 0.45 + (lightning > 0 ? 2 : 0)); cloudU.uShade.value.copy(cFog).multiplyScalar(0.8);
  scene.environmentIntensity = 0.05 + 0.14 * day * (0.5 + wx.light * 0.5); envUpdate(dt); if (W.windU) W.windU.w.value = 0.6 + wx.rain * 1.6 + wx.cloud * 0.5;
  if (bloom) { bloom.strength = 0.06 + (1 - day) * 0.5; bloom.threshold = 2.2 + day * 6; }
}
// nearest light sources get the few real lights
const lightList = []; let lightT = 0, emberT = 0;
function lightsUpdate(dt, t) {
  lightT -= dt; if (lightT <= 0) {
    lightT = 0.4; lightList.length = 0; if (G.isNight() || wx.light < 0.7) for (const l of W.lights) if (Math.abs(l.x - P.x) + Math.abs(l.z - P.z) < 90) lightList.push(l); Bd.lights(lightList);
    lightList.sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
    pool.forEach((pl, i) => { const l = lightList[i]; if (l && Math.hypot(l.x - P.x, l.z - P.z) < 70) { pl.position.set(l.x, l.y, l.z); pl.color.set(l.color); pl.userData.p = l.power * 31; pl.userData.f = l.flick; } else pl.userData.p = 0; });
  }
  for (const pl of pool) pl.intensity = (pl.userData.p || 0) * (pl.userData.f ? 0.85 + Math.sin(t * 11 + pl.position.x) * 0.1 + Math.random() * 0.08 : 1);
  handLight.intensity = torchOn ? 23 + Math.sin(t * 13) * 3 : 0; flash.intensity = flashOn ? 130 : 0;
  emberT -= dt; if (emberT <= 0) { emberT = 0.07; for (const l of lightList) if (l.flick && Math.abs(l.x - P.x) + Math.abs(l.z - P.z) < 60) { burst(l.x + rnd(-0.15, 0.15), l.y - 0.7, l.z + rnd(-0.15, 0.15), Math.random() < 0.5 ? 0xffb040 : 0xff6a20, 2, 0.5, -3.2, 0.7); if (Math.random() < 0.35) burst(l.x, l.y - 0.2, l.z, 0x6a6660, 1, 0.4, -1.6, 2.4); } }
  P.lit = torchOn || flashOn || !!nearStruct((s) => s.type === 'campfire' || s.type === 'lamp', 9);
}

// ---------------------------------------------------------------- survival
let poiT = 0, statT = 0, zone = '';
function survival(dt) {
  const sprinting = input.sprint && P.moving;
  P.food = Math.max(0, P.food - dt * 0.062 * (sprinting ? 1.5 : 1)); P.water = Math.max(0, P.water - dt * 0.09 * (sprinting ? 1.4 : 1) * (wx.rain > 0.3 ? 0.7 : 1));
  const nearFire = !!nearStruct((s) => s.type === 'campfire' || s.type === 'furnace', 7), warm = (G.armor && ITEMS[G.armor].warm) || nearFire || torchOn;
  const roofed = wx.rain > 0.25 && W.ray(P.x, P.y + 1.8, P.z, 0, 1, 0, 14) < 14, soaked = wx.rain > 0.25 && !roofed && !P.swim;
  const cold = (P.y > 150 || (soaked && G.isNight()) || (P.y > 110 && wx.rain > 0.25)) && !warm;
  if (P.food <= 0 || P.water <= 0) hurt(1.3 * dt, null, true); else if (P.food > 35 && P.water > 35 && !cold) P.hp = Math.min(100, P.hp + dt * 0.7);
  if (cold) hurt(0.9 * dt, null, true);
  P.stamWait -= dt; if (P.stamWait <= 0) P.stam = Math.min(100, P.stam + dt * 16 * (soaked && !warm ? 0.6 : 1) * (P.food < 15 ? 0.5 : 1)); P.stam = Math.max(0, P.stam);
  statT -= dt; if (statT <= 0) { statT = 0.5; const st = []; if (P.food < 15) st.push('Starving'); if (P.water < 15) st.push('Dehydrated'); if (cold) st.push('Freezing'); else if (soaked && !warm) st.push('Soaked'); if (P.swim) st.push('Swimming'); U.status(st); }
  poiT -= dt; if (poiT <= 0) {
    poiT = 0.6; let name = '';
    for (const p of W.pois) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < p.r + 30 && !p.found) { p.found = true; U.toast(`Discovered: ${p.n}`, 'big', 4200); G.sfx('discover'); dirty = true; } if (d < p.r + 12) name = p.n; }
    zone = name || (P.swim ? 'Open water' : P.y > 150 ? 'The high snows' : P.y > 95 ? 'Mountain slopes' : P.y < 3.2 ? 'The shore' : 'Hollowpine forest'); U.zone(zone);
    // things grow back
    const dnow = G.dayFloat(); for (const n of W.nodes) if (!n.alive && dnow - n.day > W.NODE_TYPES[n.type].regrow && Math.hypot(n.x - P.x, n.z - P.z) > 60) W.setNode(n, true);
  }
}

// ---------------------------------------------------------------- frame
let last = performance.now(), startPos = { x: -836, z: 60 }, titleA = 0;
function hudText() {
  const t = tod(), hh = Math.floor(t), mm = Math.floor((t - hh) * 60); U.clock(`Day ${G.day() + 1} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, WEATHER[weather.id].n + (P.y > 135 && wx.rain > 0.25 ? ' · snow' : ''));
  const id = held(), it = id && ITEMS[id], w = it && it.w;
  if (Bd.placing) U.ammo(`<div class="label">Blueprint</div><b>${STRUCT_BY_ID[Bd.placing].n}</b>`);
  else if (w && (w.kind === 'gun' || w.reload)) U.ammo(`<b class="num">${reloadT > 0 ? '··' : G.mags[id] || 0}</b> <span class="num">/ ${G.count(w.ammo)}</span><div class="label">${it.n}</div>`);
  else if (w && w.kind === 'bow') U.ammo(`<b class="num">${G.count(w.ammo)}</b><div class="label">${it.n}</div>`);
  else U.ammo(`<div class="label">${it ? it.n : 'Bare hands'}</div>`);
  $('cross').className = w && w.kind !== 'melee' ? (ads > 0.5 ? '' : 'gun') : ''; $('cross').style.opacity = ads > 0.5 && w && w.kind === 'gun' ? 0 : 1;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  input.poll();
  if (!W) { draw(); input.consume(); return; }
  const active = started && !U.open && !P.dead;
  if (!started) { titleA += dt * 0.03; const cx = -700, cz = 40; camera.position.set(cx + Math.cos(titleA) * 60, W.H(cx, cz) + 26, cz + Math.sin(titleA) * 60); camera.rotation.set(-0.16, titleA + Math.PI / 2 + 0.5, 0); P.x = camera.position.x; P.z = camera.position.z; P.y = camera.position.y - 20; }
  if (active) {
    G.time += dt;
    for (let i = 1; i <= 8; i++) if (input.hit('slot' + i)) G.select(i - 1);
    if (input.wheel && !Bd.placing) G.select((G.sel + Math.sign(input.wheel) + 8) % 8);
    if (Bd.placing && (input.wheel || input.hit('reload') || input.hit('rotate'))) Bd.yaw += (input.wheel < 0 ? -1 : 1) * Math.PI / 4;
    if (input.hit('light')) { if (G.count('flashlight')) { flashOn = !flashOn; G.sfx('ui'); } else U.toast('You have no flashlight'); }
    movePlayer(dt);
    const w = combat(dt);
    // building
    if (Bd.placing) {
      const d = viewDir(); Bd.updateGhost(camera.position.x, camera.position.y, camera.position.z, d.x, d.y, d.z);
      if (input.hit('cancel') || input.aim) { Bd.stop(); input.clearFire(); }
      else if (input.fire && !placePrev) { const s = Bd.confirm(); if (s) { G.sfx('place'); dirty = true; if (s.def.snap === 'door' || s.def.snap === 'free') Bd.stop(); } else G.sfx('deny'); }
      placePrev = input.fire;
    } else placePrev = input.fire;
    // interaction
    targetT -= dt; if (targetT <= 0) { targetT = 0.1; target = Bd.placing ? null : findTarget(); U.prompt(promptFor(target)); }
    useT -= dt; if (input.hit('use')) useTarget(target, true); else if (input.use && target && target.kind === 'struct' && !target.s.done) useTarget(target, false);
    if (input.hit('dismantle')) dismT = 0.001; if (dismT > 0 && target && target.kind === 'struct') { dismT += dt; if (dismT > 0.7) { const s = target.s; for (const k in s.def.cost) { const n = s.done ? Math.floor(s.def.cost[k] * 0.5) : s.prog[k] || 0; if (n) G.give(k, n); } if (s.inv) giveAll(s.inv); Bd.remove(s); G.sfx('thud'); dismT = 0; target = null; dirty = true; } } else dismT = 0;
    if (dismT > 0 && !inputHeldX()) dismT = 0;
    survival(dt); growCrops(dt); M.update(dt); arrowsUpdate(dt); poseVM(dt, w);
    if (input.hit('pack')) { input.unlock(); U.show('pack'); } else if (input.hit('build')) { if (Bd.placing) Bd.stop(); else { input.unlock(); U.show('build'); } } else if (input.hit('map')) { input.unlock(); U.show('map'); } else if (input.hit('menu')) { input.unlock(); U.show('system'); }
    if (performance.now() - lastSaveAt > (dirty ? 8000 : 25000)) saveNow();
    hudText(); U.hud(); U.compass(P.yaw);
    if (hitT > 0) { hitT -= dt; } $('hitm').style.opacity = hitT > 0 ? 1 : 0; if (vigT > 0) vigT -= dt; $('vig').style.opacity = Math.max(vigT * 1.6, P.hp < 30 ? 0.5 - P.hp / 60 : 0);
    audio.ambient(dt, G.isNight(), P.y, zone === 'Hollowpine forest' || zone === 'Mountain slopes');
  } else if (started && U.open) { if (input.hit('menu') || input.hit('pack')) U.close(); else if (input.hit('map')) { if (U.tab === 'map') U.close(); else { U.tab = 'map'; U.render(); } } else if (input.hit('build')) { if (U.tab === 'build') U.close(); else { U.tab = 'build'; U.render(); } } }
  skyUpdate(active || !started ? dt : 0); lightsUpdate(dt, t); fxUpdate(dt); Bd.update(t); W.update(dt, P.x, P.z, t, Q.near);
  draw(); input.consume();
}
let placePrev = false;
const xKeys = new Set(); window.addEventListener('keydown', (e) => xKeys.add(e.code)); window.addEventListener('keyup', (e) => xKeys.delete(e.code)); const inputHeldX = () => xKeys.has('KeyX');

// ---------------------------------------------------------------- boot
function begin(save) {
  if (save) applySave(save);
  else { P.x = startPos.x; P.z = startPos.z; P.y = W.H(P.x, P.z); P.yaw = -Math.PI / 2; G.give('bandage', 1, true); weather = { id: 'clear', t: 300 }; }
  started = true; $('title').hidden = true; $('hud').hidden = false; audio.init(); audio.setVol(settings.vol); if (!input.touch) input.lock();
  if (!save) { U.toast('Find sticks, stones and flax. Open the pack with Tab to craft a hatchet.', '', 9000); U.toast('Wreck of the Marigold', 'big', 5000); }
  saveNow();
}
input.canLock = () => started && U && !U.open && !P.dead;
input.onUnlock = () => { if (started && !U.open && !P.dead) U.show('system'); };
requestAnimationFrame(frame);
setTimeout(async () => {
  W = createWorld(scene, { grass: Q.grass }); Bd = createBuild(scene, W); M = createMobs(scene, W, G); U = createUI(G); G.W = W;
  // wake on the beach beside the wreck
  startPos = { x: -836, z: 60 };
  const local = store.get(SAVE_KEY);
  $('loadmsg').textContent = 'Looking for your saved game…';
  await Promise.race([cloudReady, new Promise((r) => setTimeout(r, 3500))]);
  const save = cloudSave && (!local || cloudSave.t > local.t) ? cloudSave : local;
  $('loadmsg').textContent = save ? `Saved game found: day ${Math.floor((save.time || 0) / DAY + 8 / 24) + 1}${cloudDoc ? ' · synced to your Claude account' : ''}` : (cloudDoc ? 'Progress saves to this browser and to your Claude account.' : 'Progress saves to this browser as you play.');
  const bc = $('btnContinue'), bn = $('btnNew'); bn.disabled = false;
  if (save && save.v === 1) { bc.hidden = false; bc.onclick = () => begin(save); bn.classList.add('ghost'); let armed = false; bn.onclick = () => { if (!armed) { armed = true; bn.textContent = 'Erase the save and start over?'; return; } G.newGame(); }; }
  else bn.onclick = () => begin(null);
  window.__hp = { G, W, Bd, M, P, begin, input, renderer, scene, camera, wx, setWeather: (id) => { weather = { id, t: 300 }; } };
}, 60);
