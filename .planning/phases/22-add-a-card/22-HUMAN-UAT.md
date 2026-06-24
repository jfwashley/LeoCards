---
status: partial
phase: 22-add-a-card
source: [22-VERIFICATION.md]
started: 2026-06-23
updated: 2026-06-24
---

## Current Test

[awaiting human testing — image stepper, interactions, and live-API path below]

## Tests

### 1. Visual pixel-fidelity — type-a-word flow
expected: ACSeg toggle, ACContext line (EN→ES · saves to your Spanish deck), ACTop (‹ My deck link + Add a Card title), and all type-a-word states (empty, translating shimmer, translate-fail, save-fail, "Card saved — add another." banner above fields) match the daybreak-addcard hi-fi boards.
result: pass
note: Verified via screenshot (2026-06-24, French deck). ACSeg "Type a word / From an image" toggle, ACContext "EN → FR · saves to your French deck", ACTop "‹ My deck" + "Add a Card" + "Browse words ›", English/French fields, swap control, and disabled "Save card" CTA all on-brand. The translating-shimmer / translate-fail / save-fail / "Card saved" banner sub-states were not exercised (need typed input).

### 2. Visual pixel-fidelity — from-an-image stepper
expected: Pick (ACDrop), Confirm (ACThumb + ACDeckSelect + Extract words), Extracting (ACProgress with Leo + amber bar), and all result states (success LionFace disc / partial counts / all-failed banner) match the boards; the 5-dot stepper aligns correctly.
result: [pending]
note: Did not switch to the image tab / run the stepper — needs manual walk.

### 3. ACContext chip shows ES not SP for Spanish (IN-03 cosmetic)
expected: The context-line chip for Spanish should read "ES" (matching the header deck picker, which uses the BCP-47 code via deck.language.toUpperCase()). Currently toChipCode() slices the label "Spanish" → "SP", visibly inconsistent side-by-side with the header chip. Decide whether to align the context chip to the BCP-47 code.
result: [pending]
note: Tested a French deck (chip correctly showed "FR"); the Spanish "ES vs SP" cosmetic inconsistency needs a Spanish deck to observe.

### 4. In-flow new deck create from the Confirm surface
expected: Clicking the ACDeckSelect full-width trigger opens the DeckSwitcher popover; "+ New deck" inline create works (language + name → creates and selects the deck in Confirm). data-testid="confirm-deck-select" present; header data-testid="deck-picker-trigger" unaffected.
result: [pending]
note: Image-mode Confirm surface not reached — needs manual walk.

### 5. Review-step inline word edit UX (CR-01 fix)
expected: Clicking the pencil on a word in the Review step shows an inline input pre-filled with the word; typing + Enter updates the word in the row; Escape cancels with no change; blur commits. (Component behavior is unit-locked in ac-atoms.test.tsx; this checks the live focus/timing feel.)
result: [pending]
note: Review step (image flow) not reached — needs manual interaction. (Behavior is unit-locked per CR-01.)

### 6. Cancel navigation feel (WR-02 advisory)
expected: Cancel buttons (Pick image-mode + error/no-words surfaces) navigate to /dashboard. They currently use window.location.assign (full reload) rather than router.push — assess whether the transition feels acceptable or should be switched to client-side routing.
result: [pending]
note: Image-mode cancel not exercised — needs manual interaction.

### 7. Full image happy-path end-to-end (live API keys)
expected: Upload a real photo → Extract (ACProgress, real up-to-30s wait) → Review words (real OCR) → Check translations (ACPairRow pairs) → "Add N cards" commit → Result success (LionFace disc + "N cards added!"). Requires live Claude Vision + DeepL keys; not covered by unit/e2e.
result: blocked
blocked_by: third-party
reason: "Requires live Claude Vision + DeepL API keys and a real photo upload — out of scope for an automated UAT pass."

## Summary

total: 7
passed: 1
issues: 0
pending: 5
skipped: 0
blocked: 1

## Gaps

[none — pending items are the image-flow stepper + interactions; #7 is gated on live API keys]

## Automated Visual Verification — 2026-06-24
Driven via Playwright (signup → /deck/new-card). Type-a-word entry state PASS on desktop, including the "Browse words ›" entry point into Phase 23. The image-pick stepper, in-flow deck create, review-step edit, and cancel nav need manual interaction; the full image happy-path is blocked on live API keys.
