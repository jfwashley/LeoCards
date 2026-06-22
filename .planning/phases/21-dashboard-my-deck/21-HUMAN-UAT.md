---
status: partial
phase: 21-dashboard-my-deck
source: [21-VERIFICATION.md]
started: "2026-06-22T09:30:00Z"
updated: "2026-06-22T09:30:00Z"
---

## Current Test

[awaiting human testing — open the app, sign in, and walk the dashboard]

## Tests

### 1. Persistent header — Daybreak fidelity (DSH-01 / D-01, L-01)
expected: Header shows the LionFace + "LeoCards" wordmark (no 🐯) and a compact deck pill with the active-language LangChip. Opening the deck picker popover shows other decks + a "+ New deck" row with a per-language picker; creating a deck shows per-language creating/error states. Logout is an icon-only glyph (aria-label "Sign out"). Matches `design/handoff-daybreak/daybreak-dashboard.jsx` TopBar.
result: [pending]

### 2. Habitat hero medallion — states (DSH-02 / D-05, D-06)
expected: Leo on a sunrise disc with a conic progress ring + level badge, "Habitat · Level N", "X of Y cards to Level N+1", "View habitat →". At max level (L9): gold ring/badge, "Course 1 complete", no next-level line. During cooldown/resting: napping Leo over the REAL progress ring (ring not zeroed/greyed); the countdown appears only in the action-line status row.
result: [pending]

### 3. Action line — four-state rendering (DSH-03 / L-05)
expected: Amber "Start studying" when cards are due; dimmed when none due. Status row cycles "12 due" / "0 due" / "Resting · 2h 15m" countdown / "All paused". "Add a card" present. "Browse words" is GONE from the populated action line (still present in the empty-deck state). The "N due" count is accurate (not inflated by already-learned cards — M-01 fix).
result: [pending]

### 4. "Your words" rows — Daybreak styling (DSH-04, DSH-05 / D-03, D-04)
expected: "Your words" expands inline (height/opacity, not a swipe). Rows show **native bold on top / target beneath** (the intentional D-04 override of the mock's target-on-top), source tag (Curated / Added by you / Paused), a 3-bar mastery meter (green + check at 3/3), and pause+edit icons. Paused rows are de-emphasised (reduced opacity). Search inside the accordion shows a no-results state.
result: [pending]

### 5. Edit-card modal — Daybreak styling (DSH-06) + L-03 nit
expected: Edit modal uses the Daybreak surface (TField/TBtn). Save/Discard work; Delete shows a confirmation ("Delete this card?" / "can't be undone" / "Keep card") and a save/delete error state renders. L-03 check: the delete-confirm button currently renders as an amber (primary) TBtn rather than red/destructive — confirm whether that's acceptable UX or should be changed to a destructive style.
result: [pending]

### 6. All seven DSH-07 states render in Daybreak (DSH-07)
expected: Walk each state end-to-end in a running instance and confirm Daybreak styling: cards-due, none-due, resting (cooldown), all-paused, empty deck, brand-new-user first-visit (= empty-deck), and search-active-no-results.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
