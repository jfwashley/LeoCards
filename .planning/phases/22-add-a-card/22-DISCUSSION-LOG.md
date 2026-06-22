# Phase 22: Add a Card - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-22
**Phase:** 22-add-a-card
**Areas discussed:** Pair orientation, Deck picker reuse, Extraction Cancel, Stepper navigation

---

## Pair orientation (image "Check translations" rows)

| Option | Description | Selected |
|--------|-------------|----------|
| Target-on-top (mock) | Follow the mock — ES (target, extracted) on top, EN (native) beneath in the image Check step ONLY; type-a-word stays native-first. Coherent rule "lead with the source field"; documented exception to D-04. | ✓ |
| Native-on-top everywhere | Extend Phase 21 D-04's native-on-top app-wide, overriding the mock in the image Check rows too. Max cross-app consistency. | |

**User's choice:** Target-on-top (mock).
**Notes:** Captured as **D-01** — intentional mixed orientation; the UI auditor must not "correct" either the image pairs (target-on-top) or the type fields (native-on-top).

---

## Deck picker reuse (image Confirm step)

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width field (mock) | Render DeckSwitcher's trigger as the mock's full-width "Add words to" field row, reusing the Phase 21 popover internals incl. inline new-deck create. | ✓ |
| Reuse compact pill as-is | Drop in Phase 21's compact "ES ▾" pill popover unchanged. Least work; looks out of place full-screen. | |

**User's choice:** Full-width field (mock).
**Notes:** Captured as **D-02**. New-deck creation works here (ADC-01 requirement) regardless of trigger style; only the trigger presentation changes from pill to full-width row.

---

## Extraction Cancel

| Option | Description | Selected |
|--------|-------------|----------|
| Real abort | Wire a working AbortController-to-button cancel that aborts the in-flight AI call, preserving image + deck. Fully satisfies ADC-03 "cancelable" but is a deliberate behavior touch. | |
| Restyle wait only | Restyle the wait screens; Cancel navigates back without aborting. Cheapest, keeps the pipeline untouched. | ✓ |

**User's choice:** Restyle wait only — with a follow-up to pin the exact Cancel semantics.

### Follow-up — what Cancel does mid-extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Back + ignore result | Return to Confirm (image + deck preserved) + a one-line `cancelled` ref guard to ignore a late extraction result (same pattern review-list.tsx uses for translate-cancel). No AbortController, no new request logic. | ✓ |
| Pure navigate-back | Navigate back with no guard — risks the user being yanked into Review if extraction resolves after Cancel (latent bug). | |
| Actually wire the abort | Change course and wire the real AbortController cancel after all. | |

**User's choice:** Back + ignore result.
**Notes:** Captured as **D-03** — restyle-only + the one-line late-result guard; the 35s-timeout AbortController is NOT wired to the button and no `EXTRACT_CANCEL` network logic is added.

---

## Stepper navigation / escape

| Option | Description | Selected |
|--------|-------------|----------|
| Match the mock | Pick keeps the toggle + "‹ My deck"; from Confirm on, the 5-dot stepper with Back = prev step, Re-pick = dropzone, Cancel = safe exit to My deck. No persistent My-deck link mid-stepper. | ✓ |
| Persistent "My deck" link | Keep a "‹ My deck" escape on every stepper step in addition to Back/Cancel. Adds chrome the mock doesn't show; duplicates Cancel's destination. | |

**User's choice:** Match the mock.
**Notes:** Captured as **D-04**. The 5-dot-stepper-vs-"six-step" reconciliation is captured as **D-05** (Pick is pre-stepper; Pick+Confirm = "Image" dot, Result = "Add" dot).

---

## Claude's Discretion

- Exact Daybreak token values, spacing, radii, prop shapes, file layout, and whether new atoms become shared `daybreak/*` primitives or page-local components.
- The type-a-word "saved — add another" rhythm realization (banner + reset + focus return).
- Pick → stepper as in-page conditional render vs route change (preserve single-page `/deck/new-card`).
- Drop-zone responsive treatment + precise result-screen partial/all-failed copy mapping.

## Deferred Ideas

- **True abort-the-AI-call extraction Cancel** — declined this phase in favour of D-03's restyle-only + late-result guard.
- **Mock "under 10 MB" vs real 5 MB enforcement** (D-06 uses the real 5 MB) — flagged for the team as a non-Daybreak logic decision if 10 MB is the actual intent.
- Live camera capture / multi-image batch upload — already project-level Out of Scope (IMG-F1/IMG-F2).

---

*Auto-resolved during discussion (not asked):* 5-dot stepper model (D-05), 5 MB file-size copy (D-06), "From an image" label + e2e audit (D-07), and the L-01/L-02/L-06 carry-forward locks.
