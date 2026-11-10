import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld, part, T, mergeGeometries, makeLitMaterial, BIOME_NAMES, biomeWeights, BEACON_R, CROWN_R, SIZE, HALF } from './world.js';
import { createFx } from './fx.js';
import { createInput } from './input.js';
import { initAudio, sfx, musicTick, setMuted, isMuted, suspendAudio } from './audio.js';
import { clamp, lerp, damp, angleLerp, smoothstep, TAU } from './util.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'dawnward-save-v1';
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');

function boot() {
  const canvas = $('c');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    $('loadText').textContent = 'This device could not start 3D graphics (WebGL).';
    return;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2400);
  const world = createWorld(scene, { low: isTouch });
  const fx = createFx(scene, camera);
  const input = createInput(canvas);

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: isTouch ? 0 : 4, stencilBuffer: true }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.75, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const PR_STEPS = [Math.min(window.devicePixelRatio || 1, 1.5), 1.25, 1, 0.8, 0.65].filter((v, i, a) => i === 0 || v < a[0]);
  let prIdx = 0, W = 1, H = 1;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    const pr = PR_STEPS[prIdx];
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    composer.setPixelRatio(pr); composer.setSize(W, H);
    camera.aspect = W / H; camera.fov = W < H ? 62 : 50; camera.updateProjectionMatrix();
    const sc = (H * pr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    fx.setScale(sc); world.flyMat.uniforms.uScale.value = sc;
  }
  window.addEventListener('resize', resize);
  resize();

  // =====================================================================
  // Definitions
  // =====================================================================
  const ICON = {
    spark: '<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
    wisps: '<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="4" r="1.8"/><circle cx="19" cy="16" r="1.8"/><circle cx="5" cy="16" r="1.8"/>',
    nova: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="10"/>',
    chain: '<path d="M13 2L5 13h6l-1 9 9-12h-6z"/>',
    comet: '<circle cx="8" cy="16" r="4"/><path d="M11 13l9-9M13.5 16.5L20 10M7.5 10.5L14 4"/>',
    vigor: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    swift: '<path d="M4 7l6 5-6 5M11 7l6 5-6 5M18 7v10"/>',
    magnet: '<path d="M6 3v9a6 6 0 0 0 12 0V3h-4v9a2 2 0 0 1-4 0V3zM6 7h4M14 7h4"/>',
    might: '<path d="M14 4l6 0 0 6M20 4L9 15M6 13l5 5M4 20l4-4"/>',
    haste: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>',
    regen: '<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="10"/>',
    fortune: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>',
    guard: '<path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z"/>',
    heal: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M12 9v5M9.5 11.5h5"/>',
    stardust: '<path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>',
  };
  const svg = (id) => `<svg viewBox="0 0 24 24">${ICON[id]}</svg>`;
  const UP = {
    spark: { n: 'Spark Bolt', w: 1, max: 6, d: ['', 'Fire two bolts at once. More damage.', 'More damage and faster casting.', 'Fire three bolts at once.', 'Bolts pierce through the first foe.', 'Fire four bolts at once. More damage.'] },
    wisps: { n: 'Ember Wisps', w: 1, max: 6, d: ['Two wisps circle you, burning what they touch.', 'A third wisp joins the ring.', 'Wisps burn hotter and swing wider.', 'A fourth wisp joins the ring.', 'A fifth wisp. More damage.', 'Six wisps. Much more damage.'] },
    nova: { n: 'Dawn Pulse', w: 1, max: 6, d: ['A ring of light bursts from you, hurling foes back.', 'Larger pulse. More damage.', 'Pulses more often.', 'Larger pulse. More damage.', 'Pulses more often.', 'Huge pulse. Much more damage.'] },
    chain: { n: 'Storm Thread', w: 1, max: 6, d: ['Lightning leaps between nearby foes.', 'One more leap. More damage.', 'Strikes more often.', 'One more leap. More damage.', 'Strikes more often.', 'Two more leaps. Much more damage.'] },
    comet: { n: 'Starfall', w: 1, max: 6, d: ['Call a falling star down on a foe.', 'More damage, wider blast.', 'Two stars fall at once.', 'More damage, falls more often.', 'More damage, wider blast.', 'Three stars fall at once.'] },
    vigor: { n: 'Vigor', max: 5, d: '+25 maximum health, and heal 25.' },
    swift: { n: 'Fleetfoot', max: 5, d: '+7% movement speed.' },
    magnet: { n: 'Lodestone', max: 5, d: '+35% pickup range.' },
    might: { n: 'Might', max: 5, d: '+12% damage with everything.' },
    haste: { n: 'Quickening', max: 5, d: 'Everything recharges 8% faster.' },
    regen: { n: 'Mending', max: 5, d: 'Recover +0.7 health every second.' },
    fortune: { n: 'Keen Eye', max: 5, d: '+8% chance to strike for double damage.' },
    guard: { n: 'Bulwark', max: 5, d: 'Take 9% less damage.' },
    heal: { n: 'Restoration', filler: 1, d: 'Recover half of your health.' },
    stardust: { n: 'Stardust', filler: 1, d: '+3% damage, forever.' },
  };
  const ET = {
    shade: { hp: 20, spd: 5.4, dmg: 8, r: 0.8, xp: 1, h: 1.5 },
    brute: { hp: 120, spd: 3.5, dmg: 18, r: 1.7, xp: 6, h: 3.4 },
    spitter: { hp: 42, spd: 4.2, dmg: 8, r: 0.9, xp: 3, h: 2.8 },
    wraith: { hp: 34, spd: 7.4, dmg: 11, r: 0.8, xp: 3, h: 3.0 },
  };
  const BOSS_HP = 14000;

  // =====================================================================
  // Player
  // =====================================================================
  const P = {
    x: world.START.x, z: world.START.z, y: 0, facing: Math.PI, hp: 100, maxHp: 100, level: 1, xp: 0, up: { spark: 1 }, stardust: 0,
    speed: 9.5, pickup: 4.5, dmgMul: 1, cdMul: 1, regen: 0, crit: 0.05, guard: 1,
    invuln: 0, dashT: 0, dashCd: 0, dashX: 0, dashZ: 1, moving: false, anim: 0, hurtT: 0,
    kills: 0, time: 0, shards: 0, won: false, wt: { spark: 0.5, nova: 2, chain: 1, comet: 1.5 }, wispA: 0,
  };
  P.y = world.getHeight(P.x, P.z);
  const lit = () => world.beacons.reduce((n, b) => n + (b.lit ? 1 : 0), 0);
  function recompute() {
    const u = P.up, g = (k) => u[k] || 0;
    P.maxHp = 100 + 25 * g('vigor');
    P.speed = 9.5 * (1 + 0.07 * g('swift'));
    P.pickup = 4.5 * (1 + 0.35 * g('magnet'));
    P.dmgMul = (1 + 0.12 * g('might')) * (1 + 0.02 * P.shards + 0.03 * P.stardust);
    P.cdMul = Math.pow(0.92, g('haste'));
    P.regen = 0.7 * g('regen');
    P.crit = 0.05 + 0.08 * g('fortune');
    P.guard = Math.pow(0.91, g('guard'));
    P.hp = Math.min(P.hp, P.maxHp);
  }
  const xpNeed = (l) => Math.floor(4 + l * 2.8 + l * l * 0.26);

  // --- player model (forward = +z)
  const hero = new THREE.Group();
  const STENCIL = { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp };
  const heroMat = makeLitMaterial(STENCIL);
  const heroBody = new THREE.Mesh(mergeGeometries([
    part(new THREE.CylinderGeometry(0.26, 0.62, 1.15, 8), 0x2f63b8, T(0, 0.85, 0)),
    part(new THREE.CylinderGeometry(0.63, 0.66, 0.12, 8), 0xe9c46a, T(0, 0.3, 0)),
    part(new THREE.SphereGeometry(0.36, 10, 8), 0xffdfc0, T(0, 1.7, 0)),
    part(new THREE.TorusGeometry(0.29, 0.11, 6, 10), 0xe8553d, T(0, 1.4, 0, 1, 1, 1, Math.PI / 2, 0, 0)),
    part(new THREE.BoxGeometry(0.16, 0.5, 0.08), 0xe8553d, T(-0.12, 1.15, -0.34, 1, 1, 1, 0.35, 0, 0)),
    part(new THREE.CylinderGeometry(0.66, 0.7, 0.07, 12), 0x24408f, T(0, 1.96, 0, 1, 1, 1, -0.08, 0, 0)),
    part(new THREE.ConeGeometry(0.4, 0.95, 10), 0x2b4ba6, T(0, 2.45, -0.06, 1, 1, 1, -0.16, 0, 0)),
    part(new THREE.CylinderGeometry(0.4, 0.41, 0.12, 10), 0xe9c46a, T(0, 2.06, -0.01, 1, 1, 1, -0.08, 0, 0)),
    part(new THREE.SphereGeometry(0.055, 6, 5), 0x1a1a2a, T(-0.13, 1.74, 0.33)),
    part(new THREE.SphereGeometry(0.055, 6, 5), 0x1a1a2a, T(0.13, 1.74, 0.33)),
  ]), heroMat);
  heroBody.castShadow = true; heroBody.renderOrder = 2;
  const footGeo = part(new THREE.BoxGeometry(0.22, 0.2, 0.36), 0x4a3020);
  const footL = new THREE.Mesh(footGeo, heroMat), footR = new THREE.Mesh(footGeo, heroMat);
  footL.renderOrder = footR.renderOrder = 2; footL.position.set(-0.2, 0.1, 0.04); footR.position.set(0.2, 0.1, 0.04);
  const staff = new THREE.Group();
  const staffMesh = new THREE.Mesh(mergeGeometries([
    part(new THREE.CylinderGeometry(0.045, 0.055, 2.3, 5), 0x6b4a2f, T(0, 1.15, 0)),
    part(new THREE.SphereGeometry(0.12, 6, 5), 0xffdfc0, T(-0.06, 1.2, 0)),
    part(new THREE.TorusGeometry(0.2, 0.035, 5, 8), 0xe9c46a, T(0, 2.45, 0)),
  ]), heroMat);
  staffMesh.castShadow = true; staffMesh.renderOrder = 2;
  const lanternMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.3, 0.9) });
  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), lanternMat);
  lantern.position.y = 2.45;
  staff.add(staffMesh, lantern); staff.position.set(0.62, 0, 0.18);
  // silhouettes drawn only where something hides the hero / foes
  const ghostMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.45, depthFunc: THREE.GreaterDepth, depthWrite: false, fog: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc });
  const heroGhostMat = ghostMat(new THREE.Color(0.3, 0.5, 0.85));
  const hg1 = new THREE.Mesh(heroBody.geometry, heroGhostMat), hg2 = new THREE.Mesh(staffMesh.geometry, heroGhostMat);
  hg1.renderOrder = hg2.renderOrder = 5;
  heroBody.add(hg1); staffMesh.add(hg2);
  hero.add(heroBody, footL, footR, staff);
  scene.add(hero);
  const lamp = new THREE.PointLight(0xffc27a, 70, 46, 1.4);
  scene.add(lamp);

  // =====================================================================
  // Enemies
  // =====================================================================
  const eGeo = {
    shade: mergeGeometries([
      part(new THREE.SphereGeometry(0.8, 8, 6), 0x5b3a9c, T(0, 0.7, 0, 1, 0.88, 1)),
      part(new THREE.ConeGeometry(0.2, 0.6, 5), 0x24163f, T(-0.38, 1.45, 0, 1, 1, 1, 0, 0, 0.35)),
      part(new THREE.ConeGeometry(0.2, 0.6, 5), 0x24163f, T(0.38, 1.45, 0, 1, 1, 1, 0, 0, -0.35)),
      part(new THREE.SphereGeometry(0.14, 6, 5), [3.4, 0.7, 2.4], T(-0.28, 0.85, 0.66)),
      part(new THREE.SphereGeometry(0.14, 6, 5), [3.4, 0.7, 2.4], T(0.28, 0.85, 0.66)),
    ]),
    brute: mergeGeometries([
      part(new THREE.DodecahedronGeometry(1.5, 0), 0x4a3470, T(0, 1.5, 0)),
      part(new THREE.DodecahedronGeometry(0.8, 0), 0x2f2050, T(-1.55, 1.9, 0.1)),
      part(new THREE.DodecahedronGeometry(0.8, 0), 0x2f2050, T(1.55, 1.9, 0.1)),
      part(new THREE.ConeGeometry(0.35, 1.0, 5), 0x1c1230, T(0, 3.1, -0.3, 1, 1, 1, -0.3, 0, 0)),
      part(new THREE.ConeGeometry(0.3, 0.8, 5), 0x1c1230, T(0.6, 2.8, -0.5, 1, 1, 1, -0.4, 0, -0.4)),
      part(new THREE.ConeGeometry(0.3, 0.8, 5), 0x1c1230, T(-0.6, 2.8, -0.5, 1, 1, 1, -0.4, 0, 0.4)),
      part(new THREE.BoxGeometry(1.1, 0.24, 0.2), [3.6, 0.9, 0.3], T(0, 1.95, 1.22)),
    ]),
    spitter: mergeGeometries([
      part(new THREE.CylinderGeometry(0.22, 0.5, 1.7, 6), 0x2f6a52, T(0, 0.85, 0)),
      part(new THREE.SphereGeometry(0.62, 8, 6), 0x46906a, T(0, 2.0, 0)),
      part(new THREE.ConeGeometry(0.22, 0.7, 4), 0x1f4a3a, T(0, 2.75, 0)),
      part(new THREE.ConeGeometry(0.2, 0.6, 4), 0x1f4a3a, T(0.62, 2.35, 0, 1, 1, 1, 0, 0, -0.9)),
      part(new THREE.ConeGeometry(0.2, 0.6, 4), 0x1f4a3a, T(-0.62, 2.35, 0, 1, 1, 1, 0, 0, 0.9)),
      part(new THREE.SphereGeometry(0.3, 7, 5), [0.9, 3.2, 1.0], T(0, 1.98, 0.44)),
    ]),
    wraith: mergeGeometries([
      part(new THREE.ConeGeometry(0.75, 2.2, 7), 0x35508a, T(0, 1.2, 0, 1, 1, 1, Math.PI, 0, 0)),
      part(new THREE.SphereGeometry(0.48, 8, 6), 0x4a6cb0, T(0, 2.4, 0)),
      part(new THREE.ConeGeometry(0.16, 0.9, 4), 0x35508a, T(-0.8, 1.9, 0.2, 1, 1, 1, 0, 0, 2.2)),
      part(new THREE.ConeGeometry(0.16, 0.9, 4), 0x35508a, T(0.8, 1.9, 0.2, 1, 1, 1, 0, 0, -2.2)),
      part(new THREE.SphereGeometry(0.1, 6, 5), [0.7, 2.8, 3.6], T(-0.18, 2.45, 0.42)),
      part(new THREE.SphereGeometry(0.1, 6, 5), [0.7, 2.8, 3.6], T(0.18, 2.45, 0.42)),
    ]),
  };
  const ECAP = 180;
  const eMat = makeLitMaterial(STENCIL);
  const eMesh = {}, eGhost = {};
  const eGhostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.15, 0.45), transparent: true, opacity: 0.45, depthFunc: THREE.GreaterDepth, depthWrite: false, fog: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc });
  const _col = new THREE.Color(), dummy = new THREE.Object3D();
  for (const k in eGeo) {
    const m = new THREE.InstancedMesh(eGeo[k], eMat, ECAP);
    for (let i = 0; i < ECAP; i++) m.setColorAt(i, _col.setRGB(1, 1, 1));
    m.count = 0; m.frustumCulled = false; m.castShadow = true; m.renderOrder = 2;
    scene.add(m); eMesh[k] = m;
    const gh = new THREE.InstancedMesh(eGeo[k], eGhostMat, ECAP);
    gh.instanceMatrix = m.instanceMatrix; gh.count = 0; gh.frustumCulled = false; gh.renderOrder = 5;
    scene.add(gh); eGhost[k] = gh;
  }
  const enemies = [];
  function tierMul() { const t = lit(); return 1 + 0.38 * t + 0.05 * t * t + P.level * 0.02; }
  function spawnEnemy(type, x, z, o = {}) {
    if (enemies.length >= ECAP) return null;
    const d = ET[type], el = o.elite ? 1 : 0, t = lit();
    const e = {
      type, x, z, y: world.getHeight(x, z), r: d.r * (el ? 1.6 : 1), h: d.h * (el ? 1.6 : 1), scale: el ? 1.6 : 1, elite: el,
      hp: d.hp * tierMul() * (el ? 7 : 1), dmg: d.dmg * (1 + 0.1 * t) * (el ? 1.5 : 1), spd: d.spd * (0.92 + Math.random() * 0.16) * (el ? 0.9 : 1),
      xp: d.xp * (el ? 10 : 1), kx: 0, kz: 0, atkT: 0.5, flash: 0, ph: Math.random() * 10, wispT: 0, shootT: 1.5 + Math.random() * 2,
      face: 0, age: 0, ev: !!o.ev, boss: false, dead: false,
    };
    e.maxHp = e.hp;
    enemies.push(e);
    fx.burst(x, e.y + 0.8, z, 5, 3, 1.2, 0.3, 1.6, { life: 0.4, size: 0.5, grav: -2 });
    return e;
  }
  function pickType(t) {
    const r = Math.random();
    if (t >= 3 && r < 0.16) return 'wraith';
    if (t >= 2 && r < 0.27) return 'brute';
    if (t >= 1 && r < 0.45) return 'spitter';
    return 'shade';
  }
  function spawnRing(cx, cz, rmin, rmax, n, o, ang, spreadA = TAU) {
    for (let k = 0; k < n; k++) {
      for (let tries = 0; tries < 8; tries++) {
        const a = (ang ?? 0) + (Math.random() - 0.5) * spreadA, r = rmin + Math.random() * (rmax - rmin);
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (!world.reachable(x, z) || world.nearObstacle(x, z, 1.2)) continue;
        if (Math.hypot(x - P.x, z - P.z) < 16) continue;
        if (sealed() && Math.hypot(x, z) < CROWN_R + 3) continue;
        spawnEnemy(o.type || pickType(lit()), x, z, o);
        break;
      }
    }
  }
  const sealed = () => lit() < 6;

  // --- titan
  const titanMat = makeLitMaterial(); titanMat.emissive = new THREE.Color(1, 0.6, 1); titanMat.emissiveIntensity = 0;
  const titan = new THREE.Group();
  const titanBody = new THREE.Mesh(mergeGeometries([
    part(new THREE.ConeGeometry(2.7, 5, 8), 0x2a1f48, T(0, 2.4, 0, 1, 1, 1, Math.PI, 0, 0)),
    part(new THREE.DodecahedronGeometry(3, 0), 0x3a2a62, T(0, 6, 0, 1.15, 1.25, 0.95)),
    part(new THREE.IcosahedronGeometry(1.15, 0), [3.2, 0.5, 2.6], T(0, 6.1, 2.35)),
    part(new THREE.DodecahedronGeometry(1.7, 0), 0x2c2050, T(-4.0, 7.8, 0)),
    part(new THREE.DodecahedronGeometry(1.7, 0), 0x2c2050, T(4.0, 7.8, 0)),
    part(new THREE.ConeGeometry(0.7, 2.4, 5), 0x15102a, T(-4.6, 9.6, 0, 1, 1, 1, 0, 0, 0.5)),
    part(new THREE.ConeGeometry(0.7, 2.4, 5), 0x15102a, T(4.6, 9.6, 0, 1, 1, 1, 0, 0, -0.5)),
    part(new THREE.DodecahedronGeometry(1.5, 0), 0x46337a, T(0, 10.2, 0.3)),
    part(new THREE.BoxGeometry(0.75, 0.26, 0.2), [3.8, 1.1, 0.4], T(-0.6, 10.4, 1.55, 1, 1, 1, 0, 0, -0.25)),
    part(new THREE.BoxGeometry(0.75, 0.26, 0.2), [3.8, 1.1, 0.4], T(0.6, 10.4, 1.55, 1, 1, 1, 0, 0, 0.25)),
    ...[0, 1, 2, 3, 4].map((i) => part(new THREE.ConeGeometry(0.32, 1.9, 5), 0x15102a, T(Math.sin((i - 2) * 0.6) * 1.2, 11.9 - Math.abs(i - 2) * 0.25, -0.2, 1, 1, 1, 0, 0, -(i - 2) * 0.32))),
  ]), titanMat);
  titanBody.castShadow = true;
  const handGeo = mergeGeometries([
    part(new THREE.DodecahedronGeometry(1.35, 0), 0x3a2a62),
    part(new THREE.ConeGeometry(0.4, 1.4, 4), 0x15102a, T(0, -1.3, 0.5, 1, 1, 1, Math.PI, 0, 0)),
    part(new THREE.ConeGeometry(0.4, 1.4, 4), 0x15102a, T(0.6, -1.2, -0.3, 1, 1, 1, Math.PI, 0, 0)),
    part(new THREE.ConeGeometry(0.4, 1.4, 4), 0x15102a, T(-0.6, -1.2, -0.3, 1, 1, 1, Math.PI, 0, 0)),
  ]);
  const handL = new THREE.Mesh(handGeo, titanMat), handR = new THREE.Mesh(handGeo, titanMat);
  handL.castShadow = handR.castShadow = true;
  titan.add(titanBody, handL, handR);
  titan.position.set(0, world.crownY, 0);
  scene.add(titan);
  const boss = { state: 'dormant', e: null, atkT: 2.5, atkI: 0, queue: [], rise: 0 };

  // =====================================================================
  // Projectiles, gems, pickups
  // =====================================================================
  const shotGeo = new THREE.IcosahedronGeometry(1, 1);
  const pshotMesh = new THREE.InstancedMesh(shotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 3.2, 5.5) }), 140);
  const eshotMesh = new THREE.InstancedMesh(shotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.35, 0.9) }), 200);
  const wispMesh = new THREE.InstancedMesh(shotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 2.2, 0.6) }), 8);
  const gemMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial(), 600);
  const cometMesh = new THREE.InstancedMesh(shotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.4, 1.2) }), 12);
  for (const m of [pshotMesh, eshotMesh, wispMesh, gemMesh, cometMesh]) { m.count = 0; m.frustumCulled = false; scene.add(m); }
  for (let i = 0; i < 600; i++) gemMesh.setColorAt(i, _col.setRGB(1, 1, 1));
  const pshots = [], eshots = [], gems = [], comets = [], hazards = [], shocks = [];

  const GEM_C = [[0.4, 1.9, 2.6], [0.6, 2.6, 0.8], [3.0, 2.0, 0.4], [3.2, 0.35, 0.6]];
  function dropGem(x, y, z, val, heart) {
    if (gems.length >= 600) { const g = gems[(Math.random() * gems.length) | 0]; if (!g.heart) g.val += val; return; }
    const a = Math.random() * TAU, s = 1 + Math.random() * 2.5;
    gems.push({ x, y: y + 0.6, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: 4 + Math.random() * 2, val, heart: !!heart, mag: false, ms: 10, t: Math.random() * 6 });
  }

  // shards + chests
  const shardGeo = new THREE.OctahedronGeometry(0.5, 0); shardGeo.scale(1, 1.7, 1);
  const shardMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 0.9) });
  const shardBeamGeo = new THREE.CylinderGeometry(0.12, 0.12, 16, 6, 1, true); shardBeamGeo.translate(0, 8, 0);
  const shardBeamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.8, 0.3), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  const shards = world.shardPos.map((p, i) => {
    const g = new THREE.Group(); g.position.set(p.x, p.y, p.z);
    const m = new THREE.Mesh(shardGeo, shardMat); m.position.y = 1.6;
    g.add(m, new THREE.Mesh(shardBeamGeo, shardBeamMat)); scene.add(g);
    return { ...p, i, got: false, g, m };
  });
  const chestMat = makeLitMaterial();
  const chestBaseGeo = mergeGeometries([
    part(new THREE.BoxGeometry(1.5, 0.8, 1.0), 0x7a4a25, T(0, 0.4, 0)),
    part(new THREE.BoxGeometry(1.56, 0.14, 1.06), 0xe9c46a, T(0, 0.75, 0)),
    part(new THREE.BoxGeometry(0.2, 0.84, 1.06), 0xe9c46a, T(-0.5, 0.4, 0)),
    part(new THREE.BoxGeometry(0.2, 0.84, 1.06), 0xe9c46a, T(0.5, 0.4, 0)),
  ]);
  const chestLidGeo = mergeGeometries([
    part(new THREE.BoxGeometry(1.5, 0.36, 1.0), 0x8a5630, T(0, 0.18, 0.5)),
    part(new THREE.BoxGeometry(0.2, 0.4, 1.06), 0xe9c46a, T(-0.5, 0.18, 0.5)),
    part(new THREE.BoxGeometry(0.2, 0.4, 1.06), 0xe9c46a, T(0.5, 0.18, 0.5)),
    part(new THREE.BoxGeometry(0.26, 0.3, 0.1), [2.6, 1.9, 0.6], T(0, 0.08, 1.04)),
  ]);
  const chests = world.chestPos.map((p, i) => {
    const g = new THREE.Group(); g.position.set(p.x, p.y - 0.05, p.z); g.rotation.y = i * 1.7;
    const base = new THREE.Mesh(chestBaseGeo, chestMat), lid = new THREE.Mesh(chestLidGeo, chestMat);
    lid.position.set(0, 0.82, -0.5); base.castShadow = lid.castShadow = true;
    g.add(base, lid); scene.add(g);
    return { ...p, i, open: false, lid, a: 0 };
  });

  // =====================================================================
  // State
  // =====================================================================
  let state = 'loading', time = 0, timeScale = 1, pendingLevels = 0, blessing = false;
  let ev = null, spawnT = 2, saveT = 0, curBiome = -1, biomeT = 0, regenAcc = 0, victoryT = -1, respawnGrace = 0;
  let camYaw = 0, camPitch = 0.8, camDist = 26, camDistT = 26;
  const camTarget = new THREE.Vector3(P.x, P.y + 1.5, P.z);
  const G = { bot: false };

  // ---------- UI helpers ----------
  const el = { toast: $('toast'), hint: $('hint'), hpfill: $('hpfill'), hplag: $('hplag'), hptext: $('hptext'), xpfill: $('xpfill'), lvl: $('lvl'), obj: $('objective'), pips: $('pips').children, charge: $('charge'), chargefill: $('chargefill'), chargelabel: $('chargelabel'), boss: $('boss'), bossfill: $('bossfill'), shards: $('shards'), loadout: $('loadout'), dashbtn: $('dashbtn'), dashcd: $('dashcd'), vignette: $('vignette'), flash: $('flash'), lowhp: $('lowhp') };
  let toastT = 0, hintT = 0, flashA = 0;
  const hintQ = [];
  function toast(title, sub = '', dur = 3.2) { el.toast.innerHTML = title + (sub ? `<small>${sub}</small>` : ''); el.toast.classList.add('on'); toastT = dur; }
  function hint(text, dur = 6) { hintQ.push([text, dur]); }
  function show(id, on) { $(id).hidden = !on; }
  function setState(s) {
    state = s;
    for (const id of ['title', 'levelup', 'pause', 'dead', 'victory']) show(id, id === s);
    show('hud', s !== 'title' && s !== 'loading');
    if (s !== 'playing') { toastT = 0; el.toast.classList.remove('on'); }
    input.reset();
  }
  function renderLoadout() {
    let h = '';
    for (const k in UP) if (P.up[k]) h += `<div class="slot${UP[k].w ? ' w' : ''}" title="${UP[k].n}">${svg(k)}<b>${P.up[k]}</b></div>`;
    el.loadout.innerHTML = h;
  }
  let lastObj = '';
  function setObjective(t) { if (t !== lastObj) { lastObj = t; el.obj.textContent = t; } }

  // minimap
  const mmBase = world.makeMinimap(148);
  const mm = $('minimap').getContext('2d');
  let mmT = 0;
  function drawMinimap() {
    const S = 148, k = S / SIZE, tx = (x) => (x + HALF) * k;
    mm.clearRect(0, 0, S, S);
    mm.save(); mm.beginPath(); mm.arc(S / 2, S / 2, S / 2, 0, TAU); mm.clip();
    mm.globalAlpha = 0.92; mm.drawImage(mmBase, 0, 0); mm.globalAlpha = 1;
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    for (const b of world.beacons) {
      mm.beginPath(); mm.arc(tx(b.x), tx(b.z), b.lit ? 4 : 3.2 + pulse * 1.2, 0, TAU);
      mm.fillStyle = b.lit ? '#ffcf7a' : 'rgba(10,14,34,0.85)'; mm.fill();
      mm.lineWidth = 1.5; mm.strokeStyle = b.lit ? '#fff3cf' : '#9fc0ff'; mm.stroke();
    }
    if (boss.state !== 'dead') {
      mm.beginPath(); mm.arc(tx(0), tx(0), 4.5, 0, TAU); mm.fillStyle = sealed() ? 'rgba(120,60,200,0.7)' : `rgba(255,80,170,${0.6 + pulse * 0.4})`; mm.fill();
      mm.strokeStyle = '#e9b6ff'; mm.stroke();
    }
    mm.translate(tx(P.x), tx(P.z)); mm.rotate(Math.PI - P.facing);
    mm.beginPath(); mm.moveTo(0, -6.5); mm.lineTo(4.6, 5); mm.lineTo(0, 2.4); mm.lineTo(-4.6, 5); mm.closePath();
    mm.fillStyle = '#fff'; mm.fill(); mm.strokeStyle = '#0a0e22'; mm.lineWidth = 1.2; mm.stroke();
    mm.restore();
  }

  // ---------- save ----------
  function save() {
    if (state === 'title' || state === 'loading') return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, lit: world.beacons.map((b) => b.lit), level: P.level, xp: P.xp, up: P.up, stardust: P.stardust, hp: P.hp, x: P.x, z: P.z,
        shards: shards.filter((s) => s.got).map((s) => s.i), chests: chests.filter((c) => c.open).map((c) => c.i), kills: P.kills, time: P.time, won: P.won,
      }));
    } catch (e) { /* storage unavailable */ }
  }
  function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

  function clearField() {
    enemies.length = 0; pshots.length = 0; eshots.length = 0; comets.length = 0; hazards.length = 0; shocks.length = 0;
    boss.queue.length = 0; fx.clearNumbers();
  }
  function resetBoss() {
    if (boss.e) { const i = enemies.indexOf(boss.e); if (i >= 0) enemies.splice(i, 1); }
    boss.e = null; boss.queue.length = 0; hazards.length = 0; shocks.length = 0;
    if (boss.state !== 'dead') boss.state = 'dormant';
    titan.position.set(0, world.crownY, 0); titan.rotation.y = 0;
    show('boss', false);
  }
  function startGame(s) {
    clearField(); gems.length = 0; ev = null; pendingLevels = 0; victoryT = -1; timeScale = 1;
    for (const b of world.beacons) { b.lit = s ? !!s.lit[b.i] : false; b.charge = 0; b.active = false; b.glow = b.lit ? 1 : 0; }
    for (const sh of shards) { sh.got = s ? s.shards.includes(sh.i) : false; sh.g.visible = !sh.got; }
    for (const c of chests) { c.open = s ? s.chests.includes(c.i) : false; c.a = c.open ? 1 : 0; }
    Object.assign(P, { level: s ? s.level : 1, xp: s ? s.xp : 0, up: s ? { ...s.up } : { spark: 1 }, stardust: s ? s.stardust || 0 : 0, kills: s ? s.kills : 0, time: s ? s.time : 0, won: s ? !!s.won : false, invuln: 1, dashT: 0, dashCd: 0, hurtT: 0 });
    P.shards = shards.filter((x) => x.got).length;
    P.hp = 1e9; recompute(); P.hp = s ? clamp(s.hp, 20, P.maxHp) : P.maxHp;
    P.x = s ? s.x : world.START.x; P.z = s ? s.z : world.START.z;
    if (!world.reachable(P.x, P.z)) { P.x = world.START.x; P.z = world.START.z; }
    P.y = world.getHeight(P.x, P.z); P.facing = Math.PI;
    boss.state = P.won ? 'dead' : 'dormant'; boss.e = null; titan.visible = !P.won; resetBoss();
    world.setDawn(P.won ? 1 : (lit() / 6) * 0.8, true);
    camYaw = 0; camTarget.set(P.x, P.y + 1.5, P.z);
    curBiome = -1; biomeT = 1.5; spawnT = 4; respawnGrace = 3;
    renderLoadout(); hintQ.length = 0; hintT = 0; el.hint.classList.remove('on');
    setState('playing');
    if (!s) {
      hint(isTouch ? 'Drag the left side to move. Drag the right side to look around.' : 'Move with WASD or the arrow keys. Drag the mouse to look around.', 7);
      hint('Your lantern strikes on its own. Gather the motes that foes leave behind.', 6);
      hint(isTouch ? 'Tap the dash button to slip through danger.' : 'Press Space to dash through danger.', 5);
      hint('Follow the pillar of light to the first beacon.', 7);
    }
  }

  // =====================================================================
  // Combat helpers
  // =====================================================================
  function hurt(d, sx, sz) {
    if (P.invuln > 0 || state !== 'playing' || P.hp <= 0) return;
    d *= P.guard;
    P.hp -= d; P.invuln = 0.55; P.hurtT = 0.3;
    fx.addShake(0.45); sfx.hurt(); el.vignette.style.opacity = 0.9;
    fx.burst(P.x, P.y + 1.2, P.z, 10, 6, 3, 0.4, 0.5, { life: 0.4 });
    if (P.hp <= 0) { P.hp = 0; die(); }
  }
  function heal(a, showNum = true) {
    const b = P.hp; P.hp = Math.min(P.maxHp, P.hp + a);
    if (showNum && P.hp - b >= 1) fx.number(P.x, P.y + 2.6, P.z, '+' + Math.round(P.hp - b), 'heal');
  }
  function die() {
    sfx.death(); fx.burst(P.x, P.y + 1, P.z, 60, 9, 3, 1.6, 0.6, { life: 1.1, size: 0.7 });
    if (ev) { ev.b.active = false; ev.b.charge *= 0.5; ev = null; show('charge', false); show('chargelabel', false); }
    resetBoss();
    setState('dead');
  }
  function respawn() {
    clearField();
    let best = null, bd = 1e9;
    for (const b of world.beacons) if (b.lit) { const d = Math.hypot(b.x - P.x, b.z - P.z); if (d < bd) { bd = d; best = b; } }
    if (best) { P.x = best.x; P.z = best.z + 7; } else { P.x = world.START.x; P.z = world.START.z; }
    P.y = world.getHeight(P.x, P.z); P.hp = P.maxHp; P.invuln = 2; P.dashT = 0; respawnGrace = 4; spawnT = 4;
    camTarget.set(P.x, P.y + 1.5, P.z);
    setState('playing');
    fx.burst(P.x, P.y + 1, P.z, 40, 7, 3, 2.2, 0.8, { life: 0.9 });
    sfx.heal(); save();
  }
  function damage(e, dmg, kx = 0, kz = 0, quiet = false) {
    if (e.dead) return;
    const crit = Math.random() < P.crit;
    const d = dmg * P.dmgMul * (crit ? 2 : 1) * (0.9 + Math.random() * 0.2);
    e.hp -= d; e.flash = 0.1;
    if (!e.boss) { e.kx += kx; e.kz += kz; }
    if (!quiet || crit) fx.number(e.x, e.y + e.h + 0.3, e.z, Math.round(d), crit ? 'crit' : '');
    sfx.hit();
    if (e.hp <= 0) kill(e);
  }
  function kill(e, silent) {
    if (e.dead) return;
    e.dead = true;
    if (e.boss) { bossDeath(e); return; }
    P.kills++;
    const c = e.type === 'spitter' ? [0.6, 2.2, 0.8] : e.type === 'wraith' ? [0.6, 1.6, 3] : [1.8, 0.5, 2.6];
    fx.burst(e.x, e.y + e.h * 0.5, e.z, e.elite ? 30 : 10, e.elite ? 9 : 6, c[0], c[1], c[2], { life: 0.5, size: 0.55 * e.scale });
    if (!silent) sfx.kill();
    dropGem(e.x, e.y, e.z, e.xp);
    if (e.elite || Math.random() < 0.03) dropGem(e.x, e.y, e.z, 0, true);
  }
  function gainXp(v) {
    P.xp += v;
    while (P.xp >= xpNeed(P.level)) { P.xp -= xpNeed(P.level); P.level++; pendingLevels++; }
  }

  // nearest enemies
  const _near = [];
  function nearest(x, z, range, count, exclude) {
    _near.length = 0;
    for (let n = 0; n < count; n++) {
      let best = null, bd = range * range;
      for (const e of enemies) {
        if (e.dead || _near.includes(e) || (exclude && exclude.includes(e))) continue;
        const dx = e.x - x, dz = e.z - z, d = dx * dx + dz * dz - e.r * e.r;
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      _near.push(best);
    }
    return _near;
  }
  const staffTip = () => {
    const s = Math.sin(P.facing), c = Math.cos(P.facing);
    return [P.x + c * 0.62 + s * 0.18, P.y + 2.45, P.z - s * 0.62 + c * 0.18];
  };

  const C_NOVA = new THREE.Color(3, 2.2, 0.8), C_COMET = new THREE.Color(1.6, 0.85, 0.2), C_RED = new THREE.Color(1.7, 0.16, 0.28), C_SHOCK = new THREE.Color(1.5, 0.22, 1.1), C_GOLD = new THREE.Color(3, 2.4, 1.0), C_SOFT = new THREE.Color(0.9, 0.65, 0.25);
  function updateWeapons(dt) {
    const u = P.up, wt = P.wt, cd = P.cdMul;
    // spark
    wt.spark -= dt;
    if (wt.spark <= 0) {
      const lv = u.spark, count = 1 + (lv >= 2) + (lv >= 4) + (lv >= 6);
      const tg = nearest(P.x, P.z, 27, count);
      if (tg.length) {
        const [sx, sy, sz] = staffTip();
        for (let k = 0; k < count; k++) {
          const e = tg[k % tg.length];
          let a = Math.atan2(e.x - P.x, e.z - P.z);
          if (k >= tg.length) a += (k % 2 ? 1 : -1) * 0.14 * Math.ceil(k / 2);
          pshots.push({ x: sx, y: sy, z: sz, vx: Math.sin(a) * 38, vz: Math.cos(a) * 38, life: 0.85, dmg: 13 + 4 * (lv - 1), pierce: lv >= 5 ? 1 : 0, last: null });
        }
        sfx.shoot();
        wt.spark = (0.56 - 0.03 * (lv - 1)) * cd;
      } else wt.spark = 0.1;
    }
    // wisps
    if (u.wisps) {
      const lv = u.wisps, n = [0, 2, 3, 3, 4, 5, 6][lv], rad = 4 + 0.3 * lv, dmg = 8 + 3 * (lv - 1) + (lv >= 6 ? 6 : 0);
      P.wispA += dt * 2.7;
      for (const e of enemies) {
        if (e.wispT > 0 || e.dead) continue;
        const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
        if (Math.abs(d - rad) > e.r + 0.8) continue;
        const ea = Math.atan2(dz, dx);
        for (let k = 0; k < n; k++) {
          let da = (ea - (P.wispA + (k / n) * TAU)) % TAU; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
          if (Math.abs(da) * rad < e.r + 0.8) { e.wispT = 0.42; damage(e, dmg, (dx / d) * 5, (dz / d) * 5, true); fx.burst(e.x, e.y + 1, e.z, 4, 4, 3, 1.4, 0.3, { life: 0.3, size: 0.4 }); break; }
        }
      }
    }
    // nova
    if (u.nova) {
      wt.nova -= dt;
      if (wt.nova <= 0) {
        const lv = u.nova, rad = 8 + 1.3 * (lv - 1) + (lv >= 6 ? 2 : 0), dmg = 20 + 9 * (lv - 1) + (lv >= 6 ? 14 : 0);
        let any = false;
        for (const e of enemies) if (Math.hypot(e.x - P.x, e.z - P.z) < rad + e.r) { any = true; break; }
        if (any) {
          for (const e of enemies.slice()) {
            const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz) || 1;
            if (d < rad + e.r) damage(e, dmg, (dx / d) * 16, (dz / d) * 16);
          }
          fx.ring(P.x, P.y + 0.7, P.z, 1, rad, 0.4, C_NOVA); sfx.nova();
          wt.nova = (4.2 - 0.3 * (lv - 1)) * cd;
        } else wt.nova = 0.2;
      }
    }
    // chain
    if (u.chain) {
      wt.chain -= dt;
      if (wt.chain <= 0) {
        const lv = u.chain, jumps = 2 + lv + (lv >= 6 ? 1 : 0), dmg = 15 + 5 * (lv - 1) + (lv >= 6 ? 8 : 0);
        let cur = nearest(P.x, P.z, 22, 1)[0];
        if (cur) {
          let [ax, ay, az] = staffTip(); const hitList = [];
          for (let j = 0; j < jumps && cur; j++) {
            fx.lightning(ax, ay, az, cur.x, cur.y + cur.h * 0.6, cur.z);
            ax = cur.x; ay = cur.y + cur.h * 0.6; az = cur.z;
            hitList.push(cur); damage(cur, dmg);
            fx.burst(ax, ay, az, 5, 5, 1, 1.6, 3, { life: 0.25, size: 0.4 });
            cur = nearest(ax, az, 11, 1, hitList)[0];
          }
          sfx.zap(); wt.chain = (2.4 - 0.15 * (lv - 1)) * cd;
        } else wt.chain = 0.2;
      }
    }
    // comet
    if (u.comet) {
      wt.comet -= dt;
      if (wt.comet <= 0) {
        const lv = u.comet, count = 1 + (lv >= 3) + (lv >= 6);
        const inRange = enemies.filter((e) => !e.dead && Math.hypot(e.x - P.x, e.z - P.z) < 26);
        if (inRange.length) {
          for (let k = 0; k < count; k++) {
            const e = inRange[(Math.random() * inRange.length) | 0];
            const x = e.x + (k ? (Math.random() - 0.5) * 3 : 0), z = e.z + (k ? (Math.random() - 0.5) * 3 : 0), y = world.getHeight(x, z);
            const rad = 5 + 0.35 * lv;
            comets.push({ x, y, z, t: 0.55 + k * 0.12, dur: 0.55 + k * 0.12, dmg: 38 + 12 * (lv - 1), rad });
            fx.telegraph(x, y, z, rad, 0.55 + k * 0.12, C_COMET, 0.4);
          }
          wt.comet = (3.2 - 0.25 * (lv - 1)) * cd;
        } else wt.comet = 0.25;
      }
    }
  }

  function updateShots(dt) {
    for (let i = pshots.length - 1; i >= 0; i--) {
      const s = pshots[i];
      s.x += s.vx * dt; s.z += s.vz * dt; s.life -= dt;
      s.y = damp(s.y, world.getHeight(s.x, s.z) + 1.3, 10, dt);
      let gone = s.life <= 0;
      if (!gone) for (const e of enemies) {
        if (e.dead || e === s.last) continue;
        const dx = e.x - s.x, dz = e.z - s.z, rr = e.r + 0.55;
        if (dx * dx + dz * dz < rr * rr) {
          damage(e, s.dmg, s.vx * 0.09, s.vz * 0.09);
          fx.burst(s.x, s.y, s.z, 5, 5, 0.6, 1.8, 3, { life: 0.25, size: 0.4 });
          if (s.pierce > 0) { s.pierce--; s.last = e; } else gone = true;
          break;
        }
      }
      if (Math.random() < 0.6) fx.spawn(s.x, s.y, s.z, 0, 0, 0, 0.18, 0.45, 0.4, 1.2, 2.2);
      if (gone) { pshots[i] = pshots[pshots.length - 1]; pshots.pop(); }
    }
    for (let i = eshots.length - 1; i >= 0; i--) {
      const s = eshots[i];
      s.x += s.vx * dt; s.z += s.vz * dt; s.life -= dt;
      s.y = damp(s.y, world.getHeight(s.x, s.z) + 1.2, 10, dt);
      let gone = s.life <= 0;
      const dx = P.x - s.x, dz = P.z - s.z;
      if (!gone && dx * dx + dz * dz < 1.0 && P.invuln <= 0) { hurt(s.dmg); gone = true; fx.burst(s.x, s.y, s.z, 8, 5, 3, 0.4, 0.8, { life: 0.3 }); }
      if (gone) { eshots[i] = eshots[eshots.length - 1]; eshots.pop(); }
    }
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i]; c.t -= dt;
      if (c.t > 0) { const k = c.t / c.dur; fx.spawn(c.x + k * 9, c.y + k * 34, c.z + k * 4, 0, 0, 0, 0.3, 1.1, 3, 1.6, 0.4); continue; }
      for (const e of enemies.slice()) {
        const dx = e.x - c.x, dz = e.z - c.z, d = Math.hypot(dx, dz) || 1;
        if (d < c.rad + e.r) damage(e, c.dmg, (dx / d) * 8, (dz / d) * 8);
      }
      fx.blast(c.x, c.y + 0.5, c.z, c.rad, 0.35, C_COMET); fx.burst(c.x, c.y + 0.5, c.z, 22, 11, 3, 1.6, 0.4, { life: 0.6, size: 0.7 });
      fx.addShake(0.12); sfx.boom();
      comets[i] = comets[comets.length - 1]; comets.pop();
    }
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i]; h.t -= dt;
      if (h.t > 0) continue;
      fx.blast(h.x, h.y + 0.5, h.z, h.r, 0.4, C_RED); fx.burst(h.x, h.y + 0.5, h.z, 26, 12, 3, 0.4, 1.2, { life: 0.6, size: 0.8 });
      fx.addShake(0.25); sfx.boom();
      if (Math.hypot(P.x - h.x, P.z - h.z) < h.r) hurt(h.dmg);
      hazards[i] = hazards[hazards.length - 1]; hazards.pop();
    }
    for (let i = shocks.length - 1; i >= 0; i--) {
      const s = shocks[i]; s.r += s.spd * dt;
      const d = Math.hypot(P.x - s.x, P.z - s.z);
      if (!s.hit && Math.abs(d - s.r) < 1.1 && P.invuln <= 0) { s.hit = true; hurt(s.dmg); }
      if (s.r >= s.max) { shocks[i] = shocks[shocks.length - 1]; shocks.pop(); }
    }
  }

  function updateGems(dt) {
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i]; g.t += dt;
      const dx = P.x - g.x, dz = P.z - g.z, d = Math.hypot(dx, dz);
      if (g.mag || (d < P.pickup && !(g.heart && P.hp >= P.maxHp))) {
        g.mag = true; g.ms += dt * 60;
        const k = Math.min(1, (g.ms * dt) / (d || 1));
        g.x += dx * k; g.z += dz * k; g.y = damp(g.y, P.y + 1, 12, dt);
        if (d < 1.0) {
          if (g.heart) { heal(22); sfx.heal(); fx.burst(P.x, P.y + 1.2, P.z, 10, 4, 0.6, 3, 1, { life: 0.5 }); }
          else { gainXp(g.val); sfx.xp(); }
          gems[i] = gems[gems.length - 1]; gems.pop();
        }
      } else {
        const gy = world.getHeight(g.x, g.z) + 0.7;
        if (g.vy !== 0 || g.y > gy) {
          g.vy -= 20 * dt; g.x += g.vx * dt; g.z += g.vz * dt; g.y += g.vy * dt;
          if (g.y <= gy) { g.y = gy; g.vy = 0; g.vx = g.vz = 0; }
        }
      }
    }
  }

  // =====================================================================
  // Enemy update
  // =====================================================================
  function updateEnemies(dt) {
    const n = enemies.length;
    for (let i = 0; i < n; i++) {
      const a = enemies[i];
      for (let j = i + 1; j < n; j++) {
        const b = enemies[j];
        const dx = b.x - a.x, dz = b.z - a.z, rr = (a.r + b.r) * 0.9;
        if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), p = (rr - d) / d * 0.5;
        const wa = a.boss ? 0 : b.boss ? 2 : 1, wb = b.boss ? 0 : a.boss ? 2 : 1;
        const ax = a.x - dx * p * wa, az = a.z - dz * p * wa, bx = b.x + dx * p * wb, bz = b.z + dz * p * wb;
        if (wa && world.getHeight(ax, az) > 0.4) { a.x = ax; a.z = az; }
        if (wb && world.getHeight(bx, bz) > 0.4) { b.x = bx; b.z = bz; }
      }
    }
    const seal = sealed();
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.dead) { enemies[i] = enemies[enemies.length - 1]; enemies.pop(); continue; }
      e.age += dt; e.flash -= dt; e.atkT -= dt; e.wispT -= dt;
      if (e.boss) { updateBoss(e, dt); continue; }
      const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz) || 0.001, nx = dx / d, nz = dz / d;
      if (d > (e.ev ? 150 : 95)) { e.dead = true; continue; }
      let mx = nx, mz = nz, sp = e.spd;
      if (e.type === 'spitter') {
        if (d < 10) { mx = -nx; mz = -nz; sp *= 0.7; }
        else if (d < 17) { const s = e.ph > 5 ? 1 : -1; mx = -nz * s; mz = nx * s; sp *= 0.5; }
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 24) {
          e.shootT = 2.8 + Math.random(); e.flash = 0.08;
          eshots.push({ x: e.x + nx, y: e.y + 2, z: e.z + nz, vx: nx * 11.5, vz: nz * 11.5, life: 3.2, dmg: e.dmg * 1.3 });
          if (e.elite) for (const a of [-0.3, 0.3]) { const c = Math.cos(a), s = Math.sin(a); eshots.push({ x: e.x + nx, y: e.y + 2, z: e.z + nz, vx: (nx * c - nz * s) * 11.5, vz: (nz * c + nx * s) * 11.5, life: 3.2, dmg: e.dmg * 1.3 }); }
        }
      } else if (e.type === 'wraith') {
        const wv = Math.sin(time * 2.4 + e.ph) * 0.7 * smoothstep(3, 9, d);
        mx = nx - nz * wv; mz = nz + nx * wv;
      }
      if (d < e.r + 0.5) sp = 0;
      const ox = e.x, oz = e.z;
      e.x += (mx * sp + e.kx) * dt; e.z += (mz * sp + e.kz) * dt;
      const kd = Math.exp(-7 * dt); e.kx *= kd; e.kz *= kd;
      world.collide(e, e.r * 0.6);
      if (seal) { const cd = Math.hypot(e.x, e.z); if (cd < CROWN_R + 1) { e.x *= (CROWN_R + 1) / cd; e.z *= (CROWN_R + 1) / cd; } }
      if (world.getHeight(e.x, e.z) < 0.4) { e.x = ox; e.z = oz; }
      e.y = world.getHeight(e.x, e.z);
      e.face = angleLerp(e.face, Math.atan2(dx, dz), 1 - Math.exp(-10 * dt));
      if (d < e.r + 0.95 && e.atkT <= 0 && P.invuln <= 0) { e.atkT = 0.9; hurt(e.dmg); }
    }
  }

  // =====================================================================
  // Boss
  // =====================================================================
  function bossWake() {
    const e = {
      type: 'titan', boss: true, x: 0, z: 0, y: world.crownY, r: 4.2, h: 9, scale: 1, elite: 0, hp: BOSS_HP * (1 + P.level * 0.02), dmg: 30, spd: 3.3, xp: 0,
      kx: 0, kz: 0, atkT: 1, flash: 0, ph: 0, wispT: 0, face: 0, age: 0, dead: false, ev: true,
    };
    e.maxHp = e.hp; enemies.push(e); boss.e = e; boss.state = 'active'; boss.atkT = 2.6; boss.atkI = 0; boss.queue.length = 0;
    for (const o of enemies) if (!o.boss) o.dead = true;
    show('boss', true); sfx.roar(); fx.addShake(0.8);
    toast('Umbra Titan', 'The long night given form', 3.5);
    fx.ring(0, world.crownY + 0.6, 0, 2, 40, 1.2, C_SHOCK);
  }
  function bossAttack(e, kind, p2) {
    const y = world.crownY;
    if (kind === 'slam') {
      const n = p2 ? 5 : 3;
      for (let k = 0; k < n; k++) boss.queue.push({ t: k * 0.42, fn: () => {
        const lead = k === 0 ? 0 : 2.5, a = Math.random() * TAU;
        const x = P.x + Math.cos(a) * lead, z = P.z + Math.sin(a) * lead;
        hazards.push({ x, y: world.getHeight(x, z), z, r: 6.2, t: 0.95, dmg: 26 });
        fx.telegraph(x, world.getHeight(x, z), z, 6.2, 0.95, C_RED); sfx.warn();
      } });
    } else if (kind === 'ring') {
      const fire = (off, n) => {
        for (let k = 0; k < n; k++) { const a = off + (k / n) * TAU; eshots.push({ x: e.x + Math.cos(a) * 4, y: y + 2, z: e.z + Math.sin(a) * 4, vx: Math.cos(a) * 11, vz: Math.sin(a) * 11, life: 4.2, dmg: 16 }); }
        sfx.zap(); e.flash = 0.15;
      };
      const n = p2 ? 18 : 14, off = Math.random() * TAU;
      fire(off, n); boss.queue.push({ t: 0.7, fn: () => fire(off + Math.PI / n, n) });
      if (p2) boss.queue.push({ t: 1.4, fn: () => fire(off, n) });
    } else if (kind === 'summon') {
      spawnRing(e.x, e.z, 7, 12, p2 ? 6 : 5, { type: 'shade', ev: true });
      if (p2) spawnRing(e.x, e.z, 7, 12, 2, { type: 'wraith', ev: true });
      sfx.roar(); e.flash = 0.2;
    } else if (kind === 'shock') {
      const go = () => { shocks.push({ x: e.x, z: e.z, r: 4, spd: 15, max: 46, dmg: 22, hit: false }); const m = fx.ring(e.x, y + 0.6, e.z, 4, 46, 2.8, C_SHOCK); m.userData.lin = true; m.geometry = fx.thinGeo; sfx.nova(); fx.addShake(0.2); };
      go(); if (p2) boss.queue.push({ t: 1.1, fn: go });
    }
  }
  function updateBoss(e, dt) {
    const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz) || 0.001;
    if (Math.hypot(P.x, P.z) > 115) { resetBoss(); toast('The Titan slumbers', 'Return to the Crown when you are ready', 3); return; }
    if (d > 8) {
      e.x += (dx / d) * e.spd * dt; e.z += (dz / d) * e.spd * dt;
      const cd = Math.hypot(e.x, e.z); if (cd > 44) { e.x *= 44 / cd; e.z *= 44 / cd; }
    }
    e.y = world.getHeight(e.x, e.z);
    e.face = angleLerp(e.face, Math.atan2(dx, dz), 1 - Math.exp(-3 * dt));
    if (d < e.r + 1 && e.atkT <= 0 && P.invuln <= 0) { e.atkT = 1; hurt(e.dmg); }
    const p2 = e.hp < e.maxHp * 0.5;
    if (p2 && !e.p2) { e.p2 = true; sfx.roar(); fx.addShake(0.6); toast('The Titan rages', '', 2); fx.ring(e.x, e.y + 0.6, e.z, 2, 30, 0.8, C_SHOCK); }
    boss.atkT -= dt;
    if (boss.atkT <= 0) {
      const pat = ['slam', 'ring', 'shock', 'slam', 'summon', 'ring'];
      bossAttack(e, pat[boss.atkI++ % pat.length], p2);
      boss.atkT = p2 ? 2.7 : 3.5;
    }
    for (let i = boss.queue.length - 1; i >= 0; i--) { const q = boss.queue[i]; q.t -= dt; if (q.t <= 0) { boss.queue.splice(i, 1); q.fn(); } }
  }
  function bossDeath(e) {
    boss.state = 'dead'; boss.e = null; boss.queue.length = 0; hazards.length = 0; shocks.length = 0; eshots.length = 0;
    for (const o of enemies) if (!o.boss) kill(o, true);
    P.won = true; P.invuln = 6; show('boss', false);
    for (let k = 0; k < 6; k++) fx.burst(e.x, e.y + 2 + k * 1.6, e.z, 40, 16, 3, 0.8, 2.6, { life: 1.6, size: 1.1 });
    fx.blast(e.x, e.y + 6, e.z, 20, 1.2, C_SOFT); fx.ring(e.x, e.y + 0.6, e.z, 2, 60, 1.6, C_GOLD);
    fx.addShake(1); sfx.boom(); sfx.beaconDone(); flashA = 1;
    world.setDawn(1); timeScale = 0.35; victoryT = 4.2;
    for (const g of gems) g.mag = true;
    save();
  }

  // =====================================================================
  // Beacons / world events
  // =====================================================================
  function lightBeacon(b) {
    b.lit = true; b.active = false; b.charge = 1; ev = null;
    for (const e of enemies.slice()) if (!e.boss && Math.hypot(e.x - b.x, e.z - b.z) < 75) kill(e, true);
    eshots.length = 0;
    for (const g of gems) g.mag = true;
    fx.ring(b.x, b.y + 0.8, b.z, 2, 70, 1.4, C_GOLD); fx.blast(b.x, b.y + 5, b.z, 14, 0.9, C_SOFT);
    for (let k = 0; k < 5; k++) fx.burst(b.x, b.y + 2 + k * 2, b.z, 30, 12, 3, 2.2, 0.8, { life: 1.4, size: 0.9, grav: -3 });
    fx.addShake(0.6); sfx.beaconDone(); flashA = 0.8;
    P.hp = P.maxHp; P.invuln = Math.max(P.invuln, 1.5);
    const n = lit();
    world.setDawn((n / 6) * 0.8);
    toast('Beacon kindled', n < 6 ? `${n} of 6 burn against the dark` : 'The seal on the Crown is broken', 4);
    if (n === 6) hint('The Umbra Titan stirs at the heart of the isle. Climb to the Crown.', 9);
    blessing = true; pendingLevels++; spawnT = 6;
    show('charge', false); show('chargelabel', false);
    save();
  }
  function updateEvents(dt) {
    const t = lit();
    // beacon start / progress
    if (!ev && boss.state !== 'active') {
      for (const b of world.beacons) {
        if (b.lit) continue;
        if (Math.hypot(P.x - b.x, P.z - b.z) < 5.5) {
          ev = { b, spawnT: 1.2, elite: false, dur: 32 + 2 * t };
          b.active = true; sfx.beaconStart(); fx.addShake(0.3);
          fx.ring(b.x, b.y + 0.6, b.z, 2, BEACON_R, 0.7, C_GOLD);
          toast('The beacon wakes', 'Stay inside the circle until it catches', 3.5);
          show('charge', true); show('chargelabel', true);
          break;
        }
      }
    }
    if (ev) {
      const b = ev.b, d = Math.hypot(P.x - b.x, P.z - b.z), inside = d < BEACON_R;
      if (inside) b.charge = Math.min(1, b.charge + dt / ev.dur); else b.charge = Math.max(0, b.charge - dt * 0.03);
      el.chargelabel.textContent = inside ? 'Kindling the beacon' : 'Return to the circle';
      el.chargefill.style.width = (b.charge * 100).toFixed(1) + '%';
      if (inside && Math.random() < dt * 12) { const a = Math.random() * TAU, r = Math.random() * BEACON_R; fx.spawn(b.x + Math.cos(a) * r, b.y + 0.5, b.z + Math.sin(a) * r, 0, 3 + Math.random() * 3, 0, 1, 0.5, 3, 2, 0.6, -1); }
      if (d > 75) { b.active = false; b.charge = 0; ev = null; show('charge', false); show('chargelabel', false); toast('The beacon dims', 'Return to try again', 3); }
      else if (b.charge >= 1) lightBeacon(b);
      else {
        ev.spawnT -= dt;
        if (ev.spawnT <= 0) {
          ev.spawnT = Math.max(0.9, 1.8 - 0.12 * t);
          const cap = 30 + 7 * t;
          if (enemies.length < cap) spawnRing(b.x, b.z, 24, 33, 2 + Math.floor(t * 0.7), { ev: true }, Math.random() * TAU, 1.1);
        }
        if (!ev.elite && b.charge > 0.5 && t >= 1) {
          ev.elite = true;
          spawnRing(b.x, b.z, 24, 30, 1, { ev: true, elite: true, type: t >= 3 ? 'brute' : 'shade' });
          toast('A dread approaches', '', 2);
        }
      }
    } else if (boss.state !== 'active' && !P.won) {
      // ambient spawns
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = Math.max(0.6, 1.9 - 0.2 * t);
        const target = Math.min(34, 7 + 4 * t + Math.floor(P.level / 4));
        const nearStart = Math.hypot(P.x - world.START.x, P.z - world.START.z) < 30 && t === 0;
        if (enemies.length < target && !nearStart) {
          const a = P.moving ? Math.atan2(Math.cos(P.facing), Math.sin(P.facing)) : Math.random() * TAU;
          spawnRing(P.x, P.z, 38, 50, 1 + ((Math.random() * (2 + t * 0.5)) | 0), { elite: t >= 1 && Math.random() < 0.035 }, a, P.moving ? 3.6 : TAU);
        }
      }
    }
    // boss wake
    if (boss.state === 'dormant' && t === 6 && !P.won && Math.hypot(P.x, P.z) < 36) bossWake();
    // lit beacon sanctuary
    for (const b of world.beacons) if (b.lit && P.hp < P.maxHp && Math.hypot(P.x - b.x, P.z - b.z) < BEACON_R) { P.hp = Math.min(P.maxHp, P.hp + 8 * dt); if (Math.random() < dt * 8) fx.spawn(P.x + (Math.random() - 0.5), P.y + 0.3, P.z + (Math.random() - 0.5), 0, 3, 0, 0.7, 0.4, 0.8, 3, 1.2, -1); }
    // shards + chests
    for (const s of shards) {
      if (s.got) continue;
      const dx = P.x - s.x, dz = P.z - s.z;
      if (dx * dx + dz * dz < 6.5) {
        s.got = true; s.g.visible = false; P.shards++; recompute();
        fx.burst(s.x, s.y + 1.6, s.z, 40, 8, 3, 2.4, 0.8, { life: 1, size: 0.7 }); fx.ring(s.x, s.y + 0.5, s.z, 0.5, 7, 0.6, C_GOLD);
        sfx.shard(); toast('Star shard', `${P.shards} of ${shards.length} found · +2% damage`, 2.6); save();
      }
    }
    for (const c of chests) {
      if (c.open) continue;
      const dx = P.x - c.x, dz = P.z - c.z;
      if (dx * dx + dz * dz < 9) {
        c.open = true; sfx.chest();
        const val = Math.ceil(xpNeed(P.level) * 0.55 / 8);
        for (let k = 0; k < 8; k++) dropGem(c.x, c.y + 0.6, c.z, val);
        dropGem(c.x, c.y + 0.6, c.z, 0, true);
        fx.burst(c.x, c.y + 1, c.z, 30, 7, 3, 2.2, 0.6, { life: 0.9, size: 0.6 });
        save();
      }
    }
  }

  // =====================================================================
  // Player update
  // =====================================================================
  const _o = { x: 0, z: 0 };
  function canStand(x, z) { return world.getHeight(x, z) >= 0.45 && Math.abs(x) < HALF - 6 && Math.abs(z) < HALF - 6; }
  function movePlayer(dx, dz) {
    _o.x = P.x + dx; _o.z = P.z + dz;
    world.collide(_o, 0.55);
    if (sealed()) { const cd = Math.hypot(_o.x, _o.z); if (cd < CROWN_R + 1.2) { const k = (CROWN_R + 1.2) / (cd || 1); _o.x *= k; _o.z *= k; if (toastT <= 0) toast('The Crown is sealed', 'Kindle all six beacons to break it', 2.6); } }
    if (canStand(_o.x, _o.z)) { P.x = _o.x; P.z = _o.z; return; }
    if (canStand(_o.x, P.z)) { P.x = _o.x; return; }
    if (canStand(P.x, _o.z)) { P.z = _o.z; }
  }
  function updatePlayer(dt) {
    P.time += dt;
    P.invuln -= dt; P.dashCd -= dt; P.hurtT -= dt; respawnGrace -= dt;
    let ix = input.mx, iy = input.my;
    if (G.bot) [ix, iy] = botMove();
    const fxw = -Math.sin(camYaw), fzw = -Math.cos(camYaw), rxw = Math.cos(camYaw), rzw = -Math.sin(camYaw);
    let wx = rxw * ix + fxw * iy, wz = rzw * ix + fzw * iy;
    const mag = Math.min(1, Math.hypot(wx, wz));
    P.moving = mag > 0.08;
    if (P.moving) { const l = Math.hypot(wx, wz); wx /= l; wz /= l; }
    if ((input.dash || G.botDash) && P.dashCd <= 0 && P.dashT <= 0) {
      P.dashT = 0.2; P.dashCd = 1.5; P.invuln = Math.max(P.invuln, 0.34);
      if (P.moving) { P.dashX = wx; P.dashZ = wz; } else { P.dashX = Math.sin(P.facing); P.dashZ = Math.cos(P.facing); }
      sfx.dash(); fx.ring(P.x, P.y + 0.5, P.z, 0.5, 3, 0.3, new THREE.Color(0.6, 1.8, 3));
    }
    G.botDash = false;
    if (P.dashT > 0) {
      P.dashT -= dt;
      const steps = 3;
      for (let k = 0; k < steps; k++) movePlayer((P.dashX * 36 * dt) / steps, (P.dashZ * 36 * dt) / steps);
      for (let k = 0; k < 3; k++) fx.spawn(P.x + (Math.random() - 0.5) * 0.6, P.y + 0.4 + Math.random() * 1.6, P.z + (Math.random() - 0.5) * 0.6, 0, 0, 0, 0.35, 0.7, 0.5, 1.6, 3);
      P.facing = Math.atan2(P.dashX, P.dashZ);
    } else if (P.moving) {
      movePlayer(wx * P.speed * mag * dt, wz * P.speed * mag * dt);
      P.facing = angleLerp(P.facing, Math.atan2(wx, wz), 1 - Math.exp(-14 * dt));
      P.anim += dt * 11 * mag;
    }
    P.y = world.getHeight(P.x, P.z);
    if (P.regen > 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + P.regen * dt);
    // biome banner
    biomeT -= dt;
    if (biomeT <= 0) {
      biomeT = 0.5;
      const w = biomeWeights(P.x, P.z); let b = 0; for (let i = 1; i < 7; i++) if (w[i] > w[b]) b = i;
      if (w[b] > 0.62 && b !== curBiome) { curBiome = b; if (toastT <= 0) toast(BIOME_NAMES[b], '', 2.4); }
    }
  }

  // ---------- bot (automated playtesting) ----------
  let botStuck = 0, botLX = 0, botLZ = 0;
  function botMove() {
    let tx = 0, tz = 0, orbit = 0;
    if (ev) { tx = ev.b.x; tz = ev.b.z; orbit = 8; }
    else if (boss.state === 'active' && boss.e) { tx = boss.e.x; tz = boss.e.z; orbit = 15; }
    else if (lit() === 6 && !P.won) { tx = 0; tz = 0; }
    else {
      let bd = 1e9; for (const b of world.beacons) if (!b.lit) { const d = Math.hypot(b.x - P.x, b.z - P.z); if (d < bd) { bd = d; tx = b.x; tz = b.z; } }
      if (bd === 1e9) return [0, 0];
    }
    let dx = tx - P.x, dz = tz - P.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    if (orbit) { const k = clamp((d - orbit) / 4, -1, 1); const ox = -dz, oz = dx; dx = ox + dx * k; dz = oz + dz * k; }
    // dodge
    let rx = 0, rz = 0;
    for (const e of enemies) { const ex = P.x - e.x, ez = P.z - e.z, ed = Math.hypot(ex, ez); if (ed < 7 + e.r && ed > 0.01) { const k = (7 + e.r - ed) / ed; rx += ex * k; rz += ez * k; } }
    for (const s of eshots) { const ex = P.x - s.x, ez = P.z - s.z, ed = Math.hypot(ex, ez); if (ed < 5 && ed > 0.01) { rx += -s.vz * 0.3; rz += s.vx * 0.3; } }
    const rl = Math.hypot(rx, rz);
    if (rl > 0.5 && (orbit || rl > 3)) { const k = Math.min(1.5, rl * 0.25) / rl; dx += rx * k; dz += rz * k; if (ev && d > 11) { dx = (tx - P.x) / d; dz = (tz - P.z) / d; } }
    for (const h of hazards) if (Math.hypot(P.x - h.x, P.z - h.z) < h.r + 1) G.botDash = true;
    for (const s of shocks) if (Math.abs(Math.hypot(P.x - s.x, P.z - s.z) - s.r) < 3.5) G.botDash = true;
    if (!orbit) {
      botStuck += 1 / 30;
      if (botStuck > 3) {
        if (Math.hypot(P.x - botLX, P.z - botLZ) < 6) { const nx = P.x + dx * 30, nz = P.z + dz * 30; if (world.reachable(nx, nz) && !(sealed() && Math.hypot(nx, nz) < CROWN_R + 3)) { P.x = nx; P.z = nz; } else { const a = Math.random() * TAU; const qx = P.x + Math.cos(a) * 25, qz = P.z + Math.sin(a) * 25; if (world.reachable(qx, qz)) { P.x = qx; P.z = qz; } } }
        botStuck = 0; botLX = P.x; botLZ = P.z;
      }
    }
    return [dx, -dz];
  }

  // =====================================================================
  // Level-up UI
  // =====================================================================
  let choices = [], luOpenAt = 0;
  function openLevelUp() {
    const pool = Object.keys(UP).filter((k) => !UP[k].filler && (P.up[k] || 0) < UP[k].max);
    for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    choices = pool.slice(0, 3);
    const newW = pool.filter((k) => UP[k].w && !P.up[k]);
    if (choices.length === 3 && newW.length && !choices.some((k) => UP[k].w) && Math.random() < 0.6) choices[2] = newW[0];
    if (choices.length < 3) for (const f of ['heal', 'stardust']) if (choices.length < 3) choices.push(f);
    $('luTitle').textContent = blessing ? 'Beacon blessing' : `Level ${P.level - pendingLevels + 1}`;
    $('luSub').textContent = blessing ? 'The light offers you a gift' : 'Choose a boon';
    $('cards').innerHTML = choices.map((k, i) => {
      const u = UP[k], lv = P.up[k] || 0;
      const tag = u.filler ? 'Gift' : lv === 0 ? 'New' : `Rank ${lv} → ${lv + 1}`;
      const desc = Array.isArray(u.d) ? u.d[lv] : u.d;
      return `<button class="card${u.w ? ' w' : ''}" data-i="${i}"><span class="ic">${svg(k)}</span><span class="tx"><span class="lv">${tag}</span><span class="nm">${u.n}</span><span class="ds">${desc}</span></span><span class="k">${i + 1}</span></button>`;
    }).join('');
    setState('levelup'); sfx.levelup(); luOpenAt = performance.now();
    if (G.bot) choose((Math.random() * choices.length) | 0);
  }
  function choose(i, force) {
    if (state !== 'levelup' || !choices[i]) return;
    if (!G.bot && !force && performance.now() - luOpenAt < 450) return;
    const k = choices[i];
    if (k === 'heal') P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.5);
    else if (k === 'stardust') P.stardust++;
    else { P.up[k] = (P.up[k] || 0) + 1; if (k === 'vigor') P.hp += 25; }
    recompute(); renderLoadout(); sfx.pick();
    pendingLevels--; blessing = false;
    fx.burst(P.x, P.y + 1.2, P.z, 30, 7, 3, 2.4, 1, { life: 0.8, size: 0.6 });
    P.invuln = Math.max(P.invuln, 0.8);
    choices = [];
    setState('playing'); save();
    if (pendingLevels > 0) openLevelUp();
  }
  $('cards').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) choose(+c.dataset.i); });

  // =====================================================================
  // Simulation step
  // =====================================================================
  function step(dt) {
    time += dt;
    updatePlayer(dt);
    updateWeapons(dt);
    updateShots(dt);
    if (state === 'playing') updateEnemies(dt);
    updateGems(dt);
    if (state !== 'playing') return;
    updateEvents(dt);
    if (victoryT > 0) {
      victoryT -= dt / timeScale;
      timeScale = Math.min(1, timeScale + dt * 0.25);
      if (victoryT <= 0) { timeScale = 1; showVictory(); return; }
    }
    saveT += dt;
    if (saveT > 20 && !ev && boss.state !== 'active') { saveT = 0; save(); }
    if (state === 'playing' && pendingLevels > 0 && victoryT <= 0) openLevelUp();
  }
  function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }
  function showVictory() {
    $('vstats').innerHTML = `<div><b>${fmtTime(P.time)}</b>Journey</div><div><b>${P.level}</b>Level</div><div><b>${P.kills}</b>Shadows banished</div><div><b>${P.shards}/${shards.length}</b>Star shards</div>`;
    sfx.victory(); setState('victory'); save();
  }

  // =====================================================================
  // Visual sync + render
  // =====================================================================
  const _m4 = new THREE.Matrix4(), _p3 = new THREE.Vector3(), _q4 = new THREE.Quaternion(), _s3 = new THREE.Vector3(), _e3 = new THREE.Euler();
  const FLASH = new THREE.Color(14, 14, 14), ELITE = new THREE.Color(2.4, 1.25, 0.7), WHITE = new THREE.Color(1, 1, 1);
  function setInst(mesh, i, x, y, z, s, ry = 0, sy = s) {
    _e3.set(0, ry, 0); _m4.compose(_p3.set(x, y, z), _q4.setFromEuler(_e3), _s3.set(s, sy, s)); mesh.setMatrixAt(i, _m4);
  }
  function syncVisuals(dt, rt) {
    // hero
    hero.position.set(P.x, P.y, P.z); hero.rotation.y = P.facing;
    const run = P.moving && P.dashT <= 0 ? 1 : 0, sw = Math.sin(P.anim);
    footL.position.z = 0.04 + sw * 0.32 * run; footL.position.y = 0.1 + Math.max(0, Math.cos(P.anim)) * 0.22 * run;
    footR.position.z = 0.04 - sw * 0.32 * run; footR.position.y = 0.1 + Math.max(0, -Math.cos(P.anim)) * 0.22 * run;
    heroBody.position.y = Math.abs(Math.sin(P.anim)) * 0.1 * run + Math.sin(rt * 2) * 0.025;
    heroBody.rotation.x = damp(heroBody.rotation.x, P.dashT > 0 ? 0.5 : run * 0.16, 12, dt);
    staff.position.y = heroBody.position.y + Math.sin(rt * 2.4) * 0.03; staff.rotation.x = run * 0.14 + sw * 0.05 * run;
    hero.visible = state !== 'dead' && !(P.hurtT > 0 && Math.floor(rt * 30) % 2 === 0);
    const pulse = 1 + Math.sin(rt * 7) * 0.08;
    lantern.scale.setScalar(pulse); lantern.rotation.y = rt * 2;
    lamp.position.set(P.x, P.y + 5.5, P.z); lamp.intensity = lerp(62, 22, world.dawn) * pulse;
    // enemies
    const cnt = { shade: 0, brute: 0, spitter: 0, wraith: 0 };
    for (const e of enemies) {
      if (e.boss || e.dead) continue;
      const m = eMesh[e.type], i = cnt[e.type]++;
      let yo = 0, sy = 1;
      if (e.type === 'shade') { const h = Math.abs(Math.sin(time * 7 + e.ph)); yo = h * 0.55; sy = 0.85 + h * 0.3; }
      else if (e.type === 'brute') { yo = Math.abs(Math.sin(time * 3.6 + e.ph)) * 0.3; }
      else if (e.type === 'spitter') { sy = 1 + Math.sin(time * 3 + e.ph) * 0.06; }
      else { yo = 0.45 + Math.sin(time * 3 + e.ph) * 0.3; }
      const s = e.scale * Math.min(1, e.age / 0.35 + 0.05);
      setInst(m, i, e.x, e.y + yo * e.scale, e.z, s, e.face, s * sy);
      m.setColorAt(i, e.flash > 0 ? FLASH : e.elite ? ELITE : WHITE);
    }
    for (const k in eMesh) { const m = eMesh[k]; m.count = eGhost[k].count = cnt[k]; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
    // titan
    if (boss.state !== 'dead') {
      const e = boss.e, act = !!e;
      boss.rise = damp(boss.rise, act ? 1 : 0, 2.5, dt);
      const bob = Math.sin(rt * 1.6) * 0.5 * boss.rise;
      if (act) { titan.position.set(e.x, e.y + 1.2 + bob, e.z); titan.rotation.y = e.face; }
      else titan.position.y = world.crownY - 2.2 * (1 - boss.rise);
      titan.scale.setScalar(0.8 + 0.2 * boss.rise);
      titanMat.emissiveIntensity = act && e.flash > 0 ? 0.035 : 0;
      const hb = Math.sin(rt * 2.1);
      handL.position.set(-5.3, 3.6 + hb * 0.5 * boss.rise + boss.rise, 1.2); handR.position.set(5.3, 3.6 - hb * 0.5 * boss.rise + boss.rise, 1.2);
      titan.visible = true;
      if (act) el.bossfill.style.width = ((e.hp / e.maxHp) * 100).toFixed(1) + '%';
    } else titan.visible = false;
    // shots
    let n = 0;
    for (const s of pshots) setInst(pshotMesh, n++, s.x, s.y, s.z, 0.3);
    pshotMesh.count = n; pshotMesh.instanceMatrix.needsUpdate = true;
    n = 0;
    for (const s of eshots) { if (n >= 200) break; setInst(eshotMesh, n++, s.x, s.y, s.z, 0.42 + Math.sin(rt * 14 + n) * 0.05); }
    eshotMesh.count = n; eshotMesh.instanceMatrix.needsUpdate = true;
    n = 0;
    if (P.up.wisps && state !== 'title') {
      const lv = P.up.wisps, wn = [0, 2, 3, 3, 4, 5, 6][lv], rad = 4 + 0.3 * lv;
      for (let k = 0; k < wn; k++) {
        const a = P.wispA + (k / wn) * TAU, x = P.x + Math.cos(a) * rad, z = P.z + Math.sin(a) * rad, y = Math.max(world.getHeight(x, z), P.y) + 1.2;
        setInst(wispMesh, n++, x, y, z, 0.38);
        if (state === 'playing' && Math.random() < 0.5) fx.spawn(x, y, z, 0, 0.5, 0, 0.3, 0.55, 3, 1.4, 0.3);
      }
    }
    wispMesh.count = n; wispMesh.instanceMatrix.needsUpdate = true;
    n = 0;
    for (const c of comets) { if (n >= 12) break; const k = Math.max(0, c.t / c.dur); setInst(cometMesh, n++, c.x + k * 9, c.y + k * 34, c.z + k * 4, 0.8); }
    cometMesh.count = n; cometMesh.instanceMatrix.needsUpdate = true;
    n = 0;
    for (const g of gems) {
      const big = g.heart ? 1.5 : g.val >= 8 ? 1.5 : g.val >= 3 ? 1.2 : 0.9;
      setInst(gemMesh, n, g.x, g.y + Math.sin(g.t * 3) * 0.12, g.z, big, g.t * 2.5);
      const c = GEM_C[g.heart ? 3 : g.val >= 8 ? 2 : g.val >= 3 ? 1 : 0];
      gemMesh.setColorAt(n++, _col.setRGB(c[0], c[1], c[2]));
    }
    gemMesh.count = n; gemMesh.instanceMatrix.needsUpdate = true; gemMesh.instanceColor.needsUpdate = true;
    for (const s of shards) if (!s.got) { s.m.rotation.y = rt * 1.5 + s.i; s.m.position.y = 1.7 + Math.sin(rt * 2 + s.i) * 0.25; }
    for (const c of chests) { c.a = damp(c.a, c.open ? 1 : 0, 6, dt); c.lid.rotation.x = -c.a * 1.9; }
  }

  function updateCamera(dt, rt) {
    if (state === 'title') {
      const a = rt * 0.07 + 0.6, r = 30;
      camera.position.set(P.x + Math.sin(a) * r, P.y + 11, P.z + Math.cos(a) * r);
      camera.lookAt(P.x, P.y + 5, P.z - 4);
      return;
    }
    if (state === 'playing') {
      camYaw -= input.camDX * 0.0055 + input.rot * dt * 2.2;
      camPitch = clamp(camPitch + input.camDY * 0.004, 0.45, 1.3);
      camDistT = clamp(camDistT + input.zoom, 14, 40);
    }
    const want = (camDistT + (ev || boss.state === 'active' ? 7 : 0)) * (W < H ? 1.25 : 1);
    camDist = damp(camDist, want, 3, dt);
    camTarget.x = damp(camTarget.x, P.x, 9, dt); camTarget.y = damp(camTarget.y, P.y + 1.5, 6, dt); camTarget.z = damp(camTarget.z, P.z, 9, dt);
    const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
    let cx = camTarget.x + Math.sin(camYaw) * cp * camDist, cy = camTarget.y + sp * camDist, cz = camTarget.z + Math.cos(camYaw) * cp * camDist;
    cy = Math.max(cy, world.getHeight(cx, cz) + 2.5, 1.5);
    const sh = fx.shake * fx.shake * 1.3;
    camera.position.set(cx + (Math.random() - 0.5) * sh, cy + (Math.random() - 0.5) * sh, cz + (Math.random() - 0.5) * sh);
    camera.lookAt(camTarget.x, camTarget.y, camTarget.z);
  }

  let hpShown = -1, lastLvl = -1, lastPips = -1, lastShards = -1;
  function updateHud(dt) {
    const hp = Math.ceil(P.hp);
    if (hp !== hpShown || lastLvl !== P.level) {
      hpShown = hp; const w = ((P.hp / P.maxHp) * 100).toFixed(1) + '%';
      el.hpfill.style.width = w; el.hplag.style.width = w; el.hptext.textContent = `${hp} / ${P.maxHp}`;
    }
    el.xpfill.style.width = ((P.xp / xpNeed(P.level)) * 100).toFixed(1) + '%';
    if (lastLvl !== P.level) { lastLvl = P.level; el.lvl.textContent = P.level; }
    const n = lit();
    if (n !== lastPips) { lastPips = n; world.beacons.forEach((b, i) => el.pips[i].classList.toggle('on', b.lit)); }
    if (lastShards !== P.shards) { lastShards = P.shards; el.shards.textContent = `✦ ${P.shards}/${shards.length}`; }
    setObjective(P.won ? 'The isle is at peace. Explore as you please.' : boss.state === 'active' ? 'Unmake the Umbra Titan' : ev ? 'Defend the beacon' : n === 6 ? 'Climb to the Crown at the heart of the isle' : n === 0 ? 'Kindle the first beacon' : `Kindle the beacons · ${n} of 6`);
    const cd = clamp(P.dashCd / 1.5, 0, 1);
    el.dashcd.style.height = (cd * 100).toFixed(0) + '%'; el.dashbtn.classList.toggle('ready', cd <= 0);
    el.lowhp.style.opacity = P.hp < P.maxHp * 0.3 && state === 'playing' ? 0.6 + Math.sin(time * 6) * 0.3 : 0;
    const v = +el.vignette.style.opacity || 0; if (v > 0) el.vignette.style.opacity = Math.max(0, v - dt * 2.2);
    if (flashA > 0) { flashA = Math.max(0, flashA - dt * 1.3); el.flash.style.opacity = flashA * 0.7; }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) el.toast.classList.remove('on'); }
    if (hintT > 0) { hintT -= dt; if (hintT <= 0) el.hint.classList.remove('on'); }
    else if (hintQ.length && state === 'playing' && hintT < -0.7) { const [t, d] = hintQ.shift(); el.hint.textContent = t; el.hint.classList.add('on'); hintT = d; }
    else hintT -= dt;
    mmT -= dt; if (mmT <= 0) { mmT = 0.1; drawMinimap(); }
  }

  // =====================================================================
  // Main loop
  // =====================================================================
  let lastT = performance.now(), rt = 0, perfT = 0, perfN = 0, perfSkip = 1;
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = (now - lastT) / 1000; lastT = now;
    const dt = Math.min(0.05, Math.max(0, raw));
    rt += dt;
    input.poll();
    if (state === 'playing') step(dt * timeScale);
    const live = state !== 'pause' && state !== 'levelup';
    syncVisuals(dt, rt);
    updateCamera(dt, rt);
    world.update(dt, rt, P.x, P.y, P.z, camera, sealed());
    fx.update(live ? dt : 0, W, H);
    if (state !== 'title' && state !== 'loading') updateHud(dt);
    musicTick({ day: P.won, tense: !!ev || boss.state === 'active' });
    renderer.toneMappingExposure = world.state.exposure;
    composer.render();
    input.consume();
    // adaptive resolution
    if (raw < 0.25) {
      perfT += raw; perfN++;
      if (perfT > 2.5) {
        if (perfSkip > 0) perfSkip--;
        else if (perfT / perfN > 1 / 38 && prIdx < PR_STEPS.length - 1) { prIdx++; resize(); perfSkip = 1; }
        perfT = 0; perfN = 0;
      }
    }
  }

  // =====================================================================
  // Buttons / keys
  // =====================================================================
  const keysHtml = isTouch
    ? '<span><b>Left thumb</b> move</span><span><b>Right thumb</b> look</span><span><b>Dash button</b> dodge</span><span><b>Pinch</b> zoom</span>'
    : '<span><b>WASD</b> move</span><span><b>Mouse drag</b> or <b>Q / E</b> look</span><span><b>Space</b> dash</span><span><b>Wheel</b> zoom</span><span><b>Esc</b> pause</span>';
  $('keys').innerHTML = keysHtml; $('keys2').innerHTML = keysHtml;
  const existing = loadSave();
  if (existing) { show('btnContinue', true); $('btnNew').classList.add('ghost'); $('btnNew').textContent = 'New journey'; }
  let confirmNew = false;
  $('btnContinue').onclick = () => { initAudio(); startGame(loadSave()); };
  $('btnNew').onclick = () => {
    if (loadSave() && !confirmNew) { confirmNew = true; $('btnNew').textContent = 'Erase progress and begin?'; return; }
    initAudio(); clearSave(); startGame(null);
  };
  $('btnResume').onclick = () => { if (state === 'pause') setState('playing'); };
  let confirmRestart = false;
  $('btnRestart').onclick = () => {
    if (!confirmRestart) { confirmRestart = true; $('btnRestart').textContent = 'Erase progress and restart?'; return; }
    confirmRestart = false; $('btnRestart').textContent = 'Start over'; clearSave(); startGame(null);
  };
  function pause() { if (state === 'playing') { confirmRestart = false; $('btnRestart').textContent = 'Start over'; save(); setState('pause'); } }
  $('btnPause').onclick = pause;
  $('btnMute').onclick = () => { initAudio(); setMuted(!isMuted()); $('btnMute').classList.toggle('off', isMuted()); };
  $('btnRise').onclick = respawn;
  $('btnExplore').onclick = () => { setState('playing'); toast('Dawn has come', 'Seek the star shards still hidden across the isle', 4); };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'playing') pause(); else if (state === 'pause') setState('playing'); }
    else if (e.code === 'KeyM') $('btnMute').click();
    else if (state === 'levelup' && /^(Digit|Numpad)[1-3]$/.test(e.code)) choose(+e.code.slice(-1) - 1);
    else if (state === 'dead' && (e.code === 'Enter' || e.code === 'Space')) respawn();
  });
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });
  window.addEventListener('pointerdown', () => { if (state !== 'title') initAudio(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); suspendAudio(true); } else suspendAudio(false); });
  window.addEventListener('pagehide', save);

  // debug / automated testing hook
  window.__g = {
    P, G, world, enemies, boss, get state() { return state; }, get ev() { return ev; }, lit,
    sim(sec, dt = 1 / 30) { for (let t = 0; t < sec && (state === 'playing' || state === 'levelup'); t += dt) { if (state === 'playing') step(dt); } return state; },
    start: () => startGame(null), respawn, choose: (i) => choose(i, true), lightBeacon, toast,
    cam(y, p, d) { camYaw = y; camPitch = p; camDistT = camDist = d; },
  };

  setState('title');
  show('loading', false);
  requestAnimationFrame(frame);
}

window.addEventListener('error', (e) => { const t = document.getElementById('loadText'); if (t && !document.getElementById('loading').hidden) t.textContent = 'Something went wrong while loading: ' + e.message; });
setTimeout(boot, 30);
