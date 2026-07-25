---
phase: 18-field-validation-guardrails
plan: 05
subsystem: testing
tags: [perf, lighthouse, playwright, cwv, gate-evaluation, node, evidence]

# Dependency graph
requires:
  - phase: 18-field-validation-guardrails (Plan 04)
    provides: scripts/perf-recert.mjs orchestrator + "perf:recert" npm script
provides:
  - "A real, committed green re-cert run (exit 0) proving the gate passes healthy code"
  - "A real, committed red re-cert run (exit 1, GATE_TBT=10) proving the gate fails loudly on a real regression signal (D-13-2)"
  - "AGENTS.md 'Performance re-cert gate' convention documenting the D-15/D-14 cadence"
affects: [18-06 (phase close-out / field-vs-lab comparison)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "measure-cwv.mjs's bundle-freshness gate (Pitfall 6/WR-07) requires a `.next` build newer than the CURRENT HEAD commit -- any commit made between builds re-trips it on the next invocation. Operators must re-run `npm run build` (or just re-invoke perf:recert once, since its own nav-gate half rebuilds) immediately before each perf:recert invocation in the same session as a commit."

key-files:
  created:
    - .planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1354.md
    - .planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1354.json
    - .planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1354/cwv/ (13 files -- per-route mobile/desktop runs + baselines)
    - .planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1405.md
    - .planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1405.json
    - .planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1405/cwv/ (13 files -- per-route mobile/desktop runs + baselines)
  modified:
    - AGENTS.md

key-decisions:
  - "Two of four total pipeline invocations were discarded (not committed) because measure-cwv.mjs's own WR-07 bundle-freshness gate ('.next predates HEAD') tripped -- an environmental/ordering artifact of committing between builds, not a regression. Their untracked report files were deleted; the pipeline was immediately re-run once .next matched HEAD again, per the plan's own 'only real regressions are findings' boundary."
  - "A single, non-reproducible transient failure in measure-cwv.mjs's own cleanup child-process spawn, and a single non-reproducible transient failure in the nav-gate half's `npm run build` spawn, both occurred once (in the discarded second green attempt) immediately after the CWV half's heavy Puppeteer/Chrome measurement phase. Both succeeded on manual retry seconds later. Flagged as an intermittent Windows spawnSync/resource-contention observation in the orchestrator's spawn chain -- not a logic bug, not chased further (Rule 3 fix-attempt-limit: resolved via retry, not code change)."
  - "AGENTS.md's D-15 cadence note was isolated to its own commit via checkout-to-HEAD -> edit -> commit -> restore-pre-existing-content, since the working AGENTS.md carried unrelated, pre-existing uncommitted conventions (Tooling & checks / E2E tests / Git & deploy) from another session. Those sections remain uncommitted and untouched, byte-identical to their state before this plan ran."
  - "Each run's full recert-<runid>/cwv/ intermediate artifact directory (per-route raw Lighthouse medians + measure-cwv.mjs's own baseline .md files) was committed alongside the top-level recert-<runid>.md/.json report, not just the top-level report, for a fuller evidence trail -- confirmed secret-free first (T-18-02d)."
  - "Both the Lighthouse-internal `TypeError` in @paulirish/trace_engine's LanternComputationData (recurs once per Lighthouse run, across every route/preset) and the desktop-preset measurements (always collected by measure-cwv.mjs regardless of perf-recert's own --desktop flag) are confirmed benign/expected -- neither blocks or corrupts the reported medians."

requirements-completed: [PERF-06]

# Metrics
duration: ~35min (across 4 total pipeline invocations; 2 discarded, 2 committed as evidence)
completed: 2026-07-25
---

# Phase 18 Plan 05: Re-cert gate demonstrated green + red (PERF-06) Summary

**Real end-to-end `npm run perf:recert` runs against warm prod + a fresh local prod build, both committed as evidence: a genuine green pass (exit 0, 3 WARN/1 PASS on CWV drift, nav-gate PASS) and a genuine red fail via `GATE_TBT=10` (exit 1, all 4 routes hard-fail TBT, D-13-2) -- plus the D-15/D-14 cadence documented in AGENTS.md.**

## Performance

- **Duration:** ~35 min active session (commit-to-commit span); each of the 4 total pipeline invocations ran ~7-12 min wall-clock (far under the plan's ~35-40min worst-case estimate)
- **Started:** 2026-07-25T13:41:00+01:00 (approx., after Plan 04's completion commit)
- **Completed:** 2026-07-25T14:16:01+01:00
- **Tasks:** 2
- **Files modified:** 31 (30 measurement-evidence files across two dated runs + AGENTS.md)

## Accomplishments

- **Green run (Task 1):** `MSYS_NO_PATHCONV=1 DATABASE_URL=<prod> node scripts/perf-recert.mjs` against real prod (`https://leocards.vercel.app`) + a fresh local prod build. Exit code 0. Aggregate CWV table: `/dashboard` WARN (TBT drifted +165% vs. Plan 03 baseline, still under the 200ms hard gate), `/study` WARN (+20%), `/deck/new-card` WARN (+16%), `/deck/browse` PASS (all gates pass). Nav-gate half PASS (4/4 instant-nav tests, ≤850ms median, D-12). Drift surfaced as WARN not FAIL on real data, confirming D-09. Report + per-route artifacts committed at `measurements/recert-2026-07-25-1354.{md,json}` and `measurements/recert-2026-07-25-1354/cwv/`.
- **Red run (Task 2, D-13-2):** Same real pipeline with `GATE_TBT=10` (an impossible threshold, no sabotage deploy). Exit code 1. Every route hard-fails: `/dashboard` "TBT 288.77ms > 10ms", `/study` "TBT 68ms > 10ms", `/deck/new-card` "TBT 254.00ms > 10ms", `/deck/browse` "TBT 158ms > 10ms" -- naming the tripped gate explicitly in every row. Nav-gate half still PASS (independent of the CWV override). Overall: FAILED. Per D-07, the failed run still wrote its dated report, committed as red-path evidence at `measurements/recert-2026-07-25-1405.{md,json}` and `measurements/recert-2026-07-25-1405/cwv/`.
- **AGENTS.md D-15 cadence doc:** added a "Performance re-cert gate" convention -- run `npm run perf:recert` after any deploy touching perf-relevant surfaces (bundle deps, shared layout/providers, route pages, `next.config.ts`) and before any release/milestone; local on-demand only this phase (D-14, no CI); red -> revert or fix forward; cross-references `scripts/perf-recert.mjs`'s own header. Isolated to its own commit hunk (see Deviations).
- Confirmed both committed reports (and all per-route intermediate artifacts) contain zero secrets (`DATABASE_URL`, session tokens, passwords) -- T-18-02d mitigation verified via grep before each commit.
- Swept residual `*@test.local` users after both runs (`npm run measure:cleanup` equivalent) -- confirmed port 3000 free and no stray `next start` processes after each invocation (T-18-07 kill-in-finally behavior verified working across all 4 invocations).

## Task Commits

1. **Task 1: Green run — full re-cert passes end-to-end, commit evidence** - `1c02d46` (feat)
2. **Task 2: Red-path demo (D-13-2) + D-15 cadence doc** - `d502190` (feat)

## Files Created/Modified

- `.planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1354.md` / `.json` - the committed green re-cert report (exit 0, PASSED)
- `.planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1354/cwv/*` - the green run's per-route raw Lighthouse medians (mobile+desktop) + measure-cwv.mjs's own baseline .md artifacts, backing the aggregate table
- `.planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1405.md` / `.json` - the committed red-path report (exit 1, FAILED, D-13-2)
- `.planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1405/cwv/*` - the red run's per-route raw Lighthouse medians + baseline artifacts
- `AGENTS.md` - added the "Performance re-cert gate" subsection (D-15 cadence + D-14 local-only rule + cross-reference to the script header); committed as an isolated hunk only

## Decisions Made

See `key-decisions` in frontmatter above — summarized: two preliminary pipeline attempts were discarded (not real evidence, tripped by an environmental "Pitfall 6" build-freshness ordering issue re-triggered by this session's own commits, not a regression) and their untracked artifacts deleted before immediately re-running; one non-reproducible transient spawn failure each in `measure-cwv.mjs`'s cleanup step and the nav-gate half's build, resolved by retry (not chased further, per the fix-attempt-limit); AGENTS.md's new subsection isolated to its own commit via a checkout/edit/commit/restore sequence to avoid sweeping up unrelated pre-existing uncommitted conventions from another session; full per-run `cwv/` artifact directories committed (not just the top-level report) for a fuller evidence trail, after confirming no embedded secrets.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Discarded two preliminary pipeline runs tripped by measure-cwv.mjs's own build-freshness gate**
- **Found during:** Task 1's first invocation, and Task 2's first invocation
- **Issue:** `measure-cwv.mjs` fails loud ("`.next/diagnostics/route-bundle-stats.json` predates the HEAD commit... Pitfall 6") whenever the local `.next` build is older than the current HEAD commit. Since this plan's own Task 1 commit advances HEAD, the very next invocation (Task 2's first attempt) re-tripped the same gate, even though nothing was broken.
- **Fix:** Let each affected run finish (its own nav-gate half performs a fresh `npm run build`, which incidentally satisfies the freshness gate for the *next* invocation), deleted the untracked, non-representative report files it wrote, then immediately re-ran the exact same command. Both re-runs proceeded past the gate cleanly and produced the real evidence committed in this plan.
- **Files affected:** none committed from the discarded attempts (deleted before staging)
- **Verification:** both real green and red attempts show `[measure-cwv] ALL ROUTES MEASURED` with genuine per-route medians, not ENOENT artifact-missing failures
- **Committed in:** n/a (discarded runs were never committed; only the subsequent real attempts were, in `1c02d46` and `d502190`)

**2. [Rule 3 - Blocking, resolved via retry] Two isolated transient spawnSync child-process failures**
- **Found during:** Task 1's second (discarded) invocation
- **Issue:** `measure-cwv.mjs`'s own `runCleanup()` child spawn failed once ("CLEANUP FAILED — test user may remain in DB") with zero output from the child, and moments later the nav-gate half's `npm run build` spawn also failed ("npm run build failed") with zero build output — both immediately following the CWV half's heavy Puppeteer/Chrome-driven measurement phase.
- **Fix:** Manually re-ran `node scripts/cleanup-test-users.mjs "%@test.local"` (succeeded, reaped the residual test user) and manually re-ran `npm run build` (succeeded cleanly) seconds later to confirm both were transient, not logic bugs. Then re-ran the full pipeline for the real evidence capture.
- **Files affected:** none (diagnostic-only; no code changed)
- **Verification:** both commands succeeded on manual retry; the subsequent real pipeline runs (Task 1's third attempt, Task 2's second attempt) completed both steps cleanly with no recurrence
- **Committed in:** n/a (no code change required; documented here as an observed intermittent-environment finding for future invocations)

---

**Total deviations:** 2 auto-fixed operational/environmental findings (both Rule 3, resolved via retry — no code changes to `scripts/perf-recert.mjs` or `scripts/measure-cwv.mjs`)
**Impact on plan:** No scope creep. Neither finding indicates a regression or a logic bug in the orchestrator; both are consistent with the plan's own framing that the phase documents/triages, and does not optimize. The build-freshness gate re-trip is worth flagging in the script's own header for future sessions (not done here — out of this plan's `files_modified` scope; noted for 18-06 or a future maintenance pass).

## Issues Encountered

None blocking. All observed anomalies (the Lighthouse-internal `@paulirish/trace_engine` `TypeError`, appearing once per Lighthouse run across every route/preset; the two transient spawn failures above; the build-freshness re-trips above) were investigated, confirmed non-blocking or resolved via retry, and did not require any code change to the Plan 04 orchestrator or the Plan 02/16 harness it composes.

## User Setup Required

None — no external service configuration required. Both runs used the existing `DATABASE_URL` from `.env.local` (never sourced directly, extracted via `grep`/`sed` per the established project convention) exactly as Plan 04 anticipated.

## Next Phase Readiness

- **PERF-06 is now fully satisfied** — Plans 02 (gate evaluator), 03 (immutable baseline), 04 (orchestrator), and 05 (this plan's live green + red demonstration) together prove "the gate must actually gate": it passes healthy code (green, exit 0) and fails loudly on a genuine hard-gate breach (red, exit 1, D-13-2), with both runs' reports committed as the success-criterion-3 evidence trail.
- The D-15/D-14 cadence is now documented in both `AGENTS.md` (human-facing convention) and `scripts/perf-recert.mjs`'s own header (machine/script-facing), so future sessions know when and how to invoke the gate.
- 18-06 (phase close-out / field-vs-lab comparison) can now proceed — it depends on the D-03 14-day Speed Insights field-data window (opened 2026-07-25 per the 18-01 entry in STATE.md, closing on/after 2026-08-08) rather than on anything from this plan.
- Flag for a future maintenance pass (not this plan's scope): document the "re-run `npm run build` immediately before `perf:recert` if HEAD advanced since the last build" operational note directly in `scripts/perf-recert.mjs`'s own header, alongside the existing D-15 cadence note, so a future operator doesn't need to rediscover the Pitfall 6 interaction by trial and error.

---
*Phase: 18-field-validation-guardrails*
*Completed: 2026-07-25*

## Self-Check: PASSED

- FOUND: .planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1354.md
- FOUND: .planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1354.json
- FOUND: .planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1405.md
- FOUND: .planning/phases/18-field-validation-guardrails/measurements/recert-2026-07-25-1405.json
- FOUND: AGENTS.md (contains "perf:recert")
- FOUND: commit 1c02d46
- FOUND: commit d502190
