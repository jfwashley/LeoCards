---
phase: 18-field-validation-guardrails
plan: 04
subsystem: testing
tags: [perf, lighthouse, playwright, cwv, gate-evaluation, child-process, node]

# Dependency graph
requires:
  - phase: 18-field-validation-guardrails (Plan 02)
    provides: evaluateGates()/deriveExceptionGate() pure gate-evaluation layer in scripts/measure-cwv-lib.mjs
  - phase: 18-field-validation-guardrails (Plan 03)
    provides: immutable 18-baseline-thresholds.json (fresh 26/27-code medians + gates, zero D-11 exceptions)
provides:
  - scripts/perf-recert.mjs — the single-command re-cert orchestrator (PERF-06)
  - "perf:recert" npm script
affects: [18-05 (red-path demo), 18-06 (phase close-out / field-vs-lab comparison)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "spawnSync/spawn child-process composition — never import a module with a top-level env-exit guard (measure-cwv.mjs, qa-lib.mjs)"
    - "write-to-.tmp-then-rename atomic report writes (mirrors measure-cwv.mjs's writeJsonAtomic/writeTextAtomic)"
    - "fail-loud env-override validation (Number.isFinite) executed BEFORE any expensive work runs"
    - "server-lifecycle management (build/start/poll/kill-in-finally) for a Playwright config with webServer: undefined"

key-files:
  created:
    - scripts/perf-recert.mjs
  modified:
    - package.json

key-decisions:
  - "Threshold overlay order is route gates -> D-11 exceptions -> GATE_* env overrides (env wins last), so the red-path demo (Plan 05) can force a failure on any route, including one that already carries an accepted-miss exception"
  - "GATE_* env-override validation runs once, up front, against every route in the baseline table — before the CWV half spawns measure-cwv.mjs or the nav-gate half builds anything — so a malformed override aborts before any time is spent"
  - "Nav-gate server child killed via Windows `taskkill /pid <pid> /t /f` (not a bare child.kill()) since `npm run start` wraps `next start` in a child of its own; a plain kill would only signal the npm wrapper and leak the real server on port 3000"
  - "CWV half and nav-gate half run strictly sequentially (no Promise.all) — mirrors measure-cwv.mjs's own 'never parallel, self-contention skews TBT' discipline and the D-06 ~35-40min serial budget"
  - "Desktop preset is read/reported only when --desktop is passed and is always informational (INFO status, never gates) — mobile stays the sole hard-gate basis per D-08"

patterns-established:
  - "Any future orchestrator composing measure-cwv.mjs or qa-lib.mjs must spawn them as children and read back their written JSON artifacts — never import them directly"

requirements-completed: [PERF-06]

# Metrics
duration: ~20min
completed: 2026-07-25
---

# Phase 18 Plan 04: Perf re-cert orchestrator (PERF-06) Summary

**`scripts/perf-recert.mjs` — one command runs the CWV gate-evaluation half (spawns measure-cwv.mjs, reads its JSON, evaluates via evaluateGates()) and the nav-gate half (local prod build + the existing 850ms instant-nav test), aggregates one PASS/FAIL/WARN table + one dated report, and exits non-zero on any hard-gate failure.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-25T13:20:00+01:00 (approx.)
- **Completed:** 2026-07-25T13:38:36+01:00
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- New `scripts/perf-recert.mjs` orchestrator composes the two existing harnesses via `spawnSync`/`spawn` child processes — never imports `measure-cwv.mjs` or `qa-lib.mjs` (both exit at module load without their required env vars)
- CWV half: spawns `measure-cwv.mjs` into a per-run output directory, reads back each route's `${slug}-mobile-runs.json` (and `-desktop-runs.json` when `--desktop` is passed), and evaluates every route against its resolved threshold via the Plan 02 pure lib's `evaluateGates()` — honoring D-11 exceptions and D-09 drift warnings
- `GATE_LCP`/`GATE_TBT`/`GATE_CLS`/`GATE_PERF` env overrides are validated `Number.isFinite()` and fail loud (exit 1, no measurement run) before any expensive work starts
- Nav-gate half: builds a local prod build, starts `next start`, polls until it responds, runs the existing `e2e/13-perf.spec.ts` instant-nav gate (850ms, D-12) under `PERF_PROD_BUILD=1`, then always kills the server child in a `finally` block
- Both halves land in one dated report (`measurements/recert-<YYYY-MM-DD>-<HHmm>.md` + sibling `.json`, D-07) and drive one process exit code; a failed run still writes its report marked FAILED
- `"perf:recert": "node scripts/perf-recert.mjs"` added to `package.json`, alongside `measure:cwv`

## Task Commits

1. **Task 1: CWV half — spawn measure-cwv, evaluate gates, write aggregate report + exit code** - `1dfab8a` (feat)
2. **Task 2: Nav-gate half + package script** - `8391bce` (feat)

## Files Created/Modified

- `scripts/perf-recert.mjs` - the re-cert orchestrator: header doc block (REQUIRED/OPTIONAL env, USAGE, D-15 cadence, SECURITY), env-override validation, CWV half, nav-gate half, atomic report writer, aggregate console table, exit-code logic
- `package.json` - added `"perf:recert": "node scripts/perf-recert.mjs"` next to `measure:cwv`

## Decisions Made

See `key-decisions` in frontmatter above — summarized: threshold overlay order (gates → D-11 exceptions → env overrides last), up-front env-override validation across all routes before any spawn, Windows `taskkill /t /f` for the nav-gate server child, strictly-sequential halves, and `--desktop` as informational-only.

## Deviations from Plan

**1. [Rule 1 — formatting] Ran scoped Biome format on the two touched files**
- **Found during:** post-Task-2 verification pass
- **Issue:** `npx biome check scripts/perf-recert.mjs package.json` flagged one formatting mismatch (a multi-line `spawnSync(...)` call that Biome's printer collapses differently)
- **Fix:** Ran `npx biome format --write scripts/perf-recert.mjs package.json` (scoped to touched files only, per AGENTS.md convention), then re-verified `node --check`, all acceptance-criteria greps, and `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` still pass
- **Files modified:** scripts/perf-recert.mjs (formatting only, no logic change)
- **Verification:** `npx biome check` clean; `npx tsc --noEmit` clean; all Task 2 grep/verify commands re-run green
- **Committed in:** `8391bce` (part of the Task 2 commit — the format pass landed before that commit was made)

---

**Total deviations:** 1 auto-fixed (formatting only)
**Impact on plan:** No scope creep — purely a whitespace/line-wrap normalization required by the project's own linter before commit.

## Issues Encountered

None. Per the execution brief, the full ~40-minute live pipeline (real `DATABASE_URL`, real `npm run build`/`next start`/Playwright run) was deliberately NOT executed in this session — Plan 05 owns that end-to-end live run. This plan's own acceptance criteria (`node --check`, the required `grep` guards, the malformed-`GATE_TBT`/`GATE_LCP`/`GATE_CLS` fail-loud checks, and the existing `measure-cwv-lib.test.ts` vitest suite) were all run directly and pass. Ran `npx tsc --noEmit` (clean) as an additional static check per this project's `AGENTS.md` convention (run full tsc after any Biome fix wave).

Static verification performed this session (all passing):
- `node --check scripts/perf-recert.mjs`
- `grep evaluateGates|spawnSync|Number.isFinite scripts/perf-recert.mjs` (Task 1)
- `grep -E 'from "\./(qa-lib|measure-cwv)\.mjs"' scripts/perf-recert.mjs` → no match (guard confirmed absent)
- `GATE_TBT=abc`, `GATE_LCP=notanumber`, `GATE_CLS=xyz` each individually run against the real script → each aborts loud, exit code 1, BEFORE any measurement/build runs, and leaves zero stray `measurements/` artifacts
- `grep PERF_PROD_BUILD|instant-nav|perf:recert scripts/perf-recert.mjs package.json` (Task 2)
- `grep finally|killProcessTree scripts/perf-recert.mjs` — confirms the server-kill-in-finally discipline
- No actual `Promise.all` usage around the two halves (only appears inside an explanatory code comment)
- `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` → 43/43 passed (unchanged — this plan does not touch that file)
- `npx tsc --noEmit` → clean
- `npx biome check` (scoped to the two touched files) → clean after one format pass

## User Setup Required

None - no external service configuration required. The next live invocation of `npm run perf:recert` (Plan 05's red-path demo, or any future on-demand re-cert per the D-15 cadence) requires a real `DATABASE_URL` in the environment, exactly as `measure-cwv.mjs` already requires — no new secret or dashboard setup introduced by this plan.

## Next Phase Readiness

- `scripts/perf-recert.mjs` + `perf:recert` are code-complete and statically verified; PERF-06 requirement text spans Plans 02-05, so it is NOT marked complete in REQUIREMENTS.md yet — only Plan 05's live red-path run (forcing a real hard-gate failure end-to-end) fully satisfies the requirement's "gate must actually gate" language
- Plan 05 can now run the full live pipeline: a real `DATABASE_URL` + `GATE_TBT=1 npm run perf:recert` (or similar) should force a CWV hard-fail and a non-zero exit code, proving the red path; a clean `DATABASE_URL npm run perf:recert` run should certify all 4 routes green plus the nav gate
- No blockers. The one open item for Plan 05/06 is exercising this script against live infrastructure (Neon DB, warm prod, a real local `next build`/`next start` cycle) — deliberately deferred out of this plan's scope per the execution brief

---
*Phase: 18-field-validation-guardrails*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: scripts/perf-recert.mjs
- FOUND: package.json
- FOUND: commit 1dfab8a
- FOUND: commit 8391bce
