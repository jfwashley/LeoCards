---
phase: 11-review-commit
reviewed: 2026-05-19T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/deck-actions.ts
  - src/components/review-list.tsx
  - src/components/review-list.test.ts
  - src/lib/deck-actions.test.ts
  - src/components/image-upload-flow.tsx
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

The two new server actions (`getSameLanguageDeckBackWords`, `saveImageCards`) are correctly gated behind auth + ownership checks and meet the security contract. No critical vulnerabilities found. The main concerns are: (1) `saveImageCards` accepts an unbounded `cardInputs` array with no server-side length or content guard, which is an exploitable input-validation gap; (2) `handleNext` and `handleCommit` in `ReviewList` have no outer try/catch, leaving the UI in an unrecoverable stuck state if an unexpected error propagates; (3) the `commitReviewRows` test mocks diverge from the real server action return type, giving false confidence in the array-unwrap path; (4) `saveImageCards` itself has no unit tests in `deck-actions.test.ts`. The remaining findings are info-level code quality items.

## Warnings

### WR-01: `saveImageCards` accepts unbounded, unvalidated `cardInputs`

**File:** `src/lib/deck-actions.ts:239`
**Issue:** The `cardInputs` parameter has no server-side length cap and no per-field length or non-empty validation. A crafted client can send 10,000 card pairs in a single call, causing sequential DB hammering within one server action invocation. Additionally `front` and `back` values are inserted verbatim — empty strings, whitespace-only strings, and arbitrarily long strings are all accepted. All other server actions (`saveCard`, `addWordToCard`) share the same field-validation gap but are single-card and therefore lower risk.
**Fix:**
```typescript
export async function saveImageCards(
  deckId: string,
  cardInputs: Array<{ front: string; back: string }>,
): Promise<Array<{ ok: boolean; error?: string }>> {
  // Guard: cap array length and validate each field before auth
  if (!Array.isArray(cardInputs) || cardInputs.length === 0) {
    return [];
  }
  if (cardInputs.length > 100) {
    throw new Error("Too many cards in a single request");
  }
  for (const input of cardInputs) {
    const f = input.front.trim();
    const b = input.back.trim();
    if (!f || !b || f.length > 500 || b.length > 500) {
      throw new Error("Invalid card data");
    }
  }

  const session = await auth.api.getSession({ headers: await headers() });
  // ... rest unchanged
```

---

### WR-02: `handleNext` and `handleCommit` lack outer try/catch — UI can get permanently stuck

**File:** `src/components/review-list.tsx:494` and `527`
**Issue:** Both async event handlers dispatch a loading step (`TRANSLATE_START` / `COMMIT_START`) and then `await` a helper. Neither has a top-level try/catch. If the outer await throws for any reason (unexpected runtime error, future refactor breaking `runTranslationFanOut`'s `allSettled` contract, etc.), the reducer remains in `"translating"` or `"committing"` with no transition back. The user sees a permanent spinner with no Cancel button (the Cancel button is hidden during `"committing"` at line 624, and the "translating" UI only shows a Cancel that sets `cancelled.current = true` but does not dispatch a step transition).
**Fix:**
```typescript
async function handleNext() {
  dispatch({ type: "TRANSLATE_START" });
  try {
    const keptRows = state.rows.filter((r) => r.kept);
    // ... existing logic ...
    dispatch({ type: "TRANSLATE_ALL_DONE", rows: completedRows });
  } catch {
    // Roll back to step-a so the user can retry
    dispatch({ type: "BACK_TO_STEP_A" });
  }
}

async function handleCommit() {
  dispatch({ type: "COMMIT_START" });
  try {
    const result = await commitReviewRows(...);
    if (cancelled.current) return;
    dispatch({ type: "COMMIT_DONE", ... });
  } catch {
    // Dispatch a failed commit so the UI can recover
    dispatch({ type: "COMMIT_DONE", addedCount: 0, failedCount: state.translationRows.length, skippedCount: state.duplicates.length });
  }
}
```

---

### WR-03: `commitReviewRows` test mocks diverge from real server action shape — false coverage

**File:** `src/components/review-list.test.ts:428`
**Issue:** `saveImageCards` in production returns `Array<{ ok: boolean; error?: string }>`. The test mocks return a plain object (`{ ok: true }` / `{ ok: false }`). The dual-shape shim at `review-list.tsx:304-305` exists to bridge this mismatch. As a result, the critical `outcome[0]` array-indexing path is never exercised by any test. If `saveImageCards` returns an empty array (e.g., called with zero inputs), `outcome[0]` is `undefined`, `result?.ok` is falsy, and the card is incorrectly counted as failed — but no test would catch this regression.
**Fix:** Update the mocks to return the real array shape, and remove the dual-shape shim:
```typescript
// In test:
mockSaveImageCards
  .mockResolvedValueOnce([{ ok: true }])   // <-- array shape
  .mockResolvedValueOnce([{ ok: false }])
  .mockResolvedValueOnce([{ ok: true }]);

// In review-list.tsx, simplify commitReviewRows:
const [result] = await saveImageCards(deckId, [
  { front: row.nativeText.trim(), back: row.word.trim() },
]);
if (result?.ok) {
  addedCount++;
} else {
  failedCount++;
}
```

---

### WR-04: `saveImageCards` has no unit tests in `deck-actions.test.ts`

**File:** `src/lib/deck-actions.test.ts:66`
**Issue:** The import list at lines 66-73 does not include `saveImageCards`. The function is a new server action with auth, ownership verification, sequential-insert loop, continue-on-failure, and `revalidatePath` semantics. None of these are tested at the unit level. The coverage that exists for it lives in `review-list.test.ts` through a mock that doesn't test the actual action at all. The parallel with `getSameLanguageDeckBackWords` (which has three tests: Unauthorized, Forbidden, and happy-path) makes the gap especially visible.
**Fix:** Add a `describe("saveImageCards")` block covering at minimum: Unauthorized, Forbidden (deckId owned by another user), a happy-path that verifies `source: "image"` and `revalidatePath` called once, and a continue-on-failure case where one insert throws but the loop still returns outcomes for all inputs.

---

## Info

### IN-01: `saveImageCards` ownership check uses two-step pattern; `getSameLanguageDeckBackWords` uses stronger combined-WHERE pattern

**File:** `src/lib/deck-actions.ts:249`
**Issue:** `saveImageCards` fetches the deck with `eq(decks.id, deckId)` only (line 250) and then compares `deck.userId !== userId` in application code (line 253). This fetches a row that may not belong to the user before the check fires. `getSameLanguageDeckBackWords` (line 207) uses the safer combined-WHERE `and(eq(decks.id, ...), eq(decks.userId, ...))` pattern, which is a single atomic gate. Inconsistency between the two patterns in the same file could confuse future reviewers. Not a security bug — both patterns correctly reject foreign deckIds — but the weaker pattern is present in `saveCard`, `addWordToCard`, and `removeWordFromDeck` as well.
**Fix:** For new server actions, prefer the combined-WHERE pattern:
```typescript
const [deck] = await db
  .select({ id: decks.id })
  .from(decks)
  .where(and(eq(decks.id, deckId as DeckId), eq(decks.userId, userId)));
if (!deck) throw new Error("Forbidden");
```

---

### IN-02: `commitReviewRows` exported cancel tests trivially pass without testing component behaviour

**File:** `src/components/review-list.test.ts:464`
**Issue:** The two cancel tests (RVW-05b, lines 464-483) directly call `onCancel()` on a vi.fn() without mounting the component. They assert the mock was called (which is tautological) and that `mockSaveImageCards` was not called (trivially true because nothing called it). These tests give no coverage of the `cancelled.current` guard or the actual component cancel wiring.
**Fix:** Either mount the component with a test renderer and simulate user interactions, or document the tests as placeholder contracts and remove the misleading assertions. If full render tests are deferred to UAT, remove the trivially-passing assertions so they don't inflate confidence.

---

### IN-03: Silent language fallback to `"fr"` in `image-upload-flow.tsx`

**File:** `src/components/image-upload-flow.tsx:209` and `391`
**Issue:** `deck?.language ?? "fr"` silently defaults the target language to French if `selectedDeckId` doesn't match any entry in `decks`. In production this should never happen, but a stale prop or a race condition during re-render could silently send extractions/reviews to the wrong language endpoint without any error surfacing. The fallback value `"fr"` is arbitrary.
**Fix:** Replace the silent fallback with an early error so configuration bugs surface loudly:
```typescript
const deck = decks.find((d) => d.id === state.selectedDeckId);
if (!deck) {
  // This should never happen — selectedDeckId must always be in decks
  dispatch({ type: "EXTRACT_ERROR", status: 0, message: "Deck not found." });
  return;
}
const targetLanguage = deck.language;
```

---

### IN-04: `initialState` object constructed on every render inside component body

**File:** `src/components/review-list.tsx:456`
**Issue:** The `initialState` object literal is created on every render pass, even though `useReducer` only consumes it on the first render. This is harmless for correctness but is a minor unnecessary allocation per render cycle and the non-idiomatic form in React.
**Fix:** Pass an initializer function instead of a value, or move the construction outside the component if `words`/`deckId` do not need to be captured at render time:
```typescript
const [state, dispatch] = useReducer(
  reviewListReducer,
  { words, deckId },
  ({ words }) => ({
    step: "loading-dedupe" as ReviewStep,
    words,
    rows: [],
    duplicates: [],
    dedupeError: null,
    translationRows: [],
    commitStep: null,
    addedCount: 0,
    failedCount: 0,
    skippedCount: 0,
  }),
);
```

---

_Reviewed: 2026-05-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
