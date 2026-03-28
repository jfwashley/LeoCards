# TioCards

## What This Is

TioCards is a language learning flashcard website where progress is tied to the wellbeing of a baby tiger and his habitat. The more words a user masters, the richer and more vibrant the tiger's environment becomes — unlocking new toys, trees, play areas, and eventually other animals. It's designed for learners of French, Spanish, and English who want a reason to come back every day beyond raw willpower.

## Core Value

The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.

## Requirements

### Validated

- [x] Users can create accounts and their progress is saved across devices — Validated in Phase 1: Foundation
- [x] Users can study French, Spanish, or English with pre-made word lists — Validated in Phase 2: Deck and Card Management
- [x] Users can manually add words to any language deck (auto-translated, editable) — Validated in Phase 2: Deck and Card Management
- [x] Users can browse built-in word lists and select cards to add to their deck — Validated in Phase 2: Deck and Card Management
- [x] Flashcard practice uses classic show-and-self-grade mechanic — Validated in Phase 3: Study Engine and Study UI
- [x] A card is considered "learned" after 3–4 successful self-graded recalls — Validated in Phase 3: Study Engine and Study UI (evolved to 3-round spaced mastery with directional tracking)
- [x] All learned cards across all languages feed into one shared tiger habitat — Validated in Phase 4: Habitat Engine (cross-deck learned card count via JOIN, shared habitat state)
- [x] The habitat improves gradually as cards are learned (grass, environment quality) — Validated in Phase 4: Habitat Engine (10-level system with quality-weighted effective card count)
- [x] The tiger and habitat visually reflect neglect — hard decay if inactive — Validated in Phase 4: Habitat Engine (2-day grace, 5%/day linear decay, 10% floor, mood classification)

### Active

- [ ] Milestone unlocks trigger special moments at key card-count thresholds
- [ ] New animals appear in the habitat as visual rewards for major milestones
- [ ] Visual style is cute 2D illustrated

### Out of Scope

- Multiple habitats per language — one tiger, one habitat shared across all languages
- Gamified animal abilities (animals are visual rewards only, no functional bonuses)
- Social features / shareable habitats — single-player only for v1
- Pronunciation features — audio/speech not in v1
- Mobile app — web only for v1

## Context

- The name "TioCards" blends "tío" (Spanish for uncle/dude) with flashcards — casual, friendly tone
- The tiger is the emotional anchor of the product; his happiness is the primary motivator
- Hard decay (habitat degrades with inactivity) creates stakes without being punishing if implemented with a grace period
- Pre-made word lists for French, Spanish, English should include common vocabulary (A1–B1 range)
- Auto-translation on manual card entry should be powered by a translation API; user can override before saving

## Constraints

- **Tech stack**: Not yet decided — will be informed by research
- **Languages**: French, Spanish, English (pre-made lists); user-added cards via auto-translate
- **Scope**: Web-first, single-player, v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| One shared habitat across all languages | Rewards breadth of learning, simpler emotional narrative | Shipped (Phase 4) |
| Hard decay on inactivity | Creates real stakes and daily motivation | Shipped (Phase 4) |
| Show & self-grade flashcard mechanic | Lowest friction, classic and proven | Shipped (Phase 3) |
| 3-round spaced mastery with directional tracking | Evolved from simple 3-4 recalls to 3-round system with 12h/24h cooldowns and bidirectional testing | Shipped (Phase 3) |

---
*Last updated: 2026-03-28 after Phase 4 completion — habitat engine with compute-on-read architecture, 2-day grace + 5%/day decay, 10-level system, mood classification, and GET /api/habitat endpoint all shipped*
