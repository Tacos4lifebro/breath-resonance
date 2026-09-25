---
applyTo: "app.js"
---

# app.js — Copilot Instructions

## Core Timing Philosophy
- `BreathApp.tick(timestamp)` is the single source of truth for all breath timing
- Delta time (`delta = (timestamp - lastTimestamp) / 1000`) must be calculated in **seconds**, not ms
- `phaseElapsed` accumulates real wall-clock seconds against `currentTimes[currentPhaseIndex]`
- Use `continuousExpansion` (0.0 to 1.0, smoothly derived from phase) as the universal animation driver
- **Never** schedule audio or UI updates with setTimeout inside the rAF loop

## State Machine — Phase Order
```
0: 'inhale'   → continuousExpansion = phaseProgress (0→1)
1: 'hold-in'  → continuousExpansion = 1.0 (hold full)
2: 'exhale'   → continuousExpansion = 1 - phaseProgress (1→0)
3: 'hold-out' → continuousExpansion = 0.0 (hold empty)
```
Zero-duration phases are skipped in `advanceToNextPhase()`.

## Alternate Nostril Breathing
- 4-step cycle: Left In → Right Out → Right In → Left Out
- `nostrilCycleStep` advances once per **complete 4-phase breath cycle** (when `currentPhaseIndex` wraps back to 0)
- UI cue displayed via `#nostril-cue` element

## Session Stats
- Stored in localStorage key `br_stats` as JSON
- Shape: `{ totalMinutes, totalSessions, streak, lastActiveDate }`
- Streak increments if `lastActiveDate` was exactly yesterday (1-day diff)
- Streak resets to 1 if gap > 1 day
