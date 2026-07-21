---
phase: 26-performance-batch
plan: 03
subsystem: api
tags: [drizzle, neon, server-actions, vitest]

# Dependency graph
requires:
  - phase: 26-performance-batch (26-01)
    provides: "runTranslationFanOut batched translation edits in review-list.tsx / review-list.test.ts (untouched by this plan)"
provides:
  - "saveImageCards single multi-row insert (one db.insert(cards).values([...]) per commit, atomic all-or-nothing outcomes)"
  - "commitReviewRows single saveImageCards call carrying the whole rows array (auth/ownership checked once per commit, not once per card)"
affects: [26-performance-batch (remaining plans), 18-performance-recert]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single multi-row .values([...]) insert mirroring the recall_events master pattern (src/app/api/study/complete/route.ts:224-234), applied to a second insert site"
    - "All-or-nothing outcome derivation: one try/catch around the single insert/action call, mapping success to N x {ok:true} and failure to N x {ok:false, error}"

key-files:
  created: []
  modified:
    - src/lib/deck-actions.ts
    - src/lib/deck-actions.test.ts
    - src/components/review-list.tsx
    - src/components/review-list.test.ts

key-decisions:
  - "On insert rejection, saveImageCards returns before calling revalidatePath (no revalidation of a deck that received zero new cards) — not explicitly specified by the plan's <action> text but consistent with 'revalidatePath called once after the insert' and the pre-existing catch-path behavior mirrored from the old loop's per-row semantics"
  - "commitReviewRows' catch branch (thrown action error, e.g. Unauthorized/Forbidden) maps to failedCount = rows.length, matching the all-or-nothing outcome semantics from deck-actions.ts's own catch branch"

patterns-established:
  - "Second application of the multi-row .values([...]) master pattern in this codebase (first was 26-02's recall_events/db.batch); confirms the pattern generalizes cleanly to a second insert site with different data shape"

requirements-completed: [PERF-08]

duration: 10min
completed: 2026-07-21
---

# Phase 26 Plan 03: Review-Commit Batching Summary

**Committing N reviewed image-cards is now ONE server action call (`saveImageCards(deckId, allRows)`) issuing ONE multi-row `db.insert(cards).values([...])`, with auth/ownership checked once per commit instead of once per card.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-21T23:42:08.000Z (per STATE.md session continuity)
- **Completed:** 2026-07-21T23:50:14Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- **`saveImageCards` (src/lib/deck-actions.ts):** replaced the per-row `for (const input of sanitizedInputs) { try { await db.insert(cards).values({single}) } catch {...} }` loop with a single `await db.insert(cards).values(sanitizedInputs.map(...))`, wrapped in one try/catch. The combined-WHERE ownership check (`and(eq(decks.id,...), eq(decks.userId,...))`, D-09/V4) is unchanged — it already ran once and continues to run once, now paired with one insert instead of N.
- **Outcome semantics are now all-or-nothing** (Pitfall 2, by design): a single atomic multi-row INSERT either fully lands or fully fails — on success every outcome is `{ok:true}`, on rejection every outcome is `{ok:false, error}`. The previously-possible mixed per-row outcome (`[{ok:false}, {ok:true}]`) is no longer reachable via the DB layer.
- **`commitReviewRows` (src/components/review-list.tsx):** replaced the per-row loop calling `saveImageCards(deckId, [singleCard])` N times with one call `saveImageCards(deckId, rows.map((row) => ({front, back})))`. `addedCount`/`failedCount` are derived from the single returned outcomes array; `skippedCount` is unchanged (`duplicates.length`). A thrown error from the single call is caught and mapped to `failedCount = rows.length` (matching the all-fail outcome shape).
- **Tests rewritten for the new atomic contract:** `deck-actions.test.ts`'s happy-path test now asserts `db.insert` `toHaveBeenCalledTimes(1)` with an `arrayContaining` payload assertion; the old "continue-on-failure" test (which modeled an impossible-after-refactor mixed outcome) was replaced with an all-fail test and a companion all-succeed test. `review-list.test.ts`'s "batch commit" describe block now asserts `mockSaveImageCards` `toHaveBeenCalledTimes(1)` with the full mapped array, plus an all-or-nothing thrown-error test.

## Task Commits

Each task was committed atomically:

1. **Task 1: saveImageCards single multi-row insert + all-or-nothing tests** - `ffdb1cf` (feat)
2. **Task 2: commitReviewRows single saveImageCards call** - `b5dbdcc` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified

- `src/lib/deck-actions.ts` - `saveImageCards` now issues one `db.insert(cards).values([...N rows...])` after one ownership check; catch branch returns N x `{ok:false, error}` before `revalidatePath` (no revalidation on total failure); success branch returns N x `{ok:true}` then calls `revalidatePath("/dashboard")` once.
- `src/lib/deck-actions.test.ts` - Happy-path test updated to `toHaveBeenCalledTimes(1)` + `arrayContaining`; "continue-on-failure" test replaced with two new tests: "all-or-nothing: a single insert rejection fails every outcome" and "all-or-nothing: a single insert success passes every outcome" (3-card case, confirms the array shape generalizes beyond 2).
- `src/components/review-list.tsx` - `commitReviewRows` rewritten around one `saveImageCards` call; signature and `CommitResult` shape unchanged; `runTranslationFanOut` (26-01) untouched.
- `src/components/review-list.test.ts` - "batch commit" describe block rewritten: one test asserts the single call + exact mapped-array payload + mixed-outcome count derivation; one test asserts the thrown-error all-fail path never rejects and returns `{addedCount:0, failedCount:2, skippedCount:0}`.

## Decisions Made

- On insert rejection inside `saveImageCards`, the function returns before reaching `revalidatePath("/dashboard")` — no cache revalidation fires for a commit that added zero cards. This mirrors the plan's "revalidatePath called once after the insert" wording (singular, success-path-implied) and is a minor, arguably-correct behavior change from the old loop (which always called `revalidatePath` once regardless of any individual row's outcome, since at least the auth/ownership work had completed). Flagging since 26-PATTERNS.md's illustrative snippet didn't spell out the failure-path revalidate behavior explicitly.
- `commitReviewRows`'s catch branch (a thrown error from the single `saveImageCards` call — e.g., `Unauthorized`/`Forbidden` if the session expired mid-flow) maps to `failedCount = rows.length`, `addedCount = 0`, matching the all-or-nothing framing established in `deck-actions.ts` and preserving the pre-existing `handleCommit`'s own outer catch behavior in `ReviewList` (which already did the same rows.length fallback for a thrown `commitReviewRows` — now consistent at both layers).

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched 26-PATTERNS.md's prescribed shapes with no structural surprises; the two decisions above are interpretive choices within the plan's stated behavior, not corrections to broken plan guidance.

## Issues Encountered

None. `npx vitest run` picked up several stale `.claude/worktrees/agent-*/src/lib/deck-actions.test.ts` copies from unrelated prior worktree sessions when run without a fully-qualified path (this repo's `worktrees` are disabled per config but leftover directories remain on disk) — confirmed harmless: those are stale byte-for-byte snapshots from earlier sessions, all passed, and the canonical `src/lib/deck-actions.test.ts` in the working tree (grep-confirmed, not `.claude/worktrees/...`) is the one this plan modified and verified. No cleanup performed (out of this plan's scope; flagging for Josh in case those stale worktree directories should be pruned).

## User Setup Required

None - no external service configuration required. Zero new dependencies.

## Next Phase Readiness

- **Roadmap criterion 2 (PERF-08) is met:** committing N reviewed image-cards is one server action + one multi-row insert with auth/ownership checked once, not N times, verified end-to-end via `deck-actions.test.ts` + `review-list.test.ts`.
- **isPartial UI branch narrowing (Pitfall 2, T-26-11, requested for this SUMMARY):** `review-list.tsx`'s success-state `isPartial = failedCount > 0 && addedCount > 0` branch is now unreachable via the DB commit path — a single atomic multi-row INSERT can only produce all-`{ok:true}` or all-`{ok:false}` outcomes, so `addedCount` and `failedCount` can never both be positive from `commitReviewRows`'s happy path anymore. `saveImageCards`'s own `sanitizedInputs` validation (invalid front/back) also isn't per-row — it throws before the insert entirely, short-circuiting the whole commit. In practice `isPartial` is now dead UI code with no live trigger. Left as-is (no UI change) — removing it was out of this plan's `files_modified` scope and it costs nothing to keep; flagging for a future cleanup plan or Phase 18 UI audit.
- Scoped verification green: `npx vitest run src/lib/deck-actions.test.ts src/components/review-list.test.ts` → 312 passed, 2 skipped (pre-existing placeholder). Scoped `biome ci` on all four touched files exits 0 (one pre-existing, out-of-scope `noExplicitAny` warning at `review-list.test.ts:342`, unchanged from 26-01, does not fail `ci`).
- Remaining Phase 26 plans (PERF-10, PERF-11) are unblocked and independent of this plan's changes.
- Orchestrator wave gate still owed: full `npx tsc --noEmit` + full `npx vitest run` + full `npm run test:e2e` for the wave (fresh dev server first, per project convention).

## Known Stubs

None.

## Threat Flags

None — the reduced-frequency ownership check (T-26-09) and all-or-nothing outcome narrowing (T-26-11) were fully anticipated by this plan's own `<threat_model>`; no new unanticipated surface was introduced. The ownership gate itself is byte-identical to before (kept, not weakened), only its call frequency changed (N times -> 1 time per commit, as intended).

---
*Phase: 26-performance-batch*
*Completed: 2026-07-21*

## Self-Check: PASSED

All modified files verified present on disk (src/lib/deck-actions.ts, src/lib/deck-actions.test.ts, src/components/review-list.tsx, src/components/review-list.test.ts); both task commit hashes (ffdb1cf, b5dbdcc) verified present in git log.
