---
phase: 16-performance-baseline-measure
plan: 01
subsystem: testing
tags: [vitest, cwv, lighthouse-medians, performance-harness, bundle-composition]

# Dependency graph
requires:
  - phase: 15-core-journey-qa-harness
    provides: scripts/qa-lib.mjs ROOT-resolution + logging-discipline pattern used as the analog for module structure (not imported — see purity constraint)
provides:
  - "scripts/measure-cwv-lib.mjs — pure ESM module exporting median, computeMedians, extractMetrics, getBundleKb, classifyBottleneck, renderRouteReport, renderSummary"
  - "scripts/__tests__/measure-cwv-lib.test.ts — Wave-0 unit coverage for all core computation/classification behaviors"
  - "scripts/__tests__/fixtures/route-bundle-stats.fixture.json — static fixture mirroring the real .next/diagnostics/route-bundle-stats.json shape"
affects: [16-02-measure-cwv-harness, 16-03-baseline-run, 17-performance-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-computation-core extraction: side-effectful harnesses (network/env/DB) must import their decision logic from a zero-import .mjs sibling so vitest can collect and test it without live credentials or network access"
    - "D-06 median-of-warm-runs: sort a copy ascending, Math.floor(n/2) index — no mean, no p75"
    - "D-07 3-way bottleneck taxonomy: mechanical argmax over 3 normalized 0-1 scores (bundle/RSC-waterfall/hydration) computed from bundleKb+bootupTime, ttfb, and tbt respectively"

key-files:
  created:
    - scripts/measure-cwv-lib.mjs
    - scripts/__tests__/measure-cwv-lib.test.ts
    - scripts/__tests__/fixtures/route-bundle-stats.fixture.json
  modified: []

key-decisions:
  - "Split pure logic into measure-cwv-lib.mjs (zero imports) rather than a main-guard pattern in measure-cwv.mjs itself, so Plan 02's harness can import every function without vitest ever executing the side-effectful DATABASE_URL guard or puppeteer.launch() call"
  - "Fixture's /deck/new-card entry uses an empty firstLoadChunkPaths array (matches PATTERNS.md's literal sample) so the getBundleKb chunks===0 assertion is exact per the plan's own spec; the other 3 routes carry non-empty chunk arrays to exercise the fingerprint-listing path"

patterns-established:
  - "Pattern: CONTRACT-layer .mjs modules for future harness scripts (measure-cwv.mjs in Plan 02) — no process.env, no network, no process.exit, no top-level await; all decision logic testable in isolation"

requirements-completed: [PERF-01, PERF-02]

# Metrics
duration: 12min
completed: 2026-07-01
---

# Phase 16 Plan 01: Pure CWV Computation + Render Library Summary

**Pure ESM library (7 exported functions: median statistics, Lighthouse-JSON extraction, bundle-stats parsing, D-07 3-way bottleneck classifier, D-04 markdown report renderers) with 9-test Wave-0 unit suite and a static bundle-stats fixture — the CONTRACT layer Plan 02's side-effectful harness will import against.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-01T22:06:33Z (approx, per STATE.md prior session marker)
- **Completed:** 2026-07-01T22:18:37Z
- **Tasks:** 2 completed
- **Files modified:** 3 created, 0 modified

## Accomplishments
- `scripts/measure-cwv-lib.mjs` — zero-import pure ESM module exporting `median`, `computeMedians`, `extractMetrics`, `getBundleKb`, `classifyBottleneck`, `renderRouteReport`, `renderSummary`
- `renderRouteReport` implements the full PERF-02 deliverable: medians table, bundle composition table, per-chunk `chunkPaths` fingerprint listing, and bottleneck classification naming the top Phase-17 optimization target
- `scripts/__tests__/measure-cwv-lib.test.ts` — 9 unit tests covering median (odd-length, single-element, even-length floor behavior), `computeMedians` (5-run reduction to per-key medians), `getBundleKb` (known route + throws on unknown route), and `classifyBottleneck` (all 3 taxonomy classes isolated by construction)
- `scripts/__tests__/fixtures/route-bundle-stats.fixture.json` — static fixture mirroring the verified `.next/diagnostics/route-bundle-stats.json` shape for all 4 target routes (`/dashboard`, `/study`, `/deck/new-card`, `/deck/browse`)
- Confirmed zero network/browser I/O in tests and zero new npm packages

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure computation + render library (scripts/measure-cwv-lib.mjs)** - `25515db` (feat)
2. **Task 2: Wave-0 unit tests + bundle-stats fixture** - `aa6c7b3` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `scripts/measure-cwv-lib.mjs` - Pure computation/classification/render core: 7 exported functions, no imports, no side effects
- `scripts/__tests__/measure-cwv-lib.test.ts` - Vitest unit suite (9 tests, 4 `describe` blocks) importing the lib via `../measure-cwv-lib.mjs`
- `scripts/__tests__/fixtures/route-bundle-stats.fixture.json` - Static JSON array fixture for all 4 target routes, byte values matching RESEARCH.md's sample data

## Decisions Made
- Extracted all decision logic into a dependency-free `.mjs` sibling rather than gating the full harness behind a `import.meta.url === process.argv[1]` main-guard — this keeps Plan 02's `measure-cwv.mjs` free to have its top-level `DATABASE_URL` guard and `await puppeteer.launch(...)` without ever risking vitest collection breakage, since `measure-cwv-lib.mjs` has zero imports and nothing to guard.
- Fixture's `/deck/new-card` entry intentionally kept with an empty `firstLoadChunkPaths` array (as PATTERNS.md's literal sample specifies) so the plan's exact acceptance assertion (`getBundleKb(stats,'/deck/new-card').chunks === 0`) holds precisely; the other 3 fixture routes carry non-empty chunk-path arrays so the fingerprint-listing render path has real data to work with if a future test exercises it.

## Deviations from Plan

None - plan executed exactly as written. All 7 functions match the `<interfaces>` contract signatures verbatim; the test file covers exactly the 4 behaviors specified in the plan's `<action>` block (median edge cases, computeMedians per-key reduction, getBundleKb incl. throw, and all 3 bottleneck classes constructed to isolate each dimension per the RESEARCH.md scoring formula).

**Note on acceptance-criteria grep heuristic:** The plan's purity-check acceptance criterion (`grep -c "process.env\|puppeteer\|@neondatabase\|process.exit\|await " scripts/measure-cwv-lib.mjs` filtered for comment lines, expected 0) returns 1 — this is a string-literal false positive: `renderRouteReport`'s markdown output includes the literal text `"...puppeteer-core 24.43.1"` describing the harness tooling in the human-readable report (this exact string is specified in PATTERNS.md's report template). The module has zero `import` statements and was runtime-smoke-tested to confirm no actual env/network/exit/await usage. Not logged as a deviation since no code change was made — the grep is a heuristic that doesn't distinguish string literals from live code, and the file satisfies every other purity signal (zero imports, verified pure at runtime).

## Issues Encountered
- Biome's formatter reflowed all 3 new files (line-wrapping for its configured line width) on the first `biome ci` pass — no logic changes, applied via `biome check --write`, then full re-verification (targeted vitest, acceptance-criteria greps, tsc, full vitest suite) confirmed no regression from the reformat.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (`scripts/measure-cwv.mjs`, the side-effectful harness) can now import all 7 functions from `measure-cwv-lib.mjs` without reimplementing any decision logic — auth/provisioning/Lighthouse-invocation/cleanup are the only remaining concerns for that plan.
- No blockers. Full vitest suite remains green (119/120 files passed, 1 pre-existing skip; 2099/2105 tests passed, 6 pre-existing skips) and `tsc --noEmit` is clean after these additions.

---
*Phase: 16-performance-baseline-measure*
*Completed: 2026-07-01*

## Self-Check: PASSED

- FOUND: scripts/measure-cwv-lib.mjs
- FOUND: scripts/__tests__/measure-cwv-lib.test.ts
- FOUND: scripts/__tests__/fixtures/route-bundle-stats.fixture.json
- FOUND: commit 25515db (Task 1)
- FOUND: commit aa6c7b3 (Task 2)
- Re-ran all `<acceptance_criteria>` from both tasks: PASS (with the one documented string-literal grep false positive noted above, not a real purity violation)
- Re-ran plan-level `<verification>`: `node --check` PASS; targeted `npx vitest run` 9/9 PASS; `npx tsc --noEmit` clean; scoped `npx biome ci` clean
- Full `npx vitest run`: 119/120 files passed (1 pre-existing skip), 2099/2105 tests passed (6 pre-existing skips) — no regression
