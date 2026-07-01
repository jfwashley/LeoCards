# Phase 16: Performance baseline (Measure) - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

A codified, repeatable warm-prod measurement harness (`scripts/measure-cwv.mjs` + npm script) that establishes per-route truth for the four key routes — `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse` — capturing median CWV (n≥5, mobile + desktop), bundle composition, and a ranked bottleneck classification per route.

**STRICTLY MEASURE — no optimization changes land in this phase** (that is Phase 17). The baseline produced here is the immutable "before" reference every Phase-17 change diffs against. Delivers PERF-01 + PERF-02.

</domain>

<decisions>
## Implementation Decisions

### Measurement fidelity (authenticated routes)
- **D-01:** The baseline MUST measure the REAL authenticated routes, not the `/login` shell. 3 of the 4 routes live under `src/app/(protected)/`; the harness authenticates first, reusing Phase-15's `scripts/qa-lib.mjs` better-auth cookie capture (`extractSessionCookie` / `signIn`). The exact measurement **mechanism** — Lighthouse with an injected session cookie vs a Playwright real-browser-metrics harness extending `e2e/13-perf.spec.ts` — is a RESEARCH decision. The locked constraint is *fidelity*: real logged-in pages, not the redirect shell.
- **D-02:** Authed routes must render REALISTIC state, not empty states. Reuse Phase-15 `qa-lib.mjs` provisioning to seed a `*test.local` user with a deck + cards before measuring, so `/study`, `/deck/browse`, and `/deck/new-card` reflect real content (empty-state numbers would be meaningless). Self-cleaning per the Phase-15 pattern (`cleanup-test-users.mjs`).

### Route coverage
- **D-03:** Baseline EXACTLY the four roadmap routes: `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse`. `/habitat` is explicitly EXCLUDED — it is already CWV-green (LCP 2417 / TBT 97 / CLS 0 / Perf 96) and Phase 13.1 owns its baseline. Do not re-baseline it here. (A cheap `/habitat` regression anchor was considered and declined — see Deferred.)

### Baseline artifact format
- **D-04:** Each route gets BOTH: (a) a committed, human-readable **markdown** baseline report — median CWV numbers + bundle-composition table + the ranked bottleneck classification naming its single top Phase-17 target; and (b) the harness's **raw JSON** run data for exact machine diffing in Phase 17. Readable narrative + machine-comparable data, not one or the other.

### Measurement surface
- **D-05:** CWV medians come STRICTLY from warm Vercel prod (`leocards.vercel.app`) — the real-UX truth. A local `next build` is used ONLY to source bundle composition (per-route first-load JS, chunk fingerprinting via `page_client-reference-manifest`) — data that only exists in a local build. NO local prod-build CWV in this phase (a local/CI-able CWV gate is Phase-18 territory).

### Methodology (locked — from roadmap + Phase 13.1)
- **D-06:** Median statistic (not mean/p75), n≥5 runs, mobile + desktop presets. Warm-up discipline: discard cold Vercel hits before the measured runs; never gate on cold previews (±300 ms TBT noise) — established Phase 13.1.
- **D-07:** Bottleneck taxonomy is the 3-way classification named in PERF-02: **bundle vs RSC waterfall vs hydration**. Each route's report names its single top optimization target for Phase 17.

### Claude's Discretion
- Exact authed-route measurement mechanism (Lighthouse-with-session vs Playwright-PerformanceObserver extension of `e2e/13-perf.spec.ts`) — deferred to research per D-01.
- Warm-up hit count, throttling preset details, raw-JSON schema shape, and report file naming/location — planner/research choice within the D-04/D-05/D-06 constraints.
- Whether the harness drives local headless Chrome or a hosted/programmatic Lighthouse — research.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/milestones/v3.0-REQUIREMENTS.md` — §PERF-01 (codified `measure-cwv.mjs` harness, warm-prod Lighthouse medians n≥5, mobile+desktop, 4 routes) and §PERF-02 (per-route baseline report: bundle composition + ranked bottleneck classification)
- `.planning/ROADMAP.md` — §"Phase 16: Performance baseline (Measure)": goal, the four success criteria, the four-route list, the "no optimization lands" lock

### Prior perf art (the harness codifies / extends these)
- `.planning/milestones/v2.1-phases/13-3d-habitat/13-PERF-REAL.md` — the ad-hoc shell commands PERF-01 replaces; origin of the warm-prod methodology
- `.planning/milestones/v2.1-phases/13-3d-habitat/13-PERF.md` + `13-PERF-FIX-ATTEMPT-1.md` — prior measurement context, what was tried, the `/habitat` CWV-green result
- `e2e/13-perf.spec.ts` — existing Playwright per-route CWV capture (LCP/CLS/INP via PerformanceObserver); documents the "Lighthouse can't measure authed routes behind the `/login` redirect" problem and the real-browser workaround — candidate mechanism basis for D-01

### Reuse (Phase 15)
- `scripts/qa-lib.mjs` — better-auth `signIn` + `extractSessionCookie` (D-01) and `*test.local` `provision` (D-02) to drive the harness into realistic authed state; `scripts/cleanup-test-users.mjs` for self-clean

### Known issue
- Follow-up task `task_d326ebac` — INP is unreliable on a Turbopack dev server; only trustworthy on a prod build. Reinforces D-05 (CWV from warm prod, never dev).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/qa-lib.mjs` (Phase 15): `signIn` / `extractSessionCookie` for authed measurement (D-01); `provision` for realistic deck+card state (D-02); `*test.local` domain + `cleanup-test-users.mjs` for self-cleaning.
- `e2e/13-perf.spec.ts`: working real-browser CWV capture (PerformanceObserver for LCP/CLS/INP) that already solves the authed-route problem — a strong basis for the harness mechanism.

### Established Patterns
- Warm-prod measurement, medians, never cold previews (Phase 13.1).
- Node ESM `.mjs` harness scripts under `scripts/`, validated via `node --check` + scoped biome, wired as `package.json` npm scripts (Phase-15 convention).
- Routes under `src/app/(protected)/` require auth — confirms 3 of the 4 targets are behind login.

### Integration Points
- New `scripts/measure-cwv.mjs` + a `package.json` npm script (PERF-01).
- Per-route baseline reports + raw JSON output (D-04) — likely a `16-*` baseline doc/data set under `.planning/`.
- Reads local `.next` build artifacts for bundle composition (D-05).

</code_context>

<specifics>
## Specific Ideas

- Josh selected the recommended option on all four gray areas — alignment with "measure the real thing, keep route scope tight, make it diffable, keep measurement surfaces clean."
- The baseline is an IMMUTABLE before-reference: once written, Phase 17 diffs against it and never edits it.

</specifics>

<deferred>
## Deferred Ideas

- **Local `next build && start` CWV as a reproducible/CI-able gate** — deferred to Phase 18 (field validation & guardrails; PERF-06 re-certification). Not this phase (D-05).
- **Re-baselining `/habitat` as a regression anchor** — considered and declined (D-03). If Phase-17 refactors risk touching habitat, revisit then.
- **Any actual optimization** — Phase 17 (PERF-03/04). Strictly out of scope here.

</deferred>

---

*Phase: 16-performance-baseline-measure*
*Context gathered: 2026-07-01*
