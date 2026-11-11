let ctx = null, master, sfxBus, musicBus, delay, noiseBuf;
const vol = { master: 0.8, music: 0.5, sfx: 0.9 };
const last = {};

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = vol.master;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = vol.music; musicBus.connect(master);
    delay = ctx.createDelay(1); delay.delayTime.value = 0.33;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(musicBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ctx = null; }
}
export function setVolumes(m, mu, s) {
  vol.master = m; vol.music = mu; vol.sfx = s;
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(m, t, 0.05); musicBus.gain.setTargetAtTime(mu, t, 0.05); sfxBus.gain.setTargetAtTime(s, t, 0.05);
}
export function suspendAudio(s) { if (!ctx) return; try { s ? ctx.suspend() : ctx.resume(); } catch (e) { /* ignore */ } }

function limit(name, gap) {
  if (!ctx || ctx.state !== 'running') return false;
  const t = ctx.currentTime; if (last[name] && t - last[name] < gap) return false; last[name] = t; return true;
}
function tone(f0, f1, dur, type, v, when = 0, bus = sfxBus, attack = 0.005) {
  const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  return g;
}
function noise(dur, v, f0, f1, type = 'lowpass', when = 0) {
  const t = ctx.currentTime + when, s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
const brass = (notes, step, dur, v) => notes.forEach((n, i) => { const f = 220 * Math.pow(2, n / 12); tone(f, f, dur, 'sawtooth', v, i * step, sfxBus, 0.03); tone(f * 1.003, f * 1.003, dur, 'square', v * 0.4, i * step, sfxBus, 0.03); });

export const sfx = {
  swing() { if (limit('swing', 0.08)) noise(0.14, 0.11, 900, 3000, 'bandpass'); },
  hit() { if (limit('hit', 0.05)) { noise(0.09, 0.2, 1800, 400); tone(160, 70, 0.1, 'square', 0.07); } },
  clang() { if (limit('clang', 0.06)) { tone(1900, 1500, 0.22, 'triangle', 0.1); tone(2850, 2400, 0.16, 'sine', 0.06); noise(0.05, 0.1, 5000, 3000, 'highpass'); } },
  parry() { if (limit('parry', 0.1)) { tone(2400, 2300, 0.4, 'triangle', 0.14); tone(3600, 3500, 0.3, 'sine', 0.08); } },
  hurt() { if (limit('hurt', 0.15)) { tone(170, 60, 0.25, 'sawtooth', 0.15); noise(0.12, 0.14, 900, 200); } },
  dodge() { if (limit('dodge', 0.1)) noise(0.2, 0.1, 500, 2000, 'bandpass'); },
  throw() { if (limit('throw', 0.1)) noise(0.25, 0.1, 2400, 600, 'bandpass'); },
  arrow() { if (limit('arrow', 0.1)) noise(0.12, 0.07, 4000, 1500, 'bandpass'); },
  kill() { if (limit('kill', 0.06)) { tone(220, 60, 0.3, 'sawtooth', 0.07); noise(0.2, 0.1, 700, 150); } },
  coin() { if (limit('coin', 0.07)) { tone(2100, 2100, 0.09, 'triangle', 0.07); tone(2800, 2800, 0.14, 'triangle', 0.06, 0.06); } },
  click() { if (limit('click', 0.04)) tone(700, 520, 0.06, 'triangle', 0.06); },
  eat() { if (limit('eat', 0.2)) { tone(420, 620, 0.2, 'sine', 0.1); tone(620, 840, 0.25, 'sine', 0.07, 0.12); } },
  talk() { if (limit('talk', 0.05)) tone(360 + Math.random() * 120, 300, 0.07, 'triangle', 0.045); },
  discover() { if (limit('disc', 0.5)) brass([0, 7, 12], 0.16, 0.9, 0.06); },
  quest() { if (limit('quest', 0.5)) brass([0, 5, 7, 12, 16], 0.13, 1.0, 0.06); },
  step() { if (limit('qstep', 0.3)) { tone(660, 660, 0.25, 'triangle', 0.09); tone(880, 880, 0.35, 'triangle', 0.08, 0.12); } },
  levelup() { if (limit('lvl', 0.5)) brass([0, 4, 7, 12, 16, 19], 0.09, 0.8, 0.055); },
  death() { if (limit('death', 0.5)) { tone(300, 50, 1.4, 'sawtooth', 0.13); tone(200, 40, 1.6, 'sine', 0.2); } },
  horse() { if (limit('horse', 0.4)) { tone(900, 500, 0.35, 'sawtooth', 0.05); tone(700, 380, 0.4, 'square', 0.03, 0.08); } },
  sail() { if (limit('sail', 0.5)) { noise(1.2, 0.12, 300, 1400, 'bandpass'); tone(98, 98, 1.0, 'sine', 0.1); } },
  travel() { if (limit('travel', 0.5)) noise(0.9, 0.12, 400, 3000, 'bandpass'); },
  splash() { if (limit('splash', 0.15)) { noise(0.45, 0.16, 2600, 500, 'bandpass'); noise(0.2, 0.1, 900, 300); } },
  alert() { if (limit('alert', 0.4)) { tone(620, 930, 0.18, 'square', 0.07); tone(930, 930, 0.3, 'square', 0.06, 0.16); } },
  hoof() { if (limit('hoof', 0.13)) noise(0.05, 0.05, 500, 200); },
};

// ---------- music: a slow lyre in an ancient-sounding mode over a drone ----------
const MODES = { calm: [0, 2, 3, 5, 7, 9, 10, 12], east: [0, 1, 4, 5, 7, 8, 10, 12], war: [0, 1, 3, 5, 7, 8, 10, 12] };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let nextDrone = 0, nextPluck = 0, phrase = 0, step = 0;
export function musicTick(mood) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime, root = mood.sea ? 50 : 52, mode = MODES[mood.war ? 'war' : mood.east ? 'east' : 'calm'];
  if (t > nextDrone - 0.3) {
    const s = Math.max(t, nextDrone);
    for (const [n, v] of [[root - 12, 0.05], [root - 5, 0.028], [root, 0.022]]) for (const det of [-5, 5]) {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = det; f.type = 'lowpass'; f.frequency.value = mood.night ? 380 : 620;
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(v, s + 3); g.gain.setValueAtTime(v, s + 7); g.gain.linearRampToValueAtTime(0.0001, s + 11);
      o.connect(f); f.connect(g); g.connect(musicBus); o.start(s); o.stop(s + 11.2);
    }
    nextDrone = s + 9;
  }
  if (t > nextPluck) {
    const beat = mood.war ? 0.24 : 0.42;
    if (step === 0) phrase = Math.floor(Math.random() * 5);
    const walk = [0, 1, 2, 1, 3, 2, 4, 2][step % 8];
    const rest = Math.random() < (mood.war ? 0.15 : 0.3);
    if (!rest) {
      const n = root + 12 + mode[(phrase + walk) % 8];
      const g = tone(mtof(n), mtof(n), 1.1, 'triangle', 0.07, 0.02, musicBus, 0.004); g.connect(delay);
      tone(mtof(n) * 2, mtof(n) * 2, 0.5, 'sine', 0.02, 0.02, musicBus, 0.004);
    }
    if (mood.war && step % 2 === 0) { tone(70, 45, 0.22, 'sine', 0.2, 0.02, musicBus); }
    step = (step + 1) % 16;
    nextPluck = t + beat * (step % 8 === 0 && !mood.war ? 4 : 1);
  }
}
