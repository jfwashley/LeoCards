# Phase 26: Performance batch - Research

**Researched:** 2026-07-21
**Domain:** Server round-trip batching (Drizzle/Neon HTTP), DeepL SDK array translation, client-side image canvas resize, Next.js `headers()` for static asset caching
**Confidence:** HIGH

## Summary

All five PERF-07..PERF-11 changes are small, surgical modifications to existing, well-tested code — no new architecture, no new services, and (critically) **zero new npm dependencies are required for any of the five items**. The two hardest technical questions this research resolves are: (1) whether `db.batch()` on the installed neon-http driver (drizzle-orm 0.45.1) is genuinely atomic — **it is**, because it compiles to `@neondatabase/serverless`'s native `sql.transaction()`, a real single-round-trip Postgres transaction over HTTP; and (2) whether `deepl-node`'s `translateText()` natively accepts arrays — **it does**, via a conditional-return TypeScript overload (`string` in → single `TextResult` out; `string[]` in → `TextResult[]` out, order-preserved).

The single biggest execution risk is NOT the production code — it's that the existing unit test mocks for `src/app/api/study/complete/route.test.ts` and `src/lib/deck-actions.test.ts` model the OLD one-call-per-write shape (`db.insert`/`db.update` mocked as immediately-resolving chains, `db.insert` asserted `toHaveBeenCalledTimes(2)` for a 2-card commit). Both mocks must be substantially rewritten, not incrementally patched, to model `db.batch()` and a single multi-row `.values([...])` insert respectively. This research documents the exact rewrite shape needed for both.

The second-biggest surprise: `/api/translate` already has a **second caller** (`src/components/translation-form.tsx`, the manual "type a word" live-translate feature) that sends the existing singular `{ text, sourceLang, targetLang }` shape and expects `{ translation }` back. This caller has zero visibility in the CONTEXT.md code-context section and must NOT break — the array-mode extension must be strictly additive (new optional field, new response field), never a replacement of the existing schema.

**Primary recommendation:** Extend (never replace) `/api/translate`'s Zod schema with an optional `texts: string[].max(50)` field alongside the existing `text: string`; batch ALL of the study-commit's step-6 writes (recall_events insert + N card updates + habitat_metadata upsert) into ONE `db.batch()` call using a typed tuple cast; convert `saveImageCards`'s insert loop to one `.values([...])` call and accept the "per-card outcome" semantics becoming all-or-nothing; implement photo resize via `createImageBitmap` + `OffscreenCanvas`/`<canvas>` + `toBlob` with zero new dependencies; add the `headers()` block to `next.config.ts` verbatim per the current Next 16 docs syntax (confirmed unchanged from stable Next.js).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Study-commit write batching (PERF-07) | API / Backend | Database | `db.batch()` is a Drizzle/session-layer concern inside the Route Handler; Neon executes the atomic transaction |
| Review-card commit batching (PERF-08) | API / Backend (Server Action) | Database | `saveImageCards` is a `"use server"` action; the array-carrying call itself is a client→server-action boundary change |
| Translation batching (PERF-09) | API / Backend | External Service (DeepL) | Route Handler owns the array/singular schema branch; DeepL SDK is the external service boundary |
| Photo downscale (PERF-10) | Browser / Client | — | Canvas resize must happen before the network call exists — pure client-tier work, no server involvement until upload |
| Clip caching (PERF-11) | CDN / Static (via Next config) | Frontend Server (Next.js routing layer) | `headers()` is evaluated by Next's routing layer before the filesystem/`public/` lookup, functioning as an edge/CDN-cache directive |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-07 | Study-session commit updates all card mastery rows in a single round trip (`db.batch()`) | `db.batch()` atomicity + composition verified against installed drizzle-orm 0.45.1 + neon-http source; existing route.test.ts mock incompatibility documented with rewrite shape |
| PERF-08 | Committing N reviewed image-cards is one server action + one multi-row insert | `saveImageCards` and `commitReviewRows` read in full; existing `deck-actions.test.ts` `toHaveBeenCalledTimes(2)` assertion identified as the exact line to change; all-or-nothing semantics change flagged |
| PERF-09 | Extractions >30 words translate via one batched DeepL request | `translateText<T>` overload verified in installed `deepl-node` 1.24.0 types; 50-text DeepL limit cross-verified (WebSearch, MEDIUM-HIGH); second `/api/translate` caller (`translation-form.tsx`) discovered — backward-compat schema shape specified |
| PERF-10 | Photos downscaled client-side (~1568px, JPEG) before upload; server cap closes 3.3-5MB dead zone | Zero-dependency canvas approach verified against installed package.json (no image libs present); `accept` attribute already avoids the Safari 17+ HEIC-conversion footgun; `createImageBitmap`'s `imageOrientation: 'from-image'` default handles EXIF rotation with no extra code |
| PERF-11 | Habitat clips ship long-lived immutable `Cache-Control` via `next.config.ts` `headers()` | Current Next.js 16.2.1 docs (`node_modules/next/dist/docs/`) read directly per AGENTS.md caveat; confirmed `headers()` is evaluated **before** the `public/` filesystem lookup, and that `public/` files default to `Cache-Control: public, max-age=0` today (the exact problem PERF-11 fixes) |

## Standard Stack

### Core (all already installed — no version changes needed)

| Library | Installed Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.45.1 [VERIFIED: node_modules/drizzle-orm/package.json] | `db.batch()` composition | Already the project's ORM; `batch()` is a first-class session method on the neon-http driver, not a new pattern |
| `@neondatabase/serverless` | 1.0.2 [VERIFIED: node_modules/@neondatabase/serverless/package.json] | Underlying HTTP transaction primitive (`sql.transaction()`) | Drizzle's `db.batch()` on neon-http is a thin wrapper over this exact function — confirmed by reading `node_modules/drizzle-orm/neon-http/session.js` |
| `deepl-node` | 1.24.0 [VERIFIED: node_modules/deepl-node/package.json] | `translateText(string[], ...)` array mode | Already the project's translation SDK; the array overload is native, not a new feature |
| `next` | 16.2.1 [VERIFIED: node_modules/next/package.json] | `next.config.ts` `headers()` | Already the framework; `headers()` is a stable (non-experimental) config API, confirmed against the shipped docs per AGENTS.md's mandatory-caveat instruction |

### Supporting — none required

No new libraries are needed for any of the five items. Canvas resize (PERF-10) uses only standard browser APIs (`createImageBitmap`, `HTMLCanvasElement`/`OffscreenCanvas`, `Blob`) already reachable with zero dependency additions — confirmed by grepping `package.json` for image/canvas/compress packages (none present) [VERIFIED: package.json dependencies].

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `db.batch()` for study-commit | Raw `sql.transaction()` from `@neondatabase/serverless` directly (bypassing Drizzle) | Loses Drizzle's query-builder type safety and the project's established `db.*` call convention for zero benefit — `db.batch()` already IS this primitive under the hood |
| `createImageBitmap` + canvas | A dedicated resize library (e.g. `browser-image-compression`, `pica`) | Adds a new dependency for something 3 native browser APIs already do; violates the CONTEXT.md discretion note ("no new dependencies unless truly required") and the phase's "make-it-faster, zero-feature-creep" boundary |
| Extending `/api/translate` with an optional array field | A new `/api/translate/batch` endpoint | More surface area, a second rate limiter to reason about, and a second route to secure/test — the single-route extension keeps the existing 30/min limiter's math simple (D-03) and touches one file instead of two |

**Installation:** None required — no `npm install` step for this phase.

**Version verification:** All four core libraries confirmed installed via direct `node -e "require(...).version"` reads of `node_modules/*/package.json`, not `npm view` (no registry round trip needed since these are already-installed, already-in-use dependencies, not new additions).

## Package Legitimacy Audit

**Not applicable — this phase introduces zero new external packages.** All five PERF items are implemented with already-installed dependencies (`drizzle-orm`, `@neondatabase/serverless`, `deepl-node`, `next`) plus native browser Web APIs (`createImageBitmap`, `Canvas`/`OffscreenCanvas`, `Blob`) that require no npm package at all.

**Packages removed due to slopcheck verdict:** none (no packages evaluated — none proposed).
**Packages flagged as suspicious:** none.

If, during planning or execution, ANY new dependency is proposed for PERF-10 (e.g. an EXIF/HEIC library), that proposal is a scope deviation from this research and MUST go through the full Package Legitimacy Gate protocol before being added — flag to Josh, since the CONTEXT.md discretion note explicitly favors the zero-dependency path this research confirms is viable.

## Architecture Patterns

### System Architecture Diagram — the three write-path changes (PERF-07/08/09)

```
Client (browser)                    API / Server Action (Node)              Neon Postgres (HTTP)
─────────────────                   ──────────────────────────              ────────────────────

[Study session UI]
   POST /api/study/complete  ──────►  auth + rate-limit + validate
   { commitId, grades[] }             │
                                      ├─► SELECT deck ownership (1 RT)
                                      ├─► SELECT card states     (1 RT)
                                      ├─► compute mastery updates (pure, in-process)
                                      └─► db.batch([                          ──► sql.transaction([...])
                                            insert(recall_events)...,                (1 HTTP round trip,
                                            ...cardUpdates.map(update),               atomic — all queries
                                            insert(habitat_metadata)                  commit or rollback
                                              .onConflictDoUpdate(...),               together)
                                          ])                              ◄──────────────┘
                                      ◄─ { success, leveledUp }

[ReviewList commit]
   commitReviewRows(rows, deckId)
       │ (in-process helper, no network — calls the server action directly)
       ▼
   saveImageCards(deckId, rows[])  ──►  auth + ownership check (ONCE)
                                        └─► db.insert(cards)
                                              .values([...N rows])   ──► single multi-row INSERT (1 RT)
                                      ◄─ Array<{ok, error?}> (all-same-outcome now)

[ReviewList translate]
   runTranslationFanOut(rows, ...)
   POST /api/translate  ──────────►  auth + rate-limit (1 of 30/min, regardless of array size)
   { texts: string[] }                └─► client.translateText(texts[], ...)  ──►  DeepL API
                                                                                      (1 HTTP request,
                                                                                       ≤50 texts)
                                      ◄─ { translations: TextResult[] }  (order-preserved)
```

### Recommended Project Structure

No new files or directories — every change lands inside an existing file:

```
src/app/api/study/complete/route.ts    # PERF-07: step 6 rewritten to db.batch([...])
src/app/api/study/complete/route.test.ts  # PERF-07: db mock rewritten (batch() added)
src/lib/deck-actions.ts                # PERF-08: saveImageCards insert loop → single .values([...])
src/lib/deck-actions.test.ts           # PERF-08: toHaveBeenCalledTimes(2) → (1), payload shape assertion updated
src/components/review-list.tsx         # PERF-08 (client call site) + PERF-09 (client call site)
src/components/review-list.test.ts     # PERF-08 + PERF-09: mock rewrites for both fan-outs
src/app/api/translate/route.ts         # PERF-09: schema extended with optional texts[] field
src/app/api/translate/__tests__/route.test.ts  # PERF-09: NEW FILE — zero existing coverage today
src/components/image-upload-flow.tsx   # PERF-10: canvas resize inserted before the fetch("/api/extract") call
src/lib/image-constants.ts             # PERF-10: MAX_IMAGE_BYTES → ~20MB, MAX_SERVER_IMAGE_BYTES → 4MB
src/lib/image-validation.ts            # PERF-10: "under 5MB" copy string → updated cap
src/lib/image-resize.ts                # PERF-10: NEW FILE — pure-ish resize helper, isolated for testability
next.config.ts                         # PERF-11: headers() block added
scripts/render-habitat-clips.mjs       # PERF-11: header-comment naming-rule doc added (D-08 companion doc)
e2e/11-phase9-image-upload.spec.ts     # PERF-10: "under 5MB" assertion retargeted to new cap
```

### Pattern 1: `db.batch()` with a dynamically-sized query array

**What:** Drizzle's `db.batch()` type signature requires a non-empty **tuple** (`Readonly<[U, ...U[]]>`), not a plain array — TypeScript cannot statically prove a `.map()`-built array is non-empty. This is a documented, known friction point (drizzle-team/drizzle-orm#1301), not a project-specific bug.
**When to use:** Any time the batch array is built at runtime from a variable-length source (here: `cardUpdates.map(...)`, which always has ≥1 element because `CommitSchema.grades` is `.min(1)`).
**Example:**
```typescript
// Source: node_modules/drizzle-orm/neon-http/driver.d.ts (installed 0.45.1) +
// node_modules/drizzle-orm/batch.d.ts + https://orm.drizzle.team/docs/batch-api
type Batchable = ReturnType<typeof db.insert> | ReturnType<typeof db.update>;

const insertRecallEvents = db
  .insert(recall_events)
  .values(grades.map((g, i) => ({ id: recallEventId(commitId, i), ...})))
  .onConflictDoNothing();

const cardUpdateQueries = cardUpdates.map((u) =>
  db
    .update(cards)
    .set({ masteryRound: u.newRound, cooldownUntil: u.cooldownUntil, /* ... */ })
    .where(and(eq(cards.id, u.cardId), or(isNull(cards.lastCommitId), ne(cards.lastCommitId, commitId)))),
);

const upsertHabitat = db
  .insert(habitat_metadata)
  .values({ id: crypto.randomUUID(), userId: session.user.id, lastActivityAt: now })
  .onConflictDoUpdate({ target: habitat_metadata.userId, set: { lastActivityAt: now } });

// Cast required: TS cannot infer non-emptiness of a runtime-built array.
// grades.min(1) in CommitSchema guarantees cardUpdateQueries.length >= 1 at runtime.
await db.batch([
  insertRecallEvents,
  ...cardUpdateQueries,
  upsertHabitat,
] as [Batchable, ...Batchable[]]);
```
**Why batch ALL THREE writes, not just the card updates:** PERF-07's literal wording only requires eliminating the per-card `await` loop, but since `db.batch()` accepts heterogeneous query types in one array (confirmed: official docs example mixes insert/update/select in a single call), batching the recall_events insert and habitat upsert alongside the card updates costs nothing extra and turns 1(insert)+N(updates)+1(upsert) round trips into exactly **1** round trip for the entire step-6 write phase — strictly better than a minimal PERF-07-only interpretation.

### Pattern 2: Multi-row insert (PERF-08) — already precedented in the SAME file

**What:** `src/app/api/study/complete/route.ts:224-234` already does `db.insert(recall_events).values([...]).onConflictDoNothing()` — a multi-row insert built from a `.map()`. `saveImageCards` should mirror this exact pattern.
**Example:**
```typescript
// Mirrors the existing recall_events pattern in the same codebase
// (src/app/api/study/complete/route.ts:224-234)
const outcomes = sanitizedInputs.map(() => ({ ok: true as const }));
try {
  await db.insert(cards).values(
    sanitizedInputs.map((input) => ({
      id: crypto.randomUUID() as CardId,
      deckId: deckId as DeckId,
      front: input.front,
      back: input.back,
      source: "image" as const,
    })),
  );
} catch (err) {
  // All-or-nothing: a single multi-row INSERT either fully succeeds or fully
  // fails as one Postgres statement — there is no per-row partial outcome
  // anymore (see Common Pitfalls: "saveImageCards outcome semantics change").
  return sanitizedInputs.map(() => ({
    ok: false,
    error: err instanceof Error ? err.message : "Unknown error",
  }));
}
return outcomes;
```

### Pattern 3: DeepL array translation with backward-compatible schema

**What:** `/api/translate` has TWO callers today — `review-list.tsx` (image-extraction fan-out, the one PERF-09 targets) and `translation-form.tsx` (manual single-word live-translate, NOT in scope, MUST keep working unchanged).
**Example:**
```typescript
// Source: node_modules/deepl-node/dist/translator.d.ts (installed 1.24.0) +
// node_modules/deepl-node/README.md (array example)
const RequestSchema = z.object({
  // Existing singular field — untouched, still used by translation-form.tsx
  text: z.string().min(1).max(500).optional(),
  // New: array mode for review-list.tsx's batch fan-out.
  // .max(50) is NOT optional — see Security Domain: this is the authoritative
  // server-side guard against a caller sending an oversized array to dodge
  // the 30/min rate limit's per-request accounting.
  texts: z.array(z.string().min(1).max(500)).min(1).max(50).optional(),
  sourceLang: z.enum(["en", "fr", "es"]),
  targetLang: z.enum(["en", "fr", "es"]),
}).refine((v) => (v.text !== undefined) !== (v.texts !== undefined), {
  message: "Provide exactly one of text or texts",
});

// ... inside POST, after parsing:
if (parsed.data.texts) {
  const results = await client.translateText(parsed.data.texts, sourceLang, targetLangCode);
  // results: TextResult[], SAME ORDER as input texts — safe to zip by index.
  return Response.json({ translations: results.map((r) => r.text) });
}
const result = await client.translateText(parsed.data.text as string, sourceLang, targetLangCode);
return Response.json({ translation: result.text });
```
**D-04's retry-then-placeholder behavior** (one automatic retry of the failed batch, then per-word "Translation unavailable" fallback) is implemented entirely in `runTranslationFanOut` (client-side orchestration in `review-list.tsx`), not in the route — the route stays a stateless pass-through; only the caller needs the retry loop.

### Pattern 4: Immutable Cache-Control for `/habitat/clips/*`

**What:** Verified against the currently-installed Next.js 16.2.1 docs (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md`), per the AGENTS.md mandatory caveat. `headers()` is a **stable** (non-experimental) API — no D-07-style checkpoint is needed (unlike Phase 17's experimental-flag gate).
**Example:**
```typescript
// Source: node_modules/next/dist/docs/.../headers.md (installed Next 16.2.1)
// "Headers are checked before the filesystem which includes pages and /public files."
// public/ files otherwise default to `Cache-Control: public, max-age=0` (same doc,
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md)
// — this IS the problem PERF-11 fixes.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // NAMING RULE (D-08 companion — MUST also land as a doc comment in
        // scripts/render-habitat-clips.mjs's header block): any future
        // clip re-render MUST ship under a NEW filename. This header makes
        // browsers cache l{N}-{mood}.{mp4,webm} FOREVER — a same-name
        // replacement is invisible to any returning user until their cache
        // clears, which for `immutable` assets may be effectively never.
        source: "/habitat/clips/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};
```
**Dev vs. prod applicability:** `headers()` is evaluated by Next's routing layer, not a build-time-only static-export feature — the doc's "checked before the filesystem" ordering applies uniformly to `next dev` and `next start`/Vercel. This is MEDIUM-HIGH confidence (direct doc read, not training data, but the doc doesn't explicitly enumerate dev-vs-prod) — ROADMAP success criterion 5 ("verified in response headers") already mandates an actual `curl -I` / Playwright response-header check, which will close this gap empirically.

### Pattern 5: Client-side canvas resize (PERF-10), structured for testability

**What:** jsdom (this project's default vitest environment for non-`@vitest-environment jsdom`-tagged files) does not implement `HTMLCanvasElement.getContext('2d')`, `createImageBitmap`, or `OffscreenCanvas` — confirmed by the absence of a `canvas` npm package in `node_modules` and the project's own precedent of isolating pure logic from browser-only side effects (e.g., Phase 16's `measure-cwv-lib.mjs` split). Structure the resize as a small function whose browser-API calls are the ONLY non-pure part, so tests can mock exactly those calls.
**Example:**
```typescript
// src/lib/image-resize.ts — NEW FILE
// EXIF orientation: createImageBitmap's default imageOrientation is "from-image",
// which auto-applies EXIF rotation — no manual EXIF parsing needed.
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap
export async function resizeImageForUpload(
  file: File,
  { maxEdge = 1568, quality = 0.8 }: { maxEdge?: number; quality?: number } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // auto-orients per EXIF by default
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close(); // free ImageBitmap memory promptly

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
}
```
**Test file MUST start with `// @vitest-environment jsdom`** (this project's established per-file opt-in pattern — see `src/components/__tests__/image-upload-flow-cancel.test.tsx:1`) AND mock `global.createImageBitmap` and `HTMLCanvasElement.prototype.{getContext,toBlob}`, since jsdom does not implement any of the three.

### Anti-Patterns to Avoid
- **Casting the whole `db.batch()` array `as any`:** biome's `recommended` ruleset includes `noExplicitAny` (suspicious category) — use the narrower `as [Batchable, ...Batchable[]]` tuple cast shown in Pattern 1 instead.
- **Making `/api/translate`'s `texts` field unbounded:** see Security Domain — an unbounded array lets one HTTP call (and one rate-limit slot) carry arbitrarily many DeepL translations, which is both a cost and an abuse vector independent of the 50-word extraction cap actually holding client-side.
- **Assuming `saveImageCards`'s per-row `{ok, error}` outcome array still means "per-row independent result"** after the multi-row insert — see Common Pitfalls below.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-statement DB write | A custom "apply N updates, roll back manually on failure" retry wrapper | `db.batch()` (→ Neon's native `sql.transaction()`) | Already atomic, already one round trip, already installed — a hand-rolled wrapper would be strictly worse and duplicate what the driver does for free |
| Batch translation | A custom `Promise.all` fan-out with client-side chunking into groups of 50 | `deepl-node`'s native `translateText(string[], ...)` | The SDK already accepts up to the request-size limit in one call; the extraction cap (≤50 words, verified at `src/app/api/extract/route.ts:205`) never requires client-side chunking this phase (D-05) |
| EXIF-aware image rotation before resize | A manual EXIF-tag parser/rotator | `createImageBitmap(file)` with default `imageOrientation: "from-image"` | Browser-native, zero-dependency, and already does exactly what a hand-rolled EXIF parser would do — confirmed via MDN spec read |
| Immutable asset caching | A custom cache-busting query-param/versioning scheme for clip URLs | `next.config.ts` `headers()` `Cache-Control: immutable` + the D-08 filename-change convention | Next's own routing layer already supports this declaratively; a custom versioning scheme would require code changes across every place a clip URL is referenced |

**Key insight:** Every one of the five items has a native, already-installed primitive that does the job — this phase is almost entirely "wire up capabilities that already exist" rather than "build new capabilities."

## Common Pitfalls

### Pitfall 1: `db.batch()` breaks the existing route.test.ts mock architecture
**What goes wrong:** `src/app/api/study/complete/route.test.ts` currently mocks `db.insert()`/`db.update()`/`db.select()` as eagerly-executing chains (`.where()` immediately returns `Promise.resolve()` and applies side effects synchronously during array construction). There is no `db.batch` mock today. Naively adding `db.batch()` to production code without updating the mock will make every existing test in this file fail with "db.batch is not a function."
**Why it happens:** The mock was written for the sequential-`await`-per-call shape; `db.batch()` requires passing UN-awaited query-builder objects into an array, then awaiting the array as a unit.
**How to avoid:** Because the existing mock's query builders already eagerly apply their side effects at construction time (not at `.then()` time), the simplest correct fix is to mock `db.batch = (queries) => Promise.all(queries)` — since each array item is already a `Promise` by the time `db.batch()` receives it in this mock, `Promise.all` correctly "executes" the batch while preserving the existing round-trip-count assertion pattern (`h.batchCalls.count++` inside the new `batch` mock, asserted `toBe(1)` for D-02's proof). This is Wave 0 work, not incidental cleanup.
**Warning signs:** Any test failure mentioning `db.batch is not a function`, or a green test suite that never actually exercises the new batched code path (a false-positive that would ship an untested write path on the app's most critical save flow).

### Pitfall 2: `saveImageCards`'s outcome semantics change from per-row to all-or-nothing
**What goes wrong:** Today, `saveImageCards` loops `cardInputs` with a per-item try/catch, so `deck-actions.test.ts`'s "continue-on-failure" test (`insertChain.values.mockRejectedValueOnce(...).mockResolvedValueOnce(...)`, asserting `result[0] = {ok:false}`, `result[1] = {ok:true}`) models a REAL possible outcome today. After PERF-08's single multi-row `.values([...])` insert, a single Postgres INSERT statement is atomic at the statement level — it either inserts all N rows or none. There is no code path left that produces a mixed per-row outcome from the DB layer.
**Why it happens:** D-09 mandates the multi-row insert "no gray areas," but doesn't spell out the consequence for the existing continue-on-failure test and the `addedCount`/`failedCount`/`skippedCount` UI (which was designed around genuinely-mixed outcomes).
**How to avoid:** Update `deck-actions.test.ts`'s "continue-on-failure" test to instead assert the ALL-succeed and ALL-fail cases (`db.insert` called `toHaveBeenCalledTimes(1)` with a `.values()` call carrying the full array; on rejection, EVERY outcome in the returned array is `{ok:false}` with the same error message). Flag to the planner/Josh that `review-list.tsx`'s "partial result" UI branch (`isPartial = failedCount > 0 && addedCount > 0`, rendered in the `success` step) becomes structurally unreachable via the DB-failure path after this change (it remains reachable only via the pre-existing sanitization-time per-row rejects, which happen client-side before the batch call and are unaffected). This is a UI/UX-relevant behavioral narrowing worth a one-line note in the phase summary, not a blocker.
**Warning signs:** A test that still asserts a genuinely-mixed `{ok:true}`/`{ok:false}` outcome pair from a single DB call after the refactor — that assertion can only pass by accident (e.g., a test double that doesn't model atomicity) and should be treated as a signal the mock is wrong, not the code.

### Pitfall 3: `/api/translate`'s existing second caller (`translation-form.tsx`) must not regress
**What goes wrong:** If the schema/route rewrite replaces the singular `text` field with an array-only `texts` field (or changes the singular response shape from `{translation}` to something else), the manual "type a word" live-translate feature silently breaks — and there is currently ZERO test coverage for `/api/translate` (`src/app/api/translate/` contains only `route.ts`, no test file) to catch this.
**Why it happens:** CONTEXT.md's code-context section only mentions `review-list.tsx`'s usage of `/api/translate`; `translation-form.tsx`'s usage was not discovered until this research read `src/components/translation-form.tsx:250-260` directly.
**How to avoid:** Treat `text`/`translation` (singular) as a frozen, must-not-change contract; add `texts`/`translations` (array) as strictly additive fields. Wave 0 MUST add `src/app/api/translate/__tests__/route.test.ts` covering BOTH the pre-existing singular path (regression-establishing, since it has never been tested) and the new array path.
**Warning signs:** `translation-form.tsx`'s existing `TranslationResponseSchema.parse(await response.json())` (a Zod parse of `{translation: string}`) throwing at runtime — this parse failure would surface as a caught, swallowed error in `translateFrom`'s catch block (silent failure, not a crash), so a manual smoke test of "Add a card manually" with live-translate is the only way to catch this if unit tests are skipped.

### Pitfall 4: Hardcoded "5MB" strings are scattered across 3+ files and 1 e2e spec
**What goes wrong:** D-07 changes the client acceptance cap from 5MB to ~20MB and the server cap from 7MB to 4MB, but the literal string "5MB" (or "under 5MB") appears in at least: `src/lib/image-validation.ts:28` (user-facing error copy), `src/components/image-upload-flow.tsx:137` (413 friendly-error copy, currently references the OLD server-cap story), `src/lib/image-constants.test.ts:16-18` (hardcoded assertion `MAX_IMAGE_BYTES === 5 * 1024 * 1024`), and `e2e/11-phase9-image-upload.spec.ts:56-65` (constructs a 5MB+1KB buffer and asserts the "under 5MB" text). Updating only `image-constants.ts` leaves 3-4 stale references that either fail tests or show wrong copy to users.
**Why it happens:** The cap value is referenced by its numeric constant in most places (which DOES update correctly), but by literal copy text in the UI and by a literal byte-size construction in the e2e spec — neither of which derives from the constant.
**How to avoid:** Grep for `5MB`/`5 \* 1024 \* 1024`/`under 5MB` across `src/` AND `e2e/` before considering PERF-10 done; update all four locations in the same wave.
**Warning signs:** `npm run test:e2e` failing on the oversized-file assertion in `e2e/11-phase9-image-upload.spec.ts` after only touching `image-constants.ts`.

### Pitfall 5: jsdom cannot execute real canvas/EXIF logic — resize tests need mocks, not real images
**What goes wrong:** A naive test that calls `resizeImageForUpload()` in the default `environment: "node"` vitest config (this project's global default per `vitest.config.ts:6`) will fail immediately (`document is not defined`); even with `// @vitest-environment jsdom` added, `createImageBitmap` and `canvas.getContext('2d')`/`.toBlob()` are NOT implemented by jsdom (no `canvas` npm package is installed in this project — confirmed).
**Why it happens:** jsdom deliberately does not ship a native 2D rasterizer; that's normally provided by the `canvas` npm package (a native binary dependency), which this project does not have.
**How to avoid:** Mock `global.createImageBitmap` and `HTMLCanvasElement.prototype.getContext`/`.toBlob` directly in the unit test (return a stub bitmap with known `width`/`height`, and a stub 2D context whose `drawImage` is a no-op spy, and a `toBlob` that synchronously invokes its callback with a fake `Blob`). Reserve REAL end-to-end resize verification (does the output actually look right, is EXIF actually respected) for manual/UAT testing with a real photo — this is consistent with the project's existing "unit-test pure logic, manually verify browser rendering" split (e.g., the habitat-3d-canvas tests use stub canvases, not real WebGL).
**Warning signs:** `TypeError: createImageBitmap is not a function` or `getContext is not a function` in test output.

### Pitfall 6: DeepL array requests need their OWN length cap independent of the extraction cap
**What goes wrong:** D-05 correctly notes the extraction endpoint already caps words at ≤50 (`src/app/api/extract/route.ts:205`, `words.slice(0, 50)`), so `review-list.tsx`'s legitimate fan-outs will never exceed 50 words. But if the NEW `texts` field on `/api/translate`'s Zod schema is left unbounded (`z.array(z.string())` with no `.max()`), a malicious or buggy caller could POST an arbitrarily large array in ONE HTTP request — consuming only 1 of the 30/min rate-limit slots while sending, say, 5,000 translation requests to DeepL in a single call (a cost/abuse vector, and likely to exceed DeepL's own 128KiB request-size limit and 50-text-per-request limit anyway, producing a confusing 400/413 from DeepL instead of a clean validation error from LeoCards).
**Why it happens:** The 50-word cap lives in a DIFFERENT route (`/api/extract`) than the one being modified (`/api/translate`); nothing in `/api/translate` itself enforces it today because it has never accepted an array before.
**How to avoid:** Add `.max(50)` directly to the new `texts` field's Zod schema (see Pattern 3) — this makes `/api/translate` safe to call with an oversized array regardless of what any particular client (current or future) sends, independent of trusting `/api/extract`'s cap to always hold.
**Warning signs:** None visible today (no caller currently sends >50 items) — this is a preventive hardening measure, not a bug fix for an observed failure.

## Code Examples

Verified patterns from installed-package sources (not training-data recall):

### `db.batch()` composition and the TS tuple-cast requirement
See Architecture Patterns → Pattern 1 above (full example). Source: `node_modules/drizzle-orm/neon-http/{driver,session}.d.ts` (installed 0.45.1), `node_modules/drizzle-orm/batch.d.ts`, https://orm.drizzle.team/docs/batch-api.

### DeepL array call and response shape
```typescript
// Source: node_modules/deepl-node/dist/translator.d.ts (installed 1.24.0)
// translateText<T extends string | string[]>(texts: T, sourceLang, targetLang, options?)
//   : Promise<T extends string ? TextResult : TextResult[]>
const results = await client.translateText(
  ["chien", "chat", "maison"],
  "fr",
  "en-US" as deepl.TargetLanguageCode,
);
// results is TextResult[], in the SAME order as the input array (README example
// at node_modules/deepl-node/README.md confirms via `.map()` pattern).
results.map((r) => r.text); // -> ["dog", "cat", "house"]
```

### Next.js immutable Cache-Control header
See Architecture Patterns → Pattern 4 above (full example). Source: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md` (installed Next 16.2.1) — read directly per the AGENTS.md mandatory-caveat instruction, not recalled from training data.

## State of the Art

| Old Approach | Current/Recommended Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| N sequential `await db.update(cards)...` per study commit | One `db.batch([...])` call for the whole write phase | This phase (PERF-07) | Study-commit write phase: 1+N+1 round trips → 1 round trip; also GAINS atomicity the current code explicitly documents NOT having ("Neon HTTP driver does not support transactions" comment at route.ts:91 becomes outdated once `db.batch()` lands — recommend removing/updating that comment) |
| N `saveImageCards(deckId, [singleCard])` calls, N auth checks | ONE `saveImageCards(deckId, allRows)` call, ONE auth check | This phase (PERF-08) | Auth/ownership check runs once per commit instead of once per card; single multi-row INSERT |
| N `fetch("/api/translate")` calls, one per word | ONE `fetch("/api/translate", {texts: [...]})` call | This phase (PERF-09) | Fixes the deterministic >30-word 429; rate limit consumption drops from N/30min to 1/30min per extraction |
| `public/habitat/clips/*` served with default `Cache-Control: public, max-age=0` | `Cache-Control: public, max-age=31536000, immutable` via `next.config.ts` `headers()` | This phase (PERF-11) | Repeat visits stop re-downloading 240KB-1MB clips; requires the D-08 new-filename-on-re-render discipline going forward |

**Deprecated/outdated:** The route.ts:91 code comment "Neon HTTP driver does not support transactions" becomes factually incorrect once `db.batch()` is adopted for the write phase (it IS a transaction, just not the interactive `BEGIN...COMMIT` kind) — recommend the planner include a comment update as part of PERF-07's task, not a separate cleanup item.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DeepL's per-request text-array limit is exactly 50 | Standard Stack, Pitfall 6, Pattern 3 | MEDIUM confidence — multiple WebSearch sources agree on "50," but the primary developers.deepl.com page fetched in this session did not explicitly restate the number (it only states the 128KiB aggregate size limit). If the true limit differs, the extraction cap (also 50, independently verified in-repo) may not perfectly align — however, D-05's assumption stands regardless since LeoCards' OWN cap is the binding constraint either way, and this research adds an explicit `.max(50)` server-side guard (Pitfall 6) that is correct regardless of DeepL's exact number as long as it is ≥50 (extremely likely — DeepL's 128KiB body limit alone would accommodate far more than 50 short vocabulary words) |
| A2 | `headers()` in `next.config.ts` behaves identically in `next dev` and `next start`/Vercel prod for `public/` assets | Pattern 4 | LOW-MEDIUM — the official doc confirms ordering ("before the filesystem") but does not explicitly state dev-parity. ROADMAP success criterion 5 already mandates an empirical response-header check, which will catch any dev/prod divergence before the phase closes — treat this as self-resolving via the phase's own verification step, not a standalone risk |

## Open Questions (RESOLVED)

1. **Does `db.batch()` on the neon-http driver provide real atomicity, or just call convenience?**
   - What we knew: CONTEXT.md's D-01 assumed batch "arguably supersedes" WR-04's idempotency machinery, implying atomicity, but asked the researcher to verify.
   - Resolution: Confirmed via direct source read (`node_modules/drizzle-orm/neon-http/session.js:117-133`) that `db.batch()` calls `this.client.transaction(builtQueries, queryConfig)`, and `node_modules/@neondatabase/serverless/index.d.ts:704-735` confirms `sql.transaction()` is "a single, non-interactive Postgres transaction" over one HTTP request. **Genuinely atomic, genuinely one round trip.** D-01's decision to keep WR-04 anyway (belt-and-braces, smallest diff) stands as the correct call regardless.

2. **What is the exact TypeScript composition shape for a variable-length `db.batch()` array?**
   - What we knew: Nothing — this wasn't mentioned in CONTEXT.md or the delivery-plan sketch.
   - Resolution: `db.batch<U extends BatchItem<'pg'>, T extends Readonly<[U, ...U[]]>>(batch: T)` requires a non-empty tuple type; a `.map()`-built array must be cast `as [Batchable, ...Batchable[]]` (documented drizzle-team limitation, GitHub issue #1301). Full pattern in Architecture Patterns → Pattern 1.

3. **Does `/api/translate` have any other callers besides `review-list.tsx`?**
   - What we knew: CONTEXT.md's code-context section mentioned only `review-list.tsx:253-291`.
   - Resolution: `src/components/translation-form.tsx:250` also calls `/api/translate` with the singular `{text, sourceLang, targetLang}` shape, for the manual "type a word" live-translate feature. This MUST stay backward-compatible — see Pitfall 3 and Pattern 3.

4. **Is the extraction word cap actually ≤50, and where exactly is it enforced?**
   - What we knew: D-05 asserted "extraction is already capped at 50 words" and asked the researcher to verify the constant.
   - Resolution: Confirmed at `src/app/api/extract/route.ts:205` (`words.slice(0, 50)`, comment "enforce cap defensively (D-08)") and `:23` (`ExtractionSchema`'s `.max(50)` on the Zod schema) and `:172` (the AI system prompt itself instructs "Return at most 50 words"). Triple-enforced (prompt + schema + defensive slice) — D-05 confirmed correct.

## Environment Availability

Skipped — this phase introduces no new external dependencies. Neon (Postgres), the DeepL API, and Vercel deployment are all pre-existing, already-integrated, already-functioning-in-prod dependencies (used by the exact routes this phase modifies). No new CLI tools, runtimes, or services are required.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.1 (unit) + Playwright ^1.58.2 (e2e) [VERIFIED: package.json] |
| Config file | `vitest.config.ts` (global `environment: "node"`, per-file `// @vitest-environment jsdom` opt-in) |
| Quick run command | `npx vitest run <path-to-file>` (single file, fast feedback) |
| Full suite command | `npm test` (vitest, unit) + `npm run test:e2e` (Playwright) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-07 | Study-commit writes execute in ONE `db.batch()` round trip | unit | `npx vitest run src/app/api/study/complete/route.test.ts` — assert `h.batchCalls.count === 1` | ✅ exists, needs mock rewrite (Pitfall 1) |
| PERF-07 | WR-04 replay-safety still holds after batching | unit | same file — existing "replay safety" describe block, adapted to the new mock | ✅ exists |
| PERF-08 | `saveImageCards` issues exactly ONE `db.insert` for N cards | unit | `npx vitest run src/lib/deck-actions.test.ts` — `expect(db.insert).toHaveBeenCalledTimes(1)` | ✅ exists, needs assertion rewrite (Pitfall 2) |
| PERF-08 | `commitReviewRows` calls `saveImageCards` exactly once (not once per row) | unit | `npx vitest run src/components/review-list.test.ts` — `expect(mockSaveImageCards).toHaveBeenCalledTimes(1)` | ✅ exists, needs mock rewrite |
| PERF-09 | >30-word extraction translates successfully via one batched request | unit | `npx vitest run src/app/api/translate/__tests__/route.test.ts` (NEW) — array-mode happy path + 50-item cap rejection | ❌ Wave 0 — zero existing coverage for this route |
| PERF-09 | Singular `text` mode (translation-form.tsx caller) still works | unit | same new file — regression test for the pre-existing, previously-untested singular path | ❌ Wave 0 |
| PERF-09 | `runTranslationFanOut` sends ONE batched fetch, not N | unit | `npx vitest run src/components/review-list.test.ts` — `expect(mockFetch).toHaveBeenCalledTimes(1)` with `body` containing `texts` array | ✅ exists, needs rewrite |
| PERF-09 | D-04 retry-then-placeholder on batch failure | unit | same file — mock first call reject, second call resolve; assert one retry then fallback text on total failure | needs new test case |
| PERF-10 | `resizeImageForUpload` downscales to ≤1568px long edge | unit | `npx vitest run src/lib/image-resize.test.ts` (NEW) — mocked bitmap dimensions in/out | ❌ Wave 0, new file |
| PERF-10 | Client cap loosened, server cap tightened to 4MB | unit | `npx vitest run src/lib/image-constants.test.ts` — updated constant assertions | ✅ exists, needs value updates |
| PERF-10 | e2e: oversized-original rejection message reflects new cap | e2e | `npx playwright test e2e/11-phase9-image-upload.spec.ts` | ✅ exists, needs cap-value retarget (Pitfall 4) |
| PERF-11 | Clip response carries immutable Cache-Control header | e2e or manual | `curl -I http://localhost:3000/habitat/clips/l1-happy.mp4` (dev) + prod verification per ROADMAP criterion 5 | needs new manual/e2e check — no existing spec asserts response headers for clips |
| Criterion 6 | Core-journey harness + full suite green after all changes | integration | `npm run qa:run` (after any wave touching study/SRS paths, per Phase 17 D-10 precedent) + `npm test` + `npm run test:e2e` | ✅ exists (Phase 15/17 precedent) |

### Sampling Rate
- **Per task commit:** the single most-relevant `npx vitest run <file>` for the file(s) touched.
- **Per wave merge:** `npm test` (full unit suite) + the relevant `e2e/*.spec.ts` files touched by that wave (per this project's established "restart a fresh dev server before e2e, one-spec-per-call" convention).
- **Phase gate:** `npm run qa:run` (Phase 15 core-journey harness — mandatory since PERF-07 touches the study/SRS write path, per the Phase 17 D-10 precedent: "qa:run after any wave touching study/SRS/data paths") + full `npm test` + full `npm run test:e2e` before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/app/api/translate/__tests__/route.test.ts` — NEW, covers PERF-09 (both singular-regression and array-mode paths; zero existing coverage today)
- [ ] `src/lib/image-resize.test.ts` — NEW, covers PERF-10's resize helper (mocked `createImageBitmap`/canvas, per Pitfall 5)
- [ ] `src/app/api/study/complete/route.test.ts` mock rewrite — add a `db.batch` mock (`Promise.all` over the already-eager query-builder promises, per Pitfall 1); this is a REWRITE of Wave-0-adjacent existing infra, not a new file
- [ ] `src/lib/deck-actions.test.ts`'s "continue-on-failure" `saveImageCards` test — rewrite to assert all-or-nothing semantics (Pitfall 2), not new-file but a required pre-existing-test edit before PERF-08 code lands (TDD RED state)
- [ ] No test framework installation needed — vitest and Playwright are already fully configured.

## Security Domain

`security_enforcement` is absent from `.planning/config.json` → treated as enabled per the default rule. PERF-07, PERF-08, and PERF-09 all touch auth-checked write paths and/or a rate-limited API, matching the delivery-plan sketch's own flag that `secure-phase` review is warranted, not optional.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (unchanged) | `auth.api.getSession()` gate — present and untouched in all three modified routes/actions |
| V4 Access Control | yes (strengthened) | Deck/card ownership check — PERF-08 explicitly reduces this from N checks to 1 check per commit; MUST remain a single atomic combined-WHERE ownership gate (existing `and(eq(decks.id,...), eq(decks.userId,...))` pattern, IN-01 precedent) — do not weaken to a check-then-trust pattern |
| V5 Input Validation | yes (new surface) | Zod schemas — the NEW `texts` array field on `/api/translate` MUST carry its own `.max(50)` bound (Pitfall 6); the array-mode extension must not accept unbounded input just because the array shape is new |
| V6 Cryptography | n/a | No crypto surface touched this phase |
| V11 Business Logic (unofficial mapping, but relevant) | yes | `saveImageCards`'s all-or-nothing semantics change (Pitfall 2) is a business-logic behavior change, not a security hole per se, but merits explicit sign-off since it changes what "partial success" means to the end user |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client-side-only enforcement of the new ~20MB photo cap (PERF-10) bypassed by a direct API call with a raw, unresized image | Tampering | The AUTHORITATIVE cap is server-side (`MAX_SERVER_IMAGE_BYTES`, dropping 7MB→4MB) and already double-enforced today (`Content-Length` fast-path + post-parse estimated-bytes check at `src/app/api/extract/route.ts:107-133`) — this phase TIGHTENS that existing authoritative check, it does not introduce a new trust boundary. The client resize is a UX/bandwidth optimization only, never a security control |
| Oversized `texts` array on `/api/translate` used to amplify DeepL API cost/volume while consuming only 1 rate-limit slot | Denial of Service (resource exhaustion, cost amplification) | `.max(50)` on the new Zod field (Pattern 3, Pitfall 6) — independent of trusting `/api/extract`'s cap to always hold |
| `db.batch()` array size unbounded by a compromised/buggy caller | Denial of Service | Already bounded transitively: `CommitSchema.grades` is `.array(...).min(1).max(500)` (existing, unchanged), so `cardUpdateQueries.length` is bounded to ≤500 regardless of the batching refactor |
| Habitat clip URLs made publicly cacheable forever — risk of caching user-specific or sensitive data | Information Disclosure | N/A — clip URLs (`/habitat/clips/l{N}-{mood}.{mp4,webm}`) are level/mood-keyed, not user-keyed; identical content for every user; no session/PII in the URL or response body. Safe to cache publicly and immutably |

## Sources

### Primary (HIGH confidence — direct source/doc reads this session)
- `node_modules/drizzle-orm/neon-http/{session,driver}.d.ts`, `session.js` (installed 0.45.1) — `db.batch()` implementation and type signature
- `node_modules/@neondatabase/serverless/index.d.ts` (installed 1.0.2) — `sql.transaction()` atomicity and single-round-trip guarantee
- `node_modules/deepl-node/dist/translator.d.ts`, `README.md` (installed 1.24.0) — `translateText<T>` array overload, official array usage example
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md` (installed Next 16.2.1) — `headers()` syntax, filesystem-ordering, immutable-asset caveat
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md` — `public/` default `Cache-Control: public, max-age=0`
- `src/app/api/study/complete/route.ts`, `route.test.ts`; `src/components/review-list.tsx`, `review-list.test.ts`; `src/lib/deck-actions.ts`, `deck-actions.test.ts`; `src/app/api/translate/route.ts`; `src/components/image-upload-flow.tsx`, `image-drop-zone.tsx`, `translation-form.tsx`; `src/lib/image-constants.ts`, `image-validation.ts`; `src/app/api/extract/route.ts`; `src/lib/rate-limit.ts`, `src/db/index.ts`; `next.config.ts`; `package.json`; `biome.json`; `vitest.config.ts`; `e2e/11-phase9-image-upload.spec.ts` — all read directly this session

### Secondary (MEDIUM confidence — WebSearch verified against multiple sources)
- DeepL 50-text-per-request limit — multiple independent WebSearch results agree, but the primary `developers.deepl.com/api-reference/translate` page fetched this session only explicitly stated the 128KiB aggregate size limit, not the discrete 50-text count (see Assumptions Log A1)
- `drizzle-team/drizzle-orm` GitHub issue #1301 — TS tuple-cast requirement for dynamically-sized `db.batch()` arrays, cross-referenced against the installed type definitions (which independently confirm the `Readonly<[U, ...U[]]>` constraint)
- Safari 17+ HEIC accept-attribute conversion behavior — WebSearch/community sources; mitigated in this codebase by the existing `accept="image/jpeg,image/png,image/webp"` (no `image/heic`) at `src/components/image-drop-zone.tsx:94`, confirmed by direct grep

### Tertiary (LOW confidence)
- `headers()` dev-vs-prod parity for `public/` assets — inferred from doc silence on the distinction, not explicitly stated either way (see Assumptions Log A2); self-resolving via the phase's own mandated response-header verification step (ROADMAP criterion 5)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library/version claim verified by reading installed `node_modules` source/types directly, not training-data recall
- Architecture: HIGH — every pattern (batch composition, multi-row insert, DeepL array call, headers() config) traced to installed-package source or the mandatory current-docs read
- Pitfalls: HIGH — every pitfall traces to a specific file:line in the current codebase (existing test mocks, hardcoded strings, missing test coverage), not speculative

**Research date:** 2026-07-21
**Valid until:** 30 days (stable dependency versions, no fast-moving APIs involved — the one time-sensitive claim, DeepL's exact per-request text limit, is defensively over-mitigated by the new `.max(50)` server-side guard regardless of the true upstream number)
