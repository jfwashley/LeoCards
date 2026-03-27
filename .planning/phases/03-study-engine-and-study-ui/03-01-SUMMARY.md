---
phase: 03-study-engine-and-study-ui
plan: "01"
subsystem: study-engine
tags: [schema, migration, drizzle, study-engine, pure-functions, tdd, vitest, spaced-repetition]
dependency_graph:
  requires: []
  provides: [study-engine-types, study-engine-functions, schema-direction, schema-mastery-round, schema-cooldown-until]
  affects: [03-02, 03-03, 03-04]
tech_stack:
  added: []
  patterns: [TDD-red-green, pure-functions, branded-types, compute-on-read, Fisher-Yates-shuffle]
key_files:
  created:
    - src/lib/study-engine.ts
    - src/lib/study-engine.test.ts
    - drizzle/0001_ambitious_dark_beast.sql
    - drizzle/meta/0001_snapshot.json
  modified:
    - src/db/schema.ts
    - drizzle/meta/_journal.json
decisions:
  - "computeCardUpdate uses capped direction counts to prevent multi-round inflation per Pitfall 4 (anti-inflation guard)"
  - "interleave inserts resurface after every interval learning cards using two-pointer approach — no clustering"
  - "db:migrate not applied (placeholder DATABASE_URL in worktree env) — migration SQL generated and committed for real-env application"
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-27T22:48:36Z"
  tasks_completed: 2
  files_changed: 6
---

# Phase 3 Plan 1: Study Engine and Study UI — Schema + Engine Summary

**One-liner:** Drizzle schema migration adding direction/masteryRound/cooldownUntil columns, plus pure study engine functions (assembleSession, interleave, getCardStage, computeCardUpdate, earliestCooldownEnd) with full TDD coverage (25 passing tests).

## What Was Built

### Task 1: Schema Migration

Added three new columns to support the directional mastery progression system (D-14):

- `recall_events.direction text NOT NULL` — source of truth for which direction (n2t/t2n) each recall event was performed. Enables compute-on-read calculation of mastery progress.
- `cards.masteryRound integer NOT NULL DEFAULT 0` — denormalized cache of mastery stage (0=new, 1=round1done, 2=round2done, 3=learned). Avoids full recall_events scan on every card load.
- `cards.cooldownUntil timestamp nullable` — gates card availability between rounds (12h after round 1, 24h after round 2, null when learned).

Also exported `RecallDirection = "n2t" | "t2n"` type alias from schema.ts for use by engine and API layers.

Generated Drizzle migration: `drizzle/0001_ambitious_dark_beast.sql`

### Task 2: Study Engine Pure Functions (TDD)

`src/lib/study-engine.ts` exports 5 pure functions and 1 helper, with only `import type` from schema (no runtime DB or Next.js dependencies):

| Function | Purpose |
|---|---|
| `assembleSession(cards, now)` | Filters due cards, sorts newest-first (D-05), adds ~10% resurface pool (D-02), interleaves |
| `interleave(learning, resurface, interval)` | Inserts 1 resurface card every N learning cards — no clustering (D-18) |
| `getCardStage(card)` | Returns "n2t" for round 0, "t2n" for round 1, random for round 2+ (D-08) |
| `computeCardUpdate(cardId, round, grades, now)` | Checks round thresholds (D-14), advances round, sets 12h/24h/null cooldowns, anti-inflation guard |
| `earliestCooldownEnd(cards, now)` | Returns soonest future cooldown date for countdown timer (D-07) |
| `shuffleTake(arr, n)` | Fisher-Yates shuffle helper, exported for testability |

Exported types: `CardForSession`, `SessionCard`, `GradeEntry`, `SessionStats`

**Test results:** 25/25 tests passing across assembleSession (8), interleave (4), getCardStage (4), computeCardUpdate (6), earliestCooldownEnd (3).

## Decisions Made

1. **Anti-inflation guard (Pitfall 4):** `computeCardUpdate` caps counted correct grades at the round threshold before checking advancement. Extra grades in a session (e.g., 5 n2t correct when threshold is 2) do not carry over to inflate subsequent rounds. The `recallCountDelta` field (used for habitat progression count) uses the uncapped sum.

2. **interleave two-pointer approach:** Uses chunk-then-insert pattern — emits `interval` learning cards, then 1 resurface. Remaining cards from either pool are appended. This prevents resurface clustering at the start or end.

3. **db:migrate not applied in worktree:** The worktree's `.env.local` has a placeholder `DATABASE_URL`. The migration SQL was generated and committed — it will be applied when the branch is merged to main and `db:migrate` runs in the real environment.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — study-engine.ts is pure functions with no UI or data-source stubs.

## Commits

| Hash | Type | Description |
|---|---|---|
| e4e6d01 | chore | schema migration — add direction, masteryRound, cooldownUntil columns |
| 32972db | test | add failing tests for study engine (RED phase) |
| d74c90b | feat | implement study engine pure functions (GREEN phase) |

## Self-Check: PASSED

- src/lib/study-engine.ts: EXISTS
- src/lib/study-engine.test.ts: EXISTS (25 tests, all passing)
- src/db/schema.ts: direction, masteryRound, cooldownUntil, RecallDirection all present
- drizzle/0001_ambitious_dark_beast.sql: EXISTS
- Commits e4e6d01, 32972db, d74c90b: all present in git log
