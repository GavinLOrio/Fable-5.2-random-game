// Hollowpine nature: shapes for harvestable plants and rocks, fallen logs, and the small ground clutter around the player.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const PI = Math.PI, TAU = PI * 2, UP = new THREE.Vector3(0, 1, 0);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const wob = (x, y, z, s) => Math.sin(x * 1.7 + s) * Math.sin(y * 2.3 + s * 0.5) * Math.sin(z * 1.9 + s * 1.3) + 0.5 * Math.sin(x * 4.1 + y * 3.3 + z * 2.7 + s * 2.1);
const CA = new THREE.Color(), CB = new THREE.Color();

// every piece ends up non-indexed with position, normal and colour so they all merge together
function fin(g) { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); return g; }
function colorize(g, fn) { g = fin(g); const p = g.attributes.position, n = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(c, p.getX(i), p.getY(i), p.getZ(i), n.getY(i), Math.floor(i / 3)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; }
const solid = (hex, jit = 0.12) => (c, x, y, z, ny, f) => c.set(hex).multiplyScalar(1 - jit / 2 + hash(f) * jit);
const vgrad = (bot, top, y0, y1, jit = 0.1) => (c, x, y, z, ny, f) => { const k = Math.max(0, Math.min(1, (y - y0) / (y1 - y0))); c.copy(CA.set(bot)).lerp(CB.set(top), k).multiplyScalar(1 - jit / 2 + hash(f) * jit); };
const merge = (list) => mergeGeometries(list.map(fin));
function rock(r, seed, o = {}) {
  const g = new THREE.IcosahedronGeometry(r, o.detail != null ? o.detail : 1), p = g.attributes.position, amt = o.amt != null ? o.amt : 0.22;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + amt * wob(x / r * 2, y / r * 2, z / r * 2, seed); p.setXYZ(i, x * k * (o.sx || 1), y * k * (o.sy || 1), z * k * (o.sz || 1)); }
  g.deleteAttribute('uv'); g.computeVertexNormals(); g.translate(o.x || 0, o.y != null ? o.y : r * (o.sy || 1) * 0.55, o.z || 0);
  return colorize(g, o.color || solid(0x7f8386));
}
// a tapered rod between two points
function rod(a, b, r1, r2, color, seg = 5) { const d = new THREE.Vector3().subVectors(b, a), len = d.length(), g = new THREE.CylinderGeometry(r2, r1, len, seg, 1, true); g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())); g.translate(a.x, a.y, a.z); return colorize(g, typeof color === 'function' ? color : solid(color, 0.14)); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mossy = (base, moss = 0x55703a, amt = 0.85) => (c, x, y, z, ny, f) => { c.set(base).multiplyScalar(0.84 + hash(f) * 0.26); if (ny > 0.45 && wob(x * 3, y, z * 3, 7) > -0.35) c.lerp(CA.set(moss), Math.min(1, (ny - 0.45) * 2.4) * amt); };

// ---------------------------------------------------------------- harvestable nodes
export function nodeGeometries() {
  const G = {};
  G.boulder = merge([rock(1.1, 1, { sy: 0.78, sz: 0.9, y: 0.5, color: mossy(0x80868a) }), rock(0.55, 2, { x: 0.85, z: 0.45, y: 0.22, color: mossy(0x737a7e) }), rock(0.34, 3, { x: -0.8, z: -0.35, y: 0.12, color: mossy(0x8a8f92, 0x5a7a3a, 0.6) })]);
  const ironCol = (c, x, y, z, ny, f) => { c.set(0x625650).multiplyScalar(0.82 + hash(f) * 0.3); const v = wob(x * 4, y * 4, z * 4, 3); if (v > 0.35) c.lerp(CA.set(v > 0.7 ? 0x9a5a34 : 0x86482a), 0.6); };
  const nug = []; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, t = 0.35 + (i % 3) * 0.2; nug.push(rock(0.11 + (i % 2) * 0.05, 20 + i, { detail: 0, x: Math.cos(a) * 0.82 * (1 - t * 0.4), z: Math.sin(a) * 0.72 * (1 - t * 0.4), y: 0.35 + t * 0.7, color: solid(i % 2 ? 0x3a3634 : 0x8a4a2a, 0.2) })); }
  G.iron = merge([rock(1.1, 4, { sy: 0.8, sz: 0.9, y: 0.5, color: ironCol }), rock(0.55, 5, { x: 0.85, z: 0.45, y: 0.22, color: ironCol }), ...nug]);
  const crystals = []; for (let i = 0; i < 9; i++) { const a = i * 0.7, g = new THREE.OctahedronGeometry(0.1, 0).scale(0.55, 2.3, 0.55); g.rotateZ(Math.cos(a) * 0.5); g.rotateX(Math.sin(a) * 0.5); g.translate(Math.cos(a) * 0.45, 0.95 + (i % 3) * 0.06, Math.sin(a) * 0.38); crystals.push(colorize(g, vgrad(0xc8b02a, 0xfff070, 0.75, 1.3, 0.08))); }
  G.sulfur = merge([rock(1.0, 6, { sy: 0.75, sz: 0.9, y: 0.45, color: (c, x, y, z, ny, f) => { c.set(0xa09a78).multiplyScalar(0.85 + hash(f) * 0.25); if (wob(x * 3, y * 3, z * 3, 9) > 0.3 || ny > 0.7) c.lerp(CA.set(0xd8c43a), 0.7); } }), ...crystals]);
  G.stone = merge([rock(0.2, 11, { sy: 0.65, color: solid(0x8a8e91, 0.2) }), rock(0.13, 12, { x: 0.27, z: 0.1, color: solid(0x7a7e81, 0.2) }), rock(0.09, 13, { x: -0.21, z: 0.17, color: solid(0x96989a, 0.2) }), rock(0.07, 14, { x: 0.05, z: -0.23, color: solid(0x6f7376, 0.2) })]);
  // sticks: crooked branches with twigs and a few dry leaves
  const sticks = []; for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.3, ca = Math.cos(a), sa = Math.sin(a), y = 0.03 + i * 0.03, p0 = V(-ca * 0.45, y, -sa * 0.45), p1 = V(ca * 0.05, y + 0.01, sa * 0.05 + 0.05), p2 = V(ca * 0.5 - sa * 0.12, y, sa * 0.5 + ca * 0.12); sticks.push(rod(p0, p1, 0.032, 0.026, 0x6e5236), rod(p1, p2, 0.026, 0.016, 0x7a5c3c), rod(p1, V(p1.x - sa * 0.22, y + 0.06, p1.z + ca * 0.22), 0.012, 0.005, 0x6e5236, 4)); }
  for (let i = 0; i < 8; i++) { const g = new THREE.CircleGeometry(0.05, 5).scale(1, 0.6, 1); g.rotateX(-PI / 2); g.rotateY(i * 1.3); g.translate(Math.cos(i * 2.1) * 0.35, 0.012 + i * 0.002, Math.sin(i * 2.1) * 0.3); sticks.push(colorize(g, solid([0x8a6a2a, 0x9a5a22, 0x6e5a2e][i % 3], 0.2))); }
  G.sticks = merge(sticks);
  // berry bush: leafy clumps, woody stems and berries on the outside
  const bush = [], clumps = [[0, 0.62, 0, 0.55], [0.45, 0.5, 0.2, 0.42], [-0.42, 0.48, -0.25, 0.44], [0.1, 0.42, -0.48, 0.38], [-0.2, 0.45, 0.45, 0.4], [0.15, 0.95, 0.05, 0.36], [-0.5, 0.3, 0.25, 0.3]];
  clumps.forEach(([x, y, z, r], i) => bush.push(rock(r, 30 + i, { x, y, z, amt: 0.2, sy: 0.85, color: (c, px, py, pz, ny, f) => { c.set(0x1c3514).lerp(CA.set(0x3a6424), Math.max(0, ny * 0.5 + 0.5) * 0.9).multiplyScalar(0.8 + hash(f) * 0.3); } })));
  for (let i = 0; i < 3; i++) bush.push(rod(V(0, 0, 0), V(Math.cos(i * 2.1) * 0.25, 0.5, Math.sin(i * 2.1) * 0.25), 0.04, 0.02, 0x4a3524));
  for (let i = 0; i < 18; i++) { const [cx, cy, cz, r] = clumps[i % clumps.length], u = hash(i + 3) * TAU, v = 0.15 + hash(i + 7) * 1.1, d = r * 0.98; const g = new THREE.OctahedronGeometry(0.05 + hash(i) * 0.015, 0); g.translate(cx + Math.cos(u) * Math.cos(v) * d, cy + Math.sin(v) * d * 0.8, cz + Math.sin(u) * Math.cos(v) * d); bush.push(colorize(g, solid(i % 3 ? 0xb0243f : 0x7a1830, 0.15))); }
  G.bush = merge(bush);
  // mushrooms: a cluster of caps on pale stems
  const mush = []; [[0, 0, 1], [0.13, 0.06, 0.7], [-0.08, 0.11, 0.55], [0.06, -0.13, 0.8]].forEach(([x, z, k], i) => { const h = 0.13 * k, r = 0.085 * k, tilt = (i - 1.5) * 0.15; mush.push(colorize(new THREE.CylinderGeometry(0.022 * k, 0.03 * k, h, 8).translate(x, h / 2, z), vgrad(0xd8c8a8, 0xf0e6d0, 0, h)));
    const cap = new THREE.SphereGeometry(r, 12, 6, 0, TAU, 0, PI / 2).scale(1, 0.62, 1); cap.rotateZ(tilt); cap.translate(x, h, z); mush.push(colorize(cap, vgrad(0xa0703e, 0x5e3a1e, h, h + r * 0.62, 0.08)));
    const gill = new THREE.CircleGeometry(r * 0.98, 12); gill.rotateX(PI / 2); gill.rotateZ(tilt); gill.translate(x, h + 0.002, z); mush.push(colorize(gill, solid(0xd8c8a0, 0.08))); });
  G.mushroom = merge(mush);
  // wild flax: tall blue-green stalks topped with sky-blue flowers and round seed heads; nothing like the grass around it
  const flax = [], stemCol = vgrad(0x3f6a52, 0x8fbca4, 0, 1.4, 0.08);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3, g = new THREE.ConeGeometry(0.03, 0.42, 3); g.translate(0, 0.21, 0); g.rotateZ(0.5); g.rotateY(a); flax.push(colorize(g, vgrad(0x2f5a40, 0x6f9a7a, 0, 0.4))); }
  for (let i = 0; i < 16; i++) {
    const a = hash(i) * TAU, rr = 0.04 + hash(i + 20) * 0.18, base = V(Math.cos(a) * rr, 0, Math.sin(a) * rr), h = 0.95 + hash(i + 40) * 0.5, lean = 0.1 + hash(i + 60) * 0.18, top = V(base.x + Math.cos(a) * lean, h, base.z + Math.sin(a) * lean);
    flax.push(rod(base, top, 0.013, 0.007, stemCol, 3));
    for (let k = 0; k < 2; k++) { const b = a + (k ? 1.1 : -1.1), tip = V(top.x + Math.cos(b) * 0.07, top.y + 0.07, top.z + Math.sin(b) * 0.07); flax.push(rod(top, tip, 0.005, 0.003, 0x7fae96, 3)); const bloom = (i + k) % 3 !== 0;
      const g = bloom ? new THREE.OctahedronGeometry(0.046, 0).scale(1, 0.3, 1) : new THREE.OctahedronGeometry(0.024, 0); g.translate(tip.x, tip.y + 0.01, tip.z); flax.push(colorize(g, bloom ? (c, x, y, z, ny, f) => c.set(ny > 0.3 ? 0x7fb4f2 : 0x4a7ac8).multiplyScalar(0.92 + hash(f) * 0.16) : solid(0xc8b070, 0.12))); }
  }
  G.flax = merge(flax);
  // fallen log: mossy trunk, a splintered end and a torn-up root plate
  const L = 4.2, logParts = [];
  const trunk = new THREE.CylinderGeometry(0.3, 0.34, L, 11, 4); trunk.rotateZ(PI / 2); trunk.translate(0, 0.28, 0);
  logParts.push(colorize(trunk, (c, x, y, z, ny, f) => { c.set(0x4a3626).multiplyScalar(0.8 + hash(f) * 0.32); if (ny > 0.35 && wob(x * 1.5, 0, z * 3, 4) > -0.3) c.lerp(CA.set(0x4f6a2a), Math.min(1, (ny - 0.35) * 2) * 0.9); }));
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, g = new THREE.ConeGeometry(0.07, 0.25 + hash(i) * 0.2, 4); g.rotateZ(-PI / 2); g.translate(L / 2 + 0.1, 0.28 + Math.sin(a) * 0.2, Math.cos(a) * 0.2); logParts.push(colorize(g, solid(0xa88458, 0.2))); }
  const plate = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 10); { const p = plate.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), k = 1 + 0.18 * Math.sin(Math.atan2(z, x) * 5 + 1); p.setX(i, x * k); p.setZ(i, z * k); } }
  plate.rotateZ(PI / 2); plate.translate(-L / 2 - 0.08, 0.55, 0); logParts.push(colorize(plate, solid(0x4a3a2a, 0.25)));
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; logParts.push(rod(V(-L / 2 - 0.1, 0.55 + Math.sin(a) * 0.5, Math.cos(a) * 0.5), V(-L / 2 - 0.35 - hash(i) * 0.3, 0.55 + Math.sin(a) * 1.0, Math.cos(a) * 1.0), 0.05, 0.015, 0x3a2a1c)); }
  for (let i = 0; i < 3; i++) logParts.push(rod(V(-0.8 + i * 0.9, 0.5, 0.05), V(-0.6 + i * 0.9, 0.85, 0.35 - i * 0.3), 0.06, 0.03, 0x4a3626));
  G.deadfall = merge(logParts);
  return G;
}

// ---------------------------------------------------------------- tree stump with roots and a pale cut face
export function stumpGeometry() {
  const parts = [colorize(new THREE.CylinderGeometry(0.3, 0.36, 0.5, 9).translate(0, 0.25, 0), solid(0x5e4630, 0.18))];
  const top = new THREE.CircleGeometry(0.3, 9); top.rotateX(-PI / 2); top.translate(0, 0.501, 0); parts.push(colorize(top, (c, x, y, z) => { const r = Math.hypot(x, z); c.set(0xc49a68).lerp(CA.set(0x8f6a44), Math.abs(Math.sin(r * 40)) * 0.4); }));
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.4; parts.push(rod(V(Math.cos(a) * 0.25, 0.18, Math.sin(a) * 0.25), V(Math.cos(a) * 0.7, -0.02, Math.sin(a) * 0.7), 0.1, 0.03, 0x4a3626)); }
  return merge(parts);
}

// ---------------------------------------------------------------- clutter shapes (drawn double sided with the grass material)
function upNormals(g) { const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); return g; }
function tris(list) { const pos = new Float32Array(list.length * 9), col = new Float32Array(list.length * 9), c = new THREE.Color(); list.forEach(([a, b, d, hex, k], i) => { c.set(hex).multiplyScalar(k || 1); [a, b, d].forEach((p, j) => { pos.set(p, i * 9 + j * 3); col.set([c.r, c.g, c.b], i * 9 + j * 3); }); }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return upNormals(g); }
function fernGeo() {
  const T = []; const fr = 7;
  for (let f = 0; f < fr; f++) {
    const a = f / fr * TAU + hash(f) * 0.5, L = 0.55 + hash(f + 9) * 0.3, H = 0.32 + hash(f + 5) * 0.16, ca = Math.cos(a), sa = Math.sin(a), N = 8, sp = [];
    for (let i = 0; i <= N; i++) { const t = i / N; sp.push([ca * L * t, H * Math.sin(t * PI * 0.8) + 0.02, sa * L * t]); }
    for (let i = 0; i < N; i++) { const t = i / N, w = 0.12 * (1 - t * 0.8), p0 = sp[i], p1 = sp[i + 1], m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2], hex = t < 0.3 ? 0x2c5222 : t < 0.65 ? 0x3e6a2a : 0x5a8a34, k = 0.85 + hash(f * 31 + i) * 0.3;
      for (const s of [-1, 1]) T.push([p0, [m[0] - sa * w * s + ca * w * 0.4, m[1] - w * 0.3, m[2] + ca * w * s + sa * w * 0.4], p1, hex, k]); }
  }
  return T;
}
function flowerGeo(head, center) {
  const T = []; for (let i = 0; i < 6; i++) { const a = hash(i + 3) * TAU, r = hash(i + 8) * 0.22, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.22 + hash(i + 13) * 0.2, w = 0.007;
    T.push([[x - w, 0, z], [x + w, 0, z], [x, h, z], 0x4a7a32, 1]);
    for (let p = 0; p < 5; p++) { const b = p / 5 * TAU + a, b2 = b + TAU / 10, R = 0.035; T.push([[x, h, z], [x + Math.cos(b) * R, h + 0.008, z + Math.sin(b) * R], [x + Math.cos(b2) * R * 0.6, h + 0.012, z + Math.sin(b2) * R * 0.6], head, 0.9 + hash(i * 5 + p) * 0.2]); }
    T.push([[x - 0.01, h + 0.014, z - 0.006], [x + 0.01, h + 0.014, z - 0.006], [x, h + 0.014, z + 0.012], center, 1]);
    T.push([[x, 0.01, z], [x + 0.09 * Math.cos(a + 1), 0.06, z + 0.09 * Math.sin(a + 1)], [x + 0.02, 0.03, z], 0x3f6a2a, 1]); }
  return T;
}
function litterGeo() { const T = []; for (let i = 0; i < 14; i++) { const a = hash(i) * TAU, r = hash(i + 4) * 0.45, x = Math.cos(a) * r, z = Math.sin(a) * r, y = 0.012 + hash(i + 9) * 0.02, b = hash(i + 2) * TAU, L = 0.06 + hash(i + 6) * 0.04, Wd = L * 0.55, hex = [0x8a6a2a, 0x9a5a22, 0x6e7a2e, 0x5a4428, 0xa0782e][i % 5]; const ax = Math.cos(b), az = Math.sin(b), p0 = [x - ax * L, y, z - az * L], p1 = [x + ax * L, y, z + az * L], q0 = [x - az * Wd, y + 0.004, z + ax * Wd], q1 = [x + az * Wd, y + 0.004, z - ax * Wd]; T.push([p0, q0, p1, hex, 1], [p0, p1, q1, hex, 0.9]); } return T; }

export function createClutter(scene, W, o) {
  const swayMat = o.sway, solidMat = o.solid, CS = 1.5, R = Math.round(o.radius / CS), N = (2 * R + 1) * (2 * R + 1);
  const pebbles = merge([0, 1, 2, 3].map((i) => rock(0.035 + hash(i) * 0.05, 40 + i, { detail: 0, sy: 0.55, x: Math.cos(i * 1.9) * 0.18, z: Math.sin(i * 1.9) * 0.15, y: 0.005, color: solid([0x7a7e81, 0x8a8478, 0x6a6e70, 0x908c84][i], 0.15) })));
  const kinds = [
    { geo: tris(fernGeo()), mat: swayMat }, { geo: tris(litterGeo()), mat: swayMat }, { geo: pebbles, mat: solidMat },
    { geo: tris(flowerGeo(0xf4f0e6, 0xf0c832)), mat: swayMat }, { geo: tris(flowerGeo(0xf0d040, 0xc89a20)), mat: swayMat }, { geo: tris(flowerGeo(0xa47ad8, 0xf0d060)), mat: swayMat },
  ];
  for (const k of kinds) { k.mesh = new THREE.InstancedMesh(k.geo, k.mat, N); k.mesh.count = 0; k.mesh.frustumCulled = false; k.mesh.receiveShadow = true; scene.add(k.mesh); }
  const H2 = (a, b, s) => { let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(s + 7, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  const D = new THREE.Object3D(); let lx = 1e9, lz = 1e9;
  return {
    update(px, pz) {
      const cx = Math.round(px / CS), cz = Math.round(pz / CS); if (Math.abs(cx - lx) < 3 && Math.abs(cz - lz) < 3) return; lx = cx; lz = cz;
      for (const k of kinds) k.mesh.count = 0;
      for (let iz = cz - R; iz <= cz + R; iz++) for (let ix = cx - R; ix <= cx + R; ix++) {
        const a = H2(ix, iz, 1); if (a > 0.5) continue; const x = (ix + H2(ix, iz, 2)) * CS, z = (iz + H2(ix, iz, 3)) * CS; if (!W.wild(x, z)) continue;
        const h = W.H(x, z), f = W.forest(x, z), q = H2(ix, iz, 4); let t = -1;
        if (h > 118) t = q < 0.5 ? 2 : -1;
        else if (f > 0.33) t = q < 0.3 ? 0 : q < 0.6 ? 1 : q < 0.7 ? 2 : q < 0.74 ? 3 : -1;
        else t = q < 0.32 ? 3 + Math.floor(H2(ix, iz, 5) * 3) : q < 0.44 ? 2 : q < 0.52 ? 0 : -1;
        if (t < 0) continue; const k = kinds[t], s = 0.7 + H2(ix, iz, 6) * 0.6;
        D.position.set(x, h - 0.02, z); D.rotation.set(0, a * 12.57, 0); D.scale.set(s, s * (t === 0 ? 0.8 + q : 1), s); D.updateMatrix(); k.mesh.setMatrixAt(k.mesh.count++, D.matrix);
      }
      for (const k of kinds) k.mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
