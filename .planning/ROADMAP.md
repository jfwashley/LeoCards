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

## 🚧 v3.0 Performance & QA (Phases 14-18, 25-26)

**Milestone goal:** Make the app feel instant on every key route, and make the core learning journey provably correct with a scripted, time-aware QA harness.

QA comes first deliberately: the harness must protect the core journey before perf refactors begin. Motivation: v2.1's study-loop bug survived 2 months behind green unit tests — only real-pipeline integration scripts catch that class of gap.

- [x] **Phase 14: QA observability foundations** - QA can see exact card state and compress time, with affordances provably absent for customers (completed 2026-06-17)
- [x] **Phase 15: Core-journey QA harness** - The core learning journey is provably correct via scripted, time-resumable QA against the real pipeline (completed 2026-06-25)
- [x] **Phase 16: Performance baseline (Measure)** - Codified warm-prod measurement produces per-route baselines and ranked bottlenecks — no optimization (completed 2026-07-02)
- [x] **Phase 17: Performance optimization** - Every key route meets CWV "Good" gates and warm navigation feels instant, each change measured against the Phase 16 baseline (completed 2026-07-20)
- [ ] **Phase 18: Field validation & guardrails** - Field data confirms lab results and a one-command gate re-certifies perf before any release
- [x] **Phase 25: My Account** - Users can view their account details, change their password, log out, and delete their account from a Daybreak-styled My Account section reachable from the dashboard (completed 2026-07-20)
- [x] **Phase 26: Performance batch** - The five re-validated Fable-5 review wins land: batched study-commit and review-commit writes, batched DeepL translation (fixes the live >30-word failure), client-side image resize, and immutable caching for habitat clips (completed 2026-07-22)

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
- [x] 15-02-PLAN.md — shared harness library scripts/qa-lib.mjs (auth, DB provisioning, real-HTTP grade, /api/debug/state assertions, time-shift, manifest) + manifest gitignore
- [x] 15-03-PLAN.md — journeys qa-01 (learn 0→1), qa-02 (full mastery + wrong-answer + direction rules), qa-04 (habitat level L1→2 + higher)
- [x] 15-04-PLAN.md — journeys qa-03 (time-resumable manifest), qa-05 (decay/grace + pause) via the time-shift
- [x] 15-05-PLAN.md — orchestrator scripts/qa-run.mjs + cleanup wiring (QAJ-06) + npm scripts (qa:run, qa:cleanup)

### Phase 16: Performance baseline (Measure)

**Goal**: A codified, repeatable warm-prod measurement harness establishes per-route truth on where time goes for `/dashboard`, `/study`, `/deck/new-card`, `/deck/browse` — strictly NO optimization in this phase
**Depends on**: Phase 15 (the QA harness is in place before any perf refactoring cycle begins)
**Requirements**: PERF-01, PERF-02
**Success Criteria** (what must be TRUE):

  1. One npm script (`scripts/measure-cwv.mjs`) produces warm-prod (leocards.vercel.app) Lighthouse medians at n≥5 for mobile + desktop presets across all four key routes — replacing the ad-hoc shell commands from 13-PERF-REAL.md
  2. Each key route has a written baseline report: median CWV numbers plus bundle composition (per-route first-load JS, chunk fingerprinting via `page_client-reference-manifest`)
  3. Each route has a ranked bottleneck classification (bundle vs RSC waterfall vs hydration) naming its top optimization target for Phase 17
  4. No optimization changes land in this phase — the baseline is the immutable before-reference for every Phase 17 change

**Plans**: 3 plans (3 waves)

- [x] 16-01-PLAN.md — pure compute/render lib (median, bundle parse, D-07 bottleneck classifier, D-04 report renderers) + Wave-0 tests + fixture
- [x] 16-02-PLAN.md — measure-cwv.mjs harness: inlined auth+provision, puppeteer-core cookie auth, Lighthouse n=6 mobile+desktop loop, redirect guard, report writing, finally-cleanup, npm scripts
- [x] 16-03-PLAN.md — execute the warm-prod harness, produce + human-verify + commit the immutable per-route baselines (4 reports + raw JSON + summary)

### Phase 17: Performance optimization

**Goal**: Every key route meets CWV "Good" gates on warm prod and warm client-side navigation feels instant — each change measured before/after, never assumed
**Depends on**: Phase 16 (baseline + bottleneck ranking dictate what to optimize), Phase 15 (harness guards against core-journey regressions during refactors)
**Requirements**: PERF-03, PERF-04
**Success Criteria** (what must be TRUE):

  1. Each key route meets warm-prod mobile gates: LCP ≤2500 ms, TBT ≤200 ms, CLS ≤0.1, Perf ≥90 (n≥5 medians; never gated on cold Vercel previews — ±300 ms TBT noise)
  2. Every optimization lands with a measured before/after vs the Phase 16 baseline using the same `measure-cwv` harness
  3. Warm client-side navigation between key routes measures <~100 ms perceived, instrumented via Playwright navigation timing extending the `e2e/13-perf.spec.ts` pattern
  4. The Phase 15 core-journey harness still passes after all perf refactors — no learning-pipeline regressions

**Plans**: 5 plans (5 waves)

- [x] 17-01-PLAN.md — Wave-0 tooling: measure-cwv route filter + OUT_DIR redirect (D-09), DaybreakShimmer atom (D-03), content-visible + prod-build scaffolds, deck-view pre-split baseline test
- [x] 17-02-PLAN.md — Shared-infra hygiene: three→devDependencies + dead-code deletion (D-05), next.config stable-only (D-07), shared-chunk/auth-client audit (D-08), /habitat spot-check (D-11)
- [x] 17-03-PLAN.md — Dashboard client→RSC: HabitatHero→RSC + DeckView split + CountdownTimer leaf (D-06), poster-first resolution (D-02), dashboard re-measure + D-04 checkpoint
- [x] 17-04-PLAN.md — study/new-card/browse client→RSC + lazy-load (D-06/D-03), Motion→CSS swaps (D-05), 3-route re-measure + D-04 checkpoint
- [x] 17-05-PLAN.md — PERF-04 instant-nav gate: 6 nav pairs + content-visible + prod-build INP (D-13/14/15, task_d326ebac), prefetch + router.refresh invalidation (D-16/D-17), official final full run + qa:run

### Phase 18: Field validation & guardrails

**Goal**: Real-user data confirms the lab wins, and a permanent one-command gate prevents perf regressions from shipping
**Depends on**: Phase 17 (gates must be green in lab before field confirmation and guardrail lock-in)
**Requirements**: PERF-05, PERF-06
**Success Criteria** (what must be TRUE):

  1. Field p75 data (Vercel Speed Insights / CrUX) confirms lab medians on the key routes once traffic accrues, or the variance is documented with an explanation
  2. A single command re-certifies all perf gates (warm-prod lab regression guardrail across the four routes), runnable on demand before any release
  3. The re-certification gate fails loudly when any route regresses below its gates — demonstrated, not assumed

**Plans**: 5 plans in 2 waves

Wave 1 (deployable alone — Josh approves the push):
- [x] 26-01-PLAN.md — PERF-09 DeepL translation batching (fixes the live >30-word 429 failure)

Wave 2 (after PERF-09 ships):
- [x] 26-02-PLAN.md — PERF-07 study-commit single db.batch() round trip (WR-04 preserved)
- [x] 26-03-PLAN.md — PERF-08 review-commit one server action + one multi-row insert
- [x] 26-04-PLAN.md — PERF-10 client-side photo resize (~1568px JPEG) + server cap 7→4MB
- [x] 26-05-PLAN.md — PERF-11 immutable Cache-Control for /habitat/clips/* + D-08 naming rule

### Phase 25: My Account

**Goal**: Users can manage their own account from the dashboard — a Daybreak-styled My Account section where they can view their account details, change their password, log out, and permanently delete their account (the account/settings page deferred out of v4.0 Daybreak scope)
**Depends on**: Phase 24 (Daybreak design system — atoms, tokens, and chrome the section must be styled with); independent of Phases 17/18
**Requirements**: ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06
**Success Criteria** (what must be TRUE):

  1. A signed-in user can reach a My Account section from the dashboard and see their account details (at minimum email and account metadata)
  2. The user can change their password via the real auth pipeline (better-auth), with current-password verification and validation errors surfaced in the UI
  3. The user can log out from the section, ending the session and returning to the login screen
  4. The user can delete their account behind an explicit confirmation; deletion removes their data (cards, decks, SRS state, sessions) and invalidates the session — a deleted user can no longer sign in
  5. The section is Daybreak-styled, consistent with the v4.0 design system on desktop and mobile

**Plans**: 5 plans (4 waves)

- [x] 25-01-PLAN.md — Account mutation backend: requestEmailChange + deleteAccount actions, getPendingEmailChange query, verify-email GET route (D-07, D-14)
- [x] 25-02-PLAN.md — Change-password card + UI foundations: dirty-context, accordion/success-fade CSS, changePassword flow (D-08, D-09, D-10, D-11, D-04)
- [x] 25-03-PLAN.md — Account details card (name/email edit + pending banner) + Sign-out section (D-05, D-06, D-07)
- [x] 25-04-PLAN.md — /account page assembly + back-button dirty guard + delete-account row (D-02, D-03, D-04, D-12, D-13, D-14)
- [x] 25-05-PLAN.md — Header glyph swap + e2e (nav-button, app-header, logout-button delete, e2e retargets + new spec) (D-01)

### Phase 26: Performance batch

**Goal**: The five still-open recommendations from the re-validated Fable-5 performance review (2026-06-30 review, re-verified against current code 2026-07-21) are shipped: server round trips are batched on the two hot write paths, translation of large extractions works instead of failing, photo uploads shrink by an order of magnitude, and habitat clips stop re-downloading on every visit
**Depends on**: Phase 17 (optimizations land on the post-17 measured code; Phase 15 harness guards the learning pipeline during refactors). Independent of Phase 18 — runs BEFORE it so the Phase 18 re-cert gate certifies the final optimized code
**Requirements**: PERF-07, PERF-08, PERF-09, PERF-10, PERF-11
**Success Criteria** (what must be TRUE):

  1. The study-session commit performs its per-card mastery updates in a single round trip to Neon (`db.batch()` or equivalent — no per-card sequential `await db.update` loop in `/api/study/complete`), measurably shortening the "Saving your progress…" wait (PERF-07)
  2. Committing N reviewed image-cards is one server action carrying the whole array and one multi-row insert — not N sequential server-action calls each re-running auth/ownership checks (`review-list.tsx` + `saveImageCards` in `deck-actions.ts`) (PERF-08)
  3. An extraction with more than 30 words translates successfully — one batched DeepL request (native array API) instead of a per-word fan-out into the route's own 30/min rate limit; the deterministic 429 → "Translation unavailable" failure is gone and covered by a test (PERF-09)
  4. Photos are downscaled client-side (~1568 px long edge, JPEG re-encode) before upload; a 5 MB phone photo uploads as a few hundred KB, and the silent 3.3-5 MB dead zone (server 7 MB cap vs Vercel ~4.5 MB body limit) is closed (PERF-10)
  5. Habitat clips under `/habitat/clips/` ship with a long-lived immutable `Cache-Control` header via `next.config.ts` `headers()`, verified in response headers — repeat visits no longer re-fetch the 240 KB-1 MB clip (PERF-11)
  6. The Phase 15 core-journey harness and the unit + e2e suites still pass after all changes — no learning-pipeline regressions

**Wave-order constraint**: PERF-09 (translation batching) is a live user-facing bug fix — front-load it as Wave 1 so it can deploy ahead of the rest (every push to main auto-deploys prod).

**Plans**: TBD

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 MVP | 1-8 | 25/25 | Complete | 2026-04-15 |
| v2.0 Image-to-Flashcards | 9-11 | 10/10 | Complete | 2026-05-20 |
| v2.1 Living Habitat | 12-13.2 | 14/14 | Complete | 2026-05-29 |
| v4.0 Daybreak | 19-24 | 23/23 | Complete | 2026-06-24 |
| v3.0 Performance & QA | 14-18, 25-26 | 13/TBD | In progress (resumed) | — |

### v3.0 Performance & QA

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 14. QA observability foundations | 3/3 | Complete   | 2026-06-17 |
| 15. Core-journey QA harness | 5/5 | Complete    | 2026-06-25 |
| 16. Performance baseline (Measure) | 3/3 | Complete    | 2026-07-02 |
| 17. Performance optimization | 5/5 | Complete    | 2026-07-20 |
| 18. Field validation & guardrails | 0/TBD | Not started | - |
| 25. My Account | 5/5 | Complete    | 2026-07-20 |
| 26. Performance batch | 5/5 | Complete   | 2026-07-22 |

## Backlog

### Carried tech debt from v2.0

- `10-HUMAN-UAT.md` — offline vision eval reference-dataset (needs real photos + FR/ES tutor).
- `11-HUMAN-UAT.md` — live 6-step browser walkthrough (needs real DeepL + billing-enabled Anthropic keys).

### Carried from v4.0 Daybreak

- Per-phase `*-HUMAN-UAT.md` (Phases 20-24) — interaction/animation/multi-state/live-API items pending manual testing (visual UAT done 2026-06-24).
- `13-perf` INP-on-dev-server follow-up — assert INP only against a prod build (task_d326ebac).

### Upstream

- `gsd-sdk phase.complete` ROADMAP-fallback scan could mispick backlog `999.x` headings (`phase.cjs` ~1292–1306); worth an upstream report.
- `gsd-sdk phase.add` appended the new phase's detail block to the end of the file (inside Backlog) instead of the current milestone's Phase Details section, and skipped the milestone checklist — relocated manually for Phase 25 (2026-07-12) and again for Phase 26 (2026-07-21); likely the same fallback-scan root cause as above.

### Deferred from the Fable-5 perf review (2026-07-21 triage)

- LazyMotion/`m` diet for the 3 remaining `motion/react` importers (`study-card.tsx`, `study-session.tsx`, `level-up-overlay.tsx`, all /study-only) — deliberately deferred: Phase 17 D-05 carved out the card-swipe drag physics as not swappable, /study already scores Perf 99, and the remaining win (~90-100 KB on one route) doesn't justify touching the load-bearing drag code. Revisit only if /study regresses.
- Review item 3 (lazy-load ImageUploadFlow) needed nothing — already fixed in Phase 17 (D-03, `new-card-mode-toggle.tsx` `next/dynamic`).
