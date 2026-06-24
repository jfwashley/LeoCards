---
status: partial
phase: 21-dashboard-my-deck
source: [21-VERIFICATION.md]
started: "2026-06-22T09:30:00Z"
updated: "2026-06-24T00:00:00Z"
---

## Current Test

[awaiting human testing — accordion rows, edit modal, and multi-state walks below]

## Tests

### 1. Persistent header — Daybreak fidelity (DSH-01 / D-01, L-01)
expected: Header shows the LionFace + "LeoCards" wordmark (no 🐯) and a compact deck pill with the active-language LangChip. Opening the deck picker popover shows other decks + a "+ New deck" row with a per-language picker; creating a deck shows per-language creating/error states. Logout is an icon-only glyph (aria-label "Sign out"). Matches `design/handoff-daybreak/daybreak-dashboard.jsx` TopBar.
result: pass
note: Verified via screenshot (2026-06-24). LionFace + "LeoCards" wordmark, "FR" deck pill, icon-only sign-out glyph all present. Deck-picker popover create flow not exercised (manual).

### 2. Habitat hero medallion — states (DSH-02 / D-05, D-06)
expected: Leo on a sunrise disc with a conic progress ring + level badge, "Habitat · Level N", "X of Y cards to Level N+1", "View habitat →". At max level (L9): gold ring/badge, "Course 1 complete", no next-level line. During cooldown/resting: napping Leo over the REAL progress ring (ring not zeroed/greyed); the countdown appears only in the action-line status row.
result: pass
note: Default state verified — Leo on sunrise disc + level-1 badge, "Habitat · Level 1", "0 of 5 cards to Level 2", "View habitat →". Max-level (L9) and cooldown/resting medallion variants not exercised on the dashboard (the L9 "Course 1 complete" copy was confirmed on the /habitat progress card in 24).

### 3. Action line — four-state rendering (DSH-03 / L-05)
expected: Amber "Start studying" when cards are due; dimmed when none due. Status row cycles "12 due" / "0 due" / "Resting · 2h 15m" countdown / "All paused". "Add a card" present. "Browse words" is GONE from the populated action line (still present in the empty-deck state). The "N due" count is accurate (not inflated by already-learned cards — M-01 fix).
result: pass
note: Due-state verified — amber "Start studying", "5 due" status row, "Add a card" present, and "Browse words" correctly ABSENT from the populated action line (it appeared only in the empty-deck state). none-due / resting / all-paused variants not exercised (manual).

### 4. "Your words" rows — Daybreak styling (DSH-04, DSH-05 / D-03, D-04)
expected: "Your words" expands inline (height/opacity, not a swipe). Rows show **native bold on top / target beneath** (the intentional D-04 override of the mock's target-on-top), source tag (Curated / Added by you / Paused), a 3-bar mastery meter (green + check at 3/3), and pause+edit icons. Paused rows are de-emphasised (reduced opacity). Search inside the accordion shows a no-results state.
result: [pending]
note: The collapsed "Your words / 0 learned" accordion was confirmed present, but it was not expanded — the rows, mastery meter, source tags, and accordion search were not observed. Needs manual expand.

### 5. Edit-card modal — Daybreak styling (DSH-06) + L-03 nit
expected: Edit modal uses the Daybreak surface (TField/TBtn). Save/Discard work; Delete shows a confirmation ("Delete this card?" / "can't be undone" / "Keep card") and a save/delete error state renders. L-03 check: the delete-confirm button currently renders as an amber (primary) TBtn rather than red/destructive — confirm whether that's acceptable UX or should be changed to a destructive style.
result: [pending]
note: Edit modal not opened — needs manual interaction.

### 6. All seven DSH-07 states render in Daybreak (DSH-07)
expected: Walk each state end-to-end in a running instance and confirm Daybreak styling: cards-due, none-due, resting (cooldown), all-paused, empty deck, brand-new-user first-visit (= empty-deck), and search-active-no-results.
result: [pending]
note: cards-due + empty-deck states verified (both captured); the other five states not walked.

## Summary

total: 6
passed: 3
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

[none — pending items need accordion expansion / modal interaction / multi-state walks, not defects]

## Automated Visual Verification — 2026-06-24
Driven via Playwright (signup → empty dashboard → add cards → populated dashboard). Header, default habitat medallion, and due-state action line PASS; the empty-deck state was also confirmed. Accordion rows, edit modal, and the resting/none-due/paused variants need manual testing.
