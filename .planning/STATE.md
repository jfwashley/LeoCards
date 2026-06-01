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

**From Phase 13.1 — VIDEO MIGRATION (2026-05-28, shipped):**

- **Strategy pivot:** after 3 failed attempts to make live Three.js perform on mobile (and it stopped rendering entirely on the user's device), `/habitat` was migrated to **pre-rendered per-level×mood ambient video clips** (36 clips, fixed camera, ambient motion). Three.js is now **build-time-only** — it renders the clips in CI and NO LONGER ships to the client (`grep WebGLRenderer .next/static/chunks` → none; −517 KB). Decay/quality = live CSS filter; reduced-motion = static poster.
- **Final CWV (`13.1-PERF-VIDEO.md`):** `/habitat` **desktop** LCP 764 / TBT 49 / CLS 0 / **Perf 99 — full PASS**. `/habitat` **mobile** LCP **1860 ✅** / CLS **0 ✅** / TBT **377 ❌** (gate 200) / **Perf 90** (green). vs Phase-13 baseline (LCP 2989, TBT 646, Perf 57, + not rendering) this is a decisive win.
- **Three habitat-specific fixes landed:** (1) Three.js → video (−517 KB); (2) dropped `motion/react` from habitat-scene → two CSS fades (TBT 1049→415, that 71 KB chunk was ~1512 ms script-eval); (3) preloaded priority poster as LCP candidate + clip `preload=metadata` (LCP 2729→1860, fixed "LCP element: none").
- **Residual TBT 377 ms (mobile) = app-shell baseline**, NOT habitat-specific (React hydration + Next runtime + better-auth client; `/dashboard` carries the same class at ~286). → **Phase 999.1**: code-split/defer auth client + providers, trim shared vendor chunk, reduce hydration — against a whole-app baseline, not bolted onto /habitat.
- D-28 cached dashboard widget unchanged (static image, untouched).
- Obsolete live-canvas tests retired (gesture/hint/lockout); `habitat-3d-canvas.tsx` + `src/lib/habitat-3d/*` kept as the build-time renderer (`?capture=video`).
- Throwaway test users in Neon to clean up (filter `@leocards-test.local`): multiple `cwv-*@leocards-test.local` from the measurement runs.
- Phase 13/13.1 not yet wrapped in a milestone (v3.0 TBD).

## Roadmap Evolution

- 2026-05-20 — Phase 12 added: Pause cards in active deck review (no milestone wrapper)
- 2026-05-21 — Phase 13 (3D habitat migration) shipped to PASS-WITH-CARRIED-CONCERNS — 6 plans, ~25 commits, PixiJS fully removed, Three.js code-split
- 2026-05-28 — Phase 13.1 inserted (habitat-mobile-perf); pivoted from live-3D-defer to **video migration** — /habitat now plays pre-rendered clips, Three.js build-time-only, mobile LCP/CLS pass + Perf 90, residual TBT → 999.1

## Next Steps

- **Phase 999.1 (perf initiative)** — now has a concrete first target: `/habitat` mobile TBT 377 ms (app-shell baseline: defer/split better-auth client + providers, trim shared vendor chunk, reduce hydration). `/gsd-review-backlog` to promote.
- `/gsd-new-milestone` — start v3.0 (wraps Phases 12 + 13 + 13.1 + whatever ships next).
- Clean up `@leocards-test.local` throwaway users in Neon.
- Confirm real-user CWV on prod (CrUX / Vercel Analytics) once traffic accrues.

## Accumulated Context

### Roadmap Evolution

- Phase 13.1 inserted after Phase 13: habitat-mobile-perf — defer Three.js init past LCP via gesture-mounted full-resolution poster (fixes R9 carried regression) (URGENT)
