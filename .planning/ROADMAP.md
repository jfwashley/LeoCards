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
- [ ] 12-01-PLAN.md — Add nullable `pausedAt timestamp` column to `cards`; generate + apply Drizzle migration (BLOCKING human checkpoint to apply against Neon)
- [ ] 12-02-PLAN.md — Append pure `computeUnpauseUpdate` to study-engine.ts (+ 4 Vitest cases); add `isNull(cards.pausedAt)` filter to `getStudyCards`
- [ ] 12-03-PLAN.md — POST /api/cards/[id]/pause and /unpause route handlers (auth + ownership + 30/min rate-limit, idempotent, single-UPDATE writeback); STRIDE threat model in-plan
- [ ] 12-04-PLAN.md — Thread `pausedAt` through dashboard → DeckView → CardList; per-row Pause/Play icon button with paused styling; all-paused empty-state copy
- [ ] 12-05-PLAN.md — Playwright e2e spec (`e2e/12-pause-cards.spec.ts`) + full quality gate (lint, typecheck, unit, build, e2e); BLOCKING verification checkpoint

### Phase 13: 3D habitat — replace 2D PixiJS sprite habitat with cute-stylized 3D scenes

**Goal:** [To be planned] — Migrate the habitat render pipeline from PixiJS 2D sprite atlases to a real 3D scene (Three.js / react-three-fiber direction TBD in discuss-phase). All 10 habitat levels become 3D scenes; tiger and milestone animals become 3D models in the same scene for visual coherence (rather than 2D overlays). Mini-habitat widget direction (downscaled 3D vs. cached 2D screenshot) to be decided.

**Requirements**: TBD (covers the existing Active requirement "Visual style is cute illustrated habitats" — to be refined from 2D → 3D in PROJECT.md)
**Depends on:** Phase 11 (no functional coupling, but should not interleave with Phase 12 deck-review work)
**Plans:** 0 plans

**Open questions for discuss-phase:**
- Renderer: Three.js + react-three-fiber vs. Babylon.js vs. plain Three.js
- Asset format expectations (glTF 2.0 / .glb assumed; confirm with designer pipeline)
- Tiger + animal integration: full 3D scene actors (decided) — but how do mood transitions, milestone animal entries, and sparkle particles compose?
- Performance budget: bundle size delta, mobile WebGL target, fallback strategy for low-end devices
- Decay states: 10 scenes vs. 1 scene with material/density modifications
- Accessibility: prefers-reduced-motion handling for camera moves and animations
- Mini-habitat widget (dashboard, 80px) — downscaled 3D render vs. cached 2D screenshots
- v1.0 PixiJS code: deprecate entirely or keep as a fallback tier?
- Milestone wrapper: should this sit inside a v3.0 milestone alongside other related work, or ship standalone?

Plans:
- [ ] TBD (run /gsd-spec-phase 13 or /gsd-discuss-phase 13 to scope)
</content>
