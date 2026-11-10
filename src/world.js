import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, smoothstep, mulberry32, fbm, TAU } from './util.js';

export const SIZE = 1040;
export const N = 200;
export const CELL = SIZE / N;
export const HALF = SIZE / 2;
export const ISLAND_R = 440;
export const BEACON_R = 13;
export const CROWN_R = 50;

export const BIOME_NAMES = [
  'Greenhollow Meadows', 'Whisperpine Woods', 'Sunscar Dunes', 'Glowmire',
  'Cinder Reach', 'Frostfell Heights', 'The Crown',
];
const SITES = [[0, 285], [-255, 100], [265, 115], [-235, -175], [245, -185], [0, -300], [0, 0]];
export const BEACON_POS = [[25, 228], [-255, 95], [265, 110], [-235, -175], [245, -185], [0, -300]];
const B_BASE = [3, 6, 4, 0.4, 7, 16, 20];
const B_AMP = [3.5, 7, 4.5, 2.0, 8, 9, 5];

const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
// per-biome ground palette: [a, b, rock]
const PAL = [
  [lin(0x5aa648), lin(0x86c45a), lin(0x8a8f85)],
  [lin(0x2c6a44), lin(0x4a7d3e), lin(0x6c7068)],
  [lin(0xf2c66a), lin(0xe3a64e), lin(0xc4864a)],
  [lin(0x34466e), lin(0x4f4690), lin(0x4a4a6a)],
  [lin(0x3a3336), lin(0x57413b), lin(0x2a2628)],
  [lin(0xc9d6e2), lin(0xa9c2d8), lin(0x717d8c)],
  [lin(0x5f5c7a), lin(0x4f6270), lin(0x4a4860)],
];
const SAND = lin(0xe8d6a2);
const SEABED = lin(0x1f4a52);

const _w = new Float32Array(7);
const _d = new Float32Array(7);
export function biomeWeights(x, z) {
  const wx = x + fbm(x * 0.009, z * 0.009, 2, 7) * 45;
  const wz = z + fbm(x * 0.009, z * 0.009, 2, 13) * 45;
  let m = 1e9;
  for (let i = 0; i < 7; i++) {
    let d = Math.hypot(wx - SITES[i][0], wz - SITES[i][1]);
    if (i === 6) d += 55;
    _d[i] = d;
    if (d < m) m = d;
  }
  let s = 0;
  for (let i = 0; i < 7; i++) {
    const t = Math.max(0, 1 - (_d[i] - m) / 70);
    _w[i] = t * t;
    s += _w[i];
  }
  for (let i = 0; i < 7; i++) _w[i] /= s;
  return _w;
}
export function biomeAt(x, z) {
  const w = biomeWeights(x, z);
  let b = 0;
  for (let i = 1; i < 7; i++) if (w[i] > w[b]) b = i;
  return b;
}

function baseHeight(x, z) {
  const w = biomeWeights(x, z);
  let base = 0, amp = 0;
  for (let i = 0; i < 7; i++) { base += w[i] * B_BASE[i]; amp += w[i] * B_AMP[i]; }
  let h = base + fbm(x * 0.0075, z * 0.0075, 4, 1) * amp * 1.6;
  if (w[2] > 0.01) {
    const r = Math.abs(Math.sin(x * 0.045 + z * 0.02 + fbm(x * 0.01, z * 0.01, 2, 5) * 3));
    h += w[2] * (0.5 - r) * 3.5;
  }
  h = Math.max(h, 0.5);
  if (w[3] > 0.4) {
    const p = fbm(x * 0.02, z * 0.02, 2, 21);
    if (p > 0.3) h -= (p - 0.3) * 16 * smoothstep(0.4, 0.8, w[3]);
  }
  const d = Math.hypot(x, z);
  h = lerp(h, 27, smoothstep(125, 60, d));
  const dd = d / ISLAND_R + fbm(x * 0.005 + 3.1, z * 0.005 - 1.7, 3, 9) * 0.14;
  const mask = smoothstep(1.0, 0.74, dd);
  return lerp(-9, h + 2.2, mask);
}

// ---------- geometry helpers ----------
function part(geo, color, m) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (m) g.applyMatrix4(m);
  g.deleteAttribute('uv');
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  const col = Array.isArray(color) ? color : lin(color);
  for (let i = 0; i < n; i++) c.set(col, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
function T(x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  _e.set(rx, ry, rz);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e).clone(), new THREE.Vector3(sx, sy, sz));
}
export { part, T, mergeGeometries };

export function glowPatch(mat, key = 'glow') {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = min(diffuseColor.rgb, vec3(0.85));').replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      #ifdef USE_COLOR
        float gm = max(max(vColor.r, vColor.g), vColor.b);
        totalEmissiveRadiance += vColor.rgb * smoothstep(1.0, 1.4, gm) * 0.5;
      #endif`
    );
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

export function makeLitMaterial(extra = {}) {
  return glowPatch(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0, ...extra }));
}

// ---------- time of day ----------
const KEYS = [
  { t: 0.0, top: 0x040818, fog: 0x16224a, hs: 0x4f68c0, hg: 0x1c1e36, hi: 1.0, dc: 0x9db8ff, di: 1.5, stars: 1.0, moon: 1.0, sun: 0.0, exp: 1.12, fd: 0.0044 },
  { t: 0.4, top: 0x0a1238, fog: 0x2e3168, hs: 0x6a78c8, hg: 0x26233e, hi: 1.1, dc: 0xb4c2ff, di: 1.7, stars: 0.85, moon: 1.0, sun: 0.12, exp: 1.12, fd: 0.0040 },
  { t: 0.8, top: 0x1e2d66, fog: 0x6b5f96, hs: 0x9a94d4, hg: 0x40334a, hi: 1.2, dc: 0xffc9a8, di: 1.9, stars: 0.35, moon: 0.5, sun: 0.7, exp: 1.08, fd: 0.0036 },
  { t: 1.0, top: 0x3f8fd8, fog: 0xcfdcea, hs: 0xc4dcff, hg: 0x6b5a48, hi: 1.3, dc: 0xfff0d0, di: 2.7, stars: 0.0, moon: 0.0, sun: 1.0, exp: 1.0, fd: 0.0026 },
];
const DIR_NIGHT = new THREE.Vector3(-0.45, 0.8, 0.35).normalize();
const DIR_DAY = new THREE.Vector3(0.75, 0.5, 0.3).normalize();
const SUN_SKY = new THREE.Vector3(0.9, 0.16, 0.25).normalize();

export function createWorld(scene, opts) {
  const rng = mulberry32(20261110);
  const NV = N + 1;
  const heights = new Float32Array(NV * NV);

  // ----- flat sites -----
  let startZ = 420;
  while (startZ > 200 && baseHeight(0, startZ) < 3.2) startZ -= 2;
  startZ -= 14;
  const START = { x: 0, z: startZ };
  const flats = [];
  for (const [x, z] of BEACON_POS) flats.push({ x, z, r0: 16, r1: 36, h: Math.max(baseHeight(x, z), 4.5) });
  flats.push({ x: START.x, z: START.z, r0: 9, r1: 24, h: Math.max(baseHeight(START.x, START.z), 3.5) });

  function genHeight(x, z) {
    let y = baseHeight(x, z);
    for (const f of flats) {
      const dx = x - f.x, dz = z - f.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < f.r1 * f.r1) y = lerp(y, f.h, smoothstep(f.r1, f.r0, Math.sqrt(d2)));
    }
    return y;
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) heights[j * NV + i] = genHeight(-HALF + i * CELL, -HALF + j * CELL);

  function getHeight(x, z) {
    const fx = clamp((x + HALF) / CELL, 0, N - 0.0001), fz = clamp((z + HALF) / CELL, 0, N - 0.0001);
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j;
    const k = j * NV + i;
    const h00 = heights[k], h10 = heights[k + 1], h01 = heights[k + NV], h11 = heights[k + NV + 1];
    if (u + v <= 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
    return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  }

  // ----- reachability flood fill -----
  const reach = new Uint8Array(NV * NV);
  {
    const si = Math.round((START.x + HALF) / CELL), sj = Math.round((START.z + HALF) / CELL);
    const stack = [sj * NV + si];
    reach[sj * NV + si] = 1;
    while (stack.length) {
      const k = stack.pop();
      const i = k % NV, j = (k / NV) | 0;
      const nb = [i > 0 ? k - 1 : -1, i < N ? k + 1 : -1, j > 0 ? k - NV : -1, j < N ? k + NV : -1];
      for (const n of nb) if (n >= 0 && !reach[n] && heights[n] > 0.5) { reach[n] = 1; stack.push(n); }
    }
  }
  function reachable(x, z) {
    const fx = (x + HALF) / CELL, fz = (z + HALF) / CELL;
    if (fx < 1 || fz < 1 || fx > N - 1 || fz > N - 1) return false;
    const k = (fz | 0) * NV + (fx | 0);
    return reach[k] && reach[k + 1] && reach[k + NV] && reach[k + NV + 1] && getHeight(x, z) > 0.7;
  }

  // ----- terrain colour -----
  const _c = [0, 0, 0];
  function terrainColor(x, z, y, ny, jit) {
    const w = biomeWeights(x, z);
    const nv = fbm(x * 0.03, z * 0.03, 2, 33) * 0.5 + 0.5;
    let r = 0, g = 0, b = 0, rr = 0, rg = 0, rb = 0;
    for (let i = 0; i < 7; i++) {
      const wi = w[i]; if (wi <= 0) continue;
      const p = PAL[i];
      r += wi * lerp(p[0][0], p[1][0], nv); g += wi * lerp(p[0][1], p[1][1], nv); b += wi * lerp(p[0][2], p[1][2], nv);
      rr += wi * p[2][0]; rg += wi * p[2][1]; rb += wi * p[2][2];
    }
    const s = smoothstep(0.86, 0.66, ny);
    r = lerp(r, rr, s); g = lerp(g, rg, s); b = lerp(b, rb, s);
    const bt = smoothstep(2.8, 1.3, y) * (1 - w[3] * 0.8);
    r = lerp(r, SAND[0], bt); g = lerp(g, SAND[1], bt); b = lerp(b, SAND[2], bt);
    const ut = smoothstep(0.2, -4, y);
    r = lerp(r, SEABED[0], ut); g = lerp(g, SEABED[1], ut); b = lerp(b, SEABED[2], ut);
    const j = 0.92 + jit * 0.16;
    r = Math.min(r * j, 0.98); g = Math.min(g * j, 0.98); b = Math.min(b * j, 0.98);
    if (w[4] > 0.55 && y > 1.5) {
      const ln = Math.abs(fbm(x * 0.03, z * 0.03, 2, 55));
      if (ln < 0.03) { const t = (1 - ln / 0.03) * smoothstep(0.55, 0.8, w[4]); r = lerp(r, 2.6, t); g = lerp(g, 0.6, t); b = lerp(b, 0.08, t); }
    }
    if (w[3] > 0.55 && y > 0.3) {
      const ln = Math.abs(fbm(x * 0.035, z * 0.035, 2, 66));
      if (ln < 0.03) { const t = (1 - ln / 0.03) * smoothstep(0.55, 0.8, w[3]); r = lerp(r, 0.2, t); g = lerp(g, 1.3, t); b = lerp(b, 1.15, t); }
    }
    _c[0] = r; _c[1] = g; _c[2] = b;
    return _c;
  }

  // ----- terrain mesh -----
  {
    const pos = new Float32Array(N * N * 18), col = new Float32Array(N * N * 18);
    let p = 0;
    const tri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, nyy = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const ny = nyy / Math.hypot(nx, nyy, nz);
      const c = terrainColor((ax + bx + cx) / 3, (az + bz + cz) / 3, (ay + by + cy) / 3, ny, rng());
      pos[p] = ax; pos[p + 1] = ay; pos[p + 2] = az; pos[p + 3] = bx; pos[p + 4] = by; pos[p + 5] = bz; pos[p + 6] = cx; pos[p + 7] = cy; pos[p + 8] = cz;
      for (let k = 0; k < 9; k += 3) { col[p + k] = c[0]; col[p + k + 1] = c[1]; col[p + k + 2] = c[2]; }
      p += 9;
    };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x0 = -HALF + i * CELL, z0 = -HALF + j * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
      const k = j * NV + i;
      const h00 = heights[k], h10 = heights[k + 1], h01 = heights[k + NV], h11 = heights[k + NV + 1];
      tri(x0, h00, z0, x0, h01, z1, x1, h10, z0);
      tri(x1, h10, z0, x0, h01, z1, x1, h11, z1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, makeLitMaterial());
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // ----- obstacles -----
  const OC = 20, OG = Math.ceil(SIZE / OC);
  const ogrid = Array.from({ length: OG * OG }, () => []);
  function addObstacle(x, z, r) {
    const i = clamp(((x + HALF) / OC) | 0, 0, OG - 1), j = clamp(((z + HALF) / OC) | 0, 0, OG - 1);
    ogrid[j * OG + i].push(x, z, r);
  }
  function eachNear(x, z, fn) {
    const ci = ((x + HALF) / OC) | 0, cj = ((z + HALF) / OC) | 0;
    for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
      if (i < 0 || j < 0 || i >= OG || j >= OG) continue;
      const a = ogrid[j * OG + i];
      for (let k = 0; k < a.length; k += 3) if (fn(a[k], a[k + 1], a[k + 2])) return true;
    }
    return false;
  }
  // push an (x,z) circle out of obstacles; mutates o.x / o.z
  function collide(o, r) {
    eachNear(o.x, o.z, (ox, oz, or) => {
      const dx = o.x - ox, dz = o.z - oz, rr = r + or;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) / d; o.x += dx * k; o.z += dz * k; }
        else o.x += rr;
      }
      return false;
    });
  }
  const nearObstacle = (x, z, r) => eachNear(x, z, (ox, oz, or) => { const dx = x - ox, dz = z - oz, rr = r + or; return dx * dx + dz * dz < rr * rr; });
  function nearSite(x, z, pad) {
    for (const f of flats) if (Math.hypot(x - f.x, z - f.z) < f.r0 + pad) return true;
    return Math.hypot(x, z) < 62 + pad;
  }
  function slopeNy(x, z) {
    const e = 1.5;
    const dx = getHeight(x + e, z) - getHeight(x - e, z), dz = getHeight(x, z + e) - getHeight(x, z - e);
    return (2 * e) / Math.hypot(dx, 2 * e, dz);
  }

  // ----- prop geometry -----
  const G = {};
  G.pine = mergeGeometries([
    part(new THREE.CylinderGeometry(0.28, 0.42, 2.2, 6), 0x5a3b26, T(0, 1.1, 0)),
    part(new THREE.ConeGeometry(2.3, 3.2, 7), 0x1f5a3a, T(0, 3.2, 0)),
    part(new THREE.ConeGeometry(1.8, 2.8, 7), 0x27704a, T(0, 5.0, 0)),
    part(new THREE.ConeGeometry(1.2, 2.4, 7), 0x318a58, T(0, 6.7, 0)),
  ]);
  G.snowpine = mergeGeometries([
    part(new THREE.CylinderGeometry(0.28, 0.42, 2.2, 6), 0x4a3a30, T(0, 1.1, 0)),
    part(new THREE.ConeGeometry(2.3, 3.2, 7), 0x2c5a55, T(0, 3.2, 0)),
    part(new THREE.ConeGeometry(1.8, 2.8, 7), 0xa9c6d0, T(0, 5.0, 0)),
    part(new THREE.ConeGeometry(1.2, 2.4, 7), 0xeaf2f8, T(0, 6.7, 0)),
  ]);
  G.oak = mergeGeometries([
    part(new THREE.CylinderGeometry(0.35, 0.5, 2.8, 6), 0x6b4a2f, T(0, 1.4, 0)),
    part(new THREE.IcosahedronGeometry(1.9, 0), 0x4f9a3f, T(0, 4.2, 0)),
    part(new THREE.IcosahedronGeometry(1.3, 0), 0x66b550, T(1.3, 3.5, 0.5)),
    part(new THREE.IcosahedronGeometry(1.4, 0), 0x438a3a, T(-1.1, 3.7, -0.6)),
  ]);
  G.dead = mergeGeometries([
    part(new THREE.CylinderGeometry(0.2, 0.45, 4.5, 5), 0x2c2627, T(0, 2.25, 0)),
    part(new THREE.CylinderGeometry(0.08, 0.16, 2.2, 4), 0x2c2627, T(0.85, 3.7, 0, 1, 1, 1, 0, 0, -0.9)),
    part(new THREE.CylinderGeometry(0.08, 0.16, 2.0, 4), 0x2c2627, T(-0.75, 3.1, 0.2, 1, 1, 1, 0, 0, 0.85)),
    part(new THREE.CylinderGeometry(0.06, 0.14, 1.8, 4), 0x2c2627, T(0, 4.3, 0.6, 1, 1, 1, 0.8, 0, 0)),
    part(new THREE.OctahedronGeometry(0.16, 0), [3.0, 0.8, 0.12], T(1.72, 4.4, 0)),
    part(new THREE.OctahedronGeometry(0.16, 0), [3.0, 0.8, 0.12], T(-1.5, 3.76, 0.2)),
  ]);
  G.cactus = mergeGeometries([
    part(new THREE.CylinderGeometry(0.45, 0.5, 3.2, 7), 0x3f8f5a, T(0, 1.6, 0)),
    part(new THREE.SphereGeometry(0.45, 7, 4), 0x4aa066, T(0, 3.2, 0)),
    part(new THREE.CylinderGeometry(0.24, 0.24, 1.0, 6), 0x3f8f5a, T(0.8, 1.7, 0, 1, 1, 1, 0, 0, Math.PI / 2)),
    part(new THREE.CylinderGeometry(0.24, 0.24, 1.3, 6), 0x4aa066, T(1.25, 2.3, 0)),
    part(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 6), 0x3f8f5a, T(-0.75, 1.2, 0, 1, 1, 1, 0, 0, Math.PI / 2)),
    part(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 6), 0x4aa066, T(-1.15, 1.65, 0)),
  ]);
  G.shroom = mergeGeometries([
    part(new THREE.CylinderGeometry(0.3, 0.5, 3.2, 6), 0xbfb6dc, T(0, 1.6, 0)),
    part(new THREE.SphereGeometry(1.9, 8, 4, 0, TAU, 0, Math.PI / 2), [0.2, 1.1, 1.3], T(0, 3.0, 0, 1, 0.6, 1)),
    part(new THREE.CylinderGeometry(1.9, 0.4, 0.3, 8), 0x3c3566, T(0, 2.9, 0)),
  ]);
  G.crystal = mergeGeometries([
    part(new THREE.OctahedronGeometry(0.5, 0), [1.5, 1.5, 1.5], T(0, 1.0, 0, 1, 2.6, 1)),
    part(new THREE.OctahedronGeometry(0.36, 0), [1.3, 1.3, 1.3], T(0.5, 0.6, 0.2, 1, 2.2, 1, 0, 0, -0.5)),
    part(new THREE.OctahedronGeometry(0.3, 0), [1.3, 1.3, 1.3], T(-0.4, 0.5, -0.25, 1, 2.0, 1, 0.3, 0, 0.5)),
  ]);
  {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 0.78 + (fbm(x * 3.1 + 5, y * 3.1 + z * 2.3, 2, 91) * 0.5 + 0.5) * 0.45;
      p.setXYZ(i, x * k, y * k * 0.72, z * k);
    }
    G.rock = part(g, 0x9a9da3, T(0, 0.35, 0));
  }
  {
    const pos = [], col = [];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + 0.3, ca = Math.cos(a), sa = Math.sin(a);
      const bx = ca * 0.14, bz = sa * 0.14, px = -sa * 0.09, pz = ca * 0.09, h = 0.75 + (k % 3) * 0.22;
      pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + ca * 0.32, h, bz + sa * 0.32);
      pos.push(bx + px, 0, bz + pz, bx - px, 0, bz - pz, bx + ca * 0.32, h, bz + sa * 0.32);
      for (let r = 0; r < 2; r++) col.push(0.09, 0.3, 0.06, 0.09, 0.3, 0.06, 0.3, 0.62, 0.16);
    }
    G.grass = new THREE.BufferGeometry();
    G.grass.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    G.grass.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
    G.grass.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  }
  G.flower = mergeGeometries([
    part(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 3), 0x9fd08a, T(0, 0.25, 0)),
    part(new THREE.OctahedronGeometry(0.15, 0), 0xffffff, T(0, 0.58, 0)),
  ]);

  const propMat = makeLitMaterial();
  const windUniform = { value: 0 };
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  grassMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniform;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;
        transformed.x += sin(uTime * 1.7 + ph) * 0.22 * transformed.y;
        transformed.z += cos(uTime * 1.3 + ph * 1.3) * 0.14 * transformed.y;
      #endif`
    );
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = min(diffuseColor.rgb, vec3(0.85));').replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      totalEmissiveRadiance += vColor.rgb * smoothstep(1.0, 1.4, max(max(vColor.r, vColor.g), vColor.b)) * 0.5;`
    );
  };
  grassMat.customProgramCacheKey = () => 'grass';

  // ----- scatter -----
  const SEC = 5;
  const buckets = {}; // type -> sector -> [{x,y,z,s,ry,c}]
  function put(type, x, y, z, s, ry, c, sy = s) {
    const si = clamp(((x + HALF) / SIZE * SEC) | 0, 0, SEC - 1), sj = clamp(((z + HALF) / SIZE * SEC) | 0, 0, SEC - 1);
    const b = (buckets[type] ||= {});
    (b[sj * SEC + si] ||= []).push(x, y, z, s, ry, c[0], c[1], c[2], sy);
  }
  const pickBiome = (x, z) => {
    const w = biomeWeights(x, z); let r = rng(), i = 0;
    for (; i < 6; i++) { r -= w[i]; if (r <= 0) break; }
    return i;
  };
  const randPos = () => { const a = rng() * TAU, r = Math.sqrt(rng()) * (ISLAND_R + 20); return [Math.cos(a) * r, Math.sin(a) * r]; };
  const cluster = (x, z, seed) => 0.3 + 0.7 * smoothstep(-0.25, 0.35, fbm(x * 0.012, z * 0.012, 2, seed));
  const WHITE = [1, 1, 1];
  const q = opts.low ? 0.6 : 1;

  // trees
  const TREE = [['oak', 0.26, 0.9], ['pine', 0.85, 1.0], ['cactus', 0.16, 0.6], ['shroom', 0.5, 0.8], ['dead', 0.4, 0.5], ['snowpine', 0.5, 1.0], [null, 0, 0]];
  for (let n = 0; n < 6200; n++) {
    const [x, z] = randPos();
    if (!reachable(x, z)) continue;
    const y = getHeight(x, z);
    if (y < 1.8 || nearSite(x, z, 6) || slopeNy(x, z) < 0.8) continue;
    const b = pickBiome(x, z), [type, dens, orad] = TREE[b];
    if (!type || rng() > dens * cluster(x, z, 77)) continue;
    if (nearObstacle(x, z, 2.4)) continue;
    const s = 0.62 + rng() * 0.5;
    let c = WHITE;
    if (type === 'oak') { const t = rng(); c = t < 0.12 ? [1.5, 0.95, 0.45] : [0.85 + rng() * 0.3, 0.9 + rng() * 0.2, 0.8 + rng() * 0.3]; }
    else if (type === 'shroom') c = rng() < 0.4 ? [1.5, 0.45, 0.95] : rng() < 0.3 ? [0.8, 1.05, 0.5] : WHITE;
    else if (type === 'pine') c = [0.85 + rng() * 0.3, 0.9 + rng() * 0.2, 0.9 + rng() * 0.2];
    put(type, x, y - 0.15, z, s, rng() * TAU, c, s * (0.85 + rng() * 0.4));
    addObstacle(x, z, orad * s);
  }
  // rocks
  const ROCKD = [0.22, 0.32, 0.5, 0.3, 0.7, 0.6, 0.5];
  const ROCKC = [[0.9, 0.92, 0.88], [0.7, 0.75, 0.7], [1.25, 0.95, 0.62], [0.55, 0.55, 0.85], [0.3, 0.27, 0.28], [0.95, 1.05, 1.2], [0.85, 0.82, 1.0]];
  for (let n = 0; n < 1700; n++) {
    const [x, z] = randPos();
    if (!reachable(x, z) || nearSite(x, z, 5)) continue;
    const b = biomeAt(x, z);
    if (rng() > ROCKD[b] * cluster(x, z, 88)) continue;
    const s = 0.5 + rng() * rng() * 2.6;
    if (nearObstacle(x, z, s + 1)) continue;
    const tall = b === 2 && rng() < 0.3 ? 2.2 + rng() : 0.8 + rng() * 0.6;
    const k = 0.85 + rng() * 0.3, c = ROCKC[b];
    put('rock', x, getHeight(x, z) - 0.1 * s, z, s, rng() * TAU, [c[0] * k, c[1] * k, c[2] * k], s * tall);
    if (s > 0.9) addObstacle(x, z, s * 0.85);
  }
  // crystals
  for (let n = 0; n < 1100; n++) {
    const [x, z] = randPos();
    if (!reachable(x, z) || nearSite(x, z, 4)) continue;
    const b = biomeAt(x, z);
    const dens = b === 3 ? 0.5 : b === 5 ? 0.3 : b === 6 ? 0.35 : 0;
    if (rng() > dens * cluster(x, z, 99) || nearObstacle(x, z, 1.5)) continue;
    const c = b === 3 ? (rng() < 0.5 ? [1.1, 0.3, 1.3] : [0.3, 1.0, 1.3]) : b === 5 ? [0.55, 0.85, 1.15] : [1.2, 0.95, 0.5];
    const s = 0.7 + rng() * 1.1;
    put('crystal', x, getHeight(x, z) - 0.1, z, s, rng() * TAU, c);
    addObstacle(x, z, 0.6 * s);
  }
  // grass + flowers
  const GRASSD = [0.95, 0.5, 0, 0.35, 0, 0, 0.3];
  const GRASSC = [[1, 1, 1], [0.7, 0.9, 0.8], WHITE, [0.5, 0.9, 1.5], WHITE, WHITE, [0.8, 0.9, 1.1]];
  for (let n = 0; n < 26000 * q; n++) {
    const [x, z] = randPos();
    const y = getHeight(x, z);
    if (y < 2.4) continue;
    const b = pickBiome(x, z);
    if (b > 6 || rng() > GRASSD[b] * cluster(x, z, 111)) continue;
    if (Math.hypot(x, z) < 60 || slopeNy(x, z) < 0.8) continue;
    const c = GRASSC[b], k = 0.8 + rng() * 0.4;
    put('grass', x, y - 0.05, z, 0.6 + rng() * 0.7, rng() * TAU, [c[0] * k, c[1] * k, c[2] * k]);
  }
  const FLC = [[1.0, 0.85, 0.3], [1, 1, 1], [1.0, 0.45, 0.55], [0.7, 0.6, 1.0]];
  for (let n = 0; n < 5000 * q; n++) {
    const [x, z] = randPos();
    const y = getHeight(x, z);
    if (y < 2.4) continue;
    const b = biomeAt(x, z);
    const dens = b === 0 ? 0.8 : b === 1 ? 0.2 : b === 3 ? 0.5 : 0;
    if (rng() > dens * cluster(x, z, 123)) continue;
    const c = b === 3 ? (rng() < 0.5 ? [0.4, 2.0, 2.2] : [2.0, 0.5, 1.8]) : FLC[(rng() * 4) | 0];
    put('flower', x, y - 0.03, z, 0.9 + rng() * 0.8, rng() * TAU, c);
  }

  // build instanced meshes
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _col = new THREE.Color();
  const UP = new THREE.Vector3(0, 1, 0);
  for (const type in buckets) {
    for (const sec in buckets[type]) {
      const a = buckets[type][sec], n = a.length / 9;
      const mat = type === 'grass' ? grassMat : propMat;
      const mesh = new THREE.InstancedMesh(G[type], mat, n);
      for (let i = 0; i < n; i++) {
        const k = i * 9;
        _p.set(a[k], a[k + 1], a[k + 2]); _q.setFromAxisAngle(UP, a[k + 4]); _s.set(a[k + 3], a[k + 8], a[k + 3]);
        mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
        mesh.setColorAt(i, _col.setRGB(a[k + 5], a[k + 6], a[k + 7]));
      }
      const big = type !== 'grass' && type !== 'flower';
      mesh.castShadow = big && type !== 'crystal';
      mesh.receiveShadow = big;
      mesh.computeBoundingSphere();
      scene.add(mesh);
    }
  }

  // ----- beacons -----
  const stoneMat = makeLitMaterial();
  const beacons = BEACON_POS.map(([x, z], i) => {
    const y = getHeight(x, z);
    const g = new THREE.Group(); g.position.set(x, y, z);
    const parts = [
      part(new THREE.CylinderGeometry(6, 6.8, 0.8, 12), 0x8d8a99, T(0, 0.1, 0)),
      part(new THREE.CylinderGeometry(3.2, 3.6, 0.5, 8), 0x7a778c, T(0, 0.6, 0)),
      part(new THREE.CylinderGeometry(0.55, 1.05, 6.5, 4), 0x77748a, T(0, 4.0, 0, 1, 1, 1, 0, Math.PI / 4, 0)),
      part(new THREE.ConeGeometry(0.85, 1.0, 4), 0x9a97ad, T(0, 7.7, 0, 1, 1, 1, 0, Math.PI / 4, 0)),
    ];
    const pr = mulberry32(100 + i);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + 0.26, h = 2.6 + pr() * 4.2, px = Math.cos(a) * 11.5, pz = Math.sin(a) * 11.5;
      parts.push(part(new THREE.CylinderGeometry(0.7, 0.9, h, 6), 0x858296, T(px, h / 2, pz)));
      if (h > 4.5) parts.push(part(new THREE.BoxGeometry(1.9, 0.4, 1.9), 0x9a97ad, T(px, h + 0.2, pz, 1, 1, 1, 0, a, 0)));
      addObstacle(x + px, z + pz, 1.0);
    }
    addObstacle(x, z, 1.3);
    const base = new THREE.Mesh(mergeGeometries(parts), stoneMat);
    base.castShadow = base.receiveShadow = true;
    g.add(base);
    const gemMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.4, 0.9) });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), gemMat); gem.position.y = 9.4; g.add(gem);
    const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.45, 1.0), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 420, 10, 1, true), beamMat); beam.position.y = 219; g.add(beam);
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.6, 1.4), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(BEACON_R - 0.35, BEACON_R, 72), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3; g.add(ring);
    const discMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), discMat); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.95; disc.scale.setScalar(0.01); g.add(disc);
    scene.add(g);
    return { i, x, y, z, lit: false, charge: 0, active: false, glow: 0, g, gem, gemMat, beam, beamMat, ring, ringMat, disc, discMat };
  });
  const beaconLight = new THREE.PointLight(0xffc070, 0, 60, 1.4);
  scene.add(beaconLight);

  // ----- pickups placement -----
  function spread(count, minD, sitePad, minY) {
    const out = [];
    for (let tries = 0; tries < 20000 && out.length < count; tries++) {
      const [x, z] = randPos();
      if (!reachable(x, z) || nearSite(x, z, sitePad) || nearObstacle(x, z, 2.5)) continue;
      const y = getHeight(x, z);
      if (y < minY || slopeNy(x, z) < 0.85) continue;
      if (out.some((o) => Math.hypot(o.x - x, o.z - z) < minD)) continue;
      out.push({ x, y, z });
    }
    return out;
  }
  const shardPos = spread(36, 55, 14, 2);
  const chestPos = spread(14, 90, 30, 2.5);
  for (const c of chestPos) addObstacle(c.x, c.z, 0.9);

  // ----- crown seal -----
  const crownY = getHeight(0, 0);
  const sealMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime, uAlpha; varying vec2 vUv; varying vec3 vP;
      void main(){
        float a = atan(vP.z, vP.x);
        float band = sin(a * 24.0 + vUv.y * 9.0 - uTime * 1.6) * 0.5 + 0.5;
        float rise = sin(vUv.y * 30.0 - uTime * 3.0 + a * 6.0) * 0.5 + 0.5;
        float fade = pow(1.0 - vUv.y, 1.6);
        vec3 col = mix(vec3(0.5, 0.12, 0.9), vec3(1.2, 0.3, 1.0), band);
        gl_FragColor = vec4(col * (0.25 + band * 0.5 + rise * 0.25) * fade * uAlpha, 1.0);
      }`,
  });
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(CROWN_R, CROWN_R, 36, 64, 1, true), sealMat);
  seal.position.set(0, crownY + 17, 0);
  scene.add(seal);

  // ----- water -----
  const htex = new THREE.DataTexture(new Uint8Array(NV * NV * 4), NV, NV, THREE.RGBAFormat);
  for (let i = 0; i < NV * NV; i++) htex.image.data[i * 4] = clamp((heights[i] + 10) / 20, 0, 1) * 255;
  htex.magFilter = htex.minFilter = THREE.LinearFilter;
  htex.needsUpdate = true;
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uH: { value: htex }, uSize: { value: SIZE * NV / N },
      uDeep: { value: new THREE.Color(0x06223f) }, uShallow: { value: new THREE.Color(0x1f8fa0) },
      uFog: { value: new THREE.Color() }, uFogD: { value: 0.004 }, uSky: { value: new THREE.Color() },
      uLDir: { value: new THREE.Vector3() }, uLCol: { value: new THREE.Color() }, uBright: { value: 1 },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime, uSize, uFogD, uBright; uniform sampler2D uH; uniform vec3 uDeep, uShallow, uFog, uSky, uLDir, uLCol;
      varying vec3 vW;
      void main(){
        vec2 uv = vW.xz / uSize + 0.5;
        float h = texture2D(uH, uv).r * 20.0 - 10.0;
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) h = -9.0;
        float depth = -h;
        vec2 p = vW.xz;
        float wv = sin(p.x * 0.35 + uTime * 1.1) + sin(p.y * 0.42 - uTime * 0.9) + sin((p.x + p.y) * 0.21 + uTime * 0.7);
        vec3 n = normalize(vec3(cos(p.x * 0.35 + uTime * 1.1) * 0.1 + cos((p.x + p.y) * 0.21 + uTime * 0.7) * 0.07, 1.0,
                                cos(p.y * 0.42 - uTime * 0.9) * 0.1 + cos((p.x + p.y) * 0.21 + uTime * 0.7) * 0.07));
        vec3 v = normalize(cameraPosition - vW);
        float sh = smoothstep(6.5, 0.0, depth);
        vec3 col = mix(uDeep, uShallow, sh) * uBright;
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        col = mix(col, uSky, fres * 0.6);
        vec3 hv = normalize(v + uLDir);
        col += uLCol * pow(max(dot(n, hv), 0.0), 120.0) * 0.9;
        float band = sin(depth * 2.4 - uTime * 1.3 + wv * 0.4) * 0.5 + 0.5;
        float foam = smoothstep(1.7, 0.3, depth) * smoothstep(0.62, 0.86, band) * 0.8 + smoothstep(0.32, 0.0, depth);
        col = mix(col, vec3(0.85, 0.95, 1.0) * (0.35 + uBright * 0.65), clamp(foam, 0.0, 1.0));
        float alpha = clamp(mix(0.5, 0.95, smoothstep(0.0, 3.5, depth)) + foam, 0.0, 1.0);
        float d = length(cameraPosition - vW);
        float f = 1.0 - exp(-uFogD * uFogD * d * d);
        col = mix(col, uFog, f);
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200), waterMat);
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // ----- sky -----
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uStars: { value: 1 }, uTime: { value: 0 },
      uMoon: { value: 1 }, uSun: { value: 0 }, uMoonDir: { value: DIR_NIGHT }, uSunDir: { value: SUN_SKY },
    },
    vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop, uHor, uMoonDir, uSunDir; uniform float uStars, uTime, uMoon, uSun; varying vec3 vD;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vD);
        vec3 col = mix(uHor, uTop, smoothstep(0.0, 0.6, d.y));
        vec3 sp = d * 90.0; vec3 ip = floor(sp); vec3 fp = fract(sp) - 0.5;
        float r = hash(ip);
        float star = step(0.992, r) * smoothstep(0.32, 0.0, length(fp)) * (0.55 + 0.45 * sin(uTime * 2.0 + r * 400.0));
        col += vec3(0.9, 0.95, 1.2) * star * uStars * smoothstep(0.02, 0.3, d.y) * 2.2;
        float m = max(dot(d, uMoonDir), 0.0);
        col += uMoon * (smoothstep(0.9982, 0.9987, m) * vec3(1.5, 1.6, 1.9) + pow(m, 260.0) * vec3(0.4, 0.5, 0.9) * 0.6 + pow(m, 18.0) * vec3(0.2, 0.3, 0.6) * 0.18);
        float s = max(dot(d, uSunDir), 0.0);
        col += uSun * (pow(s, 6.0) * vec3(1.0, 0.45, 0.25) * 0.7 + pow(s, 60.0) * vec3(1.0, 0.7, 0.4) * 0.8 + smoothstep(0.9986, 0.9992, s) * vec3(4.0, 3.2, 2.2) * smoothstep(0.5, 1.0, uSun));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
  sky.renderOrder = -10; sky.frustumCulled = false;
  scene.add(sky);

  // ----- lights -----
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  const sm = opts.low ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera; sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 1; sc.far = 330;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.5;
  scene.add(sun, sun.target);
  scene.fog = new THREE.FogExp2(0x16224a, 0.004);

  // ----- fireflies -----
  const FN = opts.low ? 140 : 260;
  const fgeo = new THREE.BufferGeometry();
  const fs = new Float32Array(FN * 3); for (let i = 0; i < fs.length; i++) fs[i] = rng();
  fgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FN * 3), 3));
  fgeo.setAttribute('aSeed', new THREE.BufferAttribute(fs, 3));
  const flyMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uScale: { value: 600 }, uColor: { value: new THREE.Color(1.6, 1.3, 0.5) } },
    vertexShader: `attribute vec3 aSeed; uniform float uTime, uScale; uniform vec3 uCenter; varying float vA;
      void main(){
        vec3 p = aSeed * vec3(80.0, 9.0, 80.0);
        p.x += sin(uTime * 0.35 + aSeed.y * 40.0) * 2.5; p.z += cos(uTime * 0.3 + aSeed.x * 40.0) * 2.5; p.y += sin(uTime * 0.6 + aSeed.z * 30.0);
        vec2 rel = mod(p.xz - uCenter.xz + 40.0, 80.0) - 40.0;
        vec3 w = vec3(uCenter.x + rel.x, uCenter.y + p.y + 0.8, uCenter.z + rel.y);
        vA = (0.45 + 0.55 * sin(uTime * 2.2 + aSeed.x * 60.0)) * smoothstep(40.0, 28.0, length(rel));
        vec4 mv = viewMatrix * vec4(w, 1.0);
        gl_PointSize = 0.22 * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor * smoothstep(0.5, 0.0, d) * vA, 1.0); }`,
  });
  const flies = new THREE.Points(fgeo, flyMat); flies.frustumCulled = false;
  scene.add(flies);

  // ----- dawn control -----
  let dawn = 0, dawnTarget = 0;
  const cA = new THREE.Color(), cB = new THREE.Color();
  const mixHex = (out, a, b, t) => out.copy(cA.set(a)).lerp(cB.set(b), t);
  const lightDir = new THREE.Vector3();
  const state = { exposure: 1.1 };
  function applyDawn() {
    let i = 0;
    while (i < KEYS.length - 2 && dawn > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = clamp((dawn - a.t) / (b.t - a.t), 0, 1);
    mixHex(skyMat.uniforms.uTop.value, a.top, b.top, t);
    mixHex(scene.fog.color, a.fog, b.fog, t);
    skyMat.uniforms.uHor.value.copy(scene.fog.color);
    scene.fog.density = lerp(a.fd, b.fd, t);
    mixHex(hemi.color, a.hs, b.hs, t); mixHex(hemi.groundColor, a.hg, b.hg, t);
    hemi.intensity = lerp(a.hi, b.hi, t);
    mixHex(sun.color, a.dc, b.dc, t); sun.intensity = lerp(a.di, b.di, t);
    skyMat.uniforms.uStars.value = lerp(a.stars, b.stars, t);
    skyMat.uniforms.uMoon.value = lerp(a.moon, b.moon, t);
    skyMat.uniforms.uSun.value = lerp(a.sun, b.sun, t);
    state.exposure = lerp(a.exp, b.exp, t);
    lightDir.copy(DIR_NIGHT).lerp(DIR_DAY, smoothstep(0.8, 1.0, dawn)).normalize();
    const wu = waterMat.uniforms;
    wu.uFog.value.copy(scene.fog.color); wu.uFogD.value = scene.fog.density;
    wu.uSky.value.copy(skyMat.uniforms.uTop.value).lerp(scene.fog.color, 0.6);
    wu.uLDir.value.copy(lightDir); wu.uLCol.value.copy(sun.color).multiplyScalar(sun.intensity * 0.5);
    wu.uBright.value = lerp(0.55, 1.5, smoothstep(0.3, 1, dawn));
    flyMat.uniforms.uColor.value.setRGB(lerp(1.6, 1.2, dawn), lerp(1.3, 1.2, dawn), lerp(0.5, 1.0, dawn)).multiplyScalar(lerp(1, 0.35, dawn));
  }
  applyDawn();

  const RING_GOLD = new THREE.Color(1.5, 1.0, 0.35), GOLD = new THREE.Color(3.2, 2.2, 0.8), BLUE = new THREE.Color(0.25, 0.4, 0.9);
  function update(dt, time, px, py, pz, camera, sealed) {
    if (Math.abs(dawn - dawnTarget) > 0.0005) { dawn = dawn + clamp(dawnTarget - dawn, -dt * 0.07, dt * 0.07); applyDawn(); }
    windUniform.value = time;
    waterMat.uniforms.uTime.value = time;
    skyMat.uniforms.uTime.value = time;
    sealMat.uniforms.uTime.value = time;
    sealMat.uniforms.uAlpha.value = clamp(sealMat.uniforms.uAlpha.value + (sealed ? dt : -dt * 0.5), 0, 1);
    seal.visible = sealMat.uniforms.uAlpha.value > 0.01;
    flyMat.uniforms.uTime.value = time; flyMat.uniforms.uCenter.value.set(px, py, pz);
    sky.position.copy(camera.position);
    const sx = Math.round(px / 4) * 4, sz = Math.round(pz / 4) * 4;
    sun.target.position.set(sx, py, sz);
    sun.position.set(sx + lightDir.x * 150, py + lightDir.y * 150, sz + lightDir.z * 150);
    let best = null, bd = 1e9;
    for (const b of beacons) {
      b.glow = lerp(b.glow, b.lit ? 1 : 0, 1 - Math.exp(-dt * 1.5));
      b.gem.rotation.y = time * (0.6 + b.glow + (b.active ? 2 : 0));
      b.gem.position.y = 9.4 + Math.sin(time * 1.4 + b.i) * 0.25;
      b.gemMat.color.copy(BLUE).lerp(GOLD, Math.max(b.glow, b.charge));
      b.beamMat.color.copy(BLUE).lerp(GOLD, b.glow).multiplyScalar(0.6);
      b.beamMat.opacity = 0.07 + b.glow * 0.3 + Math.sin(time * 2 + b.i) * 0.02;
      b.beam.scale.x = b.beam.scale.z = 1 + b.glow * 1.3;
      b.ringMat.opacity = b.lit ? 0.22 : b.active ? 0.6 + Math.sin(time * 6) * 0.15 : 0.4 + Math.sin(time * 2) * 0.12;
      b.ringMat.color.setRGB(0.4, 0.6, 1.4).lerp(RING_GOLD, Math.max(b.glow, b.active ? 1 : 0));
      const ds = b.lit ? 0.01 : Math.max(0.01, Math.sqrt(b.charge) * BEACON_R);
      b.disc.scale.setScalar(ds); b.discMat.opacity = b.lit ? 0 : 0.16 + b.charge * 0.1;
      if (b.glow > 0.02) { const d = Math.hypot(b.x - px, b.z - pz); if (d < bd) { bd = d; best = b; } }
    }
    if (best && bd < 130) { beaconLight.position.set(best.x, best.y + 7, best.z); beaconLight.intensity = 130 * best.glow * smoothstep(130, 70, bd); }
    else beaconLight.intensity = 0;
  }

  function makeMinimap(px) {
    const cv = document.createElement('canvas'); cv.width = cv.height = px;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(px, px);
    const enc = (v) => Math.round(255 * Math.pow(clamp(v, 0, 1), 1 / 2.2));
    for (let j = 0; j < px; j++) for (let i = 0; i < px; i++) {
      const x = -HALF + (i + 0.5) / px * SIZE, z = -HALF + (j + 0.5) / px * SIZE, y = getHeight(x, z), k = (j * px + i) * 4;
      if (y < 0.1) { img.data[k + 3] = 0; continue; }
      const c = terrainColor(x, z, y, 1, 0.5), sh = 0.8 + clamp((getHeight(x - 6, z - 6) - y) * -0.06, -0.25, 0.3);
      img.data[k] = enc(c[0] * sh); img.data[k + 1] = enc(c[1] * sh); img.data[k + 2] = enc(c[2] * sh); img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  return {
    START, beacons, shardPos, chestPos, crownY, state, flyMat,
    getHeight, reachable, collide, nearObstacle, update, makeMinimap,
    setDawn(t, instant) { dawnTarget = t; if (instant) { dawn = t; applyDawn(); } },
    get dawn() { return dawn; },
  };
}
