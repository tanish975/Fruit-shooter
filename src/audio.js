// All sound is synthesised with WebAudio (plus the two original mp3 samples),
// so the game ships without any heavy audio assets.
import { store } from './store.js';

let ctx = null, master = null, sfxBus = null, musicBus = null;
const samples = {};
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32, 2637.02];

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp); comp.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
  for (const name of ['shoot', 'hit']) {
    fetch(`./sfx/${name}.mp3`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b))
      .then(buf => { samples[name] = buf; }).catch(() => {});
  }
  return true;
}

function tone(freq, dur, { type = 'sine', vol = 0.2, to = null, at = 0, bus = sfxBus, attack = 0.005 } = {}) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(dur, { freq = 1200, to = null, q = 1, vol = 0.2, type = 'bandpass', at = 0, bus = sfxBus } = {}) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + at;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}

function sample(name, vol, rate = 1, maxDur = 0.5) {
  const buf = samples[name]; if (!buf) return false;
  const t = ctx.currentTime;
  const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol, t + maxDur * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + maxDur);
  s.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + maxDur + 0.02);
  return true;
}

const SFX = {
  click() { tone(620, 0.07, { type: 'triangle', vol: 0.18, to: 880 }); },
  back() { tone(520, 0.08, { type: 'triangle', vol: 0.15, to: 340 }); },
  shoot(power = 1) {
    sample('shoot', 0.28, 0.9 + power * 0.3, 0.35);
    noise(0.16, { freq: 900 + power * 1400, to: 300, q: 0.8, vol: 0.16 });
    tone(220 + power * 120, 0.09, { type: 'triangle', vol: 0.12, to: 110 });
  },
  hit(combo = 0) {
    sample('hit', 0.22, 0.95 + Math.random() * 0.25, 0.3);
    noise(0.12, { freq: 2200, to: 500, q: 0.6, vol: 0.2, type: 'lowpass' });
    const f = SCALE[Math.min(SCALE.length - 1, Math.floor(combo / 2))];
    tone(f, 0.16, { type: 'triangle', vol: 0.16 });
  },
  perfect() {
    tone(1318.5, 0.14, { type: 'sine', vol: 0.2 });
    tone(1760, 0.22, { type: 'sine', vol: 0.2, at: 0.07 });
    tone(2637, 0.3, { type: 'sine', vol: 0.1, at: 0.14 });
  },
  crack() { noise(0.08, { freq: 3000, q: 2, vol: 0.25 }); tone(180, 0.08, { type: 'square', vol: 0.1, to: 90 }); },
  bomb() {
    noise(0.6, { freq: 900, to: 60, vol: 0.6, type: 'lowpass' });
    tone(110, 0.5, { type: 'sine', vol: 0.5, to: 35 });
  },
  power() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { type: 'square', vol: 0.09, at: i * 0.055 })); },
  coin() { tone(988, 0.07, { type: 'square', vol: 0.08 }); tone(1318, 0.16, { type: 'square', vol: 0.08, at: 0.06 }); },
  buy() { [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.16, at: i * 0.06 })); },
  deny() { tone(200, 0.12, { type: 'sawtooth', vol: 0.1 }); tone(150, 0.16, { type: 'sawtooth', vol: 0.1, at: 0.1 }); },
  miss() { tone(300, 0.14, { type: 'sine', vol: 0.08, to: 160 }); },
  hurt() { tone(260, 0.25, { type: 'sawtooth', vol: 0.16, to: 90 }); noise(0.2, { freq: 400, vol: 0.2, type: 'lowpass' }); },
  fever() { tone(220, 0.6, { type: 'sawtooth', vol: 0.1, to: 1760 }); [784, 988, 1174, 1568].forEach((f, i) => tone(f, 0.2, { type: 'square', vol: 0.08, at: 0.3 + i * 0.07 })); },
  level() { [523, 784, 1046].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.16, at: i * 0.09 })); },
  boss() { tone(80, 0.9, { type: 'sawtooth', vol: 0.22, to: 55 }); tone(120, 0.9, { type: 'square', vol: 0.08, to: 82, at: 0.05 }); },
  bossHit() { tone(160, 0.12, { type: 'square', vol: 0.16, to: 80 }); noise(0.1, { freq: 800, vol: 0.2, type: 'lowpass' }); },
  tick() { tone(1200, 0.05, { type: 'square', vol: 0.07 }); },
  over() { [523, 440, 349, 262].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.16, at: i * 0.16 })); },
  best() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, { type: 'square', vol: 0.09, at: i * 0.1 })); },
};

export function sfx(name, arg) {
  if (!store.data.settings.sfx || !ensure() || ctx.state !== 'running') return;
  try { SFX[name]?.(arg); } catch { /* audio is never worth crashing for */ }
}

// ---- generative background music: a mellow arpeggio over four chords ----
const CHORDS = [
  [130.81, [261.63, 329.63, 392.0, 523.25]],  // C
  [98.0, [246.94, 293.66, 392.0, 493.88]],    // G
  [110.0, [261.63, 329.63, 440.0, 523.25]],   // Am
  [87.31, [261.63, 349.23, 440.0, 523.25]],   // F
];
const PATTERN = [0, 2, 1, 3, 2, 1, 3, 2];
let musicTimer = null, step = 0, nextTime = 0, tempo = 104, intense = false;

function schedule() {
  if (!ctx || ctx.state !== 'running') return;
  const spb = 60 / (intense ? tempo * 1.18 : tempo) / 2; // eighth notes
  while (nextTime < ctx.currentTime + 0.25) {
    const at = Math.max(0, nextTime - ctx.currentTime);
    const bar = Math.floor(step / 8) % CHORDS.length, i = step % 8;
    const [bass, notes] = CHORDS[bar];
    tone(notes[PATTERN[i]] * (intense && i % 2 ? 2 : 1), spb * 1.8, { type: 'triangle', vol: 0.11, at, bus: musicBus, attack: 0.01 });
    if (i === 0 || i === 4) tone(bass, spb * 3.5, { type: 'sine', vol: 0.2, at, bus: musicBus, attack: 0.02 });
    if (i % 2 === 1) noise(0.04, { freq: 7000, q: 1, vol: intense ? 0.05 : 0.025, type: 'highpass', at, bus: musicBus });
    if (i === 6 && bar % 2 === 1) tone(notes[3] * 2, spb * 2, { type: 'sine', vol: 0.05, at, bus: musicBus });
    nextTime += spb; step++;
  }
}

export const audio = {
  /** Call from a user gesture: browsers and WebViews keep audio locked until then. */
  unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().then(() => this.syncMusic()).catch(() => {});
    else this.syncMusic();
  },
  syncMusic() {
    if (!ctx) return;
    const on = store.data.settings.music && !document.hidden;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(on ? 0.55 : 0, ctx.currentTime + 0.4);
    if (on && !musicTimer) { nextTime = ctx.currentTime + 0.1; musicTimer = setInterval(schedule, 80); }
    if (!on && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  },
  setIntense(v) { intense = v; },
  suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
  resume() { if (ctx && ctx.state === 'suspended') ctx.resume().then(() => this.syncMusic()).catch(() => {}); },
};
