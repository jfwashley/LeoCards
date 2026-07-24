# Phase 18: Field validation & guardrails - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 18-field-validation-guardrails
**Areas discussed:** Field-data source (PERF-05), Re-cert command composition (PERF-06), Threshold & baseline policy, Loud-failure demonstration & run surface

---

## Field-data source (PERF-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Speed Insights | @vercel/speed-insights + dashboard enable; one root-layout component, p75 per-route out of the box; Hobby-tier sampling caveat | ✓ |
| Self-hosted web-vitals pipeline | web-vitals → own API route + Neon table; every session captured but new backend surface | |
| Both | Speed Insights + minimal self-hosted beacon; double the wiring | |

**User's choice:** Vercel Speed Insights (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| Time-boxed check | Wire now, normal usage for a set window, comparison doc against whatever accrued; thin data documented as variance, requirement closes | ✓ |
| Sample-count threshold | Minimum data points per route before comparison counts; phase could stay open indefinitely | |
| Install + document immediately | Wire it, write template with day-one data, close at once | |

**User's choice:** Time-boxed check (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| 14 days | Two weeks of normal usage; balances rigour vs milestone close | ✓ |
| 7 days | Faster close, thinner data | |
| 30 days | Most data, drags v3.0 close | |

**User's choice:** 14 days (recommended option). PERF-06 gate is built during the window — no dead time.

| Option | Description | Selected |
|--------|-------------|----------|
| CWV "Good" thresholds | Field p75 in Good band per route (LCP ≤2500, INP ≤200, CLS ≤0.1); lab TBT maps to field INP | ✓ |
| Lab medians ± tolerance | Field p75 within ±20% of lab medians; statistically shaky (p75 vs median) | |
| Speed Insights rating only | Dashboard's own Good/NI/Poor rating; least precise | |

**User's choice:** CWV "Good" thresholds (recommended option)

---

## Re-cert command composition (PERF-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Perf gates only | measure:cwv + PERF-04 nav gate (~35-40 min); qa:run/e2e stay separate | ✓ |
| Perf + core-journey | Above plus qa:run | |
| Full pre-release check | Perf + qa:run + full e2e + unit (~60+ min) | |

**User's choice:** Perf gates only (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid, as today | CWV vs deployed Vercel prod (baseline continuity); nav gate vs local prod build per D-14; run post-deploy | ✓ |
| All local prod build | Pre-push capable but numbers incomparable to prod-measured baseline | |
| Vercel preview deployment | Pre-merge but preview infra differs from prod domain | |

**User's choice:** Hybrid, as today (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| Dated report + exit code | Console PASS/FAIL table, non-zero exit, dated md + JSON artifact per run | ✓ |
| Console + exit code only | No written history | |
| Rolling LATEST report | One overwritten LATEST.md | |

**User's choice:** Dated report + exit code (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| Mobile only | All binding gates are mobile; ~14 min CWV half; desktop via flag | ✓ |
| Both presets always | Full ~28 min run, matches official after-record format | |

**User's choice:** Mobile only (recommended option)

---

## Threshold & baseline policy

| Option | Description | Selected |
|--------|-------------|----------|
| Absolute + drift warning | Hard fail on absolute CWV gates only; >~15% drift vs baseline = loud warning, not failure | ✓ |
| Absolute gates only | Simplest; quiet degradation possible until tip-over | |
| Absolute + hard ratchet | Also fail on baseline+tolerance regression; false-red risk from Lighthouse noise | |

**User's choice:** Absolute + drift warning (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, fresh full run | 4-route × 2-preset warm-prod run committed as immutable Phase 18 baseline; locks in 26/27 numbers + proves they survived deployment | ✓ |
| Fresh mobile-only run | Cheaper but inconsistent artifact set | |
| Reuse Phase 17 final run | Free but predates every 26/27 win | |

**User's choice:** Yes, fresh full run (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-derive exception gate | Per-route exception at fresh median + ~15% headroom, documented D-04-style; green day one, catches worsening | ✓ |
| Checkpoint me with the numbers | Case-by-case decision mirroring Phase 17 D-04 protocol | |
| Keep strict 200 everywhere | Permanently-red gate defeats the guardrail | |

**User's choice:** Auto-derive exception gate (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 850ms | The deliberately re-baselined 17-05 gate; headroom over 470-690ms measured range | ✓ |
| Tighten to ~700ms | Trips earlier but higher false-red risk | |
| Auto-derive like CWV exceptions | Consistent policy but replaces a hand-picked threshold | |

**User's choice:** Keep 850ms (recommended option)

---

## Loud-failure demonstration & run surface

| Option | Description | Selected |
|--------|-------------|----------|
| Unit tests + threshold-override demo | Vitest on gate evaluator with synthetic failing medians + one real run with impossible thresholds (e.g. GATE_TBT=10) proving red table + non-zero exit; output committed | ✓ |
| Unit tests only | Logic proven, live red path asserted by construction | |
| Live sabotage of the local half | Throwaway regression branch; only covers nav half, full build cycle | |

**User's choice:** Unit tests + threshold-override demo (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| Local on-demand only | One npm script; no CI secrets/bills; CI = future backlog | ✓ |
| Local + GitHub Actions (manual) | workflow_dispatch; needs prod secrets in GitHub | |
| CI on every push to main | Post-deploy anyway, ~40 min/push, flaky red | |

**User's choice:** Local on-demand only (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| Perf-relevant releases | Run after deploys touching perf surfaces + before releases/milestones; documented in script header + AGENTS.md | ✓ |
| Every milestone close only | Long detection gaps | |
| Weekly standing check | Time-based; mostly no-op runs | |

**User's choice:** Perf-relevant releases (recommended option)

---

## Claude's Discretion

- npm script name and orchestrator structure (single .mjs vs composition); run ordering within the command
- Exact drift-warning tolerance (~15% guideline) and report directory layout
- Speed Insights component placement details and route-name mapping for per-route p75
- Plan-structure representation of the 14-day window (checkpoint plan vs separate wave)
- `measure-cwv.mjs` extension approach (gate-evaluation mode vs thin wrapper) — extend, never rebuild

## Deferred Ideas

- CI integration of the re-cert gate (GitHub Actions) — backlog if the app outgrows personal scale
- Browser-Back navigation gating — carried from Phase 17; revisit only if field data shows back-nav pain
- <100ms instant-nav via PPR/Cache Components — backlog per 17-05; needs its own experimental-flag checkpoint
