import * as THREE from 'three';
import { part, T, mergeGeometries, litMat } from './world.js';
import { mulberry32, TAU } from '../../src/util.js';

const STYLE = {
  roman: { walls: [0xe8dcc0, 0xd9b98a, 0xc9a070, 0xf0e8d8], roof: 0xb5532e, stone: 0xa89c88, flat: 0 },
  greek: { walls: [0xf2efe6, 0xe6e0d0, 0xd8d0c0], roof: 0xb86a44, stone: 0xbdb6a6, flat: 0.15 },
  egypt: { walls: [0xe0c898, 0xd4b47c, 0xc8a66c], roof: 0xcdb284, stone: 0xc9ac78, flat: 1 },
  punic: { walls: [0xe6d2a8, 0xd9bd8a, 0xeadfc8], roof: 0xa85a34, stone: 0xb8a684, flat: 0.6 },
  east: { walls: [0xe2d0aa, 0xcdb488, 0xd8c49a], roof: 0xc4a878, stone: 0xb8a684, flat: 0.9 },
};
const MARBLE = 0xece6d8, BRONZE = 0xb8923a, WOOD = 0x6b4a2f, PAVE = 0xb4ab9a;
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (a, b, h, n = 8) => new THREE.CylinderGeometry(a, b, h, n);
const mat = litMat();

// Builds one settlement. reserved: [[dx, dz, r]] spots that must stay clear. Returns { mesh, obs } with obs in world coordinates.
export function buildCity(site, world, reserved) {
  const rng = mulberry32(site.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) | 0);
  const st = STYLE[site.style] || STYLE.roman, R = site.r, P = [], obs = [];
  const y0 = world.siteH(site);
  const pick = (a) => a[(rng() * a.length) | 0];
  const onLand = (dx, dz, need = 0.62) => world.landF(site.x + dx, site.z + dz) > need;
  const free = (dx, dz, pad) => !reserved.some((r) => Math.hypot(dx - r[0], dz - r[1]) < r[2] + pad);
  const ob = (dx, dz, hw, hd, rot = 0, h = 7) => obs.push({ x: site.x + dx, z: site.z + dz, hw, hd, c: Math.cos(rot), s: Math.sin(rot), h });
  const B = (w, h, d, col, x, y, z, ry = 0, rx = 0, rz = 0) => P.push(part(box(w, h, d), col, T(x, y, z, 1, 1, 1, rx, ry, rz)));
  const column = (x, z, h, r = 0.42, col = MARBLE) => P.push(part(cyl(r * 0.85, r, h, 7), col, T(x, h / 2, z)), part(box(r * 2.5, 0.3, r * 2.5), col, T(x, h + 0.15, z)));

  function house(x, z, w, d, h, ry, flatRoof) {
    const col = pick(st.walls);
    B(w, h, d, col, x, h / 2, z, ry);
    if (flatRoof) { B(w + 0.4, 0.35, d + 0.4, st.roof, x, h + 0.17, z, ry); if (rng() < 0.4) B(w * 0.4, 1.4, d * 0.4, col, x + Math.cos(ry) * w * 0.2, h + 0.9, z - Math.sin(ry) * w * 0.2, ry); }
    else P.push(part(new THREE.ConeGeometry(0.7071, 1, 4), st.roof, T(x, h + (1.2 + h * 0.12) / 2, z, w * 1.12, 1.2 + h * 0.12, d * 1.12, 0, ry + Math.PI / 4, 0)));
    B(0.9, 1.7, 0.2, 0x4a3524, x + Math.sin(ry) * (d / 2), 0.85, z + Math.cos(ry) * (d / 2), ry);
    ob(x, z, w / 2, d / 2, ry, h + 1.6);
  }
  function temple(x, z, w, d, h, ry, cols = 6, col = MARBLE, roof = st.roof) {
    const c = Math.cos(ry), s = Math.sin(ry), tx = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    B(w, 1.3, d, st.stone, x, 0.65, z, ry);
    for (let k = 0; k < 3; k++) { const [px, pz] = tx(0, d / 2 + 0.5 + k * 0.5); B(w * 0.7, 1.3 - (k + 1) * 0.32, 0.6, st.stone, px, (1.3 - (k + 1) * 0.32) / 2, pz, ry); }
    const [cx, cz] = tx(0, -d * 0.12); B(w * 0.66, h, d * 0.62, col, cx, 1.3 + h / 2, cz, ry);
    for (let i = 0; i < cols; i++) { const lx = -w / 2 + 0.7 + (i / (cols - 1)) * (w - 1.4); for (const lz of [d / 2 - 0.7, -d / 2 + 0.7]) { const [px, pz] = tx(lx, lz); P.push(part(cyl(0.36, 0.42, h, 7), col, T(px, 1.3 + h / 2, pz))); } }
    const side = Math.max(3, Math.round(d / 2.6));
    for (let i = 1; i < side; i++) { const lz = -d / 2 + 0.7 + (i / side) * (d - 1.4); for (const lx of [-w / 2 + 0.7, w / 2 - 0.7]) { const [px, pz] = tx(lx, lz); P.push(part(cyl(0.36, 0.42, h, 7), col, T(px, 1.3 + h / 2, pz))); } }
    B(w, 0.7, d, col, x, 1.3 + h + 0.35, z, ry);
    P.push(part(cyl(1, 1, 1, 3), roof, T(x, 1.3 + h + 0.7 + w * 0.11, z, w * 0.58, d + 0.6, w * 0.22 / 1.5 * 2.2, Math.PI / 2, ry, 0)));
    ob(x, z, w / 2, d / 2 + 1.5, ry, h + 5);
  }
  function theatre(x, z, r, ry) {
    for (let k = 0; k < 5; k++) P.push(part(new THREE.CylinderGeometry(r - k * 1.6, r - k * 1.6, 1.1, 14, 1, false, 0, Math.PI), st.stone, T(x, 0.55 + k * 1.1, z, 1, 1, 1, 0, ry, 0)));
    B(r * 2, 7, 1.6, pick(st.walls), x + Math.cos(ry) * 0 + Math.sin(ry + Math.PI / 2) * 0, 3.5, z, ry + Math.PI / 2);
    obs.push({ x: site.x + x, z: site.z + z, r: r * 0.9 });
  }
  function stall(x, z, ry, col) { B(2.6, 1.0, 1.4, WOOD, x, 0.5, z, ry); B(3.2, 0.12, 2.2, col, x, 2.4, z, ry, 0.18); for (const sx of [-1.3, 1.3]) P.push(part(cyl(0.06, 0.06, 2.4, 4), WOOD, T(x + Math.cos(ry) * sx, 1.2, z - Math.sin(ry) * sx))); ob(x, z, 1.4, 0.8, ry, 2.7); }
  function standard(x, z) { P.push(part(cyl(0.05, 0.05, 4.2, 5), WOOD, T(x, 2.1, z)), part(box(0.9, 0.1, 0.08), BRONZE, T(x, 3.6, z)), part(box(0.5, 0.5, 0.06), 0xa01818, T(x, 3.2, z)), part(box(0.7, 0.34, 0.12), [1.3, 1.0, 0.35], T(x, 4.3, z)), part(box(0.16, 0.3, 0.3), [1.3, 1.0, 0.35], T(x, 4.5, z))); }
  function palm(x, z) { P.push(part(cyl(0.16, 0.26, 6, 5), 0x8a6a48, T(x, 3, z))); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; P.push(part(new THREE.ConeGeometry(0.34, 2.6, 3), 0x3f7f36, T(x + Math.cos(a) * 1.1, 5.7, z + Math.sin(a) * 1.1, 1, 1, 1, Math.sin(a) * -1.95, 0, Math.cos(a) * 1.95))); } }
  function ringWall(rad, hgt, thick, col, towers, gates) {
    const n = Math.round((TAU * rad) / 11);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, am = (a0 + a1) / 2, mx = Math.cos(am) * rad, mz = Math.sin(am) * rad, len = 2 * rad * Math.sin(Math.PI / n);
      const gate = gates.some((g) => Math.abs(((am - g + Math.PI * 3) % TAU) - Math.PI) < (Math.PI / n) * 1.05);
      if (!onLand(mx, mz, 0.6) || !free(mx, mz, 4)) continue;
      if (gate) { for (const a of [a0, a1]) { B(3.4, hgt + 3, 3.4, col, Math.cos(a) * rad, (hgt + 3) / 2, Math.sin(a) * rad, -a); ob(Math.cos(a) * rad, Math.sin(a) * rad, 1.7, 1.7, -a, hgt + 3); } B(len, 1.4, thick, col, mx, hgt + 0.7, mz, -am + Math.PI / 2); continue; }
      B(len + 0.3, hgt, thick, col, mx, hgt / 2, mz, -am + Math.PI / 2); ob(mx, mz, len / 2 + 0.2, thick / 2, -am + Math.PI / 2, hgt);
      if (towers && i % 4 === 0) B(3, hgt + 2.4, 3, col, Math.cos(a0) * rad, (hgt + 2.4) / 2, Math.sin(a0) * rad, -a0);
    }
  }

  const k = site.kind;
  if (k === 'urbs' || k === 'city' || k === 'town') {
    const fh = k === 'urbs' ? 15 : k === 'city' ? 11 : 8;
    B(fh * 2, 0.1, fh * 2, PAVE, 0, 0.005, 0);
    B(5, 0.1, R * 2 - 6, PAVE, 0, 0, 0); B(R * 2 - 6, 0.1, 5, PAVE, 0, -0.005, 0);
    temple(0, -fh - 9, k === 'urbs' ? 12 : 9, k === 'urbs' ? 19 : 14, k === 'urbs' ? 7 : 5.5, 0, k === 'urbs' ? 6 : 4);
    if (k !== 'town') { B(22, 6, 8, pick(st.walls), fh + 9, 3, -2, Math.PI / 2); B(23, 0.6, 9, st.roof, fh + 9, 6.3, -2, Math.PI / 2); for (let i = 0; i < 6; i++) column(fh + 4.2, -11 + i * 3.6, 5.4, 0.36); ob(fh + 9, -2, 4.5, 11.5, 0); }
    P.push(part(cyl(1.2, 1.4, 1.2, 8), st.stone, T(-fh + 3, 0.6, fh - 3)), part(cyl(0.3, 0.4, 3.4, 6), BRONZE, T(-fh + 3, 2.9, fh - 3)));
    obs.push({ x: site.x - fh + 3, z: site.z + fh - 3, r: 1.5 });
    stall(-9, 11.5, 0, 0xa82a20); stall(-13.5, 11.5, 0, 0x2f5a8a);
    // landmarks
    const big = [];
    if (site.id === 'roma') {
      for (let i = 0; i < 3; i++) P.push(part(cyl(13 - i * 2.5, 15 - i * 2.5, 2.2, 9), 0x9a917f, T(-34, 1.1 + i * 2.2, -38)));
      obs.push({ x: site.x - 34, z: site.z - 38, r: 13 });
      { const n0 = P.length; temple(-34, -38, 12, 17, 6.5, 0.4, 6, MARBLE, 0xb89a3a); for (let i = n0; i < P.length; i++) P[i].translate(0, 6.6, 0); } big.push([-34, -38, 20]);
      theatre(-52, 22, 15, 0.9); big.push([-52, 22, 18]);
      B(7, 4, 6, 0x8a8172, -16, 2, -46); ob(-16, -46, 3.5, 3, 0); big.push([-16, -46, 6]);
      B(12, 4.5, 10, pick(st.walls), 40, 2.25, 12); B(12.6, 0.5, 10.6, st.roof, 40, 4.7, 12); for (let i = 0; i < 4; i++) column(34.4 + i * 3.7, 17.6, 4, 0.3); ob(40, 12, 6, 5, 0); big.push([40, 12, 9]);
    }
    if (site.id === 'alexandria') {
      B(26, 9, 12, MARBLE, 40, 4.5, 38); B(27, 0.8, 13, st.stone, 40, 9.4, 38); for (let i = 0; i < 8; i++) column(28 + i * 3.4, 30.8, 8.2, 0.5); ob(40, 38, 13, 6, 0); big.push([40, 38, 16]);
      B(18, 7, 14, pick(st.walls), 30, 3.5, -26); B(19, 0.6, 15, st.stone, 30, 7.3, -26); for (let i = 0; i < 5; i++) column(22 + i * 4, -17.6, 6.4, 0.45); ob(30, -26, 9, 7, 0); big.push([30, -26, 12]);
      for (const [ox, oz] of [[10, 8], [-10, 8]]) { obs.push({ x: site.x + ox, z: site.z + oz, r: 0.9, h: 9 }); P.push(part(cyl(0.3, 0.75, 9, 4), 0xd8b890, T(ox, 4.5, oz, 1, 1, 1, 0, Math.PI / 4, 0)), part(new THREE.ConeGeometry(0.42, 0.9, 4), [1.3, 1.0, 0.4], T(ox, 9.4, oz, 1, 1, 1, 0, Math.PI / 4, 0))); }
    }
    if (site.id === 'athenae') { for (let i = 0; i < 3; i++) P.push(part(cyl(15 - i * 2, 18 - i * 2, 3.2, 9), 0xa59b88, T(30, 1.6 + i * 3.2, -30))); obs.push({ x: site.x + 30, z: site.z - 30, r: 17 }); const n0 = P.length; temple(30, -30, 10, 20, 5.5, 0.3, 8); for (let i = n0; i < P.length; i++) P[i].translate(0, 9.6, 0); big.push([30, -30, 22]); }
    if (site.id === 'ephesus') { temple(-30, -28, 16, 28, 9, 0.2, 8); big.push([-30, -28, 24]); }
    if (site.id === 'gades') { temple(-28, 26, 11, 17, 6, 1.2, 6, 0xe6dcc4); P.push(part(cyl(0.5, 0.6, 9, 8), BRONZE, T(-16, 4.5, 30)), part(cyl(0.5, 0.6, 9, 8), BRONZE, T(-19, 4.5, 36))); big.push([-28, 26, 18]); }
    if (site.id === 'hierosolyma') { B(34, 3, 26, 0xd8cdb4, -4, 1.5, -38); B(12, 12, 9, 0xf0e8d8, -4, 9, -38); B(13, 0.8, 10, [1.2, 0.95, 0.4], -4, 15.4, -38); ob(-4, -38, 17, 13, 0); big.push([-4, -38, 24]); }
    if (site.id === 'syracusae') { theatre(-34, -26, 14, 2.2); big.push([-34, -26, 17]); }
    if (site.id === 'capua') {
      const ar = 15; P.push(part(cyl(ar - 1, ar - 1, 0.1, 18), 0xd9c08a, T(44, 0.005, -34)));
      for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; if (i % 9 === 4) continue; const mx = 44 + Math.cos(a) * (ar + 2), mz = -34 + Math.sin(a) * (ar + 2); B(6.4, 5, 4.5, st.stone, mx, 2.5, mz, -a + Math.PI / 2); B(6.4, 2, 2, st.stone, 44 + Math.cos(a) * ar, 1, -34 + Math.sin(a) * ar, -a + Math.PI / 2); ob(mx, mz, 3.3, 2.6, -a + Math.PI / 2); }
      big.push([44, -34, 22]);
    }
    if (site.id === 'rhodus' && site.dock) {
      const dx = site.dock.x - site.x, dz = site.dock.z - site.z, l = Math.hypot(dx, dz) || 1, bx = dx - (dx / l) * 14 + (dz / l) * 12, bz = dz - (dz / l) * 14 - (dx / l) * 12;
      B(5, 3, 5, st.stone, bx, 1.5, bz); P.push(part(cyl(1.0, 1.2, 5, 7), BRONZE, T(bx - 0.8, 5.4, bz)), part(cyl(1.0, 1.2, 4, 7), BRONZE, T(bx + 0.9, 4.9, bz)));
      P.push(part(cyl(1.9, 2.3, 9, 8), BRONZE, T(bx + 9, 1.9, bz + 3, 1, 1, 1, 0, 0.4, Math.PI / 2)), part(new THREE.SphereGeometry(1.7, 8, 6), BRONZE, T(bx + 16, 1.6, bz + 6.5)), part(cyl(0.7, 0.9, 8, 7), BRONZE, T(bx + 8, 0.9, bz - 4, 1, 1, 1, 0, -0.5, Math.PI / 2)), part(cyl(0.7, 0.8, 7, 7), BRONZE, T(bx + 3, 0.8, bz + 9, 1, 1, 1, 0, 1.2, Math.PI / 2)));
      obs.push({ x: site.x + bx + 8, z: site.z + bz + 3, r: 7 }); big.push([bx + 8, bz + 3, 14]);
    }
    if (site.id === 'alexandria' && site.dock) {
      const dx = site.dock.x - site.x, dz = site.dock.z - site.z, l = Math.hypot(dx, dz) || 1, bx = dx - (dz / l) * 26, bz = dz + (dx / l) * 26;
      B(10, 20, 10, 0xe9e2d0, bx, 10, bz); P.push(part(cyl(3.6, 4.2, 12, 8), 0xe9e2d0, T(bx, 26, bz)), part(cyl(2, 2.4, 6, 8), 0xe9e2d0, T(bx, 35, bz)), part(new THREE.SphereGeometry(1.5, 8, 6), [3.4, 2.0, 0.6], T(bx, 39, bz)));
      ob(bx, bz, 5, 5, 0); big.push([bx, bz, 9]);
    }
    // houses on a street grid
    const step = k === 'urbs' ? 11.5 : 12.5;
    for (let gx = -R; gx <= R; gx += step) for (let gz = -R; gz <= R; gz += step) {
      const x = gx + (rng() - 0.5) * 3, z = gz + (rng() - 0.5) * 3, d = Math.hypot(x, z);
      const w = 6.5 + rng() * 3.5, dp = 6.5 + rng() * 3.5, h = (k === 'urbs' ? 5 + rng() * 7 : 4 + rng() * 4), fl = rng() < st.flat, ry = (site.style === 'greek' || site.style === 'east') ? (rng() - 0.5) * 0.5 : 0;
      if (d > R - 9 || (Math.abs(x) < fh + 7 && Math.abs(z) < fh + 7) || Math.abs(x) < 7.5 || Math.abs(z) < 7.5) continue;
      if (rng() < 0.12 || !onLand(x, z) || !free(x, z, 7.5) || big.some((b) => Math.hypot(x - b[0], z - b[1]) < b[2] + 5)) continue;
      if (x > fh + 2 && x < fh + 16 && Math.abs(z + 2) < 16) continue;
      if (Math.abs(x + 11) < 9 && Math.abs(z - 11.5) < 6) continue;
      house(x, z, w, dp, h, ry, fl);
    }
    if (site.style === 'egypt' || site.style === 'punic' || site.style === 'east') for (let i = 0; i < 9; i++) { const a = rng() * TAU, r = 10 + rng() * (R - 16), x = Math.cos(a) * r, z = Math.sin(a) * r; if (onLand(x, z) && free(x, z, 3) && Math.abs(x) > 4 && Math.abs(z) > 4 && !obs.some((o) => Math.hypot(site.x + x - o.x, site.z + z - o.z) < 7)) palm(x, z); }
    ringWall(R - 2, k === 'town' ? 5 : 6.5, 2, st.stone, true, [0, Math.PI / 2, Math.PI, Math.PI * 1.5]);
  } else if (k === 'camp') {
    const h = R - 4;
    for (const [ax, az, len, ry] of [[0, -h, h * 2, 0], [0, h, h * 2, 0], [-h, 0, h * 2, Math.PI / 2], [h, 0, h * 2, Math.PI / 2]]) for (const sgn of [-1, 1]) {
      const l = len / 2 - 3.5, cx = ax + (ry ? 0 : sgn * (l / 2 + 3.5)), cz = az + (ry ? sgn * (l / 2 + 3.5) : 0);
      B(l, 2.6, 0.7, 0x7a5a38, cx, 1.3, cz, ry); B(l + 1, 1.0, 2.6, 0x8f8362, cx, 0.5, cz, ry); ob(cx, cz, l / 2, 0.6, ry, 2.7);
    }
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const x = i * 8.5, z = j * 8.5;
      if ((Math.abs(i) < 1 && Math.abs(j) < 2) || Math.abs(x) < 3 || Math.abs(z) < 3 || !free(x, z, 5)) continue;
      P.push(part(cyl(1, 1, 1, 3), 0x8a6a48, T(x, 1.05, z, 2.2, 4.2, 1.4, Math.PI / 2, 0, 0))); ob(x, z, 1.9, 2.1, 0, 2.4);
    }
    B(8, 3.2, 6, 0xb89a6a, 0, 1.6, -9); P.push(part(new THREE.ConeGeometry(0.7071, 1, 4), 0xa01818, T(0, 4.2, -9, 9, 2, 7, 0, Math.PI / 4, 0))); ob(0, -9, 4, 3, 0, 5);
    standard(-5.5, -4.5); standard(5.5, -4.5);
    P.push(part(cyl(0.9, 1.1, 0.3, 7), 0x5a5048, T(6, 0.15, 5)), part(new THREE.ConeGeometry(0.5, 1.1, 5), [3.2, 1.4, 0.3], T(6, 0.8, 5)));
  } else if (k === 'oppidum') {
    ringWall(R - 2, 3.4, 2.6, 0x7a6248, false, [0, Math.PI]);
    for (let i = 0; i < 16; i++) {
      const a = rng() * TAU, r = 6 + rng() * (R - 14), x = Math.cos(a) * r, z = Math.sin(a) * r, s = 2.6 + rng() * 1.6;
      if (!free(x, z, s + 3) || obs.some((o) => Math.hypot(site.x + x - o.x, site.z + z - o.z) < s + 4.5)) continue;
      P.push(part(cyl(s, s, 2.2, 9), 0xc9b48a, T(x, 1.1, z)), part(new THREE.ConeGeometry(s * 1.25, 3.4, 9), 0x9a8048, T(x, 3.9, z)));
      obs.push({ x: site.x + x, z: site.z + z, r: s });
    }
    P.push(part(cyl(0.3, 0.45, 5, 6), WOOD, T(0, 2.5, 0)), part(box(1.6, 1.1, 0.1), 0x2f6a3a, T(0.9, 4.2, 0)));
  } else if (k === 'ruin') {
    B(22, 0.1, 22, PAVE, 0, 0, 0);
    for (let i = 0; i < 26; i++) {
      const a = rng() * TAU, r = 4 + rng() * (R - 8), x = Math.cos(a) * r, z = Math.sin(a) * r, t = rng();
      if (!free(x, z, 3.5) || !onLand(x, z)) continue;
      if (t < 0.45) { const h = 1 + rng() * 5; P.push(part(cyl(0.4, 0.48, h, 7), MARBLE, T(x, h / 2, z))); obs.push({ x: site.x + x, z: site.z + z, r: 0.7 }); }
      else if (t < 0.7) { P.push(part(cyl(0.42, 0.42, 3 + rng() * 3, 7), 0xddd6c6, T(x, 0.42, z, 1, 1, 1, 0, rng() * TAU, Math.PI / 2))); }
      else { const w = 3 + rng() * 6, h = 0.8 + rng() * 2.4, ry = rng() * TAU; B(w, h, 1.1, st.stone, x, h / 2, z, ry); ob(x, z, w / 2, 0.6, ry, h); }
    }
    B(11, 1.3, 16, st.stone, 0, 0.65, -12); for (let i = 0; i < 4; i++) column(-4.3 + i * 2.9, -5, 2 + rng() * 4.5); ob(0, -12, 5.5, 8, 0, 1.4);
  } else if (k === 'pyramids') {
    for (const [x, z, s] of [[8, -18, 44], [-30, 14, 40], [-58, 40, 22]]) { P.push(part(new THREE.ConeGeometry(0.7071, 1, 4), 0xe9dcc0, T(x, s * 0.32, z, s, s * 0.64, s, 0, Math.PI / 4, 0)), part(new THREE.ConeGeometry(0.7071, 1, 4), [1.15, 1.0, 0.6], T(x, s * 0.64 - s * 0.03, z, s * 0.1, s * 0.064, s * 0.1, 0, Math.PI / 4, 0))); ob(x, z, s / 2 - 1, s / 2 - 1, 0); }
    B(5, 3.4, 13, 0xd9c08a, 44, 1.7, 24, 0.3); B(3.4, 3.6, 3.4, 0xd9c08a, 45.8, 5, 29.6, 0.3); B(3.2, 1.4, 6, 0xd9c08a, 46.6, 0.7, 33.4, 0.3); ob(44, 24, 2.6, 6.6, 0.3);
  } else if (k === 'site') {
    P.push(part(cyl(0.4, 0.46, 2.2, 7), 0xd8d0be, T(3.5, 1.1, -3)), part(box(1.1, 0.3, 1.1), 0xd8d0be, T(3.5, 0.15, -3)));
    obs.push({ x: site.x + 3.5, z: site.z - 3, r: 0.6 });
    B(1.8, 1.2, 1.2, MARBLE, -4, 0.6, -4); B(2.1, 0.2, 1.5, MARBLE, -4, 1.3, -4); ob(-4, -4, 1, 0.7, 0, 1.5);
    if (site.id === 'rubico') { B(5, 0.3, 16, WOOD, 0, 0.7, 6, 0.5); for (const s of [-1, 1]) B(0.2, 0.9, 16, WOOD, s * 2.4 * Math.cos(0.5), 1.2, 6 - s * 2.4 * Math.sin(0.5), 0.5); }
  }
  // harbour: quay, sheds and moored boats
  if (site.dock) {
    const dx = site.dock.x - site.x, dz = site.dock.z - site.z, sx = site.sea.x - site.dock.x, sz = site.sea.z - site.dock.z, l = Math.hypot(sx, sz) || 1, ux = sx / l, uz = sz / l, ry = Math.atan2(ux, uz);
    B(18, 0.5, 5, st.stone, dx + ux * 2, 0.3, dz + uz * 2, ry + Math.PI / 2 - Math.PI / 2);
    for (const s of [-1, 1]) { const px = dx - uz * s * 9, pz = dz + ux * s * 9; if (free(px, pz, 4) && onLand(px, pz, 0.55)) { B(6, 3.4, 5, pick(st.walls), px, 1.7, pz, ry); B(6.6, 0.4, 5.6, st.roof, px, 3.6, pz, ry); ob(px, pz, 3, 2.5, ry); } }
    P.push(part(cyl(0.12, 0.12, 3.6, 5), WOOD, T(dx, 1.8, dz)), part(box(1.5, 0.9, 0.1), 0x2f4a7a, T(dx, 3.2, dz, 1, 1, 1, 0, ry, 0)));
    for (const s of [-1, 1]) { const bx = site.moor.x - site.x - uz * s * 9, bz = site.moor.z - site.z + ux * s * 9; if (world.landF(site.x + bx, site.z + bz) < 0.47) { P.push(part(box(1.6, 0.9, 5.5), 0x7a5230, T(bx, 0.3 - y0, bz, 1, 1, 1, 0, ry + s * 0.4, 0)), part(cyl(0.07, 0.07, 3.2, 5), WOOD, T(bx, 1.8 - y0, bz))); } }
  }
  if (!P.length) return { mesh: null, obs };
  const mesh = new THREE.Mesh(mergeGeometries(P), mat);
  mesh.position.set(site.x, y0, site.z); mesh.castShadow = mesh.receiveShadow = true;
  for (const g of P) g.dispose();
  return { mesh, obs };
}

// resolve a circle against a settlement's obstacles
export function collideCity(o, r, obs) {
  for (const b of obs) {
    const dx = o.x - b.x, dz = o.z - b.z;
    if (b.r != null) { const rr = r + b.r, d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), q = (rr - d) / d; o.x += dx * q; o.z += dz * q; } continue; }
    const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c, px = b.hw + r - Math.abs(lx), pz = b.hd + r - Math.abs(lz);
    if (px <= 0 || pz <= 0) continue;
    let ox = 0, oz = 0;
    if (px < pz) ox = lx < 0 ? -px : px; else oz = lz < 0 ? -pz : pz;
    o.x += ox * b.c + oz * b.s; o.z += -ox * b.s + oz * b.c;
  }
}
