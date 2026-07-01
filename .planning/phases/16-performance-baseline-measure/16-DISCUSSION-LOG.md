# Phase 16: Performance baseline (Measure) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 16-performance-baseline-measure
**Areas discussed:** Auth-route fidelity, Route coverage, Baseline artifact, Measure surface

---

## Auth-route fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Real authed routes required | Harness signs in first (reuse Phase-15 cookie capture); baseline measures the actual logged-in pages. Mechanism → research. | ✓ |
| Best-effort / public-reachable | Accept measuring only what's reachable unauthenticated (login shell) if authing proves fiddly. | |

**User's choice:** Real authed routes required (D-01)
**Notes:** Confirmed 3 of 4 routes are under `src/app/(protected)/`. Mechanism (Lighthouse-with-session vs Playwright real-browser-metrics extending `e2e/13-perf.spec.ts`) left to research; the locked constraint is fidelity. Claude added D-02 (provision realistic deck+card state so authed pages aren't empty) as a discretion item.

---

## Route coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly the 4 | /dashboard, /study, /deck/new-card, /deck/browse; /habitat excluded (already green, owned by 13.1). | ✓ |
| The 4 + /habitat CWV anchor | Add a CWV-median-only re-check on /habitat as a cheap regression anchor. | |
| The 4 + full /habitat | Treat /habitat as a full 5th route (CWV + bundle + bottleneck). | |

**User's choice:** Exactly the 4 (D-03)
**Notes:** Keeps scope tight to the un-measured routes. `/habitat` anchor deferred — revisit if Phase-17 refactors risk touching habitat.

---

## Baseline artifact

| Option | Description | Selected |
|--------|-------------|----------|
| Per-route markdown + raw JSON | Human-readable report per route + machine-diffable JSON. | ✓ |
| Single consolidated PERF-BASELINE.md | One doc, easier to skim, thinner per-route + no machine data. | |
| Raw JSON only | Leanest; loses the human-readable bottleneck narrative. | |

**User's choice:** Per-route markdown + raw JSON (D-04)
**Notes:** Matches PERF-02's "each route has a report" and gives Phase 17 precise before/after diffing.

---

## Measure surface

| Option | Description | Selected |
|--------|-------------|----------|
| Warm-prod CWV + local build for bundle | CWV strictly warm Vercel prod; local `next build` only to source bundle composition. | ✓ |
| Also record local prod-build CWV | Add local `next build && start` CWV as a reproducible/CI-able reference. | |

**User's choice:** Warm-prod CWV + local build for bundle (D-05)
**Notes:** Clean surface separation, matches the roadmap lock. Local-CWV/CI gate deferred to Phase 18.

---

## Claude's Discretion

- Authed-route measurement mechanism (research decision per D-01).
- D-02 realistic-state provisioning (reuse Phase-15 `provision`) — locked on Josh's behalf so authed-route numbers are meaningful.
- Median stat, n≥5, mobile+desktop, warm-up discipline (D-06); 3-way bottleneck taxonomy (D-07) — carried forward from roadmap + Phase 13.1.
- Warm-up hit count, throttling preset, JSON schema, report file naming/location — planner/research within the locked constraints.

## Deferred Ideas

- Local `next build && start` CWV as a reproducible/CI-able gate → Phase 18 (PERF-06).
- Re-baselining `/habitat` as a regression anchor → revisit in Phase 17 if needed.
- Any actual optimization → Phase 17 (PERF-03/04), strictly out of scope here.
