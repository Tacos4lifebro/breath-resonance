---
applyTo: "**"
---

# Breath Resonance — GitHub Copilot Instructions

## Project Overview
A 100% free family breathing and heart rate variability (HRV) coherence **Progressive Web App (PWA)**.  
Built to replace [The Breathing App (App Store, $4.99/mo)](https://apps.apple.com/us/app/the-breathing-app-calm-daily/id1285982210) at zero cost.  
Owner: **Tacos4lifebro** and 4 family members. All features must remain 100% free, no backends, no APIs, no subscriptions.

---

## Architecture (Vanilla HTML/CSS/JS — No Frameworks)

| File | Purpose |
|------|---------|
| `index.html` | Semantic HTML5 structure with PWA meta tags, modal sheets, and SVG visual canvases |
| `style.css` | Pure Vanilla CSS design system: HSL color themes, glassmorphism, CSS custom properties, safe-area insets for iOS notch |
| `app.js` | Core app engine: `requestAnimationFrame` timing loop, Wake Lock API, Alternate Nostril state machine, localStorage stats |
| `audio.js` | Web Audio API synthesis engine: Tibetan bowls, ambient pads, ocean noise, 432 Hz binaural beats — zero external audio files |
| `manifest.json` | PWA manifest for fullscreen home-screen install on iPhone and Android |
| `sw.js` | Service Worker for 100% offline caching and background audio |

---

## Strict Rules for All Code Suggestions

### 1. No External Dependencies
- **Do NOT suggest** npm packages, CDN libraries (Bootstrap, Tailwind, jQuery, GSAP, Tone.js, etc.), or any fetch calls to external APIs.
- All animations must use `requestAnimationFrame` or CSS `@keyframes`.
- All audio must use `window.AudioContext` (Web Audio API) — no `<audio>` elements, no external MP3/WAV files.

### 2. Styling Rules
- Use **CSS Custom Properties (variables)** defined in `:root` and per-theme `body[data-theme]` selectors — never hardcoded hex values in components.
- All spacing uses absolute pixel values for predictability — avoid `em` units.
- Safe-area insets: always use `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` for fixed headers/footers on iOS.
- **Glassmorphism modals**: use `backdrop-filter: blur(16px)` and `background: rgba(...)` — never opaque modal backgrounds.
- Transitions must use `cubic-bezier(0.16, 1, 0.3, 1)` (spring easing) for UI elements.

### 3. Timing & Animation Engine
- The breathing animation loop runs in `BreathApp.tick()` via `requestAnimationFrame` — **never use `setInterval` for breathing timing**.
- `setInterval` is only acceptable for the session countdown timer display (coarser 1-second UI update).
- Phase advancement must skip 0-duration phases (`while (this.currentTimes[idx] <= 0)` guard).
- `continuousExpansion` is the primary animation driver — a `0.0` to `1.0` float representing lung fill level — **not phase progress**.

### 4. Audio Engine Rules
- `window.breathAudio` is the global singleton of `BreathAudioEngine` defined in `audio.js`.
- Always call `window.breathAudio.init()` before any audio API use — the `AudioContext` requires a user gesture before creation.
- Oscillator nodes **must** be `.stop()` and `.disconnect()`-ed after their decay to prevent memory leaks.
- Continuous soundscapes (ambient pad, ocean noise, binaural) are managed by `ensureXxxRunning()` guard methods — never create duplicate nodes.
- `stopContinuousSounds()` fades out all continuous oscillators before disconnect.

### 5. Mobile-First & PWA Constraints
- **No server-side code** — this is a static file PWA. No Node.js, no Express, no API routes.
- All touch targets must be minimum `44px × 44px`.
- Use `user-select: none` on interactive UI elements to prevent accidental text selection on mobile.
- Wake Lock: always `await navigator.wakeLock.request('screen')` inside a try/catch — it can fail on low battery.
- Service Worker: update `CACHE_NAME` version string (e.g. `breath-resonance-v2`) when adding/changing cached assets.

### 6. State Persistence
- Use `localStorage` with `br_` prefix for all persisted settings (theme, ratio, volume, sound pack, stats).
- Stats object shape: `{ totalMinutes: number, totalSessions: number, streak: number, lastActiveDate: string (ISO date) }`.
- Always wrap `localStorage` read/writes in `try/catch`.

### 7. Accessibility
- All interactive buttons must have `aria-label` attributes.
- Modals must have `role="dialog"` and `aria-modal="true"` and `aria-labelledby`.
- Color contrast: text must pass WCAG AA on all 5 themes.

---

## Breathing Ratio Data Model

```js
// times: [inhaleSeconds, holdInSeconds, exhaleSeconds, holdOutSeconds]
// A value of 0 means "skip this phase".
const RATIO_PRESETS = {
  'resonance': { name: '...', times: [5.45, 0, 5.45, 0], isResonance: true, bpm: 5.5 },
  'box':        { name: '...', times: [4, 4, 4, 4], bpm: 3.75 },
  'sleep478':   { name: '...', times: [4, 7, 8, 0], bpm: 3.15 },
  // ...
};
```

## Visual Modes
| Mode ID | Element ID | Description |
|---------|-----------|-------------|
| `orb`   | `#breathing-orb` | CSS transform scale 0.75→1.38 radial gradient orb |
| `lotus` | `#lotus-container` | 12 SVG petals bloom via rotate + translateY |
| `ring`  | `#zen-ring-container` | SVG stroke-dashoffset progress ring |
| `wave`  | `#wave-container` | CSS `height %` fill wave |

## Deployment: 100% Free — GitHub Pages
```
https://Tacos4lifebro.github.io/breath-resonance/
```
Deployed via `.github/workflows/deploy.yml` (GitHub Actions → Pages). Zero cost. Worldwide access.
