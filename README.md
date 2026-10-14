# ZenSolitaire 🃏✨

> A sleek, calm, offline Klondike Solitaire card game with customizable Draw modes, harmonic Web Audio chimes, smart hints, and unlimited undo.

[![CI](https://github.com/OfferPk/zensolitaire/actions/workflows/ci.yml/badge.svg)](https://github.com/OfferPk/zensolitaire/actions/workflows/ci.yml)
[![Pages](https://github.com/OfferPk/zensolitaire/actions/workflows/pages.yml/badge.svg)](https://offerpk.github.io/zensolitaire/)
[![Android](https://github.com/OfferPk/zensolitaire/actions/workflows/android.yml/badge.svg)](https://github.com/OfferPk/zensolitaire/actions/workflows/android.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌐 Live Web Demo

Play immediately in your browser:  
👉 **[https://offerpk.github.io/zensolitaire/](https://offerpk.github.io/zensolitaire/)**

100% offline via PWA Service Worker caching. Installable directly to your home screen on Android, iOS, Windows, and macOS.

---

## 📱 Android APK Download

- **GitHub Actions Debug APK**: Download the latest build directly from [Android Build Artifacts](https://github.com/OfferPk/zensolitaire/actions/workflows/android.yml) (Artifact name: `zensolitaire-apk`).
- **Releases**: Tagged releases include standalone APK assets under [GitHub Releases](https://github.com/OfferPk/zensolitaire/releases).

---

## 📸 Screenshots

| Classic Green Felt | Midnight Velvet | Victory Cascade |
| :---: | :---: | :---: |
| _[ Classic Felt 7-Column Layout ]_ | _[ Midnight Theme Mode ]_ | _[ Animated Auto-Finish Cascade ]_ |

---

## ✨ Features

- **Draw 1 and Draw 3 Modes**: One-tap toggle between relaxed casual play (Draw 1) and deep strategic challenge (Draw 3).
- **Harmonic Procedural Audio**: Tactile card snaps, soft felt thuds, and musical pentatonic bell chimes whose pitch ascends as cards are stacked on foundations.
- **Smart Hint System**: Unobtrusive subtle glow highlighting valid playable moves when you're looking for inspiration.
- **Auto-Finish Cascade**: When all hidden cards are revealed, trigger an automated victory cascade where cards glide gracefully into their foundations.
- **Unlimited Multi-Step Undo**: Step back through any move sequence or card draw without limits.
- **Intuitive Touch & Drag Controls**: Smooth drag-and-drop plus smart single-tap to move cards to their best foundation or column.
- **Soothing Felt Themes**:
  - Classic Emerald Green
  - Midnight Velvet Navy
  - Royal Indigo Purple
  - Cherry Rose Wine
- **Offline Statistics**: Local tracking of games played, win rate, best score, fewest moves, and winning streaks.
- **100% Offline & Private**: Zero data collection, no ads, no trackers, no external network requirements.

---

## 🛠️ Local Development & Build

### Prerequisites
- Node.js >= 20
- npm >= 10

### Setup
```bash
git clone https://github.com/OfferPk/zensolitaire.git
cd zensolitaire
npm install
```

### Run Logic Unit Tests
```bash
npm test
```

### Build Web Assets
```bash
npm run build
```
This builds and copies all runtime assets into `www/`.

### Android Build (Capacitor)
```bash
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```
The debug APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) © 2026 OfferPk.
