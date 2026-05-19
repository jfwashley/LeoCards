---
phase: 11-review-commit
plan: "04"
subsystem: ui
tags: [react, useReducer, wiring, review-flow, human-uat]

requires:
  - phase: 11-review-commit plan 03
    provides: ReviewList component + 6-state reducer + ReviewListProps contract

provides:
  - image-upload-flow.tsx EXTRACT_SUCCESS branch renders <ReviewList> (replaces Phase 10 disabled stub)
  - onCancel wired to BACK_TO_PICK (D-14 zero DB writes)
  - nativeLangLabel/targetLangLabel derived via local LANGUAGE_LABELS map and passed to ReviewList

affects:
  - src/components/image-upload-flow.tsx (sole file modified this wave)

tech-stack:
  added: []
  patterns:
    - "Local LANGUAGE_LABELS map in image-upload-flow.tsx mirrors new-card/page.tsx and deck-view.tsx pattern"
    - "BACK_TO_PICK dispatch as onCancel (zero writes, no dialog)"

key-files:
  created: []
  modified:
    - src/components/image-upload-flow.tsx

key-decisions:
  - "nativeLangLabel/targetLangLabel derived inline in image-upload-flow.tsx using a local LANGUAGE_LABELS map (same as new-card/page.tsx) rather than threading additional props through NewCardModeToggle — avoids a cascading prop-drilling change while satisfying ReviewListProps optional label contract"

requirements-completed: [RVW-01, RVW-02, RVW-03, RVW-04, RVW-05]

duration: 5min
completed: "2026-05-19"
---

# Phase 11 Plan 04: Wire ReviewList into EXTRACT_SUCCESS + Human UAT Summary

**Replaced the Phase 10 disabled "Review words ->" stub in image-upload-flow.tsx with a real <ReviewList> render, completing the v2.0 image-to-flashcards wiring — human UAT checkpoint awaiting.**

## Status

- **Task 1 (auto):** COMPLETE — committed ac90fe7
- **Task 2 (checkpoint:human-verify):** AWAITING — browser/live-DB/DeepL walkthrough required

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-19T16:00:00Z
- **Completed (Task 1):** 2026-05-19T16:10:00Z
- **Tasks:** 1/2 complete (Task 2 is a blocking human checkpoint)
- **Files modified:** 1

## Accomplishments

- `src/components/image-upload-flow.tsx` EXTRACT_SUCCESS branch replaced: Phase 10 disabled stub removed, real `<ReviewList>` render added
- Props threaded: `words={state.extractWords}`, `deckId={state.selectedDeckId}`, `nativeLang={nativeLang}`, `targetLang={deck?.language ?? "fr"}`, `onCancel={() => dispatch({ type: "BACK_TO_PICK" })}`, `nativeLangLabel` and `targetLangLabel` derived from local `LANGUAGE_LABELS` map
- `import { ReviewList } from "@/components/review-list"` added
- `LANGUAGE_LABELS` constant added to file (same `en/fr/es` map as `new-card/page.tsx`)
- `npx tsc --noEmit` — clean
- `npx biome check src/components/image-upload-flow.tsx` — clean
- `npm test` — 1765 unit tests GREEN; 4 skipped; 11 pre-existing Playwright e2e collection failures (unchanged baseline)

## Task Commits

1. **Task 1: Wire ReviewList into EXTRACT_SUCCESS** - `ac90fe7` (feat)
   - `src/components/image-upload-flow.tsx` — stub replaced, import + LANGUAGE_LABELS added

## Deviations from Plan

**None from the task specification.** One implementation choice made:

**Local LANGUAGE_LABELS derivation:** The 11-03-SUMMARY said "Wave 4 must pass real values from ImageUploadFlow's existing nativeLangLabel/targetLangLabel props (already available in scope)." Those props do not exist in `ImageUploadFlowProps` — they were never threaded in from `NewCardModeToggle`. Rather than adding two more props to `ImageUploadFlowProps` and updating `NewCardModeToggle` (a broader change), a local `LANGUAGE_LABELS` constant was added to `image-upload-flow.tsx` to derive human-readable labels from the already-available `nativeLang` string and `deck?.language`. This satisfies the `ReviewListProps` optional label contract, matches the pattern used in `new-card/page.tsx` and `deck-view.tsx`, and avoids prop-drilling through the toggle component.

## Known Stubs

None. The EXTRACT_SUCCESS branch now renders the real ReviewList. Task 2 (human UAT) will confirm end-to-end behavior on a live environment.

## Threat Flags

No new threat surface. This is a pure client-side prop hand-off. T-11-11 and T-11-12 assessed as `accept` in the plan's threat model — no changes.

## Self-Check

- [x] `src/components/image-upload-flow.tsx` contains exactly 1 `<ReviewList` (grep -c == 1)
- [x] `"Review words →"` stub text absent (grep -c == 0)
- [x] `import { ReviewList } from "@/components/review-list"` present
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx biome check src/components/image-upload-flow.tsx` — clean
- [x] `npm test` — 1765 passed, 4 skipped, 11 pre-existing e2e failures (no regression)
- [x] Commit ac90fe7 exists

## Self-Check: PASSED

## Awaiting: Task 2 — Human UAT

Task 2 is a `checkpoint:human-verify` (blocking) requiring a live Neon + DeepL + ANTHROPIC_API_KEY environment. The checkpoint state and exact manual verification steps are documented in the CHECKPOINT REACHED message returned by the executor.

---
*Phase: 11-review-commit*
*Partially completed: 2026-05-19 (Task 2 awaiting UAT)*
