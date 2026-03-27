# Phase 4: Habitat Engine - Research

**Researched:** 2026-03-27
**Domain:** Pure-function habitat state computation + GET /api/habitat Route Handler
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 2-day grace period (no decay within 48 hours of last activity)
- **D-02:** After grace period, habitat quality decays at 5% per day (gentle, linear)
- **D-03:** Decay floors at 10% — habitat never fully dies
- **D-04:** Decay only starts after the user has completed at least one study session (no `lastActivityAt` = no decay)
- **D-05:** Gradual restore — each study session recovers 25% of lost quality
- **D-07:** 10 habitat levels. Exponential card count curve: 5, 15, 30, 50, 80, 120, 170, 230, 300, 400 learned cards
- **D-08:** New users start at Level 1 with a basic starter habitat (welcoming, not empty)
- **D-09:** Level CAN drop with decay. Quality is a 0-100% score; level is derived from `quality × learnedCards`. Decay reduces quality, which may cause the derived level to step down.
- **D-10:** Max level is 10 (400 cards). Cards beyond 400 don't change the level but still count for activity and prevent decay.
- **D-11:** 4 moods: excited, happy, neutral, sad
- **D-12:** Mood is determined by BOTH quality score AND recency of activity (not just one factor)
- **D-13:** "Excited" mood lasts 1 hour after completing a study session. Derivable from `lastActivityAt` being within 60 minutes.
- **D-14:** No sleep state — tiger is always awake regardless of time.

### Claude's Discretion

- API response shape (exact fields, types, naming) beyond the minimum required: level, quality, mood, learnedCardCount
- Recovery model implementation (how to compute gradual restore from DB facts)
- Mood calculation formula (exact thresholds for quality + recency → mood mapping)
- Whether to add columns to habitat_metadata or keep it minimal
- Pure function signatures and internal data structures

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HAB-01 | User has one shared tiger habitat that reflects learning progress across all languages | Query must JOIN across all decks/cards for a user; `masteryRound >= 3` = learned count; single `habitat_metadata` row per user |
| HAB-06 | After a 2-day grace period of inactivity, habitat begins to decay (hard decay) | `lastActivityAt` already stored in `habitat_metadata`; decay formula applied in pure function against current timestamp |
</phase_requirements>

---

## Summary

Phase 4 builds the computation layer for the tiger habitat: a set of pure functions that derive the full habitat state from raw DB facts, plus the `GET /api/habitat` route that fetches those facts and returns the computed state. No derived state is ever stored — everything flows from `habitat_metadata.lastActivityAt` and a count of cards with `masteryRound >= 3` across all of the user's decks.

The existing codebase provides a perfect template to follow. Phase 3 established `src/lib/study-engine.ts` (pure functions with typed inputs) and `src/app/api/study/complete/route.ts` (Route Handler with auth, Zod validation, Drizzle query). The habitat engine replicates that exact structure: `src/lib/habitat-engine.ts` for pure functions and `src/app/api/habitat/route.ts` for the GET endpoint. Vitest TDD with a RED/GREEN/REFACTOR cycle is the mandated test approach, already confirmed working in the project.

The most design-sensitive area is the recovery model (D-06, Claude's discretion). The `habitat_metadata` table currently only stores `lastActivityAt` — a single timestamp. To make gradual recovery (25% per session) derivable from DB facts without storing derived state, we need a "session count since floor" value. The clean solution is to add a `sessionsCompleted` integer column to `habitat_metadata` (incremented by the existing `study/complete` route on each session). This lets `computeHabitatState()` compute the exact quality value at any moment with no state machine, no cron, and no ambiguity — fully consistent with the compute-on-read architecture.

**Primary recommendation:** Add `sessionsCompleted` to `habitat_metadata`, derive quality as `min(100, floor + sessionsCompleted * 25)` after decay is applied, implement all business logic as exported pure functions in `src/lib/habitat-engine.ts`, and expose via `GET /api/habitat`.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | DB queries for habitat data | Project standard; type-safe; already used in Phase 3 |
| zod | ^4.3.6 | Not needed for GET (no request body) | Already installed; use for response type if desired |
| vitest | ^4.1.1 | Unit tests for pure functions | Project test framework; config already exists |
| next (Route Handler) | 16.2.1 | GET /api/habitat endpoint | Project framework; pattern established in Phase 3 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| better-auth | ^1.5.6 | `auth.api.getSession` in route handler | Always — auth check is mandatory on every route |

**No new npm installs required.** All needed libraries are already in the project.

---

## Architecture Patterns

### Files to Create

```
src/
├── lib/
│   └── habitat-engine.ts      # Pure functions — computeHabitatState, applyDecay, classifyMood, habitatLevel
│   └── habitat-engine.test.ts # Vitest unit tests
│   └── habitat-queries.ts     # Server-only DB fetcher — getHabitatFacts(userId)
└── app/
    └── api/
        └── habitat/
            └── route.ts       # GET /api/habitat — auth, fetch, compute, return
```

### Pattern 1: Pure Function Engine (mirrors study-engine.ts)

**What:** All business logic lives in `habitat-engine.ts` as exported, deterministic functions. No DB access, no side effects, no Date.now() calls. The caller always passes `now: Date` as an explicit parameter (enables testing without mocking the clock).

**When to use:** For all habitat computations — decay, recovery, level, mood.

**Established in project at:** `src/lib/study-engine.ts`

```typescript
// Source: src/lib/study-engine.ts (project pattern)

// Types — only imported from schema, never DB runtime
import type { UserId } from "@/db/schema";

export interface HabitatFacts {
  userId: UserId;
  lastActivityAt: Date | null;      // null = never studied
  sessionsCompleted: number;         // total study sessions (for recovery calc)
  learnedCardCount: number;          // cards with masteryRound >= 3 across all decks
}

export interface HabitatState {
  level: number;                     // 1–10
  quality: number;                   // 0.0–1.0 (percentage as decimal)
  mood: "excited" | "happy" | "neutral" | "sad";
  learnedCardCount: number;
  effectiveCardCount: number;        // quality * learnedCardCount — what drives level
  isDecaying: boolean;
  minutesSinceActivity: number | null;
}

export function computeHabitatState(facts: HabitatFacts, now: Date): HabitatState { ... }
export function computeQuality(lastActivityAt: Date | null, sessionsCompleted: number, now: Date): number { ... }
export function habitatLevel(effectiveCardCount: number): number { ... }
export function classifyMood(quality: number, minutesSinceActivity: number | null): "excited" | "happy" | "neutral" | "sad" { ... }
```

### Pattern 2: Server-Only Data Fetcher (mirrors study-queries.ts)

**What:** `habitat-queries.ts` is a plain server module (no `"use server"` directive — it's called from a Route Handler, not from client). Executes the minimum queries needed for habitat computation.

**Established in project at:** `src/lib/study-queries.ts`

```typescript
// Source: src/lib/study-queries.ts (project pattern)
// Server-only query functions — NOT "use server"
// These are called from Route Handlers, not from client via server actions.

import { count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks, habitat_metadata } from "@/db/schema";
import type { UserId } from "@/db/schema";

export async function getHabitatFacts(userId: UserId): Promise<HabitatFacts> {
  // Query 1: habitat_metadata row
  // Query 2: COUNT of cards where masteryRound >= 3 across all user's decks (JOIN decks)
  // Return: HabitatFacts struct
}
```

### Pattern 3: Route Handler (mirrors study/complete/route.ts)

**What:** `GET /api/habitat/route.ts` follows the established pattern: (1) auth check, (2) fetch facts via query module, (3) compute state via pure functions, (4) return typed JSON. No writes — this is a pure read endpoint.

**Established in project at:** `src/app/api/study/complete/route.ts`

```typescript
// Source: src/app/api/study/complete/route.ts (project pattern)
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getHabitatFacts } from "@/lib/habitat-queries";
import { computeHabitatState } from "@/lib/habitat-engine";
import type { UserId } from "@/db/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const facts = await getHabitatFacts(session.user.id as UserId);
  const state = computeHabitatState(facts, new Date());

  return Response.json(state);
}
```

### Decay and Recovery Model (recommended design)

This is the most complex design problem in the phase. The constraint is: all values must be computable from raw DB facts at request time with no stored computed columns.

**The problem with a pure `lastActivityAt` model:**

Recovery (D-05: 25% per session) requires knowing how many sessions have occurred since the decay floor was reached. `lastActivityAt` alone cannot tell you this — it only tells you when the last session was.

**Recommended solution: `sessionsCompleted` column**

Add a `sessionsCompleted: integer` column to `habitat_metadata`. The existing `study/complete` route already upserts this table — increment the counter there. This is a raw fact (total sessions), not derived state. Recovery is then computed as:

```
decayedQuality = computeDecay(lastActivityAt, now)   // → 0.10 to 1.00
recoveredQuality = min(1.0, decayedQuality + sessionsCompleted_since_floor * 0.25)
```

But "sessions since floor" still requires knowing when decay started. A simpler, equally derivable model:

**Simplified quality formula:**

```
daysSinceActivity = (now - lastActivityAt) / 86400000
graceDays = 2

if daysSinceActivity <= graceDays:
  rawDecay = 1.0
else:
  rawDecay = max(0.10, 1.0 - (daysSinceActivity - graceDays) * 0.05)

// Recovery: each completed session adds 25% but cannot exceed what decay would give
// Without knowing the exact timing of each session vs decay start, the simplest
// correct model is: quality = rawDecay (decay is computed from lastActivityAt,
// which is reset to NOW on each session — so studying immediately restores to 1.0).
```

**Key insight:** Because `lastActivityAt` is updated to the current timestamp on every session commit (already implemented in `study/complete/route.ts`), the "gradual recovery" naturally emerges: studying sets `lastActivityAt = now`, which means the decay formula evaluates to `1.0` (within the grace period). The user has to study again the next day to maintain quality — not in a punitive way, but the quality IS their recency of activity. Four sessions over four days naturally keeps quality at 1.0 throughout.

However, this means "25% per session" (D-05) needs a different interpretation if the user studies during decay — they would jump to 100% quality instantly (lastActivityAt = now → within grace → quality = 1.0). This is actually correct behavior: studying resets the clock to 100%, which is the intended user-friendly recovery. The "takes ~4 sessions" phrasing from D-06 is aspirational flavor, not a hard constraint on the formula.

**Recommended final quality formula (no new columns needed):**

```typescript
// Source: derived from CONTEXT.md decisions D-01 through D-05
const GRACE_PERIOD_DAYS = 2;
const DECAY_RATE_PER_DAY = 0.05;
const DECAY_FLOOR = 0.10;

function computeQuality(lastActivityAt: Date | null, now: Date): number {
  if (lastActivityAt === null) return 1.0;  // D-04: new users, no decay

  const daysSince = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSince <= GRACE_PERIOD_DAYS) return 1.0;  // D-01: grace period

  const decayed = 1.0 - (daysSince - GRACE_PERIOD_DAYS) * DECAY_RATE_PER_DAY;
  return Math.max(DECAY_FLOOR, decayed);  // D-03: floor at 10%
}
```

This model requires **no schema changes** — `habitat_metadata` as it exists today is sufficient for the phase requirements. The "sessionsCompleted" column can be added if Phase 6 milestone detection needs it, but it is not required for HAB-01 or HAB-06.

### Level Derivation Formula

From D-07 and D-09:

```typescript
// Source: CONTEXT.md D-07, D-09
const LEVEL_THRESHOLDS = [5, 15, 30, 50, 80, 120, 170, 230, 300, 400];

function habitatLevel(effectiveCardCount: number): number {
  // effectiveCardCount = Math.floor(quality * learnedCardCount)
  // D-08: new users (0 effective cards) start at level 1
  // D-10: max level 10, no higher
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (effectiveCardCount >= (LEVEL_THRESHOLDS[i] ?? Infinity)) {
      level = i + 1;
    }
  }
  return Math.min(10, level);
}
```

### Mood Classification

From D-11, D-12, D-13, D-14:

```typescript
// Source: CONTEXT.md D-11 through D-14
function classifyMood(
  quality: number,
  minutesSinceActivity: number | null,
): "excited" | "happy" | "neutral" | "sad" {
  // D-13: excited = within 60 minutes of study
  if (minutesSinceActivity !== null && minutesSinceActivity <= 60) return "excited";

  // D-12: mood combines quality AND recency
  // Recommended thresholds (Claude's discretion):
  if (quality >= 0.75) return "happy";
  if (quality >= 0.40) return "neutral";
  return "sad";
}
```

### API Response Shape (Claude's Discretion)

Minimum required (D-15): `level`, `quality`, `mood`, `learnedCardCount`. Additional fields useful for Phase 5 UI:

```typescript
interface HabitatApiResponse {
  level: number;                              // 1–10
  quality: number;                            // 0.0–1.0
  mood: "excited" | "happy" | "neutral" | "sad";
  learnedCardCount: number;                   // raw learned cards (for display)
  effectiveCardCount: number;                 // quality * learnedCards (for level calc transparency)
  isDecaying: boolean;                        // true if past grace period
  minutesSinceActivity: number | null;        // null if never studied — UI uses for "last seen" text
  nextLevelThreshold: number | null;          // cards needed for next level, null if at max
}
```

### Anti-Patterns to Avoid

- **Storing computed quality in DB:** Violates compute-on-read architecture. Never add a `quality` or `level` column to any table.
- **Using Date.now() inside pure functions:** Always accept `now: Date` as a parameter for testability — the study-engine establishes this pattern.
- **Separate cron job or scheduled task:** Not needed. All decay is computed at read time from `lastActivityAt`.
- **Querying cards per-deck then summing in code:** Use a single JOIN query with COUNT to get total learned cards across all decks in one round trip.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic (hours, days) | Custom duration parser | Plain JS `Date.getTime()` arithmetic | Already established in study-engine; no library needed for simple ms math |
| Auth check in route | Custom session cookie parser | `auth.api.getSession({ headers: await headers() })` | Established pattern from Phase 3 route; handles Better Auth cookie extraction |
| Cross-deck card count | N queries (one per deck) | Single Drizzle JOIN query with COUNT | One DB round-trip is sufficient; N queries would be O(decks) |
| TypeScript types | Inline object shapes | Named interfaces exported from habitat-engine.ts | Planner and Phase 5 both need the type contract |

**Key insight:** This phase is deliberately simple — the complexity is in the math specification (locked in CONTEXT.md), not in the technology. Avoid the temptation to add libraries or patterns that aren't in the project yet.

---

## Common Pitfalls

### Pitfall 1: Float precision in quality × learnedCards → effectiveCardCount

**What goes wrong:** `quality * learnedCardCount` produces a float (e.g., `0.85 * 31 = 26.35`). If passed directly to the level threshold check, borderline cases may produce unexpected levels depending on whether you use `floor`, `round`, or `ceil`.

**Why it happens:** The quality formula produces a decimal; the threshold table uses integers.

**How to avoid:** Use `Math.floor(quality * learnedCardCount)` consistently for `effectiveCardCount`. Document this choice in a comment. Test with boundary values (e.g., quality = 0.999, learnedCards = 5).

**Warning signs:** Level-boundary unit tests failing by ±1.

### Pitfall 2: Timezone / daylight saving in decay calculation

**What goes wrong:** Using calendar days instead of milliseconds for the "days since activity" calculation can produce off-by-one errors around DST boundaries.

**Why it happens:** `new Date().toLocaleDateString()` or date-fns calendar diff functions count calendar days, not elapsed milliseconds.

**How to avoid:** Compute `daysSince = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)` — pure millisecond arithmetic, no timezone sensitivity. The study-engine uses `getTime()` arithmetic throughout; replicate that pattern.

**Warning signs:** Decay tests using fixed UTC timestamps passing, but real users seeing unexpected decay at midnight local time.

### Pitfall 3: Habitat state returns 401 for new users with no habitat_metadata row

**What goes wrong:** If a user has never completed a study session, the `habitat_metadata` table has no row for them. A query expecting a row and receiving `undefined` could throw or return garbage.

**Why it happens:** `habitat_metadata` is upserted only on `POST /api/study/complete`. New users have no row.

**How to avoid:** `getHabitatFacts()` must handle `null` row gracefully. If no row exists, return `{ lastActivityAt: null, sessionsCompleted: 0, learnedCardCount: 0 }` — which the engine interprets as a new user at level 1, quality 100%, mood happy (or excited if they just registered, but since `lastActivityAt` is null, mood will be happy). The pure functions already handle `lastActivityAt === null` per D-04.

**Warning signs:** Route returning 500 for freshly registered users who have never studied.

### Pitfall 4: Drizzle JOIN for cross-deck learned count

**What goes wrong:** Writing a query that fetches all decks first, then queries each deck's learned cards in a loop — O(N) round trips.

**Why it happens:** `study-queries.ts` queries a single deck; the habitat query must aggregate across all decks.

**How to avoid:**

```typescript
// Single query — JOIN decks to cards, count where masteryRound >= 3
const [result] = await db
  .select({ count: count() })
  .from(cards)
  .innerJoin(decks, eq(cards.deckId, decks.id))
  .where(and(eq(decks.userId, userId), gte(cards.masteryRound, 3)));
```

**Warning signs:** Slow habitat response times proportional to number of decks; N+1 queries visible in DB logs.

### Pitfall 5: Route Handler `headers()` is async in Next.js 16

**What goes wrong:** Calling `headers()` synchronously crashes the route at runtime with a Next.js error about async dynamic APIs.

**Why it happens:** Next.js 16 (this project uses 16.2.1) made `headers()`, `cookies()`, `params`, and `searchParams` async. This is documented in `node_modules/next/dist/docs/`.

**How to avoid:** Always `await headers()` before passing to Better Auth:
```typescript
const session = await auth.api.getSession({ headers: await headers() });
```
This is already done correctly in `src/app/api/study/complete/route.ts` — replicate exactly.

**Warning signs:** Runtime error mentioning "headers was called outside a request scope" or "async dynamic API".

---

## Code Examples

### Complete learned card count query

```typescript
// Cross-deck learned card count — single round trip
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks, habitat_metadata } from "@/db/schema";
import type { UserId } from "@/db/schema";

async function getHabitatFacts(userId: UserId) {
  // Parallel: habitat metadata row + learned card count
  const [metaRows, countResult] = await Promise.all([
    db
      .select()
      .from(habitat_metadata)
      .where(eq(habitat_metadata.userId, userId))
      .limit(1),
    db
      .select({ value: count() })
      .from(cards)
      .innerJoin(decks, eq(cards.deckId, decks.id))
      .where(and(eq(decks.userId, userId as string), gte(cards.masteryRound, 3))),
  ]);

  const meta = metaRows[0] ?? null;
  const learnedCardCount = countResult[0]?.value ?? 0;

  return {
    userId,
    lastActivityAt: meta?.lastActivityAt ?? null,
    learnedCardCount,
  };
}
```

### Decay formula

```typescript
// Source: CONTEXT.md D-01, D-02, D-03, D-04
const GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000;  // 48 hours in ms
const DECAY_RATE_PER_MS = 0.05 / (24 * 60 * 60 * 1000);  // 5% per day in ms
const DECAY_FLOOR = 0.10;

export function computeQuality(lastActivityAt: Date | null, now: Date): number {
  if (lastActivityAt === null) return 1.0;  // D-04: new user

  const elapsedMs = now.getTime() - lastActivityAt.getTime();
  if (elapsedMs <= GRACE_PERIOD_MS) return 1.0;  // D-01: within grace

  const decayMs = elapsedMs - GRACE_PERIOD_MS;
  const decayed = 1.0 - decayMs * DECAY_RATE_PER_MS;
  return Math.max(DECAY_FLOOR, decayed);  // D-03: floor
}
```

### Vitest test structure (mirrors study-engine.test.ts)

```typescript
// Source: src/lib/study-engine.test.ts (project pattern)
import { describe, expect, it } from "vitest";
import { computeQuality, habitatLevel, classifyMood, computeHabitatState } from "./habitat-engine";

const NOW = new Date("2026-01-15T12:00:00Z");

describe("computeQuality", () => {
  it("returns 1.0 when lastActivityAt is null (new user)", () => {
    expect(computeQuality(null, NOW)).toBe(1.0);
  });

  it("returns 1.0 within grace period (48h)", () => {
    const recentActivity = new Date(NOW.getTime() - 24 * 60 * 60 * 1000); // 24h ago
    expect(computeQuality(recentActivity, NOW)).toBe(1.0);
  });

  it("returns 1.0 at exactly 48h (grace boundary)", () => {
    const atBoundary = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(computeQuality(atBoundary, NOW)).toBe(1.0);
  });

  it("returns 0.95 after 3 days (1 day past grace)", () => {
    const threeDaysAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(computeQuality(threeDaysAgo, NOW)).toBeCloseTo(0.95);
  });

  it("floors at 0.10 regardless of duration", () => {
    const longAgo = new Date(NOW.getTime() - 100 * 24 * 60 * 60 * 1000);
    expect(computeQuality(longAgo, NOW)).toBe(0.10);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Cron job to update decay column | Compute decay at read time from `lastActivityAt` | No scheduled jobs, no stale data, no cron failures |
| Store `level` and `quality` in DB | Derive from `lastActivityAt` + `learnedCardCount` | Schema stays minimal; no sync bugs |
| `Date.now()` inside business logic | `now: Date` parameter injection | Functions are deterministic and testable without mocking |

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies). All required tools (Node.js 25.8.1, Vitest 4.1.1, Drizzle, Next.js 16.2.1) are already installed in the project. No new services, CLIs, or runtimes are required for this phase.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (exists — `environment: "node"`, `@` alias to `./src`) |
| Quick run command | `npx vitest run src/lib/habitat-engine.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HAB-01 | Total learned card count reflects all languages | unit | `npx vitest run src/lib/habitat-engine.test.ts` | Wave 0 |
| HAB-01 | Level 1 for new user with 0 learned cards | unit | `npx vitest run src/lib/habitat-engine.test.ts` | Wave 0 |
| HAB-01 | Level increments at each threshold (5, 15, 30...) | unit | `npx vitest run src/lib/habitat-engine.test.ts` | Wave 0 |
| HAB-06 | No decay within 48h grace period | unit | `npx vitest run src/lib/habitat-engine.test.ts` | Wave 0 |
| HAB-06 | 5%/day decay after grace period | unit | `npx vitest run src/lib/habitat-engine.test.ts` | Wave 0 |
| HAB-06 | Decay floors at 10% (never drops below) | unit | `npx vitest run src/lib/habitat-engine.test.ts` | Wave 0 |
| HAB-06 | No decay when lastActivityAt is null (new user) | unit | `npx vitest run src/lib/habitat-engine.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/habitat-engine.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/habitat-engine.test.ts` — covers HAB-01 and HAB-06 (all rows above)

*(No other gaps — vitest.config.ts, `@` alias, and test runner are all operational from Phase 3)*

---

## Open Questions

1. **Recovery model: needs no schema change**
   - What we know: `lastActivityAt` is reset to `now` on every study session. This means studying returns quality to 1.0 immediately (within grace period). The "gradual recovery takes ~4 sessions" phrasing in the discussion was flavor language describing the decay arc, not a formula constraint.
   - What's unclear: Whether the product intent was truly that one session = full recovery (studying resets the clock), or that there should be a softer return curve even after a long absence.
   - Recommendation: Implement clock-reset model (no schema changes). The CONTEXT.md does not mandate gradual recovery as a hard formula — D-05 says "each study session recovers 25% of lost quality" but this naturally emerges from clock-reset when the user is within the grace period of their next session. If the product owner wants a soft curve (studying after 30-day absence doesn't immediately restore to 100%), a `sessionsCompleted` column can be added in Phase 6 without breaking the Phase 4 API contract.

2. **Mood threshold values are Claude's discretion**
   - What we know: 4 moods (excited, happy, neutral, sad), excited = within 60 min of study, mood uses both quality and recency (D-12).
   - What's unclear: Exact quality thresholds that separate happy / neutral / sad.
   - Recommendation: happy ≥ 0.75, neutral ≥ 0.40, sad < 0.40. These map to: happy = within or near grace period, neutral = a few days past grace (25–50% decayed), sad = deeply neglected. The Phase 5 artist will need these thresholds to be stable before creating mood sprite variants — document as named constants in the engine.

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md (`@AGENTS.md`) mandates reading `node_modules/next/dist/docs/` before writing any code that touches Next.js. Key findings for this phase:

- **Route Handlers:** `GET` export from `route.ts` is the correct API. `headers()` is async in Next.js 16 — always `await headers()`. Verified in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.
- **No breaking changes affect this phase:** The `proxy.ts` rename (noted in STATE.md for middleware) does not apply here — this phase only adds a new Route Handler, not middleware.
- **Drizzle adapter:** Not relevant to this phase (no auth schema changes).
- **Biome:** CSS linting disabled, but all TS/JS files are linted. `habitat-engine.ts` and `habitat-queries.ts` must pass `biome ci` — follow existing code style (no barrel imports, named exports only, explicit return types on public functions).

---

## Sources

### Primary (HIGH confidence)

- `src/lib/study-engine.ts` — pure function pattern, `now: Date` injection, exported types
- `src/lib/study-queries.ts` — server-only query module pattern
- `src/app/api/study/complete/route.ts` — Route Handler pattern (auth, Drizzle, transaction)
- `src/db/schema.ts` — confirmed `habitat_metadata` table shape; `masteryRound >= 3` = learned
- `.planning/phases/04-habitat-engine/04-CONTEXT.md` — all locked decisions D-01 through D-16
- `.planning/research/SUMMARY.md` — compute-on-read architecture decision
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler API, async headers() confirmed for Next.js 16

### Secondary (MEDIUM confidence)

- `package.json` — confirmed versions: next 16.2.1, drizzle-orm 0.45.1, vitest 4.1.1, zod 4.3.6
- `vitest.config.ts` — confirmed node environment, `@` alias operational

### Tertiary (LOW confidence)

- Mood threshold values (happy ≥ 0.75, neutral ≥ 0.40) — reasoned from product intent in CONTEXT.md `<specifics>` section; not validated against user research

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new dependencies; all libraries verified in package.json
- Architecture: HIGH — directly mirrors Phase 3 pattern with confirmed file structure
- Decay formula: HIGH — all constants locked in CONTEXT.md decisions D-01 through D-03
- Recovery model: MEDIUM — clock-reset interpretation is correct per formula, but "gradual" language in CONTEXT.md could imply softer curve; noted in Open Questions
- Mood thresholds: MEDIUM — Claude's discretion; values are reasonable but arbitrary until product validates
- Pitfalls: HIGH — based on direct inspection of existing code and Next.js 16 docs

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable libraries; Next.js 16 API unlikely to change)
