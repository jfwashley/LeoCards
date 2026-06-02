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
- **Residual TBT — RESOLVED (2026-05-29).** First Phase 999.1 slice: removed zod from `/habitat` (habitat-scene used it only to validate a localStorage cache object, pulling the whole 263 KB zod chunk onto the route → hand-written type guard instead). Combined with three.js + motion removals, ~900 KB of controllable JS is off the route. **Warm-production re-measurement: `/habitat` mobile LCP 2417 ✅ / TBT 97 ✅ / CLS 0 ✅ / Perf 96 — PASSES all CWV "Good" gates.** (The earlier 377 ms was cold-Vercel-preview serverless noise; lab variance on cold previews was ±300 ms TBT, larger than the gap — always certify on warm prod.) Shipped to prod.
- D-28 cached dashboard widget unchanged (static image, untouched).
- Obsolete live-canvas tests retired (gesture/hint/lockout); `habitat-3d-canvas.tsx` + `src/lib/habitat-3d/*` kept as the build-time renderer (`?capture=video`).
- Throwaway test users in Neon to clean up (filter `@leocards-test.local`): multiple `cwv-*@leocards-test.local` from the measurement runs.
- Phase 13/13.1 not yet wrapped in a milestone (v3.0 TBD).

## Roadmap Evolution

- 2026-05-20 — Phase 12 added: Pause cards in active deck review (no milestone wrapper)
- 2026-05-21 — Phase 13 (3D habitat migration) shipped to PASS-WITH-CARRIED-CONCERNS — 6 plans, ~25 commits, PixiJS fully removed, Three.js code-split
- 2026-05-28 — Phase 13.1 inserted (habitat-mobile-perf); pivoted from live-3D-defer to **video migration** — /habitat now plays pre-rendered clips, Three.js build-time-only, mobile LCP/CLS pass + Perf 90, residual TBT → 999.1
- 2026-05-29 — Habitat clip **quality upgrade**: regenerated all 36 clips at 1280×720 / 16s / slow 360° orbit (was 1280×400 / 4.5s / fixed) for a real "3D animation" feel; seamless via full-revolution loop (no xfade). Capture forces a 1280×720 backing store + deterministic orbit in `?capture=video`; orchestrator 16s no-xfade + scale + higher bitrate. ~47 MB for 72 files; one ~1.3 MB pair lazy-loads per visit.
- 2026-05-29 — **Phase 13.2: QA cheat console** (`/debug`) shipped to prod. Signed-cookie *virtual override* in `computeHabitatState` forces level/mood/quality (any combo, incl. impossible) without touching real data; flows through /habitat clip + dashboard widget + badges; instantly reversible. Live real-state readout for confirming real card→level progression. Secret-gated (`DEBUG_CHEAT_SECRET`); HMAC-signed cookie (not forgeable); feature OFF when the env var is unset. `src/lib/debug-cheat.ts`, `/api/debug/{cheat,state}`, `src/app/(protected)/debug/page.tsx`. **Now enabled on Vercel PREVIEW too** (set via Vercel REST API — project has no connected Git repo + a CLI bug blocks `env add preview`; the REST API with `target:["preview"]` is the working path; token at `~/AppData/Roaming/com.vercel.cli/Data/auth.json`).
- 2026-05-29 — **CRITICAL FIX: cards never recorded as "learned".** The core study loop was broken since Phase 3: a round-0 card is shown once per session in n2t only, but `ROUND_THRESHOLDS[0]` required `2 n2t + 2 t2n` correct → unreachable → every card stuck at `masteryRound 0` → `learnedCardCount` always 0 → habitat hard-stuck at level 1 for ALL real users. Old unit tests passed by hand-feeding `computeCardUpdate` idealized grades the real session can't produce (integration gap). **Fix:** a round advances on a single correct answer in the presented direction (round0=n2t, round1=t2n, round2=either), matching `getCardStage`. Round cooldowns made env-configurable: auto-zeroed in dev (NODE_ENV) + on preview (`STUDY_NO_COOLDOWN=true`) so QA sees 0→learned in one sitting; real 12h/24h in prod. Verified 3 ways (rewritten realistic unit tests, real-pipeline API script masteryRound 0→3, browser e2e `e2e/study-progression.spec.ts`); prod smoke confirmed 0→1 + 12h cooldown. `src/lib/study-engine.ts`, `src/app/api/study/complete/route.ts`, `src/env.ts`.
- 2026-05-29 — QA: all 9 levels × 4 moods (72 clips) + posters verified present/working; force any state via `/debug`. Cleaned 416 accumulated test users (`@leocards-test.local` + e2e `@test.local`).

## Next Steps

- ✅ `/habitat` mobile CWV resolved on production (zod removal landed; LCP 2417 / TBT 97 / CLS 0 / Perf 96). Phase 13 R9 fully closed.
- ✅ Neon test-user cleanup done (15 `@leocards-test.local` users deleted; `scripts/cleanup-test-users.mjs` kept for reuse).
- `/gsd-new-milestone` — start v3.0 (wraps Phases 12 + 13 + 13.1 + whatever ships next).
- **Phase 999.1 (perf initiative)** still open for *app-wide* perf (other routes' CWV, RSC/hydration) — `/habitat` no longer needs it. `/gsd-review-backlog` to promote when ready.
- Confirm real-user CWV on prod (CrUX / Vercel Speed Insights) once traffic accrues — lab medians look green, field data is the final word.
- **`/debug` cheat console** is live on production (`leocards.vercel.app/debug`). `DEBUG_CHEAT_SECRET` is set on the Production scope only; to use it on Vercel **preview** URLs too, add the same var to the Preview scope via the Vercel dashboard (CLI non-interactive add failed in this shell). Local dev: the secret is in `.env.local`.

## Accumulated Context

### Roadmap Evolution

- Phase 13.1 inserted after Phase 13: habitat-mobile-perf — defer Three.js init past LCP via gesture-mounted full-resolution poster (fixes R9 carried regression) (URGENT)
