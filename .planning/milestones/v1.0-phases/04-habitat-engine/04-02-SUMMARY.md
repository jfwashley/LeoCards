---
phase: 04-habitat-engine
plan: 02
subsystem: habitat-api
tags: [api, drizzle, auth, compute-on-read, route-handler]
dependency_graph:
  requires: [src/lib/habitat-engine.ts, src/db/schema.ts]
  provides: [src/lib/habitat-queries.ts, src/app/api/habitat/route.ts]
  affects: [Phase 5 UI (habitat scene fetch)]
tech_stack:
  added: []
  patterns: [compute-on-read, parallel-queries, route-handler-auth]
key_files:
  created:
    - src/lib/habitat-queries.ts
    - src/app/api/habitat/route.ts
  modified: []
decisions:
  - "Promise.all for two DB queries (habitat_metadata + learned card count) — single round-trip per request"
  - "userId as string cast in Drizzle eq() — branded type vs plain column comparison, consistent with Phase 2 pattern"
  - "No try/catch in route handler — let Next.js error boundary handle unexpected DB errors, consistent with existing routes"
metrics:
  duration: 2 minutes
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_created: 2
requirements:
  - HAB-01
  - HAB-06
---

# Phase 4 Plan 02: Habitat API Data Layer Summary

**One-liner:** Parallel DB queries for habitat facts (lastActivityAt + cross-deck learned card count via JOIN) wired to GET /api/habitat with auth guard and compute-on-read pure function chain.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Habitat queries — server-only DB fetcher | 293967a | src/lib/habitat-queries.ts |
| 2 | GET /api/habitat Route Handler | d0034cf | src/app/api/habitat/route.ts |

## What Was Built

### `src/lib/habitat-queries.ts`

Exported function: **`getHabitatFacts(userId: UserId): Promise<HabitatFacts>`**

- Executes two queries in parallel via `Promise.all`:
  1. `habitat_metadata` — selects `lastActivityAt` where `userId` matches, `.limit(1)`. Null if no row (new user who has never studied).
  2. Learned card count — `SELECT count() FROM cards INNER JOIN decks ON cards.deckId = decks.id WHERE decks.userId = $userId AND cards.masteryRound >= 3`. Cross-deck, single JOIN query.
- Returns `{ userId, lastActivityAt: meta?.lastActivityAt ?? null, learnedCardCount: countRows[0]?.value ?? 0 }`
- No `"use server"` directive — plain server module called from Route Handler

### `src/app/api/habitat/route.ts`

Exported function: **`GET(): Promise<Response>`**

- Auth check: `await auth.api.getSession({ headers: await headers() })` — returns 401 if no session
- Calls `getHabitatFacts(session.user.id as UserId)` to fetch raw facts
- Calls `computeHabitatState(facts, new Date())` — pure function, no side effects
- Returns `Response.json(state)` with all 8 HabitatState fields:
  `level`, `quality`, `mood`, `learnedCardCount`, `effectiveCardCount`, `isDecaying`, `minutesSinceActivity`, `nextLevelThreshold`
- No POST export. No DB writes. GET-only, pure read endpoint.

## Decisions Made

1. **Promise.all for parallel queries** — Fires habitat_metadata and card count queries in a single DB round-trip instead of two sequential awaits. Consistent with the research Pitfall 4 recommendation.

2. **`userId as string` cast in Drizzle eq()** — Branded `UserId` type vs plain `text()` column. The cast is required and consistent with the established Phase 2 pattern (STATE.md decision: "Branded type cast (userId as UserId) required when comparing plain string to branded Drizzle column in eq()").

3. **No try/catch in route** — Unexpected DB errors bubble up to Next.js error boundary. All existing routes (`/api/study/complete`) follow the same pattern — only expected errors (auth failure, validation failure) are caught explicitly.

## Deviations from Plan

None — plan executed exactly as written. Both files match the specified implementation and pass biome lint.

## Known Stubs

None — `getHabitatFacts` runs real Drizzle queries; `computeHabitatState` is fully implemented. The route returns live computed data. No placeholder values.

## Self-Check: PASSED

Files created:
- FOUND: src/lib/habitat-queries.ts
- FOUND: src/app/api/habitat/route.ts

Commits:
- FOUND: 293967a (Task 1 — habitat-queries.ts)
- FOUND: d0034cf (Task 2 — route.ts)

Test suite: 48/48 passing (`npx vitest run src/lib/habitat-engine.test.ts`)
Lint: Both files pass `npx biome ci`
