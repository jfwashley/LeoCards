# Roadmap: TioCards

## Overview

TioCards ships in six phases, each delivering a coherent, verifiable capability. The sequence is dependency-ordered: authenticated users exist before they own cards, cards exist before they can be studied, study results exist before a habitat can reflect them, habitat logic is correct before it is rendered, and the rendered scene is stable before milestone moments are layered on top. Every phase ends with something a user can observe and interact with — not an internal milestone.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffold, auth, and typed DB schema — the bedrock every other phase builds on
- [ ] **Phase 2: Deck and Card Management** - Full card CRUD for three languages, pre-made word list browser, and auto-translate review flow
- [ ] **Phase 3: Study Engine and Study UI** - Core flashcard loop with mastery tracking, session commit, and anti-inflation guards
- [ ] **Phase 4: Habitat Engine** - Pure-function habitat state computation: decay, mood, level, and the `/api/habitat` route
- [ ] **Phase 5: Habitat UI** - PixiJS tiger scene rendering the engine's output — tiger sprites, background layers, mood transitions
- [ ] **Phase 6: Milestone System and Dashboard Polish** - Unlock moments, animal appearances, and per-language card count breakdown

## Phase Details

### Phase 1: Foundation
**Goal**: A working, deployable project where users can create accounts, log in, and have their identity persisted — the prerequisite for every other feature.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can create an account with email and password and land on their dashboard
  2. User can close the browser and return to find themselves still logged in
  3. User can log out from any page and be redirected to the login screen
  4. User who has forgotten their password can receive a reset link by email and set a new one
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold: Next.js 16, TypeScript strict, Tailwind 4, Biome, shadcn/ui, Drizzle + Neon, full DB schema (all 6 phases), Vitest, CI pipeline, env validation
- [x] 01-02-PLAN.md — Auth backend: Better Auth server with Drizzle adapter, Resend email transport, auth API route, Next.js 16 proxy route protection
- [ ] 01-03-PLAN.md — Auth UI: login, signup, forgot-password, reset-password pages with shadcn forms, dashboard stub with logout, human-verify checkpoint

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
**Plans**: TBD

Plans:
- [ ] 02-01: DeepL translation proxy — `/api/translate` Route Handler, server-side key, never exposed to client; pre-made word list data ingestion
- [ ] 02-02: Deck and card data layer — CRUD API routes, Drizzle queries, Zod validation, per-language deck isolation
- [ ] 02-03: Deck management UI — word list browser, manual card entry with translate-preview-confirm flow, card edit and delete

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
**Plans**: TBD

Plans:
- [ ] 03-01: Study engine — pure functions: card selection, mastery threshold (recall >= 3), 10% resurface logic, session card list assembly; Vitest unit tests
- [ ] 03-02: Session commit route — `/api/study/complete` batch POST, server-side recall count validation, learned card persistence
- [ ] 03-03: Study UI — `useReducer` client-local session state, card flip animation (Motion), grade buttons with 300ms delay, progress indicator, session end screen

### Phase 4: Habitat Engine
**Goal**: The server can compute the full habitat state from raw DB facts at request time — no derived state stored, no cron jobs, correct decay and mood output available via API.
**Depends on**: Phase 3
**Requirements**: HAB-01, HAB-06
**Success Criteria** (what must be TRUE):
  1. A user who has just completed a study session can fetch `/api/habitat` and receive a habitat state that reflects their total learned card count across all languages
  2. A user who has been inactive for more than 2 days sees a decayed habitat state (habitat quality reduced linearly from day 3 onward); a user inactive for fewer than 2 days sees no decay
  3. The habitat state response includes a computed tiger mood (happy, neutral, sad) and the current visual level — both derived purely from DB facts with no stored computed columns
**Plans**: TBD

Plans:
- [ ] 04-01: Habitat engine — pure functions: `computeHabitatState()`, `applyDecay()` (2-day grace, linear 5%/day), tiger mood classification, visual level from card count; Vitest unit tests
- [ ] 04-02: Habitat API route — `GET /api/habitat`, reads `last_activity_at` and learned card counts, calls engine, returns typed habitat state; no writes to computed columns

### Phase 5: Habitat UI
**Goal**: Users can see their tiger and his habitat rendered and animated in the browser — mood state visible, habitat background matching progression level, scene performance acceptable on mid-range devices.
**Depends on**: Phase 4
**Requirements**: HAB-02, HAB-03
**Success Criteria** (what must be TRUE):
  1. User sees a rendered tiger sprite whose visible mood (idle/happy/sad) matches what the engine computed for their activity level
  2. The habitat background and environment layers visually change as the user's total learned card count crosses level thresholds — a user with 50 learned cards sees a richer environment than a user with 5
  3. The PixiJS scene loads without a server-side rendering crash; the tiger animation runs at a consistent frame rate on mid-range devices and pauses when the browser tab is hidden
**Plans**: TBD

Plans:
- [ ] 05-01: PixiJS setup — `next/dynamic` with `{ ssr: false }`, sprite atlas preparation, ticker pause on `visibilitychange`, 60fps mobile budget as acceptance criterion
- [ ] 05-02: Tiger sprite layer — idle/happy/sad/sleep animations from atlas, mood transition triggered by habitat state prop
- [ ] 05-03: Habitat background layers — level-gated environment sprites, smooth layer crossfade between levels, wired to `/api/habitat` response

### Phase 6: Milestone System and Dashboard Polish
**Goal**: Reaching key card-count thresholds triggers a memorable unlock moment in the habitat, new animals appear as collectibles, and the dashboard clearly shows how each language contributes to the shared habitat.
**Depends on**: Phase 5
**Requirements**: HAB-04, HAB-05, HAB-07
**Success Criteria** (what must be TRUE):
  1. When a user's total learned card count crosses a milestone threshold (e.g., 10, 25, 50, 100), a special unlock animation plays in the habitat scene exactly once — a page refresh does not replay it
  2. At selected milestones, a new animal sprite appears in the habitat scene and remains visible in all subsequent sessions
  3. The dashboard shows a per-language count of learned cards (e.g., French: 23, Spanish: 10, English: 4) so users can see how each language contributes to the shared habitat
**Plans**: TBD

Plans:
- [ ] 06-01: Milestone detection and acknowledgment — `computePendingMilestones()` in habitat engine, `milestones_seen` DB column, `POST /api/milestone/acknowledge` to mark seen; exactly-once guarantee tested
- [ ] 06-02: Milestone reveal UI — unlock animation sequence in PixiJS scene (Motion for React-layer overlay), animal sprite appearance, triggered at session end only
- [ ] 06-03: Dashboard language breakdown — per-language learned card query, breakdown display component on dashboard

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/3 | In Progress|  |
| 2. Deck and Card Management | 0/3 | Not started | - |
| 3. Study Engine and Study UI | 0/3 | Not started | - |
| 4. Habitat Engine | 0/2 | Not started | - |
| 5. Habitat UI | 0/3 | Not started | - |
| 6. Milestone System and Dashboard Polish | 0/3 | Not started | - |
