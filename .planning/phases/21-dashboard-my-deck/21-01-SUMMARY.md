---
phase: 21-dashboard-my-deck
plan: "01"
subsystem: ui
tags: [base-ui, popover, react, next.js, daybreak, dashboard]

# Dependency graph
requires:
  - phase: 20-study-reskin
    provides: Daybreak token conventions (card surface bg/border/radius/shadow), select.tsx wrapper pattern
  - phase: 19-daybreak-foundation
    provides: LionFace, TField, TBtn, cn(), Daybreak globals — foundation consumed by popover wrapper convention

provides:
  - "src/components/ui/popover.tsx — reusable @base-ui/react Popover wrapper with Daybreak surface tokens; exports Popover, PopoverTrigger, PopoverPortal, PopoverPositioner, PopoverPopup, PopoverClose, PopoverContent"
  - "dashboard/page.tsx — getLanguageBreakdown removed from Promise.all; dead HabitatWidget import removed"
  - "deck-view.tsx — languageBreakdown prop + My Deck heading + cross-language breakdown render removed (D-02)"

affects:
  - 21-02 (deck-switcher/header — consumes PopoverTrigger with data-testid deck-picker-trigger)
  - 21-04 (deck-view body rewrite — builds on the now-clean DeckView without languageBreakdown)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@base-ui/react/popover wrapper follows select.tsx convention exactly: named functions, data-slot attributes, Portal>Positioner(z-50)>Popup nesting, cn() className merging"

key-files:
  created:
    - src/components/ui/popover.tsx
  modified:
    - src/app/(protected)/dashboard/page.tsx
    - src/components/deck-view.tsx

key-decisions:
  - "popover.tsx exports PopoverContent convenience wrapper (Portal>Positioner>Popup) in addition to the six primitives — reduces boilerplate for Plan 02 deck-switcher consumer without breaking the six-export contract"
  - "Unused React namespace import removed from popover.tsx (biome noUnusedImports) — dialog.tsx and select.tsx don't import React either; popover follows suit"
  - "HabitatWidget import removed from dashboard/page.tsx as dead code (no longer consumed after deck-view.tsx change; Plan 03/04 own the habitat hero swap)"

patterns-established:
  - "Popover wrapper pattern: PopoverPositioner carries className='isolate z-50'; PopoverPopup applies Daybreak card surface tokens (bg-white border border-[#F0E3CF] rounded-[22px] shadow-[0_12px_30px_rgba(160,110,40,0.16)]); no pill styling on PopoverTrigger (consumer's responsibility)"

requirements-completed: [DSH-01, DSH-02]

# Metrics
duration: 15min
completed: 2026-06-21
---

# Phase 21 Plan 01: Foundation — Popover Wrapper + D-02 Removal Summary

**@base-ui/react Popover wrapper with Daybreak card surface tokens created; getLanguageBreakdown call-site and My Deck heading removed from dashboard (D-02) with all 1968 unit tests preserved**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-21T15:10:00Z
- **Completed:** 2026-06-21T15:25:00Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Created `src/components/ui/popover.tsx` following the select.tsx wrapper convention exactly — six named-function sub-components plus a `PopoverContent` convenience wrapper, Daybreak card surface on `PopoverPopup`, `isolate z-50` on `PopoverPositioner`
- Removed `getLanguageBreakdown` from `dashboard/page.tsx` Promise.all and removed the dead `HabitatWidget` import
- Removed `languageBreakdown` prop, `My Deck` `<h1>` heading, and breakdown render block from `deck-view.tsx` (D-02) — function survives untouched in `milestone-queries.ts`
- All three gates green: `tsc --noEmit` clean, 1968/1968 unit tests pass, `biome ci` clean over the 3 touched files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Daybreak Popover wrapper** - `f6a571f` (feat)
2. **Task 2: Remove getLanguageBreakdown + My Deck heading + breakdown render** - `8c32510` (feat)
3. **Task 3: Behavior-preservation gate (tsc + unit + biome)** - `a5de97f` (chore)

## Files Created/Modified

- `src/components/ui/popover.tsx` — New: @base-ui/react Popover wrapper with Daybreak surface tokens; consumed by Plan 02 deck-switcher
- `src/app/(protected)/dashboard/page.tsx` — Removed getLanguageBreakdown import + Promise.all call + prop; removed dead HabitatWidget import
- `src/components/deck-view.tsx` — Removed languageBreakdown from DeckViewProps interface, destructure, and JSX render block (My Deck h1 + breakdown p)

## Decisions Made

- Added `PopoverContent` convenience wrapper (Portal > Positioner > Popup) as a seventh export alongside the six primitives — Plan 02 can use either the primitives directly or the convenience wrapper; no plan contract broken
- Removed unused `import type * as React from "react"` — biome noUnusedImports caught it; popover.tsx only uses JSX which is handled by the tsconfig jsx transform, no React namespace needed
- `HabitatWidget` import removed from `dashboard/page.tsx` as dead code — it was imported but no longer used after DeckView no longer renders it directly; Plan 03/04 own the habitat hero introduction

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused React import from popover.tsx**
- **Found during:** Task 3 (biome gate)
- **Issue:** `import type * as React from "react"` was copied from select.tsx but popover.tsx does not use the React namespace directly — biome flagged it as `noUnusedImports`
- **Fix:** Removed the unused import; JSX transform handles all React usage implicitly
- **Files modified:** src/components/ui/popover.tsx
- **Verification:** biome ci clean; tsc still passes
- **Committed in:** a5de97f (Task 3 gate commit)

**2. [Rule 1 - Bug] Fixed biome formatting on popover.tsx type union and dashboard/page.tsx whitespace**
- **Found during:** Task 3 (biome gate)
- **Issue:** Multi-line `Pick<>` type intersection in PopoverContent had inconsistent line wrapping; dashboard/page.tsx had a stray blank line after import removal
- **Fix:** `npx biome format --write` + `npx biome check --fix` applied safe fixes only
- **Files modified:** src/components/ui/popover.tsx, src/app/(protected)/dashboard/page.tsx
- **Verification:** biome ci exits 0
- **Committed in:** a5de97f (Task 3 gate commit)

---

**Total deviations:** 2 auto-fixed (2x Rule 1 — new lint/format errors introduced by this plan's edits)
**Impact on plan:** Both fixes necessary for biome gate compliance; no scope creep; zero behavior change.

## Issues Encountered

None — plan executed cleanly. The biome errors were trivially auto-fixable (unused import + formatting) and were resolved in the gate commit.

## Known Stubs

None — this plan creates a generic structural wrapper and removes dead code. No UI rendering stubs introduced.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes. One DB query (`getLanguageBreakdown`) was removed from the call-site — no new attack surface introduced.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `PopoverContent` / `PopoverTrigger` available for Plan 02 (deck-switcher/header) to build the deck-picker pill
- `DeckView` is free of `languageBreakdown` prop — Plan 04 (deck-view body) can cleanly rewrite the action line region without a dangling prop
- All existing unit tests green; e2e deferred to wave boundary (owned by orchestrator)

## Self-Check

- [x] `src/components/ui/popover.tsx` exists and starts with "use client"
- [x] `src/app/(protected)/dashboard/page.tsx` has 0 `getLanguageBreakdown` references
- [x] `src/components/deck-view.tsx` has 0 `languageBreakdown` references and 0 `My Deck` occurrences
- [x] `getLanguageBreakdown` function still exists in `src/lib/milestone-queries.ts` (grep returns 1)
- [x] Commits f6a571f, 8c32510, a5de97f all exist in git log

## Self-Check: PASSED

---
*Phase: 21-dashboard-my-deck*
*Completed: 2026-06-21*
