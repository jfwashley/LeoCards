---
phase: 02-deck-and-card-management
plan: 02
subsystem: database
tags: [drizzle, vitest, server-actions, next-js, typescript, cards, decks]

requires:
  - phase: 02-deck-and-card-management
    plan: 01
    provides: Schema migration (decks.name, user.nativeLanguage, removed unique constraint), db export, auth export

provides:
  - Server Actions: createDeck, saveCard, editCard, deleteCard, addWordToCard, removeWordFromDeck
  - Read queries: getUserDecks, getDeckCards, getDeckCardWords, getUserNativeLanguage
  - 21 unit tests covering happy path and auth/ownership failure paths

affects: [02-03, 02-04, 02-05]

tech-stack:
  added: []
  patterns:
    - vi.hoisted() pattern for vitest mocks that reference variables in vi.mock() factories
    - Branded type casts (userId as UserId) required when comparing plain string to branded column
    - as unknown as ReturnType<...> for test mock type compatibility with drizzle chain types

key-files:
  created:
    - src/lib/deck-actions.ts
    - src/lib/deck-queries.ts
    - src/lib/deck-actions.test.ts
  modified: []

key-decisions:
  - "vi.hoisted() used to declare shared mock chain objects that are referenced in vi.mock() factories — required because vi.mock() is hoisted before variable declarations"
  - "deck-queries.ts has no 'use server' directive — these are Server Component data fetchers, not client-callable server actions"
  - "getUserDecks and getDeckCards take userId/deckId as plain strings; callers are responsible for session verification"
  - "editCard and deleteCard use innerJoin pattern to fetch card+deck in one query for ownership verification"

patterns-established:
  - "Ownership verification pattern: SELECT card+deck via innerJoin, check deckUserId === session.user.id, throw Forbidden if mismatch"
  - "Deck name auto-generation: COUNT existing decks for user+language, use n+1 as suffix"

requirements-completed: [DECK-01, DECK-03, DECK-04, DECK-05, DECK-06]

duration: 10min
completed: 2026-03-24
---

# Phase 2 Plan 02: Server Actions and Query Functions Summary

**Drizzle-backed server actions (createDeck, saveCard, editCard, deleteCard, addWordToCard, removeWordFromDeck) and read queries (getUserDecks, getDeckCards, getDeckCardWords, getUserNativeLanguage) with auth checks, ownership verification, and 21 passing unit tests**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-24T14:26:54Z
- **Completed:** 2026-03-24T14:35:56Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 6 server actions with "use server" directive, auth checks on every action, ownership verification before mutations, revalidatePath("/dashboard") on success
- createDeck auto-generates "{Language} #{n}" names via count query (French #1, French #2, etc.)
- 4 read query functions for Server Components: getUserDecks, getDeckCards, getDeckCardWords (returns Set<string> for O(1) word browser lookup), getUserNativeLanguage
- 21 unit tests covering happy paths and Unauthorized/Forbidden failure cases

## Task Commits

1. **TDD RED: Failing tests for server actions** - `c19ae31` (test)
2. **Task 1: Server Actions implementation + GREEN tests** - `8fca2d9` (feat)
3. **Task 2: Read query functions** - `54ddb0c` (feat)

## Files Created/Modified

- `src/lib/deck-actions.ts` - 6 server actions with "use server", auth/ownership checks, revalidation
- `src/lib/deck-queries.ts` - 4 read query functions for Server Components (no "use server")
- `src/lib/deck-actions.test.ts` - 21 unit tests using vi.hoisted() mock pattern

## Decisions Made

- `vi.hoisted()` required for vitest mocks — `vi.mock()` factories are hoisted before `const` declarations, so any shared mock chain objects must be declared with `vi.hoisted()` to be available inside the factory
- `deck-queries.ts` deliberately has no "use server" directive — these are called from Server Components that already have a session context, not from the client
- `userId as UserId` cast required in deck-queries.ts because Drizzle `eq()` on branded columns rejects plain `string` arguments

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.mock hoisting issue in test file**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** `vi.mock()` factories are hoisted to the top of the file before variable declarations, causing "Cannot access 'selectChain' before initialization" at runtime
- **Fix:** Rewrote test mocks using `vi.hoisted()` to declare shared chain objects that are available in the factory scope
- **Files modified:** src/lib/deck-actions.test.ts
- **Verification:** `npx vitest run src/lib/deck-actions.test.ts` passes 21 tests
- **Committed in:** 8fca2d9 (Task 1 GREEN commit)

**2. [Rule 1 - Bug] Fixed branded type cast in deck-queries.ts**
- **Found during:** Task 2 (tsc --noEmit verification)
- **Issue:** `eq(user.id, userId)` failed because `user.id` is typed as `UserId` (branded) and `userId` is plain `string` — drizzle `eq()` overloads don't accept mismatched types
- **Fix:** Added `userId as UserId` cast in `getUserDecks` and `getUserNativeLanguage`
- **Files modified:** src/lib/deck-queries.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 54ddb0c (Task 2 commit)

**3. [Rule 3 - Blocking] Installed missing deepl-node dependency in worktree**
- **Found during:** Task 2 (tsc --noEmit verification)
- **Issue:** `deepl-node` was in package.json but not installed in this worktree — caused TS2307 in translate/route.ts (pre-existing plan 01 file)
- **Fix:** Ran `npm install deepl-node use-debounce` to sync worktree node_modules
- **Files modified:** (node_modules only — package.json unchanged, version already correct)
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 54ddb0c (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 type/mock bugs, 1 blocking dep)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None — no new external service configuration required for this plan.

## Known Stubs

None — all functions are fully implemented. No placeholder returns or hardcoded values.

## Next Phase Readiness

- All 6 server actions are wired and importable from Server Components and client components
- All 4 query functions are ready for use in dashboard page and word list browser
- Plans 02-03, 02-04, 02-05 can call these functions directly

---
*Phase: 02-deck-and-card-management*
*Completed: 2026-03-24*
