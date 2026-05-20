# LeoCards

## What This Is

LeoCards is a language learning flashcard website where progress is tied to the wellbeing of a baby tiger and his habitat. The more words a user masters, the richer and more vibrant the tiger's environment becomes — unlocking new toys, trees, play areas, and eventually other animals. It's designed for learners of French, Spanish, and English who want a reason to come back every day beyond raw willpower.

## Core Value

The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.

## Current State

**Version:** v2.0 Image-to-Flashcards — shipped 2026-05-20
**Live at:** https://leocards.vercel.app
**Tech stack:** Next.js 16, Better Auth, Drizzle ORM, Neon Postgres, PixiJS 8.x, Motion 12, DeepL, Vercel AI SDK v6 + `@ai-sdk/anthropic` v3 (Claude vision), Vitest, Biome
**Tests:** 1773 unit tests green
**Requirements satisfied:** 23 (v1.0) + 15 (v2.0) = 38 across 11 phases (35 plans)

**v2.0 highlights:** Image-to-flashcards pipeline end-to-end — pick → validate → preview → Claude vision extract → review & edit → DeepL translate → batched commit to deck. Protected `/api/extract` endpoint (auth-gated, rate-limited, magic-byte verified, PII-safe). All 32 STRIDE threats accounted for across 3 SECURITY.md artifacts. 20 code-review findings fixed.

## Next Milestone Goals

The next milestone is **TBD** — promote candidates from the backlog via `/gsd-review-backlog` or start fresh with `/gsd-new-milestone`. Strong candidates already captured:

- **Production art pass** — replace placeholder tiger/habitat sprites with the cute 2D illustrated visual style (deferred since v1.0).
- **Perf initiative (Phase 999.1 in backlog)** — measure → optimize navigation latency to <~100ms perceived in a production build.

## Validated Requirements (shipped)

### v1.0 MVP (shipped 2026-04-15)
- ✓ Users can create accounts and progress is saved across devices
- ✓ Users can study French, Spanish, or English with pre-made word lists
- ✓ Users can manually add words to any language deck (auto-translated, editable)
- ✓ Users can browse built-in word lists and select cards to add to their deck
- ✓ Flashcard practice uses classic show-and-self-grade mechanic
- ✓ A card is "learned" after 3 successful self-graded recalls (3-round spaced mastery with directional tracking)
- ✓ All learned cards across all languages feed into one shared tiger habitat
- ✓ Habitat improves gradually as cards are learned (10-level system)
- ✓ Tiger and habitat reflect neglect — hard decay if inactive (2-day grace, 5%/day)
- ✓ Milestone unlocks trigger special moments at key card-count thresholds
- ✓ New animals appear in the habitat as visual rewards for major milestones
- ✓ Users can manage decks for French, Spanish, and English independently

### v2.0 Image-to-Flashcards (shipped 2026-05-20)
- ✓ Users can pick a JPG/PNG/WebP image (≤5MB) from the add-card flow with preview and pre-selected target deck
- ✓ Claude vision extracts vocabulary words from the image via the protected `/api/extract` endpoint (auth + rate-limit + payload validation + secure failure paths)
- ✓ Users review, edit, and toggle off extracted words before any card is added; duplicates already in the deck are flagged or skipped
- ✓ Kept words are auto-translated via the existing DeepL pipeline (translation editable) and committed in a batched no-tx insert with per-row failure tolerance
- ✓ Cancel paths write nothing; success summary shows the count added

## Active Requirements (deferred)

- [ ] Visual style is cute 2D illustrated (currently placeholder sprites)

## Out of Scope

- Multiple habitats per language — one tiger, one habitat shared across all languages
- Gamified animal abilities (animals are visual rewards only)
- Social features / shareable habitats — single-player only
- Pronunciation features — audio/speech not in scope
- Mobile app — web only
- Multi-image batch upload (deferred — IMG-F1)
- Live camera capture (deferred — IMG-F2)
- Per-word source-language tagging for mixed-language images (deferred — EXT-F1)
- OCR handwriting accuracy SLA (best-effort only)
- Bulk image-to-deck without a review step (UX decision)
- Storing/retaining uploaded images after extraction (privacy + scope)

## Context

- The name "LeoCards" combines "Leo" (lion/tiger) with flashcards — casual, friendly tone
- The tiger is the emotional anchor of the product; his happiness is the primary motivator
- Hard decay (habitat degrades with inactivity) creates stakes without being punishing with a 2-day grace period
- Pre-made word lists cover A1-B1 French, Spanish, English common vocabulary (14 categories)
- Auto-translation powered by DeepL API; user can override before saving
- Claude vision powers image-to-flashcards extraction; words flow into the same DeepL-translate + edit pipeline as manual entries

## Constraints

- **Tech stack**: Next.js 16, Better Auth, Drizzle + Neon, PixiJS 8.x, Vercel AI SDK v6 + `@ai-sdk/anthropic` v3, Biome, Vitest
- **Languages**: French, Spanish, English (pre-made lists and image extraction)
- **Scope**: Web-first, single-player
- **Database**: Neon HTTP driver — no transaction support (sequential writes only, per-row failure tolerance in batched commits)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| One shared habitat across all languages | Rewards breadth of learning, simpler emotional narrative | ✓ Shipped v1.0 |
| Hard decay on inactivity | Creates real stakes and daily motivation | ✓ Shipped v1.0 |
| Show & self-grade flashcard mechanic | Lowest friction, classic and proven | ✓ Shipped v1.0 |
| 3-round spaced mastery with directional tracking | Evolved from simple 3-4 recalls to 3-round system with 12h/24h cooldowns | ✓ Shipped v1.0 |
| Compute-on-read habitat state | No stored computed columns, no cron jobs — derive from DB facts at request time | ✓ Shipped v1.0 |
| PixiJS 8.x for habitat rendering | WebGL canvas with SSR-safe dynamic loading, ticker visibility control | ✓ Shipped v1.0 |
| In-memory rate limiting | Appropriate for current single-server deployment; Redis not needed yet | ✓ Shipped v1.0, reused v2.0 |
| Better Auth additionalFields for custom user columns | nativeLanguage persisted at signup without separate onboarding flow | ✓ Shipped v1.0 |
| Vercel AI SDK v6 + `@ai-sdk/anthropic` for vision | Streamed, typed, dependency-pinned, framework-aligned | ✓ Shipped v2.0 |
| Mandatory review & edit step before image-to-deck commit | Keeps user control over noise / mis-extractions | ✓ Shipped v2.0 |
| Batched commit with per-row failure tolerance on Neon HTTP no-tx | Preserves successful inserts when one row fails; mirrors v1.0 sequential-write constraint | ✓ Shipped v2.0 |

## Known Tech Debt

- Study session writes are sequential, not atomic (Neon HTTP driver constraint — applies project-wide)
- esbuild vulnerability in drizzle-kit deferred (requires breaking downgrade)
- Placeholder sprite assets (tiger, habitat layers, bird) — not production art
- Nyquist validation bookkeeping incomplete on Phases 9/10/11 (Wave-0 tests are green; `nyquist_compliant: false` flag-flip pending — candidate for `/gsd-validate-phase`)
- `10-HUMAN-UAT.md`, `11-HUMAN-UAT.md` — intentional deferrals blocked on external resources (real photos + FR/ES tutor; real DeepL + billing-enabled Anthropic keys)
- Untracked `e2e/11-phase9-image-upload.spec.ts` — Playwright spec, keep/delete decision outstanding
- `gsd-sdk phase.complete` upstream bug mispicks backlog 999.1 as next_phase

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-20 — v2.0 Image-to-Flashcards shipped*
