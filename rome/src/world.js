import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAND } from './gen/land.js';
import { PLACES, ROADS, RANGES, RIVERS } from './data.js';
import { clamp, lerp, smoothstep, mulberry32, fbm, TAU } from '../../src/util.js';

// ---------- projection ----------
export const KX = LAND.kx, KZ = LAND.kz;
const LONC = (LAND.lon0 + LAND.lon1) / 2, LATC = (LAND.lat0 + LAND.lat1) / 2;
export const XMIN = (LAND.lon0 - LONC) * KX, XMAX = (LAND.lon1 - LONC) * KX;
export const ZMIN = -(LAND.lat1 - LATC) * KZ, ZMAX = -(LAND.lat0 - LATC) * KZ;
export const toX = (lon) => (lon - LONC) * KX, toZ = (lat) => -(lat - LATC) * KZ;
export const toLon = (x) => x / KX + LONC, toLat = (z) => -z / KZ + LATC;

export const CELL = 8, CN = 32, CS = CELL * CN;
export const RADIUS = { urbs: 62, city: 46, town: 34, camp: 28, ruin: 40, site: 14, oppidum: 32, pyramids: 56 };

// ---------- helpers ----------
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
export function part(geo, color, m) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (m) g.applyMatrix4(m);
  g.deleteAttribute('uv');
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  const col = Array.isArray(color) ? color : lin(color);
  for (let i = 0; i < n; i++) c.set(col, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
export function T(x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  _e.set(rx, ry, rz);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e).clone(), new THREE.Vector3(sx, sy, sz));
}
export { mergeGeometries };
export function litMat(extra = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0, ...extra });
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = min(diffuseColor.rgb, vec3(0.9));').replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      #ifdef USE_COLOR
        totalEmissiveRadiance += vColor.rgb * smoothstep(1.0, 1.4, max(max(vColor.r, vColor.g), vColor.b)) * 0.5;
      #endif`);
  };
  mat.customProgramCacheKey = () => 'lit';
  return mat;
}
function segDist(px, pz, s) {
  const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? clamp(((px - s.ax) * dx + (pz - s.az) * dz) / l2, 0, 1) : 0;
  const qx = s.ax + dx * t - px, qz = s.az + dz * t - pz;
  return Math.sqrt(qx * qx + qz * qz);
}

export function createWorld(scene, opts) {
  // ---------- land field (blurred coastline mask) ----------
  const FW = LAND.w, FH = LAND.h;
  const field = new Uint8Array(FW * FH);
  {
    const bin = atob(LAND.rle); let p = 0, cur = 0, i = 0;
    while (i < bin.length) {
      let n = 0, sh = 0, b;
      do { b = bin.charCodeAt(i++); n |= (b & 127) << sh; sh += 7; } while (b & 128);
      if (cur) field.fill(255, p, p + n);
      p += n; cur ^= 1;
    }
    // open the Strait of Messina so ships can pass between Italy and Sicily
    const carve = (lat, lon, r) => {
      const ci = (lon - LAND.lon0) / (LAND.lon1 - LAND.lon0) * FW, cj = (LAND.lat1 - lat) / (LAND.lat1 - LAND.lat0) * FH;
      for (let j = Math.floor(cj - r); j <= cj + r; j++) for (let k = Math.floor(ci - r); k <= ci + r; k++) if ((k - ci) ** 2 + (j - cj) ** 2 <= r * r && k >= 0 && j >= 0 && k < FW && j < FH) field[j * FW + k] = 0;
    };
    for (let t = 0; t <= 1; t += 0.05) carve(lerp(38.42, 37.9, t), lerp(15.72, 15.52, t), 2.6);
    // separable box blur, two passes
    const tmp = new Uint8Array(FW * FH), R = 2, win = R * 2 + 1;
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < FH; j++) { let s = 0; const o = j * FW; for (let k = -R; k <= R; k++) s += field[o + clamp(k, 0, FW - 1)]; for (let k = 0; k < FW; k++) { tmp[o + k] = s / win; s += field[o + Math.min(FW - 1, k + R + 1)] - field[o + Math.max(0, k - R)]; } }
      for (let k = 0; k < FW; k++) { let s = 0; for (let j = -R; j <= R; j++) s += tmp[clamp(j, 0, FH - 1) * FW + k]; for (let j = 0; j < FH; j++) { field[j * FW + k] = s / win; s += tmp[Math.min(FH - 1, j + R + 1) * FW + k] - tmp[Math.max(0, j - R) * FW + k]; } }
    }
  }
  function landF(x, z) {
    const u = clamp((x - XMIN) / (XMAX - XMIN) * FW - 0.5, 0, FW - 1.001), v = clamp((z - ZMIN) / (ZMAX - ZMIN) * FH - 0.5, 0, FH - 1.001);
    const i = u | 0, j = v | 0, fu = u - i, fv = v - j, k = j * FW + i;
    return (lerp(lerp(field[k], field[k + 1], fu), lerp(field[k + FW], field[k + FW + 1], fu), fv)) / 255;
  }

  // ---------- features ----------
  const sites = PLACES.map((p) => ({ ...p, x: toX(p.lon), z: toZ(p.lat), r: RADIUS[p.kind], style: p.style || 'roman', h: null }));
  const siteById = Object.fromEntries(sites.map((s) => [s.id, s]));
  // move every site onto solid ground, and find a harbour for ports
  function spiral(x, z, ok, maxR, step = 6) {
    if (ok(x, z)) return [x, z];
    for (let r = step; r <= maxR; r += step) for (let a = 0; a < TAU; a += step / r) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (ok(px, pz)) return [px, pz]; }
    return null;
  }
  for (const s of sites) {
    const need = s.port ? 0.6 : 0.9;
    const solid = (x, z) => landF(x, z) >= need && landF(x + s.r * 0.6, z) > 0.5 && landF(x - s.r * 0.6, z) > 0.5 && landF(x, z + s.r * 0.6) > 0.5 && landF(x, z - s.r * 0.6) > 0.5;
    const p = spiral(s.x, s.z, solid, 260) || spiral(s.x, s.z, (x, z) => landF(x, z) > 0.75, 400);
    if (p) { s.x = p[0]; s.z = p[1]; }
    if (s.port) {
      const sea = spiral(s.x, s.z, (x, z) => landF(x, z) < 0.3, 500, 8);
      if (sea) {
        s.sea = { x: sea[0], z: sea[1] };
        let t = 0; for (; t < 1; t += 0.01) if (landF(lerp(sea[0], s.x, t), lerp(sea[1], s.z, t)) > 0.6) break;
        s.dock = { x: lerp(sea[0], s.x, t), z: lerp(sea[1], s.z, t) };
        let u = 0; for (; u < 1; u += 0.01) if (landF(lerp(sea[0], s.x, u), lerp(sea[1], s.z, u)) > 0.36) break;
        s.moor = { x: lerp(sea[0], s.x, Math.max(0, u - 0.02)), z: lerp(sea[1], s.z, Math.max(0, u - 0.02)) };
      } else s.port = 0;
    }
  }
  const resolve = (p) => (typeof p === 'string' ? [siteById[p].x, siteById[p].z] : [toX(p[1]), toZ(p[0])]);
  const mkSegs = (list, extra) => { const out = []; for (const o of list) { const pts = o.pts.map(resolve); for (let i = 0; i < pts.length - 1; i++) out.push({ ax: pts[i][0], az: pts[i][1], bx: pts[i + 1][0], bz: pts[i + 1][1], ...extra(o) }); } return out; };
  const roadSegs = mkSegs(ROADS, (o) => ({ name: o.name }));
  const rangeSegs = mkSegs(RANGES, (o) => ({ h: o.h, w: o.w }));
  const riverSegs = mkSegs(RIVERS, (o) => ({ w: o.w }));
  const roadPaths = ROADS.map((o) => ({ name: o.name, pts: o.pts.map(resolve) }));

  // per-chunk feature lists
  const ctxCache = new Map();
  function ctxFor(cx, cz) {
    const key = cx * 4096 + cz;
    let c = ctxCache.get(key);
    if (c) return c;
    const x0 = cx * CS, z0 = cz * CS, x1 = x0 + CS, z1 = z0 + CS;
    const pick = (segs, pad) => segs.filter((s) => Math.max(s.ax, s.bx) > x0 - (s.w || pad) && Math.min(s.ax, s.bx) < x1 + (s.w || pad) && Math.max(s.az, s.bz) > z0 - (s.w || pad) && Math.min(s.az, s.bz) < z1 + (s.w || pad));
    c = { roads: pick(roadSegs, 40), ranges: pick(rangeSegs, 0), rivers: pick(riverSegs.map((s) => s), 30), sites: sites.filter((s) => s.x > x0 - s.r - 50 && s.x < x1 + s.r + 50 && s.z > z0 - s.r - 50 && s.z < z1 + s.r + 50) };
    ctxCache.set(key, c);
    return c;
  }
  const info = { f: 0, road: 1e9, river: 1e9, mtn: 0, site: 0, relief: 0 };
  function relief(x, z, c) {
    let m = 0;
    for (const s of c.ranges) { const k = 1 - segDist(x, z, s) / s.w; if (k > 0) { const v = s.h * k * k * (3 - 2 * k); if (v > m) m = v; } }
    if (m > 0) m *= 0.6 + 0.4 * (1 - Math.abs(fbm(x * 0.006, z * 0.006, 3, 17)));
    const hills = Math.pow(fbm(x * 0.0022, z * 0.0022, 4, 3) * 0.5 + 0.5, 2) * 30 + fbm(x * 0.013, z * 0.013, 2, 9) * 2.6 + 1.2;
    info.mtn = m;
    return hills + m;
  }
  function siteH(s) {
    if (s.h == null) { const c = ctxFor(Math.floor(s.x / CS), Math.floor(s.z / CS)); s.h = 3.4 + 0.1 * relief(s.x, s.z, c); }
    return s.h;
  }
  function genHeight(x, z, c) {
    const f = landF(x, z);
    info.f = f; info.road = info.river = 1e9; info.site = 0; info.mtn = 0;
    if (f < 0.5) return -(0.5 - f) * 36;
    let rel = relief(x, z, c) * smoothstep(0.55, 1.0, f);
    for (const s of c.roads) { const d = segDist(x, z, s); if (d < info.road) info.road = d; }
    for (const s of c.rivers) { const d = segDist(x, z, s) - s.w * 0.5; if (d < info.river) info.river = d; }
    rel *= 1 - 0.8 * smoothstep(30, 9, info.road);
    let y = (f - 0.5) * 7 + rel;
    if (info.river < 14) y = lerp(y, Math.min(y, 0.9 + rel * 0.15), smoothstep(14, 2, info.river));
    for (const s of c.sites) {
      const d = Math.hypot(x - s.x, z - s.z);
      if (d < s.r + 44) { const t = smoothstep(s.r + 44, s.r + 6, d); y = lerp(y, siteH(s), t); if (t > info.site) info.site = t; }
    }
    info.relief = rel;
    return Math.max(y, 0.05 + (f - 0.5) * 2);
  }

  // ---------- chunk height cache ----------
  const NV = CN + 1;
  const hCache = new Map();
  function heightsFor(cx, cz) {
    const key = cx * 4096 + cz;
    let h = hCache.get(key);
    if (h) return h;
    h = new Float32Array(NV * NV);
    const c = ctxFor(cx, cz), x0 = cx * CS, z0 = cz * CS;
    for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) h[j * NV + i] = genHeight(x0 + i * CELL, z0 + j * CELL, c);
    hCache.set(key, h);
    return h;
  }
  function getHeight(x, z) {
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    const h = heightsFor(cx, cz);
    const fx = Math.min((x - cx * CS) / CELL, CN - 0.0001), fz = Math.min((z - cz * CS) / CELL, CN - 0.0001);
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * NV + i;
    const h00 = h[k], h10 = h[k + 1], h01 = h[k + NV], h11 = h[k + NV + 1];
    if (u + v <= 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
    return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  }
  const inBounds = (x, z) => x > XMIN + 40 && x < XMAX - 40 && z > ZMIN + 40 && z < ZMAX - 40;
  const walkable = (x, z) => inBounds(x, z) && getHeight(x, z) > 0.32;
  const sailable = (x, z) => inBounds(x, z) && landF(x, z) < 0.43;

  // ---------- climate + colour ----------
  const P = {
    med: [lin(0x8f9a4e), lin(0xb3a45c)], north: [lin(0x4f8a3e), lin(0x6c9a48)], desert: [lin(0xe3c78a), lin(0xd6b070)], steppe: [lin(0xb0a068), lin(0xc4b078)],
    rock: lin(0x8c857a), rockD: lin(0xb89a70), snow: lin(0xe9eef2), sand: lin(0xe6d7a8), seabed: lin(0x2a5a66), road: lin(0xa39c8e), river: lin(0x3f7f9a), city: lin(0xb9a987),
  };
  const clim = { des: 0, nor: 0 };
  function climate(x, z, f) {
    const lat = toLat(z), lon = toLon(x);
    const wob = fbm(x * 0.0016, z * 0.0016, 2, 41) * 1.2;
    let des = lerp(smoothstep(34.2, 32.2, lat + wob), smoothstep(33.6, 31.6, lat + wob), smoothstep(12, 8, lon));   // the Maghreb coast is green
    des *= lerp(1, smoothstep(35.4, 37.2, lon), smoothstep(32.8, 34.6, lon) * smoothstep(30.0, 31.8, lat));          // so is the Levantine coast
    clim.des = des;
    clim.nor = smoothstep(42.6, 45.6, lat + wob) * (1 - des);
    clim.step = smoothstep(31, 35, lon) * smoothstep(37.5, 39.5, lat) * 0.7;
  }
  const _c = [0, 0, 0];
  function colorAt(x, z, y, ny, jit, c) {
    genHeight(x, z, c); // refresh info for this point
    const f = info.f;
    climate(x, z, f);
    const nv = fbm(x * 0.02, z * 0.02, 2, 33) * 0.5 + 0.5;
    const mix = (a, b, t) => { _c[0] = lerp(a[0], b[0], t); _c[1] = lerp(a[1], b[1], t); _c[2] = lerp(a[2], b[2], t); };
    let r = lerp(P.med[0][0], P.med[1][0], nv), g = lerp(P.med[0][1], P.med[1][1], nv), b = lerp(P.med[0][2], P.med[1][2], nv);
    const blend = (pal, t) => { if (t <= 0) return; r = lerp(r, lerp(pal[0][0], pal[1][0], nv), t); g = lerp(g, lerp(pal[0][1], pal[1][1], nv), t); b = lerp(b, lerp(pal[0][2], pal[1][2], nv), t); };
    const flat = (col, t) => { if (t <= 0) return; r = lerp(r, col[0], t); g = lerp(g, col[1], t); b = lerp(b, col[2], t); };
    blend(P.steppe, clim.step); blend(P.north, clim.nor); blend(P.desert, clim.des);
    if (clim.des > 0.3 && info.river < 60) blend(P.north, smoothstep(60, 12, info.river) * 0.85); // the Nile valley
    flat(clim.des > 0.5 ? P.rockD : P.rock, Math.max(smoothstep(0.84, 0.62, ny), smoothstep(34, 60, y) * 0.7));
    flat(P.snow, smoothstep(70, 86, y + nv * 8));
    flat(P.sand, smoothstep(1.5, 0.5, y));
    flat(P.city, info.site * 0.75);
    flat(P.river, smoothstep(3.5, 0.5, info.river));
    flat(P.seabed, smoothstep(0.1, -5, y));
    const j = 0.93 + jit * 0.14;
    _c[0] = Math.min(r * j, 0.97); _c[1] = Math.min(g * j, 0.97); _c[2] = Math.min(b * j, 0.97);
    return _c;
  }

  // ---------- prop geometry ----------
  const G = {};
  G.cypress = mergeGeometries([part(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 5), 0x4a3524, T(0, 0.6, 0)), part(new THREE.ConeGeometry(0.95, 7.2, 6), 0x23482e, T(0, 4.6, 0)), part(new THREE.ConeGeometry(0.75, 4, 6), 0x2c5636, T(0, 6.6, 0))]);
  G.pine = mergeGeometries([part(new THREE.CylinderGeometry(0.2, 0.32, 5, 5), 0x6a4a34, T(0, 2.5, 0, 1, 1, 1, 0, 0, 0.05)), part(new THREE.IcosahedronGeometry(2.6, 0), 0x3f7242, T(0.2, 5.8, 0, 1, 0.42, 1)), part(new THREE.IcosahedronGeometry(1.7, 0), 0x4c8250, T(-1.2, 5.5, 0.7, 1, 0.4, 1))]);
  G.olive = mergeGeometries([part(new THREE.CylinderGeometry(0.22, 0.36, 1.7, 5), 0x5c4a3a, T(0, 0.85, 0, 1, 1, 1, 0.1, 0, 0.12)), part(new THREE.IcosahedronGeometry(1.6, 0), 0x7c8f62, T(0.1, 2.6, 0, 1, 0.75, 1)), part(new THREE.IcosahedronGeometry(1.1, 0), 0x91a274, T(-0.9, 2.3, 0.5, 1, 0.7, 1))]);
  G.oak = mergeGeometries([part(new THREE.CylinderGeometry(0.32, 0.46, 2.8, 6), 0x5a4028, T(0, 1.4, 0)), part(new THREE.IcosahedronGeometry(2.3, 0), 0x3f7a36, T(0, 4.4, 0)), part(new THREE.IcosahedronGeometry(1.6, 0), 0x4f8c40, T(1.5, 3.7, 0.5)), part(new THREE.IcosahedronGeometry(1.6, 0), 0x356a30, T(-1.2, 3.9, -0.7))]);
  G.fir = mergeGeometries([part(new THREE.CylinderGeometry(0.22, 0.34, 1.8, 5), 0x4a3524, T(0, 0.9, 0)), part(new THREE.ConeGeometry(2.0, 3, 7), 0x1f4f36, T(0, 2.8, 0)), part(new THREE.ConeGeometry(1.5, 2.6, 7), 0x275c40, T(0, 4.5, 0)), part(new THREE.ConeGeometry(1.0, 2.2, 7), 0x30694a, T(0, 6.0, 0))]);
  {
    const fr = []; for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; fr.push(part(new THREE.ConeGeometry(0.34, 2.8, 3), k % 2 ? 0x4a8a3c : 0x3b7a34, T(Math.cos(a) * 1.15, 5.9, Math.sin(a) * 1.15, 1, 1, 1, Math.sin(a) * -1.95, 0, Math.cos(a) * 1.95))); }
    G.palm = mergeGeometries([part(new THREE.CylinderGeometry(0.16, 0.26, 6.2, 5), 0x8a6a48, T(0, 3.1, 0, 1, 1, 1, 0, 0, 0.06)), ...fr]);
  }
  G.bush = mergeGeometries([part(new THREE.IcosahedronGeometry(0.7, 0), 0x6f8650, T(0, 0.4, 0, 1, 0.7, 1)), part(new THREE.IcosahedronGeometry(0.5, 0), 0x86995c, T(0.6, 0.3, 0.2, 1, 0.7, 1))]);
  {
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.78 + (fbm(x * 3.1 + 5, y * 3.1 + z * 2.3, 2, 91) * 0.5 + 0.5) * 0.45; p.setXYZ(i, x * k, y * k * 0.7, z * k); }
    G.rock = part(g, 0x9a958c, T(0, 0.3, 0));
  }
  const propMat = litMat();
  const TREES = ['cypress', 'pine', 'olive', 'oak', 'fir', 'palm', 'bush', 'rock'];

  // ---------- chunks ----------
  const chunks = new Map();
  const terrMat = litMat();
  const group = new THREE.Group(); scene.add(group);
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _col = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
  function buildChunk(cx, cz) {
    const key = cx * 4096 + cz, h = heightsFor(cx, cz), c = ctxFor(cx, cz), x0 = cx * CS, z0 = cz * CS;
    const rng = mulberry32((cx * 73856093) ^ (cz * 19349663));
    let land = false, water = false;
    for (let i = 0; i < h.length; i++) { if (h[i] > -3) land = true; else water = true; }
    const ch = { key, cx, cz, mesh: null, props: [], obs: [] };
    chunks.set(key, ch);
    if (!land) return ch;
    const pos = new Float32Array(CN * CN * 18), col = new Float32Array(CN * CN * 18);
    let p = 0;
    const tri = (ax, ay, az, bx, by, bz, qx, qy, qz) => {
      if (ay < -6 && by < -6 && qy < -6) return;
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = qx - ax, vy = qy - ay, vz = qz - az;
      const nx = uy * vz - uz * vy, nyy = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const cc = colorAt((ax + bx + qx) / 3, (az + bz + qz) / 3, (ay + by + qy) / 3, nyy / Math.hypot(nx, nyy, nz), rng(), c);
      pos[p] = ax; pos[p + 1] = ay; pos[p + 2] = az; pos[p + 3] = bx; pos[p + 4] = by; pos[p + 5] = bz; pos[p + 6] = qx; pos[p + 7] = qy; pos[p + 8] = qz;
      for (let k = 0; k < 9; k += 3) { col[p + k] = cc[0]; col[p + k + 1] = cc[1]; col[p + k + 2] = cc[2]; }
      p += 9;
    };
    for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) {
      const xa = x0 + i * CELL, za = z0 + j * CELL, xb = xa + CELL, zb = za + CELL, k = j * NV + i;
      tri(xa, h[k], za, xa, h[k + NV], zb, xb, h[k + 1], za);
      tri(xb, h[k + 1], za, xa, h[k + NV], zb, xb, h[k + NV + 1], zb);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, p), 3));
    g.setAttribute('color', new THREE.BufferAttribute(col.subarray(0, p), 3));
    g.computeVertexNormals(); g.computeBoundingSphere();
    ch.mesh = new THREE.Mesh(g, terrMat); ch.mesh.receiveShadow = true; group.add(ch.mesh);
    // props
    const lists = {};
    const n = Math.round(150 * opts.foliage);
    for (let k = 0; k < n; k++) {
      const x = x0 + rng() * CS, z = z0 + rng() * CS, y = getHeight(x, z);
      const r1 = rng(), r2 = rng(), r3 = rng(), r4 = rng();
      if (y < 1.6 || y > 74) continue;
      genHeight(x, z, c);
      if (info.site > 0.02 || info.road < 7 || info.river < 4) continue;
      climate(x, z, info.f);
      const e = 2, sl = Math.hypot(getHeight(x + e, z) - getHeight(x - e, z), getHeight(x, z + e) - getHeight(x, z - e)) / (2 * e);
      const dens = 0.25 + 0.75 * smoothstep(-0.2, 0.35, fbm(x * 0.006, z * 0.006, 2, 77));
      let type;
      if (r1 < 0.16) type = 'rock';
      else if (sl > 0.7) continue;
      else if (clim.des > 0.55) { if (info.river < 50 || r2 < 0.05) type = r3 < 0.75 ? 'palm' : 'bush'; else if (r2 < 0.12) type = 'rock'; else continue; }
      else if (r2 > dens) continue;
      else if (y > 40) type = clim.nor > 0.3 || y > 52 ? 'fir' : r3 < 0.5 ? 'pine' : 'bush';
      else if (clim.nor > 0.5) type = r3 < 0.6 ? 'oak' : r3 < 0.8 ? 'fir' : 'bush';
      else type = r3 < 0.2 ? 'cypress' : r3 < 0.42 ? 'pine' : r3 < 0.68 ? 'olive' : r3 < 0.76 ? 'oak' : 'bush';
      const s = type === 'rock' ? 0.5 + r4 * r4 * 2.4 : type === 'bush' ? 0.8 + r4 * 0.9 : 0.75 + r4 * 0.6;
      (lists[type] ||= []).push(x, y - 0.12, z, s, rng() * TAU, 0.85 + rng() * 0.3);
      if (type !== 'bush' && (type !== 'rock' || s > 1)) ch.obs.push(x, z, type === 'rock' ? s * 0.85 : type === 'oak' || type === 'pine' ? 0.6 : 0.45);
    }
    for (const type in lists) {
      const a = lists[type], cnt = a.length / 6, mesh = new THREE.InstancedMesh(G[type], propMat, cnt);
      for (let i = 0; i < cnt; i++) {
        const k = i * 6;
        mesh.setMatrixAt(i, _m.compose(_p.set(a[k], a[k + 1], a[k + 2]), _q.setFromAxisAngle(UP, a[k + 4]), _s.set(a[k + 3], a[k + 3] * (type === 'rock' ? 0.8 + a[k + 5] * 0.5 : 1), a[k + 3])));
        mesh.setColorAt(i, _col.setRGB(a[k + 5], a[k + 5] * (0.95 + (i % 3) * 0.04), a[k + 5]));
      }
      mesh.castShadow = type !== 'bush'; mesh.receiveShadow = true; mesh.computeBoundingSphere();
      group.add(mesh); ch.props.push(mesh);
    }
    return ch;
  }
  function dropChunk(ch) {
    if (ch.mesh) { group.remove(ch.mesh); ch.mesh.geometry.dispose(); }
    for (const m of ch.props) { group.remove(m); m.dispose(); }
    chunks.delete(ch.key);
  }
  // returns true while chunks are still loading
  function streamChunks(px, pz, budget) {
    const R = opts.viewChunks, pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
    let best = null, bd = 1e9, pending = 0;
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const d = dx * dx + dz * dz;
      if (d > (R + 0.5) * (R + 0.5)) continue;
      const cx = pcx + dx, cz = pcz + dz;
      if (cx * CS > XMAX + CS || (cx + 1) * CS < XMIN - CS || cz * CS > ZMAX + CS || (cz + 1) * CS < ZMIN - CS) continue;
      if (!chunks.has(cx * 4096 + cz)) { pending++; if (d < bd) { bd = d; best = [cx, cz]; } }
    }
    for (let n = 0; n < budget && best; n++) {
      buildChunk(best[0], best[1]); pending--;
      if (n + 1 < budget) { best = null; bd = 1e9; for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { const d = dx * dx + dz * dz; if (d > (R + 0.5) * (R + 0.5)) continue; if (!chunks.has((pcx + dx) * 4096 + pcz + dz) && d < bd) { bd = d; best = [pcx + dx, pcz + dz]; } } }
    }
    for (const ch of chunks.values()) if (Math.abs(ch.cx - pcx) > R + 1 || Math.abs(ch.cz - pcz) > R + 1) dropChunk(ch);
    return pending > 0;
  }
  function rebuildAll() { for (const ch of [...chunks.values()]) dropChunk(ch); }

  // push a circle out of tree / rock obstacles
  function collideProps(o, r) {
    const cx = Math.floor(o.x / CS), cz = Math.floor(o.z / CS);
    const ch = chunks.get(cx * 4096 + cz);
    if (!ch) return;
    const a = ch.obs;
    for (let k = 0; k < a.length; k += 3) {
      const dx = o.x - a[k], dz = o.z - a[k + 1], rr = r + a[k + 2], d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), q = (rr - d) / d; o.x += dx * q; o.z += dz * q; }
    }
  }
  function roadDist(x, z) {
    const c = ctxFor(Math.floor(x / CS), Math.floor(z / CS));
    let d = 1e9; for (const s of c.roads) d = Math.min(d, segDist(x, z, s));
    return d;
  }

  // ---------- road ribbons ----------
  const roadMat = new THREE.MeshStandardMaterial({ color: 0xa39a8a, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, flatShading: true });
  const roadPieces = [];
  for (const rp of roadPaths) for (let i = 0; i < rp.pts.length - 1; i++) {
    const [ax, az] = rp.pts[i], [bx, bz] = rp.pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 240);
    for (let k = 0; k < n; k++) roadPieces.push({ ax: lerp(ax, bx, k / n), az: lerp(az, bz, k / n), bx: lerp(ax, bx, (k + 1) / n), bz: lerp(az, bz, (k + 1) / n), mesh: null });
  }
  function buildRoad(rp) {
    const len = Math.hypot(rp.bx - rp.ax, rp.bz - rp.az), n = Math.max(1, Math.ceil(len / 4)), dx = (rp.bx - rp.ax) / len, dz = (rp.bz - rp.az) / len, w = 2.3;
    const pos = [];
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const x = lerp(rp.ax, rp.bx, k / n), z = lerp(rp.az, rp.bz, k / n);
      const lx = x - dz * w, lz = z + dx * w, rx = x + dz * w, rz = z - dx * w;
      const cur = [lx, getHeight(lx, lz) + 0.14, lz, rx, getHeight(rx, rz) + 0.14, rz, landF(x, z) > 0.52 && getHeight(x, z) > 0.4];
      if (prev && prev[6] && cur[6]) pos.push(prev[0], prev[1], prev[2], cur[0], cur[1], cur[2], prev[3], prev[4], prev[5], prev[3], prev[4], prev[5], cur[0], cur[1], cur[2], cur[3], cur[4], cur[5]);
      prev = cur;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    rp.mesh = new THREE.Mesh(g, roadMat); rp.mesh.receiveShadow = true; scene.add(rp.mesh);
  }
  function streamRoads(px, pz) {
    const far = (opts.viewChunks + 1) * CS;
    let built = 0;
    for (const rp of roadPieces) {
      const d = Math.hypot((rp.ax + rp.bx) / 2 - px, (rp.az + rp.bz) / 2 - pz);
      if (d < far && !rp.mesh && built < 1) { buildRoad(rp); built++; }
      else if (d > far + CS && rp.mesh) { scene.remove(rp.mesh); rp.mesh.geometry.dispose(); rp.mesh = null; }
    }
  }

  // ---------- water ----------
  const ftex = new THREE.DataTexture(field, FW, FH, THREE.RedFormat);
  ftex.magFilter = ftex.minFilter = THREE.LinearFilter; ftex.unpackAlignment = 1; ftex.needsUpdate = true;
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uF: { value: ftex }, uMin: { value: new THREE.Vector2(XMIN, ZMIN) }, uSize: { value: new THREE.Vector2(XMAX - XMIN, ZMAX - ZMIN) },
      uDeep: { value: new THREE.Color(0x0b3a66) }, uShallow: { value: new THREE.Color(0x2fa3b0) }, uFog: { value: new THREE.Color() }, uFogD: { value: 0.002 }, uSky: { value: new THREE.Color() },
      uLDir: { value: new THREE.Vector3(0, 1, 0) }, uLCol: { value: new THREE.Color() }, uBright: { value: 1 },
    },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime, uFogD, uBright; uniform sampler2D uF; uniform vec2 uMin, uSize; uniform vec3 uDeep, uShallow, uFog, uSky, uLDir, uLCol; varying vec3 vW;
      void main(){
        vec2 uv = (vW.xz - uMin) / uSize;
        float f = texture2D(uF, clamp(uv, 0.0, 1.0)).r;
        float depth = (0.5 - f) * 36.0;
        vec2 p = vW.xz;
        float wv = sin(p.x * 0.3 + uTime * 1.1) + sin(p.y * 0.37 - uTime * 0.9) + sin((p.x + p.y) * 0.19 + uTime * 0.7);
        vec3 n = normalize(vec3(cos(p.x * 0.3 + uTime * 1.1) * 0.09 + cos((p.x + p.y) * 0.19 + uTime * 0.7) * 0.06 + cos(p.x * 1.3 - uTime * 2.0) * 0.03, 1.0, cos(p.y * 0.37 - uTime * 0.9) * 0.09 + cos((p.x + p.y) * 0.19 + uTime * 0.7) * 0.06 + cos(p.y * 1.1 + uTime * 1.7) * 0.03));
        vec3 v = normalize(cameraPosition - vW);
        vec3 col = mix(uDeep, uShallow, smoothstep(9.0, 0.0, depth)) * uBright;
        col = mix(col, uSky, pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.55);
        col += uLCol * pow(max(dot(n, normalize(v + uLDir)), 0.0), 140.0) * 0.8;
        float band = sin(depth * 2.2 - uTime * 1.3 + wv * 0.4) * 0.5 + 0.5;
        float foam = smoothstep(2.0, 0.3, depth) * smoothstep(0.62, 0.86, band) * 0.8 + smoothstep(0.4, 0.0, depth);
        col = mix(col, vec3(0.9, 0.96, 1.0) * (0.3 + uBright * 0.7), clamp(foam, 0.0, 1.0));
        float alpha = clamp(mix(0.55, 0.96, smoothstep(0.0, 4.0, depth)) + foam, 0.0, 1.0);
        float d = length(cameraPosition - vW);
        col = mix(col, uFog, 1.0 - exp(-uFogD * uFogD * d * d));
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), waterMat);
  water.rotation.x = -Math.PI / 2; water.renderOrder = 1; scene.add(water);

  // ---------- sky + lights ----------
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uStars: { value: 0 }, uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uMoon: { value: 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uTop, uHor, uSunDir, uSunCol; uniform float uStars, uTime, uMoon; varying vec3 vD;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vD);
        vec3 col = mix(uHor, uTop, smoothstep(0.0, 0.55, d.y));
        vec3 sp = d * 90.0; float r = hash(floor(sp));
        col += vec3(0.9, 0.95, 1.2) * step(0.992, r) * smoothstep(0.32, 0.0, length(fract(sp) - 0.5)) * (0.55 + 0.45 * sin(uTime * 2.0 + r * 400.0)) * uStars * smoothstep(0.02, 0.3, d.y) * 2.0;
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunCol * (pow(s, 8.0) * 0.25 + pow(s, 90.0) * 0.5 + smoothstep(0.9988, 0.9993, s) * 3.0) * (1.0 - uMoon);
        float m = max(dot(d, -uSunDir), 0.0);
        col += uMoon * (smoothstep(0.9984, 0.9988, m) * vec3(1.4, 1.5, 1.8) + pow(m, 200.0) * vec3(0.3, 0.4, 0.7) * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), skyMat);
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 420;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.5;
  scene.add(sun, sun.target);
  scene.fog = new THREE.FogExp2(0xbfd4e6, 0.002);

  const KEY = {
    day: { top: 0x2f7fd0, fog: 0xbcd6ea, hs: 0xcfe2ff, hg: 0x7a6a50, hi: 1.25, dc: 0xfff2d8, di: 2.6, exp: 1.0 },
    dusk: { top: 0x314a8a, fog: 0xe6a878, hs: 0xd0a8b0, hg: 0x4a3a3a, hi: 0.95, dc: 0xffa860, di: 1.9, exp: 1.05 },
    night: { top: 0x050a1c, fog: 0x1c2a4e, hs: 0x5a70c0, hg: 0x1e2238, hi: 1.0, dc: 0xa0b8ff, di: 1.2, exp: 1.2 },
  };
  const state = { exposure: 1, tod: 0.36, night: 0 };
  const cA = new THREE.Color(), cB = new THREE.Color(), cC = new THREE.Color(), lightDir = new THREE.Vector3(), sunDir = new THREE.Vector3();
  const mix3 = (out, k, wd, wk, wn) => out.setRGB(0, 0, 0).add(cA.set(KEY.day[k]).multiplyScalar(wd)).add(cB.set(KEY.dusk[k]).multiplyScalar(wk)).add(cC.set(KEY.night[k]).multiplyScalar(wn));
  function applySky() {
    const a = (state.tod - 0.25) * TAU, el = Math.sin(a);
    sunDir.set(Math.cos(a) * 0.85, el, 0.42).normalize();
    const wd = smoothstep(0.0, 0.32, el), wn = smoothstep(0.02, -0.22, el), wk = Math.max(0, 1 - wd - wn);
    const num = (k) => KEY.day[k] * wd + KEY.dusk[k] * wk + KEY.night[k] * wn;
    mix3(skyMat.uniforms.uTop.value, 'top', wd, wk, wn); mix3(scene.fog.color, 'fog', wd, wk, wn);
    skyMat.uniforms.uHor.value.copy(scene.fog.color);
    mix3(hemi.color, 'hs', wd, wk, wn); mix3(hemi.groundColor, 'hg', wd, wk, wn); hemi.intensity = num('hi');
    mix3(sun.color, 'dc', wd, wk, wn);
    const moon = el < -0.02;
    sun.intensity = num('di') * (moon ? smoothstep(-0.02, -0.14, el) : smoothstep(-0.02, 0.1, el) * 0.999 + 0.001);
    lightDir.copy(sunDir); if (moon) lightDir.negate();
    if (lightDir.y < 0.22) { lightDir.y = 0.22; lightDir.normalize(); }
    skyMat.uniforms.uSunDir.value.copy(sunDir); skyMat.uniforms.uSunCol.value.copy(sun.color);
    skyMat.uniforms.uStars.value = wn; skyMat.uniforms.uMoon.value = wn;
    state.exposure = num('exp'); state.night = wn;
    scene.fog.density = opts.fog;
    const wu = waterMat.uniforms;
    wu.uFog.value.copy(scene.fog.color); wu.uFogD.value = scene.fog.density;
    wu.uSky.value.copy(skyMat.uniforms.uTop.value).lerp(scene.fog.color, 0.55);
    wu.uLDir.value.copy(lightDir); wu.uLCol.value.copy(sun.color).multiplyScalar(sun.intensity * 0.5);
    wu.uBright.value = lerp(1.25, 0.4, wn);
  }
  applySky();

  let skyT = 0;
  function update(dt, time, px, py, pz, camera, gameDt) {
    state.tod = (state.tod + gameDt / 1200) % 1;       // one day lasts twenty minutes
    if (state.tod > 0.8 || state.tod < 0.2) state.tod = (state.tod + gameDt / 1200) % 1; // nights pass twice as fast
    skyT -= dt; if (skyT <= 0) { skyT = 0.25; applySky(); }
    waterMat.uniforms.uTime.value = time; skyMat.uniforms.uTime.value = time;
    sky.position.copy(camera.position);
    water.position.set(Math.round(px / 64) * 64, 0, Math.round(pz / 64) * 64);
    const sx = Math.round(px / 4) * 4, sz = Math.round(pz / 4) * 4;
    sun.target.position.set(sx, py, sz);
    sun.position.set(sx + lightDir.x * 200, py + lightDir.y * 200, sz + lightDir.z * 200);
    sun.castShadow = opts.shadows;
  }

  // parchment map for the map screen
  function makeMap() {
    const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(FW, FH), d = img.data;
    for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
      const f = field[j * FW + i] / 255, k = (j * FW + i) * 4;
      const x = XMIN + (i + 0.5) / FW * (XMAX - XMIN), z = ZMIN + (j + 0.5) / FH * (ZMAX - ZMIN);
      const n = fbm(i * 0.05, j * 0.05, 2, 5) * 6;
      if (f < 0.5) { const t = smoothstep(0.5, 0.1, f); d[k] = lerp(150, 104, t) + n; d[k + 1] = lerp(184, 148, t) + n; d[k + 2] = lerp(190, 172, t) + n; }
      else {
        let m = 0; if (((i ^ j) & 1) === 0 || true) { for (const s of rangeSegs) { if (Math.abs(x - (s.ax + s.bx) / 2) > 700 || Math.abs(z - (s.az + s.bz) / 2) > 700) continue; const q = 1 - segDist(x, z, s) / s.w; if (q > 0) m = Math.max(m, q * s.h / 120); } }
        climate(x, z, f);
        const edge = smoothstep(0.5, 0.62, f);
        let r = lerp(226, 214, clim.nor) , g = lerp(206, 204, clim.nor), b = lerp(160, 150, clim.nor);
        r = lerp(r, 236, clim.des); g = lerp(g, 214, clim.des); b = lerp(b, 168, clim.des);
        r -= m * 80; g -= m * 84; b -= m * 70;
        d[k] = r * lerp(0.72, 1, edge) + n; d[k + 1] = g * lerp(0.72, 1, edge) + n; d[k + 2] = b * lerp(0.74, 1, edge) + n;
      }
      d[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  return {
    sites, siteById, roadPaths, state, opts,
    landF, getHeight, walkable, sailable, inBounds, collideProps, roadDist, siteH,
    streamChunks, streamRoads, rebuildAll, update, applySky, makeMap,
    regionAt(x, z) { let best = null, bd = 1e9; for (const s of sites) { const d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < bd) { bd = d; best = s; } } return best.region; },
    nearestSite(x, z, pred) { let best = null, bd = 1e18; for (const s of sites) { if (pred && !pred(s)) continue; const d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < bd) { bd = d; best = s; } } return best; },
  };
}
