// Fruit Archer — gameplay, physics and canvas rendering.
import { FRUITS, SPECIALS, POWERUPS, THEMES, SKINS, ARROWS, BOSSES, WORLDS, mulberry32, diffById } from './data.js';
import { store } from './store.js';
import { sfx, audio } from './audio.js';
import { buzz } from './platform.js';
import { t } from './i18n.js';
import { applyRun, daySeed, dayKey } from './meta.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

const ARROW_G = 620;      // gravity on arrows (world units / s²)
const ARROW_LEN = 78;
const FRUIT_G = 430;
const FEVER_TIME = 7;
const INK = '#1b1036';
const FONT = '"Lilita One", sans-serif';
const MOD_LEVEL = { balloon: 2, bird: 3, dodge: 4, wind: 5, shield: 7 };
const CONFETTI = ['#ff5470', '#ffd23f', '#a6f06a', '#5ce1ff', '#c77dff', '#ff8a1f'];

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// Very old WebViews lack roundRect; a plain rect is a fine stand-in.
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
}

export class Game {
  constructor(canvas, images, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.img = images;
    this.hooks = hooks;
    this.state = 'attract';
    this.mode = 'classic';
    this.themeIndex = 1;
    this.bg = document.createElement('canvas');
    this.bgPrev = document.createElement('canvas');
    this.bgFade = 1;
    this.clouds = Array.from({ length: 6 }, () => ({ x: Math.random(), y: rand(0.04, 0.42), s: rand(0.7, 1.5), v: rand(4, 11) }));
    this.leaves = Array.from({ length: 12 }, () => ({ x: Math.random(), y: Math.random(), r: rand(0, TAU), s: rand(0.6, 1.2), p: rand(0, TAU) }));
    this.aim = { active: false, id: -1, sx: 0, sy: 0, cx: 0, cy: 0, power: 0, angle: -Math.PI / 2 };
    this.idleAngle = -Math.PI / 2;
    this.skin = SKINS[0]; this.arrowDef = ARROWS[0]; this.diff = diffById('moderate');
    this.clear();
    this.resize();
    this.bindInput();
    this.last = performance.now();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  // ------------------------------------------------------------------ setup
  clear() {
    this.fruits = []; this.arrows = []; this.pieces = []; this.particles = [];
    this.texts = []; this.decals = []; this.rings = []; this.orbs = [];
    this.stuck = []; this.sprites = []; this.shields = [];
    this.boss = null; this.announce = null; this.stage = null; this.tut = null;
    this.effects = { triple: 0, freeze: 0, fire: 0, double: 0, magnet: 0 };
    this.effectMax = { triple: 1, freeze: 1, fire: 1, double: 1, magnet: 1 };
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.level = 1; this.levelHits = 0;
    this.fever = 0; this.feverTime = 0;
    this.lives = 3; this.timeLeft = 60; this.arrowsLeft = 15; this.rule = 'time';
    this.spawnT = 1; this.orbT = rand(7, 10); this.cooldown = 0; this.autoT = 1;
    this.shake = 0; this.hitstop = 0; this.slowmo = 0; this.flash = 0; this.flashColor = '#fff'; this.zoom = 0;
    this.time = 0; this.endT = 0; this.bossQueue = 0; this.bossCount = 0; this.won = false; this.goalSaid = false;
    this.wind = 0; this.windTarget = 0; this.windT = 3; this.twang = 9; this.drawTick = 0;
    this.run = { shots: 0, hits: 0, fruits: 0, perfects: 0, coins: 0, skewer: 0, skewers: 0, bosses: 0, fevers: 0 };
    this.comboPulse = 0; this.scorePulse = 0;
    this.rnd = Math.random;
  }
  R(a, b) { return a + this.rnd() * (b - a); }
  P(a) { return a[(this.rnd() * a.length) | 0]; }

  resize() {
    const cw = this.canvas.clientWidth || window.innerWidth, ch = this.canvas.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    while (cw * ch * dpr * dpr > 2.6e6 && dpr > 1) dpr -= 0.25; // keep fill-rate sane on QHD phones
    this.dpr = dpr;
    this.canvas.width = Math.round(cw * dpr); this.canvas.height = Math.round(ch * dpr);
    // World is 400 units wide on a portrait phone; on wide screens it is 720 tall instead.
    this.scale = Math.min(cw / 400, ch / 720);
    this.W = cw / this.scale; this.H = ch / this.scale;
    this.bx = this.W / 2; this.by = this.H - 150;
    this.paintBackground(this.bg, THEMES[this.themeIndex]);
    this.bgFade = 1;
  }

  setTheme(i) {
    const fixed = store.data.settings.scene;
    if (fixed !== 'auto' && fixed != null) i = +fixed || 0;
    i %= THEMES.length;
    if (i === this.themeIndex) return;
    this.themeIndex = i;
    const t = this.bgPrev; this.bgPrev = this.bg; this.bg = t;
    this.paintBackground(this.bg, THEMES[i]);
    this.bgFade = 0;
  }

  paintBackground(cv, th) {
    cv.width = this.canvas.width; cv.height = this.canvas.height;
    const c = cv.getContext('2d'), { W, H } = this;
    const photo = this.img['bg_' + th.name];
    if (photo && photo.width) {
      // cover the screen, anchored to the bottom so the meadow always sits under the archer
      const s = Math.max(cv.width / photo.width, cv.height / photo.height), w = photo.width * s, h = photo.height * s;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(photo, (cv.width - w) / 2, cv.height - h, w, h);
      c.globalAlpha = th.name === 'night' ? 0 : 0.08; c.fillStyle = '#1b1036'; c.fillRect(0, 0, cv.width, cv.height); c.globalAlpha = 1;
      this.photoBg = true;
      return;
    }
    this.photoBg = false;
    c.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    c.fillStyle = th.sky[1]; c.fillRect(0, 0, W, H);
    if (th.stars) {
      c.fillStyle = '#fff';
      for (let i = 0; i < 90; i++) {
        c.globalAlpha = th.stars * (0.3 + rnd() * 0.7);
        c.beginPath(); c.arc(rnd() * W, rnd() * H * 0.6, 0.6 + rnd() * 1.3, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    }
    const sx = W * 0.74, sy = H * th.sunY;
    c.fillStyle = th.sun; c.beginPath(); c.arc(sx, sy, 38, 0, TAU); c.fill();
    if (th.name === 'night') { c.fillStyle = th.sky[0]; c.globalAlpha = 0.9; c.beginPath(); c.arc(sx + 15, sy - 9, 32, 0, TAU); c.fill(); c.globalAlpha = 1; }
    // rolling orchard hills, back to front
    const layers = [[0.6, 26, 0.012, 0.6], [0.69, 22, 0.017, 2.4], [0.79, 18, 0.021, 4.1]];
    layers.forEach(([base, amp, freq, ph], li) => {
      const yAt = x => H * base + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph * 2) * amp * 0.35;
      c.fillStyle = th.hills[li];
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, yAt(x));
      c.lineTo(W, H); c.closePath(); c.fill();
      const n = Math.round(W / (70 - li * 12));
      for (let i = 0; i < n; i++) {
        const x = rnd() * W, y = yAt(x), s = (0.55 + li * 0.25) * (0.8 + rnd() * 0.5);
        c.fillStyle = th.hills[Math.min(2, li + 1)];
        c.fillRect(x - 2 * s, y - 16 * s, 4 * s, 18 * s);
        c.beginPath(); c.arc(x, y - 24 * s, 15 * s, 0, TAU); c.arc(x - 10 * s, y - 16 * s, 10 * s, 0, TAU); c.arc(x + 10 * s, y - 16 * s, 10 * s, 0, TAU); c.fill();
        c.fillStyle = ['#ff5c5c', '#ffb02e', '#ffe14d'][i % 3]; c.globalAlpha = 0.85;
        for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + (rnd() - 0.5) * 22 * s, y - (14 + rnd() * 16) * s, 2.2 * s, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
      }
    });
    c.fillStyle = th.ground;
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, H - 64 - Math.sin(x * 0.011 + 1) * 10);
    c.lineTo(W, H); c.closePath(); c.fill();
    c.strokeStyle = th.hills[1]; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < W / 9; i++) {
      const x = rnd() * W, y = H - 60 - Math.sin(x * 0.011 + 1) * 10 + rnd() * 50;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 6, y - 5 - rnd() * 7); c.stroke();
    }
  }

  // ------------------------------------------------------------------ input
  bindInput() {
    const cv = this.canvas;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / this.scale, (e.clientY - r.top) / this.scale]; };
    cv.addEventListener('pointerdown', e => {
      audio.unlock();
      if (this.state !== 'playing' || this.aim.active) return;
      const [x, y] = pos(e);
      Object.assign(this.aim, { active: true, id: e.pointerId, sx: x, sy: y, cx: x, cy: y, power: 0 });
      this.drawTick = 0;
      try { cv.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    });
    cv.addEventListener('pointermove', e => {
      if (!this.aim.active || e.pointerId !== this.aim.id) return;
      const [x, y] = pos(e); this.aim.cx = x; this.aim.cy = y; this.updateAim();
    });
    const up = e => {
      if (!this.aim.active || e.pointerId !== this.aim.id) return;
      this.aim.active = false;
      if (e.type === 'pointerup' && this.state === 'playing' && this.aim.power > 0.08) this.fire();
      this.aim.power = 0;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', e => e.preventDefault());
  }

  updateAim() {
    const a = this.aim, px = a.sx - a.cx, py = a.sy - a.cy, len = Math.hypot(px, py);
    const was = a.power;
    a.power = clamp((len - 10) / (150 / (store.data.settings.sens || 1)), 0, 1);
    if (len > 6) {
      let ang = Math.atan2(py, px);
      if (ang > -0.14) ang = px >= 0 ? -0.14 : -Math.PI + 0.14; // the bow can't shoot into the ground
      if (ang < -Math.PI + 0.14) ang = -Math.PI + 0.14;
      a.angle = ang; this.idleAngle = ang;
    }
    const tick = Math.floor(a.power * 4); // the bow creaks as it bends
    if (tick > this.drawTick) { this.drawTick = tick; sfx('creak'); }
    if (was < 1 && a.power >= 1) buzz('light');
  }

  // ------------------------------------------------------------------ lifecycle
  /** mode: classic | survival | precision | daily | stage | tutorial. `stage` is a STAGES entry. */
  start(mode, stage = null) {
    this.clear();
    this.mode = mode; this.state = 'playing'; this.stage = stage;
    const head = store.up('head');
    const df = this.diff = diffById(mode === 'daily' || mode === 'tutorial' ? 'moderate' : store.data.settings.diff);
    this.revived = false; this.offerDone = false;
    this.rule = mode === 'tutorial' ? 'none' : mode === 'survival' ? 'lives' : mode === 'precision' || (stage && stage.arrows) ? 'arrows' : 'time';
    this.lives = Math.max(1, 3 + df.lives) + head;
    this.timeLeft = Math.round((stage ? stage.time : 60) * df.time) + head * 5;
    this.arrowsLeft = Math.round((stage ? stage.arrows : 15) * df.arrows) + head * 2;
    this.skin = SKINS.find(s => s.id === store.data.skins.equipped) || SKINS[0];
    this.arrowDef = ARROWS.find(a => a.id === store.data.arrows.equipped) || ARROWS[0];
    if (mode === 'tutorial') this.arrowDef = ARROWS[0];
    if (mode === 'daily') this.rnd = mulberry32(daySeed());
    if (stage) { this.rnd = mulberry32(stage.id * 7919); this.level = stage.lvl; }
    this.setTheme(stage ? WORLDS[stage.world].theme : 0);
    this.tutorial = mode !== 'tutorial' && !store.data.tutorialDone;
    this.aim.active = false; this.idleAngle = -Math.PI / 2;
    audio.setIntense(false);
    if (mode === 'tutorial') { this.tut = { step: -1, wait: 0.6, tries: 0 }; return; }
    this.say(t('ready'), stage ? this.goalLabel() : t('readySub'), '#fff6e0', 1.4);
    if (this.modOn('shield')) this.addShields();
    if (stage && stage.boss >= 0) this.bossQueue = 1.6;
  }
  pause() { if (this.state === 'playing') { this.state = 'paused'; this.aim.active = false; } }
  resume() { if (this.state === 'paused') { this.state = 'playing'; this.last = performance.now(); } }
  toMenu() { this.clear(); this.state = 'attract'; this.setTheme(1); audio.setIntense(false); }
  get live() { return this.state === 'playing' || this.state === 'ending'; }
  snd(n, a) { if (this.live) sfx(n, a); }
  get comboMult() { return Math.min(6, 1 + Math.floor(this.combo / 5) * 0.5); }
  get inFever() { return this.feverTime > 0; }
  modOn(m) {
    if (this.state === 'attract' || this.mode === 'tutorial') return false;
    return this.stage ? this.stage.mods.includes(m) : this.level >= MOD_LEVEL[m] - this.diff.early;
  }

  goalProg() {
    const s = this.stage; if (!s) return [0, 0];
    const cur = { fruits: this.run.fruits, score: this.score, perfect: this.run.perfects, skewer: this.run.skewers, combo: this.maxCombo, boss: this.run.bosses }[s.goal];
    return [Math.min(cur, s.n), s.n];
  }
  goalLabel() { const s = this.stage; return t('goal_' + s.goal, { n: s.n.toLocaleString('en-US') }); }

  say(text, sub, color = '#fff6e0', dur = 1.5) { this.announce = { text, sub, color, t: 0, dur }; }
  text(x, y, text, color = '#fff', size = 22) {
    if (this.texts.length > 24) this.texts.shift();
    this.texts.push({ x: clamp(x, 44, this.W - 44), y, text, color, size, life: 0, max: 0.95 });
  }

  // ------------------------------------------------------------------ spawning
  chooseKind() {
    const lucky = 1 + store.up('lucky') * 0.1, playing = this.state === 'playing';
    const r = this.rnd(), storm = this.stage && this.stage.mods.includes('bombs');
    if (playing && (this.level >= 2 || storm) && !this.inFever && r < (storm ? 0.3 : Math.min(0.2, 0.05 + this.level * 0.018)) * this.diff.bomb) return 'bomb';
    const r2 = this.rnd();
    if (playing && this.level >= 3 && r2 < 0.012 * lucky) return 'gem';
    if (r2 < 0.05 * lucky) return 'star';
    return 'fruit';
  }

  makeFruit(kind, id) {
    let def;
    if (id) def = FRUITS.find(f => f.id === id);
    else if (kind === 'fruit') def = this.P(FRUITS.filter(f => f.lvl <= (this.state === 'attract' ? 9 : this.level)));
    else def = SPECIALS[kind];
    const big = this.W > 560 ? 1.12 : 1;
    return {
      kind, def, img: this.img[def.id], r: def.r * big, hp: def.hp || 1,
      x: 0, y: 0, vx: 0, vy: 0, g: FRUIT_G, rot: rand(0, TAU), vr: rand(-2.4, 2.4), flash: 0, seen: false, t: rand(0, 6), age: 0,
      dodge: kind === 'fruit' && this.modOn('dodge') && this.rnd() < 0.22,
    };
  }

  toss(kind, x, tx, apex) {
    const f = this.makeFruit(kind), { H } = this;
    const sp = this.state === 'attract' ? 0.8 : Math.min(1.7, 1 + (this.level - 1) * 0.055) * this.diff.speed;
    f.g = FRUIT_G * sp * sp;
    f.x = x; f.y = H + f.r + 4;
    f.vy = -Math.sqrt(2 * f.g * (f.y - apex));
    f.vx = (tx - x) / (2 * -f.vy / f.g);
    this.fruits.push(f);
    return f;
  }

  flyBy(kind) {
    const f = this.makeFruit(kind), dir = this.rnd() < 0.5 ? 1 : -1;
    const sp = Math.min(1.6, 1 + (this.level - 1) * 0.05) * (this.state === 'attract' ? 1 : this.diff.speed);
    f.x = dir > 0 ? -f.r : this.W + f.r; f.y = this.R(this.H * 0.2, this.H * 0.45);
    f.vx = dir * this.R(150, 210) * sp; f.vy = -this.R(110, 160); f.g = 130;
    this.fruits.push(f);
  }

  /** A fruit hanging from a balloon, or clutched by a bird. Free the fruit or hit it directly. */
  carried(type) {
    const f = this.makeFruit('fruit'); f.dodge = false; f.seen = true; f.vr = 0; f.rot = 0;
    f.carrier = { type, img: this.img[type], gone: false };
    if (type === 'balloon') { f.x0 = this.R(60, this.W - 60); f.x = f.x0; f.y = this.H + f.r + 50; }
    else { f.dir = this.rnd() < 0.5 ? 1 : -1; f.x = f.dir > 0 ? -50 : this.W + 50; f.y0 = this.R(this.H * 0.16, this.H * 0.4); f.y = f.y0; f.vx = f.dir * this.R(95, 140); }
    this.fruits.push(f);
  }

  spawnWave() {
    const { W, H } = this, L = this.state === 'attract' ? 3 : this.level, m = 44;
    const x = () => this.R(m, W - m), apex = () => this.R(H * 0.1, H * 0.46);
    const roll = this.rnd();
    const survival = this.mode === 'survival' && this.state === 'playing';
    if (this.modOn('balloon') && roll < 0.1) return this.carried('balloon');
    if (this.modOn('bird') && roll < 0.2) return this.carried('bird');
    if (L >= 2 && roll < 0.3) {
      this.flyBy(this.chooseKind());
    } else if (L >= 3 && roll < 0.46) {
      // a column of fruit: line them up and skewer the lot
      const cx = x(), n = survival ? 2 : L >= 6 ? 4 : 3, top = this.R(H * 0.1, H * 0.2);
      for (let i = 0; i < n; i++) this.toss('fruit', cx + this.R(-8, 8), cx + this.R(-14, 14), top + i * 82);
    } else if (L >= 4 && roll < 0.58 && !survival) {
      // fountain
      const cx = this.R(W * 0.3, W * 0.7), n = Math.min(5, 3 + ((L / 4) | 0));
      for (let i = 0; i < n; i++) this.toss(i === 0 ? this.chooseKind() : 'fruit', cx, cx + (i - (n - 1) / 2) * (W * 0.8 / n), apex());
    } else {
      const n = L < 2 ? 1 : survival ? (this.rnd() < Math.min(0.5, L * 0.07) ? 2 : 1) : 1 + (this.rnd() < Math.min(0.75, L * 0.13)) + (L >= 5 && this.rnd() < 0.3);
      for (let i = 0; i < n; i++) this.toss(this.chooseKind(), x(), x(), apex());
    }
  }

  spawnOrb() {
    const timed = ['triple', 'freeze', 'fire', 'double', 'magnet'];
    const bonus = this.rule === 'time' ? 'time' : this.rule === 'lives' ? 'heart' : 'quiver';
    const type = this.rnd() < 0.26 ? bonus : this.P(timed);
    this.orbs.push({ type, def: POWERUPS[type], img: this.img[POWERUPS[type].icon], x0: this.R(60, this.W - 60), x: 0, y: this.H + 40, t: rand(0, 6), r: 30 });
  }

  addShields() {
    const n = this.stage && this.stage.world === 3 ? 2 : 1;
    for (let i = 0; i < n; i++) this.shields.push({ x: this.W * (0.3 + i * 0.4), y: this.H * (0.5 - i * 0.14), w: 96, vx: (i ? -1 : 1) * 70, flash: 0 });
  }

  spawnBoss() {
    const idx = this.stage ? this.stage.boss : this.bossCount % BOSSES.length;
    this.bossCount++;
    const def = BOSSES[idx], hp = Math.max(4, Math.round((this.stage ? 10 + (this.stage.tier ?? this.stage.world) * 5 : 8 + this.bossCount * 4) * this.diff.boss));
    this.boss = { def, x: this.W / 2, tx: this.W / 2, y: -90, r: def.r, hp, max: hp, t: 0, flash: 0, bombT: 3, life: this.stage ? 1e9 : 30, img: this.img[def.img] };
    this.say(def.name + '!', t('bossSub'), '#ff8a1f', 2);
    this.snd('boss'); buzz('heavy'); this.shake = 14;
  }

  // ------------------------------------------------------------------ shooting
  fire(auto) {
    if (this.cooldown > 0) return;
    const playing = this.state === 'playing';
    if (playing && this.rule === 'arrows' && this.arrowsLeft <= 0) return;
    const type = playing ? this.arrowDef.id : 'std';
    const power = auto ? auto.power : this.aim.power, angle = auto ? auto.angle : this.aim.angle;
    const speed = (640 + power * 760) * (1 + store.up('power') * 0.06) * (type === 'ice' ? 0.88 : 1);
    const spread = playing && this.effects.triple > 0 ? [-0.13, 0, 0.13] : [0];
    const volley = { alive: spread.length, hits: 0, perfect: false, auto: !!auto, touched: false };
    for (const d of spread) {
      const a = angle + d;
      this.arrows.push({
        x: this.bx + Math.cos(a) * 30, y: this.by + Math.sin(a) * 30, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        rot: a, trail: [], hit: [], n: 0, volley, dead: false, age: 0, type, hitMul: 1,
        fire: playing && (this.effects.fire > 0 || type === 'fire'), single: type === 'fire',
        splitT: type === 'split' ? 0.2 : 0, bounces: type === 'bounce' ? 3 : 0,
      });
    }
    this.cooldown = 0.2; this.recoil = 1; this.twang = 0;
    if (!playing) return;
    this.run.shots++;
    if (this.rule === 'arrows') this.arrowsLeft--;
    sfx('shoot', power); sfx('twang'); buzz('light');
    if (this.tutorial && this.run.shots >= 2) { this.tutorial = false; }
  }

  volleyDone(v) {
    if (--v.alive > 0 || v.auto || !this.live) return;
    if (this.mode === 'tutorial') return this.tutCheck(v);
    if (v.hits === 0) {
      if (this.combo >= 5) this.text(this.bx, this.by - 90, t('comboLost'), '#ff8fa3', 20);
      if (this.combo > 0) this.snd('miss');
      this.combo = 0;
      if (!this.inFever) this.fever *= 0.6;
    } else if (this.mode === 'precision' && (v.perfect || v.hits >= 2)) {
      this.arrowsLeft++;
      this.text(this.bx, this.by - 90, t('plusArrow'), '#7ee787', 22);
    }
  }

  // ------------------------------------------------------------------ tutorial
  hover(kind, id, x, y, r) {
    const f = this.makeFruit(kind, id); f.hover = true; f.x = x; f.y = y; f.y0 = y; f.vr = 0.4; f.seen = true; f.dodge = false;
    if (r) f.r = r;
    this.fruits.push(f); this.sparkle(x, y, '#fff', 8);
    return f;
  }
  tutSetup() {
    const { W, H } = this, s = this.tut.step;
    this.fruits = this.fruits.filter(f => !f.hover);
    Object.assign(this.tut, { any: false, perfect: false, skew: false, star: false, bomb: false });
    if (s === 0) this.hover('fruit', 'apple', W / 2, H * 0.36, 40);
    if (s === 1) this.hover('fruit', 'orange', W / 2, H * 0.34, 46).ring = true;
    if (s === 2) for (let i = 0; i < 3; i++) this.hover('fruit', ['lemon', 'apple', 'peach'][i], W / 2, H * 0.2 + i * 88, 34);
    if (s === 3) { this.hover('bomb', null, W / 2, H * 0.44); this.hover('star', null, W * 0.24, H * 0.26, 32); }
  }
  tutCheck() {
    const u = this.tut, s = u.step;
    if (u.wait > 0 || this.arrows.some(a => !a.dead && a.volley.alive > 0)) return;
    const ok = [u.any, u.perfect || (u.any && u.tries >= 2), u.skew || (u.any && u.tries >= 3), u.star][s];
    if (ok) { u.wait = 1; u.tries = 0; this.snd('level'); this.say('NICE!', null, '#a6f06a', 0.9); buzz('success'); }
    else if (u.any || u.bomb) { u.tries++; u.retry = 0.7; this.text(this.W / 2, this.H * 0.5, t('tutTry'), '#fff6e0', 24); }
  }
  tutUpdate(dt) {
    const u = this.tut;
    if (u.retry > 0 && (u.retry -= dt) <= 0) this.tutSetup();
    if (u.wait > 0 && (u.wait -= dt) <= 0) {
      u.step++;
      if (u.step <= 3) return this.tutSetup();
      this.tutFirst = !store.data.tutorialDone; store.data.tutorialDone = true; if (this.tutFirst) store.data.coins += 100; store.save();
      this.say(t('tutDone'), '+100', '#ffd23f', 1.6); this.snd('best'); this.confetti(60);
      this.state = 'ending'; this.endT = 1.8; this.won = true;
    }
  }

  // ------------------------------------------------------------------ scoring
  award(base, x, y, { perfect = false, skew = 1, color = '#fff' } = {}) {
    const mult = this.comboMult * (this.effects.double > 0 ? 2 : 1) * (this.inFever ? 2 : 1) * (perfect ? 2 : 1) * skew;
    const pts = Math.round(base * mult * (this.live ? this.diff.score : 1));
    this.score += pts; this.scorePulse = 1;
    this.text(x, y - 18, '+' + pts, perfect ? '#ffe14d' : color, perfect || pts >= 100 ? 28 : 22);
    return pts;
  }

  bumpCombo(perfect) {
    this.combo++; this.comboPulse = 1;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (!this.inFever && this.mode !== 'tutorial') {
      this.fever += perfect ? 0.085 : 0.05;
      if (this.fever >= 1) this.startFever();
    }
  }

  startFever() {
    this.fever = 1; this.feverTime = FEVER_TIME; this.run.fevers++;
    this.say('FEVER!', t('feverSub'), '#ffd23f', 1.4);
    this.snd('fever'); buzz('heavy'); this.flash = 0.5; this.flashColor = '#ffd23f';
    audio.setIntense(true);
    for (const f of this.fruits) if (f.kind === 'bomb') { this.puff(f.x, f.y, '#888', 8); f.dead = true; }
  }

  levelUp() {
    this.level++; this.levelHits = 0;
    this.setTheme(Math.floor((this.level - 1) / 2));
    if (this.level === MOD_LEVEL.shield) this.addShields();
    if (this.level % 3 === 0 && !this.boss) this.bossQueue = 1.6;
    else { this.say(t('level', { n: this.level }), t('levelSub'), '#a6f06a', 1.2); this.snd('level'); }
  }

  loseLife(x) {
    if (this.state !== 'playing') return;
    this.lives--; this.combo = 0;
    this.flash = 0.45; this.flashColor = '#ff2d55'; this.shake = Math.max(this.shake, 10);
    this.snd('hurt'); buzz('error');
    if (x != null) this.text(x, this.H - 96, t('missed'), '#ff8fa3', 22);
    if (this.lives <= 0) this.end();
  }

  checkGoal() {
    if (!this.stage || this.goalSaid) return;
    const [cur, n] = this.goalProg();
    if (cur >= n) {
      this.goalSaid = true;
      if (this.stage.goal !== 'boss') { this.say(t('goalDone'), null, '#a6f06a', 1.2); this.snd('star'); buzz('success'); this.confetti(24); }
    }
  }

  // ------------------------------------------------------------------ hits
  releaseCarrier(f, hit) {
    const c = f.carrier; if (!c) return;
    f.carrier = null;
    const cy = f.y - f.r - 30;
    if (c.type === 'balloon' && hit) { this.puff(f.x, cy, '#ff5470', 8); this.snd('pop'); }
    else this.sprites.push({ img: c.img, x: f.x, y: cy, vx: c.type === 'bird' ? (f.dir || 1) * 240 : rand(-30, 30), vy: c.type === 'bird' ? -200 : -260, size: 52, life: 0, flip: f.dir < 0 });
    f.g = FRUIT_G; f.vx = (f.vx || 0) * 0.4; f.vy = -30; f.vr = rand(-3, 3);
  }

  slice(f, angle, perfect, arrow) {
    f.dead = true;
    if (f.carrier) this.releaseCarrier(f, false);
    const live = this.live, def = f.def;
    // two halves fly apart along the cut
    const nx = Math.cos(angle + Math.PI / 2), ny = Math.sin(angle + Math.PI / 2);
    for (const side of [1, -1]) {
      this.pieces.push({
        img: f.img, r: f.r, x: f.x, y: f.y, cut: angle, rot0: f.rot, spin: 0, side,
        vx: f.vx * 0.5 + nx * side * rand(70, 130) + Math.cos(angle) * 90, vy: f.vy * 0.5 + ny * side * rand(70, 130) + Math.sin(angle) * 90 - 60,
        vs: side * rand(2, 5), life: 0,
      });
    }
    this.juice(f.x, f.y, def.juice, perfect ? 16 : 10, angle);
    this.decals.push({ x: f.x, y: f.y, color: def.juice, life: 2.2, max: 2.2, blobs: Array.from({ length: 6 }, () => [rand(-f.r, f.r), rand(-f.r, f.r), rand(4, f.r * 0.55)]) });
    if (this.decals.length > 10) this.decals.shift();
    if (!live) return;

    let skew = 1;
    if (arrow) {
      arrow.n++; arrow.volley.hits++; if (perfect) arrow.volley.perfect = true;
      skew = arrow.n;
      if (arrow.n >= 2) {
        this.text(f.x, f.y - 48, 'SKEWER x' + arrow.n, '#ff9f1c', 22 + arrow.n * 2);
        this.run.skewers++;
        if (arrow.n > this.run.skewer) this.run.skewer = arrow.n;
      }
      if (arrow.type === 'ice') {
        this.effects.freeze = Math.min(3, this.effects.freeze + 1.2); this.effectMax.freeze = Math.max(3, this.effectMax.freeze);
        this.sparkle(f.x, f.y, '#9cecff', 6);
      }
    }
    if (this.tut) { this.tut.any = true; if (perfect) this.tut.perfect = true; if (skew >= 2) this.tut.skew = true; if (f.kind === 'star') this.tut.star = true; }
    this.bumpCombo(perfect);
    this.run.hits++; this.run.fruits++;
    if (perfect) {
      this.run.perfects++;
      this.rings.push({ x: f.x, y: f.y, r: f.r * 0.6, max: f.r * 2.6, life: 0, color: '#ffe14d', w: 5 });
      this.text(f.x, f.y - 50 - (skew > 1 ? 26 : 0), 'PERFECT!', '#ffe14d', 20);
      this.hitstop = 0.045; this.zoom = 1;
    }
    this.award(def.pts, f.x, f.y, { perfect, skew, color: f.kind === 'fruit' ? '#fff' : '#ffe14d' });
    this.run.coins += (def.coins || 1) * (1 + store.up('purse') * 0.15);
    if (f.kind !== 'fruit') { this.sparkle(f.x, f.y, def.juice, 14); this.snd('coin'); }
    this.snd('hit', this.combo); if (perfect) this.snd('perfect');
    buzz(perfect ? 'medium' : 'light');
    this.shake = Math.max(this.shake, perfect ? 6 : 3);
    if (arrow && arrow.fire) { this.blast(f.x, f.y, arrow); if (arrow.single) arrow.dead = true; }
    if (!this.stage && this.mode !== 'tutorial' && ++this.levelHits >= 7 + this.level * 2) this.levelUp();
    this.checkGoal();
  }

  blast(x, y, arrow) {
    const R = 100;
    this.rings.push({ x, y, r: 20, max: R, life: 0, color: '#ff8a1f', w: 8 });
    this.puff(x, y, '#ffb347', 10);
    for (const o of this.fruits) {
      if (o.dead || o.kind === 'bomb') continue;
      if (Math.hypot(o.x - x, o.y - y) < R + o.r * 0.5) { arrow.hit.push(o); this.slice(o, Math.atan2(o.y - y, o.x - x) + Math.PI / 2, false, { hit: arrow.hit, n: 0, fire: false, volley: arrow.volley }); }
    }
  }

  hitBomb(f) {
    f.dead = true;
    this.rings.push({ x: f.x, y: f.y, r: 20, max: 190, life: 0, color: '#fff', w: 12 });
    this.puff(f.x, f.y, '#3a3a44', 18); this.puff(f.x, f.y, '#ff8a1f', 14);
    this.shake = 22; this.hitstop = 0.08;
    if (!this.live) return;
    this.snd('bomb'); this.combo = 0; if (!this.inFever) this.fever *= 0.5;
    if (this.tut) { this.tut.bomb = true; this.say('BOOM!', null, '#ff5c7a', 0.8); return; }
    this.say('BOOM!', t(this.rule === 'time' ? 'pen_time' : this.rule === 'lives' ? 'pen_life' : 'pen_arrows'), '#ff5c7a', 1);
    if (this.rule === 'lives') return this.loseLife();
    if (this.rule === 'time') this.timeLeft = Math.max(0, this.timeLeft - 8); else this.arrowsLeft = Math.max(0, this.arrowsLeft - 2);
    this.flash = 0.45; this.flashColor = '#ff2d55'; buzz('error');
  }

  hitBoss(arrow) {
    const b = this.boss;
    b.hp--; b.flash = 1; arrow.dead = true; arrow.volley.hits++;
    this.juice(arrow.x, arrow.y, b.def.juice, 8, arrow.rot + Math.PI);
    this.shake = Math.max(this.shake, 7); this.hitstop = 0.03;
    this.snd('bossHit'); buzz('medium');
    this.bumpCombo(false); this.run.hits++;
    this.award(30, arrow.x, arrow.y, { color: '#ffb347' });
    if (arrow.fire) this.blast(arrow.x, arrow.y, arrow);
    if (b.hp <= 0) this.killBoss();
  }

  killBoss() {
    const b = this.boss; this.boss = null;
    this.run.bosses++; this.wind = this.windTarget = 0;
    const pts = 500 * (this.effects.double > 0 ? 2 : 1) * (this.inFever ? 2 : 1);
    this.score += pts; this.scorePulse = 1;
    this.text(b.x, b.y - 84, '+' + pts, '#ffd23f', 40);
    this.run.coins += 40 * (1 + store.up('purse') * 0.15);
    const reward = this.rule === 'time' ? 'rew_time' : this.rule === 'lives' ? 'rew_life' : 'rew_arrows';
    if (this.rule === 'time') this.timeLeft += 12; else if (this.rule === 'lives') this.lives++; else this.arrowsLeft += 4;
    this.say('SMASHED!', this.stage ? null : t(reward), '#ffd23f', 1.8);
    for (let i = 0; i < 4; i++) this.rings.push({ x: b.x, y: b.y, r: 30, max: 160 + i * 60, life: -i * 0.08, color: i % 2 ? '#fff' : '#ff8a1f', w: 10 });
    for (let i = 0; i < 2; i++) this.pieces.push({ img: b.img, r: b.r, x: b.x, y: b.y, cut: 0.4, rot0: 0, spin: 0, side: i ? 1 : -1, vx: (i ? 1 : -1) * 140, vy: -220, vs: (i ? 1 : -1) * 3, life: 0 });
    this.juice(b.x, b.y, b.def.juice, 30, 0); this.sparkle(b.x, b.y, '#ffd23f', 26); this.confetti(50);
    this.shake = 26; this.slowmo = 0.9; this.flash = 0.6; this.flashColor = '#fff';
    this.snd('bomb'); this.snd('best'); buzz('success');
    if (this.stage && this.stage.goal === 'boss') {
      this.score += Math.ceil(this.timeLeft) * 10; // time bonus
      this.checkGoal(); this.end();
    }
  }

  collect(o, arrow) {
    o.dead = true; arrow.volley.hits++;
    const type = o.type, d = o.def;
    this.rings.push({ x: o.x, y: o.y, r: 20, max: 120, life: 0, color: d.color, w: 7 });
    this.sparkle(o.x, o.y, d.color, 16);
    this.snd('power'); buzz('medium');
    if (d.dur) {
      const dur = d.dur * (1 + store.up('surge') * 0.12);
      this.effects[type] = dur; this.effectMax[type] = dur;
    } else if (type === 'heart') this.lives++;
    else if (type === 'time') this.timeLeft += 6;
    else if (type === 'quiver') this.arrowsLeft += 3;
    this.say(t('p_' + type), null, d.color, 1.1);
  }

  // ------------------------------------------------------------------ particles
  juice(x, y, color, n, angle) {
    for (let i = 0; i < n && this.particles.length < 240; i++) {
      const a = angle + rand(-1.3, 1.3) + (i % 2 ? Math.PI : 0), s = rand(60, 320);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, r: rand(2.5, 6.5), color, life: 0, max: rand(0.4, 0.8), g: 700, kind: 0 });
    }
  }
  puff(x, y, color, n) {
    for (let i = 0; i < n && this.particles.length < 240; i++) {
      const a = rand(0, TAU), s = rand(40, 260);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(6, 16), color, life: 0, max: rand(0.35, 0.7), g: -40, kind: 0 });
    }
  }
  sparkle(x, y, color, n) {
    for (let i = 0; i < n && this.particles.length < 240; i++) {
      const a = rand(0, TAU), s = rand(80, 300);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(3, 7), color, life: 0, max: rand(0.5, 0.9), g: 200, kind: 1, rot: rand(0, TAU) });
    }
  }
  confetti(n) {
    for (let i = 0; i < n && this.particles.length < 320; i++) {
      this.particles.push({ x: rand(0, this.W), y: rand(-60, -10), vx: rand(-60, 60), vy: rand(120, 320), r: rand(4, 8), color: CONFETTI[i % CONFETTI.length], life: 0, max: rand(1.8, 3), g: 60, kind: 2, rot: rand(0, TAU), vr: rand(-8, 8) });
    }
  }

  // ------------------------------------------------------------------ end of run
  end() {
    if (this.state !== 'playing') return;
    const lost = this.stage ? this.goalProg()[0] < this.stage.n : this.rule === 'lives';
    if (lost && !this.offerDone && this.mode !== 'daily' && this.hooks.onOffer) {
      // one chance per run to buy a little more time, arrows or a life
      this.offerDone = true; this.state = 'offer'; this.aim.active = false; this.aim.power = 0;
      const [cur, n] = this.stage ? this.goalProg() : [0, 0];
      return this.hooks.onOffer({ rule: this.rule, cost: this.stage ? 40 + this.stage.id * 2 : 60, cur, n });
    }
    this.state = 'ending'; this.endT = 1.25; this.aim.active = false;
    audio.setIntense(false);
    if (this.stage) {
      const [cur, n] = this.goalProg(); this.won = cur >= n;
      if (this.stage.goal !== 'boss' || !this.won) this.say(this.won ? t('stageClear') : t(this.rule === 'time' ? 'timesUp' : 'outArrows'), null, this.won ? '#a6f06a' : '#fff6e0', 1.3);
      sfx(this.won ? 'level' : 'over'); buzz('heavy');
      return;
    }
    this.say(t(this.rule === 'time' ? 'timesUp' : this.rule === 'lives' ? 'gameOver' : 'outArrows'), null, '#fff6e0', 1.2);
    sfx('over'); buzz('heavy');
  }

  /** Accept the continue offer: back into the run with a top-up. */
  revive() {
    if (this.state !== 'offer') return;
    this.revived = true;
    if (this.rule === 'time') this.timeLeft = 15; else if (this.rule === 'arrows') this.arrowsLeft = 5; else this.lives = 1;
    for (const f of this.fruits) if (f.kind !== 'boss' && !f.hover) f.dead = true;
    this.state = 'playing'; this.last = performance.now(); this.spawnT = 0.8;
    this.say(t('secondWind'), null, '#a6f06a', 1.2); sfx('power'); buzz('success'); this.confetti(20);
  }
  /** Decline the continue offer. */
  giveUp() { if (this.state === 'offer') { this.state = 'playing'; this.last = performance.now(); this.end(); } }

  finish() {
    this.state = 'over';
    if (this.mode === 'tutorial') return this.hooks.onTutorialDone();
    const d = store.data, r = this.run, s = d.stats, st = this.stage;
    let stars = 0, newStars = 0;
    if (st) {
      if (this.won) stars = 1 + (this.score >= st.stars[1]) + (this.score >= st.stars[2]);
      newStars = Math.max(0, stars - (d.stages[st.id] || 0));
      if (newStars) d.stages[st.id] = stars;
      s.stars = (s.stars || 0) + newStars;
    }
    const coins = Math.round(r.coins + this.score / 60 + newStars * 30);
    const key = st ? null : this.mode;
    const prevBest = key ? d.best[key] || 0 : 0, isBest = !!key && this.score > prevBest && this.score > 0;
    if (isBest) d.best[key] = this.score;
    if (this.mode === 'daily') { d.daily.chDate = dayKey(); d.daily.chScore = this.score; }
    d.coins += coins;
    s.games++; s.fruits += r.fruits; s.perfects += r.perfects; s.bosses += r.bosses; s.fevers += r.fevers;
    s.shots += r.shots; s.hits += r.hits; s.coinsEarned += coins;
    s.bestCombo = Math.max(s.bestCombo, this.maxCombo); s.bestSkewer = Math.max(s.bestSkewer, r.skewer);
    const season = applyRun({ fruits: r.fruits, perfects: r.perfects, skewers: r.skewers, bosses: r.bosses, fevers: r.fevers, stars: newStars, games: 1, score: this.score });
    store.save();
    if (isBest || stars > 0) this.confetti(stars === 3 || isBest ? 90 : 40);
    this.hooks.onGameOver({
      diff: this.diff.id, revived: this.revived, mode: this.mode, stage: st, stars, newStars, won: this.won, score: this.score, best: Math.max(prevBest, this.score), prevBest, isBest, coins, season,
      fruits: r.fruits, perfects: r.perfects, maxCombo: this.maxCombo, level: this.level, skewer: r.skewer,
      accuracy: r.shots ? Math.min(100, Math.round((r.hits / r.shots) * 100)) : 0,
    });
  }

  // ------------------------------------------------------------------ update
  frame(now) {
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.034, (now - this.last) / 1000);
    this.last = now;
    if (dt <= 0) return;
    if (this.state !== 'paused' && this.state !== 'offer') this.update(dt);
    this.draw();
    this.hooks.onFrame?.(this);
  }

  update(rdt) {
    this.bgFade = Math.min(1, this.bgFade + rdt / 1.4);
    this.comboPulse = Math.max(0, this.comboPulse - rdt * 5); this.scorePulse = Math.max(0, this.scorePulse - rdt * 5);
    this.flash = Math.max(0, this.flash - rdt * 1.6);
    this.shake = Math.max(0, this.shake - rdt * 46);
    this.zoom = Math.max(0, this.zoom - rdt * 5);
    this.twang += rdt;
    if (this.announce && (this.announce.t += rdt) > this.announce.dur) this.announce = null;
    for (const c of this.clouds) { c.x += ((c.v + this.wind * 0.08) * rdt) / this.W; if (c.x > 1.25) { c.x = -0.25; c.y = rand(0.04, 0.42); } else if (c.x < -0.3) c.x = 1.2; }
    for (const l of this.leaves) {
      l.p += rdt * 2; l.r += rdt * (1.5 + l.s);
      l.x += ((18 + this.wind * 0.5) * l.s * rdt) / this.W + Math.sin(l.p) * 0.0006; l.y += (22 * l.s * rdt) / this.H;
      if (l.y > 1.05) { l.y = -0.05; l.x = Math.random(); }
      if (l.x > 1.05) l.x = -0.05; else if (l.x < -0.05) l.x = 1.05;
    }
    if (this.hitstop > 0) { this.hitstop -= rdt; return; }
    if (this.slowmo > 0) this.slowmo -= rdt;
    let dt = rdt * (this.slowmo > 0 || this.state === 'ending' ? 0.35 : 1);
    if (this.state === 'over') dt = rdt * 0.5;
    this.time += dt;
    const playing = this.state === 'playing';
    this.cooldown -= dt; this.recoil = Math.max(0, (this.recoil || 0) - dt * 7);
    const { W, H } = this;

    if (playing && this.mode === 'tutorial') this.tutUpdate(dt);
    else if (playing) {
      for (const k in this.effects) if (this.effects[k] > 0) this.effects[k] = Math.max(0, this.effects[k] - dt);
      if (this.feverTime > 0) {
        this.feverTime -= dt; this.fever = Math.max(0, this.feverTime / FEVER_TIME);
        if (this.feverTime <= 0) { this.fever = 0; audio.setIntense(false); }
      }
      if (this.rule === 'time') {
        const before = Math.ceil(this.timeLeft);
        this.timeLeft -= dt;
        const after = Math.ceil(this.timeLeft);
        if (after < before && after <= 5 && after > 0) sfx('tick');
        if (this.timeLeft <= 0) { this.timeLeft = 0; this.end(); }
      }
      if (this.rule === 'arrows' && this.arrowsLeft <= 0 && this.arrows.length === 0) this.end();
      if (this.bossQueue > 0 && (this.bossQueue -= dt) <= 0) this.spawnBoss();
      if ((this.orbT -= dt) <= 0) { this.spawnOrb(); this.orbT = this.R(9, 14) / (1 + store.up('lucky') * 0.1); }
      // wind drifts to a new strength every few seconds
      const stormy = this.boss && this.boss.def.ability === 'storm';
      if (this.modOn('wind') || stormy) {
        if ((this.windT -= dt) <= 0) {
          this.windT = stormy ? 3 : rand(6, 9);
          this.windTarget = stormy ? (this.windTarget > 0 ? -1 : 1) * rand(220, 320) : Math.random() < 0.2 ? 0 : (Math.random() < 0.5 ? -1 : 1) * rand(90, 260);
        }
      } else this.windTarget = 0;
      this.wind = lerp(this.wind, this.windTarget, Math.min(1, dt * 1.5));
    }
    if (this.state === 'ending' && (this.endT -= rdt) <= 0) this.finish();

    // spawner
    if ((playing && this.mode !== 'tutorial') || this.state === 'attract') {
      if ((this.spawnT -= dt) <= 0 && this.fruits.length < 12) {
        this.spawnWave();
        const L = this.level;
        const base = this.state === 'attract' ? 1.5 : Math.max(0.62, 1.55 - L * 0.085) * (this.boss ? 1.5 : 1) * (this.inFever ? 0.7 : 1) * this.diff.spawn;
        this.spawnT = base * this.R(0.8, 1.2);
      }
    }
    // the menu shoots its own arrows so the title screen never sits still
    if (this.state === 'attract' && (this.autoT -= dt) <= 0) {
      this.autoT = rand(0.9, 1.8);
      const f = this.fruits.find(o => o.y < H * 0.6 && o.vy < 60 && o.kind !== 'bomb');
      if (f) {
        const tx = f.x + f.vx * 0.35, ty = f.y + f.vy * 0.35 - 30;
        this.idleAngle = clamp(Math.atan2(ty - this.by, tx - this.bx), -Math.PI + 0.2, -0.2);
        this.cooldown = 0; this.fire({ power: 0.95, angle: this.idleAngle });
      }
    }

    const fdt = dt * (this.effects.freeze > 0 ? 0.35 : 1);

    for (const f of this.fruits) {
      f.t += fdt; f.age += dt;
      f.flash = Math.max(0, f.flash - dt * 5);
      if (f.hover) { f.y = f.y0 + Math.sin(this.time * 2 + f.x) * 6; f.rot += f.vr * dt; continue; }
      if (f.carrier) {
        if (f.carrier.type === 'balloon') { f.y -= 72 * fdt; f.x = f.x0 + Math.sin(f.t * 1.5) * 22; if (f.y < -90) f.dead = true; }
        else { f.x += f.vx * fdt; f.y = f.y0 + Math.sin(f.t * 3) * 14; if (f.x < -70 || f.x > W + 70) f.dead = true; }
        continue;
      }
      f.vy += f.g * fdt; f.x += f.vx * fdt; f.y += f.vy * fdt; f.rot += f.vr * fdt;
      if (f.y < H) f.seen = true;
      const gone = (f.vy > 0 && f.y > H + f.r + 12) || f.x < -f.r - 40 || f.x > W + f.r + 40;
      if (gone) {
        f.dead = true;
        if (playing && f.seen && f.kind === 'fruit' && this.mode === 'survival') this.loseLife(clamp(f.x, 50, W - 50));
      }
    }

    for (const o of this.orbs) {
      o.t += dt; o.y -= 88 * fdt; o.x = o.x0 + Math.sin(o.t * 1.8) * 30;
      if (o.y < -60) o.dead = true;
    }
    for (const s of this.shields) {
      s.x += s.vx * fdt; s.flash = Math.max(0, s.flash - dt * 5);
      if (s.x < s.w / 2 + 6) { s.x = s.w / 2 + 6; s.vx = Math.abs(s.vx); } else if (s.x > W - s.w / 2 - 6) { s.x = W - s.w / 2 - 6; s.vx = -Math.abs(s.vx); }
    }
    for (const s of this.sprites) { s.x += s.vx * dt; s.y += s.vy * dt; if ((s.life += dt) > 2) s.dead = true; }
    for (const s of this.stuck) if ((s.life += rdt) > 2.5) s.dead = true;

    if (this.boss) this.updateBoss(this.boss, dt, fdt, playing);

    // arrows
    const hitBase = (1 + store.up('tips') * 0.07) * (playing ? this.diff.hit : 1);
    const born = [];
    for (const a of this.arrows) {
      const px = a.x, py = a.y;
      a.age += dt;
      if (a.splitT > 0 && (a.splitT -= dt) <= 0) {
        // the splitter fans out into three lighter arrows
        const sp = Math.hypot(a.vx, a.vy), cur = Math.atan2(a.vy, a.vx);
        a.hitMul = 0.8;
        for (const d of [-0.16, 0.16]) born.push({ ...a, vx: Math.cos(cur + d) * sp, vy: Math.sin(cur + d) * sp, trail: [], hit: [...a.hit], splitT: 0, n: 0 });
        a.volley.alive += 2;
        this.sparkle(a.x, a.y, this.arrowDef.color, 5);
      }
      if (this.effects.magnet > 0 && playing) {
        let best = null, bd = 190;
        for (const f of this.fruits) {
          if (f.kind === 'bomb' || f.dead || a.hit.includes(f)) continue;
          const d = Math.hypot(f.x - a.x, f.y - a.y);
          if (d < bd && (f.x - a.x) * a.vx + (f.y - a.y) * a.vy > 0) { bd = d; best = f; }
        }
        if (best) {
          const sp = Math.hypot(a.vx, a.vy), cur = Math.atan2(a.vy, a.vx);
          let diff = Math.atan2(best.y - a.y, best.x - a.x) - cur;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          const na = cur + clamp(diff, -5 * dt, 5 * dt);
          a.vx = Math.cos(na) * sp; a.vy = Math.sin(na) * sp;
        }
      }
      a.vy += ARROW_G * dt; a.vx += this.wind * dt; a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.bounces > 0) {
        let hit = false;
        if (a.x < 0) { a.x = 0; a.vx = Math.abs(a.vx); hit = true; } else if (a.x > W) { a.x = W; a.vx = -Math.abs(a.vx); hit = true; }
        if (a.y < 0) { a.y = 0; a.vy = Math.abs(a.vy); hit = true; }
        if (hit) { a.bounces--; a.hit = []; this.sparkle(a.x, a.y, '#c77dff', 5); this.snd('thunk'); }
      }
      a.rot = Math.atan2(a.vy, a.vx);
      a.trail.push(a.x, a.y); if (a.trail.length > 16) a.trail.splice(0, 2);
      const hitMul = hitBase * a.hitMul;

      for (const f of this.fruits) {
        if (f.dead || a.dead || a.hit.includes(f)) continue;
        if (f.dodge && !f.dodged && playing) {
          const dx = f.x - a.x, dy = f.y - a.y, dd = Math.hypot(dx, dy);
          if (dd < 150 && dx * a.vx + dy * a.vy > 0) {
            f.dodged = true;
            const side = Math.sign(a.vx * dy - a.vy * dx) || 1, sp = Math.hypot(a.vx, a.vy);
            f.vx += (-a.vy / sp) * side * 250; f.vy += (a.vx / sp) * side * 250 - 60;
            this.text(f.x, f.y - f.r - 14, '!', '#fff', 26); this.snd('dodge');
          }
        }
        if (f.carrier && !a.hit.includes(f.carrier) && segDist(f.x, f.y - f.r - 30, px, py, a.x, a.y) < 24) {
          a.hit.push(f.carrier);
          if (f.carrier.type === 'balloon') {
            this.releaseCarrier(f, true); a.volley.hits++;
            if (this.live) { this.score += 5; this.text(f.x, f.y - f.r - 50, 'POP! +5', '#ff8fa3', 20); }
          } else {
            this.releaseCarrier(f, true); this.puff(f.x, f.y - f.r - 30, '#cfe8ff', 8);
            if (this.live) { this.text(f.x, f.y - f.r - 50, t('poorBird'), '#ff8fa3', 22); this.combo = 0; this.snd('hurt'); buzz('error'); }
          }
          continue;
        }
        const d = segDist(f.x, f.y, px, py, a.x, a.y);
        if (d > f.r * hitMul + 3) continue;
        a.hit.push(f);
        if (f.kind === 'bomb') { a.dead = true; this.hitBomb(f); }
        else if (f.hp > 1) {
          f.hp--; f.flash = 1; f.vy -= 60; a.volley.hits++;
          this.juice(f.x, f.y, '#8a5a2b', 6, a.rot); this.snd('crack'); buzz('light');
          if (this.live) this.text(f.x, f.y - 40, 'CRACK!', '#f4ede0', 20);
        } else this.slice(f, a.rot, d < f.r * 0.36 && a.type !== 'bounce', a);
      }
      if (!a.dead && playing) {
        for (const o of this.orbs) {
          if (!o.dead && segDist(o.x, o.y, px, py, a.x, a.y) < o.r * hitMul + 6) this.collect(o, a);
        }
        for (const s of this.shields) {
          if ((py - s.y) * (a.y - s.y) <= 0 && py !== a.y) {
            const cx = px + ((s.y - py) / (a.y - py)) * (a.x - px);
            if (Math.abs(cx - s.x) < s.w / 2 + 4) { a.dead = true; s.flash = 1; this.snd('thunk'); buzz('light'); this.puff(cx, s.y, '#c9a27a', 5); break; }
          }
        }
        const b = this.boss;
        if (b && b.life > 0 && !a.dead) {
          if (b.def.ability === 'orbit') {
            for (let i = 0; i < 2 && !a.dead; i++) {
              const an = b.t * 2 + i * Math.PI, ox = b.x + Math.cos(an) * (b.r + 36), oy = b.y + Math.sin(an) * (b.r + 36);
              if (segDist(ox, oy, px, py, a.x, a.y) < 24) { a.dead = true; this.snd('thunk'); this.puff(ox, oy, '#c9a27a', 6); }
            }
          }
          if (!a.dead && segDist(b.x, b.y, px, py, a.x, a.y) < b.r * 0.92) this.hitBoss(a);
        }
      }
      if (!a.dead && a.vy > 0 && a.y > H - 58 && a.x > -20 && a.x < W + 20) {
        // arrows that come down stick in the turf
        a.dead = true; this.stuck.push({ x: a.x, y: a.y, rot: a.rot, life: 0 });
        if (this.stuck.length > 8) this.stuck.shift();
        if (!a.volley.auto) this.snd('thunk');
      }
      if (a.x < -90 || a.x > W + 90 || a.y > H + 90 || a.y < -260) a.dead = true;
      if (a.dead) this.volleyDone(a.volley);
    }
    if (born.length) this.arrows.push(...born);

    for (const p of this.pieces) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.spin += p.vs * dt; p.life += dt; if (p.y > H + 120) p.dead = true; }
    for (const p of this.particles) {
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 2) { p.rot += p.vr * dt; p.vx += (Math.sin(p.life * 5 + p.r) * 80 - p.vx) * dt; p.vy = Math.min(p.vy, 240); }
      if ((p.life += dt) > p.max) p.dead = true;
    }
    for (const x of this.texts) { x.y -= 46 * rdt; if ((x.life += rdt) > x.max) x.dead = true; }
    for (const r of this.rings) { if ((r.life += rdt) > 0.45) r.dead = true; }
    for (const d of this.decals) { if ((d.life -= rdt) <= 0) d.dead = true; }

    const alive = o => !o.dead;
    this.fruits = this.fruits.filter(alive); this.arrows = this.arrows.filter(alive); this.pieces = this.pieces.filter(alive);
    this.particles = this.particles.filter(alive); this.texts = this.texts.filter(alive); this.rings = this.rings.filter(alive);
    this.decals = this.decals.filter(alive); this.orbs = this.orbs.filter(alive); this.sprites = this.sprites.filter(alive); this.stuck = this.stuck.filter(alive);
  }

  updateBoss(b, dt, fdt, playing) {
    const { W } = this, ab = b.def.ability, rage = b.hp <= b.max / 2 ? 1.4 : 1;
    b.t += fdt * rage; b.life -= dt; b.flash = Math.max(0, b.flash - dt * 6);
    const ty = 262 + Math.sin(b.t * 1.3) * 30;
    b.y = b.life > 0 ? lerp(b.y, ty, Math.min(1, dt * 3)) : b.y - 260 * dt;
    if (ab === 'dash') b.x = lerp(b.x, b.tx, Math.min(1, fdt * 5));
    else b.x = W / 2 + Math.sin(b.t * 0.75) * (W / 2 - b.r - 6);
    if (playing && b.life > 0 && (b.bombT -= fdt * rage) <= 0) {
      if (ab === 'dash') {
        b.bombT = 2.2; b.tx = rand(b.r + 10, W - b.r - 10);
        this.puff(b.x, b.y, '#ff8fa3', 6); this.snd('dodge');
        for (let i = 0; i < 2; i++) { const f = this.makeFruit('fruit'); f.x = b.x; f.y = b.y; f.vx = rand(-160, 160); f.vy = -rand(180, 300); f.g = 330; f.seen = true; this.fruits.push(f); }
      } else if (ab === 'orbit') {
        b.bombT = 3.2; this.toss('fruit', rand(60, W - 60), rand(60, W - 60), rand(this.H * 0.35, this.H * 0.5));
      } else {
        b.bombT = ab === 'storm' ? 2 : rand(2.2, 3.4);
        const f = this.makeFruit(this.inFever ? 'fruit' : 'bomb');
        f.x = b.x; f.y = b.y + 30; f.vx = rand(-90, 90); f.vy = -140; f.g = 300; f.seen = true; f.dodge = false;
        this.fruits.push(f);
      }
    }
    if (b.life <= 0 && b.y < -140) { this.boss = null; if (this.live) this.say(t('escaped'), null, '#ff8fa3', 1.2); }
  }

  // ------------------------------------------------------------------ render
  draw() {
    const c = this.ctx, { W, H } = this, k = this.scale * this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    if (this.bgFade < 1) { c.drawImage(this.bgPrev, 0, 0); c.globalAlpha = this.bgFade; }
    c.drawImage(this.bg, 0, 0);
    c.globalAlpha = 1;
    const sh = this.shake, z = 1 + this.zoom * 0.025;
    c.setTransform(k * z, 0, 0, k * z, ((Math.random() - 0.5) * sh - (W * (z - 1)) / 2) * k, ((Math.random() - 0.5) * sh - (H * (z - 1)) / 2) * k);
    const th = THEMES[this.themeIndex];

    // clouds
    c.fillStyle = th.cloud;
    for (const cl of this.photoBg ? [] : this.clouds) {
      const x = cl.x * W, y = cl.y * H, s = cl.s;
      c.beginPath();
      c.ellipse(x, y, 46 * s, 15 * s, 0, 0, TAU); c.ellipse(x - 20 * s, y - 9 * s, 22 * s, 15 * s, 0, 0, TAU); c.ellipse(x + 14 * s, y - 13 * s, 26 * s, 19 * s, 0, 0, TAU);
      c.fill();
    }
    // drifting leaves by day, fireflies after dark
    const night = th.stars > 0.2;
    for (const l of this.leaves) {
      const x = l.x * W, y = l.y * H;
      if (night) {
        c.globalAlpha = 0.35 + Math.sin(l.p * 1.7) * 0.35; c.fillStyle = '#fff3a0';
        c.beginPath(); c.arc(x, y, 2 * l.s, 0, TAU); c.fill();
        c.globalAlpha *= 0.3; c.beginPath(); c.arc(x, y, 6 * l.s, 0, TAU); c.fill();
      } else {
        c.globalAlpha = 0.75; c.fillStyle = th.hills[(l.s * 10 | 0) % 2];
        c.save(); c.translate(x, y); c.rotate(l.r); c.scale(1, 0.45 + Math.sin(l.p) * 0.3);
        c.beginPath(); c.ellipse(0, 0, 6 * l.s, 3.4 * l.s, 0, 0, TAU); c.fill(); c.restore();
      }
    }
    c.globalAlpha = 1;
    // wind streaks
    if (Math.abs(this.wind) > 40) {
      c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineWidth = 2;
      const dir = Math.sign(this.wind), str = Math.min(1, Math.abs(this.wind) / 260);
      for (let i = 0; i < 7; i++) {
        const ph = (this.time * (0.5 + str) + i * 0.37) % 1, y = ((i * 0.137 + 0.08) % 0.7) * H + Math.sin(ph * 6 + i) * 6;
        const x = dir > 0 ? ph * (W + 160) - 80 : W + 80 - ph * (W + 160);
        c.globalAlpha = 0.28 * str * Math.sin(ph * Math.PI);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - dir * (40 + 50 * str), y); c.stroke();
      }
      c.globalAlpha = 1;
    }

    // juice stains fading on the sky
    for (const d of this.decals) {
      c.globalAlpha = (d.life / d.max) * 0.3; c.fillStyle = d.color;
      c.beginPath();
      for (const [dx, dy, r] of d.blobs) { c.moveTo(d.x + dx + r, d.y + dy); c.arc(d.x + dx, d.y + dy, r, 0, TAU); }
      c.fill();
    }
    c.globalAlpha = 1;

    const skin = this.skin;
    for (const s of this.stuck) {
      c.globalAlpha = clamp(2.5 - s.life, 0, 1);
      c.save(); c.translate(s.x, s.y); c.rotate(s.rot + Math.sin(s.life * 40) * Math.exp(-s.life * 8) * 0.12);
      this.arrowShape(c, skin, false, '#e8eef5'); c.restore();
    }
    c.globalAlpha = 1;

    for (const s of this.shields) {
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.roundRect(s.x - s.w / 2 + 3, s.y - 5, s.w, 16, 7); c.fill();
      c.fillStyle = '#5a3a1a'; c.beginPath(); c.roundRect(s.x - s.w / 2, s.y - 9, s.w, 18, 7); c.fill();
      c.fillStyle = s.flash > 0 ? '#ffe9b0' : '#b9773a'; c.beginPath(); c.roundRect(s.x - s.w / 2 + 3, s.y - 7, s.w - 6, 11, 5); c.fill();
      c.fillStyle = '#e8eef5'; for (const dx of [-s.w / 2 + 10, s.w / 2 - 10]) { c.beginPath(); c.arc(s.x + dx, s.y - 1.5, 2.6, 0, TAU); c.fill(); }
    }

    if (this.boss) this.drawBoss(c, this.boss);

    for (const o of this.orbs) {
      const pulse = 1 + Math.sin(o.t * 6) * 0.06, r = o.r * pulse;
      c.globalAlpha = 0.28; c.fillStyle = o.def.color; c.beginPath(); c.arc(o.x, o.y, r + 12, 0, TAU); c.fill();
      c.globalAlpha = 1; c.fillStyle = INK; c.beginPath(); c.arc(o.x, o.y, r, 0, TAU); c.fill();
      c.lineWidth = 4; c.strokeStyle = o.def.color; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.5; c.beginPath(); c.arc(o.x, o.y, r - 6, -2.4, -1.3); c.stroke();
      c.drawImage(o.img, o.x - 19, o.y - 19, 38, 38);
    }

    for (const f of this.fruits) this.drawFruit(c, f);
    if (store.data.settings.marks) for (const f of this.fruits) {
      // colour-independent "do not shoot" marker: a white-edged ring with a cross
      const bird = f.carrier && f.carrier.type === 'bird' && !f.carrier.gone;
      if (f.kind !== 'bomb' && !bird) continue;
      const x = f.x, y = bird ? f.y - f.r - 30 : f.y, r = bird ? 34 : f.r + 8, k2 = r * 0.5;
      for (const [w, col] of [[7, '#fff'], [3.5, '#111']]) {
        c.strokeStyle = col; c.lineWidth = w; c.setLineDash(w > 4 ? [] : [9, 6]);
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.setLineDash([]);
        c.beginPath(); c.moveTo(x + r - k2, y - r + 1); c.lineTo(x + r + 4, y - r - k2 + 5); c.moveTo(x + r + 4, y - r + 1); c.lineTo(x + r - k2, y - r - k2 + 5); c.stroke();
      }
    }
    for (const s of this.sprites) {
      c.globalAlpha = clamp(2 - s.life * 1.4, 0, 1);
      c.save(); c.translate(s.x, s.y); if (s.flip) c.scale(-1, 1);
      c.drawImage(s.img, -s.size / 2, -s.size / 2, s.size, s.size); c.restore();
    }
    c.globalAlpha = 1;

    for (const p of this.pieces) {
      const s = p.r * 2.3;
      c.save(); c.translate(p.x, p.y); c.rotate(p.spin); c.rotate(p.cut);
      c.beginPath(); c.rect(-s, p.side > 0 ? 0 : -s, s * 2, s); c.clip();
      c.rotate(p.rot0 - p.cut);
      c.globalAlpha = clamp(1.6 - p.life, 0, 1);
      c.drawImage(p.img, -s / 2, -s / 2, s, s);
      c.restore();
    }
    c.globalAlpha = 1;

    for (const a of this.arrows) this.drawArrow(c, a, skin);

    for (const p of this.particles) {
      const u = 1 - p.life / p.max;
      c.globalAlpha = Math.min(1, u * 1.6); c.fillStyle = p.color;
      if (p.kind === 2) {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(p.life * 9 + p.r));
        c.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); c.restore();
      } else if (p.kind === 1) {
        const r = p.r * (0.4 + u);
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot + p.life * 6);
        c.beginPath(); c.moveTo(0, -r * 1.8); c.lineTo(r * 0.5, 0); c.lineTo(0, r * 1.8); c.lineTo(-r * 0.5, 0); c.closePath();
        c.moveTo(-r * 1.8, 0); c.lineTo(0, r * 0.5); c.lineTo(r * 1.8, 0); c.lineTo(0, -r * 0.5); c.closePath(); c.fill();
        c.restore();
      } else { c.beginPath(); c.arc(p.x, p.y, p.r * (0.35 + u * 0.65), 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;

    for (const r of this.rings) {
      if (r.life < 0) continue;
      const u = r.life / 0.45, e = 1 - Math.pow(1 - u, 3);
      c.globalAlpha = 1 - u; c.strokeStyle = r.color; c.lineWidth = r.w * (1 - u) + 1;
      c.beginPath(); c.arc(r.x, r.y, lerp(r.r, r.max, e), 0, TAU); c.stroke();
    }
    c.globalAlpha = 1;

    this.drawArcher(c, skin);
    if (this.state === 'playing' && !this.aim.active && (this.tutorial || (this.tut && this.tut.step === 0))) this.drawTutorial(c);
    if (this.tut && this.state === 'playing' && this.tut.step >= 0 && this.tut.step <= 3) this.label(c, t('tut' + this.tut.step), W / 2, H * 0.12, 24);

    // floating score text
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const x of this.texts) {
      const p = x.life / x.max, sc = p < 0.14 ? easeOutBack(p / 0.14) : 1;
      c.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
      c.font = `${Math.round(x.size * sc)}px ${FONT}`;
      c.lineWidth = x.size * 0.24; c.strokeStyle = INK; c.strokeText(x.text, x.x, x.y);
      c.fillStyle = x.color; c.fillText(x.text, x.x, x.y);
    }
    c.globalAlpha = 1;

    if (this.announce && this.state !== 'attract') {
      const a = this.announce, inT = Math.min(1, a.t / 0.22), out = clamp((a.dur - a.t) / 0.25, 0, 1);
      const sc = easeOutBack(inT) * (0.9 + out * 0.1), y = H * 0.34;
      c.globalAlpha = out;
      c.save(); c.translate(W / 2, y); c.scale(sc, sc);
      let size = 52; c.font = `${size}px ${FONT}`;
      const w = c.measureText(a.text).width; if (w > W - 40) { size *= (W - 40) / w; c.font = `${size}px ${FONT}`; }
      c.lineWidth = 12; c.strokeStyle = INK; c.strokeText(a.text, 0, 0);
      c.fillStyle = a.color; c.fillText(a.text, 0, 0);
      if (a.sub) {
        let ss = 20; c.font = `${ss}px ${FONT}`;
        const sw = c.measureText(a.sub).width; if (sw > W - 30) { ss *= (W - 30) / sw; c.font = `${ss}px ${FONT}`; }
        c.lineWidth = 6; c.strokeText(a.sub, 0, 40);
        c.fillStyle = '#fff6e0'; c.fillText(a.sub, 0, 40);
      }
      c.restore(); c.globalAlpha = 1;
    }

    // full-screen overlays
    c.setTransform(k, 0, 0, k, 0, 0);
    if (this.effects.freeze > 0) {
      c.globalAlpha = 0.16 * Math.min(1, this.effects.freeze); c.fillStyle = '#7fe3ff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    }
    if (this.inFever) {
      const a = 0.32 + Math.sin(this.time * 10) * 0.08;
      c.globalAlpha = a; c.strokeStyle = '#ffb02e'; c.lineWidth = 14; c.strokeRect(0, 0, W, H); c.globalAlpha = 1;
    }
    if (this.flash > 0) { c.globalAlpha = Math.min(0.5, this.flash); c.fillStyle = this.flashColor; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  }

  label(c, text, x, y, size) {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.font = `${size}px ${FONT}`;
    const w = c.measureText(text).width; if (w > this.W - 24) c.font = `${size * (this.W - 24) / w}px ${FONT}`;
    c.lineWidth = 7; c.strokeStyle = INK; c.strokeText(text, x, y); c.fillStyle = '#fff6e0'; c.fillText(text, x, y);
  }

  drawFruit(c, f) {
    const s = f.r * 2.3, pop = f.age < 0.25 && f.hover ? easeOutBack(f.age / 0.25) : 1;
    if (f.carrier) {
      const cy = f.y - f.r - 30, bird = f.carrier.type === 'bird';
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(f.x, f.y - f.r * 0.7); c.lineTo(f.x, cy + (bird ? 14 : 22)); c.stroke();
      c.save(); c.translate(f.x, cy); if (bird && f.dir < 0) c.scale(-1, 1);
      if (bird) c.rotate(Math.sin(f.t * 14) * 0.12);
      c.drawImage(f.carrier.img, -27, -27, 54, 54); c.restore();
    }
    c.save(); c.translate(f.x, f.y);
    // soft contact shadow gives the sprite some depth against the sky
    c.globalAlpha = 0.16; c.fillStyle = '#000'; c.beginPath(); c.ellipse(4, 7, f.r * 0.92, f.r * 0.86, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
    // stretch along the direction of travel
    if (!f.hover && !f.carrier) { const st = clamp(Math.abs(f.vy) / 3200, 0, 0.14); c.scale(1 - st * 0.6, 1 + st); }
    c.scale(pop, pop);
    if (f.kind === 'star' || f.kind === 'gem') {
      c.globalAlpha = 0.35 + Math.sin(this.time * 9) * 0.12; c.fillStyle = f.def.juice;
      c.beginPath(); c.arc(0, 0, f.r * 1.45, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.rotate(f.rot * 0.4);
    } else if (f.kind === 'bomb') {
      c.globalAlpha = 0.25 + Math.sin(this.time * 12) * 0.15; c.fillStyle = '#ff2d55';
      c.beginPath(); c.arc(0, 0, f.r * 1.35, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.rotate(Math.sin(f.rot) * 0.4);
    } else if (f.dodge) c.rotate(Math.sin(f.t * 3) * 0.2);
    else c.rotate(f.rot);
    c.drawImage(f.img, -s / 2, -s / 2, s, s);
    if (f.flash > 0) { c.globalAlpha = f.flash * 0.6; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, f.r, 0, TAU); c.fill(); c.globalAlpha = 1; }
    if (f.def.hp && f.hp < f.def.hp) {
      c.strokeStyle = '#3d2a1a'; c.lineWidth = 3; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-f.r * 0.5, -f.r * 0.6); c.lineTo(-f.r * 0.05, -f.r * 0.15); c.lineTo(-f.r * 0.3, f.r * 0.15); c.lineTo(f.r * 0.25, f.r * 0.6); c.stroke();
    }
    if (f.dodge) {
      // dodgers watch the arrows coming
      const e = f.r * 0.24, look = f.dodged ? 0 : 1;
      for (const sx of [-1, 1]) {
        c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * e * 1.3, -e * 0.3, e, 0, TAU); c.fill();
        c.fillStyle = INK; c.beginPath(); c.arc(sx * e * 1.3 + look * e * 0.2, -e * 0.3 + look * e * 0.35, e * 0.5, 0, TAU); c.fill();
      }
    }
    if (f.ring) {
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([6, 5]); c.globalAlpha = 0.7 + Math.sin(this.time * 6) * 0.3;
      c.beginPath(); c.arc(0, 0, f.r * 0.36, 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    }
    c.restore();
  }

  drawArrow(c, a, skin) {
    const tr = a.trail, col = a.fire ? '#ff8a1f' : a.type === 'std' ? skin.trail : this.arrowDef.color;
    if (tr.length >= 4) {
      c.lineCap = 'round'; c.strokeStyle = col;
      for (let i = 2; i < tr.length; i += 2) {
        const u = i / tr.length;
        c.globalAlpha = u * 0.55; c.lineWidth = 1 + u * (a.fire ? 8 : 5);
        c.beginPath(); c.moveTo(tr[i - 2], tr[i - 1]); c.lineTo(tr[i], tr[i + 1]); c.stroke();
      }
      c.globalAlpha = 1;
    }
    c.save(); c.translate(a.x, a.y);
    c.rotate(a.rot + Math.sin(a.age * 46) * Math.exp(-a.age * 5) * 0.07); // the shaft flexes as it leaves the string
    if (a.hitMul < 1) c.scale(0.8, 0.8);
    this.arrowShape(c, skin, a.fire, a.type === 'std' ? '#e8eef5' : this.arrowDef.color);
    c.restore();
  }

  /** Arrow drawn with its tip at the origin, pointing along +x. */
  arrowShape(c, skin, fire, head = '#e8eef5') {
    c.lineCap = 'round';
    c.strokeStyle = '#4a2c12'; c.lineWidth = 6; c.beginPath(); c.moveTo(-ARROW_LEN, 0); c.lineTo(-10, 0); c.stroke();
    c.strokeStyle = '#f0d9a8'; c.lineWidth = 3; c.beginPath(); c.moveTo(-ARROW_LEN, 0); c.lineTo(-10, 0); c.stroke();
    c.fillStyle = skin.trail; c.strokeStyle = '#4a2c12'; c.lineWidth = 1.5; c.lineJoin = 'round';
    for (const s of [1, -1]) {
      c.beginPath(); c.moveTo(-ARROW_LEN + 2, 0); c.lineTo(-ARROW_LEN - 6, s * 8); c.lineTo(-ARROW_LEN + 14, s * 8); c.lineTo(-ARROW_LEN + 22, 0); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = fire ? '#ff8a1f' : head; c.strokeStyle = '#3a4250'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(2, 0); c.lineTo(-16, -8); c.lineTo(-12, 0); c.lineTo(-16, 8); c.closePath(); c.fill(); c.stroke();
    if (fire) { c.globalAlpha = 0.4; c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(-6, 0, 12, 0, TAU); c.fill(); c.globalAlpha = 1; }
  }

  /** The archer holds the bow overhead and looks where they aim. */
  drawArcher(c, skin) {
    const { bx, by, H } = this, a = this.aim, playing = this.state === 'playing';
    const angle = a.active ? a.angle : this.idleAngle;
    const wob = Math.sin(this.twang * 60) * Math.exp(-this.twang * 11) * 7; // string vibrates after release
    const pull = a.active ? a.power * 34 : wob;
    const S = 1.15, ca = Math.cos(angle), sa = Math.sin(angle);
    const breathe = Math.sin(this.time * 2.2) * 1.2;
    const hx = bx, hy = by + 60 + breathe * 0.5;      // head
    const tx = bx, ty = by + 92;                      // torso
    const gripX = bx + ca * 14 * S, gripY = by + sa * 14 * S;
    const nockX = bx - ca * (8 + pull) * S, nockY = by - sa * (8 + pull) * S;
    const OUT = '#2a1608';

    c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(bx, H - 14, 40, 8, 0, 0, TAU); c.fill();
    c.lineCap = 'round'; c.lineJoin = 'round';
    // legs and boots
    for (const s of [-1, 1]) {
      c.strokeStyle = OUT; c.lineWidth = 13; c.beginPath(); c.moveTo(tx + s * 8, ty + 12); c.lineTo(tx + s * 11, H - 20); c.stroke();
      c.strokeStyle = '#5b3a1e'; c.lineWidth = 9; c.beginPath(); c.moveTo(tx + s * 8, ty + 12); c.lineTo(tx + s * 11, H - 20); c.stroke();
      c.fillStyle = OUT; c.beginPath(); c.ellipse(tx + s * 13, H - 17, 11, 7, 0, 0, TAU); c.fill();
      c.fillStyle = '#3d2a1a'; c.beginPath(); c.ellipse(tx + s * 13, H - 17, 8.5, 4.8, 0, 0, TAU); c.fill();
    }
    // quiver
    c.save(); c.translate(tx - 20, ty - 6); c.rotate(-0.35);
    c.fillStyle = OUT; c.beginPath(); c.roundRect(-8, -20, 16, 40, 6); c.fill();
    c.fillStyle = '#8a5a2b'; c.beginPath(); c.roundRect(-5.5, -17, 11, 34, 4); c.fill();
    c.fillStyle = skin.trail; for (const dx of [-3, 3]) { c.beginPath(); c.moveTo(dx, -30); c.lineTo(dx - 4, -19); c.lineTo(dx + 4, -19); c.closePath(); c.fill(); }
    c.restore();
    // tunic
    c.fillStyle = OUT; c.beginPath(); c.roundRect(tx - 20, ty - 20 + breathe, 40, 40 - breathe, 14); c.fill();
    c.fillStyle = '#2f9e44'; c.beginPath(); c.roundRect(tx - 17, ty - 17 + breathe, 34, 34 - breathe, 11); c.fill();
    c.fillStyle = '#5b3a1e'; c.fillRect(tx - 17, ty + 5, 34, 5);
    c.fillStyle = '#ffd23f'; c.fillRect(tx - 4, ty + 4, 8, 7);
    // head, hood and face
    c.fillStyle = OUT; c.beginPath(); c.arc(hx, hy, 19.5, 0, TAU); c.fill();
    c.fillStyle = '#f2c49b'; c.beginPath(); c.arc(hx, hy, 17, 0, TAU); c.fill();
    c.fillStyle = OUT; c.beginPath(); c.moveTo(hx - 21, hy - 1); c.quadraticCurveTo(hx - 20, hy - 26, hx + 4, hy - 23); c.lineTo(hx + 24, hy - 34); c.quadraticCurveTo(hx + 24, hy - 8, hx + 21, hy - 1); c.quadraticCurveTo(hx, hy - 12, hx - 21, hy - 1); c.fill();
    c.fillStyle = '#237a35'; c.beginPath(); c.moveTo(hx - 18, hy - 4); c.quadraticCurveTo(hx - 17, hy - 23, hx + 4, hy - 20.5); c.lineTo(hx + 20, hy - 29); c.quadraticCurveTo(hx + 21, hy - 10, hx + 18, hy - 4); c.quadraticCurveTo(hx, hy - 14, hx - 18, hy - 4); c.fill();
    const blink = (this.time % 3.4) < 0.12, ex = ca * 2.6, ey = sa * 2.2;
    c.fillStyle = INK;
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(hx + s * 6.5 + ex, hy + 2 + ey, 2.6, blink ? 0.6 : a.active ? 2.2 : 3.2, 0, 0, TAU); c.fill(); }
    c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath();
    if (a.active) { c.moveTo(hx - 3 + ex, hy + 9.5); c.lineTo(hx + 3 + ex, hy + 9.5); } else c.arc(hx + ex, hy + 7, 4, 0.2, Math.PI - 0.2);
    c.stroke();
    c.fillStyle = 'rgba(255,120,120,0.35)'; for (const s of [-1, 1]) { c.beginPath(); c.arc(hx + s * 11, hy + 7, 3, 0, TAU); c.fill(); }

    if (a.active && a.power > 0.03) this.drawGuide(c, angle, a.power);

    // bow
    c.save(); c.translate(bx, by); c.rotate(angle); c.scale(S, S);
    const tipX = -8 - Math.max(0, pull) * 0.3, tipY = 58, nock = -8 - pull;
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(tipX, -tipY); c.lineTo(nock, 0); c.lineTo(tipX, tipY); c.stroke();
    const limb = () => { c.beginPath(); c.moveTo(tipX, -tipY); c.quadraticCurveTo(34, -34, 12, 0); c.quadraticCurveTo(34, 34, tipX, tipY); };
    c.strokeStyle = OUT; c.lineWidth = 13; limb(); c.stroke();
    c.strokeStyle = skin.wood2; c.lineWidth = 9; limb(); c.stroke();
    c.strokeStyle = skin.wood; c.lineWidth = 5; limb(); c.stroke();
    c.strokeStyle = skin.grip; c.lineWidth = 12; c.beginPath(); c.moveTo(14, -11); c.lineTo(14, 11); c.stroke();
    const canShoot = !playing || this.rule !== 'arrows' || this.arrowsLeft > 0;
    const nocked = (playing || this.state === 'attract') && this.cooldown <= 0.05 && canShoot;
    if (nocked) {
      c.translate(nock + ARROW_LEN, 0);
      this.arrowShape(c, skin, playing && (this.effects.fire > 0 || this.arrowDef.id === 'fire'), playing && this.arrowDef.id !== 'std' ? this.arrowDef.color : '#e8eef5');
    }
    c.restore();

    // arms reach up to the grip and the string
    const arm = (sx, sy, ex2, ey2, bend) => {
      const mx = (sx + ex2) / 2 + bend, my = (sy + ey2) / 2 + 6;
      c.strokeStyle = OUT; c.lineWidth = 11; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex2, ey2); c.stroke();
      c.strokeStyle = '#2f9e44'; c.lineWidth = 7; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex2, ey2); c.stroke();
      c.fillStyle = OUT; c.beginPath(); c.arc(ex2, ey2, 7.5, 0, TAU); c.fill();
      c.fillStyle = '#f2c49b'; c.beginPath(); c.arc(ex2, ey2, 5.5, 0, TAU); c.fill();
    };
    const left = gripX <= nockX;
    arm(tx - 14, ty - 12 + breathe, left ? gripX : nockX, left ? gripY : nockY, -8);
    arm(tx + 14, ty - 12 + breathe, left ? nockX : gripX, left ? nockY : gripY, 8);

    if (a.active) {
      // where the thumb started and how far it has pulled
      c.globalAlpha = 0.5; c.strokeStyle = '#fff'; c.lineWidth = 2; c.setLineDash([5, 6]);
      c.beginPath(); c.moveTo(a.sx, a.sy); c.lineTo(a.cx, a.cy); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(a.sx, a.sy, 13, 0, TAU); c.stroke();
      c.globalAlpha = 0.3; c.fillStyle = '#fff'; c.beginPath(); c.arc(a.cx, a.cy, 20, 0, TAU); c.fill();
      c.globalAlpha = 1;
    }
  }

  drawGuide(c, angle, power) {
    const speed = (640 + power * 760) * (1 + store.up('power') * 0.06) * (this.arrowDef.id === 'ice' && this.state === 'playing' ? 0.88 : 1);
    let x = this.bx + Math.cos(angle) * 30, y = this.by + Math.sin(angle) * 30;
    let vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
    const n = Math.round((7 + power * 6) * (1 + store.up('sight') * 0.25) * (this.state === 'playing' && this.mode !== 'tutorial' ? this.diff.guide : 1)), step = 0.034;
    for (let i = 0; i < n; i++) {
      vy += ARROW_G * step; vx += this.wind * step; x += vx * step; y += vy * step;
      if (i === 0) continue;
      const u = 1 - i / n, r = 2 + u * 3.4;
      c.globalAlpha = 0.35 + u * 0.5;
      c.fillStyle = INK; c.beginPath(); c.arc(x, y, r + 1.6, 0, TAU); c.fill();
      c.fillStyle = power >= 1 ? '#ffd23f' : power > 0.08 ? '#fff' : '#ff8fa3'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }

  drawTutorial(c) {
    const { W, H } = this, u = (this.time % 2.2) / 2.2;
    const p = u < 0.15 ? 0 : u < 0.7 ? (u - 0.15) / 0.55 : 1, e = 1 - Math.pow(1 - p, 3);
    const sx = W / 2 + 70, sy = H * 0.52, x = sx, y = sy + 130 * e;
    c.globalAlpha = u > 0.85 ? (1 - u) / 0.15 : 0.9;
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.setLineDash([5, 6]);
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(sx, sy, 13, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(x, y, 24, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 12, 0, TAU); c.fill();
    c.globalAlpha = 1;
  }

  drawBoss(c, b) {
    const s = b.r * 2.4, wob = Math.sin(b.t * 5) * 0.08;
    if (b.def.ability === 'orbit') {
      for (let i = 0; i < 2; i++) {
        const an = b.t * 2 + i * Math.PI, ox = b.x + Math.cos(an) * (b.r + 36), oy = b.y + Math.sin(an) * (b.r + 36);
        c.globalAlpha = 0.3; c.fillStyle = '#c9a27a'; c.beginPath(); c.arc(ox, oy, 28, 0, TAU); c.fill(); c.globalAlpha = 1;
        c.drawImage(this.img.shield, ox - 26, oy - 26, 52, 52);
      }
    }
    c.save(); c.translate(b.x, b.y); c.rotate(wob);
    c.globalAlpha = 0.25; c.fillStyle = b.def.juice; c.beginPath(); c.arc(0, 0, b.r * 1.3 + Math.sin(b.t * 7) * 5, 0, TAU); c.fill(); c.globalAlpha = 1;
    const sq = 1 + b.flash * 0.1;
    c.scale(sq, 2 - sq);
    c.drawImage(b.img, -s / 2, -s / 2, s, s);
    if (b.def.id !== 'pumpkin') {
      // angry face for bosses whose art has none
      const e = b.r * 0.2, rage = b.hp <= b.max / 2;
      for (const sx of [-1, 1]) {
        c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * e * 1.5, -e * 0.2, e, 0, TAU); c.fill();
        c.fillStyle = rage ? '#e11d48' : INK; c.beginPath(); c.arc(sx * e * 1.5, e * 0.05, e * 0.5, 0, TAU); c.fill();
        c.strokeStyle = INK; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx * e * 2.6, -e * 1.6); c.lineTo(sx * e * 0.6, -e * 0.8); c.stroke();
      }
      c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.arc(0, e * 2.6, e * 1.2, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    }
    c.drawImage(this.img.crown, -30, -b.r - 34, 60, 60);
    if (b.flash > 0) { c.globalAlpha = b.flash * 0.55; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, b.r, 0, TAU); c.fill(); }
    c.restore(); c.globalAlpha = 1;
  }
}
