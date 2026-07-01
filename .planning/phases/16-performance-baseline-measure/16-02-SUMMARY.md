---
phase: 16-performance-baseline-measure
plan: 02
subsystem: testing
tags: [lighthouse, puppeteer-core, cwv-harness, better-auth, drizzle, neon]

# Dependency graph
requires:
  - phase: 16-performance-baseline-measure (Plan 01)
    provides: scripts/measure-cwv-lib.mjs — pure computation/classification/render library (median, computeMedians, extractMetrics, getBundleKb, classifyBottleneck, renderRouteReport, renderSummary)
provides:
  - "scripts/measure-cwv.mjs — the codified, side-effectful PERF-01/PERF-02 harness: inlined auth+provision, puppeteer-core browser launch + cookie injection, sequential Lighthouse run loop (4 routes x 2 presets x n=6), redirect guard, report writing, finally-cleanup"
  - "measure:cwv + measure:cleanup npm scripts"
affects: [16-03-baseline-run, 17-performance-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline-not-import for side-effectful sibling scripts: qa-lib.mjs exits at module load without DEBUG_CHEAT_SECRET, so measure-cwv.mjs copies+adapts the 5 needed functions (extractSessionCookie, signUp, mintTestEmail, getUserId, provision) rather than importing — same lesson documented in 16-RESEARCH.md Pitfall 5"
    - "Fail-fast local-artifact read before expensive network setup: readBundleStats() runs FIRST in the main try block, before provision/browser-launch, so a stale-build error surfaces in milliseconds instead of after minutes of auth+Lighthouse work"
    - "Defensive per-run cookie re-injection: injectCookie() is called inside every Lighthouse run iteration (not just once at setup), guarding against Lighthouse's storage-reset behavior even though it doesn't clear cookies by default"

key-files:
  created:
    - scripts/measure-cwv.mjs
  modified:
    - package.json

key-decisions:
  - "Redirect guard checks both `finalUrl.includes('/login')` AND `!finalUrl.includes(route)` — catches not just an explicit /login redirect but any other unexpected landing page, making the D-01/T-16-07 auth-failure guard stricter than the plan's minimum spec"
  - "Bottleneck classification uses the MOBILE medians as the basis (not desktop) per the plan's own guidance — mobile is the constrained profile matching the D-06/13.1 precedent from Phase 13.1's /habitat CWV work"
  - "Removed the unused `median` import from the measure-cwv-lib.mjs import list (Task 1 pulled in all 7 exports per the plan's <interfaces> contract prose, but the harness only calls computeMedians directly — median is used internally by the lib, not by the harness) to keep the file biome-clean with zero warnings"

patterns-established:
  - "Pattern: side-effectful harness scripts (measure-cwv.mjs) wrap their entire setup+measure+report body in a single top-level try/finally, with cleanup unconditionally running via spawnSync regardless of success — same shape qa-run.mjs established in Phase 15, now proven to generalize to a second harness"

requirements-completed: [PERF-01, PERF-02]

# Metrics
duration: 10min
completed: 2026-07-01
---

# Phase 16 Plan 02: CWV Measurement Harness (measure-cwv.mjs) Summary

**The codified `scripts/measure-cwv.mjs` PERF-01/PERF-02 harness — inlined prod auth + INSERT-only provisioning, puppeteer-core + Lighthouse Node API driving a sequential 4-route x 2-preset x n=6 run matrix against warm Vercel prod with a fail-loud `/login` redirect guard, atomic-write JSON+markdown reports, and unconditional `*@test.local` self-cleanup — replaces the ad-hoc shell commands in 13-PERF-REAL.md with one repeatable `npm run measure:cwv` command.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-01T22:35:13Z
- **Completed:** 2026-07-01T22:46:28Z
- **Tasks:** 3 completed
- **Files modified:** 1 created (637 lines), 1 modified (package.json scripts block only)

## Accomplishments
- `scripts/measure-cwv.mjs` — a complete, syntax-verified (`node --check`) harness combining: header/USAGE/SECURITY documentation, a `DATABASE_URL` env guard (DEBUG_CHEAT_SECRET intentionally NOT checked), 5 inlined auth/provisioning helpers adapted from `qa-lib.mjs` with the required prod `Origin` header, puppeteer-core browser launch pointed at Playwright's chromium-1208 binary, and per-run cookie injection using the exact `__Secure-better-auth.session_token` prod cookie name
- Exact run matrix per D-03/D-06: `ROUTES = ["/dashboard", "/study", "/deck/new-card", "/deck/browse"]` (habitat excluded), `PRESETS = ["mobile", "desktop"]`, `N_RUNS = 6` (discard run 0, median of runs 1-5), driven by a sequential (never parallel) double-for loop mirroring `qa-run.mjs`'s progress-logging cadence
- A redirect guard inside the run loop that throws loud if any Lighthouse run's `finalDisplayedUrl`/`finalUrl` lands on `/login` or fails to include the requested route — prevents the "silent garbage baseline" failure mode called out in D-01/T-16-07
- Full report pipeline: the sole local `.next/diagnostics/route-bundle-stats.json` read (D-05 — bundle composition never measured against prod), atomic `.tmp`+rename writes of per-route raw JSON x2 + markdown report + a cross-route `16-BASELINE-SUMMARY.md`, all rendered via the Plan-01 lib's `getBundleKb`/`classifyBottleneck`/`renderRouteReport`/`renderSummary` (zero reimplementation)
- A top-level `try { ... } finally { ... }` wrapping the entire setup-through-report body, with `browser.close()` guarded for undefined and an unconditional `spawnSync` cleanup of `%@test.local` users via `CLEANUP_DB_URL` (falls back to `DATABASE_URL`) — self-cleans regardless of measurement success or failure (T-16-05)
- `measure:cwv` + `measure:cleanup` npm scripts added to `package.json` without disturbing any existing entry (`qa:run`, `qa:cleanup`, etc. all verified intact)
- Zero new npm dependencies — confirmed via `git diff` across all 3 task commits touching only the scripts block

## Task Commits

Each task was committed atomically:

1. **Task 1: Header, env guard, inlined auth + provision, puppeteer launch + cookie injection** - `1db1488` (feat)
2. **Task 2: Lighthouse preset configs + sequential n=6 run loop + redirect guard + median wiring** - `f75e4b3` (feat)
3. **Task 3: Report output (raw JSON + markdown per route + summary), finally-cleanup, npm scripts** - `217c327` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `scripts/measure-cwv.mjs` - The complete PERF-01/PERF-02 harness (637 lines): inlined auth+provisioning, puppeteer-core+Lighthouse measurement loop with redirect guard, atomic report writing, finally-cleanup, main execution orchestration
- `package.json` - Added `measure:cwv` and `measure:cleanup` scripts to the existing scripts block; no dependency changes

## Decisions Made
- Adopted a stricter redirect-guard condition than the plan's literal minimum: checks both an explicit `/login` substring match AND that the final URL contains the originally-requested route path, catching any unexpected landing page (not just `/login` specifically) as an auth-failure signal
- Used MOBILE medians (not desktop) as the bottleneck-classification basis, per the plan's explicit instruction — consistent with the D-06/13.1 precedent that mobile is the CWV-constrained profile
- Removed the unused `median` named import (of the 7 lib exports, the harness directly calls `computeMedians`, `extractMetrics`, `getBundleKb`, `classifyBottleneck`, `renderRouteReport`, `renderSummary` — `median` is an internal helper `computeMedians` already uses, not something the harness itself needs to call) to keep the file `biome ci`-clean with zero warnings

## Deviations from Plan

None - plan executed exactly as written. All 3 tasks match the `<action>` specifications verbatim: the exact 4-route/2-preset/n=6 matrix, the inlined (not imported) auth helpers with the Origin header, the `__Secure-` cookie name, the redirect guard, the mobile/desktop Lighthouse configs from RESEARCH.md, atomic JSON/markdown writes to the correct `baseline/` directory, the finally-cleanup with `CLEANUP_DB_URL`+`%@test.local`, and both npm scripts.

**Note on acceptance-criteria grep heuristics (same class of false positive as Plan 01):**
1. The plan's grep for `qa-lib` (expected 0) returns 14 — every match is a comment/docstring explaining the inlining decision (e.g. "Do NOT `import ... from './qa-lib.mjs'`", "Adapted from qa-lib.mjs lines X-Y"). Zero actual `import` statements reference `qa-lib.mjs`; confirmed by `grep -n "qa-lib"` inspection during execution.
2. The plan's grep for the ROUTES array uses single-quote literals (`grep -c "'/dashboard'"`), but this project's biome config mandates `"quoteStyle": "double"` and every existing `.mjs` script uses double quotes exclusively. The double-quoted `"/dashboard"` is present and correct; using single quotes to satisfy the grep would have violated the project's own formatting convention (and would have been reformatted back to double quotes by `biome check --write` immediately after). Verified via double-quote-adjusted greps during execution — all counts satisfied.

Neither is a real deviation from the plan's intent (both are documented in Plan 01's SUMMARY as the same class of grep-heuristic limitation); no code change was made to chase the literal grep string, only to satisfy the underlying acceptance criterion (no real qa-lib import; ROUTES array exactly the 4 required routes).

## Issues Encountered
- Biome's formatter reflowed line-wrapping in `scripts/measure-cwv.mjs` twice during execution (after Task 2's additions, and confirmed clean after Task 3) — pure formatting, no logic changes, applied via `biome check --write` and re-verified with `node --check` + acceptance-criteria greps + `npx tsc --noEmit` + targeted vitest after each pass. No regression.
- Mid-plan `npx biome check` warnings (unused imports/functions like `median`, `provision`, `launchBrowser`, `runMeasurements`) appeared transiently after Tasks 1 and 2 — this is inherent to the plan's explicit 3-task split (Task 1's `<action>` states "Do NOT add the Lighthouse loop or report writing yet — Tasks 2 and 3"), and every warning resolved naturally as the corresponding wiring landed in the following task. Final state after Task 3 is zero biome warnings.

## User Setup Required

None for this plan's code-completeness gate. The plan's frontmatter documents a `user_setup` block for `DATABASE_URL` (Neon dashboard connection string, same env as Phase 15) — this is required to actually RUN `npm run measure:cwv`, but that live run is explicitly Plan 03's responsibility (Wave 3), not this plan's. This plan's own `<verification>` deliberately excludes running the harness against prod, so no environment variable needed to be configured to satisfy this plan's gate.

## Next Phase Readiness
- `scripts/measure-cwv.mjs` is fully wired and syntax/lint/type clean, ready for Plan 03 to invoke `npm run measure:cwv` (with `DATABASE_URL` set and a fresh `npm run build` for bundle-stats freshness) to produce the actual immutable v3.0 performance baseline
- All plan-level `<verification>` items pass: `node --check` clean, npm scripts guard passes with existing `qa:*` scripts intact, full `npx vitest run` remains green at 119/120 files / 2099/2105 tests (identical to Plan 01's baseline — zero collection regression from the new harness's top-level `DATABASE_URL` guard), `tsc --noEmit` clean, scoped `npx biome ci scripts/measure-cwv.mjs package.json` zero errors/warnings
- No blockers. The only remaining prerequisite before Plan 03 can execute a live run is the `DATABASE_URL` env var (Neon dashboard, same prod-shared DB as Phase 15) documented in this plan's `user_setup` frontmatter — a manual credential-provisioning step, not a code gap

---
*Phase: 16-performance-baseline-measure*
*Completed: 2026-07-01*

## Self-Check: PASSED

- FOUND: scripts/measure-cwv.mjs
- FOUND: commit 1db1488 (Task 1)
- FOUND: commit f75e4b3 (Task 2)
- FOUND: commit 217c327 (Task 3)
- Re-ran all `<acceptance_criteria>` from all 3 tasks: PASS (with the 2 documented grep-heuristic false positives noted above — neither is a real violation of the underlying requirement)
- Re-ran plan-level `<verification>`: `node --check` PASS; npm-scripts guard PASS; full `npx vitest run` 119/120 files / 2099/2105 tests (matches Plan-01 baseline, zero regression); `npx tsc --noEmit` clean; scoped `npx biome ci scripts/measure-cwv.mjs package.json` zero errors/warnings
- Confirmed zero new npm dependencies via `git diff` across all 3 commits touching `package.json`
- Confirmed all 5 plan-level `<success_criteria>` satisfied (file exists+clean+correct imports; exact 4x2xn=6 matrix with redirect guard; reports written to correct baseline/ dir via atomic writes with bundle read local-only; finally-cleanup + both npm scripts; zero new packages)
