# Phase 3: Study Engine and Study UI - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Core flashcard study loop — card selection, reveal-and-grade interaction, spaced mastery tracking with directional progression, session commit, and a physical card-deck visual metaphor. Users can run a study session for their active deck and have the server reliably record their progress toward mastery.

</domain>

<decisions>
## Implementation Decisions

### Session flow
- **D-01:** Study starts from the active deck — user taps "Study" inside the deck view (not the header). Session pulls cards from that one deck only.
- **D-02:** Session includes ALL unlearned cards from the active deck (no fixed cap), plus ~10% resurface pool of learned cards.
- **D-03:** After one pass through all cards, cards marked "still learning" auto-loop back into the session. Session continues until the user gets all cards right or quits.
- **D-04:** User can quit a session at any time — all grades so far are committed to the server (partial save).
- **D-05:** Cards ordered newest-first (most recently added cards appear first in the session).
- **D-06:** Study happens on a dedicated `/study` route — full-screen experience, no distractions.
- **D-07:** When no cards are due (all in cooldown), the Study button is disabled with a countdown timer: "Next cards in Xh Ym".

### Card interaction
- **D-08:** Directional progression per card:
  - **Stage 1:** Show native language → user recalls target translation
  - **Stage 2:** Once correct in native→target, show target language → user recalls native meaning
  - **Stage 3:** Once correct in both directions, randomly show either side
- **D-09:** 3D flip animation to reveal the answer (Motion/CSS 3D transform) — classic flashcard feel.
- **D-10:** Binary grading only: Correct / Still learning.
- **D-11:** Swipe-only grading (no buttons): swipe right = correct, swipe left = still learning. Swipe triggers grade + card-off animation.
- **D-12:** After grading, current card swipes off screen and next card animates forward from the stack — physical deck feel.

### Card stack visual (progress indicator replacement)
- **D-13:** No progress bar or card counter. Instead, a physical card stack is always visible behind the active card (offset card edges). Max 3 visible layers regardless of total remaining. As cards are studied, the stack visually thins — when 3 or fewer cards remain, the user can count the exact remaining cards by the visible edges.

### Mastery progression (spaced repetition)
- **D-14:** Mastery requires correct recalls in BOTH directions across 3 timed rounds:
  - **Round 1:** 2 correct native→target + 2 correct target→native
  - **12-hour cooldown** — card doesn't appear until 12h have passed
  - **Round 2:** 1 correct in each direction
  - **24-hour cooldown** — card doesn't appear until 24h have passed
  - **Round 3:** 1 correct in each direction → LEARNED
  - Total: 8 correct recalls minimum (4 + 2 + 2), spread across at least 3 sessions with time gaps.
- **D-15:** Progress dots in the card list show mastery stage (e.g., ●●○ = 2/3 rounds done).

### Resurface behavior
- **D-16:** When a resurfaced learned card is graded "still learning," it stays at its current mastery level but gets added back into the current session for another try. No penalty, no reset.
- **D-17:** Resurface cards look identical to regular cards — no visual distinction.
- **D-18:** Resurface cards are interleaved at regular intervals: roughly 1 resurface card every 3-4 new/in-progress cards (not clustered at start or end).

### Session end screen
- **D-19:** Tiger emoji placeholder (🐯) — always happy, always proud the user studied. No performance-based reactions. Will be replaced by real PixiJS tiger in Phase 5.
- **D-20:** Core stats only: cards studied, correct %, cards newly learned this session.
- **D-21:** Single "Back to deck" button — returns to the card list.

### Claude's Discretion
- Schema approach for tracking directional mastery (compute-on-read via recall_events with direction field vs. expanded card columns — Claude picks based on compute-on-read architecture)
- Exact swipe gesture implementation (library choice, threshold, animation spring config)
- Card stack visual implementation details (CSS offset, shadow, perspective)
- 3D flip animation timing and easing
- Grade button delay (300ms per roadmap) adapted for swipe-only UX
- End screen layout and tiger emoji sizing
- Exact countdown timer format and refresh interval for the "no due cards" state

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Study — STUDY-01 through STUDY-06 define the full scope

### Schema
- `src/db/schema.ts` — Current schema with `cards` table (recallCount, lastStudiedAt) and `recall_events` table (cardId, correct, createdAt). Schema changes will be needed to support directional tracking.

### Architecture decisions
- `.planning/research/SUMMARY.md` §Recommended Stack — Compute-on-read architecture, client-local session state via `useReducer`, single batch POST to `/api/study/complete`

### Prior phase patterns
- `.planning/phases/01-foundation/01-CONTEXT.md` — Inline error convention, env var discipline, warm/friendly tone
- `.planning/phases/02-deck-and-card-management/02-CONTEXT.md` — shadcn component patterns, deck model, card CRUD patterns

### Project instructions
- `CLAUDE.md` and `AGENTS.md` — Next.js version has breaking changes; read `node_modules/next/dist/docs/` before writing code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/` — shadcn Button, Input, Card, Dialog components
- `src/components/deck-view.tsx` — Deck view client component (Study button entry point)
- `src/components/card-list.tsx` — Card list component (will need progress dots added)
- `src/lib/deck-queries.ts` — Server-side data fetchers for decks and cards
- `src/lib/deck-actions.ts` — Server actions for card CRUD (pattern for study actions)

### Established Patterns
- Server actions for mutations (`src/lib/deck-actions.ts`)
- Server Component data fetchers without `'use server'` (`src/lib/deck-queries.ts`)
- Branded types for IDs (`UserId`, `DeckId`, `CardId`, `RecallEventId`)
- Protected route layout at `src/app/(protected)/layout.tsx`
- Zod-validated env vars via `src/env.ts`

### Integration Points
- `src/app/(protected)/` — Study route will be added here (e.g., `study/page.tsx`)
- `src/db/schema.ts` — May need `direction` column on recall_events or new approach
- `src/components/deck-view.tsx` — Study button with disabled state + countdown timer
- `src/components/card-list.tsx` — Progress dots per card row
- `habitat_metadata.lastActivityAt` — Should be updated when a study session completes (for Phase 4 decay calculations)

</code_context>

<specifics>
## Specific Ideas

- Physical card-deck metaphor: the stack of offset card edges behind the active card creates a tangible sense of progress without numbers
- Swipe-only interaction (no buttons) for a tactile, mobile-friendly experience
- The tiger is always happy on the end screen — he's a supportive companion, not a judge
- Directional progression (native→target first, then target→native, then mixed) creates a natural learning arc per card
- The disabled Study button with countdown timer ("Next cards in 4h 23m") creates anticipation and makes the spaced repetition feel intentional

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-study-engine-and-study-ui*
*Context gathered: 2026-03-27*
