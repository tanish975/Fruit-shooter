// Fruit Archer — boot, screens and HUD.
import '@fontsource/lilita-one';
import '@fontsource-variable/nunito';
import './style.css';
import { animate, stagger } from 'animejs';
import { Game } from './game.js';
import { store } from './store.js';
import { audio, sfx } from './audio.js';
import { buzz, onBack, onAppPause, exitApp, isNative } from './platform.js';
import { MODES, UPGRADES, upgradeCost, SKINS, MISSIONS, DAILY, POWERUPS } from './data.js';
import { version } from '../package.json';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Math.round(n).toLocaleString('en-US');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- assets
const urls = import.meta.glob('./assets/emoji/*.png', { eager: true, query: '?url', import: 'default' });
const ICON = {};
for (const p in urls) ICON[p.split('/').pop().replace('.png', '')] = urls[p];
const icon = (name, cls = '') => `<img class="${cls}" src="${ICON[name]}" alt="" draggable="false" />`;

function loadImages() {
  const out = {};
  return Promise.all(Object.entries(ICON).map(([name, src]) => new Promise(res => {
    const im = new Image();
    im.onload = im.onerror = () => res();
    im.src = src; out[name] = im;
  }))).then(() => out);
}

// ---------------------------------------------------------------- state
store.load();
const d = () => store.data;
let game = null;
let current = 'home';
let selectedMode = MODES[d().lastMode] ? d().lastMode : 'classic';
let shopTab = 'upgrades';

// ---------------------------------------------------------------- screens
const SCREENS = ['home', 'shop', 'missions', 'stats', 'settings', 'pause', 'over', 'dialog'];

function show(id) {
  for (const s of SCREENS) $('#' + s).hidden = s !== id;
  current = id;
  $('#hud').hidden = !(id === 'play' || id === 'pause');
  if (id === 'play') return;
  const el = $('#' + id);
  render(id);
  const items = el.querySelectorAll('.rise');
  if (reduceMotion) return;
  animate(items, { opacity: [0, 1], translateY: [18, 0], duration: 380, delay: stagger(45), ease: 'outQuint' });
  if (el.classList.contains('modal')) animate(el.querySelector('.panel'), { scale: [0.94, 1], opacity: [0, 1], duration: 260, ease: 'outQuint' });
}

function render(id) {
  refreshCoins();
  if (id === 'home') renderHome();
  if (id === 'shop') renderShop();
  if (id === 'missions') renderMissions();
  if (id === 'stats') renderStats();
  if (id === 'settings') renderToggles($('#toggles'));
  if (id === 'pause') renderToggles($('#pauseToggles'));
}

function refreshCoins(from) {
  const els = $$('.coinCount'), to = d().coins;
  if (from == null || reduceMotion) { els.forEach(e => (e.textContent = fmt(to))); return; }
  const o = { v: from };
  animate(o, { v: to, duration: 600, ease: 'outQuart', onUpdate: () => els.forEach(e => (e.textContent = fmt(o.v))) });
}

function pop(el) { if (!reduceMotion && el) animate(el, { scale: [1.18, 1], duration: 320, ease: 'outBack' }); }

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.innerHTML = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

// ---------------------------------------------------------------- home
function claimable() {
  return MISSIONS.filter(m => !d().claimed[m.id] && m.get(d().stats, d().best) >= m.goal).length;
}

function renderHome() {
  $('#modes').innerHTML = Object.values(MODES).map(m => `
    <button class="mode ${m.id === selectedMode ? 'on' : ''}" data-mode="${m.id}" style="--accent:${m.accent}">
      ${icon(m.icon)}
      <strong>${m.name}</strong>
      <small>${d().best[m.id] ? 'Best ' + fmt(d().best[m.id]) : m.tag}</small>
    </button>`).join('');
  $('#modeDesc').textContent = MODES[selectedMode].desc;
  const n = claimable(), b = $('#missionBadge');
  b.hidden = !n; b.textContent = n;
}

function startGame(mode) {
  selectedMode = mode; d().lastMode = mode; store.save();
  audio.unlock();
  hud.reset(mode);
  game.start(mode);
  show('play');
}

// ---------------------------------------------------------------- shop
function renderShop() {
  $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === shopTab));
  const coins = d().coins;
  if (shopTab === 'upgrades') {
    $('#shopList').innerHTML = UPGRADES.map(u => {
      const lvl = store.up(u.id), maxed = lvl >= u.max, cost = upgradeCost(u, lvl);
      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      return `<div class="card item rise">
        ${icon(u.icon, 'item-ico')}
        <div class="item-info"><strong>${u.name}</strong><small>${u.desc}</small><div class="pips">${pips}<span>${u.unit}</span></div></div>
        <button class="btn btn-buy ${maxed ? 'maxed' : coins < cost ? 'poor' : ''}" data-buy="${u.id}" ${maxed ? 'disabled' : ''}>
          ${maxed ? 'MAX' : icon('coin') + fmt(cost)}</button>
      </div>`;
    }).join('');
  } else {
    $('#shopList').innerHTML = SKINS.map(s => {
      const owned = d().skins.owned.includes(s.id), eq = d().skins.equipped === s.id;
      return `<div class="card item rise ${eq ? 'equipped' : ''}">
        <svg class="bow-prev" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M40 6 Q14 20 30 32 Q14 44 40 58" fill="none" stroke="${s.wood2}" stroke-width="8" stroke-linecap="round"/>
          <path d="M40 6 Q14 20 30 32 Q14 44 40 58" fill="none" stroke="${s.wood}" stroke-width="4" stroke-linecap="round"/>
          <path d="M40 6 L40 58" stroke="#fff" stroke-width="1.5" opacity=".8"/>
          <path d="M8 32 H52" stroke="${s.trail}" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M4 32 l8 -6 v12 z" fill="#e8eef5"/>
        </svg>
        <div class="item-info"><strong>${s.name}</strong><small>${eq ? 'Equipped' : owned ? 'Owned' : 'Bow and arrow-trail skin'}</small></div>
        <button class="btn btn-buy ${eq ? 'maxed' : !owned && coins < s.cost ? 'poor' : owned ? 'own' : ''}" data-skin="${s.id}" ${eq ? 'disabled' : ''}>
          ${eq ? 'IN USE' : owned ? 'EQUIP' : icon('coin') + fmt(s.cost)}</button>
      </div>`;
    }).join('');
  }
}

function buyUpgrade(id, btn) {
  const u = UPGRADES.find(x => x.id === id), lvl = store.up(id), cost = upgradeCost(u, lvl);
  if (lvl >= u.max) return;
  if (d().coins < cost) return deny(btn, cost);
  const before = d().coins;
  d().coins -= cost; d().upgrades[id] = lvl + 1; store.save();
  sfx('buy'); buzz('success');
  renderShop(); refreshCoins(before);
  pop($(`[data-buy="${id}"]`)?.closest('.item'));
}

function buySkin(id, btn) {
  const s = SKINS.find(x => x.id === id), sk = d().skins;
  if (!sk.owned.includes(id)) {
    if (d().coins < s.cost) return deny(btn, s.cost);
    const before = d().coins;
    d().coins -= s.cost; sk.owned.push(id); sfx('buy'); buzz('success');
    sk.equipped = id; store.save(); renderShop(); refreshCoins(before);
  } else { sk.equipped = id; store.save(); sfx('click'); renderShop(); }
  pop($(`[data-skin="${id}"]`)?.closest('.item'));
}

function deny(btn, cost) {
  sfx('deny'); buzz('error');
  toast(`${icon('coin')} You need ${fmt(cost - d().coins)} more coins`);
  if (!reduceMotion) animate(btn, { translateX: [0, -6, 6, -4, 4, 0], duration: 320, ease: 'linear' });
}

// ---------------------------------------------------------------- missions
function renderMissions() {
  const list = MISSIONS.map(m => {
    const prog = Math.min(m.goal, m.get(d().stats, d().best)), done = prog >= m.goal, claimed = !!d().claimed[m.id];
    return { m, prog, done, claimed, order: claimed ? 2 : done ? 0 : 1 };
  }).sort((a, b) => a.order - b.order);
  $('#missionList').innerHTML = list.map(({ m, prog, done, claimed }) => `
    <div class="card item rise ${claimed ? 'claimed' : ''}">
      ${icon(m.icon, 'item-ico')}
      <div class="item-info"><strong>${m.name}</strong><small>${m.desc}</small>
        <div class="bar"><div style="width:${(prog / m.goal) * 100}%"></div><span>${fmt(prog)} / ${fmt(m.goal)}</span></div></div>
      ${claimed ? '<span class="tick">DONE</span>'
        : `<button class="btn btn-buy ${done ? 'claim' : 'locked'}" data-claim="${m.id}" ${done ? '' : 'disabled'}>${icon('coin')}${fmt(m.reward)}</button>`}
    </div>`).join('');
}

function claimMission(id) {
  const m = MISSIONS.find(x => x.id === id);
  if (d().claimed[id] || m.get(d().stats, d().best) < m.goal) return;
  const before = d().coins;
  d().claimed[id] = true; d().coins += m.reward; store.save();
  sfx('coin'); sfx('buy'); buzz('success');
  renderMissions(); refreshCoins(before);
  toast(`${icon('coin')} +${fmt(m.reward)} coins`);
}

// ---------------------------------------------------------------- stats
function renderStats() {
  const s = d().stats, b = d().best;
  const acc = s.shots ? Math.min(100, Math.round((s.hits / s.shots) * 100)) + '%' : '-';
  const bests = Object.values(MODES).map(m => `<div class="stat">${icon(m.icon)}<b>${fmt(b[m.id] || 0)}</b><span>${m.name}</span></div>`).join('');
  const rows = [
    ['Games played', fmt(s.games)], ['Fruit hit', fmt(s.fruits)], ['Perfect hits', fmt(s.perfects)], ['Accuracy', acc],
    ['Best combo', fmt(s.bestCombo)], ['Biggest skewer', s.bestSkewer ? 'x' + s.bestSkewer : '-'],
    ['Bosses smashed', fmt(s.bosses)], ['Fevers', fmt(s.fevers)], ['Coins earned', fmt(s.coinsEarned)],
  ].map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');
  $('#statList').innerHTML = `<div class="card rise"><h3>High scores</h3><div class="stats3">${bests}</div></div><div class="card rise"><h3>Lifetime</h3>${rows}</div>`;
}

// ---------------------------------------------------------------- settings
const TOGGLES = [['sfx', 'Sound effects'], ['music', 'Music'], ['haptics', 'Vibration']];
function renderToggles(el) {
  el.innerHTML = TOGGLES.map(([k, label]) => `
    <button class="toggle ${d().settings[k] ? 'on' : ''}" data-toggle="${k}" role="switch" aria-checked="${d().settings[k]}">
      <span>${label}</span><i></i></button>`).join('');
}

function dialog(html, wire) {
  $('#dialogPanel').innerHTML = html;
  const prev = current;
  show('dialog');
  wire($('#dialogPanel'), () => show(prev === 'dialog' ? 'home' : prev));
}

function confirmReset() {
  dialog(`<h2 class="rise">Reset progress?</h2><p class="rise dim">Coins, upgrades, bows, missions and high scores will be erased. This can't be undone.</p>
    <div class="row rise"><button class="btn btn-ghost" data-x="no">Cancel</button><button class="btn btn-danger" data-x="yes">Erase</button></div>`,
  (p, close) => {
    p.querySelector('[data-x=no]').onclick = () => { sfx('back'); close(); };
    p.querySelector('[data-x=yes]').onclick = () => { store.reset(); sfx('deny'); show('home'); toast('Progress reset'); };
  });
}

// ---------------------------------------------------------------- daily bonus
const dayKey = t => { const x = new Date(t); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
function checkDaily() {
  const today = dayKey(Date.now()), daily = d().daily;
  if (daily.last === today) return false;
  const streak = daily.last === dayKey(Date.now() - 864e5) ? (daily.streak % 7) + 1 : 1;
  const reward = DAILY[streak - 1];
  const days = DAILY.map((v, i) => `<div class="day ${i + 1 < streak ? 'past' : i + 1 === streak ? 'now' : ''}"><small>Day ${i + 1}</small>${icon('coin')}<b>${v}</b></div>`).join('');
  dialog(`<h2 class="rise">Daily bonus</h2><p class="rise dim">Come back every day to grow the reward.</p>
    <div class="days rise">${days}</div><button class="btn btn-play rise" data-x="ok">CLAIM ${reward}</button>`,
  (p, close) => {
    p.querySelector('[data-x=ok]').onclick = () => {
      audio.unlock();
      const before = d().coins;
      daily.last = today; daily.streak = streak; d().coins += reward; store.save();
      sfx('buy'); buzz('success'); show('home'); refreshCoins(before);
    };
  });
  return true;
}

// ---------------------------------------------------------------- HUD
const hud = {
  cache: {},
  set(key, value, fn) { if (this.cache[key] !== value) { this.cache[key] = value; fn(value); } },
  reset(mode) {
    this.cache = {};
    $('#hudStatIcon').src = ICON[mode === 'classic' ? 'stopwatch' : mode === 'survival' ? 'heart' : 'bow'];
    $('#bossIcon').src = ICON.pumpkin;
    $('#chips').innerHTML = '';
    this.chips = {};
  },
  update(g) {
    if (g.state === 'attract') return;
    this.set('score', g.score, v => { $('#hudScore').textContent = fmt(v); });
    if (g.scorePulse > 0.9) pulse($('#hudScore'), 1.14);
    const m = g.mode;
    const stat = m === 'classic' ? Math.ceil(g.timeLeft) : m === 'survival' ? g.lives : g.arrowsLeft;
    this.set('stat', stat, v => {
      const prev = this.prevStat; this.prevStat = v;
      $('#hudStatVal').textContent = m === 'classic' ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : v;
      $('#hudStat').classList.toggle('danger', m === 'classic' ? v <= 10 : m === 'survival' ? v <= 1 : v <= 3);
      if (prev != null && (m !== 'classic' || v > prev + 1 || v <= 10)) pulse($('#hudStat'), 1.16);
    });
    this.set('combo', g.combo, v => {
      $('#hudCombo').classList.toggle('on', v >= 2);
      $('#hudComboN').textContent = v;
      $('#hudComboX').textContent = 'x' + g.comboMult;
      if (v >= 2) pulse($('#hudCombo'), 1.22);
    });
    this.set('fever', Math.round(g.fever * 100), v => { $('#feverFill').style.transform = `scaleX(${v / 100})`; });
    this.set('inFever', g.inFever, v => $('#feverWrap').classList.toggle('on', v));
    this.set('level', g.level, v => { $('#hudLevel').textContent = 'LEVEL ' + v; });
    this.set('boss', !!g.boss, v => { $('#bossBar').hidden = !v; });
    if (g.boss) this.set('bossHp', g.boss.hp, v => { $('#bossFill').style.transform = `scaleX(${Math.max(0, v / g.boss.max)})`; });
    for (const k in g.effects) {
      const left = g.effects[k];
      let chip = this.chips[k];
      if (left > 0 && !chip) {
        chip = this.chips[k] = document.createElement('div');
        chip.className = 'chip'; chip.style.setProperty('--c', POWERUPS[k].color);
        chip.innerHTML = `<img src="${ICON[POWERUPS[k].icon]}" alt="" />`;
        $('#chips').appendChild(chip);
        if (!reduceMotion) animate(chip, { scale: [0.5, 1], opacity: [0, 1], duration: 260, ease: 'outBack' });
      }
      if (chip) {
        if (left <= 0) { chip.remove(); delete this.chips[k]; }
        else chip.style.setProperty('--p', Math.round((left / g.effectMax[k]) * 100) + '%');
      }
    }
  },
};

const pulsing = new WeakMap();
function pulse(el, s) {
  if (reduceMotion) return;
  const now = performance.now();
  if (now - (pulsing.get(el) || 0) < 90) return;
  pulsing.set(el, now);
  animate(el, { scale: [s, 1], duration: 260, ease: 'outQuart' });
}

// ---------------------------------------------------------------- game over
function onGameOver(r) {
  const m = MODES[r.mode];
  $('#overMode').textContent = m.name;
  $('#bestRibbon').hidden = !r.isBest;
  $('#overBest').textContent = r.isBest ? `Previous best ${fmt(r.prevBest)}` : `Best ${fmt(r.best)}`;
  $('#overGrid').innerHTML = [
    ['apple', r.fruits, 'Fruit'], ['target', r.accuracy + '%', 'Accuracy'], ['fire', r.maxCombo, 'Max combo'], ['star', r.perfects, 'Perfects'],
  ].map(([i, v, l]) => `<div class="stat">${icon(i)}<b>${v}</b><span>${l}</span></div>`).join('');
  const n = claimable(), note = $('#overNote');
  note.hidden = !n; note.innerHTML = n ? `${icon('trophy')} ${n} mission reward${n > 1 ? 's' : ''} ready to claim` : '';
  $('#overScore').textContent = '0'; $('#overCoins').textContent = '+0';
  show('over');
  if (r.isBest) { sfx('best'); buzz('success'); if (!reduceMotion) animate('#bestRibbon', { scale: [0, 1], rotate: [-18, -6], duration: 520, delay: 380, ease: 'outBack' }); }
  const o = { s: 0, c: 0 };
  animate(o, {
    s: r.score, c: r.coins, duration: reduceMotion ? 1 : 1000, delay: 200, ease: 'outExpo',
    onUpdate: () => { $('#overScore').textContent = fmt(o.s); $('#overCoins').textContent = '+' + fmt(o.c); },
    onComplete: () => { pop($('#overScore')); sfx('coin'); },
  });
}

// ---------------------------------------------------------------- events
function goBack() {
  if (current === 'play') { game.pause(); sfx('click'); show('pause'); }
  else if (current === 'pause') { resume(); }
  else if (current === 'home') exitApp();
  else if (current === 'dialog') return;
  else { if (current === 'over') game.toMenu(); sfx('back'); show('home'); }
}
function resume() { sfx('click'); show('play'); game.resume(); }

document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  audio.unlock();
  const ds = t.dataset;
  if (ds.go) { sfx(ds.go === 'home' ? 'back' : 'click'); if (current === 'over') game.toMenu(); show(ds.go); }
  else if (ds.mode) { selectedMode = ds.mode; sfx('click'); buzz('light'); renderHome(); pop($(`[data-mode="${ds.mode}"]`)); }
  else if (ds.tab) { shopTab = ds.tab; sfx('click'); renderShop(); if (!reduceMotion) animate('#shopList .rise', { opacity: [0, 1], translateY: [12, 0], duration: 300, delay: stagger(35), ease: 'outQuint' }); }
  else if (ds.buy) buyUpgrade(ds.buy, t);
  else if (ds.skin) buySkin(ds.skin, t);
  else if (ds.claim) claimMission(ds.claim);
  else if (ds.toggle) {
    const s = d().settings; s[ds.toggle] = !s[ds.toggle]; store.save();
    t.classList.toggle('on', s[ds.toggle]); t.setAttribute('aria-checked', s[ds.toggle]);
    audio.syncMusic(); sfx('click'); if (ds.toggle === 'haptics') buzz('medium');
  }
});

$('#playBtn').onclick = () => { sfx('click'); buzz('medium'); startGame(selectedMode); };
$('#pauseBtn').onclick = () => { if (current === 'play') goBack(); };
$('#resumeBtn').onclick = resume;
$('#restartBtn').onclick = () => { sfx('click'); startGame(game.mode); };
$('#quitBtn').onclick = () => { sfx('back'); game.toMenu(); show('home'); };
$('#againBtn').onclick = () => { sfx('click'); buzz('medium'); startGame(game.mode); };
$('#overShop').onclick = () => { sfx('click'); game.toMenu(); show('shop'); };
$('#overHome').onclick = () => { sfx('back'); game.toMenu(); show('home'); };
$('#resetBtn').onclick = () => { sfx('click'); confirmReset(); };

onBack(goBack);
onAppPause(() => {
  if (current === 'play' && game.state === 'playing') { game.pause(); show('pause'); }
  if (document.hidden) audio.suspend();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) audio.resume(); });
window.addEventListener('resize', () => game && game.resize());
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

// ---------------------------------------------------------------- boot
$('#ver').textContent = version;
$$('img[data-icon]').forEach(i => { i.src = ICON[i.dataset.icon]; i.draggable = false; });

Promise.all([
  loadImages(),
  document.fonts.load('40px "Lilita One"').catch(() => {}),
]).then(([images]) => {
  game = new Game($('#game'), images, { onGameOver, onFrame: g => hud.update(g) });
  game.toMenu();
  show('home');
  checkDaily();
  document.body.classList.add('ready');
  if (isNative) import('@capacitor/splash-screen').then(m => m.SplashScreen.hide()).catch(() => {});
  if (import.meta.env.DEV) window.__game = game;
});
