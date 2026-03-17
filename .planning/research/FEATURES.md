# Features Research: TioCards

**Domain:** Language learning flashcard web app with gamification (virtual tiger habitat)
**Date:** 2026-03-17

---

## Table Stakes

Features users expect in any flashcard / language learning app. Missing these causes immediate abandonment.

| Feature | Complexity | Notes |
|---------|------------|-------|
| User accounts + persistent progress | Medium | Email signup, progress saved across devices |
| Show / reveal / self-grade flashcard loop | Low | Core mechanic — flip card, mark correct/incorrect |
| Completable sessions with progress indicator | Low | Defined session end (e.g. 10 cards) beats infinite queue |
| Pre-made word lists (A1–B1) per language | Medium | French, Spanish, English — curated common vocabulary |
| Custom card CRUD | Medium | Add, edit, delete cards in personal deck |
| Responsive web layout | Low | Must work on desktop and mobile browser |
| Visual progress feedback | Low | Users need to see how many cards they've learned |

---

## Differentiators

Features that make TioCards distinct and worth recommending.

| Feature | Complexity | Notes |
|---------|------------|-------|
| Living tiger habitat | High | Nothing like this in the market — Duolingo's owl is a mascot, not a habitat |
| Habitat decay with grace period | Medium | Emotional stakes without punishment — unique in the space |
| Milestone unlocks at non-linear thresholds | Medium | Variable reward pattern — more motivating than linear XP |
| Cross-language → single habitat | Low | Unique design decision; rewards breadth of learning |
| Tiger mood state (Tamagotchi effect) | Medium | Visual emotional feedback that drives daily return habit |
| Gradual + milestone habitat evolution | High | Two-tier progression: ambient improvement + surprise moments |
| New animals joining as milestone rewards | Medium | Visual-only, no mechanics — collectibles that show mastery |
| Auto-translate manual card entry | Medium | User types in native language, gets target translation + can edit |

---

## Anti-Features

Things deliberately NOT in TioCards, with reasoning.

| Feature | Why Excluded |
|---------|-------------|
| Full SM-2 spaced repetition | Over-engineering for casual learners; 3–4 recall rule is right call |
| Streaks as primary mechanic | Anxiety-inducing; habitat decay does the same motivational job better |
| Leaderboards / leagues | Contradicts single-player emotional tone; doesn't serve the tiger narrative |
| Animal abilities / bonuses | Game-balance trap; visual-only animals is the correct decision |
| Audio / pronunciation in v1 | Massive scope increase; nothing to validate until core loop works |
| Multiple habitats per language | Dilutes emotional attachment; one tiger, one home |
| Social / shareable habitats | Out of v1 scope; could fragment attention from core loop |

---

## Gamification Patterns (Evidence-Based)

| Pattern | Mechanism | Application in TioCards |
|---------|-----------|------------------------|
| Tamagotchi effect | Virtual care → daily return habit | Tiger's mood and habitat condition depend on regular learning |
| Variable reward | Non-linear milestones more motivating than linear XP | Surprise milestone unlocks at 10, 25, 50, 100+ cards |
| Loss aversion (moderate) | Mild decay feels worse than equivalent gain feels good | Hard decay with grace period threads the needle |
| Session completeness / Zeigarnik | Short completable sessions beat infinite queues | Session = fixed card count with clear end state |
| Visual progress > numerical XP | Habitat evolution IS the progress visualization | No XP bar needed — the tiger's world IS the progress bar |

---

## Feature Dependencies

```
User accounts → Progress persistence → Habitat state
Flashcard loop → Card mastery tracking → Habitat progression
Pre-made word lists → Card selection UI
Auto-translate API → Manual card entry
Habitat rendering → Tiger mood states → Animal milestone unlocks
```

---

## MVP Scope (P1 — v1 Required)

1. User auth (email signup/login)
2. Language deck management (French, Spanish, English)
3. Pre-made word list browser + add to deck
4. Manual card entry with auto-translate + edit
5. Flashcard practice session (show/reveal/self-grade)
6. Card mastery tracking (3–4 correct = learned)
7. Habitat state model (XP → habitat level)
8. Tiger visual with mood states
9. Habitat rendering with gradual improvement
10. Milestone unlock system + new animal appearances
11. Habitat decay on inactivity (with grace period)

---

*Research complete: 2026-03-17*
