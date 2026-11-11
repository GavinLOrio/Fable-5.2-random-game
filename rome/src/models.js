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
const cyl = (a, b, h, n = 6) => new THREE.CylinderGeometry(a, b, h, n);

function weaponParts(kind) {
  const y = -0.6, out = [];
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
  if (kind === 'scutum' || kind === 'scutum13') return [part(new THREE.SphereGeometry(0.5, 8, 6), col ?? 0x9a2020, T(-0.06, -0.38, 0.17, 0.66, 1.12, 0.16)), part(new THREE.SphereGeometry(0.09, 6, 4), BRONZE, T(-0.06, -0.38, 0.26)), part(box(0.05, 1.0, 0.03), BRONZE, T(-0.06, -0.38, 0.24))];
  if (kind === 'parma') return [part(new THREE.SphereGeometry(0.5, 8, 6), col ?? 0x7a5a3a, T(-0.06, -0.42, 0.16, 0.8, 0.8, 0.14)), part(new THREE.SphereGeometry(0.08, 6, 4), IRON, T(-0.06, -0.42, 0.24))];
  if (kind === 'aspis') return [part(new THREE.SphereGeometry(0.5, 9, 6), col ?? BRONZE, T(-0.06, -0.4, 0.17, 0.98, 0.98, 0.2))];
  return [];
}

const geoCache = new Map();
function cached(key, make) { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; }

function bodyGeo(L) {
  const skin = L.skin ?? 0xe0b08a, tunic = L.tunic ?? 0xb8a888, hair = L.hair ?? 0x3a2a1a, p = [];
  const long = L.toga || L.female;
  const torsoCol = L.bare ? skin : L.armor === 'hamata' ? IRON : L.armor === 'musculata' ? BRONZE : L.armor === 'squamata' ? 0xa8843a : L.armor === 'lino' || L.armor === 'linothorax' ? 0xe6dec4 : L.toga ? 0xf2efe6 : tunic;
  p.push(part(cyl(0.27, 0.33, 0.64, 7), torsoCol, T(0, 1.16, 0)));
  if (long) p.push(part(cyl(0.33, 0.47, 0.92, 8), L.toga ? 0xf2efe6 : tunic, T(0, 0.48, 0)));
  else p.push(part(cyl(0.33, 0.41, 0.4, 7), L.armor === 'musculata' ? LEATHER : tunic, T(0, 0.7, 0)));
  if (L.armor && L.armor !== 'none') p.push(part(cyl(0.36, 0.36, 0.1, 7), L.armor === 'musculata' ? BRONZE : torsoCol, T(0, 1.44, 0)), part(cyl(0.345, 0.345, 0.07, 7), LEATHER, T(0, 0.9, 0)));
  else if (!long) p.push(part(cyl(0.34, 0.34, 0.06, 7), LEATHER, T(0, 0.9, 0)));
  if (L.toga) { p.push(part(box(0.16, 0.9, 0.5), 0xf7f4ec, T(0.05, 1.05, 0.02, 1, 1, 1, 0, 0, 0.55))); if (L.stripe) p.push(part(box(0.05, 0.9, 0.52), L.stripe, T(-0.02, 1.02, 0.02, 1, 1, 1, 0, 0, 0.55))); }
  if (L.female && L.stripe) p.push(part(cyl(0.48, 0.48, 0.06, 8), L.stripe, T(0, 0.06, 0)), part(cyl(0.3, 0.3, 0.05, 7), L.stripe, T(0, 0.92, 0)));
  if (L.cloak != null) p.push(part(box(0.62, 1.0, 0.05), L.cloak, T(0, 0.98, -0.27, 1, 1, 1, 0.12, 0, 0)), part(box(0.66, 0.1, 0.36), L.cloak, T(0, 1.46, -0.06)));
  p.push(part(cyl(0.08, 0.09, 0.1, 6), skin, T(0, 1.52, 0)), part(new THREE.SphereGeometry(0.17, 8, 6), skin, T(0, 1.68, 0)));
  p.push(part(box(0.035, 0.035, 0.02), 0x1a1410, T(-0.06, 1.7, 0.16)), part(box(0.035, 0.035, 0.02), 0x1a1410, T(0.06, 1.7, 0.16)));
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
function legGeo(L) {
  const skin = L.skin ?? 0xe0b08a, long = L.toga || L.female;
  return mergeGeometries([part(box(0.15, 0.6, 0.17), L.pants ?? skin, T(0, -0.3, 0)), part(box(0.16, 0.22, 0.2), long ? 0x8a6a48 : LEATHER, T(0, -0.7, 0.01))]);
}
function armGeo(L, right) {
  const skin = L.skin ?? 0xe0b08a, sleeve = L.bare ? skin : L.toga ? 0xf2efe6 : L.armor === 'hamata' ? IRON : (L.tunic ?? 0xb8a888);
  const p = [part(box(0.115, 0.26, 0.125), sleeve, T(0, -0.13, 0)), part(box(0.1, 0.34, 0.1), skin, T(0, -0.43, 0))];
  if (right) p.push(...weaponParts(L.weapon)); else p.push(...shieldParts(L.shield, L.shieldCol));
  return mergeGeometries(p);
}

export function makeHuman(look = {}) {
  const L = look, key = JSON.stringify(L);
  const g = new THREE.Group();
  const mk = (geo) => { const m = new THREE.Mesh(geo, charMat); m.renderOrder = 2; return m; };
  const body = mk(cached('b' + key, () => bodyGeo(L)));
  const legL = mk(cached('l' + key, () => legGeo(L))), legR = mk(legL.geometry);
  const armR = mk(cached('r' + key, () => armGeo(L, true))), armL = mk(cached('a' + key, () => armGeo(L, false)));
  body.castShadow = true;
  legL.position.set(-0.12, 0.82, 0); legR.position.set(0.12, 0.82, 0);
  armR.position.set(0.36, 1.42, 0); armL.position.set(-0.36, 1.42, 0);
  armR.rotation.order = armL.rotation.order = 'YXZ';
  g.add(body, legL, legR, armR, armL);
  if (L.scale) g.scale.setScalar(L.scale);
  return { g, body, legL, legR, armR, armL, look: L, parts: [body, legL, legR, armR, armL], ghost: null };
}
export function addGhost(h) {
  h.ghost = [h.body, h.armR, h.armL].map((m) => { const q = new THREE.Mesh(m.geometry, ghostMat); q.renderOrder = 5; m.add(q); return q; });
}
export function setFlash(h, on) { const m = on ? flashMat : charMat; for (const p of h.parts) p.material = m; }
export function disposeHuman(h) { h.g.removeFromParent(); }

// st: { mv 0..1, ph, atk -1|0..1, kind 0..2, block 0..1, dead 0..1, ride, ranged, stag }
export function poseHuman(h, st) {
  const s = Math.sin(st.ph), mv = st.mv;
  if (st.ride) { h.legL.rotation.set(-1.1, 0, -0.5); h.legR.rotation.set(-1.1, 0, 0.5); }
  else { h.legL.rotation.set(s * 0.75 * mv, 0, 0); h.legR.rotation.set(-s * 0.75 * mv, 0, 0); }
  h.body.position.y = st.ride ? 0 : Math.abs(Math.cos(st.ph)) * 0.05 * mv;
  let rx = -0.75 - s * 0.25 * mv, ry = 0, bodyX = 0.08 * mv, bodyY = 0;
  if (st.ride) rx = -0.5;
  if (st.atk >= 0) {
    const t = st.atk, w = t < 0.35 ? t / 0.35 : 1, q = t < 0.35 ? 0 : Math.min(1, (t - 0.35) / 0.3), e = 1 - (1 - q) * (1 - q);
    if (st.ranged) { rx = -1.5 + (t > 0.6 ? (t - 0.6) * 1.5 : 0); }
    else if (st.kind === 0) { rx = -1.3; ry = -1.2 * w + 2.5 * e; bodyY = -0.5 * w + 1.0 * e; }
    else if (st.kind === 1) { rx = -1.3; ry = 1.3 * w - 2.5 * e; bodyY = 0.5 * w - 1.0 * e; }
    else { rx = -2.9 * w + 2.0 * e; bodyX = -0.2 * w + 0.55 * e; }
  }
  h.armR.rotation.set(rx, ry, 0);
  const bl = st.block;
  h.armL.rotation.set((s * 0.4 * mv - 0.15) * (1 - bl) - 1.0 * bl, 0.5 * bl, 0);
  h.body.rotation.set(bodyX + (st.stag || 0) * -0.4, bodyY * 0.5, 0);
  h.g.rotation.x = -st.dead * 1.5;
  h.g.position.y += -st.dead * 0.15;
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
  if (wolf) g.scale.set(0.5, 0.5, 0.62);
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
