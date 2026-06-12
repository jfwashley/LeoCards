---
phase: 07-backend-security-and-quality-fixes
plan: "01"
subsystem: security
tags:
  - authorization
  - study-flow
  - security
dependency_graph:
  requires: []
  provides:
    - card-ownership-verification
    - deck-ownership-verification-study-page
  affects:
    - src/app/api/study/complete/route.ts
    - src/app/(protected)/study/page.tsx
tech_stack:
  added: []
  patterns:
    - "Ownership verification via AND query (deckId + userId) — avoids two round-trips"
    - "Branded type cast (deckId as DeckId) for Drizzle eq() comparisons"
key_files:
  modified:
    - src/app/api/study/complete/route.ts
    - src/app/(protected)/study/page.tsx
decisions:
  - "Card ownership verified transitively via deck JOIN — cards.deckId = declaredDeckId, deck.userId = session.user.id"
  - "Study page redirects to /dashboard (not error page) for unauthorized deck access — consistent with existing deckId-missing redirect"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_modified: 2
requirements:
  - SEC-01
  - SEC-02
  - SEC-03
---

# Phase 07 Plan 01: Authorization Bypass Fixes in Study Flow Summary

## One-liner

Closed two critical auth bypasses: card grading now requires cards to belong to declared deckId (SEC-01/SEC-03), and study page verifies deck ownership before fetching cards (SEC-02).

## What Was Built

Two security patches to the study flow that prevent horizontal privilege escalation:

**Task 1 — POST /api/study/complete card ownership fix (SEC-01, SEC-03)**

The card loading query previously fetched cards by `inArray(cards.id, uniqueCardIds)` only — with no check that those cards belonged to the declared `deckId`. An attacker could submit a valid `deckId` they own alongside `cardId` values from another user's deck, causing grades to be written to cards they don't own.

Fixed by adding `eq(cards.deckId, deckId as DeckId)` to the WHERE clause. Any `cardId` not belonging to the declared deck is excluded from `cardRows`, missing from `cardMap`, and triggers the existing 400 "Invalid card" response. Since deck ownership is already verified in step 3 of the handler, card ownership is now proven transitively.

**Task 2 — study page deck ownership check (SEC-02)**

The study page (`/study?deck=ID`) previously called `getStudyCards(deckId)` without verifying the authenticated user owns that deck. Any logged-in user could load another user's cards by visiting `/study?deck=OTHER_USERS_DECK_ID`.

Fixed by adding a deck ownership query after session validation and before `getStudyCards`. Redirects to `/dashboard` if the deck is not owned by the authenticated user.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check

### Files Exist

- `src/app/api/study/complete/route.ts` — modified with `eq(cards.deckId, deckId as DeckId)` in card query
- `src/app/(protected)/study/page.tsx` — modified with ownership query and redirect before `getStudyCards`

### Commits Exist

- `bce6261` — fix(07-01): verify card-deck ownership in POST /api/study/complete
- `76d28a9` — fix(07-01): add deck ownership check to study page (SEC-02)

## Self-Check: PASSED
