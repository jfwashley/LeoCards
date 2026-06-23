# Roadmap: LeoCards

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-04-15)
- ✅ **v2.0 Image-to-Flashcards** — Phases 9-11 (shipped 2026-05-20)
- ✅ **v2.1 Living Habitat** — Phases 12-13.2 (shipped 2026-05-29; closed 2026-06-12)
- ⏸ **v3.0 Performance & QA** — Phases 14-18 (Phase 14 shipped; Phases 15-18 deferred; reserved)
- 🚧 **v4.0 Daybreak** — Phases 19-24 (in progress)

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
<summary>⏸ v3.0 Performance & QA (Phases 14-18) — Phase 14 shipped; Phases 15-18 deferred</summary>

- [x] **Phase 14: QA observability foundations** — completed 2026-06-17
- [ ] **Phase 15: Core-journey QA harness** — DEFERRED (reserved)
- [ ] **Phase 16: Performance baseline (Measure)** — DEFERRED (reserved)
- [ ] **Phase 17: Performance optimization** — DEFERRED (reserved)
- [ ] **Phase 18: Field validation & guardrails** — DEFERRED (reserved)

Full details: [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)

</details>

## 🚧 v4.0 Daybreak (Phases 19-24)

**Milestone goal:** Replace LeoCards' utilitarian UI with the warm, cohesive "Daybreak" design system across every primary screen — friendly, mobile-first, anchored by Leo the lion.

- [x] **Phase 19: Daybreak Foundation + Onboarding & Auth** — Design system tokens + shared components + all auth/onboarding screens in Daybreak (completed 2026-06-20)
- [x] **Phase 20: Study Screen** — Study card and session result screen in Daybreak (completed 2026-06-21)
- [x] **Phase 21: Dashboard — "My Deck"** — Full dashboard experience in Daybreak (header, habitat hero, action line, word accordion) (completed 2026-06-21)
- [x] **Phase 22: Add a Card** — Type-a-word and from-an-image flows in Daybreak (completed 2026-06-22)
- [ ] **Phase 23: Browse Words** — Topic tiles and word-list screens in Daybreak
- [ ] **Phase 24: Habitat** — Living flat-geometric Habitat scene with ambient motion, all states, reduced-motion safety

## Phase Details (v4.0 Daybreak)

### Phase 19: Daybreak Foundation + Onboarding & Auth
**Goal**: The Daybreak design system is live app-wide and every auth/onboarding screen — Login, Signup, Forgot Password, Reset Password, First-Visit Welcome, and empty states — matches the hi-fi mocks; building on the spike already in the tree
**Depends on**: Nothing (first phase of v4.0; extends the validated design-system spike: globals.css, layout.tsx, src/components/daybreak/)
**Requirements**: DSY-01, DSY-02, DSY-03, ONB-01, ONB-02, ONB-03, ONB-04, ONB-05, ONB-06
**Success Criteria** (what must be TRUE):
  1. Daybreak tokens (cream/amber palette, Baloo 2 + Figtree fonts, type scale, spacing, radii, shadows) are applied app-wide; the Login screen matches the approved spike mock
  2. Shared Daybreak atoms (LionFace, TField, TBtn, pill/chip, card surface, GhostPeek) exist in src/components/daybreak/ and are reused across all auth screens
  3. Signup matches the Daybreak hi-fi including all states: default, per-field validation (red border + helper after submit, not toasts), email-already-exists, and submitting spinner
  4. Forgot Password shows the privacy-safe sent confirmation ("If an account exists…") and Reset Password handles the expired-link dead-end routing back to Forgot; both match the Daybreak hi-fi
  5. First-visit welcome completes all three steps (Meet Leo, the promise with animated mini-habitat, choose native + target languages via dropdowns), creates the first deck, and routes to Dashboard — including the creating/error states; empty-deck and no-search-results empty states match Daybreak
**Plans**: 5 plans (3 waves)
- [x] 19-01-PLAN.md — Daybreak primitives (TField/TBtn/Pill/Card) + usePrefersReducedMotion hook + token/font baseline (DSY-01/02/03)
- [x] 19-02-PLAN.md — Login refactor onto primitives + Signup restyle, language field removed, redirect to /welcome (ONB-01/02)
- [x] 19-03-PLAN.md — Forgot (privacy-safe) + Reset (expired-link dead-end) restyle + e2e spec (ONB-03/04)
- [x] 19-04-PLAN.md — /welcome 3-step flow, updateUser native-language persistence, 0-deck redirect, e2e harness (ONB-05)
- [x] 19-05-PLAN.md — Daybreak empty-deck + no-search-results states (ONB-06)
**UI hint**: yes

### Phase 20: Study Screen
**Goal**: The study card and session-result screen are fully redesigned to Daybreak, preserving the existing study engine and QA state badge
**Depends on**: Phase 19 (Daybreak atoms and tokens)
**Requirements**: STU-01, STU-02
**Success Criteria** (what must be TRUE):
  1. The study card matches the Daybreak hi-fi: big flashcard over a ghost-peek stack, "WHAT'S THE TRANSLATION?" prompt, tap-to-reveal, swipe left/right with green/red color feedback and the hint line; QA state badge (Phase 14) is still visible when QA-authed
  2. The session-result/end screen (cards studied, % correct, learned count, "Back to deck", and level-up celebration hand-off) matches the Daybreak visual language
**Plans**: 2 plans (2 waves)
- [x] 20-01-PLAN.md — Study card + count-aware ghost-peek stack reskinned to Daybreak (surface, ALL-CAPS prompt, amber Tap-to-reveal pill, green/red swipe feedback), interaction model + QA badge preserved (STU-01)
- [x] 20-02-PLAN.md — Session chrome + end screen (LionFace, Baloo 2 numerals, amber learned + TBtn) + level-up overlay (Soft-Clay Leo + recolored confetti, reduced-motion gate) (STU-02)
**UI hint**: yes

### Phase 21: Dashboard — "My Deck"
**Goal**: The full Dashboard experience — persistent header, habitat hero medallion, action line, and "Your words" accordion — is redesigned to Daybreak across all seven requirement states
**Depends on**: Phase 19 (Daybreak atoms and tokens)
**Requirements**: DSH-01, DSH-02, DSH-03, DSH-04, DSH-05, DSH-06, DSH-07
**Success Criteria** (what must be TRUE):
  1. The persistent header shows LionFace + "LeoCards" wordmark, a working deck picker (active-language chip, switch decks, inline create-deck picker with per-language creating/error states), and logout — matching the Daybreak hi-fi
  2. The habitat hero medallion shows Leo on a sunrise disc with a conic progress ring, level badge, "X of Y cards to Level N+1" (absent at max level), and links to the Habitat screen
  3. The action line renders "Start studying" (dimmed when nothing due) with a live-updating status row ("12 due" / "0 due" / "Resting · 2h 15m" countdown / "All paused") and "Add a card" alongside
  4. "Your words" expands inline (height/opacity transition, not a swipe gesture); word rows show native/translation/source tag/3-segment mastery meter/pause+edit actions; paused rows are de-emphasised; edit-card modal supports Save/Discard/Delete-with-confirmation; search shows no-results state
  5. Dashboard covers all required states in Daybreak: cards-due, none-due, resting, all-paused, empty deck, brand-new-user first-visit, and search-active-no-results

> **UAT carry-forward (from Phase 19 empty-deck UAT, 2026-06-20):** Two dashboard issues surfaced — both already covered by the criteria above; recording precise current-code targets for this phase:
> - **DSH-02 (habitat hero):** the dashboard still shows the legacy 80px `.webp` thumbnail (`src/components/habitat-widget.tsx` → `habitat-3d-widget-image.tsx`). Replace with the `HabitatHero`/`HabitatMedallion` from `design/handoff-daybreak/daybreak-dashboard.jsx` — LionFace on a sunrise disc + conic progress ring + level badge.
> - **DSH-03 (action line):** remove the "Browse words" link from the populated-deck action line (`src/components/deck-view.tsx` ~line 195). The Daybreak action line is Start studying + status + Add a card only; "Browse words" stays solely in the empty-deck state (`src/components/card-list.tsx`).

**Plans**: 5 plans (2 waves)
- [x] 21-01-PLAN.md — Foundation: @base-ui Popover wrapper + getLanguageBreakdown / "My Deck" heading removal (D-02)
- [x] 21-02-PLAN.md — Header TopBar + deck-picker popover with inline create + logout glyph (DSH-01, D-01)
- [x] 21-03-PLAN.md — HabitatMedallion + HabitatHero (conic ring, L9 gold + "Course 1 complete", cooldown nap) (DSH-02, D-05/D-06)
- [x] 21-04-PLAN.md — DeckView body: hero wiring + Option-D action line + 4-state status row, "Browse words" removed (DSH-03, L-05)
- [x] 21-05-PLAN.md — "Your words" accordion + Daybreak rows (native-on-top D-04) + edit-modal restyle (DSH-04/05/06)
**UI hint**: yes

### Phase 22: Add a Card
**Goal**: The Add a Card destination — both the type-a-word and from-an-image flows — is redesigned to Daybreak, preserving the existing translation and extraction pipelines
**Depends on**: Phase 19 (Daybreak atoms and tokens)
**Requirements**: ADC-01, ADC-02, ADC-03
**Success Criteria** (what must be TRUE):
  1. A single Add-a-Card destination with a segmented toggle ("Type a word | From an image"), a persistent context line (e.g. "EN → ES · saves to your Spanish deck"), and a working "My deck" escape link matches the Daybreak hi-fi
  2. Type-a-word shows linked native/target fields with auto-translate shimmer, handles all states (empty, translating, translate-fail, save-fail, saved "Card saved" banner + form clear), and Save remains locked until both fields are filled
  3. From-an-image completes the full six-step stepper (Pick, Confirm+deck, Extracting with calm long-wait progress and Cancel, Review words with keep/exclude list, Check translations with editable pairs, Result) across all outcome states (success, partial counts, all-failed); nothing saves until the explicit "Add N cards" commit
**Plans**: 4 plans (3 waves)
- [x] 22-01-PLAN.md — Daybreak Add-a-Card atoms (ACSeg/ACBtn/ACProgress/ACBanner/ACReviewRow/ACPairRow) + shared LangChip extraction (ADC-01/02/03 foundation)
- [x] 22-02-PLAN.md — Type-a-word: ACSeg toggle + ACContext/ACTop + translation-form restyle + page shell + e2e/04 retarget + D-07 label test (ADC-01/02)
- [x] 22-03-PLAN.md — From-an-image Pick/Confirm/Extracting: ACDrop + ACStepper + ACDeckSelect (D-02) + D-03 cancel guard + e2e/11 retarget (ADC-01/03)
- [x] 22-04-PLAN.md — From-an-image Review/Translate/Check/Result: ACReviewRow + ACPairRow (D-01) + Result states + e2e/11 review-tail retarget (ADC-03)
**UI hint**: yes

### Phase 23: Browse Words
**Goal**: The Browse Words experience — topic-tiles landing and per-topic word list with CEFR filtering — is redesigned to Daybreak with optimistic add/remove
**Depends on**: Phase 19 (Daybreak atoms and tokens)
**Requirements**: BRW-01, BRW-02, BRW-03, BRW-04
**Success Criteria** (what must be TRUE):
  1. The topic-tiles landing shows all 14 category tiles with a geometric amber icon on a medallion and word count, matching the Daybreak hi-fi
  2. The per-topic word list shows back-to-topics navigation, topic header, a CEFR level-filter tile row (All / A1 / A2 / B1), and the language context line
  3. Word rows match the Daybreak "Row A" spec: English primary / target beneath with language marker, CEFR level chip, trailing circular toggle (outlined + to add, filled amber check when in deck); in-deck rows get a warm tint; add/remove is optimistic and instant with row-local error recovery that never loses scroll position
  4. Browse covers all states in Daybreak: full list (All), level-filtered, and empty result ("No words at this level" + "Show all levels")
**Plans**: 4 plans (3 waves)
- [x] 23-01-PLAN.md — BWMedallion: 14 CSS-art amber topic icons + medallion (D-08) + Wave 0 component-test scaffold (BRW-01)
- [x] 23-02-PLAN.md — D-03 Browse-words entry link on the Add-a-Card header (ACTop browsePath, type-mode only) + tests (BRW-01)
- [x] 23-03-PLAN.md — Browse two-screen IA + re-skin: ?topic= page branch + BrowseTiles/BrowseList, optimistic machine preserved, D-04 back-link, D-09 empty state (BRW-01/02/03/04)
- [ ] 23-04-PLAN.md — L-06 e2e retarget: addWordsFromBrowser two-screen fix + e2e/03/09/10 structural selectors + green batch (BRW-01/02/03/04)
**UI hint**: yes

### Phase 24: Habitat
**Goal**: The Habitat screen is a living flat-geometric scene in Daybreak — level-by-level cumulative composition, mood-driven Leo, ambient motion that is light on mobile and pauses under prefers-reduced-motion — covering all required states
**Depends on**: Phase 19 (Daybreak atoms and tokens), Phase 21 (Dashboard links to Habitat)
**Requirements**: HAB-01, HAB-02, HAB-03, HAB-04, HAB-05
**Success Criteria** (what must be TRUE):
  1. The habitat scene renders the correct cumulative set of flat-geometric elements for the current level (L1 bare mound through L9 songbirds + golden-hour) using the Daybreak PAL palette; Leo's seated expression reflects the current mood
  2. Mood is expressed three independent ways: Leo's expression, ambient light tint, and a mood chip label (Excited / Happy / Neutral / Sad) — visibly different across moods at the same level
  3. The bottom progress card shows "Level N · <name>", a progress bar, and the named next unlock ("Next at L6: mushrooms"); at L9 it reads "Course 1 complete"
  4. Ambient motion (Leo breathing, water shimmer, cloud drift, butterfly float, sun glow) plays on desktop; on mobile it is visibly lighter (reduced or absent); under prefers-reduced-motion the scene is fully static and a "Motion paused" label appears
  5. All required states render correctly in Daybreak: new-user L1, mid L5, lush L9, level-up confetti celebration (~2.5s then settles), decaying/sad (desaturated + "Leo misses you"), offline (cached banner, scene still shown), error (friendly + Try again), and reduced-motion static
**Plans**: TBD
**UI hint**: yes

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 MVP | 1-8 | 25/25 | Complete | 2026-04-15 |
| v2.0 Image-to-Flashcards | 9-11 | 10/10 | Complete | 2026-05-20 |
| v2.1 Living Habitat | 12-13.2 | 14/14 | Complete | 2026-05-29 |
| v3.0 Performance & QA | 14-18 | 3/TBD | Partial (Phase 14 done; 15-18 deferred) | — |
| v4.0 Daybreak | 19-24 | 0/TBD | In progress | — |

### v4.0 Daybreak

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 19. Daybreak Foundation + Onboarding & Auth | 5/5 | Complete   | 2026-06-20 |
| 20. Study Screen | 2/2 | Complete    | 2026-06-21 |
| 21. Dashboard — "My Deck" | 5/5 | Complete    | 2026-06-22 |
| 22. Add a Card | 4/4 | Complete    | 2026-06-22 |
| 23. Browse Words | 3/4 | In Progress|  |
| 24. Habitat | 0/TBD | Not started | - |

## Backlog

### Carried tech debt from v2.0

- `10-HUMAN-UAT.md` — offline vision eval reference-dataset (needs real photos + FR/ES tutor).
- `11-HUMAN-UAT.md` — live 6-step browser walkthrough (needs real DeepL + billing-enabled Anthropic keys).
- `gsd-sdk phase.complete` upstream bug — ROADMAP-fallback scan could mispick backlog `999.x` headings (`phase.cjs` ~1292–1306); trigger removed locally (999.1 absorbed into v3.0); worth an upstream report.
