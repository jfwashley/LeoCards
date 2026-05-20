---
phase: 11-review-commit
iteration: 1
fix_scope: critical_warning
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-05-20
**Source review:** `.planning/phases/11-review-commit/11-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (Critical + Warning): 4
- Fixed: 4
- Skipped: 0
- Info findings (IN-01..IN-04): out of scope; not addressed

## Fixed Issues

### WR-01: `saveImageCards` accepts unbounded, unvalidated `cardInputs`

**Files modified:** `src/lib/deck-actions.ts`
**Commit:** `3df91fa`
**Applied fix:** Added a pre-auth guard block in `saveImageCards`:
- Returns `[]` immediately for empty or non-array input (no auth, no DB).
- Throws `"Too many cards in a single request"` if `cardInputs.length > 100`.
- For each input, validates that `front`/`back` are strings, throws `"Invalid card data"` if either is empty/whitespace-only after trim or exceeds 500 characters.
- Builds a `sanitizedInputs` array of trimmed pairs and iterates over it in the insert loop (so DB rows are stored trimmed).
- All validation runs before auth, so malformed requests fail fast without a session lookup.

### WR-02: `handleNext` and `handleCommit` lack outer try/catch — UI can get permanently stuck

**Files modified:** `src/components/review-list.tsx`
**Commit:** `6561459`
**Applied fix:** Wrapped both async handlers in `try/catch`:
- `handleNext` catch dispatches `BACK_TO_STEP_A` (existing reducer action) so the user returns to the editable word list and can retry.
- `handleCommit` catch dispatches a failed `COMMIT_DONE` (`addedCount: 0`, `failedCount: state.translationRows.length`, `skippedCount: state.duplicates.length`) so the UI transitions to the success screen with a non-zero failed count instead of staying stuck on the spinner.
- Cancelled-ref check (`if (cancelled.current) return`) is preserved in both catch branches so a user-initiated cancel during the failure path does not dispatch a redundant state transition.

### WR-03: `commitReviewRows` test mocks diverge from real server action shape — false coverage

**Files modified:** `src/components/review-list.tsx`, `src/components/review-list.test.ts`
**Commit:** `1318032`
**Applied fix:**
- In `review-list.tsx`, replaced the dual-shape shim with destructuring: `const [result] = await saveImageCards(...)`. Production and test now exercise the same array-unwrap path.
- In `review-list.test.ts`, updated `mockSaveImageCards.mockResolvedValueOnce(...)` calls in the batch-commit and continue-on-failure tests to return `Array<{ok}>` (e.g. `[{ ok: true }]`) instead of bare objects, matching the production server action contract.
- Biome reformat in the same commit reorganized imports (existing convention); no behavioural change.

### WR-04: `saveImageCards` has no unit tests in `deck-actions.test.ts`

**Files modified:** `src/lib/deck-actions.test.ts`
**Commit:** `36dff98`
**Applied fix:** Added `describe("saveImageCards")` with eight tests covering:
1. Empty input array short-circuits to `[]` without auth or DB writes.
2. Over-100 input length throws `"Too many cards in a single request"` (WR-01 guard).
3. Empty/whitespace `front` or `back` throws `"Invalid card data"`.
4. Over-500-character `front` or `back` throws `"Invalid card data"`.
5. Unauthorized (no session) throws `"Unauthorized"`.
6. Forbidden (deck owned by other user) throws `"Forbidden"`.
7. Happy path: inserts each card with `source: "image"`, returns `[{ok: true}, ...]`, `revalidatePath("/dashboard")` called exactly once after all inserts.
8. Continue-on-failure: one rejected insert still returns outcomes for all inputs with the correct ok/error split, and `revalidatePath` still called once.

Added `saveImageCards` to the import list in `deck-actions.test.ts`.

## Verification

- `npx tsc --noEmit` — clean for source/test files; only pre-existing errors in `.next/dev/types/*` generated routes (unrelated to changes).
- `npx vitest run src/lib/deck-actions.test.ts src/components/review-list.test.ts` — 14 files, 313 tests, all green.
- `npx vitest run` (full unit suite) — 1773 unit tests pass. 11 `e2e/*.spec.ts` files reported as failed by vitest because they are Playwright specs; this is a pre-existing test-runner configuration matter, not caused by these fixes.
- `npx biome check --write` applied formatting auto-fixes (import sort, single-line `db.insert(...).values(...)`) in the touched files; one pre-existing `noExplicitAny` warning in `review-list.test.ts:342` remains and is unrelated.

## Skipped Issues

None.

## Out-of-Scope (Info)

IN-01, IN-02, IN-03, IN-04 are Info-severity and outside the `critical_warning` fix scope. They remain documented in `11-REVIEW.md` for future consideration.

---

_Fixed: 2026-05-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
