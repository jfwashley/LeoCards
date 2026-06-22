---
phase: 22-add-a-card
plan: "04"
subsystem: ui
tags: [daybreak, review-list, ac-pair-row, ac-review-row, ac-progress, ac-btn, ac-banner, ac-stepper, lion-face, vitest, biome]

requires:
  - phase: 22-add-a-card plan 01
    provides: ACReviewRow, ACPairRow, ACProgress, ACBtn, ACBanner atoms
  - phase: 22-add-a-card plan 03
    provides: ACStepper 5-dot, e2e/11 pick/confirm retargets already done

provides:
  - "review-list.tsx fully Daybreak — Review (ACReviewRow + select-all/none + dedupe chips), Translating (ACProgress + Cancel), Check (ACPairRow D-01 target-on-top), Add N cards commit, three Result states (success/partial/all-failed) under the Add stepper dot (D-05)"
  - "All review-list reducer behavior preserved verbatim (reviewListReducer, runTranslationFanOut, commitReviewRows, saveImageCards, cancelled.current guard, count tallies)"

affects:
  - e2e phase gate (review/translate/result assertions are Manual-Only; all automatable assertions in e2e/11 were already retargeted by Plan 03)

tech-stack:
  added: []
  patterns:
    - "Presentation-only restyle: reducer lines 117-249 + orchestration helpers lines 253-318 carried verbatim; only per-step JSX returns change (L-02)"
    - "D-01 ACPairRow orientation: target (ES) = top field (row.word), native (EN) = bottom field (row.nativeText); locked by Plan 01 atom unit test"
    - "D-05 Result under Add dot: ACStepper current=4 (Add) renders above all three result states; no 6th dot"
    - "L-01 no emoji: ACBanner uses ASCII ✓/! circle glyphs; result rows use ✓/-/! literals; LionFace is CSS geometry"
    - "All-failed banner uses JSX string literal {'Couldn't add cards — please try again.'} for grep-matchability"
    - "Dedupe duplicates rendered as struck-through inline chips (amber pill with 'skipped' sub-label) instead of AlreadyLearnedRow div"

key-files:
  created: []
  modified:
    - src/components/review-list.tsx

key-decisions:
  - "Tasks 1+2 committed together (same file, same TDD cycle — reducer tests were green before and stay green after restyle)"
  - "Task 3 is a no-op: e2e/11 had no review/translate/result assertions to retarget (the original Phase 9 spec stopped at Extract words; review/translate steps need live API keys). Stale 'Next: translate' was already cleaned by Plan 03. Zero stale literals in e2e/."
  - "Apostrophe in 'Couldn't add cards' banner uses JSX expression {'...'} not &apos; to allow grep matching"
  - "select-all/select-none rendered as styled <button type='button'> (not ACBtn) to match link-style design without ghost border"
  - "loading-dedupe step uses ACProgress (calm wait) not a bare spinner — improves UX and uses the shared atom"

requirements-completed: [ADC-03]

duration: 30min
completed: "2026-06-22"
---

# Phase 22 Plan 04: Review-List Daybreak Re-skin + Result States Summary

**Daybreak surface for the Review/Translating/Check/Result tail of the image stepper: ACReviewRow + select-all/none + dedupe chips, ACProgress translating with preserved cancel guard, ACPairRow target-on-top (D-01), "Add N cards" commit, and three Result states (success LionFace / partial counts / all-failed banner) under the Add stepper dot (D-05); reducer and all behavior preserved verbatim**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-06-22T23:39:00Z
- **Completed:** 2026-06-22T23:50:00Z
- **Tasks:** 3 (Tasks 1+2 co-committed on same file, Task 3 no-op — no existing assertions to retarget)
- **Files modified:** 1 (src/components/review-list.tsx)

## Accomplishments

- Restyled all five rendered surfaces of `review-list.tsx` to Daybreak atoms: `loading-dedupe` (ACProgress calm wait), `step-a` (ACReviewRow per word + select-all/none link-style buttons + struck-through duplicate chips + "Translate N words" ACBtn primary), `translating` (ACProgress + Cancel ghost ACBtn; `cancelled.current` guard untouched at line 293), `step-b` (Baloo 2 "Check translations" heading + ACPairRow D-01 target-on-top + "Add N cards" primary), `success` (three Daybreak Result states under ACStepper current=4 — Add dot per D-05)
- D-01 orientation enforced: `ACPairRow` called with `target={row.word}` (ES, top) and `native={row.nativeText}` (EN, bottom); locked by Plan 01 atom unit test
- D-05 Result states: success = LionFace sunrise disc + "N cards added!" Baloo 2 heading + "Go to my deck" (no emoji, L-01); partial = counts card (Added green ✓ / Already learned muted - / Couldn't add red !); all-failed = ACBanner error + Try again + Back to deck
- L-02: `reviewListReducer` (lines 117-249), `runTranslationFanOut`, `commitReviewRows`, `saveImageCards`, `handleGoToDeck`, `cancelled.current` guard, and all count tallies are byte-for-byte identical to the pre-restyle version
- 27/27 reducer + orchestration tests green; `tsc --noEmit` clean; scoped biome clean on both touched files
- e2e/11 stale selector audit: zero stale "Next: translate" literals in all of `e2e/` (Plan 03 had already cleaned this); no review/translate/result assertions existed in e2e/11 (those steps require live DeepL + Claude-vision API keys and are Manual-Only per VALIDATION)

## Task Commits

1. **Tasks 1+2: review-list Daybreak restyle (Review/Translating/Check/Result + commit + LionFace)** - `4501899` (feat)

## Files Created/Modified

- `src/components/review-list.tsx` — Full Daybreak surface restyle: ACReviewRow/ACPairRow (D-01)/ACProgress/ACBtn/ACBanner/LionFace/ACStepper; reducer + orchestration helpers preserved verbatim

## Decisions Made

- Tasks 1 and 2 committed in a single atomic commit: both operate on `review-list.tsx` and the TDD cycle (reducer tests were pre-existing RED-now-GREEN) is shared
- Task 3 is a no-op with no commit: e2e/11 contains no review/translate/result assertions (the spec stops at the "Extract words" button, since the translate/commit steps require live API keys). Plan 03 already cleaned all "Next: translate" stale literals. The acceptance criteria "Translate ≥1 in e2e/11" cannot be met without adding a deep integration test that the plan explicitly prohibits
- `loading-dedupe` upgraded from a bare `<Loader2>` spinner to `ACProgress` with a calm-wait title — uses the shared atom consistently and improves UX
- Duplicate chips rendered as inline amber pill spans (not the old `AlreadyLearnedRow` div) matching the Daybreak "Already in your deck · skipped" visual

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome formatting error in review-list.tsx**
- **Found during:** Task 1+2 (scoped biome ci)
- **Issue:** An extra blank line in the all-failed `<div>` and a formatting inconsistency in the "Already in your deck" `<span>` block caused biome to report one formatting error
- **Fix:** `npx biome format --write src/components/review-list.tsx` (scoped)
- **Files modified:** `src/components/review-list.tsx`
- **Committed in:** 4501899

**2. [Rule 1 - Planning Error] Task 3 acceptance criterion "Translate ≥1 in e2e/11" unachievable without new deep test**
- **Found during:** Task 3 verification
- **Issue:** The criterion presupposes a "Next: translate" button assertion existed in e2e/11 that needed retargeting to "Translate N words". However, the original e2e/11 spec never reached the review step — it stopped at "Extract words" (Phase 9 scope). Plan 03 removed "Next: choose deck" but there was never a "Next: translate" assertion in this file. Meeting the criterion would require adding a deep integration test that needs live API keys, which the plan explicitly prohibits ("do NOT add a new deep integration test here").
- **Fix:** Documented as planning error. Both criteria 1 ("Next: translate" in e2e/11 = 0) and 2 (no stale "Next: translate" in e2e/) are GREEN. Criterion 3 (Translate ≥1 in e2e/11) is N/A — correctly covered by `review-list.test.ts` reducer tests per the plan's own statement.
- **Files modified:** None
- **Committed in:** N/A

---

**Total deviations:** 2 (1 auto-fixed biome format, 1 planning error noted — no code impact)
**Impact on plan:** Auto-fix necessary for gate compliance. Planning error has no code impact; reducer tests cover the translate behavior.

## Known Stubs

None — all behavior is wired to existing reducer dispatch actions. No hardcoded empty values, placeholder text, or components with unwired data sources.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes. The restyle touches only JSX returns; all API calls (`/api/translate`, `saveImageCards`) are preserved on the same code paths.

## Self-Check

- [x] `src/components/review-list.tsx` exists and is modified
- [x] Commit `4501899` exists in git log
- [x] `grep -c "reviewListReducer" src/components/review-list.tsx` = 2 (>=1)
- [x] `grep -c "runTranslationFanOut" src/components/review-list.tsx` = 2 (>=1)
- [x] `grep -c "commitReviewRows" src/components/review-list.tsx` = 2 (>=1)
- [x] `grep -c "cancelled.current" src/components/review-list.tsx` = 7 (>=1)
- [x] `grep -c "ACPairRow" src/components/review-list.tsx` = 3 (>=1)
- [x] `grep -c "LionFace" src/components/review-list.tsx` = 4 (>=1)
- [x] `grep -c "CheckCircle2" src/components/review-list.tsx` = 0 (must be 0)
- [x] `grep -c "ac-stepper" src/components/review-list.tsx` = 1 (>=1)
- [x] `grep -c "Next: translate" src/components/review-list.tsx` = 0 (must be 0)
- [x] `grep -c "Couldn't add cards — please try again." src/components/review-list.tsx` = 1 (>=1)
- [x] `grep -rc "Next: translate" e2e/` = 0 (must be 0)
- [x] `npx vitest run src/components/review-list.test.ts` — 27/27 pass
- [x] `npx tsc --noEmit` — exits 0
- [x] `npx biome ci src/components/review-list.tsx e2e/11-phase9-image-upload.spec.ts` — exits 0

## Self-Check Result

## Self-Check: PASSED

---
*Phase: 22-add-a-card*
*Completed: 2026-06-22*
