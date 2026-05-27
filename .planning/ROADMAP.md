# Roadmap: LeoCards

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-04-15)
- ✅ **v2.0 Image-to-Flashcards** — Phases 9-11 (shipped 2026-05-20)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-8) — SHIPPED 2026-04-15</summary>

- [x] Phase 1: Foundation (6/6 plans) — completed 2026-03-23
- [x] Phase 2: Deck and Card Management (4/4 plans) — completed 2026-03-24
- [x] Phase 3: Study Engine and Study UI (3/3 plans) — completed 2026-03-27
- [x] Phase 4: Habitat Engine (2/2 plans) — completed 2026-03-28
- [x] Phase 5: Habitat UI (3/3 plans) — completed 2026-03-28
- [x] Phase 6: Milestone System and Dashboard Polish (3/3 plans) — completed 2026-03-28
- [x] Phase 7: Backend Security and Quality Fixes (3/3 plans) — completed 2026-03-29
- [x] Phase 8: Tech Debt Cleanup (1/1 plan) — completed 2026-04-14

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v2.0 Image-to-Flashcards (Phases 9-11) — SHIPPED 2026-05-20</summary>

- [x] Phase 9: Image Upload & Deck Selection (2/2 plans) — completed 2026-05-18
- [x] Phase 10: Vision Extraction Endpoint (4/4 plans) — completed 2026-05-19
- [x] Phase 11: Review & Commit (4/4 plans) — completed 2026-05-19

Full details: [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)

</details>

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 MVP | 1-8 | 25/25 | Complete | 2026-04-15 |
| v2.0 Image-to-Flashcards | 9-11 | 10/10 | Complete | 2026-05-20 |

## Backlog

### Phase 999.1: Perf initiative — near-instant navigation (BACKLOG)

**Goal:** Cross-cutting app performance work to make navigations near-instant. Its own evidence-driven discuss→research→plan→execute cycle.

**Scope (captured for future planning):**
- *Phase A — Measure:* `next build && next start` baseline; Lighthouse + Core Web Vitals on key routes (dashboard, deck view, /deck/new-card, study session); `next build` bundle report; server TTFB / RSC route timings. Identify whether slowness is bundle size, RSC data-fetch waterfalls, or hydration.
- *Phase B — Optimize against baseline:* route-level code splitting, RSC/data-fetch parallelization, prefetch-on-intent, image/asset optimization, bundle trimming — every change tied to a measured before/after.

**Success criterion:** warm navigations <~100ms perceived in a production build, with defined LCP/TTI targets per key route.

**Context:** Raised 2026-05-18 during Phase 9 execution. Observed dev slowness was `next dev` cold-compile + a freshly cleared `.next` cache, NOT proven production slowness — so a real production baseline (Phase A) must precede any optimization.

**Requirements:** TBD
**Plans:** TBD

- [ ] TBD (promote with /gsd-review-backlog when ready)

### Carried tech debt from v2.0

- VALIDATION.md `nyquist_compliant: false` flag-flip on Phases 9, 10, 11 — Wave-0 tests green, bookkeeping only. Candidate for `/gsd-validate-phase 9 / 10 / 11`.
- `10-HUMAN-UAT.md` — offline vision eval reference-dataset (needs real photos + FR/ES tutor).
- `11-HUMAN-UAT.md` — live 6-step browser walkthrough (needs real DeepL + billing-enabled Anthropic keys).
- Untracked `e2e/11-phase9-image-upload.spec.ts` — keep/delete decision outstanding.

### Phase 12: Pause cards in active deck review — let users temporarily exclude a card from study sessions without losing its scheduling state; when unpaused, cadence resumes as if the pause never happened

**Goal:** Add per-card pause/unpause on the dashboard's active-deck review screen. Paused cards are excluded from study sessions and from dashboard due-counts / cooldown countdowns, but their SRS scheduling state is preserved; on unpause, `cooldownUntil` shifts forward by exactly `(now − pausedAt)` so cadence resumes as if the pause never happened.
**Requirements**: P12-01, P12-02, P12-03, P12-04, P12-05, P12-06, P12-07, P12-08
**Depends on:** Phase 11
**Plans:** 5 plans

Plans:
- [x] 12-01-PLAN.md — Add nullable `pausedAt timestamp` column to `cards`; generate + apply Drizzle migration (BLOCKING human checkpoint to apply against Neon)
- [x] 12-02-PLAN.md — Append pure `computeUnpauseUpdate` to study-engine.ts (+ 4 Vitest cases); add `isNull(cards.pausedAt)` filter to `getStudyCards`
- [x] 12-03-PLAN.md — POST /api/cards/[id]/pause and /unpause route handlers (auth + ownership + 30/min rate-limit, idempotent, single-UPDATE writeback); STRIDE threat model in-plan
- [x] 12-04-PLAN.md — Thread `pausedAt` through dashboard → DeckView → CardList; per-row Pause/Play icon button with paused styling; all-paused empty-state copy
- [x] 12-05-PLAN.md — Playwright e2e spec (`e2e/12-pause-cards.spec.ts`) + full quality gate (lint, typecheck, unit, build, e2e); BLOCKING verification checkpoint

### Phase 13: 3D habitat — replace 2D PixiJS sprite habitat with cute-stylized 3D scenes

**Goal:** Migrate the habitat render pipeline from PixiJS 2D sprite atlases to 3D scenes. Renderer = plain Three.js (locked by existing designer artifacts at `.planning/design/animations/`). All 9 habitat levels become 3D scenes (level 1 = Leo on mound; level 9 = endgame: songbirds + golden-hour). Tiger and milestone animals are 3D actors in the same scene for visual coherence (not 2D overlays). Mini-widget direction (live 3D vs. cached image) gated on perf measurement (D-28).

**Requirements**: P13-R1..P13-R10 (10 falsifiable requirements locked in `.planning/phases/13-3d-habitat/13-SPEC.md`)
**Depends on:** Phase 11 (no functional coupling); Phase 12 to ship first per researcher recommendation
**Plans:** 6 plans (CONTEXT.md, SPEC.md, RESEARCH.md, 13-01..13-06 PLAN.md all written and committed)

**Resolved (post-artifact-inspection, 2026-05-20):**
- Renderer: **plain Three.js 0.160.x** (locked by designer artifacts)
- Asset format: **code, not files** — Three.js JSX gets ported into TypeScript modules
- Scene structure: **single base scene + level-gated feature flags** (D-09 implemented in code via `featuresForLevel()`)
- Camera: orbit + auto-orbit-on-idle (D-26) — already implemented in `habitats-shared.jsx`
- Art style: Soft Clay (locked over lowpoly + voxel explorations)
- Level count: 9 (level 9 = endgame; engine reconciled)

**Still open for discuss / research:**
- Performance budget targets (CWV "Good" gate locked; concrete frame-rate floor on mobile TBD)
- Decay visual implementation (designer code doesn't yet do quality < 1.0)
- `prefers-reduced-motion` handling
- Mini-widget D-28 gate (live 3D vs. cached image — measure to decide)
- v1.0 PixiJS deprecation (assume full removal unless 2D fallback needed for low-end devices)
- Phase 12 ↔ 13 sequencing recommendation
- Milestone wrapper question (does Phase 13 sit inside a v3.0 milestone?)
- D-29 re-check: existing designer code has subtle character idle baked in — does that close D-29?

Plans:
- [x] 13-01-PLAN.md — Three.js ESM port of scaffolding; D-29 closed (designer idle sufficient) — completed 2026-05-20
- [x] 13-02-PLAN.md — Clay world + lion + elephant + animation/ambient ported — completed 2026-05-20
- [x] 13-03-PLAN.md — React shell rewire (habitat-3d-canvas) + keyboard orbit + reduced-motion — completed 2026-05-20
- [x] 13-04-PLAN.md — Mood + decay binding + 28 reference screenshots (126/126 pairs distinct via automated pixel-diff) — completed 2026-05-20
- [x] 13-05-PLAN.md — Live 3D 80px widget (later superseded by 13-06 D-28 cached decision) — completed 2026-05-20
- [x] 13-06-PLAN.md — D-28 = **cached** (live widget FPS 21/18 < 30 gate); 9 hero `.webp`s + image variant; PixiJS removed; Three.js code-split (504 KB chunk) — completed 2026-05-21

**Status:** Complete — PASS-WITH-KNOWN-PERF-REGRESSION (R9 FAIL on `/habitat` mobile only — confirmed via clean Lighthouse 2026-05-27: LCP 2989 ms / TBT 646 ms; other 3 cells PASS. D-28 cached widget re-confirmed correct. Fix candidate for Phase 13.1 or 999.1. See `13-PERF-REAL.md`.)
</content>
