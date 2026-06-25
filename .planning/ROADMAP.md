# Roadmap: LeoCards

> **Milestone order note:** v3.0 (Performance & QA) was paused after Phase 14 to ship the v4.0 Daybreak UI redesign (Phases 19–24, shipped 2026-06-24). v3.0 is now **resumed** (2026-06-25) to finish Phases 15–18. This is why the active milestone (v3.0) is numerically lower than the most-recently-shipped one (v4.0).

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-04-15)
- ✅ **v2.0 Image-to-Flashcards** — Phases 9-11 (shipped 2026-05-20)
- ✅ **v2.1 Living Habitat** — Phases 12-13.2 (shipped 2026-05-29; closed 2026-06-12)
- 🚧 **v3.0 Performance & QA** — Phases 14-18 (Phase 14 shipped; **resumed 2026-06-25** for Phases 15-18)
- ✅ **v4.0 Daybreak** — Phases 19-24 (shipped 2026-06-24)

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

<details>
<summary>✅ v2.1 Living Habitat (Phases 12-13.2) — SHIPPED 2026-05-29, closed 2026-06-12</summary>

- [x] Phase 12: Pause cards in active deck review (5/5 plans) — completed 2026-05-20
- [x] Phase 13: 3D habitat — PixiJS → Three.js Soft-Clay scenes (6/6 plans) — completed 2026-05-21
- [x] Phase 13.1: Habitat mobile perf — video migration, Three.js build-time-only (3 VIDEO plans; 4 gesture-poster plans superseded) — completed 2026-05-29
- [x] Phase 13.2: QA cheat console (/debug) — quick phase, no phase dir — completed 2026-05-29

Full details: [milestones/v2.1-ROADMAP.md](milestones/v2.1-ROADMAP.md)

</details>

<details>
<summary>✅ v4.0 Daybreak (Phases 19-24) — SHIPPED 2026-06-24</summary>

- [x] Phase 19: Daybreak Foundation + Onboarding & Auth (5/5 plans) — completed 2026-06-20
- [x] Phase 20: Study Screen (2/2 plans) — completed 2026-06-21
- [x] Phase 21: Dashboard — "My Deck" (5/5 plans) — completed 2026-06-21
- [x] Phase 22: Add a Card (4/4 plans) — completed 2026-06-22
- [x] Phase 23: Browse Words (4/4 plans) — completed 2026-06-23
- [x] Phase 24: Habitat (3/3 plans) — completed 2026-06-24

Full details: [milestones/v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)

</details>

## 🚧 v3.0 Performance & QA (Phases 14-18)

**Milestone goal:** Make the app feel instant on every key route, and make the core learning journey provably correct with a scripted, time-aware QA harness.

QA comes first deliberately: the harness must protect the core journey before perf refactors begin. Motivation: v2.1's study-loop bug survived 2 months behind green unit tests — only real-pipeline integration scripts catch that class of gap.

- [x] **Phase 14: QA observability foundations** - QA can see exact card state and compress time, with affordances provably absent for customers (completed 2026-06-17)
- [ ] **Phase 15: Core-journey QA harness** - The core learning journey is provably correct via scripted, time-resumable QA against the real pipeline
- [ ] **Phase 16: Performance baseline (Measure)** - Codified warm-prod measurement produces per-route baselines and ranked bottlenecks — no optimization
- [ ] **Phase 17: Performance optimization** - Every key route meets CWV "Good" gates and warm navigation feels instant, each change measured against the Phase 16 baseline
- [ ] **Phase 18: Field validation & guardrails** - Field data confirms lab results and a one-command gate re-certifies perf before any release

## Phase Details (v3.0)

### Phase 14: QA observability foundations
**Goal**: QA can see exact per-card SRS state and compress cooldown time, with every QA affordance env/secret-gated and provably absent from the customer experience
**Depends on**: Nothing (first phase of v3.0; extends existing `/debug` + `DEBUG_CHEAT_SECRET` / `STUDY_NO_COOLDOWN` patterns)
**Requirements**: QAOB-01, QAOB-02, QAOB-03, QAOB-04
**Status**: Complete (2026-06-17) — 3/3 plans
**Plans**:
- [x] 14-01-PLAN.md — QA-mode cookie, STUDY_COOLDOWN_MINUTES precedence, /debug per-card SRS table (QAOB-02, QAOB-03)
- [x] 14-02-PLAN.md — QaStateBadge component + RSC-gated wiring onto study cards and dashboard rows (QAOB-01)
- [x] 14-03-PLAN.md — prod-parity gating e2e: no badges in customer DOM, QA endpoints 404 when secret unset (QAOB-04)
**UI hint**: yes

### Phase 15: Core-journey QA harness
**Goal**: The core learning journey — learn, master, cool down, decay, level up — is provably correct via scripted, repeatable, time-resumable QA that drives the app's REAL pipeline (own API routes / browser flows), never the `/debug` virtual override
**Depends on**: Phase 14 (state codes, configurable cooldowns, and the `/debug` state table are the harness's observability surface)
**Requirements**: QAJ-01, QAJ-02, QAJ-03, QAJ-04, QAJ-05, QAJ-06
**Success Criteria** (what must be TRUE):
  1. A scripted "learn a card" run creates user/deck/card, completes a real study session via the app's own API path, and asserts round 0→1 with the correct next direction and cooldown
  2. A scripted full mastery progression covers rounds 0→1→2→3→learned, including wrong-answer reset/hold paths and direction rules (round0=n2t, round1=t2n, round2=either)
  3. A time-resumable session persists a manifest, exits, and on resume 10–60 minutes later asserts every card landed in its expected state (cooldown expired vs still cooling, due-counts correct)
  4. A habitat progression script crosses the level 1→2 threshold (plus one representative higher transition) through real learning and asserts `computeHabitatState`, the dashboard widget, and `/habitat` all agree on the new level
  5. Decay/grace behavior (2-day grace + 5%/day, including pause interactions) is verified via a QA-gated time-shift, and every QA run self-cleans — all test users use `*test.local` so `scripts/cleanup-test-users.mjs` leaves zero residue in prod data
**Plans**: 5 plans (4 waves)
- [x] 15-01-PLAN.md — QA-gated time-shift affordance (route + debug-cheat helpers + 3 callsites + vitest + prod-parity e2e)
- [ ] 15-02-PLAN.md — shared harness library scripts/qa-lib.mjs (auth, DB provisioning, real-HTTP grade, /api/debug/state assertions, time-shift, manifest) + manifest gitignore
- [ ] 15-03-PLAN.md — journeys qa-01 (learn 0→1), qa-02 (full mastery + wrong-answer + direction rules), qa-04 (habitat level L1→2 + higher)
- [ ] 15-04-PLAN.md — journeys qa-03 (time-resumable manifest), qa-05 (decay/grace + pause) via the time-shift
- [ ] 15-05-PLAN.md — orchestrator scripts/qa-run.mjs + cleanup wiring (QAJ-06) + npm scripts (qa:run, qa:cleanup)

### Phase 16: Performance baseline (Measure)
**Goal**: A codified, repeatable warm-prod measurement harness establishes per-route truth on where time goes for `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse` — strictly NO optimization in this phase
**Depends on**: Phase 15 (the QA harness is in place before any perf refactoring cycle begins)
**Requirements**: PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. One npm script (`scripts/measure-cwv.mjs`) produces warm-prod (leocards.vercel.app) Lighthouse medians at n≥5 for mobile + desktop presets across all four key routes — replacing the ad-hoc shell commands from 13-PERF-REAL.md
  2. Each key route has a written baseline report: median CWV numbers plus bundle composition (per-route first-load JS, chunk fingerprinting via `page_client-reference-manifest`)
  3. Each route has a ranked bottleneck classification (bundle vs RSC waterfall vs hydration) naming its top optimization target for Phase 17
  4. No optimization changes land in this phase — the baseline is the immutable before-reference for every Phase 17 change
**Plans**: TBD

### Phase 17: Performance optimization
**Goal**: Every key route meets CWV "Good" gates on warm prod and warm client-side navigation feels instant — each change measured before/after, never assumed
**Depends on**: Phase 16 (baseline + bottleneck ranking dictate what to optimize), Phase 15 (harness guards against core-journey regressions during refactors)
**Requirements**: PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Each key route meets warm-prod mobile gates: LCP ≤2500 ms, TBT ≤200 ms, CLS ≤0.1, Perf ≥90 (n≥5 medians; never gated on cold Vercel previews — ±300 ms TBT noise)
  2. Every optimization lands with a measured before/after vs the Phase 16 baseline using the same `measure-cwv` harness
  3. Warm client-side navigation between key routes measures <~100 ms perceived, instrumented via Playwright navigation timing extending the `e2e/13-perf.spec.ts` pattern
  4. The Phase 15 core-journey harness still passes after all perf refactors — no learning-pipeline regressions
**Plans**: TBD

### Phase 18: Field validation & guardrails
**Goal**: Real-user data confirms the lab wins, and a permanent one-command gate prevents perf regressions from shipping
**Depends on**: Phase 17 (gates must be green in lab before field confirmation and guardrail lock-in)
**Requirements**: PERF-05, PERF-06
**Success Criteria** (what must be TRUE):
  1. Field p75 data (Vercel Speed Insights / CrUX) confirms lab medians on the key routes once traffic accrues, or the variance is documented with an explanation
  2. A single command re-certifies all perf gates (warm-prod lab regression guardrail across the four routes), runnable on demand before any release
  3. The re-certification gate fails loudly when any route regresses below its gates — demonstrated, not assumed
**Plans**: TBD

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 MVP | 1-8 | 25/25 | Complete | 2026-04-15 |
| v2.0 Image-to-Flashcards | 9-11 | 10/10 | Complete | 2026-05-20 |
| v2.1 Living Habitat | 12-13.2 | 14/14 | Complete | 2026-05-29 |
| v4.0 Daybreak | 19-24 | 23/23 | Complete | 2026-06-24 |
| v3.0 Performance & QA | 14-18 | 3/TBD | In progress (resumed) | — |

### v3.0 Performance & QA

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 14. QA observability foundations | 3/3 | Complete   | 2026-06-17 |
| 15. Core-journey QA harness | 1/5 | In Progress|  |
| 16. Performance baseline (Measure) | 0/TBD | Not started | - |
| 17. Performance optimization | 0/TBD | Not started | - |
| 18. Field validation & guardrails | 0/TBD | Not started | - |

## Backlog

### Carried tech debt from v2.0
- `10-HUMAN-UAT.md` — offline vision eval reference-dataset (needs real photos + FR/ES tutor).
- `11-HUMAN-UAT.md` — live 6-step browser walkthrough (needs real DeepL + billing-enabled Anthropic keys).

### Carried from v4.0 Daybreak
- Per-phase `*-HUMAN-UAT.md` (Phases 20-24) — interaction/animation/multi-state/live-API items pending manual testing (visual UAT done 2026-06-24).
- `13-perf` INP-on-dev-server follow-up — assert INP only against a prod build (task_d326ebac).

### Upstream
- `gsd-sdk phase.complete` ROADMAP-fallback scan could mispick backlog `999.x` headings (`phase.cjs` ~1292–1306); worth an upstream report.
