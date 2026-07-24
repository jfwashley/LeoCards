---
phase: 18-field-validation-guardrails
plan: 02
subsystem: testing
tags: [vitest, tdd, perf-gate, ci-free-guardrail]

# Dependency graph
requires:
  - phase: 16-performance-baseline-measure
    provides: computeMedians / classifyBottleneck / getBundleKb pure-lib pattern that this plan extends
  - phase: 17-performance-optimization
    provides: resolveRoutes / resolveOutDir pure-lib precedent (D-09 route-scoped measurement)
provides:
  - "evaluateGates(medians, thresholds, baseline, driftPct=15) — absolute hard-fail + D-09 drift-warning gate evaluator"
  - "deriveExceptionGate(median, headroomPct=15) — D-11 auto-derived accepted-miss gate calculator"
  - "describe(\"evaluateGates\")/describe(\"deriveExceptionGate\") — permanent D-13-1 regression tests of the gate logic"
affects: [18-04 (perf-recert.mjs orchestrator, consumes both exports directly)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gate-evaluation logic lives in the pure lib layer (scripts/measure-cwv-lib.mjs), never in the side-effectful orchestrator, so vitest can exercise pass/fail/warn/exception branches with zero live DATABASE_URL or network access"

key-files:
  created: []
  modified:
    - scripts/measure-cwv-lib.mjs
    - scripts/__tests__/measure-cwv-lib.test.ts

key-decisions:
  - "Followed the plan's RED->GREEN TDD gate exactly: committed the 12 failing tests first (test(18-02)), confirmed failure via a real vitest run, then implemented both functions (feat(18-02)) and confirmed all 43 tests green. No REFACTOR commit needed — the GREEN implementation matched the PATTERNS.md draft cleanly with no cleanup required."

patterns-established:
  - "Pattern: any future gate-evaluation function (e.g. a hypothetical field-data comparator) belongs in measure-cwv-lib.mjs alongside evaluateGates/deriveExceptionGate, not in the orchestrator, to preserve D-13-1 unit-testability."

requirements-completed: [PERF-06]

# Metrics
duration: 5min
completed: 2026-07-24
---

# Phase 18 Plan 02: Gate Evaluator (evaluateGates + deriveExceptionGate) Summary

**Pure `evaluateGates`/`deriveExceptionGate` gate-evaluation layer added to `scripts/measure-cwv-lib.mjs`, TDD'd with 12 new vitest cases covering absolute hard-fail, D-09 drift-warning-without-failure, D-11 exception-gate-pass, and fail-loud non-finite-median guards.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-24T22:23:43+01:00 (prior commit) / test authoring began immediately after
- **Completed:** 2026-07-24T22:27:47+01:00
- **Tasks:** 1 (TDD task, RED + GREEN; no REFACTOR needed)
- **Files modified:** 2

## Accomplishments
- `evaluateGates(medians, thresholds, baseline, driftPct=15)` — hard-fails on lcp/tbt/cls/score absolute gate breaches; emits a drift WARNING (never a hardFail) when a metric is >15% worse than a locked baseline but still under the absolute gate; no-op (no warnings, no throw) on a null baseline (first-run path)
- `deriveExceptionGate(median, headroomPct=15)` — `Math.round(median * (1 + headroomPct/100))`, throwing an actionable error on a non-finite median (mirrors `getBundleKb`'s fail-loud pattern)
- Full D-13-1 regression coverage: all-pass, one single-metric-fail case per metric (LCP/TBT/CLS/Perf), D-11 exception-gate-pass, D-09 drift-warning-without-failure, null-baseline no-throw, deriveExceptionGate headroom math + default arg + two non-finite-input throw cases (NaN, undefined)
- Purity contract preserved: grepped the new code region for `process.env`/`process.exit`/`fetch(`/top-level `await` — zero actual usages (only the doc-comment restates the contract)

## Task Commits

Each task was committed atomically (TDD flow — 2 commits for the single task):

1. **Task 1 RED: failing tests for evaluateGates + deriveExceptionGate** - `d30e249` (test)
2. **Task 1 GREEN: implement evaluateGates + deriveExceptionGate** - `907698a` (feat)

_No REFACTOR commit — GREEN implementation required no cleanup; tests stayed green throughout._

## Files Created/Modified
- `scripts/measure-cwv-lib.mjs` - added `evaluateGates` + `deriveExceptionGate` pure functions, alongside the existing `classifyBottleneck`/`getBundleKb`
- `scripts/__tests__/measure-cwv-lib.test.ts` - added `evaluateGates`/`deriveExceptionGate` to the named-import list; added `describe("evaluateGates")` (7 cases) and `describe("deriveExceptionGate")` (4 cases)

## Decisions Made
- Followed the plan's RED->GREEN TDD gate exactly: committed 12 failing tests first, confirmed real vitest failure (12 failed / 31 passed), then implemented both functions and confirmed all 43 tests green. No REFACTOR commit needed.

## Deviations from Plan

None - plan executed exactly as written. One incidental biome auto-format fix (a multi-line `expect(...).toThrow(...)` call collapsed to biome's preferred single-line form in the new `deriveExceptionGate` non-finite-undefined test) was folded into the GREEN commit per the project's scoped-biome-then-full-tsc convention (AGENTS.md) — not a logic change, no separate deviation entry warranted.

## TDD Gate Compliance

RED gate: `d30e249` (`test(18-02): add failing tests for evaluateGates + deriveExceptionGate`) — verified via a real `npx vitest run` showing 12 failed / 31 passed before any implementation existed.
GREEN gate: `907698a` (`feat(18-02): add evaluateGates + deriveExceptionGate pure gate-evaluation layer`) — verified via a real `npx vitest run` showing 43/43 passed.
REFACTOR gate: not applicable — no refactor commit needed.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `evaluateGates`/`deriveExceptionGate` are ready for Plan 04's `perf-recert.mjs` orchestrator to import and call after computing medians.
- Full `npx tsc --noEmit` clean; scoped `npx biome check` clean on both touched files; full `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` green (43/43).
- No blockers for Plan 03/04.

---
*Phase: 18-field-validation-guardrails*
*Completed: 2026-07-24*
