// Hollowpine item art: a 3D model for every item, used for items lying on the ground and rendered into inventory icons.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ITEMS } from './data.js';
import { weaponModel } from './models.js';

const PI = Math.PI;
// ---------------------------------------------------------------- materials and shape helpers
const mats = new Map();
const S = (color, rough = 0.8, metal = 0, extra = null) => { const k = `${color}|${rough}|${metal}|${extra ? JSON.stringify(extra) : ''}`; let m = mats.get(k); if (!m) mats.set(k, m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...(extra || {}) })); return m; };
const FLAT = { flatShading: true };
function mesh(g, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; }
const box = (g, m, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0, r = 0.006) => mesh(g, new RoundedBoxGeometry(sx, sy, sz, 2, Math.min(r, sx / 2.01, sy / 2.01, sz / 2.01)), m, x, y, z, rx, ry, rz);
// cylinder: r0 at the bottom, r1 at the top, axis along y before rotation
const cyl = (g, m, r0, r1, h, x, y, z, rx = 0, ry = 0, rz = 0, seg = 14) => mesh(g, new THREE.CylinderGeometry(r1, r0, h, seg), m, x, y, z, rx, ry, rz);
const ball = (g, m, rx, ry, rz, x, y, z, seg = 12) => { const o = mesh(g, new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.7))), m, x, y, z); o.scale.set(rx, ry, rz); return o; };
const torus = (g, m, R, r, x, y, z, rx = 0, ry = 0, rz = 0, seg = 24, arc = PI * 2) => mesh(g, new THREE.TorusGeometry(R, r, 6, seg, arc), m, x, y, z, rx, ry, rz);
const lathe = (g, m, pts, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 20) => mesh(g, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), m, x, y, z, rx, ry, rz);
const wobble = (x, y, z, s) => Math.sin(x * 1.7 + s) * Math.sin(y * 2.3 + s * 0.5) * Math.sin(z * 1.9 + s * 1.3) + 0.5 * Math.sin(x * 4.1 + y * 3.3 + s * 2.1);
function rockGeo(r, seed, detail = 1, sx = 1, sy = 1, sz = 1, amt = 0.2) {
  let geo = new THREE.IcosahedronGeometry(r, detail); geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo = mergeVertices(geo); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + amt * wobble(x / r * 2.2, y / r * 2.2, z / r * 2.2, seed); p.setXYZ(i, x * k * sx, y * k * sy, z * k * sz); }
  geo.computeVertexNormals(); return geo;
}
const rock = (g, m, r, x, y, z, seed, sx = 1, sy = 1, sz = 1, detail = 1, amt = 0.2) => mesh(g, rockGeo(r, seed, detail, sx, sy, sz, amt), m, x, y, z, 0, seed, 0);
const ALONG_X = [0, 0, PI / 2], ALONG_Z = [PI / 2, 0, 0];
const rodX = (g, m, r0, r1, len, x, y, z, yaw = 0, seg = 10) => cyl(g, m, r0, r1, len, x, y, z, 0, yaw, PI / 2, seg);

// ---------------------------------------------------------------- shared palettes
const C = {
  bark: S(0x5a412c, 0.95), bark2: S(0x46321f, 0.95), endwood: S(0xc49a68, 0.85), ring: S(0x8f6a44, 0.9), moss: S(0x4d6a2c, 1), twig: S(0x6e5236, 0.9),
  stone: S(0x8a8e91, 0.9, 0, FLAT), stone2: S(0x73777a, 0.9, 0, FLAT), steel: S(0xb4bcc4, 0.35, 0.9), darksteel: S(0x4b5258, 0.45, 0.8), brass: S(0xc9a03a, 0.32, 0.95), copper: S(0xb8733a, 0.38, 0.9),
  paper: S(0xe8dcc0, 0.95), cloth: S(0xd8d0bc, 0.95), twine: S(0xc9b17a, 0.9), red: S(0xc8352e, 0.55), white: S(0xf2efe6, 0.6), leaf: S(0x4f8a3a, 0.75), leaf2: S(0x3f7330, 0.75), black: S(0x1e2022, 0.6),
};

// ---------------------------------------------------------------- one builder per item (models rest on the ground, y up, real size)
const B = {
  log(g) {
    rodX(g, C.bark, 0.15, 0.15, 1.0, 0, 0.15, 0, 0, 16);
    for (const s of [-1, 1]) { rodX(g, C.endwood, 0.138, 0.138, 0.012, s * 0.502, 0.15, 0, 0, 16); for (const R of [0.045, 0.09]) torus(g, C.ring, R, 0.004, s * 0.509, 0.15, 0, 0, PI / 2, 0, 18); }
    for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2 + 0.2; box(g, C.bark2, 0.94, 0.026, 0.034, 0, 0.15 + Math.sin(a) * 0.148, Math.cos(a) * 0.148, PI / 2 - a, 0, 0, 0.008); }
    cyl(g, C.bark, 0.042, 0.022, 0.16, 0.18, 0.29, 0.05, 0.4, 0, -0.3, 8); ball(g, C.moss, 0.2, 0.04, 0.09, -0.18, 0.292, 0.02);
  },
  stick(g) {
    [[0.74, 0, 0.0], [0.66, 0.03, 0.42], [0.7, -0.035, -0.3]].forEach(([len, z, yaw], i) => { rodX(g, C.twig, 0.017, 0.012, len, 0, 0.018 + i * 0.024, z, yaw, 7); const k = i % 2 ? 1 : -1; cyl(g, C.twig, 0.009, 0.004, 0.16, 0.12 * k, 0.03 + i * 0.024, z + 0.05, 0, yaw + 0.9 * k, PI / 2, 5); ball(g, C.bark2, 0.02, 0.016, 0.016, -0.2 * k, 0.03 + i * 0.024, z, 6); });
  },
  stone(g) { rock(g, C.stone, 0.09, 0, 0.07, 0, 1, 1.25, 0.8, 1); rock(g, C.stone2, 0.065, 0.13, 0.05, 0.05, 2); rock(g, C.stone, 0.05, -0.08, 0.035, 0.1, 3, 1, 0.75, 1); },
  fiber(g) {
    for (let i = 0; i < 16; i++) { const z = (i - 7.5) * 0.008, sp = (i - 7.5) * 0.025; box(g, S(i % 3 === 0 ? 0xb4c47a : i % 2 ? 0x9fb46a : 0x8aa35a, 0.9), 0.66 + (i % 4) * 0.03, 0.01, 0.016, (i % 3) * 0.02, 0.012 + (i % 3) * 0.008, z, 0, sp * 0.3, 0, 0.004); }
    for (const x of [-0.12, 0.14]) rodX(g, C.twine, 0.074, 0.074, 0.035, x, 0.03, 0, 0, 14);
    for (let i = 0; i < 6; i++) cone(g, S(0xb4a868, 0.9), 0.01, 0.07, 0.4, 0.016, (i - 2.5) * 0.02, 0, (i - 2.5) * 0.14, -PI / 2, 5);
  },
  rope(g) { const m = S(0xb89a62, 0.95); for (let i = 0; i < 4; i++) torus(g, m, 0.11 - i * 0.006, 0.013, 0, 0.013 + i * 0.024, 0, PI / 2, 0, 0, 28); rodX(g, m, 0.013, 0.013, 0.2, 0.17, 0.013, 0.04, 0.4, 8); torus(g, S(0x8a6e42, 0.95), 0.016, 0.006, 0.27, 0.013, 0.08, 0, 0.4, 0, 10); },
  cloth(g) { box(g, C.cloth, 0.36, 0.035, 0.26, 0, 0.018, 0, 0, 0, 0, 0.015); box(g, S(0xcbc2aa, 0.95), 0.34, 0.032, 0.24, 0.01, 0.05, 0, 0, 0.12, 0, 0.014); box(g, S(0x8a3a30, 0.9), 0.342, 0.004, 0.03, 0.01, 0.067, 0.05, 0, 0.12, 0); box(g, S(0x8a3a30, 0.9), 0.342, 0.004, 0.012, 0.01, 0.067, 0.08, 0, 0.12, 0); },
  hide(g) {
    const geo = new THREE.CircleGeometry(0.3, 28); const p = geo.attributes.position;
    for (let i = 1; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), a = Math.atan2(y, x), k = 1 + 0.28 * Math.max(0, Math.cos(a * 4 + 0.4)) - 0.12 * Math.sin(a * 2); p.setXY(i, x * k * 1.25, y * k); }
    geo.rotateX(-PI / 2); for (let i = 0; i < p.count; i++) p.setY(i, 0.012 + 0.02 * Math.sin(p.getX(i) * 9) * Math.cos(p.getZ(i) * 7)); geo.computeVertexNormals();
    mesh(g, geo, S(0x8a5f3a, 0.95, 0, { side: THREE.DoubleSide })); const in2 = geo.clone(); in2.scale(0.72, 1, 0.72); in2.translate(0, 0.006, 0); mesh(g, in2, S(0x6e4a2c, 1, 0, { side: THREE.DoubleSide }));
  },
  bone(g) { const m = S(0xe6dfc8, 0.7); rodX(g, m, 0.017, 0.017, 0.26, 0, 0.032, 0, 0, 10); for (const s of [-1, 1]) for (const z of [-0.018, 0.018]) ball(g, m, 0.03, 0.028, 0.03, s * 0.13, 0.032, z, 10); },
  iron_ore(g) { rock(g, S(0x5a4a42, 0.9, 0.1, FLAT), 0.1, 0, 0.08, 0, 5, 1.2, 0.85, 1); rock(g, S(0x4f423b, 0.9, 0.1, FLAT), 0.065, 0.13, 0.05, 0.04, 6); for (let i = 0; i < 7; i++) rock(g, S(i % 2 ? 0xa5532f : 0xc0693a, 0.7, 0.2, FLAT), 0.028, Math.cos(i * 1.9) * 0.085, 0.08 + Math.sin(i) * 0.04, Math.sin(i * 1.9) * 0.07, 7 + i, 1, 1, 1, 0); },
  sulfur(g) { rock(g, S(0xbdb37a, 0.9, 0, FLAT), 0.08, 0, 0.05, 0, 8, 1.2, 0.65, 1); const y = S(0xf0d838, 0.45, 0, { emissive: 0x3a3000 }); for (let i = 0; i < 8; i++) { const a = i * 0.8; mesh(g, new THREE.OctahedronGeometry(0.03, 0).scale(0.7, 2.2, 0.7), y, Math.cos(a) * 0.05, 0.09, Math.sin(a) * 0.04, Math.sin(a) * 0.5, a, Math.cos(a) * 0.6); } },
  charcoal(g) { const m = S(0x262422, 0.95, 0, FLAT), m2 = S(0x3a3532, 0.9, 0, FLAT); rock(g, m, 0.07, 0, 0.04, 0, 9, 1.5, 0.6, 1); rock(g, m2, 0.055, 0.1, 0.035, 0.05, 10, 1.3, 0.6, 1); rock(g, m, 0.045, -0.07, 0.03, 0.08, 11, 1.2, 0.6, 1); },
  metal(g) { for (const [y, yaw] of [[0, 0], [0.05, PI / 2]]) { const o = mesh(g, new THREE.CylinderGeometry(0.06, 0.08, 0.05, 4), C.steel, 0, y + 0.025, 0, 0, PI / 4 + yaw, 0); o.scale.set(1.9, 1, 0.75); o.rotation.y = yaw; o.geometry.rotateY(PI / 4); } },
  scrap(g) { const rust = S(0x8a5a3a, 0.8, 0.4), grey = S(0x6b7178, 0.55, 0.8); box(g, rust, 0.24, 0.012, 0.15, 0, 0.02, 0, 0, 0.3, 0.15); box(g, grey, 0.17, 0.01, 0.11, 0.04, 0.05, -0.02, 0.3, -0.5, -0.1); cyl(g, C.darksteel, 0.025, 0.025, 0.16, -0.07, 0.03, 0.06, 0, 0.6, PI / 2, 10); torus(g, grey, 0.02, 0.008, 0.1, 0.012, 0.07, PI / 2, 0, 0, 6); cyl(g, C.steel, 0.006, 0.006, 0.08, 0.13, 0.012, -0.05, 0, 1, PI / 2, 6); },
  gunpowder(g) { lathe(g, S(0x6a6050, 1), [[0, 0], [0.07, 0.005], [0.09, 0.04], [0.085, 0.09], [0.05, 0.12], [0.028, 0.135], [0.045, 0.16], [0.02, 0.172], [0, 0.172]]); torus(g, C.twine, 0.03, 0.006, 0, 0.133, 0, PI / 2); ball(g, S(0x232120, 1), 0.07, 0.015, 0.05, 0.1, 0.004, 0.04, 10); box(g, S(0xe8dcc0, 0.9), 0.05, 0.002, 0.04, 0.0, 0.07, 0.09, 1.2, 0, 0); },
  parts(g) {
    cyl(g, C.steel, 0.06, 0.06, 0.018, 0, 0.009, 0, 0, 0, 0, 24); for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; box(g, C.steel, 0.022, 0.018, 0.016, Math.cos(a) * 0.068, 0.009, Math.sin(a) * 0.068, 0, -a, 0, 0.002); } cyl(g, C.darksteel, 0.016, 0.016, 0.02, 0, 0.012, 0, 0, 0, 0, 12);
    const pts = []; for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * PI * 16; pts.push(new THREE.Vector3(0.1 + t * 0.12, 0.022 + Math.sin(a) * 0.016, 0.06 + Math.cos(a) * 0.016)); } mesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.003, 5), C.steel);
    rodX(g, C.brass, 0.005, 0.005, 0.1, 0.07, 0.006, -0.08, 0.5, 8);
  },
  electronics(g) { box(g, S(0x2f7a4a, 0.6), 0.16, 0.008, 0.11, 0, 0.004, 0, 0, 0, 0, 0.002); box(g, C.black, 0.04, 0.008, 0.04, -0.03, 0.012, -0.015); box(g, C.black, 0.028, 0.008, 0.02, 0.035, 0.012, 0.025); box(g, C.black, 0.028, 0.008, 0.02, 0.035, 0.012, -0.02); cyl(g, S(0x2a4f8a, 0.5), 0.008, 0.008, 0.022, -0.055, 0.019, 0.03, 0, 0, 0, 10); for (let i = 0; i < 9; i++) box(g, C.brass, 0.006, 0.002, 0.014, -0.06 + i * 0.015, 0.009, 0.05); for (let i = 0; i < 4; i++) box(g, S(0xc9a03a, 0.4, 0.8), 0.07, 0.0015, 0.002, 0.01, 0.0085, -0.045 + i * 0.006); },
  berries(g) { const m = S(0xa8243c, 0.3), m2 = S(0x7a1830, 0.35); for (let i = 0; i < 10; i++) { const a = i * 2.4, r = 0.02 + (i % 3) * 0.018; ball(g, i % 3 ? m : m2, 0.022, 0.022, 0.022, Math.cos(a) * r, 0.022 + (i > 6 ? 0.03 : 0), Math.sin(a) * r, 10); } for (const s of [-1, 1]) ball(g, C.leaf, 0.05, 0.006, 0.022, s * 0.05, 0.05, -0.04 * s, 8).rotation.y = s * 0.6; },
  mushroom(g) { const stem = S(0xe8dcc4, 0.8), cap = S(0x8a5a32, 0.6); [[0, 0, 0, 1], [0.07, 0.04, 0.6, 0.75]].forEach(([x, z, tilt, k]) => { const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.z = tilt; g.add(m); cyl(m, stem, 0.022 * k, 0.017 * k, 0.065 * k, 0, 0.033 * k, 0, 0, 0, 0, 10); mesh(m, new THREE.SphereGeometry(0.05 * k, 16, 8, 0, PI * 2, 0, PI / 2).scale(1, 0.7, 1), cap, 0, 0.06 * k, 0); mesh(m, new THREE.CircleGeometry(0.048 * k, 16).rotateX(PI / 2), S(0xd8c8a8, 0.9), 0, 0.06 * k, 0); }); },
  raw_meat(g, id, cooked) { const lean = cooked ? S(0x6e3a1e, 0.65) : S(0xa8322e, 0.5), fat = cooked ? S(0x9a6a3a, 0.7) : S(0xe8d8c8, 0.6); ball(g, fat, 0.118, 0.026, 0.086, 0, 0.026, 0, 18); ball(g, lean, 0.11, 0.032, 0.08, 0.004, 0.032, 0.002, 18); rodX(g, C.white, 0.012, 0.012, 0.09, -0.12, 0.03, 0.01, 0.2, 8); ball(g, C.white, 0.022, 0.02, 0.026, -0.17, 0.03, 0.02, 8); if (cooked) for (let i = 0; i < 4; i++) box(g, S(0x2a1408, 0.9), 0.15, 0.003, 0.008, 0.005, 0.064, -0.045 + i * 0.03, 0, 0.5, 0); },
  cooked_meat(g) { B.raw_meat(g, null, true); },
  canned_food(g) { cyl(g, C.steel, 0.04, 0.04, 0.11, 0, 0.055, 0, 0, 0, 0, 22); cyl(g, S(0xb8402e, 0.6), 0.0405, 0.0405, 0.07, 0, 0.055, 0, 0, 0, 0, 22); cyl(g, S(0xe8dcc0, 0.7), 0.0408, 0.0408, 0.018, 0, 0.055, 0, 0, 0, 0, 22); for (const y of [0.002, 0.108]) torus(g, C.steel, 0.039, 0.003, 0, y, 0, PI / 2, 0, 0, 22); for (const R of [0.012, 0.024]) torus(g, C.steel, R, 0.0015, 0, 0.11, 0, PI / 2, 0, 0, 18); },
  water_bottle(g, id, empty) { const glass = S(0xcfeaf2, 0.05, 0, { transparent: true, opacity: 0.38, depthWrite: false }), prof = [[0, 0], [0.035, 0], [0.038, 0.01], [0.038, 0.14], [0.03, 0.17], [0.014, 0.19], [0.014, 0.21], [0, 0.21]]; if (!empty) lathe(g, S(0x3f8fc0, 0.15, 0, { transparent: true, opacity: 0.7 }), [[0, 0.004], [0.033, 0.004], [0.034, 0.12], [0, 0.12]]); lathe(g, glass, prof, 0, 0, 0, 0, 0, 0, 22); if (!empty) cyl(g, S(0x2f6fa0, 0.5), 0.016, 0.016, 0.02, 0, 0.215, 0, 0, 0, 0, 14); box(g, S(0xe8dcc0, 0.8), 0.07, 0.04, 0.002, 0, 0.08, 0.0385, 0, 0, 0, 0.001); },
  empty_bottle(g) { B.water_bottle(g, null, true); },
  bandage(g) { rodX(g, S(0xf0ece0, 0.95), 0.038, 0.038, 0.055, 0, 0.038, 0, 0, 20); rodX(g, S(0xb8b0a0, 0.9), 0.012, 0.012, 0.057, 0, 0.038, 0, 0, 10); box(g, S(0xf0ece0, 0.95), 0.003, 0.002, 0.16, 0.0, 0.002, 0.11, 0, 0, 0, 0.001).scale.set(18, 1, 1); },
  medkit(g) { box(g, C.red, 0.22, 0.08, 0.16, 0, 0.04, 0, 0, 0, 0, 0.012); box(g, S(0x9a2620, 0.6), 0.224, 0.012, 0.164, 0, 0.055, 0); box(g, C.white, 0.06, 0.004, 0.018, 0, 0.081, 0); box(g, C.white, 0.018, 0.004, 0.06, 0, 0.081, 0); torus(g, C.black, 0.03, 0.006, 0, 0.08, -0.065, 0, 0, 0, 12, PI); for (const x of [-0.07, 0.07]) box(g, C.steel, 0.02, 0.02, 0.006, x, 0.06, 0.082); },
  carrot(g) { cone(g, S(0xe07a2a, 0.6), 0.026, 0.17, 0, 0.026, 0, 0, 0, -PI / 2, 12); for (let i = 0; i < 4; i++) { const x = -0.06 + i * 0.03; torus(g, S(0xc4661e, 0.7), 0.026 * (0.085 - x) / 0.17 + 0.0006, 0.0016, x, 0.026, 0, 0, PI / 2, 0, 12); } for (let i = 0; i < 4; i++) cone(g, C.leaf, 0.008, 0.13, -0.148, 0.026, (i - 1.5) * 0.01, 0, (i - 1.5) * 0.28, PI / 2, 5); },
  potato(g, id, baked) { mesh(g, rockGeo(0.05, 13, 2, 1.45, 0.8, 1, 0.12), S(baked ? 0x7a5530 : 0xb08a5a, 0.9), 0, 0.04, 0); if (baked) { ball(g, S(0xf0d070, 0.6), 0.045, 0.012, 0.025, 0, 0.074, 0, 12); box(g, S(0xffe9a0, 0.4), 0.018, 0.012, 0.018, 0.005, 0.085, 0, 0, 0.4, 0); } else for (let i = 0; i < 4; i++) ball(g, S(0x5a4024, 0.9), 0.005, 0.003, 0.005, Math.cos(i * 1.7) * 0.05, 0.06, Math.sin(i * 1.7) * 0.03, 6); },
  baked_potato(g) { B.potato(g, null, true); },
  corn(g, id, roast) { const geo = new THREE.CapsuleGeometry(0.03, 0.12, 4, 16, 8), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.07 * Math.max(0, Math.sin(a * 8)) * (Math.abs(y) < 0.07 ? 1 : 0); p.setXYZ(i, x * k, y, z * k); } geo.computeVertexNormals(); geo.rotateZ(PI / 2); mesh(g, geo, S(roast ? 0xd4a03a : 0xf0c83a, 0.5), 0, 0.032, 0); if (roast) for (let i = 0; i < 6; i++) ball(g, S(0x2a1a08, 0.9), 0.012, 0.004, 0.01, -0.06 + i * 0.024, 0.06, (i % 2) * 0.01, 6); else for (let i = 0; i < 3; i++) { const o = ball(g, S(0x7fae3f, 0.8), 0.09, 0.006, 0.03, -0.1, 0.03, (i - 1) * 0.03, 10); o.rotation.y = (i - 1) * 0.5; } },
  roast_corn(g) { B.corn(g, null, true); },
  pumpkin(g) { const geo = new THREE.SphereGeometry(0.1, 28, 16), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - 0.07 * (0.5 + 0.5 * Math.cos(a * 10)); p.setXYZ(i, x * k, y * 0.72, z * k); } geo.computeVertexNormals(); mesh(g, geo, S(0xe0802a, 0.6), 0, 0.072, 0); cyl(g, S(0x5a6a2a, 0.9), 0.012, 0.008, 0.05, 0.005, 0.15, 0, 0, 0, 0.3, 8); },
  herb(g) { const st = S(0x4f7a3a, 0.8); for (let i = 0; i < 5; i++) { const yaw = (i - 2) * 0.16; rodX(g, st, 0.003, 0.003, 0.24, 0, 0.006, (i - 2) * 0.01, yaw, 5); for (let j = 0; j < 3; j++) { const t = 0.03 + j * 0.035, x = Math.cos(yaw) * t, z = -Math.sin(yaw) * t + (i - 2) * 0.01; for (const s of [-1, 1]) ball(g, S(j % 2 ? 0x5fb07a : 0x4f9a6a, 0.7), 0.022, 0.004, 0.012, x, 0.008, z + s * 0.014, 8).rotation.y = yaw + s * 0.6; } } torus(g, C.twine, 0.012, 0.004, -0.07, 0.008, 0, 0, PI / 2, 0, 10); },
  poultice(g) { ball(g, C.cloth, 0.075, 0.035, 0.06, 0, 0.035, 0, 16); for (let i = 0; i < 4; i++) ball(g, S(0x4f9a6a, 0.7), 0.03, 0.005, 0.014, Math.cos(i * 1.6) * 0.05, 0.06, Math.sin(i * 1.6) * 0.04, 8).rotation.y = i * 1.6; torus(g, C.twine, 0.062, 0.004, 0, 0.035, 0, PI / 2, 0, 0, 20); },
  seed(g, id) { const it = ITEMS[id], col = new THREE.Color(it.tint).getHex(); box(g, C.paper, 0.09, 0.006, 0.13, 0, 0.003, 0, 0, 0, 0, 0.002); box(g, S(col, 0.8), 0.092, 0.007, 0.05, 0, 0.0035, 0.01); ball(g, S(col, 0.6), 0.016, 0.004, 0.016, 0, 0.008, -0.04, 10); for (let i = 0; i < 5; i++) ball(g, S(new THREE.Color(col).multiplyScalar(0.6).getHex(), 0.7), 0.007, 0.004, 0.005, 0.07 + Math.cos(i * 2.2) * 0.02, 0.004, 0.05 + Math.sin(i * 2.2) * 0.02, 6); },
  arrow(g, id, bolt) {
    const n = bolt ? 2 : 3, len = bolt ? 0.38 : 0.74; for (let i = 0; i < n; i++) { const z = (i - (n - 1) / 2) * 0.03; rodX(g, bolt ? S(0x8a8f94, 0.5, 0.6) : S(0xb08a55, 0.8), 0.005, 0.005, len, 0, 0.006, z, 0, 6);
      cone(g, bolt ? C.darksteel : S(0x6f7376, 0.8, 0, FLAT), 0.012, 0.055, len / 2, 0.006, z, 0, 0, -PI / 2, 5);
      for (let k = 0; k < 3; k++) { const a = k / 3 * PI * 2; box(g, S(k ? 0xf2efe6 : 0xb8402e, 0.9), 0.08, 0.002, 0.014, -len / 2 + 0.06, 0.006 + Math.sin(a) * 0.009, z + Math.cos(a) * 0.009, a, 0, 0, 0.001); } }
  },
  bolt(g) { B.arrow(g, null, true); },
  ball(g) { for (let i = 0; i < 4; i++) { const z = (i - 1.5) * 0.018; rodX(g, C.paper, 0.008, 0.008, 0.07, 0, 0.008, z, 0.05 * i, 10); cone(g, C.paper, 0.008, 0.016, 0.042, 0.008, z, 0, 0, -PI / 2, 8); } for (let i = 0; i < 2; i++) ball(g, S(0x6f7376, 0.4, 0.6), 0.008, 0.008, 0.008, -0.06 + i * 0.02, 0.008, 0.05, 10); },
  pistol_ammo(g) { const card = S(0x3f4a3c, 0.85), lab = S(0xd8b83a, 0.8); box(g, card, 0.11, 0.022, 0.08, 0, 0.011, 0, 0, 0, 0, 0.003); box(g, lab, 0.112, 0.008, 0.082, 0, 0.012, 0); box(g, card, 0.11, 0.003, 0.08, 0, 0.04, -0.07, -1.25, 0, 0, 0.001); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) cartridge(g, -0.039 + i * 0.026, 0.006, -0.026 + j * 0.026, 0.026, 0.0052, 0.009); for (let i = 0; i < 3; i++) { const o = new THREE.Group(); o.position.set(-0.02 + i * 0.025, 0.006, 0.07 + (i % 2) * 0.01); o.rotation.set(0, 0.3 + i * 0.7, PI / 2); g.add(o); cartridge(o, 0, 0, 0, 0.026, 0.0052, 0.009); } },
  rifle_ammo(g) { box(g, S(0x9aa0a6, 0.5, 0.7), 0.09, 0.004, 0.012, 0, 0.002, 0, 0, 0, 0, 0.001); for (let i = 0; i < 5; i++) cartridge(g, -0.036 + i * 0.018, 0.004, 0, 0.055, 0.0055, 0.016, true); for (let i = 0; i < 2; i++) { const o = new THREE.Group(); o.position.set(0.02 + i * 0.03, 0.006, 0.05); o.rotation.set(0, 0.4 + i, PI / 2); g.add(o); cartridge(o, 0, 0, 0, 0.055, 0.0055, 0.016, true); } },
  carbine_ammo(g) { box(g, S(0x4c5540, 0.7, 0.2), 0.16, 0.08, 0.07, 0, 0.04, 0, 0, 0, 0, 0.006); box(g, S(0xd8b83a, 0.8), 0.162, 0.012, 0.072, 0, 0.055, 0); box(g, C.darksteel, 0.06, 0.012, 0.02, 0, 0.086, 0, 0, 0, 0, 0.004); for (let i = 0; i < 3; i++) cartridge(g, -0.03 + i * 0.03, 0, 0.065, 0.045, 0.005, 0.013, true); },
  shell(g) { for (let i = 0; i < 4; i++) { const o = new THREE.Group(); o.position.set((i - 1.5) * 0.028, 0.012, (i % 2) * 0.01); o.rotation.set(0, 0.15 * i, PI / 2); g.add(o); cyl(o, S(0xb8302a, 0.6), 0.012, 0.012, 0.06, 0, 0, 0, 0, 0, 0, 14); cyl(o, C.brass, 0.0125, 0.0125, 0.016, 0, -0.03, 0, 0, 0, 0, 14); } const s = new THREE.Group(); s.position.set(0.07, 0, -0.04); g.add(s); cyl(s, S(0xb8302a, 0.6), 0.012, 0.012, 0.06, 0, 0.046, 0, 0, 0, 0, 14); cyl(s, C.brass, 0.0125, 0.0125, 0.016, 0, 0.008, 0, 0, 0, 0, 14); },
  hide_armor(g) { vest(g, S(0x7a5236, 0.9), S(0x5a3a22, 0.9)); ball(g, S(0x8a7a62, 1), 0.12, 0.03, 0.06, 0, 0.06, -0.17, 12); for (let i = 0; i < 4; i++) box(g, S(0x3a2414, 0.9), 0.012, 0.004, 0.06, -0.02 + (i % 2) * 0.04, 0.052, 0.02 + i * 0.05, 0, 0.5 * (i % 2 ? 1 : -1), 0); },
  field_armor(g) { vest(g, S(0x5d6a44, 0.95), S(0x4a5536, 0.95)); helmet(g, S(0x55613f, 0.6, 0.35), 0.13, 0.08, 0.07, true); },
  tac_armor(g) { vest(g, S(0x3a3f36, 0.85), S(0x2c302a, 0.85)); for (let i = 0; i < 3; i++) box(g, S(0x2c302a, 0.85), 0.07, 0.04, 0.08, -0.08 + i * 0.08, 0.06, 0.1, 0, 0, 0, 0.01); helmet(g, S(0x23262a, 0.55, 0.2), 0.12, 0.09, 0.08, false); },
  flashlight(g) { const body = S(0x2b2f34, 0.45, 0.6); rodX(g, body, 0.018, 0.018, 0.14, 0, 0.026, 0, 0, 16); rodX(g, body, 0.022, 0.028, 0.05, 0.09, 0.026, 0, 0, 16); rodX(g, S(0xfff2c0, 0.15, 0, { emissive: 0xfff2c0, emissiveIntensity: 0.7 }), 0.026, 0.026, 0.003, 0.117, 0.026, 0, 0, 16); for (let i = 0; i < 5; i++) torus(g, C.black, 0.0185, 0.002, -0.05 + i * 0.012, 0.026, 0, 0, PI / 2, 0, 14); box(g, S(0xb8402e, 0.6), 0.012, 0.006, 0.01, 0.03, 0.045, 0); },
  pack(g) { box(g, S(0x6a4a30, 0.9), 0.42, 0.2, 0.32, 0, 0.1, 0, 0, 0, 0, 0.05); box(g, S(0x5a3c26, 0.9), 0.26, 0.1, 0.06, 0, 0.08, 0.18, 0, 0, 0, 0.02); for (const x of [-0.12, 0.12]) box(g, S(0x2e2418, 0.9), 0.04, 0.012, 0.36, x, 0.202, 0, 0, 0, 0, 0.004); rodX(g, S(0x5a6a4a, 0.95), 0.06, 0.06, 0.38, 0, 0.26, -0.08, 0, 14); for (const x of [-0.13, 0.13]) torus(g, S(0x2e2418, 0.9), 0.062, 0.006, x, 0.26, -0.08, 0, PI / 2, 0, 14); },
};
B.seed_carrot = B.seed_potato = B.seed_corn = B.seed_pumpkin = B.seed_flax = B.seed_berry = B.seed_herb = B.seed;
function cone(g, m, r, h, x, y, z, rx = 0, ry = 0, rz = 0, seg = 10) { return mesh(g, new THREE.ConeGeometry(r, h, seg), m, x, y, z, rx, ry, rz); }
function cartridge(g, x, y, z, len, r, tip, neck) { cyl(g, C.brass, r, r, len * 0.62, x, y + len * 0.31, z, 0, 0, 0, 10); if (neck) cyl(g, C.brass, r, r * 0.7, len * 0.12, x, y + len * 0.68, z, 0, 0, 0, 10); const b = cone(g, C.copper, r * (neck ? 0.68 : 0.95), tip, x, y + len * (neck ? 0.74 : 0.62) + tip / 2, z, 0, 0, 0, 10); return b; }
function vest(g, m, m2) { box(g, m, 0.38, 0.05, 0.44, 0, 0.025, 0, 0, 0, 0, 0.03); for (const s of [-1, 1]) box(g, m2, 0.1, 0.04, 0.16, s * 0.13, 0.04, -0.2, 0, s * 0.25, 0, 0.02); box(g, m2, 0.36, 0.012, 0.04, 0, 0.052, 0.08, 0, 0, 0, 0.004); box(g, m2, 0.04, 0.012, 0.4, 0, 0.052, 0.0, 0, 0, 0, 0.004); }
function helmet(g, m, R, x, z, brim) { const o = new THREE.Group(); o.position.set(x + 0.18, 0, z + 0.16); g.add(o); mesh(o, new THREE.SphereGeometry(R * 0.72, 18, 10, 0, PI * 2, 0, PI / 2).scale(1, 0.85, 1.08), m, 0, 0.012, 0); if (brim) cyl(o, m, R, R, 0.008, 0, 0.012, 0, 0, 0, 0, 22); else { cyl(o, m, R * 0.74, R * 0.74, 0.05, 0, 0.03, 0, 0, 0, 0, 22); for (const s of [-1, 1]) box(o, C.black, 0.01, 0.02, 0.07, s * R * 0.74, 0.05, 0); } }

// ---------------------------------------------------------------- assembly
const V3 = new THREE.Vector3(), BB = new THREE.Box3();
function build(id) {
  let g = weaponModel(id); const weapon = !!g;
  if (!g) { g = new THREE.Group(); (B[id] || B.scrap)(g, id, false); }
  const root = new THREE.Group(), mid = new THREE.Group(); root.add(mid); mid.add(g);
  if (weapon) { BB.setFromObject(g); BB.getSize(V3); if (V3.x <= V3.y && V3.x <= V3.z) g.rotation.z = PI / 2; else if (V3.z <= V3.y) g.rotation.x = PI / 2; }
  BB.setFromObject(root); BB.getSize(V3); if (V3.z > V3.x) mid.rotation.y = PI / 2;
  BB.setFromObject(root); const c = BB.getCenter(new THREE.Vector3()); mid.position.set(-c.x, -BB.min.y, -c.z);
  BB.setFromObject(root); BB.getSize(V3); root.userData = { r: Math.max(V3.x, V3.z) / 2, h: V3.y, long: V3.x / Math.max(0.01, V3.z) };
  return root;
}

// ---------------------------------------------------------------- icons: render each model into a small transparent picture
export function createItemArt(renderer) {
  const templates = new Map(), icons = new Map(), queue = [];
  const tpl = (id) => { let t = templates.get(id); if (!t) templates.set(id, t = build(id)); return t; };
  const art = { queue };
  art.model = (id) => { const m = tpl(id).clone(); m.userData = { ...tpl(id).userData }; return m; };
  const N = 256, OUT = 128;
  let sc, cam, rt, big, small, pix;
  function setup() {
    sc = new THREE.Scene(); const pm = new THREE.PMREMGenerator(renderer); sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; sc.environmentIntensity = 0.7; pm.dispose();
    const key = new THREE.DirectionalLight(0xfff4e6, 2.6); key.position.set(-2, 5, 3); sc.add(key);
    const rim = new THREE.DirectionalLight(0xc8dcff, 1.3); rim.position.set(3, 2, -3); sc.add(rim);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x3a3428, 0.9));
    cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50); rt = new THREE.WebGLRenderTarget(N, N);
    big = document.createElement('canvas'); big.width = big.height = N; small = document.createElement('canvas'); small.width = small.height = OUT; pix = new Uint8Array(N * N * 4);
  }
  const P = new THREE.Vector3();
  art.icon = (id) => {
    if (icons.has(id)) return icons.get(id); if (!ITEMS[id]) return null; if (!sc) setup();
    const holder = new THREE.Group(); let dir, flat = false;
    const wm = weaponModel(id);
    if (wm) {
      // weapons: a straight side view, muzzle or blade to the right and grip down; hand tools stand on a slant
      const w = ITEMS[id].w, tool = w && w.kind === 'melee' && id !== 'spear'; BB.setFromObject(wm); BB.getSize(P); wm.rotation.x = tool ? -0.75 : P.z > 0.6 ? 0.5 : 0; holder.add(wm); dir = new THREE.Vector3(1, 0.05, 0);
    } else {
      const obj = art.model(id), u = obj.userData; holder.add(obj); flat = u.h < 0.45 * u.r * 2; if (u.long > 2.2) holder.rotation.y = 0.62;
      dir = flat ? new THREE.Vector3(0.0, 1, 0.62) : new THREE.Vector3(0.75, 0.62, 1);
    }
    dir.normalize(); sc.add(holder);
    BB.setFromObject(holder); const c = BB.getCenter(new THREE.Vector3()); cam.position.copy(c).addScaledVector(dir, 10); cam.up.set(0, 1, 0); if (flat) cam.up.set(0, 0, -1); cam.lookAt(c); cam.updateMatrixWorld(true);
    // fit the camera to the projected vertices
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; holder.updateMatrixWorld(true);
    holder.traverse((m) => { if (!m.isMesh) return; const p = m.geometry.attributes.position, step = Math.max(1, Math.floor(p.count / 400)); for (let i = 0; i < p.count; i += step) { P.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).applyMatrix4(cam.matrixWorldInverse); if (P.x < x0) x0 = P.x; if (P.x > x1) x1 = P.x; if (P.y < y0) y0 = P.y; if (P.y > y1) y1 = P.y; } });
    const half = Math.max(x1 - x0, y1 - y0) / 2 * 1.1, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; cam.left = cx - half; cam.right = cx + half; cam.top = cy + half; cam.bottom = cy - half; cam.updateProjectionMatrix();
    const prev = renderer.getRenderTarget(), pc = new THREE.Color(); renderer.getClearColor(pc); const pa = renderer.getClearAlpha(), sh = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false; renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, N, N, pix); renderer.setRenderTarget(prev); renderer.setClearColor(pc, pa); renderer.shadowMap.autoUpdate = sh; sc.remove(holder);
    const ctx = big.getContext('2d'), im = ctx.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const s = ((N - 1 - y) * N + x) * 4, d = (y * N + x) * 4; const a = pix[s + 3] / 255; for (let k = 0; k < 3; k++) im.data[d + k] = a > 0 ? Math.min(255, Math.pow(Math.min(1, pix[s + k] / 255 / a), 1 / 2.2) * 255) : 0; im.data[d + 3] = pix[s + 3]; }
    ctx.putImageData(im, 0, 0); const sctx = small.getContext('2d'); sctx.clearRect(0, 0, OUT, OUT); sctx.imageSmoothingQuality = 'high'; sctx.drawImage(big, 0, 0, OUT, OUT);
    const url = small.toDataURL('image/png'); icons.set(id, url); return url;
  };
  art.prewarm = (n) => { while (n-- > 0 && queue.length) art.icon(queue.shift()); };
  for (const id in ITEMS) queue.push(id);
  return art;
}
