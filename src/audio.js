let ctx = null, master, sfxBus, musicBus, delay, noiseBuf;
let muted = false;
const last = {};

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
    delay = ctx.createDelay(1); delay.delayTime.value = 0.38;
    const fb = ctx.createGain(); fb.gain.value = 0.42;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(musicBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ctx = null; }
}
export function setMuted(m) { muted = m; if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05); }
export const isMuted = () => muted;
export function suspendAudio(s) { if (!ctx) return; try { s ? ctx.suspend() : ctx.resume(); } catch (e) { /* ignore */ } }

function limit(name, gap) {
  if (!ctx || ctx.state !== 'running') return false;
  const t = ctx.currentTime;
  if (last[name] && t - last[name] < gap) return false;
  last[name] = t; return true;
}
function tone(f0, f1, dur, type, vol, when = 0, bus = sfxBus, attack = 0.005) {
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  return g;
}
function noise(dur, vol, f0, f1, type = 'lowpass', when = 0) {
  const t = ctx.currentTime + when;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

let xpStep = 0, xpTime = 0;
export const sfx = {
  shoot() { if (limit('shoot', 0.09)) tone(900, 420, 0.09, 'triangle', 0.05); },
  hit() { if (limit('hit', 0.05)) noise(0.05, 0.07, 3000, 1200, 'bandpass'); },
  kill() { if (limit('kill', 0.06)) { tone(300, 80, 0.16, 'square', 0.04); noise(0.1, 0.06, 1800, 300); } },
  xp() {
    if (!limit('xp', 0.04)) return;
    const t = ctx.currentTime; if (t - xpTime > 0.6) xpStep = 0; xpTime = t;
    const n = [0, 2, 4, 7, 9, 12, 14, 16][xpStep % 8]; xpStep++;
    tone(880 * Math.pow(2, n / 12), 880 * Math.pow(2, n / 12), 0.1, 'sine', 0.05);
  },
  dash() { if (limit('dash', 0.1)) noise(0.22, 0.16, 600, 3200, 'bandpass'); },
  hurt() { if (limit('hurt', 0.15)) { tone(180, 60, 0.25, 'sawtooth', 0.14); noise(0.12, 0.12, 900, 200); } },
  nova() { if (limit('nova', 0.2)) { tone(240, 60, 0.4, 'sine', 0.16); noise(0.3, 0.07, 400, 2400, 'bandpass'); } },
  zap() { if (limit('zap', 0.15)) { noise(0.14, 0.09, 5000, 1500, 'highpass'); tone(1400, 300, 0.12, 'sawtooth', 0.03); } },
  boom() { if (limit('boom', 0.1)) { tone(120, 35, 0.45, 'sine', 0.26); noise(0.35, 0.16, 1400, 120); } },
  warn() { if (limit('warn', 0.2)) tone(520, 480, 0.18, 'square', 0.03); },
  levelup() { if (limit('lvl', 0.3)) [0, 4, 7, 12, 16].forEach((n, i) => tone(523 * Math.pow(2, n / 12), 523 * Math.pow(2, n / 12), 0.35, 'triangle', 0.1, i * 0.07)); },
  pick() { if (limit('pick', 0.1)) { tone(660, 990, 0.14, 'triangle', 0.1); tone(990, 1320, 0.2, 'sine', 0.07, 0.08); } },
  shard() { if (limit('shard', 0.2)) [0, 7, 12, 19].forEach((n, i) => tone(784 * Math.pow(2, n / 12), 784 * Math.pow(2, n / 12), 0.5, 'sine', 0.09, i * 0.09)); },
  chest() { if (limit('chest', 0.2)) { noise(0.15, 0.1, 500, 1500); [0, 5, 9].forEach((n, i) => tone(440 * Math.pow(2, n / 12), 440 * Math.pow(2, n / 12), 0.3, 'triangle', 0.09, 0.08 + i * 0.08)); } },
  heal() { if (limit('heal', 0.2)) { tone(520, 780, 0.25, 'sine', 0.1); } },
  beaconStart() { if (limit('bs', 0.5)) { tone(110, 110, 2.2, 'sine', 0.3); tone(220, 220, 1.8, 'triangle', 0.12); tone(330, 330, 1.5, 'sine', 0.08, 0.1); } },
  beaconDone() {
    if (!limit('bd', 0.5)) return;
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone(262 * Math.pow(2, n / 12), 262 * Math.pow(2, n / 12), 2.4 - i * 0.15, 'triangle', 0.1, i * 0.11));
    tone(65, 65, 2.5, 'sine', 0.3); noise(1.6, 0.1, 300, 5000, 'bandpass');
  },
  roar() { if (limit('roar', 0.5)) { tone(90, 38, 1.6, 'sawtooth', 0.22); tone(64, 30, 1.8, 'square', 0.12); noise(1.4, 0.14, 700, 120); } },
  death() { if (limit('death', 0.5)) { tone(330, 55, 1.4, 'sawtooth', 0.14); tone(220, 40, 1.6, 'sine', 0.2); } },
  victory() {
    if (!limit('vic', 1)) return;
    const seq = [0, 4, 7, 12, 7, 12, 16, 19, 24];
    seq.forEach((n, i) => tone(392 * Math.pow(2, n / 12), 392 * Math.pow(2, n / 12), i === seq.length - 1 ? 3 : 0.5, 'triangle', 0.12, i * 0.16));
    tone(98, 98, 4, 'sine', 0.25, 0.2);
  },
};

// ---------- generative music ----------
const NIGHT = [[45, 52, 57, 60], [41, 48, 53, 57], [48, 55, 60, 64], [43, 50, 55, 59]];
const DAY = [[48, 55, 60, 64], [43, 50, 55, 59], [45, 52, 57, 60], [41, 48, 53, 57]];
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];
const SCALE_DAY = [0, 2, 4, 7, 9, 12, 14, 16];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let nextChord = 0, chordIdx = 0, nextPluck = 0;
export function musicTick(mood) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const day = mood.day;
  if (t > nextChord - 0.3) {
    const start = Math.max(t, nextChord);
    const ch = (day ? DAY : NIGHT)[chordIdx % 4]; chordIdx++;
    for (const n of ch) {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = det;
        f.type = 'lowpass'; f.frequency.value = day ? 900 : 520;
        g.gain.setValueAtTime(0.0001, start); g.gain.linearRampToValueAtTime(0.028, start + 2.5);
        g.gain.setValueAtTime(0.028, start + 6); g.gain.linearRampToValueAtTime(0.0001, start + 10);
        o.connect(f); f.connect(g); g.connect(musicBus); o.start(start); o.stop(start + 10.2);
      }
    }
    nextChord = start + 8;
  }
  if (t > nextPluck) {
    nextPluck = t + (mood.tense ? 0.25 : 0.5) * (1 + Math.floor(Math.random() * 3));
    const root = (day ? DAY : NIGHT)[(chordIdx + 3) % 4][0] + 24;
    const n = root + (day ? SCALE_DAY : SCALE)[Math.floor(Math.random() * 8)];
    const g = tone(mtof(n), mtof(n), 0.9, 'sine', 0.05, 0.02, musicBus, 0.01);
    g.connect(delay);
    if (mood.tense && Math.random() < 0.5) tone(mtof(root - 36), mtof(root - 36), 0.25, 'triangle', 0.09, 0.02, musicBus);
  }
}
