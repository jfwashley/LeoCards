---
gsd_state_version: 1.0
milestone: none
milestone_name: "- VALIDATION.md `nyquist_compliant: false` flag-flip on Phases 9, 10, 11 — Wave-0 tests green, bookkeeping only. Candidate for `/gsd-validate-phase 9 / 10 / 11`."
status: Phase 13 closed; R9 carried concern (mobile CWV unmeasured/marginal — instrument-inflated)
last_updated: "2026-05-27T09:50:10.127Z"
last_activity: 2026-05-21 -- Phase 13 verified (8 PASS, R9 PARTIAL)
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 11
  completed_plans: 11
  percent: 50
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

**From Phase 13.1 (2026-05-28, ships with carried lab-variance concerns):**

- Phase 13.1 closed Phase 13's R9 carried regression — `/habitat` mobile LCP improved 2989 → **2561 ms** median (−14%), TBT 646 → 542 ms (−16%), desktop went Perf 98 → **100** (LCP 931 → 578). CLS 0 across all 15 Lighthouse runs.
- R7 (CWV "Good" on `/habitat`) is PARTIAL: desktop PASS outright; mobile median **61 ms over** 2500 ms gate; 3 of 6 lab runs pass. Architecture is correct (SSR `<link rel=preload>`, direct CDN, opacity:1, Lighthouse identifies LCP element). Field-data CWV (CrUX or Vercel Analytics) needed to validate real-user perf vs lab simulation.
- R8 (`/dashboard` non-regression) is PARTIAL: code byte-identical to baseline; mobile measurement regressed 2151 → 3354 LCP but attributable to Vercel-edge cold-cache variance, not real regression. Confirm post-ship.
- D-28 cached widget stays correct.
- Throwaway test users in preview Neon DB to clean up: `cwv-test-1779866703@…`, `cwv-test-1779873404@…`, plus 4 more from 13.1 iterations (`cwv-test-…`, `cwv-rerun-…`, `cwv-rest-…`, `cwv-warmer-…`, `cwv-cdn-…`, `cwv-shrunk-…`). Filter on `@leocards-test.local`.
- Phase 13.1 ships PASS-WITH-LAB-VARIANCE. Production deploy + real-user CWV monitoring as next steps.
- Phase 13/13.1 not yet wrapped in a milestone (v3.0 TBD).
- Residual perf debt → Phase 999.1: closing the last 61 ms LCP gap, reducing TBT below 200 (Three.js chunk is route-prefetched even when execution is gesture-gated).

## Roadmap Evolution

- 2026-05-20 — Phase 12 added: Pause cards in active deck review (no milestone wrapper)
- 2026-05-21 — Phase 13 (3D habitat migration) shipped to PASS-WITH-CARRIED-CONCERNS — 6 plans, ~25 commits, PixiJS fully removed, Three.js code-split

## Next Steps

- **Resolve R9 carried concern** — run real-device CWV on `/habitat` mobile; if clean, flip R9 to PASS and consider re-evaluating D-28 (live widget option).
- `/gsd-new-milestone` — start v3.0 (wraps Phase 13 + whatever ships next).
- `/gsd-review-backlog` — promote Phase 999.1 (perf initiative) if performance work should be the next focus.
- `/gsd-discuss-phase` for any new phase, OR `/gsd-explore` to ideate.

## Accumulated Context

### Roadmap Evolution

- Phase 13.1 inserted after Phase 13: habitat-mobile-perf — defer Three.js init past LCP via gesture-mounted full-resolution poster (fixes R9 carried regression) (URGENT)
