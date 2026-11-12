// Hollowpine models: first-person weapons and creature rigs, all built from primitives.
import * as THREE from 'three';

const mats = new Map();
export const mat = (c, emissive = 0) => { const k = c + ':' + emissive; let m = mats.get(k); if (!m) mats.set(k, m = new THREE.MeshLambertMaterial({ color: c, emissive: emissive ? c : 0, emissiveIntensity: emissive })); return m; };
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 8), CONE = new THREE.ConeGeometry(1, 1, 6), SPH = new THREE.SphereGeometry(1, 8, 6);
function bx(g, c, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(BOX, mat(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); g.add(m); return m; }
// cylinder along z by default
function cz(g, c, x, y, z, r, len, rx = Math.PI / 2, rz = 0) { const m = new THREE.Mesh(CYL, mat(c)); m.position.set(x, y, z); m.scale.set(r, len, r); m.rotation.set(rx, 0, rz); g.add(m); return m; }

const SKIN = 0xc79a78, SLEEVE = 0x4a5140, WOODC = 0x7a5a3a, DARK = 0x3d4146, STEELC = 0x7b8188, BLACK = 0x30343a, BRASS = 0xa8873a;
function arm(g, x, y, z, rx, ry) { const a = new THREE.Group(); bx(a, SLEEVE, 0, 0, 0.19, 0.085, 0.085, 0.34); bx(a, SKIN, 0, 0, -0.02, 0.075, 0.08, 0.11); a.position.set(x, y, z); a.rotation.set(rx, ry, 0); g.add(a); return a; }
function gunArms(g, fore = -0.32, gripY = -0.1) { arm(g, 0.02, gripY, 0.08, -0.25, -0.1); arm(g, -0.07, gripY + 0.03, fore, -0.3, -0.75); }

// Each builder draws the weapon pointing down -z with its sight line at y = sight.
const V = {
  fists(g) { arm(g, 0.05, -0.1, -0.05, 0.1, 0.1); const l = arm(g, -0.5, -0.1, -0.05, 0.1, -0.1); l.name = 'left'; g.userData.melee = 1; },
  stone_axe(g, metal) { bx(g, WOODC, 0, 0.1, -0.1, 0.035, 0.62, 0.035); bx(g, metal ? STEELC : 0x8d9093, 0, 0.36, -0.17, 0.03, 0.15, 0.2); if (!metal) bx(g, 0xc9b17a, 0, 0.36, -0.1, 0.05, 0.06, 0.06); arm(g, 0.0, -0.2, 0.06, -1.2, 0); g.userData.melee = 1; },
  iron_axe(g) { V.stone_axe(g, true); },
  stone_pick(g, metal) { bx(g, WOODC, 0, 0.1, -0.1, 0.035, 0.62, 0.035); bx(g, metal ? STEELC : 0x8d9093, 0, 0.38, -0.1, 0.035, 0.05, 0.46); bx(g, metal ? STEELC : 0x8d9093, 0, 0.36, -0.31, 0.03, 0.05, 0.08, 0.5); arm(g, 0.0, -0.2, 0.06, -1.2, 0); g.userData.melee = 1; },
  iron_pick(g) { V.stone_pick(g, true); },
  club(g) { cz(g, WOODC, 0, 0.12, -0.1, 0.03, 0.66, 0); cz(g, 0x6b4e32, 0, 0.36, -0.1, 0.055, 0.3, 0); arm(g, 0.0, -0.2, 0.06, -1.2, 0); g.userData.melee = 1; },
  machete(g) { bx(g, DARK, 0, -0.08, -0.06, 0.03, 0.14, 0.035); bx(g, 0xb8c0c6, 0, 0.22, -0.07, 0.012, 0.5, 0.06); bx(g, STEELC, 0, 0.0, -0.06, 0.02, 0.02, 0.09); arm(g, 0.0, -0.2, 0.06, -1.2, 0); g.userData.melee = 1; },
  spear(g) { cz(g, WOODC, 0, 0, -0.3, 0.018, 1.7); const t = new THREE.Mesh(CONE, mat(0xe6dfc8)); t.scale.set(0.035, 0.2, 0.035); t.rotation.x = -Math.PI / 2; t.position.set(0, 0, -1.24); g.add(t); arm(g, 0.01, -0.03, 0.12, -0.1, 0); g.userData.melee = 1; g.userData.thrust = 1; },
  torch(g) { cz(g, WOODC, 0, 0.08, -0.1, 0.022, 0.55, 0); cz(g, 0x3a2c1c, 0, 0.36, -0.1, 0.04, 0.12, 0); const f = new THREE.Mesh(CONE, new THREE.MeshBasicMaterial({ color: 0xffb040 })); f.scale.set(0.06, 0.2, 0.06); f.position.set(0, 0.5, -0.1); f.name = 'flame'; g.add(f); arm(g, 0.0, -0.2, 0.06, -1.2, 0); g.userData.melee = 1; },
  bow(g) { for (const s of [-1, 1]) { bx(g, WOODC, 0, s * 0.2, -0.3, 0.02, 0.42, 0.03, s * 0.28); bx(g, WOODC, 0, s * 0.5, -0.2, 0.018, 0.3, 0.025, s * 0.7); } const st = bx(g, 0xe8e2d2, 0, 0, -0.1, 0.004, 1.2, 0.004); st.name = 'string'; const a = cz(g, 0xc9b17a, 0, 0, -0.45, 0.007, 0.8); a.name = 'arrow'; arm(g, 0.0, -0.05, -0.3, -1.2, 0); g.userData.sight = 0.0; },
  crossbow(g) { bx(g, WOODC, 0, -0.05, -0.1, 0.05, 0.06, 0.7); bx(g, WOODC, 0, -0.1, 0.2, 0.045, 0.12, 0.2); for (const s of [-1, 1]) bx(g, STEELC, s * 0.17, -0.03, -0.4, 0.36, 0.02, 0.03, 0, s * 0.3); const a = cz(g, 0x9aa4a8, 0, -0.01, -0.3, 0.007, 0.45); a.name = 'arrow'; gunArms(g, -0.2); g.userData.sight = 0.02; g.userData.muzzle = [0, 0, -0.6]; },
  flintlock(g) { bx(g, WOODC, 0, -0.06, 0.05, 0.04, 0.13, 0.06, 0.4); bx(g, WOODC, 0, -0.02, -0.1, 0.035, 0.04, 0.26); cz(g, BRASS, 0, 0.01, -0.16, 0.014, 0.36); bx(g, STEELC, 0.02, 0.03, 0.0, 0.015, 0.05, 0.03); arm(g, 0.02, -0.1, 0.1, -0.25, -0.1); g.userData.sight = 0.035; g.userData.muzzle = [0, 0.01, -0.36]; },
  musket(g) { bx(g, WOODC, 0, -0.05, 0.22, 0.045, 0.1, 0.36, 0.12); bx(g, WOODC, 0, -0.03, -0.3, 0.04, 0.045, 0.8); cz(g, STEELC, 0, 0.005, -0.45, 0.013, 1.15); bx(g, BRASS, 0.025, 0.02, 0.0, 0.015, 0.05, 0.04); for (const z of [-0.2, -0.6]) bx(g, BRASS, 0, -0.01, z, 0.048, 0.05, 0.02); gunArms(g, -0.4); g.userData.sight = 0.03; g.userData.muzzle = [0, 0.005, -1.05]; },
  revolver(g) { bx(g, WOODC, 0, -0.08, 0.05, 0.035, 0.13, 0.05, 0.35); bx(g, STEELC, 0, -0.01, -0.02, 0.03, 0.05, 0.12); cz(g, STEELC, 0, -0.005, -0.03, 0.028, 0.07); cz(g, STEELC, 0, 0.012, -0.17, 0.011, 0.2); bx(g, STEELC, 0, 0.03, -0.26, 0.006, 0.014, 0.01); arm(g, 0.02, -0.1, 0.1, -0.25, -0.1); g.userData.sight = 0.04; g.userData.muzzle = [0, 0.012, -0.28]; },
  bolt_rifle(g) { bx(g, 0x6e5133, 0, -0.05, 0.24, 0.045, 0.1, 0.34, 0.12); bx(g, 0x6e5133, 0, -0.03, -0.2, 0.042, 0.05, 0.62); cz(g, DARK, 0, 0.008, -0.4, 0.012, 1.05); bx(g, DARK, 0, 0.01, 0.02, 0.03, 0.035, 0.2); cz(g, STEELC, 0.05, 0.01, 0.06, 0.008, 0.07, 0, Math.PI / 2); bx(g, DARK, 0, 0.035, -0.9, 0.005, 0.02, 0.01); gunArms(g, -0.36); g.userData.sight = 0.04; g.userData.muzzle = [0, 0.008, -0.94]; },
  service_rifle(g) { V.bolt_rifle(g); cz(g, DARK, 0, -0.012, -0.55, 0.008, 0.55); bx(g, DARK, 0, 0.04, 0.0, 0.02, 0.02, 0.03); },
  smg(g) { cz(g, DARK, 0, 0, -0.1, 0.022, 0.5); cz(g, DARK, 0, 0, -0.42, 0.011, 0.2); bx(g, DARK, 0, -0.08, 0.06, 0.03, 0.12, 0.04, 0.3); bx(g, 0x33373b, 0, -0.14, -0.12, 0.024, 0.24, 0.04); bx(g, DARK, 0, -0.02, 0.3, 0.012, 0.012, 0.3); bx(g, DARK, 0, -0.06, 0.44, 0.012, 0.09, 0.012); bx(g, DARK, 0, 0.03, -0.3, 0.005, 0.02, 0.01); gunArms(g, -0.14, -0.1); g.userData.sight = 0.04; g.userData.muzzle = [0, 0, -0.53]; },
  trench_gun(g) { bx(g, 0x6e5133, 0, -0.05, 0.24, 0.045, 0.1, 0.34, 0.12); bx(g, DARK, 0, -0.005, -0.02, 0.04, 0.06, 0.26); cz(g, DARK, 0, 0.012, -0.5, 0.015, 0.75); cz(g, DARK, 0, -0.02, -0.42, 0.013, 0.55); const p = cz(g, 0x6e5133, 0, -0.02, -0.36, 0.026, 0.2); p.name = 'pump'; gunArms(g, -0.34); g.userData.sight = 0.04; g.userData.muzzle = [0, 0.012, -0.88]; },
  pistol(g) { bx(g, BLACK, 0, -0.08, 0.05, 0.03, 0.13, 0.05, 0.25); bx(g, 0x33373b, 0, 0.0, -0.05, 0.03, 0.04, 0.2); bx(g, BLACK, 0, -0.025, -0.06, 0.028, 0.02, 0.16); bx(g, BLACK, 0, 0.026, -0.14, 0.005, 0.012, 0.008); arm(g, 0.02, -0.1, 0.1, -0.25, -0.1); arm(g, -0.06, -0.12, 0.06, -0.25, -0.5); g.userData.sight = 0.035; g.userData.muzzle = [0, 0.0, -0.16]; },
  assault_rifle(g) { bx(g, BLACK, 0, 0, -0.02, 0.045, 0.07, 0.34); bx(g, 0x2c3034, 0, 0, -0.36, 0.045, 0.05, 0.34); cz(g, BLACK, 0, 0.005, -0.64, 0.01, 0.24); bx(g, BLACK, 0, -0.09, 0.08, 0.03, 0.12, 0.045, 0.3); bx(g, 0x2c3034, 0, -0.13, -0.08, 0.026, 0.2, 0.06, -0.2); bx(g, BLACK, 0, -0.01, 0.3, 0.035, 0.07, 0.28); bx(g, BLACK, 0, 0.045, -0.1, 0.02, 0.012, 0.5); bx(g, BLACK, 0, 0.065, 0.05, 0.02, 0.03, 0.02); bx(g, BLACK, 0, 0.06, -0.5, 0.008, 0.035, 0.012); gunArms(g, -0.3, -0.11); g.userData.sight = 0.075; g.userData.muzzle = [0, 0.005, -0.77]; },
  combat_shotgun(g) { bx(g, BLACK, 0, 0, -0.02, 0.045, 0.07, 0.34); cz(g, BLACK, 0, 0.012, -0.5, 0.016, 0.7); cz(g, 0x2c3034, 0, -0.022, -0.4, 0.016, 0.5); bx(g, 0x2c3034, 0, -0.01, -0.34, 0.05, 0.06, 0.26); bx(g, BLACK, 0, -0.09, 0.08, 0.03, 0.12, 0.045, 0.3); bx(g, BLACK, 0, -0.01, 0.3, 0.035, 0.07, 0.28); bx(g, BLACK, 0, 0.045, -0.02, 0.01, 0.02, 0.01); gunArms(g, -0.34, -0.11); g.userData.sight = 0.05; g.userData.muzzle = [0, 0.012, -0.86]; },
  marksman(g) { bx(g, 0x2f3a33, 0, -0.02, 0.0, 0.05, 0.08, 0.5); bx(g, 0x2f3a33, 0, -0.04, 0.34, 0.04, 0.1, 0.28); bx(g, 0x2f3a33, 0, 0.02, 0.36, 0.035, 0.03, 0.18); cz(g, BLACK, 0, 0.005, -0.62, 0.013, 0.9); cz(g, BLACK, 0, 0.005, -1.1, 0.02, 0.12); cz(g, BLACK, 0, 0.075, -0.05, 0.026, 0.34); cz(g, BLACK, 0, 0.075, -0.24, 0.032, 0.06); for (const z of [-0.14, 0.04]) bx(g, BLACK, 0, 0.045, z, 0.02, 0.03, 0.02); bx(g, BLACK, 0, -0.1, 0.1, 0.03, 0.12, 0.045, 0.3); bx(g, 0x2c3034, 0, -0.09, -0.06, 0.026, 0.1, 0.07); gunArms(g, -0.34, -0.12); g.userData.sight = 0.075; g.userData.muzzle = [0, 0.005, -1.16]; },
};
export function viewModel(id) { const g = new THREE.Group(); (V[id] || V.fists)(g); g.traverse((m) => { if (m.isMesh) { m.frustumCulled = false; m.renderOrder = 5; } }); return g; }

// ---- creatures
function limb(parent, c, x, y, z, w, len, d) { const p = new THREE.Group(); p.position.set(x, y, z); const m = new THREE.Mesh(BOX, mat(c)); m.scale.set(w, len, d); m.position.y = -len / 2; m.castShadow = true; p.add(m); parent.add(p); return p; }
function part(parent, c, x, y, z, sx, sy, sz, rx = 0) { const m = new THREE.Mesh(BOX, mat(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.x = rx; m.castShadow = true; parent.add(m); return m; }
const shade = (c, k) => { const q = new THREE.Color(c).multiplyScalar(k); return q.getHex(); };

export function mobModel(type, def) {
  const g = new THREE.Group(), s = def.size || 1, c = def.color, rig = { g, legs: [], arms: [], head: null, h: 1 };
  if (def.body === 'quad') {
    const deer = type === 'deer', bear = type === 'bear', boar = type === 'boar';
    const L = (deer ? 1.25 : bear ? 1.5 : 1.15) * s, Hh = (deer ? 0.95 : bear ? 0.95 : boar ? 0.55 : 0.62) * s, w = (bear ? 0.8 : boar ? 0.48 : 0.36) * s, bh = (bear ? 0.75 : boar ? 0.5 : 0.4) * s;
    part(g, c, 0, Hh + bh / 2 - 0.05, 0, w, bh, L); part(g, shade(c, 0.85), 0, Hh + bh * 0.6, L * 0.3, w * 1.06, bh * 0.9, L * 0.42);
    const head = new THREE.Group(); head.position.set(0, Hh + bh * (deer ? 1.25 : 0.75), L / 2 + 0.05); g.add(head); rig.head = head;
    if (deer) part(g, c, 0, Hh + bh * 0.95, L / 2 - 0.02, w * 0.5, bh * 1.1, 0.2 * s, 0.5);
    part(head, c, 0, 0, 0.1 * s, w * (bear ? 0.75 : 0.72), bh * (bear ? 0.7 : 0.62), 0.34 * s); part(head, shade(c, 0.7), 0, -0.05 * s, 0.34 * s, w * 0.4, bh * 0.34, 0.24 * s);
    for (const sx of [-1, 1]) { part(head, shade(c, 0.8), sx * w * 0.27, bh * 0.38, 0.02, 0.07 * s, 0.13 * s, 0.05 * s); if (deer) { part(head, 0xd8ccb0, sx * 0.12 * s, 0.34 * s, 0, 0.03, 0.45 * s, 0.03, 0); part(head, 0xd8ccb0, sx * 0.2 * s, 0.46 * s, 0.06, 0.03, 0.2 * s, 0.03, 0.8); } if (boar) part(head, 0xe6dfc8, sx * 0.09 * s, -0.08 * s, 0.4 * s, 0.025, 0.1 * s, 0.025, -0.4); }
    for (const sz of [1, -1]) for (const sx of [-1, 1]) rig.legs.push(limb(g, shade(c, 0.8), sx * (w / 2 - 0.05 * s), Hh, sz * (L / 2 - 0.12 * s), (bear ? 0.2 : 0.1) * s, Hh, (bear ? 0.22 : 0.11) * s));
    part(g, shade(c, 0.8), 0, Hh + bh * 0.7, -L / 2 - 0.1 * s, 0.07 * s, 0.07 * s, (type === 'wolf' ? 0.42 : 0.14) * s, type === 'wolf' ? 0.5 : 0);
    rig.h = Hh + bh; rig.r = Math.max(w, L * 0.42);
  } else {
    const pants = shade(c, 0.6), boss = type === 'warlord';
    part(g, c, 0, 1.18, 0, 0.46, 0.62, 0.26); part(g, shade(c, 0.8), 0, 0.84, 0, 0.42, 0.14, 0.24);
    const head = new THREE.Group(); head.position.set(0, 1.62, 0); g.add(head); rig.head = head;
    part(head, 0xb98f70, 0, 0, 0, 0.22, 0.25, 0.23); part(head, boss ? 0x2a2c2e : type === 'gunner' ? 0x3d4438 : 0x4a3a2c, 0, 0.1, -0.01, 0.25, 0.13, 0.26); part(head, 0x2a2420, 0, -0.05, 0.1, 0.23, 0.11, 0.06);
    if (boss) { part(g, 0x3a3d40, 0, 1.2, 0.02, 0.52, 0.5, 0.32); part(head, 0x1e2022, 0, 0.0, 0.11, 0.24, 0.08, 0.04); }
    for (const sx of [-1, 1]) { rig.legs.push(limb(g, pants, sx * 0.12, 0.8, 0, 0.17, 0.8, 0.19)); rig.arms.push(limb(g, c, sx * 0.3, 1.45, 0, 0.13, 0.62, 0.14)); }
    const wp = new THREE.Group(); wp.position.set(0, -0.58, 0.05); rig.arms[1].add(wp);
    if (def.ranged) { part(wp, 0x2a2c2e, 0, 0, 0.25, 0.05, 0.07, 0.8); part(wp, 0x5a4630, 0, -0.03, -0.12, 0.05, 0.1, 0.3); rig.arms[1].rotation.x = -1.35; rig.arms[0].rotation.x = -1.1; rig.arms[0].rotation.z = -0.5; }
    else { part(wp, 0xb8c0c6, 0, 0.0, 0.3, 0.02, 0.06, 0.55); part(wp, 0x2a2c2e, 0, 0, 0.02, 0.035, 0.04, 0.14); }
    g.scale.setScalar(s); rig.h = 1.8 * s; rig.r = 0.34 * s; rig.human = true;
  }
  return rig;
}

export const PRIM = { BOX, CYL, CONE, SPH };
