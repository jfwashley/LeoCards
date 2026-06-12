---
phase: 03-study-engine-and-study-ui
plan: 02
subsystem: api
tags: [drizzle, zod, next-api, spaced-repetition, transactions]

# Dependency graph
requires:
  - phase: 03-study-engine-and-study-ui
    plan: 01
    provides: "computeCardUpdate pure function, GradeEntry type, CardForSession interface from study-engine.ts"
  - phase: 01-foundation
    provides: "auth.api.getSession, db connection, Drizzle schema with cards/decks/recall_events/habitat_metadata tables"
provides:
  - "POST /api/study/complete route handler — transactional batch session commit"
  - "getStudyCards query — loads all cards in a deck with masteryRound and cooldownUntil fields"
affects: [03-03-study-ui, habitat-phase, study-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route handler ownership verification via single db.select with and(eq(decks.id), eq(decks.userId)) query"
    - "Batch recall_events insert in single tx.insert().values([...]) call"
    - "habitat_metadata upsert via tx.insert().onConflictDoUpdate(target: habitat_metadata.userId)"
    - "recallCount increment via sql template literal: sql`\"recallCount\" + ${delta}`"

key-files:
  created:
    - src/lib/study-queries.ts
    - src/app/api/study/complete/route.ts
  modified: []

key-decisions:
  - "Ownership check uses single AND query (deckId + userId) — avoids two round-trips"
  - "Card validation checks all uniqueCardIds exist in DB before entering transaction — prevents partial failure inside tx"
  - "recallCountDelta uses sql template with double-quoted column name to match Drizzle's quoted identifier output"

patterns-established:
  - "Study queries file follows deck-queries.ts pattern: no 'use server', plain async functions, caller verifies session"
  - "Session commit route: auth check → body parse → ownership verify → card load → compute → transaction"

requirements-completed: [STUDY-01, STUDY-03, STUDY-04]

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 03 Plan 02: Session Commit Route and Study Data Queries Summary

**Transactional POST /api/study/complete that writes recall_events, advances masteryRound via computeCardUpdate, and upserts habitat_metadata in a single Drizzle transaction, plus getStudyCards query for session assembly**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T22:51:08Z
- **Completed:** 2026-03-27T22:53:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `getStudyCards` query that returns all fields needed for `CardForSession` construction (id, front, back, masteryRound, cooldownUntil, createdAt, recallCount)
- Created `POST /api/study/complete` with full auth, validation, ownership check, and atomic writes
- All writes (recall_events insert, per-card mastery updates, habitat_metadata upsert) execute in a single `db.transaction()` — implements D-04 partial save guarantee

## Task Commits

Each task was committed atomically:

1. **Task 1: Study queries — getStudyCards for session assembly** - `72eb96b` (feat)
2. **Task 2: POST /api/study/complete — batch session commit route** - `df06dd5` (feat)

## Files Created/Modified

- `src/lib/study-queries.ts` - Server-only query returning cards with mastery fields for session assembly
- `src/app/api/study/complete/route.ts` - POST handler: auth, zod validation, ownership, transactional writes

## Decisions Made

- Ownership check uses a single `and(eq(decks.id, deckId), eq(decks.userId, userId))` query — verifies both existence and ownership atomically without two round-trips
- Card state validation happens before entering the transaction — if any cardId is missing from the deck, returns 400 before DB writes begin
- `recallCount` incremented using `sql\`"recallCount" + ${delta}\`` template to match Drizzle's quoted identifier output (established pattern from RESEARCH.md Pitfall 4)
- `habitat_metadata` upsert uses `onConflictDoUpdate` on `userId` unique column — row may not exist on first study session (RESEARCH.md Pitfall 5)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `src/lib/study-engine.ts` and `src/lib/study-engine.test.ts` (branded type assignments) and `src/components/translation-form.tsx` (use-debounce export name) were present before this plan. Both new files (`study-queries.ts` and `route.ts`) compile without errors. Pre-existing errors are out of scope per deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `getStudyCards` ready for use in `src/app/(protected)/study/page.tsx` server component
- `POST /api/study/complete` ready to accept session results from the study UI client component
- Plan 03-03 can proceed: study page server component + client session state machine

---
*Phase: 03-study-engine-and-study-ui*
*Completed: 2026-03-27*
