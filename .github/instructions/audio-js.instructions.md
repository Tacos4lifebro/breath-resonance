---
applyTo: "audio.js"
---

# audio.js — Copilot Instructions

## Web Audio API Architecture
- `window.breathAudio` = singleton `BreathAudioEngine` instance — always use this, never `new BreathAudioEngine()`
- `init()` must be called on first user gesture ONLY — the AudioContext is blocked before user interaction
- `masterGain` is the single output node → always `connect(this.masterGain)`, never `connect(this.ctx.destination)` directly

## Memory Management (Critical — Prevents Audio Glitches)
- Every OscillatorNode created must be tracked and stopped via `osc.stop(now + decayTime)` and `osc.disconnect()`
- Continuous soundscapes (pad, ocean, binaural) use **guard patterns** — check if already running before creating new nodes:
  ```js
  ensureAmbientPadRunning() {
    if (this.padOscs.length > 0) return; // guard
    // ... create nodes
  }
  ```
- `stopContinuousSounds()` uses linear ramp fade out (0.8s) BEFORE stopping to avoid clicks

## Synthesizer Recipes
| Sound | Technique |
|-------|-----------|
| Tibetan Bowl | 4 oscillators with non-harmonic ratios (1.0, 2.76, 4.76, 5.40) + exponential decay |
| Ambient Pad | 4 sine/triangle oscillators on C3/G3/C4/E4 + low-pass filter + detune chorus |
| Ocean Noise | Pink noise buffer source (Paul Kellet algorithm) + low-pass BiquadFilter sweep |
| Binaural | Two sine oscillators 432 Hz + 437.5 Hz on separate L/R channels via ChannelMerger |
| Zen Chime | 2 sine oscillators (freq + freq*2.02) + fast attack (15ms) + 3s exponential decay |

## Real-time Breath Modulation
- `updateBreathModulation(phaseName, phaseProgress, continuousExpansion)` is called every rAF frame
- Use `setTargetAtTime(value, now, 0.1)` for smooth parameter automation — NOT `setValueAtTime`
- Filter cutoff sweep: `240 + continuousExpansion * 900` (Hz) for ambient pad (220→1100 Hz for ocean)
