# Phase 18: Field validation & guardrails - Research

**Researched:** 2026-07-24
**Domain:** Real-user performance monitoring (Vercel Speed Insights) + local perf-regression re-certification tooling (Node/Lighthouse/Playwright harness extension)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Field data (PERF-05)
- **D-01:** Source = Vercel Speed Insights. Add `@vercel/speed-insights` (one component in the root layout) + enable in the Vercel dashboard (Josh does the dashboard toggle). No self-hosted web-vitals pipeline, no CrUX dependency (traffic will never qualify). Hobby-tier sampling limits accepted.
- **D-02:** Acceptance bar = time-boxed check, not traffic-gated. Wire Speed Insights early in the phase, use the app normally for the window, then write the comparison doc against whatever data accrued. Thin/no data → documented as the variance explanation; the requirement closes either way. The phase never blocks waiting for traffic.
- **D-03:** Window = 14 days from the Speed Insights deploy. The PERF-06 gate is built during the window (no dead time); the comparison doc is the final plan. Phase structure must accommodate this gap (checkpoint/wait pattern — Josh returns to trigger the comparison plan after the window).
- **D-04:** Comparison standard = CWV "Good" thresholds, not lab-median matching. Field p75 per route must sit in Google's Good band: LCP ≤2500ms, INP ≤200ms, CLS ≤0.1. INP is the field stand-in for the lab TBT gate (TBT is lab-only). Anything outside Good gets a documented explanation. No p75-vs-lab-median numeric tolerance games.

#### Re-cert command (PERF-06)
- **D-05:** Scope = perf gates only. One npm script (name at Claude's discretion, e.g. `perf:recert`) running: (a) the CWV gates via the `measure-cwv.mjs` harness, and (b) the PERF-04 nav gate from `e2e/13-perf.spec.ts`. `qa:run`, full e2e, and unit suites stay as separate commands — they are correctness gates, not perf gates.
- **D-06:** Surface = hybrid, as today. CWV half measures the deployed Vercel prod (methodology continuity with the Phase 16 immutable baseline — same instrument, same surface); nav-gate half builds + serves a local prod build (`next build && next start`) per Phase 17 D-14. The command orchestrates both halves. Operationally the gate runs post-deploy; red → revert or fix forward.
- **D-07:** Output = dated report + exit code. Console PASS/FAIL table per route/gate; non-zero exit on any hard-gate failure; every run writes a dated markdown + raw JSON artifact (Phase 16/17 artifact pattern). Failed runs still write their report, marked FAILED — the red record is part of the evidence trail.
- **D-08:** Presets = mobile-only by default (~14 min CWV half; ~35-40 min total with the prod build + nav gate). All binding gates are mobile (Phase 16 D-06 basis). Desktop available via a flag for occasional full pictures.

#### Thresholds & baseline
- **D-09:** Gate type = absolute hard-fail + drift warning. Hard fail only on the absolute gates: LCP ≤2500ms, TBT ≤200ms, CLS ≤0.1, Perf ≥90 (mobile medians, n≥6 run-1-discard). Additionally report each metric's delta vs the locked Phase 18 baseline; deltas >~15% worse surface as a loud WARNING without failing the run. No hard ratchet — red must mean a real regression, never Lighthouse noise.
- **D-10:** Phase opens with a fresh official baseline run: one full 4-route × 2-preset warm-prod run against current deployed prod, committed as the immutable Phase 18 baseline under the Phase 16 artifact discipline (never re-edited). This IS the "lock in the 26/27 numbers" step, and doubles as proof the Phase 26/27 optimizations survived deployment. Drift warnings compare against this record.
- **D-11:** Accepted-miss policy = auto-derived exception gates. If a route still misses an absolute gate at the fresh baseline (candidate: `/deck/new-card` TBT, last measured 338ms pre-26/27), lock a documented per-route exception at fresh median + ~15% headroom (e.g. median 320 → gate 370). Gate is green on day one and still catches that route getting worse. Exception recorded in the baseline doc with the Phase 17 D-04 accepted-miss rationale. No pause/checkpoint needed — derivation is mechanical.
- **D-12:** Nav gate threshold = keep 850ms, the deliberately re-baselined 17-05 gate, unchanged. Headroom over the measured 470-690ms range absorbs machine variance.

#### Loud failure & operations
- **D-13:** Red-path demonstration = evaluator unit tests + threshold-override live demo. (1) The gate evaluator gets vitest coverage with synthetic failing medians — a permanent regression test of the gate logic itself. (2) One real end-to-end run with deliberately impossible thresholds via env override (e.g. `GATE_TBT=10`) proving the full pipeline prints the red failure table and exits non-zero against real prod — no sabotage deploy. Demo output committed as evidence for success criterion 3.
- **D-14:** Run surface = local on-demand only. No CI integration this phase (no prod secrets in GitHub Actions, no CI minutes). CI is a future backlog item.
- **D-15:** Documented cadence = perf-relevant releases. Convention: run the gate after deploys touching perf-relevant surfaces (bundle deps, shared layout/providers, route pages, `next.config.ts`) and before anything Josh would call a release/milestone. Documented in the script's header comment + AGENTS.md so future sessions know the rule.

### Claude's Discretion
- npm script name, orchestrator script structure (single .mjs vs composition of existing scripts), and run ordering within the command.
- Exact drift-warning tolerance (guideline ~15%) and report directory layout under the phase's measurements dir.
- Speed Insights component placement details and any route-name mapping needed to read per-route p75 from the dashboard.
- How the 14-day window is represented in the plan structure (checkpoint plan vs separate wave) — as long as the PERF-06 work proceeds during the window and the comparison doc closes the phase.
- Reuse/extension approach for `measure-cwv.mjs` (extend with gate-evaluation mode vs thin wrapper) — extend, don't rebuild, per standing convention.

### Deferred Ideas (OUT OF SCOPE)
- CI integration of the re-cert gate (GitHub Actions `workflow_dispatch` or on-push) — declined this phase (D-14); backlog item if the app grows beyond personal scale.
- Browser-Back navigation gating — carried from Phase 17's deferred list; revisit only if the PERF-05 field data shows back-nav pain.
- <100ms instant-nav (PPR/Cache Components path) — remains on the backlog per 17-05; needs its own D-07-style experimental-flag checkpoint, not part of the re-cert gate.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-05 | Field p75 data (Vercel Speed Insights / CrUX) confirms lab medians on key routes once traffic accrues, or variance is documented | `@vercel/speed-insights` v2.0.0 confirmed as the current official Next.js App Router integration (Standard Stack, Code Examples); Vercel dashboard route-breakdown mechanics and Hobby-tier sampling limits verified against official docs (Common Pitfalls, Architecture Patterns); CWV Good-band thresholds confirmed identical to what Speed Insights itself reports (Comparison doc design) |
| PERF-06 | A single command re-certifies all perf gates (lab regression guardrail covering the four routes), runnable on demand before any release | Existing harness architecture (`measure-cwv.mjs`/`measure-cwv-lib.mjs`/`e2e/13-perf.spec.ts`) fully read and mapped (Don't Hand-Roll, Architecture Patterns, Code Examples); gate-evaluator extension point identified in the pure-lib layer; orchestration/exit-code/report-artifact design pattern specified (Code Examples, Validation Architecture) |
</phase_requirements>

## Summary

This phase has two independent halves, both well-scoped by the locked CONTEXT.md decisions, and both extend code that already exists and was read in full during this research pass.

**PERF-05 (field data)** is a small, mechanical integration: install `@vercel/speed-insights` (npm registry-confirmed current version **2.0.0**, published 2026-07-03, verified against the **official Vercel Speed Insights Quickstart docs**, which are the authoritative source — not training data) and drop one `<SpeedInsights />` component into `src/app/layout.tsx`. The Next.js 16 docs shipped in this repo (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-15.md`) explicitly confirm auto-instrumentation was removed in Next 15+ and point at this exact manual-install path — so the locked D-01 approach is the *only* currently-supported path, not one of several options. The harder part of PERF-05 isn't the code — it's the comparison doc's honesty: Speed Insights groups real user data by **Route** (the file-system route) or **Path** (literal URL), a p75 percentile is the *default* view already, and the Hobby tier caps at 10,000 events/month with a rolling 7-day window (pausing recording, not losing history, once the cap is hit within a billing period). None of that requires new code, but the planner needs to know it so the eventual comparison-doc task knows exactly what it's reading off the dashboard and doesn't invent thresholds Speed Insights doesn't use.

**PERF-06 (re-cert command)** is squarely an EXTEND-not-rebuild job. `scripts/measure-cwv.mjs` + `scripts/measure-cwv-lib.mjs` already do 90% of the CWV half (provisioning, sequential Lighthouse runs, medians, JSON+markdown artifacts); `e2e/13-perf.spec.ts` already has the D-12 850ms nav gate wired and `PERF_PROD_BUILD`-gated. What's missing is: (1) a **gate-evaluation layer** — pure functions that take a route's computed medians + a threshold table and return PASS/FAIL/WARN, unit-testable per D-13, living in `measure-cwv-lib.mjs` alongside the existing pure helpers; (2) a **threshold/exception table** seeded from the fresh D-10 baseline per the D-11 mechanical auto-derivation rule; (3) an **orchestrator** (single new `.mjs`, e.g. `scripts/perf-recert.mjs`) that runs the CWV harness, evaluates gates, spawns the local-prod-build nav-gate half, aggregates both into one console table + dated report, and sets the process exit code; (4) env-var threshold overrides (e.g. `GATE_TBT`) for the D-13 red-path demo. No new external dependency is needed for PERF-06 — `lighthouse`, `puppeteer-core`, `playwright`, and `vitest` are already installed.

**Primary recommendation:** Extend `measure-cwv-lib.mjs` with gate-evaluation functions (pure, vitest-covered) and write one new orchestrator script (`scripts/perf-recert.mjs`) that composes the existing `measure-cwv.mjs` CWV run with a `spawnSync`-driven `next build && next start` + `playwright test e2e/13-perf.spec.ts --grep "instant-nav"` nav-gate run; install `@vercel/speed-insights@2.0.0` and add `<SpeedInsights />` to `src/app/layout.tsx` as a fully separate, much smaller task.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Field RUM collection (LCP/CLS/INP/FCP/TTFB) | Browser / Client | CDN (Vercel edge ingest) | `@vercel/speed-insights` injects a client-side script that observes real navigation/paint timing in the user's browser and beacons it to Vercel's edge; the app has zero server-side involvement beyond rendering the component once |
| Field data storage/aggregation/percentiles | CDN / Static (Vercel platform) | — | Owned entirely by Vercel's Speed Insights service — not this codebase; the app only emits data points, it never reads them back at runtime |
| Lab CWV measurement (Lighthouse) | Local tooling (Node script) | API / Backend (target of measurement) | `measure-cwv.mjs` runs as a local Node process driving headless Chrome against warm deployed prod — the "backend" here is the already-deployed app being measured, not code this phase touches |
| Gate evaluation (PASS/FAIL/WARN logic) | Local tooling (pure lib) | — | Belongs in `measure-cwv-lib.mjs`'s existing pure-function layer (zero I/O, vitest-covered) per D-13 and the established Phase 16 D-01 split-pure-logic precedent |
| Nav-timing gate (PERF-04 851ms) | Local tooling (Playwright against local prod build) | Frontend Server (SSR) | `e2e/13-perf.spec.ts` drives a real browser against a local `next start` server — the SSR tier is the thing being timed, the test harness itself is local tooling |
| Re-cert orchestration (report + exit code) | Local tooling (Node script) | — | New `scripts/perf-recert.mjs` composes the two above; no user-facing or server-tier component |
| Speed Insights component mount point | Frontend Server (SSR) / Browser boundary | — | `<SpeedInsights />` is a Server Component wrapper around a client script; it must live in `src/app/layout.tsx` (the single root layout, already read — no other layout file exists) so it renders on every route exactly once |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vercel/speed-insights` | 2.0.0 [VERIFIED: npm registry + official Vercel docs] | Field RUM collection, Next.js App Router `<SpeedInsights />` component | The only Vercel-first-party package for this; explicitly the replacement path Next.js 15+'s own upgrade docs point to after removing auto-instrumentation |

### Supporting (already installed — no new packages)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lighthouse` | ^13.3.0 [VERIFIED: package.json] | Lab CWV measurement engine, driven via the `navigation()` named export | Already the CWV-half engine in `measure-cwv.mjs`; reuse as-is |
| `puppeteer-core` | ^24.43.1 [VERIFIED: package.json] | Headless Chrome driver for Lighthouse | Already wired with cookie-auth injection in `measure-cwv.mjs`; reuse as-is |
| `playwright` | ^1.58.2 [VERIFIED: package.json] | Nav-gate execution engine (`e2e/13-perf.spec.ts`) | Already the D-12/D-14 nav-gate engine; the orchestrator spawns `npx playwright test` against it, does not reimplement it |
| `vitest` | ^4.1.1 [VERIFIED: package.json] | Unit coverage for the new gate-evaluator pure functions (D-13) | Mirrors the existing `scripts/__tests__/measure-cwv-lib.test.ts` pattern |
| `@neondatabase/serverless` + `drizzle-orm` | ^1.0.2 / ^0.45.1 [VERIFIED: package.json] | DB provisioning for the CWV harness's `*test.local` user (unchanged) | Already used identically in `measure-cwv.mjs`; no new usage needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@vercel/speed-insights` | Self-hosted `web-vitals` npm package + custom `/api/vitals` endpoint | Explicitly rejected by D-01 (no self-hosted pipeline); would also require a new DB table + retention policy this phase deliberately avoids |
| `@vercel/speed-insights` | CrUX (Chrome UX Report) API | Explicitly rejected by D-01 — CrUX requires a public-traffic threshold this personal-scale app will never reach |
| Single `.mjs` orchestrator (recommended) | Compose via `npm-run-all`/shell `&&` chaining of separate npm scripts | A single `.mjs` orchestrator can aggregate BOTH halves' results into one PASS/FAIL table + one exit code (D-07); a shell chain of two independent processes cannot merge their outputs into one report without extra glue anyway, so the glue script is the simpler design either way |

**Installation:**
```bash
npm install @vercel/speed-insights
```

**Version verification:** `npm view @vercel/speed-insights version` → `2.0.0`, published 2026-07-03 [VERIFIED: npm registry, cross-checked against the official Vercel docs' own "Version 2 package updates are available" quickstart note — the docs and registry agree on the major version in use].

## Package Legitimacy Audit

slopcheck could not be installed in this environment — `pip`/`python -m pip` are not available (Windows Store execution-alias stub only, no real Python interpreter present). Per the graceful-degradation protocol, the one new package this phase introduces is tagged `[ASSUMED]` below despite passing every other check, and the planner MUST gate its install behind a `checkpoint:human-verify` task.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@vercel/speed-insights` | npm | Package family active since ~2023; v2.0.0 published 2026-07-03 (~3 weeks old at research time) | Not queried (npm view does not expose weekly downloads without an extra registry call; the package is Vercel's own first-party tooling, widely used across the Next.js ecosystem) | `github.com/vercel/speed-insights` [VERIFIED: `npm view repository.url`] | N/A — slopcheck unavailable | `[ASSUMED]` — gate behind `checkpoint:human-verify` before `npm install` |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck did not run)
**Packages flagged as suspicious [SUS]:** none (slopcheck did not run)

*slopcheck was unavailable at research time — the one recommended package (`@vercel/speed-insights`) is tagged `[ASSUMED]` and the planner must gate its install behind a `checkpoint:human-verify` task, even though it independently passed `npm view` (version 2.0.0 resolves, has a linked GitHub source repo, no `postinstall` script per `npm view @vercel/speed-insights scripts.postinstall` returning empty) and is corroborated by the official Vercel documentation as the currently-recommended integration path.*

## Architecture Patterns

### System Architecture Diagram

```
PERF-05 (field data) — runtime, in production
──────────────────────────────────────────────
  Real user's browser
        │  navigates to any route
        ▼
  src/app/layout.tsx  ── renders <SpeedInsights /> once (root layout, every route)
        │
        ▼
  @vercel/speed-insights client script
        │  observes LCP / CLS / INP / FCP / TTFB via PerformanceObserver
        │  beacons data points on load/interaction/leave
        ▼
  Vercel edge ingest ──▶ Speed Insights dashboard (p75 by Route/Path, 7-day window, Hobby cap 10k events/mo)
        │
        ▼ (Josh reads dashboard after the 14-day D-03 window)
  Comparison doc (this phase's deliverable) — field p75 vs CWV Good thresholds


PERF-06 (re-cert command) — on-demand, local machine
──────────────────────────────────────────────────────
  npm run perf:recert (or similar)
        │
        ├──▶ [CWV half] measure-cwv.mjs (existing, D-06 warm-prod)
        │       │  provision *test.local user + deck/cards
        │       │  sequential Lighthouse runs × 4 routes × mobile (D-08 default)
        │       │  computeMedians() (existing pure fn)
        │       ▼
        │    NEW: evaluateGates(medians, thresholds) — pure fn, vitest-covered (D-13)
        │       │  hard-fail: LCP≤2500 / TBT≤200 / CLS≤0.1 / Perf≥90 (or route exception, D-11)
        │       │  soft-warn: >~15% drift vs Phase-18 baseline
        │       ▼
        │    per-route PASS/FAIL/WARN row
        │
        ├──▶ [Nav-gate half] next build && next start (local prod server)
        │       │  PERF_PROD_BUILD=1 npx playwright test e2e/13-perf.spec.ts (existing, D-12: 850ms)
        │       ▼
        │    6 hub-and-spoke pair PASS/FAIL rows
        │
        ▼
  NEW: scripts/perf-recert.mjs orchestrator
        │  aggregates both halves into ONE console table
        │  writes dated markdown + raw JSON report (D-07, Phase 16/17 artifact pattern)
        ▼
  process.exit(0 | 1) — non-zero on ANY hard-gate failure (D-07)
```

### Recommended Project Structure
```
scripts/
├── measure-cwv.mjs           # UNCHANGED (or minimally extended) — CWV harness
├── measure-cwv-lib.mjs       # EXTENDED — add evaluateGates(), loadThresholds()/similar pure fns
├── perf-recert.mjs           # NEW — orchestrator: runs CWV half + nav-gate half, aggregates, writes report, sets exit code
├── qa-lib.mjs                # UNCHANGED — never imported by perf scripts (gotcha, see Common Pitfalls)
└── __tests__/
    ├── measure-cwv-lib.test.ts   # EXTENDED — add evaluateGates unit tests with synthetic failing medians (D-13-1)
    └── fixtures/
        └── (existing route-bundle-stats fixture, reused)

.planning/phases/18-field-validation-guardrails/
├── baseline/                 # NEW — fresh D-10 immutable baseline (mirrors 16-BASELINE-SUMMARY.md format)
├── measurements/              # NEW — per-run dated re-cert reports (D-07), never overwritten
└── 18-*.md                    # plan/summary/comparison docs

src/app/layout.tsx             # EXTENDED — one new <SpeedInsights /> import + JSX line
```

### Pattern 1: Pure gate-evaluator extending the existing pure-lib layer
**What:** Add `evaluateGates(medians, thresholds)` (and a small `deriveExceptionGate(median, headroomPct)` helper for D-11) to `measure-cwv-lib.mjs`, following the exact zero-I/O contract already documented at the top of that file (no `process.env`, no network, no `process.exit`, no top-level await).
**When to use:** Any time the CWV harness needs a threshold decision — this is the single seam the D-13 unit tests exercise with synthetic medians, and the seam `perf-recert.mjs` calls after `computeMedians()`.
**Example:**
```javascript
// Source: pattern established by scripts/measure-cwv-lib.mjs's existing
// classifyBottleneck() (see file read during research) — same shape:
// pure function, plain object in, plain object out, throws on invalid input.

/**
 * @param {Record<string, number>} medians - a route's computeMedians() output
 * @param {{lcp:number, tbt:number, cls:number, score:number}} thresholds - absolute hard-fail gates (D-09; may be a per-route D-11 exception)
 * @param {Record<string, number>|null} baseline - the locked Phase 18 baseline medians for this route, or null if none (first run)
 * @param {number} driftPct - warning threshold, default ~15 (D-09)
 * @returns {{route: string, hardFail: boolean, failures: string[], warnings: string[]}}
 */
export function evaluateGates(medians, thresholds, baseline, driftPct = 15) {
  const failures = [];
  const warnings = [];
  if (medians.lcp > thresholds.lcp) failures.push(`LCP ${medians.lcp}ms > ${thresholds.lcp}ms`);
  if (medians.tbt > thresholds.tbt) failures.push(`TBT ${medians.tbt}ms > ${thresholds.tbt}ms`);
  if (medians.cls > thresholds.cls) failures.push(`CLS ${medians.cls} > ${thresholds.cls}`);
  if (medians.score < thresholds.score) failures.push(`Perf ${medians.score} < ${thresholds.score}`);

  if (baseline) {
    for (const key of ["lcp", "tbt", "cls"]) {
      const before = baseline[key];
      const after = medians[key];
      if (before > 0 && (after - before) / before > driftPct / 100) {
        warnings.push(`${key.toUpperCase()} drifted +${Math.round(((after - before) / before) * 100)}% vs baseline`);
      }
    }
  }
  return { hardFail: failures.length > 0, failures, warnings };
}
```

### Pattern 2: Env-var threshold override for the D-13 red-path demo
**What:** `perf-recert.mjs` reads optional `GATE_LCP` / `GATE_TBT` / `GATE_CLS` / `GATE_PERF` env vars and merges them over the default/exception threshold table before calling `evaluateGates()`, mirroring the existing `ROUTE_FILTER`/`PHASE_OUT_DIR` env-override convention already established in `measure-cwv.mjs`.
**When to use:** Exactly once, for the D-13(2) live demo (`GATE_TBT=10 npm run perf:recert`) proving the pipeline prints red and exits non-zero against real prod — never for a normal run.
**Example:**
```javascript
// Source: pattern established by measure-cwv.mjs's existing
// `process.env.ROUTE_FILTER ?? null` / `process.env.PHASE_OUT_DIR ?? null` convention.
function resolveThresholds(defaults) {
  return {
    lcp: Number(process.env.GATE_LCP ?? defaults.lcp),
    tbt: Number(process.env.GATE_TBT ?? defaults.tbt),
    cls: Number(process.env.GATE_CLS ?? defaults.cls),
    score: Number(process.env.GATE_PERF ?? defaults.score),
  };
}
```

### Pattern 3: Speed Insights root-layout integration (App Router)
**What:** Import `SpeedInsights` from `@vercel/speed-insights/next` (the Next.js-specific entry point — NOT the bare `@vercel/speed-insights` or `/react` entry, which are for other frameworks) into `src/app/layout.tsx` and render it once inside `<body>`, alongside existing children.
**When to use:** Exactly once, in the single root layout this app has (confirmed — no nested route-group layouts override `<html>/<body>`).
**Example:**
```tsx
// Source: https://vercel.com/docs/speed-insights/quickstart (official Vercel
// docs, fetched during this research pass — the Next.js App Router branch of
// the framework-picker) — the exact pattern for this repo's stack.
import { SpeedInsights } from "@vercel/speed-insights/next";
// ...existing imports (Baloo_2, Figtree, cn, etc. — unchanged)

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", figtree.variable, baloo2.variable, "font-sans")}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Anti-Patterns to Avoid
- **Importing `qa-lib.mjs` from any new perf script:** it exits at module load without `DEBUG_CHEAT_SECRET` (verified: `scripts/qa-lib.mjs` lines 44-50). `measure-cwv.mjs` already inlines the auth helpers it needs for exactly this reason — follow the same inline pattern for anything the orchestrator needs from that world.
- **Rebuilding the CWV measurement loop:** `perf-recert.mjs` must call into `measure-cwv.mjs`'s exported logic (or spawn it as a child process and parse its written JSON artifacts) — never duplicate the provisioning/Lighthouse-run/cookie-injection code, which already has multiple hard-won bug fixes (redirect guard, cookie re-injection per run, bundle-stats freshness gate) baked in.
- **Gating on p75-vs-lab-median numeric tolerance:** D-04 explicitly forbids this for the PERF-05 comparison doc — the standard is Google's CWV Good band, not a delta from the lab medians.
- **Hard-ratcheting the drift-warning threshold into a hard-fail:** D-09 explicitly requires drift to stay a WARNING, never a failure — "red must mean a real regression, never Lighthouse noise."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-user Web Vitals collection | A custom `useReportWebVitals` + `/api/vitals` + DB table pipeline | `@vercel/speed-insights` | D-01 explicitly rejects self-hosting; the package handles sampling, percentile calculation, dashboard visualization, and data retention entirely on Vercel's side — building this from `next/web-vitals`'s `useReportWebVitals` hook (documented in the shipped Next 16 docs) would duplicate a solved problem and add a schema/retention-policy burden this phase deliberately avoids |
| Lighthouse CWV measurement | A new Lighthouse-driving script from scratch | `scripts/measure-cwv.mjs` (extend, don't rebuild) | Already solves cookie-auth-on-prod-HTTPS, redirect-guard fail-loud, sequential-run TBT-skew avoidance, and bundle-stats freshness — each one a real bug found and fixed across Phases 16-17 |
| Nav-timing gate | A new Playwright perf spec | `e2e/13-perf.spec.ts` (invoke as-is via `npx playwright test`) | Already has the exact D-12 850ms gate, the `data-perf-ready` marker convention, and the `PERF_PROD_BUILD` gate; D-05/D-06 explicitly say the re-cert command orchestrates this file, not a new one |
| Statistical medians | A new median/percentile utility | `median()` / `computeMedians()` in `measure-cwv-lib.mjs` | Already vitest-covered, already the locked project convention (upper-of-two-middle for even-length arrays — documented behavior, do not "fix") |

**Key insight:** Every piece of PERF-06's plumbing already exists somewhere in this repo, built and debugged across two prior phases. The only genuinely new code this phase writes is the gate-evaluation/threshold layer and the thin orchestrator that stitches the two existing harnesses' outputs into one report — everything else is composition.

## Common Pitfalls

### Pitfall 1: Prod may not be running the Phase 26/27 code when the D-10 fresh baseline runs
**What goes wrong:** STATE.md records that after Phase 17, Josh explicitly **held** the deploy ("Deploy HELD — Josh will deploy manually later; prod still runs the 2026-07-15 deployment"). If subsequent Phase 25/26/27 merges to `main` did not trigger (or were not confirmed to trigger) a fresh Vercel deployment, the D-10 "fresh official baseline run against current deployed prod" could silently measure STALE code and be committed as if it certified Phase 26/27's optimizations.
**Why it happens:** This repo's deploy model is git-connected auto-deploy on push to `main` (per AGENTS.md), but a held/manual deploy decision at one point in the project's history means auto-deploy cannot be assumed reflexively for every subsequent merge without checking.
**How to avoid:** Before running the D-10 baseline, verify the live prod deployment's commit/build matches the current `main` HEAD (e.g. check the Vercel dashboard's "Current Deployment" commit SHA, or a build-id endpoint) — do not just assume `main` is live. If prod is stale, the plan needs an explicit "confirm/trigger deploy" step before D-10's baseline can be trusted as "the 26/27 numbers."
**Warning signs:** Fresh baseline numbers that look identical to the pre-26/27 Phase 17 numbers (e.g. `/deck/new-card` still showing ~338ms TBT) despite Phase 26/27 having landed multiple bundle/query optimizations — would suggest prod is stale, not that the optimizations didn't help.

### Pitfall 2: `@vercel/speed-insights` component placement — wrong entry point for this framework
**What goes wrong:** The package ships several framework-specific entry points (`/next`, `/react`, `/remix`, `/vue`, `/astro`, `/sveltekit`, and a bare generic one). Importing from the wrong one (e.g. the generic `injectSpeedInsights` meant for "other" frameworks) either does nothing useful in an App Router context or double-instruments.
**Why it happens:** Copy-pasting from a generic guide or from training data (which may predate the current multi-framework package split) instead of the Next.js-specific quickstart branch.
**How to avoid:** Use `import { SpeedInsights } from "@vercel/speed-insights/next"` specifically — verified via the official Vercel quickstart's `nextjs-app` framework branch.
**Warning signs:** No `/_vercel/speed-insights/*` network request visible in the browser devtools Network tab after deploy; Speed Insights dashboard stays on "enabled, no data" indefinitely.

### Pitfall 3: Speed Insights "enable" is a two-step process — package install alone does nothing
**What goes wrong:** Installing the npm package and rendering the component is necessary but not sufficient — Speed Insights must ALSO be explicitly enabled per-project in the Vercel dashboard (D-01 already assigns this to Josh as a manual step), and it only starts routing traffic through `/_vercel/speed-insights/*` **after the next deployment** following that toggle.
**Why it happens:** The dashboard toggle and the code change are decoupled; enabling without deploying (or deploying without enabling) collects nothing.
**How to avoid:** Sequence the plan so code (component) ships, is deployed, AND Josh confirms the dashboard toggle is on, all before the D-03 14-day window officially starts — otherwise days of the window pass with zero data collection.
**Warning signs:** Dashboard shows a gray "not enabled" circle instead of an empty/populated data circle (documented in the official "Identifying if Speed Insights is enabled" doc section).

### Pitfall 4: Hobby-tier event cap can silently zero out days of the field-validation window
**What goes wrong:** The Hobby plan caps at 10,000 events/month and a 7-day rolling reporting window; once the monthly cap is hit, "Vercel pauses event recording until the next day" — for a personal-scale app this is unlikely to be hit, but it IS a real, documented failure mode the comparison doc must be able to explain if the data looks thinner than expected.
**Why it happens:** Every page-load/interaction/leave event can emit up to 6 data points (TTFB+FCP on load, FID+LCP on interaction, INP+CLS+LCP on leave) — a handful of heavy manual testing sessions (e.g. the QA journey scripts, or Josh's own daily use plus repeated `perf:recert` nav-gate runs against PROD if ever pointed there) could add up faster than expected.
**How to avoid:** Note this explicitly in the D-02 comparison doc as a known limitation, and do not run the CWV half of `perf:recert` against prod excessively during the 14-day window (each Lighthouse run is a lab measurement via a real prod page load and will itself generate Speed Insights events).
**Warning signs:** Speed Insights dashboard showing far fewer events than the app's actual traffic would suggest, especially near the end of a billing cycle.

### Pitfall 5: `qa-lib.mjs`'s module-load guard (existing, documented) — do not import it from the new orchestrator either
**What goes wrong:** Same as the existing documented gotcha in `measure-cwv.mjs` — any new script that does `import ... from "./qa-lib.mjs"` will crash immediately at module load if `DEBUG_CHEAT_SECRET` is unset, which it will be for any non-QA perf run.
**Why it happens:** `qa-lib.mjs` lines 44-50 call `process.exit(1)` at import time, not lazily.
**How to avoid:** `perf-recert.mjs` should either import from `measure-cwv.mjs`'s already-inlined helpers, or (simpler, and more robust to future signature drift) spawn `measure-cwv.mjs` as a child process and read its written JSON report files — never import `qa-lib.mjs` directly, and never import `measure-cwv.mjs` itself as a module if that would trigger its own top-level `DATABASE_URL` guard unexpectedly outside a real run (it also exits at module load without `DATABASE_URL`, per the file's own top-level guard read during this research).
**Warning signs:** The orchestrator crashing with `FATAL: set DEBUG_CHEAT_SECRET` or `FATAL: DATABASE_URL is required` the instant it's invoked, before any real gate logic runs.

### Pitfall 6: MSYS/Git-Bash path mangling on Windows for env values with a leading slash
**What goes wrong:** Already a documented Phase 17 gotcha (`ROUTE_FILTER=/dashboard` silently becomes a Windows path under Git Bash's MSYS layer unless `MSYS_NO_PATHCONV=1` is set), and it applies identically to any new orchestrator env var carrying a route path (e.g. if a future `--route` flag or `ROUTE_FILTER` passthrough is added to `perf-recert.mjs`).
**Why it happens:** MSYS rewrites bare-leading-slash arguments/env values that look like Unix absolute paths.
**How to avoid:** Prefix any such invocation with `MSYS_NO_PATHCONV=1` on this Windows/Git-Bash development machine, exactly as the existing scripts already require.
**Warning signs:** A route filter silently matching zero routes and the harness exiting 0 with an empty summary (the exact "silent garbage" failure class `measure-cwv.mjs`'s own `ROUTES.length === 0` guard already exists to catch for THIS specific script — any new script accepting the same kind of env var needs the same fail-loud guard).

### Pitfall 7: `playwright.config.ts` has no `webServer` — the orchestrator must manage the local prod build/serve lifecycle itself
**What goes wrong:** `webServer: undefined` in the config means Playwright will NOT auto-start `next start` before running `e2e/13-perf.spec.ts` — the existing manual workflow (documented in the spec's own `test.skip` messages) is "run `next build && next start` yourself, THEN run `PERF_PROD_BUILD=1 npx playwright test e2e/13-perf.spec.ts`." The orchestrator needs to replicate exactly this two-step lifecycle (spawn build, spawn start, wait for the server to be ready, run the gated tests, then tear the server down) rather than assuming Playwright will do it.
**Why it happens:** `baseURL: "http://localhost:3000"` is the SAME port both `next dev` and `next start` use by default (documented Pitfall 5 in the existing e2e file) — nothing in Playwright's own config distinguishes them.
**How to avoid:** The orchestrator must explicitly `spawnSync("npm", ["run", "build"])`, then spawn `next start` as a detached/background child, poll for the port to respond, run the Playwright command with `PERF_PROD_BUILD=1`, then kill the `next start` process in a `finally` block (mirroring `measure-cwv.mjs`'s existing browser-close-in-finally discipline).
**Warning signs:** The nav-gate half either hanging waiting for a server that was never started, or accidentally measuring against a leftover `next dev` process on the same port (which would silently produce dev-mode timing, not the real prod-build numbers the gate needs).

## Code Examples

### Reading the existing CWV harness's written JSON artifacts (composition, not duplication)
```javascript
// Source: derived from measure-cwv.mjs's own writeJsonAtomic() output shape
// (read during this research: { route, preset, runs, warmRuns, medians }
// written to `${slug}-mobile-runs.json` per route in OUT_DIR).
import { readFile } from "node:fs/promises";
import * as path from "node:path";

async function loadCwvMedians(outDir, route) {
  const slug = route.replace(/^\//, "").replace(/\//g, "-") || "root";
  const raw = await readFile(path.join(outDir, `${slug}-mobile-runs.json`), "utf8");
  const { medians } = JSON.parse(raw);
  return medians;
}
```

### Spawning `measure-cwv.mjs` as a child process from the orchestrator (avoids re-importing its top-level env guards)
```javascript
// Source: pattern established by measure-cwv.mjs's own runCleanup()
// (spawnSync against cleanup-test-users.mjs, mirrored here for symmetry).
import { spawnSync } from "node:child_process";

function runCwvHarness(env) {
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, "scripts", "measure-cwv.mjs")],
    { stdio: "inherit", env: { ...process.env, ...env } },
  );
  return (result.status ?? 1) === 0;
}
```

### Speed Insights root layout wiring (repeated here in full-file-diff form for planner clarity)
```tsx
// Source: https://vercel.com/docs/speed-insights/quickstart (official Vercel
// docs, App Router branch) + src/app/layout.tsx read in full during research.
import "@/env";
import type { Metadata } from "next";
import { Baloo_2, Figtree } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { cn } from "@/lib/utils";

// ...figtree/baloo2 font consts unchanged...

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", figtree.variable, baloo2.variable, "font-sans")}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Next.js auto-instrumented Speed Insights (zero-config in older Next major versions) | Manual `@vercel/speed-insights` package + explicit `<SpeedInsights />` component | Removed in Next.js 15 [CITED: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-15.md` line 597: "Auto instrumentation for Speed Insights was removed in Next.js 15"] | This repo is on Next 16.2.1 — the manual path (D-01's locked approach) is not optional, it is the ONLY currently-supported integration; any training-data memory of zero-config Speed Insights on Next.js is stale for this codebase |
| `@vercel/speed-insights` v1.x | v2.0.0 (current, published 2026-07-03) | ~2026 (exact v1→v2 changelog not fetched — not needed for integration, only the current-version quickstart pattern was verified) | The quickstart docs explicitly flag "Version 2 package updates are available" — planner should install the latest (`npm install @vercel/speed-insights`, no version pin needed) rather than any version number that might appear in stale training data |

**Deprecated/outdated:**
- Any Next.js auto-instrumented Speed Insights setup guidance is inapplicable to this Next 16 codebase — always require the explicit component per the analytics.md doc's "removed in Next.js 15" note.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@vercel/speed-insights` is a legitimate, safe package (no slopsquat/supply-chain risk) | Package Legitimacy Audit | Low — package independently corroborated by official Vercel docs (first-party Vercel tooling) and a resolvable GitHub source repo with no suspicious `postinstall` script; slopcheck simply could not run in this environment to add a second automated signal. Planner should still route the install through a `checkpoint:human-verify` task per protocol |
| A2 | Prod is currently running the Phase 26/27 code (not the held Phase 17 deploy) at the time the D-10 fresh baseline is run | Common Pitfalls (Pitfall 1) | Medium — if wrong, the "locked Phase 18 baseline" would actually be pre-26/27 numbers mislabeled as post-26/27, corrupting every future drift-warning comparison. Not verified in this research session — no live prod probe was run; the planner should add an explicit deployment-verification step before D-10 |
| A3 | `@vercel/speed-insights` events generated by the CWV harness's own automated Lighthouse runs against prod (which load real pages) do not meaningfully eat into the Hobby-tier 10,000 events/month cap during the 14-day window | Common Pitfalls (Pitfall 4) | Low-Medium — Lighthouse-driven page loads via puppeteer-core DO execute real page JS including any client-side Speed Insights script, so each `perf:recert`/`measure:cwv` run against prod during the window will emit some number of RUM events; exact per-run event count not measured in this research session |

**If this table is empty:** N/A — see entries above.

## Open Questions (RESOLVED)

1. **Is prod currently running the Phase 26/27 code, or still the held Phase 17 deployment?** — RESOLVED: 18-01 T3 and 18-03 T1 gate the deploy/baseline on Vercel deployment SHA == `git rev-parse origin/main`.
   - What we know: STATE.md explicitly records "Deploy HELD" after Phase 17 (2026-07-19/20), with Josh to deploy manually later. No STATE.md entry after that point explicitly confirms a subsequent deploy, though Phase 25/26/27 all closed with commits merged to `main` and AGENTS.md says pushing to `main` auto-deploys.
   - What's unclear: Whether the "HELD" instruction was a one-time pause that auto-deploy resumed after, or whether it persisted through Phase 25/26/27 (deliberately, to batch a release) and prod is still stale as of this research date (2026-07-24).
   - Recommendation: The plan's first task under D-10 should include a concrete verification step (check the Vercel dashboard's current deployment SHA against `git log -1 main`, or curl a version/build-id marker if one exists) before treating the fresh baseline as "the locked Phase 18 baseline certifying 26/27." If prod is stale, the plan needs an explicit "confirm/trigger production deploy" step first.

2. **Exact route-name mapping between the app's route paths and Speed Insights' "Route" grouping.** — RESOLVED: 18-06 T1 explicitly confirms which dashboard view (Route vs Path) cleanly isolates each key route, with the `/study` query-string caveat noted, before drawing conclusions.
   - What we know: Speed Insights' dashboard offers both a "Route" view (the actual pages you built — i.e., the App Router file-system route, which for this app should read naturally as `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse`) and a "Path" view (the literal URL requested, which for `/study` would include the `?deck=` query string per the app's own redirect behavior documented in `measure-cwv.mjs`).
   - What's unclear: Whether Speed Insights' "Route" grouping collapses `?deck=...` query variants of `/study` into one bucket automatically (likely, since it's framework-route-aware) or whether the dashboard needs the "Path" view instead to see `/study` traffic cleanly, given the app's own redirect-to-dashboard-if-no-deck behavior could otherwise show `/study` visits attributed to `/dashboard`.
   - Recommendation: This is a "read the actual dashboard once real data exists" question, not something resolvable via docs alone — the planner should schedule the D-03 comparison-doc task to explicitly confirm which view (Route vs Path) cleanly isolates each of the 4 key routes before drawing conclusions from the numbers, and note the `/study` query-string caveat as something to check.

3. **Per-run Speed-Insights event cost of running the perf harness against prod during the 14-day window.** — RESOLVED: 18-06 T2 notes the harness-inflation caveat in the comparison doc so harness traffic is not misattributed to real users; non-blocking (monthly cap resets, failure mode is pause not data loss).
   - What we know: Hobby tier caps at 10,000 events/month; a real prod page load with the Speed Insights script installed will emit RUM data points same as a real user visit.
   - What's unclear: Exact event count per `measure:cwv`/`perf:recert` invocation (24 route×preset×run page loads in a full run) was not measured live in this research session.
   - Recommendation: Not a blocker — the cap resets monthly and pausing (not data loss) is the failure mode — but the comparison doc should note if any obvious spike from harness runs shows up in the "by day" breakdown, so field data isn't accidentally attributed to "real user traffic" when it was actually the harness itself.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All `.mjs` scripts, orchestrator | ✓ | Confirmed Node 20+ (drizzle column resolution note in `qa-lib.mjs` mentions Node 25.8.1 confirmed working) | — |
| `lighthouse` (npm) | CWV half of re-cert | ✓ | ^13.3.0, installed | — |
| `puppeteer-core` (npm) | CWV half of re-cert | ✓ | ^24.43.1, installed | — |
| Playwright Chromium browser | Nav-gate half of re-cert | ✓ (implied — `measure-cwv.mjs` hardcodes a working `CHROME_PATH` default pointing at Playwright's bundled chromium-1208) | chromium-1208 | `CHROME_PATH` env override documented |
| `@vercel/speed-insights` (npm) | PERF-05 field data | ✗ — not yet installed | 2.0.0 available on registry | None needed — installation is the task itself; gated behind `checkpoint:human-verify` per Package Legitimacy Audit |
| `python`/`pip` (for slopcheck) | Package Legitimacy Gate tooling | ✗ — Windows Store execution-alias stub only, no real interpreter | — | Graceful degradation applied: package tagged `[ASSUMED]`, gated behind human verification per protocol |
| Vercel dashboard access (Josh) | Enabling Speed Insights, reading p75 data | Not verifiable from this environment | — | Manual step per D-01/D-02, owned by Josh, not blocking code work |
| Live deployed prod (`leocards.vercel.app`) | D-10 fresh baseline, D-06 CWV half of every re-cert run | Assumed reachable (existing harness already targets it) | — | — |

**Missing dependencies with no fallback:**
- None — the one missing piece (`@vercel/speed-insights`) is itself the task to install, and the Vercel dashboard toggle is an explicitly-assigned manual step (D-01), not a blocker to code work.

**Missing dependencies with fallback:**
- slopcheck (Package Legitimacy Gate) — fallback is the documented `[ASSUMED]` + `checkpoint:human-verify` gating, applied above.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.1 (unit) + Playwright ^1.58.2 (e2e/nav-gate) |
| Config file | `vitest.config.ts` (excludes `e2e/**`) / `playwright.config.ts` (`testDir: "./e2e"`) |
| Quick run command | `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` |
| Full suite command | `npx vitest run` (unit) + `PERF_PROD_BUILD=1 npx playwright test e2e/13-perf.spec.ts` (nav-gate, needs a local prod build running first) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-05 | `<SpeedInsights />` renders in the root layout without breaking any existing route | unit/smoke | Existing `tsc --noEmit` + `npx vitest run` (no dedicated new test needed — this is a one-line JSX addition to an already-tested layout tree; a full render-smoke test is optional) | ✅ (existing suite covers layout-adjacent regressions indirectly; no direct layout render test currently exists) |
| PERF-06 (D-13-1) | Gate evaluator correctly flags synthetic failing medians as FAIL and passing medians as PASS, including the D-11 exception-gate and D-09 drift-warning logic | unit | `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` (extended) | ❌ Wave 0 — `evaluateGates`/`deriveExceptionGate` do not exist yet |
| PERF-06 (D-13-2) | Full re-cert pipeline prints a red failure table and exits non-zero when thresholds are impossibly tight (`GATE_TBT=10`), against real prod | manual/scripted demo (not a permanent automated test — a one-time evidence-generating run per D-13) | `GATE_TBT=10 DATABASE_URL=... node scripts/perf-recert.mjs` (output committed as evidence, not re-run in CI) | ❌ Wave 0 — `perf-recert.mjs` does not exist yet |
| PERF-06 (D-12) | Nav gate stays green at 850ms | e2e (existing) | `PERF_PROD_BUILD=1 npx playwright test e2e/13-perf.spec.ts` | ✅ already exists and passes per 17-05-SUMMARY.md addendum |

### Sampling Rate
- **Per task commit:** `npx vitest run scripts/__tests__/measure-cwv-lib.test.ts` (fast, seconds — pure functions only)
- **Per wave merge:** Full `npx vitest run` (unit) — the nav-gate/CWV-harness live runs are expensive (minutes) and should be sampled once per wave, not per commit
- **Phase gate:** Full `npm run perf:recert` (or chosen name) end-to-end against real prod + local prod build, before `/gsd:verify-work` closes the phase

### Wave 0 Gaps
- [ ] `scripts/__tests__/measure-cwv-lib.test.ts` — extend with `evaluateGates`/`deriveExceptionGate` test cases covering: all-pass, single-metric-fail, D-11 exception-gate pass, D-09 drift-warning-without-failure
- [ ] `scripts/perf-recert.mjs` — does not exist; new orchestrator script, no existing test harness to extend (a thin integration smoke test could be added but the D-13(2) live demo is explicitly a one-time evidence artifact, not a repeatable automated test, per the locked decision's own wording "one real end-to-end run")
- [ ] Framework install: none — vitest and Playwright are both already configured and used by adjacent files

## Security Domain

This phase is internal tooling + a third-party RUM script — there is no new user-facing input surface, authentication change, or data-access-control change. The relevant ASVS categories are mostly not applicable; the two real considerations are secret handling (already governed by existing project convention) and supply-chain trust in the one new dependency.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | The re-cert harness reuses the EXISTING `*test.local` provisioning/sign-up flow unchanged — no new auth surface |
| V3 Session Management | No | Session token handling (never logged, injected per-run) is unchanged, inherited from `measure-cwv.mjs` |
| V4 Access Control | No | No new authorization boundary introduced |
| V5 Input Validation | Partial | New `GATE_LCP`/`GATE_TBT`/`GATE_CLS`/`GATE_PERF` env-var overrides should be validated as finite positive numbers (mirroring the existing `ROUTES.length === 0` fail-loud pattern in `measure-cwv.mjs`) before being used in threshold comparisons, to avoid a malformed override silently disabling a gate (e.g. `Number("abc")` → `NaN`, and `medians.lcp > NaN` is always `false`, which would silently make every gate pass) |
| V6 Cryptography | No | No new cryptographic operation |
| V14 Configuration (supply chain) | Yes | The one new dependency (`@vercel/speed-insights`) should be installed via a `checkpoint:human-verify` gate per the Package Legitimacy Audit above, since automated slopcheck verification was unavailable in this environment |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session token / DB credential leakage via console logging in a new perf script | Information Disclosure | Existing convention already enforced across `measure-cwv.mjs`/`qa-lib.mjs`: session tokens and passwords are NEVER logged (only emails); the new `perf-recert.mjs` orchestrator must follow the same discipline, especially if it inherits/passes through `DATABASE_URL` or session tokens between spawned child processes |
| Malicious/compromised third-party RUM script (`@vercel/speed-insights`) | Tampering / Information Disclosure | Vercel is the same platform this app already deploys to and trusts with its production infrastructure; the package is first-party Vercel tooling with no `postinstall` script (verified via `npm view scripts.postinstall`) — residual risk is standard npm supply-chain trust, mitigated by the `checkpoint:human-verify` gate |
| Malformed env-var gate override silently passing (e.g. `NaN` comparison) | Tampering (of the gate's own trustworthiness — "red must mean a real regression") | Explicit `Number.isFinite()` validation on every `GATE_*` override before use, failing loud (mirroring the project's existing `extractMetrics`/`getBundleKb` fail-loud-on-`NaN` convention already read in `measure-cwv-lib.mjs`) |

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/02-guides/analytics.md` — confirmed Next.js's own built-in Web Vitals reporting options (`useReportWebVitals`) and pointed at the managed Vercel service as the alternative
- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-15.md` (lines 596-599) — confirmed auto-instrumentation for Speed Insights was removed in Next.js 15, requiring the manual package path
- https://vercel.com/docs/speed-insights/quickstart — official Vercel docs, fetched live during this research pass; confirmed the exact `@vercel/speed-insights/next` App Router integration pattern, the two-step (dashboard-enable + package-install) activation flow, and the "wait for a deployment" caveat
- https://vercel.com/docs/speed-insights/using-speed-insights — official Vercel docs; confirmed Route-vs-Path breakdown view and p75-default percentile reporting
- https://vercel.com/docs/speed-insights/limits-and-pricing — official Vercel docs; confirmed Hobby-tier 10,000 events/month cap, 7-day reporting window, pause-not-lose behavior on cap
- https://vercel.com/docs/speed-insights/metrics — official Vercel docs; confirmed the Good/Needs-Improvement/Poor thresholds match Google's standard CWV Good band (LCP ≤2.5s, CLS ≤0.1, INP ≤200ms) and that p75 is the default percentile
- `npm view @vercel/speed-insights version` / `time.modified` / `scripts.postinstall` / `repository.url` — registry ground truth: v2.0.0, published 2026-07-03, no postinstall script, source at `github.com/vercel/speed-insights`
- Direct file reads (this session): `scripts/measure-cwv.mjs`, `scripts/measure-cwv-lib.mjs`, `scripts/qa-lib.mjs` (lines 1-55), `scripts/cleanup-test-users.mjs`, `e2e/13-perf.spec.ts`, `e2e/perf-markers.ts`, `playwright.config.ts`, `vitest.config.ts`, `src/app/layout.tsx`, `package.json`, `AGENTS.md`, `.planning/config.json`, `.planning/phases/16-performance-baseline-measure/{16-CONTEXT.md,baseline/16-BASELINE-SUMMARY.md}`, `.planning/phases/17-performance-optimization/{17-CONTEXT.md,17-05-SUMMARY.md,measurements/deck-new-card-baseline.md}`, `.planning/STATE.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/18-field-validation-guardrails/18-CONTEXT.md`

### Secondary (MEDIUM confidence)
- WebSearch summary of `@vercel/speed-insights` current version/install command — cross-verified against both the official quickstart docs (above) and the npm registry directly, so effectively promoted to HIGH confidence via corroboration

### Tertiary (LOW confidence)
- None — every claim in this research was either read directly from the repo, confirmed via official Vercel documentation, or confirmed via a live registry query

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — the single new package's integration pattern is confirmed by official docs AND the registry AND the repo's own Next-15-removed-auto-instrumentation note all agreeing
- Architecture: HIGH — every reused component (`measure-cwv.mjs`, `measure-cwv-lib.mjs`, `e2e/13-perf.spec.ts`, `playwright.config.ts`) was read in full this session; the new orchestrator design directly mirrors existing, working patterns in this repo (spawnSync child-process composition, pure-lib extension, atomic report writes)
- Pitfalls: HIGH for the code-level gotchas (all read directly from source comments already documenting hard-won bugs); MEDIUM for the prod-deployment-freshness question (Pitfall 1 / Assumption A2) since it could not be verified live from this research environment

**Research date:** 2026-07-24
**Valid until:** 30 days (stable domain — the harness code is locally owned and won't drift; the one external dependency, `@vercel/speed-insights`, should be re-verified at plan time if planning is delayed more than ~2 weeks, since it's a young v2.0.0 release that could see a quick patch)
