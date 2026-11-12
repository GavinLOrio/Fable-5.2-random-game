// Hollowpine sound: everything is synthesised, no audio files.
export function createAudio() {
  const A = { vol: 0.7, ready: false };
  let ctx, master, nbuf, wind, windGain, last = {};
  A.init = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = A.vol; const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    wind = ctx.createBufferSource(); wind.buffer = nbuf; wind.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; windGain = ctx.createGain(); windGain.gain.value = 0.05; wind.connect(f); f.connect(windGain); windGain.connect(master); wind.start();
    A.ready = true;
  };
  A.setVol = (v) => { A.vol = v; if (master) master.gain.value = v; };
  function noise(dur, freq, q, gain, type = 'bandpass', slide = 0) {
    const s = ctx.createBufferSource(); s.buffer = nbuf; s.playbackRate.value = 0.6 + Math.random() * 0.8; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, slide), ctx.currentTime + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + dur); s.connect(f); f.connect(g); g.connect(master); s.start(0, Math.random()); s.stop(ctx.currentTime + dur + 0.05);
  }
  function tone(freq, dur, gain, type = 'sine', slide = 0, delay = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + delay; o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  const S = {
    shot_ball: (k) => { noise(0.9, 500, 0.4, 1.0 * k, 'lowpass', 90); tone(90, 0.5, 0.8 * k, 'sine', 30); noise(0.08, 3000, 1, 0.5 * k); },
    shot_pistol_ammo: (k) => { noise(0.22, 1400, 0.6, 0.8 * k, 'lowpass', 300); tone(160, 0.14, 0.5 * k, 'square', 50); },
    shot_rifle_ammo: (k) => { noise(0.5, 1000, 0.5, 1.0 * k, 'lowpass', 150); tone(120, 0.25, 0.7 * k, 'sawtooth', 35); noise(0.06, 4000, 1, 0.4 * k); },
    shot_carbine_ammo: (k) => { noise(0.26, 1800, 0.6, 0.8 * k, 'lowpass', 300); tone(190, 0.12, 0.5 * k, 'sawtooth', 60); },
    shot_shell: (k) => { noise(0.6, 700, 0.3, 1.1 * k, 'lowpass', 100); tone(80, 0.35, 0.8 * k, 'sine', 28); },
    bow: (k) => { tone(240, 0.16, 0.25 * k, 'triangle', 90); noise(0.1, 2500, 2, 0.12 * k); },
    swing: (k) => noise(0.16, 900, 1.2, 0.14 * k, 'bandpass', 300),
    chop: (k) => { noise(0.09, 900, 2, 0.5 * k); tone(190, 0.1, 0.35 * k, 'triangle', 90); },
    mine: (k) => { noise(0.06, 3200, 3, 0.4 * k); tone(900, 0.07, 0.2 * k, 'square', 500); },
    hit: (k) => { noise(0.1, 500, 1, 0.5 * k, 'lowpass'); tone(110, 0.09, 0.3 * k, 'sine', 60); },
    thud: (k) => noise(0.12, 260, 1, 0.5 * k, 'lowpass'),
    fall: (k) => { noise(1.1, 500, 0.6, 0.5 * k, 'lowpass', 100); tone(70, 0.5, 0.5 * k, 'sine', 30, 0.9); noise(0.4, 300, 0.6, 0.7 * k, 'lowpass'); },
    pickup: (k) => { tone(520, 0.07, 0.12 * k, 'triangle', 780); },
    craft: (k) => { noise(0.07, 1800, 3, 0.2 * k); tone(330, 0.1, 0.12 * k, 'triangle', 0, 0.06); tone(495, 0.14, 0.12 * k, 'triangle', 0, 0.13); },
    place: (k) => { tone(200, 0.12, 0.2 * k, 'triangle', 120); },
    build: (k) => { noise(0.06, 700, 2, 0.35 * k); tone(150, 0.09, 0.25 * k, 'triangle', 100); },
    done: (k) => { for (let i = 0; i < 3; i++) tone([392, 494, 587][i], 0.3, 0.14 * k, 'triangle', 0, i * 0.09); },
    research: (k) => { for (let i = 0; i < 4; i++) tone([330, 392, 494, 659][i], 0.35, 0.13 * k, 'sine', 0, i * 0.08); },
    discover: (k) => { tone(294, 0.5, 0.14 * k, 'sine'); tone(440, 0.7, 0.14 * k, 'sine', 0, 0.16); },
    hurt: (k) => { noise(0.14, 400, 1, 0.5 * k, 'lowpass'); tone(150, 0.2, 0.3 * k, 'sawtooth', 70); },
    growl: (k) => { tone(85, 0.5, 0.3 * k, 'sawtooth', 60); noise(0.5, 300, 2, 0.15 * k); },
    yelp: (k) => tone(520, 0.3, 0.25 * k, 'sawtooth', 180),
    shout: (k) => { tone(210, 0.22, 0.22 * k, 'sawtooth', 150); tone(180, 0.2, 0.2 * k, 'sawtooth', 120, 0.2); },
    die: (k) => tone(170, 0.5, 0.3 * k, 'sawtooth', 60),
    step: (k) => noise(0.07, 320 + Math.random() * 200, 1, 0.09 * k, 'lowpass'),
    reload: (k) => { noise(0.04, 2400, 4, 0.25 * k); tone(700, 0.03, 0.1 * k, 'square', 0, 0.18); noise(0.05, 1800, 4, 0.25 * k); },
    empty: (k) => tone(1100, 0.03, 0.12 * k, 'square'),
    ui: (k) => tone(660, 0.04, 0.06 * k, 'triangle'),
    eat: (k) => { noise(0.08, 900, 2, 0.2 * k); noise(0.08, 700, 2, 0.2 * k); },
    deny: (k) => tone(160, 0.14, 0.14 * k, 'square', 120),
    bird: (k) => { const f = 2200 + Math.random() * 1800; for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone(f, 0.09, 0.03 * k, 'sine', f * (0.8 + Math.random() * 0.5), i * 0.13); },
    cricket: (k) => { for (let i = 0; i < 5; i++) tone(4300, 0.03, 0.012 * k, 'sine', 0, i * 0.055); },
    owl: (k) => { tone(360, 0.35, 0.05 * k, 'sine', 320); tone(340, 0.5, 0.05 * k, 'sine', 300, 0.5); },
  };
  A.play = (name, dist = 0) => {
    if (!A.ready || !S[name]) return; const now = ctx.currentTime; if (last[name] && now - last[name] < 0.03) return; last[name] = now;
    S[name](1 / (1 + dist / 14));
  };
  let amb = 0;
  A.ambient = (dt, night, alt, inWild) => {
    if (!A.ready) return; windGain.gain.value += ((0.035 + Math.min(0.14, alt / 900)) - windGain.gain.value) * dt;
    amb -= dt; if (amb > 0 || !inWild) return; amb = 1.5 + Math.random() * 5;
    if (night) A.play(Math.random() < 0.8 ? 'cricket' : 'owl'); else if (alt < 120) A.play('bird');
  };
  return A;
}
