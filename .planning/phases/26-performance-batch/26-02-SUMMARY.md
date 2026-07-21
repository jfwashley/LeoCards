---
phase: 26-performance-batch
plan: 02
subsystem: api
tags: [drizzle, neon, db.batch, postgres, vitest]

# Dependency graph
requires:
  - phase: 26-01
    provides: "Independent Wave 1 fix (DeepL translation batching) — no code overlap, sequenced only by wave ordering"
provides:
  - "Study-session commit's step-6 write phase (recall_events insert + N card updates + habitat upsert) executes as ONE atomic db.batch() round trip instead of 1+N+1 sequential awaits"
  - "batchCalls===1 round-trip-count unit assertion (D-02 proof) in route.test.ts"
  - "Updated stale 'Neon HTTP driver does not support transactions' doc comments reflecting the new atomic reality"
affects: [26-performance-batch (remaining plans), 18-performance-recert]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "db.batch() composition with a non-empty tuple cast derived from the actual constructed query objects (typeof insertQuery | (typeof mappedQueries)[number] | typeof upsertQuery), not ReturnType<typeof db.insert/db.update> — the pre-.values() builder types don't satisfy drizzle's BatchItem constraint"
    - "Test mock for db.batch(queries) = Promise.all(queries), correct because the existing insert()/update() chain mocks already apply their side effects eagerly at construction/terminal-method-call time, not at await time"

key-files:
  created: []
  modified:
    - src/app/api/study/complete/route.ts
    - src/app/api/study/complete/route.test.ts

key-decisions:
  - "D-01 honored: WR-04 commitId idempotency machinery kept byte-identical (same WHERE guard, same deterministic recall_events ids, same onConflictDoUpdate habitat upsert) — the atomic batch wraps the writes, it does not replace the guard. Retiring WR-04 as redundant-after-atomicity is a candidate future cleanup, deferred out of this phase."
  - "Batchable type declared AFTER the query const declarations, derived via typeof from the actual constructed query objects rather than 26-RESEARCH.md's illustrative ReturnType<typeof db.insert> | ReturnType<typeof db.update> — the illustrative shape failed tsc (Rule 1, see Deviations)."

patterns-established:
  - "db.batch() tuple-cast Batchable type sourced from typeof <actual-built-query-const>, not ReturnType<typeof db.insert/db.update> — first and only db.batch() call site in the codebase, precedent for any future batch composition."

requirements-completed: [PERF-07]

duration: 8min
completed: 2026-07-21
---

# Phase 26 Plan 02: Study-Commit db.batch Summary

**Study-session commit's step-6 writes (recall_events insert + per-card mastery updates + habitat upsert) collapsed from 1+N+1 sequential round trips into ONE atomic `db.batch()` Neon transaction; WR-04 idempotency kept untouched (D-01).**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-21T23:34:33Z (approx, per STATE.md session continuity from 26-01 completion)
- **Completed:** 2026-07-21T23:42:08Z
- **Tasks:** 2 (Task 1 TDD RED, Task 2 GREEN)
- **Files modified:** 2

## Accomplishments

- **Write-phase round trips collapsed 1+N+1 → 1:** `POST /api/study/complete`'s step 6 (recall_events insert, N sequential per-card `await db.update(cards)` calls, habitat_metadata upsert) now executes as one `await db.batch([...])` call — a genuine single-HTTP-round-trip Neon `sql.transaction()` (verified against installed drizzle-orm 0.45.1 + @neondatabase/serverless 1.0.2 source in 26-RESEARCH.md), replacing the prior worst case of ~27 sequential round trips for a full study session.
- **Atomicity gained, not just speed:** the batch is all-or-nothing — a mid-write failure now rolls back the entire step instead of leaving a partial commit, closing a gap the old code's own comment explicitly documented as a limitation ("a mid-sequence failure may result in partial writes").
- **D-02 proof landed as a unit test, not a timing gate:** `route.test.ts` now asserts `h.batchCalls.count === 1` after a normal 2-card commit — a `db.batch` mock (`Promise.all` over the already-eager query-builder promises) proves the round-trip count directly, per 26-PATTERNS.md's prescribed minimal-diff mock shape.
- **WR-04 replay-safety re-verified unchanged:** the existing "replay safety" describe block (replayed commitId is a per-card no-op; a genuinely new commitId re-applies) passed unmodified against the new batched code path — the commitId guard in the card UPDATE's WHERE clause is byte-identical to before.
- **Stale doc comment corrected:** the "Neon HTTP driver does not support transactions" claim (route.ts:91 and the step-6 header comment) is now factually accurate — `db.batch()` IS a real atomic transaction, just not the interactive `BEGIN...COMMIT` kind.

## Before/After (informal observation, D-02)

**Before:** A study session commit with N graded cards issued 1 (recall_events insert) + N (sequential `await db.update(cards)`) + 1 (habitat_metadata upsert) = `N + 2` separate HTTP round trips to Neon. A typical 25-card session spent ~27 round trips serialized one after another on the "Saving your progress…" step.

**After:** The same commit issues exactly 1 `db.batch([...])` HTTP round trip regardless of N (bounded ≤502 by `CommitSchema.grades.max(500)`), verified by the new `h.batchCalls.count === 1` unit assertion. No new e2e timing harness was added this phase (D-02 explicitly scopes proof to the round-trip-count assertion); the informal expectation is the "Saving your progress…" step now resolves in roughly `1/(N+2)` of the prior number of round trips for a full session, since Neon's HTTP round-trip latency (not local compute) was the dominant cost in the old sequential loop.

## Task Commits

Each task was committed atomically:

1. **Task 1 (Wave 0): db.batch mock + batchCalls round-trip assertion** - `b00221e` (test)
2. **Task 2: Rewrite step-6 writes to one db.batch([...])** - `8c057ea` (feat)

**Plan metadata:** (this commit, docs)

_TDD gate sequence confirmed in git log: test(26-02) → feat(26-02), in order (RED then GREEN)._

## Files Created/Modified

- `src/app/api/study/complete/route.ts` - Step-6 write phase rewritten from 3 separate `await` statements (1 insert + N-loop update + 1 upsert) to one `await db.batch([insertRecallEvents, ...cardUpdateQueries, upsertHabitat] as [Batchable, ...Batchable[]])`. WR-04 commitId guard preserved verbatim in the card update WHERE clause. Stale "does not support transactions" comments (lines 91, 210-227) updated to describe the new atomic db.batch() reality.
- `src/app/api/study/complete/route.test.ts` - Added `h.batchCalls = { count: 0 }` to the `vi.hoisted()` block and a `batch: (queries) => { h.batchCalls.count++; return Promise.all(queries); }` key to the `vi.mock("@/db")` factory. Added `expect(h.batchCalls.count).toBe(1)` to the happy-path test. Existing "replay safety" (WR-04) describe block left unmodified in its assertions and passes unchanged against the new mock.

## Decisions Made

- D-01 honored exactly as specified: WR-04's per-session commitId idempotency machinery (deterministic recall_events ids + `onConflictDoNothing`, the guarded card UPDATE WHERE clause, the idempotent habitat upsert) is kept byte-identical. The atomic `db.batch()` wraps these writes; it does not replace or simplify the guard logic. Retiring WR-04 as redundant-after-atomicity is noted here as a candidate future cleanup, explicitly deferred out of this phase per the plan's `must_haves`.
- The `Batchable` type is declared AFTER the three query const declarations (`insertRecallEvents`, `cardUpdateQueries`, `upsertHabitat`) and derived via `typeof` from those actual constructed objects, rather than 26-RESEARCH.md's illustrative `ReturnType<typeof db.insert> | ReturnType<typeof db.update>` shape — see Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 26-RESEARCH.md's illustrative `Batchable` type shape failed `tsc`**
- **Found during:** Task 2 verification (`npx tsc --noEmit`, run proactively ahead of the orchestrator's wave gate given this is the app's most critical write path)
- **Issue:** `type Batchable = ReturnType<typeof db.insert> | ReturnType<typeof db.update>` (the shape given in 26-RESEARCH.md Pattern 1 and 26-PATTERNS.md) resolves to the PRE-`.values()` builder types (`PgInsertBuilder`, `PgUpdateBuilder`), which are missing the `_` property drizzle's `BatchItem<"pg">` constraint requires. `tsc` reported two errors: the tuple cast target type mismatch, and a "neither type sufficiently overlaps" conversion error on the `as [Batchable, ...Batchable[]]` cast.
- **Fix:** Redeclared `Batchable` AFTER the three query consts were built, deriving it via `typeof insertRecallEvents | (typeof cardUpdateQueries)[number] | typeof upsertHabitat` — the actual fully-chained runnable query types, which DO satisfy `BatchItem<"pg">` since they are the exact objects `db.batch()` is designed to accept.
- **Files modified:** `src/app/api/study/complete/route.ts`
- **Verification:** `npx tsc --noEmit` exits 0 (zero errors, full project); `npx vitest run src/app/api/study/complete/route.test.ts` still green (5/5); scoped `npx biome ci` clean on both touched files.
- **Committed in:** `8c057ea` (Task 2 commit — the type declaration was written correctly within the same commit, no separate fix-up commit needed since this was caught before the task commit landed)

---

**Total deviations:** 1 auto-fixed (1 Rule-1 bug in a type declaration, not a runtime behavior change).
**Impact on plan:** No scope creep — the fix is a pure TypeScript type-shape correction; the runtime `db.batch()` call, its argument array, and the tuple-cast SAFETY REASONING (non-emptiness guaranteed by `CommitSchema.grades.min(1)`) are all exactly as the plan specified.

## Issues Encountered

None beyond the deviation documented above.

## User Setup Required

None - no external service configuration required. Zero new dependencies (per 26-RESEARCH.md's Package Legitimacy Audit: N/A).

## Next Phase Readiness

- **This plan is independently deployable.** It touches only `src/app/api/study/complete/route.ts` and its test file — no other route, component, or schema was modified. Main auto-deploys prod (per PROJECT.md); Josh can push ahead of the rest of Phase 26.
- Scoped verification is green: `npx vitest run src/app/api/study/complete/route.test.ts` (5/5 passed, including the new `batchCalls===1` D-02 proof and the unmodified WR-04 replay-safety block). Scoped `npx biome ci` on both touched files is clean. Full `npx tsc --noEmit` (whole project) exits 0 — run proactively this session given the plan's stated `<verification>` wave-gate requirement and the criticality of this write path.
- Orchestrator wave gate still owed: full `npx vitest run` (whole suite) + `npm run qa:run` against a freshly-restarted dev server (MANDATORY per Phase 17 D-10 precedent — this plan touches the study/SRS write path, the criterion-6 core-journey proof for PERF-07).
- Remaining Phase 26 plans (PERF-08, PERF-10, PERF-11) are unblocked and independent of this plan's changes.

## Known Stubs

None.

## Threat Flags

None — this plan's threat surface (T-26-05..08, T-26-SC) was fully anticipated and mitigated per the plan's own `<threat_model>`; no new unanticipated surface was introduced. `db.batch()`'s atomicity is a net security/correctness improvement (T-26-08), not a new risk.

---
*Phase: 26-performance-batch*
*Completed: 2026-07-21*

## Self-Check: PASSED

All modified files verified present on disk (route.ts, route.test.ts); SUMMARY.md verified present; both commit hashes (b00221e, 8c057ea) verified present in git log.
