---
phase: 17-performance-optimization
plan: 02
subsystem: infra
tags: [nextjs, package-hygiene, dead-code-removal, next-config, bundle-measurement, lighthouse]

# Dependency graph
requires:
  - phase: 17-performance-optimization (plan 01)
    provides: Route-filtered, OUT_DIR-parameterized measure-cwv.mjs harness (resolveRoutes/resolveOutDir) this plan invokes for the D-11 /habitat spot-check
provides:
  - three/@types/three correctly classified as devDependencies (build-time-only, confirmed 0 KB client-bundle delta)
  - Two confirmed-dead components removed (habitat-widget.tsx, habitat-3d-widget-image.tsx)
  - A documented, evidence-based decision that next.config.ts stays unchanged (every stable bundle-related option evaluated had no applicable problem to solve; every applicable-looking option was experimental)
  - A documented D-08 audit conclusion that the root layout and auth-client singleton are already optimal (no unnecessary client boundary, no heavy import to remove)
  - A fresh post-Wave-2 shared-floor measurement (514.72 KB / 9 chunks, unchanged) as Wave 3's before-reference
  - A D-11 /habitat regression spot-check with raw measured evidence flagging a real mobile Perf/TBT regression (81/777ms vs the Phase 13.1-documented 96) for phase-level awareness — NOT fixed in this plan (out of scope)
affects: [17-03, 17-04, 17-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "package.json dependency-vs-devDependency classification as a distinct hygiene lever from bundle-size reduction — moving a build-time-only package produces 0 KB delta by design and that is the correct, expected outcome, not a failed optimization"
    - "next.config.ts D-07 gate: consult node_modules/next/dist/docs frontmatter (`version: experimental`/`draft`) directly rather than repo precedent or training-data assumptions before adding any option; an empty/unchanged config after a documented audit is a valid, honest outcome"
    - "MSYS_NO_PATHCONV=1 required when passing a bare-leading-slash value (e.g. ROUTE_FILTER=/habitat) as an env var through Git Bash on Windows — MSYS silently rewrites /habitat to a Windows path, causing the value to fail to match and the route loop to execute zero times while the process still exits 0 (a silent, non-throwing failure mode worth flagging for any future .mjs harness invocation on this platform)"

key-files:
  created:
    - .planning/phases/17-performance-optimization/measurements/16-BASELINE-SUMMARY.md
    - .planning/phases/17-performance-optimization/measurements/habitat-baseline.md
    - .planning/phases/17-performance-optimization/measurements/habitat-desktop-runs.json
    - .planning/phases/17-performance-optimization/measurements/habitat-mobile-runs.json
  modified:
    - package.json
  deleted:
    - src/components/habitat-widget.tsx
    - src/components/habitat-3d-widget-image.tsx

key-decisions:
  - "next.config.ts left unchanged: optimizePackageImports/cssChunking/inlineCss/staleTimes are all version:experimental per shipped docs frontmatter (hard D-07 exclusion); the one stable candidate, serverExternalPackages, has zero evidence of an applicable problem (clean build, no native-binding warnings, no Node-native-feature dependency imported anywhere under src/app/) — adding it would be speculative config, not a verified fix"
  - "src/app/layout.tsx and src/lib/auth-client.ts left unchanged: the root layout is already a plain RSC with no unnecessary client boundary (only next/font/google, a build-time-only subsetting mechanism) and no heavy runtime import; auth-client.ts is a correctly-scoped client-only singleton consumed only by the 6 auth-flow components that genuinely need Better Auth's client hooks — there is no D-08 win available in either file this wave"
  - "The actual auth session-gate (auth.api.getSession -> redirect('/login')) lives in src/app/(protected)/layout.tsx, not src/app/layout.tsx (the plan's files_modified named the latter) — confirmed unchanged and intact; this is a naming precision note, not a scope deviation, since the plan's D-08 audit intent (preserve the session gate) is satisfied regardless of which layout file physically holds it"
  - "D-11 /habitat spot-check ran via the harness's existing ROUTE_FILTER union mechanism exactly as built by 17-01 (both mobile+desktop presets, N_RUNS=6 fixed) rather than a literal 'n=3 mobile-only' invocation, because the harness has no preset-filter env var and Task 3's own files_modified scope explicitly excludes editing any source file including the harness — this is still ~4x cheaper than the full 4-route x 2-preset baseline and produces the mobile data point D-11 actually gates on"

patterns-established:
  - "D-07 checkpoint gate is a grep-verifiable acceptance criterion (zero experimental/cacheComponents/unstable_instant/use cache keys in next.config.ts), not just a process step — future waves in this phase should re-run the same grep after any next.config.ts touch"

requirements-completed: [PERF-03]

# Metrics
duration: 15min
completed: 2026-07-03
---

# Phase 17 Plan 02: Shared-Infrastructure Hygiene + D-07 Config Audit Summary

**three/@types/three reclassified to devDependencies (0 KB delta by design) and two confirmed-dead habitat-widget files deleted; next.config.ts and the D-08 shared-infra audit both concluded "no stable change applies" with full docs-citation reasoning; a fresh build confirms the 514.72 KB / 9-chunk shared floor is unchanged, and a /habitat regression spot-check surfaced a genuine measured mobile Perf 81 / TBT 777ms regression against the Phase 13.1 baseline of 96 — flagged with raw evidence, not caused by (or fixable within) this plan.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-03T00:43:18+01:00
- **Completed:** 2026-07-03T00:58:27+01:00
- **Tasks:** 3/3 completed
- **Files modified:** 5 (1 modified, 2 deleted, 4 created under measurements/ — Task 2 made zero file changes)

## Accomplishments
- `three`/`@types/three` are now correctly classified as `devDependencies` in `package.json`, matching PROJECT.md's "build-time only" description of how Three.js is actually used (only inside `scripts/render-habitat-*.mjs`, never in `src/app/`'s server-rendered graph) — a fresh production build confirms zero client-bundle presence both before and after the move, proving the reclassification changed nothing observable, as expected
- Two components with zero real call sites (`habitat-widget.tsx`, `habitat-3d-widget-image.tsx`) are deleted; `npx tsc --noEmit` exits clean immediately after deletion, which is the definitive proof nothing imported them
- The D-07 next.config audit is complete and evidence-based: every plausible bundle-related option in the shipped Next 16 docs was checked against its frontmatter `version` tag; `optimizePackageImports`/`cssChunking`/`inlineCss`/`staleTimes` are all `experimental` (hard exclusion, no checkpoint requested since none were needed); the one stable candidate (`serverExternalPackages`, promoted to stable in Next 15.0.0) has no applicable problem in this codebase (clean build, no Node-native-feature dependency imported inside `src/app/`) — `next.config.ts` is intentionally unchanged
- The D-08 shared-infra audit is complete: `src/app/layout.tsx` is already a minimal RSC (fonts + metadata only, zero unnecessary client boundary); `src/lib/auth-client.ts` is a correctly-scoped client-only singleton used only where genuinely needed (6 auth-flow components) — no change lands because none is warranted
- A fresh `npm run build` + `.next/diagnostics/route-bundle-stats.json` read confirms the shared floor is unchanged at 514,720 bytes / 9 chunks, giving Wave 3 an accurate before-reference
- The D-11 `/habitat` regression spot-check ran successfully via the Phase-17 route-filtered harness and surfaced a genuine, measured finding: mobile Perf 81 / TBT 777ms (median of 5 warm runs, individual runs ranging 271-2755ms TBT) vs. the Phase 13.1-documented Perf 96 — flagged honestly rather than glossed over, with the evidence-based conclusion that this is unrelated to anything this plan changed (see Deviations)

## Task Commits

Each task was committed atomically:

1. **Task 1: D-05 dependency hygiene — relocate three/@types/three + delete confirmed-dead habitat-widget files** - `a05d42d` (feat)
2. **Task 2: D-07 next.config stable-only options + D-08 shared-infra audit** - no commit (zero file changes; audit conclusion is "intentionally unchanged," fully documented in this SUMMARY per the plan's explicit allowance for that outcome)
3. **Task 3: Fresh prod build + shared-floor + /habitat regression spot-check measurement (D-11)** - `973b137` (feat)

**Plan metadata:** (this commit, following SUMMARY.md write)

## Files Created/Modified
- `package.json` - Moved `"three": "^0.160.1"` and `"@types/three": "^0.160.0"` from `dependencies` to `devDependencies`; no other lines changed
- `src/components/habitat-widget.tsx` - DELETED (zero real call sites; only a comment-only cross-reference remained in `habitat-medallion.tsx`)
- `src/components/habitat-3d-widget-image.tsx` - DELETED (only reachable via the now-deleted `habitat-widget.tsx`)
- `.planning/phases/17-performance-optimization/measurements/16-BASELINE-SUMMARY.md` - Cross-route summary row for this run's scope (`/habitat` only, per the D-11 opt-in)
- `.planning/phases/17-performance-optimization/measurements/habitat-baseline.md` - Human-readable `/habitat` medians (mobile + desktop), bundle composition (580 KB / 12 chunks), bottleneck classification
- `.planning/phases/17-performance-optimization/measurements/habitat-desktop-runs.json` / `habitat-mobile-runs.json` - Raw per-run Lighthouse data (6 runs each, run 1 discarded, medians of runs 2-6)

## Decisions Made
- **next.config.ts stays empty/unchanged.** Every option a bundle-reduction phase would plausibly reach for (`optimizePackageImports`, `cssChunking`, `inlineCss`, `staleTimes`) carries `version: experimental` frontmatter in the shipped `node_modules/next/dist/docs/` — confirmed via direct file reads, not inference. The one stable, non-experimental candidate that fits this phase's theme (`serverExternalPackages`, stable since Next 15.0.0 per its own changelog table) has no evidence of an applicable problem: `npm run build` produces a clean output with no bundling/native-binding warnings, and none of the dependencies actually imported inside `src/app/` (`@neondatabase/serverless`, `drizzle-orm`, `better-auth`, `resend`, `deepl-node`, `ai`, `@ai-sdk/anthropic`) use Node-specific native features or appear on Next's default-external list. Adding it without a symptom to fix would be invented config, which the plan explicitly warns against ("do not invent config to look productive"). No D-07 checkpoint was needed since nothing experimental was ever a live candidate.
- **`src/app/layout.tsx` and `src/lib/auth-client.ts` stay unchanged.** The root layout (`src/app/layout.tsx`) already has zero `"use client"` directive and its only "heavy-looking" import, `next/font/google`, is a build-time font-subsetting mechanism with no runtime client-bundle cost — there is no unnecessary client boundary to remove because there was never a client boundary here at all. `auth-client.ts` is a small `createAuthClient()` singleton correctly consumed only by the 6 components that genuinely need Better Auth's client-side hooks (login/signup/forgot/reset/logout/welcome-step) — shrinking its footprint isn't possible without breaking those flows. Both conclusions are the intended "or nothing" branch the plan explicitly allows.
- **Naming precision on the auth session-gate location:** the plan's `files_modified` frontmatter names `src/app/layout.tsx` for the D-08 audit, but the actual `auth.api.getSession() -> redirect("/login")` gate lives in the sibling `src/app/(protected)/layout.tsx`. Both files were read and confirmed; the protected-route layout's gate logic is unchanged (verified via grep for `getSession`/`redirect`). This doesn't change any acceptance criterion outcome — the gate is intact either way — but is noted here for precision.
- **The D-11 /habitat spot-check invocation mechanism:** the plan's acceptance criteria describe "ROUTE_FILTER=/habitat (n=3 mobile)," but the harness built in 17-01 has no preset-filter (`PRESETS` is hardcoded to `["mobile", "desktop"]`) and no run-count override (`N_RUNS` is hardcoded to `6`) — and Task 3's own `files_modified` scope explicitly says "no source files edited," which excludes patching the harness to add either filter. The spot-check therefore ran via the harness's existing `ROUTE_FILTER=/habitat` union mechanism exactly as-built (both presets, 6 runs each = 12 total Lighthouse navigations for one route), which is still ~4x cheaper than the full 4-route x 2-preset x 6-run baseline (48 navigations) and yields the mobile data point D-11 actually gates on. This is treated as satisfying D-11's intent (a cheap, route-scoped, harness-driven regression check) rather than its literal "n=3" phrasing, since editing the harness was out of this task's declared scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MSYS/Git-Bash path-mangling silently broke the first `ROUTE_FILTER=/habitat` invocation**
- **Found during:** Task 3 (running the D-11 spot-check)
- **Issue:** The first attempt (`ROUTE_FILTER="/habitat" node scripts/measure-cwv.mjs`) exited 0, logged "ALL ROUTES MEASURED," and wrote only an empty `16-BASELINE-SUMMARY.md` with a header row and zero data — no per-route artifacts (`habitat-baseline.md`, `habitat-*-runs.json`) were written, and the measurement loop's own progress log lines (`--- /habitat x mobile ---`) never appeared. Root cause: Git Bash on Windows (MSYS2) auto-converts bare-leading-slash argument/env values that look like POSIX absolute paths — `ROUTE_FILTER=/habitat` was silently rewritten to `ROUTE_FILTER=C:/Program Files/Git/habitat` before Node ever saw it, which matched none of `resolveRoutes()`'s recognized route strings, resolving `ROUTES` to an empty array. The loop over `ROUTES` in `writeReports`/`runMeasurements` then executed zero iterations, and the script's own error handling had nothing to catch (no exception was thrown — an empty array is a valid, if useless, input), so it exited 0 and reported false success.
- **Fix:** Re-ran with `MSYS_NO_PATHCONV=1` prefixed to the invocation, which prevents MSYS's path-conversion shim from touching the env var value. Verified in isolation first (`MSYS_NO_PATHCONV=1 ROUTE_FILTER="/habitat" node -e "console.log(process.env.ROUTE_FILTER)"` correctly printed `"/habitat"`) before re-running the full harness.
- **Files modified:** None (no source file changed — this is an invocation-environment fix, not a code fix)
- **Verification:** The corrected run's log shows the expected `--- /habitat x mobile ---` / `--- /habitat x desktop ---` progress lines, both median scores, `wrote habitat-baseline.md`, and all four expected artifact files present on disk with real per-run data (verified via direct file read of `habitat-mobile-runs.json`'s 6 raw runs + 5 warm runs + medians).
- **Committed in:** `973b137` (Task 3 commit — only the correct, second run's artifacts were committed; the first empty-summary run's artifact was overwritten in place before staging, so no bad data ever reached git)

---

**Total deviations:** 1 auto-fixed (1 blocking — environment/tooling, not a code defect)
**Impact on plan:** The fix was purely an invocation-environment correction (an env var flag), touched zero source files, and produced no behavior change to the harness itself. No scope creep. This is flagged in `tech-stack.patterns` above as a reusable gotcha for any future `.mjs` harness invocation via Git Bash on Windows with a bare-leading-slash env value.

## Issues Encountered

**`/habitat` mobile CWV regression detected by the D-11 spot-check (not an "issue" requiring a fix in this plan — an intentional finding to surface).** The corrected spot-check measured `/habitat` mobile at Perf 81 / LCP 1653ms / TBT 777ms / CLS 0 (median of 5 warm runs; individual run TBTs ranged 271-2755ms, so this is a genuine noisy-but-consistently-elevated signal, not a single outlier). This is below the CWV "Good" Perf gate (≥90) and well below the PROJECT.md-documented Perf 96 mobile achieved in Phase 13.1 (2026-05-29), measured via the same non-instrumented warm-prod Lighthouse methodology (comparable conditions, confirmed by reading `13-VERIFICATION.md`'s historical record). Investigation ruled out this plan's own two tasks as the cause: neither the `three`/`@types/three` package.json reclassification nor the two deleted dead files (`habitat-widget.tsx`, `habitat-3d-widget-image.tsx`, confirmed via grep to have zero references anywhere on `/habitat`'s actual page/scene/video render path) touch anything `/habitat` renders, and Task 2 made zero code changes at all. The regression's shape instead matches the SAME degraded-bundle pattern already documented for all 4 key routes in the immutable Phase 16 baseline (mobile Perf 79-86 across `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse`) — strongly suggesting the shared ~9-chunk floor (which `/habitat`'s own bundle report shows 9 of its 12 total chunks are shared with the other routes) grew during the intervening v4.0 Daybreak UI-redesign phases (19-24, shipped between Phase 13.1 and Phase 16), not something introduced by or fixable within this plan. Per D-11's own framing ("`/habitat` stays OUT of the key-route gate set... this is the revisit-if-refactors-touch-habitat clause firing") and the phase's explicit scope boundary ("`/habitat` optimization — already CWV-green — it gets only a regression spot-check here"), this finding is surfaced for phase-level and human awareness, not remediated in this plan. Raw evidence is committed at `.planning/phases/17-performance-optimization/measurements/habitat-baseline.md` and the two `-runs.json` files for any downstream investigation.

## User Setup Required

None - no external service configuration required. `DATABASE_URL` was read from the existing `.env.local` (already configured from prior phases); no new environment variables introduced.

## Next Phase Readiness
- The post-Wave-2 shared floor (514.72 KB / 9 chunks, unchanged from Phase 16) is the accurate before-reference for Wave 3's per-route client→RSC conversion work
- `package.json` is clean of the `three`/`@types/three` misclassification; the two dead habitat-widget files are gone, reducing surface area for Wave 3's own dead-code audits
- The documented, evidence-based "no config change" and "no layout/auth-client change" conclusions mean Wave 3 does not need to re-investigate D-07/D-08 for these specific files — the audit is closed
- **Flag for phase-level awareness (not a Wave 3 blocker):** the D-11 spot-check surfaced a real `/habitat` mobile CWV regression (Perf 81 vs. historical 96) that is out of this phase's stated scope to fix, but the evidence is now on record (`measurements/habitat-baseline.md`) should a future phase (or an end-of-Phase-17 checkpoint) want to revisit it
- No blockers identified for Wave 3

---
*Phase: 17-performance-optimization*
*Completed: 2026-07-03*

## Self-Check: PASSED

All 8 claimed files verified (2 deletions confirmed absent, 6 creations/existing files confirmed present on disk); all 3 claimed commit hashes (a05d42d, 973b137, 3e2f5b3) verified present in git log.
