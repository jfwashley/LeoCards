---
phase: 21-dashboard-my-deck
plan: "05"
subsystem: card-list + card-edit-dialog
tags: [daybreak, accordion, dsah-04, dsah-05, dsah-06, d-03, d-04, tdd]
dependency_graph:
  requires: []
  provides:
    - words-accordion-header testid (Plan 04 / 09-language-breakdown depends on this)
    - words-search-input testid (e2e/05, e2e/02)
    - browse-words-empty testid (helpers.ts addWordsFromBrowser)
    - Daybreak CardRow native-on-top rows (D-04)
    - SourceTag Curated/Added-by-you/Paused
    - 3-bar MasteryMeter
    - Daybreak TField/TBtn edit modal
  affects:
    - e2e/05-card-management.spec.ts
    - e2e/02-first-visit-deck-creation.spec.ts
    - e2e/helpers.ts
tech_stack:
  added:
    - motion/react AnimatePresence + motion.div (already in package.json v12.38.0, first use in card-list)
  patterns:
    - Accordion height/opacity transition with usePrefersReducedMotion gate
    - Daybreak SourceTag inline component (Curated/Added by you/Paused)
    - Daybreak MasteryMeter (3 bars + check at 3/3)
    - Daybreak IconBtn (36x36, 1.5px #EDDFC9 border)
    - TField + TBtn in edit modal
key_files:
  created:
    - src/components/card-list.test.tsx
    - src/components/card-edit-dialog.test.tsx
  modified:
    - src/components/card-list.tsx
    - src/components/card-edit-dialog.tsx
    - e2e/05-card-management.spec.ts
    - e2e/02-first-visit-deck-creation.spec.ts
    - e2e/helpers.ts
decisions:
  - "Converged desktop table + mobile card layout into a single unified Daybreak row list (acceptable per plan); no separate md:table/md:hidden split needed for the Daybreak design"
  - "MasteryMeter paused guard: passes effectiveStep=0 when card.pausedAt is set, as specified by DSH-05 mock (bars show empty)"
  - "helpers.ts noAssignInExpressions biome lint (line 27 while loop) is pre-existing — not introduced by this plan; scoped biome gate to non-helpers files passed clean"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-06-21"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 7
---

# Phase 21 Plan 05: "Your words" Accordion + Daybreak Rows + Edit Modal Summary

**One-liner:** Tap-to-expand "Your words" accordion with AnimatePresence height/opacity transition, Daybreak CardRow native-on-top (D-04), Curated/Added-by-you/Paused SourceTag, 3-bar MasteryMeter, and Daybreak TField/TBtn edit modal.

## Tasks Completed

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Wrap list in 'Your words' accordion + Daybreak CardRow (DSH-04/05, D-03/D-04) | 3703700 | done |
| 2 | Restyle edit-card modal to Daybreak (DSH-06) — behavior preserved | df5a551 | done |
| 3 | Retarget e2e (05, 02, helpers.ts) + browse-words-empty testid | e27b06e | done |
| — | Style: biome import order + format fixes | 6f066de | done |

## Acceptance Gates

| Gate | Result |
|------|--------|
| `npx vitest run card-list.test.tsx card-edit-dialog.test.tsx` | 17/17 PASS |
| `npm test` (full unit suite) | 1998/2004 PASS (6 expected skips) |
| `npx tsc --noEmit` | CLEAN |
| `npx biome ci <touched src/e2e files>` | CLEAN (pre-existing helpers.ts issues excluded per CLAUDE.md scope rule) |
| e2e/05 retargeted (accordion open + words-search-input + /No words match/) | VERIFIED by grep |
| e2e/02 retargeted (accordion open + words-search-input) | VERIFIED by grep |
| helpers.ts uses browse-words-empty testid | VERIFIED by grep |
| words-accordion-header testid + "N learned" text present | VERIFIED by grep |

## Key testids Added

| testid | File | Consumer |
|--------|------|----------|
| `words-accordion-header` | card-list.tsx | Plan 04 / e2e/09-language-breakdown |
| `words-search-input` | card-list.tsx | e2e/05, e2e/02 |
| `browse-words-empty` | card-list.tsx (empty-deck Link) | e2e/helpers.ts addWordsFromBrowser |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Format] Biome import order and format issues in new files**
- **Found during:** Task 1 + 2 biome gate
- **Issue:** `motion/react` import placed after `next/link` (biome organizeImports); unused `within` import in card-list.test.tsx; format differences in test files
- **Fix:** `npx biome check --write` + `npx biome format --write` on affected files; committed in separate style commit (6f066de)
- **Files modified:** src/components/card-list.tsx, src/components/card-list.test.tsx, src/components/card-edit-dialog.test.tsx, e2e/02-first-visit-deck-creation.spec.ts

**2. [Rule 3 - Pre-existing bug] Stale e2e/05 assertion "No cards match" fixed in passing**
- **Found during:** Task 3 retarget
- **Issue:** `getByText("No cards match")` in e2e/05-card-management.spec.ts was a PRE-EXISTING stale assertion — the component already rendered "No words match" from a prior phase. The plan explicitly noted this as a pre-existing bug to fix.
- **Fix:** Replaced with `getByText(/No words match/)` regex — flagged in e2e comment
- **Files modified:** e2e/05-card-management.spec.ts

### Architectural Notes

- Converged the dual desktop-table / mobile-card layout into a single unified Daybreak row list. The plan permitted this ("a single responsive row list is acceptable and preferred"). Both layouts rendered the same Daybreak tokens so the convergence is correct.
- `nativeLangLabel` and `targetLangLabel` props are now unused in the populated section (the unified row list doesn't use column header labels). They are retained in the interface with `_` prefix to preserve the public API contract (callers still pass them; removing props would be a breaking change requiring Plan 04 update).

## Pre-existing Issues (out of scope)

- `e2e/helpers.ts` line 27: `noAssignInExpressions` biome lint (while loop assignment pattern) — pre-existing, not introduced by this plan. Logged but not fixed per CLAUDE.md scope boundary rule.

## Known Stubs

None — all data flows are wired. The accordion reads from the `cards` prop (already-fetched, already-owned cards). SourceTag, MasteryMeter, and pause/edit actions all use live card data.

## Threat Flags

No new threat surface introduced. This plan is presentation-only: all authorization paths (`/api/cards/[id]/pause|unpause`, `editCard`, `deleteCard`) are unchanged. Client-side search filter operates on already-loaded, already-owned card data (no new server query or data exposure).

## Self-Check

**Files created/modified:**
- [x] src/components/card-list.tsx — EXISTS
- [x] src/components/card-list.test.tsx — EXISTS
- [x] src/components/card-edit-dialog.tsx — EXISTS
- [x] src/components/card-edit-dialog.test.tsx — EXISTS
- [x] e2e/05-card-management.spec.ts — EXISTS (retargeted)
- [x] e2e/02-first-visit-deck-creation.spec.ts — EXISTS (retargeted)
- [x] e2e/helpers.ts — EXISTS (retargeted)

**Commits verified:**
- [x] 3703700 — feat(21-05): Task 1 accordion + Daybreak rows
- [x] df5a551 — feat(21-05): Task 2 edit modal Daybreak restyle
- [x] e27b06e — feat(21-05): Task 3 e2e retarget
- [x] 6f066de — style(21-05): biome fixes

## Self-Check: PASSED
