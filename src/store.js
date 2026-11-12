// Persistent player profile (localStorage).
const KEY = 'fruit-archer-save-v1';

const defaults = () => ({
  coins: 0,
  best: { classic: 0, survival: 0, precision: 0, daily: 0, event: 0 },
  upgrades: {},
  skins: { owned: ['oak'], equipped: 'oak' },
  arrows: { owned: ['std'], equipped: 'std' },
  stages: {},
  fails: {},
  gems: 0,
  chests: 0,
  quests: { id: '', pick: [], prog: {}, claimed: {}, chest: false },
  week: { id: '', fruits: 0, combo: 0, stars: 0, games: 0, score: 0 },
  event: { id: '', played: false, best: 0 },
  book: {},
  bookSeen: 0,
  trophySeen: 0,
  ghost: [],
  style: { outfits: ['forest'], outfit: 'forest', hats: ['none'], hat: 'none', pets: ['none'], pet: 'none' },
  weekly: { id: '', pick: [], prog: {}, claimed: {} },
  season: { id: '', xp: 0, tier: 0 },
  stats: { games: 0, fruits: 0, perfects: 0, bestCombo: 0, bestSkewer: 0, bosses: 0, fevers: 0, shots: 0, hits: 0, coinsEarned: 0, stars: 0 },
  claimed: {},
  settings: { sfx: true, music: true, haptics: true, diff: '', scene: 'auto', lefty: false, sens: 1, marks: false, remind: false },
  daily: { last: '', lastNum: 0, freezes: 0, streak: 0, chDate: '', chScore: 0 },
  tutorialDone: false,
  lastMode: 'stage',
});

function merge(base, saved) {
  for (const k in saved) {
    if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && base[k] && typeof base[k] === 'object') merge(base[k], saved[k]);
    else base[k] = saved[k];
  }
  return base;
}

export const store = {
  data: defaults(),
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = merge(defaults(), JSON.parse(raw));
    } catch { this.data = defaults(); }
    return this.data;
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* storage full or blocked */ }
  },
  reset() { this.data = defaults(); this.save(); },
  /** Portable backup code: base64 of the save JSON. */
  exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(this.data)))); },
  importCode(code) {
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (!obj || typeof obj !== 'object' || typeof obj.coins !== 'number' || !obj.stats) return false;
      this.data = merge(defaults(), obj); this.save(); return true;
    } catch { return false; }
  },
  up(id) { return this.data.upgrades[id] || 0; },
};
