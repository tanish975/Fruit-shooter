// ============================================================================
// Fruit Archer - Ultimate Unified v7.0
// ============================================================================

const CONFIG = {
  GAME: {
    WIDTH: 1000,
    HEIGHT: 500,
    FPS: 60,
    INITIAL_LIVES: 3,
    CLASSIC_TIME: 90,
    DIFFICULTY_INCREASE_INTERVAL: 20000,
    WIND_CHANGE_INTERVAL: 10000
  },
  PHYSICS: {
    GRAVITY: 0.08,
    AIR_RESISTANCE: 0.998,
    WIND_EFFECT: 0.05,
    ARROW_SPEED: 25,
    MIN_ARROW_SPEED: 15,
    MAX_ARROW_SPEED: 35,
    MIN_DRAW_TIME: 0.1,
    MAX_DRAW_TIME_EFFECTIVE: 2.0,
    FRUIT_ROTATION_SPEED: 0.03
  },
  FRUITS: {
    TYPES: [
      { type: 'apple', emoji: '🍎', color: '#e74c3c', points: 10, speed: 0.012, radius: 25, juiceColor: '#c0392b' },
      { type: 'orange', emoji: '🍊', color: '#e67e22', points: 15, speed: 0.015, radius: 28, juiceColor: '#d35400' },
      { type: 'watermelon', emoji: '🍉', color: '#2ecc71', points: 20, speed: 0.01, radius: 35, juiceColor: '#27ae60' },
      { type: 'banana', emoji: '🍌', color: '#f1c40f', points: 25, speed: 0.018, radius: 22, juiceColor: '#f39c12' },
      { type: 'strawberry', emoji: '🍓', color: '#ff6b6b', points: 30, speed: 0.02, radius: 20, juiceColor: '#e74c3c' },
      { type: 'grape', emoji: '🍇', color: '#9b59b6', points: 35, speed: 0.016, radius: 18, juiceColor: '#8e44ad' }
    ],
    RARE_TYPES: [
      { type: 'golden_apple', emoji: '🌟', color: '#ffd700', points: 100, speed: 0.006, radius: 30, juiceColor: '#f1c40f', rare: true },
      { type: 'dragon_fruit', emoji: '🐉', color: '#ff4757', points: 80, speed: 0.008, radius: 32, juiceColor: '#e84118', rare: true }
    ],
    BOSS: {
      type: 'fruit_boss',
      emoji: '🎃',
      color: '#ff7518',
      pointsOnDefeat: 500,
      pointsPerHit: 50,
      speed: 0.006,
      radius: 60,
      health: 8,
      bonusTime: 20,
      juiceColor: '#e67e22'
    }
  },
  TARGET: {
    RADIUS: 22,
    BASE_X: 800,
    BASE_Y: 250,
    TYPES: [
      { type: 'normal', color: 'red', points: 10, speed: 0.015 },
      { type: 'fast', color: 'blue', points: 20, speed: 0.03 },
      { type: 'bonus', color: 'gold', points: 50, speed: 0.012, bonusTime: 5 }
    ],
    BOSS: {
      type: 'boss',
      color: 'purple',
      pointsOnDefeat: 100,
      pointsPerHit: 30,
      speed: 0.012,
      radius: 60,
      health: 10,
      bonusTime: 15
    }
  },
  POWER_UPS: {
    TYPES: [
      { type: 'multishot', color: '#ff6b6b', duration: 5000 },
      { type: 'rapidfire', color: '#4ecdc4', duration: 5000 },
      { type: 'piercing', color: '#45b7d1', duration: 5000 },
      { type: 'explosive', color: '#f9ca24', duration: 3000 },
      { type: 'slowmotion', color: '#9b59b6', duration: 4000 },
      { type: 'doublepoints', color: '#f1c40f', duration: 6000 },
      { type: 'shield', color: '#2ecc71', duration: 8000 },
      { type: 'autoaim', color: '#e74c3c', duration: 3000 }
    ],
    SPAWN_CHANCE: 0.03,
    MAX_ACTIVE: 3
  },
  WEATHER: {
    TYPES: ['clear', 'rain', 'wind'],
    DURATION_MIN: 5,
    DURATION_MAX: 15
  },
  PATTERNS: ['sine_vertical', 'sine_horizontal', 'circle', 'zigzag', 'diagonal', 'boss'],
  COLORS: {
    SKY_NIGHT_TOP: [15, 23, 42],    // #0f172a
    SKY_NIGHT_BOTTOM: [2, 6, 23],  // #020617
    SKY_DAY_TOP: [135, 206, 235],  // #87CEEB
    SKY_DAY_BOTTOM: [176, 224, 230], // #B0E0E6
    SKY_SUNSET_TOP: [255, 112, 67], // #FF7043
    SKY_SUNSET_BOTTOM: [255, 171, 145] // #FFAB91
  }
};

const Utils = {
  random: (min, max) => Math.random() * (max - min) + min,
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  clamp: (v, min, max) => Math.min(Math.max(v, min), max),
  throttle: (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (!timeoutId) {
        timeoutId = setTimeout(() => { func(...args); timeoutId = null; }, delay);
      }
    };
  },
  hexToRgb: (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  },
  rgbToHex: (r, g, b) => '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1),
  interpolateRgb: (rgb1, rgb2, factor) => {
    const result = [];
    for (let i = 0; i < 3; i++) {
      result[i] = Math.round(rgb1[i] + factor * (rgb2[i] - rgb1[i]));
    }
    return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
  }
};

function playSound(name) {
  try {
    const el = document.getElementById(`${name}Sound`);
    if (!el) return;
    const sound = el.cloneNode();
    sound.volume = 0.5;
    sound.play().catch(() => { });
  } catch (e) { }
}

class ObjectPool {
  constructor(createFn, resetFn, maxSize = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.maxSize = maxSize;
  }
  get() { return this.pool.pop() || this.createFn(); }
  release(obj) { if (this.pool.length < this.maxSize) { this.resetFn(obj); this.pool.push(obj); } else if (obj.remove) obj.remove(); }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.container = document.getElementById("particleContainer"); // Get the container created in index.html
  }
  create(x, y, color) {
    const p = {
      x, y,
      vx: Utils.random(-5, 5), // More controlled initial velocity
      vy: Utils.random(-5, 5),
      life: Utils.random(0.5, 1.0), // Randomize initial life
      color,
      element: document.createElementNS("http://www.w3.org/2000/svg", "circle"), // SVG element for particle
      gravity: 0.1, // Add gravity for particles
      drag: 0.98 // Add drag for particles
    };
    p.element.setAttribute('r', Utils.random(2, 5)); // Random size
    p.element.setAttribute('fill', p.color);
    p.element.setAttribute('opacity', p.life);
    this.container.appendChild(p.element); // Append to particle container
    this.particles.push(p);
  }
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity; // Apply gravity

      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02; // Decrease life

      if (p.life <= 0) {
        p.element.remove(); // Remove SVG element
        this.particles.splice(i, 1); // Remove from array
      } else {
        p.element.setAttribute('cx', p.x);
        p.element.setAttribute('cy', p.y);
        p.element.setAttribute('opacity', p.life);
      }
    }
  }
}

class WeatherSystem {
  constructor() {
    this.activeRain = [];
    this.activeDust = [];
  }
  createRain() { this.activeRain.push({ x: Math.random() * 1000, y: -20, speed: Math.random() * 5 + 5 }); }
  createDust() { this.activeDust.push({ x: 1000, y: Math.random() * 500, speed: Math.random() * 2 + 1 }); }
  update() {
    this.activeRain.forEach(p => p.y += p.speed);
    this.activeRain = this.activeRain.filter(p => p.y < 500);
    this.activeDust.forEach(p => p.x -= p.speed);
    this.activeDust = this.activeDust.filter(p => p.x > 0);
  }
  clear() { this.activeRain = []; this.activeDust = []; }
}

class PowerUpSystem {
  constructor() {
    this.powerUps = [];
    this.activePowerUps = [];
    this.onCollect = null; // Callback for when powerup is collected
  }
  spawn() {
    if (Math.random() < CONFIG.POWER_UPS.SPAWN_CHANCE && this.powerUps.length < CONFIG.POWER_UPS.MAX_ACTIVE) {
      const type = CONFIG.POWER_UPS.TYPES[Utils.randomInt(0, CONFIG.POWER_UPS.TYPES.length - 1)];
      const p = { x: Utils.random(200, 800), y: Utils.random(100, 400), ...type, active: true };
      const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      el.setAttribute('cx', p.x); el.setAttribute('cy', p.y); el.setAttribute('r', 15);
      el.setAttribute('fill', p.color); el.setAttribute('class', 'power-up');
      document.querySelector('svg#game')?.appendChild(el);
      p.element = el;
      this.powerUps.push(p);
    }
  }
  update() {
    this.activePowerUps = this.activePowerUps.filter(p => (Date.now() - p.startTime) < p.duration);
  }
  checkCollision(x, y) {
    this.powerUps.forEach(p => {
      if (p.active && Utils.distance(x, y, p.x, p.y) < 30) {
        p.active = false; p.element.remove();
        const newPowerUp = { type: p.type, startTime: Date.now(), duration: p.duration };
        this.activePowerUps.push(newPowerUp);
        // Call the callback if set
        if (this.onCollect) this.onCollect(p.type);
      }
    });
  }
  has(type) { return this.activePowerUps.some(p => p.type === type); }
  clear() { this.powerUps.forEach(p => p.element?.remove()); this.powerUps = []; this.activePowerUps = []; }
}

class ScenerySystem {
  constructor(container) {
    this.container = container;
    this.clouds = [];
  }
  init() {
    this.container.innerHTML = '';
    const ground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    ground.setAttribute('x', '0'); ground.setAttribute('y', '400');
    ground.setAttribute('width', '1000'); ground.setAttribute('height', '100');
    ground.setAttribute('fill', '#1a2e1a');
    this.container.appendChild(ground);

    for (let i = 0; i < 4; i++) {
      const pillar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      pillar.setAttribute('x', 150 + i * 250); pillar.setAttribute('y', 50);
      pillar.setAttribute('width', '50'); pillar.setAttribute('height', '350');
      pillar.setAttribute('fill', '#334155'); pillar.setAttribute('opacity', '0.4');
      this.container.appendChild(pillar);
    }
  }
  spawnCloud() { this.clouds.push({ x: -100, y: Math.random() * 100, speed: Math.random() * 0.5 + 0.2 }); }
  update() {
    if (Math.random() < 0.005) this.spawnCloud();
    this.clouds.forEach(c => c.x += c.speed);
    this.clouds = this.clouds.filter(c => c.x < 1100);
  }
}

class GameState {
  constructor() {
    this.reset('classic');
    this.permanentUpgrades = new Set();
    this.timeScale = 1.0;
    this.timeScaleTarget = 1.0;
  }
  reset(mode = 'classic') {
    this.mode = mode;
    this.lives = CONFIG.GAME.INITIAL_LIVES;
    this.score = 0; this.combo = 0; this.level = 1; this.coins = 0;
    this.gameOver = false; this.isDrawing = false; this.isPaused = false; // Add isPaused
    this.isMuted = false; // Add isMuted
    this.drawStartTime = 0; this.aimAngle = 0; this.sway = 0;
    this.lastBullseyeAngle = null; this.delayedArrows = [];
    this.bossActive = false; this.nextBossAt = 200;
    this.bossCorePos = { x: 0, y: 0 }; this.bossCorePhase = 0;
    this.wind = 0; this.lastWindChangeTime = 0; this.timeOfDay = 0; this.currentWeather = 'clear';
    this.timeLeft = (mode === 'classic') ? 90 : Infinity;
    this.arrowsLeft = (mode === 'precision') ? 10 : Infinity;
    this.achievements = new Set();
    this.currentPattern = 'vertical';
  }
}

class GameEngine {
  constructor() {
    this.state = new GameState();
    this.weather = new WeatherSystem();
    this.powerUps = new PowerUpSystem();
    // Set up powerup collection callback
    this.powerUps.onCollect = (type) => {
      const powerUpMessages = {
        'multishot': '🏹 MULTISHOT!',
        'rapidfire': '⚡ RAPIDFIRE!',
        'piercing': '🎯 PIERCING!',
        'explosive': '💥 EXPLOSIVE!',
        'slowmotion': '⏱️ SLOWMOTION!',
        'doublepoints': '✨ 2X POINTS!',
        'shield': '🛡️ SHIELD!',
        'autoaim': '🎯 AUTO-AIM!'
      };
      this.showMessage(powerUpMessages[type] || '⚡ POWERUP!');
      this.updateUI();
    };
    this.particles = new ParticleSystem();
    this.elements = {};
    this.activeArrows = [];
    this.target = { x: 800, y: 250, radius: 22, health: 1, maxHealth: 1, type: CONFIG.TARGET.TYPES[0] };
    this.targetPhase = 0;
    this.cacheElements();
    this.scenery = new ScenerySystem(this.elements.scenery);
    this.init();
  }

  cacheElements() {
    const ids = ['lives', 'arrows', 'score', 'combo', 'timer', 'message', 'restartBtn', 'themeBtn', 'leaderboardList', 'target', 'arrowGroup', 'game', 'bossHealthFill', 'mainMenu', 'ui', 'bossHealthContainer', 'scenery', 'trajectoryGroup', 'bossCore', 'memoryStatus', 'level', 'coins', 'wind', 'shopBtn', 'shopMenu', 'closeShop', 'windArrow', 'achievementPopup', 'achievementTitle', 'achievementDesc', 'gameOverScreen', 'finalScore', 'finalCombo', 'highScoreList', 'playAgainBtn', 'drawSound', 'whooshSound', 'arrowTrailContainer', 'pauseMenu', 'resumeBtn', 'restartGameBtn', 'settingsBtn', 'settingsMenu', 'soundToggle', 'closeSettingsBtn', 'particleContainer', 'activePowerUps'];
    ids.forEach(id => this.elements[id] = document.getElementById(id));
  }

  init() {
    this.bindEvents();
    this.scenery.init();
    this.showMainMenu();
  }

  bindEvents() {
    this.elements.shopBtn?.addEventListener('click', () => { this.elements.shopMenu.style.display = 'flex'; this.elements.ui.style.display = 'none'; });
    this.elements.closeShop?.addEventListener('click', () => { this.elements.shopMenu.style.display = 'none'; if (this.isInGame()) this.elements.ui.style.display = 'flex'; else this.elements.mainMenu.style.display = 'flex'; });
    this.elements.restartBtn?.addEventListener('click', () => { this.state.gameOver = false; this.showMainMenu(); });
    this.elements.themeBtn?.addEventListener('click', () => document.body.classList.toggle('dark'));

    // Main Menu Buttons
    this.elements.mainMenu?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mode]');
      if (btn) this.startGame(btn.dataset.mode);
    });

    // Shop Menu Buttons
    this.elements.shopMenu?.addEventListener('click', (e) => {
      const item = e.target.closest('.shop-item');
      if (item) this.buyUpgrade(item.dataset.upgrade, parseInt(item.dataset.price));
    });

    // Pause/Resume/Settings Buttons
    this.elements.resumeBtn?.addEventListener('click', () => this.togglePause(false));
    this.elements.restartGameBtn?.addEventListener('click', () => { this.togglePause(false); this.startGame('classic'); }); // Restart with default mode for now
    this.elements.settingsBtn?.addEventListener('click', () => {
      this.elements.pauseMenu.style.display = 'none';
      this.elements.settingsMenu.style.display = 'flex';
      this.elements.soundToggle.checked = !this.state.isMuted; // Reflect current mute state
    });
    this.elements.closeSettingsBtn?.addEventListener('click', () => {
      this.elements.settingsMenu.style.display = 'none';
      this.elements.pauseMenu.style.display = 'flex';
    });
    this.elements.soundToggle?.addEventListener('change', (e) => this.toggleSound(e.target.checked));


    document.addEventListener('keydown', e => {
      if (e.code === 'KeyR' && this.isInGame()) this.fireMemoryArrow();
      if (e.code === 'KeyD' && this.isInGame()) this.releaseDelayedArrows();
      if (e.code === 'Space' && this.isInGame()) { e.preventDefault(); this.shoot(); }
      if (e.code === 'Escape' && !this.state.gameOver) { this.togglePause(); } // Toggle pause on Esc
    });

    if (this.elements.game) {
      this.elements.game.addEventListener('mousemove', e => this.handleMouseMove(e));
      this.elements.game.addEventListener('mousedown', () => { if (this.isInGame()) { this.state.isDrawing = true; this.state.drawStartTime = Date.now(); this.elements.drawSound.play().catch(e => console.log("Draw sound play failed:", e)); } });
      this.elements.game.addEventListener('mouseup', () => { if (this.state.isDrawing) this.shoot(); this.state.isDrawing = false; });
    }
  }

  startGame(mode) {
    this.state.reset(mode);
    this.activeArrows = [];
    this.elements.mainMenu.style.display = 'none';
    this.elements.ui.style.display = 'flex';
    this.updateUI();
    this.spawnTarget();
    this.gameLoop();
  }

  isInGame() { return !this.state.gameOver && this.elements.ui?.style.display === 'flex'; }

  showMainMenu() {
    this.elements.ui.style.display = 'none';
    this.elements.mainMenu.style.display = 'flex';
    this.elements.shopMenu.style.display = 'none';
  }

  shoot() {
    if (this.state.gameOver) return;

    // Check for rapidfire - allows immediate re-shoot without full draw
    const hasRapidFire = this.powerUps.has('rapidfire');
    
    // Stop draw sound
    if (this.state.isDrawing) {
      this.elements.drawSound.pause();
      this.elements.drawSound.currentTime = 0;
    }

    let drawTime = 0;
    if (this.state.isDrawing) {
      drawTime = (Date.now() - this.state.drawStartTime) / 1000;
      if (drawTime > 4.0) {
        this.showMessage("Misfire! Arms Fatigued.");
        this.state.isDrawing = false;
        this.elements.drawSound.pause();
        this.elements.drawSound.currentTime = 0;
        return;
      }
    }

    // Calculate arrow speed based on drawTime
    let arrowSpeed = CONFIG.PHYSICS.MIN_ARROW_SPEED;
    if (drawTime > CONFIG.PHYSICS.MIN_DRAW_TIME) {
        const powerRatio = Utils.clamp((drawTime - CONFIG.PHYSICS.MIN_DRAW_TIME) / (CONFIG.PHYSICS.MAX_DRAW_TIME_EFFECTIVE - CONFIG.PHYSICS.MIN_DRAW_TIME), 0, 1);
        arrowSpeed = CONFIG.PHYSICS.MIN_ARROW_SPEED + (CONFIG.PHYSICS.MAX_ARROW_SPEED - CONFIG.PHYSICS.MIN_ARROW_SPEED) * powerRatio;
    }

    if (this.state.arrowsLeft !== Infinity) {
      if (this.state.arrowsLeft <= 0) {
        // Precision mode - game ends when arrows run out
        if (this.state.mode === 'precision') {
          this.showMessage("Out of Arrows!");
          this.endGame();
        }
        return;
      }
      this.state.arrowsLeft--;
      if (this.state.arrowsLeft === 0 && this.state.mode === 'precision') {
        // Show message that this was the last arrow
        this.showMessage("Last Arrow!");
        // Give a small delay before ending game to let the shot complete
        setTimeout(() => {
          if (!this.state.gameOver) this.endGame();
        }, 1500);
      }
    }

    const angles = [0];
    if (this.powerUps.has('multishot')) angles.push(-0.1, 0.1);

    // Use current aim angle or default to straight
    let angle = this.state.aimAngle || 0;
    
    // Auto-aim powerup: automatically aim at target
    if (this.powerUps.has('autoaim') && this.target) {
      angle = Math.atan2(this.target.y - 250, this.target.x - 100);
      this.showMessage("🎯 Auto-Aim Active!");
    }
    
    angles.forEach(offset => {
      const finalAngle = angle + offset;
      const visual = this.elements.arrowGroup.cloneNode(true);
      visual.style.display = 'block';
      this.elements.game.appendChild(visual);

      const arrow = {
        x: 100, y: 250,
        dx: Math.cos(finalAngle) * arrowSpeed,
        dy: Math.sin(finalAngle) * arrowSpeed,
        hit: false, element: visual, bounces: 0,
        isDelayed: this.state.isDrawing && drawTime > 2.5,
        isExplosive: this.powerUps.has('explosive'),
        isPiercing: this.powerUps.has('piercing')
      };

      this.activeArrows.push(arrow);
      if (arrow.isDelayed) { this.state.delayedArrows.push(arrow); this.showMessage("Trap Set!"); }
    });

    this.state.isDrawing = false;
    this.updateUI();
    playSound('shoot');
    playSound('whoosh');
    
    // Rapidfire: if active, allow immediate shot by resetting draw state
    if (hasRapidFire) {
      this.state.isDrawing = false;
    }
  }

  handleMouseMove(e) {
    if (!this.elements.game) return;
    const rect = this.elements.game.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 500;

    let baseAngle = Math.atan2(y - 250, x - 100);
    let swayPower = (this.state.lives === 1) ? 0.08 : 0;

    const drawTime = (Date.now() - this.state.drawStartTime) / 1000;
    let windowStart = 1.0;
    let windowEnd = this.state.permanentUpgrades.has('focus') ? 2.6 : 1.8;
    let isFocused = this.state.isDrawing && drawTime >= windowStart && drawTime <= windowEnd;

    if (this.state.isDrawing) {
      // Adjust draw sound pitch based on draw time (e.g., 1.0 to 2.0)
      this.elements.drawSound.playbackRate = Utils.clamp(1.0 + drawTime / CONFIG.PHYSICS.MAX_DRAW_TIME_EFFECTIVE, 1.0, 2.0);
    }

    if (isFocused) swayPower = 0;
    else if (this.state.isDrawing && drawTime > 2.0) swayPower += (drawTime - 2.0) * 0.1;

    this.state.sway = Math.sin(Date.now() / 200) * swayPower;
    this.state.aimAngle = baseAngle + this.state.sway;

    if (this.elements.arrowGroup) {
      const deg = this.state.aimAngle * 180 / Math.PI;
      this.elements.arrowGroup.setAttribute('transform', `translate(100,250) rotate(${deg})`);
      this.elements.arrowGroup.style.filter = isFocused ? 'brightness(2) drop-shadow(0 0 5px gold)' : 'none';
    }

    if (this.state.isDrawing) this.renderTrajectory();
    else this.elements.trajectoryGroup.innerHTML = '';

    // Recovery
    this.activeArrows.forEach(a => {
      if (a.hit && this.state.mode === 'precision' && Utils.distance(x, y, a.x, a.y) < 40) {
        this.state.arrowsLeft++; this.showMessage("+1 Arrow!"); a.element.remove(); a.expired = true;
      }
    });
    this.activeArrows = this.activeArrows.filter(a => !a.expired);
    this.updateUI();
  }

  renderTrajectory() {
    this.elements.trajectoryGroup.innerHTML = '';
    let px = 100, py = 250;
    // Use higher speed for trajectory preview to show actual arrow path
    let vvx = Math.cos(this.state.aimAngle) * CONFIG.PHYSICS.MAX_ARROW_SPEED * 1.2;
    let vvy = Math.sin(this.state.aimAngle) * CONFIG.PHYSICS.MAX_ARROW_SPEED * 1.2;

    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 2; j++) {
        vvy += CONFIG.PHYSICS.GRAVITY;
        vvx += this.state.wind * CONFIG.PHYSICS.WIND_EFFECT;
        vvx *= CONFIG.PHYSICS.AIR_RESISTANCE;
        vvy *= CONFIG.PHYSICS.AIR_RESISTANCE;
        px += vvx; py += vvy;
      }
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('r', 2);
      dot.setAttribute('fill', 'white'); dot.setAttribute('opacity', 1 - i / 25);
      this.elements.trajectoryGroup.appendChild(dot);
      if (px > 1000 || py > 500) break;
    }
  }

  updateUI() {
    console.log("updateUI called! Updating score to:", this.state.score);
    if (!this.elements.score) {
        console.error("Error: this.elements.score is null in updateUI!");
        return;
    }
    this.elements.score.textContent = this.state.score;
    this.elements.lives.textContent = this.state.lives;
    this.elements.combo.textContent = this.state.combo;
    this.elements.coins.textContent = this.state.coins;
    this.elements.level.textContent = this.state.level;
    this.elements.arrows.textContent = this.state.arrowsLeft === Infinity ? '∞' : this.state.arrowsLeft;
    this.elements.timer.textContent = Math.ceil(this.state.timeLeft) === Infinity ? '∞' : Math.ceil(this.state.timeLeft);
    
    // Wind UI update
    if (!this.elements.wind) { // Added null check for other elements as well
        console.error("Error: this.elements.wind is null in updateUI!");
        return;
    }
    this.elements.wind.textContent = this.state.wind.toFixed(1);
    if (!this.elements.windArrow) {
        console.error("Error: this.elements.windArrow is null in updateUI!");
        return;
    }
    const windArrowRotation = this.state.wind * 10;
    this.elements.windArrow.style.transform = `rotate(${windArrowRotation}deg)`;

    // Update active powerups display
    this.updatePowerUpsUI();

    if (this.elements.game) {
      if (this.state.lives === 1) this.elements.game.classList.add('heartbeat');
      else this.elements.game.classList.remove('heartbeat');
    }
    console.log("updateUI finished.");
  }
  
  updatePowerUpsUI() {
    if (!this.elements.activePowerUps) return;
    
    const container = this.elements.activePowerUps;
    container.innerHTML = '';
    
    const powerUpEmojis = {
      'multishot': '🏹',
      'rapidfire': '⚡',
      'piercing': '🎯',
      'explosive': '💥',
      'slowmotion': '⏱️',
      'doublepoints': '✨',
      'shield': '🛡️',
      'autoaim': '🎯'
    };
    
    this.powerUps.activePowerUps.forEach(p => {
      const el = document.createElement('span');
      el.textContent = powerUpEmojis[p.type] || '⚡';
      el.style.fontSize = '18px';
      el.title = p.type + ' - ' + Math.ceil((p.duration - (Date.now() - p.startTime)) / 1000) + 's';
      container.appendChild(el);
    });
  }

  spawnTarget(forceBoss = false) {
    // Ensure game is still active
    if (this.state.gameOver) return;
    
    // Boss is disabled for now - uncomment to enable
    // const bossThreshold = 500;
    // if (this.state.score >= this.state.nextBossAt || forceBoss) {
    //   this.state.bossActive = true; this.state.nextBossAt += bossThreshold;
    //   this.target = { 
    //     x: 800, y: 250, initialY: 250, 
    //     radius: CONFIG.FRUITS.BOSS.radius, 
    //     health: CONFIG.FRUITS.BOSS.health, 
    //     maxHealth: CONFIG.FRUITS.BOSS.health, 
    //     type: CONFIG.FRUITS.BOSS, 
    //     pattern: 'boss',
    //     rotation: 0,
    //     split: false,
    //     velocity: { x: 0, y: 0 }
    //   };
    //   this.showMessage("🥇 FRUIT BOSS AWAKENED! 🥇");
    //   return;
    // }
    
    // Always spawn regular fruits (no boss)
    const isRare = Math.random() < 0.15; // 15% chance for rare fruit
    const fruitTypes = isRare ? CONFIG.FRUITS.RARE_TYPES : CONFIG.FRUITS.TYPES;
    const type = fruitTypes[Utils.randomInt(0, fruitTypes.length - 1)];
       
    const availablePatterns = CONFIG.PATTERNS.filter(p => p !== 'boss');
    const randomPattern = availablePatterns[Utils.randomInt(0, availablePatterns.length - 1)];
    const targetY = Utils.random(100, 400);
       
    this.target = { 
      x: 800, y: targetY, initialY: targetY, 
      radius: type.radius, 
      health: 1, 
      maxHealth: 1, 
      type, 
      pattern: randomPattern,
      rotation: Math.random() * Math.PI * 2,
      split: false,
      velocity: { x: 0, y: 0 }
    };
    
    this.targetPhase = 0;
    this.updateTargetVisual();
    this.elements.target.setAttribute('cx', this.target.x);
    this.elements.target.setAttribute('cy', this.target.y);
    this.elements.target.style.display = 'block';
  }

  updateTargetVisual() {
    // Remove old fruit element if exists
    const oldFruit = document.getElementById('fruitTarget');
    if (oldFruit) oldFruit.remove();
    
    // Hide the old target circle
    this.elements.target.style.display = 'none';
    
    // Create a new fruit group
    const fruitGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    fruitGroup.setAttribute('id', 'fruitTarget');
    
    // Add glow effect for rare fruits
    if (this.target.type.rare) {
      const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      glow.setAttribute('cx', 0);
      glow.setAttribute('cy', 0);
      glow.setAttribute('r', this.target.radius + 10);
      glow.setAttribute('fill', 'rgba(255, 215, 0, 0.3)');
      glow.setAttribute('class', 'fruit-glow');
      fruitGroup.appendChild(glow);
    }
    
    // Main fruit circle
    const fruitCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    fruitCircle.setAttribute('cx', 0);
    fruitCircle.setAttribute('cy', 0);
    fruitCircle.setAttribute('r', this.target.radius);
    fruitCircle.setAttribute('fill', this.target.type.color);
    fruitCircle.setAttribute('class', 'fruit-body');
    fruitGroup.appendChild(fruitCircle);
    
    // Fruit emoji
    const emoji = document.createElementNS("http://www.w3.org/2000/svg", "text");
    emoji.setAttribute('x', 0);
    emoji.setAttribute('y', this.target.radius * 0.3);
    emoji.setAttribute('text-anchor', 'middle');
    emoji.setAttribute('font-size', this.target.radius * 1.2);
    emoji.setAttribute('font-family', 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji');
    emoji.setAttribute('class', 'fruit-emoji');
    emoji.textContent = this.target.type.emoji;
    fruitGroup.appendChild(emoji);
    
    // Highlight for 3D effect
    const highlight = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    highlight.setAttribute('cx', -this.target.radius * 0.3);
    highlight.setAttribute('cy', -this.target.radius * 0.3);
    highlight.setAttribute('rx', this.target.radius * 0.3);
    highlight.setAttribute('ry', this.target.radius * 0.2);
    highlight.setAttribute('fill', 'rgba(255, 255, 255, 0.3)');
    highlight.setAttribute('class', 'fruit-highlight');
    fruitGroup.appendChild(highlight);
    
    // Position the fruit group
    fruitGroup.setAttribute('transform', `translate(${this.target.x}, ${this.target.y}) rotate(${this.target.rotation || 0})`);
    
    // Add to game
    const game = document.getElementById('game');
    game.appendChild(fruitGroup);
    
    // Update boss health
    if (this.elements.bossHealthContainer) {
      this.elements.bossHealthContainer.style.display = this.state.bossActive ? 'block' : 'none';
      if (this.state.bossActive) {
        this.elements.bossName.textContent = 'FRUIT GUARDIAN';
      }
    }
  }

  moveTarget() {
    // Safety check - if no target, don't move
    if (!this.target || !this.target.type) return;
    
    // Apply timeScale for slowmotion powerup effect
    const timeScale = this.state.timeScale || 1.0;
    this.targetPhase += this.target.type.speed * timeScale;

    const initialX = 800;
    const initialY = this.target.initialY;

    // Update fruit rotation
    this.target.rotation = (this.target.rotation || 0) + CONFIG.PHYSICS.FRUIT_ROTATION_SPEED;

    // Apply physics for split fruits
    if (this.target.split) {
      this.target.x += this.target.velocity.x;
      this.target.y += this.target.velocity.y;
      this.target.velocity.y += CONFIG.PHYSICS.GRAVITY * 0.3; // Reduced gravity for split fruits
      
      // Remove if off screen
      if (this.target.y > 550 || this.target.x < -50 || this.target.x > 1050) {
        return;
      }
    } else {
      // Normal movement patterns
      switch (this.target.pattern) {
        case 'sine_vertical':
          this.target.x = initialX;
          this.target.y = initialY + Math.sin(this.targetPhase) * 150;
          break;
        case 'sine_horizontal':
          this.target.x = initialX + Math.sin(this.targetPhase) * 150;
          this.target.y = initialY;
          break;
        case 'circle':
          this.target.x = initialX + Math.cos(this.targetPhase) * 100;
          this.target.y = initialY + Math.sin(this.targetPhase) * 100;
          break;
        case 'zigzag':
          this.target.x = initialX - 200 + Math.abs(Math.sin(this.targetPhase / 2)) * 400;
          this.target.y = initialY + Math.sin(this.targetPhase * 0.5) * 50;
          break;
        case 'diagonal':
          this.target.x = initialX + Math.sin(this.targetPhase) * 100;
          this.target.y = initialY + Math.cos(this.targetPhase) * 100;
          break;
        case 'boss':
          this.target.x = initialX + Math.sin(this.targetPhase) * 100;
          this.target.y = 250 + Math.cos(this.targetPhase * 1.5) * 100;
          this.state.bossCorePhase += 0.05;
          this.state.bossCorePos.x = Math.sin(this.state.bossCorePhase) * 40;
          this.state.bossCorePos.y = Math.cos(this.state.bossCorePhase * 1.3) * 40;
          this.elements.bossCore.style.display = 'block';
          this.elements.bossCore.setAttribute('cx', this.target.x + this.state.bossCorePos.x);
          this.elements.bossCore.setAttribute('cy', this.target.y + this.state.bossCorePos.y);
          break;
        default:
          this.target.x = initialX;
          this.target.y = initialY + Math.sin(this.targetPhase) * 150;
          break;
      }
    }
    
    // Update the fruit visual position
    const fruitGroup = document.getElementById('fruitTarget');
    if (fruitGroup) {
      fruitGroup.setAttribute('transform', `translate(${this.target.x}, ${this.target.y}) rotate(${this.target.rotation * 180 / Math.PI})`);
    }
    
    // Update boss core position
    if (!this.state.bossActive) this.elements.bossCore.style.display = 'none';
  }

  checkCollisions() {
    // Check arrow collisions with power-ups
    this.activeArrows.forEach(a => {
      if (!a.hit && !a.isDelayed) {
        this.powerUps.checkCollision(a.x, a.y);
      }
    });
    
    // Safety check - if no target or game over, just update arrow positions
    if (!this.target || !this.target.type) {
      // Just update arrow physics without collision
      this.activeArrows = this.activeArrows.filter(a => {
        if (a.isDelayed) return true;
        
        // Track arrow lifetime to prevent stuck arrows
        if (!a.lifetime) a.lifetime = 0;
        a.lifetime++;
        
        // Remove arrows that have been alive too long
        if (a.lifetime > 600) {
          if (a.trail) a.trail.forEach(dot => dot.remove());
          a.element.remove();
          return false;
        }
        
        // Apply timeScale for slowmotion powerup effect
        const timeScale = this.state.timeScale || 1.0;
        
        const windTurbulence = Math.sin(Date.now() / 100 + a.x * 0.01) * this.state.wind * 0.05;
        a.dy += CONFIG.PHYSICS.GRAVITY * timeScale; 
        a.x += (a.dx + windTurbulence) * timeScale;
        a.y += a.dy * timeScale;
        
        const speed = Math.sqrt(a.dx * a.dx + a.dy * a.dy);
        const dragFactor = CONFIG.PHYSICS.AIR_RESISTANCE;
        a.dx *= dragFactor;
        a.dy *= dragFactor;
        
        const deg = Math.atan2(a.dy, a.dx) * 180 / Math.PI;
        a.element.setAttribute('transform', `translate(${a.x},${a.y}) rotate(${deg})`);
        
        // Remove if out of bounds
        if (a.x > 1000 || a.y > 500 || a.y < 0) {
          a.element.remove();
          return false;
        }
        return true;
      });
      return;
    }
    
    this.activeArrows = this.activeArrows.filter(a => {
      if (a.isDelayed) return true;
      
      // Track arrow lifetime to prevent stuck arrows
      if (!a.lifetime) a.lifetime = 0;
      a.lifetime++;
      
      // Remove arrows that have been alive too long (prevents stuck arrows)
      if (a.lifetime > 600) { // 10 seconds max at 60fps
        if (a.trail) a.trail.forEach(dot => dot.remove());
        a.element.remove();
        return false;
      }
      
      // Apply timeScale for slowmotion powerup effect
      const timeScale = this.state.timeScale || 1.0;
      
      // Reduced gravity for better gameplay
      const windTurbulence = Math.sin(Date.now() / 100 + a.x * 0.01) * this.state.wind * 0.05;
      a.dy += CONFIG.PHYSICS.GRAVITY * timeScale; 
      a.x += (a.dx + windTurbulence) * timeScale;
      a.y += a.dy * timeScale;
      
      // Less air resistance for smoother flight
      const speed = Math.sqrt(a.dx * a.dx + a.dy * a.dy);
      const dragFactor = CONFIG.PHYSICS.AIR_RESISTANCE;
      a.dx *= dragFactor;
      a.dy *= dragFactor;
      
      if (a.y < 150) a.x += this.state.wind * 0.1;

      const deg = Math.atan2(a.dy, a.dx) * 180 / Math.PI;
      a.element.setAttribute('transform', `translate(${a.x},${a.y}) rotate(${deg})`);

      // Trail creation with velocity-based spacing
      if (!a.hit && !a.isDelayed) {
        if (!a.trail) a.trail = [];
        const trailDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        trailDot.setAttribute('cx', a.x);
        trailDot.setAttribute('cy', a.y);
        trailDot.setAttribute('r', Math.max(1, speed * 0.1));
        trailDot.setAttribute('fill', speed > 20 ? 'rgba(255,200,100,0.5)' : 'rgba(255,255,255,0.4)');
        trailDot.life = 1.0;
        this.elements.arrowTrailContainer.appendChild(trailDot);
        a.trail.push(trailDot);
      }

      // Update and fade trail dots
      if (a.trail) {
        a.trail = a.trail.filter(dot => {
          dot.life -= 0.05; // Fade speed
          if (dot.life <= 0) {
            dot.remove();
            return false;
          }
          dot.setAttribute('opacity', dot.life);
          return true;
        });
      }
      
      let shouldRemoveArrow = false;

      // Check if out of bounds
      if (a.x > 1000 || a.y > 500 || a.y < 0) {
        if (!a.hit) this.loseLife(); // Only lose life if it hasn't hit anything yet
        shouldRemoveArrow = true;
      }
      
      // Check for target hit
      const dist = Utils.distance(a.x, a.y, this.target.x, this.target.y);
      if (!a.hit && dist < this.target.radius + 5) { // If it hits the target
          // ... handle hit logic ...
          this.handleHit(dist, a); // handleHit sets a.hit = true
          if (!a.isPiercing) {
              shouldRemoveArrow = true; // Remove if not piercing
          }
      }
      
      // Also remove arrows that have already hit (but weren't piercing) - cleanup safety
      if (a.hit && !a.isPiercing) {
        shouldRemoveArrow = true;
      }

      // If arrow should be removed, clean up its elements
      if (shouldRemoveArrow) {
          if (a.trail) a.trail.forEach(dot => dot.remove());
          a.element.remove();
          return false; // Remove from activeArrows
      }
      return true; // Keep in activeArrows otherwise
    });
  }

  handleHit(dist, arrow) {
    console.log("handleHit called! Current score:", this.state.score, "Combo:", this.state.combo);
    arrow.hit = true;
    
    const isBullseye = dist < this.target.radius * 0.3;
    let pts = this.target.type.points + this.state.combo * 5;
    
    // Get juice color from fruit type
    const juiceColor = this.target.type.juiceColor || '#ffffff';

    // Explosive powerup: create explosion effect
    if (arrow.isExplosive) {
      this.showMessage("💥 EXPLOSIVE HIT!");
      for (let i = 0; i < 30; i++) {
        this.particles.create(arrow.x, arrow.y, '#f9ca24');
      }
    }

    if (isBullseye) {
      pts *= 3; // Triple points for bullseye on fruit!
      this.showMessage("🍒 PERFECT HIT! +" + pts);
      this.state.lastBullseyeAngle = Math.atan2(arrow.dy, arrow.dx);
      // Extra juice particles for bullseye
      for (let i = 0; i < 20; i++) {
        this.particles.create(arrow.x, arrow.y, '#ffd700');
      }
    } else {
      this.showMessage("+" + pts);
    }
    
    // Doublepoints powerup: double the points
    if (this.powerUps.has('doublepoints')) {
      pts *= 2;
      this.showMessage("✨ 2X POINTS! +" + pts);
    }
    
    this.state.score += pts; this.state.combo++;
    this.state.coins += Math.floor(pts / 10);

    // Create juice splash particles
    for (let i = 0; i < 15; i++) {
      this.particles.create(arrow.x, arrow.y, juiceColor);
    }

    // Create fruit split effect (splash into pieces)
    this.createFruitSplit(arrow.x, arrow.y, juiceColor);

    // Apply target shake
    const fruitGroup = document.getElementById('fruitTarget');
    if (fruitGroup) {
      fruitGroup.classList.add('target-shake');
      setTimeout(() => {
        fruitGroup.classList.remove('target-shake');
      }, 200);
    }

    // Regular fruit - hide the fruit immediately and show split effect
    const oldFruit = document.getElementById('fruitTarget');
    if (oldFruit) {
      oldFruit.style.display = 'none';
    }
    
    // Create fruit split effect (splash into pieces) - show at current position
    this.createFruitSplit(this.target.x, this.target.y, juiceColor);
    
    // Force spawn a new fruit immediately
    this.target = null;
    this.spawnTarget();

    this.updateUI(); playSound('hit');
  }

  createFruitSplit(x, y, color) {
    // Create multiple fruit slice pieces that fly apart
    const numPieces = 6;
    for (let i = 0; i < numPieces; i++) {
      const angle = (Math.PI * 2 / numPieces) * i;
      const piece = {
        x: x,
        y: y,
        vx: Math.cos(angle) * (Math.random() * 8 + 4),
        vy: Math.sin(angle) * (Math.random() * 8 + 4),
        life: 1.0,
        color: color,
        element: document.createElementNS("http://www.w3.org/2000/svg", "ellipse"),
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20
      };
      
      piece.element.setAttribute('rx', Utils.random(8, 15));
      piece.element.setAttribute('ry', Utils.random(4, 8));
      piece.element.setAttribute('fill', color);
      piece.element.setAttribute('opacity', 1);
      
      this.elements.particleContainer.appendChild(piece.element);
      this.particles.particles.push(piece);
    }
  }

  loseLife() {
    // Shield powerup: protects from life loss
    if (this.powerUps.has('shield')) {
      this.showMessage("🛡️ SHIELD PROTECTED!");
      this.state.combo = 0;
      this.updateUI();
      return;
    }
    
    this.state.combo = 0;
    
    // In all modes except endless, lives matter
    if (this.state.mode !== 'endless') {
      this.state.lives--;
      this.showMessage("Life Lost! Lives: " + this.state.lives);
      
      if (this.state.lives <= 0) {
        this.showMessage("Game Over!");
        this.endGame();
        return;
      }
    } else {
      // In endless mode, show warning but don't end game
      this.showMessage("Warning!");
    }
    
    this.updateUI();
  }

  endGame() {
    this.state.gameOver = true;
    this.elements.ui.style.display = 'none';
    this.elements.gameOverScreen.style.display = 'flex';

    this.elements.finalScore.textContent = this.state.score;
    this.elements.finalCombo.textContent = this.state.combo;

    this.saveScore(this.state.score);
    this.displayLeaderboard();

    this.elements.playAgainBtn.onclick = () => {
      this.elements.gameOverScreen.style.display = 'none';
      this.startGame(this.state.mode);
    };
  }

  fireMemoryArrow() {
    if (!this.state.lastBullseyeAngle) {
      this.showMessage("No Memory Recorded!");
      return;
    }
    this.showMessage("Memory Recall!");
    this.state.aimAngle = this.state.lastBullseyeAngle;
    this.shoot();
  }

  releaseDelayedArrows() {
    this.state.delayedArrows.forEach(a => a.isDelayed = false);
    this.state.delayedArrows = [];
  }

  showMessage(msg) {
    this.elements.message.textContent = msg;
    this.elements.message.style.opacity = 1;
    setTimeout(() => this.elements.message.style.opacity = 0, 2000);
  }

  buyUpgrade(type, price) {
    if (this.state.coins >= price) {
      this.state.coins -= price; this.state.permanentUpgrades.add(type);
      this.showMessage("Upgrade Purchased!"); this.updateUI();
    }
  }

  updateWind() {
    if (Date.now() - this.state.lastWindChangeTime > CONFIG.GAME.WIND_CHANGE_INTERVAL) {
      this.state.wind = Utils.random(-8, 8); // Random wind strength and direction
      this.state.lastWindChangeTime = Date.now();
      this.updateUI(); // Update UI to show new wind value
    }
  }

  updateTimeOfDay() {
    this.state.timeOfDay = (this.state.timeOfDay + 0.005) % 24; // Increment time, cycle 0-24

    let topColor, bottomColor;
    let currentTop, currentBottom;
    let nextTop, nextBottom;
    let progress;

    // Night (0-5) -> Dawn (5-7) -> Day (7-17) -> Dusk (17-19) -> Night (19-24)
    if (this.state.timeOfDay >= 0 && this.state.timeOfDay < 5) { // Deep Night
      currentTop = CONFIG.COLORS.SKY_NIGHT_TOP;
      currentBottom = CONFIG.COLORS.SKY_NIGHT_BOTTOM;
      topColor = Utils.interpolateRgb(currentTop, currentTop, 0); // No change
      bottomColor = Utils.interpolateRgb(currentBottom, currentBottom, 0); // No change
    } else if (this.state.timeOfDay >= 5 && this.state.timeOfDay < 7) { // Dawn
      progress = (this.state.timeOfDay - 5) / 2;
      currentTop = CONFIG.COLORS.SKY_NIGHT_TOP;
      currentBottom = CONFIG.COLORS.SKY_NIGHT_BOTTOM;
      nextTop = CONFIG.COLORS.SKY_DAY_TOP;
      nextBottom = CONFIG.COLORS.SKY_DAY_BOTTOM;
      topColor = Utils.interpolateRgb(currentTop, nextTop, progress);
      bottomColor = Utils.interpolateRgb(currentBottom, nextBottom, progress);
    } else if (this.state.timeOfDay >= 7 && this.state.timeOfDay < 17) { // Day
      currentTop = CONFIG.COLORS.SKY_DAY_TOP;
      currentBottom = CONFIG.COLORS.SKY_DAY_BOTTOM;
      topColor = Utils.interpolateRgb(currentTop, currentTop, 0); // No change
      bottomColor = Utils.interpolateRgb(currentBottom, currentBottom, 0); // No change
    } else if (this.state.timeOfDay >= 17 && this.state.timeOfDay < 19) { // Dusk/Sunset
      progress = (this.state.timeOfDay - 17) / 2;
      currentTop = CONFIG.COLORS.SKY_DAY_TOP;
      currentBottom = CONFIG.COLORS.SKY_DAY_BOTTOM;
      nextTop = CONFIG.COLORS.SKY_SUNSET_TOP;
      nextBottom = CONFIG.COLORS.SKY_SUNSET_BOTTOM;
      topColor = Utils.interpolateRgb(currentTop, nextTop, progress);
      bottomColor = Utils.interpolateRgb(currentBottom, nextBottom, progress);
    } else { // Night (19-24) - Transition from Sunset to Deep Night
      progress = (this.state.timeOfDay - 19) / 5; // Progress over 5 hours
      currentTop = CONFIG.COLORS.SKY_SUNSET_TOP;
      currentBottom = CONFIG.COLORS.SKY_SUNSET_BOTTOM;
      nextTop = CONFIG.COLORS.SKY_NIGHT_TOP;
      nextBottom = CONFIG.COLORS.SKY_NIGHT_BOTTOM;
      topColor = Utils.interpolateRgb(currentTop, nextTop, progress);
      bottomColor = Utils.interpolateRgb(currentBottom, nextBottom, progress);
    }

    document.documentElement.style.setProperty('--game-bg-top', topColor);
    document.documentElement.style.setProperty('--game-bg-bottom', bottomColor);
  }

  togglePause(forcePause = !this.state.isPaused) {
    this.state.isPaused = forcePause;
    if (this.state.isPaused) {
      // Pause game
      this.elements.ui.style.display = 'none';
      this.elements.pauseMenu.style.display = 'flex';
      // Stop draw sound if currently playing
      if (!this.elements.drawSound.paused) {
        this.elements.drawSound.pause();
        this.elements.drawSound.currentTime = 0;
      }
    } else {
      // Resume game
      this.elements.pauseMenu.style.display = 'none';
      this.elements.settingsMenu.style.display = 'none'; // Ensure settings menu is closed
      this.elements.ui.style.display = 'flex';
      this.gameLoop(); // Restart game loop
    }
  }

  toggleSound(unmute) {
    this.state.isMuted = !unmute;
    // Mute/unmute all relevant audio elements
    const sounds = ['shootSound', 'hitSound', 'drawSound', 'whooshSound'];
    sounds.forEach(id => {
      const audio = this.elements[id];
      if (audio) audio.muted = this.state.isMuted;
    });
  }

  triggerSlowMo(scale, duration) {
    this.state.timeScaleTarget = scale;
    setTimeout(() => { this.state.timeScaleTarget = 1.0; }, duration);
  }

  saveScore(score) {
    let highScores = JSON.parse(localStorage.getItem('archeryHighScores')) || [];
    highScores.push(score);
    highScores.sort((a, b) => b - a); // Sort descending
    highScores = highScores.slice(0, 5); // Keep top 5
    localStorage.setItem('archeryHighScores', JSON.stringify(highScores));
  }

  displayLeaderboard() {
    let highScores = JSON.parse(localStorage.getItem('archeryHighScores')) || [];
    this.elements.highScoreList.innerHTML = '';
    if (highScores.length === 0) {
      this.elements.highScoreList.innerHTML = '<li>No scores yet!</li>';
      return;
    }
    highScores.forEach((score, index) => {
      const li = document.createElement('li');
      li.textContent = `${index + 1}. ${score}`;
      this.elements.highScoreList.appendChild(li);
    });
  }

  gameLoop() {
    if (this.state.gameOver || this.state.isPaused) return; // Stop loop if paused or game over
    
    // Slowmotion powerup: slow down game time
    if (this.powerUps.has('slowmotion')) {
      this.state.timeScale = 0.3;
    } else {
      this.state.timeScale = 1.0;
    }
    
    this.scenery.update();
    this.weather.update();
    this.powerUps.spawn();
    this.powerUps.update();
    this.particles.update();
    this.updateWind(); // Call updateWind
    this.updateTimeOfDay(); // Call updateTimeOfDay
    this.moveTarget();
    this.checkCollisions();
    this.updatePowerUpsUI(); // Update powerup display
    
    // Classic mode: time runs out
    if (this.state.mode === 'classic') {
      this.state.timeLeft -= 1 / 60;
      if (this.state.timeLeft <= 0) {
        this.showMessage("Time's Up!");
        this.endGame();
      }
    }
    
    // Precision mode: check for no arrows left (handled in shoot())
    // Endless mode: no automatic end (player loses lives from missed shots)
    
    requestAnimationFrame(() => this.gameLoop());
  }
}

document.addEventListener('DOMContentLoaded', () => { window.game = new GameEngine(); });
