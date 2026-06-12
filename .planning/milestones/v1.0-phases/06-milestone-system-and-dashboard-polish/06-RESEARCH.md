# Phase 6: Milestone System and Dashboard Polish - Research

**Researched:** 2026-03-28
**Domain:** Level-up celebrations (React overlay + confetti), PixiJS bird sprite entrance animation, per-language learned card query, study/complete API response extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** No separate milestone threshold system. The existing 10-level habitat progression already serves as the reward/progression mechanic.
- **D-02:** HAB-04 (milestone unlock moments) maps to level-up celebrations within the existing level system.
- **D-03:** HAB-05 (new animals at milestones) maps to a single bird appearing at level 10. Levels 1-9 already have visual rewards via habitat layers.
- **D-04:** Fullscreen overlay celebration — modal overlay with confetti, level number, and what was unlocked. User taps/clicks to dismiss.
- **D-05:** Celebration triggers after study session completes (after progress saves successfully).
- **D-06:** Exactly-once guarantee — once dismissed, never replays. Use `milestones_seen` table (already in schema) to track which level-ups have been celebrated.
- **D-07:** If user levels up multiple times in one session, show the highest level-up celebration only. Lower level-ups are silently marked as seen.
- **D-08:** A single bird sprite appears in the habitat at level 10 as the ultimate reward.
- **D-09:** Bird flies in from off-screen (animated entrance) when the level 10 celebration triggers.
- **D-10:** Bird remains visible in all subsequent habitat visits once level 10 is reached.
- **D-11:** Simple text below deck header showing per-language learned card counts. E.g., "French: 23 learned · Spanish: 10 learned · English: 4 learned".
- **D-12:** Only show languages that have at least one learned card.

### Claude's Discretion
- Confetti/particle implementation approach in the celebration overlay
- Exact bird sprite design and positioning in the habitat scene
- Query optimization for per-language learned card counts
- Level-up detection logic (compare before/after state in study/complete response)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HAB-04 | Milestone thresholds trigger special unlock moments | Mapped to level-up celebrations: level-up detection in study/complete, overlay component, milestones_seen DB writes |
| HAB-05 | New animals appear in the habitat as visual milestone rewards | Bird sprite at level 10: new asset frame in habitat spritesheet OR standalone sprite, PixiJS entrance animation pattern from tiger-sprite.tsx |
| HAB-07 | Dashboard shows per-language breakdown of learned card counts | Drizzle GROUP BY query on cards JOIN decks filtered by masteryRound >= 3, rendered as simple text in DeckView |
</phase_requirements>

---

## Summary

Phase 6 has three deliverables: (1) a fullscreen celebration overlay triggered after a study session commits a level-up, (2) a bird sprite that flies into the habitat scene when level 10 is reached and persists thereafter, and (3) a per-language learned card count shown as plain text on the dashboard.

All the infrastructure needed already exists. The `milestones_seen` table is live in the database (migrated in 0000_blue_johnny_storm.sql). The `computeHabitatState` function is a pure function that takes a `now` Date — level-up detection requires calling it twice (before and after the study session commits) inside the `POST /api/study/complete` handler and comparing levels. The overlay lives entirely in React (Motion 12 AnimatePresence), not inside the PixiJS canvas. The bird is a PixiJS sprite added to the Scene component in `habitat-canvas.tsx`, following the exact same useTick/useEffect patterns already used by `TigerSprite` and `SparkleParticles`.

The key constraint discovered during code inspection: the `milestones_seen` schema comment says milestone values like "10" | "25" | "50" | "100", but those were the original card-count thresholds that were discarded. The actual values to store are now habitat level numbers as strings: `"level-2"` through `"level-10"`. Using a prefixed key like `"level-10"` avoids any ambiguity with the old card-count values that may already be in the DB for any user. This is a naming decision left to Claude's discretion.

**Primary recommendation:** Extend `POST /api/study/complete` to return `{ success: true, leveledUp: number | null }`, where `leveledUp` is the new level if it increased or null otherwise. The client reads this, stores it in reducer state, and renders a `LevelUpOverlay` component via `AnimatePresence` on the end screen.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion | 12.38.0 | React-layer animation (overlay enter/exit, confetti) | Already used for study end screen, card animations |
| pixi.js | 8.17.1 | Bird sprite rendering and entrance animation | Already used for all habitat canvas rendering |
| @pixi/react | 8.0.5 | React bridge for PixiJS, `useTick`, `useApplication` | Already used throughout habitat components |
| drizzle-orm | 0.45.1 | Per-language GROUP BY query | Already used for all DB access |

### No New Dependencies Required
All required capabilities are available in the installed stack. No new packages.

**Confetti implementation:** Use CSS/Motion-based confetti (falling colored rectangles animated with `motion.div` staggered transforms) rather than a confetti library. This avoids adding a dependency and aligns with the project's pattern of hand-rolling simple particle effects (see `SparkleParticles`). Approximately 30-40 colored `motion.div` elements with randomized x positions, fall animation, and staggered delays. This is Claude's discretion per D-04.

---

## Architecture Patterns

### Recommended Project Structure (new files)

```
src/
├── components/
│   ├── level-up-overlay.tsx     # Fullscreen celebration modal (React/Motion)
│   └── bird-sprite.tsx          # PixiJS bird at level 10 (useTick fly-in)
├── lib/
│   └── milestone-queries.ts     # markMilestonesSeen(), getSeenMilestones(), getLanguageBreakdown()
└── app/api/study/complete/
    └── route.ts                 # Extended: returns leveledUp field
```

### Pattern 1: Level-Up Detection in study/complete

**What:** Before writing DB updates, compute the pre-session level. After writing, compute the post-session level. If `newLevel > prevLevel`, mark lower levels seen, mark all unseen levels seen except the highest, return `leveledUp: newLevel`.

**When to use:** On every POST to /api/study/complete. Zero cost if no level change.

**Key detail — the `milestones_seen` milestone column** currently stores text like "10" | "25" | "50" | "100" per schema comment. The new convention will be `"level-N"` (e.g., `"level-5"`, `"level-10"`). This avoids colliding with any old card-count milestone entries and makes the meaning unambiguous.

**Example: level-up detection logic**
```typescript
// Source: derived from habitat-engine.ts computeHabitatState + habitat-queries.ts getHabitatFacts

// Before writes: compute pre-session level
const factsBefore = await getHabitatFacts(session.user.id as UserId);
const stateBefore = computeHabitatState(factsBefore, now);
const prevLevel = stateBefore.level;

// ... perform all DB writes (recall_events, card updates, habitat_metadata) ...

// After writes: compute post-session level using updated lastActivityAt
const factsAfter = await getHabitatFacts(session.user.id as UserId);
const stateAfter = computeHabitatState(factsAfter, now);
const newLevel = stateAfter.level;

// Detect level-up
let leveledUp: number | null = null;
if (newLevel > prevLevel) {
  // Mark all levels from prevLevel+1 to newLevel as seen
  // Return only the highest (newLevel) to client per D-07
  leveledUp = newLevel;
}
return Response.json({ success: true, leveledUp });
```

**DB writes for milestone tracking:**
```typescript
// Source: schema.ts milestones_seen table, drizzle-orm insert pattern

import { milestones_seen } from "@/db/schema";

// For each level from prevLevel+1 to newLevel, insert if not already seen
for (let lvl = prevLevel + 1; lvl <= newLevel; lvl++) {
  await db
    .insert(milestones_seen)
    .values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      milestone: `level-${lvl}`,
    })
    .onConflictDoNothing(); // unique constraint: userId + milestone
}
```

Note: `onConflictDoNothing()` is safe here — the unique constraint `milestones_seen_userId_milestone_unique` prevents duplicate rows. If a level was already celebrated, the insert silently no-ops.

### Pattern 2: LevelUpOverlay Component (React layer)

**What:** A `LevelUpOverlay` component rendered in `study-session.tsx` during the `"end"` phase. It is a portal-like fullscreen fixed div, not a PixiJS component. Uses Motion's `AnimatePresence` + `motion.div` for enter/exit.

**When to use:** When `leveledUp` prop is non-null on the end screen.

**Integration point in study-session.tsx:**
```typescript
// Source: study-session.tsx end phase render

if (state.phase === "end") {
  // ...existing end screen...
  // leveledUp comes from API response, stored in SessionStats or separate state
  return (
    <>
      {leveledUp !== null && (
        <LevelUpOverlay level={leveledUp} onDismiss={() => setLeveledUp(null)} />
      )}
      {/* existing end screen JSX */}
    </>
  );
}
```

**LevelUpOverlay structure:**
```typescript
// Source: motion/react import pattern from study-session.tsx ("motion/react" NOT "framer-motion")
import { AnimatePresence, motion } from "motion/react";

export function LevelUpOverlay({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
    >
      {/* Confetti particles: 30-40 motion.div elements, staggered fall */}
      {/* Level number + message */}
      {/* "Tap to continue" hint */}
    </motion.div>
  );
}
```

**Critical:** Import from `"motion/react"` NOT `"framer-motion"` — per existing codebase decision from STATE.md: "motion/react (not framer-motion) is the correct import path for Motion 12 in this codebase."

### Pattern 3: StudySession State Machine Extension

**What:** The `study-session.tsx` `useReducer` state machine needs to carry the `leveledUp` value returned by the API. The cleanest approach is to add `leveledUp: number | null` to `SessionStats` and populate it from the API response JSON.

**Current `COMMIT_DONE` action:**
```typescript
// Source: study-session.tsx reducer
case "COMMIT_DONE": {
  return { phase: "end", stats: action.stats };
}
```

**Extended approach — add leveledUp to SessionStats:**
```typescript
// In study-engine.ts or locally in study-session.tsx:
interface SessionStats {
  cardsStudied: number;
  correctCount: number;
  newlyLearned: number;
  leveledUp: number | null;  // NEW: from API response
}

// In the commit() async function:
const data = await response.json();
const stats = computeStats(initialCards, graded);
dispatch({ type: "COMMIT_DONE", stats: { ...stats, leveledUp: data.leveledUp ?? null } });
```

### Pattern 4: BirdSprite Component (PixiJS)

**What:** A new `BirdSprite` component rendered inside the `Scene` function in `habitat-canvas.tsx`. Conditionally rendered when `level >= 10`. On first appearance (when celebration triggers), it flies in from off-screen. On subsequent visits, it starts at its resting position.

**Asset decision:** The bird sprite frame needs to be added to `public/sprites/habitat.json`. Current habitat spritesheet has frames: `layer-sky`, `layer-hills`, `layer-grass-base`, `layer-tree-1`, etc. A new `layer-bird` frame would fit this pattern. Alternatively, a separate `bird.json` spritesheet. Given all other habitat elements are in `habitat.json`, adding `layer-bird` to the existing atlas is cleaner.

**BirdSprite animation approach (useTick fly-in):**
```typescript
// Source: TigerSprite.tsx pattern — useTick for animation, refs to avoid setState in tick
"use client";
import { useCallback, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import type { Spritesheet, Ticker } from "pixi.js";

interface BirdSpriteProps {
  sheet: Spritesheet;           // habitat sheet containing layer-bird
  sceneWidth: number;
  sceneHeight: number;
  isFirstAppearance: boolean;   // true = fly-in animation, false = static position
}

export function BirdSprite({ sheet, sceneWidth, sceneHeight, isFirstAppearance }: BirdSpriteProps) {
  // Resting position: upper-right area of scene (~75% x, ~30% y)
  const restX = sceneWidth * 0.75;
  const restY = sceneHeight * 0.30;

  // Fly-in: start from off-screen right
  const [x, setX] = useState(() => isFirstAppearance ? sceneWidth + 100 : restX);
  const [y, setY] = useState(() => isFirstAppearance ? restY : restY);
  const isAnimatingRef = useRef(isFirstAppearance);
  const frameRef = useRef(0);

  const onTick = useCallback((ticker: Ticker) => {
    if (!isAnimatingRef.current) return;
    frameRef.current += ticker.deltaTime;
    // Ease-in-out over ~60 frames (~1 second)
    const progress = Math.min(1, frameRef.current / 60);
    const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    const currentX = sceneWidth + 100 + (restX - (sceneWidth + 100)) * eased;
    setX(currentX);
    if (progress >= 1) {
      isAnimatingRef.current = false;
    }
  }, [sceneWidth, restX]);

  useTick(onTick);

  const texture = sheet.textures["layer-bird"];
  if (!texture) return null;

  const birdSize = sceneHeight * 0.08; // smaller than tiger (18%)
  return (
    <pixiSprite
      texture={texture}
      x={x}
      y={y}
      anchor={0.5}
      width={birdSize}
      height={birdSize}
    />
  );
}
```

**isFirstAppearance detection:** Pass a prop from `Scene`. The Scene already receives `habitatState`. Add a `celebratingLevel` prop (or derive from `HabitatCanvas` props). When the celebration overlay is shown AND level is 10, the bird performs its fly-in. On all subsequent renders, `isFirstAppearance` is false.

The simplest approach: `HabitatCanvas` accepts an optional `celebratingLevel: number | null` prop. If `celebratingLevel === 10`, the bird's `isFirstAppearance` is true for that render tree lifetime.

### Pattern 5: Per-Language Learned Card Count Query

**What:** A new query function in `habitat-queries.ts` or a new `milestone-queries.ts` file that returns `{ language: string; count: number }[]` filtered to languages with `count > 0`.

**Drizzle GROUP BY pattern:**
```typescript
// Source: existing habitat-queries.ts for query style; drizzle-orm docs for groupBy
import { and, count, eq, gte, gt } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function getLanguageBreakdown(
  userId: UserId,
): Promise<Array<{ language: string; count: number }>> {
  const rows = await db
    .select({
      language: decks.language,
      count: count(),
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(
        eq(decks.userId, userId as string),
        gte(cards.masteryRound, 3),
      ),
    )
    .groupBy(decks.language)
    .having(gt(count(), 0));  // redundant but explicit: only languages with >= 1 learned card

  return rows.map((r) => ({ language: r.language, count: r.count }));
}
```

**Alternative without `.having()`:** The `WHERE masteryRound >= 3` already ensures only learned cards are counted. If a language has no learned cards it won't appear in the result at all — so `.having()` is optional but keeps intent explicit.

**Dashboard integration:** In `dashboard/page.tsx` (Server Component), call `getLanguageBreakdown()` in the `Promise.all` alongside existing queries. Pass result as `languageBreakdown` prop to `DeckView`. In `DeckView`, render the breakdown text below the deck header.

**Rendering in DeckView:**
```typescript
// Source: deck-view.tsx — below the "My Deck" h1

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

// In JSX, after the h1:
{languageBreakdown.length > 0 && (
  <p className="text-sm text-muted-foreground mt-1">
    {languageBreakdown
      .map((item) => `${LANGUAGE_LABELS[item.language] ?? item.language}: ${item.count} learned`)
      .join(" · ")}
  </p>
)}
```

Note: `LANGUAGE_LABELS` already exists in `deck-view.tsx` — no duplication needed.

### Anti-Patterns to Avoid

- **Storing computed level in the DB:** The architecture is compute-on-read. Level is always derived from `effectiveCardCount`. Never write `level: N` to any DB table — only write `milestones_seen` rows (which record celebration state, not computed level).
- **Level-up detection on the client:** The client does not have the pre-session DB state. Detection must happen server-side in the route handler where both before and after states can be computed.
- **Importing from `framer-motion`:** Always use `"motion/react"` — the two package names resolve to different module trees in this codebase. Existing code uses `motion/react` exclusively.
- **Calling `useTick` outside the `<Application>` tree:** `useTick` requires `@pixi/react`'s context. `BirdSprite` must be rendered inside the `<Application>` → `<Scene>` tree, not at the React root level.
- **setState in `useTick` callbacks without `useCallback`:** Per existing codebase decision: "useTick callbacks wrapped in useCallback per Pitfall 3 — prevents re-registration on every render." `BirdSprite`'s `onTick` must be wrapped in `useCallback`.
- **Rendering `BirdSprite` before `habitatSheet` loads:** Follow the same guard used in `Scene`: `if (!tigerSheet || !habitatSheet) return null`. Bird uses the habitat sheet.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confetti animation | Third-party confetti library | 30-40 `motion.div` staggered falls | Project has no animation lib except Motion; SparkleParticles shows particle hand-rolling is the established pattern |
| Overlay portal | Custom React portal | Fixed-position `motion.div` with `z-50` | Next.js app router renders into a single root; fixed + z-index is sufficient and simpler |
| Duplicate bird sprite sheet | New separate `bird.json` atlas | Add `layer-bird` frame to existing `habitat.json` | All habitat elements share one atlas; reduces Assets.load() calls |
| Per-language count in JS | Load all cards, group in memory | Drizzle GROUP BY at DB layer | DB aggregation is O(indexed rows), JS grouping is O(all learned cards) |

**Key insight:** The existing PixiJS patterns (useTick refs, useCallback wrapping, lazy useState initializers) are battle-tested against SSR hydration and re-render pitfalls. BirdSprite should copy TigerSprite's structure exactly rather than inventing a new pattern.

---

## Common Pitfalls

### Pitfall 1: Double-counting level-up DB writes
**What goes wrong:** The `onConflictDoNothing()` is critical. Without it, re-submitting a session (e.g., network retry) could attempt to insert duplicate milestones_seen rows and fail on the unique constraint.
**Why it happens:** The route handler has retry logic on the client side (RETRY_COMMIT action in the reducer).
**How to avoid:** Always use `.onConflictDoNothing()` when inserting into `milestones_seen`.
**Warning signs:** 500 error on study session commit after a network hiccup.

### Pitfall 2: Race between two `getHabitatFacts` calls
**What goes wrong:** The level-up detection pattern requires calling `getHabitatFacts` before AND after the DB writes. The "after" call must happen after `habitat_metadata.lastActivityAt` is updated, or quality will be computed with stale data.
**Why it happens:** `computeQuality` uses `lastActivityAt` — if the upsert hasn't committed yet, the "after" quality could be wrong.
**How to avoid:** The upsert to `habitat_metadata` happens inside the try block. Call `getHabitatFacts` for the post-state after the try block completes successfully.
**Warning signs:** Level appears unchanged in the response even when cards crossed a threshold.

### Pitfall 3: `isFirstAppearance` always true on re-render
**What goes wrong:** If `isFirstAppearance` is derived each render from props (e.g., `celebratingLevel === 10`), then every time the parent re-renders after the fly-in, the bird will restart the animation.
**Why it happens:** Props change when parent state updates (e.g., overlay dismissed, other state changes).
**How to avoid:** Use a `ref` or `useState` initializer to capture `isFirstAppearance` once on mount: `const isFirstAppearanceRef = useRef(isFirstAppearance)`. Never re-read the prop inside `onTick`.
**Warning signs:** Bird slides in from off-screen on every habitat page visit after reaching level 10.

### Pitfall 4: `milestones_seen` `milestone` column value collision
**What goes wrong:** The schema comment suggests "10" | "25" | "50" | "100" as milestone values (the old card-count thresholds). If any user has an existing row with `milestone: "10"` (10 learned cards milestone from a prior version), using bare `"10"` for level 10 would incorrectly mark it seen.
**Why it happens:** Schema comment reflects original intent, now superseded.
**How to avoid:** Use prefixed keys: `"level-2"` through `"level-10"`. These cannot collide with old card-count values.
**Warning signs:** Level 10 celebration never shows for a user who had a prior "10 cards" milestone marked.

### Pitfall 5: Motion `AnimatePresence` not wrapping conditional content
**What goes wrong:** Exit animations don't play if content is conditionally rendered without `AnimatePresence`.
**Why it happens:** React unmounts components immediately; `AnimatePresence` delays unmount until the exit animation completes.
**How to avoid:** Wrap `LevelUpOverlay` in `<AnimatePresence>` in the parent component.
**Warning signs:** Overlay disappears instantly instead of fading out when dismissed.

### Pitfall 6: `useTick` registered outside Application context
**What goes wrong:** Runtime error: "No PixiJS Application context found".
**Why it happens:** `BirdSprite` is a PixiJS component that must live inside the `<Application>` tree.
**How to avoid:** `BirdSprite` is rendered inside `<Scene>` → inside `<Application>`. Never extract it to the React root level.

---

## Code Examples

### Level-up detection in POST /api/study/complete
```typescript
// Source: derived from habitat-engine.ts + habitat-queries.ts + route.ts patterns

// Step A: capture pre-session level
const factsBefore = await getHabitatFacts(session.user.id as UserId);
const prevLevel = computeHabitatState(factsBefore, now).level;

// ... all existing writes in try block ...
// (recall_events insert, card updates, habitat_metadata upsert)

// Step B: capture post-session level (after successful writes)
const factsAfter = await getHabitatFacts(session.user.id as UserId);
const newLevel = computeHabitatState(factsAfter, now).level;

// Step C: mark milestones and return level-up info
let leveledUp: number | null = null;
if (newLevel > prevLevel) {
  for (let lvl = prevLevel + 1; lvl <= newLevel; lvl++) {
    await db
      .insert(milestones_seen)
      .values({ id: crypto.randomUUID(), userId: session.user.id, milestone: `level-${lvl}` })
      .onConflictDoNothing();
  }
  leveledUp = newLevel;
}

return Response.json({ success: true, leveledUp });
```

### Per-language breakdown query
```typescript
// Source: drizzle-orm groupBy pattern, habitat-queries.ts style

import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";
import type { UserId } from "@/db/schema";

export async function getLanguageBreakdown(
  userId: UserId,
): Promise<Array<{ language: string; count: number }>> {
  const rows = await db
    .select({ language: decks.language, count: count() })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(eq(decks.userId, userId as string), gte(cards.masteryRound, 3)))
    .groupBy(decks.language);

  return rows.map((r) => ({ language: r.language, count: r.count }));
}
```

### Dashboard language breakdown text rendering (in DeckView)
```typescript
// Source: deck-view.tsx, LANGUAGE_LABELS already defined there

// Prop addition: languageBreakdown: Array<{ language: string; count: number }>
// Below the h1 "My Deck":
{languageBreakdown.length > 0 && (
  <p className="text-sm text-muted-foreground mt-1">
    {languageBreakdown
      .map((item) => `${LANGUAGE_LABELS[item.language] ?? item.language}: ${item.count} learned`)
      .join(" \u00B7 ")}
  </p>
)}
```

### Motion confetti pattern (inside LevelUpOverlay)
```typescript
// Source: motion/react import pattern from study-session.tsx
import { motion } from "motion/react";

const CONFETTI_COLORS = ["#F97316", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
const CONFETTI_COUNT = 36;

function ConfettiPiece({ index }: { index: number }) {
  const x = `${5 + (index / CONFETTI_COUNT) * 90}vw`;
  const delay = (index % 8) * 0.07;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  return (
    <motion.div
      className="absolute top-0 w-2 h-3 rounded-sm"
      style={{ left: x, backgroundColor: color }}
      initial={{ y: "-10vh", opacity: 1, rotate: 0 }}
      animate={{ y: "110vh", opacity: 0, rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
      transition={{ duration: 2.5, delay, ease: "easeIn" }}
    />
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` imports | `motion/react` imports | Motion 12 | All animation code uses `motion/react` |
| `middleware.ts` | `proxy.ts` | Next.js 16 | Route protection file rename |
| No milestone tracking | `milestones_seen` table live in DB | Phase 1 schema | Table ready, no migration needed |

**Existing state confirmed:**
- `milestones_seen` table: EXISTS in DB (0000_blue_johnny_storm.sql) — no migration needed for the table itself
- `habitat.json` spritesheet frames: `layer-sky`, `layer-hills`, `layer-grass-base`, `layer-tree-1`, `layer-rocks-1`, `layer-tree-2`, `layer-flowers-1`, `layer-water-1`, `layer-animal-1`, `layer-tree-3`, `layer-flowers-2`, `layer-animal-2`, `layer-water-2` — no `layer-bird` frame yet. **A new bird asset must be added to the spritesheet.**
- `tiger.json` spritesheet frames: `tiger/happy.png`, `tiger/neutral.png`, `tiger/sad.png`, `tiger/excited/01.png`, `tiger/excited/02.png` — bird does not belong here.

---

## Open Questions

1. **Bird sprite artwork**
   - What we know: The bird needs a `layer-bird` frame in `habitat.json`. All other habitat frames are placeholder pixel art in the current atlas.
   - What's unclear: Is the bird a new file to draw, or does the planner assume a placeholder frame already exists? The existing `layer-animal-1` and `layer-animal-2` frames in the atlas suggest companion animals already have placeholder art — the bird may need a distinct placeholder.
   - Recommendation: Plan should include a Wave 0 task to add a `layer-bird` placeholder frame to the `habitat.json` atlas (even a colored rectangle suffices for development). Art polish is separate from functional implementation.

2. **`celebratingLevel` prop threading through HabitatCanvas**
   - What we know: The bird's `isFirstAppearance` depends on whether the level-10 celebration just triggered. This state lives in `StudySession` (end phase), but `HabitatCanvas` is rendered on `/habitat` or `/dashboard`, not in `StudySession`.
   - What's unclear: On the study end screen, the celebration overlay shows. But the bird appears in the habitat canvas (a different page). On the NEXT visit to `/dashboard` or `/habitat`, the bird should already be in its resting position (not fly-in), because the fly-in already happened.
   - Recommendation: The fly-in should trigger once on the `/dashboard` or `/habitat` page load after level-10 is first reached. The mechanism: `HabitatCanvas` (or its parent) reads whether level 10 was "just unlocked" — i.e., level is 10 AND the `milestones_seen` row for `"level-10"` was just inserted (within this session). This can be encoded as a query param `?celebrate=10` appended to the `router.push()` call when the overlay is dismissed. The dashboard page reads this param and passes `celebratingLevel: 10` to `HabitatCanvas` for one render. On subsequent loads without the param, `isFirstAppearance` is false.
   - This is a Claude's discretion design choice. The planner should pick an approach and document it.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 6 is purely code changes to existing Next.js app with no new external service dependencies. All required tools (Node.js, npm, Next.js dev server, Neon DB) were validated in prior phases.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HAB-04 | Level-up detection returns correct `leveledUp` value when level increases | unit | `npm test -- habitat-engine` | Uses existing `habitat-engine.test.ts` patterns; new tests in `milestone-queries.test.ts` |
| HAB-04 | `milestones_seen` inserts with `onConflictDoNothing` — no duplicate on retry | unit | `npm test -- milestone-queries` | ❌ Wave 0: create `src/lib/milestone-queries.test.ts` |
| HAB-05 | Bird sprite renders when level >= 10, not when level < 10 | manual-only | — | Component test requires PixiJS canvas; verify visually |
| HAB-07 | `getLanguageBreakdown` returns only languages with >= 1 learned card | unit | `npm test -- milestone-queries` | ❌ Wave 0: include in `src/lib/milestone-queries.test.ts` |
| HAB-07 | Language breakdown text renders correctly in DeckView | manual-only | — | React component with Tailwind; verify visually in browser |

**Manual-only justifications:**
- HAB-05 (bird sprite): PixiJS canvas rendering cannot be unit-tested in Vitest's node environment. Requires browser.
- HAB-07 DeckView: Component involves client-side hooks; not covered by existing Vitest patterns (no jsdom environment configured).

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/milestone-queries.test.ts` — covers HAB-04 (level-up detection logic, `markMilestonesSeen` idempotency) and HAB-07 (`getLanguageBreakdown` filtering, grouping)
- [ ] `src/lib/milestone-queries.ts` — the query module itself (testable pure logic)

*(Existing test infrastructure: Vitest + `@` alias — fully functional, no framework install needed)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/lib/habitat-engine.ts` — `computeHabitatState`, `LEVEL_THRESHOLDS`, level computation
- Direct code inspection: `src/db/schema.ts` — `milestones_seen` table shape and unique constraint
- Direct code inspection: `drizzle/0000_blue_johnny_storm.sql` — confirms `milestones_seen` is already migrated
- Direct code inspection: `public/sprites/habitat.json` — confirmed no `layer-bird` frame exists
- Direct code inspection: `src/components/tiger-sprite.tsx` — established `useTick` + `useCallback` pattern for PixiJS animation
- Direct code inspection: `src/components/sparkle-particles.tsx` — established particle/animation pattern
- Direct code inspection: `src/components/study-session.tsx` — `useReducer` state machine, `COMMIT_DONE` action, `motion/react` import
- Direct code inspection: `src/app/api/study/complete/route.ts` — existing write flow to extend
- Direct code inspection: `src/lib/habitat-queries.ts` — `getHabitatFacts` query pattern (BASIS for `getLanguageBreakdown`)
- Direct code inspection: `package.json` — motion@12.38.0, pixi.js@8.17.1, @pixi/react@8.0.5

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions log — `motion/react` import convention, compute-on-read architecture
- `.planning/phases/06-milestone-system-and-dashboard-polish/06-CONTEXT.md` — all user decisions D-01 through D-12

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries inspected directly from package.json and node_modules
- Architecture: HIGH — all integration points verified against actual source code
- Pitfalls: HIGH — derived from reading existing code decisions in STATE.md and direct code analysis
- Asset gap (bird frame): HIGH — confirmed by inspecting habitat.json; frame does not exist

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable stack, 30-day window)

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md contains only `@AGENTS.md`, which states:

> "This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices."

**Directive for planning:** Any task that touches Next.js APIs (route handlers, Server Components, middleware) MUST verify the API shape from `node_modules/next/dist/docs/` before writing code. Key known differences already incorporated into this research:
- File is `proxy.ts` not `middleware.ts` (Next.js 16 breaking change — from STATE.md)
- `headers()` must be awaited: `await headers()` (Next.js 16 — confirmed in existing route.ts files)
- `searchParams` prop in page components is a `Promise<...>` that must be awaited (confirmed in dashboard/page.tsx)
- `ssr: false` dynamic imports require a `"use client"` boundary (from STATE.md)
