---
gsd_state_version: 1.0
milestone: none
milestone_name: milestone
status: completed-with-concerns
last_updated: "2026-05-21T00:00:00.000Z"
last_activity: 2026-05-21 -- Phase 13 (3D habitat) verification PASS-WITH-CARRIED-CONCERNS
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 11
  completed_plans: 11
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-20 for v2.0 shipping)

**Core value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.
**Current focus:** Phase 13 — 3D habitat (shipped to PASS-WITH-CARRIED-CONCERNS)

## Current Position

Milestone: — (v2.0 shipped, v3.0 not yet defined)
Phase: 13 — COMPLETE (PASS-WITH-CARRIED-CONCERNS)
Plan: 6 of 6
Status: Phase 13 closed; R9 carried concern (mobile CWV unmeasured/marginal — instrument-inflated)
Last activity: 2026-05-21 -- Phase 13 verified (8 PASS, R9 PARTIAL)

## Shipped Milestones

- ✅ v1.0 MVP (2026-04-15) — Phases 1-8, 25 plans, 23 requirements satisfied
- ✅ v2.0 Image-to-Flashcards (2026-05-20) — Phases 9-11, 10 plans, 15 requirements satisfied, 33/33 verifications passed, 20/20 code-review findings fixed, 32/32 STRIDE threats accounted for

## Carried Tech Debt

Non-blocking, intentional deferrals:

**From v2.0:**
- VALIDATION.md `nyquist_compliant: false` on Phases 9, 10, 11 — Wave-0 tests green, bookkeeping flag-flip pending. Candidate for `/gsd-validate-phase 9 / 10 / 11`.
- `10-HUMAN-UAT.md` (status: partial) — offline vision eval reference-dataset; blocked on real photos + FR/ES tutor.
- `11-HUMAN-UAT.md` (status: partial) — live 6-step browser walkthrough; blocked on real DeepL + billing-enabled Anthropic keys.
- Untracked `e2e/11-phase9-image-upload.spec.ts` — Playwright regression spec, keep/delete decision outstanding.
- `gsd-sdk phase.complete` upstream bug — mispicks backlog 999.1 as next_phase; worth upstream report.

**From Phase 13 (2026-05-21, R9 re-measured 2026-05-27, Phase 13.1 attempt #1 reverted 2026-05-27):**
- R9 **FAIL on `/habitat` mobile** (confirmed clean Lighthouse, see `13-PERF-REAL.md`): LCP median 2989 ms > 2500 gate; TBT median 646 ms > 200 gate. Three.js 504 KB chunk dominates mobile main-thread time. Other 3 R9 cells (dashboard desktop+mobile, `/habitat` desktop) PASS.
- **Phase 13.1 attempt #1 (defer + tree-shake + mobile-budget) REVERTED.** All 4 commits (`ef4f43f`, `9ea06ee`, `77fbdf6`, `cfdac42`) reverted by `56c4dff`/`e714c90`/`a9df4f4`/`b962c35`. Caused 86% LCP regression on `/habitat` mobile (5560 ms vs 2989 baseline). Root causes: posters were widget-sized (1-3 KB) not habitat-sized; `requestIdleCallback` fired inside Lighthouse trace; tree-shake produced 0 bytes saved on three r160. Full postmortem at `.planning/phases/13-3d-habitat/13-PERF-FIX-ATTEMPT-1.md`.
- Attempt #2 prerequisites (do not skip): full-resolution `/habitat`-sized poster generation (Playwright build-time, ~1280×720 webp), gesture-only defer (no idle fallback), drop unrelated tree-shake/mobile-budget changes, measure each opt individually.
- D-28 stays **cached** — confirmed.
- Throwaway test users in preview Neon DB: `cwv-test-1779866703@…` and `cwv-test-1779873404@…` (clean up if preview shares prod DB).
- Phase 13 not yet wrapped in a milestone (v3.0 TBD).

## Roadmap Evolution

- 2026-05-20 — Phase 12 added: Pause cards in active deck review (no milestone wrapper)
- 2026-05-21 — Phase 13 (3D habitat migration) shipped to PASS-WITH-CARRIED-CONCERNS — 6 plans, ~25 commits, PixiJS fully removed, Three.js code-split

## Next Steps

- **Resolve R9 carried concern** — run real-device CWV on `/habitat` mobile; if clean, flip R9 to PASS and consider re-evaluating D-28 (live widget option).
- `/gsd-new-milestone` — start v3.0 (wraps Phase 13 + whatever ships next).
- `/gsd-review-backlog` — promote Phase 999.1 (perf initiative) if performance work should be the next focus.
- `/gsd-discuss-phase` for any new phase, OR `/gsd-explore` to ideate.
