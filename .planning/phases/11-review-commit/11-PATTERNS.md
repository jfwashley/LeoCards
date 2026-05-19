# Phase 11: Review & Commit — Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 5 (3 new, 2 modified)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/review-list.tsx` | component (client, useReducer state machine) | request-response + event-driven | `src/components/translation-form.tsx` (two-field edit + saveCard) + `src/components/image-upload-flow.tsx` (reducer conventions + in-flight render branches) | exact (dual analog) |
| `src/lib/deck-actions.ts` — add `getSameLanguageDeckBackWords` | service / server action | CRUD (read-only, ownership-scoped) | existing `saveCard` / `addWordToCard` in same file (auth → ownership → db query pattern) | exact |
| `src/lib/deck-actions.ts` — add `saveImageCards` (batched) | service / server action | CRUD (batch insert, continue-on-failure) | `saveCard` in same file (auth → ownership → insert → revalidatePath); `addWordToCard` for ownership idiom | exact |
| `src/lib/deck-actions.ts` — widen `saveCard` source union | config / type edit | N/A (one-line TS edit) | `saveCard` itself (line 69) | exact |
| `src/components/image-upload-flow.tsx` — replace EXTRACT_SUCCESS stub | component edit | event-driven (reducer branch replacement) | existing EXTRACT_SUCCESS branch (lines 381-399) — replace with `<ReviewList>` render | exact |
| `src/components/review-list.test.ts` | test | unit (reducer pure fn + async fn) | `src/app/api/extract/__tests__/extract.unit.test.ts` (vi.hoisted + vi.mock + beforeEach clearAllMocks); `src/lib/deck-actions.test.ts` (db chain mocks, auth mock, describe/it structure) | exact |
| `src/lib/deck-actions.test.ts` — extend with `getSameLanguageDeckBackWords` + `saveImageCards` | test | unit (server action mocks) | existing `src/lib/deck-actions.test.ts` — extend same file | exact |

---

## Pattern Assignments

---

### `src/components/review-list.tsx` (component, request-response + event-driven)

**Primary analog:** `src/components/translation-form.tsx`
**Secondary analog:** `src/components/image-upload-flow.tsx`

---

**Imports pattern** — copy from `translation-form.tsx` lines 1-11 + add `useRouter` + `getSameLanguageDeckBackWords` / `saveImageCards`:

```typescript
"use client";

import { CheckCircle2, Loader2, X } from "lucide-react";
import { useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSameLanguageDeckBackWords, saveImageCards } from "@/lib/deck-actions";
```

Note: `useDebounceCallback` from `use-debounce` is NOT needed — Step B translations fire once on "Next: translate", not on keystroke (no debounce per RESEARCH.md "Don't Hand-Roll").

---

**TranslationResponseSchema** — re-declare locally (do not import from `translation-form.tsx`):

From `translation-form.tsx` lines 13-15:
```typescript
const TranslationResponseSchema = z.object({
  translation: z.string().min(1),
});
```

---

**Reducer shape** — follows `translation-form.tsx` `formReducer` pattern (spread-and-override, never mutate) and `image-upload-flow.tsx` `imageFlowReducer` convention (lines 44-105):

From `image-upload-flow.tsx` lines 84-86 (verified spread pattern):
```typescript
case "EXTRACT_SUCCESS":
  return { ...state, extracting: false, extractWords: action.words };
```

Every ReviewList reducer case must follow the same `{ ...state, fieldChanged: newValue }` immutable spread. Never mutate `state` fields directly.

Full ReviewList reducer type shape (from RESEARCH.md Focus Area 5 — verified):
```typescript
type ReviewStep =
  | "loading-dedupe"
  | "step-a"
  | "translating"
  | "step-b"
  | "committing"
  | "success";

interface ReviewRow {
  id: string;
  word: string;
  kept: boolean;
}

interface TranslationRow {
  id: string;
  targetText: string;
  nativeText: string;
  translationError: string | null;
}

interface ReviewState {
  step: ReviewStep;
  rows: ReviewRow[];
  duplicates: string[];
  translationRows: TranslationRow[];
  dedupeError: string | null;
  addedCount: number;
  failedCount: number;
}
```

---

**Props interface** — mirrors `TranslationFormProps` (translation-form.tsx lines 17-23) plus `onCancel`:

```typescript
interface ReviewListProps {
  words: string[];          // state.extractWords from image-upload-flow
  deckId: string;           // state.selectedDeckId
  nativeLang: string;       // prop threaded from new-card/page.tsx server component
  targetLang: string;       // decks.find(d => d.id === selectedDeckId)?.language
  onCancel: () => void;     // () => dispatch({ type: "BACK_TO_PICK" }) in outer flow
}
```

---

**Cancel race guard ref** — copy `activeField` ref pattern from `translation-form.tsx` lines 109, 135, 143:

```typescript
// translation-form.tsx line 109
const activeField = useRef<"native" | "target" | null>(null);

// Guard in async callback (lines 135-141):
if (activeField.current === direction) {
  dispatch({ type: "TRANSLATE_DONE", ... });
}
```

For ReviewList, use a `cancelled` ref instead:
```typescript
const cancelled = useRef(false);
// In onCancel handler: cancelled.current = true
// In Promise.allSettled .then() callbacks: if (cancelled.current) return;
```

---

**Fan-out translation** — copy `/api/translate` client call from `translation-form.tsx` lines 122-133, adapted for batch:

```typescript
// translation-form.tsx lines 122-133 (single-word call):
const response = await fetch("/api/translate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text, sourceLang, targetLang: destLang }),
});
if (!response.ok) {
  throw new Error("Translation failed");
}
const data = TranslationResponseSchema.parse(await response.json());
```

For Phase 11 fan-out (target→native direction, D-08):
```typescript
const results = await Promise.allSettled(
  keptWords.map((word) =>
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: word, sourceLang: targetLang, targetLang: nativeLang }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Translation failed");
      return TranslationResponseSchema.parse(await res.json()).translation;
    })
  )
);
```

---

**saveCard call pattern** — copy from `translation-form.tsx` lines 177-182, change `"manual"` → `"image"`:

```typescript
// translation-form.tsx lines 177-182:
await saveCard(
  deckId,
  state.nativeText.trim(),   // front = native
  state.targetText.trim(),   // back = target
  "manual",
);
// Phase 11: replace "manual" with "image", loop per row via saveImageCards
```

---

**In-flight button pattern** — copy from `image-upload-flow.tsx` lines 288-299 (extraction in-flight):

```typescript
// image-upload-flow.tsx lines 288-299:
<Button
  className="w-full h-11"
  variant="default"
  disabled
  aria-busy="true"
  aria-label="Extracting words, please wait"
>
  <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
  Extracting words…
</Button>
<p className="text-sm text-muted-foreground text-center">
  This can take up to 30 seconds…
</p>
```

For commit in-flight (change copy per UI-SPEC):
```typescript
<Button
  className="w-full h-11"
  variant="default"
  disabled
  aria-busy="true"
  aria-label="Adding cards, please wait"
>
  <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
  Adding cards…
</Button>
```

---

**Skeleton shimmer** — copy from `translation-form.tsx` lines 218-219:

```typescript
// translation-form.tsx line 218-219 (isNativeReceiving skeleton):
<div className="bg-muted animate-pulse rounded-md h-10 w-full" />
```

For Step B per-row native field during loading:
```typescript
<div className="bg-muted animate-pulse rounded-md h-8 w-full" />
```
(h-8 per UI-SPEC; h-10 is the larger size from TranslationForm — the row Input uses h-8)

---

**Two-field editable grid** — copy from `translation-form.tsx` lines 214-248 (responsive grid + Label + Input per field):

```typescript
// translation-form.tsx lines 214-248:
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
  <div className="flex flex-col gap-1.5">
    <Label htmlFor="native-input">{nativeLangLabel}</Label>
    {isNativeReceiving ? (
      <div className="bg-muted animate-pulse rounded-md h-10 w-full" />
    ) : (
      <Input
        id="native-input"
        type="text"
        value={state.nativeText}
        onChange={handleNativeChange}
        placeholder={`Type in ${nativeLangLabel}…`}
        disabled={state.isSaving}
      />
    )}
  </div>
  <div className="flex flex-col gap-1.5">
    <Label htmlFor="target-input">{targetLangLabel}</Label>
    ...
  </div>
</div>
```

For Step B ReviewTranslationRow, adapt with unique per-row IDs (`native-{i}`, `target-{i}`) and `gap-1` / `h-8` per UI-SPEC spacing normalisation. Label text comes from nativeLangLabel / targetLangLabel props (passed from ImageUploadFlow).

---

**Inline error pattern** — copy from `image-upload-flow.tsx` line 329:

```typescript
// image-upload-flow.tsx line 329:
<p role="alert" className="text-sm text-destructive mt-1">
  <AlertCircle className="inline size-4 mr-1" aria-hidden="true" />
  {friendlyErrorCopy(state.extractError.status)}
</p>
```

For per-row translation failure (without icon per UI-SPEC — icon is optional):
```typescript
<p className="text-sm text-destructive mt-1" role="alert">
  Translation unavailable — enter manually.
</p>
```

---

**Back button pattern** — copy from `image-upload-flow.tsx` lines 322-327:

```typescript
// image-upload-flow.tsx lines 322-327:
<Button
  variant="ghost"
  onClick={() => dispatch({ type: "BACK_TO_PICK" })}
  className="inline-flex items-center gap-1 text-sm text-muted-foreground"
>
  <ArrowLeft className="size-4" />
  Back
</Button>
```

For Step B "← Back": same variant, copy "← Back" per UI-SPEC (no ArrowLeft icon import needed if using text arrow).

---

**Success navigation** — use `useRouter` from `next/navigation` (same App Router client pattern implied by existing client components):

```typescript
const router = useRouter();
// handleGoToDeck:
router.push(`/dashboard?deck=${deckId}`);
```

---

### `src/lib/deck-actions.ts` — `getSameLanguageDeckBackWords` (server action, CRUD read)

**Analog:** existing `saveCard` function in same file (lines 65-89) for auth + ownership pattern; `editCard` (lines 99-120) for `innerJoin` pattern.

---

**Auth + ownership pattern** — copy from `saveCard` lines 71-81:

```typescript
// deck-actions.ts lines 71-81:
const session = await auth.api.getSession({ headers: await headers() });
if (!session) throw new Error("Unauthorized");
const userId = session.user.id as UserId;

// Verify deck ownership
const deckRows = await db
  .select()
  .from(decks)
  .where(eq(decks.id, deckId as DeckId));
const deck = deckRows[0];
if (!deck || deck.userId !== userId) throw new Error("Forbidden");
```

---

**innerJoin pattern** — copy from `editCard` lines 105-113:

```typescript
// deck-actions.ts lines 105-113:
const rows = await db
  .select({ cardId: cards.id, deckUserId: decks.userId })
  .from(cards)
  .innerJoin(decks, eq(cards.deckId, decks.id))
  .where(eq(cards.id, cardId as CardId));
```

For `getSameLanguageDeckBackWords` second query (all same-language back values):
```typescript
const rows = await db
  .select({ back: cards.back })
  .from(cards)
  .innerJoin(decks, eq(cards.deckId, decks.id))
  .where(
    and(
      eq(decks.userId, userId),
      eq(decks.language, targetDeck.language),
    ),
  );
return new Set(rows.map((r) => r.back.trim().toLowerCase()));
```

---

**Full `getSameLanguageDeckBackWords` implementation** (from RESEARCH.md Focus Area 2 — verified Drizzle patterns):

```typescript
export async function getSameLanguageDeckBackWords(
  deckId: string,
): Promise<Set<string>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Step 1: Get target deck language + verify ownership
  const [targetDeck] = await db
    .select({ language: decks.language })
    .from(decks)
    .where(and(eq(decks.id, deckId as DeckId), eq(decks.userId, userId)));

  if (!targetDeck) throw new Error("Forbidden");

  // Step 2: Get all back values from cards in same-language decks owned by user
  const rows = await db
    .select({ back: cards.back })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(
        eq(decks.userId, userId),
        eq(decks.language, targetDeck.language),
      ),
    );

  return new Set(rows.map((r) => r.back.trim().toLowerCase()));
}
```

Note: Both `and` and `eq` are already imported at line 3 of deck-actions.ts.

---

### `src/lib/deck-actions.ts` — `saveImageCards` (server action, batch insert)

**RECOMMENDED approach** (over N-loop `saveCard` calls from client — see RESEARCH.md Focus Area 4 open question). Batched action = one auth+ownership check, one `revalidatePath`, same continue-on-failure semantics.

**Analog:** `saveCard` (lines 65-89) for auth + ownership + insert + revalidatePath structure.

---

**Full `saveImageCards` implementation** — based on `saveCard` pattern:

```typescript
export async function saveImageCards(
  deckId: string,
  cardInputs: Array<{ front: string; back: string }>,
): Promise<Array<{ ok: boolean; error?: string }>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // Verify deck ownership once
  const deckRows = await db
    .select()
    .from(decks)
    .where(eq(decks.id, deckId as DeckId));
  const deck = deckRows[0];
  if (!deck || deck.userId !== userId) throw new Error("Forbidden");

  // Sequential inserts, continue-on-failure (D-12: Neon HTTP has no transactions)
  const outcomes: Array<{ ok: boolean; error?: string }> = [];
  for (const input of cardInputs) {
    try {
      const id = crypto.randomUUID() as CardId;
      await db
        .insert(cards)
        .values({ id, deckId: deckId as DeckId, front: input.front, back: input.back, source: "image" });
      outcomes.push({ ok: true });
    } catch (err) {
      outcomes.push({ ok: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  revalidatePath("/dashboard"); // Once, after all inserts
  return outcomes;
}
```

**Alternative (N-loop `saveCard` from client)** — also correct per D-12, but fires N revalidatePath calls and N auth+ownership round-trips. Acceptable for v1 given ~50 word cap. If planner chooses N-loop, pattern is from `translation-form.tsx` lines 171-192 (async handler + try/catch + dispatch result):

```typescript
// N-loop pattern (client-side):
const outcomes: Array<{ word: string; ok: boolean }> = [];
for (const row of stepBRows) {
  try {
    await saveCard(deckId, row.nativeText.trim(), row.targetText.trim(), "image");
    outcomes.push({ word: row.targetText, ok: true });
  } catch {
    outcomes.push({ word: row.targetText, ok: false });
  }
}
```

**Planner note:** Research recommends `saveImageCards` (batched). Either satisfies D-12. Map both patterns here; planner decides.

---

### `src/lib/deck-actions.ts` — widen `saveCard` source union (one-line edit)

**Analog:** `saveCard` itself, line 69.

```typescript
// BEFORE (deck-actions.ts line 69):
source: "manual" | "wordlist",

// AFTER:
source: "manual" | "wordlist" | "image",
```

No other files require edits for D-11. `translation-form.tsx` passes `"manual"` (unchanged). `addWordToCard` hardcodes `"wordlist"` in the values object (not via the `saveCard` signature — unchanged). `removeWordFromDeck` filters by `eq(cards.source, "wordlist")` — unaffected.

---

### `src/components/image-upload-flow.tsx` — replace EXTRACT_SUCCESS stub (component edit)

**Analog:** existing EXTRACT_SUCCESS render branch, lines 381-399.

Current stub (lines 381-399):
```typescript
// State 2 — Success (EXT-01 hand-off stub): extractWords is non-empty array
if (Array.isArray(state.extractWords) && state.extractWords.length > 0) {
  const N = state.extractWords.length;
  return (
    <div className="flex flex-col gap-4">
      <img ... />
      <p className="text-sm text-muted-foreground">
        Found {N} word{N !== 1 ? "s" : ""} — ready to review.
      </p>
      {/* Phase 11 wires the handler — leave disabled, do NOT navigate */}
      <Button className="w-full h-11" variant="default" disabled>
        Review words →
      </Button>
    </div>
  );
}
```

Replace with (from RESEARCH.md Focus Area 5 verified):
```typescript
if (Array.isArray(state.extractWords) && state.extractWords.length > 0) {
  const deck = decks.find((d) => d.id === state.selectedDeckId);
  return (
    <ReviewList
      words={state.extractWords}
      deckId={state.selectedDeckId}
      nativeLang={nativeLang}
      targetLang={deck?.language ?? "fr"}
      onCancel={() => dispatch({ type: "BACK_TO_PICK" })}
    />
  );
}
```

Props available in scope:
- `decks` — `ImageUploadFlowProps.decks` (line 15), available throughout the component
- `state.selectedDeckId` — reducer state (line 25)
- `nativeLang` — `ImageUploadFlowProps.nativeLang` (line 18)
- `dispatch` — from `useReducer` (line 136)

Add `import { ReviewList } from "@/components/review-list";` to the import block at the top of `image-upload-flow.tsx`.

---

### `src/components/review-list.test.ts` (test, unit)

**Primary analog:** `src/app/api/extract/__tests__/extract.unit.test.ts` — for `vi.hoisted` before `vi.mock` pattern and overall structure.

**Secondary analog:** `src/lib/deck-actions.test.ts` — for db chain mock setup and `beforeEach` clearAllMocks + re-wire pattern.

---

**vi.hoisted pattern** — copy from `extract.unit.test.ts` lines 1-10:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession, mockFetch } = vi.hoisted(() => {
  return {
    mockGetSession: vi.fn(),
    mockFetch: vi.fn(),
  };
});
```

---

**Auth mock** — copy from `extract.unit.test.ts` lines 16-18:

```typescript
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
```

---

**next/headers mock** — copy from `extract.unit.test.ts` line 12-14:

```typescript
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
```

---

**next/cache mock** (needed for `getSameLanguageDeckBackWords`/`saveImageCards` tests) — copy from `deck-actions.test.ts` lines 41-43:

```typescript
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
```

---

**db chain mock setup** — copy from `deck-actions.test.ts` lines 4-34 (vi.hoisted chain setup) and lines 52-60 (vi.mock db):

```typescript
// vi.hoisted chain factory (deck-actions.test.ts lines 6-34):
const { selectChain, insertChain } = vi.hoisted(() => {
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
    innerJoin: vi.fn(),
  };
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  selectChain.innerJoin.mockReturnValue(selectChain);

  const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
  return { selectChain, insertChain };
});

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
  },
}));
```

---

**beforeEach clearAllMocks + re-wire** — copy from `deck-actions.test.ts` lines 85-113:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // Re-wire chain return values after clearAllMocks
  vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>);
  vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  selectChain.innerJoin.mockReturnValue(selectChain);
  insertChain.values.mockResolvedValue(undefined);
});
```

---

**Test structure for pure reducer** — `reviewListReducer` is a pure function; no mocks needed. Follow vitest `describe/it/expect` pattern from `deck-actions.test.ts`:

```typescript
describe("reviewListReducer", () => {
  it("TOGGLE_WORD flips kept state", () => {
    const state = /* initial with rows */;
    const next = reviewListReducer(state, { type: "TOGGLE_WORD", id: "row-0" });
    expect(next.rows[0].kept).toBe(false);
  });
  // ... cover all action types per RESEARCH.md test map
});
```

---

**Test for `getSameLanguageDeckBackWords`** — extend `deck-actions.test.ts` (file already exists); follow `saveCard` describe block pattern (lines 184-215):

```typescript
describe("getSameLanguageDeckBackWords", () => {
  it("throws Unauthorized when no session", async () => {
    mockNoSession();
    await expect(getSameLanguageDeckBackWords(FAKE_DECK_ID)).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden when deck not owned by user", async () => {
    mockSession();
    selectChain.where.mockResolvedValueOnce([]); // no deck row = forbidden
    await expect(getSameLanguageDeckBackWords(FAKE_DECK_ID)).rejects.toThrow("Forbidden");
  });

  it("returns Set of trimmed lowercase back values for same-language decks", async () => {
    mockSession();
    // First query: target deck language lookup
    selectChain.where.mockResolvedValueOnce([{ language: "fr" }]);
    // Second query: card back values
    selectChain.where.mockResolvedValueOnce([
      { back: "Chien" },
      { back: "  chat  " },
    ]);
    const result = await getSameLanguageDeckBackWords(FAKE_DECK_ID);
    expect(result).toEqual(new Set(["chien", "chat"]));
  });
});
```

---

## Shared Patterns

### Authentication (all server actions)

**Source:** `src/lib/deck-actions.ts` lines 71-73
**Apply to:** `getSameLanguageDeckBackWords`, `saveImageCards`

```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) throw new Error("Unauthorized");
const userId = session.user.id as UserId;
```

---

### Ownership Check (deck-scoped)

**Source:** `src/lib/deck-actions.ts` lines 75-81 (`saveCard`) and lines 170-174 (`addWordToCard`)
**Apply to:** `getSameLanguageDeckBackWords` (combined with language lookup), `saveImageCards`

```typescript
const deckRows = await db
  .select()
  .from(decks)
  .where(eq(decks.id, deckId as DeckId));
const deck = deckRows[0];
if (!deck || deck.userId !== userId) throw new Error("Forbidden");
```

---

### revalidatePath

**Source:** `src/lib/deck-actions.ts` line 87 (`saveCard`)
**Apply to:** `saveImageCards` (once, after loop — NOT per-insert)

```typescript
revalidatePath("/dashboard");
```

---

### Reducer Immutable Spread

**Source:** `src/components/image-upload-flow.tsx` lines 49-105
**Apply to:** `reviewListReducer` in `review-list.tsx`

Every case returns `{ ...state, changedField: newValue }`. Never mutate `state` in place. Return `state` unchanged in the `default` case.

---

### In-flight Disabled State

**Source:** `src/components/image-upload-flow.tsx` lines 286-299 (extraction in-flight)
**Apply to:** ReviewList "translating" step (standalone spinner), "committing" step (button spinner)

Pattern: `disabled` + `aria-busy="true"` + `aria-label` on the primary button; `Loader2 className="size-4 animate-spin mr-2" aria-hidden="true"` inside button or standalone.

---

### Error Display (inline, role="alert")

**Source:** `src/components/image-upload-flow.tsx` line 329; `src/components/translation-form.tsx` lines 252-255
**Apply to:** ReviewList per-row translation error, dedupeError display

```typescript
<p role="alert" className="text-sm text-destructive mt-1">
  {errorCopy}
</p>
```

---

### Test: vi.hoisted → vi.mock → import subject

**Source:** `src/app/api/extract/__tests__/extract.unit.test.ts` lines 1-39; `src/lib/deck-actions.test.ts` lines 1-71
**Apply to:** both new test files

Order is mandatory in Vitest: `vi.hoisted` (declares mocks) → `vi.mock` (factories reference hoisted vars) → `import` subject under test. Never reorder.

---

## No Analog Found

All files in Phase 11 have close analogs in the existing codebase. No files require falling back to RESEARCH.md patterns alone.

| File | Note |
|---|---|
| `review-list.tsx` — `loading-dedupe` initial state | Closest prior art is image-upload-flow.tsx extraction in-flight (spinner), but dedupe uses `useEffect` on mount rather than a button click. Pattern is a `useEffect(() => { getSameLanguageDeckBackWords(deckId).then(...) }, [])` — no direct analog exists for async-on-mount into a reducer; use the established fetch-then-dispatch idiom from `handleExtract` in image-upload-flow.tsx (lines 187-249) as reference for the dispatch-on-resolve pattern. |

---

## Metadata

**Analog search scope:** `src/components/`, `src/lib/`, `src/app/api/extract/__tests__/`
**Files read:** 6 source files + 2 test files
**Pattern extraction date:** 2026-05-19
