---
phase: 27-performance-batch-2
plan: 04
subsystem: ui
tags: [nextjs, rsc, performance, dashboard, drizzle]

# Dependency graph
requires:
  - phase: 27-performance-batch-2 (27-01)
    provides: src/lib/auth-session.ts cache()-wrapped getSession() accessor
provides:
  - Consolidated dashboard data pass (PERF-16) — one getDeckCards query instead of getDeckCards + getStudyCards, no O(n^2) find() stitch
  - deriveStudySubset() pure helper in study-queries.ts as the reusable pattern for deriving a filtered/projected subset from an already-fetched row set
affects: [phase-18-recert]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derive a filtered/projected query-layer subset in JS from an already-fetched full row set (deriveStudySubset) instead of issuing a second, narrower DB query for the same table"
    - "Guard per-row derived fields (masteryRound, cooldownUntil) on the same pausedAt check the dropped second query used to filter on, preserving exact prior behavior with zero extra I/O and no O(n^2) find()"

key-files:
  created:
    - "src/lib/__tests__/dashboard-data.test.ts"
  modified:
    - "src/app/(protected)/dashboard/page.tsx"
    - "src/lib/study-queries.ts"
    - "src/components/card-edit-dialog.tsx"

key-decisions:
  - "masteryRound/cooldownUntil in cardRows are guarded on c.pausedAt directly (isPaused ? 0/null : real value) rather than looking anything up in a Map — this reproduces the OLD behavior exactly (paused cards always showed masteryRound 0 / cooldownUntil null, since getStudyCards excluded them) while eliminating both the Map and the O(n^2) studyCards.find() in one move"
  - "CardRow.createdAt (card-edit-dialog.tsx) made optional rather than left required, since dropping createdAt from the dashboard's cardRows payload would otherwise fail tsc against CardList's cards: CardRow[] prop — a minimal, backward-compatible type-contract fix in an out-of-files_modified-scope file (Rule 3, blocking issue)"
  - "getStudyCards and getUserNativeLanguage remain exported unchanged from their modules — /study/page.tsx and /deck/new-card/page.tsx still call them; only the dashboard's own call sites were removed"

patterns-established:
  - "Pattern: when two queries against the same table differ only by a WHERE filter + narrower column projection, fetch once with the superset query and derive the narrower one in JS (deriveStudySubset), rather than issuing both"

requirements-completed: [PERF-16]

# Metrics
duration: 20min
completed: 2026-07-22
---

# Phase 27 Plan 04: Consolidate dashboard data pass Summary

**Dashboard now issues ONE card query per render (was two: getDeckCards + getStudyCards), derives the study subset in JS via a new deriveStudySubset helper, reads native language off session.user.nativeLanguage, and drops the unread createdAt field from the client payload.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-22T15:20:00Z
- **Completed:** 2026-07-22T15:36:00Z
- **Tasks:** 2 completed
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- PERF-16 shipped: `dashboard/page.tsx`'s data pass now fetches a deck's cards with exactly ONE `getDeckCards` call; the study subset (used for `assembleSession`/`earliestCooldownEnd`) is derived in JS via the new `deriveStudySubset()` pure helper in `study-queries.ts`, which mirrors `getStudyCards`' `isNull(pausedAt)` filter and column projection
- Eliminated the O(n^2) `studyCards.find((s) => s.id === c.id)` per-row stitch (previously used to source the QA-mode `cooldownUntil` badge value) and the `masteryByCardId` Map — both replaced by a direct `c.pausedAt`-guarded read off the single fetched row
- `getUserNativeLanguage` dropped from the dashboard entirely — `nativeLang` now reads `session.user.nativeLanguage ?? "en"` (25-04 normalization pattern), removing a full DB round trip per render
- Swapped `auth.api.getSession({ headers: await headers() })` to the 27-01 cached `getSession()` accessor, consistent with the other 5 non-consolidation RSC call sites
- `createdAt` dropped from the client `cardRows` payload — confirmed unread by `CardList`/`CardEditDialog` via grep before removal; `CardRow.createdAt` (card-edit-dialog.tsx) made optional so this doesn't break the type contract for callers (e.g. `deck-view.tsx`) that still populate it

## Task Commits

1. **Task 1: Write dashboard query-layer consolidation test (Wave 0)** - `c8f0cda` (test) — RED
2. **Task 2: Consolidate the dashboard data pass** - `74670e3` (feat) — GREEN

_TDD-style RED→GREEN sequence for this plan's single feature, per Wave 0 gap._

## Files Created/Modified
- `src/lib/__tests__/dashboard-data.test.ts` - New: (1) unit tests for `deriveStudySubset` against a fixture with paused/unpaused cards, proving pause-filtering + column-projection parity with `getStudyCards`; (2) `DashboardPage`-level tests asserting `getDeckCards` is called exactly once, `getStudyCards` is never called, and `getUserNativeLanguage` is never called
- `src/lib/study-queries.ts` - Added `deriveStudySubset(allCards)` pure helper; `getStudyCards` left unchanged (still used by `/study/page.tsx`)
- `src/app/(protected)/dashboard/page.tsx` - Single `getDeckCards` call replaces the `getDeckCards`+`getStudyCards` `Promise.all`; `studyCards = deriveStudySubset(cards)`; `nativeLang` sourced from `session.user.nativeLanguage ?? "en"`; swapped to `getSession()` from `@/lib/auth-session`; `cardRows` derives `masteryRound`/`cooldownUntil` directly off `c.pausedAt` (no Map, no find()); `createdAt` dropped from `cardRows`
- `src/components/card-edit-dialog.tsx` - `CardRow.createdAt` changed from required to optional (`createdAt?: Date`), matching the existing optional-field convention already used for `masteryRound`/`cooldownUntil` in the same interface

## Decisions Made
- Preserved the exact prior masking behavior for paused cards (`masteryRound` shown as 0, `cooldownUntil` shown as null) by guarding directly on `c.pausedAt` per row instead of building a lookup Map from the derived study subset — functionally identical to the old Map-based approach but O(n) with no intermediate structure, and it removes the O(n^2) `.find()` call in the same step.
- Made `CardRow.createdAt` optional in `card-edit-dialog.tsx` rather than leaving it required and keeping `createdAt` in the dashboard's payload just to satisfy the type — the field is genuinely unread by both `card-list.tsx` and `card-edit-dialog.tsx`'s own render logic (confirmed via grep before the edit), and `deck-view.tsx` (a separate, unrelated component with its own local card-row-shaped interface) is untouched.
- Left `getStudyCards` and `getUserNativeLanguage` exported and unchanged in their source modules — both still have live callers (`/study/page.tsx`, `/deck/new-card/page.tsx`) outside this plan's scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Made `CardRow.createdAt` optional in `card-edit-dialog.tsx`**
- **Found during:** Task 2
- **Issue:** Dropping `createdAt` from the dashboard's `cardRows` payload (a must-have truth per this plan) left `cardRows`' inferred type missing a property that `CardRow` (imported by `card-list.tsx` from `card-edit-dialog.tsx`) declared as required, which `npx tsc --noEmit` correctly rejected — `card-edit-dialog.tsx` is outside this plan's `files_modified` list.
- **Fix:** Changed `createdAt: Date` to `createdAt?: Date` in the `CardRow` interface, matching the interface's existing optional-field convention (`masteryRound?`, `cooldownUntil?`). Confirmed via grep that no render logic in either `card-list.tsx` or `card-edit-dialog.tsx` reads `.createdAt` before making this change.
- **Files modified:** `src/components/card-edit-dialog.tsx`
- **Commit:** `74670e3`

## Issues Encountered

None blocking. `npx tsc --noEmit` clean; scoped `npx biome check` on the 4 touched files clean (one auto-formatting pass applied to the test file's import order, no logic change); full `npx vitest run` showed 2238 passed / 6 skipped / 1 failed — the 1 failure (`image-upload-flow-extract-errors.test.tsx`, a 5s timeout) is the pre-existing documented full-suite flake from prior phases (26-04, 27-03, 27-08), unrelated to this plan's files, and passes in isolation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PERF-16 fully satisfied; dashboard's data pass now on a single card query, session-field native language, and the O(n^2) stitch removed
- The `T-27-04-01` threat register item (ownership WHERE guards preserved when collapsing two queries into one) is satisfied — `getDeckCards(activeDeck.id)` still scopes to the one deck `activeDeck.id` (itself resolved from `decks` filtered by `session.user.id` in `getUserDecks`), identical to the pre-existing access-control shape; no new query surface was introduced
- Remaining Phase 27 plans (27-07, 27-10) are unblocked by this plan; no new blockers introduced
- Manual/informal verification (prod-build dashboard render showing one card query in logs, per plan's `<verification>` section) deferred to the orchestrator's e2e/verification gate, consistent with this project's established static-only executor policy

## Self-Check: PASSED

- FOUND: src/lib/__tests__/dashboard-data.test.ts
- FOUND: src/app/(protected)/dashboard/page.tsx
- FOUND: src/lib/study-queries.ts
- FOUND: src/components/card-edit-dialog.tsx
- FOUND: .planning/phases/27-performance-batch-2/27-04-SUMMARY.md
- FOUND: c8f0cda (test commit)
- FOUND: 74670e3 (feat commit)

---
*Phase: 27-performance-batch-2*
*Completed: 2026-07-22*
