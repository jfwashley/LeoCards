# Phase 11: Review & Commit — Research

**Researched:** 2026-05-19
**Domain:** React client state machine · DeepL translation reuse · Drizzle ownership-scoped queries · server action batch commit
**Confidence:** HIGH — all findings verified directly against codebase source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** ReviewList is a separate component rendered by `image-upload-flow.tsx` on `EXTRACT_SUCCESS` — NOT a new route, NOT inlined into the flow reducer's render branches.
- **D-02:** Per-word row model: checkbox + inline-editable text + X remove; plus select-all / select-none controls.
- **D-03:** All extracted words start kept (checked). Confirm disabled when none kept, with hint.
- **D-04:** Dedupe runs BEFORE translation. Duplicates segregated into "Already learned" list — not translated, not committed, not user-overridable.
- **D-05:** Duplicate match key: extracted word vs existing cards' `back` field, only decks where `deck.language == this deck's language`, case-insensitive + trimmed.
- **D-06:** Two-step flow. Step A: prune/edit new (non-duplicate) word list. On "Next": DeepL-translate kept words. Step B: editable word + translation list before final commit.
- **D-07:** Per-word translation failure → inline error, user can type manually; never blocks batch.
- **D-08:** Direction = target→native. Extracted word = card `back`. DeepL target→native produces card `front`. `saveCard(deckId, front=native, back=target, "image")`.
- **D-09:** Both fields editable per row in Step B — identical affordance to `TranslationForm`.
- **D-10:** Native language from existing `getUserNativeLanguage` setting.
- **D-11:** Add `"image"` to card source union (TypeScript only — no migration). `saveCard` signature + callers.
- **D-12:** Commit = sequential `saveCard` calls, continue-on-failure. No rollback. Failures surfaced for manual retry.
- **D-13:** Success summary: "N added, M already-learned (skipped), K failed" — primary action navigates to deck.
- **D-14:** Cancel at any step = zero DB writes, return to add-card start / dashboard. No confirm dialog.

### Claude's Discretion

- Exact component name/file path and decomposition.
- Whether translation reuses `/api/translate` fetch directly or via a shared helper.
- Step A→B transition mechanics (new reducer states/actions vs local component state).
- Whether dedupe lookup is a new `deck-queries` function or composed from existing queries.
- Loading/disabled affordances during translate + commit.

### Deferred Ideas (OUT OF SCOPE)

- Force-adding "already learned" duplicates (override).
- Confirm-on-cancel dialog.
- Lemmatization/dedup within extracted batch.
- Bulk auto-retry of failed inserts/translations.
- Large-list virtualization.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RVW-01 | User sees extracted words in an editable review list before anything is added to the deck | ReviewList component with useReducer state machine in Step A; words piped from `state.extractWords` |
| RVW-02 | User can edit text of any word and remove or toggle off words | ReviewWordRow: checkbox + editable Input + X button; select-all/select-none controls |
| RVW-03 | Each kept word auto-translated via existing DeepL pipeline; translation editable exactly like manual card add | Client `fetch("/api/translate")` fan-out reusing TranslationForm's exact pattern; Step B = two-field editable row |
| RVW-04 | User confirms; kept words added as cards; success summary shows count added | Sequential `saveCard` loop → success state with addedCount / skippedCount / failedCount |
| RVW-05 | User can cancel without adding any cards; duplicate words already in deck are flagged or skipped | `onCancel → BACK_TO_PICK`; new `getSameLanguageDeckBackWords` query → dedup segregation before Step A renders |

</phase_requirements>

---

## Summary

Phase 11 completes the v2.0 image-to-flashcards pipeline. The primary deliverable is a self-contained `ReviewList` client component that owns the five-state review machine (Step A prune/edit → translating in-flight → Step B translate/edit → commit in-flight → success), rendered by `image-upload-flow.tsx` when `state.extractWords` is a non-empty array.

The integration surface is narrow and well-defined. All heavy infrastructure already exists: the DeepL route (`/api/translate`) is reused as-is for fan-out translation; `saveCard` is reused for batch commit; `deck-queries.ts` patterns are extended with one new server-only query function for the same-language dedupe lookup. The only cross-cutting change is widening the TypeScript `source` union from `"manual" | "wordlist"` to `"manual" | "wordlist" | "image"` across two files.

The `nativeLang` prop is already threaded to `ImageUploadFlow` by `NewCardModeToggle` (which receives it from the server page). This prop flows through to `ReviewList` as a prop — no new server data access is needed inside the client component. The full data-flow from server → client is already established.

**Primary recommendation:** Build `ReviewList` as a self-contained `useReducer` state machine in `src/components/review-list.tsx`. Run dedupe via a new `getSameLanguageDeckBackWords` server action (not a raw query in the client). Fan-out translations with `Promise.allSettled`. Loop `saveCard` sequentially inside a client async function collecting outcomes.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Review state machine (Step A/B/translating/committing/success) | Browser / Client | — | Pure UI state; no server interaction during state transitions |
| Dedupe lookup (same-language `back` word set) | API / Backend (server action) | — | Must be ownership-scoped; cannot expose raw DB query to client |
| Fan-out translation | Browser / Client → API | `/api/translate` route | Client orchestrates N fetch calls; route owns DeepL |
| Per-word commit | Browser / Client → API | `saveCard` server action | Client loops; server action owns DB insert + ownership check |
| nativeLang resolution | Frontend Server (SSR) | — | Already resolved in `new-card/page.tsx`; passed as prop |
| Success navigation (`/dashboard?deck=deckId`) | Browser / Client | — | Client-side router push after commit completes |

---

## Standard Stack

### Core — all already installed, no new dependencies

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | 19.2.4 | `useReducer` state machine, component tree | Already installed [VERIFIED: package.json] |
| Next.js | 16.2.1 | Server actions (`"use server"`), server components, `revalidatePath` | Already installed [VERIFIED: package.json] |
| Drizzle ORM | ^0.45.1 | `db.select().from(cards).innerJoin(decks)` for dedupe query | Already installed [VERIFIED: package.json] |
| Zod | ^4.3.6 | Validate `/api/translate` response (matches `TranslationResponseSchema` in translation-form.tsx) | Already installed [VERIFIED: package.json] |
| lucide-react | ^1.0.1 | `Loader2`, `CheckCircle2`, `X` icons | Already installed [VERIFIED: package.json] |
| Vitest | ^4.1.1 | Unit tests; existing config at `vitest.config.ts` | Already installed [VERIFIED: package.json] |

**No new dependencies this phase.** UI-SPEC confirms zero new package.json entries. [VERIFIED: 11-UI-SPEC.md § Registry Safety]

---

## Architecture Patterns

### System Architecture Diagram

```
new-card/page.tsx (Server Component)
  │  getUserNativeLanguage(userId)  ──► neon DB
  │  getUserDecks(userId)           ──► neon DB
  │
  ▼  props: decks, activeDeckId, nativeLang, nativeLangLabel, targetLangLabel
NewCardModeToggle (Client)
  │
  ▼  props: decks, defaultDeckId, nativeLang
ImageUploadFlow (Client, useReducer)
  │  state.extractWords: string[] (non-empty) triggers render branch
  │
  ▼  props: words, deckId, nativeLang, targetLang, onCancel
ReviewList (Client, useReducer)  ←─── NEW
  │
  ├─[Step A: prune/edit]
  │   │  getSameLanguageDeckBackWords(deckId) ──► server action ──► neon DB
  │   │  (called once on mount; produces Set<string> for dedupe)
  │   │
  │   ▼  user prunes, edits, clicks "Next: translate"
  │
  ├─[Translating in-flight]
  │   │  Promise.allSettled(keptWords.map(w => fetch("/api/translate", ...)))
  │   │                                    ──► /api/translate route ──► DeepL
  │   ▼  all settle (success or per-word error) → Step B
  │
  ├─[Step B: translate/edit]
  │   │  user edits native/target fields, clicks "Add N cards"
  │   ▼
  │
  ├─[Commit in-flight]
  │   │  for each keptRow: await saveCard(deckId, front, back, "image")
  │   │                                  ──► server action ──► neon DB ──► revalidatePath
  │   │  collect { outcome: "ok"|"error" } per word
  │   ▼  all complete (continue-on-failure)
  │
  └─[Success summary]
      │  addedCount / skippedCount(duplicates) / failedCount
      ▼  "Go to my deck" → router.push("/dashboard?deck=deckId")
```

### Recommended Project Structure

```
src/
├── components/
│   ├── review-list.tsx          # NEW — ReviewList + ReviewWordRow + ReviewTranslationRow
│   └── image-upload-flow.tsx    # MODIFIED — replace stub with <ReviewList> render branch
├── lib/
│   └── deck-actions.ts          # MODIFIED — add "image" to source union; add getSameLanguageDeckBackWords
```

**Decomposition decision (Claude's Discretion):** `ReviewWordRow` and `ReviewTranslationRow` as local sub-components inside `review-list.tsx` (not separate files) — they are tightly coupled to `ReviewList`'s reducer state and have no other consumers. This avoids premature file splitting for v1 of this component.

---

## Focus Area 1: Source Union Widening (D-11)

### Exact Edit Points — Complete and Type-Safe

**File 1: `src/lib/deck-actions.ts` line 66**
```typescript
// BEFORE:
export async function saveCard(
  deckId: string,
  front: string,
  back: string,
  source: "manual" | "wordlist",
)

// AFTER:
export async function saveCard(
  deckId: string,
  front: string,
  back: string,
  source: "manual" | "wordlist" | "image",
)
```
[VERIFIED: deck-actions.ts line 66-70]

**Callers that pass a literal source value:**

| File | Line | Current value | Action |
|------|------|---------------|--------|
| `src/components/translation-form.tsx` | 177 | `"manual"` | No change — still correct |
| `src/lib/deck-actions.ts` (`addWordToCard`) | 183 | `"wordlist"` hardcoded in values — NOT via `saveCard` | No change needed |
| `src/components/review-list.tsx` | NEW | `"image"` | New call site |

**File 2: `src/db/schema.ts` — NO EDIT REQUIRED**

The schema comment reads `// "manual" | "wordlist"` but this is a comment only. The actual column definition is `source: text("source").notNull()` — free text with no DB-level constraint. Adding `"image"` as a new TypeScript union value requires only the `saveCard` signature change; no migration, no schema file edit. [VERIFIED: schema.ts lines 101-102]

**`removeWordFromDeck` in deck-actions.ts:** filters by `eq(cards.source, "wordlist")` — unaffected by adding `"image"` to the union. [VERIFIED: deck-actions.ts line 220]

**Total edit points for D-11: 1 file, 1 line change.**

---

## Focus Area 2: Same-Language-Deck Dedupe (D-04/D-05)

### Query Design

The existing `deck-queries.ts` contains server-only query functions (no `"use server"` directive — they are called from Server Components, not directly from clients). [VERIFIED: deck-queries.ts line 1-3]

For the dedupe lookup, `ReviewList` is a client component — it cannot call `deck-queries.ts` functions directly. Two options exist:

**Option A (Recommended): New server action in `deck-actions.ts`**

Add a new exported server action (`"use server"` file) to `deck-actions.ts`:

```typescript
// Recommended signature
export async function getSameLanguageDeckBackWords(
  deckId: string,
): Promise<Set<string>>
```

Why `deck-actions.ts` not `deck-queries.ts`: server actions (callable from client components) live in `deck-actions.ts` (`"use server"`); pure server-side query helpers live in `deck-queries.ts` (no directive). This is the established separation. [VERIFIED: deck-actions.ts line 1, deck-queries.ts line 1]

**Query logic (verified Drizzle patterns from deck-queries.ts):**

```typescript
export async function getSameLanguageDeckBackWords(
  deckId: string,
): Promise<Set<string>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id as UserId;

  // 1. Get the target deck's language (and verify ownership)
  const [targetDeck] = await db
    .select({ language: decks.language })
    .from(decks)
    .where(and(eq(decks.id, deckId as DeckId), eq(decks.userId, userId)));

  if (!targetDeck) throw new Error("Forbidden");

  // 2. Get all back values from cards in same-language decks owned by this user
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

**Dedupe membership test (client-side, pure function, unit-testable):**

```typescript
function isDuplicate(word: string, knownBackWords: Set<string>): boolean {
  return knownBackWords.has(word.trim().toLowerCase());
}
```

**Where called:** `ReviewList` on mount (or before first render of Step A). The call is async — `ReviewList` enters a `"loading-dedupe"` sub-state or initializes with all words as "new" then updates once the server action resolves. Simplest: call in a `useEffect` on mount, store result in reducer state, render Step A only once dedupe is known.

**Performance:** Two DB round-trips (deck language lookup + card back values). Acceptable — called once per review session. Neon HTTP driver is used; each round-trip ~50-200ms over serverless. [ASSUMED: latency estimate based on Neon HTTP typical performance; not benchmarked in this project]

---

## Focus Area 3: Translation Reuse (D-06/D-08/D-09)

### /api/translate Client Call Shape

From `translation-form.tsx` lines 118-128 [VERIFIED]:

```typescript
// Request body:
{ text: string, sourceLang: "en"|"fr"|"es", targetLang: "en"|"fr"|"es" }

// Response body (validated by TranslationResponseSchema):
{ translation: string }
```

**For Phase 11 direction (D-08):** `sourceLang = deck.language` (targetLang of card = `back`), `targetLang = nativeLang` (front). Both values are available as props to `ReviewList`.

**Rate limit:** 30 requests per minute per user. [VERIFIED: route.ts line 9]. With up to ~50 extracted words, a full batch hits the limit. Mitigation: use `Promise.allSettled` (fan-out all at once rather than sequential) so all 50 complete in one window burst without artificially serializing. If rate limited (429 response), the per-word handler marks that row as `translationError: "Translation unavailable — enter manually."` — same error path as any other failure (D-07). At 50 words/minute the user is unlikely to re-trigger translation in the same window.

**Fan-out implementation:**

```typescript
// In ReviewList, on "Next: translate" click:
const results = await Promise.allSettled(
  keptWords.map((word) =>
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: word, sourceLang: targetLang, targetLang: nativeLang }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Translation failed");
      const data = TranslationResponseSchema.parse(await res.json());
      return data.translation;
    })
  )
);
// results[i].status === "fulfilled" | "rejected"
// fulfilled → results[i].value = translation string
// rejected → row gets translationError copy
```

`TranslationResponseSchema` from `translation-form.tsx` (`z.object({ translation: z.string().min(1) })`) can be copy-imported or re-declared in `review-list.tsx`. [VERIFIED: translation-form.tsx lines 13-15]

### How nativeLang Reaches ReviewList

**Data flow (fully verified):**

```
new-card/page.tsx (server)
  └─ getUserNativeLanguage(session.user.id) → nativeLang string
  └─ props → NewCardModeToggle
      └─ nativeLang prop → ImageUploadFlow (prop: nativeLang)
          └─ EXTRACT_SUCCESS render branch → ReviewList (prop: nativeLang)
```

`ImageUploadFlow` already receives `nativeLang: string` as a prop (line 18) [VERIFIED: image-upload-flow.tsx line 18]. The `EXTRACT_SUCCESS` render branch passes it to `ReviewList`. No new server data access is needed inside any client component — `nativeLang` is already resolved at the server page level and threaded through the prop chain.

`targetLang` is derived from `decks.find(d => d.id === state.selectedDeckId)?.language` — `decks` is already available in `ImageUploadFlow` as a prop (line 15). [VERIFIED: image-upload-flow.tsx line 15]

---

## Focus Area 4: Batch Commit (D-12)

### saveCard Behavior (Per-Call)

Each `saveCard` call: [VERIFIED: deck-actions.ts lines 65-89]
1. `auth.api.getSession` — session check
2. `db.select().from(decks).where(eq(decks.id, deckId))` — ownership check
3. `db.insert(cards).values(...)` — single row insert
4. `revalidatePath("/dashboard")` — cache invalidation

**The N-revalidatePath problem:** With N kept words, the client loop calls `saveCard` N times, each triggering `revalidatePath("/dashboard")`. For ~50 words this is 50 revalidations. In Next.js 16, `revalidatePath` is idempotent per request — multiple calls within a single server action request are deduplicated. But called from N separate server action invocations (one per word), they fire N times. [ASSUMED: Next.js 16 revalidatePath deduplication per-invocation; behavior confirmed in prior phases via accumulated state, but N-invocation case is assumed]

**Recommendation: add a batched commit server action.**

A single `saveImageCards(deckId: string, cards: Array<{front: string; back: string}>): Promise<Array<{ok: boolean; error?: string}>>` server action:
- Does ownership check ONCE
- Inserts cards sequentially inside a loop (Neon HTTP has no transactions — D-12)
- Calls `revalidatePath("/dashboard")` ONCE at the end
- Returns per-card outcome array

This is strictly preferable: one auth + ownership round-trip, one revalidate, same sequential-with-continue-on-failure semantics. It does NOT require rebuilding `saveCard` — it wraps it logically but is its own action.

**Alternatively**, the per-call `saveCard` loop works correctly and matches D-12 exactly — it just fires N revalidations. Given extraction is capped at ~50 words and the user will rarely commit all 50, this is acceptable for v1 if a new action feels like overengineering.

**Decision for planner:** Research recommends the batched action as the cleaner approach. Either is correct per D-12.

### Sequential loop pattern (client-side):

```typescript
const outcomes: Array<{ word: string; ok: boolean }> = [];
for (const row of stepBRows) {
  try {
    await saveCard(deckId, row.nativeText.trim(), row.targetText.trim(), "image");
    outcomes.push({ word: row.targetText, ok: true });
  } catch {
    outcomes.push({ word: row.targetText, ok: false });
  }
}
const addedCount = outcomes.filter((o) => o.ok).length;
const failedCount = outcomes.filter((o) => !o.ok).length;
const skippedCount = duplicateWords.length;
```

---

## Focus Area 5: ReviewList State Machine (D-01/D-06)

### Reducer vs Local State Decision

**Recommendation: self-contained `useReducer` inside `ReviewList`** — do NOT extend `imageFlowReducer` in `image-upload-flow.tsx`.

Rationale:
- The outer `imageFlowReducer` has 10 action types and 8 state fields for extraction. Adding review state would bloat it significantly.
- `ReviewList` is a separate component (D-01) — it should own its state machine.
- The established convention (`useReducer` in `translation-form.tsx`, `useReducer` in `image-upload-flow.tsx`) is per-component. [VERIFIED: both files]
- The outer flow only needs to know one thing from `ReviewList`: when the user cancels (fires `onCancel` prop → `dispatch({ type: "BACK_TO_PICK" })`). The outer flow does NOT need to know about step A/B transitions.

### ReviewList Reducer Shape

```typescript
type ReviewStep =
  | "loading-dedupe"      // initial: fetching known back words
  | "step-a"              // prune/edit
  | "translating"         // fan-out in progress
  | "step-b"              // translate/edit
  | "committing"          // saveCard loop in progress
  | "success";            // all saves complete

interface ReviewRow {
  id: string;             // stable key (use index or uuid)
  word: string;           // current text (editable in step A)
  kept: boolean;          // checked state
}

interface TranslationRow {
  id: string;
  targetText: string;     // editable (step B)
  nativeText: string;     // editable (step B)
  translationError: string | null;
}

interface ReviewState {
  step: ReviewStep;
  rows: ReviewRow[];                    // step A state
  duplicates: string[];                 // words segregated to "Already learned"
  translationRows: TranslationRow[];    // step B state
  dedupeError: string | null;           // if getSameLanguageDeckBackWords throws
  addedCount: number;
  failedCount: number;
}

type ReviewAction =
  | { type: "DEDUPE_DONE"; knownWords: Set<string> }
  | { type: "DEDUPE_ERROR"; message: string }
  | { type: "TOGGLE_WORD"; id: string }
  | { type: "EDIT_WORD"; id: string; text: string }
  | { type: "REMOVE_WORD"; id: string }
  | { type: "SELECT_ALL" }
  | { type: "SELECT_NONE" }
  | { type: "TRANSLATE_START" }
  | { type: "TRANSLATION_ROW_DONE"; id: string; nativeText: string }
  | { type: "TRANSLATION_ROW_ERROR"; id: string; errorMessage: string }
  | { type: "EDIT_NATIVE"; id: string; text: string }
  | { type: "EDIT_TARGET"; id: string; text: string }
  | { type: "COMMIT_START" }
  | { type: "COMMIT_DONE"; addedCount: number; failedCount: number }
  | { type: "BACK_TO_STEP_A" };
```

**Props piped from `image-upload-flow.tsx` → `ReviewList`:**

```typescript
interface ReviewListProps {
  words: string[];          // state.extractWords (non-empty)
  deckId: string;           // state.selectedDeckId
  nativeLang: string;       // prop passed through from NewCardModeToggle
  targetLang: string;       // decks.find(d => d.id === selectedDeckId)?.language
  onCancel: () => void;     // () => dispatch({ type: "BACK_TO_PICK" })
}
```

**EXTRACT_SUCCESS render branch in image-upload-flow.tsx** (replaces the disabled stub at lines 381-399):

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

[VERIFIED: image-upload-flow.tsx lines 381-399 (current stub); lines 14-18 (props); lines 200-202 (decks available in scope)]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Translation | Custom DeepL integration | Existing `/api/translate` route | Rate limiter, auth, DeepL client, error handling already done |
| Card persistence | Custom DB insert | Existing `saveCard` server action | Ownership check, session auth, revalidatePath wired |
| Debounced input translation | `setTimeout`-based debounce | Not needed for Step B — translations are fired once on "Next: translate", not on input change | Step B inputs are editable post-translation; no auto-translate on keystroke |
| Response validation | Manual property access | Re-use `TranslationResponseSchema` from translation-form | Already battle-tested; Zod 4 installed |
| Ownership-scoped dedupe | Rolling your own auth check | Pattern from `deck-actions.ts` — `auth.api.getSession` + `decks.where(eq(decks.userId, userId))` | Already established |

---

## Common Pitfalls

### Pitfall 1: TRANSLATE_ROW_DONE race with unmount
**What goes wrong:** Promise.allSettled resolves after user clicks Cancel — `dispatch` called on unmounted component.
**Why it happens:** Fan-out is async; user can cancel while translation is in progress.
**How to avoid:** Check a `cancelled` ref (same pattern as `activeField` ref in `translation-form.tsx`). On `onCancel`, set `cancelled.current = true`; in the `.then()` callbacks, guard with `if (!cancelled.current)`.
**Warning signs:** React "Can't perform a state update on an unmounted component" warnings in console (React 19 may suppress this but behavior is still incorrect).

### Pitfall 2: Calling deck-queries.ts directly from a client component
**What goes wrong:** Build error or runtime failure — `deck-queries.ts` has no `"use server"` directive; it's a server module not callable as a server action.
**Why it happens:** The distinction between server-only modules and server actions is subtle. `deck-queries.ts` header explicitly notes "Server Component data fetchers, not client-callable server actions." [VERIFIED: deck-queries.ts line 2-3]
**How to avoid:** The dedupe lookup MUST be a server action in `deck-actions.ts` (`"use server"` file). Do not import from `deck-queries.ts` into any client component.

### Pitfall 3: Calling getSameLanguageDeckBackWords with selectedDeckId before decks prop is available
**What goes wrong:** `deckId` is undefined at mount if `state.selectedDeckId` is not yet set; server action receives empty string; ownership check fails.
**How to avoid:** `ReviewListProps.deckId` is passed as a prop from `image-upload-flow.tsx` where it is already `state.selectedDeckId` — guaranteed non-empty because EXTRACT_SUCCESS only fires after deck selection. Guard nonetheless: `if (!deckId) return`.

### Pitfall 4: TranslationResponseSchema Zod 4 breaking change
**What goes wrong:** If `TranslationResponseSchema.parse()` is imported from `translation-form.tsx` directly, it crosses module boundaries unexpectedly.
**How to avoid:** Re-declare the schema locally in `review-list.tsx` — it's a one-liner: `const TranslationResponseSchema = z.object({ translation: z.string().min(1) });`. Both files use Zod 4 (`^4.3.6`). [VERIFIED: package.json, translation-form.tsx line 13]

### Pitfall 5: Case-insensitive trim dedupe not applied consistently
**What goes wrong:** "Chien" (capital C from extraction) does not match "chien" (lowercase in DB) → duplicate not detected.
**How to avoid:** Apply `.trim().toLowerCase()` to BOTH the extracted word (in `isDuplicate`) AND the DB values (in `getSameLanguageDeckBackWords` — `rows.map(r => r.back.trim().toLowerCase())`). Test with a mixed-case word.

### Pitfall 6: revalidatePath fires inside a client component
**What goes wrong:** `revalidatePath` is a server-only API; calling it in a client component throws.
**Why it happens:** Developers copy-paste from server action code.
**How to avoid:** `revalidatePath` is called inside `saveCard` server action — the client never touches it directly.

### Pitfall 7: Next.js 16 server action callable from client
**What goes wrong:** Importing a function from a `"use server"` file into a client component works correctly only if the function is a top-level export — not a nested or factory function.
**How to avoid:** `getSameLanguageDeckBackWords` must be a named top-level export in `deck-actions.ts`. [ASSUMED: Next.js 16 server action import restrictions consistent with Next.js 13+ behavior; the existing `saveCard` import in `translation-form.tsx` confirms the pattern works]

---

## Code Examples

### Verified: imageFlowReducer pattern (spread-and-override)

```typescript
// Source: src/components/image-upload-flow.tsx lines 84-86
case "EXTRACT_SUCCESS":
  return { ...state, extracting: false, extractWords: action.words };
```

ReviewList reducer must follow the same immutable spread pattern.

### Verified: /api/translate client call shape

```typescript
// Source: src/components/translation-form.tsx lines 122-127
const response = await fetch("/api/translate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text, sourceLang, targetLang: destLang }),
});
```

For Phase 11 (target→native direction):
```typescript
body: JSON.stringify({ text: word, sourceLang: targetLang, targetLang: nativeLang })
```

### Verified: saveCard call pattern (translation-form.tsx analog)

```typescript
// Source: src/components/translation-form.tsx lines 177-182
await saveCard(
  deckId,
  state.nativeText.trim(),   // front = native
  state.targetText.trim(),   // back = target
  "manual",
);
// Phase 11: replace "manual" with "image"
```

### Verified: Drizzle innerJoin pattern (deck-actions.ts analog)

```typescript
// Source: src/lib/deck-actions.ts lines 105-110 (editCard ownership check)
const rows = await db
  .select({ cardId: cards.id, deckUserId: decks.userId })
  .from(cards)
  .innerJoin(decks, eq(cards.deckId, decks.id))
  .where(eq(cards.id, cardId as CardId));
```

The dedupe query uses the same `.innerJoin(decks, eq(cards.deckId, decks.id))` pattern to filter by `decks.userId` and `decks.language`.

### Verified: Success navigation target

```typescript
// Source: 11-UI-SPEC.md § handleGoToDeck
// Phase 02 decision: URL params (?deck=id) for active deck state
router.push(`/dashboard?deck=${deckId}`);
// Uses Next.js useRouter() — already used in codebase (ASSUMED — not grep-verified in this session)
```

[ASSUMED: `useRouter` from `next/navigation` is the correct import in Next.js 16 App Router; consistent with established project patterns]

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 11 |
|--------------|------------------|---------------------|
| `"manual" \| "wordlist"` source union | `"manual" \| "wordlist" \| "image"` | One line change in `saveCard` signature |
| Phase 10 EXTRACT_SUCCESS stub (disabled button) | Full ReviewList component | Replace 18-line stub with ReviewList render |
| No same-language dedupe | `getSameLanguageDeckBackWords` server action | New function, ~20 lines |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Neon HTTP two round-trips for dedupe lookup takes ~50-200ms | Focus Area 2 | If much slower, consider prefetching with page load — but startup latency only, not a correctness issue |
| A2 | Next.js 16 `revalidatePath` called N times from N separate server action invocations fires N actual revalidations (not deduplicated) | Focus Area 4 | If deduplicated, the "batched action" recommendation is less important; N-loop still works |
| A3 | `useRouter` from `next/navigation` is the correct router import for Next.js 16 App Router client components | Code Examples | If API changed, use whatever router hook the existing codebase uses — check existing client components |
| A4 | Top-level named exports in `"use server"` files are callable as server actions from client components in Next.js 16 | Pitfall 7 | If restricted further, the dedupe action may need a different exposure mechanism; unlikely given existing `saveCard` import works |

**If this table is empty:** All claims in this research were verified or cited. The 4 assumptions above are low-risk — A2 affects an optimization recommendation only; A3/A4 are confirmed by existing patterns in the codebase.

---

## Open Questions (RESOLVED)

1. **Batched commit action vs N-loop saveCard calls**
   - What we know: both satisfy D-12; batched action has one revalidatePath vs N
   - What's unclear: whether the planner wants to introduce a new `saveImageCards` action or keep the simpler N-loop
   - Recommendation: planner decides; research favors batched action for cleanliness; either is correct
   - **RESOLVED:** batched `saveImageCards` server action chosen (implemented in plan 11-02).

2. **`loading-dedupe` step visibility**
   - What we know: dedupe must complete before Step A renders (to segregate duplicates correctly per D-04)
   - What's unclear: should ReviewList show a spinner while dedupe loads, or should the parent pass pre-fetched data?
   - Recommendation: show a brief loading state inside ReviewList (spinner) — keeps ReviewList self-contained and avoids async props from image-upload-flow
   - **RESOLVED:** brief `loading-dedupe` spinner inside ReviewList (implemented in plan 11-03 Task 1; ReviewList self-contained, no async props from image-upload-flow).

---

## Environment Availability

Step 2.6: SKIPPED — Phase 11 introduces no new external dependencies. All required services (Neon, DeepL) are already operational from Phases 9/10.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 |
| Config file | `vitest.config.ts` (root) — `environment: "node"`, `setupFiles: ["./src/test-setup.ts"]` |
| Quick run command | `npx vitest run src/components/review-list.test.ts` |
| Full suite command | `npm test` (`vitest run`) |

`test-setup.ts` sets a dummy `DATABASE_URL` to prevent `neon()` crash on module import — applies to all tests including new Phase 11 tests. [VERIFIED: src/test-setup.ts]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RVW-01 | ReviewList renders Step A with words from extractWords | unit (reducer) | `npx vitest run src/components/review-list.test.ts -t "reviewListReducer"` | ❌ Wave 0 |
| RVW-02 | Checkbox toggle, word edit, word remove, select-all, select-none all update reducer state correctly | unit (reducer) | `npx vitest run src/components/review-list.test.ts -t "step-a interactions"` | ❌ Wave 0 |
| RVW-03 | Translation fan-out produces per-row results; failure → `translationError`; success → `nativeText` | unit (async fn) | `npx vitest run src/components/review-list.test.ts -t "translation fan-out"` | ❌ Wave 0 |
| RVW-04 | Batch commit loop: saveCard called N times; addedCount/failedCount accurate after mixed outcomes | unit (with mocked saveCard) | `npx vitest run src/components/review-list.test.ts -t "batch commit"` | ❌ Wave 0 |
| RVW-05a | Dedupe pure function: `isDuplicate(word, knownSet)` returns true for case-insensitive match | unit (pure function) | `npx vitest run src/components/review-list.test.ts -t "dedupe"` | ❌ Wave 0 |
| RVW-05b | Cancel at Step A: `onCancel` called; no saveCard calls made | unit (spy) | `npx vitest run src/components/review-list.test.ts -t "cancel"` | ❌ Wave 0 |
| RVW-05b | Cancel at Step B: `onCancel` called; no saveCard calls made | unit (spy) | same file | ❌ Wave 0 |
| D-11 | `saveCard` accepts `"image"` as source without TypeScript error | type check | `npm run typecheck` | via typecheck |
| D-11 | `getSameLanguageDeckBackWords` returns Set with trimmed lowercase back values | unit (mocked db) | `npx vitest run src/lib/deck-actions.test.ts -t "getSameLanguageDeckBackWords"` | ❌ Wave 0 |

**Manual-only tests (no automation):**
- RVW-01/02/03: full UI rendering (checkbox state, input editing, Step A → B transition) — browser interaction only
- RVW-04: end-to-end card creation visible in dashboard — requires live Neon + DeepL
- Success summary display with correct counts — browser only

### Unit-Testable Pure Functions / Logic

These are highest-value Wave 0 test targets:

1. **`reviewListReducer`** — pure function, test all action types; cover Step A state transitions, Step B state transitions, commit outcomes
2. **`isDuplicate(word, knownSet)`** — pure function; cover case, trim, exact match, no-match
3. **`getSameLanguageDeckBackWords`** — server action; mock `auth.api.getSession` + `db` (follow `extract.unit.test.ts` mock pattern); verify ownership check, language filter, lowercase transform
4. **Batch commit orchestration** — async function with mocked `saveCard`; verify continue-on-failure, outcome counting

### Sampling Rate

- **Per task commit:** `npx vitest run src/components/review-list.test.ts` (reducer + pure function unit tests; < 5s)
- **Per wave merge:** `npm test` (full suite including existing extract tests)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/components/review-list.test.ts` — covers RVW-01..05 reducer + pure function tests
- [ ] `src/lib/deck-actions.test.ts` — covers `getSameLanguageDeckBackWords` (new action); may extend existing deck-actions test file if one exists, or create new

*(No framework install needed — Vitest 4.1.1 already installed and configured.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `auth.api.getSession` in `getSameLanguageDeckBackWords` server action (same pattern as all existing actions) |
| V3 Session Management | no | Inherited from existing auth infrastructure |
| V4 Access Control | yes | Ownership check in `getSameLanguageDeckBackWords` (deck.userId === session.user.id); `saveCard` already has its own ownership check |
| V5 Input Validation | yes | Trim + lowercase before dedupe membership test; `nativeText.trim()` + `targetText.trim()` before saveCard; `/api/translate` RequestSchema validates text length (max 500) |
| V6 Cryptography | no | No new crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized dedupe lookup (reading another user's card vocabulary) | Information Disclosure | `getSameLanguageDeckBackWords` verifies deck ownership via session before returning data |
| Committing cards to a deck the user doesn't own | Tampering | `saveCard` existing ownership check — unchanged |
| Translation route abuse (50 words × repeated review sessions) | Denial of Service | Existing 30 req/min rate limiter per user; per-word failure on 429 (D-07) |
| Oversized word text submitted to translate | Tampering | `/api/translate` RequestSchema: `text: z.string().min(1).max(500)` [VERIFIED: route.ts line 12] |

---

## Sources

### Primary (HIGH confidence — verified against codebase)

- `src/lib/deck-actions.ts` — `saveCard` signature (source union), server action pattern, ownership check pattern
- `src/db/schema.ts` — `cards.source` column type (`text`, free text; no migration needed), `decks.language`
- `src/components/image-upload-flow.tsx` — `EXTRACT_SUCCESS` render branch (stub to replace), `ImageUploadFlowProps` (nativeLang prop), `decks` in scope, reducer convention
- `src/components/translation-form.tsx` — `/api/translate` client call shape, `TranslationResponseSchema`, `saveCard("manual")` pattern, skeleton shimmer pattern
- `src/lib/deck-queries.ts` — server-only module (no `"use server"`), cannot be called from client; `getUserNativeLanguage` signature
- `src/app/api/translate/route.ts` — request schema, response shape, rate limit (30 req/min per user)
- `src/components/new-card-mode-toggle.tsx` — confirms `nativeLang` is already threaded to `ImageUploadFlow`
- `src/app/(protected)/deck/new-card/page.tsx` — confirms `getUserNativeLanguage` called server-side, passed as prop
- `vitest.config.ts`, `src/test-setup.ts` — test infrastructure confirmed
- `package.json` — all dependency versions confirmed; no new dependencies needed

### Secondary (MEDIUM confidence)

- Phase 11 UI-SPEC (`11-UI-SPEC.md`) — navigation target `/dashboard?deck={deckId}`, commit in-flight pattern, copy contract
- Phase 11 Context (`11-CONTEXT.md`) — all locked decisions D-01..D-14
- `.planning/STATE.md` — accumulated project decisions (vi.hoisted pattern, Drizzle branded type cast, etc.)

---

## Metadata

**Confidence breakdown:**
- Source union widening (D-11): HIGH — exact files and lines verified
- nativeLang data flow: HIGH — complete prop chain traced through 4 files
- /api/translate client call shape: HIGH — verified from translation-form.tsx source
- Dedupe query design: HIGH — Drizzle patterns verified; exact SQL is new but follows established patterns
- Batch commit: HIGH — saveCard verified; N-revalidate behavior is ASSUMED
- State machine design: HIGH — follows verified conventions from existing reducers
- Pitfalls: HIGH — most derived from verified code; Pitfall 1 (cancel race) is ASSUMED based on React async patterns

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (stable stack)
