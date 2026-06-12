---
phase: 11-review-commit
plan: "02"
subsystem: api
tags: [drizzle-orm, next-server-actions, neon, vitest, authz]

# Dependency graph
requires:
  - phase: 11-01
    provides: "saveCard source union widened to include 'image'; getSameLanguageDeckBackWords RED test scaffold in deck-actions.test.ts"
provides:
  - "getSameLanguageDeckBackWords server action: auth+ownership-gated, trimmed+lowercased Set of same-language card back values"
  - "saveImageCards server action: single auth+ownership check, sequential continue-on-failure batch insert, source='image', per-card outcomes"
affects: [11-03, 11-04, review-list]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Combined ownership+language gate in single query (T-11-03): first query combines eq(decks.id)+eq(decks.userId) — foreign deckId yields no row → Forbidden before any data read"
    - "Batch continue-on-failure insert pattern (D-12): sequential loop + try/catch per card + single revalidatePath after loop — Neon HTTP has no transactions"

key-files:
  created: []
  modified:
    - src/lib/deck-actions.ts

key-decisions:
  - "Combined ownership+language gate in getSameLanguageDeckBackWords: first query uses and(eq(decks.id, deckId), eq(decks.userId, userId)) — one round-trip checks both ownership and gets language"
  - "saveImageCards returns per-card outcome array (not aggregate counts) — Wave 3 can compute added/failed from outcomes.filter(o => o.ok).length"
  - "No logging of cardInputs, back values, or image data in saveImageCards (T-11-06 privacy mitigation)"

patterns-established:
  - "Batch server action pattern: one auth+ownership check → sequential loop with continue-on-failure → single revalidatePath → return outcomes array indexed by input"

requirements-completed: [RVW-04, RVW-05]

# Metrics
duration: 3min
completed: "2026-05-19"
---

# Phase 11 Plan 02: Review & Commit — Server Actions Summary

**Two auth+ownership-gated server actions added to deck-actions.ts: getSameLanguageDeckBackWords (D-04/D-05 dedupe lookup with combined ownership+language gate) and saveImageCards (D-12 batched continue-on-failure insert with source="image")**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-19T15:43:39Z
- **Completed:** 2026-05-19T15:46:30Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `getSameLanguageDeckBackWords` exported from `deck-actions.ts`: session auth → combined ownership/language ownership gate (T-11-03) → inner-join query returning trimmed+lowercased Set of back values from all same-language user decks
- `saveImageCards` exported from `deck-actions.ts`: session auth → single ownership check (T-11-04) → sequential continue-on-failure insert loop with `source: "image"` → single `revalidatePath("/dashboard")` → per-card outcomes array
- `deck-actions.test.ts` `getSameLanguageDeckBackWords` describe block (3 tests: Unauthorized / Forbidden / happy-path) goes GREEN; all 276 prior deck-actions tests remain GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: getSameLanguageDeckBackWords server action** - `5542475` (feat)
2. **Task 2: saveImageCards batch insert server action** - `6350f3e` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/lib/deck-actions.ts` - Added `getSameLanguageDeckBackWords` (lines 197-225) and `saveImageCards` (lines 239-288); no new imports; "use server" already at file top

## Decisions Made

- Combined ownership+language gate in single query for `getSameLanguageDeckBackWords`: uses `and(eq(decks.id, deckId), eq(decks.userId, userId))` in one DB round-trip — more efficient than two queries and provides atomic authz check
- `saveImageCards` returns `Array<{ ok: boolean; error?: string }>` indexed by input (not `{ added, failed }` counts) — Wave 3 can derive counts; richer data allows per-card error reporting
- No card text or image data is logged in either function (T-11-06 privacy mitigation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The `npm test` full-suite run shows 12 pre-existing failures (11 Playwright e2e specs run by Vitest with wrong runner, 1 review-list.test.ts Wave 3 RED scaffold). Confirmed pre-existing by git stash verification — identical failures before and after Task 2.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Wave 3 (11-03) can now import both actions from `@/lib/deck-actions`:

```typescript
import { getSameLanguageDeckBackWords, saveImageCards } from "@/lib/deck-actions";
```

Exact signatures delivered:
```typescript
export async function getSameLanguageDeckBackWords(deckId: string): Promise<Set<string>>;
export async function saveImageCards(
  deckId: string,
  cardInputs: Array<{ front: string; back: string }>,
): Promise<Array<{ ok: boolean; error?: string }>>;
```

`review-list.test.ts` remains the only RED file — its symbols (`reviewListReducer`, `isDuplicate`, `runTranslationFanOut`, `commitReviewRows`) are delivered in Wave 3.

---
*Phase: 11-review-commit*
*Completed: 2026-05-19*
