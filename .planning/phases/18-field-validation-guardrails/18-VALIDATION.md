---
phase: 18
slug: field-validation-guardrails
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-24
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit, `scripts/__tests__/`) + Playwright (e2e) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~60 seconds (unit) / minutes (e2e + CWV harness, prod-build-gated) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts`
- **After every plan wave:** Run full unit suite
- **Before `/gsd:verify-work`:** Full `npm run perf:recert` end-to-end (real prod + local prod build) must be green
- **Max feedback latency:** 120 seconds (unit); the CWV/nav live runs are sampled once per wave, not per commit

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-T1 | 01 | 1 | PERF-05 | T-18-SC | Package legitimacy verified before install (blocking-human, non-auto-approvable) | manual/checkpoint | (human npmjs.com verify) | ⬜ | ⬜ pending |
| 18-01-T2 | 01 | 1 | PERF-05 | T-18-01 | SpeedInsights via `/next` entry only; additive-only layout edit | unit/smoke | `npx tsc --noEmit && grep @vercel/speed-insights/next src/app/layout.tsx` | ✅ | ⬜ pending |
| 18-01-T3 | 01 | 1 | PERF-05 | T-18-02 | Deploy freshness (SHA==main HEAD) + dashboard enable; no secrets in dashboard steps | manual/checkpoint | (Vercel dashboard + beacon check) | ⬜ | ⬜ pending |
| 18-02-T1 | 02 | 1 | PERF-06 | T-18-03a | Pure gate logic; NaN-guarded exception derivation; drift never hard-fails | unit (TDD) | `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` | ❌→✅ Wave 0 | ⬜ pending |
| 18-03-T1 | 03 | 2 | PERF-06 | T-18-05 | Deployment-freshness gate before baseline (anti-stale-provenance) | manual/checkpoint | (Vercel SHA == `git rev-parse origin/main`) | ⬜ | ⬜ pending |
| 18-03-T2 | 03 | 2 | PERF-06 | T-18-02b | Baseline run; DATABASE_URL via env only, never logged | integration/harness | `node -e` threshold-json parse + `ls baseline/*-mobile-runs.json` | ❌ (artifacts new) | ⬜ pending |
| 18-03-T3 | 03 | 2 | PERF-06 | T-18-06 | Human-verify numbers reflect 26/27; commit immutable | manual/checkpoint | (human sanity-check vs Phase 16 summary) | ⬜ | ⬜ pending |
| 18-04-T1 | 04 | 3 | PERF-06 | T-18-03b | Env-override `Number.isFinite` fail-loud; never imports qa-lib/measure-cwv | unit/smoke | `node --check scripts/perf-recert.mjs` + grep guards + vitest | ❌ (script new) | ⬜ pending |
| 18-04-T2 | 04 | 3 | PERF-06 | T-18-07 | Nav-gate server killed in `finally`; sequential halves; no leaked port | unit/smoke | `node --check` + grep PERF_PROD_BUILD/instant-nav/perf:recert + vitest | ❌ (script new) | ⬜ pending |
| 18-05-T1 | 05 | 4 | PERF-06 | T-18-02d | Green run; no secrets in committed report | integration/live | `ls measurements/recert-*.md` (+ human-check exit 0) | ❌ (evidence new) | ⬜ pending |
| 18-05-T2 | 05 | 4 | PERF-06 | T-18-09 | Red-path demo exits non-zero (D-13-2); FAILED report committed; cadence doc | integration/live | `grep -i perf:recert AGENTS.md` + `ls measurements/recert-*.md` (+ human-check non-zero exit) | ❌ (evidence new) | ⬜ pending |
| 18-06-T1 | 06 | 5 | PERF-05 | T-18-11 | 14-day window elapsed; harness-inflation noted, not misattributed | manual/checkpoint | (Vercel Speed Insights p75 read) | ⬜ | ⬜ pending |
| 18-06-T2 | 06 | 5 | PERF-05 | T-18-10 | Field-vs-Good-band doc; INP↔TBT mapping; no secrets/PII | doc/smoke | `grep -i "INP\|PERF-05" 18-FIELD-COMPARISON.md` | ❌ (doc new) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/__tests__/measure-cwv-lib.test.ts` — extend with `evaluateGates`/`deriveExceptionGate` cases (all-pass, single-metric-fail ×4, D-11 exception-gate pass, D-09 drift-warning-without-failure, null-baseline, deriveExceptionGate value + throw). Created in Plan 02 (TDD) before the orchestrator (Plan 04) consumes the functions.
- Existing infrastructure (vitest + `scripts/__tests__/` + Playwright `e2e/13-perf.spec.ts`) covers the rest; the D-13-1 gate-evaluator tests extend the existing `measure-cwv-lib` test file pattern; the nav gate is invoked as-is.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Package legitimacy gate (`@vercel/speed-insights`) | PERF-05 | slopcheck unavailable; [ASSUMED] package must be human-verified before install | Verify publisher/version/source/no-postinstall on npmjs.com; approve before install (18-01 T1) |
| Vercel dashboard Speed Insights toggle + deploy freshness | PERF-05 | External SaaS dashboard + Josh-controlled deploy | Josh enables Speed Insights, confirms prod SHA == main HEAD, confirms beacon fires, records window start (18-01 T3) |
| Deployment-freshness re-check before baseline | PERF-06 | Vercel "Current Deployment" SHA is a dashboard read | Confirm SHA == `git rev-parse origin/main` before the baseline run (18-03 T1) |
| Baseline reflects 26/27 + immutable commit | PERF-06 | Human sanity-check of numbers vs Phase 16 | Approve numbers look post-26/27, then commit immutable (18-03 T3) |
| Live green + red re-cert demo against prod | PERF-06 | Requires real ~35-40 min prod run + local prod build | Green run exits 0; red run (`GATE_TBT=10`) prints red table + non-zero exit; commit both reports (18-05) |
| Speed Insights per-route p75 readout after 14-day window | PERF-05 | External SaaS dashboard, no Hobby-tier API | Josh reads per-route p75 (Route vs Path view) after the window (18-06 T1) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify, a `<human-check>`, or Wave 0 / checkpoint dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (checkpoints interleave with automated tasks)
- [x] Wave 0 covers all MISSING references (evaluateGates/deriveExceptionGate created in Plan 02 before Plan 04 consumes them)
- [x] No watch-mode flags
- [x] Feedback latency < 120s for the unit tier; live runs sampled per-wave/phase-gate
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-complete (2026-07-24)
