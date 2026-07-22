# Phase 26: Performance batch - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 15 (5 production targets + 5 existing tests to rewrite + 3 new test files + next.config.ts + 1 doc-comment touch)
**Analogs found:** 15 / 15 (every target file IS itself the best analog — this phase modifies existing files in place; the "analog" is the adjacent pattern already living in the same file or its sibling)

RESEARCH.md already did deep source-verified analysis (drizzle-orm internals, deepl-node types, Next.js docs) for this phase — this file focuses on **concrete in-repo code excerpts** the planner can copy/adapt directly, cross-checked against current line numbers (re-read 2026-07-21, a few lines drifted from RESEARCH.md's citations; corrected below).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/api/study/complete/route.ts` | route (API handler) | CRUD (batched write) | itself — `recall_events` insert at :224-234 (same file) | exact (in-file precedent) |
| `src/app/api/study/complete/route.test.ts` | test | CRUD | itself — existing `vi.mock("@/db", ...)` chain-mock architecture | exact (mock rewrite, not new pattern) |
| `src/lib/deck-actions.ts` (`saveImageCards`) | service (server action) | CRUD (batched insert) | `src/app/api/study/complete/route.ts:224-234` (multi-row `.values([...])`) | exact (cross-file, same repo convention) |
| `src/lib/deck-actions.test.ts` | test | CRUD | itself — existing hoisted-mock chain architecture | exact (assertion rewrite) |
| `src/app/api/translate/route.ts` | route (API handler) | request-response (external service) | itself — existing singular-`text` schema/handler | exact (additive extension) |
| `src/app/api/translate/__tests__/route.test.ts` (NEW) | test | request-response | `src/app/api/study/complete/route.test.ts` (route POST test shape, rate-limit/auth mocking) | role-match (closest existing route test with auth+rate-limit mocking) |
| `src/components/review-list.tsx` (`commitReviewRows`, `runTranslationFanOut`) | component (client orchestration) | request-response → batched | itself — both functions already exported for tests, structure preserved | exact (loop → single call) |
| `src/components/review-list.test.ts` | test | request-response | itself — existing `mockFetch`/`mockSaveImageCards` hoisted mocks | exact (mock rewrite) |
| `src/components/image-upload-flow.tsx` (`handleExtract`) | component (client orchestration) | file-I/O (client resize before upload) | itself — existing `FileReader`→base64 flow at :250-259 | exact (insert step before existing flow) |
| `src/lib/image-resize.ts` (NEW) | utility | transform (canvas resize) | `src/lib/study-engine.ts`-style pure-function-with-injectable-boundary pattern; jsdom-mock precedent at `src/components/__tests__/image-upload-flow-cancel.test.tsx:1` | role-match (new isolated pure-ish utility, no direct existing analog since no prior canvas code exists) |
| `src/lib/image-resize.test.ts` (NEW) | test | transform | `src/components/__tests__/image-upload-flow-cancel.test.tsx` (`// @vitest-environment jsdom` opt-in convention) | role-match |
| `src/lib/image-constants.ts` | config | — | itself | exact |
| `src/lib/image-validation.ts` | utility | transform (validation) | itself | exact |
| `next.config.ts` | config | — | Next.js 16.2.1 installed docs (`node_modules/next/dist/docs/.../headers.md`) — no prior `headers()` block exists in this repo, config file is currently a stub | no in-repo analog (greenfield config addition), see RESEARCH.md Pattern 4 |
| `e2e/11-phase9-image-upload.spec.ts` | test (e2e) | — | itself | exact (numeric constant retarget) |
| `scripts/render-habitat-clips.mjs` | utility (build script) | — | itself — existing header-comment block at :1-30 | exact (doc-comment addition only) |

## Pattern Assignments

### `src/app/api/study/complete/route.ts` (route, CRUD → batched)

**Analog:** itself — the file already contains the target pattern for one of its three writes.

**Current per-card loop to replace** (lines 236-254):
```typescript
    // b. Update each card with new mastery state, guarded on commitId so a
    //    replayed commit is a per-card no-op.
    for (const update of cardUpdates) {
      await db
        .update(cards)
        .set({
          masteryRound: update.newRound,
          cooldownUntil: update.cooldownUntil,
          recallCount: sql`"recallCount" + ${update.recallCountDelta}`,
          lastStudiedAt: now,
          lastCommitId: commitId,
        })
        .where(
          and(
            eq(cards.id, update.cardId),
            or(isNull(cards.lastCommitId), ne(cards.lastCommitId, commitId)),
          ),
        );
    }
```

**Already-correct sibling pattern to mirror** (lines 222-234, the multi-row insert this phase's `db.batch()` composition sits alongside):
```typescript
  try {
    // a. Batch insert all recall_events (idempotent via deterministic ids).
    await db
      .insert(recall_events)
      .values(
        grades.map((g, i) => ({
          id: recallEventId(commitId, i),
          cardId: g.cardId as CardId,
          direction: g.direction,
          correct: g.correct,
        })),
      )
      .onConflictDoNothing();
```

**The habitat upsert to fold into the same batch** (lines 256-267):
```typescript
    // c. Upsert habitat_metadata — row may not exist yet
    await db
      .insert(habitat_metadata)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        lastActivityAt: now,
      })
      .onConflictDoUpdate({
        target: habitat_metadata.userId,
        set: { lastActivityAt: now },
      });
  } catch (err) {
    console.error("[study/complete] Failed to save session:", err);
    return Response.json({ error: "Failed to save session" }, { status: 500 });
  }
```

**Error handling pattern** (unchanged, wraps whatever replaces lines 222-267): the existing single `try { ... } catch (err) { console.error(...); return 500 }` block around all step-6 writes — `db.batch([...])` call replaces the three separate `await` statements inside this SAME try block, no new error-handling shape needed.

**Stale comment to update as part of this task** (lines 91, 208-221): the "Neon HTTP driver does not support transactions" comment becomes factually outdated once `db.batch()` lands — RESEARCH.md flags this explicitly; update in the same diff, not a follow-up.

**Imports to add:** none new — `db` is already imported from `@/db`; `db.batch()` is a method on the existing `db` object, no new import line required.

---

### `src/app/api/study/complete/route.test.ts` (test, mock rewrite)

**Analog:** itself — the existing `vi.mock("@/db", ...)` factory already models `insert`/`update`/`select` as chains whose terminal method (`.where()`, `.onConflictDoNothing()`) returns an already-resolved `Promise` and applies its side effect **eagerly at construction time**, not at await time (lines 89-142). This is exactly the property RESEARCH.md's Pitfall 1 says makes `db.batch = (queries) => Promise.all(queries)` a correct, minimal-diff mock.

**Existing mock structure to extend** (lines 89-142, reproduced above in full during file read) — add a sibling `batch` key:
```typescript
vi.mock("@/db", () => ({
  db: {
    select: (projection) => ({ /* existing, unchanged */ }),
    insert: () => ({ /* existing, unchanged — already returns eager promises */ }),
    update: () => ({ /* existing, unchanged — already returns eager promises */ }),
    // NEW: db.batch(queries) receives an array of already-resolved-by-construction
    // promises (because insert()/update() above are eager) — Promise.all "executes"
    // the batch while preserving this test file's assertion-on-store-state pattern.
    batch: (queries: Promise<unknown>[]) => {
      h.batchCalls.count++; // add h.batchCalls = { count: 0 } to the vi.hoisted() block
      return Promise.all(queries);
    },
  },
}));
```

**Round-trip-count assertion pattern (D-02 proof)** — mirrors the existing `h.onConflictDoNothingCalls.count` assertion already in this file (lines 196, 223):
```typescript
    expect(h.onConflictDoNothingCalls.count).toBe(1); // existing precedent to copy
    // add analogous:
    expect(h.batchCalls.count).toBe(1);
```

**Existing tests that must keep passing unmodified in behavior** (only the mock changes, not the assertions): "happy path" (lines 180-202), "replay safety" describe block (lines 205-251, WR-04) — both assert on `h.recallEventStore`/`h.cardStore` state, which is unaffected by whether writes go through `Promise.all([...])` inside a `batch` mock vs sequential awaits, since the underlying eager-chain mocks are unchanged.

---

### `src/lib/deck-actions.ts` — `saveImageCards` (service, CRUD → batched)

**Analog:** `src/app/api/study/complete/route.ts:224-234` — the exact multi-row `.values([...])` + array `.map()` shape to mirror, already precedented in this codebase.

**Current per-row loop to replace** (lines 276-298):
```typescript
  // Sequential inserts, continue-on-failure (D-12: Neon HTTP has no transactions)
  const outcomes: Array<{ ok: boolean; error?: string }> = [];
  for (const input of sanitizedInputs) {
    try {
      const id = crypto.randomUUID() as CardId;
      await db.insert(cards).values({
        id,
        deckId: deckId as DeckId,
        front: input.front,
        back: input.back,
        source: "image",
      });
      outcomes.push({ ok: true });
    } catch (err) {
      outcomes.push({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  revalidatePath("/dashboard"); // Once, after all inserts (D-12)
  return outcomes;
```

**Existing ownership-check pattern to keep untouched** (lines 264-274, "single auth + ownership check" — already runs once, D-09 requires this stay as-is):
```typescript
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Verify deck ownership once (T-11-04). Combined-WHERE pattern (IN-01):
  // a single atomic gate that never returns a foreign-user deck row.
  const deckRows = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, deckId as DeckId), eq(decks.userId, userId)));
  if (!deckRows[0]) throw new Error("Forbidden");
```

**Imports:** no new imports needed — `db`, `cards`, `CardId` already imported (lines 3-8).

---

### `src/lib/deck-actions.test.ts` (test, assertion rewrite)

**Analog:** itself — hoisted mock architecture at lines 1-90 (`insertChain = { values: vi.fn().mockResolvedValue(undefined) }`, line 15) already supports a single multi-row `.values()` call with zero structural changes to the mock itself — only the two `saveImageCards` tests below need rewriting.

**Happy-path test to update** (lines 465-487) — `toHaveBeenCalledTimes(2)` → `(1)`, and `.values()` payload assertion moves from a single-object `objectContaining` to an array assertion:
```typescript
  it("inserts each card with source='image' and calls revalidatePath once on happy path", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([
      { id: FAKE_DECK_ID, userId: FAKE_USER_ID },
    ]);

    const result = await saveImageCards(FAKE_DECK_ID, [
      { front: "hello", back: "bonjour" },
      { front: "cat", back: "chat" },
    ]);

    expect(result).toEqual([{ ok: true }, { ok: true }]);
    expect(db.insert).toHaveBeenCalledTimes(2);       // CHANGE TO: toHaveBeenCalledTimes(1)
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({                        // CHANGE TO: expect.arrayContaining([
        source: "image",                                //   expect.objectContaining({ source: "image", front: "hello", back: "bonjour" }),
        front: "hello",                                  // ])
        back: "bonjour",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
```

**Continue-on-failure test to rewrite for all-or-nothing semantics** (lines 489-508) — per RESEARCH.md Pitfall 2, this test currently models a per-row mixed outcome that is structurally impossible after the single-INSERT refactor:
```typescript
  // BEFORE (models impossible-after-refactor mixed outcome):
  it("continue-on-failure: one insert throws but loop returns outcomes for all inputs", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([{ id: FAKE_DECK_ID, userId: FAKE_USER_ID }]);
    insertChain.values
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce(undefined);
    const result = await saveImageCards(FAKE_DECK_ID, [
      { front: "hello", back: "bonjour" },
      { front: "cat", back: "chat" },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ ok: false, error: "DB error" });
    expect(result[1]).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  // AFTER shape (planner to compose): single insertChain.values.mockRejectedValueOnce(...)
  // covering the WHOLE array in one call; assert EVERY outcome in the result is
  // {ok:false, error: "DB error"} — no mixed pair. Add a companion all-succeed test
  // using the existing happy-path mock shape (already covered above).
```

**Empty-array / auth / validation tests (lines 414-463) — no changes needed**, they short-circuit before the insert loop entirely.

---

### `src/app/api/translate/route.ts` (route, request-response, additive extension)

**Analog:** itself — the singular `text`/`translation` contract MUST stay frozen (Pitfall 3 — `translation-form.tsx` is the untouched second caller).

**Full current file** (92 lines) — schema at lines 14-18, rate limiter at lines 8-12, DeepL call at line 84:
```typescript
const translateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
});

const RequestSchema = z.object({
  text: z.string().min(1).max(500),
  sourceLang: z.enum(["en", "fr", "es"]),
  targetLang: z.enum(["en", "fr", "es"]),
});
```

**Extension shape (additive, from RESEARCH.md Pattern 3 — verified against installed deepl-node 1.24.0 types):**
```typescript
const RequestSchema = z.object({
  text: z.string().min(1).max(500).optional(),          // frozen contract — do not remove
  texts: z.array(z.string().min(1).max(500)).min(1).max(50).optional(), // NEW — Pitfall 6: .max(50) is mandatory, independent hardening
  sourceLang: z.enum(["en", "fr", "es"]),
  targetLang: z.enum(["en", "fr", "es"]),
}).refine((v) => (v.text !== undefined) !== (v.texts !== undefined), {
  message: "Provide exactly one of text or texts",
});
```

**Existing auth/rate-limit pattern to keep unchanged** (lines 27-45):
```typescript
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = translateLimiter.check(session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }
```

**Existing DeepL call + response shape to keep frozen for the singular path** (lines 83-91):
```typescript
  try {
    const result = await client.translateText(text, sourceLang, targetLangCode);
    return Response.json({ translation: result.text });
  } catch {
    return Response.json(
      { error: "Translation service unavailable" },
      { status: 502 },
    );
  }
```

**New array branch (additive, before the singular branch, per RESEARCH.md Pattern 3):**
```typescript
  if (parsed.data.texts) {
    try {
      const results = await client.translateText(parsed.data.texts, sourceLang, targetLangCode);
      return Response.json({ translations: results.map((r) => r.text) });
    } catch {
      return Response.json({ error: "Translation service unavailable" }, { status: 502 });
    }
  }
```

---

### `src/app/api/translate/__tests__/route.test.ts` (NEW — zero existing coverage)

**Analog:** `src/app/api/study/complete/route.test.ts` for the auth/rate-limit mock shape (`vi.mock("@/lib/auth", ...)`, `vi.mock("@/lib/rate-limit", ...)`, `vi.mock("next/headers", ...)` — lines 44-58 of that file) — the same three mocks apply verbatim to `/api/translate`.

**Mocks to copy/adapt (from `route.test.ts` lines 44-58):**
```typescript
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: h.getSession } },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ check: h.limiterCheck })),
}));

// NEW for this file — mock the deepl-node client itself:
vi.mock("deepl-node", () => ({
  DeepLClient: vi.fn().mockImplementation(() => ({
    translateText: h.translateText, // vi.fn() — configure per test to return
                                      // a single TextResult or TextResult[]
  })),
}));
```

**Coverage required (per RESEARCH.md Validation Architecture / Wave 0 Gaps):**
1. Singular `text` regression path — `{translation: string}` response shape (freezes the untested-until-now contract).
2. New `texts` array path — happy path, `{translations: string[]}`, order-preserved.
3. `.max(50)` rejection — a 51-item array returns 400.
4. `refine()` mutual-exclusivity — both `text` and `texts` present (or neither) returns 400.

---

### `src/components/review-list.tsx` — `commitReviewRows` + `runTranslationFanOut` (component orchestration)

**Analog:** itself — both functions are already isolated, exported-for-tests pure(ish) orchestration helpers (lines 253-321); this phase changes their internals, not their signatures or call sites in the component.

**`commitReviewRows` current per-row loop to replace** (lines 293-321):
```typescript
export async function commitReviewRows(
  rows: TranslationRow[],
  deckId: string,
  duplicates: string[],
): Promise<CommitResult> {
  let addedCount = 0;
  let failedCount = 0;

  for (const row of rows) {
    try {
      const [result] = await saveImageCards(deckId, [
        { front: row.nativeText.trim(), back: row.word.trim() },
      ]);
      if (result?.ok) {
        addedCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  return {
    addedCount,
    failedCount,
    skippedCount: duplicates.length,
  };
}
```
**New shape (D-09, all-or-nothing per PERF-08):** one `saveImageCards(deckId, rows.map(...))` call, then derive `addedCount`/`failedCount` from the single returned outcomes array (all-same-outcome now, per deck-actions.ts Pitfall 2 note above).

**`runTranslationFanOut` current per-word fan-out to replace** (lines 253-291):
```typescript
export async function runTranslationFanOut(
  rows: TranslationRow[],
  targetLang: string,
  nativeLang: string,
): Promise<TranslationFanOutResult[]> {
  const results = await Promise.allSettled(
    rows.map((row) =>
      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: row.word,
          sourceLang: targetLang,
          targetLang: nativeLang,
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error("Translation failed");
        const data = TranslationResponseSchema.parse(await res.json());
        return data.translation;
      }),
    ),
  );

  return rows.map((row, i) => {
    const result = results[i];
    if (result?.status === "fulfilled") {
      return { id: row.id, nativeText: result.value, translationError: null } satisfies TranslationFanOutResult;
    }
    return { id: row.id, nativeText: "", translationError: "Translation unavailable — enter manually." } satisfies TranslationFanOutResult;
  });
}
```
**New shape (D-03/D-04):** ONE `fetch("/api/translate", { body: JSON.stringify({ texts: rows.map(r => r.word), sourceLang: targetLang, targetLang: nativeLang }) })`; on failure, ONE automatic retry of the whole batch; on second failure, fall back to the EXISTING per-word `"Translation unavailable — enter manually."` placeholder (zip `translations[]` back onto `rows` by index — order-preserved per DeepL SDK contract).

**Existing "Translation unavailable" placeholder string to reuse verbatim (D-04 — zero new UI):** `"Translation unavailable — enter manually."` (line 288, and `translation-form.tsx:273` has the sibling copy — keep both, do not consolidate, they are different components).

---

### `src/components/review-list.test.ts` (test, mock rewrite)

**Analog:** itself — hoisted mocks `mockFetch` and `mockSaveImageCards` already exist (line 21) and are wired as `global.fetch = mockFetch` (line 66) and a `vi.mock("@/lib/deck-actions", ...)` (line 43). Rewrite call-count assertions from N-calls to 1-call; add a retry-then-fallback test case per D-04 (mock first `mockFetch` call reject, second resolve).

---

### `src/components/image-upload-flow.tsx` — `handleExtract` (component, file-I/O)

**Analog:** itself — the existing `FileReader` → base64 `dataUrl` → `fetch("/api/extract")` flow (lines 250-291) is the exact insertion point; the resize step runs on `state.file` BEFORE the `FileReader` step, producing a resized `Blob`/`File` that then flows through the existing unchanged FileReader → fetch pipeline.

**Current flow (lines 250-291) — insertion point is right after line 251 (`const file = state.file;`):**
```typescript
    // Read file as data-URL (file is guaranteed non-null by the guard above)
    const file = state.file;
    // >>> INSERT HERE: const resized = await resizeImageForUpload(file); then use
    //     `resized` (a Blob) in place of `file` for the FileReader step below.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.readAsDataURL(file);
    });
```

**Friendly-error copy referencing the OLD 5MB story to update (D-07, Pitfall 4):**
```typescript
// line 137 — currently:
    case 413:
      return "That image is too large for the server to process. Please choose a smaller image (under 5MB).";
// update the "5MB" number to match the NEW server cap (4MB per D-07)
```

**Cancelled-guard pattern already in this file (line 199, keep untouched, resize must respect it too):**
```typescript
  // D-03: cancelled guard — modeled on review-list.tsx line 451
  const cancelled = useRef(false);
```

---

### `src/lib/image-resize.ts` (NEW — no direct in-repo analog, greenfield utility)

**Analog:** no prior canvas/image-processing code exists in this repo (confirmed by RESEARCH.md's `node_modules` grep for image libs — none present). Structure follows this repo's general "isolate the browser-API boundary into a small function, test the pure logic with mocks" convention (same spirit as `src/lib/study-engine.ts`'s exported-for-testing pure functions, and `buildCooldownConfig`'s exported-for-testing pattern in `route.ts:30`).

**Full implementation, verified against installed browser API surface (RESEARCH.md Pattern 5, MDN-sourced):**
```typescript
// src/lib/image-resize.ts — NEW FILE
export async function resizeImageForUpload(
  file: File,
  { maxEdge = 1568, quality = 0.8 }: { maxEdge?: number; quality?: number } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // auto-orients per EXIF by default ("from-image")
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
}
```

---

### `src/lib/image-resize.test.ts` (NEW)

**Analog:** `src/components/__tests__/image-upload-flow-cancel.test.tsx:1` for the `// @vitest-environment jsdom` per-file opt-in convention (this project's global vitest default is `environment: "node"`, per `vitest.config.ts:6`).

**Header convention to copy:**
```typescript
// @vitest-environment jsdom
```

**Mock shape needed (jsdom does not implement any of these — RESEARCH.md Pitfall 5):**
```typescript
global.createImageBitmap = vi.fn().mockResolvedValue({ width: 3000, height: 2000, close: vi.fn() });
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({ drawImage: vi.fn() });
HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob(["fake"], { type: "image/jpeg" })));
```

---

### `src/lib/image-constants.ts` (config)

**Full current file (11 lines):**
```typescript
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
// Authoritative server-side cap (decoded byte estimate / Content-Length).
// Kept ~2MB above the client UI cap to absorb base64 overhead + small slack.
export const MAX_SERVER_IMAGE_BYTES = 7 * 1024 * 1024; // 7,340,032 bytes
// Conservative client-side cap surfaced in user-facing copy.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes
```
**D-07 changes:** `MAX_IMAGE_BYTES` (client) → ~20MB (`20 * 1024 * 1024`); `MAX_SERVER_IMAGE_BYTES` → 4MB (`4 * 1024 * 1024`, down from 7MB). Update the explanatory comments too (the "kept ~2MB above" relationship inverts — server is now BELOW the loosened client cap on purpose, per D-07's rationale).

**`src/lib/image-constants.test.ts` (11 line file) to update in the same wave:**
```typescript
  it("MAX_IMAGE_BYTES is exactly 5MB", () => {          // rename + retarget
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);        // -> toBe(20 * 1024 * 1024)
  });
  // add a MAX_SERVER_IMAGE_BYTES assertion -> toBe(4 * 1024 * 1024)
```

---

### `src/lib/image-validation.ts` (utility)

**Full current file (32 lines) — the "under 5MB" copy string to update (line 28):**
```typescript
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      message: `That image is ${mb}MB — please pick one under 5MB.`,  // "5MB" -> new client cap (~20MB)
    };
  }
```
Note: this message derives `MAX_IMAGE_BYTES` correctly via import (line 1) but hardcodes "5MB" as a LITERAL in the copy string — grep confirms no template-literal derivation exists today; the planner should either interpolate the constant or hand-update the literal (Pitfall 4).

---

### `next.config.ts` (config, greenfield — currently a stub)

**Current full file (7 lines, no existing `headers()` block):**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

**Target shape (verified against `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md`, installed Next 16.2.1 — per AGENTS.md's mandatory current-docs-read caveat, NOT training-data recall):**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // NAMING RULE (D-08): any future clip re-render MUST ship under a NEW
        // filename — this header caches l{N}-{mood}.{mp4,webm} FOREVER; a
        // same-name replacement is invisible to returning users.
        source: "/habitat/clips/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

### `scripts/render-habitat-clips.mjs` (doc-comment addition, D-08 companion)

**Existing header-comment block to extend (lines 1-30, reproduced from read above)** — add a new paragraph documenting the D-08 naming rule directly beneath the existing pipeline description, e.g. after the "Seamless loop" paragraph (~line 25-28): a `// ── Cache-Control (Phase 26 PERF-11) ──` block stating any future re-render of an existing `l{N}-{mood}` clip MUST ship under a new filename, since `next.config.ts`'s `immutable` header makes same-name replacement invisible to returning users.

---

### `e2e/11-phase9-image-upload.spec.ts` (e2e test, constant retarget)

**Existing oversized-file assertion to retarget (lines 56-65):**
```typescript
  // 4. Oversized (>5MB) rejected, error names the size
  await fileInput.setInputFiles({
    name: "huge.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1024, 1),   // -> Buffer.alloc(20 * 1024 * 1024 + 1024, 1)
  });
  await expect(
    page.getByTestId("file-error").getByText(/please pick one under 5MB/i),  // -> /please pick one under 20MB/i
  ).toBeVisible();
```
Buffer allocation for the new ~20MB cap is larger (~21MB) — flag to planner as a minor e2e runtime/memory increase, acceptable per D-07's explicit cap-loosening decision.

## Shared Patterns

### Auth + rate-limit gate (applies to `study/complete/route.ts` and `translate/route.ts`)
**Source:** `src/app/api/study/complete/route.ts:97-115` and `src/app/api/translate/route.ts:27-45` — both routes share the identical three-line shape:
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
const limit = someLimiter.check(session.user.id);
if (!limit.allowed) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } });
```
**Apply to:** `/api/translate`'s route.ts is UNCHANGED by this pattern (already has it) — cited here only so the planner does not accidentally touch it while adding the `texts` branch.

### Combined-WHERE ownership check (IN-01 precedent, applies to `deck-actions.ts`)
**Source:** `src/lib/deck-actions.ts:270-274` (`saveImageCards`) and repeated in `getSameLanguageDeckBackWords:205-208` — a single atomic `and(eq(decks.id, ...), eq(decks.userId, ...))` WHERE clause that never returns a foreign-user row. **Apply to:** keep exactly as-is per D-09 ("Auth/ownership checked once per commit, not once per card" — already true today, do not weaken to check-then-trust).

### Multi-row `.values([...])` insert (the master pattern this whole phase generalizes)
**Source:** `src/app/api/study/complete/route.ts:224-234` (recall_events). **Apply to:** `deck-actions.ts`'s `saveImageCards` (PERF-08). This is the single most load-bearing excerpt in this phase — RESEARCH.md and this file both point to the same six lines as the canonical shape to mirror.

### `db.batch()` tuple-cast requirement (drizzle-orm 0.45.1 known friction point)
**Source:** RESEARCH.md Architecture Patterns → Pattern 1 (no in-repo precedent exists yet — this IS the first `db.batch()` usage in the codebase). `db.batch<U, T extends Readonly<[U, ...U[]]>>()` requires `as [Batchable, ...Batchable[]]` when composing from a `.map()`-built array. **Apply to:** `study/complete/route.ts` only (the sole batch() call site this phase).

### "Translation unavailable — enter manually." placeholder string (D-04, zero new UI)
**Source:** `src/components/review-list.tsx:288` (existing, to be preserved as the batch-failure fallback) and `src/components/translation-form.tsx:273` (a separate, NOT-in-scope sibling copy — do not consolidate). **Apply to:** `runTranslationFanOut`'s new retry-then-fallback logic reuses this exact string verbatim.

### `// @vitest-environment jsdom` per-file opt-in (project convention, global default is `"node"`)
**Source:** `src/components/__tests__/image-upload-flow-cancel.test.tsx:1`, confirmed against `vitest.config.ts:6`'s global `node` default. **Apply to:** `src/lib/image-resize.test.ts` (NEW).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/image-resize.ts` | utility | transform | No canvas/image-processing code exists anywhere in this repo today — this is the first. Use RESEARCH.md's verified MDN-sourced implementation (reproduced above) rather than an in-repo analog. |
| `next.config.ts` `headers()` block | config | — | Current file is a stub with zero prior `headers()` usage. Use the installed-Next-16.2.1-docs-verified shape (reproduced above per AGENTS.md's mandatory caveat) rather than an in-repo analog. |

## Metadata

**Analog search scope:** `src/app/api/study/complete/`, `src/app/api/translate/`, `src/lib/deck-actions.ts` + test, `src/components/review-list.tsx` + test, `src/components/image-upload-flow.tsx`, `src/components/translation-form.tsx`, `src/lib/image-constants.ts`, `src/lib/image-validation.ts`, `src/lib/rate-limit.ts`, `src/components/__tests__/image-upload-flow-cancel.test.tsx`, `next.config.ts`, `e2e/11-phase9-image-upload.spec.ts`, `scripts/render-habitat-clips.mjs`
**Files scanned:** 16 read directly, line numbers re-verified 2026-07-21 (matches RESEARCH.md closely; a handful of ±1-3 line drifts noted and corrected above)
**Pattern extraction date:** 2026-07-21
