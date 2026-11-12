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
  classic: {
    id: 'classic', name: 'Time Attack', icon: 'stopwatch', tag: '60 seconds',
    desc: 'Score as much as you can before the clock runs out.',
    bonus: 'time', accent: '#ff8a1f',
  },
  survival: {
    id: 'survival', name: 'Survival', icon: 'heart', tag: '3 lives',
    desc: 'Every fruit that falls costs a life. How long can you last?',
    bonus: 'heart', accent: '#ff4d6d',
  },
  precision: {
    id: 'precision', name: 'Precision', icon: 'target', tag: '15 arrows',
    desc: 'Limited quiver. Perfect hits and skewers win arrows back.',
    bonus: 'quiver', accent: '#5ce1ff',
  },
};

export const UPGRADES = [
  { id: 'power', icon: 'bow', name: 'Draw Strength', desc: 'Arrows fly faster and flatter', max: 5, base: 120, unit: '+6% speed' },
  { id: 'tips', icon: 'target', name: 'Broad Tips', desc: 'Wider arrowheads hit more easily', max: 5, base: 150, unit: '+7% hit area' },
  { id: 'sight', icon: 'gem', name: 'Eagle Sight', desc: 'Longer aiming guide', max: 4, base: 100, unit: '+25% guide' },
  { id: 'surge', icon: 'bolt', name: 'Power Surge', desc: 'Power-ups last longer', max: 5, base: 160, unit: '+12% time' },
  { id: 'lucky', icon: 'clover', name: 'Lucky Clover', desc: 'More power-ups and golden stars', max: 5, base: 180, unit: '+10% luck' },
  { id: 'purse', icon: 'coin', name: 'Coin Purse', desc: 'Earn more coins every run', max: 5, base: 200, unit: '+15% coins' },
  { id: 'head', icon: 'heart', name: 'Head Start', desc: '+1 life, +5 seconds, +2 arrows', max: 3, base: 400, unit: 'bonus start' },
];
export const upgradeCost = (u, lvl) => Math.round(u.base * Math.pow(1.75, lvl) / 10) * 10;

export const SKINS = [
  { id: 'oak', name: 'Oak Bow', cost: 0, wood: '#b9773a', wood2: '#7a4a21', grip: '#3d2a1a', trail: '#fff6e0', spark: '#ffe9b0' },
  { id: 'frost', name: 'Frostbite', cost: 400, wood: '#8fe3ff', wood2: '#3aa0d8', grip: '#17456b', trail: '#9cecff', spark: '#e0fbff' },
  { id: 'ember', name: 'Ember', cost: 700, wood: '#ff7a3c', wood2: '#b3261e', grip: '#3b0f0a', trail: '#ffb347', spark: '#ff5e3a' },
  { id: 'royal', name: 'Royal', cost: 1100, wood: '#b07cff', wood2: '#5b2ec4', grip: '#ffd23f', trail: '#e2c6ff', spark: '#ffd23f' },
  { id: 'neon', name: 'Neon Vine', cost: 1600, wood: '#b6ff3c', wood2: '#27b36a', grip: '#0d3b2a', trail: '#c8ff6b', spark: '#3cffb6' },
];

// Missions read from lifetime stats. `get` returns current progress.
export const MISSIONS = [
  { id: 'm_fruit1', icon: 'apple', name: 'Fruit Salad', desc: 'Hit 100 fruits', goal: 100, reward: 100, get: s => s.fruits },
  { id: 'm_fruit2', icon: 'pineapple', name: 'Orchard Legend', desc: 'Hit 1,000 fruits', goal: 1000, reward: 500, get: s => s.fruits },
  { id: 'm_perf', icon: 'target', name: 'Sharpshooter', desc: 'Land 50 perfect hits', goal: 50, reward: 150, get: s => s.perfects },
  { id: 'm_combo1', icon: 'fire', name: 'On a Roll', desc: 'Reach a 15 combo', goal: 15, reward: 100, get: s => s.bestCombo },
  { id: 'm_combo2', icon: 'crown', name: 'Unstoppable', desc: 'Reach a 40 combo', goal: 40, reward: 400, get: s => s.bestCombo },
  { id: 'm_skew1', icon: 'cherries', name: 'Kebab', desc: 'Skewer 3 fruits with one arrow', goal: 3, reward: 150, get: s => s.bestSkewer },
  { id: 'm_skew2', icon: 'trident', name: 'Shish King', desc: 'Skewer 5 fruits with one arrow', goal: 5, reward: 500, get: s => s.bestSkewer },
  { id: 'm_boss', icon: 'pumpkin', name: 'Pumpkin Smasher', desc: 'Defeat King Pumpkin', goal: 1, reward: 200, get: s => s.bosses },
  { id: 'm_fever', icon: 'bolt', name: 'Fever Dream', desc: 'Trigger Fever 10 times', goal: 10, reward: 200, get: s => s.fevers },
  { id: 'm_classic', icon: 'stopwatch', name: 'Beat the Clock', desc: 'Score 1,500 in Time Attack', goal: 1500, reward: 200, get: (s, b) => b.classic },
  { id: 'm_survival', icon: 'heart', name: 'Survivor', desc: 'Score 2,500 in Survival', goal: 2500, reward: 300, get: (s, b) => b.survival },
  { id: 'm_precision', icon: 'gem', name: 'Deadeye', desc: 'Score 1,200 in Precision', goal: 1200, reward: 300, get: (s, b) => b.precision },
];

export const DAILY = [50, 75, 100, 125, 150, 200, 300];

// Sky themes cycle as the level climbs.
export const THEMES = [
  { name: 'day', sky: ['#2f8fff', '#7cc8ff', '#d6f3ff'], sun: '#fff7c2', sunY: 0.2, hills: ['#7ccf5a', '#4fae45', '#2f8a3a'], ground: '#256e33', cloud: 'rgba(255,255,255,0.9)', stars: 0 },
  { name: 'dusk', sky: ['#2a1560', '#b83b7c', '#ff9b4a'], sun: '#ffd08a', sunY: 0.52, hills: ['#6b3f8f', '#4a2a73', '#2f1a52'], ground: '#22113f', cloud: 'rgba(255,190,170,0.55)', stars: 0.25 },
  { name: 'night', sky: ['#050a26', '#141a52', '#34307a'], sun: '#e9efff', sunY: 0.16, hills: ['#243469', '#182450', '#0f1838'], ground: '#0a102b', cloud: 'rgba(150,165,230,0.25)', stars: 1 },
  { name: 'dawn', sky: ['#5b6fd6', '#ff9e8a', '#ffe1a8'], sun: '#fff1c9', sunY: 0.5, hills: ['#7fb86a', '#4f9655', '#2f6f45'], ground: '#235237', cloud: 'rgba(255,235,220,0.8)', stars: 0.1 },
];
