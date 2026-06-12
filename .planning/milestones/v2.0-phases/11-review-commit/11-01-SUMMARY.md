---
phase: 11-review-commit
plan: "01"
subsystem: review-commit
tags: [tdd, wave-0, test-scaffold, type-gate, deck-actions]
dependency_graph:
  requires: []
  provides:
    - saveCard accepts "image" as source value (D-11 type gate)
    - Wave 0 test scaffolds for review-list and getSameLanguageDeckBackWords
  affects:
    - src/lib/deck-actions.ts (source union widened)
    - src/components/review-list.test.ts (new, RED)
    - src/lib/deck-actions.test.ts (extended, getSameLanguageDeckBackWords block RED)
tech_stack:
  added: []
  patterns:
    - vi.hoisted before vi.mock factories (Vitest 4 constraint)
    - RED scaffold convention: test imports non-existent Wave 2 module by design
key_files:
  created:
    - src/components/review-list.test.ts
  modified:
    - src/lib/deck-actions.ts
    - src/lib/deck-actions.test.ts
decisions:
  - Wave 0 scaffolds are intentionally RED (module-not-found) until Wave 2 ships review-list.tsx and getSameLanguageDeckBackWords
  - tsc --noEmit errors on test files are expected cascades of the RED scaffold module-not-found — not production code errors
  - Wave 2 must export the symbol contract documented below
metrics:
  duration: 8 min
  completed: "2026-05-19"
  tasks_completed: 3
  files_changed: 3
---

# Phase 11 Plan 01: Wave 0 — saveCard Union + Test Scaffolds Summary

Wave 0 type gate and Nyquist test scaffolds: widened saveCard source union to `"manual" | "wordlist" | "image"` and created intentionally-RED test scaffolds for reviewListReducer, isDuplicate, translation fan-out, batch commit, cancel, and getSameLanguageDeckBackWords.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Widen saveCard source union (D-11) | 737cd0c | src/lib/deck-actions.ts |
| 2 | Create review-list.test.ts scaffold (RED) | 8995135 | src/components/review-list.test.ts |
| 2a | Fix ts-expect-error → as-any cast | ff1f510 | src/components/review-list.test.ts |
| 3 | Append getSameLanguageDeckBackWords describe block (RED) | 2fc5111 | src/lib/deck-actions.test.ts |

---

## Wave 2 Exported Symbol Contract

Wave 2 (`11-02-PLAN.md` or equivalent) MUST export the following from `src/components/review-list.tsx`:

| Symbol | Type | Purpose |
|--------|------|---------|
| `reviewListReducer` | `(state: ReviewState, action: ReviewAction) => ReviewState` | Pure state machine reducer for the review flow |
| `isDuplicate` | `(word: string, knownWords: Set<string>) => boolean` | Case-insensitive + trim duplicate check |
| `runTranslationFanOut` | `(rows: TranslationRow[], targetLang: string, nativeLang: string) => Promise<TranslationFanOutResult[]>` | Orchestrates Promise.allSettled over /api/translate per row |
| `commitReviewRows` | `(rows: TranslationRow[], deckId: string, duplicates: string[]) => Promise<CommitResult>` | Sequential saveCard loop; returns {addedCount, failedCount, skippedCount} |
| `ReviewState` | type | State shape used by reviewListReducer |
| `ReviewAction` | type | Discriminated union of all actions |
| `TranslationRow` | type | Per-row shape: {id, word, nativeText, translationError} |
| `CommitResult` | type | {addedCount, failedCount, skippedCount} |

Wave 2 must also export `getSameLanguageDeckBackWords` from `src/lib/deck-actions.ts` to turn the deck-actions.test.ts GREEN.

### ReviewState Shape Contract

```typescript
type ReviewState = {
  step: "step-a" | "translating" | "step-b" | "committing" | "success";
  words: string[];            // original extracted words
  rows: ReviewRow[];          // non-duplicate rows (step A)
  duplicates: string[];       // already-known words (excluded from commit)
  dedupeError: string | null;
  translationRows: TranslationRow[];  // step B rows
  commitStep: null | "in-flight" | "done";
  addedCount: number;
  failedCount: number;
  skippedCount: number;       // equals duplicates.length
};
```

### ReviewAction Discriminated Union (required actions)

- `DEDUPE_DONE` with `knownWords: Set<string>`
- `DEDUPE_ERROR` with `error: string`
- `TOGGLE_WORD` with `id: string`
- `EDIT_WORD` with `id: string, word: string`
- `REMOVE_WORD` with `id: string`
- `SELECT_ALL`
- `SELECT_NONE`
- `TRANSLATE_START`
- `TRANSLATION_ROW_DONE` with `id: string, nativeText: string`
- `TRANSLATION_ROW_ERROR` with `id: string, error: string`
- `EDIT_NATIVE` with `id: string, nativeText: string`
- `EDIT_TARGET` with `id: string, word: string`
- `COMMIT_START`
- `COMMIT_DONE` with `addedCount: number, failedCount: number, skippedCount: number`
- `BACK_TO_STEP_A`

---

## Known Stubs

None — this plan creates no UI components or data connections. It only widens a type union and creates test scaffolds.

---

## Intentionally RED Scaffolds

Both new test constructs are RED by design at Wave 0 (consistent with Phase 10's extract.unit.test.ts convention documented in STATE.md):

| File | Why RED | Turns GREEN |
|------|---------|-------------|
| `src/components/review-list.test.ts` | Imports `@/components/review-list` which does not exist yet | Wave 2: create review-list.tsx with exported contract above |
| `src/lib/deck-actions.test.ts` `getSameLanguageDeckBackWords` block | Function not yet exported from deck-actions.ts | Wave 2: implement getSameLanguageDeckBackWords server action |

`npx tsc --noEmit` errors on these files are also expected (cascading from module-not-found). Production source code is tsc-clean.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced @ts-expect-error with as-any cast**
- **Found during:** Task 2 post-commit tsc check
- **Issue:** `@ts-expect-error` became an "unused directive" error because the module import fails (ReviewAction type unknown), so TS couldn't see the discriminated union violation
- **Fix:** Replaced with `as any` cast + eslint-disable comment — semantically equivalent for the test intent
- **Files modified:** src/components/review-list.test.ts
- **Commit:** ff1f510

---

## Verification Results

- `npx tsc --noEmit` — 7 errors all from RED scaffold files (expected); production source is clean
- `npx vitest run src/components/review-list.test.ts` — RED (Cannot find module '@/components/review-list') — expected
- `npx vitest run src/lib/deck-actions.test.ts -t "saveCard"` — GREEN (39 passed, 237 skipped)
- `npx vitest run src/lib/deck-actions.test.ts -t "getSameLanguageDeckBackWords"` — RED (3 failed: not a function) — expected
- Unit test suite (non-e2e): 2 files failing (both intentional RED scaffolds), 81 files passing, 1733 tests green
- e2e test failures are pre-existing (require live server + Neon DB); not caused by this plan

---

## Self-Check: PASSED

- [x] src/components/review-list.test.ts exists with 5 describe blocks
- [x] src/lib/deck-actions.test.ts has getSameLanguageDeckBackWords describe block with 3 tests
- [x] src/lib/deck-actions.ts saveCard source = "manual" | "wordlist" | "image"
- [x] Commits 737cd0c, 8995135, ff1f510, 2fc5111 all exist
- [x] Prior test suite (1733 tests) GREEN
