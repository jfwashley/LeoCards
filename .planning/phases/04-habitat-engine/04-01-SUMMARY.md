---
phase: 04-habitat-engine
plan: 01
subsystem: habitat-engine
tags: [pure-functions, tdd, decay, levels, mood, vitest]
dependency_graph:
  requires: [src/db/schema.ts]
  provides: [src/lib/habitat-engine.ts]
  affects: [04-02 (habitat-queries), 04-03 (habitat API route), Phase 5 UI]
tech_stack:
  added: []
  patterns: [pure-functions-with-now-param, compute-on-read, tdd-red-green-refactor]
key_files:
  created:
    - src/lib/habitat-engine.ts
    - src/lib/habitat-engine.test.ts
  modified: []
decisions:
  - "computeQuality uses millisecond arithmetic only (no calendar day math) to avoid DST issues"
  - "effectiveCardCount uses Math.floor (not round or ceil) to prevent float boundary issues at level thresholds"
  - "nextLevelThreshold computed as LEVEL_THRESHOLDS[level-1] — maps current level to the threshold that defines the next level"
  - "LEVEL_THRESHOLDS index i maps to reaching level i+2 (thresholds for levels 2-10)"
metrics:
  duration: 3 minutes
  completed_date: "2026-03-28"
  tasks_completed: 1
  files_created: 2
requirements:
  - HAB-01
  - HAB-06
---

# Phase 4 Plan 01: Habitat Engine Pure Functions Summary

**One-liner:** Pure functions for habitat quality decay (2-day grace, 5%/day linear, 10% floor), 10-level derivation from effectiveCardCount thresholds, and 4-mood classification combining quality + recency.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Add failing habitat engine tests | 66667d4 | src/lib/habitat-engine.test.ts |
| GREEN | Implement habitat engine pure functions | 35f6e66 | src/lib/habitat-engine.ts |

## What Was Built

### `src/lib/habitat-engine.ts`

Exported pure functions:

- **`computeQuality(lastActivityAt, now)`** — returns 1.0 for null (new user) or within 48h grace, then linear 5%/day decay floored at 10%
- **`habitatLevel(effectiveCardCount)`** — maps effective card count to level 1-10 using LEVEL_THRESHOLDS = [5, 15, 30, 50, 80, 120, 170, 230, 300, 400]
- **`classifyMood(quality, minutesSinceActivity)`** — returns excited (<=60 min), happy (>=0.75), neutral (>=0.40), or sad
- **`computeHabitatState(facts, now)`** — orchestrator returning full HabitatState with level, quality, mood, effectiveCardCount, isDecaying, minutesSinceActivity, nextLevelThreshold

Exported types: `HabitatFacts`, `HabitatState`, `TigerMood`

Exported constants: `GRACE_PERIOD_MS`, `DECAY_RATE_PER_DAY`, `DECAY_FLOOR`, `LEVEL_THRESHOLDS`, `EXCITED_WINDOW_MINUTES`

### `src/lib/habitat-engine.test.ts`

48 unit tests covering:
- All quality decay edge cases (null, grace boundary, linear decay, floor)
- All 10 level thresholds plus sub-threshold and overflow cases
- All 4 mood states with quality/recency combinations
- Full computeHabitatState scenarios (new/active/decayed/deeply-decayed user)
- Math.floor for effectiveCardCount
- nextLevelThreshold computation including null at max level

## Decisions Made

1. **Millisecond arithmetic for decay** — `(now.getTime() - lastActivityAt.getTime()) / (24 * 60 * 60 * 1000)` produces fractional days with sub-day precision, no DST sensitivity. Mirrors study-engine.ts pattern.

2. **Math.floor for effectiveCardCount** — Prevents float boundary bugs at level thresholds (e.g., quality=0.999 * 5 cards = 4.995 → floor = 4, stays level 1 as intended).

3. **LEVEL_THRESHOLDS index convention** — `LEVEL_THRESHOLDS[i]` is the card count to reach level `i+2`. The loop starts level=1 and sets `level = i+2` for each threshold met. This correctly gives level 1 for 0 cards and level 2 for 5 cards.

4. **nextLevelThreshold formula** — For a user at level L (1-9), `LEVEL_THRESHOLDS[L-1]` is the threshold for the next level. At level 10, returns null.

## Deviations from Plan

None — plan executed exactly as written. The TDD RED/GREEN cycle proceeded cleanly with 0 fixes needed.

## Known Stubs

None — all functions fully implemented and tested. No placeholder data or hardcoded values.

## Self-Check: PASSED

Files created:
- FOUND: src/lib/habitat-engine.ts
- FOUND: src/lib/habitat-engine.test.ts

Commits:
- FOUND: 66667d4 (RED phase)
- FOUND: 35f6e66 (GREEN phase)

Test suite: 48/48 passing (`npx vitest run src/lib/habitat-engine.test.ts`)
