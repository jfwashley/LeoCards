---
phase: 12
plan: 02
status: complete
date: 2026-05-20
---

# Plan 12-02 — SUMMARY: Engine + queries

## What shipped

### Task 1 — `computeUnpauseUpdate` + 4 unit tests
- **`src/lib/study-engine.ts`** — appended new export starting at **line 283** (after `earliestCooldownEnd`, which now ends at line 267 followed by the new section banner).
  - Signature: `computeUnpauseUpdate(pausedAt: Date, cooldownUntil: Date | null, now: Date): { cooldownUntil: Date | null; pausedAt: null }`.
  - Pure — no `Date.now()`, no I/O, no module-state closure. All inputs are arguments.
  - Behavior: NULL cooldown stays NULL; non-NULL shifts by exactly `(now − pausedAt)`; `pausedAt` always returns `null` (typed as literal `null`, encoding "this write clears pausedAt"). `lastStudiedAt` is intentionally not in the return type (Pitfall 4).
- **`src/lib/study-engine.test.ts`** — added `computeUnpauseUpdate` to the import block; appended a `describe("computeUnpauseUpdate", …)` block at the end of the file with the 4 verbatim cases from 12-RESEARCH.md § "Vitest test scaffold":
  1. "leaves NULL cooldown NULL"
  2. "shifts future cooldown forward by exact pause duration"
  3. "shifts past cooldown forward too (overdue card stays overdue by same amount)"
  4. "zero-duration pause leaves cooldown unchanged"

**Untouched (Pitfall 3 invariant):** `CardForSession`, `SessionCard`, `GradeEntry`, `assembleSession`, `computeCardUpdate`, `earliestCooldownEnd`, `interleave`, `getCardStage`, `shuffleTake` — all unchanged. No paused field anywhere in engine interfaces.

### Task 2 — `getStudyCards` filters paused cards at the query layer
- **`src/lib/study-queries.ts`** — exactly two surgical edits:
  - Line 5: import changed from `import { eq } from "drizzle-orm";` to `import { and, eq, isNull } from "drizzle-orm";`.
  - Lines 40–43: WHERE clause changed from `.where(eq(cards.deckId, deckId));` to `.where(and(eq(cards.deckId, deckId), isNull(cards.pausedAt)));`, with a two-line comment above pointing to `12-CONTEXT.md D-04` so future readers see why pause is filtered here, not in study-engine.
- SELECT projection is unchanged — the engine never consumes `pausedAt`, the filter does all the work. Dashboard due-count, `assembleSession`, and `earliestCooldownEnd` all inherit the filter automatically (page.tsx → getStudyCards → engine).

## Verification

- `grep -c 'export function computeUnpauseUpdate' src/lib/study-engine.ts` → **1** ✓
- `grep -c 'describe("computeUnpauseUpdate"' src/lib/study-engine.test.ts` → **1** ✓
- `grep -c 'isNull(cards.pausedAt)' src/lib/study-queries.ts` → **1** ✓
- `grep -c 'and, eq, isNull' src/lib/study-queries.ts` → **1** ✓
- `npx vitest run src/lib/study-engine.test.ts -t computeUnpauseUpdate` → **4 passed / 0 failed** ✓
- `npx vitest run src/lib/study-engine.test.ts` → **329 passed / 0 failed** ✓ (4 new + 325 pre-existing)
- `npx tsc --noEmit` → **clean** ✓
- `npm test` → **1775 unit tests passed / 0 failed**, 6 skipped (baseline was 1771 → +4 new `computeUnpauseUpdate` cases, exactly as expected). ✓

## Pre-existing tech debt re-surfaced (NOT a Plan 12-02 regression)

`npm test` reports 11 "failed test files" — these are Playwright e2e specs (`e2e/*.spec.ts`) being scanned by Vitest because `vitest.config.ts` has no `exclude: ['e2e/**']`. Same 11 files failed at the end of Plan 12-01 with the same error message ("Playwright Test did not expect test() to be called here"). Plan 12-02 made zero changes to vitest config, the e2e directory, or anything in the Playwright surface. Documented as deferred in 12-01-SUMMARY; carries forward unchanged.

## Commits

- **`1a3f7a3`** — `feat(12-02-1): add computeUnpauseUpdate pure function + 4 unit tests`
- **`eb83772`** — `feat(12-02-2): filter paused cards out of getStudyCards via isNull(cards.pausedAt)`

## Deviations from plan

**None.** Both tasks executed verbatim per the PLAN.md `<action>` blocks and the 12-RESEARCH.md verbatim code references. No deviation rules triggered.

## Carried into downstream plans

- **Plan 12-03** (`POST /api/cards/[id]/unpause`) imports `computeUnpauseUpdate` from `src/lib/study-engine.ts` (line **283**) and writes both `cooldownUntil` and `pausedAt` in a single Neon HTTP UPDATE (row-level atomic, matches the no-tx pattern from `study/complete/route.ts`).
- **Plan 12-04** (UI) inherits the dashboard's pause-aware due-count and countdown for free via `getStudyCards`. It will independently need `deck-queries.ts`'s `getDeckCards` to keep returning `pausedAt` (already does via `$inferSelect` since Plan 12-01) so `CardList` can render the badge and greyed-out style.
- Pitfall 3 invariant preserved: `CardForSession` still has no `isPaused` field. Any future code touching the engine must continue to honor this — pause filtering belongs at the query layer.

## Self-Check: PASSED

- `src/lib/study-engine.ts` — `computeUnpauseUpdate` present at line 283 ✓
- `src/lib/study-engine.test.ts` — `describe("computeUnpauseUpdate"` present, 4 `it()` cases, all green ✓
- `src/lib/study-queries.ts` — `and, eq, isNull` import and `isNull(cards.pausedAt)` in WHERE ✓
- Commits `1a3f7a3` and `eb83772` exist on `main` ✓
