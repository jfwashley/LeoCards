# Phase 27: Performance batch 2 - Research

**Researched:** 2026-07-22
**Domain:** Next.js 16 / React 19 App Router performance refactor — session caching, client bundle diet, RSC data-fetch consolidation, AI SDK model/streaming swap, Drizzle indexes, race-condition fix, memoization, LRU caching
**Confidence:** HIGH (every claim below was verified against this repo's installed `node_modules` source/types and current source files — not training data)

## Summary

This phase is 12 independent-but-related refactors against code that already exists and was re-scouted line-by-line during this research pass (all 12 target sites below were re-verified 2026-07-22 and match the line numbers/claims in `27-CONTEXT.md` and the source review doc). Nothing here is greenfield: every "standard stack" recommendation is "use the library/API already installed," not "add something new." Zero new npm packages are required for any of the 12 items.

The two highest-leverage, highest-risk items are item 8 (session caching — touches every protected route) and item 13 (extraction model/streaming swap — touches a spend-and-quality-sensitive AI call). Both have locked mitigations in `27-CONTEXT.md` (D-03/D-04 for session cache scope; D-05/D-06 for the Haiku trial + streaming threshold). The remaining 10 items are lower-risk, mechanical wins.

**Primary recommendation:** Sequence item 8 (session `cache()` + cookieCache) and item 12 (dashboard consolidation) together or item-8-first, since both touch the same files and item 8's `cache()` wrapper becomes the single session entry point item 12's dashboard page also calls (per `27-CONTEXT.md` Integration Points). Land item 15 (translation race, a correctness bug) and item 19 (LRU) in the same wave since both touch the translate client path. Item 18 (backdrop-blur removal) and item 14 (indexes) are trivial/isolated and can land any time. Item 13 (Haiku trial) should run its quality gate before deciding on streaming (D-06's 4s threshold), so it needs its own checkpoint-aware wave.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session lookup dedupe + cookie cache (item 8) | Frontend Server (SSR/RSC) | API / Backend (better-auth) | `cache()` dedupes within a Next.js Server Component render; `cookieCache` is a better-auth server-side session-config option that changes what the auth cookie carries |
| Optimistic pause toggle (item 9) | Browser / Client | API / Backend | Client-side optimistic state (`useState`/`useTransition`) is the mechanism; the POST to `/api/cards/[id]/pause` is unchanged |
| zod → zod/mini client diet (item 10) | Browser / Client | — | Pure client-bundle-size concern; server-side zod importers (API routes, server actions) are explicitly OUT of scope — swapping them has zero client-bundle benefit |
| Server-side Browse filtering (item 11) | Frontend Server (SSR/RSC) | — | `browse/page.tsx` is a Server Component; filtering before serializing the RSC payload is a pure server-tier change |
| Dashboard data-pass consolidation (item 12) | Frontend Server (SSR/RSC) | Database / Storage | Query consolidation happens in the Server Component page + its query-layer helpers (`src/lib/deck-queries.ts`, `src/lib/study-queries.ts`) |
| Extraction latency: Haiku + streaming (item 13) | API / Backend | Browser / Client (if streaming ships) | Model swap is a backend-only change; conditional streaming additionally touches the client's extraction UI (progressive review rows) |
| Secondary DB indexes (item 14) | Database / Storage | — | Pure schema/index change, applied via `drizzle-kit push` against the hosted Neon DB |
| Translation-form stale-response race (item 15) | Browser / Client | — | `AbortController` lives entirely in the client component's request lifecycle |
| CardList row memoization + deferred search (item 16) | Browser / Client | — | React rendering optimization, no server involvement |
| Study/complete read-path trim (item 17) | API / Backend | Database / Storage | `Promise.all` composition + derived-not-refetched facts inside the `/api/study/complete` route handler |
| Habitat backdrop-blur removal (item 18) | Browser / Client | — | Pure CSS property removal in client components |
| Translation LRU cache (item 19) | API / Backend | — | In-memory cache lives in the `/api/translate` route handler's module scope, same tier as the existing rate limiter |

## Standard Stack

### Core (all already installed — zero new packages)
| Library | Installed Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | 19.2.4 | `cache()` for item 8's session dedupe | `cache()` is React's own per-request memoization primitive; Next.js's own docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`) prescribe exactly this pattern for "fetch the same data more than once across layout+page" [CITED: node_modules/next/dist/docs] |
| `better-auth` | 1.5.6 | `session.cookieCache` config + `disableCookieCache` per-call bypass (items 8) | Built-in first-party session-cache mechanism; verified in installed source, not training data [VERIFIED: node_modules/better-auth source] |
| `zod` (via `zod/mini` subpath export) | 4.3.6 | Client-bundle diet for 9 client-side importers (item 10) | Same package, tree-shakeable subpath — zero new dependency, confirmed present at `node_modules/zod/mini` and in the package's `exports` map [VERIFIED: node_modules/zod/package.json] |
| `@hookform/resolvers` (`/zod` subpath) | 5.2.2 | `zodResolver` compatibility with zod/mini schemas (item 10, for `account-details-card.tsx` / `change-password-card.tsx`) | Its resolver source explicitly branches on `"_zod" in schema` and calls `zod/v4/core`'s generic `parse`/`parseAsync` — zod/mini schemas share this `_zod` core shape, so **no resolver code change is needed** [VERIFIED: node_modules/@hookform/resolvers/zod/dist/zod.js] |
| `ai` (Vercel AI SDK) | 6.0.185 | `streamObject` + `partialOutputStream` for item 13's conditional streaming | `partialOutputStream` is a real, non-deprecated property on the streaming result type (confirmed in `node_modules/ai/dist/index.d.ts`); the deprecated sibling is `experimental_partialOutputStream` — use the non-experimental name [VERIFIED: node_modules/ai/dist/index.d.ts] |
| `@ai-sdk/anthropic` | 3.0.78 | Model-id string swap only (item 13) | No API shape change needed — `anthropic("claude-haiku-4-5")` is a drop-in string swap for the existing `anthropic("claude-sonnet-4-6")` call |
| `drizzle-orm` | 0.45.1 | `index()` builder for item 14's 4 new indexes | Confirmed exported from `drizzle-orm/pg-core` with the array-based third-argument callback shape already used elsewhere in this schema file (see `milestones_seen`'s `unique(...)` pattern) [VERIFIED: node_modules/drizzle-orm/pg-core/indexes.d.ts] |
| `use-debounce` | 10.1.0 | Existing debounce hook `translation-form.tsx` already uses (item 15 composes `AbortController` alongside it, does not replace it) | Already installed and in use; item 15 does not need a new debounce library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled Map-based LRU for item 19 (recommended) | `lru-cache` npm package (present in `node_modules` as a **transitive** dependency only — not declared in `package.json`) | The existing rate limiter (`src/lib/rate-limit.ts`) is a ~40-line hand-rolled `Map`-based sliding window with a periodic-cleanup pattern; a translation LRU of comparable size (bounded Map + simple eviction) matches that established project convention and adds zero new direct dependencies, consistent with Phase 26's "zero new deps" precedent (26-04 decision log). Pulling in `lru-cache` directly would require adding it to `package.json` for a dependency that's currently only an indirect one. |
| `generateText` + `Output.object` (current, item 13 baseline) | `streamObject` + `partialOutputStream` (item 13, conditional on D-06) | `streamObject` requires the route handler to return a stream response (not a single JSON body) and the client extraction UI to consume progressive partial objects — a bigger client-side change than the model-id swap. Only ship if the Haiku median is still >~4s (D-06). |

**Installation:** None. All packages above are already declared in `package.json` and present in `node_modules`.

**Version verification:** Confirmed via direct `node_modules/*/package.json` reads (not `npm view`, since the goal here is "what's actually installed," which is more authoritative than registry latest for a research task scoped to an existing lockfile):
- `better-auth@1.5.6`, `zod@4.3.6`, `ai@6.0.185`, `@ai-sdk/anthropic@3.0.78`, `drizzle-orm@0.45.1`, `react@19.2.4`, `deepl-node@1.24.0`, `@hookform/resolvers@5.2.2`, `use-debounce@10.1.0` — all read directly from installed `package.json` files 2026-07-22.

## Package Legitimacy Audit

**No new packages are installed by this phase.** Every recommendation above reuses an already-installed, already-in-`package.json` dependency. The Package Legitimacy Gate protocol (slopcheck / registry verification) is not applicable — there is nothing new to audit.

**Packages removed due to slopcheck verdict:** none (nothing installed).
**Packages flagged as suspicious:** none.

## Architecture Patterns

### System Architecture Diagram (session-cache slice, item 8 — representative of the phase's shape)

```
Browser request (any protected route)
        │
        ▼
(protected)/layout.tsx ──┐
        │                │  both call the SAME cache()-wrapped
        ▼                │  getSession() function within one request
dashboard/page.tsx  ─────┤─────────────► React cache() dedupe boundary
study/page.tsx      ─────┤                       │
deck/browse/page.tsx ────┤                       ▼
deck/new-card/page.tsx ──┘              auth.api.getSession({ headers, query? })
                                                   │
                                    ┌──────────────┴──────────────┐
                                    ▼                             ▼
                     cookieCache hit (≤5 min old)      cookieCache miss/disabled
                     → decode signed cookie             → DB round trip (session table)
                     → NO database round trip            → re-signs a fresh cookie

/account page + its server actions (requestEmailChange, deleteAccount)
        │
        ▼
getSessionFresh() — SEPARATE cache()-wrapped fn, query:{disableCookieCache:true}
        │
        ▼
ALWAYS a DB round trip — never served from the 5-min-stale cookie (D-04)
```

### Recommended Project Structure (no new files/folders needed — all edits are in-place)
```
src/
├── lib/
│   ├── auth.ts              # add session.cookieCache config (item 8)
│   └── auth-session.ts      # NEW — cache()-wrapped getSession() + getSessionFresh() (planner's call on filename)
├── db/
│   └── schema.ts            # add index(...) to cards/decks/recall_events/session (item 14)
├── app/
│   ├── (protected)/
│   │   ├── layout.tsx       # switch to the new cached getSession()
│   │   ├── dashboard/page.tsx   # switch to cached getSession() + consolidate query pass (items 8+12)
│   │   ├── account/page.tsx     # switch to getSessionFresh() (item 8/D-04)
│   │   └── deck/browse/page.tsx # server-side filter before serializing (item 11)
│   ├── api/
│   │   ├── study/complete/route.ts  # Promise.all + derive factsAfter (item 17)
│   │   ├── translate/route.ts       # LRU cache wraps client.translateText (item 19)
│   │   └── extract/route.ts         # model swap + conditional streaming (item 13)
│   └── (auth)/*/page.tsx     # zod → zod/mini (item 10, 4 files)
├── components/
│   ├── translation-form.tsx  # AbortController per debounced fire (item 15); zod → zod/mini (item 10)
│   ├── card-list.tsx         # optimistic pause (item 9) + React.memo row + useDeferredValue (item 16)
│   ├── review-list.tsx       # zod → zod/mini (item 10)
│   ├── account-details-card.tsx    # zod → zod/mini (item 10)
│   ├── change-password-card.tsx    # zod → zod/mini (item 10)
│   ├── welcome/welcome-step-choose.tsx  # zod → zod/mini (item 10)
│   └── daybreak/
│       ├── h-prog-card.tsx   # drop backdrop-filter (item 18)
│       ├── h-back.tsx        # drop backdrop-filter (item 18)
│       └── h-mood-chip.tsx   # drop backdrop-filter (item 18)
└── components/habitat-scene.tsx  # drop backdrop-filter (item 18)
```

### Pattern 1: React `cache()` for per-request session dedupe (item 8)
**What:** Wrap the session-fetch function in `React.cache()` so every Server Component in one request (layout + page) shares one result.
**When to use:** Any RSC data fetch called from multiple components in the same route tree.
**Example (verified against installed `react` 19.2.4 + official Next.js docs shipped in this repo's `node_modules`):**
```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md
// ("Layouts cannot pass data to their children... use React cache to dedupe
// the requests without affecting performance")
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

// D-04's bypass variant — /account and its server actions ONLY.
// Verified: better-auth's getSessionQuerySchema accepts { disableCookieCache }
// (node_modules/better-auth/dist/cookies/session-store.mjs:193-196), and the
// route handler checks `!ctx.query?.disableCookieCache` before serving the
// cached cookie payload (node_modules/better-auth/dist/api/routes/session.mjs:97).
export const getSessionFresh = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
});
```
**Gotcha:** `cache()` keys on function *arguments*. A zero-argument wrapped function trivially dedupes across ALL call sites in one render pass — this is why the example above takes no parameters and reads `headers()` internally rather than accepting it as a param.

### Pattern 2: better-auth `cookieCache` config (item 8)
**What:** Enable server-signed cookie caching of the session payload so most `getSession()` calls skip the DB entirely.
**Verified config shape** (from `node_modules/@better-auth/core/dist/types/init-options.d.mts:800-822`):
```typescript
// Source: src/lib/auth.ts — add inside betterAuth({...})
export const auth = betterAuth({
  // ...existing config unchanged...
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 300, // 5 minutes, matches D-03's ~5-min TTL
      // strategy defaults to "compact" (base64url + HMAC-SHA256) — no
      // encryption needed since session payload here is non-sensitive
      // (user id / email / expiry), leave at default.
    },
  },
  // ...
});
```
**Important nuance:** `createAuthContext` in `node_modules/better-auth/dist/context/create-context.mjs:45-56` applies a DIFFERENT cookieCache default (`strategy: "jwe"`, `enabled: true`) automatically **only when `options.database` is undefined** (i.e., DB-less deployments). This project passes `database: drizzleAdapter(...)`, so that auto-default does NOT fire — the `session.cookieCache` block above must be added explicitly; it is not already implicitly on.

### Pattern 3: `disableCookieCache` per-call bypass (item 8/D-04)
**What:** Force a live DB read for a specific `getSession()` call even when `cookieCache.enabled` is true globally.
**Verified API** (from `node_modules/better-auth/dist/cookies/session-store.mjs:193-196`):
```typescript
// query.disableCookieCache is a z.coerce.boolean().optional() — pass it as
// a plain boolean in the query object when calling from a Server Component
// or Server Action (not a URL query string; auth.api.getSession accepts a
// typed `query` object directly).
await auth.api.getSession({
  headers: await headers(),
  query: { disableCookieCache: true },
});
```
**3 confirmed call sites needing this variant per D-04:** `src/app/(protected)/account/page.tsx:30`, `src/lib/account-actions.ts:64` (`requestEmailChange`), `src/lib/account-actions.ts:158` (`deleteAccount`).

### Pattern 4: zod/mini migration (item 10)
**What:** Swap `zod`'s method-chaining API for zod/mini's functional `.check()` composition API, importing from `zod/mini` instead of `zod`.
**Verified API delta** (from `node_modules/zod/src/v4/mini/checks.ts` + `node_modules/zod/src/v4/mini/schemas.ts`, cross-checked against zod's own docs):
```typescript
// BEFORE (full zod, method chaining)
import { z } from "zod";
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
});

// AFTER (zod/mini, functional .check() composition)
import * as z from "zod/mini";
const schema = z.object({
  name: z.string().check(z.minLength(1, "Name is required")),
  email: z.email("Please enter a valid email"), // z.email() is a top-level schema in v4/mini too
});
```
**9 confirmed client-side (`"use client"`) importers to convert:** `translation-form.tsx`, `review-list.tsx`, `welcome/welcome-step-choose.tsx`, `(auth)/login/page.tsx`, `(auth)/signup/page.tsx`, `(auth)/forgot-password/page.tsx`, `(auth)/reset-password/page.tsx`, `account-details-card.tsx`, `change-password-card.tsx` (all 9 verified `"use client"` via direct file read 2026-07-22).
**Do NOT convert (server-only, zero client-bundle benefit):** `api/debug/cheat/route.ts`, `api/debug/time-shift/route.ts`, `api/extract/route.ts`, `api/study/complete/route.ts`, `api/translate/route.ts`, `env.ts`/`env.test.ts`, `lib/account-actions.ts`, `lib/debug-cheat.ts` — these never ship to the browser; swapping them buys nothing and adds needless diff.
**`zodResolver` compatibility confirmed:** `account-details-card.tsx` and `change-password-card.tsx` both use `@hookform/resolvers/zod`'s `zodResolver`. Its installed source (`node_modules/@hookform/resolvers/zod/dist/zod.js`) detects zod/mini schemas via `"_zod" in schema` and dispatches to `zod/v4/core`'s generic parse functions — **no resolver-side change needed**, the same `zodResolver(schema)` call works unmodified once `schema` is built with `zod/mini`.

### Pattern 5: Server-side Browse filtering (item 11)
**What:** Filter the word list to the requested topic BEFORE it's serialized into the RSC payload, not after, on the client.
**Verified current state:** `browse/page.tsx:32-36` already validates `?topic=` against `CATEGORIES` (the WR-01 fix, confirmed present). The remaining win per `27-CONTEXT.md` is line 65's `categoryCounts` computation, which iterates `CATEGORIES.map(cat => filterWords(wordList.words, {category: cat}).length)` — this still holds the FULL `wordList.words` (~280 words) in the render tree/closure for count purposes even on the topic-detail (`BrowseList`) branch, where only that one topic's ~20 words are actually rendered. The fix: when `requestedTopic` is set, pass only the filtered subset to `BrowseList` (already partially true — verify `getWordList`/`filterWords` call ordering) and skip computing `categoryCounts` for the `BrowseList` branch entirely (it's only consumed by `BrowseTiles`, the topic-picker view).

### Pattern 6: `db.batch()` composition consistency (item 17 builds on 26-02's pattern)
**What:** The `Promise.all` opportunity in `/api/study/complete/route.ts` is READ-side (queries before the write), distinct from the already-shipped `db.batch()` WRITE-side consolidation (PERF-07/26-02).
**Verified current code (re-scouted 2026-07-22, matches 27-CONTEXT.md exactly):**
- Lines 135-147: ownership check (1 query)
- Lines 150-160: card load (1 query, depends on nothing from the ownership check except the early-return gate)
- Line 179: `getHabitatFacts(session.user.id)` — internally 2 parallel queries (confirmed in `src/lib/habitat-queries.ts:28-44`), independent of ownership/card-load results
- Line 298 (`factsAfter`): a SECOND full `getHabitatFacts` call — 2 more queries
**The fix, `Promise.all`-able waterfall:**
```typescript
// factsBefore has ZERO dependency on ownedDeck or cardRows — it only needs
// session.user.id, known before any of those queries run.
const [ownedDeckRows, cardRows, factsBefore] = await Promise.all([
  db.select({ id: decks.id }).from(decks).where(/* ... */),
  db.select({ id: cards.id, masteryRound: cards.masteryRound }).from(cards).where(/* ... */),
  getHabitatFacts(session.user.id as UserId),
]);
```
**`factsAfter` is fully derivable in JS, no second DB read needed:**
```typescript
// habitat_metadata.lastActivityAt after the write is deterministically `now`
// (the upsertHabitat batch item just set it). learnedCardCount after is
// factsBefore.learnedCardCount + count of cards whose masteryRound crossed
// the >=3 threshold this commit — computable from cardMap (before) + cardUpdates (after),
// both already in memory.
const crossedToLearned = cardUpdates.filter((u) => {
  const before = cardMap.get(u.cardId)?.masteryRound ?? 0;
  return before < 3 && u.newRound >= 3;
}).length;
const factsAfter: HabitatFacts = {
  userId: factsBefore.userId,
  lastActivityAt: now,
  learnedCardCount: factsBefore.learnedCardCount + crossedToLearned,
};
```
This eliminates 2 of the route's ~5-6 total round trips with zero behavior change (verified the source `getHabitatFacts` shape directly — no hidden fields beyond `userId`/`lastActivityAt`/`learnedCardCount`).

### Anti-Patterns to Avoid
- **Passing `headers()` as an explicit argument to the `cache()`-wrapped session function:** works, but is unnecessary — `headers()` itself already returns the same reference within one Next.js request; a zero-arg wrapped function is simpler and can't accidentally break dedupe if some caller passes a differently-constructed headers object.
- **Converting server-only zod importers to zod/mini:** zero bundle benefit (never shipped to browser), pure unnecessary diff — scope strictly to the 9 confirmed client components.
- **Adding a new `lru-cache` dependency for item 19:** unnecessary given the existing hand-rolled rate-limiter precedent in this exact codebase; a same-shape hand-rolled bounded Map is simpler, matches D-09's "same deployment assumptions as the existing rate limiter," and avoids promoting a currently-transitive dependency to direct.
- **Re-fetching `getHabitatFacts` for `factsAfter`:** the whole point of item 17 is that this is derivable — re-fetching defeats the optimization.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session-level request dedupe | A custom module-scope memoization Map keyed by request | React's `cache()` | It's the framework-blessed primitive for exactly this, explicitly documented in this repo's own installed Next.js docs; a hand-rolled version risks leaking across requests (no automatic per-request scoping) |
| Cross-request session caching | A custom signed-cookie scheme | better-auth's `session.cookieCache` | Already implements HMAC-signed compact/JWT/JWE encoding with configurable TTL and a documented bypass API — reinventing this is a security-sensitive undertaking with no upside |
| Client-side form validation for a tree-shakeable bundle | Hand-rolled regex/manual validators to avoid zod's size | `zod/mini` | Same validation semantics and error messages as full zod, official tree-shakeable build, zero new dependency |
| Progressive AI extraction UI | A custom SSE/chunked-JSON parser | `ai` SDK's `streamObject` + `partialOutputStream` | Handles partial-JSON parsing, backpressure, and error propagation; a hand-rolled parser for partial JSON is a well-known footgun (mid-token truncation, schema validation timing) |

**Key insight:** every "don't hand-roll" item above already has a first-party, already-installed answer in this codebase. This phase's entire job is "use what's there correctly," not "pick a new library."

## Common Pitfalls

### Pitfall 1: `cache()` dedup silently breaks if the wrapped function's args aren't stable
**What goes wrong:** If a future call site passes a freshly-constructed object (e.g., re-reading `headers()` into a new plain object) instead of relying on the zero-arg pattern, `cache()` treats it as a cache miss and the dedupe silently stops working — with no error, just a quiet return to the old N-round-trips behavior.
**Why it happens:** `cache()` does reference/shallow-equality keying on its arguments, not deep equality.
**How to avoid:** Keep the wrapped function zero-argument (read `headers()` internally); never accept a caller-constructed headers-like object as a cache key.
**Warning signs:** A `db.batch()` call-count test for item 8's dedupe (mirroring 26-02's `batchCalls===1` proof style) that doesn't drop below the pre-change baseline.

### Pitfall 2: cookieCache revocation lag interacting with existing security-sensitive flows
**What goes wrong:** `revokeOtherSessions` (change-password, Phase 25) and `deleteAccount` (Phase 25) invalidate a session server-side, but a device holding a still-valid (≤5-min-old) cached cookie will keep behaving as "signed in" until the cache TTL expires.
**Why it happens:** This is exactly D-03's accepted trade-off, not a bug — but it's easy to forget which paths are exempt.
**How to avoid:** D-04 already scopes the fix — `/account` and its 2 server actions (`requestEmailChange`, `deleteAccount`) use `getSessionFresh()` (disableCookieCache), so THOSE specific mutation paths always see a live session. Everywhere else, the up-to-5-min lag is accepted per D-03. Do not silently widen or narrow this list without a checkpoint — it was a discussed security trade-off, not an implementation detail.
**Warning signs:** A test that deletes an account then immediately hits `/account` on the SAME (evicted) session and expects a rejection — this must pass; if it doesn't, `getSessionFresh()` isn't wired correctly.

### Pitfall 3: zod/mini's `.check()` composition looks similar to `.refine()` but is not the same escape hatch
**What goes wrong:** Custom cross-field validation (e.g., `change-password-card.tsx`'s `confirmNewPassword === newPassword` check, if using `.refine()` on the object) needs to be re-verified — zod/mini supports `.refine()` on object schemas the same way, but composed single-field checks use `.check()`, not chained methods. Mixing the two APIs (importing from `"zod"` in one place and `"zod/mini"` in another within the same schema) produces a type mismatch, not a runtime crash — easy to miss in a quick visual diff.
**Why it happens:** Both packages export a `z` namespace with overlapping-looking APIs; an incomplete find-and-replace (e.g., missing one `import { z } from "zod"` in a shared schema file) silently keeps using full zod for that one import while everything else uses mini, inflating the bundle by exactly the amount the migration was meant to cut.
**How to avoid:** After conversion, grep the 9 target files for `from "zod"` (not `"zod/mini"`) to confirm zero stragglers; check the actual bundle output (`next build` chunk sizes) rather than trusting the source diff alone.
**Warning signs:** `next build`'s first-load JS for `/signup`, `/login`, etc. not shrinking by the expected ~44KB+ ballpark cited in the source review.

### Pitfall 4: the translation-form race fix must not break the EXISTING field-switch guard
**What goes wrong:** `translation-form.tsx`'s `translateFrom` already has an `activeField.current === direction` check that guards against a DIFFERENT race (user typed in the native field, then switched to the target field before the native translation resolved). This guard does NOT protect against the SAME-field, different-keystroke race that item 15 targets (verified: a slow "cha" response completing after a faster "chat" response for the SAME `direction` passes the existing check because `activeField.current` hasn't changed). The `AbortController` fix must compose with — not replace — this existing guard.
**Why it happens:** Two different races with overlapping symptoms (both look like "wrong translation appears") but different root causes and different existing mitigations.
**How to avoid:** Store one `AbortController` ref per direction-switch cycle (or simply one ref, aborted+recreated on every new `translateFrom` call regardless of direction, since only one field is realistically being typed into at a time); call `controller.abort()` at the START of each new `translateFrom` invocation before issuing the new `fetch`; pass `{ signal: controller.signal }` to `fetch`; treat `AbortError` as a silent no-op (not a user-visible "Translation unavailable" error).
**Warning signs:** A test that fires two translations for the SAME direction with reordered response timing (slow-first, fast-second) and asserts only the fast (later-fired) result lands.

### Pitfall 5: `db.batch()` / index migration order for item 14
**What goes wrong:** `drizzle-kit push` reads `DATABASE_URL` from `process.env` — it does NOT auto-load `.env.local` the way `next dev` does. Running `npm run db:push` in a shell that hasn't explicitly exported `DATABASE_URL` will either fail or (worse) silently target a different/empty database if some other `DATABASE_URL` happens to be set in the environment.
**Why it happens:** `next.config`/Next's dev server has its own `.env.local` loader; `drizzle-kit` is a standalone CLI with no knowledge of Next's env conventions (documented in `drizzle.config.ts`'s bare `process.env.DATABASE_URL!` read).
**How to avoid:** Explicitly export/pass `DATABASE_URL` in the same shell invocation as `npm run db:push` (this is the existing project convention per 26-05's decision log and 17-CONTEXT.md D-09/17-02's `MSYS_NO_PATHCONV` env-passing note for this same Windows/Git-Bash environment).
**Warning signs:** `db:push` reporting "no changes detected" against a DB that clearly doesn't have the new indexes yet — a strong signal it connected to the wrong instance (or none).

### Pitfall 6: extraction model swap invalidates cached eval expectations if response SHAPE (not just speed/cost) shifts
**What goes wrong:** Haiku 4.5 is described (per Anthropic's own announcement) as "similar levels of coding performance to Claude Sonnet 4... at one-third the cost and more than twice the speed" for coding tasks — vision/OCR-style word-extraction quality parity is NOT the same claim and isn't guaranteed by that framing. D-05 already anticipates this ("Revert to claude-sonnet-4-6 if extraction quality measurably drops") but the mechanism for detecting a drop matters: `extract-eval.test.ts`'s existing assertions check structural/schema conformance, not necessarily per-word extraction accuracy against real photos (the Phase 10 offline vision eval reference-set is flagged as incomplete carried debt in D-05 itself).
**Why it happens:** A faster/cheaper model swap is easy to verify for latency and hard to verify for subjective extraction quality without the manual side-by-side D-05 explicitly calls for.
**How to avoid:** Treat the existing eval test suite as a necessary-but-not-sufficient gate (schema/shape conformance); budget the manual side-by-side on real photos as a required human step before considering item 13 "done," exactly as D-05 states.
**Warning signs:** All automated tests green, but the manual side-by-side hasn't actually happened — this is a `checkpoint:human-verify` candidate, not a fully-autonomous task.

## Code Examples

### Item 14: verified `index()` syntax for this drizzle-orm version
```typescript
// Source: node_modules/drizzle-orm/pg-core/indexes.d.ts (verified 0.45.1 API)
// This project's existing array-callback third-argument convention (see
// milestones_seen's `unique(...)` usage) extends directly to index():
import { index, pgTable, text, timestamp, /* ... */ } from "drizzle-orm/pg-core";

export const cards = pgTable(
  "cards",
  { /* ...existing columns unchanged... */ },
  (table) => [
    index("cards_deckId_idx").on(table.deckId),
  ],
);

export const decks = pgTable(
  "decks",
  { /* ...existing columns unchanged... */ },
  (table) => [
    index("decks_userId_idx").on(table.userId),
  ],
);

export const recall_events = pgTable(
  "recall_events",
  { /* ...existing columns unchanged... */ },
  (table) => [
    index("recall_events_cardId_idx").on(table.cardId),
  ],
);

export const session = pgTable(
  "session",
  { /* ...existing columns unchanged... */ },
  (table) => [
    index("session_userId_idx").on(table.userId),
  ],
);
```
Note: `session` is better-auth's own table, but it's declared as a plain `pgTable` in THIS project's `src/db/schema.ts` (drizzle-adapter reads the app's own schema, per the file's own header comment "Generated by inspecting @better-auth/core/db getAuthTables") — adding an index here is safe and standard, no better-auth-side config needed.

### Item 19: hand-rolled LRU shape matching the existing rate-limiter convention
```typescript
// Source: pattern mirrors src/lib/rate-limit.ts's existing Map-based,
// single-instance-deployment style (item 19's discretion note: "same
// single-instance deployment assumptions as the existing rate limiter")
// Illustrative only — planner/executor finalize exact size/TTL/key shape.
interface LruEntry {
  value: string;
  expiresAt: number;
}

export function createTranslationCache(opts: { maxSize: number; ttlMs: number }) {
  const store = new Map<string, LruEntry>(); // Map preserves insertion order — cheap LRU via delete+re-set on hit

  function key(text: string, sourceLang: string, targetLang: string) {
    return `${sourceLang}:${targetLang}:${text}`;
  }

  return {
    get(text: string, sourceLang: string, targetLang: string): string | undefined {
      const k = key(text, sourceLang, targetLang);
      const entry = store.get(k);
      if (!entry || entry.expiresAt < Date.now()) {
        store.delete(k);
        return undefined;
      }
      store.delete(k);
      store.set(k, entry); // bump to most-recently-used
      return entry.value;
    },
    set(text: string, sourceLang: string, targetLang: string, value: string) {
      const k = key(text, sourceLang, targetLang);
      store.delete(k);
      if (store.size >= opts.maxSize) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(k, { value, expiresAt: Date.now() + opts.ttlMs });
    },
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `experimental_partialOutputStream` | `partialOutputStream` | Present in installed `ai@6.0.185` (deprecation already landed by this version) | Use the non-experimental name; the experimental alias still works but is marked `@deprecated` in the shipped types |
| Full `zod` for trivial client-side validation | `zod/mini` subpath for tree-shaking | zod v4 (already the installed major version) | ~44KB+ savings across 9 client entry points per the source review's estimate — not independently re-measured in this research pass, treat as directional until confirmed by an actual `next build` bundle diff |

**Deprecated/outdated:** none of the APIs this phase touches are themselves deprecated in the installed versions — this phase is adopting current-generation APIs (`cache()`, `cookieCache`, `zod/mini`, `partialOutputStream`, drizzle `index()`), not replacing deprecated ones.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `claude-haiku-4-5` is a valid, current Anthropic model id compatible with `@ai-sdk/anthropic@3.0.78`'s `anthropic()` provider function, with vision/OCR quality broadly comparable to `claude-sonnet-4-6` for this task | Standard Stack, Pattern (item 13) | If the id is wrong or vision quality is materially worse than assumed, the D-05 quality gate (existing evals + manual side-by-side) catches it before merge — but the model-id string itself is `[ASSUMED]` from WebSearch (Anthropic's own announcement + AWS Bedrock docs), not confirmed by an actual API call in this research session (no `ANTHROPIC_API_KEY`-backed live test was run) |
| A2 | The zod/mini bundle-size delta (~44KB+ across 9 importers) claimed in the source review doc holds for THIS project's exact schema shapes | Standard Stack / State of the Art | If the actual saving is smaller (e.g., other shared chunks already pull in full zod for a server-only reason that leaks into client bundles), the effort may be lower-value than estimated — verify with an actual before/after `next build` chunk diff, don't take the number on faith |
| A3 | `streamObject` + `partialOutputStream` is the correct migration path for item 13's CONDITIONAL streaming (vs. some other AI SDK v6 streaming primitive) | Pattern 13 / Standard Stack | If D-06's threshold fires and a different streaming API is actually the better fit for this specific route's needs (e.g., a raw `fullStream` consumption instead), the planner should re-verify `streamObject`'s exact partial-object emission cadence against a real Haiku call before locking the client-side consumption code — this was verified via TYPE DEFINITIONS only, not a live streaming call in this research session |

## Open Questions

1. **Does `browse/page.tsx`'s `getWordList`/`filterWords` call sequence need restructuring, or just a smaller `categoryCounts` computation?**
   - What we know: `?topic=` is already validated (WR-01); `BrowseList` (topic-detail view) is passed the FULL `wordList.words` today, and filtering happens client-side inside `BrowseList`/`filterWords` usage.
   - What's unclear: whether `getWordList` itself can be filtered server-side by category cheaply (it may already be a static in-memory wordlist lookup, in which case "filtering server-side" just means slicing the array before the `<BrowseList words={...} />` prop, not touching the data-fetch call at all) or whether `getWordList` does file I/O per call that a topic-scoped variant could skip.
   - Recommendation: planner/executor re-read `src/lib/wordlist.ts`'s `getWordList` implementation before writing the item 11 plan — this research pass confirmed the validation and prop-threading shape but did not fully trace `getWordList`'s internals.

2. **Exact streaming response wiring for item 13 if D-06's 4s threshold fires.**
   - What we know: `streamObject` + `partialOutputStream` is the right AI SDK primitive (verified in types); the route currently returns a single `Response.json({...})`.
   - What's unclear: how the route handler should shape the HTTP response for a streaming object (NDJSON? AI SDK's own stream-response helper? SSE?) and how `review-list.tsx`'s client-side extraction flow should consume it to populate "review rows progressively" — this is real UI/wiring work, not just an API swap, and needs its own design pass at plan time IF the Haiku median measured in-phase actually exceeds ~4s.
   - Recommendation: do not pre-build streaming plumbing speculatively — D-06 is explicitly threshold-gated. Measure Haiku's median first; only then design the streaming wiring.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | All items (build, test) | ✓ | (project-standard, unchanged this phase) | — |
| Neon hosted DB (`DATABASE_URL`) | Item 14 (`db:push`), all DB-touching items | ✓ (per D-08, gated on Josh's explicit authorization at execution time) | — | — |
| `ANTHROPIC_API_KEY` | Item 13 (Haiku trial + manual side-by-side) | Not verified in this research session (no live API call made) | — | If unset, `/api/extract` already 503s gracefully (existing D-03 guard in `route.ts`) — item 13's code changes are still verifiable via the existing eval test suite's mocked model path |
| `DEEPL_API_KEY` | Item 19 (LRU sits in front of existing DeepL calls) | Not verified in this research session | — | Existing route already 503s gracefully if unset; unaffected by this phase's changes |

**Missing dependencies with no fallback:** none identified — this phase touches no dependency this project doesn't already have a graceful-degradation path for.
**Missing dependencies with fallback:** `ANTHROPIC_API_KEY`/`DEEPL_API_KEY` live-key availability wasn't probed this session (no test call made to avoid burning quota during research); both already have existing 503 guards.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit/component) + Playwright (e2e) |
| Config file | `vitest.config.ts`, `playwright.config.ts` (both present at repo root) |
| Quick run command | `npx vitest run <path-to-file>` (scoped) |
| Full suite command | `npm run test` (vitest full) + `npm run test:e2e` (Playwright full) |

### Phase Requirement → Test Map
| Req ID (minted at plan time) | Item | Behavior | Test Type | Automated Command | File Exists? |
|--------|------|----------|-----------|-------------------|-------------|
| PERF-12 | 8 | Session lookup deduped within one request; `/account` bypasses cache | unit (round-trip/call-count assertion per D-09, NEVER a timing gate) | `npx vitest run src/lib/__tests__/auth-session.test.ts` (new) | ❌ Wave 0 |
| PERF-13 | 9 | Pause toggle flips icon before the POST resolves; rollback on error; trailing-refresh coalesced | component (existing pattern) | `npx vitest run src/components/card-list.test.tsx` | ✅ (extend existing file) |
| PERF-14 | 10 | All 9 client bundles still validate correctly with zod/mini; bundle size measurably smaller | unit (existing form-validation tests) + manual bundle-size check | `npx vitest run` (scoped to the 9 files' existing tests) + `npm run build` chunk inspection | ✅ (existing tests), bundle-size check is manual/informal per D-09 |
| PERF-15 | 11 | `?topic=` view serializes only the filtered subset, not all 280 words | unit (payload-size or filtered-array-length assertion) | `npx vitest run` (new test for browse page's data-shaping, or e2e payload check) | ❌ Wave 0 (no `browse/page.test.ts` exists today) |
| PERF-16 | 12 | Dashboard issues ONE query for card data (not two + O(n²) stitch); `createdAt` dropped from the wire payload | unit (query-call-count assertion, mirroring 26-02's `batchCalls===1` style) | `npx vitest run` (new test for dashboard's query layer) | ❌ Wave 0 |
| PERF-17 | 13 | Haiku swap passes existing eval expectations; streaming ships ONLY if median >~4s | existing eval test + manual side-by-side (human-verify) | `npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts` | ✅ (existing), manual step is NOT automatable |
| PERF-18 | 14 | 4 new indexes exist on the hosted Neon DB | schema/introspection check (not a runtime test — verify via `db:push` output or a direct `information_schema` query) | `DATABASE_URL=... npm run db:push` (checkpoint-gated per D-08) | N/A (infra check, not a vitest file) |
| PERF-19 | 15 | Slow-first/fast-second same-direction responses: only the later-fired result lands | unit (fetch-mock with reordered resolve timing + AbortController spy) | `npx vitest run src/components/translation-form.test.tsx` (new) | ❌ Wave 0 (no dedicated test file exists today) |
| PERF-20 | 16 | Row re-render count doesn't scale with keystroke count; rows don't mount until accordion tween ends | component (render-count assertion via `React.memo` spy or render-count instrumentation) | `npx vitest run src/components/card-list.test.tsx` | ✅ (extend existing file) |
| PERF-21 | 17 | `/api/study/complete` issues fewer total DB round trips; `factsAfter` matches a live-fetch equivalent value | unit (query-call-count assertion + a fixture-based factsAfter-equals-derived assertion) | `npx vitest run src/app/api/study/complete/route.test.ts` | ✅ (extend existing file) |
| PERF-22 | 18 | No `backdropFilter` CSS property remains in the 4 target files | unit (string/snapshot assertion, or a simple grep-based lint check) | `npx vitest run` (existing component tests) + visual check per D-01's e2e/visual gate | ✅ (existing component test files, extend for the CSS assertion) |
| PERF-23 | 19 | Repeated identical translation requests hit the cache, not DeepL, on the 2nd+ call | unit (mock DeepL client call-count assertion) | `npx vitest run src/app/api/translate/__tests__/route.test.ts` | ✅ (extend existing file) |

### Sampling Rate
- **Per task commit:** scoped `npx vitest run <file>` for the file(s) just touched
- **Per wave merge:** full `npm run test` (vitest) + the relevant e2e specs (`e2e/12-pause-cards.spec.ts` for item 9/16, `e2e/03-word-list-browser.spec.ts` for item 11, `e2e/06-study-session.spec.ts` + `study-progression.spec.ts` for item 17, `e2e/07-habitat-display.spec.ts` + `e2e/13-habitat-states.spec.ts` for item 18)
- **Phase gate:** full `npm run test` + full `npm run test:e2e` green, plus `npm run qa:run` (per D-09/17-D-10 precedent, since items 8/12/17 touch session/dashboard/study-complete paths) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/auth-session.test.ts` — covers PERF-12 (session dedupe call-count + `/account` bypass)
- [ ] A dedicated dashboard query-layer test (new or extending `src/lib/deck-queries.ts`'s existing test file, if any — none was found this session) — covers PERF-16
- [ ] `src/components/translation-form.test.tsx` — covers PERF-19 (no existing test file for this component was found)
- [ ] A dedicated browse-page data-shaping test — covers PERF-15
- [ ] Framework install: none — vitest/Playwright already fully configured; these are new test FILES, not new tooling

## Security Domain

`security_enforcement` is not explicitly set in `.planning/config.json` — treated as enabled per the default-enabled rule. This phase is a performance refactor, not a new-feature phase, so most ASVS categories are unaffected; the one live security-relevant surface is item 8's session-cache TTL.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (item 8 only) | better-auth's own session/cookie mechanism — this phase changes CACHING behavior around an already-shipped auth system, not the authentication mechanism itself |
| V3 Session Management | Yes (item 8) | `session.cookieCache` with an explicit, bounded TTL (5 min per D-03) + a documented, narrow-scoped bypass (`disableCookieCache`) for the 3 sensitive `/account` call sites (D-04) — this is a deliberate, discussed trade-off (D-03), not an oversight |
| V4 Access Control | No change | Existing ownership checks (`decks.userId === session.user.id`, etc.) in `/api/study/complete` and elsewhere are untouched by items 12/17's query consolidation — verify at plan/review time that the consolidated queries still carry the same `WHERE userId = ...` / `WHERE deckId = ...` guards, just fewer round trips |
| V5 Input Validation | Yes (item 10, item 19) | zod/mini preserves the same validation semantics as full zod (same underlying `_zod` core) — item 10 is a bundle-size change, not a validation-strictness change; item 19's cache key must not be attacker-controllable in a way that causes cache poisoning (key is `sourceLang:targetLang:text`, all already-validated inputs per the existing `RequestSchema` in `/api/translate/route.ts`) |
| V6 Cryptography | Indirect (item 8) | better-auth's `cookieCache.strategy` (default `"compact"`, HMAC-SHA256-signed) is a first-party, already-vetted mechanism — do not hand-roll signing/encoding |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale-session privilege persistence after revocation | Elevation of Privilege / Information Disclosure | D-03's bounded 5-min TTL + D-04's bypass on the 3 mutation-capable `/account` paths keeps the exposure window small and explicitly scoped — do not widen the cache to cover those 3 paths |
| Translation cache poisoning via crafted input | Tampering | The LRU cache key is built from already-`RequestSchema`-validated `text`/`sourceLang`/`targetLang` values (bounded length, enum langs) — no new unvalidated input surface is introduced by item 19 |
| DeepL quota/cost amplification via cache miss flooding | Denial of Service (of the DeepL quota, not the app) | The existing 30/min per-user rate limiter (item 19's discretion note explicitly shares its "same deployment assumptions") already bounds request volume per user regardless of cache hit rate |

## Sources

### Primary (HIGH confidence — read directly from this repo's installed packages/source)
- `node_modules/better-auth/dist/cookies/session-store.mjs` — `getSessionQuerySchema` (`disableCookieCache`, `disableRefresh`)
- `node_modules/better-auth/dist/api/routes/session.mjs` — cookie-cache read/write gating logic, `ctx.query.disableCookieCache` check
- `node_modules/better-auth/dist/context/create-context.mjs` — DB-less-only auto-default for `cookieCache`, confirms explicit config needed here
- `node_modules/@better-auth/core/dist/types/init-options.d.mts` — `session.cookieCache` type shape (`maxAge`, `enabled`, `strategy`)
- `node_modules/react`'s `cache` export (React 19.2.4, confirmed via `require('react').cache` and `@types/react/index.d.ts:1978`)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md` — official Next.js guidance to use React `cache()` for layout+page data dedup
- `node_modules/zod/package.json` exports map + `node_modules/zod/src/mini/index.ts` + `node_modules/zod/src/v4/mini/checks.ts` + `schemas.ts` — zod/mini's `.check()`/`minLength`/`email` API surface
- `node_modules/@hookform/resolvers/zod/dist/zod.js` — confirmed zodResolver's `_zod`-core detection works generically for zod/mini schemas
- `node_modules/ai/dist/index.d.ts` — `partialOutputStream` (current) vs `experimental_partialOutputStream` (deprecated), `streamObject`/`generateObject` signatures
- `node_modules/drizzle-orm/pg-core/indexes.d.ts` — `index()`/`uniqueIndex()` builder API for installed drizzle-orm 0.45.1
- Direct reads of all 12 target source files (`src/lib/auth.ts`, `src/app/(protected)/layout.tsx`, `src/app/(protected)/dashboard/page.tsx`, `src/app/(protected)/deck/browse/page.tsx`, `src/lib/deck-queries.ts`, `src/lib/study-queries.ts`, `src/app/api/extract/route.ts`, `src/db/schema.ts`, `src/components/translation-form.tsx`, `src/components/card-list.tsx`, `src/components/word-list-browser.tsx`, `src/app/api/study/complete/route.ts`, `src/lib/habitat-queries.ts`, `src/components/daybreak/h-prog-card.tsx`/`h-back.tsx`/`h-mood-chip.tsx`, `src/components/habitat-scene.tsx`, `src/app/api/translate/route.ts`, `src/lib/rate-limit.ts`, `src/lib/account-actions.ts`) — all re-confirmed against current code 2026-07-22, matching `27-CONTEXT.md`'s claims

### Secondary (MEDIUM confidence — WebSearch cross-verified with an official source)
- Anthropic's own `claude-haiku-4-5` announcement (anthropic.com/news) + AWS Bedrock model-card docs — the model id and general performance framing are corroborated by 2 independent sources, but vision/OCR-specific quality parity with `claude-sonnet-4-6` is NOT independently confirmed (flagged as A1 in Assumptions Log)

### Tertiary (LOW confidence)
- None — every claim in this document was either read directly from installed source/types or cross-verified against an official announcement/docs page.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package/API surface was read directly from installed `node_modules` source or type declarations, not recalled from training data
- Architecture: HIGH — all 12 target sites re-verified against current source 2026-07-22, matching `27-CONTEXT.md`'s existing-code-insights claims exactly
- Pitfalls: HIGH for items 8/10/14/15/17 (grounded in direct source reads); MEDIUM for item 13 (model-id existence confirmed via WebSearch, but vision-quality parity is genuinely unverifiable without a live API call — correctly flagged as an assumption, not asserted as fact)

**Research date:** 2026-07-22
**Valid until:** 2026-08-21 (30 days — this is a stable-stack refactor phase against packages already pinned in this project's lockfile; the only fast-moving piece is Anthropic's model catalog, already flagged as an assumption to re-verify at execution time if there's any gap between research and execution)
