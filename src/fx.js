import * as THREE from 'three';

const MAXP = 2200;

export function createFx(scene, camera) {
  // ---------- particles ----------
  const pos = new Float32Array(MAXP * 3), col = new Float32Array(MAXP * 3), size = new Float32Array(MAXP);
  const vel = new Float32Array(MAXP * 3), life = new Float32Array(MAXP), maxLife = new Float32Array(MAXP);
  const base = new Float32Array(MAXP * 4), grav = new Float32Array(MAXP);
  let head = 0;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 600 } },
    vertexShader: `attribute vec3 aColor; attribute float aSize; uniform float uScale; varying vec3 vC;
      void main(){ vC = aColor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d); gl_FragColor = vec4(vC * a, 1.0); }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  function spawn(x, y, z, vx, vy, vz, lf, sz, r, g, b, gr = 0) {
    const i = head; head = (head + 1) % MAXP;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
    life[i] = maxLife[i] = lf; grav[i] = gr;
    base[i * 4] = r; base[i * 4 + 1] = g; base[i * 4 + 2] = b; base[i * 4 + 3] = sz;
  }
  function burst(x, y, z, n, speed, r, g, b, o = {}) {
    const lf = o.life ?? 0.5, sz = o.size ?? 0.5, up = o.up ?? 0.3, gr = o.grav ?? 6;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.283, e = (Math.random() - 0.5 + up) * 2, s = speed * (0.35 + Math.random() * 0.65);
      const ce = Math.cos(e * 0.8);
      spawn(x, y, z, Math.cos(a) * ce * s, Math.sin(e * 0.8) * s + up * speed, Math.sin(a) * ce * s, lf * (0.6 + Math.random() * 0.6), sz * (0.6 + Math.random() * 0.8), r, g, b, gr);
    }
  }
  function updateParticles(dt) {
    for (let i = 0; i < MAXP; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      const j = i * 3;
      if (life[i] <= 0) { size[i] = 0; continue; }
      vel[j + 1] -= grav[i] * dt;
      const dr = 1 - 1.8 * dt;
      vel[j] *= dr; vel[j + 2] *= dr;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      const t = life[i] / maxLife[i];
      col[j] = base[i * 4] * t; col[j + 1] = base[i * 4 + 1] * t; col[j + 2] = base[i * 4 + 2] * t;
      size[i] = base[i * 4 + 3] * (0.4 + 0.6 * t);
    }
    geo.attributes.position.needsUpdate = geo.attributes.aColor.needsUpdate = geo.attributes.aSize.needsUpdate = true;
  }

  // ---------- pooled transient meshes ----------
  function pool(n, make) {
    const items = [];
    for (let i = 0; i < n; i++) { const m = make(); m.visible = false; m.userData.t = 0; scene.add(m); items.push(m); }
    let k = 0;
    return { items, next() { const m = items[k]; k = (k + 1) % n; return m; } };
  }
  const addMat = (o = {}) => new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, ...o });
  const ringGeo = new THREE.RingGeometry(0.9, 1, 72); ringGeo.rotateX(-Math.PI / 2);
  const discGeo = new THREE.CircleGeometry(1, 48); discGeo.rotateX(-Math.PI / 2);
  const sphGeo = new THREE.IcosahedronGeometry(1, 2);

  const thinGeo = new THREE.RingGeometry(0.965, 1, 96); thinGeo.rotateX(-Math.PI / 2);
  const rings = pool(10, () => new THREE.Mesh(ringGeo, addMat()));
  // expanding ring: r0 -> r1 over dur
  function ring(x, y, z, r0, r1, dur, color) {
    const m = rings.next(); const u = m.userData;
    m.position.set(x, y, z); m.material.color.copy(color); m.visible = true;
    u.t = 0; u.dur = dur; u.r0 = r0; u.r1 = r1; u.lin = false; m.geometry = ringGeo;
    return m;
  }
  const blasts = pool(10, () => new THREE.Mesh(sphGeo, addMat({ side: THREE.FrontSide })));
  function blast(x, y, z, r, dur, color) {
    const m = blasts.next(); const u = m.userData;
    m.position.set(x, y, z); m.material.color.copy(color); m.visible = true; u.t = 0; u.dur = dur; u.r = r;
  }
  // telegraph decals
  const decals = pool(16, () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(ringGeo, addMat()), new THREE.Mesh(discGeo, addMat()));
    return g;
  });
  function telegraph(x, y, z, r, dur, color, k = 1) {
    const g = decals.next(); const u = g.userData;
    g.position.set(x, y + 0.35, z); g.visible = true; u.t = 0; u.dur = dur; u.r = r; u.k = k;
    g.children[0].material.color.copy(color); g.children[1].material.color.copy(color);
    g.children[0].scale.setScalar(r);
    return g;
  }

  // lightning bolts
  const boltGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 5, 1, true); boltGeo.translate(0, 0.5, 0);
  const MAXB = 90;
  const boltMesh = new THREE.InstancedMesh(boltGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 3.2, 6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), MAXB);
  boltMesh.frustumCulled = false; boltMesh.count = 0; scene.add(boltMesh);
  const bolts = [];
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function lightning(ax, ay, az, bx, by, bz) {
    const segs = 5; let px = ax, py = ay, pz = az;
    const len = Math.hypot(bx - ax, by - ay, bz - az), j = Math.min(1.2, len * 0.12);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs, e = i === segs ? 0 : 1;
      const nx = ax + (bx - ax) * t + (Math.random() - 0.5) * j * 2 * e, ny = ay + (by - ay) * t + (Math.random() - 0.5) * j * e, nz = az + (bz - az) * t + (Math.random() - 0.5) * j * 2 * e;
      if (bolts.length < MAXB) bolts.push({ ax: px, ay: py, az: pz, bx: nx, by: ny, bz: nz, t: 0.16 });
      px = nx; py = ny; pz = nz;
    }
  }

  // ---------- damage numbers ----------
  const dmgRoot = document.getElementById('dmg');
  const DN = 36, dn = [];
  for (let i = 0; i < DN; i++) { const el = document.createElement('div'); el.className = 'dn'; dmgRoot.appendChild(el); dn.push({ el, t: 0, x: 0, y: 0, z: 0 }); }
  let dnk = 0;
  const _v = new THREE.Vector3();
  function number(x, y, z, text, cls = '') {
    const d = dn[dnk]; dnk = (dnk + 1) % DN;
    d.x = x + (Math.random() - 0.5) * 0.8; d.y = y; d.z = z + (Math.random() - 0.5) * 0.8; d.t = 0.7;
    d.el.textContent = text; d.el.className = 'dn ' + cls; d.el.style.display = 'block';
  }

  let shake = 0;
  function update(dt, w, h) {
    updateParticles(dt);
    for (const m of rings.items) if (m.visible) {
      const u = m.userData; u.t += dt; const t = u.t / u.dur;
      if (t >= 1) { m.visible = false; continue; }
      m.scale.setScalar(u.r0 + (u.r1 - u.r0) * (u.lin ? t : 1 - (1 - t) * (1 - t))); m.material.opacity = u.lin ? Math.min(1, (1 - t) * 4) : 1 - t;
    }
    for (const m of blasts.items) if (m.visible) {
      const u = m.userData; u.t += dt; const t = u.t / u.dur;
      if (t >= 1) { m.visible = false; continue; }
      m.scale.setScalar(u.r * (0.3 + 0.7 * Math.sqrt(t))); m.material.opacity = (1 - t) * 0.4;
    }
    for (const g of decals.items) if (g.visible) {
      const u = g.userData; u.t += dt; const t = u.t / u.dur;
      if (t >= 1) { g.visible = false; continue; }
      g.children[1].scale.setScalar(Math.max(0.01, u.r * t));
      g.children[0].material.opacity = 0.9 * u.k; g.children[1].material.opacity = (0.18 + 0.25 * t) * u.k;
    }
    let n = 0;
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.t -= dt;
      if (b.t <= 0) { bolts[i] = bolts[bolts.length - 1]; bolts.pop(); continue; }
    }
    for (const b of bolts) {
      _a.set(b.ax, b.ay, b.az); _b.set(b.bx, b.by, b.bz); _d.subVectors(_b, _a);
      const len = _d.length() || 0.001; _q.setFromUnitVectors(UP, _d.divideScalar(len));
      const wd = 0.5 + (b.t / 0.16) * 1.3;
      boltMesh.setMatrixAt(n++, _m.compose(_a, _q, _s.set(wd, len, wd)));
    }
    boltMesh.count = n; boltMesh.instanceMatrix.needsUpdate = true;
    for (const d of dn) {
      if (d.t <= 0) continue;
      d.t -= dt;
      if (d.t <= 0) { d.el.style.display = 'none'; continue; }
      d.y += dt * 2.2;
      _v.set(d.x, d.y, d.z).project(camera);
      if (_v.z > 1) { d.el.style.display = 'none'; d.t = 0; continue; }
      d.el.style.transform = `translate(${((_v.x * 0.5 + 0.5) * w).toFixed(1)}px,${((-_v.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%,-50%) scale(${(0.8 + Math.min(1, (0.7 - d.t) * 8) * 0.3).toFixed(2)})`;
      d.el.style.opacity = Math.min(1, d.t * 3).toFixed(2);
    }
    shake = Math.max(0, shake - dt * 2.4);
  }
  function clearNumbers() { for (const d of dn) { d.t = 0; d.el.style.display = 'none'; } }

  return {
    spawn, burst, ring, blast, telegraph, thinGeo, lightning, number, update, clearNumbers,
    setScale(s) { mat.uniforms.uScale.value = s; },
    addShake(a) { shake = Math.min(1, shake + a); },
    get shake() { return shake; },
  };
}
