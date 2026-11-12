// Long-term progression bookkeeping: weekly missions, season track, daily challenge.
import { store } from './store.js';
import { WEEKLY, SEASON, STAGES, mulberry32 } from './data.js';

const DAY = 864e5;
export const dayKey = (t = Date.now()) => { const x = new Date(t); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
export const daySeed = () => { const x = new Date(); return x.getFullYear() * 10000 + (x.getMonth() + 1) * 100 + x.getDate(); };

function weekStart(t = Date.now()) { // Monday 00:00 local
  const x = new Date(t); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.getTime();
}
export const weekDaysLeft = () => Math.max(1, Math.ceil((weekStart() + 7 * DAY - Date.now()) / DAY));
export const seasonId = () => { const x = new Date(); return `${x.getFullYear()}-${x.getMonth() + 1}`; };
export const seasonDaysLeft = () => { const x = new Date(); return Math.max(1, Math.ceil((new Date(x.getFullYear(), x.getMonth() + 1, 1) - x) / DAY)); };

/** Roll the weekly set and the season over when their period has passed. */
export function ensurePeriods() {
  const d = store.data, wk = String(weekStart());
  if (d.weekly.id !== wk) {
    const rnd = mulberry32(weekStart() / DAY), pool = [...WEEKLY], pick = [];
    while (pick.length < 3) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0].id);
    d.weekly = { id: wk, pick, prog: {}, claimed: {} };
  }
  if (d.season.id !== seasonId()) d.season = { id: seasonId(), xp: 0, tier: 0 };
}
export const weeklyList = () => store.data.weekly.pick.map(id => WEEKLY.find(w => w.id === id)).filter(Boolean);
export const totalStars = () => STAGES.reduce((n, s) => n + (store.data.stages[s.id] || 0), 0);
export const stageUnlocked = id => id === 1 || (store.data.stages[id - 1] || 0) > 0;

/** Apply one finished run. Returns season XP gained and any tiers crossed. */
export function applyRun(run) {
  ensurePeriods();
  const d = store.data;
  for (const w of weeklyList()) d.weekly.prog[w.id] = (d.weekly.prog[w.id] || 0) + (run[w.key] || 0);
  const xp = Math.round(10 + run.fruits + run.perfects * 2 + run.bosses * 30 + run.stars * 25);
  const before = d.season.tier;
  d.season.xp += xp;
  const tier = Math.min(SEASON.tiers, Math.floor(d.season.xp / SEASON.xpPerTier));
  const ups = [];
  for (let t = before + 1; t <= tier; t++) {
    const coins = SEASON.coins(t);
    d.coins += coins; ups.push({ tier: t, coins });
    if (t === SEASON.skinTier && !d.skins.owned.includes(SEASON.skin)) d.skins.owned.push(SEASON.skin);
  }
  d.season.tier = tier;
  return { xp, ups };
}
