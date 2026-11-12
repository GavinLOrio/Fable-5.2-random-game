// Hollowpine creatures: wildlife and scavengers. Simple state machines over the shared collision world.
import { MOBS, LOOT } from './data.js';
import { mobModel } from './models.js';

const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1));
export function rollLoot(table, n) { const out = {}; let tot = 0; for (const e of table) tot += e[3]; for (let i = 0; i < n; i++) { let q = Math.random() * tot; for (const e of table) { q -= e[3]; if (q <= 0) { out[e[0]] = (out[e[0]] || 0) + ri(e[1], e[2]); break; } } } return out; }

export function createMobs(scene, W, G) {
  const M = { list: [] }, P = G.player, pos = { x: 0, z: 0 };
  M.spawn = (type, x, z, y = null, sp = null) => {
    const def = MOBS[type], rig = mobModel(type, def);
    const m = { type, def, rig, x, z, y: y != null ? y : W.H(x, z), vy: 0, yaw: Math.random() * 6.28, hp: def.hp, state: 'idle', t: rnd(0, 3), tx: x, tz: z, hx: x, hz: z, cd: 0, phase: Math.random() * 6, sp, alert: 0, steer: 0, steerT: 0, los: false, losT: Math.random(), wind: 0, dead: 0, speed: 0, ambient: !sp };
    rig.g.position.set(x, m.y, z); scene.add(rig.g); M.list.push(m); return m;
  };
  const remove = (m) => { scene.remove(m.rig.g); const i = M.list.indexOf(m); if (i >= 0) M.list.splice(i, 1); };
  M.clear = () => { for (const m of M.list.slice()) remove(m); for (const s of W.spawns) { s.alive = 0; } };

  M.damage = (m, dmg, head) => {
    if (m.dead) return false; m.hp -= dmg * (head ? 2.2 : 1); m.alert = 12; if (m.def.passive) { m.state = 'flee'; m.t = 6; }
    if (m.hp <= 0) { m.dead = 0.001; m.state = 'dead'; if (m.sp) { m.sp.alive--; if (m.sp.alive <= 0) m.sp.day = G.day(); } G.sfx(m.rig.human ? 'die' : 'yelp', m); return true; }
    // pack: nearby kin join in
    for (const o of M.list) if (o !== m && !o.dead && !o.def.passive && Math.hypot(o.x - m.x, o.z - m.z) < 30) o.alert = Math.max(o.alert, 10);
    return false;
  };
  M.alertNear = (x, z, r) => { for (const m of M.list) if (!m.dead && Math.hypot(m.x - x, m.z - z) < r) { if (m.def.passive) { m.state = 'flee'; m.t = 6; } else m.alert = Math.max(m.alert, 9); } };
  // ray against creatures: returns distance, fills M.hit
  M.hit = { m: null, head: false };
  M.ray = (ox, oy, oz, dx, dy, dz, max) => {
    let best = max; M.hit.m = null;
    const sph = (m, cx, cy, cz, r, head) => { const fx = cx - ox, fy = cy - oy, fz = cz - oz, t = fx * dx + fy * dy + fz * dz; if (t < 0 || t > best + r) return; const px = fx - dx * t, py = fy - dy * t, pz = fz - dz * t, d2 = px * px + py * py + pz * pz; if (d2 > r * r) return; const tt = t - Math.sqrt(r * r - d2); if (tt < best && tt > -r) { best = Math.max(0, tt); M.hit.m = m; M.hit.head = head; } };
    for (const m of M.list) {
      if (m.dead) continue; const s = m.def.size || 1;
      if (m.rig.human) { sph(m, m.x, m.y + 1.0 * s, m.z, 0.42 * s, false); sph(m, m.x, m.y + 0.45 * s, m.z, 0.3 * s, false); sph(m, m.x, m.y + 1.64 * s, m.z, 0.19 * s, true); }
      else { const r = Math.max(m.rig.r, m.rig.h * 0.42); sph(m, m.x, m.y + m.rig.h * 0.62, m.z, r, false); sph(m, m.x + Math.sin(m.yaw) * r, m.y + m.rig.h * 0.8, m.z + Math.cos(m.yaw) * r, r * 0.6, true); }
    }
    return best;
  };
  M.corpseNear = (x, y, z, r) => { let best = null, bd = r; for (const m of M.list) if (m.dead && !m.looted) { const d = Math.hypot(m.x - x, m.z - z, m.y - y); if (d < bd) { bd = d; best = m; } } return best; };
  M.loot = (m) => { m.looted = true; m.dead = Math.max(m.dead, 110); const out = {}; for (const k in m.def.loot) { const n = ri(m.def.loot[k][0], m.def.loot[k][1]); if (n) out[k] = n; } if (m.def.extra) { const e = rollLoot(m.def.extra, 1); for (const k in e) out[k] = (out[k] || 0) + e[k]; } return out; };

  function move(m, dt, speed) {
    const dx = m.tx - m.x, dz = m.tz - m.z, d = Math.hypot(dx, dz); if (d < 0.3) { m.speed = 0; return true; }
    let a = Math.atan2(dx, dz); if (m.steerT > 0) { a += m.steer; m.steerT -= dt; }
    let da = a - m.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; m.yaw += Math.max(-dt * 6, Math.min(dt * 6, da));
    const st = Math.min(d, speed * dt), nx = m.x + Math.sin(m.yaw) * st, nz = m.z + Math.cos(m.yaw) * st;
    if (W.H(nx, nz) < -0.7 && m.y < 1.5 && W.H(m.x, m.z) >= W.H(nx, nz)) { m.steer = Math.random() < 0.5 ? 2 : -2; m.steerT = 1; m.speed = 0; return false; }
    pos.x = nx; pos.z = nz;
    const g = W.resolve(pos, m.rig.r, m.y, m.rig.h), hit = W.res.hit, tr = W.collideTrees(pos, m.rig.r);
    if ((hit || tr) && m.steerT <= 0) { m.steer = Math.random() < 0.5 ? 1.3 : -1.3; m.steerT = 0.5 + Math.random() * 0.5; }
    m.blocked = hit; m.x = pos.x; m.z = pos.z; m.speed = speed; m.phase += speed * dt * (m.rig.human ? 2.2 : 2.6) / (m.def.size || 1);
    m.ground = Math.max(W.H(m.x, m.z), g); return false;
  }
  function wander(m, r = 14) { const a = Math.random() * 6.28, d = rnd(4, r); let x = m.hx + Math.sin(a) * d, z = m.hz + Math.cos(a) * d; if (m.ambient) { x = m.x + Math.sin(a) * d; z = m.z + Math.cos(a) * d; } if (W.H(x, z) > 0.5) { m.tx = x; m.tz = z; } }

  let spawnT = 0;
  M.update = (dt) => {
    const night = G.isNight(), px = P.x, pz = P.z, py = P.y;
    for (let i = M.list.length - 1; i >= 0; i--) {
      const m = M.list[i], rig = m.rig, dx = px - m.x, dz = pz - m.z, d = Math.hypot(dx, dz);
      if (m.dead) { m.dead += dt; rig.g.rotation.z = Math.min(1.5, m.dead * 4); rig.g.position.y = m.y + Math.min(0.15, m.dead) * (rig.human ? 1 : 0.5); if (m.dead > 120 || (d > 220)) remove(m); continue; }
      if (d > 240) { if (m.sp) m.sp.alive--; remove(m); continue; }
      if (d > 130) { rig.g.visible = false; continue; } rig.g.visible = true;
      const def = m.def, sightK = (P.crouch ? 0.55 : 1) * (night && !P.lit ? 0.7 : 1) * (type(m) === 'wolf' && night ? 1.4 : 1);
      m.losT -= dt; if (m.losT <= 0) { m.losT = 0.35 + Math.random() * 0.2; const ey = m.y + rig.h * 0.85, vx = px - m.x, vy = py + 1.5 - ey, vz = pz - m.z, L = Math.hypot(vx, vy, vz) || 1; m.los = d < 110 && W.ray(m.x, ey, m.z, vx / L, vy / L, vz / L, L) >= L - 0.4; }
      const sees = !P.dead && m.los && d < def.sight * sightK; if (sees && !def.passive) m.alert = Math.max(m.alert, 5);
      m.alert -= dt; m.cd -= dt; m.t -= dt; m.blocked = null; m.ground = W.H(m.x, m.z);
      let spd = 0;
      if (def.passive) {
        if (sees || m.state === 'flee') { if (sees) { m.state = 'flee'; m.t = Math.max(m.t, 3); } if (m.t <= 0) m.state = 'idle'; m.tx = m.x - dx / (d || 1) * 20; m.tz = m.z - dz / (d || 1) * 20; spd = def.speed; move(m, dt, spd); }
        else if (m.state === 'wander') { if (move(m, dt, 1.2) || m.t <= 0) { m.state = 'idle'; m.t = rnd(2, 7); } }
        else if (m.t <= 0) { m.state = 'wander'; m.t = 8; wander(m); }
      } else if (m.alert > 0 && !P.dead) {
        const reach = 1.3 + rig.r, dy = Math.abs(py - m.y);
        if (def.ranged && m.los && d < 55) {
          // hold range and shoot
          let da = Math.atan2(dx, dz) - m.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; m.yaw += Math.max(-dt * 5, Math.min(dt * 5, da));
          if (d > 34) { m.tx = px; m.tz = pz; move(m, dt, def.speed * 0.8); } else if (d < 9) { m.tx = m.x - dx; m.tz = m.z - dz; move(m, dt, def.speed * 0.7); } else m.speed = 0;
          if (m.cd <= 0 && Math.abs(da) < 0.3) { m.cd = def.rate * rnd(0.8, 1.3); m.wind = 0.12; const chance = Math.max(0.08, Math.min(0.8, 0.78 - d / 90 - (P.moving ? 0.16 : 0) - (P.crouch ? 0.1 : 0))); G.enemyShot(m, Math.random() < chance); }
        } else if (d < reach && dy < 2.2) {
          m.speed = 0; let da = Math.atan2(dx, dz) - m.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; m.yaw += da * Math.min(1, dt * 8);
          if (m.cd <= 0) { m.cd = def.rate; m.wind = 0.3; m.strike = 0.22; }
        } else {
          m.tx = px; m.tz = pz; spd = def.speed * (type(m) === 'boar' ? 1.15 : 1); move(m, dt, spd);
          if (m.blocked && m.blocked.struct && m.cd <= 0) { m.cd = def.rate; m.wind = 0.3; G.hitStruct(m.blocked.struct, def.dmg * 1.3, m); }
          if (m.blocked && m.blocked.struct && m.blocked.struct.type === 'spikes') { m.hp -= 14 * dt; if (m.hp <= 0) M.damage(m, 1); }
        }
        if (m.strike > 0) { m.strike -= dt; if (m.strike <= 0 && d < reach + 0.5 && dy < 2.4) G.hurtPlayer(def.dmg, m); }
        if (m.alert <= 0) { m.state = 'idle'; m.t = 1; m.hx = m.sp ? m.hx : m.x; m.hz = m.sp ? m.hz : m.z; }
      } else {
        if (type(m) === 'boar' && d < 7 && m.los) m.alert = 6;
        if (m.state === 'wander') { if (move(m, dt, rig.human ? 1.3 : 1.5) || m.t <= 0) { m.state = 'idle'; m.t = rnd(2, 8); } }
        else { m.speed = 0; if (m.t <= 0) { m.state = 'wander'; m.t = 9; wander(m, rig.human ? 10 : 22); } }
      }
      // vertical
      if (m.y > m.ground + 0.02) { m.vy -= 22 * dt; m.y += m.vy * dt; if (m.y < m.ground) { m.y = m.ground; m.vy = 0; } } else { m.y = m.ground; m.vy = 0; }
      const wl = W.waterLevel(m.x, m.z); if (m.y < wl - rig.h * 0.6 && W.inWater(m.x, m.z)) m.y = wl - rig.h * 0.6;
      // pose
      rig.g.position.set(m.x, m.y, m.z); rig.g.rotation.set(0, m.yaw, 0);
      const sw = m.speed > 0.1 ? Math.sin(m.phase) * Math.min(0.9, 0.3 + m.speed * 0.09) : 0;
      if (rig.human) { rig.legs[0].rotation.x = sw; rig.legs[1].rotation.x = -sw; if (!def.ranged) { rig.arms[0].rotation.x = -sw * 0.8; rig.arms[1].rotation.x = m.wind > 0 ? -2.4 + (0.3 - m.wind) * 7 : sw * 0.8 - 0.3; } else rig.arms[1].rotation.x = -1.35 - (m.wind > 0 ? 0.25 : 0); }
      else { rig.legs[0].rotation.x = sw; rig.legs[1].rotation.x = -sw; rig.legs[2].rotation.x = -sw; rig.legs[3].rotation.x = sw; rig.head.rotation.x = m.wind > 0 ? -0.5 : (m.state === 'idle' && def.passive && m.t > 2 ? 0.7 : 0); }
      if (m.wind > 0) m.wind -= dt;
      if (!def.passive && m.alert > 0 && Math.random() < dt * 0.25 && d < 40) G.sfx(rig.human ? 'shout' : 'growl', m);
    }
    // ---- spawning
    spawnT -= dt; if (spawnT > 0) return; spawnT = 1.5;
    const day = G.day();
    for (const s of W.spawns) {
      if (s.alive > 0 || day - s.day < 2) continue; const d = Math.hypot(s.x - px, s.z - pz); if (d > 190 || d < 40) continue;
      for (let i = 0; i < s.n; i++) { const a = Math.random() * 6.28, r = i ? rnd(1, s.rad) : 0, x = s.x + Math.sin(a) * r, z = s.z + Math.cos(a) * r; pos.x = x; pos.z = z; W.resolve(pos, 0.4, s.y != null ? s.y : W.H(x, z), 1.8); const m = M.spawn(s.type, pos.x, pos.z, s.y != null ? s.y : null, s); m.hx = s.x; m.hz = s.z; s.alive++; }
    }
    let amb = 0; for (const m of M.list) if (m.ambient && !m.dead) amb++;
    if (amb < (night ? 11 : 8)) {
      const a = Math.random() * 6.28, r = rnd(70, 125), x = px + Math.sin(a) * r, z = pz + Math.cos(a) * r;
      if (W.wild(x, z) && W.H(x, z) > 2.5) {
        const h = W.H(x, z), early = G.dayFloat() < 1.3, q = Math.random();
        let t; if (night) t = q < 0.5 ? 'wolf' : q < 0.65 ? 'deer' : q < 0.82 ? 'boar' : 'bear'; else t = q < 0.45 ? 'deer' : q < 0.7 ? 'boar' : q < 0.92 ? 'wolf' : 'bear';
        if (h > 70 && q > 0.6) t = 'bear'; if (early && (t === 'bear' || (t === 'wolf' && !night))) t = 'deer';
        const n = t === 'wolf' ? ri(2, 3) : t === 'deer' ? ri(1, 3) : 1; for (let i = 0; i < n; i++) M.spawn(t, x + rnd(-5, 5), z + rnd(-5, 5));
      }
    }
  };
  const type = (m) => m.type;
  return M;
}
