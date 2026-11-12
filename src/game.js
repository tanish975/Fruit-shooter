// Fruit Archer — gameplay, physics and canvas rendering.
import { FRUITS, SPECIALS, POWERUPS, THEMES, SKINS } from './data.js';
import { store } from './store.js';
import { sfx, audio } from './audio.js';
import { buzz } from './platform.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

const ARROW_G = 620;      // gravity on arrows (world units / s²)
const ARROW_LEN = 78;
const FRUIT_G = 430;
const FEVER_TIME = 7;
const INK = '#1b1036';

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
    this.aim = { active: false, id: -1, sx: 0, sy: 0, cx: 0, cy: 0, power: 0, angle: -Math.PI / 2 };
    this.idleAngle = -Math.PI / 2;
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
    this.boss = null; this.announce = null;
    this.effects = { triple: 0, freeze: 0, fire: 0, double: 0, magnet: 0 };
    this.effectMax = { triple: 1, freeze: 1, fire: 1, double: 1, magnet: 1 };
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.level = 1; this.levelHits = 0;
    this.fever = 0; this.feverTime = 0;
    this.lives = 3; this.timeLeft = 60; this.arrowsLeft = 15;
    this.spawnT = 1; this.orbT = rand(7, 10); this.cooldown = 0; this.autoT = 1;
    this.shake = 0; this.hitstop = 0; this.slowmo = 0; this.flash = 0; this.flashColor = '#fff';
    this.time = 0; this.endT = 0; this.bossQueue = 0; this.bossCount = 0;
    this.run = { shots: 0, hits: 0, fruits: 0, perfects: 0, coins: 0, skewer: 0, bosses: 0, fevers: 0 };
    this.comboPulse = 0; this.scorePulse = 0;
  }

  resize() {
    const cw = this.canvas.clientWidth || window.innerWidth, ch = this.canvas.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    while (cw * ch * dpr * dpr > 2.6e6 && dpr > 1) dpr -= 0.25; // keep fill-rate sane on QHD phones
    this.dpr = dpr;
    this.canvas.width = Math.round(cw * dpr); this.canvas.height = Math.round(ch * dpr);
    // World is 400 units wide on a portrait phone; on wide screens it is 720 tall instead.
    this.scale = Math.min(cw / 400, ch / 720);
    this.W = cw / this.scale; this.H = ch / this.scale;
    this.bx = this.W / 2; this.by = this.H - 122;
    this.paintBackground(this.bg, THEMES[this.themeIndex]);
    this.bgFade = 1;
  }

  setTheme(i) {
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
    c.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const sky = c.createLinearGradient(0, 0, 0, H * 0.8);
    sky.addColorStop(0, th.sky[0]); sky.addColorStop(0.55, th.sky[1]); sky.addColorStop(1, th.sky[2]);
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    if (th.stars) {
      c.fillStyle = '#fff';
      for (let i = 0; i < 90; i++) {
        c.globalAlpha = th.stars * (0.3 + rnd() * 0.7);
        c.beginPath(); c.arc(rnd() * W, rnd() * H * 0.6, 0.6 + rnd() * 1.3, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    }
    const sx = W * 0.74, sy = H * th.sunY;
    const glow = c.createRadialGradient(sx, sy, 10, sx, sy, 230);
    glow.addColorStop(0, th.sun + 'cc'); glow.addColorStop(0.25, th.sun + '55'); glow.addColorStop(1, th.sun + '00');
    c.fillStyle = glow; c.fillRect(sx - 230, sy - 230, 460, 460);
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
    a.power = clamp((len - 10) / 150, 0, 1);
    if (len > 6) {
      let ang = Math.atan2(py, px);
      if (ang > -0.14) ang = px >= 0 ? -0.14 : -Math.PI + 0.14; // the bow can't shoot into the ground
      if (ang < -Math.PI + 0.14) ang = -Math.PI + 0.14;
      a.angle = ang; this.idleAngle = ang;
    }
    if (was < 1 && a.power >= 1) buzz('light');
  }

  // ------------------------------------------------------------------ lifecycle
  start(mode) {
    this.clear();
    this.mode = mode; this.state = 'playing';
    const head = store.up('head');
    this.lives = 3 + head; this.timeLeft = 60 + head * 5; this.arrowsLeft = 15 + head * 2;
    this.skin = SKINS.find(s => s.id === store.data.skins.equipped) || SKINS[0];
    this.setTheme(0);
    this.tutorial = !store.data.tutorialDone;
    this.aim.active = false; this.idleAngle = -Math.PI / 2;
    this.say('READY?', 'Pull back, aim, release', '#fff6e0', 1.3);
    audio.setIntense(false);
  }
  pause() { if (this.state === 'playing') { this.state = 'paused'; this.aim.active = false; } }
  resume() { if (this.state === 'paused') { this.state = 'playing'; this.last = performance.now(); } }
  toMenu() { this.clear(); this.state = 'attract'; this.setTheme(1); audio.setIntense(false); }
  get live() { return this.state === 'playing' || this.state === 'ending'; }
  snd(n, a) { if (this.live) sfx(n, a); }
  get comboMult() { return Math.min(6, 1 + Math.floor(this.combo / 5) * 0.5); }
  get inFever() { return this.feverTime > 0; }

  say(text, sub, color = '#fff6e0', dur = 1.5) { this.announce = { text, sub, color, t: 0, dur }; }
  text(x, y, text, color = '#fff', size = 22) {
    if (this.texts.length > 24) this.texts.shift();
    this.texts.push({ x: clamp(x, 44, this.W - 44), y, text, color, size, life: 0, max: 0.95 });
  }

  // ------------------------------------------------------------------ spawning
  chooseKind() {
    const lucky = 1 + store.up('lucky') * 0.1, playing = this.state === 'playing';
    const r = Math.random();
    if (playing && this.level >= 2 && !this.inFever && r < Math.min(0.2, 0.05 + this.level * 0.018)) return 'bomb';
    const r2 = Math.random();
    if (playing && this.level >= 3 && r2 < 0.012 * lucky) return 'gem';
    if (r2 < 0.05 * lucky) return 'star';
    return 'fruit';
  }

  makeFruit(kind) {
    let def;
    if (kind === 'fruit') def = pick(FRUITS.filter(f => f.lvl <= (this.state === 'attract' ? 9 : this.level)));
    else def = SPECIALS[kind];
    const big = this.W > 560 ? 1.12 : 1;
    return {
      kind, def, img: this.img[def.id], r: def.r * big, hp: def.hp || 1,
      x: 0, y: 0, vx: 0, vy: 0, g: FRUIT_G, rot: rand(0, TAU), vr: rand(-2.4, 2.4), flash: 0, seen: false,
    };
  }

  toss(kind, x, tx, apex) {
    const f = this.makeFruit(kind), { H } = this;
    const sp = this.state === 'attract' ? 0.8 : Math.min(1.7, 1 + (this.level - 1) * 0.055);
    f.g = FRUIT_G * sp * sp;
    f.x = x; f.y = H + f.r + 4;
    f.vy = -Math.sqrt(2 * f.g * (f.y - apex));
    f.vx = (tx - x) / (2 * -f.vy / f.g);
    this.fruits.push(f);
    return f;
  }

  flyBy(kind) {
    const f = this.makeFruit(kind), dir = Math.random() < 0.5 ? 1 : -1;
    const sp = Math.min(1.6, 1 + (this.level - 1) * 0.05);
    f.x = dir > 0 ? -f.r : this.W + f.r; f.y = rand(this.H * 0.2, this.H * 0.45);
    f.vx = dir * rand(150, 210) * sp; f.vy = -rand(110, 160); f.g = 130;
    this.fruits.push(f);
  }

  spawnWave() {
    const { W, H } = this, L = this.state === 'attract' ? 3 : this.level, m = 44;
    const x = () => rand(m, W - m), apex = () => rand(H * 0.1, H * 0.46);
    const roll = Math.random();
    const survival = this.mode === 'survival' && this.state === 'playing';
    if (L >= 2 && roll < 0.16) {
      this.flyBy(this.chooseKind());
    } else if (L >= 3 && roll < 0.34) {
      // a column of fruit: line them up and skewer the lot
      const cx = x(), n = survival ? 2 : L >= 6 ? 4 : 3, top = rand(H * 0.1, H * 0.2);
      for (let i = 0; i < n; i++) this.toss('fruit', cx + rand(-8, 8), cx + rand(-14, 14), top + i * 82);
    } else if (L >= 4 && roll < 0.48 && !survival) {
      // fountain
      const cx = rand(W * 0.3, W * 0.7), n = Math.min(5, 3 + ((L / 4) | 0));
      for (let i = 0; i < n; i++) this.toss(i === 0 ? this.chooseKind() : 'fruit', cx, cx + (i - (n - 1) / 2) * (W * 0.8 / n), apex());
    } else {
      const n = L < 2 ? 1 : survival ? (Math.random() < Math.min(0.5, L * 0.07) ? 2 : 1) : 1 + (Math.random() < Math.min(0.75, L * 0.13)) + (L >= 5 && Math.random() < 0.3);
      for (let i = 0; i < n; i++) this.toss(this.chooseKind(), x(), x(), apex());
    }
  }

  spawnOrb() {
    const mode = this.mode, timed = ['triple', 'freeze', 'fire', 'double', 'magnet'];
    const bonus = mode === 'classic' ? 'time' : mode === 'survival' ? 'heart' : 'quiver';
    const type = Math.random() < 0.26 ? bonus : pick(timed);
    this.orbs.push({ type, def: POWERUPS[type], img: this.img[POWERUPS[type].icon], x0: rand(60, this.W - 60), x: 0, y: this.H + 40, t: rand(0, 6), r: 30 });
  }

  spawnBoss() {
    this.bossCount++;
    const hp = 8 + this.bossCount * 4;
    this.boss = { x: this.W / 2, y: -90, r: SPECIALS.boss.r, hp, max: hp, t: 0, flash: 0, bombT: 3, life: 30, img: this.img.pumpkin };
    this.say('KING PUMPKIN!', 'Smash him before he escapes', '#ff8a1f', 2);
    this.snd('boss'); buzz('heavy'); this.shake = 14;
  }

  // ------------------------------------------------------------------ shooting
  fire(auto) {
    if (this.cooldown > 0) return;
    const playing = this.state === 'playing';
    if (playing && this.mode === 'precision' && this.arrowsLeft <= 0) return;
    const power = auto ? auto.power : this.aim.power, angle = auto ? auto.angle : this.aim.angle;
    const speed = (640 + power * 760) * (1 + store.up('power') * 0.06);
    const spread = playing && this.effects.triple > 0 ? [-0.13, 0, 0.13] : [0];
    const volley = { alive: spread.length, hits: 0, perfect: false, auto: !!auto };
    for (const d of spread) {
      const a = angle + d;
      this.arrows.push({
        x: this.bx + Math.cos(a) * 30, y: this.by + Math.sin(a) * 30, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        rot: a, trail: [], hit: [], n: 0, volley, fire: playing && this.effects.fire > 0, dead: false,
      });
    }
    this.cooldown = 0.2;
    this.recoil = 1;
    if (!playing) return;
    this.run.shots++;
    if (this.mode === 'precision') this.arrowsLeft--;
    sfx('shoot', power); buzz('light');
    if (this.tutorial && this.run.shots >= 2) { this.tutorial = false; store.data.tutorialDone = true; store.save(); }
  }

  volleyDone(v) {
    if (--v.alive > 0 || v.auto || !this.live) return;
    if (v.hits === 0) {
      if (this.combo >= 5) this.text(this.bx, this.by - 70, 'COMBO LOST', '#ff8fa3', 20);
      if (this.combo > 0) this.snd('miss');
      this.combo = 0;
      if (!this.inFever) this.fever *= 0.6;
    } else if (this.mode === 'precision' && (v.perfect || v.hits >= 2)) {
      this.arrowsLeft++;
      this.text(this.bx, this.by - 70, '+1 ARROW', '#7ee787', 22);
    }
  }

  // ------------------------------------------------------------------ scoring
  award(base, x, y, { perfect = false, skew = 1, color = '#fff' } = {}) {
    const mult = this.comboMult * (this.effects.double > 0 ? 2 : 1) * (this.inFever ? 2 : 1) * (perfect ? 2 : 1) * skew;
    const pts = Math.round(base * mult);
    this.score += pts; this.scorePulse = 1;
    this.text(x, y - 18, '+' + pts, perfect ? '#ffe14d' : color, perfect || pts >= 100 ? 28 : 22);
    return pts;
  }

  bumpCombo(perfect) {
    this.combo++; this.comboPulse = 1;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (!this.inFever) {
      this.fever += perfect ? 0.085 : 0.05;
      if (this.fever >= 1) this.startFever();
    }
  }

  startFever() {
    this.fever = 1; this.feverTime = FEVER_TIME; this.run.fevers++;
    this.say('FEVER!', 'Double points', '#ffd23f', 1.4);
    this.snd('fever'); buzz('heavy'); this.flash = 0.5; this.flashColor = '#ffd23f';
    audio.setIntense(true);
    for (const f of this.fruits) if (f.kind === 'bomb') { this.puff(f.x, f.y, '#888', 8); f.dead = true; }
  }

  levelUp() {
    this.level++; this.levelHits = 0;
    this.setTheme(Math.floor((this.level - 1) / 2));
    if (this.level % 3 === 0 && !this.boss) this.bossQueue = 1.6;
    else { this.say('LEVEL ' + this.level, 'Faster fruit', '#a6f06a', 1.2); this.snd('level'); }
  }

  loseLife(x) {
    if (this.state !== 'playing') return;
    this.lives--; this.combo = 0;
    this.flash = 0.45; this.flashColor = '#ff2d55'; this.shake = Math.max(this.shake, 10);
    this.snd('hurt'); buzz('error');
    if (x != null) this.text(x, this.H - 96, 'MISSED!', '#ff8fa3', 22);
    if (this.lives <= 0) this.end();
  }

  // ------------------------------------------------------------------ hits
  slice(f, angle, perfect, arrow) {
    f.dead = true;
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
        if (arrow.n > this.run.skewer) this.run.skewer = arrow.n;
      }
    }
    this.bumpCombo(perfect);
    this.run.hits++; this.run.fruits++;
    if (perfect) {
      this.run.perfects++;
      this.rings.push({ x: f.x, y: f.y, r: f.r * 0.6, max: f.r * 2.6, life: 0, color: '#ffe14d', w: 5 });
      this.text(f.x, f.y - 50 - (skew > 1 ? 26 : 0), 'PERFECT!', '#ffe14d', 20);
      this.hitstop = 0.045;
    }
    this.award(def.pts, f.x, f.y, { perfect, skew, color: f.kind === 'fruit' ? '#fff' : '#ffe14d' });
    this.run.coins += (def.coins || 1) * (1 + store.up('purse') * 0.15);
    if (f.kind !== 'fruit') { this.sparkle(f.x, f.y, def.juice, 14); this.snd('coin'); }
    this.snd('hit', this.combo); if (perfect) this.snd('perfect');
    buzz(perfect ? 'medium' : 'light');
    this.shake = Math.max(this.shake, perfect ? 6 : 3);
    if (arrow && arrow.fire) this.blast(f.x, f.y, arrow);
    if (++this.levelHits >= 7 + this.level * 2) this.levelUp();
  }

  blast(x, y, arrow) {
    const R = 100;
    this.rings.push({ x, y, r: 20, max: R, life: 0, color: '#ff8a1f', w: 8 });
    this.puff(x, y, '#ffb347', 10);
    for (const o of this.fruits) {
      if (o.dead || o.kind === 'bomb') continue;
      if (Math.hypot(o.x - x, o.y - y) < R + o.r * 0.5) { arrow.hit.push(o); this.slice(o, Math.atan2(o.y - y, o.x - x) + Math.PI / 2, false, { ...arrow, n: 0, fire: false, volley: arrow.volley }); }
    }
  }

  hitBomb(f) {
    f.dead = true;
    this.rings.push({ x: f.x, y: f.y, r: 20, max: 190, life: 0, color: '#fff', w: 12 });
    this.puff(f.x, f.y, '#3a3a44', 18); this.puff(f.x, f.y, '#ff8a1f', 14);
    this.shake = 22; this.hitstop = 0.08;
    if (!this.live) return;
    this.snd('bomb'); this.combo = 0; if (!this.inFever) this.fever *= 0.5;
    this.say('BOOM!', this.mode === 'classic' ? '-8 seconds' : this.mode === 'survival' ? '-1 life' : '-2 arrows', '#ff5c7a', 1);
    if (this.mode === 'classic') { this.timeLeft = Math.max(0, this.timeLeft - 8); this.flash = 0.45; this.flashColor = '#ff2d55'; buzz('error'); }
    else if (this.mode === 'survival') this.loseLife();
    else { this.arrowsLeft = Math.max(0, this.arrowsLeft - 2); this.flash = 0.45; this.flashColor = '#ff2d55'; buzz('error'); }
  }

  hitBoss(arrow) {
    const b = this.boss;
    b.hp--; b.flash = 1; arrow.dead = true; arrow.volley.hits++;
    this.juice(arrow.x, arrow.y, '#ff8a1f', 8, arrow.rot + Math.PI);
    this.shake = Math.max(this.shake, 7); this.hitstop = 0.03;
    this.snd('bossHit'); buzz('medium');
    this.bumpCombo(false); this.run.hits++;
    this.award(30, arrow.x, arrow.y, { color: '#ffb347' });
    if (b.hp <= 0) this.killBoss();
  }

  killBoss() {
    const b = this.boss; this.boss = null;
    this.run.bosses++;
    const pts = 500 * (this.effects.double > 0 ? 2 : 1) * (this.inFever ? 2 : 1);
    this.score += pts; this.scorePulse = 1;
    this.text(b.x, b.y - 84, '+' + pts, '#ffd23f', 40);
    this.run.coins += 40 * (1 + store.up('purse') * 0.15);
    const reward = this.mode === 'classic' ? '+12 seconds' : this.mode === 'survival' ? '+1 life' : '+4 arrows';
    if (this.mode === 'classic') this.timeLeft += 12; else if (this.mode === 'survival') this.lives++; else this.arrowsLeft += 4;
    this.say('SMASHED!', reward, '#ffd23f', 1.8);
    for (let i = 0; i < 4; i++) this.rings.push({ x: b.x, y: b.y, r: 30, max: 160 + i * 60, life: -i * 0.08, color: i % 2 ? '#fff' : '#ff8a1f', w: 10 });
    for (let i = 0; i < 2; i++) this.pieces.push({ img: b.img, r: b.r, x: b.x, y: b.y, cut: 0.4, rot0: 0, spin: 0, side: i ? 1 : -1, vx: (i ? 1 : -1) * 140, vy: -220, vs: (i ? 1 : -1) * 3, life: 0 });
    this.juice(b.x, b.y, '#ff8a1f', 30, 0); this.sparkle(b.x, b.y, '#ffd23f', 26);
    this.shake = 26; this.slowmo = 0.9; this.flash = 0.6; this.flashColor = '#fff';
    this.snd('bomb'); this.snd('best'); buzz('success');
  }

  collect(o, arrow) {
    o.dead = true; arrow.volley.hits++;
    const t = o.type, d = o.def;
    this.rings.push({ x: o.x, y: o.y, r: 20, max: 120, life: 0, color: d.color, w: 7 });
    this.sparkle(o.x, o.y, d.color, 16);
    this.snd('power'); buzz('medium');
    if (d.dur) {
      const dur = d.dur * (1 + store.up('surge') * 0.12);
      this.effects[t] = dur; this.effectMax[t] = dur;
    } else if (t === 'heart') this.lives++;
    else if (t === 'time') this.timeLeft += 6;
    else if (t === 'quiver') this.arrowsLeft += 3;
    this.say(d.name.toUpperCase(), null, d.color, 1.1);
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

  // ------------------------------------------------------------------ end of run
  end() {
    if (this.state !== 'playing') return;
    this.state = 'ending'; this.endT = 1.15; this.aim.active = false;
    this.say(this.mode === 'classic' ? "TIME'S UP!" : this.mode === 'survival' ? 'GAME OVER' : 'OUT OF ARROWS', null, '#fff6e0', 1.2);
    sfx('over'); buzz('heavy'); audio.setIntense(false);
  }

  finish() {
    this.state = 'over';
    const d = store.data, r = this.run, s = d.stats;
    const coins = Math.round(r.coins + this.score / 60);
    const prevBest = d.best[this.mode] || 0, isBest = this.score > prevBest && this.score > 0;
    if (isBest) d.best[this.mode] = this.score;
    d.coins += coins;
    s.games++; s.fruits += r.fruits; s.perfects += r.perfects; s.bosses += r.bosses; s.fevers += r.fevers;
    s.shots += r.shots; s.hits += r.hits; s.coinsEarned += coins;
    s.bestCombo = Math.max(s.bestCombo, this.maxCombo); s.bestSkewer = Math.max(s.bestSkewer, r.skewer);
    store.save();
    this.hooks.onGameOver({
      mode: this.mode, score: this.score, best: Math.max(prevBest, this.score), prevBest, isBest, coins,
      fruits: r.fruits, perfects: r.perfects, maxCombo: this.maxCombo, level: this.level, skewer: r.skewer,
      accuracy: r.shots ? Math.min(100, Math.round((r.hits / r.shots) * 100)) : 0,
    });
  }

  // ------------------------------------------------------------------ update
  frame(now) {
    requestAnimationFrame(this.frame);
    let dt = Math.min(0.034, (now - this.last) / 1000);
    this.last = now;
    if (dt <= 0) return;
    if (this.state !== 'paused') this.update(dt);
    this.draw();
    this.hooks.onFrame?.(this);
  }

  update(rdt) {
    this.bgFade = Math.min(1, this.bgFade + rdt / 1.4);
    this.comboPulse = Math.max(0, this.comboPulse - rdt * 5); this.scorePulse = Math.max(0, this.scorePulse - rdt * 5);
    this.flash = Math.max(0, this.flash - rdt * 1.6);
    this.shake = Math.max(0, this.shake - rdt * 46);
    if (this.announce && (this.announce.t += rdt) > this.announce.dur) this.announce = null;
    for (const c of this.clouds) { c.x += (c.v * rdt) / this.W; if (c.x > 1.25) { c.x = -0.25; c.y = rand(0.04, 0.42); } }
    if (this.hitstop > 0) { this.hitstop -= rdt; return; }
    if (this.slowmo > 0) this.slowmo -= rdt;
    let dt = rdt * (this.slowmo > 0 || this.state === 'ending' ? 0.35 : 1);
    if (this.state === 'over') dt = rdt * 0.5;
    this.time += dt;
    const playing = this.state === 'playing';
    this.cooldown -= dt; this.recoil = Math.max(0, (this.recoil || 0) - dt * 7);

    if (playing) {
      for (const k in this.effects) if (this.effects[k] > 0) this.effects[k] = Math.max(0, this.effects[k] - dt);
      if (this.feverTime > 0) {
        this.feverTime -= dt; this.fever = Math.max(0, this.feverTime / FEVER_TIME);
        if (this.feverTime <= 0) { this.fever = 0; audio.setIntense(false); }
      }
      if (this.mode === 'classic') {
        const before = Math.ceil(this.timeLeft);
        this.timeLeft -= dt;
        const after = Math.ceil(this.timeLeft);
        if (after < before && after <= 5 && after > 0) sfx('tick');
        if (this.timeLeft <= 0) { this.timeLeft = 0; this.end(); }
      }
      if (this.mode === 'precision' && this.arrowsLeft <= 0 && this.arrows.length === 0) this.end();
      if (this.bossQueue > 0 && (this.bossQueue -= dt) <= 0) this.spawnBoss();
      if ((this.orbT -= dt) <= 0) { this.spawnOrb(); this.orbT = rand(9, 14) / (1 + store.up('lucky') * 0.1); }
    }
    if (this.state === 'ending' && (this.endT -= rdt) <= 0) this.finish();

    // spawner
    if (playing || this.state === 'attract') {
      if ((this.spawnT -= dt) <= 0 && this.fruits.length < 12) {
        this.spawnWave();
        const L = this.level;
        const base = this.state === 'attract' ? 1.5 : Math.max(0.62, 1.55 - L * 0.085) * (this.boss ? 1.5 : 1) * (this.inFever ? 0.7 : 1);
        this.spawnT = base * rand(0.8, 1.2);
      }
    }
    // the menu shoots its own arrows so the title screen never sits still
    if (this.state === 'attract' && (this.autoT -= dt) <= 0) {
      this.autoT = rand(0.9, 1.8);
      const f = this.fruits.find(o => o.y < this.H * 0.6 && o.vy < 60 && o.kind !== 'bomb');
      if (f) {
        const tx = f.x + f.vx * 0.35, ty = f.y + f.vy * 0.35 - 30;
        this.idleAngle = clamp(Math.atan2(ty - this.by, tx - this.bx), -Math.PI + 0.2, -0.2);
        this.cooldown = 0; this.fire({ power: 0.95, angle: this.idleAngle });
      }
    }

    const fdt = dt * (this.effects.freeze > 0 ? 0.35 : 1);
    const { W, H } = this;

    for (const f of this.fruits) {
      f.vy += f.g * fdt; f.x += f.vx * fdt; f.y += f.vy * fdt; f.rot += f.vr * fdt;
      f.flash = Math.max(0, f.flash - dt * 5);
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

    if (this.boss) {
      const b = this.boss;
      b.t += fdt; b.life -= dt; b.flash = Math.max(0, b.flash - dt * 6);
      const ty = 262 + Math.sin(b.t * 1.3) * 30;
      b.y = b.life > 0 ? lerp(b.y, ty, Math.min(1, dt * 3)) : b.y - 260 * dt;
      b.x = W / 2 + Math.sin(b.t * 0.75) * (W / 2 - b.r - 6);
      if (playing && b.life > 0 && (b.bombT -= fdt) <= 0) {
        b.bombT = rand(2.2, 3.4);
        const f = this.makeFruit(this.inFever ? 'fruit' : 'bomb');
        f.x = b.x; f.y = b.y + 30; f.vx = rand(-90, 90); f.vy = -140; f.g = 300; f.seen = true;
        this.fruits.push(f);
      }
      if (b.life <= 0 && b.y < -140) { this.boss = null; if (this.live) this.say('HE ESCAPED!', null, '#ff8fa3', 1.2); }
    }

    // arrows
    const hitMul = 1 + store.up('tips') * 0.07;
    for (const a of this.arrows) {
      const px = a.x, py = a.y;
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
      a.vy += ARROW_G * dt; a.x += a.vx * dt; a.y += a.vy * dt;
      a.rot = Math.atan2(a.vy, a.vx);
      a.trail.push(a.x, a.y); if (a.trail.length > 16) a.trail.splice(0, 2);

      for (const f of this.fruits) {
        if (f.dead || a.dead || a.hit.includes(f)) continue;
        const d = segDist(f.x, f.y, px, py, a.x, a.y);
        if (d > f.r * hitMul + 3) continue;
        a.hit.push(f);
        if (f.kind === 'bomb') { a.dead = true; this.hitBomb(f); }
        else if (f.hp > 1) {
          f.hp--; f.flash = 1; f.vy -= 60; a.volley.hits++;
          this.juice(f.x, f.y, '#8a5a2b', 6, a.rot); this.snd('crack'); buzz('light');
          if (this.live) this.text(f.x, f.y - 40, 'CRACK!', '#f4ede0', 20);
        } else this.slice(f, a.rot, d < f.r * 0.36, a);
      }
      if (!a.dead && playing) {
        for (const o of this.orbs) {
          if (!o.dead && segDist(o.x, o.y, px, py, a.x, a.y) < o.r * hitMul + 6) this.collect(o, a);
        }
        if (this.boss && this.boss.life > 0 && segDist(this.boss.x, this.boss.y, px, py, a.x, a.y) < this.boss.r * 0.92) this.hitBoss(a);
      }
      if (a.x < -90 || a.x > W + 90 || a.y > H + 90 || a.y < -260) a.dead = true;
      if (a.dead) this.volleyDone(a.volley);
    }

    for (const p of this.pieces) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.spin += p.vs * dt; p.life += dt; if (p.y > H + 120) p.dead = true; }
    for (const p of this.particles) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if ((p.life += dt) > p.max) p.dead = true; }
    for (const t of this.texts) { t.y -= 46 * rdt; if ((t.life += rdt) > t.max) t.dead = true; }
    for (const r of this.rings) { if ((r.life += rdt) > 0.45) r.dead = true; }
    for (const d of this.decals) { if ((d.life -= rdt) <= 0) d.dead = true; }

    const alive = o => !o.dead;
    this.fruits = this.fruits.filter(alive); this.arrows = this.arrows.filter(alive); this.pieces = this.pieces.filter(alive);
    this.particles = this.particles.filter(alive); this.texts = this.texts.filter(alive); this.rings = this.rings.filter(alive);
    this.decals = this.decals.filter(alive); this.orbs = this.orbs.filter(alive);
  }

  // ------------------------------------------------------------------ render
  draw() {
    const c = this.ctx, { W, H } = this, k = this.scale * this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    if (this.bgFade < 1) { c.drawImage(this.bgPrev, 0, 0); c.globalAlpha = this.bgFade; }
    c.drawImage(this.bg, 0, 0);
    c.globalAlpha = 1;
    const sh = this.shake;
    c.setTransform(k, 0, 0, k, (Math.random() - 0.5) * sh * k, (Math.random() - 0.5) * sh * k);
    const th = THEMES[this.themeIndex];

    // clouds
    c.fillStyle = th.cloud;
    for (const cl of this.clouds) {
      const x = cl.x * W, y = cl.y * H, s = cl.s;
      c.beginPath();
      c.ellipse(x, y, 46 * s, 15 * s, 0, 0, TAU); c.ellipse(x - 20 * s, y - 9 * s, 22 * s, 15 * s, 0, 0, TAU); c.ellipse(x + 14 * s, y - 13 * s, 26 * s, 19 * s, 0, 0, TAU);
      c.fill();
    }

    // juice stains fading on the sky
    for (const d of this.decals) {
      c.globalAlpha = (d.life / d.max) * 0.3; c.fillStyle = d.color;
      c.beginPath();
      for (const [dx, dy, r] of d.blobs) { c.moveTo(d.x + dx + r, d.y + dy); c.arc(d.x + dx, d.y + dy, r, 0, TAU); }
      c.fill();
    }
    c.globalAlpha = 1;

    if (this.boss) this.drawBoss(c, this.boss);

    for (const o of this.orbs) {
      const pulse = 1 + Math.sin(o.t * 6) * 0.06, r = o.r * pulse;
      c.globalAlpha = 0.28; c.fillStyle = o.def.color; c.beginPath(); c.arc(o.x, o.y, r + 12, 0, TAU); c.fill();
      c.globalAlpha = 1; c.fillStyle = INK; c.beginPath(); c.arc(o.x, o.y, r, 0, TAU); c.fill();
      c.lineWidth = 4; c.strokeStyle = o.def.color; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.5; c.beginPath(); c.arc(o.x, o.y, r - 6, -2.4, -1.3); c.stroke();
      c.drawImage(o.img, o.x - 19, o.y - 19, 38, 38);
    }

    for (const f of this.fruits) {
      const s = f.r * 2.3;
      c.save(); c.translate(f.x, f.y); c.rotate(f.rot);
      if (f.kind === 'star' || f.kind === 'gem') {
        c.rotate(-f.rot);
        c.globalAlpha = 0.35 + Math.sin(this.time * 9) * 0.12; c.fillStyle = f.def.juice;
        c.beginPath(); c.arc(0, 0, f.r * 1.45, 0, TAU); c.fill(); c.globalAlpha = 1;
        c.rotate(f.rot * 0.4);
      } else if (f.kind === 'bomb') {
        c.rotate(-f.rot);
        c.globalAlpha = 0.25 + Math.sin(this.time * 12) * 0.15; c.fillStyle = '#ff2d55';
        c.beginPath(); c.arc(0, 0, f.r * 1.35, 0, TAU); c.fill(); c.globalAlpha = 1;
        c.rotate(Math.sin(f.rot) * 0.4);
      }
      c.drawImage(f.img, -s / 2, -s / 2, s, s);
      if (f.flash > 0) { c.globalAlpha = f.flash * 0.6; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, f.r, 0, TAU); c.fill(); c.globalAlpha = 1; }
      if (f.def.hp && f.hp < f.def.hp) {
        c.strokeStyle = '#3d2a1a'; c.lineWidth = 3; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(-f.r * 0.5, -f.r * 0.6); c.lineTo(-f.r * 0.05, -f.r * 0.15); c.lineTo(-f.r * 0.3, f.r * 0.15); c.lineTo(f.r * 0.25, f.r * 0.6); c.stroke();
      }
      c.restore();
    }

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

    const skin = this.skin || SKINS[0];
    for (const a of this.arrows) this.drawArrow(c, a, skin);

    for (const p of this.particles) {
      const t = 1 - p.life / p.max;
      c.globalAlpha = Math.min(1, t * 1.6); c.fillStyle = p.color;
      if (p.kind === 1) {
        const r = p.r * (0.4 + t);
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot + p.life * 6);
        c.beginPath(); c.moveTo(0, -r * 1.8); c.lineTo(r * 0.5, 0); c.lineTo(0, r * 1.8); c.lineTo(-r * 0.5, 0); c.closePath();
        c.moveTo(-r * 1.8, 0); c.lineTo(0, r * 0.5); c.lineTo(r * 1.8, 0); c.lineTo(0, -r * 0.5); c.closePath(); c.fill();
        c.restore();
      } else { c.beginPath(); c.arc(p.x, p.y, p.r * (0.35 + t * 0.65), 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;

    for (const r of this.rings) {
      if (r.life < 0) continue;
      const t = r.life / 0.45, e = 1 - Math.pow(1 - t, 3);
      c.globalAlpha = 1 - t; c.strokeStyle = r.color; c.lineWidth = r.w * (1 - t) + 1;
      c.beginPath(); c.arc(r.x, r.y, lerp(r.r, r.max, e), 0, TAU); c.stroke();
    }
    c.globalAlpha = 1;

    this.drawBow(c, skin);
    if (this.state === 'playing' && this.tutorial && !this.aim.active) this.drawTutorial(c);

    // floating score text
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const t of this.texts) {
      const p = t.life / t.max, sc = p < 0.14 ? easeOutBack(p / 0.14) : 1;
      c.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
      c.font = `${Math.round(t.size * sc)}px "Lilita One", sans-serif`;
      c.lineWidth = t.size * 0.24; c.strokeStyle = INK; c.strokeText(t.text, t.x, t.y);
      c.fillStyle = t.color; c.fillText(t.text, t.x, t.y);
    }
    c.globalAlpha = 1;

    if (this.announce && this.state !== 'attract') {
      const a = this.announce, inT = Math.min(1, a.t / 0.22), out = clamp((a.dur - a.t) / 0.25, 0, 1);
      const sc = easeOutBack(inT) * (0.9 + out * 0.1), y = H * 0.34;
      c.globalAlpha = out;
      c.save(); c.translate(W / 2, y); c.scale(sc, sc);
      let size = 52; c.font = `${size}px "Lilita One", sans-serif`;
      const w = c.measureText(a.text).width; if (w > W - 40) { size *= (W - 40) / w; c.font = `${size}px "Lilita One", sans-serif`; }
      c.lineWidth = 12; c.strokeStyle = INK; c.strokeText(a.text, 0, 0);
      c.fillStyle = a.color; c.fillText(a.text, 0, 0);
      if (a.sub) {
        c.font = '20px "Lilita One", sans-serif'; c.lineWidth = 6; c.strokeText(a.sub, 0, 40);
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
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgba(255,170,30,${a})`); g.addColorStop(0.18, 'rgba(255,170,30,0)'); g.addColorStop(0.8, 'rgba(255,90,30,0)'); g.addColorStop(1, `rgba(255,90,30,${a})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    if (this.flash > 0) { c.globalAlpha = Math.min(0.5, this.flash); c.fillStyle = this.flashColor; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  }

  drawArrow(c, a, skin) {
    const tr = a.trail;
    if (tr.length >= 4) {
      c.lineCap = 'round'; c.strokeStyle = a.fire ? '#ff8a1f' : skin.trail;
      for (let i = 2; i < tr.length; i += 2) {
        const t = i / tr.length;
        c.globalAlpha = t * 0.55; c.lineWidth = 1 + t * (a.fire ? 8 : 5);
        c.beginPath(); c.moveTo(tr[i - 2], tr[i - 1]); c.lineTo(tr[i], tr[i + 1]); c.stroke();
      }
      c.globalAlpha = 1;
    }
    c.save(); c.translate(a.x, a.y); c.rotate(a.rot);
    this.arrowShape(c, skin, a.fire);
    c.restore();
  }

  /** Arrow drawn with its tip at the origin, pointing along +x. */
  arrowShape(c, skin, fire) {
    c.lineCap = 'round';
    c.strokeStyle = '#4a2c12'; c.lineWidth = 6; c.beginPath(); c.moveTo(-ARROW_LEN, 0); c.lineTo(-10, 0); c.stroke();
    c.strokeStyle = '#f0d9a8'; c.lineWidth = 3; c.beginPath(); c.moveTo(-ARROW_LEN, 0); c.lineTo(-10, 0); c.stroke();
    c.fillStyle = skin.trail; c.strokeStyle = '#4a2c12'; c.lineWidth = 1.5; c.lineJoin = 'round';
    for (const s of [1, -1]) {
      c.beginPath(); c.moveTo(-ARROW_LEN + 2, 0); c.lineTo(-ARROW_LEN - 6, s * 8); c.lineTo(-ARROW_LEN + 14, s * 8); c.lineTo(-ARROW_LEN + 22, 0); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = fire ? '#ff8a1f' : '#e8eef5'; c.strokeStyle = '#3a4250'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(2, 0); c.lineTo(-16, -8); c.lineTo(-12, 0); c.lineTo(-16, 8); c.closePath(); c.fill(); c.stroke();
    if (fire) { c.globalAlpha = 0.4; c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(-6, 0, 12, 0, TAU); c.fill(); c.globalAlpha = 1; }
  }

  drawBow(c, skin) {
    const { bx, by, H } = this, a = this.aim, playing = this.state === 'playing';
    const angle = a.active ? a.angle : this.idleAngle;
    const pull = a.active ? a.power * 34 : -(this.recoil || 0) * 6;

    // stand
    c.fillStyle = '#3d2a1a'; c.beginPath(); c.roundRect(bx - 9, by, 18, H - by, 6); c.fill();
    c.fillStyle = skin.wood2; c.beginPath(); c.roundRect(bx - 6, by, 12, H - by, 5); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(bx, H - 50, 46, 10, 0, 0, TAU); c.fill();

    if (a.active && a.power > 0.03) this.drawGuide(c, angle, a.power, skin);

    c.save(); c.translate(bx, by); c.rotate(angle); c.scale(1.15, 1.15);
    const tipX = -8 - pull * 0.3, tipY = 58, nock = -8 - pull;
    // string
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(tipX, -tipY); c.lineTo(nock, 0); c.lineTo(tipX, tipY); c.stroke();
    // limbs
    const limb = () => { c.beginPath(); c.moveTo(tipX, -tipY); c.quadraticCurveTo(34, -34, 12, 0); c.quadraticCurveTo(34, 34, tipX, tipY); };
    c.lineCap = 'round';
    c.strokeStyle = '#2a1608'; c.lineWidth = 13; limb(); c.stroke();
    c.strokeStyle = skin.wood2; c.lineWidth = 9; limb(); c.stroke();
    c.strokeStyle = skin.wood; c.lineWidth = 5; limb(); c.stroke();
    c.strokeStyle = skin.grip; c.lineWidth = 12; c.beginPath(); c.moveTo(14, -11); c.lineTo(14, 11); c.stroke();
    // nocked arrow
    const canShoot = !playing || this.mode !== 'precision' || this.arrowsLeft > 0;
    if ((playing || this.state === 'attract') && this.cooldown <= 0.05 && canShoot) {
      c.translate(nock + ARROW_LEN, 0);
      this.arrowShape(c, skin, playing && this.effects.fire > 0);
    }
    c.restore();

    if (a.active) {
      // where the thumb started and how far it has pulled
      c.globalAlpha = 0.5; c.strokeStyle = '#fff'; c.lineWidth = 2; c.setLineDash([5, 6]);
      c.beginPath(); c.moveTo(a.sx, a.sy); c.lineTo(a.cx, a.cy); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(a.sx, a.sy, 13, 0, TAU); c.stroke();
      c.globalAlpha = 0.3; c.fillStyle = '#fff'; c.beginPath(); c.arc(a.cx, a.cy, 20, 0, TAU); c.fill();
      c.globalAlpha = 1;
      // power arc round the hub
      c.lineCap = 'round'; c.lineWidth = 6;
      c.strokeStyle = 'rgba(27,16,54,0.55)'; c.beginPath(); c.arc(bx, by, 72, Math.PI * 0.2, Math.PI * 0.8); c.stroke();
      c.strokeStyle = a.power >= 1 ? '#ffd23f' : a.power > 0.08 ? '#a6f06a' : '#ff8fa3';
      c.beginPath(); c.arc(bx, by, 72, Math.PI * 0.8 - a.power * Math.PI * 0.6, Math.PI * 0.8); c.stroke();
    }
  }

  drawGuide(c, angle, power, skin) {
    const speed = (640 + power * 760) * (1 + store.up('power') * 0.06);
    let x = this.bx + Math.cos(angle) * 30, y = this.by + Math.sin(angle) * 30;
    let vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
    const n = Math.round((7 + power * 6) * (1 + store.up('sight') * 0.25)), step = 0.034;
    for (let i = 0; i < n; i++) {
      vy += ARROW_G * step; x += vx * step; y += vy * step;
      if (i === 0) continue;
      const t = 1 - i / n, r = 2 + t * 3.4;
      c.globalAlpha = 0.35 + t * 0.5;
      c.fillStyle = INK; c.beginPath(); c.arc(x, y, r + 1.6, 0, TAU); c.fill();
      c.fillStyle = power > 0.08 ? '#fff' : '#ff8fa3'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }

  drawTutorial(c) {
    const { W, H } = this, t = (this.time % 2.2) / 2.2;
    const p = t < 0.15 ? 0 : t < 0.7 ? (t - 0.15) / 0.55 : 1, e = 1 - Math.pow(1 - p, 3);
    const sx = W / 2 + 30, sy = H * 0.56, x = sx - 50 * e, y = sy + 120 * e;
    c.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 0.9;
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.setLineDash([5, 6]);
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(sx, sy, 13, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(x, y, 24, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 12, 0, TAU); c.fill();
    c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.font = '22px "Lilita One", sans-serif'; c.lineWidth = 6; c.strokeStyle = INK;
    c.strokeText('DRAG DOWN ANYWHERE TO AIM', W / 2, H * 0.5); c.fillStyle = '#fff6e0'; c.fillText('DRAG DOWN ANYWHERE TO AIM', W / 2, H * 0.5);
  }

  drawBoss(c, b) {
    const s = b.r * 2.4, wob = Math.sin(b.t * 5) * 0.08;
    c.save(); c.translate(b.x, b.y); c.rotate(wob);
    c.globalAlpha = 0.25; c.fillStyle = '#ff8a1f'; c.beginPath(); c.arc(0, 0, b.r * 1.3 + Math.sin(b.t * 7) * 5, 0, TAU); c.fill(); c.globalAlpha = 1;
    const sq = 1 + b.flash * 0.1;
    c.scale(sq, 2 - sq);
    c.drawImage(b.img, -s / 2, -s / 2, s, s);
    c.drawImage(this.img.crown, -30, -b.r - 34, 60, 60);
    if (b.flash > 0) { c.globalAlpha = b.flash * 0.55; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, b.r, 0, TAU); c.fill(); }
    c.restore(); c.globalAlpha = 1;
  }
}
