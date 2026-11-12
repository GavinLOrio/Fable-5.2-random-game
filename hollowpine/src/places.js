// Hollowpine places: every hand-built location on the island.
const PI = Math.PI;
const CONC = 0x767873, WOOD = 0x6b5138, DARKWOOD = 0x4a3826, PLANK = 0x8a6d4a, RUST = 0x7a4a30, STEEL = 0x596068, ASPH = 0x3d3e40, BRICK = 0x7d4f40;
const WALLS = [0x8f897b, 0x9b8f7a, 0x7c6f5d, 0x86685a, 0x6f7a78, 0x9a9a8e, 0x7a8470], ROOFS = [0x4a3f3a, 0x5c382e, 0x3d4448, 0x4d4a3c];

export const ROADS = [
  [[260, 745], [290, 560], [380, 300], [420, 205]],
  [[245, 60], [60, 40], [-180, -50], [-300, -170], [-330, -200]],
  [[-180, -50], [-300, 150], [-335, 250]],
  [[-180, -50], [-480, -10], [-740, 50], [-825, 52]],
  [[605, 60], [700, 110], [760, 150]],
  [[420, -90], [400, -240], [350, -300], [480, -400], [600, -470]],
  [[60, 40], [80, -180]],
];

export const POI_DEFS = [
  { id: 'wreck', n: 'Wreck of the Marigold', kind: 'site', x: -846, z: 50, r: 24, h: 2.0, zr: 44, zi: 18, build: wreck },
  { id: 'town', n: 'Ashby', kind: 'town', x: 420, z: 60, r: 205, zr: 310, zi: 200, h: 16, ground: [0.30, 0.29, 0.25], build: town },
  { id: 'harbor', n: 'Port Hallam', kind: 'harbor', x: 260, z: 770, r: 150, zr: 215, zi: 135, h: 2.6, ground: [0.40, 0.40, 0.39], build: harbor },
  { id: 'light', n: 'Gull Point Light', kind: 'site', x: 520, z: 640, r: 24, zr: 70, zi: 22, h: 7, build: lighthouse },
  { id: 'summit', n: 'Summit Relay Station', kind: 'peak', x: -200, z: -480, r: 20, zr: 44, zi: 17, ground: [0.6, 0.62, 0.65], build: summit },
  { id: 'mine', n: 'Coldvein Mine', kind: 'site', x: -330, z: -200, r: 30, ground: [0.36, 0.33, 0.29], build: mine },
  { id: 'heli', n: 'Downed Helicopter', kind: 'site', x: -420, z: -400, r: 16, build: heli },
  { id: 'climb', n: "Climbers' Camp", kind: 'camp', x: -40, z: -400, r: 14, build: (B) => camp(B, 3, 1) },
  { id: 'bunker', n: 'Bunker 7', kind: 'danger', x: 620, z: -480, r: 38, ground: [0.33, 0.33, 0.30], build: bunker },
  { id: 'mast', n: 'Relay Mast', kind: 'site', x: 350, z: -300, r: 16, build: mast },
  { id: 'sawmill', n: 'Kessler Sawmill', kind: 'site', x: 80, z: -190, r: 34, ground: [0.38, 0.32, 0.22], build: sawmill },
  { id: 'farm', n: 'Dunmore Farm', kind: 'site', x: 150, z: 230, r: 44, ground: [0.36, 0.33, 0.20], build: farm },
  { id: 'ranger', n: 'Ranger Lookout', kind: 'site', x: -60, z: 320, r: 20, build: ranger },
  { id: 'lake', n: 'Mirror Lake Huts', kind: 'cabin', x: -332, z: 262, r: 15, h: 20.6, zr: 30, zi: 12, build: lakeHuts },
  { id: 'stones', n: 'The Standing Stones', kind: 'site', x: -600, z: -360, r: 18, build: stones },
  { id: 'marsh', n: 'Saltmarsh Huts', kind: 'cabin', x: 770, z: 152, r: 22, h: 3.2, build: marsh },
  { id: 'cab1', n: "Trapper's Cabin", kind: 'cabin', x: -590, z: -150, r: 13, build: cabin },
  { id: 'cab2', n: 'Hollow Creek Cabin', kind: 'cabin', x: 130, z: 500, r: 13, build: cabin },
  { id: 'cab3', n: 'North Ridge Cabin', kind: 'cabin', x: 640, z: -240, r: 13, build: cabin },
  { id: 'cab4', n: "Widow's Cabin", kind: 'cabin', x: -170, z: 640, r: 13, build: cabin },
  { id: 'camp1', n: 'Fernside Camp', kind: 'camp', x: -640, z: 260, r: 12, build: (B) => camp(B, 2, 1) },
  { id: 'camp2', n: 'Deadfall Camp', kind: 'camp', x: 230, z: -430, r: 12, build: (B) => camp(B, 2, 1) },
  { id: 'camp3', n: 'Lakeview Camp', kind: 'camp', x: -330, z: 470, r: 12, build: (B) => camp(B, 2, 1) },
  { id: 'camp4', n: 'Eastwood Camp', kind: 'camp', x: 640, z: 400, r: 12, build: (B) => camp(B, 3, 1) },
  { id: 'scav1', n: 'Scavenger Stockade', kind: 'danger', x: 10, z: 560, r: 22, ground: [0.33, 0.28, 0.2], build: stockade },
  { id: 'scav2', n: 'Crow Hill Stockade', kind: 'danger', x: 715, z: -70, r: 22, ground: [0.33, 0.28, 0.2], build: stockade },
  { id: 'scav3', n: 'Blackroot Stockade', kind: 'danger', x: -470, z: -90, r: 22, ground: [0.33, 0.28, 0.2], build: stockade },
];

let B, W, R;
const pick = (a) => a[Math.floor(R() * a.length)];
function sub(lx, lz, yaw, fn, ly = 0) { const F = B.F, s = { ...F }; const x = B.wx(lx, lz), z = B.wz(lx, lz); B.frame(x, z, s.yaw + yaw, s.y + ly); fn(); Object.assign(F, s); }
function wallRun(col, x1, z1, x2, z2, h, t, ops = [], y = 0) {
  const len = Math.hypot(x2 - x1, z2 - z1), yaw = Math.atan2(-(z2 - z1), x2 - x1), ux = (x2 - x1) / len, uz = (z2 - z1) / len;
  const seg = (a, b, y0, y1) => { if (b - a < 0.05 || y1 - y0 < 0.05) return; const m = (a + b) / 2; B.box(col, x1 + ux * m, y + y0, z1 + uz * m, b - a, y1 - y0, t, { yaw }); };
  let cur = 0;
  for (const op of ops.slice().sort((p, q) => p.a - q.a)) { seg(cur, op.a, 0, h); let yy = 0; for (const g of op.g) { seg(op.a, op.b, yy, g[0]); yy = g[1]; } seg(op.a, op.b, yy, h); cur = op.b; }
  seg(cur, len, 0, h);
}
function gable(w, d, y, col, wallCol, p = 0.52) {
  const rise = Math.tan(p) * d / 2, sl = d / 2 / Math.cos(p) + 0.5;
  for (const s of [-1, 1]) B.box(col, 0, y + rise / 2 - 0.02, s * (d / 4 + 0.12), w + 0.9, 0.16, sl, { pitch: s * p, nc: true });
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) B.box(wallCol, s * (w / 2 - 0.13), y + rise * k / 4, 0, 0.25, rise / 4 + 0.02, d * (1 - (k + 0.6) / 4), { nc: true });
}
function furniture(w, d, tier, pLoot = 0.6, n) {
  const y = 0.25;
  if (R() < 0.8) { B.box(PLANK, -w / 2 + 1.3, y, -d / 2 + 0.75, 1.5, 0.72, 0.8); B.box(DARKWOOD, -w / 2 + 1.3, y, -d / 2 + 1.55, 0.45, 0.45, 0.45); }
  if (R() < 0.7) B.box(DARKWOOD, w / 2 - 0.55, y, -d / 2 + 1.4, 0.45, 1.9, 1.6);
  if (R() < 0.6) { B.box(0x5d5648, w / 2 - 1.2, y, d / 2 - 1.3, 1.9, 0.4, 1.0); B.box(0x8d8672, w / 2 - 1.2, y + 0.4, d / 2 - 1.3, 1.8, 0.14, 0.95, { nc: true }); }
  if (R() < pLoot) B.crate(-w / 2 + 0.9, y, d / 2 - 0.9, tier, { n });
}
// A walled building with its door on the local +z side.
function house(w, d, o = {}) {
  const h = o.h || 2.9, fl = o.floors || 1, HH = h * fl, wc = o.wall || pick(WALLS), t = 0.25, y = 0.25, rc = o.roof || pick(ROOFS);
  B.box(o.floor || 0x5a5148, 0, 0, 0, w + 0.5, 0.25, d + 0.5);
  B.box(0x5a5148, o.doorX || 0, 0, d / 2 + 0.7, 1.8, 0.14, 1.0, { nc: true });
  const win = (a, ww = 1.2) => ({ a: a - ww / 2, b: a + ww / 2, g: [...Array(fl)].map((_, i) => [i * h + 1.0, i * h + 2.15]) });
  const dw = o.doorW || 1.3, dh = o.doorH || 2.2, dc = w / 2 + (o.doorX || 0);
  const front = [{ a: dc - dw / 2, b: dc + dw / 2, g: [[0, dh], ...[...Array(fl - 1)].map((_, i) => [(i + 1) * h + 1.0, (i + 1) * h + 2.15])] }];
  if (dc - dw / 2 > 2.6) front.push(win((dc - dw / 2) / 2)); if (w - dc - dw / 2 > 2.6) front.push(win((w + dc + dw / 2) / 2));
  const ruin = o.ruin;
  wallRun(wc, -w / 2, d / 2, w / 2, d / 2, HH, t, front, y);
  wallRun(wc, w / 2, -d / 2, -w / 2, -d / 2, ruin ? HH * 0.45 : HH, t, w > 5 && !ruin ? [win(w * 0.3), win(w * 0.7)] : [], y);
  wallRun(wc, -w / 2, -d / 2, -w / 2, d / 2, HH, t, d > 4 ? [win(d / 2)] : [], y);
  wallRun(wc, w / 2, d / 2, w / 2, -d / 2, ruin ? HH * 0.7 : HH, t, d > 4 && !ruin ? [win(d / 2)] : [], y);
  if (fl > 1) B.box(0x4f463c, 0, y + h - 0.2, 0, w, 0.2, d, { nc: false });
  if (o.flat) { B.box(rc, 0, y + HH, 0, w + 0.6, 0.3, d + 0.6); B.box(rc, 0, y + HH + 0.3, d / 2 + 0.2, w + 0.6, 0.5, 0.2, { nc: true }); }
  else if (!ruin) gable(w, d, y + HH, rc, wc);
  else { B.box(rc, -w / 4, y + HH + 0.6, 0, w / 2, 0.16, d + 0.5, { roll: -0.35, nc: true }); B.box(0x4f463c, w / 4, y, -d / 4, 1.6, 0.5, 1.2, { yaw: 0.5 }); }
  if (!o.empty) furniture(w, d, o.tier || 1, o.loot != null ? o.loot : 0.55, o.ln);
}
function car(lx, lz, yaw, col) {
  sub(lx, lz, yaw, () => {
    col = col || pick([0x6e3a2c, 0x4d5a66, 0x7a7466, 0x3f4a3d, 0x85603a]);
    B.box(col, 0, 0.32, 0, 4.3, 0.62, 1.8); B.box(col, -0.3, 0.94, 0, 2.3, 0.6, 1.62); B.box(0x1c2023, -0.3, 1.05, 0, 2.34, 0.34, 1.66, { nc: true });
    for (const sx of [-1.4, 1.4]) for (const sz of [-0.86, 0.86]) B.box(0x18181a, sx, 0, sz, 0.66, 0.6, 0.24, { nc: true });
    B.node('salvage', 0, 0);
  });
}
function truck(lx, lz, yaw, col = 0x4c5540) {
  sub(lx, lz, yaw, () => {
    B.box(col, 2.2, 0.5, 0, 2.2, 1.7, 2.3); B.box(0x1c2023, 2.6, 1.4, 0, 1.5, 0.6, 2.34, { nc: true }); B.box(col, -1.2, 0.5, 0, 4.6, 0.35, 2.4); B.box(0x5d5a48, -1.2, 0.85, 0, 4.5, 1.6, 2.3);
    for (const sx of [-2.6, -1.2, 2.2]) for (const sz of [-1.1, 1.1]) B.box(0x18181a, sx, 0, sz, 0.95, 0.9, 0.3, { nc: true });
    B.node('salvage', 0, 0);
  });
}
function tent(lx, lz, yaw, col) {
  sub(lx, lz, yaw, () => { col = col || pick([0x7a6a3c, 0x4f6a4a, 0x8a4a34, 0x55606e]); for (const s of [-1, 1]) B.box(col, s * 0.62, 0.5, 0, 1.75, 0.05, 2.6, { roll: s * -0.95, nc: true }); B.box(0x3a352c, 0, 0, 0, 1.9, 0.06, 2.5, { nc: true }); });
}
function firering(lx, lz, lit) {
  for (let i = 0; i < 8; i++) B.rock(0x6f7072, lx + Math.cos(i * 0.785) * 0.6, -0.1, lz + Math.sin(i * 0.785) * 0.6, 0.17);
  B.box(0x1d1a17, lx, 0, lz, 0.7, 0.1, 0.7, { nc: true, yaw: 0.6 }); B.box(0x2a231c, lx, 0.08, lz, 0.9, 0.1, 0.12, { nc: true, yaw: 1.1 });
  if (lit) B.light(lx, 0.7, lz, 0xff9a40, 1.4);
}
function stairs(lx, lz, yaw, rise, width, y0 = 0, col = PLANK) {
  sub(lx, lz, yaw, () => { const n = Math.round(rise / 0.25); for (let i = 0; i < n; i++) B.box(col, 0, y0 + i * 0.25 + 0.03, -(i + 0.5) * 0.36, width, 0.22, 0.4); });
}
function fence(x1, z1, x2, z2, col = DARKWOOD, hh = 1.1) {
  const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 2.6)), yaw = Math.atan2(-(z2 - z1), x2 - x1);
  for (let i = 0; i <= n; i++) B.box(col, x1 + (x2 - x1) * i / n, 0, z1 + (z2 - z1) * i / n, 0.14, hh + 0.1, 0.14, { nc: true });
  B.box(col, (x1 + x2) / 2, hh * 0.45, (z1 + z2) / 2, len, 0.1, 0.06, { yaw, nc: true }); B.box(col, (x1 + x2) / 2, hh * 0.85, (z1 + z2) / 2, len, 0.1, 0.06, { yaw, nc: true });
  B.box(col, (x1 + x2) / 2, 0, (z1 + z2) / 2, len, hh, 0.1, { yaw, inv: true });
}
function lamp(lx, lz, lit) { B.cyl(0x3a3d40, lx, 0, lz, 0.09, 5, { sides: 6 }); B.box(0x3a3d40, lx + 0.5, 4.9, lz, 1.2, 0.1, 0.16, { nc: true }); B.box(lit ? 0xffe2a0 : 0x55554e, lx + 1.0, 4.76, lz, 0.4, 0.14, 0.24, { nc: true }); if (lit) B.light(lx + 1, 4.5, lz, 0xffd9a0, 1.2); }
function lattice(lx, lz, h, w = 1.6, col = 0x8a3a30) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(col, lx + sx * w / 2, 0, lz + sz * w / 2, 0.14, h, 0.14, { nc: true });
  for (let y = 2; y < h; y += 3) { for (const s of [-1, 1]) { B.box(col, lx, y, lz + s * w / 2, w, 0.08, 0.08, { nc: true }); B.box(col, lx + s * w / 2, y, lz, 0.08, 0.08, w, { nc: true }); B.box(col, lx, y - 1.5, lz + s * w / 2, w * 1.4, 0.06, 0.06, { roll: 0.8 * s, nc: true }); } }
  B.box(col, lx, 0, lz, w, 3, w, { inv: true }); B.light(lx, h + 0.5, lz, 0xff3020, 0.8);
}
function barrels(lx, lz, n, col = 0x4a5a66) { for (let i = 0; i < n; i++) B.cyl(i % 2 ? RUST : col, lx + (i % 3) * 0.72, 0, lz + Math.floor(i / 3) * 0.72, 0.3, 0.92, { sides: 8 }); }
function logpile(lx, lz, yaw, n = 4) { sub(lx, lz, yaw, () => { for (let r = 0; r < 3; r++) for (let i = 0; i < n - r; i++) B.cyl(r % 2 ? 0x7a5a3a : 0x6b4e32, (i + r * 0.5 - n / 2) * 0.56, r * 0.48, 0, 0.27, 4.4, { lie: true, sides: 7, nc: r > 0 }); }); }

// ---------------------------------------------------------------- places
function wreck() {
  // a broken wooden trawler on the sand: the player wakes up beside it
  B.box(DARKWOOD, 0, -0.3, 0, 4.2, 0.5, 13, { yaw: 0.3 });
  for (let i = -5; i <= 5; i++) for (const s of [-1, 1]) B.box(i % 3 ? WOOD : DARKWOOD, s * 2.2 * Math.cos(0.3) + i * 1.15 * Math.sin(0.3), 0, -s * 2.2 * Math.sin(0.3) + i * 1.15 * Math.cos(0.3), 0.18, 1.2 + (Math.abs(i) % 3) * 0.5, 0.5, { yaw: 0.3, roll: s * -0.25, nc: true });
  B.box(WOOD, 0.4, 0.2, -3.2, 3.0, 2.0, 3.2, { yaw: 0.3 }); B.box(0x3a2c20, 0.4, 2.2, -3.2, 3.3, 0.15, 3.5, { yaw: 0.3, nc: true });
  B.cyl(DARKWOOD, 2, 0, 3, 0.16, 8, { roll: 1.1, nc: true, sides: 6 });
  B.crate(5, 0, 2, 1, { yaw: 0.6, n: 'Washed-up crate' }); B.crate(-5, 0, -4, 1, { yaw: 1.2, n: 'Washed-up crate' }); B.crate(3, 0, -9, 1, { n: 'Washed-up crate' });
  barrels(-4, 5, 3);
}

function town() {
  const y = B.F.y, P = (x, z, yaw = 0) => B.frame(x, z, yaw, y);
  P(420, 60);
  // streets
  for (const z of [-50, 60, 170]) { B.box(ASPH, 0, 0.02, z - 60, 350, 0.08, 8, { nc: true }); for (let x = -165; x < 170; x += 9) B.box(0xb9b4a0, x, 0.03, z - 60, 3, 0.08, 0.16, { nc: true }); for (const s of [-1, 1]) B.box(0x6b6a66, 0, 0.02, z - 60 + s * 5.2, 350, 0.16, 2.2, { nc: true }); }
  for (const x of [340, 500]) B.box(ASPH, x - 420, 0.025, 0, 8, 0.08, 228, { nc: true });
  // lots
  const special = { '1:-1:5': 'store', '1:-1:6': 'clinic', '1:-1:7': 'police', '1:-1:9': 'hall', '1:1:2': 'gas', '1:1:6': 'school', '1:1:7': 'skip', '1:1:14': 'church', '1:1:15': 'skip', '0:1:9': 'garage', '2:-1:4': 'store' };
  [-50, 60, 170].forEach((z0, zi) => { for (const s of [-1, 1]) for (let li = 0, x = 266; x <= 590; x += 19, li++) {
    if (Math.abs(x - 340) < 13 || Math.abs(x - 500) < 13) continue;
    const kind = special[`${zi}:${s}:${li}`], yaw = s < 0 ? 0 : PI, bz = (d) => z0 + s * (7.6 + d / 2);
    if (kind === 'skip') continue;
    if (kind === 'store') { P(x, bz(9), yaw); house(13, 9, { wall: 0x8c8a7a, flat: true, doorW: 2.2, tier: 1, loot: 1, ln: 'Shop counter' }); B.box(0x9a3b2e, 0, 3.3, 4.9, 9, 0.9, 0.2, { nc: true }); B.box(DARKWOOD, 2, 0.25, -2, 5, 1.0, 0.8); B.box(DARKWOOD, -3, 0.25, -3.6, 4, 1.9, 0.5); B.crate(4.5, 0.25, -3.2, 1); B.spawn('raider', 0, 9, 1); }
    else if (kind === 'clinic') { P(x, bz(9), yaw); house(11, 9, { wall: 0xb5b2a5, flat: true, tier: 1, loot: 0 }); B.box(0xb03a34, 0, 3.4, 4.7, 1.6, 0.5, 0.15, { nc: true }); B.box(0xb03a34, 0, 2.85, 4.7, 0.5, 1.6, 0.15, { nc: true }); B.crate(-3.6, 0.25, -3, 2, { color: 0xd8d4c8, n: 'Medical cabinet' }); B.crate(3.5, 0.25, -3, 1, { color: 0xd8d4c8, n: 'Medical cabinet' }); }
    else if (kind === 'police') { P(x, bz(10), yaw); house(13, 10, { wall: 0x5f6b78, flat: true, tier: 2, loot: 1, ln: 'Evidence locker' }); wallRun(0x5f6b78, -1, -5, -1, 1.2, 2.9, 0.2, [{ a: 3.6, b: 4.9, g: [[0, 2.2]] }], 0.25); B.crate(-4.6, 0.25, -3.6, 2, { n: 'Armory locker', color: 0x39424c }); B.spawn('gunner', 0, 9, 1); B.spawn('raider', 3, 10, 1); car(8.5, 6, 0.2, 0x2d3a4a); }
    else if (kind === 'hall') { P(x, bz(11), yaw); house(15, 11, { wall: BRICK, floors: 2, tier: 1, loot: 1, doorW: 1.8 }); B.box(0x8f897b, 0, 0, 6.6, 6, 0.25, 2); for (const sx of [-2.5, 2.5]) B.cyl(0xa39d8d, sx, 0.25, 7.2, 0.25, 3.2, { sides: 8 }); B.box(0xa39d8d, 0, 3.45, 7.0, 6.4, 0.4, 1.6, { nc: true }); }
    else if (kind === 'gas') { P(x, bz(7) + s * 9, yaw); house(9, 7, { wall: 0xa59c84, flat: true, tier: 1, loot: 0.9 }); for (const sx of [-4, 4]) B.cyl(0x8a8a84, sx, 0, 9, 0.2, 4.4, { sides: 6 }); B.box(0xa5352c, 0, 4.4, 9, 12, 0.5, 6, { nc: true }); for (const sx of [-2, 2]) { B.box(0x8a8a84, sx, 0, 9, 0.9, 0.2, 2.2, { nc: true }); B.box(0xb8a23a, sx, 0.2, 9, 0.6, 1.5, 0.5); } car(-1.2, 12.4, 0.1); barrels(6, 3, 4); }
    else if (kind === 'school') { P(x + 9.5, bz(12), yaw); house(26, 12, { wall: 0x9a7f66, floors: 2, flat: true, doorW: 2.2, tier: 1, loot: 1 }); for (let i = 0; i < 4; i++) B.box(PLANK, -9 + i * 4.5, 0.25, -2.5, 1.2, 0.7, 0.6); B.crate(10, 0.25, -4, 1); fence(-13, 14, 13, 14, 0x55585a, 1.6); B.spawn('raider', 0, 12, 2, 8); }
    else if (kind === 'church') { P(x + 9.5, bz(20), yaw); house(11, 20, { wall: 0xb0ab9c, h: 5.2, roof: 0x3d4448, doorW: 2, doorH: 3, tier: 2, loot: 0 }); B.box(0xb0ab9c, 0, 0, 12.3, 4.4, 13, 4.4); B.box(0x3d4448, 0, 13, 12.3, 3.2, 3.2, 3.2, { nc: true, yaw: PI / 4 }); B.box(0x3d4448, 0, 16, 12.3, 0.16, 2, 0.16, { nc: true }); B.box(0x3d4448, 0, 17.1, 12.3, 0.9, 0.16, 0.16, { nc: true });
      for (let i = 0; i < 5; i++) for (const sx of [-2.8, 2.8]) B.box(DARKWOOD, sx, 0.25, -6 + i * 2.6, 3.4, 0.5, 0.5); B.box(0x8f897b, 0, 0.25, -8.6, 2.4, 1.0, 1.0); B.crate(3.6, 0.25, -8.6, 2, { n: 'Reliquary chest' });
      for (let i = 0; i < 14; i++) B.box(0x8c8c86, -12 - (i % 5) * 2.4, 0, -6 + Math.floor(i / 5) * 4.4, 0.7, 1.0 + (i % 3) * 0.2, 0.2, { roll: (R() - 0.5) * 0.2 }); fence(-24, -9, -24, 6, 0x33363a, 1.2); fence(-24, 6, -9, 6, 0x33363a, 1.2); B.spawn('raider', -14, 0, 2, 6); }
    else if (kind === 'garage') { P(x, bz(10), yaw); house(13, 10, { wall: 0x7c7f7e, flat: true, doorW: 4.6, doorH: 2.7, tier: 2, loot: 1, ln: 'Tool chest' }); car(-2, -1, PI / 2); B.box(STEEL, 4.5, 0.25, -3.6, 3, 0.9, 0.8); truck(1, 10.5, 0.15, 0x6a4a34); }
    else if (R() < 0.2) { P(x, bz(8), yaw); const q = R(); if (q < 0.4) car((R() - 0.5) * 6, (R() - 0.5) * 4, R() * 6); else if (q < 0.7) { for (let i = 0; i < 6; i++) B.box(pick(WALLS), (R() - 0.5) * 8, 0, (R() - 0.5) * 6, 0.6 + R() * 2, 0.3 + R() * 0.8, 0.5 + R(), { yaw: R() * 3 }); B.crate(1, 0, 1, 1, { n: 'Buried trunk' }); } else { B.box(0x5a6a4a, 0, 0, 0, 0.2, 2.4, 0.2); B.box(0x8a3a30, 0, 1.2, 0, 3, 0.08, 0.3, { nc: true }); B.box(0x4a5a6a, -3, 0, 2, 0.1, 1.8, 2, { nc: true }); } }
    else { const w = 8 + Math.floor(R() * 4), d = 7 + Math.floor(R() * 3); P(x + (R() - 0.5) * 2, bz(d) + s * R() * 2, yaw); house(w, d, { floors: R() < 0.3 ? 2 : 1, ruin: R() < 0.16, doorX: (R() - 0.5) * (w - 4) }); if (R() < 0.3) fence(-w / 2 - 2, d / 2 + 2.5, w / 2 + 2, d / 2 + 2.5, 0x9a968a, 0.9); if (R() < 0.22) car(w / 2 + 2.6, 0, PI / 2 + (R() - 0.5) * 0.4); }
  } });
  P(420, 60);
  // square, water tower, street furniture
  B.cyl(0x8f897b, 0, 0, -55 + 60 - 55, 3.2, 0.5, { sides: 14 }); B.cyl(0x7b7a70, 0, 0.5, -50, 0.7, 2.6, { sides: 8 }); B.box(0x4d5a52, 0, 3.1, -50, 0.7, 1.8, 0.5, { nc: true });
  for (const sx of [-6, 6]) B.box(DARKWOOD, sx, 0, -50, 0.5, 0.45, 2.2);
  sub(0, 112, 0, () => { for (const sx of [-2.4, 2.4]) for (const sz of [-2.4, 2.4]) B.cyl(RUST, sx, 0, sz, 0.18, 13, { sides: 6 }); B.cyl(0x6f7d84, 0, 13, 0, 3.6, 5, { sides: 14, nc: true }); B.cyl(0x55626a, 0, 18, 0, 3.7, 1.4, { sides: 14, top: 0.3, nc: true }); B.crate(0, 0, 0, 2); });
  for (let x = -160; x <= 160; x += 40) { lamp(x, -5.4, false); B.cyl(DARKWOOD, x + 20, 0, 5.6, 0.13, 7.5, { sides: 6 }); B.box(DARKWOOD, x + 20, 6.8, 5.6, 0.12, 0.12, 2.2, { nc: true }); }
  for (const [x, z, a] of [[-120, 1.5, 0.05], [-40, -1.4, 3.2], [35, 1.2, 0.4], [118, -1.6, 3.0], [-80, -108, 0.1], [60, 111.5, 3.1], [-78.5, 60, 1.6], [81.5, -70, 1.5]]) (R() < 0.3 ? truck : car)(x, z, a);
  B.box(0xa58a2f, -60, 0, 2.5, 2.4, 3.0, 9); for (let i = 0; i < 4; i++) B.box(0x18181a, -60, 0, -1 + i * 2.4, 2.6, 0.8, 0.8, { nc: true });   // school bus
  barrels(30, 9, 5); barrels(-140, -8, 3);
  B.spawn('raider', -100, 5, 2, 8); B.spawn('raider', 60, -4, 2, 8); B.spawn('raider', 110, 100, 2, 8); B.spawn('raider', -90, -105, 2, 8); B.spawn('gunner', 0, -46, 1); B.spawn('gunner', 120, -8, 1); B.spawn('gunner', -30, 108, 1);
  B.spawn('wolf', 150, 150, 2, 10);
}

function harbor() {
  // frame: quay level, sea to local +z, quay edge at z = 30
  B.box(CONC, 0, -9, 33.4, 430, 9, 7);
  for (let x = -200; x <= 200; x += 16) B.cyl(0x2a2c2e, x, 0, 31.5, 0.22, 0.5, { sides: 8 });
  for (const px of [-95, 0, 95]) { B.box(PLANK, px, -0.5, 66, 5.4, 0.5, 60); for (let z = 40; z <= 96; z += 8) for (const s of [-1, 1]) B.cyl(DARKWOOD, px + s * 2.5, -8, z, 0.26, 9, { sides: 6, nc: true }); for (let z = 44; z < 96; z += 13) B.cyl(0x2a2c2e, px + 2.3, 0, z, 0.16, 0.4, { sides: 6, nc: true }); }
  // warehouses
  for (const [wx, n] of [[-85, 0], [60, 1]]) sub(wx, -30, 0, () => {
    const w = 28, d = 17, h = 7.5, c = n ? 0x6f7a80 : 0x8a6a52;
    B.box(0x5c5b57, 0, 0, 0, w + 0.6, 0.2, d + 0.6);
    wallRun(c, -w / 2, d / 2, w / 2, d / 2, h, 0.3, [{ a: 5, b: 12, g: [[0, 4.6]] }, { a: 17, b: 23, g: [[0, 4.6]] }], 0.2); wallRun(c, w / 2, -d / 2, -w / 2, -d / 2, h, 0.3, [{ a: 12, b: 16, g: [[3.5, 5.5]] }], 0.2);
    wallRun(c, -w / 2, -d / 2, -w / 2, d / 2, h, 0.3, [], 0.2); wallRun(c, w / 2, d / 2, w / 2, -d / 2, h, 0.3, [{ a: 7, b: 9, g: [[0, 2.3]] }], 0.2);
    gable(w, d, h + 0.2, 0x4a4d4f, c, 0.3);
    for (let i = 0; i < 6; i++) B.box(pick([PLANK, 0x6f5a3c, 0x58633d]), -11 + (i % 3) * 2.2, 0.2 + Math.floor(i / 3) * 1.5, -6, 2, 1.5, 2); for (let i = 0; i < 3; i++) B.box(STEEL, 10, 0.2, -6 + i * 4.5, 1.2, 4, 3.5);
    B.crate(2, 0.2, -6.5, 2); B.crate(-3, 0.2, 5, 2); B.crate(7, 0.2, 2, n ? 2 : 1); B.spawn(n ? 'gunner' : 'raider', 0, 0, 1, 4);
  });
  // container yard
  const CC = [0x8a3b2c, 0x2f4f6e, 0x3d5f48, 0xa58a2f, 0x6d6f70, 0x7a4a30];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { if (R() < 0.18) continue; const x = -20 + i * 7.4, z = -8 + j * 9.2, n = 1 + (R() < 0.55) + (R() < 0.2); if (i === 2 && j === 1) { openContainer(x, z, pick(CC)); continue; } for (let k = 0; k < n; k++) B.box(pick(CC), x, k * 2.62, z, 6.1, 2.6, 2.44, { yaw: (R() - 0.5) * 0.04 }); }
  function openContainer(x, z, c) { B.box(c, x, 0, z, 6.1, 0.14, 2.44); B.box(c, x, 2.46, z, 6.1, 0.14, 2.44); B.box(c, x, 0, z - 1.17, 6.1, 2.6, 0.1); B.box(c, x, 0, z + 1.17, 6.1, 2.6, 0.1); B.box(c, x - 3, 0, z, 0.1, 2.6, 2.44); B.box(c, x + 3.4, 0, z + 1.7, 0.1, 2.6, 1.2, { yaw: 0.9 }); B.crate(x - 1.8, 0.14, z, 2); }
  // gantry crane
  sub(128, 16, 0, () => { for (const sx of [-6, 6]) for (const sz of [-5, 5]) B.box(0xb8862f, sx, 0, sz, 0.8, 20, 0.8); for (const sz of [-5, 5]) B.box(0xb8862f, 0, 19.5, sz, 13.6, 1, 1, { nc: true }); B.box(0xb8862f, 0, 20.5, 16, 2.4, 1.6, 56, { nc: true }); B.box(0x3d4448, 0, 17.6, 4, 3, 2.8, 3, { nc: true }); B.box(0x2a2c2e, 0, 8, 30, 0.1, 12.5, 0.1, { nc: true }); B.box(0x8a3b2c, 0, 5.4, 30, 6.1, 2.6, 2.44, { nc: true }); });
  // office, tanks, clutter
  sub(165, -34, 0, () => { house(10, 8, { wall: 0x9a9483, floors: 2, flat: true, tier: 2, loot: 1, ln: 'Harbormaster safe' }); });
  for (const [tx, tz] of [[-170, -34], [-170, -14], [-150, -24]]) { B.cyl(0x9aa0a3, tx, 0, tz, 5.5, 8.5, { sides: 16 }); B.cyl(0x7f8588, tx, 8.5, tz, 5.5, 1.2, { sides: 16, top: 0.5, nc: true }); }
  barrels(-30, 20, 8, RUST); barrels(98, 8, 6); for (let i = 0; i < 6; i++) B.box(PLANK, 20 + (i % 3) * 1.5, 0, 22 + Math.floor(i / 3) * 1.4, 1.2, 0.16 + (i % 2) * 0.5, 1.0);
  sub(-40, 10, 0.4, () => { B.box(0xb8862f, 0, 0.3, 0, 2.2, 1.0, 1.2); B.box(0x2a2c2e, 0.3, 1.3, 0, 1.2, 1.1, 1.1, { nc: true }); B.box(STEEL, -1.5, 0.1, 0, 1.2, 0.08, 0.9, { nc: true }); B.node('salvage', 0, 0); });
  truck(-120, 5, 1.3, 0x5a6a78); car(30, -52, 0.2); car(110, -50, 2.9);
  for (let x = -190; x <= 190; x += 38) lamp(x, 26, false);
  for (const [a, b] of [[-205, -100], [-70, 10], [40, 205]]) fence(a, -58, b, -58, 0x55585a, 2.0);
  // small boats
  for (const [bx, bz, a] of [[-99.5, 60, 0], [-90.4, 84, 0.1], [4.6, 52, 0]]) sub(bx, bz, a, () => { B.box(pick([0xb8b4a8, 0x35506a, 0x7a3a30]), 0, -2.5, 0, 2.4, 1.3, 6.6, { nc: true }); B.box(0xd8d4c8, 0, -1.2, -1.2, 1.7, 1.5, 2.0, { nc: true }); });
  // the freighter Corvid, moored at the east pier
  sub(106, 70, 0, () => {
    const D = 1.4; // deck height above quay
    B.box(0x3a2a26, 0, -7, 0, 14, 7 + D - 0.2, 60); B.box(0x58201c, 0, -7.2, 0, 14.2, 3.4, 60.2, { nc: true }); B.box(0x4a4c4e, 0, D - 0.2, 0, 14, 0.2, 60);
    B.box(0x3a2a26, 0, -7, 33, 10, 7 + D, 7); B.box(0x3a2a26, 0, -7, 38, 5.5, 7 + D, 5);
    for (const s of [-1, 1]) { B.box(0x3a2a26, s * 6.9, D, 0, 0.2, 1.0, 60, s < 0 ? { nc: true } : {}); }
    B.box(0x3a2a26, -6.9, D, -19, 0.2, 1.0, 22); B.box(0x3a2a26, -6.9, D, 16.5, 0.2, 1.0, 27);
    for (let i = 0; i < 4; i++) B.box(PLANK, -8.6 + i * 0.5 - 0.6, i * 0.34 - 0.04, 0, 0.6, 0.3, 2.4);   // gangway from the pier
    // superstructure at the stern (north end)
    sub(0, -21, 0, () => {
      wallRun(0xb9b5a8, -5.5, 6, 5.5, 6, 3, 0.3, [{ a: 4.6, b: 6.4, g: [[0, 2.2]] }], D); wallRun(0xb9b5a8, 5.5, -7, -5.5, -7, 3, 0.3, [], D); wallRun(0xb9b5a8, -5.5, -7, -5.5, 6, 3, 0.3, [{ a: 5, b: 7, g: [[1, 2.1]] }], D); wallRun(0xb9b5a8, 5.5, 6, 5.5, -7, 3, 0.3, [{ a: 5, b: 7, g: [[1, 2.1]] }], D);
      B.box(0x8d8a80, 0, D + 3, -0.5, 11.6, 0.3, 13.6); B.box(0xb9b5a8, 0, D + 3.3, -1.5, 8, 2.8, 8); B.box(0x1c2023, 0, D + 4.5, 2.55, 7, 1, 0.1, { nc: true }); B.box(0x8d8a80, 0, D + 6.1, -1.5, 9, 0.25, 9, { nc: true });
      B.cyl(0x8a3b2c, 0, D + 6.3, -4, 1.3, 4.5, { sides: 10, nc: true }); B.box(0x55585a, 0, D + 6.3, 1, 0.14, 6, 0.14, { nc: true });
      B.crate(-3.6, D, -5, 3); B.crate(3.4, D, -4.6, 2); B.box(STEEL, 3.6, D, 3, 2.4, 0.9, 1.2); B.spawn('gunner', 0, 0, 1, 2, D + 0.1);
    });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) if (R() < 0.8) B.box(pick(CC), -3.2 + j * 6.4, D, 2 + i * 7.4, 6.1, 2.6, 2.44, { yaw: PI / 2 });
    B.crate(0, D, 26, 2); B.crate(1, D, -6, 2); B.box(0xb8862f, 0, D, 31, 0.5, 9, 0.5); B.box(0xb8862f, 0, D + 8, 26, 0.3, 0.3, 11, { pitch: 0.5, nc: true });
    B.spawn('gunner', 2, 12, 1, 3, D + 0.1); B.spawn('raider', -1, 22, 1, 3, D + 0.1);
  });
  B.spawn('raider', -40, 0, 2, 8); B.spawn('raider', 40, 12, 2, 8); B.spawn('gunner', 125, -5, 1, 5); B.spawn('raider', -140, 10, 1, 5);
}

function lighthouse() {
  B.cyl(0xd8d4c8, 0, 0, 0, 3.4, 9, { sides: 14, top: 2.9 }); B.cyl(0xa5352c, 0, 9, 0, 2.9, 5, { sides: 14, top: 2.5, nc: true }); B.cyl(0xd8d4c8, 0, 14, 0, 2.5, 8, { sides: 14, top: 2.0, nc: true });
  B.cyl(0x2a2c2e, 0, 22, 0, 3.0, 0.3, { sides: 14, nc: true }); B.cyl(0xfff0b8, 0, 22.3, 0, 1.3, 2.2, { sides: 10, nc: true }); B.cyl(0xa5352c, 0, 24.5, 0, 1.9, 1.6, { sides: 10, top: 0.1, nc: true });
  B.light(0, 23.4, 0, 0xfff0c0, 3);
  sub(-10, 6, 0.5, () => house(7, 6, { wall: 0xd8d4c8, roof: 0xa5352c, tier: 1, loot: 1, ln: "Keeper's trunk" }));
  B.crate(4.5, 0, 2, 2); fence(-16, -8, 8, -12, 0xd8d4c8, 0.9); B.spawn('raider', 6, 6, 1);
}

function summit() {
  sub(-4, 2, 0.3, () => { house(8, 6, { wall: 0x8a3a30, flat: true, tier: 3, loot: 1, ln: 'Station locker' }); B.crate(2.6, 0.25, -1.9, 3); });
  lattice(8, -4, 30, 2.2); B.cyl(0xd8d4c8, 9, 0, 6, 0.15, 3, { sides: 6 }); B.cyl(0xd8d4c8, 9, 2.6, 6, 1.6, 0.5, { sides: 12, top: 1.9, pitch: 0.9, nc: true });
  B.box(STEEL, 3, 0, 9, 2.2, 1.3, 1.2); B.crate(12, 0, 0, 3); barrels(-12, -4, 4, 0x9a3b2e);
  B.spawn('gunner', 0, 10, 2, 5); B.spawn('gunner', 10, -10, 1, 3);
}

function mine() {
  const yaw = -0.435; B.frame(B.F.x, B.F.z, yaw, B.F.y);
  // adit driven into the hillside (uphill is local -z)
  B.box(0x0c0b0a, 0, 0, -25, 4.4, 3.6, 12); for (let i = 0; i < 4; i++) { for (const s of [-1, 1]) B.box(DARKWOOD, s * 2.4, 0, -18.6 + i * 1.8, 0.4, 3.8, 0.4); B.box(DARKWOOD, 0, 3.7, -18.6 + i * 1.8, 5.6, 0.4, 0.4, { nc: true }); }
  for (const s of [-0.6, 0.6]) B.box(0x55524c, s, 0.02, -2, 0.1, 0.12, 36, { nc: true }); for (let z = -18; z < 16; z += 1.4) B.box(DARKWOOD, 0, 0, z, 2, 0.08, 0.26, { nc: true });
  for (const [z, a] of [[-8, 0], [6, 0.05]]) sub(0, z, a, () => { B.box(RUST, 0, 0.35, 0, 1.4, 0.9, 2.0); for (const sx of [-0.6, 0.6]) for (const sz of [-0.6, 0.6]) B.cyl(0x2a2c2e, sx, 0, sz, 0.22, 0.14, { lie: true, yaw: PI / 2, nc: true, sides: 8 }); });
  sub(13, 4, -1.2, () => house(7, 6, { wall: WOOD, tier: 2, loot: 1, ln: "Foreman's strongbox" }));
  B.crate(-8, 0, -6, 2); B.crate(-10, 0, 8, 1); logpile(-12, 0, 0.3, 4); barrels(7, -10, 4);
  for (let i = 0; i < 12; i++) { const a = R() * 6.28, d = 12 + R() * 15; if (Math.abs(Math.cos(a) * d) < 3) continue; B.node(R() < 0.75 ? 'iron' : 'boulder', Math.cos(a) * d, Math.sin(a) * d); }
  B.spawn('raider', 4, 6, 3, 8); B.spawn('bear', -40, -30, 1);
}

function heli() {
  B.box(0x4c5540, 0, 0.2, 0, 2.2, 2.0, 5.4, { yaw: 0.4 }); B.box(0x1c2023, 0.9, 0.9, 2.1, 1.9, 1.2, 1.4, { yaw: 0.4, nc: true }); B.box(0x4c5540, -2.6, 1.0, -5.6, 0.6, 0.7, 6.5, { yaw: 0.44, roll: 0.2, nc: true }); B.box(0x4c5540, -4.0, 1.2, -8.6, 0.14, 2.0, 1.0, { yaw: 0.4, nc: true });
  B.box(0x2a2c2e, 1, 2.3, 0, 11, 0.08, 0.4, { yaw: 1.2, roll: 0.16, nc: true }); B.box(0x2a2c2e, -1, 0.1, 5, 6, 0.08, 0.4, { yaw: 0.2, nc: true });
  B.crate(4, 0, 2, 3, { n: 'Flight case' }); B.crate(-4, 0, 3, 2); B.node('salvage', 0, 0); B.spawn('wolf', 12, 4, 3, 8);
}

function camp(B_, tents, tier) {
  for (let i = 0; i < tents; i++) { const a = i * 2.2 + 0.5; tent(Math.cos(a) * 4.6, Math.sin(a) * 4.6, -a + PI / 2); }
  firering(0, 0, false); B.box(DARKWOOD, 1.8, 0, -1.2, 2.2, 0.4, 0.4, { yaw: 0.6 }); B.crate(-2.6, 0, -2.4, tier, { n: 'Abandoned pack', s: 0.6, color: 0x7a4a34 }); if (R() < 0.5) B.crate(3, 0, 3.4, tier, { s: 0.7 });
  if (R() < 0.5) B.spawn('wolf', 14, 6, 2, 6);
}

function cabin() {
  B.frame(B.F.x, B.F.z, R() * 6.28, B.F.y);
  house(7, 6, { wall: WOOD, roof: 0x3f3a30, tier: 1, loot: 1, ln: "Hunter's footlocker" });
  B.box(PLANK, 0, 0, 4.4, 7.4, 0.2, 2.2); for (const sx of [-3.4, 3.4]) B.box(DARKWOOD, sx, 0.2, 5.2, 0.2, 2.5, 0.2); B.box(0x3f3a30, 0, 2.7, 4.5, 7.8, 0.12, 2.6, { pitch: 0.2, nc: true });
  logpile(-5.6, 0, PI / 2, 4); B.cyl(DARKWOOD, 5.5, 0, 2.5, 0.4, 0.6, { sides: 8 }); barrels(5, -2.6, 2); if (R() < 0.6) B.crate(5.6, 0, -0.5, 1);
  if (R() < 0.5) B.spawn('boar', 16, 10, 2, 8);
}

function ranger() {
  sub(-8, 3, 0.4, () => house(8, 7, { wall: 0x5d6b4a, roof: 0x3f3a30, tier: 2, loot: 1, ln: 'Ranger locker' }));
  // fire lookout: platform at 10 m, one long stair
  const T = 10;
  for (const sx of [-2.4, 2.4]) for (const sz of [-2.4, 2.4]) B.box(DARKWOOD, 6 + sx, 0, -3 + sz, 0.35, T, 0.35);
  B.box(PLANK, 6, T, -3, 6.4, 0.25, 6.4); for (const [a, b, c, d] of [[-3.1, 0, 0.12, 6.4], [3.1, 0, 0.12, 6.4], [0, -3.1, 6.4, 0.12]]) B.box(DARKWOOD, 6 + a, T + 0.25, -3 + b, c, 1.0, d);
  B.box(DARKWOOD, 6 - 2, T + 0.25, 0.1, 2.4, 1.0, 0.12); B.box(0x3f3a30, 6, T + 2.9, -3, 7.4, 0.2, 7.4, { nc: true }); for (const sx of [-3, 3]) for (const sz of [-3, 3]) B.box(DARKWOOD, 6 + sx, T + 0.25, -3 + sz, 0.16, 2.7, 0.16, { nc: true });
  stairs(7.6, 14.9, 0, T + 0.25, 1.5, 0, PLANK); for (let i = 1; i < 4; i++) for (const sx of [-0.8, 0.8]) B.box(DARKWOOD, 7.6 + sx, 0, 14.9 - i * 3.6, 0.2, i * 2.5, 0.2, { nc: true });
  B.crate(5, T + 0.25, -4.4, 2, { n: 'Lookout cache' }); car(-2, 12, 0.3, 0x4f6a4a);
}

function sawmill() {
  // open shed
  for (const sx of [-8, 0, 8]) for (const sz of [-4, 4]) B.box(DARKWOOD, sx, 0, sz, 0.35, 4.4, 0.35); B.box(0x55524c, 0, 4.4, 0, 18, 0.2, 10, { pitch: 0.12, nc: true });
  B.box(STEEL, 0, 0, 0, 9, 0.9, 1.6); B.cyl(0x8d9093, 1, 0.5, 0, 0.9, 0.06, { lie: true, yaw: PI / 2, nc: true, sides: 14 }); B.cyl(0x7a5a3a, -3, 0.9, 0, 0.3, 4.4, { lie: true, yaw: PI / 2, nc: true, sides: 7 });
  logpile(-16, 6, 0.2, 5); logpile(-16, -6, -0.1, 5); logpile(14, 9, 1.2, 4); for (let i = 0; i < 5; i++) B.box(PLANK, 14, i * 0.18, -8, 4, 0.16, 1.6, { yaw: (R() - 0.5) * 0.1 });
  sub(18, -18, 0.7, () => house(8, 6, { wall: WOOD, tier: 1, loot: 1 })); truck(-4, -14, 0.25, 0x7a3a30);
  B.crate(6, 0, 3, 1); B.crate(-7, 0, -3, 2, { n: 'Tool crate' }); B.spawn('raider', 0, 8, 2, 6); B.spawn('boar', -30, 20, 2, 6);
}

function farm() {
  sub(-18, -10, 0.1, () => house(10, 8, { wall: 0xb5ae98, roof: 0x5c382e, floors: 2, tier: 1, loot: 1 }));
  sub(14, -14, 0, () => {   // barn
    const w = 14, d = 18, h = 6, c = 0x7a2f28; B.box(0x4f463c, 0, 0, 0, w + 0.4, 0.15, d + 0.4);
    wallRun(c, -w / 2, d / 2, w / 2, d / 2, h, 0.3, [{ a: 4.5, b: 9.5, g: [[0, 4.2]] }], 0.15); wallRun(c, w / 2, -d / 2, -w / 2, -d / 2, h, 0.3, [], 0.15); wallRun(c, -w / 2, -d / 2, -w / 2, d / 2, h, 0.3, [], 0.15); wallRun(c, w / 2, d / 2, w / 2, -d / 2, h, 0.3, [], 0.15);
    gable(w, d, h + 0.15, 0x3d3a36, c, 0.62); for (let i = 0; i < 5; i++) B.box(0xb89a48, -4.5 + (i % 3) * 1.7, 0.15 + Math.floor(i / 3) * 1.0, -6.5, 1.6, 1.0, 1.1);
    B.crate(4.5, 0.15, -6, 1); B.crate(4.5, 0.15, 2, 2, { n: 'Farm strongbox' });
  });
  B.cyl(0x9aa0a3, 28, 0, -24, 2.6, 11, { sides: 12 }); B.cyl(0x7f8588, 28, 11, -24, 2.6, 1.6, { sides: 12, top: 0.2, nc: true });
  for (let i = 0; i < 9; i++) B.box(i % 2 ? 0x4a3a22 : 0x5d6b2f, -6, 0.02, 12 + i * 2.6, 50, 0.14, 1.3, { nc: true });
  fence(-32, 9, 20, 9); fence(-32, 36, 20, 36); fence(-32, 9, -32, 36); fence(20, 9, 20, 36);
  sub(2, 4, 0.5, () => { B.box(0x3d6a3a, 0, 0.6, 0, 3.2, 1.0, 1.4); B.box(0x3d6a3a, -0.8, 1.6, 0, 1.2, 1.2, 1.3, { nc: true }); for (const sz of [-0.8, 0.8]) { B.cyl(0x18181a, -0.9, 0, sz, 0.8, 0.4, { lie: true, yaw: 0, nc: true, sides: 10 }); B.cyl(0x18181a, 1.2, 0, sz, 0.45, 0.3, { lie: true, yaw: 0, nc: true, sides: 10 }); } B.node('salvage', 0, 0); });
  B.spawn('boar', -5, 22, 3, 12); B.spawn('raider', 0, -4, 2, 6);
}

function lakeHuts() {
  // frame faces the lake (local -x is toward the water)
  for (const [hx, hz, a] of [[4, -7, 1.4], [5, 6, 1.75]]) sub(hx, hz, a, () => house(5, 4.5, { wall: PLANK, roof: 0x4a4d4f, tier: 1, loot: 1, ln: 'Tackle box' }));
  B.box(PLANK, -16, -0.25, 0, 22, 0.25, 2.4); for (let x = -26; x <= -8; x += 4.5) for (const s of [-1, 1]) B.cyl(DARKWOOD, x, -5, s * 1.1, 0.14, 5.6, { sides: 6, nc: true });
  sub(-23, 3.2, 0.2, () => { B.box(0x7a3a30, 0, -1.55, 0, 3.6, 0.55, 1.4, { nc: true }); });
  firering(-2, 0, false); B.crate(-25, 0, 0, 1, { s: 0.6, n: 'Tackle box' }); barrels(8, 0, 2);
}

function stones() {
  for (let i = 0; i < 9; i++) { const a = i * 0.698; B.box(0x6f7072, Math.cos(a) * 11, -0.3, Math.sin(a) * 11, 1.5, 3.6 + (i % 3) * 0.7, 0.9, { yaw: -a + PI / 2 + (R() - 0.5) * 0.3 }); }
  B.box(0x6f7072, 0, 0, 0, 2.6, 0.9, 1.4); B.box(0x7b7c7e, 0, 0.9, 0, 3.0, 0.25, 1.8); B.crate(0, 1.15, 0, 2, { s: 0.6, n: 'Offering chest', color: 0x4a3826 });
  B.spawn('wolf', 6, 6, 4, 8);
}

function marsh() {
  for (const [hx, hz, a] of [[-8, -8, 0.3], [-10, 6, -0.2], [2, 10, 2.8]]) sub(hx, hz, a, () => { for (const sx of [-2.2, 2.2]) for (const sz of [-1.9, 1.9]) B.cyl(DARKWOOD, sx, -1.5, sz, 0.15, 2.4, { sides: 6, nc: true }); sub(0, 0, 0, () => house(5, 4.4, { wall: PLANK, roof: 0x55524c, tier: 1, loot: 0.8 }), 0.9); stairs(0, 4.1, 0, 1.0, 1.4, 0, PLANK); });
  B.box(PLANK, 14, -0.2, 0, 22, 0.25, 2.2); for (let x = 5; x <= 25; x += 5) for (const s of [-1, 1]) B.cyl(DARKWOOD, x, -5, s, 0.14, 5.6, { sides: 6, nc: true });
  sub(22, 3, 1.6, () => B.box(0x35506a, 0, -2.2, 0, 1.4, 0.6, 4.2, { nc: true })); B.crate(24, 0.05, 0, 2, { s: 0.6, n: "Smuggler's case" }); barrels(-2, -3, 3); B.spawn('raider', 0, 0, 2, 6);
}

function bunker() {
  const c = 0x696b66, w = 18, d = 14, h = 3.2, t = 0.9;
  B.box(0x4a4a46, 0, 0, 0, w + 1, 0.2, d + 1);
  wallRun(c, -w / 2, d / 2, w / 2, d / 2, h, t, [{ a: 8, b: 10, g: [[0, 2.3]] }], 0.2); wallRun(c, w / 2, -d / 2, -w / 2, -d / 2, h, t, [], 0.2); wallRun(c, -w / 2, -d / 2, -w / 2, d / 2, h, t, [{ a: 6, b: 8, g: [[1.3, 1.8]] }], 0.2); wallRun(c, w / 2, d / 2, w / 2, -d / 2, h, t, [{ a: 6, b: 8, g: [[1.3, 1.8]] }], 0.2);
  wallRun(c, -w / 2, -1, w / 2, -1, h, 0.4, [{ a: 3, b: 4.6, g: [[0, 2.3]] }, { a: 13, b: 14.6, g: [[0, 2.3]] }], 0.2); wallRun(c, 0, -1, 0, -d / 2, h, 0.4, [], 0.2);
  B.box(c, 0, h + 0.2, 0, w + 1.2, 0.8, d + 1.2); for (const s of [-1, 1]) B.box(c, s * 2.2, 0, d / 2 + 2.6, 0.7, 2.6, 4.4);
  B.crate(-6.5, 0.2, -5, 3); B.crate(-2.4, 0.2, -5, 3); B.crate(3, 0.2, -5, 3); B.crate(6.6, 0.2, -4.6, 3, { n: 'Armory case' }); B.crate(6.5, 0.2, 4, 2); B.box(STEEL, -6, 0.2, 4.6, 3.4, 0.9, 1.2); B.box(0x3a4a3a, -7.6, 0.2, 1.4, 0.8, 1.9, 2.4);
  B.light(-4, 2.8, -4, 0xff5540, 0.9); B.light(4, 2.8, 3, 0xfff0c0, 0.9);
  for (let i = 0; i < 16; i++) { const a = -0.5 + i * 0.26; if (Math.abs(a - 1.57) < 0.3) continue; B.box(0x8a8468, Math.cos(a) * 17, 0, Math.sin(a) * 15 + 4, 2.6, 0.95, 0.9, { yaw: -a + PI / 2 }); }
  sub(-22, 12, 0, () => { for (const sx of [-1.5, 1.5]) for (const sz of [-1.5, 1.5]) B.box(DARKWOOD, sx, 0, sz, 0.3, 6, 0.3, { nc: true }); B.box(PLANK, 0, 6, 0, 4, 0.2, 4); B.box(0x4c5540, 0, 8.4, 0, 4.6, 0.15, 4.6, { nc: true }); B.box(0x8a8468, 0, 6.2, -1.9, 4, 0.9, 0.3); stairs(1.2, 9.2, 0, 6.2, 1.2); });
  truck(20, 6, 1.4); truck(24, -4, 1.7); lattice(-14, -14, 16, 1.2, 0x55585a); barrels(12, 12, 6, 0x4c5540);
  for (const [a, b, e, f] of [[-32, -24, 32, -24], [-32, -24, -32, 28], [32, -24, 32, 28], [-32, 28, -6, 28], [6, 28, 32, 28]]) fence(a, b, e, f, 0x55585a, 2.2);
  B.spawn('warlord', 4, 3, 1, 1); B.spawn('gunner', 0, 14, 2, 5); B.spawn('gunner', -18, 0, 1, 4); B.spawn('gunner', 18, -8, 1, 4); B.spawn('raider', 8, 20, 2, 5);
}

function mast() {
  lattice(0, 0, 34, 2.4); sub(6, 3, 0.2, () => house(5, 4, { wall: 0x7c7f7e, flat: true, tier: 2, loot: 1, ln: 'Equipment locker' }));
  fence(-7, -7, 11, -7, 0x55585a, 2); fence(-7, -7, -7, 9, 0x55585a, 2); fence(11, -7, 11, 9, 0x55585a, 2); B.spawn('gunner', -2, 6, 1); B.spawn('raider', 3, 9, 1);
}

function stockade() {
  const n = 30; for (let i = 0; i < n; i++) { const a = i / n * 6.283; if (Math.abs(a - 1.57) < 0.22) continue; const x = Math.cos(a) * 16, z = Math.sin(a) * 16; B.cyl(i % 2 ? WOOD : DARKWOOD, x, -0.3, z, 0.24, 3.6 + (i % 3) * 0.3, { sides: 6, top: 0.05, nc: true }); }
  for (let i = 0; i < n; i += 1) { const a = (i + 0.5) / n * 6.283; if (Math.abs(a - 1.57) < 0.3) continue; B.box(WOOD, Math.cos(a) * 16, 0, Math.sin(a) * 16, 3.5, 3.2, 0.4, { yaw: -a + PI / 2, inv: true }); }
  tent(-6, -5, 0.6, 0x5a4a38); tent(6, -6, -0.5, 0x5a4a38); tent(0, -10, 0, 0x4a3a30); firering(0, 0, true);
  B.box(PLANK, -8, 0, 5, 3, 0.8, 1.2, { yaw: 0.3 }); B.crate(8, 0, 4, 2); B.crate(-3, 0, -8, 2); B.crate(9, 0, -2, 1); barrels(-10, -2, 3, RUST);
  for (const s of [-1, 1]) { B.cyl(DARKWOOD, s * 2.6, 0, 16, 0.2, 4.4, { sides: 6 }); B.light(s * 2.6, 4.2, 16.2, 0xff9a40, 0.7); }
  B.spawn('raider', 0, 4, 3, 6); B.spawn('gunner', 4, -4, 1, 4);
}

export function buildPlaces(W_, B_) {
  W = W_; B = B_; R = B.rnd;
  // boxes flagged inv are collision-only
  const box0 = B.box; B.box = (col, lx, ly, lz, sx, sy, sz, o = {}) => { if (o.inv) { const x = B.wx(lx, lz), z = B.wz(lx, lz), yaw = B.F.yaw + (o.yaw || 0); W.addCollider({ x, z, hx: sx / 2, hz: sz / 2, c: Math.cos(yaw), s: Math.sin(yaw), y0: B.F.y + ly, y1: B.F.y + ly + sy }); return; } box0(col, lx, ly, lz, sx, sy, sz, o); };
  const spawn0 = B.spawn; B.spawn = (type, lx, lz, n = 1, rad = 6, ly = null) => { spawn0(type, lx, lz, n, rad); if (ly != null) W.spawns[W.spawns.length - 1].y = B.F.y + ly; };
  for (const p of POI_DEFS) {
    const yaw = p.id === 'lake' ? 0 : 0; B.frame(p.x, p.z, yaw); p.build(B, W, p); B.flush();
  }
}
