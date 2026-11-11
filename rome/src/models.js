import * as THREE from 'three';
import { part, T, mergeGeometries, litMat } from './world.js';
import { TAU } from '../../src/util.js';

const STENCIL = { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp };
export const charMat = litMat(STENCIL);
export const flashMat = litMat({ ...STENCIL, emissive: new THREE.Color(1, 0.9, 0.8), emissiveIntensity: 0.9 });
flashMat.customProgramCacheKey = () => 'lit';
export const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.5, 0.85), transparent: true, opacity: 0.4, depthFunc: THREE.GreaterDepth, depthWrite: false, fog: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc });

const STEEL = 0xc8ccd2, BRONZE = 0xb8923a, WOOD = 0x6b4a2f, LEATHER = 0x5a3a24, IRON = 0x8a8f96;
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (a, b, h, n = 10) => new THREE.CylinderGeometry(a, b, h, n);

function weaponParts(kind) {
  const y = -0.3, out = [];
  const blade = (len, w, col = STEEL) => out.push(part(box(w, len, 0.025), col, T(0, y - len / 2, 0)), part(box(0.17, 0.045, 0.06), BRONZE, T(0, y + 0.01, 0)), part(box(0.05, 0.14, 0.05), WOOD, T(0, y + 0.09, 0)));
  if (kind === 'pugio') blade(0.3, 0.07);
  else if (kind === 'gladius' || kind === 'decima') { blade(0.62, 0.075); out.push(part(new THREE.SphereGeometry(0.045, 5, 4), kind === 'decima' ? 0xe0e0e8 : WOOD, T(0, y + 0.18, 0))); }
  else if (kind === 'gallic') blade(0.95, 0.07);
  else if (kind === 'kopis' || kind === 'falcata' || kind === 'sica') { blade(0.34, 0.06); out.push(part(box(kind === 'sica' ? 0.06 : 0.11, 0.34, 0.025), STEEL, T(0.05, y - 0.48, 0, 1, 1, 1, 0, 0, kind === 'sica' ? -0.45 : -0.22))); }
  else if (kind === 'hasta' || kind === 'javelin' || kind === 'pilum') { const L = kind === 'hasta' ? 2.3 : 1.7; out.push(part(cyl(0.022, 0.022, L, 5), WOOD, T(0, y - L / 2 + 0.7, 0)), part(new THREE.ConeGeometry(0.05, 0.3, 4), STEEL, T(0, y - L + 0.55, 0, 1, 1, 1, Math.PI, 0, 0))); }
  else if (kind === 'club') out.push(part(cyl(0.085, 0.04, 0.75, 5), WOOD, T(0, y - 0.3, 0)));
  else if (kind === 'bow') out.push(part(new THREE.TorusGeometry(0.5, 0.022, 4, 8, Math.PI), WOOD, T(0, y, 0.0, 1, 1, 1, 0, Math.PI / 2, -Math.PI / 2)));
  return out;
}
function shieldParts(kind, col) {
  if (kind === 'scutum' || kind === 'scutum13') return [part(new THREE.SphereGeometry(0.5, 8, 6), col ?? 0x9a2020, T(-0.06, -0.08, 0.17, 0.66, 1.12, 0.16)), part(new THREE.SphereGeometry(0.09, 6, 4), BRONZE, T(-0.06, -0.08, 0.26)), part(box(0.05, 1.0, 0.03), BRONZE, T(-0.06, -0.08, 0.24))];
  if (kind === 'parma') return [part(new THREE.SphereGeometry(0.5, 8, 6), col ?? 0x7a5a3a, T(-0.06, -0.12, 0.16, 0.8, 0.8, 0.14)), part(new THREE.SphereGeometry(0.08, 6, 4), IRON, T(-0.06, -0.12, 0.24))];
  if (kind === 'aspis') return [part(new THREE.SphereGeometry(0.5, 9, 6), col ?? BRONZE, T(-0.06, -0.1, 0.17, 0.98, 0.98, 0.2))];
  return [];
}

const geoCache = new Map();
function cached(key, make) { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; }

function bodyGeo(L) {
  const skin = L.skin ?? 0xe0b08a, tunic = L.tunic ?? 0xb8a888, hair = L.hair ?? 0x3a2a1a, p = [];
  const long = L.toga || L.female;
  const torsoCol = L.bare ? skin : L.armor === 'hamata' ? IRON : L.armor === 'musculata' ? BRONZE : L.armor === 'squamata' ? 0xa8843a : L.armor === 'lino' || L.armor === 'linothorax' ? 0xe6dec4 : L.toga ? 0xf2efe6 : tunic;
  p.push(part(cyl(0.27, 0.33, 0.64, 12), torsoCol, T(0, 1.16, 0)));
  if (long) p.push(part(cyl(0.33, 0.47, 0.92, 12), L.toga ? 0xf2efe6 : tunic, T(0, 0.48, 0)));
  else p.push(part(cyl(0.33, 0.41, 0.4, 12), L.armor === 'musculata' ? LEATHER : tunic, T(0, 0.7, 0)));
  if (L.armor && L.armor !== 'none') p.push(part(cyl(0.36, 0.36, 0.1, 7), L.armor === 'musculata' ? BRONZE : torsoCol, T(0, 1.44, 0)), part(cyl(0.345, 0.345, 0.07, 7), LEATHER, T(0, 0.9, 0)));
  else if (!long) p.push(part(cyl(0.34, 0.34, 0.06, 7), LEATHER, T(0, 0.9, 0)));
  if (L.toga) { p.push(part(box(0.16, 0.9, 0.5), 0xf7f4ec, T(0.05, 1.05, 0.02, 1, 1, 1, 0, 0, 0.55))); if (L.stripe) p.push(part(box(0.05, 0.9, 0.52), L.stripe, T(-0.02, 1.02, 0.02, 1, 1, 1, 0, 0, 0.55))); }
  if (L.female && L.stripe) p.push(part(cyl(0.48, 0.48, 0.06, 8), L.stripe, T(0, 0.06, 0)), part(cyl(0.3, 0.3, 0.05, 7), L.stripe, T(0, 0.92, 0)));
  if (L.cloak != null) p.push(part(box(0.62, 1.0, 0.05), L.cloak, T(0, 0.98, -0.27, 1, 1, 1, 0.12, 0, 0)), part(box(0.66, 0.1, 0.36), L.cloak, T(0, 1.46, -0.06)));
  p.push(part(cyl(0.08, 0.09, 0.1, 6), skin, T(0, 1.52, 0)), part(new THREE.SphereGeometry(0.17, 14, 10), skin, T(0, 1.68, 0)));
  p.push(part(box(0.035, 0.035, 0.02), 0x1a1410, T(-0.06, 1.7, 0.16)), part(box(0.035, 0.035, 0.02), 0x1a1410, T(0.06, 1.7, 0.16)), part(box(0.035, 0.06, 0.05), skin, T(0, 1.67, 0.175)), part(box(0.07, 0.014, 0.02), 0x8a4a3a, T(0, 1.615, 0.158)));
  if (L.helmet && L.helmet !== 'none' && L.helmet !== 'nohelm') {
    const hc = L.helmet === 'agen' ? IRON : BRONZE;
    p.push(part(new THREE.SphereGeometry(0.2, 8, 5, 0, TAU, 0, Math.PI * 0.55), hc, T(0, 1.69, 0)), part(box(0.34, 0.03, 0.2), hc, T(0, 1.62, -0.16, 1, 1, 1, -0.5, 0, 0)));
    p.push(part(box(0.03, 0.16, 0.1), hc, T(-0.17, 1.6, 0.04)), part(box(0.03, 0.16, 0.1), hc, T(0.17, 1.6, 0.04)));
    if (L.helmet === 'montefortino' || L.helmet === 'coolus') p.push(part(cyl(0.02, 0.03, 0.07, 5), hc, T(0, 1.91, 0)));
    if (L.crest === 'red' || L.helmet === 'attic') p.push(part(box(0.05, 0.17, 0.42), 0xb01c1c, T(0, 1.96, -0.03)));
    if (L.crest === 'trans') p.push(part(box(0.46, 0.17, 0.05), 0xb01c1c, T(0, 1.96, 0)));
  } else {
    if (L.bald) p.push(part(new THREE.SphereGeometry(0.178, 8, 4, 0, TAU, 0, Math.PI * 0.5), hair, T(0, 1.66, -0.03, 1, 0.8, 1, -0.7, 0, 0)));
    else p.push(part(new THREE.SphereGeometry(0.185, 8, 5, 0, TAU, 0, Math.PI * 0.52), hair, T(0, 1.69, -0.01)));
    if (L.female) p.push(part(new THREE.SphereGeometry(0.1, 6, 5), hair, T(0, 1.72, -0.18)), part(box(0.3, 0.3, 0.08), hair, T(0, 1.56, -0.13)));
    if (L.wreath) p.push(part(new THREE.TorusGeometry(0.175, 0.025, 4, 10), 0x7a8a2a, T(0, 1.75, 0, 1, 1, 1, Math.PI / 2 - 0.2, 0, 0)));
    if (L.diadem) p.push(part(new THREE.TorusGeometry(0.18, 0.02, 4, 10), 0xf4f0e0, T(0, 1.76, 0, 1, 1, 1, Math.PI / 2 - 0.15, 0, 0)), part(new THREE.SphereGeometry(0.03, 5, 4), 0xd4a84b, T(0, 1.8, 0.17)));
  }
  if (L.beard) p.push(part(box(0.18, 0.1, 0.08), hair, T(0, 1.58, 0.12)));
  return mergeGeometries(p);
}
const skinOf = (L) => L.skin ?? 0xe0b08a;
function thighGeo(L) { return mergeGeometries([part(cyl(0.09, 0.074, 0.44, 9), L.pants ?? skinOf(L), T(0, -0.21, 0))]); }
function shinGeo(L) {
  const boot = L.toga || L.female ? 0x8a6a48 : LEATHER;
  return mergeGeometries([part(cyl(0.07, 0.052, 0.36, 9), L.pants ?? skinOf(L), T(0, -0.18, 0)), part(cyl(0.06, 0.066, 0.16, 9), boot, T(0, -0.3, 0)), part(box(0.125, 0.1, 0.27), boot, T(0, -0.39, 0.05)), part(new THREE.SphereGeometry(0.078, 8, 6), L.pants ?? skinOf(L), T(0, 0, 0))]);
}
function upperArmGeo(L) {
  const sleeve = L.bare ? skinOf(L) : L.toga ? 0xf2efe6 : L.armor === 'hamata' ? IRON : (L.tunic ?? 0xb8a888);
  return mergeGeometries([part(new THREE.SphereGeometry(0.082, 9, 7), sleeve, T(0, 0, 0)), part(cyl(0.07, 0.056, 0.3, 9), sleeve, T(0, -0.15, 0))]);
}
function foreArmGeo(L, right) {
  const skin = skinOf(L), p = [part(new THREE.SphereGeometry(0.058, 8, 6), skin, T(0, 0, 0)), part(cyl(0.054, 0.042, 0.27, 9), skin, T(0, -0.135, 0)), part(new THREE.SphereGeometry(0.054, 8, 6), skin, T(0, -0.3, 0, 1, 1.15, 1))];
  if (right) p.push(...weaponParts(L.weapon)); else p.push(...shieldParts(L.shield, L.shieldCol));
  return mergeGeometries(p);
}

// A jointed figure: hips, knees, shoulders and elbows, with the upper body on its own pivot
export function makeHuman(look = {}) {
  const L = look, key = JSON.stringify(L);
  const g = new THREE.Group(), torso = new THREE.Group();
  const parts = [];
  const mk = (geo, shadow) => { const m = new THREE.Mesh(geo, charMat); m.renderOrder = 2; m.castShadow = !!shadow; parts.push(m); return m; };
  const body = mk(cached('b' + key, () => bodyGeo(L)), true);
  body.position.y = -0.9; torso.position.y = 0.9; torso.add(body);
  const arm = (side, right) => {
    const sh = new THREE.Group(), el = new THREE.Group();
    sh.position.set(side * 0.36, 0.52, 0); sh.rotation.order = 'YXZ'; el.position.y = -0.3;
    const up = mk(cached('u' + key, () => upperArmGeo(L))), fore = mk(cached((right ? 'r' : 'a') + key, () => foreArmGeo(L, right)), true);
    sh.add(up, el); el.add(fore); torso.add(sh);
    return [sh, el, up, fore];
  };
  const leg = (side) => {
    const hip = new THREE.Group(), knee = new THREE.Group();
    hip.position.set(side * 0.12, 0.88, 0); knee.position.y = -0.44;
    hip.add(mk(cached('t' + key, () => thighGeo(L)))); knee.add(mk(cached('s' + key, () => shinGeo(L)))); hip.add(knee); g.add(hip);
    return [hip, knee];
  };
  const [shR, elR, upR, foreR] = arm(1, true), [shL, elL, upL, foreL] = arm(-1, false);
  const [hipL, kneeL] = leg(-1), [hipR, kneeR] = leg(1);
  g.add(torso);
  if (L.scale) g.scale.setScalar(L.scale);
  const shielded = L.shield && L.shield !== 'none' && L.shield !== 'noshield';
  return { g, torso, body, shR, elR, shL, elL, hipL, kneeL, hipR, kneeR, look: L, parts, ghostParts: [body, upR, upL, foreR, foreL], shielded, ghost: null };
}
export function addGhost(h) {
  h.ghost = h.ghostParts.map((m) => { const q = new THREE.Mesh(m.geometry, ghostMat); q.renderOrder = 5; m.add(q); return q; });
}
export function setFlash(h, on) { const m = on ? flashMat : charMat; for (const p of h.parts) p.material = m; }
export function disposeHuman(h) { h.g.removeFromParent(); }

// st: { mv 0..1, ph, t, atk -1|0..1, kind 0..2, block 0..1, dead 0..1, ride, ranged, stag, climb, swim, air, sneak, talk }
export function poseHuman(h, st) {
  const t = st.ph, s = Math.sin(t), c = Math.cos(t), mv = st.mv || 0, bt = st.t || 0, br = Math.sin(bt * 1.7);
  // legs: thigh swing with the knee folding as the leg comes through
  let tL = -s * 0.74 * mv, tR = s * 0.74 * mv, kL = 0.06 + Math.max(0, c) * 1.05 * mv, kR = 0.06 + Math.max(0, -c) * 1.05 * mv, zL = 0, zR = 0;
  // arms: counter-swing; the weapon arm stays half raised
  let sRx = -0.32 + s * 0.38 * mv, sRy = 0, sRz = 0.06, eR = -0.8 - 0.15 * mv;
  let sLx = -0.05 - s * 0.6 * mv, sLy = 0, sLz = -0.06, eL = -0.25 - 0.45 * mv - Math.max(0, -s) * 0.3 * mv;
  let lean = 0.11 * mv + br * 0.012, twist = s * 0.11 * mv, roll = c * 0.025 * mv, drop = (Math.cos(t * 2) * 0.5 - 0.5) * 0.055 * mv, gx = 0, gz = 0;
  if (h.shielded) { sLx = -0.3 - s * 0.18 * mv; sLy = 0.3; eL = -0.95; }
  if (st.sneak) { lean += 0.45; drop -= 0.17; tL -= 0.78; tR -= 0.78; kL += 1.25; kR += 1.25; sRx -= 0.2; eL -= 0.3; }
  if (st.ride) { tL = tR = -1.32; zL = -0.42; zR = 0.42; kL = kR = 1.25; sRx = -0.75; eR = -0.85; sLx = -0.75; sLy = 0; eL = -0.85; lean = 0.06 + mv * 0.12; twist = 0; roll = 0; drop = 0; }
  if (st.air) { tL = -1.0; tR = -0.3; kL = 1.35; kR = 0.75; sRx = -1.5; sLx = -1.5; sRz = 0.7; sLz = -0.7; eR = eL = -0.45; lean = 0.15; twist = 0; }
  if (st.talk) { sRx = -1.0 + Math.sin(bt * 2.6) * 0.22; sRy = -0.3; eR = -1.25 + Math.sin(bt * 3.3) * 0.2; }
  if (st.atk >= 0 && !st.ride) {
    const a = st.atk, w = a < 0.35 ? a / 0.35 : 1, q = a < 0.35 ? 0 : Math.min(1, (a - 0.35) / 0.28), e = 1 - (1 - q) * (1 - q), back = a > 0.63 ? (a - 0.63) / 0.37 : 0;
    if (st.ranged) { sRx = -1.55; eR = -0.15 - (a > 0.6 ? 0 : w * 0.9); sLx = -1.5; eL = -0.1; twist = -0.5; }
    else if (st.kind === 0) { sRx = -1.35; sRy = -1.25 * w + 2.55 * e - 0.5 * back; eR = -1.35 * w + 1.2 * e; twist = -0.55 * w + 1.05 * e - 0.3 * back; lean = 0.12 + 0.2 * e; }
    else if (st.kind === 1) { sRx = -1.25; sRy = 1.35 * w - 2.6 * e + 0.5 * back; eR = -1.3 * w + 1.15 * e; twist = 0.55 * w - 1.05 * e + 0.3 * back; lean = 0.12 + 0.2 * e; }
    else { sRx = -3.0 * w + 2.15 * e; eR = -1.5 * w + 1.35 * e; lean = -0.22 * w + 0.6 * e - 0.15 * back; twist = 0.25 * w - 0.25 * e; }
    // step into the blow
    tL += -0.5 * e + 0.2 * back; kL += 0.35 * e; tR += 0.35 * e; kR += 0.1;
  }
  const bl = st.block || 0;
  if (bl > 0) { sLx = sLx * (1 - bl) - 1.15 * bl; sLy = sLy * (1 - bl) + 0.55 * bl; eL = eL * (1 - bl) - 1.25 * bl; lean += 0.12 * bl; tL -= 0.25 * bl; kL += 0.4 * bl; kR += 0.3 * bl; drop -= 0.07 * bl; }
  if (st.climb) { sRx = -2.75 + s * 0.5; sLx = -2.75 - s * 0.5; sRy = sLy = 0; sRz = 0.15; sLz = -0.15; eR = -0.75 + s * 0.45; eL = -0.75 - s * 0.45; tL = -0.75 - s * 0.6; tR = -0.75 + s * 0.6; kL = 1.25 + s * 0.5; kR = 1.25 - s * 0.5; lean = -0.1; twist = s * 0.12; drop = 0; }
  if (st.swim) {
    const k = Math.min(1, mv * 1.5), u = 0.5 + 0.5 * s;
    if (k > 0.15) { gx = 1.22; sRx = sLx = -2.95 + u * 0.7; sRz = 0.15 + u * 1.25; sLz = -0.15 - u * 1.25; sRy = sLy = 0; eR = eL = -0.25 - (1 - u) * 0.7; tL = 0.1 + s * 0.4; tR = 0.1 - s * 0.4; kL = 0.35 + Math.max(0, c) * 0.5; kR = 0.35 + Math.max(0, -c) * 0.5; lean = -0.25; twist = 0; }
    else { const v = Math.sin(bt * 2.4); gx = 0.2; sRx = sLx = -0.9; sRz = 0.9 + v * 0.35; sLz = -0.9 - v * 0.35; eR = eL = -0.5; tL = v * 0.45; tR = -v * 0.45; kL = kR = 0.5; lean = 0; twist = 0; }
    drop = 0;
  }
  if (st.stag) { lean -= 0.42; sRz += 0.5; sLz -= 0.5; }
  const dd = st.dead || 0;
  if (dd > 0) { gx = -dd * 1.52; sRz += dd * 1.1; sLz -= dd * 1.1; eR *= 1 - dd; eL *= 1 - dd; tL *= 1 - dd; tR *= 1 - dd; kL = kL * (1 - dd) + 0.3 * dd; lean *= 1 - dd; }
  h.hipL.rotation.set(tL, 0, zL); h.hipR.rotation.set(tR, 0, zR); h.kneeL.rotation.x = kL; h.kneeR.rotation.x = kR;
  h.shR.rotation.set(sRx, sRy, sRz); h.elR.rotation.x = eR; h.shL.rotation.set(sLx, sLy, sLz); h.elL.rotation.x = eL;
  h.torso.rotation.set(lean, twist, roll); h.torso.position.y = 0.9 + drop;
  h.hipL.position.y = h.hipR.position.y = 0.88 + drop;
  h.g.rotation.x = gx; h.g.rotation.z = gz;
  h.g.position.y -= dd * 0.15;
}

// ---------- horse / wolf ----------
export function makeHorse(o = {}) {
  const coat = o.coat ?? 0x7a4a26, dark = o.dark ?? 0x2a1c12, wolf = o.wolf;
  const g = new THREE.Group();
  const p = [
    part(box(0.62, 0.68, 1.55), coat, T(0, 1.22, 0)),
    part(box(0.36, 0.95, 0.42), coat, T(0, 1.78, 0.78, 1, 1, 1, 0.55, 0, 0)),
    part(box(0.27, 0.3, 0.62), coat, T(0, 2.2, 1.22, 1, 1, 1, 0.35, 0, 0)),
    part(box(0.06, 0.16, 0.08), coat, T(-0.09, 2.44, 1.08)), part(box(0.06, 0.16, 0.08), coat, T(0.09, 2.44, 1.08)),
    part(box(0.1, 0.8, 0.14), dark, T(0, 1.2, -0.84, 1, 1, 1, -0.35, 0, 0)),
  ];
  if (!wolf) p.push(part(box(0.08, 0.7, 0.3), dark, T(0, 2.0, 0.6, 1, 1, 1, 0.55, 0, 0)), part(box(0.66, 0.08, 0.66), 0x9a2020, T(0, 1.58, -0.05)), part(box(0.5, 0.14, 0.1), LEATHER, T(0, 1.66, 0.3)), part(box(0.5, 0.14, 0.1), LEATHER, T(0, 1.66, -0.38)));
  const body = new THREE.Mesh(mergeGeometries(p), charMat); body.castShadow = true; body.renderOrder = 2;
  const lg = mergeGeometries([part(box(0.15, 0.72, 0.16), coat, T(0, -0.36, 0)), part(box(0.16, 0.2, 0.17), dark, T(0, -0.82, 0))]);
  const legs = [[-0.21, 0.56], [0.21, 0.56], [-0.21, -0.6], [0.21, -0.6]].map(([x, z]) => { const m = new THREE.Mesh(lg, charMat); m.position.set(x, 0.92, z); m.renderOrder = 2; g.add(m); return m; });
  g.add(body);
  if (wolf) { const z = o.size ?? 0.5; g.scale.set(z * (o.wide ?? 1), z, z * 1.24); }
  return { g, body, legs, parts: [body, ...legs] };
}
export function poseHorse(h, ph, mv) {
  const a = Math.sin(ph) * 0.8 * mv, b = Math.sin(ph + 1.9) * 0.8 * mv;
  h.legs[0].rotation.x = a; h.legs[1].rotation.x = b; h.legs[2].rotation.x = -b; h.legs[3].rotation.x = -a;
  h.body.position.y = Math.abs(Math.sin(ph)) * 0.09 * mv; h.body.rotation.x = Math.sin(ph * 2) * 0.03 * mv;
}

// ---------- ship: a small liburnian galley ----------
export function makeShip() {
  const g = new THREE.Group();
  const hull = new THREE.BoxGeometry(3.6, 1.7, 17, 4, 2, 12).toNonIndexed();
  const taper = (geo, wide) => { const a = geo.attributes.position; for (let i = 0; i < a.count; i++) { const z = a.getZ(i), t = Math.abs(z) / 8.5, k = 1 - Math.pow(t, 2.4) * 0.9; a.setX(i, a.getX(i) * k * (a.getY(i) < 0 ? 0.62 : 1) * wide); a.setY(i, a.getY(i) + Math.pow(t, 3) * (z < 0 ? 1.9 : 1.1)); } return geo; };
  const p = [part(taper(hull, 1), 0x6e4a2a), part(taper(new THREE.BoxGeometry(3.7, 0.3, 17.05, 4, 1, 12).toNonIndexed(), 1.01), 0x9a2a20, T(0, 0.62, 0))];
  p.push(part(box(2.9, 0.1, 13), 0xa98a5c, T(0, 0.8, 0)));
  p.push(part(new THREE.ConeGeometry(0.34, 1.9, 5), BRONZE, T(0, -0.35, 9.0, 1, 1, 1, Math.PI / 2, 0, 0)));
  p.push(part(box(0.26, 2.8, 0.3), 0x6e4a2a, T(0, 2.5, -8.0, 1, 1, 1, -0.45, 0, 0)), part(box(0.2, 1.3, 0.26), 0x9a2a20, T(0, 3.9, -7.0, 1, 1, 1, -1.5, 0, 0)));
  p.push(part(box(0.24, 1.7, 0.28), 0x6e4a2a, T(0, 1.9, 8.2, 1, 1, 1, 0.35, 0, 0)));
  for (const sx of [-1, 1]) p.push(part(cyl(0.2, 0.2, 0.04, 8), 0xf4f0e0, T(sx * 0.62, 0.75, 7.0, 1, 1, 1, 0, 0, Math.PI / 2)), part(cyl(0.09, 0.09, 0.05, 6), 0x1a1a22, T(sx * 0.64, 0.75, 7.0, 1, 1, 1, 0, 0, Math.PI / 2)), part(box(0.1, 0.1, 3.4), 0x5a3a20, T(sx * 1.25, 0.2, -7.2, 1, 1, 1, 0.5, 0, 0)));
  p.push(part(cyl(0.13, 0.17, 8.2, 6), 0x5a3a20, T(0, 4.9, 1)), part(cyl(0.07, 0.07, 6.8, 5), 0x5a3a20, T(0, 8.3, 1, 1, 1, 1, 0, 0, Math.PI / 2)));
  p.push(part(box(1.6, 1.2, 1.8), 0x8a6a40, T(0, 1.4, -5.6)), part(box(1.8, 0.1, 2.0), 0x9a2a20, T(0, 2.05, -5.6)));
  const body = new THREE.Mesh(mergeGeometries(p), charMat); body.castShadow = true; body.renderOrder = 2;
  const sg = new THREE.PlaneGeometry(6.4, 5.4, 6, 5).toNonIndexed();
  { const a = sg.attributes.position, c = new Float32Array(a.count * 3); for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = a.getY(i); a.setZ(i, Math.cos(x / 3.2 * 1.4) * 0.9 * (0.6 + 0.4 * Math.cos(y / 2.7 * 1.2))); } for (let i = 0; i < a.count; i += 3) { const q = i - (i % 6), y = (a.getY(q) + a.getY(q + 1) + a.getY(q + 2) + a.getY(q + 3) + a.getY(q + 4) + a.getY(q + 5)) / 6, red = Math.abs(y) < 0.55 || Math.abs(y - 1.9) < 0.3 || Math.abs(y + 1.9) < 0.3; const col = new THREE.Color(red ? 0xa82a20 : 0xe9dfc6); for (let k = 0; k < 3; k++) c.set([col.r, col.g, col.b], (i + k) * 3); } sg.setAttribute('color', new THREE.BufferAttribute(c, 3)); sg.deleteAttribute('uv'); sg.computeVertexNormals(); }
  const sailMat = litMat({ side: THREE.DoubleSide });
  const sail = new THREE.Mesh(sg, sailMat); sail.position.set(0, 5.5, 1.25); sail.castShadow = true;
  const oarGeo = (sx) => mergeGeometries(Array.from({ length: 9 }, (_, i) => part(box(3.6, 0.07, 0.12), 0xb89a6a, T(sx * 1.9, -0.1, -5.2 + i * 1.25))));
  const oarL = new THREE.Mesh(oarGeo(-1), charMat), oarR = new THREE.Mesh(oarGeo(1), charMat);
  oarL.position.set(-1.3, 0.55, 0); oarR.position.set(1.3, 0.55, 0);
  g.add(body, sail, oarL, oarR);
  return { g, body, sail, oarL, oarR };
}
export function poseShip(s, time, speed) {
  const r = Math.sin(time * 3.2) * 0.22 * (0.3 + speed), d = 0.42 + Math.cos(time * 3.2) * 0.12 * (0.3 + speed);
  s.oarL.rotation.set(0, r, d); s.oarR.rotation.set(0, -r, -d);
  s.sail.scale.z = 0.7 + speed * 0.5 + Math.sin(time * 1.3) * 0.06;
  s.g.rotation.z = Math.sin(time * 0.9) * 0.035; s.g.rotation.x = Math.sin(time * 0.7 + 1) * 0.02;
}
