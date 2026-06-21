# Phase 21: Dashboard — "My Deck" - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-21
**Phase:** 21-dashboard-my-deck
**Areas discussed:** Deck picker + create, Per-language stats, Your words list, Habitat medallion

---

## Deck picker + create-deck flow (DSH-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown from pill | Popover from the `ES ▾` pill → decks (full names + active check) + `+ New deck` expanding inline to language chips with per-language `creating…`/error. Closest to current `deck-switcher.tsx`, fits the compact header. | ✓ |
| Bottom sheet | Pill opens a Daybreak bottom sheet with deck list + create. Roomier/mobile-native, but a new component pattern. | |
| Restyle shadcn Select | Keep the Select, Daybreak-skin it; create chips stay inline beside the trigger. Least work, but chips overflow the 36px header. | |

**User's choice:** Dropdown from pill (Recommended)
**Notes:** Pill stays compact (LangChip code + chevron); full language names live inside the dropdown. Reuses the existing `createDeck` action + create/error logic. Flag emojis → text LangChip; header 🐯 → LionFace.

---

## Per-language "learned" stats (brief §3 vs mock)

| Option | Description | Selected |
|--------|-------------|----------|
| Drop — match the mock | No `My Deck` heading, no cross-language line. Active count shows in the "Your words" header. `getLanguageBreakdown` becomes unused. | ✓ |
| Keep only with 2+ decks | Single-deck users get the clean mock; multi-deck users see a cross-language line. Adds a state the designer didn't draw. | |
| Always keep the line | Re-add "Spanish: 14 · French: 6 learned" for everyone. Honours the brief but deviates from the mock for the common case. | |

**User's choice:** Drop — match the mock (Recommended)
**Notes:** Planner can drop the `getLanguageBreakdown` fetch from `page.tsx` and the prop through `DeckView`. Multi-deck motivation noted as a deferred idea.

---

## "Your words" list (DSH-04 / DSH-05) — two coupled questions

### Q1: Accordion default state

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsed by default | Matches the mock; hero + "Start studying" above the fold; tap to expand (height/opacity); search inside the open panel. | ✓ |
| Open by default | Show the list immediately like today. Familiar, but competes with the study CTA; diverges from the mock default. | |
| Remember last state | Persist open/closed via localStorage. Adds behaviour the mock doesn't specify. | |

**User's choice:** Collapsed by default (Recommended)

### Q2: Word-row primary line

| Option | Description | Selected |
|--------|-------------|----------|
| Target on top (follow handoff) | Bold target over muted native, per the mock's `CardRow`. The target language leads. Inverts today's native-first order. | |
| Keep native on top | Native word leads (today's order). Departs from the mock; adopt Daybreak styling but keep orientation. | ✓ |

**User's choice:** Keep native on top
**Notes:** ⚠ Deliberate override of the handoff's `CardRow` (which puts target on top). Internally consistent with the edit dialog ("Native word" first) and today's table. Flagged in CONTEXT (D-04) so the UI checker treats it as intended, not a defect. Daybreak row *styling* (source tag, 3-bar mastery, pause+edit icons) is still adopted.

---

## Habitat hero medallion (DSH-02) — two coupled questions

### Q1: Max-level reading (engine caps at L9; mock hardcodes ≥10)

| Option | Description | Selected |
|--------|-------------|----------|
| Gold + "Course 1 complete" | At L9: gold ring/badge, subtitle "Course 1 complete", hide the next-level line. Matches HAB-03. Retarget the mock's ≥10. | ✓ |
| Gold ring, keep a count | Gold ring at L9 but show "All cards learned" instead. Introduces copy not in the handoff/HAB-03. | |
| You decide the wording | Lock L9=max + gold now; leave exact copy to the planner. | |

**User's choice:** Gold + "Course 1 complete" (Recommended)

### Q2: Cooldown hero treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Nap the hero in cooldown | Greyed medallion (z, grey ring, dot badge) + "Your lion is napping · cards recharging" per the mock (which zeroes progress). | |
| Always show progress | Keep the live ring + level in every state; cooldown cue only in the status row. | |
| **Do both** (free-text) | Napping personality over a still-accurate progress ring + threshold line. | ✓ |

**User's choice:** "Do both" (free-text) → clarified to the default reading
**Notes:** Plain-text follow-up confirmed: during cooldown, Leo naps (dimmed + `z` + "recharging" cue) **but the conic ring keeps real progress and the "X of Y to Level N+1" line stays** — NOT the mock's fully-greyed zero-progress version. Countdown stays only in the action-line status ("Resting · 2h 15m"), not duplicated on the hero.

---

## Claude's Discretion

- Whether `HabitatMedallion` is a shared `daybreak/` primitive or dashboard-local (Phase 24 reuse not guaranteed).
- Edit-card modal (DSH-06) Daybreak restyle — behavior preserved (Save/Discard/Delete-with-confirm + errors); mock doesn't draw it.
- The accordion open-panel scroll/mask-fade treatment on a responsive page (mock's fade is a phone-shell artifact).
- Exact token values, spacing, prop shapes, file layout, and precise status-row copy mapping.

## Deferred Ideas

- Cross-language "learned" breakdown (dropped now; could return with 2+ decks).
- Bottom-sheet deck picker (declined for the dropdown).
- Remember-accordion-state via localStorage (declined; collapsed default).
- Account / Settings page (separate future milestone).
- ⚠ Team flag: the L9-vs-L10 legacy inconsistency (mock + `level-up-overlay` dead branch + habitat doc) — reconcile in a non-Daybreak logic ticket.
