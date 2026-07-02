---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Performance & QA
status: verifying
stopped_at: Completed 16-03-PLAN.md
last_updated: "2026-07-02T08:24:34.979Z"
last_activity: 2026-07-02
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.
**Current focus:** Phase 16 — performance-baseline-measure (complete, ready for verification)

## Current Position

Milestone: v3.0 Performance & QA (resumed 2026-06-25 after v4.0 Daybreak shipped)
Phase: 16 (performance-baseline-measure) — COMPLETE
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-07-02

Progress (v3.0): [████████░░] 80% (Phases 15-16 all 8 plans complete; Phase 16's immutable warm-prod baseline committed, PERF-01/PERF-02 satisfied)

## Shipped Milestones

- ✅ v1.0 MVP (2026-04-15) — Phases 1-8, 25 plans, 23 requirements satisfied
- ✅ v2.0 Image-to-Flashcards (2026-05-20) — Phases 9-11, 10 plans, 15 requirements satisfied
- ✅ v2.1 Living Habitat (2026-05-29, closed 2026-06-12) — Phases 12-13.2, 14 plans
- ✅ v4.0 Daybreak (2026-06-24) — Phases 19-24, 23 plans, 28 requirements (DSY/ONB/STU/DSH/ADC/BRW/HAB) satisfied; tagged v4.0, archived to milestones/v4.0-*

## Milestone Note

v3.0 was paused after Phase 14 to ship the v4.0 Daybreak UI redesign (Phases 19-24). v4.0 is complete + archived; v3.0 is now resumed to finish Phases 15-18. Phase 16 is now complete (immutable warm-prod baseline committed). **Phases 17 and 18 remain unbuilt** (see [[project_leocards_v3_perf_qa_pending]] reminder).

## Accumulated Context

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

- Phase 14 (QA observability foundations, complete 2026-06-17) is the OBSERVABILITY SURFACE Phase 15's harness builds on: QA-mode cookie + `readQaAuth()` gate, `STUDY_COOLDOWN_MINUTES` env precedence (short non-zero cooldowns), `/debug` live per-card SRS state table (real data), `QaStateBadge` (`R0·n2t` style) RSC-gated onto study + dashboard, and a prod-parity gating e2e (no badges / QA endpoints 404 when secret unset).
- Phase 15 must drive the REAL pipeline (app's own API routes / browser flows), NEVER the `/debug` virtual override (that override is the cheat console for visual states, not a journey harness).
- DB workflow: this project uses Drizzle `db:push` (NOT `db:migrate` — the migrations journal is empty); hosted-DB writes gated by the auto-mode classifier.
- All QA/test users use the `*test.local` domain so `scripts/cleanup-test-users.mjs` removes them (QAJ-06).

### Blockers/Concerns

None blocking. Phase 15 needs careful time-resumable manifest design (QAJ-03) + a QA-gated time-shift for decay (QAJ-05) without real multi-day waits.

## Carried Tech Debt

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2.0 UAT | 10-HUMAN-UAT.md (offline vision eval reference-set) | Partial | v2.0 close |
| v2.0 UAT | 11-HUMAN-UAT.md (live browser walkthrough) | Partial | v2.0 close |
| v4.0 UAT | 20-24 HUMAN-UAT.md interaction/animation/live items | Partial | v4.0 close (visual UAT done 2026-06-24) |
| v4.0 Perf | 13-perf INP-on-dev-server follow-up (task_d326ebac) | Open | v4.0 close |

## Session Continuity

Last session: 2026-07-02T08:24:09.684Z
Stopped at: Completed 16-03-PLAN.md
Resume file: None

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 16 P01 | 12min | 2 tasks | 3 files |
| Phase 16-performance-baseline-measure P02 | 10min | 3 tasks | 2 files |
| Phase 16 P03 | 8min | 3 tasks | 15 files |
