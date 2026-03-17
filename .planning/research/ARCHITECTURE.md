# Architecture Research: TioCards

**Domain:** Language learning flashcard web app with gamification (virtual tiger habitat)
**Date:** 2026-03-17
**Skills applied:** senior-architect, senior-backend, react-best-practices, typescript-expert

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│  │ HabitatScene │  │ FlashcardUI   │  │ DeckManager UI       │  │
│  │ (PixiJS)     │  │ (Motion anim) │  │ (react-hook-form)    │  │
│  └──────┬───────┘  └──────┬────────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                       │
          ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App Router (Server Components + Route Handlers)         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Auth Service     │  │ Study Engine     │  │ Habitat Engine│  │
│  │ (Better Auth)    │  │ (recall tracking)│  │ (state compute│  │
│  └──────────────────┘  └──────────────────┘  └───────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Neon Postgres│  │ DeepL API    │  │ Vercel Edge  │
│ (via Drizzle)│  │ (translation)│  │ (sessions)   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Component Responsibilities

### Frontend Components

| Component | Responsibility | Key Constraint |
|-----------|---------------|----------------|
| `HabitatScene` | Render PixiJS canvas — tiger sprites, background layers, animals | SSR-disabled via `next/dynamic`; loaded only client-side |
| `FlashcardUI` | Show card front/back, capture self-grade, manage session state | Session state is client-side until session ends |
| `DeckManager` | Browse word lists, add/remove cards, manual entry with auto-translate | Calls `/api/translate` for auto-translation |

### Server Modules (Pure Functions — `lib/`)

| Module | Responsibility | Rule |
|--------|---------------|------|
| `study-engine` | Determine if a card is learned (recall count ≥ 3), filter cards for session | Pure functions only — no DB calls inside |
| `habitat-engine` | Compute habitat visual level, decay factor, pending milestones from DB state | Compute on read — never persist computed state |

### API Route Handlers (`app/api/`)

| Route | Purpose |
|-------|---------|
| `POST /api/auth/*` | Better Auth handler (login, signup, session) |
| `POST /api/translate` | DeepL proxy — server-side only, key never exposed to client |
| `POST /api/study/complete` | Commit completed session — batch update card recall counts |
| `GET /api/habitat` | Return habitat state (computed fresh each request) |

---

## Key Architectural Patterns

### Pattern 1: Compute Habitat State on Read (Never Store It)

Storing computed/derived state in the DB creates stale data bugs. Instead:

**Store only raw facts:**
```ts
// DB schema — raw facts only
users: { id, email, last_activity_at, created_at }
cards: { id, user_id, deck_id, word, translation, recall_count, last_recalled_at }
milestones_seen: { user_id, milestone_key, seen_at }
```

**Compute everything at request time:**
```ts
// lib/habitat-engine/index.ts
export function computeHabitatState(
  learnedCardCount: number,
  lastActivityAt: Date,
  milestonesSeen: string[],
  now = new Date()
): HabitatState {
  const decayedCount = applyDecay(learnedCardCount, lastActivityAt, now)
  const visualLevel = Math.floor(decayedCount / CARDS_PER_LEVEL)
  const newMilestones = MILESTONES
    .filter(m => decayedCount >= m.threshold && !milestonesSeen.includes(m.key))
  return { decayedCount, visualLevel, newMilestones, tigerMood: getTigerMood(decayedCount, lastActivityAt) }
}
```

**Why:** Decay math runs in real-time — the habitat reflects actual current state without needing cron jobs or scheduled updates.

### Pattern 2: Study Session State Lives Client-Side Until Commit

Never call the API for each card flip. This would cause waterfalls (react-best-practices: CRITICAL anti-pattern).

```ts
// ✅ Correct — batch all session events, one POST at end
// Client maintains local session state
const [session, dispatch] = useReducer(sessionReducer, initialSession)

// On session end — single batch commit
async function commitSession(results: CardResult[]) {
  await fetch('/api/study/complete', {
    method: 'POST',
    body: JSON.stringify({ results })
  })
}

// ❌ Wrong — per-card API call (waterfall)
async function onCardGrade(cardId: CardId, correct: boolean) {
  await fetch(`/api/cards/${cardId}/recall`, { method: 'POST' }) // DON'T do this
}
```

### Pattern 3: Milestone Events as Derived Log with Client Acknowledgment

Milestones are computed from the habitat state. The `milestones_seen` table ensures each reveal plays exactly once.

```ts
// On habitat load — compute new milestones
const { newMilestones } = computeHabitatState(...)

// Client renders milestone reveals
// User sees animation, then client acknowledges
async function acknowledgeMilestone(key: string) {
  await fetch('/api/habitat/milestone-seen', {
    method: 'POST',
    body: JSON.stringify({ key })
  })
}
```

### Pattern 4: Parallel Data Fetching on Dashboard Load

From react-best-practices — use `Promise.all` for independent server queries:

```ts
// app/(app)/dashboard/page.tsx — server component
export default async function DashboardPage() {
  const session = await getSession()

  // ✅ Parallel — not sequential
  const [user, decks, habitatRawData] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, session.userId) }),
    db.query.decks.findMany({ where: eq(decks.userId, session.userId) }),
    getHabitatRawData(session.userId)
  ])

  const habitatState = computeHabitatState(
    habitatRawData.learnedCount,
    habitatRawData.lastActivityAt,
    habitatRawData.milestonesSeen
  )

  return <Dashboard user={user} decks={decks} habitatState={habitatState} />
}
```

---

## Data Model

```ts
// Drizzle schema — simplified
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  last_activity_at: timestamp('last_activity_at').defaultNow(),
  created_at: timestamp('created_at').defaultNow()
})

export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id),
  language: varchar('language', { length: 10 }).notNull(), // 'fr' | 'es' | 'en'
  created_at: timestamp('created_at').defaultNow()
})

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  deck_id: uuid('deck_id').references(() => decks.id),
  word: varchar('word', { length: 500 }).notNull(),
  translation: varchar('translation', { length: 500 }).notNull(),
  recall_count: integer('recall_count').default(0),
  last_recalled_at: timestamp('last_recalled_at'),
  is_learned: boolean('is_learned').default(false), // true when recall_count >= 3
  created_at: timestamp('created_at').defaultNow()
})

export const milestones_seen = pgTable('milestones_seen', {
  user_id: uuid('user_id').references(() => users.id),
  milestone_key: varchar('milestone_key', { length: 100 }).notNull(),
  seen_at: timestamp('seen_at').defaultNow()
})
```

---

## Decay Formula

```ts
// lib/habitat-engine/decay.ts
const GRACE_PERIOD_DAYS = 2   // No decay for first 2 days of inactivity
const DECAY_RATE = 0.05       // 5% of learned cards per day after grace period

export function applyDecay(
  learnedCount: number,
  lastActivityAt: Date,
  now: Date
): number {
  const daysSinceActivity = (now.getTime() - lastActivityAt.getTime()) / 86_400_000
  if (daysSinceActivity <= GRACE_PERIOD_DAYS) return learnedCount

  const decayDays = daysSinceActivity - GRACE_PERIOD_DAYS
  const decayFactor = Math.max(0, 1 - (DECAY_RATE * decayDays))
  return Math.floor(learnedCount * decayFactor)
}
```

---

## Build Order

Dependencies between components determine build order:

```
1. Auth + DB Schema          → Users, sessions, Drizzle schema
2. Deck + Card CRUD          → Deck creation, card management, word list browser
3. Study Engine              → Card mastery tracking (pure functions)
4. Study UI                  → Flashcard session (client-state, batch commit)
5. Habitat Engine            → State computation, decay, milestones (pure functions)
6. Habitat UI (PixiJS)       → Tiger sprite rendering, background layers
7. Milestone System          → Unlock animations, new animal appearances
8. Translation API proxy     → /api/translate route + manual card entry flow
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Correct Approach |
|-------------|-------------|-----------------|
| Store decayed card count in DB | Goes stale immediately; requires scheduled jobs | Compute on read from `last_activity_at` |
| API call per card grade | Sequential waterfall; poor UX during study | Batch all grades, single POST on session end |
| Milestones as DB table rows | Complex queries, race conditions | Compute from learned count, store only `milestones_seen` |
| "is_learned" logic spread across files | Inconsistent mastery definition | Single source of truth in `lib/study-engine` |
| PixiJS imported without `ssr: false` | Hydration crash on server | Always use `next/dynamic` with `{ ssr: false }` |

---

*Architecture research complete: 2026-03-17*
