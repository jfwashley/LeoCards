# Phase 18 Baseline — Fresh Post-26/27 Warm-Prod Measurement

**Date:** 2026-07-25 (measured 12:10–12:16 UTC)
**Harness:** `scripts/measure-cwv.mjs` (Lighthouse 13.3.0, puppeteer-core 24.43.1) — unchanged from Phase 16/17, run route-by-route via `ROUTE_FILTER` + `PHASE_OUT_DIR=".planning/phases/18-field-validation-guardrails/baseline"` (D-10)
**Target:** `https://leocards.vercel.app` (warm prod), 4 key routes × mobile + desktop
**Runs:** 6 per route × preset; run 1 discarded (cold Vercel hit); median of runs 2–6 (D-06 methodology, unchanged)
**Auth:** fresh `*@test.local` provisioned user per route, deck + 5 cards, self-cleaned after each run

## Deployment Freshness Gate (Task 1 — PASSED)

Per the plan's Task 1 blocking gate (T-18-05 mitigation), deployment freshness was verified before this baseline ran:

- `origin/main` == `fda0b54` (pushed 2026-07-25 with Josh's authorisation; includes all Phase 26/27 optimization code + the 18-01 SpeedInsights mount).
- Live prod confirmed serving that exact commit: `https://leocards.vercel.app` returns the Speed Insights loader script at the hashed path `/1c7feed240cb2d93/script.js` (content contains `speed-insights`/`vitals` markers) — that loader only exists in commit `fda0b54`, so live prod == `origin/main` HEAD.
- The stale 2026-07-15 "Deploy HELD" build (pre-26/27) is confirmed gone.

**Gate verdict: PASSED.** This baseline certifies the deployed Phase 26/27 code, not stale pre-optimization numbers.

## Cross-Route Summary (mobile is the binding gate basis, D-08)

| Route | Mobile LCP (ms) | Mobile TBT (ms) | Mobile CLS | Mobile Perf | Desktop Perf | Bundle KB | Top Class |
|-------|------------------|------------------|------------|--------------|---------------|-----------|-----------|
| /dashboard | 1964.4 | 52.0 | 0 | 99 | 91 | 701 | bundle |
| /study | 1650.6 | 59.0 | 0 | 99 | 93 | 651 | bundle |
| /deck/new-card | 1662.2 | 70.8 | 0 | 100 | 93 | 776 | bundle |
| /deck/browse | 1755.4 | 91.8 | 0 | 99 | 92 | 530 | bundle |

**Absolute gates (D-09):** LCP ≤2500ms, TBT ≤200ms, CLS ≤0.1, Perf ≥90 (mobile medians).

**All four routes PASS every absolute gate at this fresh baseline.** No route requires a D-11 accepted-miss exception.

## D-11 Exceptions

**None — all routes pass their absolute gates at this fresh baseline.**

The candidate exception route from CONTEXT.md D-11 (`/deck/new-card`, last measured 338ms TBT pre-26/27, accepted-miss under Phase 17 D-04) now measures **70.8ms TBT** — well inside the ≤200ms absolute gate. The Phase 26/27 optimizations (db.batch write consolidation, image resize, zod/mini bundle diet, PERF-12..23 batch) resolved the prior accepted-miss outright; no exception gate needed. `18-baseline-thresholds.json` records an empty `exceptions: {}` for every route.

## Comparison vs Phase 16 Immutable Baseline (pre-Phase-17-through-27 optimization)

| Route | P16 Mobile Perf → P18 Mobile Perf | P16 Bundle KB → P18 Bundle KB |
|-------|-------------------------------------|-------------------------------|
| /dashboard | 86 → 99 (+13) | 887 → 701 (−186 KB) |
| /study | 82 → 99 (+17) | 657 → 651 (−6 KB) |
| /deck/new-card | 79 → 100 (+21) | 1111 → 776 (−335 KB) |
| /deck/browse | 84 → 99 (+15) | 526 → 530 (+4 KB, negligible) |

Every route improved in mobile Perf score; three of four routes shipped meaningfully smaller first-load bundles (the fourth, `/deck/browse`, is flat within noise). This is consistent with the Phase 26/27 optimization batch (batched DB writes, consolidated queries, client-side image downscaling, zod/mini bundle diet, cached session helper, React.memo/useDeferredValue on CardList, LRU translation cache, Haiku model swap) and is NOT the stale pre-26/27 Phase 17 picture — the freshness sanity check (Pitfall 1) is satisfied: `/deck/new-card`'s TBT dropped from the Phase 17 exact accepted-miss value (338ms) to 70.8ms, not an identical/near-identical number.

## Threshold Table

See `18-baseline-thresholds.json` — machine-readable table for the Plan 04 re-cert orchestrator: `driftPct: 15` (D-09) plus, per route, the mobile baseline `medians` (for drift-warning comparison) and the default absolute `gates` (LCP≤2500 / TBT≤200 / CLS≤0.1 / Perf≥90). `exceptions` is an empty object for every route (no D-11 accepted-miss needed at this baseline).

## Artifact Discipline

Per the Phase 16 artifact discipline (immutable, dated, never re-edited): the `baseline/` directory (4× `*-baseline.md`, 4× `*-mobile-runs.json`, 4× `*-desktop-runs.json`, `16-BASELINE-SUMMARY.md` cross-route table — filename inherited from the renderer, not phase-derived, same as Phase 17's precedent), this `18-BASELINE-SUMMARY.md`, and `18-baseline-thresholds.json` are committed together as a single immutable set once approved, and are never edited again. Future drift-warning comparisons and any future D-11 exception derivations read from this locked record.

---

*Phase: 18-field-validation-guardrails*
*Measured: 2026-07-25*
