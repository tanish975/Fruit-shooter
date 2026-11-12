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
| Adventure | 40 stages in 4 worlds, each with a goal and up to 3 stars. Every 10th stage is a boss. |
| Daily Challenge | One seeded run per day, one attempt. |
| Time Attack | 60 seconds. Bombs cost 8 seconds, bosses and hourglass bubbles give time back. |
| Survival | 3 lives. Every fruit that falls unhit costs a life. |
| Precision | 15 arrows. A perfect hit or a skewer wins the arrow back. |

## What's in the game

- Four difficulty levels: Easy, Moderate, Hard, Intense
- 15 fruits, golden stars and gems, balloons, shields, dodging fruit, wind, and birds to avoid
- 4 bosses, then Endless Peaks: generated stages after stage 40
- 5 arrow types and 5 timed power-ups
- Coins, 7 upgrades, 6 bow skins, weekly and career missions, a monthly season track, daily bonus streak, trophy shelf
- One continue per run for coins, and hints after repeated fails
- Four photo-real backdrops, selectable or automatic
- Guided training, score sharing as an image, backup and restore by code
- Left-handed layout, aim sensitivity, hazard markers, reduced-motion support
- Haptics, synthesised sound and music, full-screen, back-button and app-switch pause

## Privacy

The game works fully offline. It has no accounts, ads, analytics or network calls; progress is stored only on the device. The share button hands an image to the Android share sheet only when you press it.

## Credits

- Fruit and icon art: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT)
- Animation: [anime.js](https://github.com/juliangarnier/anime) (MIT)
- Fonts: Lilita One, Fredoka (SIL OFL) via Fontsource
- Backdrops: AI-generated images made for this project
- Native shell: [Capacitor](https://capacitorjs.com)

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
| `src/i18n.js` | all player-facing text |
| `src/meta.js` | weekly missions, season track, daily challenge bookkeeping |
| `legacy/` | the original v7 browser game, kept for reference |
