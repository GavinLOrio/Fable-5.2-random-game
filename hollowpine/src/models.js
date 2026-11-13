// Hollowpine models: first-person hands and weapons, and jointed creature and human rigs built from smooth shapes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const PI = Math.PI, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const std = (color, metalness, roughness, o = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...o });
const MT = {
  steel: std(0x8a9097, 0.9, 0.34), gun: std(0x2b2f34, 0.75, 0.42), black: std(0x1a1c1f, 0.15, 0.62), poly: std(0x2f3a33, 0.1, 0.7), wood: std(0x6e4a2c, 0, 0.55), wood2: std(0x8a6238, 0, 0.6), darkwood: std(0x4a321f, 0, 0.6),
  brass: std(0xb9953f, 0.95, 0.3), skin: std(0xc9a083, 0, 0.75), sleeve: std(0x4b5340, 0, 0.9), glove: std(0x2a2824, 0, 0.85), stone: std(0x8d9093, 0, 0.9), bone: std(0xe6dfc8, 0, 0.7), cloth: std(0x5a4636, 0, 0.95), string: std(0xe8e2d2, 0, 0.8), blade: std(0xc4ccd2, 0.95, 0.22), glass: std(0x0c1418, 0.9, 0.08),
};
export const mat = (c) => std(c, 0, 0.8);

// ---------------------------------------------------------------- painted geometry helpers (creatures)
const CA = new THREE.Color(), CB = new THREE.Color();
function paint(g, top, bot = top) {
  CA.set(top); CB.set(bot); g.computeBoundingBox(); const y0 = g.boundingBox.min.y, h = (g.boundingBox.max.y - y0) || 1, p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = clamp((p.getY(i) - y0) / h, 0, 1), s = k * k * (3 - 2 * k); col[i * 3] = lerp(CB.r, CA.r, s); col[i * 3 + 1] = lerp(CB.g, CA.g, s); col[i * 3 + 2] = lerp(CB.b, CA.b, s); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g;
}
const tf = (g, x, y, z, rx = 0, ry = 0, rz = 0) => { if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
const ell = (rx, ry, rz, x, y, z, top, bot, ax = 0, ay = 0, az = 0, seg = 12) => paint(tf(new THREE.SphereGeometry(1, seg, Math.max(6, seg - 3)).scale(rx, ry, rz), x, y, z, ax, ay, az), top, bot);
// tapered limb hanging down -y from its origin, rounded at both ends
function limbGeo(r0, r1, len, seg = 9) {
  const a = [new THREE.CylinderGeometry(r0, r1, len, seg, 1, true).translate(0, -len / 2, 0), new THREE.SphereGeometry(r0, seg, 4, 0, PI * 2, 0, PI / 2), new THREE.SphereGeometry(r1, seg, 4, 0, PI * 2, PI / 2, PI / 2).translate(0, -len, 0)];
  return mergeGeometries(a.map((g) => g.toNonIndexed()));
}
const limb = (r0, r1, len, x, y, z, top, bot, ax = 0, ay = 0, az = 0) => paint(tf(limbGeo(r0, r1, len), x, y, z, ax, ay, az), top, bot);
const cone = (r, h, x, y, z, c, ax = 0, ay = 0, az = 0, seg = 7) => paint(tf(new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0), x, y, z, ax, ay, az), c);
const rbox = (sx, sy, sz, x, y, z, top, bot, ax = 0, ay = 0, az = 0, rad = 0.02) => paint(tf(new RoundedBoxGeometry(sx, sy, sz, 2, Math.min(rad, sx / 2.01, sy / 2.01, sz / 2.01)), x, y, z, ax, ay, az), top, bot);
const cylg = (r0, r1, len, x, y, z, top, bot, ax = 0, ay = 0, az = 0, seg = 10) => paint(tf(new THREE.CylinderGeometry(r0, r1, len, seg), x, y, z, ax, ay, az), top, bot);
const merged = (list) => mergeGeometries(list);
const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
const gearMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.55 });
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
const mesh = (parent, geo, m = bodyMat) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; parent.add(o); return o; };
const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

// ---------------------------------------------------------------- four-legged animals
const SPECIES = {
  wolf: { L: 1.05, H: 0.56, cw: 0.15, ch: 0.19, hw: 0.125, hh: 0.165, neck: [0.27, 0.95, 0.085], head: [0.1, 0.17, 0.05], ear: 'point', tail: [0.46, 0.06, 1.05], leg: [0.055, 0.034, 0.027], top: 0x55585f, belly: 0xb4b0a6, legc: 0x6a6b70, snout: 0x9a968e, eye: 0xd8a322 },
  bear: { L: 1.7, H: 0.72, cw: 0.36, ch: 0.4, hw: 0.34, hh: 0.37, neck: [0.3, 1.2, 0.23], head: [0.2, 0.2, 0.09], ear: 'round', tail: [0.1, 0.06, 1.2], leg: [0.15, 0.12, 0.105], top: 0x36261a, belly: 0x4d3926, legc: 0x2e2016, snout: 0x8f6f4d, eye: 0x120c08 },
  deer: { L: 1.25, H: 0.86, cw: 0.15, ch: 0.21, hw: 0.15, hh: 0.2, neck: [0.52, 0.5, 0.07], head: [0.085, 0.16, 0.042], ear: 'long', tail: [0.13, 0.045, 0.7], leg: [0.055, 0.028, 0.02], top: 0x93673c, belly: 0xdccdb2, legc: 0x7d5632, snout: 0x6d4c2c, eye: 0x120c08 },
  boar: { L: 1.1, H: 0.42, cw: 0.2, ch: 0.25, hw: 0.17, hh: 0.2, neck: [0.14, 1.4, 0.16], head: [0.14, 0.24, 0.075], ear: 'point', tail: [0.2, 0.018, 0.5], leg: [0.065, 0.04, 0.034], top: 0x33291f, belly: 0x54463a, legc: 0x2a2119, snout: 0x6a5648, eye: 0x120c08 },
};
const quadCache = {};
function quadGeos(type) {
  if (quadCache[type]) return quadCache[type];
  const S = SPECIES[type], { L, H, cw, ch, hw, hh } = S, [nl, na, nr] = S.neck, [hr, sl, sr] = S.head, mid = shade(S.top, 1.12);
  const torso = [ell(cw, ch, L * 0.3, 0, H + ch * 0.8, L * 0.2, S.top, S.belly), ell(cw * 0.92, ch * 0.9, L * 0.3, 0, H + ch * 0.82, -L * 0.03, S.top, S.belly), ell(hw, hh, L * 0.27, 0, H + hh * 0.86, -L * 0.26, S.top, S.belly)];
  if (type === 'bear') torso.push(ell(cw * 0.8, ch * 0.5, L * 0.2, 0, H + ch * 1.55, L * 0.16, S.top, S.top));
  if (type === 'boar') for (let i = 0; i < 9; i++) torso.push(cone(0.035, 0.12, 0, H + ch * 1.72 - Math.abs(i - 3) * 0.012, L * 0.34 - i * 0.075, 0x1a140f, -0.5));
  if (type === 'deer') torso.push(ell(hw * 0.75, hh * 0.6, 0.06, 0, H + hh * 1.0, -L * 0.5, 0xf2ecdc, 0xf2ecdc));
  // neck, in neck-local space (pivot at its base)
  const nd = [0, Math.cos(na) * nl, Math.sin(na) * nl], neck = [limb(nr * 1.3, nr, nl, 0, 0, 0, S.top, S.belly, PI + na)];
  if (type === 'wolf') neck.push(ell(nr * 1.45, nr * 1.3, nr * 1.5, 0, nd[1] * 0.35, nd[2] * 0.35, S.top, S.belly));
  // head, in head-local space
  const head = [ell(hr, hr * 0.95, hr * 1.15, 0, 0, hr * 0.25, S.top, shade(S.belly, 0.95)), cylg(sr * 0.72, sr * 1.25, sl, 0, -hr * 0.22, hr * 1.0 + sl / 2, S.snout, shade(S.snout, 0.8), PI / 2), ell(sr * 0.5, sr * 0.42, sr * 0.4, 0, -hr * 0.16, hr * 1.0 + sl, 0x15110f, 0x15110f, 0, 0, 0, 8), cylg(sr * 0.5, sr * 0.9, sl * 0.85, 0, -hr * 0.46, hr * 0.9 + sl * 0.42, shade(S.belly, 0.9), shade(S.belly, 0.75), PI / 2 + 0.12)];
  for (const s of [-1, 1]) {
    head.push(ell(hr * 0.15, hr * 0.15, hr * 0.1, s * hr * 0.62, hr * 0.22, hr * 0.92, S.eye, S.eye, 0, 0, 0, 7));
    if (S.ear === 'point') head.push(cone(hr * 0.36, hr * 0.85, s * hr * 0.6, hr * 0.6, hr * 0.05, mid, -0.2, 0, -s * 0.3, 5));
    else if (S.ear === 'round') head.push(ell(hr * 0.3, hr * 0.3, hr * 0.14, s * hr * 0.75, hr * 0.8, 0, S.top, S.top, 0, 0, 0, 8));
    else head.push(ell(hr * 0.26, hr * 0.62, hr * 0.12, s * hr * 1.05, hr * 0.75, -hr * 0.2, S.top, 0xe6d8c0, 0, 0, -s * 0.9, 8));
    if (type === 'boar') head.push(cone(0.02, 0.11, s * sr * 0.95, -hr * 0.4, hr * 1.0 + sl * 0.6, 0xe8e0c8, -0.5, 0, -s * 0.5, 5));
    if (type === 'deer') { const a = 0x8a7a5c; head.push(cylg(0.012, 0.02, 0.42, s * hr * 0.9, hr * 1.9, -hr * 0.5, 0xd8ccb0, a, -0.35, 0, -s * 0.45, 5), cylg(0.008, 0.013, 0.2, s * hr * 1.7, hr * 3.2, -hr * 0.9, 0xd8ccb0, a, 0.5, 0, -s * 0.2, 5), cylg(0.008, 0.013, 0.18, s * hr * 1.2, hr * 2.3, -hr * 0.3, 0xd8ccb0, a, 0.9, 0, -s * 0.5, 5), cylg(0.008, 0.012, 0.16, s * hr * 2.1, hr * 2.9, -hr * 1.2, 0xd8ccb0, a, -0.9, 0, -s * 0.9, 5)); }
  }
  const [tl, tr, ta] = S.tail, tail = [limb(tr, type === 'wolf' ? tr * 0.9 : tr * 0.5, tl, 0, 0, 0, type === 'deer' ? 0x8a5f38 : S.top, type === 'deer' ? 0xf2ecdc : type === 'wolf' ? S.belly : S.top, ta)];
  const [l0, l1, l2] = S.leg, U = H * 0.5, Lw = H * 0.5, dark = type === 'deer' || type === 'boar' ? 0x1c1612 : shade(S.legc, 0.7);
  const upper = limb(l0, l1, U, 0, 0, 0, S.top, S.legc), upperB = limb(l0 * 1.25, l1, U, 0, 0, 0, S.top, S.legc);
  const lower = merged([limb(l1 * 0.85, l2, Lw, 0, 0, 0, S.legc, shade(S.legc, 0.85)), ell(l2 * 1.35, l2 * 0.75, l2 * 1.8, 0, -Lw - l2 * 0.35, l2 * 0.7, dark, dark, 0, 0, 0, 8)]);
  return quadCache[type] = { torso: merged(torso), neck: merged(neck), nd, head: merged(head), tail: merged(tail), upper, upperB, lower, U, Lw };
}
function quadRig(type, def) {
  const S = SPECIES[type], Gq = quadGeos(type), size = def.size || 1, g = new THREE.Group(), root = group(g);
  mesh(root, Gq.torso);
  const neckG = group(root, 0, S.H + S.ch * 1.05, S.L * 0.36); mesh(neckG, Gq.neck); const headG = group(neckG, Gq.nd[0], Gq.nd[1], Gq.nd[2]); mesh(headG, Gq.head);
  const tailG = group(root, 0, S.H + S.hh * 1.35, -S.L * 0.5); mesh(tailG, Gq.tail);
  const legs = [], restH = [0, 0, -0.42, -0.42], restK = [0, 0, 0.84, 0.84], paw = S.leg[2] * 0.9;
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => {
    const back = sz < 0, hy = (back ? (Gq.U + Gq.Lw) * Math.cos(0.42) : Gq.U + Gq.Lw) + paw, hip = group(root, sx * (back ? S.hw : S.cw) * 0.62, hy, back ? -S.L * 0.3 : S.L * 0.27);
    mesh(hip, back ? Gq.upperB : Gq.upper); const knee = group(hip, 0, -Gq.U, 0); mesh(knee, Gq.lower); legs.push({ hip, knee });
  });
  g.scale.setScalar(size);
  const seed = Math.random() * 10, st = { neck: 0, lookY: 0, lunge: 0, fall: 0 };
  const rig = { g, h: (S.H + S.ch * 1.85) * size, r: Math.max(S.cw * 1.3, S.L * 0.42) * size, human: false };
  rig.pose = (m, dt, t) => {
    const k = Math.min(1, dt * 10);
    if (m.dead) { st.fall = Math.min(1, st.fall + dt * 2.6); const e = 1 - (1 - st.fall) * (1 - st.fall); g.rotation.set(0, m.yaw, e * 1.45); g.position.y = m.y + e * S.cw * size * 0.9; for (const l of legs) { l.hip.rotation.x = lerp(l.hip.rotation.x, 0.5, k * 0.4); l.knee.rotation.x = lerp(l.knee.rotation.x, 0.5, k * 0.4); } neckG.rotation.x = lerp(neckG.rotation.x, 0.9, k * 0.4); return; }
    const sp = m.speed, moving = sp > 0.1, run = sp > 4.2, A = moving ? Math.min(0.85, 0.22 + sp * 0.085) : 0, ph = m.phase, offs = run ? [0, 0.7, PI, PI + 0.7] : [0, PI, PI, 0];
    for (let i = 0; i < 4; i++) { const s = Math.sin(ph + offs[i]), c = Math.cos(ph + offs[i]), l = legs[i]; l.hip.rotation.x = lerp(l.hip.rotation.x, restH[i] + A * s, k * 2); l.knee.rotation.x = lerp(l.knee.rotation.x, restK[i] + A * 1.25 * Math.max(0, -c), k * 2); }
    const attack = m.wind > 0; st.lunge = lerp(st.lunge, attack ? 1 : 0, Math.min(1, dt * 14));
    root.position.y = moving ? Math.abs(Math.sin(ph)) * (run ? 0.05 : 0.02) : Math.sin(t * 1.6 + seed) * 0.006; root.position.z = st.lunge * 0.28; root.rotation.x = (run ? Math.sin(ph) * 0.07 : 0) - st.lunge * 0.12;
    const graze = def.passive && m.state === 'idle' && m.t > 1.5 && !moving, sniff = !def.passive && m.state === 'idle' && Math.sin(t * 0.4 + seed) > 0.6;
    st.neck = lerp(st.neck, graze ? 1.25 : sniff ? 0.7 : attack ? 0.25 : moving ? 0.28 : 0, k * 0.5); neckG.rotation.x = st.neck;
    st.lookY = lerp(st.lookY, moving || graze || attack ? 0 : Math.sin(t * 0.55 + seed) * 0.6, k * 0.3); headG.rotation.set(-st.neck * 0.45 + (attack ? -0.3 : 0), st.lookY, 0);
    tailG.rotation.y = Math.sin(t * (moving ? 5 : 2.2) + seed) * (type === 'wolf' ? 0.3 : 0.15); tailG.rotation.x = type === 'wolf' && run ? -0.5 : type === 'deer' && m.state === 'flee' ? -1.6 : 0;
    g.position.set(m.x, m.y, m.z); g.rotation.set(0, m.yaw, 0);
  };
  return rig;
}

// ---------------------------------------------------------------- people
const OUTFITS = {
  raider: [{ jacket: 0x5b4a39, pants: 0x35363a, hood: 0x3d342b, mask: 0x7a2e26, pack: 0x4a5240 }, { jacket: 0x48503f, pants: 0x4a4234, hood: 0x2c3028, mask: 0x8a7a55, pack: 0x5a4636 }, { jacket: 0x3f4752, pants: 0x2f2d2b, hood: 0x33373d, mask: 0x2a2a2a, pack: 0x6a5a3a }],
  gunner: [{ jacket: 0x4d5a42, pants: 0x43503a, vest: 0x34392c, helm: 0x47503c, pack: 0x3a4030 }, { jacket: 0x5d5a44, pants: 0x4d4a38, vest: 0x3a3a30, helm: 0x55523e, pack: 0x45422f }],
  warlord: [{ jacket: 0x232529, pants: 0x1c1d20, vest: 0x15161a, helm: 0x1b1c20, pack: 0x2a2c30 }],
};
const SKIN = [0xc79a78, 0xa87c5c, 0xd8b090, 0x8a6044];
const humanCache = {};
function humanGeos(type, v) {
  const key = type + v; if (humanCache[key]) return humanCache[key];
  const O = OUTFITS[type][v], skin = SKIN[(v * 2 + type.length) % SKIN.length], j = O.jacket, jd = shade(j, 0.72), p = O.pants, pd = shade(p, 0.7), boot = 0x161412, boss = type === 'warlord', armed = type !== 'raider';
  const pelvis = merged([ell(0.165, 0.12, 0.115, 0, 0.95, 0, p, pd), cylg(0.168, 0.17, 0.055, 0, 1.04, 0, 0x231c15, 0x231c15, 0, 0, 0, 12), rbox(0.05, 0.045, 0.02, 0, 1.04, 0.165, 0x8d8a80, 0x8d8a80)]);
  // torso, local to a pivot at the waist (y = 1.02)
  const torso = [ell(0.2, 0.21, 0.125, 0, 0.3, 0.005, j, jd), ell(0.17, 0.15, 0.11, 0, 0.1, 0, j, jd), ell(0.075, 0.062, 0.075, -0.2, 0.43, 0, j, jd), ell(0.075, 0.062, 0.075, 0.2, 0.43, 0, j, jd), limb(0.05, 0.047, 0.09, 0, 0.5, 0, skin, skin, PI), rbox(0.27, 0.36, 0.15, 0, 0.27, -0.185, O.pack, shade(O.pack, 0.7), 0, 0, 0, 0.04), rbox(0.2, 0.09, 0.1, 0, 0.5, -0.19, shade(O.pack, 1.2), O.pack, 0, 0, 0, 0.04)];
  if (armed) { torso.push(rbox(0.33, 0.3, 0.27, 0, 0.27, 0, O.vest, shade(O.vest, 0.75), 0, 0, 0, 0.05)); for (let i = -1; i <= 1; i++) torso.push(rbox(0.085, 0.11, 0.05, i * 0.1, 0.16, 0.145, shade(O.vest, 1.25), O.vest)); }
  else { torso.push(cylg(0.09, 0.12, 0.07, 0, 0.5, 0, O.mask, shade(O.mask, 0.7), 0, 0, 0, 10), rbox(0.035, 0.42, 0.03, 0.09, 0.3, 0.12, 0x2a2420, 0x2a2420, 0, 0, 0.5)); }
  if (boss) { for (const s of [-1, 1]) torso.push(ell(0.11, 0.07, 0.11, s * 0.23, 0.46, 0, 0x34373c, 0x1c1d20)); torso.push(rbox(0.2, 0.16, 0.04, 0, 0.36, 0.14, 0x3a3d42, 0x202226), cylg(0.2, 0.2, 0.04, 0, 0.05, 0, 0xa8873a, 0x6a5524, 0, 0, 0, 12)); }
  // head, local to a pivot at the neck top
  const head = [ell(0.092, 0.112, 0.102, 0, 0.1, 0.005, skin, shade(skin, 0.85)), ell(0.02, 0.026, 0.024, 0, 0.085, 0.105, shade(skin, 0.95), shade(skin, 0.85), 0, 0, 0, 7), ell(0.075, 0.05, 0.07, 0, 0.02, 0.02, shade(skin, 0.9), shade(skin, 0.8))];
  for (const s of [-1, 1]) head.push(ell(0.014, 0.01, 0.008, s * 0.036, 0.115, 0.093, 0x18120e, 0x18120e, 0, 0, 0, 6), ell(0.015, 0.03, 0.02, s * 0.094, 0.1, 0, skin, skin, 0, 0, 0, 6));
  if (type === 'raider') head.push(ell(0.112, 0.128, 0.122, 0, 0.115, -0.022, O.hood, shade(O.hood, 0.7)), ell(0.096, 0.058, 0.1, 0, 0.045, 0.016, O.mask, shade(O.mask, 0.7)), ell(0.1, 0.03, 0.09, 0, 0.19, 0.03, O.hood, O.hood));
  else if (!boss) head.push(paint(new THREE.SphereGeometry(1, 14, 7, 0, PI * 2, 0, PI * 0.56).scale(0.118, 0.115, 0.13).translate(0, 0.115, -0.004), O.helm, shade(O.helm, 0.7)), cylg(0.125, 0.128, 0.012, 0, 0.1, 0, shade(O.helm, 0.8), shade(O.helm, 0.8), 0, 0, 0, 14), rbox(0.012, 0.11, 0.012, -0.09, 0.03, 0.02, 0x2a241c, 0x2a241c), rbox(0.012, 0.11, 0.012, 0.09, 0.03, 0.02, 0x2a241c, 0x2a241c), ell(0.07, 0.03, 0.06, 0, 0.02, 0.05, shade(skin, 0.55), shade(skin, 0.5)));
  else head.push(ell(0.118, 0.13, 0.125, 0, 0.11, -0.005, O.helm, 0x0e0f11), rbox(0.17, 0.05, 0.05, 0, 0.115, 0.095, 0x6e1512, 0x2a0806, 0, 0, 0, 0.02), cylg(0.035, 0.04, 0.07, 0, 0.03, 0.115, 0x2a2c30, 0x15161a, PI / 2 + 0.3), cylg(0.022, 0.022, 0.05, 0.06, 0.02, 0.09, 0x3a3d42, 0x15161a, PI / 2, 0.6), cylg(0.022, 0.022, 0.05, -0.06, 0.02, 0.09, 0x3a3d42, 0x15161a, PI / 2, -0.6));
  const glove = armed ? 0x1f1d1a : skin;
  const upperArm = limb(0.06, 0.047, 0.28, 0, 0, 0, j, jd), foreArm = merged([limb(0.047, 0.037, 0.24, 0, 0, 0, type === 'raider' ? shade(j, 0.9) : j, type === 'raider' ? skin : jd), ell(0.04, 0.052, 0.03, 0, -0.29, 0.005, glove, glove, 0, 0, 0, 8), ell(0.014, 0.03, 0.014, 0.035, -0.28, 0.02, glove, glove, 0, 0, 0, 6)]);
  const thigh = limb(0.088, 0.066, 0.42, 0, 0, 0, p, pd), shin = merged([limb(0.064, 0.05, 0.4, 0, 0, 0, pd, shade(p, 0.55)), rbox(0.105, 0.11, 0.25, 0, -0.455, 0.05, boot, boot, 0, 0, 0, 0.035), rbox(0.11, 0.07, 0.12, 0, -0.38, 0.0, boot, boot, 0, 0, 0, 0.03)]);
  // weapons, built pointing along +z from the grip
  const st = 0x2a2d31, wd = 0x6a4a2c;
  const machete = merged([rbox(0.03, 0.035, 0.13, 0, 0, 0, 0x231c15, 0x231c15), rbox(0.012, 0.062, 0.5, 0, 0.006, 0.31, 0xc4ccd2, 0x8d959c, 0, 0, 0, 0.005), rbox(0.018, 0.085, 0.02, 0, 0, 0.07, 0x55585c, 0x55585c)]);
  const rifle = boss
    ? merged([rbox(0.05, 0.075, 0.34, 0, 0, 0.02, st, 0x16181b), rbox(0.045, 0.055, 0.3, 0, 0.005, 0.33, 0x34373c, 0x1c1e22), cylg(0.011, 0.011, 0.26, 0, 0.01, 0.6, st, st, PI / 2), cylg(0.018, 0.018, 0.07, 0, 0.01, 0.73, 0x16181b, 0x16181b, PI / 2), rbox(0.03, 0.13, 0.045, 0, -0.09, -0.05, 0x16181b, 0x16181b, -0.3), rbox(0.028, 0.2, 0.06, 0, -0.12, 0.13, 0x202226, 0x16181b, 0.2), rbox(0.04, 0.075, 0.26, 0, -0.005, -0.27, 0x16181b, 0x16181b), rbox(0.022, 0.02, 0.4, 0, 0.05, 0.12, 0x16181b, 0x16181b), cylg(0.02, 0.02, 0.12, 0, 0.075, 0.06, 0x16181b, 0x16181b, PI / 2)])
    : merged([rbox(0.045, 0.1, 0.34, 0, -0.035, -0.22, wd, shade(wd, 0.7), 0.1, 0, 0, 0.02), rbox(0.045, 0.055, 0.56, 0, -0.01, 0.2, wd, shade(wd, 0.7)), cylg(0.012, 0.013, 0.95, 0, 0.025, 0.33, st, st, PI / 2, 0, 0, 8), rbox(0.03, 0.04, 0.2, 0, 0.022, -0.02, st, st), cylg(0.008, 0.008, 0.07, 0.05, 0.022, 0.0, 0x8d959c, 0x8d959c, 0, 0, PI / 2, 6), rbox(0.005, 0.022, 0.012, 0, 0.05, 0.78, st, st), rbox(0.05, 0.02, 0.02, 0, -0.012, 0.45, st, st)]);
  return humanCache[key] = { pelvis, torso: merged(torso), head: merged(head), upperArm, foreArm, thigh, shin, weapon: armed ? rifle : machete };
}
function humanRig(type, def) {
  const variants = OUTFITS[type].length, Gh = humanGeos(type, Math.floor(Math.random() * variants)), size = def.size || 1, ranged = !!def.ranged;
  const g = new THREE.Group(), root = group(g); mesh(root, Gh.pelvis);
  const torso = group(root, 0, 1.02, 0); mesh(torso, Gh.torso); const headG = group(torso, 0, 0.56, 0); mesh(headG, Gh.head);
  const arms = [-1, 1].map((s) => { const sh = group(torso, s * 0.225, 0.43, 0); mesh(sh, Gh.upperArm); const el = group(sh, 0, -0.28, 0); mesh(el, Gh.foreArm); return { sh, el, s }; });
  const legs = [-1, 1].map((s) => { const hip = group(root, s * 0.095, 0.93, 0); mesh(hip, Gh.thigh); const knee = group(hip, 0, -0.42, 0); mesh(knee, Gh.shin); return { hip, knee }; });
  let gunG = null;
  if (ranged) { gunG = group(torso, 0.1, 0.3, 0.2); mesh(gunG, Gh.weapon, gearMat); } else { const w = group(arms[1].el, 0, -0.3, 0.03); mesh(w, Gh.weapon, gearMat); w.rotation.x = 0.25; }
  g.scale.setScalar(size);
  const seed = Math.random() * 10, st = { aim: 0, fall: 0, flinch: 0, lean: 0, swing: 0 };
  const rig = { g, h: 1.8 * size, r: 0.34 * size, human: true };
  const set = (o, x, y, z, k) => { o.rotation.x = lerp(o.rotation.x, x, k); o.rotation.y = lerp(o.rotation.y, y, k); o.rotation.z = lerp(o.rotation.z, z, k); };
  rig.pose = (m, dt, t, pitch = 0) => {
    const k = Math.min(1, dt * 12);
    if (m.dead) {
      st.fall = Math.min(1, st.fall + dt * 2.2); const e = 1 - (1 - st.fall) * (1 - st.fall) * (1 - st.fall); g.rotation.set(-e * 1.5, m.yaw, 0); g.position.y = m.y + e * 0.14 * size;
      for (const a of arms) { set(a.sh, -0.3, 0, a.s * 1.1, k * 0.3); set(a.el, -0.3, 0, 0, k * 0.3); } legs.forEach((l, i) => { set(l.hip, i ? -0.25 : 0.1, 0, i ? 0.12 : -0.12, k * 0.3); set(l.knee, i ? 0.5 : 0.1, 0, 0, k * 0.3); }); set(torso, 0, 0, 0, k * 0.3); set(headG, -0.3, 0.5, 0, k * 0.3); if (gunG) set(gunG, 0.9, 0.4, 0.8, k * 0.3); return;
    }
    const sp = m.speed, moving = sp > 0.1, A = moving ? Math.min(0.8, 0.28 + sp * 0.1) : 0, ph = m.phase, alert = m.alert > 0;
    legs.forEach((l, i) => { const a = ph + i * PI, s = Math.sin(a), c = Math.cos(a); l.hip.rotation.x = lerp(l.hip.rotation.x, A * s, k * 2); l.knee.rotation.x = lerp(l.knee.rotation.x, A * 1.5 * Math.max(0, -c) + 0.06, k * 2); });
    st.flinch = Math.max(0, (m.flinch || 0)); if (m.flinch > 0) m.flinch -= dt * 3;
    st.lean = lerp(st.lean, moving ? Math.min(0.22, sp * 0.035) : 0, k * 0.5); st.aim = lerp(st.aim, ranged && alert ? 1 : 0, Math.min(1, dt * 6));
    root.position.y = moving ? Math.abs(Math.cos(ph)) * 0.035 - 0.02 : Math.sin(t * 1.4 + seed) * 0.004;
    torso.rotation.set(st.lean - st.flinch * 0.35 - pitch * 0.8 * st.aim + Math.sin(t * 1.4 + seed) * 0.012, moving ? Math.sin(ph) * 0.09 : 0, 0);
    headG.rotation.set(-pitch * 0.2 * st.aim, alert || moving ? 0 : Math.sin(t * 0.5 + seed) * 0.55, 0);
    if (ranged) {
      const a = st.aim, sw = moving ? Math.sin(ph) * 0.05 : 0;
      gunG.position.set(lerp(0.13, 0.1, a), lerp(0.14, 0.34, a) + sw * 0.2, lerp(0.2, 0.2, a)); gunG.rotation.set(lerp(0.75, 0, a) + (m.wind > 0 ? -0.12 : 0), lerp(-0.5, 0, a), 0);
      set(arms[1].sh, lerp(-0.35, -0.75, a), 0, lerp(0.12, 0.2, a), k); set(arms[1].el, lerp(-1.25, -1.45, a), 0, 0, k);
      set(arms[0].sh, lerp(-0.7, -1.25, a), 0, lerp(0.75, 0.6, a), k); set(arms[0].el, lerp(-0.9, -0.55, a), 0, 0, k);
    } else {
      const s = Math.sin(ph) * A;
      set(arms[0].sh, s * 0.8, 0, -0.1, k * 2); set(arms[0].el, -0.3 - Math.max(0, s) * 0.5, 0, 0, k * 2);
      if (m.wind > 0) { const q = clamp(1 - m.wind / 0.3, 0, 1); set(arms[1].sh, lerp(-2.9, -0.7, q * q), 0, 0.15, 1); set(arms[1].el, lerp(-1.0, -0.15, q), 0, 0, 1); torso.rotation.y = lerp(-0.5, 0.45, q); }
      else { set(arms[1].sh, alert ? -0.9 - s * 0.3 : -s * 0.8, 0, 0.1, k * 2); set(arms[1].el, alert ? -1.3 : -0.3, 0, 0, k * 2); }
    }
    g.position.set(m.x, m.y, m.z); g.rotation.set(0, m.yaw, 0);
  };
  return rig;
}
export function mobModel(type, def) { return def.body === 'quad' ? quadRig(type, def) : humanRig(type, def); }

// ---------------------------------------------------------------- first-person hands and weapons
function bx(g, m, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, rad = 0.006) { const o = new THREE.Mesh(new RoundedBoxGeometry(sx, sy, sz, 2, Math.min(rad, sx / 2.01, sy / 2.01, sz / 2.01)), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; }
// cylinder along z by default
function cz(g, m, x, y, z, r, len, rx = PI / 2, rz = 0, sides = 14, r2 = r) { const o = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, len, sides), m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); g.add(o); return o; }
const armGeo = (() => {
  const sleeve = limbGeo(0.04, 0.052, 0.62, 12).rotateX(-PI / 2), cuff = new THREE.CylinderGeometry(0.046, 0.046, 0.035, 12).rotateX(PI / 2).translate(0, 0, 0.02).toNonIndexed();
  const hand = [new RoundedBoxGeometry(0.086, 0.034, 0.1, 3, 0.016).translate(0, 0, -0.045)];
  for (let i = 0; i < 4; i++) { const x = -0.032 + i * 0.0215, l = i === 0 || i === 3 ? 0.036 : 0.042; hand.push(new THREE.CapsuleGeometry(0.0105, l, 3, 7).rotateX(PI / 2 + 0.75).translate(x, -0.014, -0.11), new THREE.CapsuleGeometry(0.0098, l * 0.8, 3, 7).rotateX(0.35).translate(x, -0.046, -0.112)); }
  hand.push(new THREE.CapsuleGeometry(0.012, 0.04, 3, 7).rotateX(PI / 2 + 0.3).rotateY(-0.7).translate(-0.052, -0.006, -0.06));
  return { sleeve: mergeGeometries([sleeve, cuff].map((q) => { q.deleteAttribute('uv'); return q; })), hand: mergeGeometries(hand.map((q) => { const n = q.index ? q.toNonIndexed() : q; n.deleteAttribute('uv'); return n; })) };
})();
function arm(g, x, y, z, rx, ry, left) { const a = new THREE.Group(); a.name = 'arm'; a.add(new THREE.Mesh(armGeo.sleeve, MT.sleeve)); const h = new THREE.Mesh(armGeo.hand, MT.skin); if (left) h.scale.x = -1; a.add(h); a.position.set(x, y, z); a.rotation.set(rx, ry, 0); g.add(a); return a; }
function gunArms(g, fore = -0.32, gripY = -0.1) { arm(g, 0.02, gripY, 0.08, 0.3, -0.1); arm(g, -0.05, gripY + 0.035, fore, 0.5, -0.6, true); }
const lash = (g, y, z) => { for (let i = 0; i < 3; i++) cz(g, MT.string, 0, y + i * 0.012, z, 0.026, 0.008, 0, 0, 8); };

// Each builder draws the weapon pointing down -z with its sight line at y = sight.
const V = {
  fists(g) { arm(g, 0.05, -0.1, -0.05, 0.1, 0.1); const l = arm(g, -0.5, -0.1, -0.05, 0.1, -0.1, true); l.name = 'left'; g.userData.melee = 1; },
  stone_axe(g, metal) {
    cz(g, MT.wood, 0, 0.1, -0.1, 0.02, 0.64, 0, 0, 10, 0.017);
    if (metal) { bx(g, MT.steel, 0, 0.37, -0.15, 0.022, 0.13, 0.15, 0, 0, 0, 0.008); bx(g, MT.blade, 0, 0.37, -0.235, 0.008, 0.16, 0.03); bx(g, MT.gun, 0, 0.37, -0.1, 0.045, 0.07, 0.05); }
    else { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.085, 0).scale(0.32, 1, 1.25), MT.stone); s.position.set(0, 0.37, -0.17); g.add(s); lash(g, 0.35, -0.1); }
    arm(g, 0.0, -0.2, 0.06, 1.2, 0); g.userData.melee = 1;
  },
  iron_axe(g) { V.stone_axe(g, true); },
  hammer(g) { cz(g, MT.wood, 0, 0.1, -0.1, 0.02, 0.6, 0, 0, 10, 0.017); bx(g, MT.stone, 0, 0.37, -0.1, 0.075, 0.085, 0.2, 0, 0, 0, 0.02); lash(g, 0.315, -0.1); arm(g, 0.0, -0.2, 0.06, 1.2, 0); g.userData.melee = 1; },
  stone_pick(g, metal) {
    cz(g, MT.wood, 0, 0.1, -0.1, 0.02, 0.64, 0, 0, 10, 0.017);
    if (metal) { cz(g, MT.steel, 0, 0.385, -0.1, 0.012, 0.25, PI / 2 + 0.2, 0, 8, 0.024).position.z = -0.21; cz(g, MT.steel, 0, 0.385, 0.01, 0.024, 0.2, PI / 2 - 0.2, 0, 8, 0.012); bx(g, MT.gun, 0, 0.39, -0.1, 0.045, 0.06, 0.06); }
    else { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0).scale(0.4, 0.5, 3.2), MT.stone); s.position.set(0, 0.385, -0.1); g.add(s); lash(g, 0.365, -0.1); }
    arm(g, 0.0, -0.2, 0.06, 1.2, 0); g.userData.melee = 1;
  },
  iron_pick(g) { V.stone_pick(g, true); },
  club(g) { cz(g, MT.wood, 0, 0.06, -0.1, 0.02, 0.5, 0, 0, 10, 0.026); cz(g, MT.darkwood, 0, 0.4, -0.1, 0.03, 0.26, 0, 0, 10, 0.052); for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 5), MT.bone); s.position.set(Math.cos(i * 1.3) * 0.05, 0.36 + i * 0.03, -0.1 + Math.sin(i * 1.3) * 0.05); s.rotation.set(Math.sin(i * 1.3) * 1.5, 0, -Math.cos(i * 1.3) * 1.5); g.add(s); } arm(g, 0.0, -0.2, 0.06, 1.2, 0); g.userData.melee = 1; },
  machete(g) { bx(g, MT.black, 0, -0.08, -0.06, 0.03, 0.14, 0.036, 0, 0, 0, 0.012); bx(g, MT.blade, 0, 0.23, -0.072, 0.008, 0.5, 0.062, 0, 0, 0, 0.003); bx(g, MT.blade, 0, 0.47, -0.062, 0.008, 0.05, 0.045, 0.5); bx(g, MT.steel, 0, 0.0, -0.06, 0.022, 0.02, 0.1); arm(g, 0.0, -0.2, 0.06, 1.2, 0); g.userData.melee = 1; },
  spear(g) { cz(g, MT.wood, 0, 0, -0.3, 0.017, 1.7, PI / 2, 0, 9); const t = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.24, 6).scale(0.4, 1, 1), MT.bone); t.rotation.x = -PI / 2; t.position.set(0, 0, -1.26); g.add(t); for (let i = 0; i < 4; i++) cz(g, MT.string, 0, 0, -1.1 + i * 0.014, 0.022, 0.01, PI / 2, 0, 8); arm(g, 0.01, -0.03, 0.12, -0.1, 0); g.userData.melee = 1; g.userData.thrust = 1; },
  torch(g) { cz(g, MT.wood, 0, 0.08, -0.1, 0.02, 0.55, 0, 0, 9); cz(g, MT.cloth, 0, 0.37, -0.1, 0.038, 0.13, 0, 0, 9); const f = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 8), (() => { const fm = new THREE.MeshBasicMaterial(); fm.color.setRGB(7, 2.8, 0.6); return fm; })()); f.scale.set(0.06, 0.2, 0.06); f.position.set(0, 0.52, -0.1); f.name = 'flame'; g.add(f); const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), new THREE.MeshBasicMaterial({ color: 0xfff0b0 })); f2.position.set(0, 0.47, -0.1); g.add(f2); arm(g, 0.0, -0.2, 0.06, 1.2, 0); g.userData.melee = 1; },
  bow(g) { for (const s of [-1, 1]) { bx(g, MT.wood2, 0, s * 0.2, -0.3, 0.02, 0.42, 0.03, s * 0.28, 0, 0, 0.009); bx(g, MT.wood2, 0, s * 0.5, -0.2, 0.016, 0.3, 0.024, s * 0.7, 0, 0, 0.007); } bx(g, MT.cloth, 0, 0, -0.33, 0.026, 0.13, 0.036, 0, 0, 0, 0.012); const st = bx(g, MT.string, 0, 0, -0.1, 0.003, 1.2, 0.003); st.name = 'string'; const a = new THREE.Group(); cz(a, MT.wood2, 0, 0, 0, 0.006, 0.8, PI / 2, 0, 6); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 5), MT.stone); tip.rotation.x = -PI / 2; tip.position.z = -0.42; a.add(tip); for (const r of [0, 2.09, 4.18]) bx(a, MT.bone, Math.cos(r) * 0.012, Math.sin(r) * 0.012, 0.34, 0.002, 0.024, 0.09, 0, 0, r - PI / 2); a.position.set(0, 0, -0.45); a.name = 'arrow'; g.add(a); arm(g, 0.0, -0.05, -0.3, 1.2, 0); g.userData.sight = 0.0; },
  crossbow(g) { bx(g, MT.wood, 0, -0.05, -0.1, 0.05, 0.06, 0.7, 0, 0, 0, 0.015); bx(g, MT.wood, 0, -0.1, 0.22, 0.045, 0.13, 0.22, 0.15, 0, 0, 0.02); for (const s of [-1, 1]) { bx(g, MT.steel, s * 0.17, -0.03, -0.4, 0.36, 0.014, 0.03, 0, s * 0.3, 0, 0.005); bx(g, MT.string, s * 0.165, -0.03, -0.2, 0.37, 0.003, 0.003, 0, -s * 0.52); } bx(g, MT.gun, 0, -0.015, -0.45, 0.06, 0.03, 0.05); bx(g, MT.gun, 0, -0.1, 0.03, 0.012, 0.06, 0.012, 0.3); const a = cz(g, MT.steel, 0, -0.012, -0.3, 0.006, 0.45, PI / 2, 0, 6); a.name = 'arrow'; gunArms(g, -0.2); g.userData.sight = 0.02; g.userData.muzzle = [0, 0, -0.6]; },
  flintlock(g) { bx(g, MT.wood, 0, -0.065, 0.05, 0.036, 0.14, 0.06, 0.45, 0, 0, 0.016); bx(g, MT.wood, 0, -0.02, -0.1, 0.034, 0.04, 0.27, 0, 0, 0, 0.012); cz(g, MT.brass, 0, 0.012, -0.16, 0.014, 0.37, PI / 2, 0, 8); cz(g, MT.brass, 0, -0.125, 0.105, 0.024, 0.03, 0.45); bx(g, MT.steel, 0.022, 0.035, 0.0, 0.01, 0.055, 0.02, -0.4); bx(g, MT.steel, 0.022, 0.02, -0.035, 0.012, 0.03, 0.03); bx(g, MT.brass, 0, -0.055, -0.01, 0.008, 0.008, 0.08); arm(g, 0.02, -0.1, 0.1, 0.3, -0.1); g.userData.sight = 0.035; g.userData.muzzle = [0, 0.012, -0.36]; },
  musket(g) { bx(g, MT.wood, 0, -0.055, 0.24, 0.044, 0.105, 0.36, 0.13, 0, 0, 0.02); bx(g, MT.wood, 0, -0.03, -0.3, 0.04, 0.045, 0.82, 0, 0, 0, 0.014); cz(g, MT.steel, 0, 0.006, -0.45, 0.013, 1.16, PI / 2, 0, 10); cz(g, MT.wood2, 0, -0.058, -0.5, 0.005, 0.7, PI / 2, 0, 6); bx(g, MT.brass, 0.026, 0.02, 0.0, 0.012, 0.05, 0.05); bx(g, MT.steel, 0.026, 0.045, 0.03, 0.008, 0.05, 0.016, -0.5); for (const z of [-0.2, -0.55, -0.82]) bx(g, MT.brass, 0, -0.012, z, 0.048, 0.055, 0.018); bx(g, MT.brass, 0, -0.07, 0.03, 0.008, 0.008, 0.1); bx(g, MT.brass, 0, -0.06, 0.41, 0.046, 0.11, 0.012, 0.13); gunArms(g, -0.4); g.userData.sight = 0.03; g.userData.muzzle = [0, 0.006, -1.05]; },
  revolver(g) { bx(g, MT.wood, 0, -0.085, 0.05, 0.034, 0.13, 0.05, 0.38, 0, 0, 0.016); bx(g, MT.steel, 0, -0.012, -0.02, 0.028, 0.055, 0.13, 0, 0, 0, 0.008); cz(g, MT.steel, 0, -0.004, -0.03, 0.029, 0.072, PI / 2, 0, 12); for (let i = 0; i < 6; i++) cz(g, MT.gun, Math.cos(i * 1.047) * 0.029, -0.004 + Math.sin(i * 1.047) * 0.029, -0.03, 0.007, 0.074, PI / 2, 0, 6); cz(g, MT.steel, 0, 0.012, -0.18, 0.011, 0.21, PI / 2, 0, 10); bx(g, MT.steel, 0, -0.008, -0.16, 0.012, 0.02, 0.17); bx(g, MT.steel, 0, 0.03, -0.275, 0.005, 0.014, 0.01); bx(g, MT.steel, 0, 0.03, 0.045, 0.012, 0.03, 0.012, -0.5); bx(g, MT.steel, 0, -0.05, 0.0, 0.006, 0.006, 0.07); arm(g, 0.02, -0.1, 0.1, 0.3, -0.1); g.userData.sight = 0.04; g.userData.muzzle = [0, 0.012, -0.28]; },
  bolt_rifle(g, semi) { bx(g, MT.wood, 0, -0.055, 0.25, 0.044, 0.105, 0.34, 0.13, 0, 0, 0.02); bx(g, MT.wood, 0, -0.03, -0.2, 0.042, 0.05, 0.64, 0, 0, 0, 0.016); bx(g, MT.wood, 0, 0.0, -0.36, 0.036, 0.022, 0.3, 0, 0, 0, 0.01); cz(g, MT.gun, 0, 0.01, -0.4, 0.012, 1.06, PI / 2, 0, 10); bx(g, MT.gun, 0, 0.012, 0.02, 0.03, 0.036, 0.22, 0, 0, 0, 0.012); if (!semi) { cz(g, MT.steel, 0.035, 0.012, 0.07, 0.006, 0.06, 0, PI / 2, 6); const k = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), MT.steel); k.position.set(0.066, 0.006, 0.07); g.add(k); } bx(g, MT.gun, 0, 0.036, -0.9, 0.005, 0.022, 0.01); bx(g, MT.gun, 0, 0.034, -0.1, 0.016, 0.014, 0.03); bx(g, MT.steel, 0, -0.03, -0.55, 0.046, 0.05, 0.016); bx(g, MT.gun, 0, -0.075, 0.03, 0.008, 0.008, 0.09); bx(g, MT.gun, 0, -0.058, -0.06, 0.03, 0.02, 0.09); gunArms(g, -0.36); g.userData.sight = 0.04; g.userData.muzzle = [0, 0.01, -0.94]; },
  service_rifle(g) { V.bolt_rifle(g, true); cz(g, MT.gun, 0, -0.012, -0.56, 0.008, 0.56, PI / 2, 0, 8); bx(g, MT.steel, 0.022, 0.014, 0.0, 0.012, 0.014, 0.05); bx(g, MT.gun, 0, 0.045, 0.06, 0.02, 0.022, 0.03); },
  smg(g) { cz(g, MT.gun, 0, 0, -0.1, 0.023, 0.5, PI / 2, 0, 12); cz(g, MT.gun, 0, 0, -0.36, 0.026, 0.14, PI / 2, 0, 12); for (let i = 0; i < 5; i++) cz(g, MT.black, 0, 0.022, -0.31 - i * 0.022, 0.005, 0.012, 0, 0, 6); cz(g, MT.gun, 0, 0, -0.47, 0.011, 0.14, PI / 2, 0, 10); bx(g, MT.wood, 0, -0.085, 0.07, 0.03, 0.12, 0.042, 0.3, 0, 0, 0.014); bx(g, MT.gun, 0, -0.15, -0.12, 0.022, 0.26, 0.038, 0, 0, 0, 0.008); bx(g, MT.gun, 0, -0.03, -0.12, 0.03, 0.04, 0.06); bx(g, MT.gun, 0.014, -0.015, 0.33, 0.006, 0.012, 0.34); bx(g, MT.gun, -0.014, -0.015, 0.33, 0.006, 0.012, 0.34); bx(g, MT.gun, 0, -0.055, 0.5, 0.036, 0.1, 0.012); bx(g, MT.gun, 0, 0.032, -0.4, 0.005, 0.024, 0.01); bx(g, MT.gun, 0, 0.032, 0.08, 0.016, 0.02, 0.012); bx(g, MT.steel, 0.028, 0.004, -0.05, 0.016, 0.01, 0.012); gunArms(g, -0.14, -0.1); g.userData.sight = 0.04; g.userData.muzzle = [0, 0, -0.55]; },
  trench_gun(g) { bx(g, MT.wood, 0, -0.055, 0.25, 0.044, 0.105, 0.34, 0.13, 0, 0, 0.02); bx(g, MT.gun, 0, -0.006, -0.02, 0.04, 0.062, 0.27, 0, 0, 0, 0.012); cz(g, MT.gun, 0, 0.012, -0.5, 0.015, 0.76, PI / 2, 0, 12); cz(g, MT.gun, 0, -0.022, -0.42, 0.013, 0.56, PI / 2, 0, 10); const p = cz(g, MT.wood, 0, -0.022, -0.36, 0.027, 0.2, PI / 2, 0, 12); p.name = 'pump'; for (let i = 0; i < 6; i++) cz(g, MT.darkwood, 0, -0.022, -0.44 + i * 0.032, 0.0285, 0.008, PI / 2, 0, 12); for (let i = 0; i < 7; i++) bx(g, MT.steel, 0, 0.034, -0.56 - i * 0.04, 0.036, 0.004, 0.022); bx(g, MT.gun, 0, 0.04, -0.86, 0.006, 0.016, 0.01); bx(g, MT.gun, 0, -0.07, 0.03, 0.008, 0.008, 0.09); gunArms(g, -0.34); g.userData.sight = 0.04; g.userData.muzzle = [0, 0.012, -0.88]; },
  pistol(g) { bx(g, MT.black, 0, -0.085, 0.052, 0.03, 0.13, 0.052, 0.25, 0, 0, 0.012); bx(g, MT.gun, 0, 0.002, -0.05, 0.03, 0.04, 0.2, 0, 0, 0, 0.008); bx(g, MT.black, 0, -0.026, -0.06, 0.028, 0.022, 0.17, 0, 0, 0, 0.008); for (let i = 0; i < 6; i++) bx(g, MT.black, 0, 0.002, 0.02 + i * 0.008, 0.032, 0.03, 0.003); bx(g, MT.steel, 0.0155, 0.004, -0.06, 0.002, 0.016, 0.05); bx(g, MT.black, 0, 0.027, -0.14, 0.005, 0.012, 0.008); bx(g, MT.black, 0, 0.027, 0.04, 0.016, 0.012, 0.008); bx(g, MT.black, 0, -0.05, -0.015, 0.006, 0.006, 0.07); cz(g, MT.steel, 0, 0.002, -0.152, 0.008, 0.01, PI / 2, 0, 8); arm(g, 0.02, -0.1, 0.1, 0.3, -0.1); arm(g, -0.06, -0.12, 0.06, 0.35, -0.5, true); g.userData.sight = 0.035; g.userData.muzzle = [0, 0.0, -0.16]; },
  assault_rifle(g) { bx(g, MT.gun, 0, 0.002, -0.02, 0.044, 0.07, 0.34, 0, 0, 0, 0.012); bx(g, MT.black, 0, 0.002, -0.36, 0.046, 0.052, 0.34, 0, 0, 0, 0.016); for (let i = 0; i < 6; i++) bx(g, MT.gun, 0, 0.002, -0.24 - i * 0.045, 0.049, 0.03, 0.012); cz(g, MT.gun, 0, 0.006, -0.62, 0.0095, 0.22, PI / 2, 0, 10); cz(g, MT.black, 0, 0.006, -0.75, 0.014, 0.07, PI / 2, 0, 10); bx(g, MT.black, 0, -0.09, 0.085, 0.03, 0.12, 0.045, 0.3, 0, 0, 0.014); bx(g, MT.gun, 0, -0.13, -0.075, 0.026, 0.2, 0.062, -0.22, 0, 0, 0.01); bx(g, MT.black, 0, -0.012, 0.3, 0.034, 0.07, 0.28, 0, 0, 0, 0.014); bx(g, MT.black, 0, -0.045, 0.4, 0.03, 0.06, 0.1); cz(g, MT.gun, 0, 0.012, 0.16, 0.016, 0.12, PI / 2, 0, 10); bx(g, MT.black, 0, 0.046, -0.12, 0.022, 0.012, 0.5); for (let i = 0; i < 14; i++) bx(g, MT.gun, 0, 0.054, 0.1 - i * 0.034, 0.024, 0.005, 0.012); bx(g, MT.black, 0, 0.074, 0.06, 0.022, 0.032, 0.022); bx(g, MT.black, 0, 0.066, -0.5, 0.008, 0.04, 0.014); bx(g, MT.steel, 0.024, 0.01, -0.02, 0.006, 0.02, 0.07); bx(g, MT.black, 0, -0.045, -0.36, 0.022, 0.05, 0.03, 0.2); bx(g, MT.black, 0, -0.058, 0.005, 0.006, 0.006, 0.08); gunArms(g, -0.3, -0.11); g.userData.sight = 0.075; g.userData.muzzle = [0, 0.006, -0.79]; },
  combat_shotgun(g) { bx(g, MT.gun, 0, 0.002, -0.02, 0.045, 0.072, 0.34, 0, 0, 0, 0.012); cz(g, MT.gun, 0, 0.014, -0.5, 0.016, 0.7, PI / 2, 0, 12); cz(g, MT.black, 0, -0.022, -0.4, 0.016, 0.5, PI / 2, 0, 12); bx(g, MT.black, 0, -0.012, -0.34, 0.05, 0.062, 0.26, 0, 0, 0, 0.018); for (let i = 0; i < 6; i++) bx(g, MT.gun, 0, -0.012, -0.24 - i * 0.04, 0.053, 0.04, 0.01); bx(g, MT.black, 0, -0.09, 0.085, 0.03, 0.12, 0.045, 0.3, 0, 0, 0.014); bx(g, MT.black, 0, -0.012, 0.3, 0.034, 0.075, 0.28, 0, 0, 0, 0.014); bx(g, MT.black, 0, 0.044, -0.02, 0.022, 0.01, 0.3); bx(g, MT.black, 0, 0.062, 0.08, 0.02, 0.03, 0.014); bx(g, MT.steel, 0, 0.046, -0.84, 0.006, 0.02, 0.008); bx(g, MT.steel, 0.024, 0.008, -0.03, 0.006, 0.022, 0.09); bx(g, MT.black, 0, -0.058, 0.005, 0.006, 0.006, 0.08); gunArms(g, -0.34, -0.11); g.userData.sight = 0.05; g.userData.muzzle = [0, 0.014, -0.86]; },
  marksman(g) { bx(g, MT.poly, 0, -0.02, 0.0, 0.05, 0.08, 0.5, 0, 0, 0, 0.018); bx(g, MT.poly, 0, -0.04, 0.35, 0.04, 0.1, 0.28, 0, 0, 0, 0.018); bx(g, MT.black, 0, 0.022, 0.37, 0.034, 0.03, 0.18, 0, 0, 0, 0.012); bx(g, MT.black, 0, -0.045, 0.495, 0.042, 0.11, 0.012); cz(g, MT.gun, 0, 0.006, -0.62, 0.013, 0.9, PI / 2, 0, 12, 0.011); cz(g, MT.black, 0, 0.006, -1.1, 0.02, 0.12, PI / 2, 0, 12); for (let i = 0; i < 4; i++) cz(g, MT.gun, 0, 0.006, -1.07 - i * 0.022, 0.0205, 0.006, PI / 2, 0, 12); cz(g, MT.black, 0, 0.076, -0.05, 0.022, 0.26, PI / 2, 0, 14); cz(g, MT.black, 0, 0.076, -0.22, 0.03, 0.09, PI / 2, 0, 14, 0.024); cz(g, MT.black, 0, 0.076, 0.11, 0.026, 0.07, PI / 2, 0, 14); cz(g, MT.glass, 0, 0.076, -0.266, 0.027, 0.002, PI / 2, 0, 14); cz(g, MT.black, 0, 0.106, -0.04, 0.009, 0.02, 0, 0, 8); cz(g, MT.black, 0.03, 0.076, -0.04, 0.009, 0.02, 0, PI / 2, 8); for (const z of [-0.14, 0.04]) bx(g, MT.black, 0, 0.044, z, 0.024, 0.03, 0.024); bx(g, MT.black, 0, -0.1, 0.11, 0.03, 0.12, 0.045, 0.3, 0, 0, 0.014); bx(g, MT.gun, 0, -0.09, -0.06, 0.026, 0.1, 0.07); cz(g, MT.steel, 0.036, 0.004, 0.06, 0.005, 0.05, 0, PI / 2, 6); for (const s of [-1, 1]) cz(g, MT.black, s * 0.03, -0.09, -0.42, 0.006, 0.16, 0.3, s * 0.35, 6); gunArms(g, -0.34, -0.12); g.userData.sight = 0.076; g.userData.muzzle = [0, 0.006, -1.16]; },
};
export function viewModel(id) { const g = new THREE.Group(); (V[id] || V.fists)(g); g.traverse((m) => { if (m.isMesh) { m.frustumCulled = false; m.renderOrder = 5; } }); return g; }
// the same weapon with no arms, for items on the ground and inventory pictures
export function weaponModel(id) { if (!V[id]) return null; const g = new THREE.Group(); V[id](g); for (const c of g.children.slice()) if (c.name === 'arm') g.remove(c); g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g; }
