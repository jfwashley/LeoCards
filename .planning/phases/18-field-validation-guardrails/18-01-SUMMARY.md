---
phase: 18-field-validation-guardrails
plan: 01
subsystem: infra
tags: [vercel, speed-insights, rum, field-data, cwv]

# Dependency graph
requires:
  - phase: 17-performance-optimization
    provides: lab-CWV measurement harness (scripts/measure-cwv.mjs) that field data will be compared against in Plan 06
provides:
  - "@vercel/speed-insights installed and mounted in the root layout (src/app/layout.tsx)"
  - "Production live on main HEAD (fda0b54) with Speed Insights enabled in the Vercel dashboard"
  - "D-03 14-day field-data window, start date 2026-07-25"
affects: [18-06 (field-vs-lab comparison doc — cannot run until the D-03 window closes on/after 2026-08-08)]

# Tech tracking
tech-stack:
  added: ["@vercel/speed-insights (2.x, Vercel first-party)"]
  patterns:
    - "SpeedInsights mounted as a Server Component sibling after {children} inside <body> — no props, no client directive, additive-only diff to layout.tsx"

key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - src/app/layout.tsx

key-decisions:
  - "T-18-SC package-legitimacy gate resolved by Josh: @vercel/speed-insights confirmed Vercel first-party, v2.0.0, source repo vercel/speed-insights present, no postinstall script — approved before install per the blocking-human gate."
  - "D-03 14-day field-data window start date = 2026-07-25 (window closes on/after 2026-08-08). This is the date the orchestrator confirmed prod was serving the Speed Insights loader AND the dashboard toggle was enabled AND a live beacon fired — all three preconditions for field data to begin accruing."
  - "The same deploy that starts the D-03 window also resolves the Phase 17 'Deploy HELD' concern — prod now runs main HEAD (fda0b54), which includes Phase 26/27 optimized code, not the stale 2026-07-15 build. This makes prod current for the Plan 03 baseline as a side effect."

patterns-established:
  - "Pattern: two-step Vercel product activation (install+mount code, THEN dashboard toggle, THEN a deploy that lands after the toggle) — any future add-on Vercel product (e.g. Web Analytics) should follow the same checkpoint structure: auto-install task, then a human-action checkpoint for dashboard + deploy + beacon verification."

requirements-completed: [PERF-05]

# Metrics
duration: n/a (spans two sessions across a human-action checkpoint; active work ~10min)
completed: 2026-07-25
---

# Phase 18 Plan 01: Vercel Speed Insights Field-Data Wiring Summary

**`@vercel/speed-insights` installed and mounted in the root layout, production redeployed to main HEAD with Speed Insights enabled and beacon confirmed firing — the 14-day D-03 field-data window started 2026-07-25.**

## Performance

- **Duration:** ~10min active work (Tasks 1-2), plus a human-action checkpoint (Task 3) spanning dashboard config + deploy time outside executor control
- **Started:** 2026-07-24 (Task 1 legitimacy gate)
- **Completed:** 2026-07-25 (Task 3 checkpoint resolved)
- **Tasks:** 3 (1 blocking-human checkpoint, 1 auto, 1 blocking human-action checkpoint)
- **Files modified:** 3 (package.json, package-lock.json, src/app/layout.tsx)

## Accomplishments
- Package legitimacy verified before install (T-18-SC): Vercel first-party, v2.0.0, source repo present, no postinstall script.
- `@vercel/speed-insights` installed; `<SpeedInsights />` mounted via the `/next` entry point as a sibling after `{children}` inside `<body>` in `src/app/layout.tsx` — additive-only diff, no other layout changes.
- Speed Insights enabled in the Vercel dashboard by Josh.
- Production deployed with current `main` HEAD (`fda0b54`) — `origin/main` == `fda0b54`, which includes Phase 26/27 optimized code plus the SpeedInsights mount. This also resolves the Phase 17 "Deploy HELD" concern noted in STATE.md — prod is no longer serving the stale 2026-07-15 build.
- Beacon confirmed firing: a live page load of `https://leocards.vercel.app/login` produced a 200 GET for the Speed Insights loader script (`/1c7feed240cb2d93/script.js`, content contains `speed-insights` + `vitals` markers), and `https://leocards.vercel.app/_vercel/speed-insights/script.js` independently returns HTTP 200.
- **D-03 14-day field-data window start date: 2026-07-25** (window closes on/after 2026-08-08). Plan 06's field-vs-lab comparison doc cannot run before this date.

## Task Commits

1. **Task 1: Package legitimacy gate (T-18-SC)** - n/a (blocking-human checkpoint, no files modified — approved by Josh: publisher vercel-release-bot, repo vercel/speed-insights, v2.0.0, no install scripts)
2. **Task 2: Install @vercel/speed-insights + mount in root layout** - `fda0b54` (feat)
3. **Task 3: Enable Speed Insights, deploy current main to prod, start the D-03 window** - n/a (blocking human-action checkpoint, no files modified — Josh enabled the dashboard toggle; orchestrator pushed `main` to `origin/main` with Josh's authorisation, confirmed `origin/main` == `fda0b54`, confirmed the live Speed Insights loader script and a firing beacon)

## Files Created/Modified
- `package.json` - added `@vercel/speed-insights` (2.x) dependency
- `package-lock.json` - lockfile update for the new dependency
- `src/app/layout.tsx` - added `import { SpeedInsights } from "@vercel/speed-insights/next"` and rendered `<SpeedInsights />` after `{children}` inside `<body>`

## Decisions Made
- T-18-SC legitimacy gate resolved (see key-decisions in frontmatter).
- D-03 window start date recorded as 2026-07-25.
- Deploying current `main` to prod (Task 3) was used to simultaneously resolve the Phase 17 "Deploy HELD" deployment-freshness concern, since main HEAD already contained Phase 26/27 code alongside this plan's SpeedInsights mount.

## Deviations from Plan

None - plan executed exactly as written. Both checkpoints (Task 1 blocking-human legitimacy gate, Task 3 blocking human-action deploy/enable/verify gate) were resolved by Josh per their `how-to-verify` steps, with no deviation from the acceptance criteria.

## Issues Encountered
None. The two-step Speed Insights activation (dashboard toggle + a deploy landing after the toggle) completed cleanly on the first attempt, with the deploy also resolving the pre-existing stale-prod concern from Phase 17.

## User Setup Required

None remaining - the two external-service steps required (Vercel Speed Insights dashboard enable, production deploy) were completed by Josh as part of Task 3's checkpoint resolution. No further manual configuration needed for this plan.

## Next Phase Readiness
- Field-data collection is live: package installed, `<SpeedInsights />` rendered, dashboard enabled, prod current, beacon confirmed.
- The D-03 14-day window (2026-07-25 through on/after 2026-08-08) must elapse before Plan 06's field-vs-lab comparison doc can run. Plans 02-05 (gate evaluator, baseline, orchestrator, live demo) proceed independently during the window per D-02 (wired early, time-boxed not traffic-gated).
- No blockers for Plan 02 (already complete) or Plans 03-05.

---
*Phase: 18-field-validation-guardrails*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: src/app/layout.tsx (SpeedInsights mount present)
- FOUND: package.json (@vercel/speed-insights dependency present)
- FOUND: fda0b54 (feat commit — install + mount)
- FOUND: origin/main == fda0b54 (production deploy confirmed current)
