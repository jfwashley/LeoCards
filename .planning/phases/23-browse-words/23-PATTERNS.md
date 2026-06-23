# Phase 23: Browse Words - Pattern Map

**Mapped:** 2026-06-23
**Files analyzed:** 8 new/modified files
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(protected)/deck/browse/page.tsx` | server page | request-response | self (current version) | exact — extend `?topic=` into existing `?deck=` pattern |
| `src/components/word-list-browser.tsx` | client component | event-driven (optimistic) | self (current version) | exact — restyle + split into two-screen IA; preserve all state logic |
| `src/components/daybreak/bw-medallion.tsx` (new) | presentational atom | transform (CSS-art) | `src/components/daybreak/lion-face.tsx` | exact — same RSC-safe CSS-div geometry pattern |
| `src/components/daybreak/ac-top.tsx` | presentational atom | request-response | self (current version) | exact — add optional `browsePath` prop + right-side link |
| `src/components/new-card-mode-toggle.tsx` | client component | request-response | self (current version) | exact — thread `browsePath` prop to `ACTop` |
| `src/components/daybreak/__tests__/bw-atoms.test.tsx` (new) | rendered-component test | — | `src/components/daybreak/__tests__/ac-atoms.test.tsx` | exact — same `@vitest-environment jsdom` + `@testing-library/react` pattern |
| `e2e/03-word-list-browser.spec.ts` | e2e spec | — | self (current version) | exact — retarget literal/CSS-class selectors; add two-screen navigation flow |
| `e2e/09-language-breakdown.spec.ts` | e2e spec | — | self (current version) | exact — retarget two at-risk literal locators |

---

## Pattern Assignments

### `src/app/(protected)/deck/browse/page.tsx` (server page, request-response)

**Analog:** self — current `src/app/(protected)/deck/browse/page.tsx`

**Existing imports pattern** (lines 1–11):
```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { WordListBrowser } from "@/components/word-list-browser";
import { auth } from "@/lib/auth";
import {
  getDeckCardWords,
  getUserDecks,
  getUserNativeLanguage,
} from "@/lib/deck-queries";
import { getWordList } from "@/lib/wordlist";
```

**New imports to add:**
```typescript
import { CATEGORIES } from "@/data/wordlists/schema";
import { filterWords } from "@/lib/wordlist";
// Also import BrowseTiles / BrowseList when they become named exports from word-list-browser.tsx
```

**Existing searchParams pattern** (lines 12–14, 22–30) — extend by adding `topic?`:
```typescript
interface BrowsePageProps {
  searchParams: Promise<{ deck?: string; topic?: string }>;  // ADD topic
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  // ... auth identical ...
  const params = await searchParams;
  const requestedDeckId = params.deck;
  const requestedTopic = params.topic;             // ADD — undefined = tiles landing
```

**New server-side computation to add** (after `getWordList` resolves):
```typescript
// Per-category counts — synchronous, no extra I/O (D-07)
const categoryCounts: Record<string, number> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat, filterWords(wordList.words, { category: cat }).length])
);
```

**New branching return** (replaces the current single `<WordListBrowser ...>` return, lines 56–68):
```typescript
return (
  <div className="min-h-screen bg-background">
    <main className="px-8 py-8 max-w-4xl mx-auto w-full">
      {requestedTopic ? (
        <BrowseList
          words={wordList.words}
          topic={requestedTopic}
          existingWords={existingWords}
          deckId={activeDeck.id}
          nativeLang={nativeLang}
          targetLang={activeDeck.language}
          nativeLangLabel={nativeLangLabel}
          targetLangLabel={targetLangLabel}
        />
      ) : (
        <BrowseTiles
          categories={CATEGORIES}
          categoryCounts={categoryCounts}
          deckId={activeDeck.id}
          nativeLangLabel={nativeLangLabel}
          targetLangLabel={targetLangLabel}
        />
      )}
    </main>
  </div>
);
```

**Auth + redirect guard pattern** (lines 22–45) — **preserve unchanged** — the `session` check, `decks.length === 0` redirect, and `!activeDeck` redirect are all kept.

---

### `src/components/word-list-browser.tsx` (client component, event-driven)

**Analog:** self — current file

**"use client" + imports pattern** (lines 1–17):
```typescript
"use client";

import Link from "next/link";
import React, { useCallback, useMemo, useState, useTransition } from "react";
import { LangChip } from "@/components/daybreak/lang-chip";
import { LionFace } from "@/components/daybreak/lion-face";
import { TBtn } from "@/components/daybreak/t-btn";
import type { CefrLevel, WordEntry } from "@/data/wordlists/schema";
import { CATEGORIES } from "@/data/wordlists/schema";
import { addWordToCard, removeWordFromDeck } from "@/lib/deck-actions";
import { filterWords } from "@/lib/wordlist";
// Remove: lucide-react icons (replaced by CSS-drawn toggle + spinner)
// Remove: Button from ui/button (replaced by Daybreak inline-style atoms)
// Remove: cn from lib/utils (rows use inline styles, not Tailwind classes)
```

**`wordKey` utility** (line 21) — **preserve unchanged**:
```typescript
function wordKey(word: WordEntry): string {
  return `${word.native}::${word.target}`;
}
```

**`BrowseList` props interface** (replaces `WordListBrowserProps`):
```typescript
interface BrowseListProps {
  words: WordEntry[];
  existingWords: Set<string>;
  deckId: string;
  topic: string;
  nativeLang: string;
  targetLang: string;
  nativeLangLabel: string;
  targetLangLabel: string;
}
```

**`BrowseTiles` props interface** (new):
```typescript
interface BrowseTilesProps {
  categories: readonly string[];
  categoryCounts: Record<string, number>;
  deckId: string;
  nativeLangLabel: string;
  targetLangLabel: string;
}
```

**Optimistic state machine** (lines 43–147) — **PRESERVE EXACTLY** — copy these into `BrowseList`:
```typescript
// In BrowseList:
const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("All");
const [deckWords, setDeckWords] = useState<Set<string>>(() => new Set(existingWords));
const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
const [errorWords, setErrorWords] = useState<Map<string, string>>(new Map());
const [, startTransition] = useTransition();

const handleAdd = useCallback((word: WordEntry) => {
  const key = wordKey(word);
  setDeckWords((prev) => new Set([...prev, key]));
  setLoadingWords((prev) => new Set([...prev, key]));
  startTransition(async () => {
    try {
      await addWordToCard(deckId, word.id, word.native, word.target);
    } catch {
      setDeckWords((prev) => { const n = new Set(prev); n.delete(key); return n; });
      setErrorWords((prev) => new Map([...prev, [key, "Failed. Try again."]]));
      setTimeout(() => {
        setErrorWords((prev) => { const n = new Map(prev); n.delete(key); return n; });
      }, 3000);
    } finally {
      setLoadingWords((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  });
}, [deckId]);

// handleRemove follows the same pattern (lines 110–147 of current file)
```

**Critical: do NOT add `useEffect` to sync `deckWords`** — the `useState(() => new Set(existingWords))` lazy initializer is intentional; `addWordToCard` calls `revalidatePath('/dashboard')` not `/deck/browse`, so the Browse page does not re-render from server mid-session.

**`filteredWords` memo** (lines 50–57) — preserve, adapt for topic prop:
```typescript
const filteredWords = useMemo(
  () => filterWords(words, {
    category: topic as (typeof CATEGORIES)[number],
    cefr: difficultyFilter === "All" ? undefined : difficultyFilter,
  }),
  [words, topic, difficultyFilter],
);
```

**`BWWordRow` memo** (lines 233–315) — **preserve `React.memo` wrapper** and `useCallback([deckId])` on handlers; replace visual markup only. New anatomy:
- Row container: `data-testid="word-row"` + warm tint when `inDeck` (background `#FFF7E9`, border `1px solid #F4E3C4`, borderRadius 14)
- Left column: native bold (17.5px, fontWeight 700, color `#4A331C`) on top; beneath: target-lang chip code (10px, fontWeight 700, `#9C8467`) + target muted (14.5px, `#9C8467`)
- **Reserved error line** (D-06): always in DOM as last child of left column, `minHeight: 16`, `fontSize: 12`, `color: "#DE5F4A"`, renders `{error ?? ""}` — no `position: absolute`, no `-bottom-4` (fixes existing overlap bug at line 309)
- CEFR tag: `BWLvlTag` inline style (fontSize 11, fontWeight 700, color `#B4762A`, background `#FFF1DC`, borderRadius 6, padding `2px 7px`)
- 38px circular toggle: outlined amber `+` (not in deck) / filled amber `✓` (in deck) / amber spinner (loading) — `aria-label` on the button preserved
- Touch target: toggle container is `width: 38, height: 38` with a `minHeight: 44` on the row to meet BRW-03 ≥44px requirement

**Back-link and top bar** — replace the current `<Link href="/dashboard">Back to my deck</Link>` (line 152–158) with Daybreak inline-style bars:
- `BrowseTiles` top bar: "‹ Add a card" left link → `/deck/new-card?deck={deckId}` (D-04), centered "Browse Words" title (`data-testid="browse-words-title"`), 64px right spacer
- `BrowseList` top bar: "‹ Topics" left link → `/deck/browse?deck={deckId}` (D-02), center = mini BWMedallion + topic name in display font, right spacer

**`<Link href>` with `encodeURIComponent`** for tile navigation (required for "Days & Months" / "Food & Drink"):
```typescript
// In BWTopicTile inside BrowseTiles:
<Link
  href={`/deck/browse?deck=${deckId}&topic=${encodeURIComponent(category)}`}
  data-testid={`topic-tile-${category.toLowerCase().replace(/[^a-z]/g, '-')}`}
>
```

---

### `src/components/daybreak/bw-medallion.tsx` (new — presentational atom, CSS-art)

**Analog:** `src/components/daybreak/lion-face.tsx`

**File structure pattern** (lines 1–5 of lion-face.tsx):
```typescript
// Daybreak [topic] medallion + 14 CSS-drawn geometric amber icons.
// Ported 1:1 from design/handoff-daybreak/daybreak-browse.jsx TOPIC_ICON map.
// Pure (no hooks) — RSC-safe. CSS placeholder per PROJECT.md; swappable later.
// Pattern: identical to LionFace — position:relative container, absolutely-
// positioned divs/spans for each glyph element.
```

**RSC-safe component signature pattern** (lines 17–25 of lion-face.tsx):
```typescript
// No props interface with hooks — pure props only
export function BWMedallion({ name, size = 52 }: { name: string; size?: number }) {
  // ...
}
```

**CSS-art geometry pattern** — translate mock's `ring`/`line` helpers into TSX inline-style helpers:
```typescript
// Source: design/handoff-daybreak/daybreak-browse.jsx lines 9–10
// Translate: function ring(c, s) → TypeScript helper r(s)
const ICON_COLOR = "#F28A1F"; // bt.primary
const STK = 2.2;

function r(s: React.CSSProperties): React.CSSProperties {
  return { position: "absolute", border: `${STK}px solid ${ICON_COLOR}`, boxSizing: "border-box", ...s };
}
function l(s: React.CSSProperties): React.CSSProperties {
  return { position: "absolute", background: ICON_COLOR, borderRadius: 2, ...s };
}
// TG wrapper → <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
```

**Medallion container pattern** (from daybreak-browse.jsx line 55):
```typescript
// BWMedallion outer container
<div style={{ width: size, height: size, borderRadius: 16, background: "#FFF1DC", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
  <TopicIcon name={name} />
</div>
```

**`TopicIcon` by case** — 14 entries from `design/handoff-daybreak/daybreak-browse.jsx` lines 13–27. Key translation notes:
- Mock's `bt.primary` → literal `"#F28A1F"` (same as all other daybreak inline-style atoms)
- Mock's `bt.surface` → `"#FFFFFF"` (used in Travel icon inner circle, line 25)
- Mock's `bt.fontDisplay` → `"var(--font-display)"` (Numbers icon, line 14)
- `STk2()` in "Days & Months" (line 16) is a typo in the mock — it just returns `STK` (= 2.2)
- `aria-hidden="true"` on the outermost container (mirrors LionFace line 43)

**LionFace `position: relative` root + `flex: none` + size props pattern** (lines 40–44):
```typescript
<div
  style={{ width: s, height: s, position: "relative", flex: "none" }}
  aria-hidden="true"
>
```

---

### `src/components/daybreak/ac-top.tsx` (presentational atom, request-response)

**Analog:** self — current `src/components/daybreak/ac-top.tsx`

**Current structure** (all 47 lines) — add `browsePath?` prop and conditional right-side link:

**Current props (none) → new interface:**
```typescript
interface ACTopProps {
  /** When provided, renders "Browse words ›" at top-right (landing/Pick only). */
  browsePath?: string;
}

export function ACTop({ browsePath }: ACTopProps) {
```

**Current right spacer** (line 44) — replace with conditional:
```typescript
{/* Current: */}
<span style={{ flex: "none", width: 60 }} />

{/* Replace with: */}
{browsePath ? (
  <Link
    href={browsePath}
    data-testid="browse-words-link"
    style={{
      fontSize: 14,
      fontWeight: 600,
      color: "#C96F12",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      flex: "none",
    }}
  >
    Browse words ›
  </Link>
) : (
  <span style={{ flex: "none", width: 60 }} />
)}
```

**Left link style** (lines 18–30) — **preserve unchanged**; the right link mirrors the same style (`fontSize: 14, fontWeight: 600, color: "#C96F12"`).

**`data-testid="add-card-title"`** (line 34) — **preserve unchanged** — e2e/04 + e2e/09 depend on it.

**`import Link from "next/link"` is already present** (line 5).

---

### `src/components/new-card-mode-toggle.tsx` (client component, request-response)

**Analog:** self — current file

**Current `ACTop` render** (line 33) — add `browsePath` prop, only when `mode === "type"`:
```typescript
// Current (line 33):
<ACTop />

// Replace with — browsePath computed from activeDeckId, shown only in type mode:
<ACTop browsePath={mode === "type" ? `/deck/browse?deck=${activeDeckId}` : undefined} />
```

**Rationale:** `ImageUploadFlow` renders its own header on `step === "deck"` (confirmed: lines 344–730 of image-upload-flow.tsx — all `step === "deck"` branches render ACStepper or a custom flex header). On `step === "pick"`, `ImageUploadFlow` renders no header of its own, so `ACTop` from `NewCardModeToggle` is what the user sees. D-03 says "landing/Pick header only" — passing `browsePath` only when `mode === "type"` achieves this safely without needing to inspect image flow step state from outside. The image Pick step does show ACTop (Assumption A2 verified — confirmed from image-upload-flow.tsx render logic), but D-03's "from an image" Pick step is still inside the image picker intent, so type-mode-only is the simpler and more conservative implementation.

**No other changes** to `NewCardModeToggle` — all other props and render logic preserved.

---

### `src/components/daybreak/__tests__/bw-atoms.test.tsx` (new — rendered-component test)

**Analog:** `src/components/daybreak/__tests__/ac-atoms.test.tsx`

**File header pattern** (line 1 of ac-atoms.test.tsx):
```typescript
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
```

**`afterEach(cleanup)` pattern** (line 12):
```typescript
afterEach(() => cleanup());
```

**`describe` + `it` block pattern** (lines 16–41):
```typescript
describe("BWMedallion — topic icon container", () => {
  it("renders without crashing for all 14 CATEGORIES", () => {
    // ...
  });
});
```

**`fireEvent.click` + `vi.fn()` callback pattern** (lines 21–27):
```typescript
it("clicking 'Show all levels' calls reset handler", () => {
  const onReset = vi.fn();
  render(<BrowseEmpty topic="Body" level="B1" onShowAll={onReset} />);
  fireEvent.click(screen.getByRole("button", { name: "Show all levels" }));
  expect(onReset).toHaveBeenCalled();
});
```

**Rendered-component state assertions** (Phase 22 lesson — test CSS, not just logic):
```typescript
it("in-deck word row has warm tint background", () => {
  render(<BWWordRow word={mockWord} inDeck={true} loading={false} error={undefined} onAdd={() => {}} onRemove={() => {}} />);
  const row = screen.getByTestId("word-row");
  expect(row.style.background).toBe("#FFF7E9");
});

it("error line is in DOM even when no error (prevents layout shift)", () => {
  render(<BWWordRow word={mockWord} inDeck={false} loading={false} error={undefined} onAdd={() => {}} onRemove={() => {}} />);
  // The reserved error line always renders (empty string, not absent)
  const row = screen.getByTestId("word-row");
  // The error container exists and is empty
  const errorLine = row.querySelector('[data-role="error-line"]');
  expect(errorLine).toBeTruthy();
  expect(errorLine?.textContent).toBe("");
});
```

**ACTop `browsePath` cases to add to existing `ac-atoms.test.tsx`** (new `describe` block):
```typescript
describe("ACTop — D-03 Browse words entry link", () => {
  it("renders Browse words link when browsePath is provided", () => {
    render(<ACTop browsePath="/deck/browse?deck=abc" />);
    expect(screen.getByTestId("browse-words-link")).toBeTruthy();
  });

  it("Browse words link is absent when browsePath is omitted", () => {
    render(<ACTop />);
    expect(screen.queryByTestId("browse-words-link")).toBeNull();
  });
});
```

---

### `e2e/03-word-list-browser.spec.ts` (e2e spec retarget)

**Analog:** self — current file

**All five tests need two-step navigation.** Tests currently navigate to `/deck/browse` and expect category pills on that screen. After re-skin, the landing shows tiles (no pills). Add a tile click + URL wait before any category/level/word assertions.

**Test 1 — "browse words page loads with categories and filters"** (lines 9–20):

Current at-risk locators:
- `page.getByText("Browse Words")` (line 15) → `page.getByTestId("browse-words-title")`
- `page.getByRole("button", { name: "Animals" })` (line 16) → broken (tile link, not button); navigate into Animals first
- `page.getByRole("button", { name: "Food" })` (line 17) → broken; navigate into Food & Drink
- `page.getByRole("button", { name: "All" })` (line 18) → needs list screen context
- `page.getByRole("button", { name: "A1" })` (line 19) → needs list screen context

Retarget approach:
```typescript
test("browse words page loads with topic tiles and level filters", async ({ page }) => {
  await page.getByRole("link", { name: "Browse words" }).first().click();
  await page.waitForURL(/\/deck\/browse/);

  // Landing screen: title + 14 tiles
  await expect(page.getByTestId("browse-words-title")).toBeVisible();
  await expect(page.getByTestId("topic-tile-animals")).toBeVisible();
  await expect(page.getByTestId("topic-tile-food-drink")).toBeVisible();

  // Navigate into Animals to assert level tiles
  await page.getByTestId("topic-tile-animals").click();
  await page.waitForURL(/topic=/);
  await expect(page.getByRole("button", { name: "All" })).toBeVisible();
  await expect(page.getByRole("button", { name: "A1" })).toBeVisible();
});
```

**Test 2 — "can add a word to deck and see checkmark"** (lines 22–33):
- Navigate into a tile before waiting for `[aria-label*="Add"]`
- `[aria-label*="Add"]` and `[aria-label*="Remove"]` selectors are role-based and **survive re-skin** — preserve them
- Add: `await page.getByTestId("topic-tile-animals").click(); await page.waitForURL(/topic=/);` before `addButton.waitFor`

**Test 3 — "can remove a word from deck"** (lines 35–50): same tile navigation step needed.

**Test 4 — "category filter changes visible words"** (lines 52–62):
- Line 57: `page.getByRole("button", { name: "Food" })` → `page.getByTestId("topic-tile-food-drink").click()` + `page.waitForURL(/topic=Food/)`
- Line 60: `.locator(".border-b.border-border.py-2")` → `.locator('[data-testid="word-row"]')`

**Test 5 — "difficulty filter works"** (lines 64–74):
- Navigate into a tile first (add tile click + `waitForURL(/topic=/)`)
- Line 69: `getByRole("button", { name: "A1" })` is safe once on list screen
- Line 72: `.locator(".border-b.border-border.py-2")` → `.locator('[data-testid="word-row"]')`

---

### `e2e/09-language-breakdown.spec.ts` (e2e spec retarget)

**Analog:** self — current file

**Two at-risk locators** (lines 24, 26):

Line 24 — `page.getByText("Browse Words")`:
```typescript
// Before:
await expect(page.getByText("Browse Words")).toBeVisible();
// After:
await expect(page.getByTestId("browse-words-title")).toBeVisible();
```

Line 26 — `page.getByRole("link", { name: "Back to my deck" })`:
- This link is **removed** (D-04). The landing back-link is now "‹ Add a card".
- The test uses this to navigate back to `/dashboard`. Retarget the navigation step:
```typescript
// Before:
await page.getByRole("link", { name: "Back to my deck" }).click();
await page.waitForURL(/\/dashboard/);
// After:
await page.getByRole("link", { name: /Add a card/i }).click();
await page.waitForURL(/\/deck\/new-card/);
// Then navigate from /deck/new-card to dashboard via "‹ My deck":
await page.getByRole("link", { name: /My deck/i }).click();
await page.waitForURL(/\/dashboard/);
```

**`e2e/10-mobile-responsive.spec.ts` line 94** — `getByRole("button", { name: "Animals" })`:
```typescript
// Before:
await expect(page.getByRole("button", { name: "Animals" })).toBeVisible();
// After:
await expect(page.getByTestId("topic-tile-animals")).toBeVisible();
```

---

## Shared Patterns

### Daybreak inline-style atom convention
**Source:** `src/components/daybreak/ac-top.tsx`, `src/components/daybreak/lang-chip.tsx`, `src/components/daybreak/ac-context.tsx`
**Apply to:** All new Browse atoms (`BWMedallion`, `BWLandingTop`, `BWListTop`, `BWContext`, `BWLevels`, `BWTopicTile`, `BWWordRow`, `BrowseEmpty`)

Pattern: inline styles with literal hex values (not Tailwind classes), matching the mock's `bt = window.d1Theme` token values. Key tokens:
```typescript
const AMBER     = "#F28A1F";  // bt.primary
const INK       = "#4A331C";  // bt.ink
const MUTED     = "#9C8467";  // bt.muted
const LINK_CLR  = "#C96F12";  // bt.link
const TINT      = "#FFF1DC";  // bt.pillBg
const CARD_BG   = "#FFFFFF";
const CARD_BORD = "1px solid #EDDFC9";   // bt.cardBorder
const FIELD_BRD = "1px solid #EDDFC9";   // bt.fieldBorder (Assumption A1 — high confidence)
const FONT_DISP = "var(--font-display)";  // bt.fontDisplay
```

### CSS-art geometry pattern (RSC-safe)
**Source:** `src/components/daybreak/lion-face.tsx` (lines 1–115)
**Apply to:** `src/components/daybreak/bw-medallion.tsx`

Rules: `position: "relative"` container, `position: "absolute"` children, `flex: "none"`, `aria-hidden="true"`, no hooks, no imports beyond React types.

### Left chevron glyph (no icon library)
**Source:** `src/components/image-upload-flow.tsx` (lines 157–172, `LeftChev` component) and `design/handoff-daybreak/daybreak-browse.jsx` (lines 70–72, `BWChevL`)
**Apply to:** `BWLandingTop` and `BWListTop` back-links

```typescript
// Reusable inline helper (or inline directly in the link span):
<span aria-hidden="true" style={{
  width: 8, height: 8,
  borderLeft: "2.2px solid #C96F12",
  borderBottom: "2.2px solid #C96F12",
  transform: "rotate(45deg)",
  display: "inline-block", flex: "none",
}} />
```

### `LangChip` context line pattern
**Source:** `src/components/daybreak/ac-context.tsx` (lines 1–49)
**Apply to:** `BWContext` component in Browse

The `ACContext` already implements the `LangChip → LangChip · text` pattern. Browse's `BWContext` is a variant with different copy ("tap a word to add it to your **{TargetLanguageName} deck**") and a size-22 chip. Derive the chip code with the same `label.trim().slice(0, 2).toUpperCase()` helper or accept `nativeLangCode` / `targetLangCode` as pre-computed props.

### Optimistic state + `React.memo` row
**Source:** `src/components/word-list-browser.tsx` (lines 43–147, 233–315)
**Apply to:** `BrowseList` component (the word list screen within `word-list-browser.tsx`)

The three-state toggle (not-in-deck / loading / in-deck), `useCallback([deckId])` memoized handlers, and `React.memo` wrapper are all preserved verbatim. The only change is the visual markup of `BWWordRow`.

### `@vitest-environment jsdom` rendered-component test pattern
**Source:** `src/components/daybreak/__tests__/ac-atoms.test.tsx` (line 1)
**Apply to:** `src/components/daybreak/__tests__/bw-atoms.test.tsx`

Docblock `// @vitest-environment jsdom` overrides the project-default `node` environment per-file (from `vitest.config.ts`). Required for all `@testing-library/react` render calls.

### `data-testid` convention for e2e
**Source:** `src/components/daybreak/ac-top.tsx` line 34 (`data-testid="add-card-title"`), `src/components/card-list.tsx` line 209 (`data-testid="browse-words-empty"`)
**Apply to:** All new Browse interactive/structural elements

```
data-testid="browse-words-title"       — on the centered title span in BWLandingTop
data-testid="topic-tile-{slug}"        — slug = category.toLowerCase().replace(/[^a-z]/g, '-')
data-testid="word-row"                 — on every BWWordRow container
data-testid="browse-words-link"        — on the ACTop "Browse words ›" link (D-03)
```
(LEVEL filter buttons and empty-state elements are locatable by role+name without testids.)

---

## Assumption Resolutions

### A2 (from RESEARCH.md) — ACTop on image Pick step
**Status: VERIFIED.** `src/components/image-upload-flow.tsx` line 344: `if (state.step === "deck")` renders its own header (ACStepper or custom flex bar) for all `step === "deck"` substates. On `step === "pick"` (lines 759+), `ImageUploadFlow` renders no header — the outer `ACTop` from `NewCardModeToggle` is what shows. Therefore: pass `browsePath` when `mode === "type"` only (simplest, D-03 intent). The image "pick" step also shows `ACTop` (not ACStepper), but "Browse words" is less meaningful from the image picker context, and D-03 specifies landing/Pick to mean the type-a-word landing. Passing `browsePath` only on `mode === "type"` is the safe, conservative implementation.

### A1 (from RESEARCH.md) — `bt.fieldBorder` exact value
**Status: HIGH CONFIDENCE `"1px solid #EDDFC9"`.** The existing `card-list.tsx` ghost button (line 219–224) uses `border: "1.5px solid #EDDFC9"`, and `LangChip` (line 15) uses `border: "1px solid #F0E3CF"`. The mock's `BWLevels` inactive tile uses `bt.fieldBorder`. Planner should verify exact value from `design/handoff-daybreak/hifi-daybreak.jsx` `d1` theme object, but `#EDDFC9` is correct with high confidence.

---

## No Analog Found

No files in this phase are truly without analog. All new files have direct structural matches in the existing codebase:
- `bw-medallion.tsx` → `lion-face.tsx` (exact CSS-art pattern)
- `bw-atoms.test.tsx` → `ac-atoms.test.tsx` (exact test structure)

---

## Metadata

**Analog search scope:** `src/components/daybreak/`, `src/app/(protected)/deck/browse/`, `src/components/`, `e2e/`, `design/handoff-daybreak/`
**Files read:** 18
**Pattern extraction date:** 2026-06-23
