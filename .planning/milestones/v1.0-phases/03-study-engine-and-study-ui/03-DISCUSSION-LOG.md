# Phase 3: Study Engine and Study UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 03-study-engine-and-study-ui
**Areas discussed:** Session flow, Card interaction, Resurface & mastery, Session end screen

---

## Session Flow

| Option | Description | Selected |
|--------|-------------|----------|
| From active deck | User taps 'Study' on their current deck — session pulls cards from that one deck only | ✓ |
| Pick a deck first | Study button opens a deck picker, then starts the session for the chosen deck | |
| All decks combined | Study pulls cards from ALL decks across all languages into one mixed session | |

**User's choice:** From active deck
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 10 cards | Always 10 cards per session | |
| Fixed 20 cards | Always 20 cards | |
| User chooses (10/20/all) | Let the user pick session size before starting | |

**User's choice:** All unlearned cards (custom)
**Notes:** Session includes all cards that haven't been learned yet, no fixed cap.

---

| Option | Description | Selected |
|--------|-------------|----------|
| End + summary | Session ends, show summary | |
| Offer restart | Show summary, then offer to restudy wrong cards | |
| Auto-loop wrong cards | After one pass, automatically loop back to 'still learning' cards until user quits | ✓ |

**User's choice:** Auto-loop wrong cards
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Quit + save progress | User can quit anytime, all grades saved | ✓ |
| Quit + discard | Nothing saved until full session completion | |
| You decide | Claude picks | |

**User's choice:** Quit + save progress
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Shuffled each time | Random order every session | |
| Oldest first | Least recently studied appear first | |
| You decide | Claude picks | |

**User's choice:** Newest first (custom)
**Notes:** Most recently added cards appear first in the session.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard header area | Prominent button near the deck switcher | |
| Inside deck view | Button within the card list view | ✓ |
| Both | Study button in header AND deck view | |

**User's choice:** Inside deck view
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /study route | Full-screen study experience | ✓ |
| Inline on deck page | Study mode takes over the deck view area | |
| You decide | Claude picks | |

**User's choice:** Dedicated /study route
**Notes:** None

---

## Card Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Native language (front) | Show native word, recall target | |
| Target language (back) | Show foreign word, recall meaning | |
| Random per card | Randomly show either side | |

**User's choice:** Directional progression (custom)
**Notes:** Stage 1: native→target. Stage 2: once correct, target→native. Stage 3: once both correct, random mix.

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3 total across both | 3 correct recalls total = learned | |
| 2 per direction | 2 correct per direction = learned | |
| You decide | Claude designs threshold | |

**User's choice:** Spaced mastery system (custom)
**Notes:** Round 1: 2 correct each direction. 12h cooldown. Round 2: 1 each direction. 24h cooldown. Round 3: 1 each direction = LEARNED.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Progress dots | Small dots showing mastery stage | ✓ |
| Color coding | Card row background changes with progress | |
| Text label | 'New', 'In progress', 'Learned' text | |
| You decide | Claude designs indicator | |

**User's choice:** Progress dots
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3D flip animation | Card physically flips with 3D rotation | ✓ |
| Slide reveal | Answer slides up or fades in | |
| Tap to reveal | Answer appears instantly | |

**User's choice:** 3D flip animation
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Binary: Correct / Still learning | Two buttons only | ✓ |
| Three-way: Easy / Hard / Wrong | Three tiers | |
| You decide | Claude picks | |

**User's choice:** Binary: Correct / Still learning
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Top progress bar | Thin bar showing progress | |
| Card counter text | Simple '5 of 23' text | |
| Both | Bar and counter | |

**User's choice:** No explicit progress indicator (custom)
**Notes:** Physical card stack metaphor — visible card edges behind active card. When 3 or fewer remain, user can count by visible edges.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Always show stack | Stack of offset edges always visible, max 3 layers | ✓ |
| Fade stack in at 3 | Stack edges only appear at 3 or fewer cards | |
| You decide | Claude designs | |

**User's choice:** Always show stack
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Swipe off + new from stack | Current card swipes off, next animates from stack | ✓ |
| Instant swap | No transition | |
| You decide | Claude picks | |

**User's choice:** Swipe off + new card from stack
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Buttons only | Tap buttons to grade | |
| Swipe + buttons | Swipe with button fallback | |
| You decide | Claude picks | |

**User's choice:** Swipe only (custom)
**Notes:** No buttons at all. Swipe right = correct, swipe left = still learning. Swipe triggers grade + animation.

---

## Resurface & Mastery

| Option | Description | Selected |
|--------|-------------|----------|
| Full reset | Reset recall count to 0 | |
| Drop one round | Drop back one round in progression | |
| Just re-add to queue | Stay at current level, re-add to current session | ✓ |

**User's choice:** Just re-add to queue
**Notes:** No penalty for failed resurface — card just comes back in the current session.

---

| Option | Description | Selected |
|--------|-------------|----------|
| No distinction | Resurface cards look identical | ✓ |
| Subtle indicator | Small badge or icon | |
| Different card color | Different background tint | |

**User's choice:** No distinction
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Randomly scattered | Random placement throughout | |
| At the end | All resurface cards after new cards | |
| You decide | Claude picks | |

**User's choice:** Interleaved at regular intervals (custom)
**Notes:** 1 resurface card every 3-4 new/in-progress cards.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Disabled + timer | Button grayed out with countdown | ✓ |
| Always available | Let user review learned cards anyway | |
| Disabled, no timer | Disabled with simple message | |

**User's choice:** Disabled + timer
**Notes:** "Next cards in Xh Ym" countdown creates anticipation.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Expand card columns | Add direction-specific columns to cards table | |
| Use recall_events only | Compute everything from recall_events (compute-on-read) | |
| You decide | Claude picks based on architecture | ✓ |

**User's choice:** You decide
**Notes:** Claude to pick based on compute-on-read architecture decision.

---

## Session End Screen

| Option | Description | Selected |
|--------|-------------|----------|
| Stats + encouragement | Stats plus warm message | |
| Stats only | Clean stats, no fluff | |
| Tiger reaction | Tiger emoji reacting to session, plus stats | ✓ |

**User's choice:** Tiger reaction
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Core stats | Cards studied, correct %, newly learned | ✓ |
| Core + totals | Core stats plus total progress | |
| You decide | Claude picks | |

**User's choice:** Core stats
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Back to deck | Single button, returns to card list | ✓ |
| Back to deck + Study again | Two buttons | |
| You decide | Claude picks | |

**User's choice:** Back to deck
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Tiger emoji placeholder | 🐯 always happy, replaced by real tiger in Phase 5 | ✓ |
| No habitat reference | Purely stats for now | |
| Text teaser | 'Your tiger felt that!' copy | |

**User's choice:** Tiger emoji placeholder
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3 tiers | 😻 great / 🐯 okay / 😿 poor | |
| 2 tiers | 😻 happy / 😿 sad | |
| You decide | Claude picks | |

**User's choice:** No performance-based reactions (custom)
**Notes:** Tiger is always happy regardless of session performance. Supportive companion, not a judge.

---

## Claude's Discretion

- Schema approach for directional mastery tracking (compute-on-read via recall_events vs. expanded card columns)
- Swipe gesture implementation details (library, threshold, spring config)
- Card stack visual CSS implementation
- 3D flip animation timing
- End screen layout details

## Deferred Ideas

None — discussion stayed within phase scope.
