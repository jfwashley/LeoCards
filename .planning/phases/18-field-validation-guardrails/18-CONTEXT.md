# Phase 18: Field validation & guardrails - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-user (field) p75 data confirms the lab wins on the four key routes — `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse` — or the variance is documented (PERF-05); and a permanent one-command gate re-certifies all perf gates on demand before any release, failing loudly (demonstrated, not assumed) when any route regresses (PERF-06). This is the v3.0 finisher: it deliberately runs last so the gate locks in the Phase 26/27 optimized numbers as the regression baseline. v3.0 does not close until this phase ships.

**NOT this phase:** new performance optimization work (Phases 17/26/27 are done — if the fresh baseline surfaces a regression, that's a finding to document/triage, not an invitation to optimize); CI/GitHub Actions integration (deferred); `/habitat` gating (stays outside the key-route gate set per Phase 16 D-03); native mobile packaging (Phase 28).

</domain>

<decisions>
## Implementation Decisions

### Field data (PERF-05)
- **D-01:** **Source = Vercel Speed Insights.** Add `@vercel/speed-insights` (one component in the root layout) + enable in the Vercel dashboard (Josh does the dashboard toggle). No self-hosted web-vitals pipeline, no CrUX dependency (traffic will never qualify). Hobby-tier sampling limits accepted.
- **D-02:** **Acceptance bar = time-boxed check, not traffic-gated.** Wire Speed Insights early in the phase, use the app normally for the window, then write the comparison doc against whatever data accrued. Thin/no data → documented as the variance explanation; the requirement closes either way. The phase never blocks waiting for traffic.
- **D-03:** **Window = 14 days** from the Speed Insights deploy. The PERF-06 gate is built during the window (no dead time); the comparison doc is the final plan. Phase structure must accommodate this gap (checkpoint/wait pattern — Josh returns to trigger the comparison plan after the window).
- **D-04:** **Comparison standard = CWV "Good" thresholds, not lab-median matching.** Field p75 per route must sit in Google's Good band: LCP ≤2500ms, INP ≤200ms, CLS ≤0.1. INP is the field stand-in for the lab TBT gate (TBT is lab-only). Anything outside Good gets a documented explanation. No p75-vs-lab-median numeric tolerance games.

### Re-cert command (PERF-06)
- **D-05:** **Scope = perf gates only.** One npm script (name at Claude's discretion, e.g. `perf:recert`) running: (a) the CWV gates via the `measure-cwv.mjs` harness, and (b) the PERF-04 nav gate from `e2e/13-perf.spec.ts`. `qa:run`, full e2e, and unit suites stay as separate commands — they are correctness gates, not perf gates.
- **D-06:** **Surface = hybrid, as today.** CWV half measures the deployed Vercel prod (methodology continuity with the Phase 16 immutable baseline — same instrument, same surface); nav-gate half builds + serves a local prod build (`next build && next start`) per Phase 17 D-14. The command orchestrates both halves. Operationally the gate runs post-deploy; red → revert or fix forward.
- **D-07:** **Output = dated report + exit code.** Console PASS/FAIL table per route/gate; non-zero exit on any hard-gate failure; every run writes a dated markdown + raw JSON artifact (Phase 16/17 artifact pattern). Failed runs still write their report, marked FAILED — the red record is part of the evidence trail.
- **D-08:** **Presets = mobile-only by default** (~14 min CWV half; ~35-40 min total with the prod build + nav gate). All binding gates are mobile (Phase 16 D-06 basis). Desktop available via a flag for occasional full pictures.

### Thresholds & baseline
- **D-09:** **Gate type = absolute hard-fail + drift warning.** Hard fail only on the absolute gates: LCP ≤2500ms, TBT ≤200ms, CLS ≤0.1, Perf ≥90 (mobile medians, n≥6 run-1-discard). Additionally report each metric's delta vs the locked Phase 18 baseline; deltas >~15% worse surface as a loud WARNING without failing the run. No hard ratchet — red must mean a real regression, never Lighthouse noise.
- **D-10:** **Phase opens with a fresh official baseline run:** one full 4-route × 2-preset warm-prod run against current deployed prod, committed as the immutable Phase 18 baseline under the Phase 16 artifact discipline (never re-edited). This IS the "lock in the 26/27 numbers" step, and doubles as proof the Phase 26/27 optimizations survived deployment. Drift warnings compare against this record.
- **D-11:** **Accepted-miss policy = auto-derived exception gates.** If a route still misses an absolute gate at the fresh baseline (candidate: `/deck/new-card` TBT, last measured 338ms pre-26/27), lock a documented per-route exception at fresh median + ~15% headroom (e.g. median 320 → gate 370). Gate is green on day one and still catches that route getting worse. Exception recorded in the baseline doc with the Phase 17 D-04 accepted-miss rationale. No pause/checkpoint needed — derivation is mechanical.
- **D-12:** **Nav gate threshold = keep 850ms**, the deliberately re-baselined 17-05 gate, unchanged. Headroom over the measured 470-690ms range absorbs machine variance.

### Loud failure & operations
- **D-13:** **Red-path demonstration = evaluator unit tests + threshold-override live demo.** (1) The gate evaluator gets vitest coverage with synthetic failing medians — a permanent regression test of the gate logic itself. (2) One real end-to-end run with deliberately impossible thresholds via env override (e.g. `GATE_TBT=10`) proving the full pipeline prints the red failure table and exits non-zero against real prod — no sabotage deploy. Demo output committed as evidence for success criterion 3.
- **D-14:** **Run surface = local on-demand only.** No CI integration this phase (no prod secrets in GitHub Actions, no CI minutes). CI is a future backlog item.
- **D-15:** **Documented cadence = perf-relevant releases.** Convention: run the gate after deploys touching perf-relevant surfaces (bundle deps, shared layout/providers, route pages, `next.config.ts`) and before anything Josh would call a release/milestone. Documented in the script's header comment + AGENTS.md so future sessions know the rule.

### Claude's Discretion
- npm script name, orchestrator script structure (single .mjs vs composition of existing scripts), and run ordering within the command.
- Exact drift-warning tolerance (guideline ~15%) and report directory layout under the phase's measurements dir.
- Speed Insights component placement details and any route-name mapping needed to read per-route p75 from the dashboard.
- How the 14-day window is represented in the plan structure (checkpoint plan vs separate wave) — as long as the PERF-06 work proceeds during the window and the comparison doc closes the phase.
- Reuse/extension approach for `measure-cwv.mjs` (extend with gate-evaluation mode vs thin wrapper) — extend, don't rebuild, per standing convention.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — §"Performance — Field Validation & Guardrails": PERF-05, PERF-06 (authoritative requirement text)
- `.planning/ROADMAP.md` — §"Phase 18: Field validation & guardrails": goal + the three success criteria (field p75 confirms or variance documented; single re-cert command; loud failure demonstrated)

### The current immutable baseline (superseded by this phase's fresh run, still the reference format)
- `.planning/phases/16-performance-baseline-measure/baseline/16-BASELINE-SUMMARY.md` — cross-route table format + artifact discipline to replicate
- `.planning/phases/16-performance-baseline-measure/16-CONTEXT.md` — the locked measurement methodology (warm-prod-only, medians n≥6 run-1 discard, mobile basis) that ALL Phase 18 measurement must follow
- `.planning/phases/17-performance-optimization/17-CONTEXT.md` — D-04 (accepted-miss protocol), D-09 (route-scoped measurement), D-13..D-17 (nav-gate definition)

### Measurement harness (reused + extended this phase)
- `scripts/measure-cwv.mjs` — the warm-prod Lighthouse harness (ROUTE_FILTER + PHASE_OUT_DIR from Phase 17; cookie auth with prod `Origin` header; self-cleaning `*test.local` users; needs `DATABASE_URL` exported; sequential only)
- `scripts/measure-cwv-lib.mjs` + `scripts/__tests__/` — pure lib (median/extractMetrics/getBundleKb/classifyBottleneck/renderRouteReport) with vitest coverage; the gate evaluator belongs at this layer for D-13 unit-testability
- `e2e/13-perf.spec.ts` — the PERF-04 nav gate (6 hub-and-spoke pairs, `PERF_PROD_BUILD`-gated, 850ms threshold, INP prod-gated)

### Regression guards & hygiene
- `scripts/qa-run.mjs` + `scripts/qa-lib.mjs` — NOT part of the re-cert command (D-05), but the standing correctness gate. Gotcha: qa-lib.mjs exits at module load without `DEBUG_CHEAT_SECRET` — never import it from the perf harness (Phase 16 D-02 precedent: inline helpers instead)
- `scripts/cleanup-test-users.mjs` — `*test.local` self-clean (standalone runs need `CLEANUP_DB_URL`)

### Framework truth
- `AGENTS.md` → `node_modules/next/dist/docs/` — this Next.js 16 differs from training data; verify anything App-Router-specific (and the `@vercel/speed-insights` Next integration pattern) against shipped docs/current official docs before locking approaches

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/measure-cwv.mjs` / `measure-cwv-lib.mjs`: the measurement instrument — the re-cert command extends this (gate evaluation + report writing), never rebuilds it. `lighthouse` + `puppeteer-core` already in deps.
- `e2e/13-perf.spec.ts`: the nav-gate half, already prod-build-gated via `PERF_PROD_BUILD` — the re-cert command invokes it as-is.
- `package.json` scripts: `measure:cwv`, `qa:run`, `test:e2e` — the new `perf:recert` entry sits alongside these.
- `src/app/layout.tsx`: root layout — the one integration point for the Speed Insights component.

### Established Patterns
- Warm-prod medians, n≥6 with run-1 discard, mobile as the gate basis, never dev/cold (Phases 13.1/16/17 — binding).
- Immutable committed measurement artifacts, dated, never re-edited (Phase 16 `baseline/` discipline).
- `scripts/*.mjs` Node-ESM convention; pure logic split into an importable lib for vitest coverage (Phase 16 D-01 precedent — directly applicable to the gate evaluator).
- `MSYS_NO_PATHCONV=1` required on this Windows/Git-Bash setup for any bare-leading-slash env value (e.g. `ROUTE_FILTER=/dashboard`).
- `@vercel/speed-insights` is NOT installed — new dependency this phase (the only new dep expected).

### Integration Points
- `src/app/layout.tsx` — Speed Insights component (verify placement pattern against current Vercel/Next 16 docs).
- Vercel dashboard — Speed Insights enable toggle (Josh's manual step, plus checking p75 during/after the window).
- `package.json` — new `perf:recert` script entry.
- `.planning/phases/18-field-validation-guardrails/` — fresh baseline artifacts + dated re-cert reports + the PERF-05 comparison doc all live here.

</code_context>

<specifics>
## Specific Ideas

- The re-cert gate's design principle, per the discussion: **red must be trustworthy.** Every threshold choice (absolute-only hard fail, 15% drift warning not failure, 850ms nav headroom, auto-derived exception gates) was picked so that a red run always means a real regression — a gate that cries wolf gets ignored.
- The fresh baseline run doubles as deployment verification: it's the first official measurement of the Phase 26/27 code in production.
- Field INP explicitly maps to the lab TBT gate in the comparison doc — don't hunt for field TBT (it doesn't exist).

</specifics>

<deferred>
## Deferred Ideas

- **CI integration of the re-cert gate** (GitHub Actions `workflow_dispatch` or on-push) — declined this phase (D-14); backlog item if the app grows beyond personal scale.
- **Browser-Back navigation gating** — carried from Phase 17's deferred list; revisit only if the PERF-05 field data shows back-nav pain.
- **<100ms instant-nav** (PPR/Cache Components path) — remains on the backlog per 17-05; needs its own D-07-style experimental-flag checkpoint, not part of the re-cert gate.

</deferred>

---

*Phase: 18-field-validation-guardrails*
*Context gathered: 2026-07-24*
