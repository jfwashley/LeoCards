---
phase: 22-add-a-card
plan: "01"
subsystem: ui
tags: [react, daybreak, atoms, motion, jsdom, vitest, testing-library]

requires:
  - phase: 21-dashboard
    provides: "deck-switcher.tsx with local LangChip; motion/react; daybreak atom conventions"
  - phase: 19-daybreak-foundation
    provides: "LionFace, TBtn, TField, card.tsx — Daybreak inline-style primitive patterns"

provides:
  - "ACSeg (segmented toggle atom — two real <button> segments, amber pill track)"
  - "ACBtn (multi-variant button atom — primary/disabled/ghost/ghost-danger kinds)"
  - "ACBanner (ok/error banner atom — CSS circle glyphs ✓/!)"
  - "ACProgress (calm long-wait atom — LionFace sunrise disc + motion/react indeterminate bar)"
  - "ACReviewRow (keep/exclude word row atom — checkbox button + word + edit + remove)"
  - "ACPairRow (translation pair atom — D-01 target-on-top, ES above EN)"
  - "LangChip (shared named export at daybreak/lang-chip.tsx, used by deck-switcher + upcoming context line)"
  - "ac-atoms.test.tsx (unit test — 15 tests across 6 suites, all green)"

affects:
  - 22-add-a-card/22-02  # type-a-word: imports ACSeg, ACBtn, ACBanner, LangChip
  - 22-add-a-card/22-03  # image pick/confirm/extract: imports ACProgress, ACBtn, ACBanner, LangChip
  - 22-add-a-card/22-04  # review/translate/result: imports ACReviewRow, ACPairRow, ACProgress, ACBtn, ACBanner

tech-stack:
  added: []
  patterns:
    - "Daybreak atom: named export function, no 'use client', inline d1 hex tokens, no Tailwind classes"
    - "ACBtn: extends React.ButtonHTMLAttributes<HTMLButtonElement>; kind enum drives token map; spreads ...props"
    - "ACSeg: maps ['type','image'] to <button type='button'> with aria-pressed; label is accessible name (Pitfall 1)"
    - "ACPairRow: D-01 — target (ES) is DOM-first, native (EN) is DOM-second; orientation locked by unit test"
    - "ACReviewRow: checkbox-as-button pattern — <button type='button' onClick={onToggle}>"
    - "ACProgress: motion/react animate={{ x: ['-100%','100%'] }} for indeterminate bar; LionFace in sunrise disc"
    - "LangChip extraction: moved verbatim from deck-switcher.tsx, exported; deck-switcher re-imports (L-02)"
    - "Test pattern: @vitest-environment jsdom, afterEach(cleanup), optional-chaining instead of ! assertions"

key-files:
  created:
    - src/components/daybreak/lang-chip.tsx
    - src/components/daybreak/ac-seg.tsx
    - src/components/daybreak/ac-btn.tsx
    - src/components/daybreak/ac-banner.tsx
    - src/components/daybreak/ac-progress.tsx
    - src/components/daybreak/ac-review-row.tsx
    - src/components/daybreak/ac-pair-row.tsx
    - src/components/daybreak/__tests__/ac-atoms.test.tsx
  modified:
    - src/components/deck-switcher.tsx

key-decisions:
  - "LangChip extracted verbatim to daybreak/lang-chip.tsx with biome organizeImports safe-fix applied to deck-switcher import order"
  - "Unused `import * as React` removed via biome --unsafe from ac-seg, ac-progress, ac-pair-row, ac-review-row, lang-chip — JSX transform does not need explicit React import in this project"
  - "Test assertions use optional chaining (?.) instead of non-null assertions (!) to satisfy biome noNonNullAssertion lint rule"
  - "ACPairRow D-01: unit test queries two textbox inputs in DOM order and asserts inputs[0].value === target ('gato'), inputs[1].value === native ('cat') — orientation regression guard"

patterns-established:
  - "Daybreak atom: no 'use client'; named export function; inline hex literals from d1 token set; no Tailwind"
  - "Interactive glyphs as <button type='button'>: checkbox in ACReviewRow, segments in ACSeg — never <div>"
  - "D-01 orientation locked by DOM-order test: target-on-top is deliberate, not a bug"

requirements-completed: [ADC-01, ADC-02, ADC-03]

duration: 11min
completed: "2026-06-22"
---

# Phase 22 Plan 01: Add-a-Card Atoms Summary

**Six Daybreak presentation atoms + shared LangChip extraction: ACSeg/ACBtn/ACBanner/ACProgress/ACReviewRow/ACPairRow (all behavior-free, real `<button>` elements, inline d1 tokens, no emoji), with 15-test unit suite and LangChip moved from deck-switcher to a shared named export**

## Performance

- **Duration:** 11 min
- **Started:** 2026-06-22T21:20:21Z
- **Completed:** 2026-06-22T21:31:24Z
- **Tasks:** 3 (tasks 1+2 TDD atoms, task 3 gate)
- **Files modified:** 9

## Accomplishments

- All six new Daybreak atoms created as real `<button>` elements (L-06 prereq for Plans 02/03/04 e2e locators)
- ACPairRow D-01 target-on-top orientation locked by DOM-order assertion (`inputs[0].value === target`)
- LangChip extracted to `daybreak/lang-chip.tsx` as a shared named export; deck-switcher imports it with no behavior change (proven by 3 existing deck-switcher tests passing)
- 15 unit tests across 6 suites — all green; TypeScript clean; scoped biome clean on 9 touched files; full 2026-test suite passes

## Task Commits

1. **Task 1+3: ACSeg, ACBtn, ACBanner, LangChip, test file** - `e172806` (feat)
2. **Task 2+3: ACProgress, ACReviewRow, ACPairRow** - `de210b5` (feat)

## Files Created/Modified

- `src/components/daybreak/lang-chip.tsx` — Shared LangChip chip (extracted from deck-switcher, named export)
- `src/components/daybreak/ac-seg.tsx` — Segmented toggle (two `<button>` segments, amber track, aria-pressed)
- `src/components/daybreak/ac-btn.tsx` — Multi-variant button (primary/disabled/ghost/ghost-danger kinds)
- `src/components/daybreak/ac-banner.tsx` — ok/error banner (CSS ✓/! circle glyphs, no emoji)
- `src/components/daybreak/ac-progress.tsx` — Calm long-wait (LionFace disc + motion/react indeterminate bar)
- `src/components/daybreak/ac-review-row.tsx` — Keep/exclude row (checkbox-button + word + edit + remove)
- `src/components/daybreak/ac-pair-row.tsx` — Translation pair (D-01: ES target top, EN native bottom)
- `src/components/daybreak/__tests__/ac-atoms.test.tsx` — 15-test unit suite (jsdom, @testing-library/react)
- `src/components/deck-switcher.tsx` — Re-pointed to import LangChip from shared file (behavior unchanged)

## Decisions Made

- Removed unused `import * as React` via biome `--write --unsafe` from five files (JSX transform handles React in scope)
- Used optional chaining (`?.`) throughout the test file to satisfy biome `noNonNullAssertion` rule
- LangChip extraction required biome `organizeImports` safe-fix on deck-switcher.tsx (LangChip import moved to correct alphabetical position among `@/components/*` imports)
- ACBanner uses U+2713 (✓) and U+0021 (!) as the design contract specifies (`'✓'` in `daybreak-addcard.jsx` line 107) — not emoji

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript non-null assertion errors in test file**
- **Found during:** Task 3 (gate run — `npx tsc --noEmit`)
- **Issue:** `parentElement` can be `HTMLElement | undefined` per TS strict mode; array index access `inputs[0]` is `T | undefined`
- **Fix:** Replaced `container!.textContent` with `container?.textContent`; replaced `inputs[0]!.value` with destructured `const [targetInput, nativeInput] = inputs` + type cast; added `expect(container).toBeTruthy()` guard
- **Files modified:** `src/components/daybreak/__tests__/ac-atoms.test.tsx`
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** e172806 (Task 1 commit, test file included)

**2. [Rule 1 - Bug] Biome linting errors in new atom files**
- **Found during:** Task 3 (gate run — scoped biome ci)
- **Issue:** (a) `import * as React` flagged as unused (5 files); (b) `import type *` needed for type-only React import in ac-btn.tsx and ac-banner.tsx; (c) deck-switcher.tsx import order unsorted after LangChip added
- **Fix:** `npx biome check --write` for safe fixes; `npx biome check --write --unsafe` to remove unused React imports
- **Files modified:** ac-seg.tsx, ac-btn.tsx, ac-banner.tsx, ac-progress.tsx, ac-pair-row.tsx, ac-review-row.tsx, lang-chip.tsx, deck-switcher.tsx
- **Verification:** `npx biome ci <9 files>` exits 0 (no fixes applied)
- **Committed in:** e172806, de210b5

---

**Total deviations:** 2 auto-fixed (Rule 1 — bugs in test file + biome linting)
**Impact on plan:** Both fixes required for gate compliance. No scope creep.

## Issues Encountered

None beyond the auto-fixed TypeScript and biome issues documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

All six atoms are tested and ready:
- Plan 22-02 (type-a-word): import `ACSeg`, `ACBtn`, `ACBanner`, `LangChip` from their daybreak paths
- Plan 22-03 (image pick/confirm/extract): import `ACProgress`, `ACBtn`, `ACBanner`, `LangChip`
- Plan 22-04 (review/translate/result): import `ACReviewRow`, `ACPairRow`, `ACProgress`, `ACBtn`, `ACBanner`

D-01 target-on-top orientation is locked by test — Plans 02/03/04 must not reorder ACPairRow fields.

## Self-Check

- [x] All 7 new files created at expected paths
- [x] deck-switcher.tsx modified (LangChip import added, local definition removed)
- [x] Commits e172806 and de210b5 exist in git log
- [x] `npx vitest run src/components/daybreak/__tests__/ac-atoms.test.tsx` — 15/15 pass
- [x] `npm test` — 2026/2026 pass (including deck-switcher.test.tsx)
- [x] `npx tsc --noEmit` — exits 0
- [x] Scoped biome ci — exits 0

---
*Phase: 22-add-a-card*
*Completed: 2026-06-22*
