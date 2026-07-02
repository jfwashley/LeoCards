---
phase: 17-performance-optimization
plan: 01
subsystem: testing
tags: [nextjs, vitest, playwright, lighthouse, node-esm, css-keyframes, biome]

# Dependency graph
requires:
  - phase: 16-performance-baseline-measure
    provides: measure-cwv.mjs / measure-cwv-lib.mjs (the pure lib + harness this plan extends), the immutable warm-prod baseline this plan's OUT_DIR redirect must never overwrite
provides:
  - Route-filtered, OUT_DIR-parameterized measure-cwv.mjs harness (resolveRoutes/resolveOutDir in measure-cwv-lib.mjs, vitest-covered)
  - The D-03 DaybreakShimmer atom (RSC-safe, CLS-0-safe placeholder) + shimmer-pulse CSS keyframe
  - A pre-split behavior-preservation baseline test for deck-view.tsx (locks current rendered behavior before Wave 3's RSC split)
  - e2e/perf-markers.ts scaffolds: PERF_READY_ATTR/waitForPerfReady (D-15 content-visible marker) + IS_PROD_BUILD (D-14/task_d326ebac prod-vs-dev detection gate)
affects: [17-02, 17-03, 17-04, 17-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Node-ESM pure-lib extraction: side-effectful measure-cwv.mjs imports resolveRoutes/resolveOutDir from measure-cwv-lib.mjs instead of hardcoding env-driven constants inline, keeping the harness vitest-collectible with zero live DATABASE_URL/network access"
    - "CSS-only keyframe animation convention (hab-fall precedent): named @keyframes + paired prefers-reduced-motion override block + per-instance timing via inline style — now applied a second time for shimmer-pulse"
    - "Playwright poll-until-marker idiom reused for a generic per-route content-visible signal (waitForPerfReady), adapted from the existing widget cold-load-TTI loop in e2e/13-perf.spec.ts"

key-files:
  created:
    - src/components/daybreak/shimmer.tsx
    - src/components/daybreak/__tests__/shimmer.test.tsx
    - e2e/perf-markers.ts
  modified:
    - scripts/measure-cwv.mjs
    - scripts/measure-cwv-lib.mjs
    - scripts/__tests__/measure-cwv-lib.test.ts
    - src/app/globals.css
    - src/components/deck-view.test.tsx

key-decisions:
  - "resolveRoutes treats /habitat as a UNION-addable opt-in (not a subset filter) — ROUTE_FILTER=/habitat alone must return exactly ['/habitat'], which a plain intersection-against-the-4-key-routes filter would incorrectly return [] for"
  - "resolveOutDir defaults to a NEW .planning/phases/17-performance-optimization/measurements/ directory and is structurally incapable of defaulting to the Phase 16 baseline path — PHASE_OUT_DIR is the only way to override it"
  - "DaybreakShimmer ships zero hooks/client directive (RSC-safe) since it is only ever a static placeholder — no interactivity is ever required of a shimmer block"
  - "e2e/perf-markers.ts only scaffolds the constants/helper this plan — no route gets data-perf-ready=\"true\" wired yet; that is explicitly Wave 3/4 work per the plan's action item (c)"

patterns-established:
  - "Route-filter + OUT_DIR-redirect: any future harness needing a similarly-scoped, similarly-guarded output path should mirror resolveRoutes/resolveOutDir's null-defaults-safe / explicit-override shape"
  - "DaybreakShimmer as next/dynamic's loading fallback: downstream lazy-load boundaries (CardEditDialog, image-upload-flow.tsx per RESEARCH.md) can now drop in `loading: () => <DaybreakShimmer .../>`"

requirements-completed: [PERF-03, PERF-04]

# Metrics
duration: 40min
completed: 2026-07-02
---

# Phase 17 Plan 01: Wave-0 Tooling & Scaffolds Summary

**Route-filtered measure-cwv.mjs harness with an OUT_DIR redirect away from the immutable Phase 16 baseline, a new RSC-safe DaybreakShimmer placeholder atom + CSS keyframe, and Wave-3/4 scaffolds (deck-view pre-split baseline test + e2e/perf-markers.ts content-visible/prod-build-detection helpers) — zero optimization or route behavior changed yet.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-07-02T22:37:44Z (approx., per STATE.md session activity marker)
- **Completed:** 2026-07-02T23:37:08Z
- **Tasks:** 3/3 completed
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments
- `measure-cwv.mjs` can now re-measure any subset of the 4 key routes (plus `/habitat` as a D-11 opt-in) and writes to a Phase-17-owned directory by default — the immutable Phase 16 baseline path is unreachable via the default code path, closing the single highest-risk gap identified in RESEARCH.md Pitfall 1 / T-17-01-01
- The D-03 single reusable Daybreak-toned shimmer placeholder now exists (`DaybreakShimmer`) — cream/amber rounded block, RSC-safe, space-reserving (CLS 0 provable in a test), reduced-motion-respecting, ready for downstream `next/dynamic` `loading:` usage
- `deck-view.tsx`'s current rendered behavior (header + HabitatHero + CardList + add-a-card affordance) is now locked by a baseline test that Wave 3's RSC split must keep green with no assertion changes — behavior-preservation is provable, not assumed
- The D-15 content-visible marker convention and D-14 prod-build detection signal exist as importable scaffolds (`e2e/perf-markers.ts`) so Wave 3/Wave 4 wire them into routes and the nav gate without reinventing either mechanism

## Task Commits

Each task was committed atomically:

1. **Task 1: Add route filter + OUT_DIR redirect to measure-cwv.mjs (D-09)** - `ad086ea` (feat)
2. **Task 2: Create the D-03 DaybreakShimmer atom + its shimmer-pulse keyframe + test** - `aa391d7` (feat)
3. **Task 3: Pre-split deck-view baseline test + document the content-visible marker and prod-build-detection conventions** - `c4d7c78` (feat)

**Plan metadata:** (this commit, following SUMMARY.md write)

## Files Created/Modified
- `scripts/measure-cwv-lib.mjs` - Added `resolveRoutes(filterArg)` and `resolveOutDir(rootDir, phaseOutDir)`, pure and vitest-covered; added a `node:path` import (pure built-in, no purity-contract violation)
- `scripts/measure-cwv.mjs` - Replaced the hardcoded `ROUTES`/`OUT_DIR` constants with calls to the new lib functions, reading `ROUTE_FILTER`/`PHASE_OUT_DIR` env vars; documented both in the file's env-var header block
- `scripts/__tests__/measure-cwv-lib.test.ts` - Added 12 new test cases (`describe("resolveRoutes...")` + `describe("resolveOutDir...")`) covering null-default, comma-intersection, the `/habitat` union case, unrecognized-route handling, and the baseline-path-exclusion assertion
- `src/components/daybreak/shimmer.tsx` - New `DaybreakShimmer` component: cream/amber gradient block, `width`/`height`/`radius`/`className` props, `aria-hidden`, no client directive
- `src/components/daybreak/__tests__/shimmer.test.tsx` - New test file: 5 cases covering render, explicit size reservation, default size, className merge, aria-hidden
- `src/app/globals.css` - Added `@keyframes shimmer-pulse` + a paired `prefers-reduced-motion` override for `.db-shimmer`, mirroring the existing `hab-fall` convention exactly
- `src/components/deck-view.test.tsx` - Added a new `describe("DeckView pre-split baseline (Phase 17 D-06)...")` block with one test asserting header + HabitatHero + CardList + add-a-card all render together (the Wave-3 behavior-preservation reference)
- `e2e/perf-markers.ts` - New file exporting `PERF_READY_ATTR`, `waitForPerfReady(page, timeoutMs)`, and `IS_PROD_BUILD` — the D-15/D-14 scaffolds; no route is instrumented with `data-perf-ready` yet

## Decisions Made
- `resolveRoutes("/habitat")` returns exactly `["/habitat"]` (union-addable), not `[]` — this was called out explicitly in the plan's interface contract and verified by a dedicated vitest case, since a naive subset-filter implementation would silently produce the wrong (empty) result for the D-11 spot-check use case
- Reworded one in-file comment in `shimmer.tsx` from `no hooks, no "use client"` to `no hooks, no client directive` — the original phrasing produced a spurious grep match against the acceptance criterion's literal `"use client"` string search (the comment was never an actual directive, but the string still matched); this is a documentation-only wording change, not a behavior change

## Deviations from Plan

None - plan executed exactly as written. One minor in-flight correction (the `shimmer.tsx` comment wording above) was made to satisfy the acceptance criterion's exact grep pattern unambiguously; it did not change any runtime behavior and is documented above as a Decision rather than a Rule 1-3 deviation since no bug/missing-functionality/blocker was involved — it was a self-inflicted grep false-positive caught and fixed before commit.

One formatting-only fix was applied during Task 3 verification: `npx biome ci` initially flagged `e2e/perf-markers.ts` for a formatting mismatch (multi-line `page.evaluate` call argument wrapping); `npx biome format --write e2e/perf-markers.ts` resolved it with zero logic change, then `tsc --noEmit` + `vitest run` were re-confirmed green before commit.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. This plan installs no new packages and touches no environment-variable requirements beyond the two NEW optional ones it introduces for `measure-cwv.mjs` (`ROUTE_FILTER`, `PHASE_OUT_DIR`), both fully backward-compatible (unset behaves exactly as the Phase 16 script did, except OUT_DIR now points at a new Phase-17 directory instead of the frozen baseline).

## Next Phase Readiness
- The D-09 route-filtered harness is ready for Wave 1+ optimization batches to re-measure affected route(s) without any baseline-overwrite risk
- The D-03 shimmer atom is ready for Wave 1+ to wire into `next/dynamic`'s `loading:` option on any below-the-fold client boundary
- The deck-view pre-split baseline test is ready to gate Wave 3's `DeckView`/`HabitatHero` RSC conversion — that wave must keep this exact test green with no assertion edits
- `e2e/perf-markers.ts`'s `waitForPerfReady`/`IS_PROD_BUILD` are ready for Wave 3 (adding `data-perf-ready="true"` to each key route) and Wave 4/5 (the PERF-04 nav gate + task_d326ebac INP prod-build gating)
- No blockers identified for subsequent waves

---
*Phase: 17-performance-optimization*
*Completed: 2026-07-02*

## Self-Check: PASSED

All 9 claimed files verified present on disk; all 4 claimed commit hashes (ad086ea, aa391d7, c4d7c78, 3ee7150) verified present in git log.
