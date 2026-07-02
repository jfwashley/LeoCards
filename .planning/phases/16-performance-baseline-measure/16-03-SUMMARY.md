---
phase: 16-performance-baseline-measure
plan: 03
subsystem: infra
tags: [lighthouse, performance, cwv, baseline, vercel, puppeteer-core]

# Dependency graph
requires:
  - phase: 16-performance-baseline-measure (plan 02)
    provides: scripts/measure-cwv.mjs harness (pure-logic lib + side-effectful runner + npm scripts)
provides:
  - "The immutable Phase-16 warm-prod CWV baseline: 4 markdown reports + 8 raw-JSON run files + 1 cross-route summary, committed as the before-reference every Phase-17 optimization diffs against"
  - "Three Rule-1 bug fixes to scripts/measure-cwv.mjs discovered by running the harness for real against warm prod (prod-auth userId extraction, lighthouse named import, /study deck param)"
  - "PERF-01 and PERF-02 marked complete in REQUIREMENTS.md"
affects: [17-performance-optimize]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Immutable baseline artifact: committed once, never hand-edited; future phases diff against it rather than regenerating it in place"
    - "Harness bugs found only by a live prod run get fixed inline and documented via inline DEVIATION comments plus a dedicated fix commit, kept separate from the immutable-docs commit"

key-files:
  created:
    - .planning/phases/16-performance-baseline-measure/baseline/dashboard-baseline.md
    - .planning/phases/16-performance-baseline-measure/baseline/dashboard-mobile-runs.json
    - .planning/phases/16-performance-baseline-measure/baseline/dashboard-desktop-runs.json
    - .planning/phases/16-performance-baseline-measure/baseline/study-baseline.md
    - .planning/phases/16-performance-baseline-measure/baseline/study-mobile-runs.json
    - .planning/phases/16-performance-baseline-measure/baseline/study-desktop-runs.json
    - .planning/phases/16-performance-baseline-measure/baseline/deck-new-card-baseline.md
    - .planning/phases/16-performance-baseline-measure/baseline/deck-new-card-mobile-runs.json
    - .planning/phases/16-performance-baseline-measure/baseline/deck-new-card-desktop-runs.json
    - .planning/phases/16-performance-baseline-measure/baseline/deck-browse-baseline.md
    - .planning/phases/16-performance-baseline-measure/baseline/deck-browse-mobile-runs.json
    - .planning/phases/16-performance-baseline-measure/baseline/deck-browse-desktop-runs.json
    - .planning/phases/16-performance-baseline-measure/baseline/16-BASELINE-SUMMARY.md
  modified:
    - scripts/measure-cwv.mjs
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Split the harness-fix commit from the baseline-docs commit — the fixes are code (Rule 1 bugs found mid-run) and belong in their own atomic history entry, separate from the immutable before-reference artifacts"
  - "getUserId() prod-auth round-trip removed entirely rather than patched — signUp() reads userId directly from the sign-up response body, avoiding a second authenticated call that was sending the wrong cookie name to prod"

requirements-completed: [PERF-01, PERF-02]

# Metrics
duration: 8min
completed: 2026-07-02
---

# Phase 16 Plan 03: Warm-Prod CWV Baseline Summary

**Ran the Plan-02 harness for real against warm prod (leocards.vercel.app) and locked the immutable Phase-17 before-reference: all four key routes classify as bundle-bottlenecked, with mobile LCP 1662-1956 ms and CLS 0 across the board.**

## Performance

- **Duration:** 8 min (this continuation, from Task 3 resume through SUMMARY commit; Task 1's live measurement run itself took ~28 min under the prior executor and is not double-counted here)
- **Started:** 2026-07-02T08:13:00Z (approx, continuation agent spawn)
- **Completed:** 2026-07-02T08:21:38Z
- **Tasks:** 3 (Task 1 completed + verified by prior executor; Task 2 checkpoint approved by human; Task 3 executed in this continuation)
- **Files modified:** 15 (13 baseline artifacts + scripts/measure-cwv.mjs + .planning/REQUIREMENTS.md)

## Accomplishments

- Ran `npm run measure:cwv` end-to-end against warm prod: 4 routes x 2 presets x 6 Lighthouse runs = 48 sequential navigations, with run 1 discarded per route/preset as the cold-Vercel warm-up and medians computed over runs 2-6.
- All four routes classify as **bundle** bottleneck (not RSC-waterfall, not hydration) — first-load JS ranges from 526 KB (`/deck/browse`) to 1111 KB (`/deck/new-card`), giving Phase 17 an unambiguous single target class across the board.
- Mobile CWV medians landed in the plausible warm-prod range for every route: LCP 1662-1956 ms, CLS 0, TBT 518-891 ms, Perf score 79-86. Desktop is uniformly green (Perf 90-92, TBT 46-129 ms).
- Fixed three Rule-1 harness bugs discovered only by running against real warm prod (impossible to catch by static review or against localhost) — documented as inline `DEVIATION` comments in `scripts/measure-cwv.mjs` and detailed below.
- Committed the 13-file baseline directory as the immutable Phase-17 before-reference, gated by a human plausibility checkpoint before lock-in.
- Marked PERF-01 and PERF-02 complete in `.planning/REQUIREMENTS.md` — both were explicitly deferred by Plans 16-01 and 16-02 until a real run + committed baseline existed, which is now the case.

## Task Commits

Task 1's measurement run itself produces no code changes (it is a live prod measurement + artifact write), so its work is captured in the two commits below rather than a separate per-task commit:

1. **Task 1 (harness fixes discovered during the live run)** - `8e4bc11` (fix) — `fix(16-03): repair harness prod-auth, lighthouse named import, /study deck param`
2. **Task 2 (checkpoint)** — no commit; human replied "approved" after reviewing the plausibility digest, gating Task 3
3. **Task 3: Commit the immutable baseline** - `ab6f1f3` (docs) — `docs(16): warm-prod CWV baseline for the four key routes (PERF-01/PERF-02)`

**Plan metadata:** committed alongside this SUMMARY (see below).

## Files Created/Modified

- `.planning/phases/16-performance-baseline-measure/baseline/{dashboard,study,deck-new-card,deck-browse}-baseline.md` - Per-route markdown report: medians table, bundle composition + chunk fingerprint, bottleneck classification naming the Phase-17 target
- `.planning/phases/16-performance-baseline-measure/baseline/{dashboard,study,deck-new-card,deck-browse}-{mobile,desktop}-runs.json` - Raw per-run Lighthouse metrics (6 runs each, `warmRuns` = runs 2-6, `medians` computed over `warmRuns`) for exact machine diffing in Phase 17
- `.planning/phases/16-performance-baseline-measure/baseline/16-BASELINE-SUMMARY.md` - Cross-route summary table (Mobile/Desktop Perf score, Bundle KB, Top Class) — the immutable before-reference index
- `scripts/measure-cwv.mjs` - Three Rule-1 bug fixes found by the live run (see Deviations below)
- `.planning/REQUIREMENTS.md` - PERF-01 and PERF-02 marked complete (checkbox + traceability table)

## Decisions Made

- **Split the harness-fix commit from the baseline-docs commit.** The three bug fixes to `scripts/measure-cwv.mjs` are code changes that made the run possible; the 13-file baseline directory is the immutable, never-re-edited before-reference. Keeping them as two atomic commits (`8e4bc11` then `ab6f1f3`) means the baseline commit's diff is pure data, and the fix commit's diff is pure code — clean history for anyone auditing either later.
- **`getUserId()`'s broken prod round-trip was removed, not patched.** Rather than fixing the cookie-name mismatch in the separate `/api/auth/get-session` call, `signUp()` now reads `userId` directly from the sign-up response body (which already contains `user.id`). This eliminates an entire authenticated round-trip rather than papering over its bug — simpler and one fewer prod call per provision.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `getUserId()` prod-auth round-trip failed with wrong cookie name**
- **Found during:** Task 1 (live warm-prod run, provisioning step)
- **Issue:** The original `signUp()` (adapted from `qa-lib.mjs`, which only ever targets `http://localhost`) called a separate `/api/auth/get-session` round-trip to obtain `userId`, sending the Cookie header as the plain `better-auth.session_token` name. Against prod HTTPS the actual cookie name carries the `__Secure-` prefix, so the round-trip authenticated as no one and returned no `user.id` — the live run failed immediately after sign-up, before any measurement began, with "get-session: no user.id in response".
- **Fix:** `signUp()` now returns `{ sessionToken, userId }` read straight from the sign-up response body — better-auth's `sign-up/email` response already includes `user.id` (verified against `node_modules/better-auth/dist/api/routes/sign-up.mjs`), so the second round-trip is unnecessary and was removed entirely rather than patched.
- **Files modified:** `scripts/measure-cwv.mjs`
- **Verification:** Live run's provisioning step completed and logged `provisioned user ... deck ...` on retry; all 48 subsequent Lighthouse runs authenticated correctly (zero `/login` finalUrls across all 8 runs.json files).
- **Committed in:** `8e4bc11`

**2. [Rule 1 - Bug] `lighthouse.navigation is not a function`**
- **Found during:** Task 1 (live warm-prod run, first Lighthouse call — `/dashboard` x mobile, run 0)
- **Issue:** The original import shape (`import lighthouse from 'lighthouse/core/index.js'` + `lighthouse.navigation(...)`) failed live because `navigation` is a NAMED export of `lighthouse/core/index.js`, not a property of the default export (the default export is itself an unrelated function). RESEARCH.md's own verified Code Examples already used the correct named-import form, but the harness had drifted from it.
- **Fix:** Changed to `import { navigation as lighthouseNavigation } from 'lighthouse/core/index.js'`, matching the RESEARCH.md-verified shape.
- **Files modified:** `scripts/measure-cwv.mjs`
- **Verification:** All 48 Lighthouse navigations across 4 routes x 2 presets x 6 runs completed and returned parseable `lhr` results.
- **Committed in:** `8e4bc11`

**3. [Rule 1 - Bug] `/study` without `?deck=` silently measured `/dashboard` instead**
- **Found during:** Task 1 (live warm-prod run, `/study` x mobile measurement)
- **Issue:** `/study` has an unconditional redirect to `/dashboard` when `?deck=` is absent (`src/app/(protected)/study/page.tsx` lines 20-22) — unlike `/dashboard`, `/deck/new-card`, and `/deck/browse`, which all gracefully default to the user's first deck when `?deck=` is omitted. The bare `/study` navigation landed on `/dashboard` every time; the redirect guard correctly caught this (finalUrl was `.../dashboard`, not `/login` — auth was honored, but the wrong page was being measured, exactly the "silent garbage baseline" class of failure the guard exists to catch).
- **Fix:** Added `buildNavigationUrl(route, deckId)`, which appends `?deck={deckId}` only for `/study`; the provisioned `deckId` is threaded through from `provision()` into the measurement loop. The clean route path (no query string) is unchanged everywhere else — report keys, slugs, and the guard's containment check still key off the plain path. Also clarified the redirect-guard error message; guard logic itself was unchanged (it worked correctly and caught the bug as designed).
- **Files modified:** `scripts/measure-cwv.mjs`
- **Verification:** `study-mobile-runs.json` / `study-desktop-runs.json` finalUrls now contain `/study` (not `/dashboard`); `study-baseline.md` medians differ from `dashboard-baseline.md` medians, confirming distinct pages were actually measured.
- **Committed in:** `8e4bc11`

---

**Total deviations:** 3 auto-fixed (all Rule 1 - bug fixes, all discovered only by running the harness live against warm prod rather than in static review or against localhost).
**Impact on plan:** All three fixes were necessary blockers — without them the harness could not complete a valid run at all (fixes 1-2) or would have silently produced a garbage baseline for one of the four required routes (fix 3). No scope creep; no optimization changes; no new npm packages.

## Anomalies Observed (recorded, not corrective actions)

These were observed during Task 1's verification pass and did not require fixes — recorded here per the plan's transparency intent for the immutable baseline:

- **Non-fatal Lantern trace-engine TypeError warnings** appeared in console output on every one of the 48 Lighthouse runs. Metrics were unaffected — all 48 runs produced finite numeric values for every metric field. Treated as harmless Lighthouse-internal noise, not a measurement defect.
- **`npm run measure:cleanup` standalone requires `CLEANUP_DB_URL`.** The harness's own internal finally-block cleanup call falls back to `DATABASE_URL` when `CLEANUP_DB_URL` is unset, but running `npm run measure:cleanup` directly (outside the harness) does not have that fallback and needs `CLEANUP_DB_URL` set explicitly. Documented for future manual cleanup invocations.
- **The run's cleanup also swept 612 stale `*test.local` users** accumulated from Phase 15's QA journey scripts (a pre-existing backlog, not caused by this plan). Post-cleanup residue is confirmed at zero.
- **Deck/browse first-load JS measured 526 KB**, vs the 556 KB figure cited in `16-RESEARCH.md`. This is normal build-to-build drift (RESEARCH.md's figure was captured at an earlier commit) and not a discrepancy requiring investigation.

## Issues Encountered

None beyond the three deviations documented above, all resolved inline.

## User Setup Required

None - no external service configuration required beyond the `DATABASE_URL` env var already documented in the plan's `user_setup` frontmatter (Neon prod-shared DB connection string), which the prior executor confirmed was present and used for the live run.

## Next Phase Readiness

- **Phase 17 (performance-optimize) is unblocked.** The immutable before-reference exists, is committed (`ab6f1f3`), and every route's Phase-17 target is unambiguous: bundle reduction, ranked by size (`/deck/new-card` 1111 KB > `/dashboard` 887 KB > `/study` 657 KB > `/deck/browse` 526 KB).
- **Zero prod residue.** `npm run measure:cleanup` confirmed 0 matched `*test.local` users after the run (and swept the pre-existing 612-user Phase-15 backlog as a side effect).
- **No known blockers** for Phase 17. Non-fatal Lantern warnings are cosmetic Lighthouse-internal noise and do not affect the validity of the medians used as the before-reference.
- Phase 16 (plans 01-03) is now fully complete: PERF-01 and PERF-02 satisfied.

---
*Phase: 16-performance-baseline-measure*
*Completed: 2026-07-02*
