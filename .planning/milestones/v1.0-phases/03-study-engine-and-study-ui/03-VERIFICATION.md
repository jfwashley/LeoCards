---
phase: 03-study-engine-and-study-ui
verified: 2026-03-27T23:20:00Z
status: human_needed
score: 11/11 must-haves verified
human_verification:
  - test: "End-to-end study session flow in browser"
    expected: "Full flow from deck view through session to completion with correct animations, grading, and stats"
    why_human: "3D flip animation quality, swipe gesture feel, card stack visual thinning, session end screen appearance cannot be verified programmatically"
  - test: "Study button disabled state with countdown"
    expected: "When all cards are in cooldown, Study button shows 'Next cards in Xh Ym' and is non-clickable; countdown refreshes every 60s; page refreshes when cooldown expires"
    why_human: "Requires live browser with actual cooldown state to observe timer behavior"
  - test: "Still-learning loop back"
    expected: "Cards graded 'still learning' (swipe left) reappear in a second pass at the end of the queue"
    why_human: "Requires interactive session to observe loop-back behavior"
  - test: "Quit-and-save flow"
    expected: "Quit session shows inline confirmation; 'Save and quit' commits all grades so far and navigates to dashboard"
    why_human: "Requires interactive session to verify partial-commit behavior and navigation"
---

# Phase 3: Study Engine and Study UI Verification Report

**Phase Goal:** Users can run a flashcard study session, see their mastery grow, and have the server reliably record which cards they have learned.
**Verified:** 2026-03-27T23:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | assembleSession returns only cards whose cooldownUntil is null or in the past | VERIFIED | study-engine.ts line 73–74: `c.cooldownUntil === null \|\| c.cooldownUntil <= now`; 3 tests confirm this (cooldown null, past, future cases) |
| 2 | assembleSession includes approximately 10% learned cards as resurface pool | VERIFIED | study-engine.ts lines 81–86: `Math.max(1, Math.floor(dueUnlearned.length * 0.1))`; 2 tests confirm (10 cards=1 resurface, 20 cards=2 resurface) |
| 3 | Resurface cards are interleaved every 3-4 cards, not clustered | VERIFIED | interleave() function (lines 110–140) uses two-pointer chunk approach, interval=3; test at line 119 confirms positions 3, 7, 11 |
| 4 | computeCardUpdate advances masteryRound from 0 to 1 when round 1 thresholds met | VERIFIED | ROUND_THRESHOLDS[0]={n2t:2, t2n:2}; test confirms newRound=1 with 2+2 correct; threshold-not-met test stays at 0 |
| 5 | computeCardUpdate advances masteryRound to 3 (learned) after 3 rounds | VERIFIED | ROUND_THRESHOLDS defined for rounds 0,1,2; test confirms round 2->3 with null cooldown |
| 6 | computeCardUpdate sets 12h cooldown after round 1, 24h after round 2, null after round 3 | VERIFIED | COOLDOWN_MS={0:12h, 1:24h, 2:null}; 3 tests confirm exact ms values |
| 7 | getCardStage returns n2t for round 0, t2n for round 1, random for round 2+ | VERIFIED | study-engine.ts lines 153–157; 4 tests cover all 4 round values |
| 8 | earliestCooldownEnd returns the soonest future cooldown date | VERIFIED | Lines 257–265; 3 tests cover null case, min selection, past date exclusion |
| 9 | cards table has masteryRound and cooldownUntil columns | VERIFIED | schema.ts lines 103–104; migration SQL `0001_ambitious_dark_beast.sql` confirms ALTER TABLE |
| 10 | recall_events table has direction column | VERIFIED | schema.ts line 116; migration SQL confirms ALTER TABLE |
| 11 | POST /api/study/complete writes recall_events, advances masteryRound, upserts habitat_metadata in a single transaction | VERIFIED | route.ts line 119: `db.transaction(async (tx)`; batch insert recall_events (line 121), per-card update (lines 131–141), onConflictDoUpdate habitat_metadata (lines 145–154) |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | Updated schema with direction on recall_events, masteryRound + cooldownUntil on cards | VERIFIED | All 3 columns present; RecallDirection type exported at line 21 |
| `src/lib/study-engine.ts` | Pure functions: assembleSession, getCardStage, computeCardUpdate, earliestCooldownEnd, interleave | VERIFIED | All 5 functions plus shuffleTake exported; only type imports from schema (line 1: `import type`) |
| `src/lib/study-engine.test.ts` | Vitest unit tests — min 100 lines | VERIFIED | 321 lines; 25 tests, 100% passing |
| `src/app/api/study/complete/route.ts` | POST handler for batch session commit | VERIFIED | 163 lines; exports POST; auth, validation, ownership, transaction all present |
| `src/lib/study-queries.ts` | getStudyCards query | VERIFIED | 31 lines; exports getStudyCards; selects id, front, back, masteryRound, cooldownUntil, createdAt, recallCount |
| `src/app/(protected)/study/page.tsx` | Server Component entry point | VERIFIED | 44 lines; no "use client"; imports getStudyCards + assembleSession; redirects on empty session |
| `src/components/study-session.tsx` | Client component with useReducer session state machine | VERIFIED | 436 lines; useReducer with all documented phases (studying/committing/end/error); commit fetch; quit flow; end screen |
| `src/components/study-card.tsx` | Single flashcard — 3D flip, swipe-to-grade | VERIFIED | 155 lines; motion/react import; rotateY flip; backfaceVisibility hidden; drag=x swipe; keyboard nav |
| `src/components/card-stack.tsx` | Layered CSS card stack visual | VERIFIED | 29 lines; opacities [0.6, 0.35, 0.15]; translateY + scale transforms; max 3 layers |
| `src/components/deck-view.tsx` | Modified — Study button with active/disabled+countdown | VERIFIED | hasDueCards/earliestCooldownEnd props; "Start studying" link; "Next cards in" disabled button; setInterval countdown; router.refresh() on expiry |
| `src/components/card-list.tsx` | Modified — mastery progress dots | VERIFIED | 3 dots per row; bg-primary filled; border-border empty; w-2 h-2 rounded-full; "Round X of 3" title attributes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/lib/study-engine.ts` | `src/db/schema.ts` | `import type { CardId, RecallDirection }` | VERIFIED | Line 1: type-only import confirmed |
| `src/app/api/study/complete/route.ts` | `src/lib/study-engine.ts` | `import { computeCardUpdate }` | VERIFIED | Line 8: import + called at line 107 |
| `src/app/api/study/complete/route.ts` | `src/db/schema.ts` | `db.transaction` with Drizzle inserts/updates | VERIFIED | db.transaction at line 119; recall_events insert, cards update, habitat_metadata upsert all present |
| `src/lib/study-queries.ts` | `src/db/schema.ts` | `db.select().from(cards)` | VERIFIED | Lines 19–30: Drizzle select from cards table |
| `src/app/(protected)/study/page.tsx` | `src/lib/study-queries.ts` | `getStudyCards` call | VERIFIED | Imported line 5; called line 25 |
| `src/app/(protected)/study/page.tsx` | `src/lib/study-engine.ts` | `assembleSession` call | VERIFIED | Imported line 6; called line 37 |
| `src/components/study-session.tsx` | `/api/study/complete` | `fetch` POST on session end/quit | VERIFIED | fetch("/api/study/complete") at line 238; called from committing phase useEffect |
| `src/components/study-card.tsx` | `motion/react` | `motion.div` for flip + drag | VERIFIED | Line 3: `import { motion, useMotionValue, useTransform, AnimatePresence } from "motion/react"` |
| `src/app/(protected)/dashboard/page.tsx` | `src/lib/study-queries.ts` | `getStudyCards` for study awareness | VERIFIED | Line 5 import + line 40 call; feeds hasDueCards and earliestCooldownEnd to DeckView |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `study/page.tsx` | sessionCards (SessionCard[]) | getStudyCards → assembleSession | Yes — Drizzle DB query for all deck cards with mastery fields | FLOWING |
| `study-session.tsx` | graded (GradeEntry[]) | User swipe interactions → reducer | Yes — accumulated from real user actions, committed to /api/study/complete | FLOWING |
| `dashboard/page.tsx` | hasDueCards, earliestCooldownEnd | getStudyCards → assembleSession/earliestCooldownEnd | Yes — computed from real DB query on each dashboard load | FLOWING |
| `card-list.tsx` | masteryRound per card | masteryByCardId map from studyCards | Yes — built from getStudyCards result; passed as cardRows to DeckView | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| study-engine exports correct functions | `node -e "const m=require('./src/lib/study-engine.ts'); ..."` | N/A — TypeScript module | SKIP (TypeScript — tested via vitest) |
| 25 unit tests pass | `npx vitest run src/lib/study-engine.test.ts` | 25/25 passed (100 total across worktrees) | PASS |
| Migration SQL generates correct ALTER statements | Read `drizzle/0001_ambitious_dark_beast.sql` | 3 ALTER TABLE statements: masteryRound, cooldownUntil on cards; direction on recall_events | PASS |
| motion package installed | `grep "motion" package.json` | `"motion": "^12.38.0"` | PASS |
| Route exports POST function | File read | `export async function POST(request: Request)` confirmed at line 42 | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|---------|
| STUDY-01 | 03-01, 03-02, 03-03 | User can start a flashcard study session for a language | SATISFIED | study/page.tsx loads cards via getStudyCards; assembleSession filters due cards; StudySession renders full session |
| STUDY-02 | 03-03 | User sees a card's word, can reveal the translation, and marks themselves correct or still learning | SATISFIED | StudyCard shows front face with "Tap to reveal"; 3D flip to back; swipe-right=correct, swipe-left=still learning |
| STUDY-03 | 03-01, 03-02 | A card is considered "learned" after 3–4 successful self-graded recalls | SATISFIED | computeCardUpdate advances through rounds 0→1→2→3; masteryRound=3 means learned; route persists newRound to DB |
| STUDY-04 | 03-02, 03-03 | Learned cards are saved and contribute to habitat progression | SATISFIED | route.ts upserts habitat_metadata.lastActivityAt in the same transaction; masteryRound persisted to cards table |
| STUDY-05 | 03-01, 03-03 | Approximately 10% of each study session resurfaces already-learned cards | SATISFIED | assembleSession computes Math.max(1, floor(dueUnlearned.length * 0.1)) resurface cards from masteryRound=3 pool |
| STUDY-06 | 03-03 | User can see a session progress indicator (cards remaining in current session) | SATISFIED | CardStack component renders up to 3 layered cards behind active card; remainingCount = queue.length - currentIndex - 1 |

All 6 STUDY-XX requirements declared in plan frontmatter are accounted for and satisfied. No orphaned requirements found for Phase 3 in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

Scanned all key phase files for TODO/FIXME/placeholder comments, empty implementations, hardcoded empty data, and stub return patterns. None detected. All data flows from real DB queries to rendered UI.

### Human Verification Required

#### 1. End-to-End Study Session Flow

**Test:** Navigate to dashboard with a deck that has cards. Click "Start studying". Study through cards using tap-to-flip and swipe-to-grade.
**Expected:**
- Full-screen study page loads with a card showing a word and "Tap to reveal" hint
- Tapping the card triggers a smooth 3D rotateY flip animation revealing the answer
- After 300ms following flip, swipe right grades correct (card exits right), swipe left grades still learning (card exits left)
- Card stack behind active card is visible and reduces in layers as cards are studied
- Still-learning cards (swiped left) loop back after all initial cards are seen
- At session end: tiger emoji, "Great work, keep it up!" heading, 3 stats blocks (studied / correct% / learned), "Back to deck" button with entrance animation
- Keyboard works: Enter/Space flips, ArrowRight/Left grades (only when swipeReady)
**Why human:** Animation quality, gesture feel, visual card-stack thinning, loop-back behavior, and stat correctness all require interactive browser verification.

#### 2. Study Button Disabled State with Countdown

**Test:** Ensure all cards in a deck are in cooldown (study a deck to completion to trigger 12h cooldown). Return to dashboard.
**Expected:** Study button shows "Next cards in Xh Ym" in muted/disabled style; clicking does nothing; countdown updates every 60 seconds; when cooldown expires page auto-refreshes and button becomes "Start studying"
**Why human:** Requires real cooldown state and time-based observation.

#### 3. Quit and Save Flow

**Test:** Start a study session, study a few cards, click "Quit session".
**Expected:** Inline confirmation appears with "Quit session? Your progress so far will be saved." plus "Keep studying" and "Save and quit" buttons. "Keep studying" dismisses confirmation. "Save and quit" commits the partial grades to /api/study/complete and navigates back to dashboard. Mastery progress dots in card list reflect the partial session's updates.
**Why human:** Requires live session interaction and DB state verification.

#### 4. Mastery Progress Dots in Card List

**Test:** After studying cards through at least one mastery round, check the card list on the dashboard.
**Expected:** Cards that completed round 1 show 1 filled dot; round 2 shows 2 filled; round 3 (learned) shows 3 filled. Empty rounds show unfilled dot outlines.
**Why human:** Requires real DB state after study session to observe correct dot rendering.

### Gaps Summary

No automated gaps found. All 11 must-have truths are verified in the codebase. All 6 STUDY-XX requirements are satisfied with real implementations. All key wiring links are confirmed. Data flows from DB queries through engine functions to rendered UI. The 25-test suite passes with 0 failures.

The only outstanding items are the 4 human verification tests above, which require interactive browser testing to confirm animation quality, gesture behavior, and time-based features.

---

_Verified: 2026-03-27T23:20:00Z_
_Verifier: Claude (gsd-verifier)_
