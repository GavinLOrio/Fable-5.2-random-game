// Hollowpine building: place a ghost blueprint, then carry materials to it piece by piece until it stands.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STRUCT_BY_ID, CROPS } from './data.js';

const M = 3, WH = 2.7, PI = Math.PI;
const LOG = [0x7a5a3a, 0x6b4e32, 0x80603c], PLANK = 0x8a6d4a, STONE = 0x8d9093, STEEL = 0x6b7178;
const C = new THREE.Color();
function tint(g, c) { C.set(c); const n = g.attributes.position.count, col = new Float32Array(n * 3), nor = g.attributes.normal; for (let i = 0; i < n; i++) { const k = 0.82 + 0.18 * Math.max(0, nor.getY(i)) + (i % 5) * 0.012; col[i * 3] = C.r * k; col[i * 3 + 1] = C.g * k; col[i * 3 + 2] = C.b * k; } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }
let li = 0;
const log = (len, r, x, y, z, axis = 'x', c = null, tip = false) => { const g = tip ? new THREE.CylinderGeometry(0.02, r, len, 7) : new THREE.CylinderGeometry(r, r, len, 7); if (axis === 'x') g.rotateZ(PI / 2); else if (axis === 'z') g.rotateX(PI / 2); g.translate(x, y, z); return tint(g, c || LOG[li++ % 3]); };
const box = (sx, sy, sz, x, y, z, c, ry = 0, rx = 0, rz = 0) => { const g = new THREE.BoxGeometry(sx, sy, sz); if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); return tint(g, c); };
const rock = (r, x, y, z, c = STONE) => { const g = new THREE.DodecahedronGeometry(r, 0); g.rotateY(x * 7 + z * 3); g.translate(x, y, z); return tint(g, c); };

// Part lists. Origin: bottom centre; walls run along local x.
const MODELS = {
  wall: () => [...Array(9)].map((_, i) => log(M, 0.15, 0, 0.15 + i * 0.3, 0)),
  doorway: () => { const a = []; for (let i = 0; i < 7; i++) for (const s of [-1, 1]) a.push(log(0.95, 0.15, s * 1.025, 0.15 + i * 0.3, 0)); a.push(log(M, 0.15, 0, 2.25, 0), log(M, 0.15, 0, 2.55, 0)); for (const s of [-1, 1]) a.push(box(0.12, 2.1, 0.34, s * 0.55, 1.05, 0, PLANK)); return a; },
  window: () => { const a = []; for (let i = 0; i < 9; i++) { if (i >= 3 && i <= 5) for (const s of [-1, 1]) a.push(log(0.9, 0.15, s * 1.05, 0.15 + i * 0.3, 0)); else a.push(log(M, 0.15, 0, 0.15 + i * 0.3, 0)); } return a; },
  palisade: () => [...Array(10)].map((_, i) => log(3.2 + (i % 3) * 0.14, 0.15, -1.35 + i * 0.3, 1.6 + (i % 3) * 0.07, 0, 'y', null, false)).concat([...Array(10)].map((_, i) => log(0.4, 0.15, -1.35 + i * 0.3, 3.4 + (i % 3) * 0.14, 0, 'y', 0x8a6d4a, true))),
  stone_wall: () => { const a = []; for (let r = 0; r < 6; r++) for (let i = 0; i < 4; i++) { const w = 0.75, off = (r % 2) * 0.375; a.push(box(w - 0.03, 0.43, 0.42 + ((i + r) % 3) * 0.03, -1.5 + w / 2 + i * w + off - (off && i === 3 ? 0.375 : 0), 0.225 + r * 0.45, 0, [0x8d9093, 0x7f8386, 0x979a9c][(i + r) % 3])); } return a; },
  metal_wall: () => { const a = [box(M, 0.12, 0.2, 0, 0.06, 0, 0x3d4246), box(M, 0.12, 0.2, 0, WH - 0.06, 0, 0x3d4246)]; for (const s of [-1.44, 0, 1.44]) a.push(box(0.12, WH, 0.2, s, WH / 2, 0, 0x3d4246)); for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) a.push(box(1.36, 0.82, 0.08, -0.72 + i * 1.44, 0.53 + j * 0.84, 0, j % 2 ? STEEL : 0x747b82)); return a; },
  gate: () => { const a = []; for (let i = 0; i < 9; i++) a.push(box(0.29, 2.5, 0.09, -1.2 + i * 0.3, 1.3, 0, i % 2 ? PLANK : 0x7d6142)); a.push(box(2.7, 0.14, 0.14, 0, 0.6, 0.06, 0x5a4630), box(2.7, 0.14, 0.14, 0, 2.0, 0.06, 0x5a4630), box(0.3, 0.1, 0.16, 1.1, 1.3, 0.08, STEEL)); return a; },
  door: () => { const a = []; for (let i = 0; i < 4; i++) a.push(box(0.255, 2.06, 0.07, -0.39 + i * 0.26, 1.04, 0, i % 2 ? PLANK : 0x7d6142)); a.push(box(1.0, 0.1, 0.1, 0, 0.5, 0.05, 0x5a4630), box(1.0, 0.1, 0.1, 0, 1.6, 0.05, 0x5a4630)); return a; },
  foundation: () => { const a = []; for (const sx of [-1.3, 1.3]) for (const sz of [-1.3, 1.3]) a.push(log(3.4, 0.17, sx, -1.9, sz, 'y')); for (const s of [-1.3, 1.3]) a.push(log(M, 0.13, 0, -0.42, s, 'x')); for (let i = 0; i < 10; i++) a.push(log(M, 0.15, -1.35 + i * 0.3, -0.15, 0, 'z')); return a; },
  floor: () => { const a = []; for (const s of [-1.3, 1.3]) a.push(log(M, 0.11, 0, -0.38, s, 'x')); for (let i = 0; i < 10; i++) a.push(log(M, 0.15, -1.35 + i * 0.3, -0.15, 0, 'z')); return a; },
  stairs: () => { const a = []; for (const s of [-0.75, 0.75]) a.push(box(0.1, 0.3, 4.1, s, 1.25, 0, 0x5a4630, 0, -0.733)); for (let i = 0; i < 9; i++) a.push(box(1.6, 0.08, 0.36, 0, 0.26 + i * 0.3, 1.5 - (i + 0.5) / 3, i % 2 ? PLANK : 0x7d6142)); return a; },
  roof: () => { const a = [], p = 0.42; for (let i = 0; i < 9; i++) { const z = 1.6 - i * 0.4; a.push(log(M + 0.3, 0.13, 0, 0.1 + (1.6 - z) * Math.tan(p), z, 'x')); } for (let i = 0; i < 6; i++) a.push(box(0.5, 0.05, 3.7, -1.25 + i * 0.5, 0.95, -0.1, 0x9a8a5a, 0, -p)); return a; },
  campfire: () => { const a = []; for (let i = 0; i < 8; i++) a.push(rock(0.16, Math.cos(i * 0.785) * 0.55, 0.08, Math.sin(i * 0.785) * 0.55)); for (let i = 0; i < 4; i++) a.push(box(0.07, 0.7, 0.07, Math.cos(i * 1.57) * 0.16, 0.3, Math.sin(i * 1.57) * 0.16, 0x4a3524, i * 1.57, 0, 0.5)); return a; },
  leanto: () => { const a = [log(1.9, 0.07, -1.2, 0.95, 0.7, 'y'), log(1.9, 0.07, 1.2, 0.95, 0.7, 'y'), log(2.8, 0.07, 0, 1.85, 0.7, 'x')]; for (let i = 0; i < 8; i++) a.push(box(0.3, 0.08, 2.7, -1.15 + i * 0.33, 0.95, -0.35, i % 2 ? 0x6b4e32 : 0x7a5a3a, 0, 0.75)); a.push(box(2.0, 0.1, 1.0, 0, 0.06, -0.2, 0x5d7a3c)); return a; },
  chest: () => [box(1.1, 0.5, 0.6, 0, 0.25, 0, PLANK), box(1.14, 0.14, 0.64, 0, 0.57, 0, 0x6b4e32), box(0.12, 0.16, 0.04, 0, 0.45, 0.31, STEEL), box(0.06, 0.66, 0.66, -0.4, 0.33, 0, 0x3d4246), box(0.06, 0.66, 0.66, 0.4, 0.33, 0, 0x3d4246)],
  collector: () => { const a = []; for (const sx of [-0.6, 0.6]) for (const sz of [-0.6, 0.6]) a.push(log(1.3, 0.04, sx, 0.65, sz, 'y')); a.push(box(1.3, 0.04, 1.3, 0, 1.15, 0, 0xcfc7b0, 0, 0.12, 0.1), log(0.45, 0.28, 0, 0.23, 0, 'y', 0x4a6a7a)); return a; },
  spikes: () => { const a = [log(2.8, 0.08, 0, 0.35, 0, 'x')]; for (let i = 0; i < 9; i++) { const g = new THREE.CylinderGeometry(0.01, 0.05, 1.5, 5); g.rotateX((i % 2 ? 1 : -1) * 0.75); g.translate(-1.2 + i * 0.3, 0.5, 0); a.push(tint(g, 0x8a6d4a)); } return a; },
  furnace: () => { const a = []; for (let r = 0; r < 4; r++) for (let i = 0; i < 8; i++) { const rad = 0.75 - r * 0.1, an = i * 0.785 + r * 0.4; if (r < 2 && i === 2) continue; a.push(rock(0.3, Math.cos(an) * rad, 0.22 + r * 0.42, Math.sin(an) * rad, r % 2 ? 0x7f8386 : STONE)); } a.push(log(1.2, 0.2, 0, 2.2, 0, 'y', 0x6f7376)); return a; },
  research1: () => { const a = []; for (const sx of [-0.8, 0.8]) for (const sz of [-0.35, 0.35]) a.push(log(0.85, 0.07, sx, 0.42, sz, 'y')); for (let i = 0; i < 4; i++) a.push(box(2.0, 0.08, 0.24, 0, 0.88, -0.36 + i * 0.24, i % 2 ? PLANK : 0x7d6142)); a.push(box(0.5, 0.02, 0.36, -0.5, 0.94, 0, 0xd8d0b8, 0.2), rock(0.1, 0.3, 1.0, 0.1), box(0.05, 0.3, 0.05, 0.6, 1.07, -0.1, 0x8d9093, 0, 0, 1.2), box(0.3, 0.3, 0.02, 0, 1.3, -0.44, 0xd8d0b8), box(0.04, 0.9, 0.04, 0, 1.3, -0.46, 0x5a4630)); return a; },
  research2: () => { const a = []; for (const sx of [-0.9, 0.9]) for (const sz of [-0.4, 0.4]) a.push(box(0.1, 0.9, 0.1, sx, 0.45, sz, 0x3d4246)); a.push(box(2.2, 0.08, 1.0, 0, 0.92, 0, STEEL), box(2.0, 0.05, 0.9, 0, 0.3, 0, 0x5a4630), box(0.26, 0.2, 0.2, -0.8, 1.06, 0.3, 0x3d4246), box(0.1, 0.12, 0.34, -0.8, 1.2, 0.3, 0x55585a), box(0.5, 0.3, 0.3, 0.6, 1.1, -0.2, 0x4c5540), log(0.5, 0.03, 0.1, 1.2, -0.3, 'y', 0x3d4246), box(0.2, 0.1, 0.2, 0.1, 1.46, -0.2, 0xd9c070, 0, 0.5), box(0.6, 0.5, 0.03, -0.2, 1.4, -0.48, 0x4a6a8a), box(0.5, 0.26, 0.4, 0.5, 0.46, 0.1, 0x7a3a30)); return a; },
  research3: () => { const a = []; a.push(box(2.4, 0.9, 1.0, 0, 0.45, 0, 0x3a3f45), box(2.5, 0.06, 1.1, 0, 0.93, 0, 0x8f979e)); for (const [x, ry] of [[-0.7, 0.3], [0, 0], [0.7, -0.3]]) { a.push(box(0.62, 0.42, 0.04, x, 1.32, -0.3 + Math.abs(x) * 0.12, 0x1c2023, ry), box(0.56, 0.36, 0.01, x, 1.32, -0.275 + Math.abs(x) * 0.12, 0x58d0c0, ry), box(0.06, 0.2, 0.06, x, 1.04, -0.3 + Math.abs(x) * 0.12, 0x1c2023)); } a.push(box(0.6, 0.03, 0.2, 0, 0.98, 0.2, 0x1c2023), log(1.6, 0.02, 1.1, 1.75, -0.4, 'y', 0x8f979e), box(0.3, 0.3, 0.5, -1.0, 1.1, 0.1, 0x4c5540), box(0.4, 0.5, 0.4, 0.9, 0.25, 0.8, 0x4c5540)); return a; },
  tower: () => { const a = []; for (const sx of [-1.6, 1.6]) for (const sz of [-1.6, 1.6]) a.push(log(7.6, 0.16, sx, 3.8, sz, 'y')); for (let i = 0; i < 12; i++) a.push(log(3.6, 0.15, -1.65 + i * 0.3, 4.85, 0, 'z')); for (const [x, z, ax, l] of [[0, -1.7, 'x', 3.6], [-1.7, 0, 'z', 3.6], [1.7, 0, 'z', 3.6], [-0.7, 1.7, 'x', 2.2]]) { a.push(log(l, 0.07, x, 5.5, z, ax), log(l, 0.07, x, 6.0, z, ax)); } for (let i = 0; i < 20; i++) a.push(box(1.2, 0.07, 0.38, 1.1, 0.215 + i * 0.25, 1.8 + 7.2 - (i + 0.5) * 0.36, i % 2 ? PLANK : 0x7d6142)); for (const s of [0.45, 1.75]) a.push(box(0.1, 0.24, 8.8, s, 2.4, 5.4, 0x5a4630, 0, -0.607)); for (let i = 0; i < 8; i++) a.push(box(0.5, 0.05, 4.2, -1.75 + i * 0.5, 7.7, 0, 0x9a8a5a, 0, 0.12)); return a; },
  plot: () => { const a = [box(1.7, 0.1, 1.7, 0, 0.03, 0, 0x3a2a1c)]; for (let i = 0; i < 4; i++) a.push(box(1.6, 0.07, 0.22, 0, 0.1, -0.6 + i * 0.4, 0x4a3524)); for (const [x, z, ax] of [[0, -0.9, 'x'], [0, 0.9, 'x'], [-0.9, 0, 'z'], [0.9, 0, 'z']]) a.push(log(1.9, 0.05, x, 0.06, z, ax)); return a; },
  planter: () => { const a = [box(1.5, 0.1, 0.8, 0, 0.05, 0, 0x5a4630)]; for (const z of [-0.37, 0.37]) for (let i = 0; i < 2; i++) a.push(box(1.5, 0.2, 0.06, 0, 0.2 + i * 0.21, z, i ? PLANK : 0x7d6142)); for (const x of [-0.72, 0.72]) a.push(box(0.06, 0.42, 0.8, x, 0.3, 0, 0x7d6142)); a.push(box(1.38, 0.3, 0.68, 0, 0.3, 0, 0x3a2a1c)); return a; },
  lamp: () => [log(2.6, 0.06, 0, 1.3, 0, 'y'), box(0.5, 0.06, 0.06, 0.2, 2.55, 0, 0x5a4630), box(0.2, 0.28, 0.2, 0.4, 2.3, 0, 0xffd27a), box(0.24, 0.04, 0.24, 0.4, 2.46, 0, 0x3d4246)],
};
// Colliders: [x, y0, z, sx, sy, sz]
const COLS = {
  wall: [[0, 0, 0, M, WH, 0.3]], palisade: [[0, 0, 0, M, 3.5, 0.3]], stone_wall: [[0, 0, 0, M, WH, 0.45]], metal_wall: [[0, 0, 0, M, WH, 0.2]], gate: [[0, 0, 0, 2.7, 2.6, 0.2]], door: [[0, 0, 0, 1.0, 2.1, 0.12]],
  doorway: [[-1.025, 0, 0, 0.95, WH, 0.3], [1.025, 0, 0, 0.95, WH, 0.3], [0, 2.1, 0, 1.1, 0.6, 0.3]],
  window: [[0, 0, 0, M, 0.9, 0.3], [0, 1.8, 0, M, 0.9, 0.3], [-1.05, 0.9, 0, 0.9, 0.9, 0.3], [1.05, 0.9, 0, 0.9, 0.9, 0.3]],
  foundation: [[0, -0.3, 0, M, 0.3, M]], floor: [[0, -0.3, 0, M, 0.3, M]], roof: [[0, 0.6, 0, M, 0.25, M]],
  stairs: [...Array(9)].map((_, i) => [0, i * 0.3, 1.5 - (i + 0.5) / 3, 1.6, 0.3, 0.34]),
  campfire: [[0, 0, 0, 0.9, 0.3, 0.9]], leanto: [[0, 0, -0.9, 2.6, 0.5, 0.3]], chest: [[0, 0, 0, 1.1, 0.64, 0.6]], collector: [[0, 0, 0, 0.6, 0.5, 0.6]], spikes: [[0, 0, 0, 2.8, 1.0, 0.9]], furnace: [[0, 0, 0, 1.6, 2.0, 1.6]],
  plot: [], planter: [[0, 0, 0, 1.5, 0.5, 0.8]], research1: [[0, 0, 0, 2.0, 0.92, 0.9]], research2: [[0, 0, 0, 2.2, 0.96, 1.0]], research3: [[0, 0, 0, 2.4, 0.96, 1.0]], lamp: [[0, 0, 0, 0.2, 2.6, 0.2]],
  tower: [[0, 4.7, 0, 3.6, 0.3, 3.6], [0, 5.0, -1.7, 3.6, 1.1, 0.14], [-1.7, 5.0, 0, 0.14, 1.1, 3.6], [1.7, 5.0, 0, 0.14, 1.1, 3.6], [-0.7, 5.0, 1.7, 2.2, 1.1, 0.14], ...[...Array(20)].map((_, i) => [1.1, i * 0.25, 9.0 - (i + 0.5) * 0.36, 1.2, 0.25, 0.38])],
};
const CENTER = { found: 0, floor: 0, wall: 1.35, door: 1.0, stairs: 1.35, free: 0.5 };
const LIGHT = { campfire: [0xff9a40, 1.6, 0.6], lamp: [0xffd27a, 1.3, 2.3], research3: [0x70e0d0, 0.5, 1.4], furnace: [0xff7030, 0.8, 0.6] };
const isPlat = (t) => t === 'foundation' || t === 'floor';

export function createBuild(scene, W) {
  const Bd = { structs: [], placing: null, yaw: 0, valid: false, snapped: false };
  const solidMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.3, depthWrite: false });
  const badMat = new THREE.MeshBasicMaterial({ color: 0xff5040, transparent: true, opacity: 0.35, depthWrite: false });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa030 });
  const geoCache = {};
  const partsOf = (type) => { if (!geoCache[type]) { li = 0; geoCache[type] = MODELS[type](); } return geoCache[type]; };
  const mergedCache = {};
  const mergedOf = (type) => mergedCache[type] || (mergedCache[type] = mergeGeometries(partsOf(type)));
  const total = (def) => Object.values(def.cost).reduce((a, b) => a + b, 0);
  const added = (s) => Object.values(s.prog).reduce((a, b) => a + b, 0);

  function setColliders(s, on) {
    for (const c of s.cols) W.removeCollider(c); s.cols.length = 0; if (!on) return;
    const cs = Math.cos(s.yaw), sn = Math.sin(s.yaw);
    for (const q of COLS[s.type] || []) s.cols.push(W.addCollider({ x: s.x + q[0] * cs + q[2] * sn, z: s.z - q[0] * sn + q[2] * cs, hx: q[3] / 2, hz: q[5] / 2, c: cs, s: sn, y0: s.y + q[1], y1: s.y + q[1] + q[4], struct: s }));
  }
  function rebuild(s) {
    while (s.group.children.length) s.group.remove(s.group.children[0]);
    s.partMeshes = null; s.flame = null;
    if (s.done) {
      const m = new THREE.Mesh(mergedOf(s.type), solidMat); m.castShadow = m.receiveShadow = true;
      if (s.type === 'door' || s.type === 'gate') { const hw = s.type === 'door' ? 0.5 : 1.35, p = new THREE.Group(); p.position.x = -hw; m.position.x = hw; p.add(m); s.group.add(p); s.pivot = p; p.rotation.y = s.open ? -1.5 : 0; } else s.group.add(m);
      if (s.type === 'campfire' || s.type === 'furnace') { const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 6), flameMat); f.position.y = s.type === 'campfire' ? 0.55 : 0.5; if (s.type === 'furnace') f.position.set(Math.cos(1.57) * 0.5, 0.45, Math.sin(1.57) * 0.5); s.group.add(f); s.flame = f; }
    } else {
      s.partMeshes = partsOf(s.type).map((g) => { const m = new THREE.Mesh(g, ghostMat); s.group.add(m); return m; }); refresh(s);
    }
  }
  // crops growing in a plot or planter
  const cropGeo = {};
  function cropGeos(id) {
    if (cropGeo[id]) return cropGeo[id]; const c = CROPS[id], leaves = [], fruit = [];
    for (let i = 0; i < 5; i++) { const g = new THREE.ConeGeometry(0.05 + c.h * 0.04, c.h, 4); g.translate(0, c.h / 2, 0); g.rotateZ(i ? 0.5 : 0); g.rotateY(i * 1.57); leaves.push(tint(g, c.leaf)); }
    if (id === 'pumpkin') { const g = new THREE.IcosahedronGeometry(0.2, 1); g.scale(1, 0.75, 1); g.translate(0.12, 0.14, 0.1); fruit.push(tint(g, c.color)); }
    else if (id === 'corn') for (const sgn of [-1, 1]) { const g = new THREE.CylinderGeometry(0.035, 0.05, 0.26, 6); g.rotateZ(sgn * 0.5); g.translate(sgn * 0.1, c.h * 0.55, 0); fruit.push(tint(g, c.color)); }
    else if (id === 'carrot' || id === 'potato') { const g = id === 'carrot' ? new THREE.ConeGeometry(0.06, 0.16, 6) : new THREE.IcosahedronGeometry(0.08, 0); g.translate(0.1, 0.05, 0.06); const t1 = tint(g, c.color); fruit.push(t1); const h = t1.clone(); h.translate(-0.2, 0, -0.12); fruit.push(h); }
    else for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(0.045, 0); g.translate(Math.cos(i * 1.05) * 0.14, c.h * (0.55 + (i % 3) * 0.14), Math.sin(i * 1.05) * 0.14); fruit.push(tint(g, c.color)); }
    return cropGeo[id] = [mergeGeometries(leaves), mergeGeometries(fruit)];
  }
  Bd.setCrop = (s) => {
    if (s.cropG) { s.group.remove(s.cropG); s.cropG = null; } if (!s.crop || !s.done) return;
    const [lg, fg] = cropGeos(s.crop.id), g = new THREE.Group(), spots = s.type === 'plot' ? [[-0.42, -0.42], [0.42, -0.4], [-0.4, 0.42], [0.42, 0.42]] : [[-0.38, 0], [0.38, 0]], y = s.type === 'plot' ? 0.1 : 0.45;
    spots.forEach(([x, z], i) => { const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = i * 1.3; const l = new THREE.Mesh(lg, solidMat); l.castShadow = true; const f = new THREE.Mesh(fg, solidMat); f.name = 'fruit'; p.add(l, f); g.add(p); });
    s.group.add(g); s.cropG = g; Bd.growCrop(s);
  };
  Bd.growCrop = (s) => { if (!s.cropG) return; const k = 0.2 + 0.8 * Math.min(1, s.crop.g); for (const p of s.cropG.children) { p.scale.setScalar(k); p.children[1].visible = s.crop.g >= 1; } };
  function refresh(s) { if (!s.partMeshes) return; const k = Math.floor(s.partMeshes.length * added(s) / total(s.def)); s.partMeshes.forEach((m, i) => { const on = i < k; m.material = on ? solidMat : ghostMat; m.castShadow = on; }); }

  Bd.place = (type, x, y, z, yaw, o = {}) => {
    const def = STRUCT_BY_ID[type], s = { type, def, x, y, z, yaw, done: !!o.done, prog: o.prog || {}, hp: o.hp != null ? o.hp : def.hp, cols: [], group: new THREE.Group(), open: !!o.open, inv: o.inv || (type === 'chest' ? {} : null), crop: o.crop || null, water: o.water != null ? o.water : 1 };
    s.group.position.set(x, y, z); s.group.rotation.y = yaw; scene.add(s.group); rebuild(s); Bd.setCrop(s); setColliders(s, s.done); if (s.done && s.open) for (const c of s.cols) c.off = true;
    Bd.structs.push(s); return s;
  };
  Bd.remove = (s) => { setColliders(s, false); scene.remove(s.group); const i = Bd.structs.indexOf(s); if (i >= 0) Bd.structs.splice(i, 1); };
  // what a blueprint still needs: [[item, have, need], ...]
  Bd.needs = (s) => Object.entries(s.def.cost).map(([k, n]) => [k, s.prog[k] || 0, n]);
  Bd.addOne = (s, has, take) => {
    for (const [k, have, need] of Bd.needs(s)) if (have < need && has(k)) { take(k); s.prog[k] = have + 1; refresh(s); if (added(s) >= total(s.def)) { s.done = true; s.hp = s.def.hp; rebuild(s); setColliders(s, true); } return k; }
    return null;
  };
  Bd.toggle = (s) => { s.open = !s.open; if (s.pivot) s.pivot.rotation.y = s.open ? -1.5 : 0; for (const c of s.cols) c.off = s.open; };
  Bd.damage = (s, d) => { s.hp -= d; if (s.hp <= 0) { Bd.remove(s); return true; } return false; };
  Bd.near = (x, z, r, pred) => { let best = null, bd = r; for (const s of Bd.structs) { if (!s.done || !pred(s)) continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } } return best; };
  Bd.lights = (out) => { for (const s of Bd.structs) { const L = LIGHT[s.type]; if (s.done && L) out.push({ x: s.x, y: s.y + L[2] + 0.5, z: s.z, color: L[0], power: L[1], flick: s.type === 'campfire' }); } };
  // nearest structure along a view ray (blueprints included, they have no colliders)
  Bd.target = (ox, oy, oz, dx, dy, dz, max) => {
    let best = null, bt = max;
    for (const s of Bd.structs) {
      const cy = s.y + (CENTER[s.def.snap] || 0.5), fx = s.x - ox, fy = cy - oy, fz = s.z - oz, t = fx * dx + fy * dy + fz * dz; if (t < 0 || t > bt + 1.5) continue;
      const px = fx - dx * t, py = fy - dy * t, pz = fz - dz * t, rad = s.def.snap === 'free' ? 0.9 : 1.3; if (px * px + py * py + pz * pz < rad * rad && t - 0.6 < bt) { bt = Math.max(0, t - 0.6); best = s; }
    }
    return best;
  };

  // ---- ghost placement
  const ghost = new THREE.Group(); ghost.visible = false; scene.add(ghost);
  Bd.start = (type) => { Bd.placing = type; while (ghost.children.length) ghost.remove(ghost.children[0]); ghost.add(new THREE.Mesh(mergedOf(type), ghostMat)); ghost.visible = true; };
  Bd.stop = () => { Bd.placing = null; ghost.visible = false; };
  const cand = [];
  const occupied = (cls, x, y, z, yaw) => { for (const s of Bd.structs) { if (Math.abs(s.x - x) + Math.abs(s.z - z) > 0.35 || Math.abs(s.y - y) > 0.35) continue; const sc = s.def.snap; if (cls === 'door') { if (s.type === 'door') return true; continue; } if (cls === 'wall' ? sc === 'wall' : (sc === cls || (cls === 'floor' && sc === 'found') || (cls === 'stairs' && sc === 'stairs'))) return true; } return false; };
  Bd.updateGhost = (ox, oy, oz, dx, dy, dz) => {
    const type = Bd.placing, def = STRUCT_BY_ID[type], cls = def.snap, k90 = Math.round(Bd.yaw / (PI / 2)) * (PI / 2);
    cand.length = 0;
    const add = (x, y, z, yaw) => { if (!occupied(cls, x, y, z, yaw)) cand.push([x, y, z, yaw]); };
    for (const s of Bd.structs) {
      if (Math.abs(s.x - ox) + Math.abs(s.z - oz) > 14) continue;
      const cs = Math.cos(s.yaw), sn = Math.sin(s.yaw), loc = (lx, lz) => [s.x + lx * cs + lz * sn, s.z - lx * sn + lz * cs], sc = s.def.snap;
      if (isPlat(s.type)) {
        if (cls === 'found' || (cls === 'floor' && s.type === 'floor')) for (const [a, b] of [[M, 0], [-M, 0], [0, M], [0, -M]]) { const p = loc(a, b); add(p[0], s.y, p[1], cls === 'floor' ? s.yaw + k90 : s.yaw); }
        if (cls === 'floor') add(s.x, s.y + WH + (type === 'roof' ? 0 : 0.3), s.z, s.yaw + k90);
        if (cls === 'wall') for (const [a, b, r] of [[M / 2, 0, PI / 2], [-M / 2, 0, PI / 2], [0, M / 2, 0], [0, -M / 2, 0]]) { const p = loc(a, b); add(p[0], s.y, p[1], s.yaw + r); }
        if (cls === 'stairs') add(s.x, s.y, s.z, s.yaw + k90);
      } else if (sc === 'wall') {
        if (cls === 'wall') { for (const a of [M, -M]) { const p = loc(a, 0); add(p[0], s.y, p[1], s.yaw); } for (const a of [M / 2, -M / 2]) for (const b of [M / 2, -M / 2]) { const p = loc(a, b); add(p[0], s.y, p[1], s.yaw + PI / 2); } add(s.x, s.y + WH, s.z, s.yaw); }
        if (cls === 'floor') for (const b of [M / 2, -M / 2]) { const p = loc(0, b); add(p[0], s.y + WH + (type === 'roof' ? 0 : 0.3), p[1], s.yaw + k90); }
        if (cls === 'door' && s.type === 'doorway') add(s.x, s.y, s.z, s.yaw);
      }
    }
    let best = null, bd = 1.5; const cyo = CENTER[cls] || 0;
    for (const c of cand) { const fx = c[0] - ox, fy = c[1] + cyo - oy, fz = c[2] - oz, t = Math.max(0.8, Math.min(9, fx * dx + fy * dy + fz * dz)), d = Math.hypot(fx - dx * t, fy - dy * t, fz - dz * t); if (d < bd) { bd = d; best = c; } }
    let x, y, z, yaw, ok = true;
    if (best) { [x, y, z, yaw] = best; Bd.snapped = true; }
    else {
      Bd.snapped = false; const t = W.ray(ox, oy, oz, dx, dy, dz, 9), hit = W.rayHit; x = ox + dx * t; z = oz + dz * t; y = oy + dy * t; yaw = Bd.yaw;
      const onPlat = hit.kind === 'solid' && hit.ref.struct && isPlat(hit.ref.struct.type) && Math.abs(y - hit.ref.y1) < 0.1;
      if (cls === 'floor' || cls === 'door') ok = false;
      else if (onPlat) { y = hit.ref.y1; if (cls !== 'free') ok = false; }
      else {
        if (hit.kind !== 'terrain') { const g = W.H(x, z); if (t >= 9 && oy - g < 6) y = g; else ok = false; }
        const g = W.H(x, z); if (ok) y = g; if (W.inWater(x, z) || g < 0.3) ok = false;
        if (cls === 'found') { let mx = g; for (const a of [-1.5, 1.5]) for (const b of [-1.5, 1.5]) mx = Math.max(mx, W.H(x + a, z + b)); y = mx + 0.35; if (mx - g > 2.2) ok = false; }
        else if (W.slope(x, z) > 0.75) ok = false;
      }
    }
    ghost.position.set(x, y, z); ghost.rotation.y = yaw; ghost.children[0].material = ok ? ghostMat : badMat; Bd.valid = ok; Bd.gx = x; Bd.gy = y; Bd.gz = z; Bd.gyaw = yaw;
  };
  Bd.confirm = () => (Bd.valid ? Bd.place(Bd.placing, Bd.gx, Bd.gy, Bd.gz, Bd.gyaw) : null);
  Bd.update = (t) => { for (const s of Bd.structs) if (s.flame) { const k = 0.85 + Math.sin(t * 13 + s.x) * 0.12 + Math.sin(t * 7.3) * 0.1; s.flame.scale.set(k, 0.8 + k * 0.4, k); } };
  Bd.save = () => Bd.structs.map((s) => [s.type, +s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2), +s.yaw.toFixed(3), s.done ? 1 : 0, s.prog, Math.round(s.hp), s.open ? 1 : 0, s.inv, s.crop ? [s.crop.id, +s.crop.g.toFixed(3), +s.crop.wet.toFixed(2)] : 0, s.water]);
  Bd.load = (arr) => { for (const s of Bd.structs.slice()) Bd.remove(s); for (const a of arr || []) if (STRUCT_BY_ID[a[0]]) Bd.place(a[0], a[1], a[2], a[3], a[4], { done: !!a[5], prog: a[6] || {}, hp: a[7], open: !!a[8], inv: a[9], crop: a[10] ? { id: a[10][0], g: a[10][1], wet: a[10][2] } : null, water: a[11] }); };
  return Bd;
}
