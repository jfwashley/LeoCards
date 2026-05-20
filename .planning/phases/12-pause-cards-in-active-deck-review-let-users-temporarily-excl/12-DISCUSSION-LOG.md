# Phase 12 — Discussion Log

**Date:** 2026-05-20
**Mode:** `/gsd-discuss-phase 12` (default, single-question turns)

Human-reference audit trail of the discussion. Not consumed by downstream agents — they read `12-CONTEXT.md`.

---

## Gray Area Selection

**Prompt:** Which gray areas should we discuss for Phase 12?

**Options presented:**
1. Cadence-preservation semantics
2. State representation in schema
3. Pause UI location & affordance
4. Visibility & filtering of paused cards

**User selected:** All four.

---

## Area 1 — Cadence-preservation semantics

**Question:** When a card is unpaused, what happens to its `cooldownUntil` timestamp?

**Options:**
- (Recommended) Shift forward by pause duration
- Stay fixed — paused cards just hide
- Shift forward + bump `lastStudiedAt`

**User selected:** Shift forward by pause duration.

**Notes:** Matches the user's original goal statement verbatim — "the cadence will continue, and it will appear the same amount as it was going to appear." Did not also shift `lastStudiedAt` (option 3) — kept as minimal mutation; analytics can reconstruct gaps from `pausedAt` if ever needed.

---

## Area 2 — State representation in schema

**Question:** How should "paused" be stored on a card?

**Options:**
- (Recommended) Single `pausedAt timestamp` column on `cards`
- Boolean `isPaused` + separate `pausedAt`
- Separate `card_pauses` history table

**User selected:** Single `pausedAt timestamp` column.

**Notes:** Encoded "paused" and "since when" in one nullable column. The `since when` value is exactly what the cadence-shift math (Area 1) needs, so the two decisions reinforce each other. Migration is a single column add with default NULL; no backfill.

---

## Area 3 — Pause UI location & affordance

**Question:** How does a user pause a card on the deck review screen?

**Options:**
- (Recommended) Inline pause/play icon on every CardList row
- Per-card overflow menu (⋮ → Pause)
- Select-mode with bulk pause action
- Inline icon + bulk via long-press

**User selected:** Inline pause/play icon on every CardList row.

**Notes:** Bulk operations explicitly deferred. Discoverability prioritized over visual minimalism. Planner picks exact placement, tooltip copy, and a11y semantics.

---

## Area 4 — Visibility & filtering of paused cards

**Question:** How visible are paused cards in the deck list, and how do they affect dashboard counts?

**Options:**
- (Recommended) Visible inline, greyed out + dashboard "due" excludes them
- Hidden behind a "Show paused (N)" toggle
- Separate "Paused" tab/section below active cards
- Visible greyed out, but paused still count in dashboard "due"

**User selected:** Visible inline, greyed out + dashboard "due" excludes them.

**Notes:** Two semantic consequences:
1. `assembleSession()` must filter paused cards out.
2. `earliestCooldownEnd()` (dashboard countdown) must ignore paused cards.

If every card in a deck is paused, the dashboard should say something like "Unpause a card to study" rather than showing a far-future countdown. Exact copy is a planner detail.

---

## Deferred Ideas

Captured but explicitly **out of scope** for Phase 12. Already documented in `12-CONTEXT.md` under "Deferred Ideas":

- Mid-session pause (study screen)
- Bulk pause / select-mode
- Pause history / analytics
- Auto-unpause after N days
- Pausing entire decks ("vacation mode")

---

## Scope Creep — None

User did not raise any out-of-scope capabilities during the discussion. The four gray areas all clarified HOW to implement the phase as scoped.

---

## Claude's Discretion

These were settled by Claude without asking the user, on the basis that they are implementation details rather than vision choices:

- `lastStudiedAt` is NOT mutated on unpause (Area 1).
- Pause/unpause is two distinct endpoints (`/api/cards/[id]/pause`, `/.../unpause`) — single-card, idempotent, mirroring the auth/ownership/rate-limit pattern of `src/app/api/study/complete/route.ts`.
- Test surface includes unit tests on cooldown-shift math + Playwright E2E + integration test on `assembleSession`.
- Icon library is `lucide-react` (already in deps).
