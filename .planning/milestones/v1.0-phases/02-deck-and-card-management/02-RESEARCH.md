# Phase 2: Deck and Card Management - Research

**Researched:** 2026-03-24
**Domain:** Card CRUD, schema migration, translation proxy, word list data, debounced form UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Users can create multiple decks, including multiple decks for the same target language
- The existing `unique(userId, language)` constraint on the `decks` table must be REMOVED
- A `name` column must be ADDED to the `decks` table — auto-generated as "{Language} #{n}" (e.g., "French #1")
- Each deck is tied to a single target language; native language is app-level and always the source
- Decks cannot be renamed or deleted in v1
- Users choose their native language at signup from: English, French, Spanish — `nativeLanguage` column added to `user` table
- Deck switcher uses shadcn Select in the app header: flag emoji + auto-name, "+ New deck" at bottom
- First-visit: language picker auto-creates first deck; subsequent via header dropdown
- `/dashboard` route becomes the deck management view (replaces Phase 1 stub)
- Word list browser: A1–B1 categories (Greetings, Numbers, Food & Drink, Travel, Family, Weather, Shopping, Colors, Days/Months, Body, Animals, Clothing, Home, Work), difficulty filter (A1/A2/B1), same structure across all three languages, +/- toggle per word, no search bar
- Manual card entry: separate page, two fields side by side, bidirectional translation via DeepL, live/debounced (~500ms), user can edit either field before saving, success feedback, form clears after save
- Card list: sorted by review queue order, search bar (contains-match), columns: native word, target translation, source indicator, action buttons
- Card editing via modal/dialog: both fields editable, delete button inside modal with confirmation dialog

### Claude's Discretion
- Header layout beyond deck switcher + logout
- Exact visual design of card list rows and edit modal
- Word list data format and storage approach (JSON files, DB seed, etc.)
- Specific Tailwind classes and component composition
- DeepL API integration details (rate limiting, error handling, caching)
- Empty deck state messaging

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DECK-01 | User can browse a built-in word list for their chosen language and add words to their deck | Word list data sourcing; Drizzle batch insert pattern; React state toggle per word |
| DECK-02 | User can manually enter a word in their native language and receive an auto-translated result | DeepL API proxy pattern; debounce hook; Route Handler for translation |
| DECK-03 | User can review and edit the auto-translated result before saving a manually-entered card | Bidirectional form with two editable fields; Zod validation; Server Action or fetch pattern |
| DECK-04 | User can edit the translation on any saved card | base-ui Dialog controlled state; edit modal with react-hook-form |
| DECK-05 | User can delete a card from their deck | Confirmation dialog pattern; Server Action with Drizzle delete |
| DECK-06 | User can manage decks for French, Spanish, and English independently | Schema migration (remove unique constraint, add name/nativeLanguage columns); deck switcher Select component |
</phase_requirements>

## Summary

Phase 2 builds the full content layer: schema migration, DeepL proxy, word list browser, manual card entry with bidirectional auto-translation, and card CRUD. There are four technical areas that require specific care.

First, the schema migration is non-trivial: the current schema has `unique(userId, language)` on `decks` which must be dropped, plus two new columns (`name` on `decks`, `nativeLanguage` on `user`). The Drizzle workflow is well-defined — edit schema, run `npm run db:generate`, run `npm run db:migrate` — but the generated SQL needs to be inspected because the named constraint `decks_userId_language_unique` requires an explicit `ALTER TABLE "decks" DROP CONSTRAINT "decks_userId_language_unique"` before the column additions.

Second, the project uses `@base-ui/react` (not Radix UI) as its component primitive layer with shadcn's `base-nova` style. The `Select` and `Dialog` components must be added via the shadcn CLI (`npx shadcn add select` and `npx shadcn add dialog`) and they import from `@base-ui/react/select` and `@base-ui/react/dialog` respectively — not from `@radix-ui/react-select`. The API differs from Radix: `Select.Root` uses `onValueChange` and `value` props; `Dialog.Root` uses `open` and `onOpenChange`.

Third, the DeepL integration is a single Route Handler at `/api/translate` that proxies to `https://api-free.deepl.com/v2/translate` (free tier) using the `deepl-node` SDK (v1.24.0). Free tier: 500,000 characters/month. The `DEEPL_API_KEY` env var must be added to `src/env.ts` server schema.

Fourth, the word list data must be hand-curated and shipped as static JSON files in `src/data/wordlists/`. No open-source dataset provides the exact category + CEFR-level + translation format required. The plan is to write ~1,200 word entries spread across 14 categories × 3 difficulty levels × 3 language directions, which is feasible to do manually in ~2 hours.

**Primary recommendation:** Migrate schema first; add shadcn Select + Dialog via CLI; install deepl-node; create static JSON word lists; build UI features in dependency order.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| deepl-node | 1.24.0 | Official DeepL SDK — type-safe `translateText()` | Official SDK, handles auth + error codes, avoids raw HTTP |
| drizzle-orm | 0.45.1 (installed) | Schema migration + DB queries | Already in project |
| @base-ui/react | 1.3.0 (installed) | Select, Dialog primitives | Already in project via shadcn base-nova |
| react-hook-form | 7.72.0 (installed) | Card entry/edit forms | Already in project, established pattern |
| zod | 4.3.6 (installed) | Form + API input validation | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| use-debounce | 10.1.0 | `useDebounceCallback` for translation trigger | Bidirectional translation — debounce 500ms on either input |
| lucide-react | 1.0.1 (installed) | Icons: Plus, Check, Trash, Edit, X | Card list row actions, toggle buttons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| deepl-node SDK | Raw fetch to DeepL | SDK handles retry logic, error parsing, free vs pro URL automatically |
| use-debounce | Custom useEffect debounce | use-debounce is well-maintained, tree-shakeable; custom hook is 15 lines but another thing to maintain |
| Static JSON word lists | DB seed via Drizzle | JSON files are editable, version-controlled, zero migration risk; seed runs once and can conflict with existing data |

**Installation (new packages only):**
```bash
npm install deepl-node use-debounce
npx shadcn add select dialog
```

**Version verification:**
- `deepl-node`: 1.24.0 (verified 2026-03-24 via `npm view deepl-node version`)
- `use-debounce`: 10.1.0 (verified 2026-03-24 via `npm view use-debounce version`)
- `@radix-ui/react-dialog`: NOT used — project uses `@base-ui/react/dialog` instead
- `@radix-ui/react-select`: NOT used — project uses `@base-ui/react/select` instead

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (protected)/
│   │   ├── dashboard/          # Deck management view (replaces stub)
│   │   │   └── page.tsx        # Server component — loads decks
│   │   └── deck/
│   │       └── new-card/
│   │           └── page.tsx    # Manual card entry page
│   └── api/
│       └── translate/
│           └── route.ts        # DeepL proxy Route Handler
├── components/
│   ├── ui/                     # shadcn components (select.tsx, dialog.tsx added)
│   ├── deck-switcher.tsx       # Header Select client component
│   ├── card-list.tsx           # Card table with search (client component)
│   ├── card-edit-dialog.tsx    # Edit modal (client component)
│   ├── word-list-browser.tsx   # Category browser (client component)
│   └── translation-form.tsx    # Bidirectional translation form (client component)
├── data/
│   └── wordlists/
│       ├── en-fr.json          # English → French words by category + CEFR level
│       ├── en-es.json          # English → Spanish
│       ├── fr-en.json          # French → English
│       ├── fr-es.json          # French → Spanish
│       ├── es-en.json          # Spanish → English
│       └── es-fr.json          # Spanish → French
└── lib/
    └── deck-actions.ts         # Server Actions: createDeck, addCard, editCard, deleteCard
```

### Pattern 1: DeepL Proxy Route Handler
**What:** A `POST /api/translate` Route Handler that accepts `{text, sourceLang, targetLang}` and returns `{translation}`. The DeepL API key never leaves the server.
**When to use:** Any translation request from a client component

```typescript
// src/app/api/translate/route.ts
// Source: deepl-node README + Next.js route.md docs
import * as deepl from "deepl-node";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { env } from "@/env";
import { z } from "zod";

const RequestSchema = z.object({
  text: z.string().min(1).max(500),
  sourceLang: z.enum(["en", "fr", "es"]),
  targetLang: z.enum(["en", "fr", "es"]),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const client = new deepl.DeepLClient(env.DEEPL_API_KEY);
  const result = await client.translateText(
    parsed.data.text,
    parsed.data.sourceLang as deepl.SourceLanguageCode,
    parsed.data.targetLang as deepl.TargetLanguageCode,
  );
  return Response.json({ translation: result.text });
}
```

### Pattern 2: Bidirectional Debounced Translation
**What:** Two controlled `<Input>` fields. When either field changes, the other is auto-translated after 500ms debounce. The "last typed" field wins to prevent feedback loops.
**When to use:** Manual card entry form

```typescript
// src/components/translation-form.tsx
"use client";
import { useState, useRef } from "react";
import { useDebounceCallback } from "use-debounce";

export function TranslationForm({ nativeLang, targetLang }: Props) {
  const [nativeText, setNativeText] = useState("");
  const [targetText, setTargetText] = useState("");
  const activeField = useRef<"native" | "target" | null>(null);

  const translateFrom = useDebounceCallback(async (text: string, from: "native" | "target") => {
    if (!text.trim()) return;
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        sourceLang: from === "native" ? nativeLang : targetLang,
        targetLang: from === "native" ? targetLang : nativeLang,
      }),
    });
    if (!res.ok) return;
    const { translation } = await res.json();
    if (activeField.current === from) {
      // Only update the OTHER field if this field is still the active one
      if (from === "native") setTargetText(translation);
      else setNativeText(translation);
    }
  }, 500);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Input
        value={nativeText}
        onChange={(e) => {
          activeField.current = "native";
          setNativeText(e.target.value);
          translateFrom(e.target.value, "native");
        }}
      />
      <Input
        value={targetText}
        onChange={(e) => {
          activeField.current = "target";
          setTargetText(e.target.value);
          translateFrom(e.target.value, "target");
        }}
      />
    </div>
  );
}
```

### Pattern 3: Drizzle Schema Migration Workflow
**What:** Three-step process: edit schema, generate SQL, apply SQL.
**When to use:** Any schema change

```bash
# 1. Edit src/db/schema.ts — remove unique(), add columns
# 2. Generate migration SQL file
npm run db:generate
# 3. Apply to Neon (inspect generated SQL first — verify DROP CONSTRAINT)
npm run db:migrate
```

The generated SQL for dropping the named constraint will be:
```sql
ALTER TABLE "decks" DROP CONSTRAINT "decks_userId_language_unique";
ALTER TABLE "decks" ADD COLUMN "name" text NOT NULL;
ALTER TABLE "user" ADD COLUMN "nativeLanguage" text NOT NULL;
```

**Critical:** `nativeLanguage` column cannot be `NOT NULL` without a default if existing users already exist in the DB. Use `.default("en")` in the Drizzle column definition, or make it nullable and handle null in the UI.

### Pattern 4: base-ui Select for Deck Switcher
**What:** Controlled Select from `@base-ui/react/select`. The shadcn wrapper (added via `npx shadcn add select`) re-exports styled sub-components.
**When to use:** Deck switcher in header

```typescript
// After running: npx shadcn add select
// Import from local shadcn wrapper:
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Controlled usage:
<Select value={activeDeckId} onValueChange={setActiveDeckId}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {decks.map((deck) => (
      <SelectItem key={deck.id} value={deck.id}>
        {flagFor(deck.language)} {deck.name}
      </SelectItem>
    ))}
    <SelectItem value="__new__">+ New deck</SelectItem>
  </SelectContent>
</Select>
```

### Pattern 5: base-ui Dialog for Card Edit Modal
**What:** Controlled Dialog from `@base-ui/react/dialog`. The shadcn wrapper (added via `npx shadcn add dialog`) re-exports styled sub-components.
**When to use:** Card edit modal, delete confirmation

```typescript
// After running: npx shadcn add dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Controlled usage — pass selected card as prop, drive open with state:
const [editCard, setEditCard] = useState<Card | null>(null);

<Dialog open={editCard !== null} onOpenChange={(open) => { if (!open) setEditCard(null); }}>
  <DialogContent>
    <DialogHeader><DialogTitle>Edit card</DialogTitle></DialogHeader>
    {editCard && <CardEditForm card={editCard} onClose={() => setEditCard(null)} />}
  </DialogContent>
</Dialog>
```

### Pattern 6: Server Actions for Card CRUD
**What:** `"use server"` functions in `src/lib/deck-actions.ts` for all mutating operations. Called directly from client components or triggered by form `action=` prop.
**When to use:** All DB mutations in this phase

```typescript
// src/lib/deck-actions.ts
"use server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

export async function deleteCard(cardId: CardId) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Verify card belongs to user before deleting
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: { deck: true },
  });
  if (card?.deck.userId !== session.user.id) throw new Error("Forbidden");

  await db.delete(cards).where(eq(cards.id, cardId));
  revalidatePath("/dashboard");
}
```

### Pattern 7: Word List JSON Structure
**What:** Static JSON files at `src/data/wordlists/` with consistent shape.
**When to use:** Word list browser loads this data server-side (no API call needed)

```typescript
// src/data/wordlists/schema.ts — type definition only, no runtime
export type WordEntry = {
  id: string;          // "greetings-001"
  category: string;    // "Greetings"
  cefr: "A1" | "A2" | "B1";
  native: string;      // word in source language
  target: string;      // word in target language
};

export type WordList = {
  sourceLang: string;  // "en"
  targetLang: string;  // "fr"
  words: WordEntry[];
};
```

Data loaded server-side in the word list browser:
```typescript
// In a Server Component or Server Action
import enFr from "@/data/wordlists/en-fr.json";
```

### Anti-Patterns to Avoid
- **Translating on every keystroke:** Always debounce 500ms. Without debounce, every character fires an API call — 500k chars/month free tier depletes in hours with active use.
- **Auto-saving translation without user review:** CONTEXT.md and SUMMARY.md both mandate review before save. Never commit the DeepL result to DB without the user seeing it.
- **Exposing DEEPL_API_KEY to the client:** The env var must be in the `server` schema of `src/env.ts` — never in `client` or `runtimeEnv` under `NEXT_PUBLIC_*`.
- **Putting DeepL client initialization at module level:** Instantiate `new deepl.DeepLClient(env.DEEPL_API_KEY)` inside the handler function, not at module scope. Module-scope initialization in Route Handlers can cause issues in edge runtime and cold starts.
- **Using `@radix-ui/react-select` or `@radix-ui/react-dialog`:** This project uses `@base-ui/react` primitives. Do not install or import Radix Select/Dialog — they are not installed and would conflict with base-nova styles.
- **Making `nativeLanguage` NOT NULL without a default:** If existing users exist, the migration will fail. Use `.default("en")` in schema or apply a data migration first.
- **Relying on `drizzle-kit push` in CI/production:** Use `db:generate` + `db:migrate` for all schema changes. `push` skips the migration log and is for local development only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DeepL API HTTP client | Raw fetch with auth headers, retry, error codes | `deepl-node` SDK | Handles free vs pro URL, error code parsing, TypeScript types for language codes |
| Debounce timer management | `useEffect` + `setTimeout` + cleanup | `use-debounce` → `useDebounceCallback` | Handles stale closure issues, unmount cleanup, TypeScript generics |
| Dialog/Modal primitive | Custom portal + focus trap + ARIA | `@base-ui/react/dialog` via shadcn | Accessibility (focus trap, ARIA dialog role, escape key) is non-trivial |
| Select dropdown | Custom dropdown with keyboard nav | `@base-ui/react/select` via shadcn | Keyboard navigation, typeahead, ARIA combobox is a known difficult problem |
| Schema migration SQL | Hand-writing ALTER TABLE SQL | `drizzle-kit generate` | Generates correct SQL from schema diff; avoids typos and missed constraints |
| Form validation | Manual if/else validation | `react-hook-form` + `zod` | Already installed pattern from Phase 1 |

**Key insight:** Every item in this list has subtle edge cases that take days to get right. The cost is `npm install` + `npx shadcn add`. The savings are production bugs that never happen.

## Common Pitfalls

### Pitfall 1: Free-Tier DeepL URL — Free vs Pro Endpoint
**What goes wrong:** Using `https://api.deepl.com` for a free-tier key returns a 403 authentication error. Free tier requires `https://api-free.deepl.com`.
**Why it happens:** DeepL has two base URLs. The `deepl-node` SDK auto-detects which to use based on whether the API key ends in `:fx` (free tier keys end with `:fx`).
**How to avoid:** Use the `deepl-node` SDK — it handles this automatically. If using raw fetch, check the key suffix.
**Warning signs:** HTTP 403 from DeepL despite a valid key.

### Pitfall 2: Schema Migration Order — DROP CONSTRAINT Before ADD COLUMN
**What goes wrong:** If the generated migration attempts to add a non-nullable column before the constraint is dropped, or if the column default is missing for existing rows, `db:migrate` fails mid-run leaving the schema in an inconsistent state.
**Why it happens:** Drizzle generates separate statements. The order matters.
**How to avoid:** Always inspect the generated SQL file in `./drizzle/` before running `db:migrate`. Verify: (1) `DROP CONSTRAINT` appears before any `ADD COLUMN`, (2) new NOT NULL columns have defaults.
**Warning signs:** `db:migrate` exits with a Postgres error referencing the constraint name or NOT NULL violation.

### Pitfall 3: base-ui Select value must not be empty string
**What goes wrong:** Setting `value=""` on a Select causes the displayed value to appear blank even when a real option is selected. The `onValueChange` may fire with empty string on initial render.
**Why it happens:** base-ui Select (like Radix) treats empty string as "no selection."
**How to avoid:** Never use `""` as an option value. Use real IDs (deck.id) or a non-empty sentinel like `"__new__"`. Initialize controlled state with `null` or a real ID, not `""`.
**Warning signs:** Select appears blank after selecting a value.

### Pitfall 4: Dialog open state not resetting form on close
**What goes wrong:** User opens edit modal, changes a field, closes without saving. Opens a different card's edit modal — old field values still shown.
**Why it happens:** react-hook-form caches values; the Dialog closes but the component doesn't unmount if using conditional render inside.
**How to avoid:** Use the pattern `{editCard && <CardEditForm card={editCard} ... />}` inside `DialogContent` so the form component unmounts and resets on close. Alternatively, call `reset(card)` in a `useEffect` on `card` prop change.
**Warning signs:** Edit modal shows stale data from a previously edited card.

### Pitfall 5: Translation feedback loop in bidirectional form
**What goes wrong:** User types in native field → translation fires → target field updates → `onChange` fires on target field → triggers translation from target → overwrites native field → infinite loop.
**Why it happens:** Setting state on one field triggers `onChange` on that field if the value update is detected as a user change.
**How to avoid:** Use a `useRef` to track which field the user last typed in. Only fire translation when the triggering field matches `activeField.current`. The pattern in the Code Examples section above (Pattern 2) demonstrates this.
**Warning signs:** Translation requests fire continuously, fields flicker.

### Pitfall 6: Zod v4 API changes
**What goes wrong:** Using Zod v3 patterns that are not compatible with Zod v4.3.6 (installed in this project).
**Why it happens:** Zod v4 has breaking changes: `z.string().url()` is replaced by `z.url()` (standalone), some error message shapes changed.
**How to avoid:** Use `z.url()` (standalone) not `z.string().url()`. Follow the patterns already established in `src/env.ts` which uses the correct v4 syntax.
**Warning signs:** TypeScript errors on Zod schema definitions; runtime validation throwing unexpected errors.

### Pitfall 7: nativeLanguage signup migration — existing rows
**What goes wrong:** Running `db:migrate` with `nativeLanguage text NOT NULL` on a table with existing users fails with "column X of relation Y contains null values."
**Why it happens:** Postgres cannot set a NOT NULL constraint on a column if existing rows would have NULL.
**How to avoid:** Add `.default("en")` in the Drizzle schema definition. This generates `ALTER TABLE "user" ADD COLUMN "nativeLanguage" text NOT NULL DEFAULT 'en'` which Postgres accepts. The default can be removed in a future migration once all rows have real values.
**Warning signs:** Migration fails immediately after running `db:migrate`.

## Code Examples

Verified patterns from official sources:

### DeepL SDK — translateText
```typescript
// Source: github.com/DeepLcom/deepl-node README
import * as deepl from "deepl-node";

const client = new deepl.DeepLClient(process.env.DEEPL_API_KEY!);
// Returns TextResult with .text property
const result = await client.translateText("Hello, world!", "en", "fr");
console.log(result.text); // "Bonjour, le monde !"

// Language codes confirmed: "en", "fr", "es" (case-insensitive)
// Source language can be null for auto-detection
const autoResult = await client.translateText("Hola", null, "en");
```

### Drizzle — Remove Unique Constraint in Schema
```typescript
// src/db/schema.ts — BEFORE (Phase 1):
export const decks = pgTable(
  "decks",
  { ... },
  (table) => [
    unique("decks_userId_language_unique").on(table.userId, table.language),
  ],
);

// AFTER (Phase 2) — remove the unique(), add name column:
export const decks = pgTable("decks", {
  id: text("id").primaryKey().$type<DeckId>(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  language: text("language").notNull(),
  name: text("name").notNull(),              // new column — auto-generated name
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  // NO unique constraint table callback
});

// user table — add nativeLanguage with default to handle existing rows:
export const user = pgTable("user", {
  ...existingFields,
  nativeLanguage: text("nativeLanguage").notNull().default("en"),
});
```

### useDebounceCallback from use-debounce
```typescript
// Source: use-debounce v10 API (usehooks-ts.com/react-hook/use-debounce-callback)
import { useDebounceCallback } from "use-debounce";

// In component:
const debouncedTranslate = useDebounceCallback(async (text: string) => {
  // fires 500ms after last call
  const res = await fetch("/api/translate", { ... });
}, 500);

// Call it — won't fire until 500ms of silence:
debouncedTranslate(inputValue);
```

### Drizzle — Deck name auto-generation
```typescript
// In createDeck server action:
import { db } from "@/db";
import { decks } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export async function createDeck(userId: UserId, language: string) {
  // Count existing decks for this user+language to generate name
  const [{ count: existingCount }] = await db
    .select({ count: count() })
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.language, language)));

  const languageLabel = { en: "English", fr: "French", es: "Spanish" }[language] ?? language;
  const name = `${languageLabel} #${Number(existingCount) + 1}`;
  const id = crypto.randomUUID() as DeckId;

  await db.insert(decks).values({ id, userId, language, name });
  return { id, name };
}
```

### revalidatePath after Server Action
```typescript
// Source: Next.js docs revalidatePath.md
import { revalidatePath } from "next/cache";

// After any card mutation, revalidate the dashboard:
revalidatePath("/dashboard");
// This invalidates cached data; the page re-fetches on next visit.
```

## Word List Data

### Sourcing Strategy
No open-source dataset provides the exact format required: `{category, cefr, native, target}` tuples across all 6 language pairs. Options evaluated:

| Source | Format | Coverage | Verdict |
|--------|--------|----------|---------|
| CodingFriends/basic-vocabulary-word-lists | CSV | 14 categories, EN/FR/ES, no CEFR levels | Usable as base — needs CEFR annotation |
| CEFR-J / openlanguageprofiles | CSV | English only | English source useful, no FR/ES |
| wordfreq (rspeer) | Frequency lists | No thematic categories | Not suitable |
| Manual curation | JSON | All 6 pairs, all categories, all CEFR levels | Best for v1 — ~1,200 entries |

**Recommended approach:** Use `CodingFriends/basic-vocabulary-word-lists` CSV as a starting reference, curate ~1,200 entries into 6 JSON files. Categories: Greetings (A1), Numbers (A1), Colors (A1), Days/Months (A1), Food & Drink (A1/A2), Family (A1/A2), Body (A1/A2), Animals (A2), Clothing (A2), Home (A2), Weather (A2/B1), Shopping (A2/B1), Travel (B1), Work (B1).

Estimated counts per category:
- A1 categories (6): ~15 words each = 90 words
- A2 categories (5): ~20 words each = 100 words
- B1 categories (3): ~25 words each = 75 words
- Total per language pair: ~265 words × 6 pairs = ~1,590 entries

This is feasible in one planning wave. The JSON files live at `src/data/wordlists/` and are imported server-side — zero runtime cost, fully version-controlled.

**Confidence:** MEDIUM — sourcing approach is proven but the curation work is manual and its accuracy depends on execution quality.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @radix-ui/react-select + @radix-ui/react-dialog | @base-ui/react/select + @base-ui/react/dialog | Dec 2025 — shadcn added base-nova style | Different import paths, different data attributes for state (data-open vs data-state="open") |
| middleware.ts / middleware() | proxy.ts / proxy() | Next.js 16 breaking change (already handled Phase 1) | Not relevant to Phase 2 — no proxy changes needed |
| NextAuth v4 | Better Auth 1.x | 2025 (already established) | auth.api.getSession is the session check pattern |
| Zod v3 .string().url() | Zod v4 z.url() | Zod v4 (installed) | Must use v4 syntax — v3 patterns will fail |

**Deprecated/outdated:**
- `middleware.ts`: Renamed to `proxy.ts` in Next.js 16 — already handled in Phase 1
- `z.string().url()`: Zod v4 replaces with standalone `z.url()` — existing code uses v4 correctly

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | deepl-node SDK | Yes | (project runtime) | — |
| deepl-node npm package | Translation proxy | No (not installed) | 1.24.0 available | — |
| use-debounce npm package | Debounced translation | No (not installed) | 10.1.0 available | Custom 15-line useEffect hook |
| Neon Postgres | Schema migration | Yes (configured) | — | — |
| DEEPL_API_KEY env var | DeepL proxy | Not yet in .env.local | — | Must add before testing translation |
| @base-ui/react/select | Deck switcher | Yes (v1.3.0 installed) | 1.3.0 | — |
| @base-ui/react/dialog | Card edit modal | Yes (v1.3.0 installed) | 1.3.0 | — |
| shadcn Select component | Deck switcher | No (not yet added) | — | Must run: npx shadcn add select |
| shadcn Dialog component | Card edit modal | No (not yet added) | — | Must run: npx shadcn add dialog |

**Missing dependencies with no fallback:**
- `DEEPL_API_KEY` — must be obtained from deepl.com and added to `.env.local` and Vercel project settings before translation can be tested

**Missing dependencies with fallback:**
- `use-debounce` — fallback is a simple inline `useDebounce` hook (acceptable but adds maintenance cost)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DECK-01 | Word list loads correct category/cefr entries | unit | `vitest run src/data/wordlists.test.ts` | No — Wave 0 |
| DECK-01 | addWordToDecK action inserts card with source="wordlist" | unit | `vitest run src/lib/deck-actions.test.ts` | No — Wave 0 |
| DECK-02 | /api/translate returns translated text | manual-only | — | N/A |
| DECK-03 | saveCard server action inserts card with correct fields | unit | `vitest run src/lib/deck-actions.test.ts` | No — Wave 0 |
| DECK-04 | editCard server action updates front/back fields | unit | `vitest run src/lib/deck-actions.test.ts` | No — Wave 0 |
| DECK-05 | deleteCard server action removes card from DB | unit | `vitest run src/lib/deck-actions.test.ts` | No — Wave 0 |
| DECK-06 | createDeck generates correct name "Language #N" | unit | `vitest run src/lib/deck-actions.test.ts` | No — Wave 0 |
| DECK-06 | createDeck allows multiple decks for same language | unit | `vitest run src/lib/deck-actions.test.ts` | No — Wave 0 |

Note: DECK-02 (DeepL API proxy) requires a live API key and network access — manual-only. All other behaviors are pure function or deterministic DB operations that can be unit-tested with a test DB or mocked Drizzle.

### Sampling Rate
- **Per task commit:** `npm run test` (fast, no API calls)
- **Per wave merge:** `npm run test && npm run typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/data/wordlists.test.ts` — validates JSON structure (required fields, no duplicates, valid CEFR values) — covers DECK-01
- [ ] `src/lib/deck-actions.test.ts` — unit tests for createDeck, addCard, editCard, deleteCard — covers DECK-01, DECK-03–DECK-06
- [ ] Test DB setup — deck-actions tests need a Postgres connection or mocked Drizzle client

## Open Questions

1. **nativeLanguage at signup — which signup page?**
   - What we know: CONTEXT.md says "Users choose their native language during signup" — the signup page is at `src/app/(auth)/signup/page.tsx`
   - What's unclear: Whether the language picker appears as a new step in the signup form, or as a separate onboarding screen after first login
   - Recommendation: Add as a new field in the existing signup form (simplest); a separate onboarding screen is deferred complexity

2. **Deck creation during signup — when does the first deck get created?**
   - What we know: First-visit experience shows a language picker "What language do you want to learn first?" and auto-creates a deck
   - What's unclear: Does this happen during signup (as part of form), or after signup on first `/dashboard` visit?
   - Recommendation: After signup on first `/dashboard` visit — the dashboard checks if user has 0 decks and shows the language picker; keeps signup form simple

3. **Word list data quality — translations accuracy**
   - What we know: Manual curation is the recommended approach
   - What's unclear: Whether to use a DeepL pre-translation pass to generate the word list entries, or write them by hand
   - Recommendation: Use DeepL to generate initial translations for all ~265 words per language pair, then review for quality — reduces manual work from ~1,590 entries to ~265 source words

4. **Review queue sort on card list — formula**
   - What we know: CONTEXT.md says "Cards sorted by review queue order (due for review next = top of list)"
   - What's unclear: What exactly determines "due for review" — the Study Engine (Phase 3) hasn't been designed yet
   - Recommendation: For Phase 2, sort by `createdAt ASC` (oldest first) as a proxy; Phase 3 can replace with proper spaced repetition sort. Don't over-engineer the sort now.

## Project Constraints (from CLAUDE.md)

CLAUDE.md contains `@AGENTS.md` which expands to:

> This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

**Actionable directives for Phase 2:**
1. **Mandatory pre-code read:** Before writing any Next.js server component, Route Handler, or Server Action, read the relevant doc in `node_modules/next/dist/docs/01-app/`. Confirmed relevant docs read for this research: `route.md`, `revalidatePath.md`, `forms.md`, `proxy.md`.
2. **middleware.ts is deprecated:** Already handled in Phase 1 — proxy.ts is in use. Phase 2 adds no proxy changes.
3. **Server Actions pattern:** Use `"use server"` directive in dedicated action files, not inline in components (confirmed by `forms.md`).
4. **No Radix UI imports:** This project uses `@base-ui/react` — do not install or import `@radix-ui/react-select`, `@radix-ui/react-dialog`, or `@radix-ui/react-dropdown-menu`.

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler API, HTTP methods, request/context params
- `node_modules/next/dist/docs/01-app/02-guides/forms.md` — Server Actions form pattern, "use server" directive
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` — revalidatePath API, Server Function + Route Handler usage
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — proxy.ts file convention (confirmed: middleware.ts deprecated)
- `src/db/schema.ts` — Current schema with named unique constraint `decks_userId_language_unique`
- `vitest.config.ts` + `src/env.test.ts` — Confirmed Vitest node environment, `@` alias configured
- `components.json` — Confirmed `base-nova` style, `@base-ui/react` primitives
- `src/components/ui/button.tsx` — Confirmed `@base-ui/react/button` import pattern
- github.com/DeepLcom/deepl-node README — translateText API, language codes (en/fr/es), free tier key detection
- base-ui.com/react/components/select — Select.Root props: `value`, `onValueChange`, `defaultValue`

### Secondary (MEDIUM confidence)
- ui.shadcn.com/docs/components/base/select — shadcn wrapper sub-components for base-nova Select
- ui.shadcn.com/docs/components/base/dialog — shadcn wrapper sub-components for base-nova Dialog
- usehooks-ts.com/react-hook/use-debounce-callback — `useDebounceCallback` API (v10 uses both `useDebounceValue` and `useDebounceCallback`)
- github.com/CodingFriends/basic-vocabulary-word-lists — CSV word lists usable as base data

### Tertiary (LOW confidence)
- Word list curation estimate (~265 words × 6 pairs) — derived estimate, actual work may vary
- DeepL free tier 500k chars/month — from multiple secondary sources; official pricing page returned 403

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry and project files
- Architecture: HIGH — patterns derived from official docs and established Phase 1 conventions
- Pitfalls: HIGH — pitfalls 1–5 derived from official docs and known library behaviors; pitfall 7 from Postgres behavior
- Word list data: MEDIUM — sourcing strategy is reasonable but curation quality depends on execution

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable stack; deepl-node, use-debounce, base-ui are all non-fast-moving)
