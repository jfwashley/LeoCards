---
phase: 27-performance-batch-2
plan: 08
subsystem: ui
tags: [css, gpu-perf, habitat, backdrop-filter]

# Dependency graph
requires: []
provides:
  - "Zero backdrop-filter blur over the looping habitat video (h-prog-card.tsx, h-back.tsx, h-mood-chip.tsx, habitat-scene.tsx offline banner)"
  - "Regression tests asserting backdropFilter absence on the 4 overlay components"
affects: [27-performance-batch-2 (remaining plans), any future habitat-chrome styling work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DOM computed-style assertion (style.backdropFilter === '') for simple RSC atoms, vs. source-level string-grep assertion for the heavier 'use client' habitat-scene.tsx — matching the existing habitat-scene-video.test.ts convention"

key-files:
  created:
    - src/components/daybreak/__tests__/h-habitat-overlays-no-blur.test.tsx
  modified:
    - src/components/daybreak/h-prog-card.tsx
    - src/components/daybreak/h-back.tsx
    - src/components/daybreak/h-mood-chip.tsx
    - src/components/habitat-scene.tsx
    - src/components/__tests__/habitat-scene-video.test.ts

key-decisions:
  - "Rendered-DOM tests for the 3 simple presentational atoms (h-prog-card, h-back, h-mood-chip); source-level grep assertions for habitat-scene.tsx (VS8/VS9), extending the existing habitat-scene-video.test.ts file rather than a full DOM render, since that file is a heavy 'use client' component with a large dependency graph (HabitatVideo, dynamic three.js import, localStorage cache)"
  - "account-back.tsx deliberately untouched (D-02) — confirmed via grep before and after the edit that its backdropFilter count is unchanged"

patterns-established: []

requirements-completed: [PERF-22]

# Metrics
duration: 15min
completed: 2026-07-22
---

# Phase 27 Plan 08: Remove over-video habitat backdrop-filter blur Summary

**Removed `backdrop-filter: blur()` from all four habitat overlay components that render over the looping habitat video, eliminating a continuous per-frame GPU cost with a near-invisible pixel change on the already-92%-opaque panels.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-22T12:41:06Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- Removed `backdropFilter: "blur(6px)"` from `h-prog-card.tsx` (the originally-flagged item 18 / PERF-22)
- Removed `backdropFilter: "blur(4px)"` from `h-back.tsx`, `h-mood-chip.tsx`, and `habitat-scene.tsx`'s offline banner (all broadened into scope per D-02)
- Confirmed `account-back.tsx` (static page, no per-frame cost) was NOT touched — its own `backdropFilter` count verified unchanged before and after
- Added a DOM-rendered regression test (`h-habitat-overlays-no-blur.test.tsx`) asserting `style.backdropFilter === ""` for `HBack`, `HMoodChip`, and `HProgCard` (both the normal and L9-max render paths)
- Extended `habitat-scene-video.test.ts` with two source-level assertions (VS8/VS9) guarding the offline banner and the whole file against any reintroduced `backdropFilter`/`WebkitBackdropFilter`/`backdrop-blur`

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove backdrop-filter from the 4 over-video overlays**
   - `4acec47` perf(27-08): remove backdrop-filter blur from 4 over-video habitat overlays
2. **Task 2: Assert blur absence in component tests**
   - `cc89a60` test(27-08): regression-guard the 4 over-video habitat blur removals

## Files Created/Modified
- `src/components/daybreak/h-prog-card.tsx` - removed `backdropFilter: "blur(6px)"` from the progress card's inline style
- `src/components/daybreak/h-back.tsx` - removed `backdropFilter: "blur(4px)"` from the circular back button's inline style
- `src/components/daybreak/h-mood-chip.tsx` - removed `backdropFilter: "blur(4px)"` from the mood pill's inline style
- `src/components/habitat-scene.tsx` - removed `backdropFilter: "blur(4px)"` from the offline banner's inline style
- `src/components/daybreak/__tests__/h-habitat-overlays-no-blur.test.tsx` - new file; 4 tests rendering the 3 simple atoms and asserting no computed `backdropFilter`
- `src/components/__tests__/habitat-scene-video.test.ts` - 2 new tests (VS8/VS9) source-grepping habitat-scene.tsx for blur absence

## Decisions Made
- Used rendered-DOM `style.backdropFilter` assertions for the 3 simple RSC atoms (h-prog-card, h-back, h-mood-chip) since they're trivial to render with `@testing-library/react` and no mocking is required
- Used a source-level string-grep assertion for `habitat-scene.tsx` instead, extending the existing `habitat-scene-video.test.ts` convention (already established in Phase 13.1 for this exact file) rather than standing up a full render with mocks for `HabitatVideo`, the dynamic three.js import, and localStorage — matches the plan's explicit guidance that a source-level test is acceptable when a rendered-DOM assertion would be awkward
- Left every other style property (background color/opacity, box-shadow, border) untouched on all four files — the ~92%-opaque backgrounds already carry the panel contrast, so the diff is exactly one property removed per file

## Deviations from Plan
None - plan executed exactly as written. All four target lines matched the plan's line-number predictions exactly (h-prog-card.tsx:45, h-back.tsx:19, h-mood-chip.tsx:27, habitat-scene.tsx:308).

## Issues Encountered
- Full `npx vitest run` shows a small, non-deterministic set of timeout-based test failures on each run — 4-6 failures out of 2235 tests, but the SET of failing files differs between consecutive runs (`deck-switcher.test.tsx`, `image-upload-flow-extract-errors.test.tsx`, `review-list-commit-guard.test.tsx`, `cooldown-config.test.ts` all appeared in one run or another; none in both). None of these files were touched by this plan, and each passes cleanly when run in isolation (verified for `cooldown-config.test.ts` + `review-list-commit-guard.test.tsx`). This is full-suite parallel-execution timeout flakiness, consistent with the project's documented pre-existing `cooldown-config.test.ts` flake, just observed across a slightly wider set of timing-sensitive test files this session. Not caused by, and not chased by, this plan.

## User Setup Required
None - no external service configuration required. The pixel-level visual confirmation over the playing video (chrome still reads clearly with the blur removed) is deferred to manual UAT / the orchestrator's e2e-visual gate, per the plan's own verification section.

## Next Phase Readiness
- PERF-22 shipped: all four over-video backdrop blurs removed; `account-back.tsx` untouched; regression-guarded
- `npx tsc --noEmit` clean; scoped `biome check` clean across all 6 touched/created files
- `npx vitest run src/components/daybreak src/components/__tests__/habitat-scene-video.test.ts` — 72/72 pass
- After the wave: `e2e/07-habitat-display.spec.ts` + `e2e/13-habitat-states.spec.ts` should be run against a restarted prod-parity server, plus manual UAT eyeballing the overlays over the playing video (both per this plan's `<verification>` section, deferred to the orchestrator)
- 27-02, 27-03, 27-04, 27-07, 27-09, 27-10 remain unexecuted in Phase 27 (performance-batch-2)

## Self-Check: PASSED

All 5 modified/created files verified present on disk; both task commit hashes (`4acec47`, `cc89a60`) verified present in `git log`.

---
*Phase: 27-performance-batch-2*
*Completed: 2026-07-22*
