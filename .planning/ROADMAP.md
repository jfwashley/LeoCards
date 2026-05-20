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
