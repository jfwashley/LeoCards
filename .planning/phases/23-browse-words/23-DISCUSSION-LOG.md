# Phase 23: Browse Words - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-23
**Phase:** 23-browse-words
**Areas discussed:** Routing & back-nav, Row + language pair, Dashboard entry, Loading & error rows

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Routing & back-nav | Route vs in-page state for the locked two-screen tiles→list IA | ✓ |
| Row + language pair | Word-row orientation; generalize the mock's hardcoded EN→ES across 6 pairs | ✓ |
| Dashboard entry | Browse currently only reachable from the empty-deck state | ✓ |
| Loading & error rows | How the circular toggle shows saving/failed (not drawn in the mock) | ✓ |

**User's choice:** All four.
**Notes:** Tiles IA itself was presented as already locked by the mock ("Option 2") — not offered for re-litigation.

---

## Routing & back-nav

| Option | Description | Selected |
|--------|-------------|----------|
| Route via `?topic=` param | One `/deck/browse` route; no param = tiles, `?topic=Food` = list. Server-rendered, deep-linkable, browser-back returns list→tiles. | ✓ |
| In-page state (Phase 22 style) | `selectedTopic` useState on one route; simplest, but browser-back exits to dashboard and no deep-links. | |
| Route via `/[topic]` path | Clean URLs (`/deck/browse/food-drink`); needs a slug↔category map + new route folder. | |

**User's choice:** Route via `?topic=` param.
**Notes:** Recommended option. The list→landing back ("‹ Topics") is unchanged from the mock; CEFR level stays in-page state (defaults to All per topic), not a URL param.

---

## Row + language pair

| Option | Description | Selected |
|--------|-------------|----------|
| Native top, target marker beneath | Native term bold on top (no chip); target term + target-code chip beneath; context line/deck name from the real active pair. Consistent with Phase 21 D-04. | ✓ |
| Target on top (mock literal) | Learning-language word first as drawn for EN→ES — contradicts D-04 and mis-anchors for non-English natives. | |
| Keep two-column layout | Today's native | target side-by-side columns instead of stacked Row A. | |

**User's choice:** Native top, target marker beneath.
**Notes:** Recommended option. Generalizes the mock's hardcoded "EN"/"ES"/"Spanish deck" placeholders to the real native→target pair (all 6 supported).

---

## Dashboard entry

| Option | Description | Selected |
|--------|-------------|----------|
| Defer / flag it | Keep Phase 23 a clean re-skin; flag a follow-up to restore a populated-deck entry on the dashboard. | |
| Fold a small entry in | Add a low-key "Browse words" entry for populated decks (e.g., in the "Your words" accordion header). | |
| Empty-deck-only is intended | Confirm empty-deck-only entry is by design; no change. | |
| Other (free text) | — | ✓ |

**User's choice:** *Other* — "It should be on the Add a Card screen on the top right hand corner."

**Follow-up (plain-text):** Confirmed the link lives on the **Add-a-Card landing header only** (not during the image stepper), and that **Browse's landing back-link should route back to Add a Card** (not "‹ My deck").

| Follow-up option | Description | Selected |
|------------------|-------------|----------|
| "‹ My deck" → Dashboard (mock) | Keep the mock's landing back-link. | |
| "‹ Add a card" → Add-a-Card screen | Override the mock; return to where the user came from. | ✓ |

**Notes:** Resolved as D-03 (entry link top-right of the Add-a-Card landing header) + D-04 (Browse landing back-link → "‹ Add a card", a deliberate mock override). Dashboard action line unchanged; empty-deck "Browse words" entry preserved.

---

## Loading & error rows

| Option | Description | Selected |
|--------|-------------|----------|
| Spinner-in-toggle + inline error | Amber spinner in the circle while saving; revert + "Failed. Try again." inline in reserved space (no layout shift, 3s clear). | ✓ |
| Optimistic-only, minimal cue | Toggle flips instantly; faint opacity/pulse for in-flight; brief inline red note on error. | |
| Planner's discretion | Preserve current behavior, restyle to Daybreak; leave exact placement to implementation. | |

**User's choice:** Spinner-in-toggle + inline error.
**Notes:** Recommended option. Honors BRW-03's hard "never loses scroll position" requirement; preserves the existing optimistic + `useTransition` + 3s-auto-clear behavior.

---

## Claude's Discretion

- Exact Daybreak token values, spacing, radii, prop shapes, file layout, and component decomposition (pull from the system + `daybreak-browse.jsx` atoms).
- Whether the tiles→list route transition is animated; responsive grid behavior beyond the mock's fixed 3-col phone shell.
- Whether `TopicIcon`/medallion and the word Row become shared `daybreak/*` primitives or Browse-local components.
- The list scroll/overflow treatment (mock's mask-fade is a phone-shell artifact).

## Deferred Ideas

- Context-aware Browse back-link (`?from=` referrer routing) — declined for simplicity.
- Restoring a "Browse words" entry on the populated dashboard action line — not done; entry lives on Add-a-Card instead.
- ⚠ Mock-vs-reality flag: hardcoded per-topic counts (12/20/11…) and EN→ES / "Spanish deck" strings are placeholders → real per-pair data (D-05/D-07).
- Topic icons as final commissioned/icon-library art (ship CSS placeholders now, per PROJECT.md).
