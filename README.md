# 🍒 Fruit Shooter - Game Documentation

> **Version:** 7.0 Fruit Edition  
> **Platform:** Web Browser (HTML5/SVG/JavaScript)  
> **Genre:** Arcade / Skill-based Shooting Game

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [How to Play](#how-to-play)
3. [Game Modes](#game-modes)
4. [Fruits & Scoring](#fruits--scoring)
5. [Controls](#controls)
6. [Features](#features)
7. [Shop & Upgrades](#shop--upgrades)
8. [Tips & Strategies](#tips--strategies)
9. [Technical Details](#technical-details)

---

## 🎮 Overview

**Fruit Shooter** is an exciting arcade-style shooting game where players use a bow and arrow to hit various fruits as they move across the screen. The game features realistic physics, beautiful visual effects, and multiple game modes for endless entertainment.

---

## 🕹️ How to Play

### Getting Started

1. **Open the game**: Open `index.html` in any modern web browser
2. **Select a mode**: Choose from Classic, Endless, or Precision mode
3. **Aim**: Move your mouse to aim the bow
4. **Draw**: Click and hold to draw the bow (hold longer for more power)
5. **Shoot**: Release the mouse button to fire

### The Goal

Hit as many fruits as possible to score points within the time limit or before running out of lives. Each fruit has different point values, and hitting the center (bullseye) awards bonus points!

---

## 🎯 Game Modes

### Classic Mode ⏱️
- **Duration:** 90 seconds
- **Arrows:** Unlimited
- **Objective:** Score the highest points within the time limit
- **Difficulty:** Increases every 20 seconds

### Endless Mode ♾️
- **Duration:** No time limit
- **Lives:** 3 lives
- **Objective:** Survive as long as possible
- **Perfect for:** Practice and high score hunting

### Precision Mode 💎
- **Duration:** No time limit
- **Arrows:** Limited to 10 arrows
- **Objective:** Score maximum points with limited arrows
- **Special:** Arrows can be recovered by hovering over them after they land

---

## 🍎 Fruits & Scoring

### Regular Fruits

| Fruit | Emoji | Points | Speed | Size |
|-------|-------|--------|-------|------|
| Apple | 🍎 | 10 | Medium | 25px |
| Orange | 🍊 | 15 | Medium-Fast | 28px |
| Watermelon | 🍉 | 20 | Slow | 35px |
| Banana | 🍌 | 25 | Fast | 22px |
| Strawberry | 🍓 | 30 | Very Fast | 20px |
| Grape | 🍇 | 35 | Fast | 18px |

### Rare Fruits 🏆
- **Spawn Chance:** 15%
- **Visual:** Golden glow effect

| Fruit | Emoji | Points | Speed | Size |
|-------|-------|--------|-------|------|
| Golden Apple | 🌟 | 100 | Very Slow | 30px |
| Dragon Fruit | 🐉 | 80 | Slow | 32px |

### Bullseye Bonus 🎯
- **Hit Zone:** Center 30% of fruit
- **Bonus:** 3x points (multiplied with combo!)
- **Visual:** Gold particle explosion + "PERFECT HIT!" message

### Fruit Boss 🎃
- **Appears:** Every 200 points
- **Health:** 15 hits to defeat
- **Points on Defeat:** 500 points
- **Bonus Time:** +20 seconds in Classic mode

---

## ⌨️ Controls

### Mouse Controls

| Action | Control |
|--------|---------|
| Aim | Mouse Movement |
| Draw Bow | Left Click + Hold |
| Fire Arrow | Release Click |
| Pause Game | Escape Key |
| Open Shop | Shop Button |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Fire Arrow |
| `Escape` | Pause/Resume |
| `R` | Fire Memory Arrow (special ability) |
| `D` | Release Delayed Arrows |

---

## ✨ Features

### Physics System

- **Gravity:** Arrows follow realistic parabolic trajectory
- **Wind:** Dynamic wind affects arrow flight (displayed in UI)
- **Air Resistance:** Arrows slow down over distance
- **Turbulence:** Random wind gusts add challenge

### Visual Effects

- **Fruit Rotation:** All fruits spin as they move
- **Juice Particles:** Color-matched splash on hit
- **Fruit Splitting:** Fruits break into 6 pieces when hit
- **3D Appearance:** Highlight and shadow effects
- **Glow Effects:** Rare fruits have animated golden glow
- **Arrow Trails:** Velocity-based colored trails
- **Screen Shake:** Impact feedback on hits

### Game Mechanics

- **Combo System:** Consecutive hits increase multiplier (+5 pts per combo)
- **Coin Collection:** Earn coins to buy upgrades
- **Level Progression:** Difficulty increases over time
- **Power-ups:** Special abilities spawn randomly

### Power-up Types

| Power-up | Color | Duration | Effect |
|----------|-------|----------|--------|
| Multi-shot | 🔴 Red | 5s | Fire 3 arrows at once |
| Rapid Fire | 🔵 Cyan | 5s | Faster shooting |
| Piercing | 💧 Blue | 5s | Arrows pass through fruits |
| Explosive | 💥 Yellow | 3s | Area damage |
| Slow Motion | 🟣 Purple | 4s | Fruits move slowly |
| Double Points | 🟡 Gold | 6s | 2x score multiplier |
| Shield | 🟢 Green | 8s | Extra protection |
| Auto-aim | 🔴 Red | 3s | Arrows home to targets |

---

## 🛒 Shop & Upgrades

Spend your earned coins on permanent upgrades!

| Upgrade | Cost | Effect |
|---------|------|--------|
| Extra Life | 100💰 | +1 life (permanent) |
| Ice Coating | 200💰 | Targets move 20% slower |
| Wider Rings | 150💰 | +10% target size |
| Magnet Bow | 300💰 | Arrows home to targets |
| Gold Midas | 400💰 | Double points forever |
| Time Warp | 250💰 | 20% permanent slow on targets |
| Fracture Kit | 500💰 | Arrows split on impact |
| Focus Master | 350💰 | 2x focus window duration |

---

## 💡 Tips & Strategies

### Beginner Tips

1. **Start with Classic mode** to learn the mechanics
2. **Watch the wind indicator** - adjust aim accordingly
3. **Hold longer for more power** - but not too long or you'll misfire!
4. **Aim for center** - bullseye hits give 3x points
5. **Collect power-ups** - they can dramatically increase your score

### Advanced Strategies

1. **Use the focus window** - hold aim for 1-2 seconds for perfect accuracy
2. **Chain combos** - build up your combo multiplier for massive scores
3. **Target rare fruits** - they're worth 3-10x regular fruits
4. **Save power-ups** - use them when boss appears for maximum effect
5. **Master the delayed arrow** - hold draw for 2.5+ seconds for a trap arrow

### Combo Building

- **Base points** + (Combo × 5) = Total points
- Example: Hit strawberry (30pts) with 10 combo = 30 + (10 × 5) = 80 points!

---

## 🔧 Technical Details

### File Structure

```
├── index.html      # Main game file
├── script.js       # Game logic and engine
├── style.css       # Visual styling
├── shoot.mp3       # Arrow firing sound
└── hit.mp3         # Target hit sound
```

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance Notes

- **Target FPS:** 60
- **Canvas Size:** 1000x500 (responsive)
- **Audio:** HTML5 Audio API

### Saved Data

The game uses browser `localStorage` to save:
- High scores
- Purchased upgrades
- Game settings

---

## 🎉 Changelog

### Version 7.0 - Fruit Edition
- ✅ Replaced targets with 8 fruit types
- ✅ Added fruit rotation and movement
- ✅ Implemented juice particle effects
- ✅ Added fruit splitting animation
- ✅ Created rare fruit system
- ✅ Enhanced physics with wind turbulence
- ✅ Added bullseye bonus system (3x points)
- ✅ New boss: Fruit Guardian 🎃

---

## 📄 License

This game is provided as-is for educational and entertainment purposes.

---

**Happy Fruit Shooting! 🍒🏹**

