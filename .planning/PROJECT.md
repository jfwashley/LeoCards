# LeoCards

## What This Is

LeoCards is a language learning flashcard website where progress is tied to the wellbeing of a baby tiger and his habitat. The more words a user masters, the richer and more vibrant the tiger's environment becomes — unlocking new toys, trees, play areas, and eventually other animals. It's designed for learners of French, Spanish, and English who want a reason to come back every day beyond raw willpower.

## Core Value

The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.

## Current State

**Version:** v1.0 MVP — shipped 2026-04-15
**Live at:** https://leocards.vercel.app
**Tech stack:** Next.js 16, Better Auth, Drizzle ORM, Neon Postgres, PixiJS 8.x, Motion 12, DeepL, Vitest, Biome
**Codebase:** 8,568 LOC TypeScript/TSX, 221 files, 171 commits

All 23 v1 requirements satisfied across 8 phases (25 plans).

## Requirements

### Validated

- ✓ Users can create accounts and their progress is saved across devices — v1.0
- ✓ Users can study French, Spanish, or English with pre-made word lists — v1.0
- ✓ Users can manually add words to any language deck (auto-translated, editable) — v1.0
- ✓ Users can browse built-in word lists and select cards to add to their deck — v1.0
- ✓ Flashcard practice uses classic show-and-self-grade mechanic — v1.0
- ✓ A card is considered "learned" after 3 successful self-graded recalls (3-round spaced mastery with directional tracking) — v1.0
- ✓ All learned cards across all languages feed into one shared tiger habitat — v1.0
- ✓ The habitat improves gradually as cards are learned (10-level system) — v1.0
- ✓ The tiger and habitat visually reflect neglect — hard decay if inactive (2-day grace, 5%/day) — v1.0
- ✓ Milestone unlocks trigger special moments at key card-count thresholds — v1.0
- ✓ New animals appear in the habitat as visual rewards for major milestones — v1.0
- ✓ Users can manage decks for French, Spanish, and English independently — v1.0

### Active

- [ ] Visual style is cute 2D illustrated (currently placeholder sprites)

### Out of Scope

- Multiple habitats per language — one tiger, one habitat shared across all languages
- Gamified animal abilities (animals are visual rewards only, no functional bonuses)
- Social features / shareable habitats — single-player only for v1
- Pronunciation features — audio/speech not in v1
- Mobile app — web only for v1

## Context

- The name "LeoCards" combines "Leo" (lion/tiger) with flashcards — casual, friendly tone
- The tiger is the emotional anchor of the product; his happiness is the primary motivator
- Hard decay (habitat degrades with inactivity) creates stakes without being punishing with a 2-day grace period
- Pre-made word lists cover A1-B1 French, Spanish, English common vocabulary (14 categories)
- Auto-translation powered by DeepL API; user can override before saving

## Constraints

- **Tech stack**: Next.js 16, Better Auth, Drizzle + Neon, PixiJS 8.x, Biome, Vitest
- **Languages**: French, Spanish, English (pre-made lists); user-added cards via auto-translate
- **Scope**: Web-first, single-player, v1
- **Database**: Neon HTTP driver — no transaction support (sequential writes only)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| One shared habitat across all languages | Rewards breadth of learning, simpler emotional narrative | ✓ Shipped v1.0 |
| Hard decay on inactivity | Creates real stakes and daily motivation | ✓ Shipped v1.0 |
| Show & self-grade flashcard mechanic | Lowest friction, classic and proven | ✓ Shipped v1.0 |
| 3-round spaced mastery with directional tracking | Evolved from simple 3-4 recalls to 3-round system with 12h/24h cooldowns | ✓ Shipped v1.0 |
| Compute-on-read habitat state | No stored computed columns, no cron jobs — derive from DB facts at request time | ✓ Shipped v1.0 |
| PixiJS 8.x for habitat rendering | WebGL canvas with SSR-safe dynamic loading, ticker visibility control | ✓ Shipped v1.0 |
| In-memory rate limiting | Appropriate for single-server v1 deployment; Redis not needed yet | ✓ Shipped v1.0 |
| Better Auth additionalFields for custom user columns | nativeLanguage persisted at signup without separate onboarding flow | ✓ Shipped v1.0 |

## Known Tech Debt

- Study session writes are sequential, not atomic (Neon HTTP driver constraint)
- esbuild vulnerability in drizzle-kit deferred (requires breaking downgrade)
- Placeholder sprite assets (tiger, habitat layers, bird) — not production art
- Nyquist validation incomplete across most phases

---
*Last updated: 2026-04-15 after v1.0 milestone*
