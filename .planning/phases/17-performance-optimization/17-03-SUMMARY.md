---
phase: 17-performance-optimization
plan: 03
subsystem: performance
tags: [nextjs, react-server-components, client-boundary, lighthouse, cwv, dashboard]

# Dependency graph
requires:
  - phase: 17-performance-optimization (plan 01)
    provides: Route-filtered measure-cwv.mjs harness + OUT_DIR redirect (this plan's checkpoint re-measurement invokes it against /dashboard); the deck-view.tsx pre-split baseline test (17-01's regression-proof fixture, kept green and unchanged by this plan)
  - phase: 17-performance-optimization (plan 02)
    provides: Confirmed-unchanged 514.72 KB / 9-chunk shared floor as this plan's before-reference; three/@types/three hygiene and dead-code removal completed ahead of this wave's route-specific work
  - phase: 16-performance-baseline-measure
    provides: The immutable /dashboard baseline (mobile TBT 518ms, Perf 86, LCP 1816.88ms, CLS 0; desktop TBT 52ms, Perf 92) this plan's re-measurement is compared against
provides:
  - HabitatHero converted to a Server Component (the "use client" directive removed, zero other change)
  - CountdownTimer extracted as a standalone "use client" leaf (src/components/countdown-timer.tsx), importable directly by an RSC
  - dashboard/page.tsx server-renders the entire static shell directly (layout wrapper, HabitatHero, action buttons, StatusText's non-countdown branches); only CountdownTimer + a new DashboardHeader client leaf hydrate
  - D-02 resolved against the real Daybreak design mock — existing static HabitatMedallion confirmed sufficient, no new media added
  - data-perf-ready="true" marker on the dashboard's real-content root (D-15 signal for Wave 5's waitForPerfReady)
  - Route-scoped /dashboard warm-prod re-measurement vs the Phase 16 baseline, committed as evidence
  - Recorded D-04 human decision — Accept, continue to Wave 4; the dashboard gate stays explicitly open pending Wave 4's shared-weight work and the phase-end full run
affects: [17-04, 17-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-06 client->RSC boundary split: the server component renders ALL static markup directly and imports ONLY the specific interactive leaves (CountdownTimer, DashboardHeader) rather than wrapping the whole shell in one client boundary — mirrors the existing habitat page/scene precedent"
    - "When an existing client component (AppHeader) needs a non-serializable callback prop from a server parent, extract a small named client leaf (DashboardHeader) that owns just that callback, rather than forcing the parent RSC to become client"
    - "Measured no-change is a valid, honest outcome: a client->RSC conversion can be verifiably correct (build passes, tests pass, behavior preserved) while producing ~0 measurable TBT/Perf movement, because the actual weight lives in the shared-chunk floor, not the per-route boundary — do not conflate 'the refactor worked' with 'the metric moved'"

key-files:
  created:
    - src/components/countdown-timer.tsx
    - src/components/dashboard-header.tsx
    - .planning/phases/17-performance-optimization/measurements/dashboard-baseline.md
    - .planning/phases/17-performance-optimization/measurements/dashboard-mobile-runs.json
    - .planning/phases/17-performance-optimization/measurements/dashboard-desktop-runs.json
  modified:
    - src/components/habitat-hero.tsx
    - src/components/deck-view.tsx
    - src/app/(protected)/dashboard/page.tsx
    - .planning/phases/17-performance-optimization/measurements/16-BASELINE-SUMMARY.md

key-decisions:
  - "D-04 checkpoint resolved by Josh: Accept — continue to Wave 4. The split is correct D-06 progress at zero cost even though the dashboard gate is not yet met; the measured no-change is evidence the TBT weight lives in the shared-chunk floor (CardList's motion/react + lucide-react, auth, providers), which Wave 4 targets directly. No fidelity change was made or approved."
  - "D-02 resolved without new media: the Daybreak dashboard mock (design/handoff-daybreak/daybreak-dashboard.jsx) shows a fully static HabitatMedallion; combined with LCP already passing (1816ms), the existing static approach satisfies D-02 (D-12 no gold-plating)."
  - "HabitatMedallion (still \"use client\") stays out of scope for 17-03 — it was never named in this plan's files_modified, and Josh's D-04 rationale explicitly excludes it from this wave's cost/benefit accounting."
  - "DashboardHeader (new client leaf, not named in the plan's files_modified frontmatter) was added because AppHeader needs a non-serializable onDeckChange callback that a Server Component cannot pass as a prop — this is the exact contingency the plan's own Task 2 action text anticipated (\"otherwise wrap only the deck-switcher control\"), not an unplanned architectural change."

patterns-established:
  - "Honest 'no material change' reporting: when a structurally-correct optimization produces no measurable metric movement, say so plainly with raw evidence rather than reframing it as a partial win — this lets the next wave target the real lever against a clean, undistorted baseline."

requirements-completed: [PERF-03]

# Metrics
duration: ~25min active (2 sessions; see Performance section for the multi-day checkpoint-pause caveat)
completed: 2026-07-08
---

# Phase 17 Plan 03: Dashboard Client→RSC Split + D-02/D-04 Resolution Summary

**HabitatHero converted to a Server Component and DeckView's static shell now renders directly in dashboard/page.tsx (only CountdownTimer + a new DashboardHeader client leaf hydrate) — the re-measurement shows essentially zero net TBT/Perf change (524ms/86 vs baseline 518ms/86), confirming the dashboard's real bottleneck lives in the shared-chunk floor rather than this route's own client boundary; Josh accepted the D-04 checkpoint to continue into Wave 4 with the dashboard gate explicitly still open.**

## Performance

- **Duration:** ~25 min active agent time across two sessions, split by a 5-day human-decision pause:
  - **Session 1 (2026-07-03, ~10 min):** Tasks 1-2 implemented and committed, checkpoint measurement run, executor paused for the D-04 decision (autonomous:false gate).
  - **Checkpoint pause (2026-07-03 → 2026-07-08, ~5 days):** awaiting Josh's D-04 verdict — not counted as active duration, consistent with how checkpoint/auth gates are treated as normal flow rather than execution time.
  - **Session 2 (2026-07-08, this continuation, ~15 min):** verified prior commits, committed measurement artifacts, wrote this summary, updated tracking.
- **Started:** 2026-07-03T01:15:52+01:00 (Task 1 commit)
- **Completed:** 2026-07-08 (this closeout session)
- **Tasks:** 3/3 (2 auto tasks + 1 checkpoint, all complete)
- **Files modified:** 9 (2 components modified in-place, 2 new client leaves created, 1 page.tsx server-render rewrite, 4 measurement artifacts)

## Accomplishments
- HabitatHero is now a genuine Server Component — the `"use client"` directive was the only line removed; every other line (props destructure, inline SVG, `<Link>`, `<HabitatMedallion>`) was already RSC-safe, confirmed transitively since HabitatMedallion itself is hooks-free
- CountdownTimer extracted verbatim into its own `"use client"` leaf (`src/components/countdown-timer.tsx`), so the genuinely-reactive 60s-tick/`router.refresh()` logic can be imported directly by a Server Component without dragging the rest of the dashboard shell into a client boundary
- `dashboard/page.tsx` now server-renders the entire static shell directly (layout wrapper, HabitatHero, action-button block, StatusText's non-countdown branches) instead of delegating to the all-client `<DeckView>`; only `CountdownTimer` and a new `DashboardHeader` client leaf (wrapping `AppHeader`'s non-serializable `onDeckChange` callback) hydrate
- The QA server-side gate is preserved exactly: `cooldownUntil` is threaded to `CardList` only when `qaMode` (from `readQaAuth()`) is true; the else-branch is a hardcoded `null` — verified by direct grep of the ternary, satisfying threat T-17-03-01
- `data-perf-ready="true"` added to the dashboard's real-content root (the `<CardList>` wrapper), giving Wave 5's `waitForPerfReady` its D-15 signal on this route
- D-02 resolved against the real design: the Daybreak dashboard mock shows a fully static medallion with no ambient clip, and the baseline's LCP already passes (1816ms) — the existing static-image approach is confirmed sufficient; no new media was added (D-12 no gold-plating)
- The route-scoped `/dashboard` warm-prod re-measurement ran and is committed as evidence: mobile TBT 524ms / Perf 86 (both essentially unchanged from the 518ms / 86 baseline — both still fail their gates), LCP 1816.44ms and CLS 0 (both still pass)
- The D-04 gate-vs-fidelity checkpoint was raised with full measured evidence and resolved by Josh: **Accept — continue to Wave 4**, with the dashboard gate explicitly left open

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert HabitatHero to RSC + extract CountdownTimer client leaf** - `7e4a4e0` (feat)
2. **Task 2: Server-render the dashboard shell (D-06 split) + resolve D-02** - `4cc6774` (feat)
3. **Task 3 (checkpoint): /dashboard re-measurement vs Phase 16 baseline (D-04 evidence)** - `f5ed43b` (test)

**Plan metadata:** (this commit, following SUMMARY.md write)

_Note: Task 3 is a `checkpoint:human-verify` gate, not a code task — its "commit" is the measurement-artifact evidence backing the D-04 decision, not a feature change._

## Files Created/Modified
- `src/components/habitat-hero.tsx` - `"use client"` directive removed; now a Server Component (zero other change)
- `src/components/countdown-timer.tsx` - NEW: extracted `CountdownTimer` + `formatCountdown` client leaf (useState/useEffect/`router.refresh()`, moved verbatim from deck-view.tsx)
- `src/components/dashboard-header.tsx` - NEW: thin client wrapper around `AppHeader`, owning only the `onDeckChange` → `router.push` callback so the server parent doesn't need to pass a non-serializable function
- `src/app/(protected)/dashboard/page.tsx` - Now server-renders the full static dashboard shell directly (334 lines added); imports only `CountdownTimer` and `DashboardHeader` as client leaves; preserves the `readQaAuth()` gate; adds `data-perf-ready="true"` on the real-content root
- `src/components/deck-view.tsx` - Updated to import `CountdownTimer` from the new file instead of defining it inline; kept in the codebase (no longer rendered in production) solely as the 17-01 pre-split behavior-preservation baseline test target
- `.planning/phases/17-performance-optimization/measurements/dashboard-baseline.md` - Human-readable `/dashboard` post-split medians (mobile + desktop), bundle composition, bottleneck classification
- `.planning/phases/17-performance-optimization/measurements/dashboard-mobile-runs.json` / `dashboard-desktop-runs.json` - Raw per-run Lighthouse data (6 runs each, run 1 discarded as the cold Vercel hit, medians of the remaining 5)
- `.planning/phases/17-performance-optimization/measurements/16-BASELINE-SUMMARY.md` - Cross-route summary row updated for this run's scope (`/dashboard` only)

## Decisions Made

- **D-04 (gate-vs-fidelity checkpoint) — Accept, continue to Wave 4.** Josh's verdict: the split is correct D-06 progress at zero cost; the measured no-change proves the dashboard's TBT weight lives in the shared-chunk floor (CardList's `motion/react` + `lucide-react`, auth, providers) which Wave 4 targets. HabitatMedallion (still `"use client"`) was outside 17-03's scope. The dashboard gate remains **unmet** at this point **by explicit decision** — it gets re-attacked indirectly by Wave 4's shared-weight work and re-measured in the official phase-end full run. No fidelity change was made or approved.
- **D-02 resolved without new media.** The Daybreak dashboard handoff mock (`design/handoff-daybreak/daybreak-dashboard.jsx`) shows a fully static medallion — no ambient video called for. Combined with the baseline's LCP already passing at 1816ms, D-02 is satisfied by the existing static approach; per D-12 (no gold-plating), no new media was added.
- **DashboardHeader is a plan-anticipated addition, not an unplanned architectural change.** It is not named in the plan's `files_modified` frontmatter, but Task 2's own action text explicitly anticipated this exact contingency: "the deck-switch client boundary for the `<AppHeader onDeckChange>` wiring... otherwise wrap only the deck-switcher control." AppHeader needs a non-serializable callback a Server Component cannot pass as a prop, so a small named client leaf was the correct, plan-sanctioned resolution.
- **`requirements-completed: [PERF-03]` is recorded per this plan's `requirements` frontmatter field (template convention, matching 17-01 and 17-02's precedent), but `PERF-03`'s checkbox in REQUIREMENTS.md is intentionally left unchecked.** PERF-03 requires every key route to meet its CWV gates; the dashboard gate is explicitly unmet per the D-04 decision above. Neither 17-01 nor 17-02 flipped this checkbox either, despite listing the same requirement ID — the actual completion mark is deferred to the plan where the full-route gate is genuinely satisfied (expected at 17-05's phase-end full run).

## Deviations from Plan

None — Tasks 1-2 executed per the plan's own action text, including the two contingencies it explicitly anticipated (D-02's design-driven resolution, and AppHeader's callback needing its own small client leaf). No Rule 1-4 auto-fixes were required; commit messages and diffs show no bug fixes, missing-functionality additions, or blocking-issue resolutions.

### Auto-fixed Issues

None.

## Issues Encountered

- **The measurement harness's cross-route summary file (`16-BASELINE-SUMMARY.md`) overwrites rather than appends.** This run's `/dashboard` row replaced 17-02's `/habitat` row entirely rather than adding a second row — the harness (built in Phase 16, extended in 17-01) writes a fresh summary scoped to whatever `ROUTE_FILTER` was active for that invocation, with no accumulation across separate runs. This is a pre-existing harness behavior, not something this plan's tasks touched or introduced, and fixing it would require editing `scripts/measure-cwv.mjs` — out of this plan's declared `files_modified` scope and out of this closeout session's scope (source code was not touched). Flagged here for phase-level awareness; the underlying per-route evidence (`habitat-baseline.md` from 17-02, `dashboard-baseline.md` from this plan, and their respective raw-runs JSON) is intact and uncorrupted regardless of this summary-file's overwrite behavior.
- **No independent re-run of Task 1/2's automated verification in this closeout session.** Both tasks' acceptance criteria (`npx tsc --noEmit`, `npx vitest run src/components/deck-view.test.tsx`, `npm run build`, scoped `npx biome ci`) were satisfied at commit time per the plan's own verify steps — their existence as committed, atomic task commits is the evidence those gates passed originally. This continuation session re-confirmed the load-bearing claims via direct file inspection instead (grep for the removed `"use client"` line, the `router.refresh()` call, `readQaAuth`/`data-perf-ready` presence, and the `cooldownUntil` ternary's `null` else-branch) rather than re-running the full build/test suite, consistent with the explicit continuation-scope instruction not to touch source code or re-run measurements.

## User Setup Required

None - no external service configuration required. The re-measurement used the existing `DATABASE_URL` from `.env.local` (already configured from prior phases); no new environment variables introduced.

## Next Phase Readiness
- Wave 4 (17-04) inherits an accurate, honest before-reference: the dashboard's client→RSC split is structurally complete and correct, but produced ~0 measurable TBT/Perf movement, confirming the real lever is the shared-chunk floor (CardList's `motion/react` + `lucide-react`, auth, providers) that 17-04 explicitly targets across study/new-card/browse
- The immutable Phase 16 baseline is untouched (`git status --porcelain .planning/phases/16-performance-baseline-measure/baseline/` empty, confirmed both before Task 3 ran and again at this closeout)
- The `/dashboard` gate (TBT ≤200ms, Perf ≥90) remains open by explicit D-04 decision — it is not a Wave 4 blocker, but it must be re-measured at the phase-end full run (17-05) once Wave 4's shared-weight work lands
- No blockers identified for Wave 4

---
*Phase: 17-performance-optimization*
*Completed: 2026-07-08*

## Self-Check: PASSED

All 9 claimed files verified present on disk (2 new client leaves, 3 modified components/pages, 4 measurement artifacts); all 3 claimed commit hashes (7e4a4e0, 4cc6774, f5ed43b) verified present in git log.
