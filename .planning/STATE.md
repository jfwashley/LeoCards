---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Performance & QA
status: verifying
last_updated: "2026-06-17T12:05:32.405Z"
last_activity: 2026-06-17
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-12 after v2.1 Living Habitat)

**Core value:** The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.
**Current focus:** Phase 14 — qa-observability-foundations (COMPLETE — all 3 plans done; ready for Phase 15)

## Current Position

Phase: 14 (qa-observability-foundations) — COMPLETE
Plan: 3 of 3 (all complete)
Status: Phase complete — QAOB-01/02/04 all satisfied; ready for Phase 15
Last activity: 2026-06-17

## Shipped Milestones

- ✅ v1.0 MVP (2026-04-15) — Phases 1-8, 25 plans, 23 requirements satisfied
- ✅ v2.0 Image-to-Flashcards (2026-05-20) — Phases 9-11, 10 plans, 15 requirements satisfied, 33/33 verifications passed, 20/20 code-review findings fixed, 32/32 STRIDE threats accounted for
- ✅ v2.1 Living Habitat (2026-05-29, closed 2026-06-12) — Phases 12-13.2, 14 plans: pause cards, 3D habitat via pre-rendered clips, /debug QA console, critical study-loop fix

## Carried Tech Debt

Non-blocking, intentional deferrals:

**From v2.0:**

- `10-HUMAN-UAT.md` (status: partial) — offline vision eval reference-dataset; blocked on real photos + FR/ES tutor. Archived under `milestones/v2.0-phases/`.
- `11-HUMAN-UAT.md` (status: partial) — live 6-step browser walkthrough; blocked on real DeepL + billing-enabled Anthropic keys. Archived under `milestones/v2.0-phases/`.
- `gsd-sdk phase.complete` upstream bug — ROADMAP-fallback scan could mispick backlog `999.x` headings (`phase.cjs` ~1292–1306); trigger removed locally (999.1 absorbed into v3.0); worth an upstream report.

**Resolved at v2.1 close (2026-06-12 debt sweep):** Nyquist flags 9/10/11 flipped (retroactive audit; suites green); `e2e/11-phase9-image-upload.spec.ts` confirmed tracked + passing (KEEP); biome ci → 0 errors; vitest no longer collects e2e specs; 186 e2e test users purged; stale biome debug session resolved; GitHub PAT relocated out of the repo.

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
- 2026-06-12 — **v3.0 roadmap created**: Phases 14-18 (QA observability foundations → core-journey QA harness → perf baseline → perf optimization → field validation & guardrails). 16/16 requirements mapped. Backlog 999.1 absorbed into Phases 16-18.

## Key Decisions (Phase 14 Plans 01-03)

- QA_MODE_COOKIE uses fixed-sentinel HMAC (no schema parse step) — eliminates payload injection surface (T-14-01)
- buildCooldownConfig() exported from complete/route.ts for unit testability (mirrors computeCardUpdate export pattern)
- QA-mode cookie set on both clear AND set paths in cheat/route.ts — any secret verification establishes QA mode (D-01/D-02)
- cards query in state/route.ts verifies deck ownership before fetching (T-14-06 mitigation)
- vi.doMock() with top-level DB/auth mocks chosen — avoids restructuring the route file + prevents test suite timeout
- Pre-sign-up feature-state probe to /api/debug/state (no session) — 404=disabled; featureDisabled flag guards endpoint assertions in QAOB-04 spec
- DOM badge-absence assertions always run unconditionally — customer has no QA cookie so [data-qa-badge] is always absent

## Next Steps

- **Phase 15: Core-journey QA harness** — next milestone phase
- Set `STUDY_COOLDOWN_MINUTES=15` in `.env.local` for local QA testing of short cooldowns
- Confirm real-user CWV on prod (CrUX / Vercel Speed Insights) once traffic accrues — formalized as PERF-05 (Phase 18)
- **`/debug` cheat console** is live on production (`leocards.vercel.app/debug`), secret-gated on Production + Preview scopes; local dev secret in `.env.local`
- CI should run `e2e/14-qa-parity.spec.ts` against a secret-disabled server to enforce QAOB-04 regression gate
