---
phase: 07-backend-security-and-quality-fixes
plan: 02
subsystem: database, api
tags: [drizzle, batch-insert, input-validation, performance, security]

# Dependency graph
requires:
  - phase: 07-01-backend-security-and-quality-fixes
    provides: authorization bypass fixes for study page and card mutations
provides:
  - Single batch INSERT for milestone marking (no N+1 queries)
  - Integer minutesSinceActivity (float boundary fix)
  - Language allow-list validation in createDeck
  - Clamped and NaN-safe celebrate query param
affects: [milestone-queries, habitat-engine, deck-actions, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Batch array INSERT with .values(rows[]) instead of looping individual awaits
    - Math.floor on time division results to avoid float boundary misclassification
    - Set-based allow-list validation before session auth in server actions
    - Math.max/Math.min clamp with NaN guard for untrusted query params

key-files:
  created: []
  modified:
    - src/lib/milestone-queries.ts
    - src/lib/milestone-queries.test.ts
    - src/lib/habitat-engine.ts
    - src/lib/deck-actions.ts
    - src/app/(protected)/dashboard/page.tsx

key-decisions:
  - "Batch INSERT uses a rows array built in a loop then passed to .values() — single round-trip regardless of levels crossed (SEC-04)"
  - "Math.floor on minutesSinceActivity prevents float values like 59.9999 from bypassing the 60-minute excited window check (SEC-05)"
  - "ALLOWED_LANGUAGES Set placed at module scope near LANGUAGE_LABELS for co-location; validation fires before session auth to fail fast (SEC-06)"
  - "celebrate clamp uses Math.max(1, Math.min(10, raw)) with explicit isNaN guard — non-numeric strings become null, not 0 or NaN (SEC-07)"

patterns-established:
  - "Batch insert pattern: build rows[] in loop, single .values(rows) call — no per-item await"
  - "Query param sanitization: parseInt + isNaN check + Math.max/Math.min clamp for integer range params"

requirements-completed: [SEC-04, SEC-05, SEC-06, SEC-07]

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 7 Plan 02: Backend Performance and Input Validation Fixes Summary

**Batch milestone INSERT replacing N+1 loop, Math.floor on minutesSinceActivity, language allow-list in createDeck, and clamped celebrate query param**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-29T00:31:19Z
- **Completed:** 2026-03-29T00:34:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced N separate awaited INSERTs in `markMilestonesSeen` with a single batch `.values(rows)` call — 1 DB round-trip regardless of levels crossed
- Added `Math.floor` to `minutesSinceActivity` computation in `computeHabitatState` to prevent floating-point values (e.g. 59.9999) from misclassifying mood at the 60-minute boundary
- Added `ALLOWED_LANGUAGES` Set at module scope in `deck-actions.ts` and a guard at the top of `createDeck` that throws "Invalid language" for any code not in the set
- Clamped `celebrate` query param to 1–10 range with `Math.max(1, Math.min(10, raw))` and explicit `Number.isNaN` guard so non-numeric strings become `null`

## Task Commits

Each task was committed atomically:

1. **Task 1: Batch milestone INSERT and fix habitat-engine float** - `c16c22a` (fix)
2. **Task 2: Add language validation and clamp celebrate param** - `b972c9f` (fix)

## Files Created/Modified

- `src/lib/milestone-queries.ts` - Replaced N-loop awaits with single batch INSERT
- `src/lib/milestone-queries.test.ts` - Updated tests to assert array argument instead of N calls
- `src/lib/habitat-engine.ts` - Added Math.floor to minutesSinceActivity calculation
- `src/lib/deck-actions.ts` - Added ALLOWED_LANGUAGES Set and validation guard in createDeck
- `src/app/(protected)/dashboard/page.tsx` - Replaced raw parseInt with clamped + NaN-safe celebrate param

## Decisions Made

- Batch INSERT uses a pre-built `rows[]` array passed to a single `.values()` call — one DB round-trip regardless of how many levels are crossed (SEC-04)
- Math.floor on minutesSinceActivity prevents 59.9999-style floats from producing incorrect mood classification at the excited-window boundary (SEC-05)
- Language validation placed before session auth in `createDeck` to fail fast on invalid input without an unnecessary auth round-trip (SEC-06)
- celebrate clamp: non-numeric strings parse as NaN and become null (not 0 or 1); out-of-range integers are silently clamped (SEC-07)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated milestone-queries tests to assert batch behavior**
- **Found during:** Task 1 (Batch milestone INSERT)
- **Issue:** Existing tests expected `mockDb.insert` to be called N times (one per level) and `values()` to receive a plain object — both assumptions broken by the batch refactor
- **Fix:** Updated two test cases to assert `mockDb.insert` called once and `values()` receives an array matching `expect.arrayContaining([...])`
- **Files modified:** src/lib/milestone-queries.test.ts
- **Verification:** All 1548 tests pass after update
- **Committed in:** c16c22a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — test assertions mirrored old N+1 behavior and had to reflect new batch contract)
**Impact on plan:** Necessary correctness fix; tests now validate the desired batch behavior rather than the old N+1 implementation detail.

## Issues Encountered

None beyond the test update above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four SEC requirements (04–07) shipped; phase 07 plan 02 fully complete
- Plan 03 (rate limiting) can proceed

---
*Phase: 07-backend-security-and-quality-fixes*
*Completed: 2026-03-29*
