---
phase: 17-performance-optimization
plan: 05
subsystem: performance
tags: [nextjs, playwright, e2e, prefetch, router-refresh, cwv]

# Dependency graph
requires:
  - phase: 17-01
    provides: PERF_READY_ATTR/waitForPerfReady/IS_PROD_BUILD perf-markers scaffold
  - phase: 17-03
    provides: dashboard RSC split precedent, D-04 checkpoint pattern
  - phase: 17-04
    provides: study/new-card/browse RSC + Motion->CSS conversions, data-perf-ready on all 4 key routes
provides:
  - 6 D-13 hub-and-spoke nav-timing tests in e2e/13-perf.spec.ts, prod-build-gated (D-14), content-visible signal (D-15)
  - task_d326ebac cleared (INP assertion prod-build-only)
  - D-17 router.refresh() invalidation after study-completion navigation
  - PERF-04 measured-and-accepted-miss verdict (Josh, 2026-07-19), closing Phase 17
  - 17-HUMAN-UAT.md carrying 3 pending manual checks into backlog
affects: [18-field-validation, backlog]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "measureNavTap() two-phase poll (wait-marker-gone, then waitForPerfReady) for in-app link-tap timing, mirroring measureVitals' warm-up discipline"
    - "IS_PROD_BUILD-gated test groups (test.skip with message) as the structural guard against accidentally certifying against next dev"

key-files:
  created:
    - .planning/phases/17-performance-optimization/17-HUMAN-UAT.md
  modified:
    - e2e/13-perf.spec.ts
    - src/components/study-session.tsx
    - src/components/word-list-browser.tsx
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "PERF-04 accepted-miss: the <=100ms instant-nav bar is architecturally unreachable with stable Next APIs because all 4 key routes are genuinely dynamic RSC (session + DB reads per request) -- dynamic pages are not fully prefetched and client cache TTL is off per prefetching.md, with staleTimes override still experimental. Measured medians on a local prod build: dashboard->study ~8,077ms, study->dashboard ~1,345ms, the other 4 pairs ~2,070-2,080ms. Josh accepted the miss and closed the phase; PERF-04 carries to Phase 18/backlog. Candidate future paths recorded but NOT chosen: loading.tsx shells (needs D-15 relaxed) or Cache Components/PPR (experimental, needs a D-07 checkpoint)."
  - "D-16 correction: Task 2's original decision ('Link default prefetch already sufficient, no code change') is measured-WRONG for these dynamic routes -- default prefetch only warms static/partial payloads, not full dynamic RSC renders. Corrected in STATE.md."
  - "Deploy held: Josh will deploy manually later. Prod still runs the 2026-07-15 deployment; Phase 17 Wave 4 (17-04 route work) and Wave 5 (this plan's nav/invalidation work) are code-complete and committed but NOT yet live."
  - "3 manual checks parked as UAT rather than blocking phase close: D-05 visual identity (4 Motion->CSS swaps), D-17 landing-freshness spot-check, and an optional post-deploy re-measure."

patterns-established:
  - "Checkpoint-resolution close-out: a continuation agent records decisions/UAT/summary/tracking without re-touching source, when the human verdict is 'accept the miss and close' rather than 'go fix it'."

requirements-completed: [PERF-03, PERF-04]

# Metrics
duration: n/a (continuation agent — closing out a checkpoint verdict, no code execution)
completed: 2026-07-19
---

# Phase 17 Plan 05: PERF-04 Instant-Nav Gate + D-17 Invalidation Summary

**Extended the perf e2e spec with a prod-build-gated 6-pair instant-nav test and wired D-17 router.refresh() invalidation; the ≤100ms nav-content-visible bar measured 1.3-8s against genuinely dynamic RSC routes and was accepted by Josh as an architecturally-unreachable miss, closing Phase 17.**

## Performance

- **Tasks:** 2 code tasks (autonomous, executed by a prior agent session) + 1 checkpoint (human-verify, resolved by Josh 2026-07-19) + this continuation close-out
- **Files modified:** e2e/13-perf.spec.ts, src/components/study-session.tsx, src/components/word-list-browser.tsx (code); .planning/STATE.md, .planning/ROADMAP.md, 17-HUMAN-UAT.md (tracking, this close-out)

## Accomplishments

- Extended `e2e/13-perf.spec.ts` with 6 D-13 hub-and-spoke nav-timing tests (dashboard↔study, dashboard↔new-card, dashboard↔browse) as in-app link taps, gated to run only against a local prod build via `PERF_PROD_BUILD=1` (D-14) so a dev-server run can never certify the gate.
- Added a two-phase `measureNavTap()` poll (wait for the outgoing marker to clear, then `waitForPerfReady` on the destination) timing each tap to the destination's `data-perf-ready="true"` real-content marker (D-15) — skeletons never count, median n≥5 with the first run discarded per the existing `measureVitals` warm-up discipline.
- Folded in `task_d326ebac`: the existing INP soft-assertion is now gated to `IS_PROD_BUILD`-only runs, clearing the v4.0-carried backlog item (dev-server INP was HMR noise, not a real metric).
- Wired D-17: `router.refresh()` immediately after `router.push()` at both post-study-completion navigation callsites in `study-session.tsx` (habitat celebrate redirect, "Back to deck" button) — `/api/study/complete` is a Route Handler, not a Server Action, so it has no automatic Router Cache invalidation before the client-side navigation, unlike the existing `deck-actions.ts` Server Actions.
- Ran the official phase-end proof at the checkpoint: qa:run 5/5, /habitat D-11 non-regression spot-check, the PERF-04 6-nav gate against a local prod build, and confirmed the immutable Phase 16 baseline untouched.
- Measured the PERF-04 nav-gate result, diagnosed the architectural root cause via `node_modules/next/dist/docs/01-app/02-guides/prefetching.md`, and presented it to Josh as a checkpoint finding rather than silently degrading D-15's bar or reaching for an experimental API.
- Josh reviewed the finding and issued the closing verdict: accept PERF-04 as a measured miss, close Phase 17, park the remaining manual checks as UAT, hold the production deploy.

## Task Commits

1. **Task 1: Extend e2e/13-perf.spec.ts (6 nav pairs + content-visible signal + prod-gated INP)** - `c9e2e43` (feat)
2. **Task 2: D-16 prefetch (no-op, default sufficient at commit time) + D-17 router.refresh() invalidation** - `a46aeef` (feat)
3. **Gate-fix: dashboard↔study nav-gate flow + timing precision** - `3c5e590` (fix)
4. **Evidence: D-11 /habitat regression spot-check re-measurement** - `3a8b17d` (test)
5. **Checkpoint-pause record (now superseded by this close-out)** - `1256d83` (docs)
6. **UAT: persist human verification items** - `a545dff` (test)

**Plan metadata:** (this commit, following)

## Files Created/Modified

- `e2e/13-perf.spec.ts` - 6 hub-and-spoke nav-timing tests, `measureNavTap()` helper, `IS_PROD_BUILD` gating on the nav group and the existing INP assertion; afterAll stale-path guard (commit 88c16ad) preserved intact.
- `src/components/study-session.tsx` - `router.refresh()` added at both post-`/api/study/complete` navigation callsites (habitat celebrate, "Back to deck") for D-17 landing-freshness.
- `src/components/word-list-browser.tsx` (BrowseTiles) - Rule 3 blocking-deviation addition: a "My deck" back-link (`data-testid="browse-back-dashboard"`) to `/dashboard`, needed because D-13 requires both directions of the dashboard↔browse pair and the page previously had zero link back to `/dashboard` (only a link forward to `/deck/new-card`).
- `.planning/phases/17-performance-optimization/17-HUMAN-UAT.md` (new, this close-out) - 3 pending manual checks: D-05 visual identity, D-17 landing-freshness spot-check, optional post-deploy re-measure.
- `.planning/STATE.md` (this close-out) - PERF-04 accepted-miss + D-16 correction recorded in Decisions; the blocking checkpoint note replaced with the resolved verdict.
- `.planning/ROADMAP.md` (this close-out) - Phase 17 marked complete (5/5 plans).

## PERF-04 Measured Result (accepted miss)

| Nav pair | Measured median (local prod build) | Gate (≤100ms) |
|---|---|---|
| dashboard → study | ~8,077ms | MISS |
| study → dashboard | ~1,345ms | MISS |
| dashboard → new-card | ~2,070-2,080ms | MISS |
| new-card → dashboard | ~2,070-2,080ms | MISS |
| dashboard → browse | ~2,070-2,080ms | MISS |
| browse → dashboard | ~2,070-2,080ms | MISS |

Figures are from the pre-timing-fix (commit `3c5e590`) measurement pass and are noted as likely underestimates given the timing-precision bug found and fixed in that same commit; all 6 pairs missed the bar by roughly 20-80x regardless.

### Root cause

Per `node_modules/next/dist/docs/01-app/02-guides/prefetching.md`, all 4 key routes (dashboard, study, new-card, browse) are genuinely dynamic Server Components — each render does a session read plus a DB read. The docs' own prefetching-behavior table states dynamic pages are "not [fully] prefetched unless `loading.js`" and have "Client Cache TTL: Off, unless enabled [experimental `staleTimes`]." Under the stable API surface, every one of these navigations is therefore a real, unavoidable server round trip — there is no stable mechanism to make the destination's actual dynamic content available client-side before the tap.

### Josh's verdict (2026-07-19)

**PERF-04 = ACCEPTED MISS, phase closed.** The instant-nav goal carries forward to Phase 18/backlog rather than blocking Phase 17. Two candidate future paths were discussed and recorded but NOT chosen this phase:
- `loading.tsx` per-route shells — a stable API, but the shell is a skeleton, and D-15 explicitly disallows skeletons from counting as "ready"; pursuing this would require relaxing D-15's own bar, not just an implementation tweak.
- Cache Components / PPR (`cacheComponents` flag) — would genuinely solve this, but is experimental and needs its own D-07 checkpoint before use.

**D-16 correction:** Task 2's original decision ("Link default prefetch already sufficient, no code change") is now known to be measured-wrong for these dynamic routes — default `next/link` prefetch only warms static/partial shells, not the full dynamic RSC payload these routes require. Recorded in STATE.md as a correction, not a silent overwrite.

## Gates That Passed

- **qa:run (criterion-4):** 5/5 journeys green against a fresh dev server (`STUDY_COOLDOWN_MINUTES=1`), zero residue, 19 stale `*test.local` test users swept in cleanup.
- **/habitat D-11 regression spot-check:** mobile Perf 93 / TBT 308ms — improved from the 17-02-flagged Perf 81 / TBT 777ms, non-regressed relative to the last recorded state (still below the original Phase 13.1 figures, but out of scope to chase per D-11 — regression guard only).
- **PERF-03 after-record:** the committed 2026-07-17T23:07:33Z full 4-route×2-preset run (17-04's evidence) stands as the official after-record — /dashboard, /study, /deck/browse fully certify; /deck/new-card is the D-04 accepted-miss on TBT (Perf 92 passes) per 17-04.
- **Immutable baseline:** `git status --porcelain .planning/phases/16-performance-baseline-measure/baseline/` confirmed EMPTY — untouched across the entire phase.
- **task_d326ebac:** cleared — the INP assertion is now `IS_PROD_BUILD`-gated (Task 1), so dev-server INP noise can never fail or falsely pass the gate.

## Decisions Made

- PERF-04 accepted-miss (see above) — phase closed without further code changes chasing the nav-timing bar.
- D-16 corrected from "sufficient" to "insufficient for dynamic routes."
- Three manual checks parked as `17-HUMAN-UAT.md` rather than blocking close: D-05 visual identity (four Motion→CSS swaps, carried from 17-04), D-17 landing-freshness live spot-check, and an optional post-deploy re-measure.
- Deploy held — Josh will run `npx vercel deploy --prod --yes` manually later; prod still serves the 2026-07-15 deployment as of this close, so the measured Phase 17 gains (17-03/17-04 route work, this plan's nav/invalidation work) are not yet live for real users.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a "My deck" back-link to BrowseTiles**
- **Found during:** Task 1 (nav-gate spec authoring)
- **Issue:** D-13 requires both directions of the dashboard↔browse pair, but `word-list-browser.tsx`'s `BrowseTiles` had zero link back to `/dashboard` — its only existing back-link went to `/deck/new-card`.
- **Fix:** Added a `data-testid="browse-back-dashboard"` link to `/dashboard`.
- **Files modified:** `src/components/word-list-browser.tsx`
- **Committed in:** `c9e2e43` (Task 1 commit)

**2. [Rule 1 - Bug] `/api/study/complete`'s `CommitSchema` rejects empty-grades quits**
- **Found during:** checkpoint gate execution (running the PERF-04 nav-gate against a real prod build)
- **Issue:** `CommitSchema` requires `grades.min(1)`; the nav test's original "quit immediately, no grades" design triggered a 400 and landed on the error screen instead of "Back to deck," hanging the timed loop.
- **Fix:** The test now grades exactly the first card of the 3-card queue INCORRECT (via a real click, not keypress) before quitting, so "Back to deck" reliably renders every iteration.
- **Files modified:** `e2e/13-perf.spec.ts`
- **Committed in:** `3c5e590`

**3. [Rule 1 - Bug] Keyboard flip attempt landed on an unfocused element**
- **Found during:** checkpoint gate execution
- **Issue:** `page.keyboard.press("Enter")` was sent with no prior focus; `study-card.tsx`'s `onKeyDown` handler lives on a `tabIndex=0` container that is never auto-focused, so the keypress was dropped.
- **Fix:** Click the card first to establish focus, then send the keypress.
- **Files modified:** `e2e/13-perf.spec.ts`
- **Committed in:** `3c5e590`

**4. [Rule 1 - Bug] `measureNavTap`'s phase-1 poll was silently capped at 2000ms**
- **Found during:** checkpoint gate execution
- **Issue:** The initial poll for the outgoing marker to clear used a hardcoded 2000ms cap rather than the full timeout budget, understating some pair timings.
- **Fix:** Phase-1 poll now uses the full configured timeout budget.
- **Files modified:** `e2e/13-perf.spec.ts`
- **Committed in:** `3c5e590`

---

**Total deviations:** 4 auto-fixed (1 blocking UI-gap addition needed for a valid bidirectional D-13 pair, 3 bugs in the nav-gate test harness itself found while running it against a real prod build). All were necessary for the gate to run correctly and produce a trustworthy measurement; none altered application behavior beyond the intentional BrowseTiles back-link.
**Impact on plan:** No scope creep — all four fixes were required to get a valid, trustworthy PERF-04 measurement rather than a broken harness silently under- or over-reporting.

## Issues Encountered

None beyond the four gate-fix deviations above and the PERF-04 architectural miss itself (documented and accepted, not a defect).

## User Setup Required

None — no external service configuration required. Deploy is a manual step Josh will run himself (`npx vercel deploy --prod --yes`), tracked as pending in this summary and in `17-HUMAN-UAT.md`, not as a setup requirement.

## Next Phase Readiness

- Phase 17 (Performance optimization) is CLOSED: PERF-01/PERF-02 (Phase 16), PERF-03 (3 of 4 routes certified, 1 accepted-miss per D-04), and PERF-04 (accepted-miss, this plan) are all resolved to a Josh-approved verdict.
- `17-HUMAN-UAT.md` carries 3 pending manual checks (D-05 visual, D-17 freshness, optional post-deploy re-measure) — none blocking, all trackable in the standard UAT backlog pattern used since v4.0.
- The instant-nav goal (PERF-04's original intent) is NOT solved, only measured-and-accepted; it is explicitly available to Phase 18 or a future backlog phase, with two candidate approaches already scoped (loading.tsx shells needing a D-15 relax, or Cache Components/PPR needing a D-07 checkpoint) so a future planner does not have to re-derive the root cause.
- Production deploy is HELD pending Josh's manual action — Phase 17's measured gains are code-complete and committed but not yet live.
- Phase 18 (Field validation & guardrails) and Phase 25 (My Account, currently executing) are unaffected by this close-out and can proceed independently.

---
*Phase: 17-performance-optimization*
*Completed: 2026-07-19*
