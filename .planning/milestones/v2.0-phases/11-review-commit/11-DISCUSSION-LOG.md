# Phase 11: Review & Commit - Discussion Log

> **Audit trail only.** Decisions are in CONTEXT.md — this log preserves alternatives considered.

**Date:** 2026-05-19
**Phase:** 11-review-commit
**Areas discussed:** Review UI & flow placement, Translation timing & cost, Translation direction & edit, Commit/dedupe & cancel

---

## Review UI & flow placement

| Question | Options | Choice |
|----------|---------|--------|
| Where does review UI live? | New in-page step · **Separate component same page** · Separate route | Separate `<ReviewList>` component rendered on EXTRACT_SUCCESS |
| Per-row model? | **Checkbox keep + inline-edit + remove** · Keep/discard buttons | Checkbox(kept default)+inline-edit+X+select-all/none |
| Default kept + empty? | **All pre-kept; block confirm if none** · All pre-discarded | All pre-kept; Confirm disabled if none + way back |

## Translation timing & cost

| Question | Options | Choice |
|----------|---------|--------|
| When translate? | On-confirm · Batch-upfront · Lazy · **(user custom)** | USER CUSTOM: translate only non-duplicates; duplicates → bottom "already learned" list, not translated/committed |
| Reconcile RVW-03 editable? | **Two-step prune→translate&edit** · Inline translate-on-keep | Two-step: Step A prune/edit new words → Step B translate kept + editable |
| Per-word xlate failure? | **Per-row error + manual fill, don't block** · Fail batch | Inline error + manual fill; never blocks batch |

## Translation direction & edit

| Question | Options | Choice |
|----------|---------|--------|
| Direction? | **target→native (extracted=back)** · extracted as native | target→native; extracted=back, translate→front |
| Editable fields Step B? | **Both native & target** · Only translation | Both editable (manual-add parity, RVW-03) |
| Native lang source? | **Existing nativeLanguage setting** · Ask/derive | getUserNativeLanguage (existing pattern) |
| Card source value? | **Add "image"** · Reuse "manual" | Add "image" to source union (no DB migration — free text) |

## Commit, dedupe & cancel

| Question | Options | Choice |
|----------|---------|--------|
| Dup match key? | **Same-language decks, normalized target** · All decks · By native | Extracted word vs `back` in same-language decks, case-insensitive+trimmed |
| Commit/partial-failure? | **Sequential continue-on-failure, report** · Stop on first | Sequential saveCard, continue-on-failure (Neon no-tx), collect outcomes |
| Summary + landing? | **Counts added/skipped/failed → go to deck** · Just "N added" | Full counts incl. already-learned + failed → navigate to deck |
| Cancel + override? | **Discard all, no writes, no confirm; dups NOT overridable** · Confirm + allow override | Cancel = discard, zero writes, no dialog; dups informational only |

## Claude's Discretion
- Component naming/decomposition, translate-helper-vs-inline-fetch (must reuse /api/translate), Step A→B state mechanics, dedupe query placement, loading/disabled affordances.

## Deferred Ideas
- Dup override (rejected), confirm-on-cancel (rejected), intra-batch lemmatization/dedup (future), bulk auto-retry (out of scope), list virtualization (unneeded — ~50 cap).
