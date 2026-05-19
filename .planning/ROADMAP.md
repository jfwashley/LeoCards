# Roadmap: LeoCards

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-04-15)
- 🚧 **v2.0 Image-to-Flashcards** — Phases 9-11 (in progress)

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

### 🚧 v2.0 Image-to-Flashcards (In Progress)

**Milestone Goal:** Let users upload a photo, have Claude vision extract the vocabulary words, review/edit the results, and add the kept words (auto-translated via the existing DeepL pipeline) into a chosen deck — image feature only, no art pass.

- [x] **Phase 9: Image Upload & Deck Selection** - Choose, validate, preview an image and pick the target deck from the add-card flow
- [x] **Phase 10: Vision Extraction Endpoint** - Rate-limited Claude vision endpoint that turns an uploaded image into a word list, with robust loading/error handling (functional complete 2026-05-19; eval reference-dataset deferred — 10-HUMAN-UAT.md)
- [ ] **Phase 11: Review & Commit** - Editable review screen that funnels kept words through the existing add-card + DeepL pipeline into the selected deck

## Phase Details

### Phase 9: Image Upload & Deck Selection
**Goal**: From the add-card flow, a user can pick a single valid image, preview it, and choose which deck the extracted words will land in — all before any extraction happens.
**Depends on**: Phase 2 (existing add-card / deck management flow), Phase 8
**Requirements**: IMG-01, IMG-02, IMG-03, IMG-04, IMG-05
**Success Criteria** (what must be TRUE):
  1. User sees an "extract words from image" entry point inside the add-card flow and can open a file picker from it
  2. User can select one JPG, PNG, or WebP image and is shown a thumbnail/preview of it
  3. User is shown a clear, friendly error and the file is rejected before upload when it is the wrong type or exceeds the ~5MB limit
  4. User can replace the chosen image or cancel out of the flow before triggering extraction
  5. User can pick which deck the words will be added to, pre-selected to the active deck, before extraction
**Plans**: 2 plans
  - [x] 09-01-PLAN.md — Pure image-validation module + Vitest suite (IMG-02, IMG-03)
  - [x] 09-02-PLAN.md — Image picker (click/drag/paste) + preview + Step 2 deck selection wired into add-card page (IMG-01, IMG-04, IMG-05)
**UI hint**: yes

### Phase 10: Vision Extraction Endpoint
**Goal**: A user can trigger extraction on their chosen image and reliably get back the vocabulary words Claude vision found, with a protected server endpoint and graceful handling of every failure path.
**Depends on**: Phase 9
**Requirements**: EXT-01, EXT-02, EXT-03, EXT-04, EXT-05
**Success Criteria** (what must be TRUE):
  1. User triggers extraction and receives the list of vocabulary words Claude vision found in the image
  2. User sees a loading state during extraction and cannot double-submit the same request
  3. User sees a clear "no words found" message with the option to try another image when the image yields nothing
  4. User sees a graceful, recoverable error on vision failure or timeout without losing their deck selection or image
  5. The extraction endpoint is guarded by the existing in-memory rate limiter and rejects oversized or invalid payloads server-side
**Plans**: 4 plans
  - [x] 10-01-PLAN.md — Wave 0: deps + ANTHROPIC_API_KEY env + D-12 shared constants refactor + route/reducer/eval test scaffolds
  - [x] 10-02-PLAN.md — Protected Claude vision route handler (guards + v6 AI SDK call) — EXT-01/03/05
  - [x] 10-03-PLAN.md — Client reducer + handleExtract wiring + 5 extraction states — EXT-02/03/04
  - [x] 10-04-PLAN.md — Model-id verified (Task 1 complete); eval scaffolding committed (Task 2); live eval deferred — reference images + tutor labels outstanding (10-HUMAN-UAT.md)
**UI hint**: yes

### Phase 11: Review & Commit
**Goal**: Before anything touches the deck, a user reviews and edits the extracted words, then commits the kept ones through the existing DeepL-backed add-card pipeline into the selected deck.
**Depends on**: Phase 10
**Requirements**: RVW-01, RVW-02, RVW-03, RVW-04, RVW-05
**Success Criteria** (what must be TRUE):
  1. User sees the extracted words in an editable review list before any card is added to the deck
  2. User can edit the text of any word and remove or toggle off words they don't want to keep
  3. Each kept word is auto-translated via the existing DeepL pipeline with the translation editable, exactly like a manual card add
  4. User confirms and the kept words are added to the selected deck, then sees a success summary with the count added
  5. User can cancel the review without adding any cards, and words already present in the deck are flagged or skipped
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 9 → 10 → 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 6/6 | Complete | 2026-03-23 |
| 2. Deck and Card Management | v1.0 | 4/4 | Complete | 2026-03-24 |
| 3. Study Engine and Study UI | v1.0 | 3/3 | Complete | 2026-03-27 |
| 4. Habitat Engine | v1.0 | 2/2 | Complete | 2026-03-28 |
| 5. Habitat UI | v1.0 | 3/3 | Complete | 2026-03-28 |
| 6. Milestone System and Dashboard Polish | v1.0 | 3/3 | Complete | 2026-03-28 |
| 7. Backend Security and Quality Fixes | v1.0 | 3/3 | Complete | 2026-03-29 |
| 8. Tech Debt Cleanup | v1.0 | 1/1 | Complete | 2026-04-14 |
| 9. Image Upload & Deck Selection | v2.0 | 2/2 | Complete    | 2026-05-18 |
| 10. Vision Extraction Endpoint | v2.0 | 4/4 | Functional complete; eval deferred (10-HUMAN-UAT.md) | 2026-05-19 |
| 11. Review & Commit | v2.0 | 0/TBD | Not started | - |

## Backlog

### Phase 999.1: Perf initiative — near-instant navigation (BACKLOG)

**Goal:** Cross-cutting app performance work to make navigations near-instant. NOT part of the v2.0 image milestone — its own evidence-driven discuss→research→plan→execute cycle.

**Scope (captured for future planning):**
- *Phase A — Measure:* `next build && next start` baseline; Lighthouse + Core Web Vitals on key routes (dashboard, deck view, /deck/new-card, study session); `next build` bundle report; server TTFB / RSC route timings. Identify whether slowness is bundle size, RSC data-fetch waterfalls, or hydration.
- *Phase B — Optimize against baseline:* route-level code splitting, RSC/data-fetch parallelization, prefetch-on-intent, image/asset optimization, bundle trimming — every change tied to a measured before/after.

**Success criterion:** warm navigations <~100ms perceived in a production build, with defined LCP/TTI targets per key route.

**Context:** Raised 2026-05-18 during Phase 9 execution. Observed dev slowness was `next dev` cold-compile + a freshly cleared `.next` cache, NOT proven production slowness — so a real production baseline (Phase A) must precede any optimization.

**Requirements:** TBD
**Plans:** 2/2 plans complete

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)
