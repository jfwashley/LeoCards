---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Performance & QA
status: ready_to_plan
stopped_at: Phase 15 complete (5/5) — ready to discuss Phase 16
last_updated: 2026-06-25T10:28:01.622Z
last_activity: 2026-06-25
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 72
  completed_plans: 28
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.
**Current focus:** Phase 16 — performance baseline (measure)

## Current Position

Milestone: v3.0 Performance & QA (resumed 2026-06-25 after v4.0 Daybreak shipped)
Phase: 16
Plan: Not started
Status: Ready to plan
Last activity: 2026-06-25

Progress (v3.0): [██████████] 100% (Phase 15 all 5 plans complete)

## Shipped Milestones

- ✅ v1.0 MVP (2026-04-15) — Phases 1-8, 25 plans, 23 requirements satisfied
- ✅ v2.0 Image-to-Flashcards (2026-05-20) — Phases 9-11, 10 plans, 15 requirements satisfied
- ✅ v2.1 Living Habitat (2026-05-29, closed 2026-06-12) — Phases 12-13.2, 14 plans
- ✅ v4.0 Daybreak (2026-06-24) — Phases 19-24, 23 plans, 28 requirements (DSY/ONB/STU/DSH/ADC/BRW/HAB) satisfied; tagged v4.0, archived to milestones/v4.0-*

## Milestone Note

v3.0 was paused after Phase 14 to ship the v4.0 Daybreak UI redesign (Phases 19-24). v4.0 is complete + archived; v3.0 is now resumed to finish Phases 15-18. **Phases 16, 17, and 18 remain unbuilt after Phase 15** (see [[project_leocards_v3_perf_qa_pending]] reminder).

## Accumulated Context

### Decisions (v3.0-relevant)

- Phase 15-04: qa-03 manifest path = scripts/qa-manifest-qa03.json (fixed default, overridable via RESUME_MANIFEST env); Phase B shift = max(resumeAfter−now+1s, 90_000ms) fast-path.
- Phase 15-04: qa-05 pause/unpause called inline (raw fetch) — qa-lib has no pause helper. Decay epsilon ±0.01. Round-2 grades submit "n2t" directly (directionForRound(2) returns "either", not valid HTTP).
- Phase 15-04: 3 vitest test failures in cooldown-config.test.ts are pre-existing (Phase 14 plan 14-01); not caused by this plan's .mjs scripts.
- Phase 15-05: qa-run.mjs uses time-shift fast path (option a) — single STUDY_COOLDOWN_MINUTES=1 server boot covers all five journeys; qa-03-B uses --resume with built-in fast-path shift calculation. No new packages; only npm script entries added.

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

Last session: 2026-06-25T11:30:00.000Z
Stopped at: Phase 15 Plan 05 complete — qa-run.mjs orchestrator + qa:run/qa:cleanup npm scripts committed; Phase 15 fully done; Phases 16/17/18 unbuilt
Resume file: None
