# Phase 6: Milestone System and Dashboard Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 06-milestone-system-and-dashboard-polish
**Areas discussed:** Milestone thresholds & triggers, Unlock animation & celebration, Animal appearances in habitat, Dashboard language breakdown

---

## Milestone Thresholds & Triggers

**User's choice:** No separate milestone system — the existing level/progression system already serves this purpose.

**Notes:** User explicitly rejected a separate card-count threshold system (5/10/25/50/100). The 10-level habitat progression driven by learned cards + quality decay is the milestone system.

---

## Level-Up Celebrations (replaces Milestone System)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — celebrate level-ups | Level-ups trigger celebration + animal at select levels | ✓ |
| No celebrations at all | Levels change silently | |
| Just animals, no animation | Animals appear but no celebration overlay | |

**User's choice:** Yes — celebrate level-ups using existing progression system.

| Option | Description | Selected |
|--------|-------------|----------|
| 3 animals (levels 3, 6, 9) | Spaced out rewards | |
| 5 animals (every other level) | More frequent rewards | |
| Only one bird at level 10 | Other levels already have habitat layer rewards | ✓ |

**User's choice:** Only one bird at level 10. Levels 1-9 already reward with trees, mountains, logs, etc. via habitat layers.

---

## Unlock Animation & Celebration

| Option | Description | Selected |
|--------|-------------|----------|
| In-habitat sparkle burst + banner | Quick effect in canvas, 2-3s auto-dismiss | |
| Fullscreen overlay celebration | Modal with confetti, level number, tap to dismiss | ✓ |
| Toast notification only | Small corner toast | |

**User's choice:** Fullscreen overlay celebration

| Option | Description | Selected |
|--------|-------------|----------|
| After study session completes | Right after progress saves | ✓ |
| On next habitat visit | Delayed, more immersive | |
| On dashboard load | Immediate but less dramatic | |

**User's choice:** After study session completes

| Option | Description | Selected |
|--------|-------------|----------|
| Flies in from off-screen | Animated entrance, memorable | ✓ |
| Fades in | Simpler, still noticeable | |
| You decide | Claude picks | |

**User's choice:** Bird flies in from off-screen

---

## Dashboard Language Breakdown

| Option | Description | Selected |
|--------|-------------|----------|
| Simple text below deck header | "French: 23 learned · Spanish: 10 learned" | ✓ |
| Small stat cards per language | Visual cards with mini progress | |
| Inside the habitat widget | Below tiger area | |

**User's choice:** Simple text below deck header

| Option | Description | Selected |
|--------|-------------|----------|
| Only languages with learned cards | Cleaner, no zero-count entries | ✓ |
| All active decks | Shows 0-count to motivate | |
| You decide | Claude picks | |

**User's choice:** Only languages with learned cards

---

## Claude's Discretion

- Confetti/particle implementation approach
- Bird sprite design and positioning
- Query optimization for per-language counts
- Level-up detection logic

## Deferred Ideas

None — discussion stayed within phase scope
