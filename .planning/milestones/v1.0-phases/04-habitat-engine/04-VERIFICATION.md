---
phase: 04-habitat-engine
verified: 2026-03-28T00:11:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 4: Habitat Engine Verification Report

**Phase Goal:** The server can compute the full habitat state from raw DB facts at request time — no derived state stored, no cron jobs, correct decay and mood output available via API.
**Verified:** 2026-03-28
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

**Plan 01 truths (habitat engine pure functions):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | New user (no lastActivityAt) gets quality 1.0, level 1, mood happy | VERIFIED | `computeQuality(null, now) => 1.0`; test "new user (null lastActivityAt, 0 learned)": level 1, quality 1.0, mood happy, isDecaying false |
| 2 | User within 2-day grace period has quality 1.0 (no decay) | VERIFIED | `if (elapsedMs <= GRACE_PERIOD_MS) return 1.0`; tests cover 0h, 24h, 48h exact boundary |
| 3 | User inactive 3+ days past grace sees 5%/day linear decay | VERIFIED | `1.0 - daysPastGrace * DECAY_RATE_PER_DAY`; tests: 3 days => 0.95, 4 days => 0.90, sub-day precision at 2.5 days |
| 4 | Quality never drops below 10% (decay floor) | VERIFIED | `Math.max(DECAY_FLOOR, decayed)`; tests: 100 days => 0.10, 365 days => 0.10 |
| 5 | Level derived from Math.floor(quality * learnedCardCount) against 10 thresholds | VERIFIED | `Math.floor(quality * learnedCardCount)`; all 10 thresholds tested; level 1 at 0 cards through level 10 at 400+ cards |
| 6 | Mood excited when activity within 60 minutes | VERIFIED | `minutesSinceActivity <= EXCITED_WINDOW_MINUTES`; tests at 0, 30, and exactly 60 minutes |
| 7 | Mood determined by both quality AND recency per D-12 | VERIFIED | `classifyMood` checks recency first (excited), then quality thresholds (happy >= 0.75, neutral >= 0.40, sad < 0.40); all 4 moods tested |

**Plan 02 truths (habitat API data layer):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | Authenticated user can GET /api/habitat and receive JSON with level, quality, mood, learnedCardCount | VERIFIED | `route.ts` exports `GET`, calls `getHabitatFacts` + `computeHabitatState`, returns `Response.json(state)` with all 8 HabitatState fields |
| 9 | Unauthenticated request to GET /api/habitat returns 401 | VERIFIED | `if (!session) { return Response.json({ error: "Unauthorized" }, { status: 401 }); }` |
| 10 | New user with no habitat_metadata row gets level 1, quality 1.0, mood happy | VERIFIED | `meta?.lastActivityAt ?? null` handles missing row; null lastActivityAt feeds into `computeQuality` which returns 1.0 |
| 11 | Learned card count aggregates across ALL user decks (not per-deck) | VERIFIED | `INNER JOIN decks ON cards.deckId = decks.id WHERE decks.userId = $userId AND cards.masteryRound >= 3` — single cross-deck JOIN query |
| 12 | Response includes effectiveCardCount, isDecaying, minutesSinceActivity, nextLevelThreshold | VERIFIED | All 8 fields in `HabitatState` interface; all returned in `Response.json(state)` |

**Score: 12/12 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/habitat-engine.ts` | Pure functions for habitat state computation | VERIFIED | 225 lines; exports `computeQuality`, `habitatLevel`, `classifyMood`, `computeHabitatState`, `HabitatFacts`, `HabitatState`, `TigerMood`, all 5 constants |
| `src/lib/habitat-engine.test.ts` | Vitest unit tests covering all decay, level, mood behaviors | VERIFIED | 315 lines, 48 unit tests across 4 describe blocks; all pass |
| `src/lib/habitat-queries.ts` | Server-only DB fetcher for habitat facts | VERIFIED | 54 lines; exports `getHabitatFacts`; parallel queries via `Promise.all`; real Drizzle JOIN query |
| `src/app/api/habitat/route.ts` | GET /api/habitat Route Handler | VERIFIED | 38 lines; exports `GET`; auth guard, DB fetch, pure computation, JSON response |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/habitat-engine.ts` | `src/db/schema.ts` | type-only import for UserId | VERIFIED | Line 1: `import type { UserId } from "@/db/schema"` |
| `src/app/api/habitat/route.ts` | `src/lib/habitat-queries.ts` | import getHabitatFacts | VERIFIED | Line 5: `import { getHabitatFacts } from "@/lib/habitat-queries"` |
| `src/app/api/habitat/route.ts` | `src/lib/habitat-engine.ts` | import computeHabitatState | VERIFIED | Line 4: `import { computeHabitatState } from "@/lib/habitat-engine"` |
| `src/lib/habitat-queries.ts` | `src/db/schema.ts` | Drizzle query against cards, decks, habitat_metadata | VERIFIED | Lines 8-9: `import { cards, decks, habitat_metadata } from "@/db/schema"` — all three tables used in query |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `src/app/api/habitat/route.ts` | `state` (HabitatState) | `computeHabitatState(facts, new Date())` | Yes — `facts` is populated by real Drizzle queries in `getHabitatFacts` | FLOWING |
| `src/lib/habitat-queries.ts` | `metaRows`, `countRows` | `db.select()...from(habitat_metadata)` and `db.select({value: count()}).from(cards).innerJoin(decks)` | Yes — real Drizzle ORM queries against DB tables | FLOWING |
| `src/lib/habitat-engine.ts` | Computed values | Pure functions with explicit `now: Date` param | Yes — deterministic computation from input facts; no hardcoded returns | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 48 unit tests pass | `npx vitest run src/lib/habitat-engine.test.ts` | 144 tests passing (3 test files), 0 failures | PASS |
| All 4 functions exported | grep on habitat-engine.ts | `computeQuality`, `habitatLevel`, `classifyMood`, `computeHabitatState` all present | PASS |
| No Date.now() in engine | grep on habitat-engine.ts | 0 occurrences in code (2 matches in JSDoc comments only — "no Date.now() calls inside") | PASS |
| No "use server" in queries | grep on habitat-queries.ts | 0 occurrences | PASS |
| GET route has 401 guard | grep on route.ts | `status: 401` present | PASS |
| All commits exist | `git log` | 66667d4, 35f6e66, 293967a, d0034cf all verified | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HAB-01 | 04-01, 04-02 | User has one shared tiger habitat that reflects learning progress across all languages | SATISFIED | Cross-deck JOIN query aggregates learned cards across ALL user decks; single `/api/habitat` endpoint serves global state |
| HAB-06 | 04-01, 04-02 | After a 2-day grace period of inactivity, habitat begins to decay (hard decay) | SATISFIED | `GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000`; `computeQuality` returns 1.0 within grace, then 5%/day linear decay after; `isDecaying` flag exposed in API response |

Both requirements mapped to Phase 4 in REQUIREMENTS.md traceability table are fully satisfied. No orphaned requirements detected.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No placeholders, TODOs, empty return stubs, or hardcoded data found in any of the four phase files. All four files contain real, substantive implementations.

---

### Human Verification Required

**Step 7b behavioral spot-checks** that require a running server are deferred to Phase 5 UI integration testing, as the API cannot be invoked without DB connectivity and an authenticated session. The pure function test suite provides adequate behavioral coverage for Phase 4's compute logic.

No blocking human verification items for this phase. The following is informational for completeness:

**1. End-to-End API Response Shape**

**Test:** Sign in as a real user and `curl` or fetch `GET /api/habitat` with a valid session cookie.
**Expected:** JSON response with all 8 fields — `level`, `quality`, `mood`, `learnedCardCount`, `effectiveCardCount`, `isDecaying`, `minutesSinceActivity`, `nextLevelThreshold` — and values consistent with the user's actual activity history.
**Why human:** Requires a running server with DB access and an authenticated session.

---

### Gaps Summary

No gaps. All must-haves from both plan frontmatters are verified at all four levels (exists, substantive, wired, data-flowing). The test suite is comprehensive (48 unit tests), all four commits exist in git history, no anti-patterns were found, and both requirements (HAB-01, HAB-06) are fully satisfied by the implementation.

---

_Verified: 2026-03-28_
_Verifier: Claude (gsd-verifier)_
