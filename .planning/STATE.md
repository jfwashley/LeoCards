---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Performance & QA
status: executing
stopped_at: Completed 17-04-PLAN.md
last_updated: "2026-07-19T14:42:56.000Z"
last_activity: 2026-07-19
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 13
  completed_plans: 12
  percent: 92
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.
**Current focus:** Phase 17 — performance-optimization

## Current Position

Milestone: v3.0 Performance & QA (resumed 2026-06-25 after v4.0 Daybreak shipped)
Phase: 17 (performance-optimization) — EXECUTING
Plan: 5 of 5
Status: 17-04 complete (D-04 accepted-miss on /deck/new-card); 17-05 (PERF-04 instant-nav gate) remaining
Last activity: 2026-07-19

Progress (v3.0): [█████████░] 92% (Phases 15-16 all 8 plans complete; Phase 17 plans 01-04 complete, 05 remaining; Phase 16's immutable warm-prod baseline committed, PERF-01/PERF-02 satisfied)

## Shipped Milestones

- ✅ v1.0 MVP (2026-04-15) — Phases 1-8, 25 plans, 23 requirements satisfied
- ✅ v2.0 Image-to-Flashcards (2026-05-20) — Phases 9-11, 10 plans, 15 requirements satisfied
- ✅ v2.1 Living Habitat (2026-05-29, closed 2026-06-12) — Phases 12-13.2, 14 plans
- ✅ v4.0 Daybreak (2026-06-24) — Phases 19-24, 23 plans, 28 requirements (DSY/ONB/STU/DSH/ADC/BRW/HAB) satisfied; tagged v4.0, archived to milestones/v4.0-*

## Milestone Note

v3.0 was paused after Phase 14 to ship the v4.0 Daybreak UI redesign (Phases 19-24). v4.0 is complete + archived; v3.0 is now resumed to finish Phases 15-18. Phase 16 is now complete (immutable warm-prod baseline committed). **Phases 17 and 18 remain unbuilt** (see [[project_leocards_v3_perf_qa_pending]] reminder).

## Accumulated Context

### Roadmap Evolution

- Phase 25 added (2026-07-12): My Account — dashboard-accessible, Daybreak-styled account section: view account details, change password, log out, delete account. This is the account/settings page explicitly deferred out of v4.0 Daybreak scope. Depends on Phase 24 (Daybreak design system); independent of Phases 17/18.

### Decisions (v3.0-relevant)

- Phase 15-04: qa-03 manifest path = scripts/qa-manifest-qa03.json (fixed default, overridable via RESUME_MANIFEST env); Phase B shift = max(resumeAfter−now+1s, 90_000ms) fast-path.
- Phase 15-04: qa-05 pause/unpause called inline (raw fetch) — qa-lib has no pause helper. Decay epsilon ±0.01. Round-2 grades submit "n2t" directly (directionForRound(2) returns "either", not valid HTTP).
- Phase 15-04: 3 vitest test failures in cooldown-config.test.ts are pre-existing (Phase 14 plan 14-01); not caused by this plan's .mjs scripts.
- Phase 15-05: qa-run.mjs uses time-shift fast path (option a) — single STUDY_COOLDOWN_MINUTES=1 server boot covers all five journeys; qa-03-B uses --resume with built-in fast-path shift calculation. No new packages; only npm script entries added.
- Phase 16-01: split pure logic into measure-cwv-lib.mjs (zero imports) so Plan 02's side-effectful harness (DATABASE_URL guard + puppeteer.launch) never breaks vitest collection — keeps decision logic (median/classifier/bundle-parse) unit-testable in isolation with zero live credentials or network access required.
- Phase 16-02: measure-cwv.mjs inlines (not imports) qa-lib.mjs's auth/provisioning helpers, adding the required prod `Origin` header — qa-lib.mjs exits at module load without DEBUG_CHEAT_SECRET, and the perf harness never calls `/api/debug/*`, so importing it would crash the harness at startup for no benefit.
- Phase 16-02: bottleneck classification uses MOBILE medians as the basis (not desktop) — mobile is the CWV-constrained profile per the D-06/13.1 precedent from Phase 13.1's `/habitat` CWV work.
- Phase 16-03: split the harness-fix commit from the baseline-docs commit — three Rule-1 bug fixes to scripts/measure-cwv.mjs (getUserId prod-auth, lighthouse named import, /study deck param) are code changes kept separate from the immutable, never-re-edited baseline artifacts, for a clean audit trail.
- Phase 16-03: getUserId()'s broken prod round-trip was removed, not patched — signUp() now reads userId directly from the sign-up response body instead of a second /api/auth/get-session call that was sending the wrong cookie name to prod.
- Phase 16-03: all four key routes classify as "bundle" bottleneck (526-1111 KB first-load JS); PERF-01 and PERF-02 are complete — the immutable warm-prod baseline is committed and Phase 17 is unblocked.
- Phase 17-01: resolveRoutes treats "/habitat" as a UNION-addable opt-in (not a subset filter) — ROUTE_FILTER=/habitat alone must return exactly ["/habitat"], which a plain intersection against the 4 key routes would incorrectly return [] for (D-11 spot-check requirement).
- Phase 17-01: resolveOutDir defaults to a NEW .planning/phases/17-performance-optimization/measurements/ directory and is structurally incapable of defaulting to the Phase 16 baseline path — PHASE_OUT_DIR is the only override. Verified: git status --porcelain under 16-performance-baseline-measure/baseline/ stayed empty across all 3 tasks.
- Phase 17-01: DaybreakShimmer ships with zero hooks/client directive (RSC-safe) since a placeholder never needs interactivity; e2e/perf-markers.ts only scaffolds PERF_READY_ATTR/waitForPerfReady/IS_PROD_BUILD this plan — no route is wired with data-perf-ready yet (explicitly Wave 3/4 work).
- Phase 17-02: three/@types/three moved to devDependencies (build-time-only classification, 0 KB client-bundle delta by design); two confirmed-dead files deleted (habitat-widget.tsx, habitat-3d-widget-image.tsx) after tsc --noEmit confirmed zero real call sites.
- Phase 17-02: next.config.ts left unchanged — every stable candidate (serverExternalPackages) has no applicable problem in this codebase; every applicable-looking option (optimizePackageImports, cssChunking, inlineCss, staleTimes) is version:experimental per shipped Next 16 docs frontmatter, correctly excluded without a D-07 checkpoint since none were ever live candidates.
- Phase 17-02: D-08 audit of src/app/layout.tsx + src/lib/auth-client.ts concluded both are already optimal (no unnecessary client boundary, no heavy import) — no code change lands; the actual auth session-gate lives in src/app/(protected)/layout.tsx (sibling file), confirmed unchanged.
- Phase 17-02: shared floor re-measured post-Wave-2 at 514.72 KB / 9 chunks — unchanged from the Phase 16 baseline, confirming the D-05 relocation was 0 KB delta as expected. This is Wave 3's before-reference.
- Phase 17-02: MSYS_NO_PATHCONV=1 required when passing ROUTE_FILTER=/habitat (or any bare-leading-slash env value) through Git Bash on Windows — MSYS silently rewrites it to a Windows path, causing the route filter to match nothing and the harness to exit 0 with an empty summary (no exception thrown). Flag for any future .mjs harness invocation on this platform.
- Phase 17-03: HabitatHero converted to RSC ("use client" removed, zero other change); CountdownTimer extracted as a standalone client leaf; dashboard/page.tsx now server-renders the entire static shell directly, hydrating only CountdownTimer + a new DashboardHeader client leaf (AppHeader's non-serializable onDeckChange callback — the exact contingency the plan's own action text anticipated, not an unplanned architectural change).
- Phase 17-03: D-02 resolved without new media — the Daybreak dashboard mock (design/handoff-daybreak/daybreak-dashboard.jsx) shows a fully static medallion and LCP already passes (1816ms), so the existing static approach satisfies D-02 (D-12 no gold-plating).
- Phase 17-03: D-04 checkpoint resolved by Josh — Accept, continue to Wave 4. Re-measurement showed no material change (mobile TBT 524ms/Perf 86 vs. the Phase 16 baseline's 518ms/86, both still failing their gates; LCP 1816ms/CLS 0 still pass), proving the TBT weight lives in the shared-chunk floor (CardList's motion/react + lucide-react, auth, providers) that Wave 4 targets directly. The dashboard gate remains explicitly open pending Wave 4 + the phase-end full run; no fidelity change was made or approved.
- Phase 17-04: D-04 accepted-miss — /deck/new-card TBT 338ms vs ≤200 gate accepted (Perf 92 passes, 62% TBT cut from 891, heaviest route 789KB); other 3 routes fully certify.

- Phase 14 (QA observability foundations, complete 2026-06-17) is the OBSERVABILITY SURFACE Phase 15's harness builds on: QA-mode cookie + `readQaAuth()` gate, `STUDY_COOLDOWN_MINUTES` env precedence (short non-zero cooldowns), `/debug` live per-card SRS state table (real data), `QaStateBadge` (`R0·n2t` style) RSC-gated onto study + dashboard, and a prod-parity gating e2e (no badges / QA endpoints 404 when secret unset).
- Phase 15 must drive the REAL pipeline (app's own API routes / browser flows), NEVER the `/debug` virtual override (that override is the cheat console for visual states, not a journey harness).
- DB workflow: this project uses Drizzle `db:push` (NOT `db:migrate` — the migrations journal is empty); hosted-DB writes gated by the auto-mode classifier.
- All QA/test users use the `*test.local` domain so `scripts/cleanup-test-users.mjs` removes them (QAJ-06).

### Blockers/Concerns

None blocking. Phase 15 needs careful time-resumable manifest design (QAJ-03) + a QA-gated time-shift for decay (QAJ-05) without real multi-day waits.

**Non-blocking flag (Phase 17-02):** the D-11 `/habitat` regression spot-check measured mobile Perf 81 / TBT 777ms, down from the Phase 13.1-documented Perf 96 (2026-05-29). Neither of 17-02's two tasks touch `/habitat`'s render path — the regression matches the same degraded-bundle pattern already seen across all 4 key routes in the Phase 16 baseline, suggesting shared-chunk drift accumulated during the intervening v4.0 Daybreak phases (19-24). Out of scope to fix in Phase 17 (`/habitat` gets only a regression spot-check per D-11); evidence committed at `.planning/phases/17-performance-optimization/measurements/habitat-baseline.md` for any future investigation.

## Carried Tech Debt

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2.0 UAT | 10-HUMAN-UAT.md (offline vision eval reference-set) | Partial | v2.0 close |
| v2.0 UAT | 11-HUMAN-UAT.md (live browser walkthrough) | Partial | v2.0 close |
| v4.0 UAT | 20-24 HUMAN-UAT.md interaction/animation/live items | Partial | v4.0 close (visual UAT done 2026-06-24) |
| v4.0 Perf | 13-perf INP-on-dev-server follow-up (task_d326ebac) | Open | v4.0 close |

## Session Continuity

Last session: 2026-07-19T14:42:56.000Z
Stopped at: Completed 17-04-PLAN.md
Resume file: .planning/phases/17-performance-optimization/17-05-PLAN.md

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 16 P01 | 12min | 2 tasks | 3 files |
| Phase 16-performance-baseline-measure P02 | 10min | 3 tasks | 2 files |
| Phase 16 P03 | 8min | 3 tasks | 15 files |
| Phase 17 P01 | 40min | 3 tasks | 8 files |
| Phase 17 P02 | 15min | 3 tasks | 5 files |
| Phase 17 P03 | 25min | 3 tasks | 9 files |
| Phase 17 P04 | n/a (continuation close-out) | 2 tasks + checkpoint | 22 files |
