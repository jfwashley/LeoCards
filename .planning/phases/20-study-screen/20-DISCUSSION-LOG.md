# Phase 20: Study Screen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-20
**Phase:** 20-study-screen
**Areas discussed:** Card & ghost-peek stack, Progress indicator, End screen & level-up, Motion & reduced-motion

---

## Card & ghost-peek stack

| Option | Description | Selected |
|--------|-------------|----------|
| Count-aware ghost-peek | Adopt the Daybreak GhostPeek look from the login cards AND keep today's count-aware behavior (up to 3 edges, thinning toward the end). | ✓ |
| Decorative ghost-peek, no count | Pure visual flourish matching login exactly; drop the remaining-cards hint. | |
| Keep count cue, lighter restyle | Keep the current count-aware stack; just re-skin to Daybreak tokens. | |

**User's choice:** Count-aware ghost-peek (Recommended).
**Notes:** This stack becomes the sole "cards remaining" cue (see Progress indicator → declined). → D-01. Card surface + swipe palette captured as D-02.

---

## Progress indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Slim progress bar, top bar | Thin Daybreak amber bar; honest under requeue if it tracks unique cards cleared ÷ total due. | |
| Numeric counter ('4 of 12') | Explicit count; awkward under the requeue (denominator grows mid-session). | |
| No explicit indicator | Let the count-aware ghost-peek stack be the only remaining-cards cue. | ✓ |

**User's choice:** No explicit indicator.
**Notes:** Declines the brief's one sanctioned new addition. Keeps the screen calm and sidesteps the misleading-denominator problem. → D-03.

---

## End screen & level-up

### End screen (STU-02)

| Option | Description | Selected |
|--------|-------------|----------|
| LionFace mark + restyled stats | Replace 🐯 with the Daybreak LionFace; restyle the three stats + "Back to deck". "learned" stays the amber hero number. Contained scope. | ✓ |
| Mini-habitat teaser scene | Lightweight Daybreak habitat teaser above the stats (Phase 19 welcome-preview pattern). Warmer payoff; more build. | |
| Minimal restyle | Daybreak tokens on the current layout; swap 🐯→LionFace; no new composition. | |

**User's choice:** LionFace mark + restyled stats (Recommended). → D-04.

### Level-up depth

| Option | Description | Selected |
|--------|-------------|----------|
| Daybreak restyle of confetti overlay | Recolor confetti to Daybreak, Leo + amber type, keep "Your habitat grew!" beat. | |
| Bring in habitat (Soft-Clay) art | Use the /habitat Soft-Clay look in the celebration — richest moment in the app. | ✓ |
| Light restyle only | Minimal token restyle of the existing overlay. | |

**User's choice:** Bring in habitat (Soft-Clay) art — invest the richness in the rarest, most celebratory moment.

### Habitat-art form (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Static Soft-Clay poster of new level | Show the new level's pre-rendered poster; lightweight, reuses assets. | |
| Animated habitat clip of new level | Play the ambient clip; ~1.3 MB load + Phase 24 overlap. | |
| Soft-Clay Leo only (not full scene) | A Soft-Clay-styled Leo celebrating; richer than flat LionFace, lighter than full scene/clip. | ✓ |

**User's choice:** Soft-Clay Leo only. → D-05. Source via `.planning/design/habitat-art-assets.md`; no clips/live render in the study flow.

---

## Motion & reduced-motion

| Option | Description | Selected |
|--------|-------------|----------|
| Full reduced-motion support this phase | Reduced-motion variants for flip (crossfade), swipe (calm/instant), and no confetti. | |
| Partial — confetti only | Gate just the confetti behind prefers-reduced-motion; leave flip/swipe as-is. | ✓ |
| Defer to a later a11y pass | Skip reduced-motion this phase entirely. | |

**User's choice:** Partial — confetti only. → D-06. Flip/swipe reduced-motion variants deferred to a later a11y pass.

---

## Claude's Discretion

- Top bar / session chrome restyle ("Study session" label, quit button, quit-confirm popover) — Daybreak, no progress/deck-name addition.
- "Saving your progress…" transition + save-error/"Retry" state — Daybreak restyle (optional light Leo touch).
- Exact token values, spacing, prop shapes, file layout — from the Daybreak system + existing primitives.
- Confetti recolor palette + Soft-Clay Leo placement/size in the overlay.
- Whether the ghost-peek reuses the `GhostPeek` atom directly or a study-specific adaptation.

## Deferred Ideas

- Reduced-motion variants for the card flip (crossfade) + swipe (calm/instant) — later a11y pass.
- Mini-habitat teaser scene on the end screen — considered, declined (keep contained); revisit with Phase 24.
- Explicit session progress indicator — considered, declined (D-03).
- Animated habitat clip / full habitat scene in level-up — declined (scope/perf, Phase 24); D-05 uses Soft-Clay Leo only.
- ⚠ Flag for the team (not Phase 20): `study-session.tsx` checks `leveledUp === 10` but the habitat caps at L9 — max-level celebration branch appears dead. Logic fix, out of this presentation phase's scope.
