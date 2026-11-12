# Fruit Archer

A portrait, one-thumb archery arcade game for Android. Pull back, aim, and skewer flying fruit.

**[Download the latest APK](https://github.com/tanish975/Fruit-shooter/releases/latest)** (Android 7.0+, works offline)

## How to play

- **Drag down anywhere** on the screen, like a slingshot. A dotted guide shows the arrow's arc.
- **Release** to shoot. A hit through the centre of a fruit is a **PERFECT** and pays double.
- Arrows fly straight through fruit. Line several up for a **SKEWER** multiplier.
- Consecutive hits build the **combo** multiplier and fill the **FEVER** bar (double points for 7 seconds).
- Don't shoot **bombs**. Do shoot the floating **power-up bubbles**.

## Modes

| Mode | Rules |
|------|-------|
| Time Attack | 60 seconds. Bombs cost 8 seconds, bosses and hourglass bubbles give time back. |
| Survival | 3 lives. Every fruit that falls unhit costs a life. |
| Precision | 15 arrows. A perfect hit or a skewer wins the arrow back. |

## What's in the game

- 15 fruits unlocked level by level, including coconuts that need two hits, plus golden stars and gems
- King Pumpkin boss every third level
- Power-ups: Triple Shot, Freeze, Blast Arrows, Double Points, Magnet Arrows
- Coins, 7 upgrades, 5 bow skins, 12 missions, daily bonus streak, lifetime stats
- Four sky themes that change as the level climbs
- Haptic feedback, synthesised sound effects and music, immersive full-screen, back-button and app-switch pause

## Development

```bash
npm install
npm run dev      # play in a browser at http://localhost:5173
npm run build    # production web build in dist/
npm run sync     # build + copy into the Android project
npm run apk      # build + assemble android/app/build/outputs/apk/release/app-release.apk
```

`npm run apk` needs JDK 21 and the Android SDK. You don't need either to ship: the
`Android APK` GitHub Actions workflow builds the APK on every push, and publishes a
GitHub release whenever `version` in `package.json` has no release yet.

### Signing

Without signing secrets the workflow signs with a throw-away debug key, which is new on
every build. Such an APK installs fine, but a later version can't be installed over it
(Android asks you to uninstall first, which clears saved progress). For updates that
install in place, add three repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `ANDROID_KEYSTORE_BASE64` | base64 of a PKCS#12 keystore |
| `ANDROID_KEYSTORE_PASSWORD` | its password |
| `ANDROID_KEY_ALIAS` | alias of the key inside it |

### Layout

| Path | Contents |
|------|----------|
| `src/game.js` | gameplay, physics, canvas rendering |
| `src/main.js` | screens, HUD, shop, missions |
| `src/data.js` | fruits, power-ups, modes, upgrades, missions, themes |
| `src/audio.js` | WebAudio sound effects and generative music |
| `src/platform.js` | Capacitor bridge: haptics, back button, app pause |
| `android/` | Capacitor Android project |
| `legacy/` | the original v7 browser game, kept for reference |

## Credits

- Fruit and icon art: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT)
- UI motion: [anime.js](https://github.com/juliangarnier/anime) (MIT)
- Native shell: [Capacitor](https://capacitorjs.com) (MIT)
- Fonts: Lilita One and Nunito (SIL Open Font License)
