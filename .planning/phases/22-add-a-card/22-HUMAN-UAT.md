---
status: partial
phase: 22-add-a-card
source: [22-VERIFICATION.md]
started: 2026-06-23
updated: 2026-06-23
---

## Current Test

[awaiting human testing]

## Tests

### 1. Visual pixel-fidelity — type-a-word flow
expected: ACSeg toggle, ACContext line (EN→ES · saves to your Spanish deck), ACTop (‹ My deck link + Add a Card title), and all type-a-word states (empty, translating shimmer, translate-fail, save-fail, "Card saved — add another." banner above fields) match the daybreak-addcard hi-fi boards.
result: [pending]

### 2. Visual pixel-fidelity — from-an-image stepper
expected: Pick (ACDrop), Confirm (ACThumb + ACDeckSelect + Extract words), Extracting (ACProgress with Leo + amber bar), and all result states (success LionFace disc / partial counts / all-failed banner) match the boards; the 5-dot stepper aligns correctly.
result: [pending]

### 3. ACContext chip shows ES not SP for Spanish (IN-03 cosmetic)
expected: The context-line chip for Spanish should read "ES" (matching the header deck picker, which uses the BCP-47 code via deck.language.toUpperCase()). Currently toChipCode() slices the label "Spanish" → "SP", visibly inconsistent side-by-side with the header chip. Decide whether to align the context chip to the BCP-47 code.
result: [pending]

### 4. In-flow new deck create from the Confirm surface
expected: Clicking the ACDeckSelect full-width trigger opens the DeckSwitcher popover; "+ New deck" inline create works (language + name → creates and selects the deck in Confirm). data-testid="confirm-deck-select" present; header data-testid="deck-picker-trigger" unaffected.
result: [pending]

### 5. Review-step inline word edit UX (CR-01 fix)
expected: Clicking the pencil on a word in the Review step shows an inline input pre-filled with the word; typing + Enter updates the word in the row; Escape cancels with no change; blur commits. (Component behavior is unit-locked in ac-atoms.test.tsx; this checks the live focus/timing feel.)
result: [pending]

### 6. Cancel navigation feel (WR-02 advisory)
expected: Cancel buttons (Pick image-mode + error/no-words surfaces) navigate to /dashboard. They currently use window.location.assign (full reload) rather than router.push — assess whether the transition feels acceptable or should be switched to client-side routing.
result: [pending]

### 7. Full image happy-path end-to-end (live API keys)
expected: Upload a real photo → Extract (ACProgress, real up-to-30s wait) → Review words (real OCR) → Check translations (ACPairRow pairs) → "Add N cards" commit → Result success (LionFace disc + "N cards added!"). Requires live Claude Vision + DeepL keys; not covered by unit/e2e.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
