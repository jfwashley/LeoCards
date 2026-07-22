---
phase: 27-performance-batch-2
plan: 09
subsystem: api
tags: [performance, drizzle, promise-all, habitat, study-srs]

# Dependency graph
requires: []
provides:
  - "src/app/api/study/complete/route.ts read path consolidated into one Promise.all (ownership check + card load + factsBefore)"
  - "factsAfter derived in JS from factsBefore + cardUpdates instead of a second getHabitatFacts DB round trip"
affects: [27-performance-batch-2 (remaining plans), Phase 18 re-cert gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.all for independent reads that share no data dependency (mirrors the existing dashboard/page.tsx convention, extended to an API route)"
    - "In-memory derivation of a second read result from the first read + already-computed writes, instead of re-fetching (sibling pattern to the route's own shipped db.batch() atomic-write consolidation)"

key-files:
  created: []
  modified:
    - src/app/api/study/complete/route.ts
    - src/app/api/study/complete/route.test.ts

key-decisions:
  - "Confirmed getHabitatFacts (src/lib/habitat-queries.ts) returns exactly {userId, lastActivityAt, learnedCardCount} — no hidden fields — so factsAfter is fully and safely derivable; no deviation from the plan's default path was needed"
  - "Ownership guard moved to run AFTER the Promise.all resolves (on ownedDeckRows[0]), preserving the 403-before-any-write access-control ordering (T-27-09-01) while still parallelizing the read itself"
  - "db.batch() write block (recall_events insert + per-card updates + habitat upsert) left byte-unchanged — confirmed via git diff — this plan is read-side only"

patterns-established: []

requirements-completed: [PERF-21]

# Metrics
duration: ~20min
completed: 2026-07-22
---

# Phase 27 Plan 09: Promise.all study-complete reads + derive factsAfter Summary

**Collapsed `/api/study/complete`'s 3-step read waterfall (ownership check → card load → factsBefore) into one `Promise.all`, and replaced the second `getHabitatFacts` call with an in-memory derivation of `factsAfter` from `factsBefore` + the session's computed card updates — cutting 2 of the route's ~5-6 DB round trips per study commit with zero behavior change.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-22
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Consolidated the deck-ownership SELECT, card-state SELECT, and `factsBefore` `getHabitatFacts` call into a single `Promise.all` — all three were already independent of each other (none depend on another's result), they just weren't parallelized before
- Moved the ownership 403 guard to run on `ownedDeckRows[0]` immediately after the `Promise.all` resolves, before the card-existence check or any write — the access-control predicate and its ordering relative to `db.batch()` are unchanged (T-27-09-01)
- Replaced the second `getHabitatFacts` call (`factsAfter`) with a pure-JS derivation: `learnedCardCount = factsBefore.learnedCardCount + crossedToLearned` (cards whose `masteryRound` went from `<3` to `>=3` this commit), `lastActivityAt = now` (the exact value just upserted into `habitat_metadata` inside `db.batch()`), `userId` echoed from `factsBefore`
- Left the `db.batch()` write block (recall_events insert + per-card guarded updates + habitat upsert) completely untouched — verified via `git diff` that no line inside the try/catch write block changed
- Added 3 new tests to `route.test.ts`: a call-count assertion (`getHabitatFacts` called exactly once), a derivation-equality assertion for a threshold-crossing fixture (masteryRound 2→3), and a non-crossing fixture proving `learnedCardCount` stays flat when no card reaches the "learned" bar

## Task Commits

Each task was committed atomically:

1. **Task 1: Promise.all the read waterfall + derive factsAfter**
   - `9331c1a` perf(27-09): Promise.all study-complete reads + derive factsAfter

## Files Created/Modified
- `src/app/api/study/complete/route.ts` - read waterfall collapsed into `Promise.all([ownedDeckRows, cardRows, factsBefore])`; ownership guard moved after resolution; `factsAfter` now derived instead of re-fetched; new `HabitatFacts` type import
- `src/app/api/study/complete/route.test.ts` - new `"read consolidation (PERF-21)"` describe block: call-count assertion, threshold-crossing derivation-equality assertion, non-crossing assertion

## Decisions Made
- Confirmed (by reading `src/lib/habitat-queries.ts`'s `getHabitatFacts` source) that its return shape is exactly `{ userId, lastActivityAt, learnedCardCount }` with no hidden fields — this is what makes the derivation safe/complete rather than a lossy shortcut. Per the plan's own instruction, this was the condition for proceeding without a deviation; since it held, no re-fetch fallback was needed.
- Used the round-2 "either" advancement rule (a single correct grade in any direction advances round 2 → 3) to construct the threshold-crossing test fixture — the simplest real path to a "learned" transition in one grade, verified against `study-engine.ts`'s `ROUND_REQUIREMENT` table.
- Captured `computeHabitatState`'s second mock-call argument (rather than asserting on `getHabitatFacts`'s return value directly) to prove the actual derived `factsAfter` object flowing into the post-session level computation, since `getHabitatFacts` itself is mocked and only called once by design.

## Deviations from Plan
None — plan executed exactly as written. The pre-condition check (getHabitatFacts returns no fields beyond userId/lastActivityAt/learnedCardCount) held, so the default derivation path was used with no fallback needed.

## Issues Encountered
- Full `npx vitest run` showed 1 pre-existing, documented flake (`image-upload-flow-extract-errors.test.tsx`, a 5s timeout) — not touched by this plan, listed in the project's known full-suite-load flake set (alongside `cooldown-config.test.ts`, `deck-switcher`, `review-list-commit-guard`). Not chased. `src/app/api/study/complete/route.test.ts` itself: 8/8 pass in isolation.
- One self-inflicted duplicate-import lint error during editing (added `getHabitatFacts` import twice while inserting the `HabitatFacts` type import) — caught and fixed immediately by `biome check`, before commit; not a deviation, just an editing slip resolved inline.

## User Setup Required
None — no external service configuration required. The plan's "2 fewer DB round trips in prod logs" observation is explicitly informal/manual per D-10 and deferred to the orchestrator's post-wave verification (prod build only, never a timing gate in this repo's tests).

## Next Phase Readiness
- PERF-21 shipped: read waterfall `Promise.all`'d, `factsAfter` derived, write batch and ownership gate intact
- `npx tsc --noEmit` clean; scoped `biome check` clean on both touched files
- `npx vitest run src/app/api/study/complete/route.test.ts` — 8/8 pass
- After the wave: full `npm test`, `npm run qa:run` (study/SRS path, items 8/12/17), and `e2e/06-study-session.spec.ts` + `study-progression.spec.ts` against a restarted prod-parity server, per this plan's `<verification>` section — deferred to the orchestrator
- 27-02, 27-03, 27-04, 27-07, 27-10 remain unexecuted in Phase 27 (performance-batch-2)

## Self-Check: PASSED

`src/app/api/study/complete/route.ts` and `src/app/api/study/complete/route.test.ts` verified present on disk; commit `9331c1a` verified present in `git log`.

---
*Phase: 27-performance-batch-2*
*Completed: 2026-07-22*
