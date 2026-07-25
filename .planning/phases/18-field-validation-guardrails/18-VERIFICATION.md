---
phase: 18-field-validation-guardrails
verified: 2026-07-25T14:45:00Z
status: human_needed
score: 5/6 must-haves verified (1 designed wait, not a gap)
overrides_applied: 0
human_verification:
  - test: "After 2026-08-08 (14-day D-03 Speed Insights window close), run Plan 18-06: read per-route field p75 (LCP/INP/CLS) off the Vercel Speed Insights dashboard and write 18-FIELD-COMPARISON.md comparing against the CWV Good band."
    expected: "18-FIELD-COMPARISON.md exists, documents field p75 vs Good band per route (or explicit variance/insufficient-data explanation), closing PERF-05 and Phase 18/v3.0."
    why_human: "Requires live Vercel Speed Insights dashboard access (no API on Hobby tier) and cannot execute before the time-boxed 14-day window elapses (window opened 2026-07-25, closes on/after 2026-08-08). This is the designed D-03 checkpoint/wait plan, not an executable gap."
---

# Phase 18: Field validation & guardrails Verification Report

**Phase Goal:** Real-user data confirms the lab wins, and a permanent one-command gate prevents perf regressions from shipping.
**Verified:** 2026-07-25
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Sourced from ROADMAP.md Success Criteria (§Phase 18) merged with PLAN frontmatter must_haves across 18-01..18-06.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `<SpeedInsights />` renders on every route; package installed + legitimacy-verified; prod deployed on main HEAD with Speed Insights enabled; D-03 window has a recorded start date | VERIFIED | `src/app/layout.tsx` imports `SpeedInsights` from `@vercel/speed-insights/next` and renders it as a sibling after `{children}` inside `<body>` (no other lines changed). `package.json` lists `"@vercel/speed-insights": "^2.0.0"`; `npm ls @vercel/speed-insights` resolves 2.0.0. 18-01-SUMMARY.md records window start 2026-07-25, prod SHA `fda0b54` == `origin/main` at the time, and a firing `/_vercel/speed-insights/*` beacon. |
| 2 | `evaluateGates`/`deriveExceptionGate` correctly classify pass/fail/drift/exception cases, pure and unit-tested (D-13-1) | VERIFIED | Both functions exported from `scripts/measure-cwv-lib.mjs` (confirmed via grep and direct read, lines 293-372). `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` — 49/49 passed (includes post-review-fix regression cases for CLS-scale exceptions and zero-baseline drift, WR-04/WR-05). No `process.env`/`process.exit`/`fetch(`/top-level `await` in the new code. |
| 3 | A fresh 4-route × mobile+desktop warm-prod baseline exists, reflects Phase 26/27 code, and a machine-readable threshold table exists | VERIFIED | `.planning/phases/18-field-validation-guardrails/baseline/` contains 4×`*-baseline.md`, 4×`*-mobile-runs.json`, 4×`*-desktop-runs.json`, plus the cross-route `16-BASELINE-SUMMARY.md`. `18-baseline-thresholds.json` parses as valid JSON with `driftPct: 15` and a `routes` object with all 4 key routes, each holding `medians`/`gates`/`exceptions`. `/deck/new-card` TBT dropped from the pre-26/27 338ms to 70.8ms, confirming freshness (Pitfall 1 sanity check). All routes pass every absolute gate; `exceptions: {}` for all (documented as an explicit no-exception-needed signal). |
| 4 | One command (`npm run perf:recert`) runs the CWV half + nav-gate half, prints one PASS/FAIL/WARN table, exits non-zero on hard-fail / zero on pass, writes a dated report even on failure, never imports the env-guarded harness modules, validates env overrides fail-loud | VERIFIED | `scripts/perf-recert.mjs` exists; `node --check` clean; `"perf:recert": "node scripts/perf-recert.mjs"` in `package.json`. Confirmed via read: spawns `measure-cwv.mjs` via `spawnSync` (never imported), imports `evaluateGates`/`resolveRoutes` (pure lib) from `measure-cwv-lib.mjs`, validates `GATE_*` overrides and baseline-threshold shape with `Number.isFinite` before any measurement (WR-01 fix present), refuses an empty `baseline.routes` (WR-02 fix present), uses a second-granularity `runId` (`formatRunId` — WR-03 fix confirmed via direct read, line 208 includes `ss`), spawns the nav-gate half sequentially with a port-3000 preflight + early-death detection (CR-01 fix present) and kills the server child. |
| 5 | The re-cert gate is demonstrated both green (healthy code passes) and red (impossible threshold fails loudly, non-zero exit, D-13-2), reports committed as evidence; D-15 cadence documented in AGENTS.md | VERIFIED | `measurements/recert-2026-07-25-1354.md` shows `Overall: PASSED`, per-route WARN/PASS rows (drift surfaced as WARN, never FAIL, confirming D-09), nav-gate PASS. `measurements/recert-2026-07-25-1405.md` shows `Overall: FAILED` with every route's TBT explicitly named as breaching the impossible `GATE_TBT=10` threshold, nav-gate independently PASS. No secrets (`DATABASE_URL`, tokens) found in either report via grep. `AGENTS.md` contains a "Performance re-cert gate" section documenting the D-15 cadence + D-14 local-only rule. |
| 6 (ROADMAP SC1 / PERF-05 closing) | Field p75 data confirms lab medians on key routes once traffic accrues, or variance is documented | NOT YET DUE — DESIGNED WAIT | `18-FIELD-COMPARISON.md` does not exist yet; Plan 18-06 is explicitly the D-03 checkpoint/wait plan and cannot execute before the 14-day Speed Insights window closes (opened 2026-07-25, closes on/after 2026-08-08 — today is within the window). STATE.md and ROADMAP.md both correctly reflect this as the sole remaining open item (`[ ] 18-06-PLAN.md`, `[ ] Phase 18` unchecked). This is a scheduled wait by design, not a gap in executed work — no gap-closure replanning is needed. |

**Score:** 5/6 truths verified; the 6th is not yet due per the phase's own time-boxed design (D-02/D-03).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/layout.tsx` | Root-layout Speed Insights mount | VERIFIED | `SpeedInsights` imported from `@vercel/speed-insights/next`, rendered once after `{children}` in `<body>`; no other lines changed. |
| `package.json` | `@vercel/speed-insights` dependency + `perf:recert` script | VERIFIED | Both present; `npm ls` resolves 2.0.0. |
| `scripts/measure-cwv-lib.mjs` | `evaluateGates` + `deriveExceptionGate` pure gate-evaluation functions | VERIFIED | Both exported, purity contract preserved, all 6 code-review fixes (WR-04, WR-05 relevant here) present in code. |
| `scripts/__tests__/measure-cwv-lib.test.ts` | Permanent D-13-1 regression tests | VERIFIED | `describe("evaluateGates")` present; 49/49 tests pass including boundary/regression cases added during the review fix pass. |
| `.planning/phases/18-field-validation-guardrails/baseline/` | Immutable fresh baseline | VERIFIED | 12 per-route files + cross-route summary present. |
| `18-baseline-thresholds.json` | Machine-readable threshold table | VERIFIED | Valid JSON, `driftPct` + 4-route `routes` object with `medians`/`gates`/`exceptions`. |
| `18-BASELINE-SUMMARY.md` | Human-readable baseline summary + D-11 section | VERIFIED | Present, includes explicit "no exception needed, all pass" statement. |
| `scripts/perf-recert.mjs` | Re-cert orchestrator | VERIFIED | Exists, `node --check` clean, composes both halves via spawn, never imports guarded modules. |
| `.planning/phases/18-field-validation-guardrails/measurements/` | Committed green + red reports | VERIFIED | Both `recert-2026-07-25-1354.*` (PASSED) and `recert-2026-07-25-1405.*` (FAILED) present and committed, no secrets embedded. |
| `AGENTS.md` | D-15 cadence documented | VERIFIED | "Performance re-cert gate" section present, references `perf:recert`. |
| `.planning/phases/18-field-validation-guardrails/18-FIELD-COMPARISON.md` | PERF-05 field-vs-Good-band comparison doc | MISSING (by design) | Cannot exist until the 14-day D-03 window closes on/after 2026-08-08; Plan 18-06 not yet run. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/app/layout.tsx` | `@vercel/speed-insights/next` | Import + render inside `<body>` | WIRED | Confirmed by direct read of the file. |
| `scripts/__tests__/measure-cwv-lib.test.ts` | `scripts/measure-cwv-lib.mjs` | Named import of `evaluateGates`/`deriveExceptionGate` | WIRED | Test file imports and exercises both; all pass. |
| `scripts/perf-recert.mjs` | `scripts/measure-cwv.mjs` | `spawnSync` child process (never import) | WIRED | Confirmed via grep — no `import ... from "./measure-cwv.mjs"`; `spawnSync` present. |
| `scripts/perf-recert.mjs` | `scripts/measure-cwv-lib.mjs` | `import { evaluateGates, resolveRoutes }` | WIRED | Confirmed present in source. |
| `scripts/perf-recert.mjs` | `e2e/13-perf.spec.ts` | spawn playwright with `PERF_PROD_BUILD=1` | WIRED | Confirmed `PERF_PROD_BUILD` and `instant-nav` grep both present. |
| `scripts/perf-recert.mjs` | `measurements/` | dated report writes on green + red runs | WIRED | Both dated reports exist and were written by real invocations, not hand-authored (per 18-05-SUMMARY.md and matching timestamps/content). |

### Code Review Fix Verification

18-REVIEW.md found 1 Critical + 5 Warnings (+ 7 Info) after the live green/red demo evidence was generated. All 6 fix commits were independently verified present in the current code (not just claimed in the review's `Status:` lines):

| Finding | Fix Commit | Verified in Code |
|---------|-----------|-------------------|
| CR-01 (nav-gate can certify wrong server) | `feb683c` | `alreadyUp` preflight fetch + `serverExited` early-death detection present (lines 414-463). |
| WR-01 (baseline shape never validated) | `0a18f4d` | `resolveRoutes(null)` + `Number.isFinite` per-route/per-key validation present (lines 602-623). |
| WR-02 (empty routes → vacuous PASS) | `f725550` | `Object.keys(baseline.routes).length === 0` guard present (line 594). |
| WR-03 (minute-granularity runId collision) | `558710b` | `formatRunId` includes seconds (`ss`, line 208-209). |
| WR-04 (CLS-scale exception gate rounds to 0) | `db36658` | Precision-aware rounding (`raw >= 1 ? Math.round(raw) : Math.round(raw*1000)/1000`) present, line 371. |
| WR-05 (CLS drift dead on arrival) | `29a1619` | `before === 0 && after > 0` zero-baseline warn branch present, lines 327-336. |

`npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` → **49/49 passed** (up from 43 at Plan 02 completion — 6 new regression cases from the fix pass, consistent with IN-07's "partially addressed" note). `node --check` clean on both `perf-recert.mjs` and `measure-cwv-lib.mjs`. `npx tsc --noEmit` clean repo-wide.

The green/red demo evidence in `measurements/` predates these fixes (per the task brief) — the fixes changed gate-evaluation edge-case correctness (CLS handling, malformed-input hardening, server-identity trust) but did not alter the exit-code/report-writing plumbing the demo evidence exercises, so the committed green/red reports remain valid evidence of that plumbing.

Remaining open findings (IN-01 through IN-07, all Info-level per the review's own severity, one partially addressed): none block the phase goal — they are hardening opportunities (POSIX process-group kill, fetch timeout, `ROUTE_FILTER` env leak, tri-state spawn status, drift-loop scope, dual-project nav runs, remaining boundary-case tests) rather than defects in already-demonstrated behavior.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PERF-05 | 18-01 (setup), 18-06 (closes) | Field p75 data confirms lab medians once traffic accrues, or variance documented | PARTIAL — setup complete, closing evidence pending | Field-data collection is live and correctly wired (18-01 truths all verified). The closing artifact (`18-FIELD-COMPARISON.md`) cannot exist yet — blocked on the 14-day window by design (D-02/D-03), not a gap. |
| PERF-06 | 18-02, 18-03, 18-04, 18-05 | Single-command re-cert gate, runnable on demand | SATISFIED | All 4 supporting plans verified in code: pure gate evaluator (tested), immutable baseline + threshold table, orchestrator composing both harnesses via spawn, and a real green + real red demonstration, both committed as evidence. Code review found and the executor fixed 1 Critical + 5 Warning correctness gaps; all 6 fixes confirmed present and tests still green. |

**Note on REQUIREMENTS.md:** `.planning/REQUIREMENTS.md` currently marks `PERF-05` as `[x]` complete and its traceability row as "Complete" for Phase 18. This is inconsistent with the phase's own `STATE.md`/`ROADMAP.md` (which correctly show Phase 18 and 18-06 as unchecked/in-progress pending the field window). This is a documentation-accuracy discrepancy worth correcting when 18-06 lands — it is not a code/artifact gap and does not affect this verification's status determination.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` across all phase-modified files (`scripts/perf-recert.mjs`, `scripts/measure-cwv-lib.mjs`, `src/app/layout.tsx`, `AGENTS.md`) returned no matches. No secrets found embedded in committed measurement reports.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Gate-evaluation unit suite passes post-fix | `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` | 49/49 passed | PASS |
| perf-recert.mjs syntax valid | `node --check scripts/perf-recert.mjs` | clean | PASS |
| measure-cwv-lib.mjs syntax valid | `node --check scripts/measure-cwv-lib.mjs` | clean | PASS |
| Repo-wide type-check clean | `npx tsc --noEmit` | clean | PASS |
| Speed Insights package resolves at 2.x | `npm ls @vercel/speed-insights` | `@vercel/speed-insights@2.0.0` | PASS |

Live end-to-end re-invocation of `npm run perf:recert` (real ~35-40min prod + local-build run) was NOT re-run by this verifier — the committed green/red reports from 18-05, combined with the confirmed-present code fixes and a clean unit-test/type-check/syntax pass, are accepted as sufficient evidence per the task brief's explicit guidance that the fixes did not alter the exit-code/report-writing plumbing already demonstrated.

### Human Verification Required

### 1. Plan 18-06 — Field p75 vs Good-band comparison (closes PERF-05)

**Test:** After 2026-08-08 (14 days from the 2026-07-25 window start), open the Vercel Speed Insights dashboard for LeoCards and read per-route p75 (LCP/INP/CLS) for `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse`; then run Plan 18-06 to write `18-FIELD-COMPARISON.md`.
**Expected:** The doc exists, tables field p75 against the CWV Good band per route (IN-GOOD/OUTSIDE-GOOD), explains any misses or thin data, and explicitly closes PERF-05 (confirmed-in-field or variance-documented).
**Why human:** Requires live Vercel dashboard access (no Hobby-tier API) and cannot run before the time-boxed window elapses — this is the designed D-03 checkpoint/wait, not a code-verifiable item.

### Gaps Summary

No executable gaps. Plans 18-01 through 18-05 (5 of 6) are fully implemented, verified in the codebase (not just claimed in SUMMARY.md), and the post-execution code review's 1 Critical + 5 Warning findings were fixed and independently re-verified in this pass — all 6 fix commits are present in the code, the unit suite is green (49/49), syntax checks and `tsc` are clean, and no debt markers or embedded secrets were found. PERF-06 (the guardrail requirement) is fully satisfied. PERF-05 is satisfied at the setup/wiring level; its evidence-closing deliverable (Plan 18-06 / `18-FIELD-COMPARISON.md`) is a scheduled wait that cannot execute before 2026-08-08, per the phase's own explicit design (D-02/D-03) — this is not a gap requiring `/gsd:plan-phase --gaps` closure work, just a wait for Josh's return after the window closes.

One documentation-accuracy note (non-blocking): `.planning/REQUIREMENTS.md` marks PERF-05 as already "Complete," which is ahead of the phase's own tracked state (STATE.md/ROADMAP.md correctly show Phase 18 in-progress). Worth a small correction pass when 18-06 actually lands.

---

*Verified: 2026-07-25*
*Verifier: Claude (gsd-verifier)*
