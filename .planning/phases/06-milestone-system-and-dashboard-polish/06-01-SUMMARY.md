---
phase: 06-milestone-system-and-dashboard-polish
plan: 01
subsystem: backend
tags: [milestones, level-up, habitat, api, study]
dependency_graph:
  requires:
    - src/lib/habitat-engine.ts
    - src/lib/habitat-queries.ts
    - src/db/schema.ts (milestones_seen table)
    - src/app/api/study/complete/route.ts
  provides:
    - markMilestonesSeen() in src/lib/milestone-queries.ts
    - getLanguageBreakdown() in src/lib/milestone-queries.ts
    - leveledUp field in POST /api/study/complete response
  affects:
    - Any client consuming POST /api/study/complete (new leveledUp field in response)
tech_stack:
  added: []
  patterns:
    - TDD (RED -> GREEN) for milestone-queries module
    - onConflictDoNothing for idempotent upsert of milestone rows
    - Compute-on-read: level derived from habitat facts before/after session, not stored
    - Before/after snapshot pattern for level-up detection (D-05)
key_files:
  created:
    - src/lib/milestone-queries.ts
    - src/lib/milestone-queries.test.ts
  modified:
    - src/lib/study-engine.ts
    - src/app/api/study/complete/route.ts
decisions:
  - markMilestonesSeen inserts one row per level crossed (not one row for the session) — enables querying individual level milestones later
  - leveledUp returns the highest new level only (D-07) — client triggers celebration for the highest level reached
  - Post-session getHabitatFacts call placed AFTER try block — ensures habitat_metadata upsert has committed before level is recomputed
metrics:
  duration: 24 minutes
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_changed: 4
---

# Phase 06 Plan 01: Milestone Queries and Level-Up Detection Summary

**One-liner:** Backend milestone foundation — `markMilestonesSeen` + `getLanguageBreakdown` queries plus level-up detection wired into `POST /api/study/complete` returning `leveledUp: number | null`.

## What Was Built

### Task 1: milestone-queries module (TDD)

Created `src/lib/milestone-queries.ts` with two exported async functions:

- **`markMilestonesSeen(userId, prevLevel, newLevel)`**: Inserts `milestones_seen` rows with `level-N` milestone keys for each level crossed. Uses `.onConflictDoNothing()` to guarantee idempotence (D-06). Early returns when `newLevel <= prevLevel`.

- **`getLanguageBreakdown(userId)`**: Drizzle query joining `cards` + `decks`, filtering `masteryRound >= 3`, grouped by `decks.language`. Returns `Array<{ language: string; count: number }>` with only languages that have at least 1 learned card.

Created `src/lib/milestone-queries.test.ts` with 8 tests:
- 5 tests for `markMilestonesSeen` (no-op cases, single level-up, multi-level, onConflictDoNothing)
- 3 tests for `getLanguageBreakdown` (empty result, mapped result, query chain verification)

### Task 2: Route extension

**`src/lib/study-engine.ts`:** Extended `SessionStats` type with `leveledUp: number | null` field.

**`src/app/api/study/complete/route.ts`:**
- Added imports for `computeHabitatState`, `getHabitatFacts`, `markMilestonesSeen`, `UserId`
- Pre-session snapshot: `factsBefore` / `prevLevel` captured before DB writes
- Post-session snapshot: `factsAfter` / `newLevel` captured after habitat_metadata upsert (outside try block)
- Level-up detection: calls `markMilestonesSeen` when `newLevel > prevLevel`, sets `leveledUp = newLevel`
- Response changed from `{ success: true }` to `{ success: true, leveledUp }`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functions are fully implemented with real DB queries.

## Self-Check: PASSED

Files created/modified:
- FOUND: src/lib/milestone-queries.ts
- FOUND: src/lib/milestone-queries.test.ts
- FOUND: src/lib/study-engine.ts (modified)
- FOUND: src/app/api/study/complete/route.ts (modified)

Commits:
- FOUND: 744a6d3 (feat(06-01): add milestone-queries module)
- FOUND: 4d3b8ab (feat(06-01): extend study/complete API)
