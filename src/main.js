// Fruit Archer — boot, screens, HUD and all menu logic.
import '@fontsource/lilita-one';
import '@fontsource-variable/fredoka';
import './style.css';
import { animate, stagger } from 'animejs';
import { Game } from './game.js';
import { store } from './store.js';
import { audio, sfx } from './audio.js';
import { buzz, onBack, onAppPause, exitApp, isNative } from './platform.js';
import { MODES, UPGRADES, upgradeCost, SKINS, MISSIONS, DAILY, POWERUPS, ARROWS, BOSSES, WORLDS, STAGES, WEEKLY, SEASON, THEMES, DIFFS, diffById, stageById, ENDLESS_NAME } from './data.js';
import { t } from './i18n.js';
import { dayKey, ensurePeriods, weeklyList, totalStars, stageUnlocked, weekDaysLeft, seasonDaysLeft } from './meta.js';
import { version } from '../package.json';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Math.round(n).toLocaleString('en-US');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------- assets
const urls = import.meta.glob('./assets/emoji/*.png', { eager: true, query: '?url', import: 'default' });
const ICON = {};
for (const p in urls) ICON[p.split('/').pop().replace('.png', '')] = urls[p];
const icon = (name, cls = '') => `<img class="${cls}" src="${ICON[name] || ICON.star}" alt="" draggable="false" />`;
let IMAGES = {};

function loadImages(onProgress) {
  const out = {}, all = Object.entries(ICON);
  let done = 0;
  return Promise.all(all.map(([name, src]) => new Promise(res => {
    const im = new Image();
    im.onload = im.onerror = () => { onProgress(++done / all.length); res(); };
    im.src = src; out[name] = im;
  }))).then(() => out);
}

// ---------------------------------------------------------------- state
store.load();
ensurePeriods();
const d = () => store.data;
let game = null;
let current = 'home';
let selectedMode = MODES[d().lastMode] ? d().lastMode : 'stage';
let shopTab = 'upgrades';
let missionTab = 'weekly';
let lastResult = null;
let busy = false; // a screen wipe is running

const dailyPlayed = () => d().daily.chDate === dayKey();
const diff = () => diffById(d().settings.diff);
const worldName = st => (st.endless ? ENDLESS_NAME : WORLDS[st.world].name);
const endlessCleared = () => Object.keys(d().stages).filter(id => +id > STAGES.length && d().stages[id] > 0).length;

// ---------------------------------------------------------------- i18n
function applyI18n() {
  $$('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
}

// ---------------------------------------------------------------- screens
const SCREENS = ['home', 'map', 'shop', 'missions', 'stats', 'settings', 'pause', 'over', 'dialog'];

function show(id, opts = {}) {
  const from = current;
  for (const s of SCREENS) $('#' + s).hidden = s !== id;
  current = id;
  const inGame = id === 'play' || id === 'pause' || (id === 'dialog' && game && game.state === 'offer');
  const hudEl = $('#hud');
  if (hudEl.hidden && inGame && !reduceMotion) {
    hudEl.hidden = false;
    animate('#hud .hud-top > *', { opacity: [0, 1], translateY: [-30, 0], duration: 420, delay: stagger(60), ease: 'outBack' });
  }
  hudEl.hidden = !inGame;
  if (id === 'play') return;
  const el = $('#' + id);
  render(id);
  if (reduceMotion || opts.quiet) return;
  const items = el.querySelectorAll('.rise');
  animate(items, { opacity: [0, 1], translateY: [22, 0], duration: 420, delay: stagger(Math.min(45, 500 / Math.max(1, items.length))), ease: 'outQuint' });
  if (el.classList.contains('modal')) {
    animate(el, { opacity: [0, 1], duration: 200, ease: 'outQuad' });
    animate(el.querySelector('.panel'), { scale: [0.86, 1], translateY: [30, 0], duration: 460, ease: 'outBack' });
  } else if (el.classList.contains('sheet')) {
    const back = from !== 'home' && id !== 'home';
    animate(el, { opacity: [0, 1], translateY: back ? [0, 0] : ['6%', '0%'], duration: 320, ease: 'outQuint' });
    animate(el.querySelector('.topbar'), { translateY: [-24, 0], opacity: [0, 1], duration: 380, ease: 'outQuint' });
  } else if (id === 'home') {
    animate('#home .topbar > *', { opacity: [0, 1], translateY: [-20, 0], duration: 380, delay: stagger(50), ease: 'outQuint' });
    if (from !== 'home' && from !== 'dialog') logoIn();
  }
}

function render(id) {
  refreshCoins();
  if (id === 'home') renderHome();
  if (id === 'map') renderMap();
  if (id === 'shop') renderShop();
  if (id === 'missions') renderMissions();
  if (id === 'stats') renderStats();
  if (id === 'settings') renderSettings();
  if (id === 'pause') renderPause();
}

/** Circular wipe: cover the screen, run `mid`, uncover. Used between menus and play. */
async function wipe(mid) {
  if (reduceMotion) return mid();
  if (busy) return;
  busy = true;
  const w = $('#wipe');
  w.classList.add('on');
  sfx('whoosh');
  await animate(w, { scale: [0, 1], duration: 300, ease: 'inQuad' }).then();
  try { mid(); } finally {
    await sleep(60);
    await animate(w, { scale: [1, 0], duration: 380, ease: 'outQuad' }).then();
    w.classList.remove('on');
    busy = false;
  }
}

function buildLogo() {
  $$('#logo span').forEach(s => { s.innerHTML = [...s.textContent].map(c => `<b>${c}</b>`).join(''); });
}
function logoIn() {
  if (reduceMotion) return;
  animate('#logo b', { translateY: [-60, 0], rotate: [() => (Math.random() - 0.5) * 50, 0], opacity: [0, 1], duration: 700, delay: stagger(45), ease: 'outElastic(1, .6)' });
}

function refreshCoins(from) {
  const els = $$('.coinCount'), to = d().coins;
  if (from == null || reduceMotion) { els.forEach(e => (e.textContent = fmt(to))); return; }
  const o = { v: from };
  animate(o, { v: to, duration: 700, ease: 'outQuart', onUpdate: () => els.forEach(e => (e.textContent = fmt(o.v))) });
  $$('.pill.coins').forEach(p => { if (p.offsetParent) pop(p); });
}

function pop(el) { if (!reduceMotion && el) animate(el, { scale: [1.18, 1], duration: 360, ease: 'outBack' }); }

/** Burst of coins flying from an element to the coin counter. */
function coinFly(fromEl, n = 8) {
  if (reduceMotion || !fromEl) return;
  const target = $$('.pill.coins img').find(e => e.offsetParent);
  const a = fromEl.getBoundingClientRect();
  const b = target ? target.getBoundingClientRect() : { left: innerWidth / 2, top: 20, width: 0, height: 0 };
  const fx = $('#fx');
  for (let i = 0; i < n; i++) {
    const c = document.createElement('img');
    c.src = ICON.coin; c.className = 'fly';
    fx.appendChild(c);
    const sx = a.left + a.width / 2 - 13, sy = a.top + a.height / 2 - 13;
    const mx = sx + (Math.random() - 0.5) * 140, my = sy + (Math.random() - 0.5) * 90 - 30;
    animate(c, {
      translateX: [sx, mx, b.left + b.width / 2 - 13], translateY: [sy, my, b.top + b.height / 2 - 13],
      scale: [0.4, 1.1, 0.6], opacity: [1, 1, 0.9], duration: 620 + i * 35, delay: i * 28, ease: 'inOutQuad',
      onComplete: () => { c.remove(); if (i % 3 === 0) sfx('coin'); },
    });
  }
}

let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  el.innerHTML = msg; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2400);
}

// ---------------------------------------------------------------- home
const careerReady = () => MISSIONS.filter(m => !d().claimed[m.id] && m.get(d().stats, d().best) >= m.goal).length;
const weeklyReady = () => weeklyList().filter(w => !d().weekly.claimed[w.id] && (d().weekly.prog[w.id] || 0) >= w.goal).length;
const claimable = () => careerReady() + weeklyReady();

function modeTag(id) {
  if (id === 'stage') return t('tag_stage', { n: totalStars() });
  if (id === 'daily') return dailyPlayed() ? t('tag_dailyDone', { n: fmt(d().daily.chScore) }) : t('tag_daily');
  return d().best[id] ? t('best', { n: fmt(d().best[id]) }) : t('tag_' + id);
}

function renderHome() {
  $('#modes').innerHTML = Object.values(MODES).map(m => `
    <button class="mode ${m.id === selectedMode ? 'on' : ''} ${m.id === 'stage' || m.id === 'daily' ? 'wide' : ''} ${m.id === 'daily' && dailyPlayed() ? 'spent' : ''}" data-mode="${m.id}" style="--accent:${m.accent}">
      ${icon(m.icon)}
      <span><strong>${t('mode_' + m.id)}</strong><small>${modeTag(m.id)}</small></span>
    </button>`).join('');
  $('#modeDesc').textContent = selectedMode === 'daily' && dailyPlayed() ? t('dailyDone', { n: fmt(d().daily.chScore) }) : t('d_' + selectedMode);
  const n = claimable(), b = $('#missionBadge');
  b.hidden = !n; b.textContent = n;
  const s = d().season;
  const df = diff();
  $('#diffChip').style.setProperty('--c', df.color); $('#diffChipName').textContent = df.name;
  $('#seasonChip').textContent = s.tier;
  $('#seasonChipBar').style.transform = `scaleX(${s.tier >= SEASON.tiers ? 1 : (s.xp % SEASON.xpPerTier) / SEASON.xpPerTier})`;
}

function startGame(mode, stage = null) {
  if (busy) return;
  if (mode === 'daily' && dailyPlayed()) { sfx('deny'); toast(t('dailyDone', { n: fmt(d().daily.chScore) })); return; }
  if (mode !== 'tutorial') { selectedMode = mode; d().lastMode = mode; store.save(); }
  audio.unlock();
  wipe(() => {
    hud.reset(mode, stage);
    game.start(mode, stage);
    show('play');
  });
}

function pressPlay() {
  sfx('click'); buzz('medium');
  if (selectedMode === 'stage') return show('map');
  startGame(selectedMode);
}

// ---------------------------------------------------------------- adventure map
const starRow = (n, cls = '') => `<span class="stars ${cls}">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}">${icon('star')}</i>`).join('')}</span>`;

function worldCard(wi, name, small, stages, got, open, next) {
  return `<div class="card world rise w${wi} ${open ? '' : 'shut'}">
    <div class="world-head"><div><small>${small}</small><h3>${name}</h3></div>
      <div class="pill small">${icon('star')}<span>${got}</span></div></div>
    <div class="nodes">${stages.map(s => {
      const un = stageUnlocked(s.id), st = d().stages[s.id] || 0;
      return `<button class="node ${un ? '' : 'locked'} ${s.boss >= 0 ? 'boss' : ''} ${next && next.id === s.id ? 'next' : ''}" data-stage="${s.id}">
        ${s.boss >= 0 ? icon(BOSSES[s.boss].img, 'node-boss') : `<b>${s.id}</b>`}
        ${un ? starRow(st, 'mini') : '<span class="padlock"></span>'}
      </button>`;
    }).join('')}</div>
  </div>`;
}

function renderMap() {
  $('#mapStars').textContent = `${totalStars()}/120`;
  let nextId = 1;
  while (d().stages[nextId] > 0) nextId++;
  const next = stageById(nextId);
  let html = WORLDS.map((w, wi) => {
    const stages = STAGES.filter(s => s.world === wi);
    const got = stages.reduce((n, s) => n + (d().stages[s.id] || 0), 0);
    return worldCard(wi, w.name, t('world', { n: wi + 1 }), stages, `${got}/30`, stageUnlocked(stages[0].id), next);
  }).join('');
  // Endless Peaks: ten generated stages at a time, forever
  const first = STAGES.length + 1 + Math.floor(Math.max(0, nextId - STAGES.length - 1) / 10) * 10;
  const endless = Array.from({ length: 10 }, (_, i) => stageById(first + i));
  html += worldCard(4, ENDLESS_NAME, t('endlessText', { n: endlessCleared() }), endless, endlessCleared(), stageUnlocked(STAGES.length + 1), next);
  $('#mapList').innerHTML = html;
  requestAnimationFrame(() => $('.node.next')?.scrollIntoView({ block: 'center' }));
}

function limitText(s) { const df = diff(); return s.time ? t('lim_time', { n: Math.round(s.time * df.time) + store.up('head') * 5 }) : t('lim_arrows', { n: Math.round(s.arrows * df.arrows) + store.up('head') * 2 }); }

function hintBox(s) {
  if ((d().fails[s.id] || 0) < 2) return '';
  return `<div class="hint rise">${icon('book')}<div><strong>${t('hintTitle')}</strong><small>${t('hint_' + s.goal)}</small>${diff().id !== 'easy' ? `<small>${t('hintDiff')}</small>` : ''}</div></div>`;
}

function arrowPicker() {
  const a = d().arrows;
  return `<div class="loadout">${ARROWS.filter(x => a.owned.includes(x.id)).map(x =>
    `<button class="pick ${a.equipped === x.id ? 'on' : ''}" data-arrow="${x.id}" style="--accent:${x.color}">${icon(x.icon)}<small>${x.name}</small></button>`).join('')}</div>`;
}

function stageIntro(id) {
  const s = stageById(id);
  if (!stageUnlocked(id)) { sfx('deny'); buzz('error'); toast(t('stageLocked')); shake($(`[data-stage="${id}"]`)); return; }
  sfx('click');
  const goal = t('goal_' + s.goal, { n: fmt(s.n) });
  const mods = `<span class="tag" style="color:${diff().color}">${diff().name}</span>` + s.mods.map(m => `<span class="tag">${t('mod_' + m)}</span>`).join('');
  const have = d().stages[id] || 0;
  dialog(`
    <p class="over-mode rise">${worldName(s)}</p>
    <h2 class="rise">${s.boss >= 0 ? BOSSES[s.boss].name : t('stage', { n: id })}</h2>
    ${s.boss >= 0 ? `<img class="boss-face rise" src="${ICON[BOSSES[s.boss].img]}" alt="" />` : ''}
    <div class="goal-box rise">${icon('target')}<div><strong>${goal}</strong><small>${limitText(s)}</small></div></div>
    <div class="tags rise">${mods}</div>
    ${hintBox(s)}
    <div class="star-goals rise">
      <div>${starRow(1, 'mini')}<small>${t('starGoal')}</small></div>
      <div>${starRow(2, 'mini')}<small>${t('starPts', { n: fmt(s.stars[1]) })}</small></div>
      <div>${starRow(3, 'mini')}<small>${t('starPts', { n: fmt(s.stars[2]) })}</small></div>
    </div>
    ${have ? `<div class="rise">${starRow(have)}</div>` : ''}
    <div class="rise full">${arrowPicker()}</div>
    <button class="btn btn-play rise" data-x="ok">${t('go')}</button>
    <button class="btn btn-ghost rise full" data-x="no">${t('cancel')}</button>`,
  (p, close) => {
    p.querySelector('[data-x=no]').onclick = () => { sfx('back'); close(); };
    p.querySelector('[data-x=ok]').onclick = () => { buzz('medium'); startGame('stage', s); };
  });
}

// ---------------------------------------------------------------- shop
function renderShop() {
  $$('#shopTabs .tab').forEach(x => x.classList.toggle('on', x.dataset.tab === shopTab));
  const coins = d().coins;
  if (shopTab === 'upgrades') {
    $('#shopList').innerHTML = UPGRADES.map(u => {
      const lvl = store.up(u.id), maxed = lvl >= u.max, cost = upgradeCost(u, lvl);
      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      return `<div class="card item rise">
        ${icon(u.icon, 'item-ico')}
        <div class="item-info"><strong>${u.name}</strong><small>${t('u_' + u.id)}</small><div class="pips">${pips}</div></div>
        <button class="btn btn-buy ${maxed ? 'maxed' : coins < cost ? 'poor' : ''}" data-buy="${u.id}" ${maxed ? 'disabled' : ''}>
          ${maxed ? t('max') : icon('coin') + fmt(cost)}</button>
      </div>`;
    }).join('');
  } else if (shopTab === 'arrows') {
    const a = d().arrows;
    $('#shopList').innerHTML = ARROWS.map(x => {
      const owned = a.owned.includes(x.id), eq = a.equipped === x.id;
      return `<div class="card item rise ${eq ? 'equipped' : ''}">
        <span class="item-ico ring" style="--accent:${x.color}">${icon(x.icon)}</span>
        <div class="item-info"><strong>${x.name}</strong><small>${t('a_' + x.id)}</small></div>
        <button class="btn btn-buy ${eq ? 'maxed' : !owned && coins < x.cost ? 'poor' : owned ? 'own' : ''}" data-buyarrow="${x.id}" ${eq ? 'disabled' : ''}>
          ${eq ? t('inUse') : owned ? t('equip') : icon('coin') + fmt(x.cost)}</button>
      </div>`;
    }).join('');
  } else {
    $('#shopList').innerHTML = SKINS.map(s => {
      const owned = d().skins.owned.includes(s.id), eq = d().skins.equipped === s.id, season = s.cost < 0 && !owned;
      return `<div class="card item rise ${eq ? 'equipped' : ''}">
        <svg class="bow-prev" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M40 6 Q14 20 30 32 Q14 44 40 58" fill="none" stroke="${s.wood2}" stroke-width="8" stroke-linecap="round"/>
          <path d="M40 6 Q14 20 30 32 Q14 44 40 58" fill="none" stroke="${s.wood}" stroke-width="4" stroke-linecap="round"/>
          <path d="M40 6 L40 58" stroke="#fff" stroke-width="1.5" opacity=".8"/>
          <path d="M8 32 H52" stroke="${s.trail}" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M4 32 l8 -6 v12 z" fill="#e8eef5"/>
        </svg>
        <div class="item-info"><strong>${s.name}</strong><small>${eq ? t('equipped') : owned ? t('owned') : season ? t('seasonOnly') : t('skinDesc')}</small></div>
        <button class="btn btn-buy ${eq ? 'maxed' : season ? 'locked' : !owned && coins < s.cost ? 'poor' : owned ? 'own' : ''}" data-skin="${s.id}" ${eq || season ? 'disabled' : ''}>
          ${eq ? t('inUse') : owned ? t('equip') : season ? t('locked') : icon('coin') + fmt(s.cost)}</button>
      </div>`;
    }).join('');
  }
}

function spend(cost, btn) {
  if (d().coins < cost) { deny(btn, cost); return false; }
  const before = d().coins;
  d().coins -= cost; store.save();
  sfx('buy'); buzz('success');
  return before;
}

function buyUpgrade(id, btn) {
  const u = UPGRADES.find(x => x.id === id), lvl = store.up(id);
  if (lvl >= u.max) return;
  const before = spend(upgradeCost(u, lvl), btn); if (before === false) return;
  d().upgrades[id] = lvl + 1; store.save();
  renderShop(); refreshCoins(before);
  const card = $(`[data-buy="${id}"]`)?.closest('.item');
  pop(card);
  if (!reduceMotion && card) animate(card.querySelectorAll('.pips i.on')[lvl], { scale: [2.4, 1], duration: 420, ease: 'outBack' });
}

function buyOrEquip(kind, list, id, btn) {
  const item = list.find(x => x.id === id), bag = d()[kind];
  if (!bag.owned.includes(id)) {
    if (item.cost < 0) return;
    const before = spend(item.cost, btn); if (before === false) return;
    bag.owned.push(id); bag.equipped = id; store.save(); renderShop(); refreshCoins(before);
  } else { bag.equipped = id; store.save(); sfx('click'); buzz('light'); renderShop(); }
  pop($(`[data-${kind === 'skins' ? 'skin' : 'buyarrow'}="${id}"]`)?.closest('.item'));
}

function shake(el) { if (!reduceMotion && el) animate(el, { translateX: [0, -6, 6, -4, 4, 0], duration: 320, ease: 'linear' }); }
function deny(btn, cost) {
  sfx('deny'); buzz('error');
  toast(`${icon('coin')} ${t('needCoins', { n: fmt(cost - d().coins) })}`);
  shake(btn);
}

// ---------------------------------------------------------------- missions
function missionRow({ ic, title, sub, prog, goal, reward, claimed, attr }) {
  const done = prog >= goal;
  return `<div class="card item rise ${claimed ? 'claimed' : ''}">
    ${icon(ic, 'item-ico')}
    <div class="item-info"><strong>${title}</strong>${sub ? `<small>${sub}</small>` : ''}
      <div class="bar"><div style="transform:scaleX(${Math.min(1, prog / goal)})"></div><span>${fmt(Math.min(prog, goal))} / ${fmt(goal)}</span></div></div>
    ${claimed ? `<span class="tick">${icon('check')}</span>`
      : `<button class="btn btn-buy ${done ? 'claim' : 'locked'}" ${attr} ${done ? '' : 'disabled'}>${icon('coin')}${fmt(reward)}</button>`}
  </div>`;
}

function renderMissions() {
  ensurePeriods();
  $$('#missionTabs .tab').forEach(x => x.classList.toggle('on', x.dataset.mtab === missionTab));
  let html = '';
  if (missionTab === 'weekly') {
    const w = d().weekly;
    html = `<p class="note rise">${icon('calendar')} ${t('resetsIn', { n: weekDaysLeft() })}</p>` + weeklyList().map(m => missionRow({
      ic: m.icon, title: t(m.id, { n: fmt(m.goal) }), prog: w.prog[m.id] || 0, goal: m.goal, reward: m.reward, claimed: !!w.claimed[m.id], attr: `data-wclaim="${m.id}"`,
    })).join('');
  } else if (missionTab === 'career') {
    html = MISSIONS.map(m => {
      const prog = m.get(d().stats, d().best) || 0, claimed = !!d().claimed[m.id];
      return { m, prog, claimed, order: claimed ? 2 : prog >= m.goal ? 0 : 1 };
    }).sort((a, b) => a.order - b.order).map(({ m, prog, claimed }) => missionRow({
      ic: m.icon, title: m.name, sub: t(m.id), prog, goal: m.goal, reward: m.reward, claimed, attr: `data-claim="${m.id}"`,
    })).join('');
  } else {
    const s = d().season, into = s.tier >= SEASON.tiers ? SEASON.xpPerTier : s.xp % SEASON.xpPerTier;
    html = `<div class="card rise season-head">
        <div class="season-top">${icon('gift')}<div><strong>${t('tier', { n: s.tier })} / ${SEASON.tiers}</strong><small>${t('resetsIn', { n: seasonDaysLeft() })}</small></div></div>
        <div class="bar big"><div style="transform:scaleX(${into / SEASON.xpPerTier})"></div><span>${into} / ${SEASON.xpPerTier} XP</span></div>
        <small class="dim">${t('seasonHelp')}</small></div>
      <div class="track">` + Array.from({ length: SEASON.tiers }, (_, i) => {
      const n = i + 1, got = n <= s.tier, skin = n === SEASON.skinTier;
      return `<div class="tier rise ${got ? 'got' : ''} ${n === s.tier + 1 ? 'next' : ''}">
        <b>${n}</b>${skin ? '<span class="tier-bow"></span>' : icon('coin')}<span>${fmt(SEASON.coins(n))}</span>${got ? icon('check', 'tier-check') : ''}</div>`;
    }).join('') + '</div>';
  }
  $('#missionList').innerHTML = html;
}

function claim(btn, reward, mark) {
  const before = d().coins;
  mark(); d().coins += reward; store.save();
  sfx('buy'); buzz('success');
  coinFly(btn, 9);
  setTimeout(() => { renderMissions(); refreshCoins(before); }, reduceMotion ? 0 : 260);
  toast(`${icon('coin')} ${t('coinsN', { n: fmt(reward) })}`);
}
function claimMission(id, btn) {
  const m = MISSIONS.find(x => x.id === id);
  if (d().claimed[id] || m.get(d().stats, d().best) < m.goal) return;
  claim(btn, m.reward, () => { d().claimed[id] = true; });
}
function claimWeekly(id, btn) {
  const m = WEEKLY.find(x => x.id === id), w = d().weekly;
  if (w.claimed[id] || (w.prog[id] || 0) < m.goal) return;
  claim(btn, m.reward, () => { w.claimed[id] = true; });
}

// ---------------------------------------------------------------- stats
function trophies() {
  const st = d().stages, list = [];
  for (const m of MISSIONS) list.push({ icon: m.icon, name: m.name, how: t(m.id), on: (m.get(d().stats, d().best) || 0) >= m.goal });
  BOSSES.forEach((b, i) => list.push({ icon: b.img, name: b.name, how: t('tr_boss', { n: b.name }), on: st[(i + 1) * 10] > 0 }));
  WORLDS.forEach((w, i) => list.push({ icon: 'star', name: w.name, how: t('tr_world', { n: w.name }), on: STAGES.filter(s => s.world === i).every(s => st[s.id] === 3) }));
  list.push({ icon: 'comet', name: ENDLESS_NAME, how: t('tr_endless'), on: endlessCleared() >= 10 });
  list.push({ icon: 'party', name: 'Season Champion', how: t('tier', { n: SEASON.tiers }), on: d().season.tier >= SEASON.tiers });
  return list;
}

function renderStats() {
  const s = d().stats, b = d().best;
  const acc = s.shots ? Math.min(100, Math.round((s.hits / s.shots) * 100)) + '%' : '-';
  const bests = ['classic', 'survival', 'precision', 'daily'].map(id => `<div class="stat">${icon(MODES[id].icon)}<b>${fmt(b[id] || 0)}</b><span>${t('mode_' + id)}</span></div>`).join('');
  const rows = [
    ['starsEarned', `${totalStars()} / 120`], ['gamesPlayed', fmt(s.games)], ['fruitHit', fmt(s.fruits)], ['perfectHits', fmt(s.perfects)], ['accuracy', acc],
    ['bestCombo', fmt(s.bestCombo)], ['bigSkewer', s.bestSkewer ? 'x' + s.bestSkewer : '-'],
    ['bossesSmashed', fmt(s.bosses)], ['feversN', fmt(s.fevers)], ['coinsEarned', fmt(s.coinsEarned)],
  ].map(([k, v]) => `<div class="kv"><span>${t(k)}</span><b>${v}</b></div>`).join('');
  const tr = trophies(), have = tr.filter(x => x.on).length;
  const shelf = `<div class="card rise"><h3>${t('trophies')}<span class="shelf-count">${have} / ${tr.length}</span></h3><div class="shelf">${tr.map((x, i) => `<button class="trophy ${x.on ? 'on' : 'off'}" data-trophy="${i}">${icon(x.icon)}</button>`).join('')}</div></div>`;
  $('#statList').innerHTML = `${shelf}<div class="card rise"><h3>${t('highScores')}</h3><div class="stats3 four">${bests}</div></div><div class="card rise"><h3>${t('lifetime')}</h3>${rows}</div>`;
}

// ---------------------------------------------------------------- settings
const TOGGLES = [['sfx', 'sfx'], ['music', 'music'], ['haptics', 'vibration']];
const TOGGLES_MORE = [['lefty', 'lefty'], ['marks', 'marks']];
const SENS = [[0.75, 'sens_low'], [1, 'sens_mid'], [1.35, 'sens_high']];
const diffButtons = attr => DIFFS.map(x => `<button class="diff ${d().settings.diff === x.id ? 'on' : ''}" ${attr}="${x.id}" style="--c:${x.color}"><strong>${x.name}</strong><small>${x.desc}</small></button>`).join('');
function renderSettings() {
  const st = d().settings;
  renderToggles($('#toggles'), [...TOGGLES, ...TOGGLES_MORE]);
  $('#diffs').innerHTML = diffButtons('data-diff');
  $('#sens').innerHTML = SENS.map(([v, k]) => `<button class="opt ${st.sens === v ? 'on' : ''}" data-sens="${v}">${t(k)}</button>`).join('');
  $('#scenes').innerHTML = `<button class="scene ${st.scene === 'auto' ? 'on' : ''}" data-scene="auto"><span>A</span>${t('scene_auto')}</button>` +
    THEMES.map((th, i) => `<button class="scene ${String(st.scene) === String(i) ? 'on' : ''}" data-scene="${i}"><span style="background:${th.sky[1]};border-bottom:12px solid ${th.hills[1]}"><i style="background:${th.sun}"></i></span>${t('scene_' + i)}</button>`).join('');
}
function applyScene() { game.themeIndex = -1; game.setTheme(1); }
function renderToggles(el, list = TOGGLES) {
  el.innerHTML = list.map(([k, label]) => `
    <button class="toggle ${d().settings[k] ? 'on' : ''}" data-toggle="${k}" role="switch" aria-checked="${d().settings[k]}">
      <span>${t(label)}</span><i></i></button>`).join('');
}
function renderPause() {
  renderToggles($('#pauseToggles'));
  const g = $('#pauseGoal');
  g.hidden = !game.stage;
  if (game.stage) { const [c, n] = game.goalProg(); g.textContent = `${game.goalLabel()} (${fmt(c)}/${fmt(n)})`; }
  $('#restartBtn').hidden = game.mode === 'daily' || game.mode === 'tutorial';
  $('#quitBtn').textContent = game.mode === 'tutorial' ? t('skip') : t('quit');
}

function dialog(html, wire) {
  $('#dialogPanel').innerHTML = html;
  const prev = current === 'dialog' ? 'home' : current;
  show('dialog');
  wire($('#dialogPanel'), () => show(prev, { quiet: true }));
}

function confirmReset() {
  dialog(`<h2 class="rise">${t('resetQ')}</h2><p class="rise dim">${t('resetText')}</p>
    <div class="row rise"><button class="btn btn-ghost" data-x="no">${t('cancel')}</button><button class="btn btn-danger" data-x="yes">${t('erase')}</button></div>`,
  (p, close) => {
    p.querySelector('[data-x=no]').onclick = () => { sfx('back'); close(); };
    p.querySelector('[data-x=yes]').onclick = () => { const keep = d().settings.diff; store.reset(); ensurePeriods(); d().tutorialDone = true; d().settings.diff = keep; store.save(); document.body.classList.remove('lefty'); applyScene(); sfx('deny'); show('home'); toast(t('resetDone')); };
  });
}

function backupDialog() {
  dialog(`<h2 class="rise">${t('backup')}</h2><p class="rise dim">${t('backupText')}</p>
    <textarea class="code rise" id="codeBox" spellcheck="false" autocomplete="off" placeholder="${t('pasteHere')}"></textarea>
    <div class="row rise"><button class="btn btn-alt" data-x="copy">${t('copy')}</button><button class="btn btn-buy" data-x="restore">${t('restore')}</button></div>
    <button class="btn btn-ghost rise full" data-x="no">${t('ok')}</button>`,
  (p, close) => {
    const box = p.querySelector('#codeBox');
    p.querySelector('[data-x=no]').onclick = () => { sfx('back'); close(); };
    p.querySelector('[data-x=copy]').onclick = async () => {
      box.value = store.exportCode(); box.select();
      try { await navigator.clipboard.writeText(box.value); } catch { try { document.execCommand('copy'); } catch { /* user can copy by hand */ } }
      sfx('click'); toast(t('copied'));
    };
    p.querySelector('[data-x=restore]').onclick = () => {
      if (!box.value.trim() || !store.importCode(box.value)) { sfx('deny'); shake(box); toast(t('restoreBad')); return; }
      ensurePeriods(); store.save(); document.body.classList.toggle('lefty', !!d().settings.lefty); applyScene();
      audio.syncMusic(); sfx('buy'); show('home'); toast(t('restoreOk'));
    };
  });
}

// ---------------------------------------------------------------- first run + daily bonus
function nextIntro() {
  if (!d().settings.diff) return diffDialog(nextIntro, true);
  if (!d().tutorialDone && d().stats.games === 0) return welcome();
  checkDaily();
}

function diffDialog(after, forced) {
  dialog(`<h2 class="rise">${t('chooseDiff')}</h2><p class="rise dim">${t('chooseDiffText')}</p>
    <div class="diffs rise">${diffButtons('data-pickdiff')}</div>
    ${forced ? '' : `<button class="btn btn-ghost rise full" data-x="no">${t('cancel')}</button>`}`,
  (p, close) => {
    const no = p.querySelector('[data-x=no]'); if (no) no.onclick = () => { sfx('back'); close(); };
    p.querySelectorAll('[data-pickdiff]').forEach(b => { b.onclick = () => {
      d().settings.diff = b.dataset.pickdiff; store.save(); sfx('buy'); buzz('medium');
      p.querySelectorAll('.diff').forEach(x => x.classList.toggle('on', x === b)); pop(b);
      setTimeout(() => { show('home', { quiet: true }); pop($('#diffChip')); if (after) after(); }, reduceMotion ? 0 : 320);
    }; });
  });
}

let offerTimer = null;
function onOffer(o) {
  const gain = t('cont_' + o.rule), poor = d().coins < o.cost;
  dialog(`<img class="offer-ico rise" src="${ICON[o.rule === 'time' ? 'hourglass' : o.rule === 'lives' ? 'heart' : 'bow']}" alt="" />
    <h2 class="rise">${t('contTitle')}</h2>
    ${o.n ? `<p class="rise dim">${t('contGoal', { n: `${fmt(o.cur)} / ${fmt(o.n)}` })}</p>` : ''}
    <div class="offer-gain rise">${gain}</div>
    <div class="countdown rise"><div id="offerBar"></div></div>
    <button class="btn btn-play rise ${poor ? 'poor' : ''}" data-x="ok">${icon('coin')} ${fmt(o.cost)}</button>
    <button class="btn btn-ghost rise full" data-x="no">${t('contNo')}</button>`,
  (p) => {
    const done = fn => { if (offerTimer) offerTimer.pause(); offerTimer = null; show('play'); fn(); };
    const no = () => done(() => game.giveUp());
    p.querySelector('[data-x=no]').onclick = () => { sfx('back'); no(); };
    p.querySelector('[data-x=ok]').onclick = e => {
      if (game.state !== 'offer') return;
      if (d().coins < o.cost) return deny(e.currentTarget, o.cost);
      d().coins -= o.cost; store.save(); sfx('buy');
      done(() => game.revive());
    };
    offerTimer = animate('#offerBar', { scaleX: [1, 0], duration: 7000, ease: 'linear', onComplete: () => { if (current === 'dialog' && game.state === 'offer') no(); } });
  });
}

function welcome() {
  dialog(`<img class="hero rise" src="${ICON.bow}" alt="" /><h2 class="rise">${t('welcome')}</h2><p class="rise dim">${t('welcomeText')}</p>
    <button class="btn btn-play rise" data-x="ok">${t('startTut')}</button>
    <button class="btn btn-ghost rise full" data-x="no">${t('skip')}</button>`,
  (p) => {
    p.querySelector('[data-x=ok]').onclick = () => { buzz('medium'); startGame('tutorial'); };
    p.querySelector('[data-x=no]').onclick = () => { sfx('back'); d().tutorialDone = true; store.save(); show('home', { quiet: true }); checkDaily(); };
  });
}

function checkDaily() {
  const today = dayKey(), daily = d().daily;
  if (daily.last === today) return false;
  const streak = daily.last === dayKey(Date.now() - 864e5) ? (daily.streak % 7) + 1 : 1;
  const reward = DAILY[streak - 1];
  const days = DAILY.map((v, i) => `<div class="day ${i + 1 < streak ? 'past' : i + 1 === streak ? 'now' : ''}"><small>${t('day', { n: i + 1 })}</small>${icon('coin')}<b>${v}</b></div>`).join('');
  dialog(`<h2 class="rise">${t('dailyBonus')}</h2><p class="rise dim">${t('dailyBonusText')}</p>
    <div class="days rise">${days}</div><button class="btn btn-play rise" data-x="ok">${t('claimN', { n: reward })}</button>`,
  (p) => {
    const btn = p.querySelector('[data-x=ok]');
    btn.onclick = () => {
      audio.unlock();
      const before = d().coins;
      daily.last = today; daily.streak = streak; d().coins += reward; store.save();
      sfx('buy'); buzz('success');
      const r = btn.getBoundingClientRect();
      show('home');
      coinFly({ getBoundingClientRect: () => r }, 10);
      refreshCoins(before);
    };
  });
  if (!reduceMotion) animate('.day.now', { scale: [1, 1.12, 1], duration: 900, delay: 500, loop: 3, ease: 'inOutSine' });
  return true;
}

// ---------------------------------------------------------------- HUD
const hud = {
  cache: {}, chips: {},
  set(key, value, fn) { if (this.cache[key] !== value) { this.cache[key] = value; fn(value); } },
  reset(mode, stage) {
    this.cache = {}; this.prevStat = null;
    const rule = mode === 'tutorial' ? 'none' : mode === 'survival' ? 'lives' : mode === 'precision' || (stage && stage.arrows) ? 'arrows' : 'time';
    $('#hudStat').hidden = rule === 'none';
    $('#hudStat').classList.remove('danger');
    $('#hudStatIcon').src = ICON[rule === 'time' ? 'stopwatch' : rule === 'lives' ? 'heart' : 'bow'];
    $('#hudGoal').hidden = !stage;
    $('#hudGoal').classList.remove('done');
    $('#hudWind').hidden = true;
    $('#bossBar').hidden = true;
    $('#feverWrap').hidden = mode === 'tutorial';
    $('#hudCombo').classList.remove('on');
    $('#hudScore').textContent = '0';
    $('#chips').innerHTML = '';
    this.chips = {};
    $('#hudLevel').textContent = mode === 'tutorial' ? t('tutorial') : stage ? t('stage', { n: stage.id }) : t('level', { n: 1 });
    $('.fever-label').textContent = t('fever');
  },
  update(g) {
    if (g.state === 'attract' || g.state === 'over') return;
    this.set('score', g.score, v => { $('#hudScore').textContent = fmt(v); });
    if (g.scorePulse > 0.9) pulse($('#hudScore'), 1.14);
    const rule = g.rule;
    if (rule !== 'none') {
      const stat = rule === 'time' ? Math.ceil(g.timeLeft) : rule === 'lives' ? g.lives : g.arrowsLeft;
      this.set('stat', stat, v => {
        const prev = this.prevStat; this.prevStat = v;
        $('#hudStatVal').textContent = rule === 'time' ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : v;
        $('#hudStat').classList.toggle('danger', rule === 'time' ? v <= 10 : rule === 'lives' ? v <= 1 : v <= 3);
        if (prev != null && (rule !== 'time' || v > prev + 1 || v <= 10)) pulse($('#hudStat'), 1.16);
      });
    }
    this.set('combo', g.combo, v => {
      $('#hudCombo').classList.toggle('on', v >= 2);
      $('#hudComboN').textContent = v;
      $('#hudComboX').textContent = 'x' + g.comboMult;
      if (v >= 2) pulse($('#hudCombo'), 1.22);
    });
    this.set('fever', Math.round(g.fever * 100), v => { $('#feverFill').style.transform = `scaleX(${v / 100})`; });
    this.set('inFever', g.inFever, v => { $('#feverWrap').classList.toggle('on', v); document.body.classList.toggle('fever-on', v); });
    if (!g.stage && g.mode !== 'tutorial') this.set('level', g.level, v => { $('#hudLevel').textContent = t('level', { n: v }); pulse($('#hudLevel'), 1.3); });
    if (g.stage) {
      const [cur, n] = g.goalProg();
      this.set('goal', cur, v => {
        $('#hudGoalVal').textContent = g.stage.goal === 'boss' ? `${v}/${n}` : `${fmt(v)}/${fmt(n)}`;
        const done = v >= n;
        if (done && !$('#hudGoal').classList.contains('done')) { $('#hudGoal').classList.add('done'); pulse($('#hudGoal'), 1.5); }
        else if (v > 0) pulse($('#hudGoal'), 1.12);
      });
    }
    const wind = Math.round(g.wind / 10);
    this.set('wind', wind, v => {
      $('#hudWind').hidden = v === 0;
      $('#windVal').textContent = Math.abs(v);
      $('#windArrow').style.transform = `scaleX(${v < 0 ? -1 : 1})`;
    });
    this.set('boss', g.boss ? g.boss.def.img : '', v => {
      $('#bossBar').hidden = !v;
      if (v) { $('#bossIcon').src = ICON[v]; if (!reduceMotion) animate('#bossBar', { scaleX: [0.3, 1], opacity: [0, 1], duration: 420, ease: 'outBack' }); }
    });
    if (g.boss) this.set('bossHp', g.boss.hp, v => { $('#bossFill').style.transform = `scaleX(${Math.max(0, v / g.boss.max)})`; pulse($('#bossIcon'), 1.35); });
    for (const k in g.effects) {
      const left = g.effects[k];
      let chip = this.chips[k];
      if (left > 0 && !chip && POWERUPS[k]) {
        chip = this.chips[k] = document.createElement('div');
        chip.className = 'chip'; chip.style.setProperty('--c', POWERUPS[k].color);
        chip.innerHTML = `<img src="${ICON[POWERUPS[k].icon]}" alt="" />`;
        $('#chips').appendChild(chip);
        if (!reduceMotion) animate(chip, { scale: [0.5, 1], opacity: [0, 1], duration: 300, ease: 'outBack' });
      }
      if (chip) {
        if (left <= 0) { chip.remove(); delete this.chips[k]; }
        else { chip.style.setProperty('--p', Math.round((left / g.effectMax[k]) * 100) + '%'); chip.classList.toggle('low', left < 2); }
      }
    }
  },
};

const pulsing = new WeakMap();
function pulse(el, s) {
  if (reduceMotion || !el) return;
  const now = performance.now();
  if (now - (pulsing.get(el) || 0) < 90) return;
  pulsing.set(el, now);
  animate(el, { scale: [s, 1], duration: 260, ease: 'outQuart' });
}

// ---------------------------------------------------------------- game over
function onGameOver(r) {
  lastResult = r;
  if (r.stage) { d().fails[r.stage.id] = r.won ? 0 : (d().fails[r.stage.id] || 0) + 1; store.save(); }
  const kind = r.stage ? (r.won ? (r.stage.boss >= 0 ? 'boss' : r.stars === 3 ? 'perfect' : 'clear') : '') : r.isBest ? 'best' : '';
  if (kind && !reduceMotion) cheer(kind).then(() => showOver(r)); else showOver(r);
}

/** Full-screen celebration: spinning rays, a bouncing banner and a confetti burst. */
function cheer(kind) {
  const el = $('#cheer'), word = t('cheer_' + kind);
  $('#cheerIco').src = ICON[{ boss: 'crown', perfect: 'star', clear: 'party', best: 'trophy' }[kind]];
  $('#cheerSmall').textContent = kind === 'clear' ? '' : t('congrats');
  $('#cheerWord').innerHTML = [...word].map(c => `<b>${c}</b>`).join('');
  if (!$('#rays').children.length) $('#rays').innerHTML = Array.from({ length: 12 }, (_, i) => `<i style="transform:rotate(${i * 30}deg)"></i>`).join('');
  el.classList.add('on');
  sfx(kind === 'clear' ? 'star' : 'best'); buzz('success');
  animate(el, { opacity: [0, 1], duration: 180, ease: 'outQuad' });
  animate('#rays', { scale: [0.2, 1], duration: 600, ease: 'outQuint' });
  animate('#cheerIco', { scale: [0.2, 1], rotate: [-40, 0], duration: 620, ease: 'outElastic(1, .55)' });
  animate('#cheerSmall', { opacity: [0, 1], translateY: [14, 0], duration: 300, delay: 160, ease: 'outQuint' });
  animate('#cheerWord b', { translateY: [50, 0], scale: [0.3, 1], opacity: [0, 1], duration: 520, delay: stagger(38, { start: 220 }), ease: 'outBack' });
  const colors = ['#ff5470', '#ffd23f', '#a6f06a', '#5ce1ff', '#c77dff', '#ff8a1f'], w = innerWidth, h = innerHeight;
  for (let i = 0; i < 46; i++) {
    const b = document.createElement('i'); b.className = 'bit'; b.style.background = colors[i % colors.length];
    el.appendChild(b);
    const side = i % 2 ? -1 : 1, x0 = side > 0 ? -10 : w + 10, peak = (0.15 + Math.random() * 0.45) * w * side;
    animate(b, {
      translateX: [x0, x0 + peak, x0 + peak * (1.2 + Math.random() * 0.5)], translateY: [h * 0.62, h * (0.1 + Math.random() * 0.3), h * 1.05],
      rotate: [0, (Math.random() - 0.5) * 1400], scaleX: [1, 0.3, 1, 0.4, 1], duration: 1500 + Math.random() * 600, delay: 150 + Math.random() * 250, ease: 'outQuad',
      onComplete: () => b.remove(),
    });
  }
  return sleep(1750).then(() => animate(el, { opacity: [1, 0], duration: 220, ease: 'inQuad' }).then()).then(() => { el.classList.remove('on'); el.style.opacity = ''; });
}

function showOver(r) {
  document.body.classList.remove('fever-on');
  const st = r.stage;
  $('#overMode').textContent = st ? `${worldName(st)} · ${t('stage', { n: st.id })}` : r.mode === 'daily' ? t('dailyTitle') : t('mode_' + r.mode);
  $('#bestRibbon').hidden = !r.isBest;
  const starsEl = $('#overStars');
  starsEl.hidden = !st;
  if (st) starsEl.innerHTML = `<h2 class="${r.won ? 'win' : 'lose'}">${r.won ? t('stageClear') : t('stageFail')}</h2>${starRow(r.stars, 'big')}`;
  $('#overBest').textContent = st ? t('goal_' + st.goal, { n: fmt(st.n) }) : r.isBest ? t('prevBest', { n: fmt(r.prevBest) }) : t('best', { n: fmt(r.best) });
  $('#overGrid').innerHTML = [
    ['apple', r.fruits, 'fruit'], ['target', r.accuracy + '%', 'accuracy'], ['fire', r.maxCombo, 'maxCombo'], ['star', r.perfects, 'perfects'],
  ].map(([i, v, l]) => `<div class="stat">${icon(i)}<b>${v}</b><span>${t(l)}</span></div>`).join('');
  const s = d().season, into = s.tier >= SEASON.tiers ? SEASON.xpPerTier : s.xp % SEASON.xpPerTier;
  $('#overSeason').innerHTML = `${icon('gift')}<div class="bar"><div id="overXpBar" style="transform:scaleX(0)"></div><span>${t('tier', { n: s.tier })} · ${t('seasonXp', { n: r.season.xp })}</span></div>`;
  const n = claimable(), note = $('#overNote');
  note.hidden = !n; note.innerHTML = n ? `${icon('trophy')} ${t('missionReady', { n })}` : '';
  $('#overHint').innerHTML = st && !r.won ? hintBox(st) : '';
  $('#overScore').textContent = '0'; $('#overCoins').textContent = '+0';

  const nextStage = st && r.won ? stageById(st.id + 1) : null;
  const again = $('#againBtn');
  again.hidden = r.mode === 'daily';
  again.textContent = st ? (nextStage ? t('next') : r.won ? t('map') : t('retry')) : t('playAgain');
  again.onclick = () => {
    sfx('click'); buzz('medium');
    if (!st) return startGame(r.mode);
    if (nextStage) { game.toMenu(); current = 'map'; return stageIntro(nextStage.id); }
    if (r.won) { game.toMenu(); return show('map'); }
    startGame('stage', st);
  };
  const alt = $('#overAlt');
  alt.textContent = st ? (r.won ? t('retry') : t('map')) : t('shop');
  alt.onclick = () => {
    sfx('click');
    if (st && r.won) return startGame('stage', st);
    game.toMenu(); show(st ? 'map' : 'shop');
  };

  show('over');
  if (r.isBest) { sfx('best'); buzz('success'); if (!reduceMotion) animate('#bestRibbon', { scale: [0.2, 1], rotate: [-18, -6], opacity: [0, 1], duration: 520, delay: 380, ease: 'outBack' }); }
  if (st) {
    const on = starsEl.querySelectorAll('.stars i.on');
    on.forEach((el, i) => {
      if (reduceMotion) return;
      el.style.opacity = 0;
      animate(el, { opacity: [0, 1], scale: [3, 1], rotate: [-90, 0], duration: 480, delay: 450 + i * 320, ease: 'outBack', onBegin: () => { sfx('star'); buzz('light'); } });
    });
    if (!r.won && !reduceMotion) animate(starsEl.querySelector('h2'), { rotate: [0, -3, 3, -2, 0], duration: 600, delay: 300 });
  }
  const o = { s: 0, c: 0 };
  animate(o, {
    s: r.score, c: r.coins, duration: reduceMotion ? 1 : 1100, delay: 200, ease: 'outExpo',
    onUpdate: () => { $('#overScore').textContent = fmt(o.s); $('#overCoins').textContent = '+' + fmt(o.c); },
    onComplete: () => { pop($('#overScore')); pop($('#earned')); sfx('coin'); },
  });
  setTimeout(() => { const b = $('#overXpBar'); if (b) b.style.transform = `scaleX(${into / SEASON.xpPerTier})`; }, 500);
  r.season.ups.forEach((u, i) => setTimeout(() => {
    if (current !== 'over') return;
    sfx('level'); buzz('success'); pop($('#overSeason'));
    toast(`${icon('gift')} ${t('tierUp', { n: u.tier })} ${icon('coin')} +${u.coins}${u.tier === SEASON.skinTier ? ' · ' + t('skinNew') : ''}`);
  }, 1500 + i * 1300));
}

function onTutorialDone() {
  const first = game.tutFirst, now = d().coins;
  wipe(() => {
    game.toMenu(); show('home');
    if (first) { refreshCoins(Math.max(0, now - 100)); toast(`${icon('party')} ${t('tutReward')}`); }
  });
  setTimeout(() => { if (current === 'home') checkDaily(); }, 2600);
}

// ---------------------------------------------------------------- share card
function shareCanvas(r) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
  const x = c.getContext('2d');
  x.fillStyle = '#8f3a78'; x.fillRect(0, 0, 1080, 1080);
  x.fillStyle = '#ff9b4a'; x.fillRect(0, 760, 1080, 320);
  x.fillStyle = '#4a2a73'; x.beginPath(); x.moveTo(0, 1080); for (let i = 0; i <= 1080; i += 20) x.lineTo(i, 900 + Math.sin(i * 0.008) * 40); x.lineTo(1080, 1080); x.fill();
  x.fillStyle = 'rgba(27,16,54,0.55)'; x.beginPath(); x.roundRect(70, 330, 940, 560, 60); x.fill();
  const fruit = ['apple', 'orange', 'watermelon', 'grapes', 'strawberry', 'pineapple', 'kiwi', 'lemon'];
  fruit.forEach((f, i) => { const im = IMAGES[f]; if (im && im.width) { x.save(); x.translate(100 + i * 126, 960 + (i % 2) * 30); x.rotate((i - 4) * 0.12); x.drawImage(im, -60, -60, 120, 120); x.restore(); } });
  const text = (s, y, size, color, stroke = 14) => {
    x.font = `${size}px "Lilita One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineJoin = 'round'; x.lineWidth = stroke; x.strokeStyle = '#1b1036'; x.strokeText(s, 540, y); x.fillStyle = color; x.fillText(s, 540, y);
  };
  x.save(); x.translate(540, 180); x.rotate(-0.06); x.translate(-540, -180);
  text('FRUIT', 130, 150, '#ff5470', 24); text('ARCHER', 255, 128, '#ffd23f', 24); x.restore();
  const st = r.stage;
  text(st ? `${worldName(st)} · ${t('stage', { n: st.id })}` : r.mode === 'daily' ? `${t('dailyTitle')} ${dayKey()}` : t('mode_' + r.mode), 410, 52, '#e2d9ff', 10);
  text(fmt(r.score), 560, 230, '#ffd23f', 26);
  if (st) {
    const im = IMAGES.star;
    for (let i = 0; i < 3; i++) { x.globalAlpha = i < r.stars ? 1 : 0.2; if (im && im.width) x.drawImage(im, 540 - 195 + i * 130, 690, 130, 130); }
    x.globalAlpha = 1;
  } else {
    text(`${t('maxCombo')} ${r.maxCombo}  ·  ${t('accuracy')} ${r.accuracy}%`, 730, 50, '#fff6e0', 10);
    if (r.isBest) text(t('newBest'), 820, 64, '#a6f06a', 12);
  }
  return c;
}

async function shareResult() {
  const r = lastResult; if (!r) return;
  sfx('click');
  const canvas = shareCanvas(r), text = t('shareText', { n: fmt(r.score) });
  const dataUrl = canvas.toDataURL('image/png');
  try {
    if (isNative) {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
      const file = await Filesystem.writeFile({ path: 'fruit-archer-score.png', data: dataUrl.split(',')[1], directory: Directory.Cache });
      await Share.share({ title: 'Fruit Archer', text, files: [file.uri] });
      return;
    }
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const file = new File([blob], 'fruit-archer-score.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ title: 'Fruit Archer', text, files: [file] }); return; }
    const a = document.createElement('a'); a.href = dataUrl; a.download = 'fruit-archer-score.png'; a.click();
    toast(t('saved'));
  } catch { /* share sheet dismissed */ }
}

// ---------------------------------------------------------------- events
function quitRun() {
  sfx('back');
  if (game.mode === 'tutorial') { d().tutorialDone = true; store.save(); }
  if (game.mode === 'daily' && game.live) { d().daily.chDate = dayKey(); d().daily.chScore = game.score; d().best.daily = Math.max(d().best.daily || 0, game.score); store.save(); }
  const back = game.mode === 'stage' ? 'map' : 'home';
  wipe(() => { game.toMenu(); show(back); if (back === 'home') checkDaily(); });
}
function goBack() {
  if (busy) return;
  if (current === 'play') { if (game.state !== 'playing') return; game.pause(); sfx('click'); show('pause'); }
  else if (current === 'pause') resume();
  else if (current === 'home') exitApp();
  else if (current === 'dialog') $('#dialogPanel [data-x=no]')?.click();
  else if (current === 'over') { game.toMenu(); sfx('back'); show(lastResult?.stage ? 'map' : 'home'); }
  else { sfx('back'); show('home'); }
}
function resume() { sfx('click'); show('play'); game.resume(); }

function ripple(btn, e) {
  if (reduceMotion || !btn.classList.contains('btn')) return;
  const r = btn.getBoundingClientRect(), s = document.createElement('span');
  s.className = 'ripple'; s.style.left = e.clientX - r.left + 'px'; s.style.top = e.clientY - r.top + 'px';
  btn.appendChild(s); setTimeout(() => s.remove(), 500);
}

function tabSwitch(list) {
  if (!reduceMotion) animate(`${list} .rise`, { opacity: [0, 1], translateX: [24, 0], duration: 320, delay: stagger(30), ease: 'outQuint' });
}

document.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b) ripple(b, e); });
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || busy) return;
  audio.unlock();
  const ds = b.dataset;
  if (ds.go) {
    sfx(ds.go === 'home' ? 'back' : 'click');
    if (ds.mtab) missionTab = ds.mtab;
    if (current === 'over') game.toMenu();
    show(ds.go);
  }
  else if (ds.mode) {
    if (selectedMode === ds.mode) return pressPlay();
    selectedMode = ds.mode; sfx('click'); buzz('light'); renderHome(); pop($(`[data-mode="${ds.mode}"]`));
    if (!reduceMotion) animate('#modeDesc', { opacity: [0, 1], translateY: [6, 0], duration: 260, ease: 'outQuint' });
  }
  else if (ds.stage) stageIntro(+ds.stage);
  else if (ds.arrow) {
    d().arrows.equipped = ds.arrow; store.save(); sfx('click'); buzz('light');
    $$('.pick').forEach(p => p.classList.toggle('on', p.dataset.arrow === ds.arrow)); pop(b);
  }
  else if (ds.tab) { shopTab = ds.tab; sfx('click'); renderShop(); tabSwitch('#shopList'); }
  else if (ds.mtab) { missionTab = ds.mtab; sfx('click'); renderMissions(); tabSwitch('#missionList'); }
  else if (ds.buy) buyUpgrade(ds.buy, b);
  else if (ds.skin) buyOrEquip('skins', SKINS, ds.skin, b);
  else if (ds.buyarrow) buyOrEquip('arrows', ARROWS, ds.buyarrow, b);
  else if (ds.claim) claimMission(ds.claim, b);
  else if (ds.wclaim) claimWeekly(ds.wclaim, b);
  else if (ds.diff) { d().settings.diff = ds.diff; store.save(); sfx('click'); buzz('light'); renderSettings(); pop($(`[data-diff="${ds.diff}"]`)); }
  else if (ds.sens) { d().settings.sens = +ds.sens; store.save(); sfx('click'); renderSettings(); }
  else if (ds.scene) { d().settings.scene = ds.scene; store.save(); sfx('whoosh'); renderSettings(); applyScene(); pop($(`[data-scene="${ds.scene}"]`)); }
  else if (ds.trophy) { const x = trophies()[+ds.trophy]; sfx(x.on ? 'star' : 'click'); toast(`${icon(x.icon)} ${x.on ? `${x.name}: ${x.how}` : t('trophyLocked', { n: x.how })}`); }
  else if (ds.toggle) {
    const s = d().settings; s[ds.toggle] = !s[ds.toggle]; store.save();
    if (ds.toggle === 'lefty') document.body.classList.toggle('lefty', s.lefty);
    b.classList.toggle('on', s[ds.toggle]); b.setAttribute('aria-checked', s[ds.toggle]);
    audio.syncMusic(); sfx('click'); if (ds.toggle === 'haptics') buzz('medium');
  }
});

$('#playBtn').onclick = pressPlay;
$('#diffChip').onclick = () => { sfx('click'); diffDialog(null, false); };
$('#pauseBtn').onclick = () => { if (current === 'play') goBack(); };
$('#resumeBtn').onclick = resume;
$('#restartBtn').onclick = () => { sfx('click'); startGame(game.mode, game.stage); };
$('#quitBtn').onclick = quitRun;
$('#overHome').onclick = () => { sfx('back'); game.toMenu(); show('home'); };
$('#shareBtn').onclick = shareResult;
$('#resetBtn').onclick = () => { sfx('click'); confirmReset(); };
$('#backupBtn').onclick = () => { sfx('click'); backupDialog(); };
$('#tutBtn').onclick = () => { sfx('click'); startGame('tutorial'); };

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
applyI18n();
buildLogo();

document.body.classList.toggle('lefty', !!d().settings.lefty);
const bootT0 = performance.now();
const bootBar = p => { $('#bootFill').style.transform = `scaleX(${p})`; $('#bootArrow').style.transform = `translateX(${p * 100}%)`; };
$$('#boot .b-logo span').forEach(sp => { sp.innerHTML = [...sp.textContent].map(c => `<b>${c}</b>`).join(''); });
if (!reduceMotion) animate('#boot .b-logo b', { translateY: [-70, 0], rotate: [() => (Math.random() - 0.5) * 60, 0], opacity: [0, 1], duration: 650, delay: stagger(50), ease: 'outElastic(1, .6)' });

Promise.all([
  loadImages(p => bootBar(p * 0.9)),
  document.fonts.load('40px "Lilita One"').catch(() => {}),
]).then(async ([images]) => {
  IMAGES = images;
  game = new Game($('#game'), images, { onGameOver, onTutorialDone, onOffer, onFrame: g => hud.update(g) });
  game.toMenu();
  if (import.meta.env.DEV) { window.__game = game; window.__store = store; }
  if (isNative) import('@capacitor/splash-screen').then(m => m.SplashScreen.hide()).catch(() => {});
  bootBar(1);
  await sleep(Math.max(350, (reduceMotion ? 500 : 1500) - (performance.now() - bootT0)));
  show('home');
  const boot = $('#boot');
  if (reduceMotion) boot.remove();
  else {
    sfx('whoosh');
    animate('#boot .b-track, #boot .b-text', { opacity: 0, duration: 160 });
    animate('#boot .b-logo', { scale: [1, 1.25], opacity: [1, 0], duration: 380, ease: 'inQuad' });
    await animate(boot, { opacity: [1, 0], duration: 420, delay: 140, ease: 'inQuad' }).then();
    boot.remove();
    logoIn();
  }
  nextIntro();
});
