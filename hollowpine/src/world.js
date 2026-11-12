// Hollowpine world: terrain, forest, harvest nodes, colliders and ray queries. Points of interest are built in places.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildPlaces, POI_DEFS, ROADS } from './places.js';

export const SIZE = 2000, HALF = 1000, G = 384, GN = G + 1, CELL = SIZE / G;
export const LAKE = { x: -420, z: 260, r: 82, y: 19.3 };
export const TOWN = { x: 420, z: 60 }, HARBOR = { x: 260, z: 770 }, MTN = { x: -200, z: -480 };

export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// Perlin noise
const PERM = new Uint8Array(512);
{ const r = rng(1337), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y) * ((h & 4) ? 0.5 : 1);
export function noise(x, y) {
  const X = Math.floor(x), Y = Math.floor(y), fx = x - X, fy = y - Y, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = PERM[(X & 255) + PERM[Y & 255]], b = PERM[((X + 1) & 255) + PERM[Y & 255]], c = PERM[(X & 255) + PERM[(Y + 1) & 255]], d = PERM[((X + 1) & 255) + PERM[(Y + 1) & 255]];
  return lerp(lerp(grad(a, fx, fy), grad(b, fx - 1, fy), u), lerp(grad(c, fx, fy - 1), grad(d, fx - 1, fy - 1), u), v) * 0.8;
}
export function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); a *= 0.5; f *= 2.03; } return s; }
const ridged = (x, y) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { s += a * (1 - Math.abs(noise(x * f, y * f)) * 2); a *= 0.5; f *= 2.1; } return s; };

// Natural terrain before any levelling.
function rawH(x, z) {
  const r = Math.hypot(x, z), coast = 830 + 190 * fbm(x * 0.0022 + 5, z * 0.0022 - 3, 3);
  let h = lerp(-12, 8, smooth(coast + 70, coast - 70, r));
  const inland = smooth(coast, coast - 380, r);
  h += inland * (9 + 30 * (fbm(x * 0.0032, z * 0.0032, 4) + 0.5)) + inland * 5 * fbm(x * 0.013, z * 0.013, 3);
  const dm = Math.hypot(x - MTN.x, z - MTN.z), m = smooth(500, 30, dm);
  if (m > 0) h += Math.pow(m, 1.55) * 215 * (0.62 + 0.38 * ridged(x * 0.0055, z * 0.0055)) + m * 8;
  return h;
}
const ZONES = [];
function finalH(x, z) {
  let h = rawH(x, z);
  for (const q of ZONES) { const d = Math.hypot(x - q.x, z - q.z); if (d < q.r) h = lerp(h, q.h, smooth(q.r, q.inner, d)); }
  // lake basin
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z); if (dl < 84) h -= 7 * smooth(84, 44, dl);
  // harbor basin: a sheer quay edge at z = 800
  const hx = Math.abs(x - HARBOR.x); if (hx < 240 && z > 790) h = lerp(h, -8, smooth(797, 802, z) * smooth(240, 190, hx));
  return h;
}

export function distRoad(x, z) {
  let best = 1e9;
  for (const road of ROADS) for (let i = 0; i < road.length - 1; i++) {
    const ax = road[i][0], az = road[i][1], bx = road[i + 1][0], bz = road[i + 1][1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) best = d;
  }
  return best;
}

export function createWorld(scene, opts) {
  const W = { pois: [], containers: [], spawns: [], lights: [], nodes: [], waterSpots: [] };
  // ---- heightmap
  for (const p of POI_DEFS) ZONES.push({ x: p.x, z: p.z, r: p.zr || p.r + 26, inner: p.zi || p.r * 0.8, h: p.h != null ? p.h : Math.max(2.6, rawH(p.x, p.z)) });
  ZONES.push({ x: LAKE.x, z: LAKE.z, r: 200, inner: 96, h: 20 });
  ZONES.sort((a, b) => b.r - a.r);
  const HM = new Float32Array(GN * GN);
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) HM[j * GN + i] = finalH(-HALF + i * CELL, -HALF + j * CELL);
  const H = W.H = (x, z) => {
    let fx = (x + HALF) / CELL, fz = (z + HALF) / CELL;
    if (fx < 0) fx = 0; else if (fx > G - 0.001) fx = G - 0.001; if (fz < 0) fz = 0; else if (fz > G - 0.001) fz = G - 0.001;
    const ix = fx | 0, iz = fz | 0, u = fx - ix, v = fz - iz, k = iz * GN + ix;
    const a = HM[k], d = HM[k + 1], b = HM[k + GN], c = HM[k + GN + 1];
    return u + v < 1 ? a + (d - a) * u + (b - a) * v : c + (b - c) * (1 - u) + (d - c) * (1 - v);
  };
  const slope = W.slope = (x, z) => { const e = 2.5; return Math.hypot(H(x + e, z) - H(x - e, z), H(x, z + e) - H(x, z - e)) / (2 * e); };
  const poiNear = (x, z, pad = 0) => { for (const p of POI_DEFS) if (Math.hypot(x - p.x, z - p.z) < p.r + pad) return p; return null; };
  W.poiNear = poiNear;
  W.inWater = (x, z) => H(x, z) < 0 || (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r && H(x, z) < LAKE.y);
  W.waterLevel = (x, z) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 4 ? LAKE.y : 0;
  // can grass or trees grow here
  const wild = W.wild = (x, z) => { const h = H(x, z); return h > 2.2 && h < 150 && slope(x, z) < 0.62 && !poiNear(x, z, 0) && distRoad(x, z) > 4.5 && !(Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 3); };

  // ---- terrain mesh
  const colAt = (x, z, h, sl, out) => {
    const n = fbm(x * 0.02, z * 0.02, 3), n2 = noise(x * 0.11, z * 0.11);
    let r, g, b;
    if (h < 1.7) { r = 0.70; g = 0.64; b = 0.46; if (h < 0) { r *= 0.6; g *= 0.62; b *= 0.6; } }
    else { r = 0.20 + n * 0.10 + n2 * 0.03; g = 0.31 + n * 0.14 + n2 * 0.04; b = 0.11 + n * 0.05; const k = smooth(1.7, 3.2, h); r = lerp(0.70, r, k); g = lerp(0.64, g, k); b = lerp(0.46, b, k); }
    const alp = smooth(118, 150, h + n * 30); r = lerp(r, 0.36, alp); g = lerp(g, 0.36, alp); b = lerp(b, 0.30, alp);
    const rock = smooth(0.55, 0.85, sl + n2 * 0.08); r = lerp(r, 0.40 + n2 * 0.05, rock); g = lerp(g, 0.39 + n2 * 0.05, rock); b = lerp(b, 0.37 + n2 * 0.05, rock);
    const snow = smooth(152, 172, h + n * 26) * (1 - smooth(0.9, 1.5, sl)); r = lerp(r, 0.92, snow); g = lerp(g, 0.94, snow); b = lerp(b, 0.97, snow);
    const dr = distRoad(x, z); if (dr < 6 && h > 1) { const k = smooth(6, 2.5, dr) * 0.9; r = lerp(r, 0.42 + n2 * 0.04, k); g = lerp(g, 0.34 + n2 * 0.03, k); b = lerp(b, 0.24, k); }
    const p = poiNear(x, z, 8); if (p && p.ground) { const k = smooth(p.r + 8, p.r * 0.7, Math.hypot(x - p.x, z - p.z)) * 0.85; const c = p.ground; r = lerp(r, c[0] + n2 * 0.03, k); g = lerp(g, c[1] + n2 * 0.03, k); b = lerp(b, c[2] + n2 * 0.03, k); }
    out[0] = r; out[1] = g; out[2] = b;
  };
  const detail = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'), im = c.createImageData(256, 256), r = rng(7);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const a = Math.PI * 2 / 256, nx = Math.cos(x * a) * 6, ny = Math.sin(x * a) * 6, nz = Math.cos(y * a) * 6, nw = Math.sin(y * a) * 6; const v = 205 + 60 * (noise(nx + nz * 0.7, ny + nw * 0.7 + 9) + noise(nx * 3 + nw, nz * 3 + ny) * 0.6) + (r() - 0.5) * 34; const k = (y * 256 + x) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = Math.max(120, Math.min(255, v)); im.data[k + 3] = 255; }
    c.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  W.detail = detail;
  const terrMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: detail });
  const CH = 48, tmp = [0, 0, 0];
  for (let cj = 0; cj < G / CH; cj++) for (let ci = 0; ci < G / CH; ci++) {
    const n = CH + 1, pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), idx = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const gi = ci * CH + i, gj = cj * CH + j, x = -HALF + gi * CELL, z = -HALF + gj * CELL, h = HM[gj * GN + gi], k = j * n + i;
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z; uv[k * 2] = x / 7; uv[k * 2 + 1] = z / 7;
      const hl = HM[gj * GN + Math.max(0, gi - 1)], hr = HM[gj * GN + Math.min(G, gi + 1)], hu = HM[Math.max(0, gj - 1) * GN + gi], hd = HM[Math.min(G, gj + 1) * GN + gi];
      const nx = hl - hr, nz = hu - hd, ny = 2 * CELL, l = Math.hypot(nx, ny, nz); nor[k * 3] = nx / l; nor[k * 3 + 1] = ny / l; nor[k * 3 + 2] = nz / l;
      colAt(x, z, h, Math.hypot(nx, nz) / ny, tmp); col[k * 3] = tmp[0]; col[k * 3 + 1] = tmp[1]; col[k * 3 + 2] = tmp[2];
    }
    for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) { const a = j * n + i, d = a + 1, b = a + n, c = b + 1; idx.push(a, b, d, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, terrMat); m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m);
  }

  // ---- colliders (spatial hash, 8 m cells)
  const CC = 8, hash = new Map(), key = (ix, iz) => (ix + 512) * 2048 + (iz + 512);
  W.addCollider = (c) => {
    const rad = c.r != null ? c.r : Math.hypot(c.hx, c.hz);
    c.cells = [];
    for (let iz = Math.floor((c.z - rad) / CC); iz <= Math.floor((c.z + rad) / CC); iz++) for (let ix = Math.floor((c.x - rad) / CC); ix <= Math.floor((c.x + rad) / CC); ix++) { const k = key(ix, iz); let a = hash.get(k); if (!a) hash.set(k, a = []); a.push(c); c.cells.push(a); }
    return c;
  };
  W.removeCollider = (c) => { for (const a of c.cells || []) { const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); } };
  // Push a standing body out of solids. Returns the height of any surface it can stand on.
  const res = W.res = { hit: null, ground: -1e9 };
  W.resolve = (p, r, feet, height) => {
    res.hit = null; let ground = -1e9;
    const x0 = Math.floor((p.x - r) / CC), x1 = Math.floor((p.x + r) / CC), z0 = Math.floor((p.z - r) / CC), z1 = Math.floor((p.z + r) / CC);
    for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
      const a = hash.get(key(ix, iz)); if (!a) continue;
      for (let i = 0; i < a.length; i++) {
        const c = a[i]; if (c.off) continue;
        if (c.r != null) {
          const dx = p.x - c.x, dz = p.z - c.z, d2 = dx * dx + dz * dz, rr = r + c.r; if (d2 >= rr * rr) continue;
          if (feet >= c.y1 - 0.55) { if (d2 < c.r * c.r) ground = Math.max(ground, c.y1); continue; }
          if (feet + height <= c.y0) continue;
          const d = Math.sqrt(d2) || 0.001; p.x += dx / d * (rr - d); p.z += dz / d * (rr - d); res.hit = c;
        } else {
          const dx = p.x - c.x, dz = p.z - c.z, lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
          const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz)), ex = lx - qx, ez = lz - qz, d2 = ex * ex + ez * ez; if (d2 >= r * r) continue;
          if (feet >= c.y1 - 0.55) { if (d2 < r * r * 0.3) ground = Math.max(ground, c.y1); continue; }
          if (feet + height <= c.y0) continue;
          let px, pz;
          if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; px = ex * k; pz = ez * k; }
          else { const ax = c.hx - Math.abs(lx), az = c.hz - Math.abs(lz); if (ax < az) { px = (lx > 0 ? 1 : -1) * (ax + r); pz = 0; } else { px = 0; pz = (lz > 0 ? 1 : -1) * (az + r); } }
          p.x += px * c.c + pz * c.s; p.z += -px * c.s + pz * c.c; res.hit = c;
        }
      }
    }
    res.ground = ground; return ground;
  };

  // ---- static geometry builder shared with places.js
  const geos = [], C = new THREE.Color(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  const F = { x: 0, y: 0, z: 0, c: 1, s: 0, yaw: 0 };
  const jr = rng(99);
  const paint = (g, color, shade = true) => {
    C.set(color); const j = 0.92 + jr() * 0.16, p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
    g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y;
    for (let i = 0; i < n; i++) { const k = shade ? 0.8 + 0.2 * (p.getY(i) - y0) / (y1 - y0 || 1) : 1; col[i * 3] = C.r * j * k; col[i * 3 + 1] = C.g * j * k; col[i * 3 + 2] = C.b * j * k; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
  };
  const B = W.B = {
    F,
    frame(x, z, yaw = 0, y = null) { F.x = x; F.z = z; F.yaw = yaw; F.c = Math.cos(yaw); F.s = Math.sin(yaw); F.y = y == null ? H(x, z) : y; },
    wx: (lx, lz) => F.x + lx * F.c + lz * F.s, wz: (lx, lz) => F.z - lx * F.s + lz * F.c,
    // box resting on ly (relative to the frame's base height)
    box(color, lx, ly, lz, sx, sy, sz, o = {}) {
      const g = new THREE.BoxGeometry(sx, sy, sz), uv = g.attributes.uv, dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
      for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / 3.5, uv.getY(k) * dims[f][1] / 3.5); }
      paint(g, color);
      const x = B.wx(lx, lz), z = B.wz(lx, lz), yaw = F.yaw + (o.yaw || 0), y = F.y + ly + sy / 2;
      E.set(o.pitch || 0, yaw, o.roll || 0, 'YXZ'); Q.setFromEuler(E); M4.compose(V.set(x, y, z), Q, ONE); g.applyMatrix4(M4); geos.push(g);
      if (!o.nc && !o.pitch && !o.roll) W.addCollider({ x, z, hx: sx / 2, hz: sz / 2, c: Math.cos(yaw), s: Math.sin(yaw), y0: F.y + ly, y1: F.y + ly + sy });
    },
    cyl(color, lx, ly, lz, r, h, o = {}) {
      const g = new THREE.CylinderGeometry(o.top != null ? o.top : r, r, h, o.sides || 10); paint(g, color);
      const x = B.wx(lx, lz), z = B.wz(lx, lz), y = F.y + ly + (o.lie ? r : h / 2);
      E.set(o.lie ? Math.PI / 2 : (o.pitch || 0), F.yaw + (o.yaw || 0), o.roll || 0, 'YXZ'); Q.setFromEuler(E); M4.compose(V.set(x, y, z), Q, ONE); g.applyMatrix4(M4); geos.push(g);
      if (!o.nc) { if (o.lie) { const yaw = F.yaw + (o.yaw || 0); W.addCollider({ x, z, hx: r, hz: h / 2, c: Math.cos(yaw), s: Math.sin(yaw), y0: F.y + ly, y1: F.y + ly + r * 2 }); } else W.addCollider({ x, z, r, y0: F.y + ly, y1: F.y + ly + h }); }
    },
    rock(color, lx, ly, lz, r, sy = 1) {
      const g = new THREE.DodecahedronGeometry(r, 0); g.scale(1, sy, 1); g.rotateY(jr() * 6); paint(g, color);
      const x = B.wx(lx, lz), z = B.wz(lx, lz); g.translate(x, F.y + ly + r * sy * 0.6, z); geos.push(g); W.addCollider({ x, z, r: r * 0.85, y0: F.y + ly, y1: F.y + ly + r * sy * 1.4 });
    },
    crate(lx, ly, lz, tier, o = {}) {
      const s = o.s || 0.9, col = o.color || [0x7a5c38, 0x58633d, 0x3f4a55][tier - 1];
      B.box(col, lx, ly, lz, s * (o.long || 1.25), s * 0.75, s, { yaw: o.yaw || 0 }); B.box(0x2a241c, lx, ly + s * 0.75, lz, s * (o.long || 1.25) + 0.06, 0.06, s + 0.06, { yaw: o.yaw || 0, nc: true });
      W.containers.push({ id: W.containers.length, x: B.wx(lx, lz), y: F.y + ly + 0.5, z: B.wz(lx, lz), tier, kind: 'box', n: o.n || ['Supply crate', 'Military crate', 'Sealed case'][tier - 1], day: -99 });
    },
    spawn(type, lx, lz, n = 1, rad = 6) { W.spawns.push({ type, x: B.wx(lx, lz), z: B.wz(lx, lz), n, rad, alive: 0, day: -99 }); },
    node(type, lx, lz) { addNode(type, B.wx(lx, lz), B.wz(lx, lz), 1); },
    light(lx, ly, lz, color = 0xffc878, power = 1) { W.lights.push({ x: B.wx(lx, lz), y: F.y + ly, z: B.wz(lx, lz), color, power }); },
    flush() {
      if (!geos.length) return; const g = mergeGeometries(geos.map((q) => { const n = q.index ? q.toNonIndexed() : q; n.deleteAttribute('uv2'); return n; }), false);
      for (const q of geos) q.dispose(); geos.length = 0; g.computeBoundingSphere();
      const m = new THREE.Mesh(g, staticMat); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m);
    },
    H, rnd: rng(4242),
  };
  const staticMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: detail });
  W.staticMat = staticMat;

  // ---- harvest nodes
  const NT = W.NODE_TYPES = {
    sticks: { n: 'Sticks', verb: 'Pick up', give: { stick: [2, 3] }, regrow: 3 },
    stone: { n: 'Loose stones', verb: 'Pick up', give: { stone: [1, 2] }, regrow: 4 },
    bush: { n: 'Berry bush', verb: 'Pick', give: { berries: [2, 4], stick: [0, 1] }, rare: ['seed_berry', 0.3], regrow: 2 },
    mushroom: { n: 'Mushrooms', verb: 'Pick', give: { mushroom: [1, 2] }, regrow: 2 },
    flax: { n: 'Wild flax', verb: 'Harvest', give: { fiber: [2, 4] }, rare: ['seed_flax', 0.3], regrow: 2 },
    boulder: { n: 'Boulder', mine: { stone: [2, 3] }, hp: 90, solid: 1.1, regrow: 5 },
    iron: { n: 'Iron vein', mine: { iron_ore: [1, 2], stone: [0, 1] }, hp: 110, solid: 1.1, regrow: 5 },
    sulfur: { n: 'Sulfur deposit', mine: { sulfur: [1, 2] }, hp: 90, solid: 1.0, regrow: 5 },
    salvage: { n: 'Wreck', mine: { scrap: [2, 4], metal: [0, 1] }, hp: 140, regrow: 8, hidden: 1, any: 1 },
  };
  const NC = 6, nodeHash = new Map();
  function addNode(type, x, z, s) {
    const t = NT[type], n = { id: W.nodes.length, type, x, z, y: H(x, z), s, alive: true, hp: t.hp || 0, day: 0, rot: jr() * 6.28 };
    W.nodes.push(n); const k = key(Math.floor(x / NC), Math.floor(z / NC)); let a = nodeHash.get(k); if (!a) nodeHash.set(k, a = []); a.push(n);
    if (t.solid) n.col = W.addCollider({ x, z, r: t.solid * s * 0.8, y0: n.y - 1, y1: n.y + t.solid * s * 1.3, node: n });
    return n;
  }
  W.nodesNear = (x, z, r, out) => { out.length = 0; for (let iz = Math.floor((z - r) / NC); iz <= Math.floor((z + r) / NC); iz++) for (let ix = Math.floor((x - r) / NC); ix <= Math.floor((x + r) / NC); ix++) { const a = nodeHash.get(key(ix, iz)); if (a) for (const n of a) out.push(n); } return out; };

  // ---- places (town, harbor, mountain sites, camps...)
  buildPlaces(W, B);
  for (const p of POI_DEFS) W.pois.push({ id: p.id, n: p.n, kind: p.kind, x: p.x, z: p.z, r: p.r, found: false });

  // ---- trees
  const TC = 160, TCN = Math.ceil(SIZE / TC), r = rng(2024);
  const T = W.trees = { x: [], z: [], y: [], s: [], type: [], hp: [], alive: [], chunk: [], iNear: [], iFar: [] };
  const TH = 8, treeHash = new Map();
  for (let gz = -HALF + 20; gz < HALF - 20; gz += 6.4) for (let gx = -HALF + 20; gx < HALF - 20; gx += 6.4) {
    const x = gx + (r() - 0.5) * 5.6, z = gz + (r() - 0.5) * 5.6; if (!wild(x, z)) { r(); continue; }
    const h = H(x, z), dens = fbm(x * 0.006 + 40, z * 0.006, 3) + 0.5, line = smooth(100, 138, h + noise(x * 0.02, z * 0.02) * 22);
    const dt = Math.hypot(x - TOWN.x, z - TOWN.z);
    if (r() > (dens > 0.33 ? 0.8 : 0.07) * (1 - line) || (h < 3.4 && r() < 0.7) || dt < 215 || poiNear(x, z, 3)) continue;
    const q = r(), type = h > 85 ? (q < 0.9 ? 0 : 2) : q < 0.68 ? 0 : q < 0.94 ? 1 : 2, i = T.x.length;
    T.x.push(x); T.z.push(z); T.y.push(h - 0.15); T.s.push(0.75 + r() * 0.75); T.type.push(type); T.hp.push(100); T.alive.push(1);
    T.chunk.push(Math.floor((z + HALF) / TC) * TCN + Math.floor((x + HALF) / TC));
    const k = key(Math.floor(x / TH), Math.floor(z / TH)); let a = treeHash.get(k); if (!a) treeHash.set(k, a = []); a.push(i);
  }
  const cone = (rad, h, y, sides, c1, c2) => { const g = new THREE.ConeGeometry(rad, h, sides, 1, true); g.translate(0, y + h / 2, 0); const p = g.attributes.position, col = new Float32Array(p.count * 3); C.set(c1); const D = new THREE.Color(c2); for (let i = 0; i < p.count; i++) { const k = (p.getY(i) - y) / h; col[i * 3] = lerp(C.r, D.r, k); col[i * 3 + 1] = lerp(C.g, D.g, k); col[i * 3 + 2] = lerp(C.b, D.b, k); } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; };
  const trunk = (r0, r1, h, c, sides = 6) => { const g = new THREE.CylinderGeometry(r1, r0, h, sides, 1, true); g.translate(0, h / 2, 0); return paint(g, c, false); };
  const blob = (rad, x, y, z, c, det = 1) => { const g = new THREE.IcosahedronGeometry(rad, det); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + 0.16 * noise(p.getX(i) * 1.3 + x, p.getY(i) * 1.3 + z); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.82, p.getZ(i) * k); } g.translate(x, y, z); g.computeVertexNormals(); return paint(g, c); };
  const merge = (a) => mergeGeometries(a.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n; }), false);
  const branch = (len, y, ry, rz) => { const g = new THREE.CylinderGeometry(0.03, 0.07, len, 4); g.translate(0, len / 2, 0); g.rotateZ(rz); g.rotateY(ry); g.translate(0, y, 0); return paint(g, 0x6f675c, false); };
  const nearGeo = [
    merge([trunk(0.3, 0.1, 8.5, 0x4a3524), cone(2.5, 3.6, 2.4, 8, 0x16301a, 0x24451f), cone(2.0, 3.3, 4.6, 8, 0x18361c, 0x2a4d22), cone(1.45, 3.0, 6.7, 7, 0x1b3a1e, 0x305626), cone(0.85, 2.6, 8.7, 6, 0x1f4020, 0x3a6229)]),
    merge([trunk(0.32, 0.16, 5, 0x5b4a3a), blob(2.3, 0, 6.2, 0, 0x33571f), blob(1.7, 1.5, 5.1, 0.6, 0x2c4d1c, 0), blob(1.6, -1.3, 5.3, -0.8, 0x3a6124, 0), blob(1.4, 0.2, 7.6, -0.4, 0x426b28, 0)]),
    merge([trunk(0.26, 0.07, 7.5, 0x6f675c), branch(1.9, 3.6, 0.4, 0.9), branch(1.5, 4.6, 2.6, -1.0), branch(1.3, 5.4, 4.4, 0.8), branch(1.0, 6.2, 1.2, -0.7)]),
  ];
  const farGeo = [
    merge([cone(2.3, 9.2, 2.2, 5, 0x16301a, 0x35592a), trunk(0.3, 0.2, 2.4, 0x4a3524, 4)]),
    merge([blob(2.6, 0, 6.2, 0, 0x36591f, 0), trunk(0.32, 0.2, 4.6, 0x5b4a3a, 4)]),
    merge([trunk(0.26, 0.07, 7.5, 0x6f675c, 4)]),
  ];
  const treeMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const chunks = W.treeChunks = [];
  const per = new Map();
  for (let i = 0; i < T.x.length; i++) { const k = T.chunk[i] * 3 + T.type[i]; let a = per.get(k); if (!a) per.set(k, a = []); a.push(i); }
  const D = new THREE.Object3D();
  for (const [k, list] of per) {
    const type = k % 3, ch = (k - type) / 3, cx = (ch % TCN) * TC - HALF + TC / 2, cz = Math.floor(ch / TCN) * TC - HALF + TC / 2;
    const near = new THREE.InstancedMesh(nearGeo[type], treeMat, list.length), far = new THREE.InstancedMesh(farGeo[type], treeMat, list.length);
    let ymin = 1e9, ymax = -1e9;
    list.forEach((ti, j) => {
      D.position.set(T.x[ti], T.y[ti], T.z[ti]); D.rotation.set(0, (ti * 2.399) % 6.28, 0); const s = T.s[ti]; D.scale.set(s, s * (0.9 + (ti % 7) * 0.035), s); D.updateMatrix();
      near.setMatrixAt(j, D.matrix); far.setMatrixAt(j, D.matrix); const v = 0.8 + ((ti * 37) % 17) / 40; C.setRGB(v, v * (0.94 + ((ti * 13) % 9) / 80), v * 0.95); near.setColorAt(j, C); far.setColorAt(j, C);
      T.iNear[ti] = near; T.iFar[ti] = far; T.chunk[ti] = j; ymin = Math.min(ymin, T.y[ti]); ymax = Math.max(ymax, T.y[ti]);
    });
    const bs = new THREE.Sphere(new THREE.Vector3(cx, (ymin + ymax) / 2 + 6, cz), TC * 0.75 + (ymax - ymin) / 2 + 10);
    for (const m of [near, far]) { m.geometry = m.geometry; m.boundingSphere = bs; m.matrixAutoUpdate = false; m.frustumCulled = true; scene.add(m); }
    near.computeBoundingSphere = far.computeBoundingSphere = function () { this.boundingSphere = bs; };
    near.castShadow = true; near.visible = false;
    chunks.push({ x: cx, z: cz, near, far });
  }
  const stumpGeo = paint(new THREE.CylinderGeometry(0.3, 0.36, 0.5, 7), 0x6b5236, false); stumpGeo.translate(0, 0.25, 0);
  const stumps = new THREE.InstancedMesh(stumpGeo, treeMat, 3000); stumps.count = 0; stumps.frustumCulled = false; scene.add(stumps);
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  W.fellTree = (i, silent) => {
    if (!T.alive[i]) return; T.alive[i] = 0;
    T.iNear[i].setMatrixAt(T.chunk[i], ZERO); T.iFar[i].setMatrixAt(T.chunk[i], ZERO); T.iNear[i].instanceMatrix.needsUpdate = T.iFar[i].instanceMatrix.needsUpdate = true;
    if (stumps.count < 3000) { D.position.set(T.x[i], T.y[i], T.z[i]); D.rotation.set(0, 0, 0); D.scale.setScalar(T.s[i]); D.updateMatrix(); stumps.setMatrixAt(stumps.count++, D.matrix); stumps.instanceMatrix.needsUpdate = true; }
    if (!silent) fallers.push(makeFaller(i));
  };
  const fallers = [];
  function makeFaller(i) { const m = new THREE.Mesh(nearGeo[T.type[i]], treeMat); m.position.set(T.x[i], T.y[i] + 0.4, T.z[i]); m.scale.setScalar(T.s[i]); m.castShadow = true; scene.add(m); return { m, t: 0, dir: Math.random() * 6.28 }; }
  W.treesNear = (x, z, rad, out) => { out.length = 0; for (let iz = Math.floor((z - rad) / TH); iz <= Math.floor((z + rad) / TH); iz++) for (let ix = Math.floor((x - rad) / TH); ix <= Math.floor((x + rad) / TH); ix++) { const a = treeHash.get(key(ix, iz)); if (a) for (const t of a) if (T.alive[t]) out.push(t); } return out; };
  const tl = [];
  W.collideTrees = (p, rad) => { W.treesNear(p.x, p.z, rad + 0.6, tl); let hit = false; for (const t of tl) { const dx = p.x - T.x[t], dz = p.z - T.z[t], rr = rad + 0.27 * T.s[t], d2 = dx * dx + dz * dz; if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.01; p.x += dx / d * (rr - d); p.z += dz / d * (rr - d); hit = true; } } return hit; };

  // ---- scatter nodes
  const tryNode = (type, x, z, s = 1) => { if (wild(x, z)) addNode(type, x, z, s); };
  for (let i = 0; i < 26000; i++) {
    const x = (r() - 0.5) * 1900, z = (r() - 0.5) * 1900, q = r(), h = H(x, z); if (h < 2.4) continue;
    if (h > 60 && Math.hypot(x - MTN.x, z - MTN.z) < 430) { if (slope(x, z) > 0.9 || poiNear(x, z, 2)) continue; if (q < 0.2) addNode('iron', x, z, 0.8 + r() * 0.5); else if (q < 0.32 && h > 105) addNode('sulfur', x, z, 0.7 + r() * 0.4); else if (q < 0.55) addNode('boulder', x, z, 0.8 + r() * 0.9); else if (q < 0.7 && h < 150) tryNode('stone', x, z); continue; }
    if (q < 0.3) tryNode('sticks', x, z); else if (q < 0.52) tryNode('stone', x, z); else if (q < 0.66) tryNode('bush', x, z, 0.8 + r() * 0.5); else if (q < 0.74) tryNode('mushroom', x, z); else if (q < 0.92) tryNode('flax', x, z, 0.8 + r() * 0.5); else if (q < 0.985) tryNode('boulder', x, z, 0.7 + r() * 0.9); else tryNode(r() < 0.5 ? 'iron' : 'sulfur', x, z, 0.8);
  }
  const stickG = (() => { const a = []; for (let i = 0; i < 4; i++) { const g = new THREE.CylinderGeometry(0.025, 0.035, 0.9 + i * 0.12, 4); g.rotateZ(Math.PI / 2); g.rotateY(i * 0.9); g.translate((i - 1.5) * 0.08, 0.05 + i * 0.03, (i % 2) * 0.1); a.push(paint(g, 0x7a5c3c, false)); } return merge(a); })();
  const stoneG = merge([paint(new THREE.DodecahedronGeometry(0.2, 0).translate(0, 0.1, 0), 0x8d9093), paint(new THREE.DodecahedronGeometry(0.13, 0).translate(0.26, 0.06, 0.1), 0x7e8285)]);
  const bushG = merge([blob(0.7, 0, 0.55, 0, 0x2f5a22, 0), blob(0.5, 0.5, 0.45, 0.2, 0x38682a, 0), blob(0.5, -0.4, 0.42, -0.3, 0x2a5220, 0), ...[...Array(7)].map((_, i) => paint(new THREE.TetrahedronGeometry(0.1, 0).translate(Math.cos(i * 2.4) * 0.62, 0.45 + (i % 3) * 0.22, Math.sin(i * 2.4) * 0.62), 0xb0243f, false))]);
  const mushG = merge([paint(new THREE.CylinderGeometry(0.03, 0.04, 0.16, 5).translate(0, 0.08, 0), 0xe8dcc4, false), paint(new THREE.SphereGeometry(0.11, 7, 4, 0, 6.28, 0, 1.5).translate(0, 0.14, 0), 0xb0683a, false), paint(new THREE.CylinderGeometry(0.02, 0.03, 0.1, 5).translate(0.16, 0.05, 0.06), 0xe8dcc4, false), paint(new THREE.SphereGeometry(0.07, 7, 4, 0, 6.28, 0, 1.5).translate(0.16, 0.09, 0.06), 0xb0683a, false)]);
  const flaxG = merge([...Array(7)].map((_, i) => { const g = new THREE.ConeGeometry(0.035, 1.0 + (i % 3) * 0.2, 3); g.translate(0, 0.55, 0); g.rotateZ(((i % 3) - 1) * 0.22); g.rotateY(i * 0.9); g.translate(Math.cos(i * 0.9) * 0.14, 0, Math.sin(i * 0.9) * 0.14); return paint(g, i % 2 ? 0x9cba58 : 0x7ea044); }));
  const bould = (c, c2) => merge([paint(new THREE.DodecahedronGeometry(1.1, 0).scale(1, 0.8, 0.9).translate(0, 0.5, 0), c), paint(new THREE.DodecahedronGeometry(0.6, 0).translate(0.8, 0.25, 0.4), c2)]);
  const nodeGeo = { sticks: stickG, stone: stoneG, bush: bushG, mushroom: mushG, flax: flaxG, boulder: bould(0x7f8386, 0x6f7376), iron: bould(0x7c5a48, 0xa5532f), sulfur: bould(0x8f8a5a, 0xcdbb35) };
  const nodeMesh = {};
  const nodeChunks = [], nper = new Map();
  for (const n of W.nodes) { if (!nodeGeo[n.type]) continue; const k = n.type + ':' + (Math.floor((n.z + HALF) / TC) * TCN + Math.floor((n.x + HALF) / TC)); let a = nper.get(k); if (!a) nper.set(k, a = []); a.push(n); }
  for (const [k, list] of nper) {
    const [type, chs] = k.split(':'), ch = +chs, m = new THREE.InstancedMesh(nodeGeo[type], treeMat, list.length);
    list.forEach((n, j) => { n.mesh = m; n.j = j; D.position.set(n.x, n.y - 0.03, n.z); D.rotation.set(0, n.rot, 0); D.scale.setScalar(n.s); D.updateMatrix(); m.setMatrixAt(j, D.matrix); n.mat = D.matrix.clone(); });
    m.frustumCulled = false; m.castShadow = type === 'boulder' || type === 'iron' || type === 'sulfur' || type === 'bush'; m.receiveShadow = true; m.visible = false; m.matrixAutoUpdate = false; scene.add(m);
    nodeChunks.push({ x: (ch % TCN) * TC - HALF + TC / 2, z: Math.floor(ch / TCN) * TC - HALF + TC / 2, m, big: type === 'boulder' || type === 'iron' || type === 'sulfur' });
  }
  W.setNode = (n, alive, day) => { n.alive = alive; n.day = day || 0; if (alive) n.hp = NT[n.type].hp || 0; if (n.mesh) { n.mesh.setMatrixAt(n.j, alive ? n.mat : ZERO); n.mesh.instanceMatrix.needsUpdate = true; } if (n.col) n.col.off = !alive; };

  // ---- grass around the player
  const GR = opts.grass, GS = 1.05, grassGeo = (() => { const a = []; for (let i = 0; i < 3; i++) { for (let b = 0; b < 3; b++) { const g = new THREE.PlaneGeometry(0.09, 0.62, 1, 2); g.translate(0, 0.31, 0); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) * (1 - y * 1.4) + y * y * (b - 1) * 0.5); } g.translate((b - 1) * 0.16, 0, (b % 2) * 0.1); g.rotateY(i * 1.05 + b); a.push(g); } } const g = mergeGeometries(a); const p = g.attributes.position, col = new Float32Array(p.count * 3); for (let k = 0; k < p.count; k++) { const y = p.getY(k) / 0.62; col[k * 3] = 0.2 + y * 0.3; col[k * 3 + 1] = 0.34 + y * 0.36; col[k * 3 + 2] = 0.1 + y * 0.12; g.attributes.normal.setXYZ(k, 0, 1, 0); } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; })();
  const grassMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const gU = { t: { value: 0 } };
  grassMat.onBeforeCompile = (s) => { s.uniforms.uT = gU.t; s.vertexShader = 'uniform float uT;\n' + s.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3(position);\n vec4 ip = instanceMatrix * vec4(0.,0.,0.,1.);\n float sw = sin(uT*1.7 + ip.x*0.35 + ip.z*0.27) * 0.5 + sin(uT*0.6 + ip.z*0.11);\n transformed.x += sw * 0.09 * position.y * position.y * 4.0;\n transformed.z += sw * 0.05 * position.y * position.y * 4.0;'); };
  const grass = new THREE.InstancedMesh(grassGeo, grassMat, GR * GR); grass.frustumCulled = false; grass.receiveShadow = true; scene.add(grass);
  let gcx = 1e9, gcz = 1e9;
  const hash2 = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177 | 0; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
  function regrass(px, pz) {
    const cx = Math.round(px / GS), cz = Math.round(pz / GS); if (Math.abs(cx - gcx) < 5 && Math.abs(cz - gcz) < 5) return; gcx = cx; gcz = cz;
    let k = 0;
    for (let j = 0; j < GR; j++) for (let i = 0; i < GR; i++) {
      const ix = cx + i - GR / 2, iz = cz + j - GR / 2, a = hash2(ix, iz), b = hash2(iz, ix + 7), x = (ix + a) * GS, z = (iz + b) * GS;
      if (a + b * 0.5 > 1.25 || !wild(x, z)) { grass.setMatrixAt(k++, ZERO); continue; }
      const h = H(x, z), s = (0.7 + a * 0.9) * (h > 110 ? 0.6 : 1) * (h < 4 ? 0.6 : 1);
      D.position.set(x, h - 0.02, z); D.rotation.set(0, a * 6.28, 0); D.scale.set(s, s * (0.8 + b * 0.8), s); D.updateMatrix(); grass.setMatrixAt(k++, D.matrix);
    }
    grass.instanceMatrix.needsUpdate = true;
  }

  // ---- water
  const wn = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'), im = c.createImageData(256, 256); const hh = (x, y) => { const a = Math.PI * 2 / 256; return noise(Math.cos(x * a) * 3 + Math.cos(y * a) * 2, Math.sin(x * a) * 3 + Math.sin(y * a) * 2) + 0.5 * noise(Math.cos(x * a) * 7 + 3, Math.sin(y * a) * 7 + Math.sin(x * a) * 5); }; for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const dx = (hh(x + 1, y) - hh(x - 1, y)) * 6, dy = (hh(x, y + 1) - hh(x, y - 1)) * 6, k = (y * 256 + x) * 4; im.data[k] = 128 + dx * 127; im.data[k + 1] = 128 + dy * 127; im.data[k + 2] = 255; im.data[k + 3] = 255; } c.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const wn2 = wn.clone(); wn2.needsUpdate = true;
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x1d4a55, roughness: 0.12, metalness: 0.35, normalMap: wn, normalScale: new THREE.Vector2(0.55, 0.55), transparent: true, opacity: 0.86 });
  wn.repeat.set(380, 380);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.y = 0; sea.renderOrder = 1; scene.add(sea);
  const lakeMat = seaMat.clone(); lakeMat.normalMap = wn2; wn2.repeat.set(9, 9); lakeMat.color.set(0x2a5a58);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r + 6, 40), lakeMat); lake.rotation.x = -Math.PI / 2; lake.position.set(LAKE.x, LAKE.y, LAKE.z); lake.renderOrder = 1; scene.add(lake);
  W.seaMat = seaMat; W.lakeMat = lakeMat;

  // ---- per-frame
  W.update = (dt, px, pz, time, nearDist) => {
    gU.t.value = time; regrass(px, pz);
    wn.offset.set(time * 0.004, time * 0.0027); wn2.offset.set(-time * 0.006, time * 0.004);
    for (const c of chunks) { const d = Math.hypot(c.x - px, c.z - pz), n = d < nearDist; if (c.near.visible !== n) { c.near.visible = n; c.far.visible = !n; } }
    for (const c of nodeChunks) c.m.visible = Math.hypot(c.x - px, c.z - pz) < (c.big ? nearDist + 170 : nearDist + 20);
    for (let i = fallers.length - 1; i >= 0; i--) { const f = fallers[i]; f.t += dt; const a = Math.min(1.5, f.t * f.t * 0.9); f.m.rotation.set(Math.cos(f.dir) * a, 0, Math.sin(f.dir) * a); if (f.t > 1.9) { scene.remove(f.m); fallers.splice(i, 1); } }
  };

  // ---- rays against the static world. Returns distance (or max) and fills W.rayHit.
  const rh = W.rayHit = { kind: null, ref: null };
  const seen = new Set();
  W.ray = (ox, oy, oz, dx, dy, dz, max) => {
    let best = max; rh.kind = null; rh.ref = null;
    // terrain
    let pt = 0, step = 1.2;
    for (let t = step; t < max; t += step) { if (oy + dy * t < H(ox + dx * t, oz + dz * t)) { let a = pt, b = t; for (let i = 0; i < 6; i++) { const m = (a + b) / 2; if (oy + dy * m < H(ox + dx * m, oz + dz * m)) b = m; else a = m; } best = b; rh.kind = 'terrain'; break; } pt = t; if (t > 40) step = 3; }
    seen.clear();
    for (let t = 0; t <= best + 4; t += 4) {
      const sx = ox + dx * t, sz = oz + dz * t, a = hash.get(key(Math.floor(sx / CC), Math.floor(sz / CC)));
      if (a) for (const c of a) {
        if (c.off || seen.has(c)) continue; seen.add(c);
        let t0 = 0, t1 = best;
        if (c.r != null) {
          const fx = ox - c.x, fz = oz - c.z, A = dx * dx + dz * dz, Bq = fx * dx + fz * dz, Cq = fx * fx + fz * fz - c.r * c.r, disc = Bq * Bq - A * Cq; if (disc < 0 || A < 1e-9) continue;
          const tt = (-Bq - Math.sqrt(disc)) / A; if (tt < 0 || tt >= best) continue; const y = oy + dy * tt; if (y < c.y0 || y > c.y1) continue; best = tt; rh.kind = 'solid'; rh.ref = c; continue;
        }
        const fx = ox - c.x, fz = oz - c.z, lx = fx * c.c - fz * c.s, lz = fx * c.s + fz * c.c, ldx = dx * c.c - dz * c.s, ldz = dx * c.s + dz * c.c;
        let ok = true;
        const slab = (o, d, mn, mx) => { if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) ok = false; return; } let a0 = (mn - o) / d, a1 = (mx - o) / d; if (a0 > a1) { const s = a0; a0 = a1; a1 = s; } if (a0 > t0) t0 = a0; if (a1 < t1) t1 = a1; if (t0 > t1) ok = false; };
        slab(lx, ldx, -c.hx, c.hx); if (ok) slab(lz, ldz, -c.hz, c.hz); if (ok) slab(oy, dy, c.y0, c.y1);
        if (ok && t0 < best) { best = t0; rh.kind = 'solid'; rh.ref = c; }
      }
      const ta = treeHash.get(key(Math.floor(sx / TH), Math.floor(sz / TH)));
      if (ta) for (const ti of ta) {
        if (!T.alive[ti]) continue; const rr = 0.3 * T.s[ti], fx = ox - T.x[ti], fz = oz - T.z[ti], A = dx * dx + dz * dz, Bq = fx * dx + fz * dz, Cq = fx * fx + fz * fz - rr * rr, disc = Bq * Bq - A * Cq; if (disc < 0 || A < 1e-9) continue;
        const tt = (-Bq - Math.sqrt(disc)) / A; if (tt < 0 || tt >= best) continue; const y = oy + dy * tt - T.y[ti]; if (y < 0 || y > 7 * T.s[ti]) continue; best = tt; rh.kind = 'tree'; rh.ref = ti;
      }
    }
    return best;
  };

  // ---- top-down map image
  W.drawMap = (cv) => {
    const n = cv.width, c = cv.getContext('2d'), im = c.createImageData(n, n), o = [0, 0, 0];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const wx = -HALF + (x + 0.5) / n * SIZE, wz = -HALF + (y + 0.5) / n * SIZE, h = H(wx, wz), k = (y * n + x) * 4;
      if (h < 0 || (Math.hypot(wx - LAKE.x, wz - LAKE.z) < LAKE.r && h < LAKE.y)) { const d = Math.min(1, -Math.min(h, 0) / 12); o[0] = 0.20 - d * 0.08; o[1] = 0.36 - d * 0.1; o[2] = 0.42 - d * 0.08; }
      else { colAt(wx, wz, h, slope(wx, wz), o); const sh = 1 + Math.max(-0.35, Math.min(0.35, (H(wx - 6, wz - 6) - H(wx + 6, wz + 6)) * 0.035)); o[0] = o[0] * sh * 1.5 + 0.06; o[1] = o[1] * sh * 1.35 + 0.06; o[2] = o[2] * sh * 1.5 + 0.05; }
      im.data[k] = Math.min(255, o[0] * 255); im.data[k + 1] = Math.min(255, o[1] * 255); im.data[k + 2] = Math.min(255, o[2] * 255); im.data[k + 3] = 255;
    }
    c.putImageData(im, 0, 0);
  };
  W.treeCount = T.x.length;
  return W;
}
