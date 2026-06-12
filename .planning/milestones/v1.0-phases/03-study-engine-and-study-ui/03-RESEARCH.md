# Phase 3: Study Engine and Study UI - Research

**Researched:** 2026-03-27
**Domain:** Flashcard study loop — directional mastery engine, swipe-to-grade UI, session commit, schema migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Session flow**
- D-01: Study starts from the active deck — user taps "Study" inside the deck view (not the header). Session pulls cards from that one deck only.
- D-02: Session includes ALL unlearned cards from the active deck (no fixed cap), plus ~10% resurface pool of learned cards.
- D-03: After one pass through all cards, cards marked "still learning" auto-loop back into the session. Session continues until the user gets all cards right or quits.
- D-04: User can quit a session at any time — all grades so far are committed to the server (partial save).
- D-05: Cards ordered newest-first (most recently added cards appear first in the session).
- D-06: Study happens on a dedicated `/study` route — full-screen experience, no distractions.
- D-07: When no cards are due (all in cooldown), the Study button is disabled with a countdown timer: "Next cards in Xh Ym".

**Card interaction**
- D-08: Directional progression per card:
  - Stage 1: Show native language → user recalls target translation
  - Stage 2: Once correct in native→target, show target language → user recalls native meaning
  - Stage 3: Once correct in both directions, randomly show either side
- D-09: 3D flip animation to reveal the answer (Motion/CSS 3D transform) — classic flashcard feel.
- D-10: Binary grading only: Correct / Still learning.
- D-11: Swipe-only grading (no buttons): swipe right = correct, swipe left = still learning. Swipe triggers grade + card-off animation.
- D-12: After grading, current card swipes off screen and next card animates forward from the stack — physical deck feel.

**Card stack visual (progress indicator replacement)**
- D-13: No progress bar or card counter. Instead, a physical card stack is always visible behind the active card (offset card edges). Max 3 visible layers regardless of total remaining. As cards are studied, the stack visually thins — when 3 or fewer cards remain, the user can count the exact remaining cards by the visible edges.

**Mastery progression (spaced repetition)**
- D-14: Mastery requires correct recalls in BOTH directions across 3 timed rounds:
  - Round 1: 2 correct native→target + 2 correct target→native
  - 12-hour cooldown — card doesn't appear until 12h have passed
  - Round 2: 1 correct in each direction
  - 24-hour cooldown — card doesn't appear until 24h have passed
  - Round 3: 1 correct in each direction → LEARNED
  - Total: 8 correct recalls minimum (4 + 2 + 2), spread across at least 3 sessions with time gaps.
- D-15: Progress dots in the card list show mastery stage (e.g., ●●○ = 2/3 rounds done).

**Resurface behavior**
- D-16: When a resurfaced learned card is graded "still learning," it stays at its current mastery level but gets added back into the current session for another try. No penalty, no reset.
- D-17: Resurface cards look identical to regular cards — no visual distinction.
- D-18: Resurface cards are interleaved at regular intervals: roughly 1 resurface card every 3-4 new/in-progress cards (not clustered at start or end).

**Session end screen**
- D-19: Tiger emoji placeholder (🐯) — always happy, always proud the user studied. No performance-based reactions.
- D-20: Core stats only: cards studied, correct %, cards newly learned this session.
- D-21: Single "Back to deck" button — returns to the card list.

### Claude's Discretion
- Schema approach for tracking directional mastery (compute-on-read via recall_events with direction field vs. expanded card columns — Claude picks based on compute-on-read architecture)
- Exact swipe gesture implementation (library choice, threshold, animation spring config)
- Card stack visual implementation details (CSS offset, shadow, perspective)
- 3D flip animation timing and easing
- Grade button delay (300ms per roadmap) adapted for swipe-only UX
- End screen layout and tiger emoji sizing
- Exact countdown timer format and refresh interval for the "no due cards" state

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STUDY-01 | User can start a flashcard study session for a language | Session card assembly engine + `/study` route + Study button with cooldown guard |
| STUDY-02 | User sees a card's word, can reveal the translation, and marks themselves correct or still learning | 3D flip animation (Motion drag + CSS perspective), swipe-to-grade (@use-gesture or Motion drag), 300ms reveal guard |
| STUDY-03 | A card is considered "learned" after correct recalls per D-14 round system | Directional recall_events schema + round-completion logic in engine pure functions |
| STUDY-04 | Learned cards are saved and contribute to habitat progression | Session commit route writes recall_events + updates cards.lastStudiedAt; habitat_metadata.lastActivityAt updated |
| STUDY-05 | Approximately 10% of each session resurfaces already-learned cards to prevent forgetting | Resurface selection logic in engine; interleaving every 3-4 cards |
| STUDY-06 | User can see a session progress indicator (cards remaining in current session) | Physical card stack visual (CSS layered divs with offset) rather than numeric counter |
</phase_requirements>

---

## Summary

Phase 3 is the most complex phase to date. The locked decisions introduce several concepts that are new to the codebase: directional mastery tracking (native→target and target→native as distinct recall directions), timed cooldowns between rounds, swipe-to-grade interaction, 3D card flip animation, and a physical card stack UI. Each of these has a clear implementation path with the existing stack.

**Schema work is necessary.** The current `recall_events` table has no `direction` field. The compute-on-read architecture (locked in STATE.md) favors adding `direction` to `recall_events` rather than adding computed columns to `cards`. This means a Drizzle migration is required before the engine can be built. The `cards` table also needs `masteryRound` (integer 0-3) and `cooldownUntil` (timestamp nullable) to avoid re-scanning all recall_events on every card load.

**Motion 12 is not yet installed.** The package.json has no `motion` dependency. The import is `import { motion } from "motion/react"` — not `"framer-motion"`. Motion 12's drag API provides `onDragEnd` with an `info` object containing `velocity` and `offset`, which is sufficient for swipe direction detection without a separate gesture library.

**Primary recommendation:** Add `direction` column to `recall_events`, add `masteryRound` + `cooldownUntil` columns to `cards`, install `motion@12`, implement engine as pure functions in `src/lib/study-engine.ts`, build the Route Handler at `src/app/api/study/complete/route.ts`, and implement the full-screen study UI at `src/app/(protected)/study/page.tsx`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion | 12.38.0 | Card flip animation (CSS 3D transform), swipe-off animation, card stack entrance | Already in stack decision; React 19 compatible; `motion/react` import |
| drizzle-orm | 0.45.2 (installed) | DB queries, batch insert recall_events, update cards | Already installed |
| zod | 4.3.6 (installed) | Request body validation in `/api/study/complete` | Already installed, matches project pattern |
| vitest | 4.1.2 (installed) | Unit tests for pure engine functions | Already configured with @/ alias |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @use-gesture/react | 10.3.1 | Swipe detection (velocity threshold, direction lock) | Optionally use alongside Motion drag for precise swipe thresholds — but Motion's own `drag` + `onDragEnd` velocity check is sufficient; install only if Motion drag feels imprecise |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Motion drag + onDragEnd for swipe | @use-gesture/react useDrag | @use-gesture offers more precise `swipe.distance` and `swipe.velocity` configuration; Motion is simpler and already in the stack decision — prefer Motion unless gesture feel is inadequate in testing |
| `direction` field on recall_events | Separate `native_to_target_count` / `target_to_native_count` columns on cards | Columns on cards are harder to validate server-side and violate compute-on-read; `recall_events` row-per-event is the correct pattern |
| masteryRound on cards | Recompute round from recall_events on every load | Computing round from raw events requires scanning all events per card on every session assembly — adds latency; a denormalized `masteryRound` int (0/1/2/3) updated at commit time is the correct balance |

**Installation:**

```bash
npm install motion
```

**Version verification (confirmed 2026-03-27):**
- `motion`: 12.38.0
- `@use-gesture/react`: 10.3.1 (available if needed, not auto-installed)
- `drizzle-orm`: 0.45.2 (installed)
- `vitest`: 4.1.2 (installed)

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── study-engine.ts       # Pure functions — no DB, no Next.js imports
├── app/
│   ├── (protected)/
│   │   └── study/
│   │       └── page.tsx      # Server Component — loads deck cards, passes to StudySession
│   └── api/
│       └── study/
│           └── complete/
│               └── route.ts  # POST handler — validates + commits batch grades
└── components/
    ├── study-session.tsx      # "use client" — useReducer session state machine
    ├── study-card.tsx         # "use client" — single card: flip + swipe gesture
    └── card-stack.tsx         # "use client" — layered CSS stack visual
```

### Pattern 1: Schema Migration — Add Direction and Mastery Fields

**What:** Add `direction` (text "n2t" | "t2n") to `recall_events`; add `masteryRound` (integer 0-3) and `cooldownUntil` (timestamp nullable) to `cards`.

**Why:** `direction` enables per-direction correct-count queries. `masteryRound` is a fast read without re-aggregating all events. `cooldownUntil` is set at commit time (now + 12h or + 24h) and read by session assembly to filter due cards.

**Schema changes in `src/db/schema.ts`:**

```typescript
// recall_events — add direction column
export const recall_events = pgTable("recall_events", {
  id: text("id").primaryKey().$type<RecallEventId>(),
  cardId: text("cardId").notNull().references(() => cards.id, { onDelete: "cascade" }),
  correct: boolean("correct").notNull(),
  direction: text("direction").notNull(), // "n2t" | "t2n"
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// cards — add masteryRound and cooldownUntil
export const cards = pgTable("cards", {
  // ... existing fields ...
  masteryRound: integer("masteryRound").notNull().default(0), // 0=new, 1=round1done, 2=round2done, 3=learned
  cooldownUntil: timestamp("cooldownUntil"),                  // null = available now
  // recallCount kept for backward compat / habitat count
});
```

Generate and apply migration: `npm run db:generate && npm run db:migrate`

**Branded type for direction:**

```typescript
export type RecallDirection = "n2t" | "t2n";
```

### Pattern 2: Study Engine — Pure Functions

**What:** `src/lib/study-engine.ts` contains all session logic as pure functions with no side effects.

**Key types:**

```typescript
// Source: study-engine.ts (to be created)
export interface CardForSession {
  id: CardId;
  front: string;          // native language text
  back: string;           // target language text
  masteryRound: number;   // 0|1|2|3
  cooldownUntil: Date | null;
  createdAt: Date;
  isResurface: boolean;   // true = already learned, pulled for retention
}

export interface SessionCard extends CardForSession {
  stage: "n2t" | "t2n";  // which side to show first for this turn
}

export type GradeEntry = {
  cardId: CardId;
  direction: RecallDirection;
  correct: boolean;
};
```

**Session assembly — core logic:**

```typescript
// Source: study-engine.ts (to be created)
export function assembleSession(
  cards: CardForSession[],
  now: Date
): SessionCard[] {
  const now_ms = now.getTime();

  // 1. Split into due unlearned and learned
  const dueLearning = cards
    .filter(c => !c.isResurface && (c.cooldownUntil === null || c.cooldownUntil.getTime() <= now_ms))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // newest-first D-05

  const learned = cards.filter(c => c.masteryRound === 3);

  // 2. Resurface pool: ~10% of session size, min 1 if any learned exist
  const resurfaceCount = Math.max(
    learned.length > 0 ? 1 : 0,
    Math.floor(dueLearning.length * 0.1)
  );
  const resurfacePool = shuffleTake(learned, resurfaceCount)
    .map(c => ({ ...c, isResurface: true }));

  // 3. Interleave resurface every 3-4 cards (D-18)
  return interleave(dueLearning, resurfacePool, 3);
}

// Stage assignment per card for this session
export function getCardStage(card: CardForSession): "n2t" | "t2n" | "random" {
  if (card.masteryRound === 0) return "n2t"; // Stage 1: native→target only
  if (card.masteryRound === 1) return "t2n"; // Stage 2: target→native only
  return Math.random() < 0.5 ? "n2t" : "t2n"; // Stage 3: random
}
```

**Round completion logic:**

```typescript
// Thresholds per round per direction
const ROUND_THRESHOLDS: Record<number, { n2t: number; t2n: number }> = {
  0: { n2t: 2, t2n: 2 }, // Round 1: 2 correct each direction
  1: { n2t: 1, t2n: 1 }, // Round 2: 1 correct each direction
  2: { n2t: 1, t2n: 1 }, // Round 3: 1 correct each direction → LEARNED
};
const COOLDOWNS_MS: Record<number, number> = {
  0: 12 * 60 * 60 * 1000, // 12 hours after round 1
  1: 24 * 60 * 60 * 1000, // 24 hours after round 2
};

export function computeCardUpdate(
  cardId: CardId,
  currentRound: number,
  grades: GradeEntry[], // all grades for this card in this session
  now: Date
): { newRound: number; cooldownUntil: Date | null; recallCountDelta: number } {
  const correctN2T = grades.filter(g => g.direction === "n2t" && g.correct).length;
  const correctT2N = grades.filter(g => g.direction === "t2n" && g.correct).length;
  const threshold = ROUND_THRESHOLDS[currentRound];

  if (!threshold) return { newRound: currentRound, cooldownUntil: null, recallCountDelta: 0 };

  const roundComplete = correctN2T >= threshold.n2t && correctT2N >= threshold.t2n;
  if (!roundComplete) return { newRound: currentRound, cooldownUntil: null, recallCountDelta: correctN2T + correctT2N };

  const newRound = currentRound + 1;
  const cooldownMs = COOLDOWNS_MS[currentRound] ?? null;
  const cooldownUntil = cooldownMs ? new Date(now.getTime() + cooldownMs) : null;
  return {
    newRound,
    cooldownUntil,
    recallCountDelta: correctN2T + correctT2N,
  };
}
```

**Earliest due card (for countdown timer — D-07):**

```typescript
export function earliestCooldownEnd(cards: CardForSession[], now: Date): Date | null {
  const future = cards
    .filter(c => c.cooldownUntil !== null && c.cooldownUntil > now)
    .map(c => c.cooldownUntil as Date);
  if (future.length === 0) return null;
  return future.reduce((a, b) => (a < b ? a : b));
}
```

### Pattern 3: Session Commit Route Handler

**What:** `POST /api/study/complete` receives batch grades, validates ownership, writes `recall_events`, updates `cards`, touches `habitat_metadata.lastActivityAt`.

**File:** `src/app/api/study/complete/route.ts`

```typescript
// Source: Next.js 16 route.md — POST handler pattern
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
// ... imports

const GradeSchema = z.object({
  cardId: z.string(),
  direction: z.enum(["n2t", "t2n"]),
  correct: z.boolean(),
});

const CommitSchema = z.object({
  deckId: z.string(),
  grades: z.array(GradeSchema).min(1).max(500),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid input" }, { status: 400 }); }

  const parsed = CommitSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  // Verify deck ownership, then batch-write events and update cards
  // Use db transaction for atomicity
  // ...
}
```

**Drizzle batch insert pattern (verified):**

```typescript
// Insert all recall_events in one statement
await db.insert(recall_events).values(
  grades.map(g => ({
    id: crypto.randomUUID() as RecallEventId,
    cardId: g.cardId as CardId,
    direction: g.direction,
    correct: g.correct,
  }))
);
```

**Drizzle update multiple cards with different values:**

```typescript
// Use CASE for per-card round updates (verified via official docs)
import { sql, inArray } from "drizzle-orm";

await db.update(cards)
  .set({
    masteryRound: sql`CASE ${sql.join(
      updates.map(u => sql`WHEN id = ${u.cardId} THEN ${u.newRound}`),
      sql` `
    )} ELSE "masteryRound" END`,
    cooldownUntil: sql`CASE ... END`,
    lastStudiedAt: new Date(),
  })
  .where(inArray(cards.id, updates.map(u => u.cardId as CardId)));
```

**Simpler alternative — sequential updates in a transaction** (use if CASE approach is complex):

```typescript
await db.transaction(async (tx) => {
  for (const update of updates) {
    await tx.update(cards)
      .set({ masteryRound: update.newRound, cooldownUntil: update.cooldownUntil, lastStudiedAt: now })
      .where(eq(cards.id, update.cardId as CardId));
  }
  // Insert all events
  await tx.insert(recall_events).values(eventRows);
  // Touch habitat_metadata
  await tx.update(habitat_metadata)
    .set({ lastActivityAt: now })
    .where(eq(habitat_metadata.userId, userId));
});
```

Transaction is preferred for atomicity (partial session must not corrupt card state — D-04 / Success Criterion 5).

### Pattern 4: Client Session State Machine (useReducer)

**What:** `StudySession` client component manages the full session lifecycle with `useReducer`.

**State shape:**

```typescript
// Source: architecture decision from STATE.md
type SessionState =
  | { phase: "studying"; queue: SessionCard[]; current: SessionCard; graded: GradeEntry[]; flipped: boolean; swipeReady: boolean }
  | { phase: "end"; stats: SessionStats }
  | { phase: "committing" }
  | { phase: "error"; message: string };

type SessionAction =
  | { type: "FLIP_CARD" }
  | { type: "SWIPE_GRADE"; direction: "left" | "right" }
  | { type: "LOOP_STILL_LEARNING" }
  | { type: "COMMIT_DONE"; stats: SessionStats }
  | { type: "COMMIT_ERROR"; message: string };
```

**Key reducer rules:**
- `FLIP_CARD`: set `flipped: true`, start 300ms timer to set `swipeReady: true`
- `SWIPE_GRADE` (only when `swipeReady`): push grade, remove from queue, if queue empty → `"committing"`, else advance to next card
- `LOOP_STILL_LEARNING`: re-add still-learning cards to end of queue
- After commit completes → `"end"` with stats

### Pattern 5: Motion 3D Flip Animation

**What:** CSS 3D flip using `motion.div` with `rotateY` transform.

**Import (Motion 12 — verified):**

```typescript
import { motion, AnimatePresence } from "motion/react";
```

**3D flip pattern:**

```tsx
// Card container needs perspective
<div style={{ perspective: 1000 }}>
  {/* Front face */}
  <motion.div
    animate={{ rotateY: flipped ? 180 : 0 }}
    transition={{ duration: 0.4, ease: "easeInOut" }}
    style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
  >
    {front}
  </motion.div>
  {/* Back face — starts rotated 180, flips into view */}
  <motion.div
    animate={{ rotateY: flipped ? 0 : -180 }}
    transition={{ duration: 0.4, ease: "easeInOut" }}
    style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden", position: "absolute", top: 0, left: 0 }}
  >
    {back}
  </motion.div>
</div>
```

### Pattern 6: Motion Swipe Gesture

**What:** Motion `drag` prop on the active card. Swipe direction detected in `onDragEnd` via `info.velocity`.

**Swipe detection (verified from Motion docs):**

```tsx
// Source: https://motion.dev/docs/react-drag
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}  // snaps back unless released
  dragElastic={0.7}
  onDragEnd={(_event, info) => {
    if (!swipeReady) return; // guard: card must be flipped first
    const VELOCITY_THRESHOLD = 300; // px/s
    const OFFSET_THRESHOLD = 80;    // px
    const isRight = info.velocity.x > VELOCITY_THRESHOLD || info.offset.x > OFFSET_THRESHOLD;
    const isLeft = info.velocity.x < -VELOCITY_THRESHOLD || info.offset.x < -OFFSET_THRESHOLD;
    if (isRight) dispatch({ type: "SWIPE_GRADE", direction: "right" }); // correct
    if (isLeft) dispatch({ type: "SWIPE_GRADE", direction: "left" });   // still learning
  }}
>
```

**Swipe-off exit animation (card leaves screen):**

```tsx
<AnimatePresence>
  {showCard && (
    <motion.div
      key={currentCard.id}
      initial={{ x: 0, opacity: 1 }}
      exit={{ x: gradeDirection === "right" ? 400 : -400, opacity: 0, transition: { duration: 0.3 } }}
    >
```

### Pattern 7: Physical Card Stack Visual

**What:** Up to 3 layered divs behind the active card using absolute positioning and CSS transforms.

```tsx
// Card stack — max 3 background layers
{stackLayers.map((_, i) => (
  <div
    key={i}
    className="absolute inset-0 rounded-xl bg-card border"
    style={{
      transform: `translateY(${(i + 1) * 4}px) scale(${1 - (i + 1) * 0.03})`,
      zIndex: -i - 1,
      opacity: 1 - (i + 1) * 0.15,
    }}
  />
))}
```

Where `stackLayers = queue.slice(0, Math.min(3, queue.length - 1))`.

### Pattern 8: Countdown Timer for Disabled Study Button

**What:** DeckView needs to show "Next cards in Xh Ym" when all cards are in cooldown. Timer refreshes every minute.

```typescript
// Computed on server — pass earliestDue as prop, format on client
function formatCountdown(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
```

Client component refreshes via `setInterval` every 60 seconds.

### Anti-Patterns to Avoid

- **Storing computed round state without raw events:** Always write `recall_events` rows. `masteryRound` is a cache, not the source of truth.
- **Validating grades client-side only:** Server must re-validate that the grades are plausible (no more correct grades per direction than cards shown). Client cannot be trusted.
- **Committing per-card during session:** The locked decision requires a single batch POST. Do not add per-card API calls mid-session.
- **Importing Motion at module scope in a Server Component:** `motion` components require `"use client"` or `"motion/react-client"`. `StudySession` must be a client component.
- **Using `"framer-motion"` import path:** Motion 12 uses `"motion/react"`. The old package name is deprecated.
- **Allowing swipe before flip:** The `swipeReady` guard prevents grading before the answer is revealed (maps to the 300ms delay requirement from STUDY-02).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card flip 3D animation | Custom CSS keyframes | `motion.div` with `rotateY` animate prop | Handles browser inconsistencies, respects `prefers-reduced-motion`, spring physics |
| Swipe velocity detection | Manual touch event tracking | Motion `drag` + `onDragEnd info.velocity` | Handles pointer vs touch, velocity normalization, snap-back on abort |
| AnimatePresence for card exit | Manual unmount timer | `AnimatePresence` from `"motion/react"` | Keeps component mounted until exit animation completes |
| DB transaction | Manual try/catch rollback | `db.transaction(async tx => ...)` | Drizzle's transaction helper handles rollback automatically |

**Key insight:** The session commit is the hardest correctness problem in this phase. Use a DB transaction so that a network timeout after partial writes cannot leave cards in inconsistent round state.

---

## Common Pitfalls

### Pitfall 1: 3D Flip Flicker (backface-visibility)

**What goes wrong:** Both card faces are visible simultaneously during rotation — a translucent double-image appears.
**Why it happens:** CSS `backfaceVisibility: "hidden"` must be set on BOTH the front and back faces AND `transformStyle: "preserve-3d"` on the parent.
**How to avoid:** Set all three CSS properties. Test in Firefox (most strict about 3D stacking context).
**Warning signs:** Card looks "see-through" during flip animation.

### Pitfall 2: Motion `drag` Conflicts with Click/Tap Events

**What goes wrong:** Tapping the card to flip it triggers a tiny unintentional drag, or a small drag is misread as a tap.
**Why it happens:** Pointer events fire for both tap and drag.
**How to avoid:** Use `dragSnapToOrigin={false}` and threshold the `onDragEnd` via offset (>80px) AND velocity (>300px/s). Small movements that don't meet both thresholds are ignored. For the tap-to-flip, handle via `onClick` — Motion's drag does not suppress click events for small movements.

### Pitfall 3: Session Assembly With Zero Due Cards

**What goes wrong:** `assembleSession` returns an empty array, and the study UI renders with nothing to show.
**Why it happens:** All cards are in cooldown (masteryRound > 0 and cooldownUntil in the future).
**How to avoid:** The study page Server Component calls `assembleSession` before rendering. If the result is empty, do NOT redirect to `/study` — keep the Study button disabled with the countdown timer (D-07). The `/study` route should also handle this gracefully (redirect back to dashboard if session is empty).

### Pitfall 4: Directional Grade Count Inflation

**What goes wrong:** A user flips a card 6 times and swipes right 6 times — `computeCardUpdate` advances them through multiple rounds in one session.
**Why it happens:** The session loop re-queues still-learning cards (D-03), and the engine sees accumulated correct grades.
**How to avoid:** The server must cap per-direction correct grades at the round threshold before computing updates. Grades beyond the threshold are recorded as `recall_events` (for history) but do not advance `masteryRound` beyond current+1 in a single commit.

### Pitfall 5: habitat_metadata Row May Not Exist

**What goes wrong:** The transaction fails when trying to UPDATE `habitat_metadata` for a user who has never completed a study session (row was not created in Phase 1).
**Why it happens:** `habitat_metadata` has no auto-create trigger. Phase 1 schema defined it but may not have inserted a row at signup.
**How to avoid:** Use `db.insert(habitat_metadata).values(...).onConflictDoUpdate(...)` (upsert) instead of a plain update in the commit transaction. This handles both first-time and repeat sessions.

### Pitfall 6: `motion/react` Import Fails in Server Component

**What goes wrong:** Build error when a Server Component file imports from `"motion/react"`.
**Why it happens:** Motion's React package uses browser APIs.
**How to avoid:** Any component using `motion.div` must have `"use client"` at the top. The study page (`page.tsx`) is a Server Component that passes data as props to `<StudySession>` (a client component). Never use `motion.div` in a server component file.

### Pitfall 7: Branded Type Cast on cardId in Batch Operations

**What goes wrong:** TypeScript error when comparing `cards.id` (branded `CardId`) to a plain `string` from the request body.
**Why it happens:** Zod parses grades as `{ cardId: string }`. Drizzle queries expect `CardId`.
**How to avoid:** Cast at the boundary: `g.cardId as CardId`. This is the established pattern from Phase 2 (STATE.md decision: "Branded type cast required when comparing plain string to branded Drizzle column in eq()").

---

## Code Examples

### Drizzle Insert Array (batch recall_events)

```typescript
// Source: https://orm.drizzle.team/docs/insert
await db.insert(recall_events).values(
  grades.map(g => ({
    id: crypto.randomUUID() as RecallEventId,
    cardId: g.cardId as CardId,
    direction: g.direction,
    correct: g.correct,
  }))
);
```

### Drizzle Transaction

```typescript
// Source: drizzle-orm docs — db.transaction
await db.transaction(async (tx) => {
  await tx.insert(recall_events).values(eventRows);
  for (const u of cardUpdates) {
    await tx.update(cards)
      .set({ masteryRound: u.newRound, cooldownUntil: u.cooldownUntil, lastStudiedAt: now })
      .where(eq(cards.id, u.cardId as CardId));
  }
  await tx.insert(habitat_metadata)
    .values({ id: crypto.randomUUID(), userId, lastActivityAt: now })
    .onConflictDoUpdate({ target: habitat_metadata.userId, set: { lastActivityAt: now } });
});
```

### Motion Drag Swipe Detection

```typescript
// Source: https://motion.dev/docs/react-drag
import { motion } from "motion/react";

<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.7}
  onDragEnd={(_event, info) => {
    const VELOCITY = 300;
    const OFFSET = 80;
    if (info.velocity.x > VELOCITY || info.offset.x > OFFSET) onGrade("correct");
    else if (info.velocity.x < -VELOCITY || info.offset.x < -OFFSET) onGrade("still-learning");
  }}
/>
```

### Route Handler Auth Pattern

```typescript
// Source: src/app/api/translate/route.ts (existing project pattern)
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // ...
}
```

### useReducer Session State Machine Skeleton

```typescript
// Source: architecture decision in STATE.md
"use client";
import { useReducer } from "react";

const initialState: SessionState = { phase: "studying", queue: initialCards, ... };

function reducer(state: SessionState, action: SessionAction): SessionState {
  switch (state.phase) {
    case "studying":
      if (action.type === "FLIP_CARD") return { ...state, flipped: true };
      if (action.type === "SWIPE_GRADE" && state.swipeReady) {
        const remaining = state.queue.slice(1);
        const graded = [...state.graded, { cardId: state.current.id, ... }];
        if (remaining.length === 0) return { phase: "committing" };
        return { ...state, queue: remaining, current: remaining[0], graded, flipped: false, swipeReady: false };
      }
      return state;
    default:
      return state;
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import { motion } from "framer-motion"` | `import { motion } from "motion/react"` | 2024 (v11) | Old import still works via compat shim but deprecated; use new path |
| NextRequest params as direct object | params is now a Promise: `await params` | Next.js 15 | Already handled in project (dashboard uses `await searchParams`) |

**Deprecated/outdated:**
- `"framer-motion"` package name: not deprecated as a package, but the canonical import is now `"motion/react"` for all new code.

---

## Open Questions

1. **Transaction size limit for large sessions**
   - What we know: Drizzle transactions have no documented per-statement limit for Neon serverless.
   - What's unclear: Whether a very large session (e.g., 200+ cards) causes transaction timeout on Neon's serverless connection pooler.
   - Recommendation: Add a Zod `.max(500)` cap on the grades array as a safeguard. The typical session is < 50 cards.

2. **motionValue vs animate for swipe-off exit**
   - What we know: `AnimatePresence` with `exit` prop handles the card-leaving animation. `drag` + `onDragEnd` triggers the grade.
   - What's unclear: Whether setting the exit animation direction (left vs right) requires a ref to the current drag state or can be handled purely via AnimatePresence `exit` variants.
   - Recommendation: Store `lastGradeDirection` in reducer state. Pass it as a prop to the card component to choose between `exit={{ x: 400 }}` and `exit={{ x: -400 }}`.

3. **D-03: Loop still-learning cards — when exactly?**
   - What we know: After one pass through all cards, still-learning cards re-queue.
   - What's unclear: Whether this means after the last new card is graded (before any still-learning cards are re-presented), or after every card in the original queue has been seen once.
   - Recommendation: Implement as: once `queue` reaches zero, re-add all `graded.filter(g => !g.correct)` cards back as a new queue. This is the simplest correct interpretation.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| motion (npm) | Card flip + swipe animation | NOT INSTALLED | 12.38.0 (latest) | None — required |
| drizzle-orm | DB queries | installed | 0.45.2 | — |
| vitest | Unit tests | installed | 4.1.2 | — |
| zod | Request validation | installed | 4.3.6 | — |
| DATABASE_URL | Drizzle migrations | assumed set | — | — |
| Node.js / npm | Package install | installed | — | — |

**Missing dependencies with no fallback:**
- `motion` — must be installed via `npm install motion` as Wave 0 task in Plan 03-03.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test -- --reporter=verbose src/lib/study-engine.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STUDY-01 | `assembleSession` returns correct card mix with ~10% resurface | unit | `npm test -- src/lib/study-engine.test.ts` | Wave 0 |
| STUDY-01 | `earliestCooldownEnd` returns correct date | unit | `npm test -- src/lib/study-engine.test.ts` | Wave 0 |
| STUDY-02 | `computeCardUpdate` handles round completion correctly | unit | `npm test -- src/lib/study-engine.test.ts` | Wave 0 |
| STUDY-03 | Card reaches masteryRound=3 after correct round sequence | unit | `npm test -- src/lib/study-engine.test.ts` | Wave 0 |
| STUDY-04 | Commit route returns 200 and writes to DB (integration — manual) | manual | n/a | manual only |
| STUDY-05 | Resurface interleaving places ~1 per 3-4 cards | unit | `npm test -- src/lib/study-engine.test.ts` | Wave 0 |
| STUDY-06 | Stack visual renders correct layer count | unit (React Testing Library) | manual | manual only — UI component |

**Note:** The Route Handler and UI are not covered by unit tests (they depend on DB and browser). The engine pure functions are fully unit-testable. Plan 03-01 must include `src/lib/study-engine.test.ts`.

### Sampling Rate

- **Per task commit:** `npm test -- src/lib/study-engine.test.ts -x`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/study-engine.test.ts` — covers STUDY-01, STUDY-02, STUDY-03, STUDY-05
- [ ] `src/lib/study-engine.ts` — the module under test (must exist before test file can import it)

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler POST pattern, params-as-Promise confirmed
- `node_modules/next/dist/docs/01-app/02-guides/forms.md` — Server Action auth pattern
- `src/db/schema.ts` — Current schema with `recall_events` table missing `direction`
- `src/lib/deck-actions.ts` — Established server action pattern (auth, ownership check, revalidatePath)
- `src/app/api/translate/route.ts` — Established Route Handler pattern
- `src/lib/deck-actions.test.ts` — Established vitest mock pattern (vi.hoisted, vi.mock factories)
- `.planning/phases/03-study-engine-and-study-ui/03-CONTEXT.md` — All locked decisions
- `.planning/research/SUMMARY.md` — Stack decisions, compute-on-read architecture
- `.planning/STATE.md` — Accumulated implementation decisions

### Secondary (MEDIUM confidence)
- https://motion.dev/docs/react-drag — Drag API, `onDragEnd` callback signature with `info.velocity` and `info.offset`
- https://motion.dev/docs/react-motion-component — `import { motion } from "motion/react"` confirmed as correct v12 import
- https://orm.drizzle.team/docs/insert — Batch insert via `.values([...])` array
- https://orm.drizzle.team/docs/update — Per-row update with `sql` template and `inArray`

### Tertiary (LOW confidence)
- Transaction timeout behavior on Neon serverless for large batches — not verified; 500-grade cap is a precaution

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — motion 12.38.0 verified via npm; all other packages installed and version-confirmed
- Architecture: HIGH — patterns derived from existing codebase + official Next.js 16 docs + Motion official docs
- Schema design: HIGH — compute-on-read pattern from locked STATE.md decisions; `direction` on recall_events is the correct application
- Engine logic: HIGH — pure function structure derived from CONTEXT.md D-14 spec; fully unit-testable
- Pitfalls: HIGH — drawn from existing codebase patterns and verified API behavior

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (motion releases frequently; verify import path if > 30 days)
