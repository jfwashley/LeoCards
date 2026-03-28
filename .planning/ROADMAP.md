# Roadmap: TioCards

## Overview

TioCards ships in six phases, each delivering a coherent, verifiable capability. The sequence is dependency-ordered: authenticated users exist before they own cards, cards exist before they can be studied, study results exist before a habitat can reflect them, habitat logic is correct before it is rendered, and the rendered scene is stable before milestone moments are layered on top. Every phase ends with something a user can observe and interact with — not an internal milestone.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffold, auth, and typed DB schema — the bedrock every other phase builds on (completed 2026-03-23)
- [x] **Phase 2: Deck and Card Management** - Full card CRUD for three languages, pre-made word list browser, and auto-translate review flow (completed 2026-03-24)
- [x] **Phase 3: Study Engine and Study UI** - Core flashcard loop with mastery tracking, session commit, and anti-inflation guards (completed 2026-03-27)
- [x] **Phase 4: Habitat Engine** - Pure-function habitat state computation: decay, mood, level, and the `/api/habitat` route (completed 2026-03-28)
- [x] **Phase 5: Habitat UI** - PixiJS tiger scene rendering the engine's output — tiger sprites, background layers, mood transitions (completed 2026-03-28)
- [x] **Phase 6: Milestone System and Dashboard Polish** - Unlock moments, animal appearances, and per-language card count breakdown (completed 2026-03-28)

## Phase Details

### Phase 1: Foundation
**Goal**: A working, deployable project where users can create accounts, log in, and have their identity persisted — the prerequisite for every other feature.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can create an account with email and password and land on their dashboard
  2. User can close the browser and return to find themselves still logging in
  3. User can log out from any page and be redirected to the login screen
  4. User who has forgotten their password can receive a reset link by email and set a new one
**Plans**: 6 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold: Next.js 16, TypeScript strict, Tailwind 4, Biome, shadcn/ui, Drizzle + Neon, full DB schema (all 6 phases), Vitest, CI pipeline, env validation
- [x] 01-02-PLAN.md — Auth backend: Better Auth server with Drizzle adapter, Resend email transport, auth API route, Next.js 16 proxy route protection
- [x] 01-03-PLAN.md — Auth UI: login, signup, forgot-password, reset-password pages with shadcn forms, dashboard stub with logout, human-verify checkpoint
- [x] 01-04-PLAN.md — Gap closure: wire orphaned env.ts into app module graph, add RESEND_API_KEY to CI env block
- [x] 01-05-PLAN.md — Gap closure: fix login Suspense boundary (build blocker), TypeScript errors, Biome lint/format violations, LF line endings
- [ ] 01-06-PLAN.md — Gap closure: fix CI pipeline step ordering and missing DEEPL_API_KEY, update .env.example

### Phase 2: Deck and Card Management
**Goal**: Users can populate their decks — browsing pre-made word lists, manually entering words with auto-translation, and managing their saved cards.
**Depends on**: Phase 1
**Requirements**: DECK-01, DECK-02, DECK-03, DECK-04, DECK-05, DECK-06
**Success Criteria** (what must be TRUE):
  1. User can browse a pre-made word list for a chosen language and add individual words to their deck
  2. User can type a word, receive an auto-translated result, review and edit it, then save the card
  3. User can open any saved card and edit its translation
  4. User can delete a card from their deck
  5. User sees separate decks for French, Spanish, and English with independent card counts
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Schema migration (remove unique constraint, add name/nativeLanguage columns), DeepL translation proxy route, word list JSON data (6 language pairs, 14 categories), dependency installation
- [x] 02-02-PLAN.md — Server Actions (createDeck, saveCard, editCard, deleteCard, addWordToCard, removeWordFromDeck) and read queries (getUserDecks, getDeckCards, getDeckCardWords)
- [x] 02-03-PLAN.md — Dashboard UI: app header with deck switcher, first-visit language picker, card list with search, card edit/delete dialog with confirmation
- [x] 02-04-PLAN.md — Word list browser page with category/CEFR filter and +/- toggle, manual card entry page with bidirectional debounced DeepL translation

### Phase 3: Study Engine and Study UI
**Goal**: Users can run a flashcard study session, see their mastery grow, and have the server reliably record which cards they have learned.
**Depends on**: Phase 2
**Requirements**: STUDY-01, STUDY-02, STUDY-03, STUDY-04, STUDY-05, STUDY-06
**Success Criteria** (what must be TRUE):
  1. User can start a study session for a language and see a card; each session includes a session progress indicator
  2. User can reveal a card's translation and mark it correct or still learning; grade buttons appear with a delay after reveal (no reflex taps)
  3. A card marked correct 3 or more times across sessions is recorded as learned and contributes to habitat progression
  4. Approximately 10% of cards in each session are already-learned cards resurfaced to prevent forgetting; a failed resurface resets the card's recall count
  5. At session end, all grades are committed to the server in a single batch — partial sessions do not corrupt card state
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Schema migration (direction, masteryRound, cooldownUntil columns) + study engine pure functions with TDD (session assembly, mastery rounds, resurface interleaving, cooldown timer)
- [x] 03-02-PLAN.md — Session commit route (POST /api/study/complete) with transactional writes + study queries (getStudyCards)
- [x] 03-03-PLAN.md — Full-screen study UI: Motion 12 3D card flip, swipe-to-grade, card stack visual, session state machine, end screen, deck-view Study button with countdown, card-list mastery dots

### Phase 4: Habitat Engine
**Goal**: The server can compute the full habitat state from raw DB facts at request time — no derived state stored, no cron jobs, correct decay and mood output available via API.
**Depends on**: Phase 3
**Requirements**: HAB-01, HAB-06
**Success Criteria** (what must be TRUE):
  1. A user who has just completed a study session can fetch `/api/habitat` and receive a habitat state that reflects their total learned card count across all languages
  2. A user who has been inactive for more than 2 days sees a decayed habitat state (habitat quality reduced linearly from day 3 onward); a user inactive for fewer than 2 days sees no decay
  3. The habitat state response includes a computed tiger mood (happy, neutral, sad) and the current visual level — both derived purely from DB facts with no stored computed columns
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Habitat engine pure functions with TDD: computeQuality (2-day grace, 5%/day linear decay, 10% floor), habitatLevel (10 thresholds), classifyMood (excited/happy/neutral/sad), computeHabitatState orchestrator; Vitest unit tests
- [x] 04-02-PLAN.md — Habitat data fetcher (cross-deck learned card count via JOIN) + GET /api/habitat Route Handler (auth, fetch facts, compute state, return JSON)

### Phase 5: Habitat UI
**Goal**: Users can see their tiger and his habitat rendered and animated in the browser — mood state visible, habitat background matching progression level, scene performance acceptable on mid-range devices.
**Depends on**: Phase 4
**Requirements**: HAB-02, HAB-03
**Success Criteria** (what must be TRUE):
  1. User sees a rendered tiger sprite whose visible mood (idle/happy/sad) matches what the engine computed for their activity level
  2. The habitat background and environment layers visually change as the user's total learned card count crosses level thresholds — a user with 50 learned cards sees a richer environment than a user with 5
  3. The PixiJS scene loads without a server-side rendering crash; the tiger animation runs at a consistent frame rate on mid-range devices and pauses when the browser tab is hidden
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — PixiJS + @pixi/react install, placeholder sprite atlases, SSR-safe canvas wrapper (next/dynamic ssr:false), /habitat page shell, ticker visibility controller
- [x] 05-02-PLAN.md — Tiger sprite (mood textures, random position/facing, bounce/crossfade transitions), habitat layers (additive by level, decay alpha, parallax), sparkle particles, utility functions with TDD
- [x] 05-03-PLAN.md — Mini dashboard habitat widget (PixiJS canvas + progress bar), error/offline/level-up states, dashboard integration, human-verify checkpoint

### Phase 6: Milestone System and Dashboard Polish
**Goal**: Reaching key card-count thresholds triggers a memorable unlock moment in the habitat, new animals appear as collectibles, and the dashboard clearly shows how each language contributes to the shared habitat.
**Depends on**: Phase 5
**Requirements**: HAB-04, HAB-05, HAB-07
**Success Criteria** (what must be TRUE):
  1. When a user's total learned card count crosses a milestone threshold (e.g., 10, 25, 50, 100), a special unlock animation plays in the habitat scene exactly once — a page refresh does not replay it
  2. At selected milestones, a new animal sprite appears in the habitat scene and remains visible in all subsequent sessions
  3. The dashboard shows a per-language count of learned cards (e.g., French: 23, Spanish: 10, English: 4) so users can see how each language contributes to the shared habitat
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Milestone queries (markMilestonesSeen, getLanguageBreakdown) with TDD + study/complete API extension for level-up detection
- [x] 06-02-PLAN.md — Level-up celebration overlay (confetti + level display), bird sprite at level 10, study-session and habitat-canvas integration
- [x] 06-03-PLAN.md — Dashboard language breakdown: per-language learned card query wired to DeckView text display

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/6 | In Progress | - |
| 2. Deck and Card Management | 4/4 | Complete   | 2026-03-24 |
| 3. Study Engine and Study UI | 3/3 | Complete   | 2026-03-27 |
| 4. Habitat Engine | 2/2 | Complete   | 2026-03-28 |
| 5. Habitat UI | 3/3 | Complete   | 2026-03-28 |
| 6. Milestone System and Dashboard Polish | 3/3 | Complete   | 2026-03-28 |
