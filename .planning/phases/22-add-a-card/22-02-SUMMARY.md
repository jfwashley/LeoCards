---
phase: 22-add-a-card
plan: "02"
subsystem: ui
tags: [react, daybreak, translation-form, e2e, atoms, modal, next-js, restyle]

requires:
  - phase: 22-add-a-card
    plan: "01"
    provides: "ACSeg, ACBtn, ACBanner, LangChip atoms"

provides:
  - "ACTop (ac-top.tsx) — top bar with '‹ My deck' Link + data-testid=add-card-title Baloo 2 title"
  - "ACContext (ac-context.tsx) — LangChip EN → LangChip ES · saves to your Spanish deck"
  - "NewCardModeToggle restyled — ACTop + ACContext + ACSeg toggle (D-07 'From an image'); both child flows preserved"
  - "TranslationForm restyled — native-first ACFields with shimmer pending state + ACLinkBadge swap + ACBanner success/error; all behavior preserved (L-02)"
  - "page.tsx shell — Daybreak centered phone-width column (max-w-lg px-5 py-6)"
  - "e2e/04-manual-card-entry.spec.ts retargeted — getByTestId(add-card-title) + /Card saved/ regex + D-07 regression test"
  - "e2e/09-language-breakdown.spec.ts straggler fixed — getByTestId(add-card-title)"

affects:
  - 22-add-a-card/22-03  # image pick/confirm/extract — toggle is shared; D-07 label already correct in ACSeg
  - e2e/04-manual-card-entry.spec.ts  # retargeted
  - e2e/09-language-breakdown.spec.ts  # straggler retarget

tech-stack:
  added: []
  patterns:
    - "ACTop/ACContext as separate daybreak/* presentational atoms with no 'use client'"
    - "ACField inline: label + input + pending shimmer (amber wash + pulse bar + Translating text) + error; follows d1 token convention"
    - "ACLinkBadge inline: swap disc wired to existing SET_NATIVE/SET_TARGET reducer actions (no new actions)"
    - "Behavior-preservation pattern: reducer/debounce/activeField/saveCard verbatim; only JSX surface changes (L-02)"
    - "e2e retarget: data-testid for heading + regex for dynamic copy; D-07 test uses aria-pressed to verify toggle state"
    - "Biome format --write applied to all touched files before commit; tsc --noEmit exits 0"

key-files:
  created:
    - src/components/daybreak/ac-top.tsx
    - src/components/daybreak/ac-context.tsx
  modified:
    - src/components/new-card-mode-toggle.tsx
    - src/components/translation-form.tsx
    - src/app/(protected)/deck/new-card/page.tsx
    - e2e/04-manual-card-entry.spec.ts
    - e2e/09-language-breakdown.spec.ts

key-decisions:
  - "ACTop and ACContext created as separate daybreak/* files (not inlined in toggle) for composability — Plans 03/04 may import ACTop for image flow top bar"
  - "ACField inlined in translation-form.tsx (not a shared daybreak/* atom) — it has form-specific props (pending, hasValue, error) that make a shared atom premature until image-flow fields are designed"
  - "ACLinkBadge swap wired to existing SET_NATIVE/SET_TARGET dispatch actions — no new reducer actions needed; swap re-triggers debounced translate"
  - "Shimmer uses CSS animation:pulse (Tailwind keyframe already defined globally) rather than motion/react — simpler, no import needed, same visual result"
  - "e2e/09 straggler getByText(\"Add a Card\") retargeted to getByTestId(\"add-card-title\") in same commit as e2e/04 (L-06 audit found it)"
  - "e2e/11 'From image' straggler NOT touched — that spec targets image-upload flow which is Plans 03/04 scope"

duration: 25min
completed: "2026-06-22"
---

# Phase 22 Plan 02: Daybreak Add-a-Card Shell + Type-a-Word Restyle Summary

**Daybreak re-skin of the type-a-word Add-a-Card destination: ACTop + ACContext + ACSeg toggle (D-07 "From an image"), native-first ACFields with shimmer/translate-fail/save states, ACBanner success banner above fields, real-button ACBtn Save — all behavior preserved; e2e/04 retargeted with D-07 regression test**

## Performance

- **Duration:** 25 min
- **Started:** 2026-06-22T21:35:00Z
- **Completed:** 2026-06-22T22:00:00Z
- **Tasks:** 3
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- Created `ACTop` (ac-top.tsx) with `data-testid="add-card-title"` for e2e/04 + e2e/09 Playwright locators
- Created `ACContext` (ac-context.tsx) rendering LangChip EN → LangChip ES · saves to your Spanish deck using shared LangChip atom
- Rewrote `NewCardModeToggle` render: shadcn Button pair → ACTop + ACContext + ACSeg; D-07 label "From an image" now lives in ACSeg (verified in Plan 01); both TranslationForm + ImageUploadFlow child mounts preserved with all props unchanged
- Restyled `TranslationForm`: native-first ACField fields (D-01 orientation), amber shimmer pending state, ACLinkBadge swap, ACBanner "Card saved — add another." above fields, ACBtn primary/disabled Save — all reducer/debounce/activeField.current/saveCard behavior preserved (L-02)
- `page.tsx`: swapped wide wrapper for Daybreak centered phone-width column (max-w-lg px-5 py-6); RSC logic, redirect, props all unchanged
- Retargeted `e2e/04`: `getByTestId("add-card-title")`, `/Card saved/` regex, new D-07 regression test with aria-pressed assertion
- Fixed `e2e/09` straggler: `getByText("Add a Card")` → `getByTestId("add-card-title")`
- `npx tsc --noEmit` exits 0; 2026/2026 vitest tests pass; scoped biome ci clean on all 7 files

## Task Commits

1. **Task 1: ACTop + ACContext + toggle restyle + page.tsx shell** - `afe7c7d` (feat)
2. **Task 2: TranslationForm Daybreak restyle** - `7548936` (feat)
3. **Task 3: e2e/04 retarget + D-07 regression test** - `01ed96e` (test)

## Files Created/Modified

- `src/components/daybreak/ac-top.tsx` — "‹ My deck" Link + data-testid=add-card-title Baloo 2 title
- `src/components/daybreak/ac-context.tsx` — LangChip EN → LangChip ES context line
- `src/components/new-card-mode-toggle.tsx` — ACTop + ACContext + ACSeg (shadcn Button removed; D-07 "From an image" via ACSeg)
- `src/components/translation-form.tsx` — Daybreak native-first ACFields + shimmer + ACLinkBadge + ACBanner + ACBtn (all behavior preserved)
- `src/app/(protected)/deck/new-card/page.tsx` — Daybreak centered phone-width shell (behavior unchanged)
- `e2e/04-manual-card-entry.spec.ts` — getByTestId + /Card saved/ regex + D-07 "From an image" regression test
- `e2e/09-language-breakdown.spec.ts` — straggler getByText("Add a Card") → getByTestId

## Decisions Made

- ACField kept inline in translation-form.tsx (not shared atom) to avoid premature API generalization before image-flow field design is known
- Shimmer uses `animation: "pulse 1.5s ease-in-out infinite"` CSS (Tailwind keyframe available globally) rather than motion/react animate — avoids an import for a simple visual
- ACLinkBadge swap wired to existing SET_NATIVE/SET_TARGET — no new reducer actions (per plan instruction)
- e2e/09 straggler fixed in same commit as e2e/04 Task 3 (same intent: remove stale "Add a Card" exact-string locator)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome formatting errors in new files**
- **Found during:** Tasks 1, 2, 3
- **Issue:** Multi-line JSX prop formatting and import ordering diverged from biome's formatter
- **Fix:** `npx biome format --write <files>` + `npx biome check --write` for import ordering
- **Files modified:** ac-context.tsx, new-card-mode-toggle.tsx, translation-form.tsx, e2e/04-manual-card-entry.spec.ts
- **Verification:** `npx biome ci <files>` exits 0 for all 7 touched files
- **Committed in:** afe7c7d, 7548936, 01ed96e (each task)

No other deviations — plan executed exactly as designed.

## Known Stubs

None. ACContext receives `targetLangLabel` from NewCardModeToggle which gets it from `page.tsx` LANGUAGE_LABELS lookup — live data flows end-to-end.

## Threat Flags

No new threat surface. This plan is a presentation-only re-skin per the threat model. `/api/translate`, `saveCard`, and the RSC auth gate are all unchanged.

## Self-Check

- [x] ac-top.tsx exists at src/components/daybreak/ac-top.tsx
- [x] ac-context.tsx exists at src/components/daybreak/ac-context.tsx
- [x] new-card-mode-toggle.tsx modified (no shadcn Button, ACSeg/ACTop/ACContext present)
- [x] translation-form.tsx modified (ACBanner + ACBtn + ACFields; behavior preserved)
- [x] page.tsx modified (Daybreak shell)
- [x] e2e/04-manual-card-entry.spec.ts modified (retargeted + D-07 test)
- [x] e2e/09-language-breakdown.spec.ts modified (straggler fixed)
- [x] Commits afe7c7d, 7548936, 01ed96e exist in git log
- [x] `npx tsc --noEmit` exits 0
- [x] `npx vitest run --root .` — 2026/2026 pass
- [x] Scoped biome ci — exits 0 on all 7 touched files

## Self-Check: PASSED

---
*Phase: 22-add-a-card*
*Completed: 2026-06-22*
