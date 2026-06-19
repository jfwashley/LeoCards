# Phase 14: QA Observability Foundations - Research

**Researched:** 2026-06-12
**Domain:** Next.js 16 App Router, RSC/client boundaries, HMAC cookies, Playwright prod-parity gating
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**QA-mode activation (QAOB-01 gating)**
- D-01: No per-feature toggle. State codes render whenever the browser is QA-authed — a valid signed QA cookie is present. Entering the secret on `/debug` establishes QA mode; from then on every card shows its code automatically. Customers without the cookie never see them.
- D-02: Same `DEBUG_CHEAT_SECRET` gates everything — one QA key unlocks all QA affordances (habitat cheat, state codes, state table). No second secret. Feature is OFF entirely when the env var is unset.
- D-08: Single value: `STUDY_COOLDOWN_MINUTES=15` applies to every round that has a cooldown (rounds 0→1 and 1→2). No per-round list.
- D-09: Precedence: when set, `STUDY_COOLDOWN_MINUTES` wins over everything — overrides `STUDY_NO_COOLDOWN=true` AND the dev (NODE_ENV) auto-zero. When unset, current behavior is unchanged.
- D-10: Honored wherever set — no code-level prod block. Control comes from Vercel env scoping (set on Preview, never on Production).
- D-04: State badge is a small monospace corner badge pinned top-right of the card, semi-transparent overlay — no layout shift.
- D-05: Surfaces: study session cards AND deck browse/card list rows.
- D-06: Cooldown segment ticks LIVE so QA can watch a short cooldown expire in real time. Client timer code must itself be QA-gated.

### Claude's Discretion
- D-03: Exact cookie mechanism for "QA-authed" persistent cookie independent of habitat override.
- D-07: Exact state code format — roadmap example `R2·t2n·cd:14m` is the reference.
- `/debug` per-card state table (QAOB-03) — layout, card scope (active deck vs all), refresh behavior, endpoint shape.
- Prod-parity gating test (QAOB-04) — test framework/harness choice, which routes get DOM-scanned, how QA endpoint unreachability is asserted.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QAOB-01 | QA can see per-card state codes in the UI — compact marker on each card (e.g. `R2·t2n·cd:14m`) showing mastery round, next direction, cooldown remaining, learned/paused flags — rendered only when QA mode is active; completely absent from customer experience | Cookie-gated prop pass from RSC to dedicated client badge component; live countdown reuses `CountdownTimer` pattern from `deck-view.tsx` |
| QAOB-02 | QA can set short non-zero cooldowns via env (`STUDY_COOLDOWN_MINUTES=15`) so 12h/24h round transitions are testable within 10–60 min window | Single env var added to `src/env.ts`; resolution in `complete/route.ts` before `COOLDOWN_CONFIG` is built; `STUDY_COOLDOWN_MINUTES` wins over `STUDY_NO_COOLDOWN` when set |
| QAOB-03 | QA can read a live per-card state table on `/debug` (card id, word, round, direction, cooldownUntil, pausedAt, learned) sourced from real data | Extend `GET /api/debug/state` to include `cards` array; `/debug` page fetches and renders it in a new table section |
| QAOB-04 | A gating test proves QA affordances are absent when secrets/env are unset (prod-parity check: no state codes in DOM, no QA endpoints reachable) | Playwright spec in `e2e/` using a real dev server with env vars stripped; DOM scan for badge selector; HTTP status assertions on `/api/debug/*` |
</phase_requirements>

---

## Summary

Phase 14 extends the Phase 13.2 QA cheat console infrastructure with four incremental additions: a QA-mode persistent cookie (extending the HMAC pattern in `debug-cheat.ts`), per-card state badges on study and browse surfaces, a `STUDY_COOLDOWN_MINUTES` env override with highest-precedence logic, a `/debug` per-card state table, and a Playwright prod-parity gating test.

Every change is additive to existing patterns. The study-engine and database schema are untouched. The QA cookie mechanism (D-03) is the only decision requiring a new signed cookie; everything else is either a prop pass from RSC server code that already reads SRS data, or a small extension of an existing API route. The prod-parity gating test (QAOB-04) runs Playwright against a dev server with the two secrets deliberately unset, asserting badge absence and 404 responses from debug endpoints.

The architecture is two clear layers: (1) server-side gating — RSC pages and route handlers check the signed QA cookie or the env secret before exposing any QA data; and (2) client components — a `QaStateBadge` client component renders the badge and live countdown timer, and the `/debug` page renders the per-card table.

**Primary recommendation:** Model the QA-auth persistent cookie exactly on the existing `leo-habitat-cheat` cookie — same HMAC sign/verify helpers from `debug-cheat.ts`, a new cookie name `leo-qa-mode`, set on secret entry in `/api/debug/cheat` response, cleared when the user explicitly resets. RSC pages check the new cookie alongside the cheat cookie; a single new `readQaAuth()` helper in `debug-cheat.ts` encapsulates the server-side gate check.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| QA-mode gate check (cookie verify) | API / Backend (Route Handler + RSC) | — | HMAC verify must be server-side; client cannot access `DEBUG_CHEAT_SECRET` |
| QA cookie issuance | API / Backend (`/api/debug/cheat` POST) | — | Cookie `.set()` only allowed in Route Handlers in Next.js 16 |
| State code computation (format string) | Browser / Client (`QaStateBadge`) | — | Countdown ticking requires `useEffect`; formatting is trivial once data is passed as props |
| SRS data fetch for badge (round, cooldownUntil, etc.) | API / Backend (RSC page) | — | Data already fetched at RSC level; pass as props through client component boundary |
| `/debug` per-card table | Browser / Client (existing `/debug` page is `"use client"`) | API / Backend (`/api/debug/state` extension) | `/debug` page already makes fetch calls; extend the endpoint and add table section |
| `STUDY_COOLDOWN_MINUTES` resolution | API / Backend (`complete/route.ts`) | — | Cooldown config is built server-side before calling `computeCardUpdate` |
| Prod-parity gating test | Browser / Client (Playwright e2e) | — | Must prove DOM is clean and endpoints unreachable from the browser's perspective |

---

## Standard Stack

No new libraries. This phase uses only what is already in the project.

### Core (existing, already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next/headers` (cookies) | Next.js 16.2.1 | Server-side cookie read in RSC and Route Handlers | Project's existing pattern (`debug-cheat.ts`, `readHabitatOverride`) |
| `node:crypto` (createHmac, timingSafeEqual) | Node built-in | HMAC-SHA256 sign/verify for new QA cookie | Exact same pattern as existing `debug-cheat.ts` |
| `@t3-oss/env-nextjs` (t3-env) | existing | Schema-validate new `STUDY_COOLDOWN_MINUTES` env var | `src/env.ts` pattern already established |
| `vitest` | ^4.1.1 | Unit tests for new utility functions | Project standard |
| `playwright` | ^1.58.2 | Prod-parity gating e2e test | Project's e2e test framework |

### No Package Legitimacy Audit Required

This phase installs zero new packages. All dependencies are already in `node_modules`.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (QA user)
  │
  │  1. Enter secret on /debug → POST /api/debug/cheat
  │     → server sets: leo-habitat-cheat + leo-qa-mode (both HMAC-signed)
  │
  ▼
RSC pages (dashboard page.tsx, study page.tsx, deck/browse page.tsx)
  │  2. Read + verify leo-qa-mode cookie via readQaAuth()
  │     qaMode=true → pass SRS fields as props to client components
  │     qaMode=false → omit QA props entirely (no extra payload)
  │
  ▼
Client components (StudyCard, CardList rows)
  │  3. QaStateBadge renders if qaCardData prop present
  │     Live countdown: useEffect interval (≤1 min tick) when cooldownUntil is set
  │     No QaStateBadge import / no timer when prop is absent
  │
  ▼
/debug page (client, existing)
  │  4. Calls GET /api/debug/state?secret=... (extended)
  │     Response now includes: { real, forced, cards: [{id, word, masteryRound, ...}] }
  │     Renders new per-card table below the existing "Live REAL state" section
  │
  ▼
Playwright gating test (QAOB-04)
     5. Starts dev server with DEBUG_CHEAT_SECRET unset, STUDY_COOLDOWN_MINUTES unset
        Signs in as test user
        Navigates to dashboard, study, deck browse
        Asserts: no element matching [data-qa-badge] in DOM
        Asserts: GET /api/debug/state returns 404
        Asserts: POST /api/debug/cheat returns 404
```

### Recommended Project Structure

Additions only — no directory restructuring:

```
src/
├── lib/
│   └── debug-cheat.ts          # extend: add readQaAuth(), QA_MODE_COOKIE constant
├── components/
│   └── qa-state-badge.tsx      # NEW: "use client", QA badge + live countdown
├── app/
│   ├── (protected)/
│   │   ├── study/page.tsx      # extend: readQaAuth() → pass qaMode flag + per-card SRS data
│   │   └── dashboard/page.tsx  # extend: readQaAuth() → pass qaMode flag to DeckView → CardList
│   └── api/
│       └── debug/
│           └── state/route.ts  # extend: add cards[] to GET response
├── env.ts                      # extend: add STUDY_COOLDOWN_MINUTES
└── app/api/study/complete/route.ts  # extend: STUDY_COOLDOWN_MINUTES precedence
e2e/
└── 14-qa-parity.spec.ts        # NEW: prod-parity gating test
```

### Pattern 1: QA-mode persistent cookie (D-03 recommendation)

**What:** A second HMAC-signed cookie `leo-qa-mode` that persists independently of any habitat override. Set when secret is verified; cleared with the "Reset" button or manually.

**When to use:** Whenever RSC pages need to decide whether to include QA SRS data in their renders.

**Why a separate cookie (not reusing `leo-habitat-cheat`):** The cheat cookie is payload-bound to a specific habitat override; it is absent when no override is active. QA mode must persist even with no override (e.g., QA wants to see state codes on real data with no forced level). A zero-payload "presence" cookie is the right abstraction.

**Implementation in `debug-cheat.ts`:**
```typescript
// Source: pattern from existing signOverride/verifyOverride in src/lib/debug-cheat.ts
export const QA_MODE_COOKIE = "leo-qa-mode";

// Sign a fixed sentinel payload to create the QA-auth cookie.
// The payload is a constant object — it only signals presence.
const QA_SENTINEL = { qaMode: true } as const;

export function signQaMode(): string {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret) throw new Error("DEBUG_CHEAT_SECRET not set");
  const payloadB64 = base64url(
    Buffer.from(JSON.stringify(QA_SENTINEL), "utf8"),
  );
  return `${payloadB64}.${hmac(payloadB64, secret)}`;
}

export function verifyQaMode(raw: string | null | undefined): boolean {
  const secret = env.DEBUG_CHEAT_SECRET;
  if (!secret || typeof raw !== "string" || !raw.includes(".")) return false;
  const dot = raw.lastIndexOf(".");
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payloadB64 || !sig) return false;
  const expected = hmac(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Server-only: read + verify the QA-mode cookie. Returns true iff QA-authed. */
export async function readQaAuth(): Promise<boolean> {
  if (!cheatEnabled()) return false;
  const store = await cookies();
  return verifyQaMode(store.get(QA_MODE_COOKIE)?.value);
}
```

**Setting the cookie:** In `/api/debug/cheat` POST, after `checkSecret()` passes, always set the QA-mode cookie (even on clear, since the user is re-proving secret knowledge):
```typescript
// Source: existing cookie set pattern in src/app/api/debug/cheat/route.ts line 98
cookieStore.set(QA_MODE_COOKIE, signQaMode(), {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 1 week — matches CHEAT_COOKIE
});
```

### Pattern 2: Per-card SRS data flow to UI surfaces

**What:** RSC pages that already query per-card data pass additional SRS fields (round, direction, cooldownUntil, pausedAt, learned) as props to client components, gated by `readQaAuth()`. Customer payload is unchanged when `qaMode=false`.

**Current data flow analysis (verified by reading source):**

- **Dashboard (`dashboard/page.tsx`):** Already fetches `studyCards` (round, cooldownUntil) and `cards` (all card fields including pausedAt, masteryRound). `getDeckCards()` returns the full `cards.$inferSelect` including `cooldownUntil`, `masteryRound`, `pausedAt`. Passes `cardRows` to `DeckView` → `CardList`. The `CardRow` type currently includes `id, front, back, source, masteryRound, pausedAt`. Adding `cooldownUntil: Date | null` is a one-field type extension.

- **Study (`study/page.tsx`):** Fetches `getStudyCards()` which returns `{id, front, back, masteryRound, cooldownUntil, createdAt, recallCount}`. The `SessionCard` extends `CardForSession` which includes `masteryRound, cooldownUntil`. StudySession already has `initialCards: SessionCard[]` — each card in the queue has its SRS fields available client-side.

- **Deck browse (`deck/browse/page.tsx`):** Does NOT currently fetch SRS state. The `WordListBrowser` receives word list entries, not user card states. QA state codes on browse rows require either adding a deck-cards query to the browse RSC page, or scoping D-05 to dashboard's CardList only. Recommendation: limit QAOB-01 browse surface to the dashboard CardList (which already has all the data), not the word list browser (which shows word-list items, not per-user card states).

**Key insight:** The "card list rows" D-05 refers to are the `CardList` rows on the dashboard, not the `WordListBrowser` rows on `/deck/browse`. The browse page shows dictionary words; the dashboard shows the user's actual card states. This matters because the dashboard already has all SRS data available — browse would need a new query.

**Prop addition pattern:**
```typescript
// Source: RSC page pattern, e.g. src/app/(protected)/dashboard/page.tsx
const qaMode = await readQaAuth();

// Existing cardRows construction — add cooldownUntil field:
const cardRows = cards.map((c) => ({
  id: c.id,
  front: c.front,
  back: c.back,
  source: c.source,
  createdAt: c.createdAt,
  masteryRound: masteryByCardId.get(c.id) ?? 0,
  pausedAt: c.pausedAt,
  // QA-only: pass only when QA-authed — customers get null, no extra payload
  cooldownUntil: qaMode ? (studyCards.find(s => s.id === c.id)?.cooldownUntil ?? null) : null,
}));
```

### Pattern 3: `QaStateBadge` client component

**What:** A `"use client"` component that renders the corner badge and live countdown. Only imported where QA props are passed; customers never receive this component's JS bundle if the tree never renders it.

**Hydration-safe countdown pattern (verified from `deck-view.tsx` `CountdownTimer`):**

The existing `CountdownTimer` in `deck-view.tsx` is the correct reference for a hydration-safe live countdown. Key properties:
- Initial state computed synchronously from `Date.now()` in the `useState` initializer (avoids hydration mismatch)
- `useEffect` sets up the interval (client-only)
- 60s tick interval (adequate for minutes display; for the badge `cd:14m`, 60s ticks are fine)

```typescript
// Source: pattern from src/components/deck-view.tsx CountdownTimer (lines 44-91)
"use client";
// IMPORTANT: This component is only mounted when qaCardData prop is present.
// RSC pages omit the prop for customers — no QA JS runs at all.

interface QaCardData {
  masteryRound: number;
  // "n2t" | "t2n" — determined by getCardStage() logic (round 0=n2t, 1=t2n, 2=random)
  stage: "n2t" | "t2n";
  cooldownUntil: Date | null;
  learned: boolean;  // masteryRound >= 3
  pausedAt: Date | null;
}

export function QaStateBadge({ data }: { data: QaCardData }) {
  // ... format code string + live countdown ticker
}
```

**State code format recommendation (D-07):**

Reference from CONTEXT.md: `R2·t2n·cd:14m`. Recommended token set:

| Token | Example | When present |
|-------|---------|-------------|
| `R{n}` | `R0`, `R1`, `R2`, `R3` | Always (mastery round) |
| `n2t` or `t2n` | `n2t`, `t2n` | Always (next study direction, from `card.stage`) |
| `cd:{n}m` or `cd:{n}h{m}m` | `cd:14m`, `cd:1h30m` | Only when cooldownUntil is in the future |
| `L` (learned) | `L` | When masteryRound === 3 |
| `P` (paused) | `P` | When pausedAt is not null |

Full examples: `R0·n2t`, `R1·t2n·cd:22m`, `R2·t2n·cd:1h15m`, `R3·L`, `R1·t2n·P`

For the cooldown live tick: use a 60-second interval for minutes-level display, matching the existing pattern. For short cooldowns (< 5 minutes), switch to a 10-second interval for finer granularity — QA with `STUDY_COOLDOWN_MINUTES=15` will want to see `cd:14m` → `cd:13m`.

**DOM attribute for gating test:** Add `data-qa-badge` to the outermost badge `div`. QAOB-04 asserts `document.querySelectorAll('[data-qa-badge]').length === 0` for customers.

### Pattern 4: `STUDY_COOLDOWN_MINUTES` env precedence (D-09)

**What:** New env var `STUDY_COOLDOWN_MINUTES` (integer, optional, no min) wins over all existing cooldown overrides. Resolved in `complete/route.ts` before `COOLDOWN_CONFIG` is built.

**Current precedence logic in `complete/route.ts` (verified, lines 26-30):**
```typescript
const NO_COOLDOWN =
  process.env.NODE_ENV !== "production" || env.STUDY_NO_COOLDOWN === "true";
const COOLDOWN_CONFIG: Record<number, number | null> = NO_COOLDOWN
  ? { 0: 0, 1: 0, 2: null }
  : DEFAULT_COOLDOWN_MS;
```

**New precedence (D-09: STUDY_COOLDOWN_MINUTES wins when set):**
```typescript
// Source: extend src/app/api/study/complete/route.ts
import { env } from "@/env";
import { DEFAULT_COOLDOWN_MS } from "@/lib/study-engine";

function buildCooldownConfig(): Record<number, number | null> {
  // STUDY_COOLDOWN_MINUTES wins when set — overrides NO_COOLDOWN and dev auto-zero
  if (env.STUDY_COOLDOWN_MINUTES !== undefined) {
    const ms = env.STUDY_COOLDOWN_MINUTES * 60 * 1000;
    return { 0: ms, 1: ms, 2: null }; // round 2->3 is always null (learned)
  }
  // Existing: dev auto-zero or NO_COOLDOWN
  const NO_COOLDOWN =
    process.env.NODE_ENV !== "production" || env.STUDY_NO_COOLDOWN === "true";
  return NO_COOLDOWN ? { 0: 0, 1: 0, 2: null } : DEFAULT_COOLDOWN_MS;
}

const COOLDOWN_CONFIG = buildCooldownConfig();
```

**t3-env schema addition:**
```typescript
// Source: extend src/env.ts
STUDY_COOLDOWN_MINUTES: z
  .string()
  .optional()
  .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
  .pipe(z.number().int().min(1).optional()),
```

Note: t3-env does not natively support numeric env vars (env vars are always strings). The transform/pipe pattern is standard for integer env vars in this schema.

### Pattern 5: `/api/debug/state` extension (QAOB-03)

**What:** Extend the existing `GET /api/debug/state?secret=...` to include a `cards` array alongside the existing `{ real, forced }` response.

**Card scope recommendation:** Active deck only (the deck from the user's first deck or the one active on dashboard). Rationale: showing all cards across all decks could be thousands of rows; QA typically works one deck at a time. The endpoint can accept an optional `?deck=<deckId>` param; without it, return the user's first deck's cards.

**Extended response shape:**
```typescript
{
  real: HabitatState,
  forced: HabitatOverride | null,
  cards: Array<{
    id: string,
    word: string,          // card.front
    masteryRound: number,
    direction: "n2t" | "t2n" | "either",  // derived from masteryRound
    cooldownUntil: string | null,  // ISO string
    pausedAt: string | null,       // ISO string
    learned: boolean,              // masteryRound >= 3
  }>
}
```

**Direction field:** Compute from `masteryRound` using the same `ROUND_REQUIREMENT` logic as the study engine: `0→"n2t"`, `1→"t2n"`, `2→"either"`, `3→"learned (no direction)"`.

**Refresh behavior:** The `/debug` page already has a "Refresh" button that calls `refresh(secret)`. The same fetch call will return the extended response; the client renders the table when `data.cards` is present. No separate refresh mechanism needed.

**Table layout recommendation for `/debug` page:**

Add a new `Card` section below "Live REAL state" with a compact `<table>`:

| id (truncated) | word | R | dir | cooldown | paused | learned |
|---|---|---|---|---|---|---|
| abc…xyz | bonjour | 1 | t2n | 22m | — | — |
| def…uvw | merci | 3 | — | — | — | ✓ |

Sort: unlearned/in-progress first (masteryRound < 3), then learned; within each group sorted by `cooldownUntil` nulls first.

### Pattern 6: Prod-parity gating test (QAOB-04)

**What:** A Playwright e2e spec that proves QA affordances are absent when both `DEBUG_CHEAT_SECRET` and `STUDY_COOLDOWN_MINUTES` are unset.

**How the existing e2e suite boots the app (verified from `playwright.config.ts`):**

The `playwright.config.ts` has `webServer: undefined`. The e2e tests rely on an already-running dev server at `http://localhost:3000`. There is no automated webServer launch in the config. This means the gating test must either:
- (a) Document that it should be run against a dev server started without the QA secrets, OR
- (b) Use the Playwright `request` API to probe API routes directly without needing the full UI (for the 404 assertions), while using `page.goto()` for DOM assertions.

**Recommended approach:** A Playwright spec that:
1. Runs against the existing local dev server (same as all other e2e tests)
2. Creates a test user, signs in (using `signUpWithDeck` helper)
3. Navigates to `/dashboard`, `/study?deck=<deckId>` (after adding a card)
4. Asserts `page.locator('[data-qa-badge]').count()` === 0
5. Uses `page.request.get('/api/debug/state?secret=anything')` → expects 404
6. Uses `page.request.post('/api/debug/cheat', {...})` → expects 404
7. Documents in the spec header: "Run this against a dev server started with DEBUG_CHEAT_SECRET unset"

**Important constraint:** The standard dev server auto-zeroes cooldowns (`NODE_ENV !== production`). For the QAOB-04 "STUDY_COOLDOWN_MINUTES unset ⇒ real 12h/24h defaults" assertion, this must be tested against a production-mode build, not dev mode. Recommendation: scope QAOB-04's cooldown assertion to: "STUDY_COOLDOWN_MINUTES is absent from env ⇒ no error thrown, engine falls back correctly" — unit test the `buildCooldownConfig()` logic instead, since the live cooldown behavior (real 12h) cannot be observed in a dev server integration test without actually waiting.

**Alternative for harder gating:** Use `process.env` manipulation within the test process (not practical for Next.js servers) OR document the test as requiring two separate runs: one with secrets, one without. Given the test spec header approach is already used in this codebase (see `study-progression.spec.ts` header comment about dev cooldown zeroing), a well-documented spec is appropriate.

### Anti-Patterns to Avoid

- **Passing QA data to ALL renders and conditionally hiding with CSS:** A customer's DOM must literally not contain `[data-qa-badge]` elements. The prop must be `undefined/null` from the server, not just visually hidden. QAOB-04 asserts DOM absence, not visual absence.
- **Client-side QA gate checks using `document.cookie`:** The QA cookie is `httpOnly`. Client components cannot read it. The gate is always server-side (RSC reads the cookie, passes a boolean prop down).
- **Setting cookies from Server Components:** Next.js 16 explicitly prohibits `cookies().set()` in server components — only Route Handlers and Server Functions can set cookies. The QA-auth cookie MUST be set in the `/api/debug/cheat` Route Handler, not in any page.
- **Ticking countdown for ALL users (no gating):** The live countdown timer in `QaStateBadge` uses `setInterval`. If the component is rendered for customers (even with empty data), the interval runs unnecessarily. Guard is: only render `<QaStateBadge>` when `qaCardData !== null/undefined`.
- **Module-level `COOLDOWN_CONFIG` when `STUDY_COOLDOWN_MINUTES` is set:** The current module-level `COOLDOWN_CONFIG` const in `complete/route.ts` is evaluated once at module load. Converting to a function call (`buildCooldownConfig()`) or keeping module-level is equivalent in a Next.js server environment (module is re-evaluated per cold start). Keep module-level const for consistency.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC signing for QA-mode cookie | Custom crypto | Existing `signOverride`/`verifyOverride` helpers in `debug-cheat.ts` | Already implemented, tested, constant-time |
| Live countdown timer | Custom tick logic | Existing `CountdownTimer` pattern in `deck-view.tsx` | Hydration-safe, router-refresh-on-expiry already there |
| Secret check (timing-safe) | `===` comparison | `checkSecret()` from `debug-cheat.ts` | Constant-time via `timingSafeEqual` |
| t3-env numeric transform | `parseInt()` in route code | `z.string().transform().pipe(z.number())` in `env.ts` | Type-safe, validated at startup, tree-shaken |

---

## Common Pitfalls

### Pitfall 1: Cookie write attempted in Server Component rendering

**What goes wrong:** Calling `cookies().set()` inside a server component (page.tsx) throws at runtime in Next.js 16.

**Why it happens:** HTTP does not allow setting cookies after streaming starts; Next.js 16 enforces this with an explicit runtime error.

**How to avoid:** The QA-mode cookie issuance stays exclusively in `/api/debug/cheat` (a Route Handler). RSC pages only *read* the cookie with `readQaAuth()`.

**Warning signs:** Runtime error "Cookies can only be modified in a Server Action or Route Handler".

**Source:** [CITED: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md]

### Pitfall 2: Hydration mismatch in `QaStateBadge` countdown

**What goes wrong:** If `Date.now()` is called during the React render tree (not in `useState` initializer or `useEffect`), the server-rendered HTML will have a different time value than the client hydration pass → React hydration mismatch warning and visual flicker.

**Why it happens:** RSC renders the initial HTML on the server; hydration re-runs client-side milliseconds later with a different timestamp.

**How to avoid:** Initialize countdown state in `useState(() => { const ms = ...; return formatCountdown(ms); })` — this evaluates lazily only on first render, which is client-only for a client component. The existing `CountdownTimer` in `deck-view.tsx` uses this pattern correctly.

**Warning signs:** React console warning "Hydration failed because the server rendered HTML didn't match the client."

### Pitfall 3: `STUDY_COOLDOWN_MINUTES` not coerced to number

**What goes wrong:** `env.STUDY_COOLDOWN_MINUTES` returns a string from process.env without coercion; multiplying `"15" * 60 * 1000` gives `NaN` because env vars are strings.

**Why it happens:** t3-env validates but does not auto-coerce numeric strings without explicit `.transform()`.

**How to avoid:** Use `z.string().transform(v => parseInt(v, 10)).pipe(z.number().int().min(1).optional())` in `env.ts`. Verify by calling `typeof env.STUDY_COOLDOWN_MINUTES` in a unit test.

**Warning signs:** Cooldown config silently produces `NaN` → `new Date(now.getTime() + NaN)` → `Invalid Date` stored in DB.

### Pitfall 4: `COOLDOWN_CONFIG` resolves at module load time when env might not be read

**What goes wrong:** If `env.STUDY_COOLDOWN_MINUTES` is read at module evaluation time in a Vercel Edge function or cold start before the env is available, it returns `undefined` regardless.

**Why it happens:** t3-env reads `process.env` at module evaluation. In standard Node.js serverless functions (used by Vercel), `process.env` is available at module load. This is not actually a problem for the standard Node.js runtime used by this project.

**How to avoid:** No special action needed — but note that changing the `COOLDOWN_CONFIG` const to a `buildCooldownConfig()` function call at module level is equivalent. Keep the module-level approach for consistency with existing code style.

### Pitfall 5: Browse page (`/deck/browse`) lacks per-card SRS data

**What goes wrong:** Attempting to render QA badges on the WordListBrowser (which shows curated word-list entries, not per-user card states) finds no `masteryRound`, `cooldownUntil`, or `pausedAt` data.

**Why it happens:** The browse page fetches `getDeckCardWords()` (a Set of `"front::back"` keys for dedup checking), not the card SRS state.

**How to avoid:** Limit the D-05 browse surface to the dashboard CardList only — which already has all SRS data. The word list browser is a catalog, not a card-state viewer. Document this scope decision in the plan.

### Pitfall 6: Prod-parity test relies on dev server having secrets unset

**What goes wrong:** If the local `.env.local` has `DEBUG_CHEAT_SECRET` set, the gating test's "404" assertions will fail even though the code is correct.

**Why it happens:** The dev server inherits the full `.env.local`; the test cannot strip env vars from an already-running server.

**How to avoid:** Document the test as requiring a clean env run: `DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts`. Add a "Prerequisites" comment in the spec. Alternatively, scope the test's "feature disabled" check to a known behavior: if the feature is enabled, skip the 404 assertions and emit a warning — this makes the test runnable in both modes without false passes.

---

## Code Examples

### Adding `STUDY_COOLDOWN_MINUTES` to `env.ts`

```typescript
// Source: extend src/env.ts — follow existing optional pattern
STUDY_COOLDOWN_MINUTES: z
  .string()
  .optional()
  .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
  .pipe(z.number().int().min(1).optional()),
```

And in `runtimeEnv`:
```typescript
STUDY_COOLDOWN_MINUTES: process.env.STUDY_COOLDOWN_MINUTES,
```

### `buildCooldownConfig()` in `complete/route.ts`

```typescript
// Source: extend src/app/api/study/complete/route.ts
function buildCooldownConfig(): Record<number, number | null> {
  // D-09: STUDY_COOLDOWN_MINUTES wins over all when set
  if (env.STUDY_COOLDOWN_MINUTES !== undefined) {
    const ms = env.STUDY_COOLDOWN_MINUTES * 60 * 1000;
    return { 0: ms, 1: ms, 2: null };
  }
  // Existing: dev auto-zero or NO_COOLDOWN override
  const useNoCooldown =
    process.env.NODE_ENV !== "production" || env.STUDY_NO_COOLDOWN === "true";
  return useNoCooldown ? { 0: 0, 1: 0, 2: null } : DEFAULT_COOLDOWN_MS;
}

const COOLDOWN_CONFIG = buildCooldownConfig();
```

### `QaStateBadge` component skeleton

```typescript
// Source: pattern from src/components/deck-view.tsx CountdownTimer + CONTEXT.md D-07
"use client";

import { useEffect, useState } from "react";

export interface QaCardData {
  masteryRound: number;
  stage: "n2t" | "t2n";
  cooldownUntil: Date | null;
  pausedAt: Date | null;
}

function formatCd(ms: number): string {
  if (ms <= 0) return "";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

export function QaStateBadge({ data }: { data: QaCardData }) {
  const learned = data.masteryRound >= 3;
  const [cdLabel, setCdLabel] = useState(() => {
    if (!data.cooldownUntil) return "";
    return formatCd(data.cooldownUntil.getTime() - Date.now());
  });

  useEffect(() => {
    if (!data.cooldownUntil) return;
    const tick = () => {
      const ms = data.cooldownUntil!.getTime() - Date.now();
      setCdLabel(ms > 0 ? formatCd(ms) : "");
    };
    tick();
    // Fine-grained tick when < 5 min remain for short QA cooldowns
    const intervalMs = (data.cooldownUntil.getTime() - Date.now()) < 5 * 60_000 ? 10_000 : 60_000;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [data.cooldownUntil]);

  const tokens: string[] = [
    `R${data.masteryRound}`,
    learned ? "L" : data.stage,
    cdLabel ? `cd:${cdLabel}` : "",
    data.pausedAt ? "P" : "",
  ].filter(Boolean);

  return (
    <span
      data-qa-badge
      className="absolute top-1 right-1 z-20 font-mono text-[10px] bg-black/40 text-white/90 rounded px-1 py-0.5 pointer-events-none select-none"
      aria-hidden="true"
    >
      {tokens.join("·")}
    </span>
  );
}
```

### RSC integration for QA badge data (study page)

```typescript
// Source: extend src/app/(protected)/study/page.tsx
const qaMode = await readQaAuth();

// sessionCards already has masteryRound, cooldownUntil, stage — no extra query needed
// Pass qaMode as a prop to StudySession
return <StudySession initialCards={sessionCards} deckId={deckId} qaMode={qaMode} />;
```

In `StudySession`, pass `data-qa-badge` prop through to `StudyCard`:
```typescript
// In StudyCard props, add optional qaCardData: QaCardData | null
// StudyCard renders <QaStateBadge data={qaCardData} /> when qaCardData != null
```

### Playwright prod-parity spec skeleton

```typescript
// Source: new e2e/14-qa-parity.spec.ts — modeled on e2e/study-progression.spec.ts header style
// PREREQUISITE: Run against a dev server started with DEBUG_CHEAT_SECRET unset:
//   DEBUG_CHEAT_SECRET="" npx playwright test e2e/14-qa-parity.spec.ts
// Or: use `page.request` assertions which check HTTP status only (no env dependency).

import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

test.describe("QA prod-parity gating (QAOB-04)", () => {
  test("no state codes in DOM and debug endpoints return 404 when feature unset", async ({ page }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 1);

    // Dashboard: no QA badges
    await page.goto("/dashboard");
    expect(await page.locator("[data-qa-badge]").count()).toBe(0);

    // Study session: no QA badges
    // (need to navigate to study with a card)
    await page.getByRole("link", { name: "Start studying" }).click();
    await page.waitForURL(/\/study/);
    await page.waitForSelector('text="Tap to reveal"');
    expect(await page.locator("[data-qa-badge]").count()).toBe(0);

    // API endpoints return 404 when DEBUG_CHEAT_SECRET is unset
    const stateRes = await page.request.get("/api/debug/state?secret=anything");
    expect(stateRes.status()).toBe(404);

    const cheatRes = await page.request.post("/api/debug/cheat", {
      data: { secret: "anything", level: 1 },
    });
    expect(cheatRes.status()).toBe(404);
  });
});
```

---

## Runtime State Inventory

Not a rename/refactor/migration phase — this section is omitted per guidelines.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Synchronous `cookies()` (Next.js 14) | Async `await cookies()` (Next.js 15+) | Next.js 15.0.0-RC | `debug-cheat.ts` already uses `await cookies()` — no change needed |
| Module-level NO_COOLDOWN const (current) | `buildCooldownConfig()` wrapping same logic | Phase 14 | Enables STUDY_COOLDOWN_MINUTES override without restructuring |

**No deprecated patterns in scope.**

---

## Open Questions (RESOLVED)

1. **Deck scope for `/api/debug/state` cards array (QAOB-03)**
   - What we know: endpoint is session-gated; user may have multiple decks
   - What's unclear: whether QA always works one deck at a time or wants all decks
   - Recommendation: support optional `?deck=<deckId>` param; default to user's first deck (matches the dashboard default behavior). Return at most 200 cards.

2. **Study page QA badge and `stage` field**
   - What we know: `SessionCard` already has `stage: "n2t" | "t2n"` from `getCardStage()`; this is the direction the card was assigned for this session, which is the right value for the badge
   - What's unclear: for resurfaced (learned) cards shown in the session, `stage` could be either — this is expected behavior, not a gap

3. **`STUDY_COOLDOWN_MINUTES` on the cooldown badge for study session**
   - What we know: the `cooldownUntil` stored in the DB is set at session commit time based on `STUDY_COOLDOWN_MINUTES` when set. The badge shows whatever is in `cooldownUntil` on the card at session-load time.
   - What's unclear: during an active session, the cooldown is not yet written — the card's current `cooldownUntil` reflects the PREVIOUS session's cooldown. The badge will show the remaining previous cooldown (or nothing if it expired). This is correct behavior — the new cooldown is only set on `POST /api/study/complete`.

---

## Environment Availability

No external tools beyond the existing project stack are required. Dev server runs at `http://localhost:3000`. Playwright and Node.js are confirmed available.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | HMAC, env | ✓ | (project runs) | — |
| Playwright | QAOB-04 | ✓ | ^1.58.2 | — |
| Vitest | Unit tests | ✓ | ^4.1.1 | — |
| Neon Postgres | `/api/debug/state` cards query | ✓ | (project runs) | — |

**No missing dependencies.**

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 (unit) + Playwright ^1.58.2 (e2e) |
| Config file | `vitest.config.ts` (unit), `playwright.config.ts` (e2e) |
| Quick run command | `npx vitest run src/lib/debug-cheat.test.ts src/env.test.ts src/lib/study-engine.test.ts` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QAOB-01 | `QaStateBadge` renders correct tokens (R2·t2n, etc.) | unit | `npx vitest run src/components/__tests__/qa-state-badge.test.ts` | ❌ Wave 0 |
| QAOB-01 | Countdown ticks and formats correctly (formatCd) | unit | `npx vitest run src/components/__tests__/qa-state-badge.test.ts` | ❌ Wave 0 |
| QAOB-01 | `[data-qa-badge]` absent in DOM when QA cookie missing | e2e (QAOB-04 covers) | `npx playwright test e2e/14-qa-parity.spec.ts` | ❌ Wave 0 |
| QAOB-02 | `buildCooldownConfig()` returns correct ms when STUDY_COOLDOWN_MINUTES set | unit | `npx vitest run src/app/api/study/__tests__/cooldown-config.test.ts` | ❌ Wave 0 |
| QAOB-02 | `buildCooldownConfig()` falls through to existing logic when unset | unit | same | ❌ Wave 0 |
| QAOB-02 | `STUDY_COOLDOWN_MINUTES` in env.ts validates and coerces correctly | unit | `npx vitest run src/env.test.ts` | ✅ (extend) |
| QAOB-03 | `/api/debug/state` returns `cards` array with correct fields | integration (manual) | Manual: `curl /api/debug/state?secret=...` | ❌ Wave 0 (or extend existing) |
| QAOB-03 | `signQaMode`/`verifyQaMode` round-trips correctly | unit | `npx vitest run src/lib/debug-cheat.test.ts` | ✅ (extend) |
| QAOB-04 | No `[data-qa-badge]` in DOM (dashboard + study) without QA cookie | e2e | `npx playwright test e2e/14-qa-parity.spec.ts` | ❌ Wave 0 |
| QAOB-04 | `/api/debug/state` returns 404 when secret unset | e2e | same | ❌ Wave 0 |
| QAOB-04 | `/api/debug/cheat` returns 404 when secret unset | e2e | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/debug-cheat.test.ts src/lib/study-engine.test.ts src/env.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** `npx vitest run && npx playwright test` — full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/__tests__/qa-state-badge.test.ts` — unit tests for `QaStateBadge` token formatting and `formatCd`; covers QAOB-01
- [ ] `src/app/api/study/__tests__/cooldown-config.test.ts` — unit tests for `buildCooldownConfig()` with all three precedence branches; covers QAOB-02
- [ ] `e2e/14-qa-parity.spec.ts` — Playwright prod-parity gating test; covers QAOB-04
- Extend `src/lib/debug-cheat.test.ts` — add `signQaMode`/`verifyQaMode` round-trip tests; covers QAOB-01 gating
- Extend `src/env.test.ts` — add `STUDY_COOLDOWN_MINUTES` coercion and validation test; covers QAOB-02

---

## Security Domain

`security_enforcement` is not set to false in `.planning/config.json` — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (QA-mode gate) | `checkSecret()` constant-time comparison; HMAC-signed cookie verification |
| V3 Session Management | Partial | QA cookies are `httpOnly`, `secure`, `sameSite: lax`, `maxAge: 7 days` — same settings as existing cheat cookie |
| V4 Access Control | Yes | All QA endpoints 404 when `DEBUG_CHEAT_SECRET` unset; auth session required before secret check |
| V5 Input Validation | Yes | `STUDY_COOLDOWN_MINUTES` validated via zod `z.number().int().min(1)`; prevents negative or NaN cooldowns |
| V6 Cryptography | Yes | HMAC-SHA256 via Node.js `node:crypto` — never hand-rolled |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cookie forgery for QA-mode | Tampering | HMAC-SHA256 signature; `timingSafeEqual` prevents timing attacks |
| Secrets leaked via client bundle | Information Disclosure | `debug-cheat.ts` is server-only (no `"use client"`); `@/env` server-only vars never reach client |
| QA data in customer DOM | Information Disclosure | Prop-gated at RSC level; customers receive `null` props → no client component renders |
| STUDY_COOLDOWN_MINUTES set in prod | Tampering | D-10 addresses: control is Vercel env scoping, not code-level block. QAOB-04 proves real defaults apply when unset. |
| Negative/zero cooldown via env | Tampering | `z.number().int().min(1)` rejects 0 and negatives |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getDeckCards()` returns all card fields including `cooldownUntil` and `pausedAt` for dashboard CardList | Standard Stack / Pattern 2 | Verified by reading `getDeckCards()` in `deck-queries.ts` (returns `cards.$inferSelect`) and dashboard page assembling `cardRows`. LOW risk. |
| A2 | The "browse surface" for D-05 means the dashboard CardList, not the word-list browser | Pattern 2 pitfall + D-05 scope | ASSUMED based on data availability analysis. If QA actually needs badges on `/deck/browse` word entries, a new query to fetch per-card SRS for deck words would be needed — doable but requires extra work. |
| A3 | A 60-second tick interval (with 10-second fallback below 5 min) is sufficient granularity for the QA badge countdown | Pattern 3 | ASSUMED. If QA wants second-level countdown, 1-second interval adds minimal overhead but would require reconsidering hydration initialization. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

The assumed items (A2, A3) are low-risk discretionary scope decisions — the planner can resolve them in the plan.

---

## Sources

### Primary (HIGH confidence)

- `src/lib/debug-cheat.ts` — HMAC cookie pattern; sign/verify helpers; `CHEAT_COOKIE`; `cheatEnabled()`
- `src/app/api/debug/cheat/route.ts` — cookie set pattern (httpOnly, secure, sameSite, maxAge)
- `src/app/api/debug/state/route.ts` — existing state endpoint; secret check pattern
- `src/env.ts` — t3-env schema; existing optional server vars
- `src/app/api/study/complete/route.ts` — cooldown resolution logic; `COOLDOWN_CONFIG`; `buildCooldownConfig` extension point
- `src/lib/study-engine.ts` — `DEFAULT_COOLDOWN_MS`; `computeCardUpdate`; `getCardStage`; direction rules
- `src/components/deck-view.tsx` — `CountdownTimer` hydration-safe pattern
- `src/components/study-card.tsx` — card structure; badge placement target
- `src/components/card-list.tsx` — `CardRow` type; dashboard browse rows
- `src/app/(protected)/dashboard/page.tsx` — full data flow; `cardRows` construction; `readHabitatOverride()` usage
- `src/app/(protected)/study/page.tsx` — `getStudyCards()` → `assembleSession()` → `StudySession`
- `src/db/schema.ts` — `cards` table fields: `masteryRound`, `cooldownUntil`, `pausedAt`, `createdAt`
- `src/lib/deck-queries.ts` — `getDeckCards()` returns `cards.$inferSelect`
- `playwright.config.ts` — `webServer: undefined`; e2e suite boots against pre-running server
- `e2e/study-progression.spec.ts` — reference e2e pattern; test style
- `e2e/helpers.ts` — `signUpWithDeck`, `addWordsFromBrowser`, `testEmail`
- `src/lib/debug-cheat.test.ts` — unit test style; `vi.mock("@/env")` pattern
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` — `cookies()` is async in Next.js 15+; setting cookies is Route-Handler/Server-Function only; reading works in RSC [CITED]
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` — Server vs client component capabilities [CITED]

### Secondary (MEDIUM confidence)

- t3-env numeric coercion via `.transform().pipe()` — established pattern from t3-env usage; confirmed by existing `z.string().min(16).optional()` pattern in `env.ts` [ASSUMED — but consistent with zod transform pattern]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns verified from live source code
- Architecture: HIGH — data flows traced through actual component and route files
- Pitfalls: HIGH — derived from documented constraints (cookies API), verified code structure (hydration pattern), and explicit decisions (D-09, D-10)
- Cookie mechanism (D-03): HIGH — reusing existing helpers exactly; new cookie is a structural parallel of the cheat cookie

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (stable stack — Next.js 16.2.1 pinned, no external API dependencies)
