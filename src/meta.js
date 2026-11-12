// Long-term progression bookkeeping: weekly missions, season track, daily challenge.
import { store } from './store.js';
import { WEEKLY, SEASON, STAGES, QUESTS, EVENTS, CAL_DAYS, calReward, FREEZE_MAX, mulberry32 } from './data.js';

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
  if (d.week.id !== wk) d.week = { id: wk, fruits: 0, combo: 0, stars: 0, games: 0, score: 0 };
  if (d.quests.id !== dayKey()) {
    const rnd = mulberry32(daySeed()), pool = [...QUESTS], pick = [];
    while (pick.length < 3) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0].id);
    d.quests = { id: dayKey(), pick, prog: {}, claimed: {}, chest: false };
  }
  const ev = currentEvent();
  if (ev && d.event.id !== wk) d.event = { id: wk, played: false, best: 0 };
}

// ---- daily quests
export const questList = () => store.data.quests.pick.map(id => QUESTS.find(q => q.id === id)).filter(Boolean);
export const questsAllClaimed = () => questList().every(q => store.data.quests.claimed[q.id]);

// ---- weekend event (Friday to Sunday), rotating weekly
export function currentEvent() {
  const day = globalThis.__fakeDay ?? new Date().getDay(); // __fakeDay is a test hook
  if (day !== 5 && day !== 6 && day !== 0) return null;
  return EVENTS[Math.floor(weekStart() / (7 * DAY)) % EVENTS.length];
}
export const eventDaysAway = () => (5 - new Date().getDay() + 7) % 7;

// ---- 28-day login calendar with streak freezes
export const dayNum = (t = Date.now()) => { const x = new Date(t); return Math.round(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / DAY); };
/** What claiming today would do. `day` is the calendar day (1..28) that would be stamped. */
export function calendarState() {
  const dl = store.data.daily, today = dayNum();
  if (!dl.lastNum && dl.last) { // migrate saves from the 7-day bonus
    const [y, m, dd] = dl.last.split('-').map(Number);
    dl.lastNum = Math.round(Date.UTC(y, m - 1, dd) / DAY);
  }
  if (dl.lastNum === today) return { claimed: true, day: dl.streak, used: 0, reset: false };
  const missed = dl.lastNum ? today - dl.lastNum - 1 : 0;
  if (!dl.lastNum || missed < 0) return { claimed: false, day: 1, used: 0, reset: false };
  if (missed === 0) return { claimed: false, day: (dl.streak % CAL_DAYS) + 1, used: 0, reset: false };
  if (missed <= dl.freezes) return { claimed: false, day: (dl.streak % CAL_DAYS) + 1, used: missed, reset: false };
  return { claimed: false, day: 1, used: 0, reset: dl.streak > 1 };
}
export function claimCalendar() {
  const st = calendarState(), d = store.data;
  if (st.claimed) return null;
  const rew = calReward(st.day);
  d.daily.freezes -= st.used; d.daily.streak = st.day; d.daily.lastNum = dayNum(); d.daily.last = dayKey();
  d.coins += rew.coins; d.chests += rew.chests;
  return { ...st, ...rew };
}

/** Open one chest. Returns the loot so the UI can reveal it. */
export function openChest() {
  const d = store.data;
  if (d.chests <= 0) return null;
  d.chests--;
  const loot = { coins: 80 + Math.floor(Math.random() * 13) * 10, gems: 15 + Math.floor(Math.random() * 6) * 5, freeze: 0 };
  if (d.daily.freezes < FREEZE_MAX && Math.random() < 0.25) loot.freeze = 1;
  d.coins += loot.coins; d.gems += loot.gems; d.daily.freezes += loot.freeze;
  return loot;
}
export const weeklyList = () => store.data.weekly.pick.map(id => WEEKLY.find(w => w.id === id)).filter(Boolean);
export const totalStars = () => STAGES.reduce((n, s) => n + (store.data.stages[s.id] || 0), 0);
export const stageUnlocked = id => id === 1 || (store.data.stages[id - 1] || 0) > 0;

/** Apply one finished run. Returns season XP gained and any tiers crossed. */
export function applyRun(run) {
  ensurePeriods();
  const d = store.data;
  for (const w of weeklyList()) d.weekly.prog[w.id] = (d.weekly.prog[w.id] || 0) + (run[w.key] || 0);
  for (const q of questList()) d.quests.prog[q.id] = (d.quests.prog[q.id] || 0) + (run[q.key] || 0);
  const wkr = d.week;
  wkr.fruits += run.fruits; wkr.stars += run.stars; wkr.games += 1; wkr.score += run.score; wkr.combo = Math.max(wkr.combo, run.combo || 0);
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
