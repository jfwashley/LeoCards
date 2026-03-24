# TioCards

## What This Is

TioCards is a language learning flashcard website where progress is tied to the wellbeing of a baby tiger and his habitat. The more words a user masters, the richer and more vibrant the tiger's environment becomes — unlocking new toys, trees, play areas, and eventually other animals. It's designed for learners of French, Spanish, and English who want a reason to come back every day beyond raw willpower.

## Core Value

The tiger must feel alive — users should feel genuine motivation to open the app and learn because something real (and cute) is counting on them.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Users can create accounts and their progress is saved across devices
- [ ] Users can study French, Spanish, or English with pre-made word lists
- [ ] Users can manually add words to any language deck (auto-translated, editable)
- [ ] Users can browse built-in word lists and select cards to add to their deck
- [ ] Flashcard practice uses classic show-and-self-grade mechanic
- [ ] A card is considered "learned" after 3–4 successful self-graded recalls
- [ ] All learned cards across all languages feed into one shared tiger habitat
- [ ] The habitat improves gradually as cards are learned (grass, environment quality)
- [ ] Milestone unlocks trigger special moments at key card-count thresholds
- [ ] The tiger and habitat visually reflect neglect — hard decay if inactive
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
| One shared habitat across all languages | Rewards breadth of learning, simpler emotional narrative | — Pending |
| Hard decay on inactivity | Creates real stakes and daily motivation | — Pending |
| Show & self-grade flashcard mechanic | Lowest friction, classic and proven | — Pending |
| 3–4 correct recalls = "learned" | Spaced-repetition-lite without full SRS complexity | — Pending |

---
*Last updated: 2026-03-24 after Phase 2 completion — deck/card CRUD, word list browser, manual card entry with DeepL translation all shipped*
