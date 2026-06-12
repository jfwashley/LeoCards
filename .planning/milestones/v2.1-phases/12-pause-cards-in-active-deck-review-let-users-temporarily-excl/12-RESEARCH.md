# Phase 12 — Pause cards in active deck review — RESEARCH

**Researched:** 2026-05-20
**Domain:** SRS cadence preservation + per-row toggle UX in Next.js 16.2 / Drizzle / Neon HTTP
**Confidence:** HIGH (all assumptions verified against installed source — no training-data extrapolation)

---

## ⚠ Conflicts with CONTEXT.md

**None.** Every locked decision is implementable as written. One refinement and one annotation:

- **Refinement (route param shape):** The CONTEXT proposes `/api/cards/[id]/pause` and `/api/cards/[id]/unpause` as two separate route handlers. Next 16.2 supports this exactly — but `params` is now `Promise<{ id: string }>` and **must be awaited**. Code shape below.
- **Annotation (revalidation):** `revalidatePath` from a Route Handler only marks the path stale; it does **not** push fresh data to the open tab. The dashboard is server-rendered (`src/app/(protected)/dashboard/page.tsx`), so to make the row's paused state appear immediately after the click, the client component **must** call `router.refresh()` after a successful fetch. The CONTEXT did not specify this; the planner should make it explicit.

---

## Summary

Phase 12 is a small, well-defined addition. Every primitive it needs already exists in the codebase and just needs to be wired through:

1. A single nullable `pausedAt timestamp` column on `cards` (Drizzle migration via `db:generate` + `db:migrate`).
2. Two route handlers that mirror `src/app/api/study/complete/route.ts`'s auth + ownership + rate-limit pattern.
3. A pure-function helper (`computeUnpauseUpdate`) co-located with the existing study-engine pure functions, with unit tests written in the same style as `src/lib/study-engine.test.ts`.
4. A `pausedAt` filter at the **query layer** (`getStudyCards`) so the existing `assembleSession` and `earliestCooldownEnd` engine functions can stay untouched — paused cards simply never reach them.
5. A new `pausedAt` field exposed by `getDeckCards` so `CardList` can render the badge and the inline pause/play icon.
6. After a successful POST, the client calls `router.refresh()` to re-fetch the server-rendered dashboard.

**Primary recommendation:** Filter paused cards out at the query level for the study path, but pass them through to the deck-view path so the UI can render them greyed-out. Keep `study-engine.ts` ignorant of pause — that's the cheapest, lowest-risk split.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P12-01 | Add nullable `pausedAt timestamp` to `cards` | drizzle-kit 0.31.10 migration workflow verified — section "Drizzle migration" |
| P12-02 | `POST /api/cards/[id]/pause` and `/unpause` route handlers, auth + deck-ownership + rate-limited | Next 16.2 route handler signature + existing `src/app/api/study/complete/route.ts` patterns documented below |
| P12-03 | On unpause: `cooldownUntil = old_cooldownUntil + (now − pausedAt)`, `pausedAt = NULL`; NULL stays NULL | Pure function `computeUnpauseUpdate` defined in section "Cadence-shift math" |
| P12-04 | `assembleSession` excludes paused cards | Filter at `getStudyCards` (study-queries.ts) — engine stays unchanged |
| P12-05 | Dashboard due-count + `earliestCooldownEnd` exclude paused cards | Same filter — dashboard reads through `getStudyCards`, so it inherits the filter for free |
| P12-06 | Inline pause/play icon on every CardList row; "Paused" badge; greyed-out style | `lucide-react` icon names `Pause` / `Play` verified present in `node_modules/lucide-react/dist/esm/icons/`; CardList structure documented |
| P12-07 | UI reflects pause/unpause immediately | `router.refresh()` after fetch — `revalidatePath` alone is not sufficient |
| P12-08 | Unit + Playwright coverage | Vitest setup + Playwright helpers documented |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persist `pausedAt` | Database (Drizzle/Neon) | — | Single source of truth; column is the predicate |
| Auth + ownership + rate-limit | API route (`/api/cards/[id]/(un)pause`) | — | Exact mirror of `study/complete/route.ts` (SEC-02) |
| Cadence-shift math | Pure module (`src/lib/study-engine.ts`) | — | Co-located with `computeCardUpdate`, unit-testable, no I/O |
| Exclude paused from sessions/counts | Query layer (`src/lib/study-queries.ts`) | — | Server-side `WHERE` filter keeps engine pure |
| Render paused style + toggle button | Client component (`src/components/card-list.tsx`) | — | Per-row state, already a client component |
| Trigger UI refresh post-toggle | Client → `router.refresh()` | — | Dashboard is server-rendered; client invalidation is the idiomatic path |

---

## Standard Stack (already installed — verified against `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `16.2.1` | Route handlers + server components | Already the framework |
| `drizzle-orm` | `^0.45.1` | Schema + queries | Already in use |
| `drizzle-kit` | `^0.31.10` | Migration tooling | Already in use |
| `@neondatabase/serverless` | `^1.0.2` | DB driver (HTTP, no tx) | Already in use; constrains us to single-statement atomicity |
| `lucide-react` | `^1.0.1` | Icons | Already in use; `Pause` and `Play` icons present (verified) |
| `better-auth` | `^1.5.6` | Session auth | Reuse `auth.api.getSession({ headers: await headers() })` |
| `zod` | `^4.3.6` | Input validation (none needed if body is empty) | Already in use; trivially optional here |
| `vitest` | `^4.1.1` | Unit tests | Test setup at `vitest.config.ts`; environment `node` |
| `playwright` | `^1.58.2` | E2E | Configured via `playwright.config.ts` |

**No new packages required.** No `npm install` step in Phase 12.

---

## Package Legitimacy Audit

Phase 12 installs zero new packages. All dependencies are already present in `package.json` and have been in production since v1.0/v2.0. No slopcheck required.

---

## Next.js 16.2 specifics (verified against `node_modules/next/dist/docs/`)

### Route handler signature for `app/api/cards/[id]/pause/route.ts`

Verified from `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`:

- `params` is a **Promise** in Next 15+ (codemod was applied in 15.0.0-RC) — **must `await`** it.
- Default for POST handlers is dynamic (no caching), so no extra `export const dynamic = ...` needed.
- The globally available `RouteContext<'/api/cards/[id]'>` helper types `params` correctly. Use it.

**Canonical shape the planner should mandate:**

```ts
// src/app/api/cards/[id]/pause/route.ts
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import type { CardId, DeckId } from "@/db/schema";
import { cards, decks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";

const pauseLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/cards/[id]/pause">,
) {
  const { id } = await ctx.params;
  // 1. Auth — await headers() required in Next 16
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Rate limit
  const limit = pauseLimiter.check(session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  // 3. Ownership — join cards → decks → userId in one query
  const [owned] = await db
    .select({ id: cards.id, pausedAt: cards.pausedAt })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(eq(cards.id, id as CardId), eq(decks.userId, session.user.id)));
  if (!owned) return Response.json({ error: "Forbidden" }, { status: 403 });

  // 4. Idempotent pause — if already paused, no-op (return 200 with current pausedAt)
  if (owned.pausedAt !== null) {
    return Response.json({ pausedAt: owned.pausedAt.toISOString() });
  }

  const now = new Date();
  await db.update(cards).set({ pausedAt: now }).where(eq(cards.id, id as CardId));
  return Response.json({ pausedAt: now.toISOString() });
}
```

The unpause handler mirrors the above but reads `cooldownUntil` too, computes the shift via `computeUnpauseUpdate`, and writes both columns in **one** UPDATE statement (row-level atomic under Neon HTTP — matches the existing no-tx pattern).

### How dynamic param is accessed
- File path: `app/api/cards/[id]/pause/route.ts` (folder `[id]`, file `route.ts`).
- `params` shape: `Promise<{ id: string }>`. Always `await ctx.params` or `const { id } = await params`.
- The codebase has not yet built a `[param]` API route — Phase 12 will be the first. The auth catch-all (`api/auth/[...all]/route.ts`) delegates to Better Auth and does not directly access `params`.

### Changes vs Next 14/15 the planner needs to know
1. `params` is async (Next 15+ change). Synchronous access is being deprecated.
2. `await headers()` and `await cookies()` are required (already done across this codebase — see `src/app/api/habitat/route.ts` line 24 comment "Pitfall 5").
3. Default GET caching changed to dynamic in 15.0.0-RC; POSTs are always dynamic. No segment config needed for these handlers.

### `revalidatePath` behavior — IMPORTANT
From `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`:

> **Route Handlers**: Marks the path for revalidation. The revalidation is done on the next visit to the specified path.

That means calling `revalidatePath('/dashboard')` inside the POST handler will **not** push a fresh render to the user's currently-open dashboard tab. The user's tab still holds the old server-rendered HTML. To make the UI reflect the pause immediately, the client must call `router.refresh()` (from `next/navigation`) after the fetch resolves. `router.refresh()` re-fetches the current route's RSC payload from the server.

**Planner directive:** The CardList button handler should do `await fetch(...); router.refresh();`. `revalidatePath` is optional and contributes nothing the client-side refresh doesn't already deliver. Recommend **not** calling `revalidatePath` from these handlers — it adds complexity for no observable benefit.

### Server actions alternative — confirm CONTEXT decision
CONTEXT says "follow API-route pattern, don't introduce server actions." This is still sound in Next 16.2 — server actions and route handlers are both first-class options, but the entire LeoCards codebase mutates via route handlers (`api/study/complete`, `api/extract`, `api/translate`, `api/habitat`). Phase 12 should preserve that pattern for consistency, rate-limiting reuse, and easier client-side fetch ergonomics. **No conflict.**

---

## Drizzle migration workflow (verified against repo)

**Existing migrations** (`drizzle/`):
- `0000_blue_johnny_storm.sql` — initial schema
- `0001_ambitious_dark_beast.sql` — added `masteryRound`, `cooldownUntil`, `direction` (precedent for nullable timestamp addition: see line 2: `ALTER TABLE "cards" ADD COLUMN "cooldownUntil" timestamp;`)
- `meta/_journal.json` — journal version 7, postgresql dialect, breakpoints true
- `meta/000{0,1}_snapshot.json` — drizzle-kit-managed snapshots

**Exact workflow the planner should encode:**
1. Edit `src/db/schema.ts` line ~108, adding `pausedAt: timestamp("pausedAt"),` between `lastStudiedAt` and `createdAt` so it groups with the SRS time fields.
2. Run `npm run db:generate` → produces `drizzle/0002_<adjective>_<name>.sql` containing exactly one line: `ALTER TABLE "cards" ADD COLUMN "pausedAt" timestamp;` plus a new `meta/0002_snapshot.json` and an updated `_journal.json` entry.
3. Review the generated SQL.
4. Run `npm run db:migrate` (production-equivalent path; applies via drizzle-kit migrate which reads `_journal.json`).
5. `db:push` is the dev shortcut that bypasses migration files — **don't use it for this phase**; the precedent (both existing migrations) is `generate → migrate` and Phase 12 should match.

**No backfill needed.** The column is nullable with no default; every existing row has `pausedAt = NULL` (= active) automatically.

**Schema entry the planner should put in the plan verbatim:**
```ts
// src/db/schema.ts inside the `cards` pgTable, between lastStudiedAt and createdAt:
pausedAt: timestamp("pausedAt"), // null = active, non-null = paused at this instant
```

---

## Index strategy — recommend DEFER

The existing `cards` table has zero non-PK indexes (verified by reading `drizzle/0000_*.sql` and `0001_*.sql` — no `CREATE INDEX` statements at all). Existing query patterns already do `WHERE deckId = ?` and scan a small set (one user's deck — dozens to low hundreds of cards). Adding a `(deckId, pausedAt)` index now would:
- Introduce inconsistency (this would be the first index in the schema).
- Provide no measurable benefit at current data scale.

**Recommendation:** Do not add an index in Phase 12. Document the deferral in the plan's "out of scope" so it's not forgotten. Revisit if Phase 999.1 (perf initiative) measures dashboard latency hot-paths.

---

## lucide-react icon names (verified)

`ls node_modules/lucide-react/dist/esm/icons/` returned:
```
pause.js          play.js
pause-circle.js   play-circle.js
pause-octagon.js  play-square.js
```

The canonical PascalCase imports are:
```ts
import { Pause, Play } from "lucide-react";
```

These match the speculation in CONTEXT.md. Use plain `Pause` and `Play` (not `PauseCircle` / `PlayCircle`) for visual consistency with the existing `Pencil` icon used in `card-list.tsx` line 3.

---

## Existing patterns to reuse — exact references

### `src/app/api/study/complete/route.ts` — the template to mirror

End-to-end pattern (verified by reading the full file, 208 lines):

| Step | Lines | Pattern |
|------|-------|---------|
| Rate limiter declaration at module scope | 11 | `const studyCompleteLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });` |
| Auth check | 52-55 | `auth.api.getSession({ headers: await headers() })` → 401 on no session |
| Rate limit check | 57-63 | `.check(userId)` → 429 with `Retry-After` header |
| Body parse (Phase 12 pause/unpause has no body — skip) | 66-77 | n/a |
| Ownership verification | 80-93 | Single SELECT joining the resource → resource owner; 403 on no row |
| Mutation | 152-188 | Sequential awaits; Neon HTTP has no transactions (comment on line 152: "neon-http driver does not support transactions") |
| Success response | 206 | `Response.json({ success: true, ... })` |
| Error response shape | 70, 91, 191 | `{ error: "..." }` with appropriate status |

**Planner directive:** Pause/unpause endpoints must use exactly the same `Response.json({ error })` shape, same status codes (401/403/429/500), same `await headers()` pattern, and the same module-level limiter declaration. Don't reinvent any of it.

### Rate limit window for pause/unpause

`src/lib/rate-limit.ts` is a sliding-window limiter (verified — 66 lines, sliding window, in-memory). Existing endpoints:
- `study/complete`: 10/min/user

For pause/unpause, **30/min/user** is the right value. Rationale: a user reviewing a deck might pause 5-10 cards in quick succession; 10 is too tight, 60 invites accidental clicker DoS. CONTEXT suggested 10/min — flag this as the planner's call but recommend 30.

### Branded IDs
`src/db/schema.ts` lines 17-19: `UserId`, `DeckId`, `CardId` are all `Brand<string, "...">`. Cast at the boundary (e.g., `id as CardId` in the route handler after validating it's a string). The existing `study/complete` route does this on lines 86, 103, 145, etc.

---

## `src/lib/study-engine.ts` — what changes and what doesn't

**Read end-to-end (267 lines).** Key findings:

1. **`CardForSession` interface (lines 7-15)** — already lacks any pause field. **Recommendation:** Do NOT add `isPaused` here. Filter paused cards out **before** they're mapped to `CardForSession` (in `getStudyCards`). This keeps `assembleSession` untouched.

2. **`assembleSession(cards, now)` (lines 66-102)** — already filters by `masteryRound < 3 && cooldownUntil <= now`. If paused cards never enter the array, no engine change is needed. ✓

3. **`earliestCooldownEnd(cards, now)` (lines 254-267)** — same story. Filter at query layer; this stays untouched. ✓

4. **Where to put `computeUnpauseUpdate`:** Append to `src/lib/study-engine.ts` after `earliestCooldownEnd`. Co-located, pure, testable, and discoverable.

**Recommended pure-function signature (planner should specify verbatim):**

```ts
// In src/lib/study-engine.ts, appended after earliestCooldownEnd

/**
 * Computes the cooldown shift when unpausing a card.
 *
 * Rule: cooldownUntil shifts forward by exactly (now − pausedAt). The SRS clock
 * was frozen during pause; on unpause the card resurfaces with the same cadence
 * it would have had absent the pause. NULL cooldown stays NULL.
 *
 * lastStudiedAt is NOT mutated — pausedAt is the source of truth for "card
 * was unavailable" intervals.
 */
export function computeUnpauseUpdate(
  pausedAt: Date,
  cooldownUntil: Date | null,
  now: Date,
): { cooldownUntil: Date | null; pausedAt: null } {
  if (cooldownUntil === null) {
    return { cooldownUntil: null, pausedAt: null };
  }
  const pauseDurationMs = now.getTime() - pausedAt.getTime();
  return {
    cooldownUntil: new Date(cooldownUntil.getTime() + pauseDurationMs),
    pausedAt: null,
  };
}
```

---

## `src/lib/study-queries.ts` and `src/lib/deck-queries.ts` — concrete changes

### `src/lib/study-queries.ts` (43 lines — read end-to-end)

Only one function: `getStudyCards(deckId)` returning all cards in a deck. **Change:** Add a `WHERE pausedAt IS NULL` clause:

```ts
import { and, eq, isNull } from "drizzle-orm";
// ...
return db
  .select({ /* ...existing fields... */ })
  .from(cards)
  .where(and(eq(cards.deckId, deckId), isNull(cards.pausedAt)));
```

This single change makes the dashboard's `hasDueCards`, `sessionCards`, and `earliestCooldownEnd` all exclude paused cards automatically, because dashboard page line 70-73 calls `getStudyCards` and pipes its output into engine functions. ✓

### `src/lib/deck-queries.ts` (75 lines — read end-to-end)

`getDeckCards(deckId)` (lines 35-43) uses `db.select().from(cards)` which **already returns all columns** via `$inferSelect`. Once the column is added to the schema, `pausedAt` is automatically returned. **No query change needed**, but the planner must update the call site in the dashboard:

```ts
// src/app/(protected)/dashboard/page.tsx line 105-112 — expand cardRows to include pausedAt
const cardRows = cards.map((c) => ({
  id: c.id,
  front: c.front,
  back: c.back,
  source: c.source,
  createdAt: c.createdAt,
  masteryRound: masteryByCardId.get(c.id) ?? 0,
  pausedAt: c.pausedAt,  // <-- new
}));
```

And update `CardRow` in `src/components/deck-view.tsx` (lines 19-26) to include `pausedAt: Date | null`.

---

## `src/components/card-list.tsx` and `src/components/deck-view.tsx`

### Where the per-row pause icon goes
`card-list.tsx` has two layouts (desktop table + mobile cards). The pause/play button should slot in **next to the existing Edit (Pencil) button** in both:
- **Desktop table** (lines 144-153): Add a new `<td>` before or after the edit button cell. Already a single 11x11 ghost button — copy that shape.
- **Mobile card layout** (lines 192-199): Same pattern — add a sibling Button next to the Pencil button.

Per-row styling for "paused" state — the codebase has **no existing per-row state styling pattern** (`masteryRound` is a content marker via dots, not a row-state change). The planner will introduce the first one. Recommendation: use conditional Tailwind classes on the `<tr>` and the mobile `<div>`:

```tsx
className={`border-b border-border min-h-[48px] hover:bg-secondary transition-colors ${
  card.pausedAt ? "opacity-50" : ""
}`}
```

…and a "Paused" badge rendered next to (or replacing) the Source pill when `card.pausedAt !== null`.

### Click handler — client-side fetch + refresh

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

// inside CardList:
const router = useRouter();
const [isPending, startTransition] = useTransition();

function togglePause(cardId: string, isPaused: boolean) {
  startTransition(async () => {
    const url = `/api/cards/${cardId}/${isPaused ? "unpause" : "pause"}`;
    const res = await fetch(url, { method: "POST" });
    if (res.ok) router.refresh();
  });
}
```

`useTransition` keeps the row interactive (the button can be `disabled={isPending}` and visually dimmed) without blocking the rest of the UI.

### CountdownTimer wiring
`deck-view.tsx` lines 43-90: `CountdownTimer` consumes a pre-computed `earliestCooldownEnd` string. Because `getStudyCards` filters out paused cards, the value passed in already excludes them. **No client-side filtering needed.** ✓

When every card in the deck is paused: `earliestCooldownEndStr` will be `null` AND `hasDueCards` is `false` AND `studyCards.length === 0`. The current `renderStudyButton()` (lines 129-153) returns `null` in this case — so the dashboard shows nothing. The planner should add a small "All cards are paused — unpause one to study" message when `cards.length > 0 && studyCards.length === 0`.

---

## `src/lib/rate-limit.ts` — confirmed

`createRateLimiter({ windowMs, maxRequests })` returns `{ check(key) }` (lines 13-66). Sliding-window with periodic cleanup. In-memory only. Reusable as-is. Module-scope instantiation, exactly as `study/complete/route.ts` does it on line 11.

---

## Edge cases the planner should encode in tasks

### Idempotency on double-click
- **Pause when already paused** → return current `pausedAt` with 200. No-op write. (Implemented in the code shape above via the early-return after the ownership query.)
- **Unpause when not paused** → return 200 with the current (active) state. Same pattern.

This is simpler than 409 and avoids client-side error handling for a benign race. CONTEXT-recommended approach; **confirmed** as the right call.

### Pause while session is in progress
**Confirmed safe by reading `src/app/(protected)/study/page.tsx`:**
- Study page is `async` server-rendered (lines 13-62).
- Session is assembled at request time (line 55) from a fresh `getStudyCards()` call.
- The client `StudySession` component receives `initialCards` as a prop — it owns the in-progress session state.

**Implication:** If a user pauses card X on the dashboard tab, then opens `/study?deck=...`, the session is freshly assembled without X. Safe. ✓

**But:** If a user is *already* in a `/study` session and switches tabs to pause card X on the dashboard, X is already in the client-side session array and will still appear. This is out of scope per CONTEXT ("mid-session pause is deferred"). The planner should document this as expected behavior, not a bug.

### Migration backfill
**Confirmed:** Zero rows need backfill. Adding a nullable column with no default leaves existing rows with `pausedAt = NULL`, which is exactly "active." No data migration step.

---

## Runtime State Inventory

(Not a rename/refactor phase, but useful sanity check for state surfaces.)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | One new column on `cards` (no existing data references "pausedAt") | Drizzle migration |
| Live service config | None — no external service knows about cards | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `.next/types/` will regenerate `RouteContext<'/api/cards/[id]/pause'>` on next `next dev` / `next build` | Automatic |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm | All scripts | ✓ | Per `package.json` | — |
| Neon Postgres connection | Migrations | ✓ (used by v1.0/v2.0) | — | — |
| `drizzle-kit` CLI | `db:generate`, `db:migrate` | ✓ | `^0.31.10` | — |
| `vitest` | Unit tests | ✓ | `^4.1.1` | — |
| `playwright` | E2E | ✓ | `^1.58.2` | — |

No missing dependencies. No blockers.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Unit framework | Vitest 4.1.1, `environment: "node"`, setup `./src/test-setup.ts` |
| E2E framework | Playwright 1.58.2, `baseURL: http://localhost:3000`, chromium-only, 60s timeout |
| Quick run | `npm run test` (`vitest run`) |
| Full suite | `npm run test && npm run test:e2e` |
| Pattern reference (unit) | `src/lib/study-engine.test.ts` — `makeCard()` helper, fixed `NOW/PAST/FUTURE` constants |
| Pattern reference (E2E) | `e2e/06-study-session.spec.ts`, `e2e/helpers.ts` — `signUpWithDeck` + `addWordsFromBrowser` fixtures |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P12-03 | `computeUnpauseUpdate` shifts cooldown forward by pause duration | unit | `npx vitest run src/lib/study-engine.test.ts -t computeUnpauseUpdate` | ❌ Wave 0 |
| P12-03 | `computeUnpauseUpdate` leaves NULL cooldown NULL | unit | same file | ❌ Wave 0 |
| P12-03 | `computeUnpauseUpdate` handles past-cooldown card (shift still applies) | unit | same file | ❌ Wave 0 |
| P12-03 | `computeUnpauseUpdate` zero-duration pause is a no-op | unit | same file | ❌ Wave 0 |
| P12-04 | Paused cards drop out of `getStudyCards` → `assembleSession` | unit (integration of query + engine) | `npx vitest run` | ❌ Wave 0 (can mock `db` or test the SQL predicate via the existing study-engine test style) |
| P12-02 | Pause/unpause endpoints enforce auth + ownership + rate limit | integration | `npx vitest run` (mock `auth` + `db` per existing `study-engine.test.ts` style) | ❌ Wave 0 |
| P12-06 | Pause from dashboard → card excluded from session → unpause → cadence correct | E2E | `npx playwright test e2e/12-pause-cards.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- src/lib/study-engine.test.ts` (the file the new math lives in)
- **Per wave merge:** `npm run test` (full vitest run)
- **Phase gate:** `npm run test && npm run test:e2e` green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/study-engine.test.ts` — extend with `computeUnpauseUpdate` describe block
- [ ] `e2e/12-pause-cards.spec.ts` — new spec file mirroring `e2e/11-phase9-image-upload.spec.ts` naming convention
- [ ] (Optional) `src/app/api/cards/[id]/pause/route.test.ts` — only if the team wants endpoint-level integration tests; existing routes do not have them, so skipping is consistent with project precedent

---

## Common Pitfalls

### Pitfall 1: Forgetting `await ctx.params`
**What goes wrong:** `params.id` is `undefined` (because `params` is a Promise, not an object).
**Why it happens:** Training data assumes Next 14 sync params.
**How to avoid:** Always destructure via `const { id } = await ctx.params;` — and use `RouteContext<'/api/cards/[id]/pause'>` so TypeScript flags sync access at compile time.

### Pitfall 2: Calling `revalidatePath` and expecting the open tab to refresh
**What goes wrong:** Pause/unpause works, but the user's UI doesn't update until next navigation.
**Why it happens:** `revalidatePath` from a Route Handler only marks the path stale on the server cache; it does not push to the client.
**How to avoid:** Client must call `router.refresh()` from `next/navigation` after the fetch resolves.

### Pitfall 3: Filtering paused cards in `assembleSession`
**What goes wrong:** Adds a field to `CardForSession`, breaks every existing test that constructs cards via `makeCard()`, and entangles engine purity with the new feature.
**Why it happens:** Looks like the "right place" if you forget the query layer exists.
**How to avoid:** Filter in `getStudyCards`. The engine sees a smaller list. Tests stay green.

### Pitfall 4: Mutating `lastStudiedAt` on unpause
**What goes wrong:** Analytics that compute time-since-last-study become wrong by the pause duration.
**Why it happens:** "Feels symmetric" to shift both timestamps.
**How to avoid:** CONTEXT explicitly says don't. Plan must not include `lastStudiedAt` in the unpause SET clause.

### Pitfall 5: Treating `pausedAt` as a boolean
**What goes wrong:** UI code does `if (card.pausedAt) ...` then later code wants the actual timestamp and re-fetches.
**Why it happens:** Habits.
**How to avoid:** Keep the type `Date | null` everywhere it crosses a boundary — including the `CardRow` shape in `deck-view.tsx`.

### Pitfall 6: `await headers()` omitted
**What goes wrong:** Type error in dev; runtime error in some Next 16 builds.
**Why it happens:** Sync `headers()` was valid pre-Next-15.
**How to avoid:** Every existing route in this codebase already does `await headers()`. Copy verbatim.

---

## Code Examples (verified pure references)

### Idempotent pause handler — full shape
See "Next.js 16.2 specifics" above. Mirrors `src/app/api/study/complete/route.ts` lines 50-93 for auth/rate-limit/ownership; mirrors `src/app/api/habitat/route.ts` line 24 for `await headers()`.

### Pure cooldown-shift function
See "Where to put `computeUnpauseUpdate`" above. Pattern matches `computeCardUpdate` (study-engine.ts lines 195-242): branded card types, takes a `now: Date`, returns a small typed object, zero I/O.

### Vitest test scaffold
```ts
// Append to src/lib/study-engine.test.ts
describe("computeUnpauseUpdate", () => {
  it("leaves NULL cooldown NULL", () => {
    const pausedAt = new Date("2026-01-10T00:00:00Z");
    const now = new Date("2026-01-15T00:00:00Z");
    expect(computeUnpauseUpdate(pausedAt, null, now)).toEqual({
      cooldownUntil: null,
      pausedAt: null,
    });
  });

  it("shifts future cooldown forward by exact pause duration", () => {
    const pausedAt = new Date("2026-01-10T00:00:00Z");
    const cooldownUntil = new Date("2026-01-11T00:00:00Z"); // due 1d after pause
    const now = new Date("2026-01-15T00:00:00Z"); // 5d after pause
    const result = computeUnpauseUpdate(pausedAt, cooldownUntil, now);
    expect(result.pausedAt).toBeNull();
    expect(result.cooldownUntil?.toISOString()).toBe("2026-01-16T00:00:00.000Z");
  });

  it("shifts past cooldown forward too (overdue card stays overdue by same amount)", () => {
    const pausedAt = new Date("2026-01-10T00:00:00Z");
    const cooldownUntil = new Date("2026-01-09T00:00:00Z"); // overdue by 1d at pause
    const now = new Date("2026-01-15T00:00:00Z");
    const result = computeUnpauseUpdate(pausedAt, cooldownUntil, now);
    expect(result.cooldownUntil?.toISOString()).toBe("2026-01-14T00:00:00.000Z");
  });

  it("zero-duration pause leaves cooldown unchanged", () => {
    const t = new Date("2026-01-10T00:00:00Z");
    const cooldown = new Date("2026-01-11T00:00:00Z");
    expect(computeUnpauseUpdate(t, cooldown, t).cooldownUntil?.toISOString())
      .toBe(cooldown.toISOString());
  });
});
```

### Playwright spec scaffold
```ts
// e2e/12-pause-cards.spec.ts
import { expect, test } from "playwright/test";
import { addWordsFromBrowser, signUpWithDeck } from "./helpers";

test.describe("Pause cards — Phase 12", () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithDeck(page, "French");
    await addWordsFromBrowser(page, 3);
  });

  test("pausing a card removes it from the session", async ({ page }) => {
    // Capture the front text of the first card
    const firstCardFront = await page.locator("table tbody tr").first().locator("td").first().textContent();
    // Click pause on the first card
    await page.locator("table tbody tr").first().getByLabel(/Pause/).click();
    // Badge appears
    await expect(page.getByText("Paused").first()).toBeVisible();
    // Start session — paused card never appears
    await page.getByRole("link", { name: "Start studying" }).click();
    await page.waitForURL(/\/study/);
    // (Assert the first card's front is never shown during the session)
  });

  test("unpausing restores the card", async ({ page }) => {
    await page.locator("table tbody tr").first().getByLabel(/Pause/).click();
    await expect(page.getByText("Paused").first()).toBeVisible();
    await page.locator("table tbody tr").first().getByLabel(/Resume|Unpause/).click();
    await expect(page.getByText("Paused")).toHaveCount(0);
  });
});
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom counter | `createRateLimiter` from `src/lib/rate-limit.ts` | Already battle-tested in v1.0/v2.0 |
| Session auth | Manual cookie parsing | `auth.api.getSession({ headers: await headers() })` | Better Auth handles it |
| SQL `WHERE pausedAt IS NULL` | Manual filter in JS | `isNull(cards.pausedAt)` from `drizzle-orm` | Lets the DB filter; smaller payload |
| Toast/error UX for the toggle | Custom error UI | Just disable button while pending via `useTransition`; on failure log and let `router.refresh()` re-fetch real state | Mirrors existing patterns; no new UX surface area |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params: { id: string }` (sync) | `params: Promise<{ id: string }>` (await it) | Next 15.0.0-RC | New routes in Phase 12 must use the async form; existing routes already do |
| `headers()` sync | `await headers()` | Next 15+ | Already adopted across this codebase |
| `revalidatePath` immediate UI refresh | `router.refresh()` for client-driven re-fetch | Always — `revalidatePath` from route handlers has always been "next visit" semantics | Clarifies intent for Phase 12's planner |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | All claims verified against installed code, Next docs in `node_modules`, or `package.json`. No `[ASSUMED]` entries. | — | — |

---

## Open Questions

1. **Rate limit window for pause/unpause: 10 or 30 per minute?**
   - What we know: CONTEXT suggested 10/min; `study/complete` uses 10/min for a much heavier endpoint.
   - What's unclear: How many cards a user might pause in a quick burst.
   - Recommendation: **30/min/user**. Cheap mutation, low-stakes endpoint, leaves headroom for legitimate burst use. Planner should confirm with user during plan review.

2. **"All paused" empty state — copy?**
   - What we know: When every card in a non-empty deck is paused, the existing `renderStudyButton()` returns `null` and the deck just shows a list of greyed-out rows with no call to action.
   - What's unclear: Exact copy ("All cards are paused — unpause one to study"? — a UX detail).
   - Recommendation: Planner picks copy; out of research scope.

3. **Tooltip / a11y copy for the icon button.**
   - What we know: `aria-label="Pause this card"` / `aria-label="Resume this card"` is the obvious default; matches the existing `aria-label="Edit card"` precedent on line 148.
   - What's unclear: Whether the user wants a hover-tooltip too.
   - Recommendation: Just `aria-label` + `title` (matches existing pencil edit pattern).

---

## Sources

### Primary (HIGH confidence) — installed files inspected end-to-end
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — route handler signature, async params
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md` — `[id]` convention, `RouteContext` helper
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` — "next visit" semantics from route handlers
- `node_modules/lucide-react/dist/esm/icons/{pause.js, play.js}` — icon names verified by directory listing
- `package.json` — all package versions
- `src/app/api/study/complete/route.ts` — pattern template (all 208 lines)
- `src/app/api/habitat/route.ts` — `await headers()` precedent
- `src/lib/study-engine.ts` — pure-function placement, `CardForSession` shape
- `src/lib/study-engine.test.ts` — Vitest pattern
- `src/lib/study-queries.ts` — filter site
- `src/lib/deck-queries.ts` — column propagation path
- `src/lib/rate-limit.ts` — limiter API
- `src/db/schema.ts` — cards table, branded types, line numbers for the insert
- `src/components/card-list.tsx` — UI insertion point (both desktop + mobile)
- `src/components/deck-view.tsx` — countdown wiring, CardRow shape
- `src/app/(protected)/dashboard/page.tsx` — data assembly path
- `src/app/(protected)/study/page.tsx` — session safe-from-race confirmation
- `drizzle/0000_*.sql`, `drizzle/0001_*.sql`, `drizzle/meta/_journal.json` — migration precedent
- `vitest.config.ts`, `playwright.config.ts`, `e2e/helpers.ts`, `e2e/06-study-session.spec.ts` — test infrastructure

### Secondary / Tertiary
- None used. Web search not needed; all answers came from the local source of truth.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified in `package.json`, no new installs.
- Architecture: HIGH — every line-number reference comes from a file read end-to-end this session.
- Pitfalls: HIGH — pulled from this codebase's own existing comments ("Pitfall 5" comment in `habitat/route.ts`, the no-tx comment in `study/complete/route.ts`) plus the official docs.

**Research date:** 2026-05-20
**Valid until:** 2026-06-19 (30 days; stable stack, no fast-moving deps in scope)

## RESEARCH COMPLETE
