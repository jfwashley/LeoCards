# Project Research Summary

**Project:** TioCards
**Domain:** Language learning flashcard web app with gamification (virtual tiger habitat)
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

TioCards is a language-learning flashcard app distinguished from competitors by a living virtual tiger habitat that grows with vocabulary mastery. Unlike Duolingo's surface-level mascot, TioCards makes the habitat the progress visualization — the tiger's world IS the XP bar. Research confirms this is a well-scoped v1: the core study loop (show/reveal/self-grade with recall tracking), deck management with auto-translate, and habitat progression can be built with a small, highly composable stack. The recommended approach is Next.js 15 App Router + Neon Postgres + Drizzle ORM + Better Auth + PixiJS, deployed to Vercel — a stack with zero vendor lock-in risk and excellent free-tier coverage for a product at launch scale.

The architectural key insight from research is to never store derived state. Habitat level, decay factor, and pending milestones are all computed at request time from raw facts in the DB (`last_activity_at`, `recall_count`, `milestones_seen`). This eliminates cron jobs, scheduled updates, and stale-data bugs entirely. The study session follows the same principle: all card grades accumulate client-side and commit in a single batch POST at session end, avoiding per-card API waterfalls.

The two highest-risk areas are motivational design and performance. Decay mechanics that feel punitive (no grace period, large instant degradation) will kill daily return rates faster than any technical bug. PixiJS habitat animations that drop frames on mid-range mobile destroy the emotional impact that makes TioCards distinctive. Both risks have clear preventions: a 2-day grace period + linear 5%/day decay for the first; sprite atlases + `ssr: false` dynamic import + paused ticker when tab is hidden for the second. Address these constraints at the phase they first appear, not as afterthoughts.

---

## Key Findings

### Recommended Stack

The stack is fully settled with high confidence across all libraries. Next.js 15 with App Router provides the ideal server/client boundary for the auth + translation proxy pattern — no custom Express server needed. Drizzle ORM over Postgres (via Neon serverless) gives type-safe schema with minimal runtime overhead; Prisma is explicitly excluded as too heavy for App Router. Better Auth replaces the deprecated NextAuth v4 and avoids Clerk's vendor lock-in.

For the habitat, PixiJS 8.x is the correct choice — hardware-accelerated 2D canvas with sprite management, far lighter than Three.js and far more capable than raw Canvas API. Motion 11.x handles React-layer animations (card flip, milestone reveals) that live outside the PixiJS canvas. TypeScript strict mode with branded types (`UserId`, `CardId`, `DeckId`, `HabitatLevel`) is required from day one.

**Core technologies:**
- Next.js 15 + React 19: App Router, server components, Route Handlers for auth/API proxy
- TypeScript 5 (strict): Branded types for domain primitives; `noUncheckedIndexedAccess` enforced
- Neon Postgres + Drizzle 0.38+: Serverless Postgres, type-safe schema, no magic runtime
- Better Auth 1.x: App Router-compatible auth, session-based, self-contained
- PixiJS 8.x: Hardware-accelerated 2D canvas for tiger habitat; SSR-disabled via `next/dynamic`
- Motion 11.x: React-layer animations (card flip, unlock reveals, tiger mood transitions)
- DeepL API (free tier): Best translation quality for French/Spanish/English; proxied server-side
- Tailwind CSS 4.x: Zero-runtime utility CSS; no style conflicts with canvas element
- Biome: Single lint + format tool replacing ESLint + Prettier
- Vitest: Unit tests for pure engine functions; Python Playwright for E2E flows
- Vercel: CD with Neon integration and preview URLs per PR

**Explicitly excluded:** Prisma, NextAuth v4, Clerk, Supabase, Three.js, Firebase, barrel imports, ESLint + Prettier combo, generic system fonts.

### Expected Features

**Must have (table stakes):**
- User accounts with persistent progress (email signup/login via Better Auth)
- Show / reveal / self-grade flashcard loop — the core mechanic
- Completable sessions with clear end state (fixed card count, progress indicator)
- Pre-made word lists (A1–B1) for French, Spanish, English
- Custom card CRUD (add, edit, delete) with auto-translate + user confirmation step
- Responsive web layout (desktop and mobile browser)
- Visual progress feedback — in TioCards this IS the habitat

**Should have (differentiators that define TioCards):**
- Living tiger habitat with gradual visual improvement tied to learned card count
- Tiger mood states (Tamagotchi effect) — drives daily return habit
- Habitat decay with 2-day grace period — emotional stakes without punishment
- Milestone unlocks at non-linear thresholds (10, 25, 50, 100+ cards) — variable reward pattern
- New animals appearing as visual collectibles at milestone events
- Cross-language contribution to single shared habitat
- Per-language card count breakdown on dashboard (transparency for shared habitat)

**Defer to v2+:**
- Audio / pronunciation
- Social / shareable habitats
- Full SM-2 spaced repetition (current 3-recall rule is intentionally simpler)
- Leaderboards or leagues
- Multiple habitats
- Animal abilities or bonuses (visual-only is the correct v1 decision)

### Architecture Approach

The architecture is a clear three-layer system: browser-side UI components (HabitatScene in PixiJS, FlashcardUI with client-local session state, DeckManager), a Next.js App Router middle layer with pure-function server modules (`lib/study-engine`, `lib/habitat-engine`) and Route Handlers for auth/translate/session-commit, and external services (Neon, DeepL, Vercel Edge sessions). The defining pattern throughout is "compute on read, store only raw facts." The DB schema stores `recall_count`, `last_activity_at`, and `milestones_seen` — nothing computed. Every derived value (habitat level, decay, pending milestones, tiger mood) runs at request time as a pure function call.

**Major components:**
1. `lib/study-engine` — pure functions: card mastery (recall ≥ 3), session card selection, occasional learned-card resurfacing (10% of session)
2. `lib/habitat-engine` — pure functions: decay formula, visual level from card count, pending milestone computation, tiger mood state
3. `HabitatScene` (PixiJS, SSR-disabled) — sprite rendering, background layers, tiger animations, milestone reveal sequences
4. `FlashcardUI` — client-local session state via `useReducer`; single batch POST to `/api/study/complete` at session end
5. `DeckManager` — card CRUD; calls `/api/translate` (server proxy) and shows result for user confirmation before save
6. `app/api/` Route Handlers — auth, translate proxy, session commit, habitat fetch, milestone acknowledgment

### Critical Pitfalls

1. **Decay that punishes instead of motivates** — Enforce a 2-day grace period and linear 5%/day rate. Show "tiger missed you" messaging on return. Never make recovery feel impossible within one session. Address in Habitat Engine phase.

2. **Habitat animation performance on mobile** — PixiJS must load via `next/dynamic` with `{ ssr: false }` (non-negotiable to prevent hydration crash). Use sprite atlases. Pause the PixiJS ticker when `document.visibilityState` is hidden. Set 60fps budget on mid-range Android as acceptance criterion. Address in Habitat UI phase.

3. **Auto-translation errors poisoning decks** — DeepL result must always be shown for review before saving — never auto-saved. Edit field pre-populated with DeepL suggestion. Card edit UI must allow translation correction after save. Address in Deck Management phase.

4. **Self-grade inflation** — 300ms delay after card reveal before grade buttons appear (prevents reflex taps). Clear visual separation between "Got it" / "Still learning". Server validates recall counts at session commit — client cannot send inflated values. Address in Study UI phase.

5. **Vocabulary graveyard** — Cards marked `is_learned` must not disappear entirely. Reserve ~10% of each session for random learned-card resurface. If missed on resurface, reset `recall_count` to 1. This is SRS-lite without SM-2 complexity. Address in Study Engine phase.

---

## Implications for Roadmap

Based on architecture dependency order and pitfall phase mappings, the natural build sequence is:

### Phase 1: Foundation — Auth, DB, and Project Scaffold
**Rationale:** Everything else depends on authenticated users and a typed DB schema. No feature can be built without this. Establishing Biome, TypeScript strict settings, and branded types here prevents category of bugs throughout all later phases.
**Delivers:** Working signup/login, Drizzle schema for all tables, project structure enforced, CI pipeline running.
**Addresses:** User accounts + persistent progress (table stakes), environment variable security (DeepL key never in client).
**Avoids:** API key leakage (DEEPL_API_KEY server-only pattern established before translation route exists).

### Phase 2: Deck and Card Management
**Rationale:** Users need cards before studying. The pre-made word list browser and manual card entry (with translation proxy) form the content layer that the study loop consumes. This phase also validates the DeepL proxy pattern.
**Delivers:** Deck CRUD per language, pre-made word list browser, manual card entry with auto-translate review step, card edit UI.
**Addresses:** Custom card CRUD, pre-made word lists, auto-translate feature.
**Avoids:** Auto-translation errors poisoning decks — review-before-save UX enforced here.

### Phase 3: Study Engine (Pure Functions) + Study UI
**Rationale:** The flashcard loop is the product's core value. Study Engine is pure functions — testable independently before UI exists. Study UI depends on the engine's card selection and mastery logic. Both must be correct before habitat progression can have meaning.
**Delivers:** Card mastery tracking (recall ≥ 3), session card selection, learned-card resurfacing (10%), batch session commit, flashcard flip UI with Motion animations, grade buttons with delay.
**Addresses:** Flashcard practice session, card mastery tracking, session completeness.
**Avoids:** Self-grade inflation (300ms delay, server-side validation), vocabulary graveyard (10% resurface logic built from day one).

### Phase 4: Habitat Engine (Pure Functions)
**Rationale:** Habitat state computation is pure functions over DB facts. It can be built and unit-tested before the PixiJS visual layer exists. Getting the decay formula, milestone detection, and tiger mood logic right before rendering prevents backtracking when the visual layer is added.
**Delivers:** `computeHabitatState()`, `applyDecay()`, milestone detection, tiger mood classification, `GET /api/habitat` route.
**Addresses:** Habitat state model, decay mechanic, milestone unlock thresholds.
**Avoids:** Decay that punishes (grace period and linear rate enforced as named constants), storing derived state in DB.

### Phase 5: Habitat UI — Tiger and Living Scene
**Rationale:** With engine logic solid, the visual layer can be built against a stable API. PixiJS complexity is isolated here. Performance budget established at phase start.
**Delivers:** HabitatScene with PixiJS (SSR-disabled), tiger sprites (idle/happy/sad/sleep), background layers with level-appropriate visual state, tiger mood transitions via Motion.
**Addresses:** Tiger visual with mood states, habitat rendering with gradual improvement.
**Avoids:** Habitat animation performance pitfall — sprite atlases, ticker pause on hidden, 60fps mobile budget are acceptance criteria for this phase.

### Phase 6: Milestone System and Dashboard Polish
**Rationale:** Milestone reveals require the habitat scene to exist (phase 5) and the habitat engine to compute them (phase 4). The dashboard language breakdown (pitfall 7 prevention) fits here as the final layer of transparency.
**Delivers:** Milestone unlock animations, new animal appearances, one-time milestone acknowledgment, per-language card count breakdown on dashboard.
**Addresses:** Milestone unlock system, animal appearances, language contribution transparency.
**Avoids:** Gamification overshadowing learning (milestone reveals at session end only, never mid-card), language inequality opacity (breakdown visible on dashboard).

### Phase Ordering Rationale

- Auth before everything: no feature is meaningful without user identity and persistent state.
- Deck before study: you cannot study cards that don't exist; word list browser validates DB patterns.
- Study Engine as pure functions before Study UI: pure functions are testable in isolation, and the UI depends on correct engine output.
- Habitat Engine before Habitat UI: same pattern — logic correctness verified before visual complexity is added.
- Milestones last: they depend on both the engine (for computation) and the scene (for reveal animations); this is a natural capstone.

### Research Flags

Phases likely needing additional research during planning:
- **Phase 5 (Habitat UI):** PixiJS 8.x sprite atlas format and texture packer tooling may need specific version research; animation performance profiling on mobile needs hands-on discovery. Recommend `/gsd:research-phase` before starting.
- **Phase 6 (Milestones):** Exact animation sequencing for milestone reveal (trigger timing, acknowledgment handshake, "exactly once" guarantee across page refreshes) has edge cases worth researching specifically.

Phases with standard, well-documented patterns (can skip research-phase):
- **Phase 1 (Foundation):** Next.js 15 + Better Auth + Drizzle + Neon is a well-documented combination with official guides.
- **Phase 2 (Deck/Card):** Standard CRUD with react-hook-form + Zod; DeepL proxy is a single Route Handler.
- **Phase 3 (Study):** Pure function engine + client-local `useReducer` + batch commit is a standard pattern.
- **Phase 4 (Habitat Engine):** Pure function computation over DB timestamps; decay formula is specified completely in research.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified: Next.js 15, Drizzle 0.38+, Better Auth 1.x, PixiJS 8.x, Motion 11.x, Vitest, Biome — stable, current releases |
| Features | HIGH | Feature set is well-defined; anti-features are explicitly reasoned; MVP scope is clearly bounded |
| Architecture | HIGH | Patterns (compute-on-read, client-local session state, batch commit, SSR-disabled canvas) are specific and validated by multiple skill lenses |
| Pitfalls | HIGH | 7 distinct pitfalls identified with concrete prevention strategies; phase mappings are explicit |

**Overall confidence:** HIGH

### Gaps to Address

- **Exact milestone thresholds:** Research mentions 10, 25, 50, 100+ as examples but the full milestone schedule (how many total, what unlocks at each) is a product design decision not resolved in research. Define during requirements.
- **Pre-made word list source:** Research specifies A1–B1 French/Spanish/English lists as a feature but does not identify the data source (e.g., a specific frequency wordlist, a licensed dataset). Needs a decision before Phase 2.
- **Sprite assets:** Research defines the asset structure (tiger/idle/happy/sad/sleep, habitat layers, animal sprites) but the actual art production or licensing is out of scope for research. Must be in hand before Phase 5.
- **PixiJS sprite atlas toolchain:** TexturePacker or equivalent — format specifics for PixiJS 8.x need validation at Phase 5 start.
- **Recovery session flow:** Research specifies "show quick recovery path (5-card session)" after absence but the exact UX is not designed. Resolve during Phase 4 planning.

---

## Sources

### Primary (HIGH confidence)
- STACK.md (2026-03-17) — full stack recommendation with rationale; react-best-practices, typescript-expert, senior-architect, senior-backend, senior-devops, senior-qa, webapp-testing skills applied
- FEATURES.md (2026-03-17) — table stakes, differentiators, anti-features, gamification pattern research, MVP scope
- ARCHITECTURE.md (2026-03-17) — system diagram, component responsibilities, data model, key patterns, build order
- PITFALLS.md (2026-03-17) — 7 pitfalls with prevention strategies and phase mappings; all 11 skills applied

### Secondary (MEDIUM confidence)
- Gamification pattern research (FEATURES.md) — Tamagotchi effect, variable reward, loss aversion, Zeigarnik effect applied to TioCards context; established behavioral psychology but TioCards-specific application is inferred

### Tertiary (LOW confidence)
- Specific PixiJS 8.x sprite atlas format — tooling details not fully verified; validate at Phase 5 start
- Pre-made word list data sources — not identified in research; requires a separate sourcing decision

---

*Research completed: 2026-03-17*
*Ready for roadmap: yes*
