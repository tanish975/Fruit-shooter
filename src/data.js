// Static game data: fruits, power-ups, modes, shop, missions.

export const FRUITS = [
  // id, base points, radius (world units), juice colour, level it unlocks at
  { id: 'apple', pts: 10, r: 34, juice: '#ff4d4d', lvl: 1 },
  { id: 'orange', pts: 12, r: 34, juice: '#ff9f1c', lvl: 1 },
  { id: 'watermelon', pts: 12, r: 42, juice: '#ff5c7a', lvl: 1 },
  { id: 'lemon', pts: 14, r: 31, juice: '#ffe14d', lvl: 1 },
  { id: 'pear', pts: 14, r: 33, juice: '#c9e265', lvl: 2 },
  { id: 'peach', pts: 15, r: 32, juice: '#ffb199', lvl: 2 },
  { id: 'banana', pts: 16, r: 31, juice: '#ffe66d', lvl: 2 },
  { id: 'mango', pts: 16, r: 33, juice: '#ffb627', lvl: 3 },
  { id: 'kiwi', pts: 18, r: 30, juice: '#9bd447', lvl: 3 },
  { id: 'grapes', pts: 20, r: 31, juice: '#a45cff', lvl: 3 },
  { id: 'strawberry', pts: 22, r: 27, juice: '#ff3355', lvl: 4 },
  { id: 'pineapple', pts: 24, r: 38, juice: '#ffd23f', lvl: 4 },
  { id: 'cherries', pts: 26, r: 27, juice: '#e0113c', lvl: 5 },
  { id: 'blueberries', pts: 28, r: 26, juice: '#5b7cff', lvl: 5 },
  { id: 'coconut', pts: 40, r: 34, juice: '#f4ede0', lvl: 4, hp: 2 },
];

export const SPECIALS = {
  star: { id: 'star', pts: 100, r: 28, juice: '#ffe14d', coins: 8 },
  gem: { id: 'gem', pts: 250, r: 22, juice: '#5ce1ff', coins: 20 },
  bomb: { id: 'bomb', r: 32, juice: '#2b2b33' },
  boss: { id: 'pumpkin', r: 76, juice: '#ff8a1f' },
};

export const POWERUPS = {
  triple: { icon: 'trident', name: 'Triple Shot', color: '#ff5c7a', dur: 8 },
  freeze: { icon: 'snowflake', name: 'Freeze', color: '#5ce1ff', dur: 6 },
  fire: { icon: 'fire', name: 'Blast Arrows', color: '#ff8a1f', dur: 8 },
  double: { icon: 'bolt', name: 'Double Points', color: '#ffd23f', dur: 10 },
  magnet: { icon: 'magnet', name: 'Magnet Arrows', color: '#c77dff', dur: 8 },
  // instant bonuses (mode specific)
  heart: { icon: 'heart', name: '+1 Life', color: '#ff4d6d', dur: 0 },
  time: { icon: 'hourglass', name: '+6 Seconds', color: '#7ee787', dur: 0 },
  quiver: { icon: 'bow', name: '+3 Arrows', color: '#7ee787', dur: 0 },
};

export const MODES = {
  stage: { id: 'stage', name: 'Adventure', icon: 'map', accent: '#a6f06a' },
  daily: { id: 'daily', name: 'Daily Challenge', icon: 'calendar', accent: '#ffd23f' },
  classic: {
    id: 'classic', name: 'Time Attack', icon: 'stopwatch',
    bonus: 'time', accent: '#ff8a1f',
  },
  survival: {
    id: 'survival', name: 'Survival', icon: 'heart',
    bonus: 'heart', accent: '#ff4d6d',
  },
  precision: {
    id: 'precision', name: 'Precision', icon: 'target',
    bonus: 'quiver', accent: '#5ce1ff',
  },
};

export const UPGRADES = [
  { id: 'power', icon: 'bow', name: 'Draw Strength', max: 5, base: 120 },
  { id: 'tips', icon: 'target', name: 'Broad Tips', max: 5, base: 150 },
  { id: 'sight', icon: 'gem', name: 'Eagle Sight', max: 4, base: 100 },
  { id: 'surge', icon: 'bolt', name: 'Power Surge', max: 5, base: 160 },
  { id: 'lucky', icon: 'clover', name: 'Lucky Clover', max: 5, base: 180 },
  { id: 'purse', icon: 'coin', name: 'Coin Purse', max: 5, base: 200 },
  { id: 'head', icon: 'heart', name: 'Head Start', max: 3, base: 400 },
];
export const upgradeCost = (u, lvl) => Math.round(u.base * Math.pow(1.75, lvl) / 10) * 10;

export const SKINS = [
  { id: 'oak', name: 'Oak Bow', cost: 0, wood: '#b9773a', wood2: '#7a4a21', grip: '#3d2a1a', trail: '#fff6e0', spark: '#ffe9b0' },
  { id: 'frost', name: 'Frostbite', cost: 400, wood: '#8fe3ff', wood2: '#3aa0d8', grip: '#17456b', trail: '#9cecff', spark: '#e0fbff' },
  { id: 'ember', name: 'Ember', cost: 700, wood: '#ff7a3c', wood2: '#b3261e', grip: '#3b0f0a', trail: '#ffb347', spark: '#ff5e3a' },
  { id: 'royal', name: 'Royal', cost: 1100, wood: '#b07cff', wood2: '#5b2ec4', grip: '#ffd23f', trail: '#e2c6ff', spark: '#ffd23f' },
  { id: 'neon', name: 'Neon Vine', cost: 1600, wood: '#b6ff3c', wood2: '#27b36a', grip: '#0d3b2a', trail: '#c8ff6b', spark: '#3cffb6' },
  { id: 'harvest', name: 'Harvest Moon', cost: -1, wood: '#ffd23f', wood2: '#c9560a', grip: '#5b2ec4', trail: '#fff3a0', spark: '#ffd23f' }, // season reward
];

// Missions read from lifetime stats. `get` returns current progress.
export const MISSIONS = [
  { id: 'm_fruit1', icon: 'apple', name: 'Fruit Salad', goal: 100, reward: 100, get: s => s.fruits },
  { id: 'm_fruit2', icon: 'pineapple', name: 'Orchard Legend', goal: 1000, reward: 500, get: s => s.fruits },
  { id: 'm_perf', icon: 'target', name: 'Sharpshooter', goal: 50, reward: 150, get: s => s.perfects },
  { id: 'm_combo1', icon: 'fire', name: 'On a Roll', goal: 15, reward: 100, get: s => s.bestCombo },
  { id: 'm_combo2', icon: 'crown', name: 'Unstoppable', goal: 40, reward: 400, get: s => s.bestCombo },
  { id: 'm_skew1', icon: 'cherries', name: 'Kebab', goal: 3, reward: 150, get: s => s.bestSkewer },
  { id: 'm_skew2', icon: 'trident', name: 'Shish King', goal: 5, reward: 500, get: s => s.bestSkewer },
  { id: 'm_boss', icon: 'pumpkin', name: 'Pumpkin Smasher', goal: 1, reward: 200, get: s => s.bosses },
  { id: 'm_fever', icon: 'bolt', name: 'Fever Dream', goal: 10, reward: 200, get: s => s.fevers },
  { id: 'm_classic', icon: 'stopwatch', name: 'Beat the Clock', goal: 1500, reward: 200, get: (s, b) => b.classic },
  { id: 'm_survival', icon: 'heart', name: 'Survivor', goal: 2500, reward: 300, get: (s, b) => b.survival },
  { id: 'm_precision', icon: 'gem', name: 'Deadeye', goal: 1200, reward: 300, get: (s, b) => b.precision },
  { id: 'm_stars', icon: 'map', name: 'Explorer', goal: 30, reward: 400, get: s => s.stars || 0 },
  { id: 'm_allboss', icon: 'crown', name: 'Giant Slayer', goal: 10, reward: 500, get: s => s.bosses },
];

export const DAILY = [50, 75, 100, 125, 150, 200, 300];

// Sky themes cycle as the level climbs.
export const THEMES = [
  { name: 'day', sky: ['#2f8fff', '#7cc8ff', '#d6f3ff'], sun: '#fff7c2', sunY: 0.2, hills: ['#7ccf5a', '#4fae45', '#2f8a3a'], ground: '#256e33', cloud: 'rgba(255,255,255,0.9)', stars: 0 },
  { name: 'dusk', sky: ['#2a1560', '#b83b7c', '#ff9b4a'], sun: '#ffd08a', sunY: 0.52, hills: ['#6b3f8f', '#4a2a73', '#2f1a52'], ground: '#22113f', cloud: 'rgba(255,190,170,0.55)', stars: 0.25 },
  { name: 'night', sky: ['#050a26', '#141a52', '#34307a'], sun: '#e9efff', sunY: 0.16, hills: ['#243469', '#182450', '#0f1838'], ground: '#0a102b', cloud: 'rgba(150,165,230,0.25)', stars: 1 },
  { name: 'dawn', sky: ['#5b6fd6', '#ff9e8a', '#ffe1a8'], sun: '#fff1c9', sunY: 0.5, hills: ['#7fb86a', '#4f9655', '#2f6f45'], ground: '#235237', cloud: 'rgba(255,235,220,0.8)', stars: 0.1 },
];

// Arrow types: pick one before a run. Each has a trade-off.
export const ARROWS = [
  { id: 'std', name: 'Classic', icon: 'bow', cost: 0, color: '#e8eef5' },
  { id: 'fire', name: 'Blast', icon: 'fire', cost: 600, color: '#ff8a1f' },
  { id: 'ice', name: 'Frost', icon: 'ice', cost: 600, color: '#9cecff' },
  { id: 'split', name: 'Splitter', icon: 'trident', cost: 900, color: '#ff5c7a' },
  { id: 'bounce', name: 'Ricochet', icon: 'comet', cost: 900, color: '#c77dff' },
];

export const BOSSES = [
  { id: 'pumpkin', name: 'KING PUMPKIN', img: 'pumpkin', r: 76, ability: 'bombs', juice: '#ff8a1f' },
  { id: 'coco', name: 'COCO GOLEM', img: 'coconut', r: 70, ability: 'orbit', juice: '#c9a27a' },
  { id: 'melon', name: 'MELON QUEEN', img: 'watermelon', r: 64, ability: 'dash', juice: '#ff5c7a' },
  { id: 'pine', name: 'STORM KING', img: 'pineapple', r: 74, ability: 'storm', juice: '#ffd23f' },
];

// ---- Adventure: 40 stages in 4 worlds. Same layout every attempt (seeded). ----
export const WORLDS = [
  { name: 'Sunny Orchard', theme: 0, mods: [] },
  { name: 'Windy Dusk', theme: 1, mods: ['wind', 'bird'] },
  { name: 'Moonlit Grove', theme: 2, mods: ['shield', 'dodge'] },
  { name: 'Dawn Summit', theme: 3, mods: ['wind', 'bird', 'shield', 'dodge'] },
];
const SHAPES = [
  // goal type, limit kind, base amount, growth per world
  ['fruits', 'time', 45, 12, 4], ['score', 'arrows', 12, 0, 0], ['perfect', 'time', 50, 3, 1], ['skewer', 'arrows', 14, 2, 1],
  ['score', 'time', 45, 0, 0], ['combo', 'time', 50, 8, 3], ['fruits', 'arrows', 15, 9, 2], ['score', 'time', 45, 0, 0],
  ['score', 'time', 60, 0, 0], ['boss', 'time', 75, 1, 0],
];
export const STAGES = [];
for (let w = 0; w < 4; w++) for (let i = 0; i < 10; i++) {
  const [goal, limit, amount, n, grow] = SHAPES[i];
  const base = Math.round((260 + w * 110 + i * 28) * (limit === 'arrows' ? 0.7 : 1) * (amount / 45 > 1.2 ? 1.3 : 1) / 10) * 10;
  const mods = [...WORLDS[w].mods];
  if (i >= 3) mods.push('balloon');
  if (i === 7) mods.push('bombs');
  STAGES.push({
    id: w * 10 + i + 1, world: w, goal, n: goal === 'score' ? base : n + grow * w,
    time: limit === 'time' ? amount : 0, arrows: limit === 'arrows' ? amount + (goal === 'fruits' ? 0 : w) : 0,
    lvl: 1 + w * 2 + Math.floor(i / 3), mods, boss: goal === 'boss' ? w : -1,
    stars: goal === 'score' ? [base, Math.round(base * 1.6 / 10) * 10, Math.round(base * 2.4 / 10) * 10] : [0, base, Math.round(base * 1.7 / 10) * 10],
  });
}

// Weekly missions: three are drawn each week from this pool. `key` is a per-run counter.
export const WEEKLY = [
  { id: 'w_fruits', icon: 'apple', key: 'fruits', goal: 250, reward: 200 },
  { id: 'w_perf', icon: 'target', key: 'perfects', goal: 40, reward: 250 },
  { id: 'w_skew', icon: 'cherries', key: 'skewers', goal: 20, reward: 250 },
  { id: 'w_boss', icon: 'pumpkin', key: 'bosses', goal: 3, reward: 300 },
  { id: 'w_fever', icon: 'bolt', key: 'fevers', goal: 8, reward: 200 },
  { id: 'w_stars', icon: 'star', key: 'stars', goal: 9, reward: 300 },
  { id: 'w_games', icon: 'bow', key: 'games', goal: 15, reward: 150 },
  { id: 'w_score', icon: 'trophy', key: 'score', goal: 12000, reward: 250 },
];

// Season track: XP from every run, one reward per tier, resets each month.
export const SEASON = { tiers: 20, xpPerTier: 250, coins: t => (t === 20 ? 1000 : 60 + t * 10), skinTier: 10, skin: 'harvest' };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
