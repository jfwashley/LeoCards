# Phase 27: Performance batch 2 - Pattern Map

**Mapped:** 2026-07-22
**Files analyzed:** 24 (source) + 4 (new Wave-0 test files)
**Analogs found:** 24 / 24 (all have at least a role-match; several are pure in-place edits with the "analog" being the file's own current code)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/auth-session.ts` (NEW) | utility (session accessor) | request-response | `src/lib/rate-limit.ts` (module-scope singleton factory convention) + Next.js docs `cache()` pattern | role-match (no existing `cache()` usage anywhere in repo — greenfield primitive, doc-sourced) |
| `src/lib/auth.ts` | config | request-response | itself (in-place edit — add `session.cookieCache` block) | exact (self) |
| `src/app/(protected)/layout.tsx` | middleware (route guard) | request-response | itself (in-place edit — swap `auth.api.getSession` for cached `getSession()`) | exact (self) |
| `src/app/(protected)/dashboard/page.tsx` | controller (RSC page) | CRUD (read) | itself (in-place edit — items 8+12) | exact (self) |
| `src/app/(protected)/account/page.tsx` | controller (RSC page) | request-response | `dashboard/page.tsx`'s `if (!session) return null` defensive-fallback convention (25-PATTERNS.md, cited in the file's own header comment) | exact |
| `src/lib/account-actions.ts` (`requestEmailChange`, `deleteAccount`) | service (server actions) | request-response | itself (in-place edit — swap `auth.api.getSession` calls for `getSessionFresh()`) | exact (self) |
| `src/components/card-list.tsx` (item 9: optimistic pause) | component | event-driven | `src/components/word-list-browser.tsx`'s `BrowseList` optimistic-Set machine (lines 562-649) | exact |
| `src/components/card-list.tsx` (item 16: row memo + deferred search) | component | transform | `src/components/word-list-browser.tsx`'s `BWWordRow` (`React.memo`, lines 138-146, 295) | exact |
| `src/components/translation-form.tsx` (item 10: zod/mini) | component | request-response | `src/app/(auth)/signup/page.tsx` (zod schema + zodResolver client convention, lines 3,8,15-21) | role-match (client-schema shape, not zodResolver — translation-form uses a bare `z.object` response-schema parse, not a form resolver) |
| `src/components/translation-form.tsx` (item 15: AbortController race fix) | component | request-response | itself (in-place edit — `translateFrom`, lines 238-280) | exact (self) |
| `src/components/review-list.tsx` (item 10: zod/mini) | component | transform | `src/app/(auth)/signup/page.tsx` (client zod convention) | role-match |
| `src/components/welcome/welcome-step-choose.tsx` (item 10) | component | request-response | `src/app/(auth)/signup/page.tsx` | role-match |
| `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` (item 10) | component (form page) | request-response | `signup/page.tsx` is itself the reference; the other 3 mirror its `zodResolver(schema)` + `z.object({...})` shape | exact (signup is canonical; others copy it) |
| `src/components/account-details-card.tsx` (item 10) | component | request-response | `signup/page.tsx` (same `zodResolver` + `z.object` shape, confirmed lines 3,7,19-22,80-83) | exact |
| `src/components/change-password-card.tsx` (item 10) | component | request-response | `account-details-card.tsx` (sibling account-section form, same zodResolver convention) | exact |
| `src/app/(protected)/deck/browse/page.tsx` (item 11) | controller (RSC page) | CRUD (read) | itself (in-place edit — `categoryCounts` computation, line 64-69, and prop-threading to `BrowseList`/`BrowseTiles`) | exact (self) |
| `src/lib/deck-queries.ts` / `src/lib/study-queries.ts` (item 12 consolidation) | service (query layer) | CRUD (read) | `dashboard/page.tsx`'s existing `Promise.all` composition (lines 205-209) is the in-repo convention to extend | role-match |
| `src/app/api/extract/route.ts` (item 13) | controller (API route) | request-response | itself (in-place edit — model id at line 164) + `src/app/api/translate/route.ts` (auth/rate-limit/error-handling skeleton, lines 40-58, 114-126) for the streaming-branch shape if D-06 fires | exact (self) for the swap; role-match (translate route) for streaming-branch error handling |
| `src/db/schema.ts` (item 14: 4 new indexes) | model (Drizzle schema) | CRUD | `milestones_seen`'s existing `unique(...)` array-callback third-argument convention (lines 127-143) | exact (same builder shape, `index()` instead of `unique()`) |
| `src/app/api/study/complete/route.ts` (item 17) | controller (API route) | CRUD (batch write + read consolidation) | itself (in-place edit — `factsBefore`/`factsAfter` at lines 179/298); its own `db.batch()` write-side (lines 228-291, PERF-07/26-02) is the sibling pattern for "atomic, single-round-trip" thinking applied to the read side | exact (self) |
| `src/components/daybreak/h-prog-card.tsx`, `h-back.tsx`, `h-mood-chip.tsx`, `src/components/habitat-scene.tsx` (item 18) | component | transform (pure CSS) | each other (all 4 share the identical `backdropFilter: "blur(Npx)"` inline-style property to delete) | exact (self-referential group) |
| `src/app/api/translate/route.ts` (item 19: LRU cache) | controller (API route) | CRUD (cache read-through) | `src/lib/rate-limit.ts` (Map-based, single-instance, periodic-cleanup convention, lines 1-66) | exact |

## Pattern Assignments

### `src/lib/auth-session.ts` (NEW) — utility, request-response

**Analog:** No direct in-repo analog (this is the first `React.cache()` usage in the codebase). Pattern sourced from Next.js's own installed docs (per `27-RESEARCH.md` Pattern 1) and the existing singleton-factory shape of `src/lib/rate-limit.ts`.

**Imports pattern** (to establish):
```typescript
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
```

**Core pattern — zero-arg `cache()` wrapper** (RESEARCH.md Pattern 1, verified against installed `react@19.2.4` + `node_modules/next/dist/docs/.../layout.md`):
```typescript
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

// D-04's bypass variant — /account and its 2 server actions ONLY.
export const getSessionFresh = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
});
```

**Gotcha (from RESEARCH.md Pitfall 1):** Keep the wrapped function zero-argument — `cache()` keys on argument reference/shallow-equality, not deep equality. Reading `headers()` internally (not accepting it as a param) is what makes dedupe work across every call site in one request.

---

### `src/lib/auth.ts` (config, request-response)

**Analog:** itself — additive config block only, no structural change.

**Current shape** (lines 8-43) — `betterAuth({...})` call with `database`, `user.additionalFields`, `emailAndPassword`, `plugins: [nextCookies()]`. Add a new top-level `session` key:
```typescript
export const auth = betterAuth({
  // ...existing config unchanged...
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 300, // 5 minutes (D-03)
    },
  },
  // ...
});
```
**Important nuance (RESEARCH.md Pattern 2):** because this project passes `database: drizzleAdapter(...)`, better-auth's DB-less auto-default for `cookieCache` does NOT fire — this block must be added explicitly.

---

### `src/app/(protected)/layout.tsx`, `dashboard/page.tsx`, `account/page.tsx`, other pages (item 8 call-site swap)

**Analog:** each file's own current `auth.api.getSession({ headers: await headers() })` call (identical shape in all of `layout.tsx:11-13`, `dashboard/page.tsx:199-201`, `browse/page.tsx:24-26`, `account/page.tsx:30`).

**Current pattern (to replace), verbatim from `layout.tsx`:**
```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <>{children}</>;
}
```
**Replacement shape** — swap the import + call, keep every other line (esp. the `if (!session)` guard) identical:
```typescript
import { getSession } from "@/lib/auth-session";
// ...
const session = await getSession();
```
**D-04 exception — `account/page.tsx` (line 30) and `account-actions.ts` (`requestEmailChange` line 64, `deleteAccount` line 158) use `getSessionFresh()` instead**, never the cached variant. All 3 call sites currently share the identical `auth.api.getSession({ headers: await headers() })` shape — confirmed in `account-actions.ts` and `account/page.tsx:30`.

---

### `src/components/card-list.tsx` — item 9 (optimistic pause), component, event-driven

**Analog:** `src/components/word-list-browser.tsx`'s `BrowseList` optimistic-Set state machine (lines 565-649).

**Pattern to copy — optimistic add/remove with rollback-on-error + auto-clearing error map:**
```typescript
// word-list-browser.tsx:565-609 (handleAdd, representative of the shape)
const [deckWords, setDeckWords] = useState<Set<string>>(() => new Set(existingWords));
const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
const [errorWords, setErrorWords] = useState<Map<string, string>>(new Map());
const [, startTransition] = useTransition();

const handleAdd = useCallback((word: WordEntry) => {
  const key = wordKey(word);
  setDeckWords((prev) => new Set([...prev, key]));       // optimistic flip
  setLoadingWords((prev) => new Set([...prev, key]));

  startTransition(async () => {
    try {
      await addWordToCard(deckId, word.id, word.native, word.target);
    } catch {
      setDeckWords((prev) => { const next = new Set(prev); next.delete(key); return next; }); // rollback
      setErrorWords((prev) => new Map([...prev, [key, "Failed. Try again."]]));
      setTimeout(() => {
        setErrorWords((prev) => { const next = new Map(prev); next.delete(key); return next; });
      }, 3000);
    } finally {
      setLoadingWords((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  });
}, [deckId]);
```
**What card-list.tsx currently does that this replaces** (lines 230-255, `togglePause`): sets a pending id, awaits the fetch, and on success calls `router.refresh()` — a full server round-trip re-render, no optimistic flip of the icon. The Pitfall-2 comment (lines 172-177, 239) explains WHY `router.refresh()` exists (revalidatePath alone doesn't update the open tab) — item 9's optimistic layer must render the flipped icon state IMMEDIATELY (before the fetch resolves) while STILL calling `router.refresh()` on success to keep that existing correctness guarantee, and rolling back the optimistic flip on failure/network-error (mirroring the `catch` branches at lines 245-246 and the existing `console.error` calls, but adding a visible rollback instead of only logging).

**Discretion note (CONTEXT.md):** trailing-refresh coalescing — `word-list-browser.tsx` doesn't need this (no `router.refresh()` in its flow); card-list.tsx's own `startTransition` + `pendingCardIds` Set (lines 181-184, 230-254) is the base to extend for de-duping rapid toggles.

---

### `src/components/card-list.tsx` — item 16 (row memoization + deferred search), component, transform

**Analog:** `src/components/word-list-browser.tsx`'s `BWWordRow` (lines 128-295).

**React.memo pattern to copy:**
```typescript
// word-list-browser.tsx:138-146
export const BWWordRow = React.memo(function BWWordRow({
  word, inDeck, loading, error, onAdd, onRemove, targetLangLabel,
}: BWWordRowProps) {
  return ( /* ...markup... */ );
});
```
Note `CardList` itself is ALREADY wrapped in `React.memo` (line 146: `export const CardList = React.memo(function CardList({...`) — item 16 extracts the per-card row markup (currently inlined in the `.map()` at lines 481-591) into its own `React.memo`-wrapped component (`CardRow` or similar), mirroring `BWWordRow`'s extraction exactly: same "row component receives primitives + stable callbacks, not the whole array" shape.

**`useDeferredValue` for search** — no existing analog in this codebase (confirmed: no `useDeferredValue` usage found in `src/components`). Apply directly to the existing `query` state (line 153) / `filtered` `useMemo` (lines 257-266): wrap `query` in `useDeferredValue` and use the deferred value inside the `filtered` memo's dependency array, per React's own documented API — this is new-to-repo but needs no analog since it's a single hook call with no auth/error/validation surface.

---

### `src/db/schema.ts` — item 14 (4 new indexes), model, CRUD

**Analog:** `milestones_seen`'s existing `unique(...)` array-callback convention (lines 127-143).

**Current convention (verbatim, lines 127-143):**
```typescript
export const milestones_seen = pgTable(
  "milestones_seen",
  { /* columns */ },
  (table) => [
    unique("milestones_seen_userId_milestone_unique").on(
      table.userId,
      table.milestone,
    ),
  ],
);
```
**Extend to `cards`, `decks`, `recall_events`, `session`** using `index()` from `drizzle-orm/pg-core` (per RESEARCH.md Code Examples, verified against installed `drizzle-orm@0.45.1`):
```typescript
import { index, /* ...existing imports... */ } from "drizzle-orm/pg-core";

export const cards = pgTable("cards", { /* ...unchanged columns... */ }, (table) => [
  index("cards_deckId_idx").on(table.deckId),
]);
```
Note: `cards`, `decks`, `recall_events`, `session` currently use the plain 2-arg `pgTable(name, columns)` form (no third callback arg) — item 14 must add the third-argument array form to each, matching `milestones_seen`'s existing 3-arg shape exactly.

---

### `src/app/api/translate/route.ts` — item 19 (LRU cache), controller, CRUD (cache read-through)

**Analog:** `src/lib/rate-limit.ts` (full file, 66 lines) — same single-instance, module-scope, Map-based convention explicitly called out in CONTEXT.md's discretion note.

**Imports pattern already in the route** (lines 1-6):
```typescript
import * as deepl from "deepl-node";
import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
```
**Rate-limiter's shape to mirror for the LRU factory** (`rate-limit.ts:13-66`):
```typescript
export function createRateLimiter(opts: { windowMs: number; maxRequests: number }) {
  const store = new Map<string, RateLimitEntry>();
  // periodic cleanup every 5 min, lastCleanup module closure
  return {
    check(key: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
      /* ... */
    },
  };
}
```
**LRU shape (RESEARCH.md Code Examples, illustrative — planner/executor finalize exact size/TTL):**
```typescript
export function createTranslationCache(opts: { maxSize: number; ttlMs: number }) {
  const store = new Map<string, LruEntry>(); // insertion order = cheap LRU via delete+re-set
  // get()/set() with key = `${sourceLang}:${targetLang}:${text}`
}
```
**Integration point** — the LRU wraps the existing `texts[]` array handler (item 19 slots into PERF-09, lines 96-112) AND the singular `text` handler (lines 114-126) of the SAME route; both branches currently call `client.translateText(...)` directly inside a `try/catch` returning `502` on failure (lines 106-111, 121-125) — the LRU check/set must compose around these exact try/catch blocks without changing their error-response shape.

**Error handling pattern already established** (lines 40-58, auth + rate-limit gate before any DeepL call):
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

const limit = translateLimiter.check(session.user.id);
if (!limit.allowed) {
  return Response.json({ error: "Too many requests" }, {
    status: 429,
    headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
  });
}
```

---

### `src/app/api/study/complete/route.ts` — item 17 (read-path Promise.all + derived factsAfter), controller, CRUD

**Analog:** itself — the route's OWN `db.batch()` write-side consolidation (lines 228-291, shipped 26-02/PERF-07) is the sibling pattern to extend to the read side.

**Current read-side waterfall to replace** (lines 135-179):
```typescript
const [ownedDeck] = await db.select({ id: decks.id }).from(decks).where(/* ... */);
if (!ownedDeck) return Response.json({ error: "Forbidden" }, { status: 403 });

const cardRows = await db.select({ id: cards.id, masteryRound: cards.masteryRound })
  .from(cards).where(/* ... */);
// ...
const factsBefore = await getHabitatFacts(session.user.id as UserId); // line 179 — independent of the two queries above
```
**Fix (RESEARCH.md Pattern 6):**
```typescript
const [ownedDeckRows, cardRows, factsBefore] = await Promise.all([
  db.select({ id: decks.id }).from(decks).where(/* ... */),
  db.select({ id: cards.id, masteryRound: cards.masteryRound }).from(cards).where(/* ... */),
  getHabitatFacts(session.user.id as UserId),
]);
```
**Derive `factsAfter` instead of re-fetching** (currently line 298, a second full `getHabitatFacts` call after the `db.batch()` write at lines 282-295):
```typescript
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
**Existing `db.batch()` write-side, unchanged, for reference on the "atomic single-round-trip" convention already in this file** (lines 228-291): `insertRecallEvents` + `cardUpdateQueries` + `upsertHabitat`, executed via `await db.batch([...] as [Batchable, ...Batchable[]])` inside a `try { } catch (err) { console.error(...); return Response.json({ error: "Failed to save session" }, { status: 500 }); }`.

---

### `src/components/account-details-card.tsx` / `change-password-card.tsx` / `translation-form.tsx` / `review-list.tsx` / `welcome-step-choose.tsx` / 4 auth pages — item 10 (zod → zod/mini)

**Analog:** `src/app/(auth)/signup/page.tsx` (canonical client-zod convention, lines 1-34) — every other client importer mirrors this exact shape.

**Imports pattern (current, full zod):**
```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
```
**Schema pattern (current, method-chaining):**
```typescript
const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type SignupFormValues = z.infer<typeof signupSchema>;
```
**AFTER (zod/mini, per RESEARCH.md Pattern 4):**
```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/mini";

const signupSchema = z.object({
  name: z.string().check(z.minLength(1, "Name is required")),
  email: z.email("Please enter a valid email"),
  password: z.string().check(z.minLength(8, "Password must be at least 8 characters")),
});
```
**`zodResolver` needs zero changes** — confirmed via `node_modules/@hookform/resolvers/zod/dist/zod.js`'s `"_zod" in schema` detection (RESEARCH.md, HIGH confidence).

**`translation-form.tsx`'s zod usage is different in shape** — it does NOT use `zodResolver`; it validates a fetch RESPONSE inline (lines 10-12, 260):
```typescript
const TranslationResponseSchema = z.object({ translation: z.string().min(1) });
// ...
const data = TranslationResponseSchema.parse(await response.json());
```
This converts the same way (`z.object({ translation: z.string().check(z.minLength(1)) })`) but has no `zodResolver` dependency to verify — simpler conversion, no cross-file compatibility risk.

**Verification step (RESEARCH.md Pitfall 3):** after conversion, grep all 9 target files for `from "zod"` (not `"zod/mini"`) to confirm zero stragglers.

---

### `src/app/(protected)/deck/browse/page.tsx` — item 11, controller, CRUD (read)

**Analog:** itself — in-place edit of the `categoryCounts` computation.

**Current code (lines 63-69, the target of the fix):**
```typescript
// Per-category counts — synchronous, no extra I/O (D-07)
const categoryCounts: Record<string, number> = Object.fromEntries(
  CATEGORIES.map((cat) => [
    cat,
    filterWords(wordList.words, { category: cat }).length,
  ]),
);
```
**Fix per RESEARCH.md Pattern 5** — skip this computation entirely on the `requestedTopic` (BrowseList) branch; it's only consumed by `BrowseTiles` (lines 87-94). The `?topic=` validation already exists (lines 34-37, the WR-01 fix) — this item is purely about not computing/serializing `categoryCounts` (and not passing the FULL `wordList.words` — currently passed unfiltered at line 79) when only one topic's subset is actually rendered.
**Open question flagged in RESEARCH.md:** re-read `src/lib/wordlist.ts`'s `getWordList` before finalizing — may already be a cheap in-memory lookup, in which case the fix is pure prop-slicing, not a data-fetch change.

---

### `src/app/(protected)/dashboard/page.tsx` — item 12 (data-pass consolidation), controller, CRUD (read)

**Analog:** itself — the file's OWN existing `Promise.all` composition (lines 205-209) is the in-repo convention to extend further.

**Current pattern already established (lines 205-209):**
```typescript
const [decks, nativeLang, habitatFacts] = await Promise.all([
  getUserDecks(session.user.id),
  getUserNativeLanguage(session.user.id),
  getHabitatFacts(session.user.id as UserId),
]);
```
**Second, separate double-fetch to consolidate (lines 235-238):**
```typescript
const [cards, studyCards] = await Promise.all([
  getDeckCards(activeDeck.id),
  getStudyCards(activeDeck.id),
]);
```
Per CONTEXT.md D-12/discretion: derive the study subset in JS from one query instead of two separate `getDeckCards`/`getStudyCards` calls, and drop the unread `createdAt` field from the wire payload (verify at plan time it's genuinely unread — `cardRows` at lines 271-285 does read `c.createdAt` currently, so this needs re-verification against actual usage in `CardList`/`CardRow` before dropping).
**Session-type gotcha (established pattern, RESEARCH.md/CONTEXT.md):** `session.user.nativeLanguage` types `string | null | undefined` — normalize with `?? "en"` exactly as `account/page.tsx:39` already does (`const nativeLanguage = session.user.nativeLanguage ?? "en";`) when item 12 swaps `getUserNativeLanguage` for the session field.

---

### `src/app/api/extract/route.ts` — item 13 (Haiku model swap + conditional streaming), controller, request-response

**Analog:** itself for the model-id swap (line 164); `src/app/api/translate/route.ts` for the auth/rate-limit/error skeleton shape if the streaming branch needs new response wiring.

**Current model instantiation (line 164, the swap site):**
```typescript
// verified 2026-05-19: claude-sonnet-4-6 is current Sonnet-tier vision-capable model id
const model = anthropic("claude-sonnet-4-6");
```
**Swap to:**
```typescript
const model = anthropic("claude-haiku-4-5");
```
**Existing error-handling shape to preserve exactly (lines 208-230):** `AbortError` → 504, `NoObjectGeneratedError.isInstance(error)` → empty-words 200 (never log image bytes), generic → 502, `finally { clearTimeout(timeout) }`. None of this changes for the model swap alone.
**If D-06's streaming threshold fires:** `generateText({ output: Output.object({...}) })` (lines 175-200) becomes `streamObject({...})` + `partialOutputStream` (RESEARCH.md Pattern/Standard Stack, `ai@6.0.185`) — this is real UI/wiring work per RESEARCH.md Open Question 2, not a mechanical swap; do not pre-build speculatively.

---

## Shared Patterns

### Auth/session gate (all API routes + protected pages)
**Source:** `src/app/api/translate/route.ts:42-45`, mirrored in `src/app/api/study/complete/route.ts:101-104`, `src/app/api/extract/route.ts:88-91`, and every `(protected)/*` page.
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```
**Apply to:** every item-8-touched call site gets this call replaced with `getSession()` (or `getSessionFresh()` for the 3 D-04 exceptions) from the new `src/lib/auth-session.ts` — the `if (!session)` guard shape is unchanged, only the call-site function name changes.

### Rate limiting (module-scope singleton factory)
**Source:** `src/lib/rate-limit.ts` (full file) — `createRateLimiter({ windowMs, maxRequests })` returns `{ check(key) }`.
**Apply to:** item 19's LRU cache factory (same file-shape convention: Map-based store, module-scope singleton, single-instance-deployment assumption documented in the file's own header comment lines 1-7).

### Error handling in API routes (try/catch → typed Response.json)
**Source:** `src/app/api/translate/route.ts:106-111` and `121-125` (identical shape in both the array and singular branches):
```typescript
try {
  const result = await client.translateText(text as string, sourceLang, targetLangCode);
  return Response.json({ translation: result.text });
} catch {
  return Response.json({ error: "Translation service unavailable" }, { status: 502 });
}
```
**Apply to:** item 19's LRU-wrapped calls must preserve this exact catch → 502 shape; a cache hit should short-circuit BEFORE this try/catch (no DeepL call at all on hit).

### `db.batch()` atomic-write convention
**Source:** `src/app/api/study/complete/route.ts:228-295` (PERF-07/26-02, shipped).
**Apply to:** item 17 reuses the WRITE-side batch unchanged; the READ-side `Promise.all` fix (item 17's actual scope) is a parallel, distinct pattern applied to the SAME file, not a batch-API change.

### `Promise.all` for independent RSC data fetches
**Source:** `src/app/(protected)/dashboard/page.tsx:205-209` and `235-238` (existing, pre-Phase-27 convention).
**Apply to:** item 17's `factsBefore`/`ownedDeckRows`/`cardRows` consolidation; item 12's further dashboard consolidation.

### Client zod schema + `zodResolver` (form validation)
**Source:** `src/app/(auth)/signup/page.tsx:3,7,15-21,28-34` (canonical), mirrored in `src/components/account-details-card.tsx:3,7,19-22,80-83`.
**Apply to:** all 9 item-10 client importers — swap `import { z } from "zod"` for `import * as z from "zod/mini"`, convert `.min()`/`.email()` chains to `.check(z.minLength(...))` / top-level `z.email()`, keep `zodResolver(schema)` calls byte-for-byte unchanged.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/auth-session.ts` (NEW) | utility | request-response | First `React.cache()` usage in this codebase — no in-repo precedent; RESEARCH.md sources the pattern directly from installed Next.js docs instead |
| `card-list.tsx`'s `useDeferredValue` search deferral (item 16) | component (hook usage) | transform | No existing `useDeferredValue` call anywhere in `src/components` — apply React's documented API directly to the existing `query`/`filtered` state, no local analog needed |

## Metadata

**Analog search scope:** `src/components/`, `src/app/`, `src/lib/`, `src/db/schema.ts` (all 24 target files + `word-list-browser.tsx`, `rate-limit.ts`, `signup/page.tsx`, `account-details-card.tsx` as reference analogs)
**Files scanned:** ~20 read in full or targeted-range, plus 3 existing test files grepped for structure (`card-list.test.tsx`, `route.test.ts` ×2 for translate/study-complete)
**Pattern extraction date:** 2026-07-22
