# Phase 23: Browse Words - Research

**Researched:** 2026-06-23
**Domain:** Next.js 16 searchParams routing, Daybreak CSS-art component pattern, optimistic React state, Playwright structural selectors
**Confidence:** HIGH (all claims verified against the actual codebase and Next.js 16 bundled docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Route via `?topic=` query param on the existing `/deck/browse` route. No `?topic=` = tiles landing; `?topic={Category}` = that topic's word list. CEFR level filter stays in-page state (no URL param). Back button returns list → tiles naturally. Preserve `?deck=` in every internal URL.
- **D-02:** List back-link = "‹ Topics" → `/deck/browse?deck=…` (no `topic`).
- **D-03:** "Browse words ›" entry link in TOP-RIGHT of Add-a-Card landing header. Landing/Pick view only — not mid-stepper (Confirm onward has ACStepper). Target: `/deck/browse?deck={activeDeckId}`.
- **D-04:** Browse landing back-link = "‹ Add a card" → `/deck/new-card?deck={activeDeckId}`. NOT "‹ My deck". Intentional override of the mock's `BWLandingTop`. The UI auditor must NOT "correct" this to match the mock.
- **D-05:** Native term bold on top (no chip), target term beneath with target-language chip (EN/FR/ES). Generalises mock's EN→ES hardcoding to all 6 pairs. Context line = `LangChip {native}` → `LangChip {target}` · "tap a word to add it to your **{TargetLanguageName} deck**".
- **D-06:** Loading = amber spinner inside the 38px circular toggle (optimistic flip already applied). Failure = revert toggle + inline "Failed. Try again." in reserved space (no layout shift, no `-bottom-4` absolute overlap), 3s auto-clear. Preserves existing `useTransition` + sets + 3s timeout model.
- **D-07:** Per-category word counts from real `getWordList(native, target)` data (mock's `n` values are placeholders). Show "0 words" if a category has none for the active pair — keep the 14-tile grid stable.
- **D-08:** Recreate mock's 14 geometric amber topic icons as CSS-drawn placeholders (styled divs, not `<img>` or icon library). Keyed by category name, inside a `BWMedallion`-style rounded container. Planner decides Browse-local vs shared `daybreak/*` primitive.
- **D-09:** Empty result = `LionFace` in `#F3E3C6` disc + "No words at this level." (display font) + "There are no {LEVEL} words in {Topic} yet. Try another level or topic." + "Show all levels" primary button (resets CEFR → All, stays on topic). Replaces current bare `"No words in this category at this level."` (this string is an L-06 at-risk literal in zero e2e specs currently — it never appeared in the audit, so retarget is additive not a fix).

### Claude's Discretion

- Exact Daybreak token values, spacing, radii, prop shapes, file layout, and component decomposition — pull from the system and existing `src/components/daybreak/*`.
- Whether the tiles→list route transition is animated (`motion/react`) and responsive grid behavior.
- Whether `TopicIcon`/`BWMedallion` and the word Row become shared `daybreak/*` primitives or Browse-local components.
- The list's scroll/overflow treatment (natural page scroll is fine; the mock's bottom mask-fade is a phone-shell artifact).

### Deferred Ideas (OUT OF SCOPE)

- Context-aware Browse back-link via `?from=` param.
- "Browse words" entry on the populated dashboard action line.
- Topic icons as final commissioned art (CSS placeholders ship as-is, per PROJECT.md).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRW-01 | Topic-tiles landing — 14 category cards with geometric amber icon on medallion + word count | D-07/D-08 confirmed; `CATEGORIES` from schema.ts is the canonical 14; real counts from `filterWords` grouped by category |
| BRW-02 | Per-topic word list — back-to-topics, topic header, CEFR LEVEL tile row (All/A1/A2/B1), context line | D-01 searchParams routing confirmed correct; `filterWords` API is unchanged |
| BRW-03 | Word row — native primary / target beneath + language marker + CEFR chip + circular toggle; in-deck warm tint; optimistic add/remove with row-local error recovery, never loses scroll | Existing `handleAdd`/`handleRemove`/`useTransition` model confirmed; D-06 inline error space fix identified |
| BRW-04 | All states — full list, level-filtered, empty result ("No words at this level" + "Show all levels") | D-09 LionFace empty state confirmed; `filterWords` already returns `[]` correctly |
</phase_requirements>

---

## Summary

Phase 23 is a focused presentation-layer + information-architecture re-skin of `/deck/browse`. The data layer (`getWordList`, `filterWords`, `getDeckCardWords`, `addWordToCard`, `removeWordFromDeck`) is completely unchanged. The one structural change beyond pure visual re-skin is navigation: today's single-screen component (horizontal category-pill row + difficulty pills + flat word table) becomes a two-screen drill-down via the `?topic=` query param, which Next.js 16 handles identically to the existing `?deck=` pattern already live on this page.

The principal risks are: (1) the e2e spec `03-word-list-browser.spec.ts` has five classes of literal-text / CSS-class locators that break completely when the component is re-skinned; (2) the CSS-art topic icons require faithful translation from the mock's JSX-inline-styled absolute-div pattern into a project-idiomatic component; (3) the D-03 "Browse words ›" link on `ACTop` must be added without disturbing the Phase 22 header balance (the existing spacer pattern makes this straightforward); and (4) the D-06 error display must move from an absolutely-positioned `-bottom-4` span (which currently causes layout overlap) to reserved inline space so scroll position is never lost.

**Primary recommendation:** Split `word-list-browser.tsx` into two clearly-scoped client sub-components — `BrowseTiles` (landing screen) and `BrowseList` (topic word list) — controlled by the `?topic=` param read server-side in `page.tsx`, which then passes the parsed `topic` prop down. The `handleAdd`/`handleRemove` optimistic state machine stays on the parent (or a shared hook) and is passed to rows by props, exactly as now.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `?topic=` / `?deck=` param reading | Server (page.tsx) | — | `searchParams` is a Promise in Next.js 16; must be awaited server-side and passed down as props — exactly how `?deck=` already works |
| Tiles landing render | Server (via page.tsx) + Client sub-component | — | Tile grid is static per-render (counts computed server-side); tile click navigates via `<Link>` — no client state needed on the landing itself |
| CEFR level filter state | Client (word-list-browser / BrowseList) | — | Deliberately in-page state per D-01; does not go to URL |
| Optimistic add/remove | Client (word-list-browser / BrowseList) | — | `useTransition` + Set state is client-only; unchanged from current implementation |
| Per-category word count | Server (page.tsx) | — | `filterWords` is synchronous; called server-side against the already-loaded `wordList.words`, grouped by category, passed as `categoryCounts: Record<string, number>` prop |
| Topic icons (CSS art) | Pure presentational / RSC-safe | — | No hooks; identical to `LionFace` pattern — pure CSS-div geometry |
| Empty-deck "Browse words" entry | Client (card-list.tsx) | — | Preserved unchanged (Phase 19/21); just a `<Link href="/deck/browse">` |
| D-03 "Browse words ›" entry | Client (ACTop or new-card-mode-toggle.tsx) | — | A `<Link>` alongside the existing left escape; see below for prop approach |

---

## Standard Stack

### Core (no new packages — all pre-installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next/Link | 16.2.1 | Client-side navigation with `?topic=` + `?deck=` params | Already used; `<Link href={...}>` is the project-wide pattern for internal navigation |
| react/useTransition | 19 (Next 16.2.1) | Optimistic add/remove without blocking the UI | Already used in `word-list-browser.tsx` — preserve unchanged |
| react/useState | 19 | CEFR level filter in-page state | Already used; no change |
| tailwindcss v4 | 4.x | Semantic Tailwind classes (`bg-background`, `text-foreground`, etc.) | Project standard |
| motion/react | installed | Optional tile→list transition animation (Claude's discretion) | Already in package.json (used in Phase 20/21) |

### No New Packages Needed

This phase installs no new npm dependencies. All required building blocks exist:
- `LionFace`, `LangChip`, `TBtn` already in `src/components/daybreak/`
- `CATEGORIES`, `filterWords`, `getWordList` in `src/lib/wordlist.ts` + `src/data/wordlists/schema.ts`
- `addWordToCard`, `removeWordFromDeck` in `src/lib/deck-actions.ts`

---

## Package Legitimacy Audit

> No new packages are installed in this phase. Section not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
URL: /deck/browse?deck={id}              URL: /deck/browse?deck={id}&topic={Category}
         │                                            │
         ▼                                            ▼
  BrowsePage (Server, page.tsx)            BrowsePage (Server, page.tsx)
  ├── auth + getUserDecks                  ├── auth + getUserDecks
  ├── getWordList(native, target)          ├── getWordList(native, target)
  ├── getDeckCardWords(deckId)             ├── getDeckCardWords(deckId)
  ├── compute categoryCounts              ├── filterWords({category: topic})
  └── params.topic === undefined          └── params.topic !== undefined
       │                                             │
       ▼                                             ▼
  BrowseTiles (Client component)          BrowseList (Client component)
  ├── BWLandingTop                        ├── BWListTop (topic header + mini medallion)
  │   ├── "‹ Add a card" Link             ├── BWContext (LangChip EN→LangChip ES · ...)
  │   └── "Browse Words" title            ├── BWLevels (All/A1/A2/B1 tile row — in-page state)
  ├── BWContext                           ├── [filteredWords].map → BWWordRow
  ├── "Pick a topic" heading             │    ├── native bold on top
  └── BWTopicGrid                        │    ├── target lang chip + target muted
       └── 14 × BWTopicTile              │    ├── BWLvlTag (CEFR chip)
            ├── BWMedallion              │    └── 38px circular toggle (add/remove)
            │    └── TopicIcon           └── BrowseEmpty (LionFace + "No words at this level." + "Show all levels")
            ├── category name
            └── "{n} words" (real count)
```

### Recommended Project Structure

```
src/
├── app/(protected)/deck/browse/
│   └── page.tsx              # Server: add ?topic= reading, compute categoryCounts
├── components/
│   ├── word-list-browser.tsx # Client: split into BrowseTiles + BrowseList screens
│   └── daybreak/
│       ├── bw-medallion.tsx  # TopicIcon map + medallion container (new — may be Browse-local or shared)
│       └── (existing atoms unchanged)
```

Planner decision: `BrowseTiles` and `BrowseList` can be sub-components within `word-list-browser.tsx` (keeping the single file) or split into `browse-tiles.tsx` / `browse-list.tsx`. Either is fine; the existing single-file pattern is simpler.

### Pattern 1: `?topic=` Routing — Reading searchParams Server-Side

**What:** The browse `page.tsx` already awaits `searchParams` as a Promise (Next.js 16 pattern). Add `topic` alongside `deck`.

**When to use:** Any time a navigation decision (which screen to show) needs to be deep-linkable and server-rendered.

**Example:**
```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
// VERIFIED pattern — this is exactly how ?deck= already works on this page

interface BrowsePageProps {
  searchParams: Promise<{ deck?: string; topic?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const requestedDeckId = params.deck;
  const requestedTopic = params.topic; // undefined → tiles landing; string → word list

  // ... existing auth, decks, getWordList, getDeckCardWords unchanged ...

  // Compute per-category counts server-side (synchronous — no new async call)
  const categoryCounts: Record<string, number> = Object.fromEntries(
    CATEGORIES.map((cat) => [
      cat,
      filterWords(wordList.words, { category: cat }).length,
    ])
  );

  return requestedTopic
    ? <BrowseList
        words={wordList.words}
        topic={requestedTopic}
        existingWords={existingWords}
        deckId={activeDeck.id}
        nativeLang={nativeLang}
        targetLang={activeDeck.language}
        nativeLangLabel={nativeLangLabel}
        targetLangLabel={targetLangLabel}
      />
    : <BrowseTiles
        categories={CATEGORIES}
        categoryCounts={categoryCounts}
        deckId={activeDeck.id}
        nativeLangLabel={nativeLangLabel}
        targetLangLabel={targetLangLabel}
      />;
}
```

### Pattern 2: Topic Tile Navigation — `<Link>` with URL-encoded category name

**What:** Category names contain spaces and ampersands ("Days & Months", "Food & Drink"). These need `encodeURIComponent` when building the `?topic=` param value, and Next.js's router will decode them transparently when reading `params.topic`.

**When to use:** Any `<Link>` or `router.push` building a URL from user-visible strings.

**Example:**
```typescript
// Source: codebase — project already uses template-literal ?deck= params in deck-view.tsx
// encodeURIComponent is the safe pattern for string values with special characters

// In BrowseTiles tile click:
<Link
  href={`/deck/browse?deck=${deckId}&topic=${encodeURIComponent(category)}`}
  data-testid={`topic-tile-${category.toLowerCase().replace(/[^a-z]/g, '-')}`}
>
  {/* BWTopicTile content */}
</Link>

// Back-link from BrowseList to landing:
<Link href={`/deck/browse?deck=${deckId}`}>
  ‹ Topics
</Link>
```

**Verified:** "Days & Months" encodes to `Days%20%26%20Months`. The server-side `params.topic` will be `"Days & Months"` (decoded by Next.js). The `CATEGORIES` array comparison works with strict equality against the decoded value. [VERIFIED: node_modules/next/dist/docs — searchParams are plain JS objects, not URLSearchParams instances; values are already decoded strings]

### Pattern 3: D-03 "Browse words ›" Link on ACTop

**What:** `ACTop` is a pure presentational component with a fixed left-link, centred title, and right spacer. Add the "Browse words ›" link at the right, replacing the spacer — but only when a `browsePath` prop is provided (landing/Pick), absent during the stepper.

**When to use:** Adding a right-side escape link symmetrical to the left escape.

**Example:**
```typescript
// Source: src/components/daybreak/ac-top.tsx (read in session)
// The existing ACTop right spacer is exactly 60px wide.
// Replace it with a conditional link of the same visual width.

interface ACTopProps {
  /** When provided, shows "Browse words ›" at top-right (landing/Pick only). */
  browsePath?: string;
}

export function ACTop({ browsePath }: ACTopProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <Link href="/dashboard" style={linkStyle}>&#8249; My deck</Link>
      <span data-testid="add-card-title" style={titleStyle}>Add a Card</span>
      {browsePath ? (
        <Link
          href={browsePath}
          data-testid="browse-words-link"
          style={{ ...linkStyle, textAlign: "right" }}
        >
          Browse words ›
        </Link>
      ) : (
        <span style={{ flex: "none", width: 60 }} />
      )}
    </div>
  );
}
```

`NewCardModeToggle` passes `browsePath` only when `mode === "type"` (and on the initial mount). During image stepper (mode === "image" AND step > "pick"), the stepper replaces `ACTop` entirely with `ACStepper` — so `browsePath` is simply omitted on those renders. [VERIFIED: src/components/new-card-mode-toggle.tsx — ACTop is rendered before the mode check, and ImageUploadFlow owns the stepper header separately]

**Note:** Actually the current `new-card-mode-toggle.tsx` renders `ACTop` unconditionally at the top before the mode branch. The image stepper (`ImageUploadFlow`) internally replaces the header with `ACStepper` only for steps ≥ Confirm — so `ACTop` is always mounted. The `browsePath` prop should be passed when `mode === "type"` OR when `mode === "image"` AND the current step is "pick" (only the Pick step has no stepper). In practice: the simplest correct approach is to always pass `browsePath` from `NewCardModeToggle` and let `ImageUploadFlow` override with `ACStepper` internally — or to pass `browsePath` only when `mode === "type"`. Given that "Browse words" is meaningfully useful only from the type-a-word view (the image flow has its own purpose), the D-03 decision says "landing/Pick header" — passing it only when `mode === "type"` is the safest and most correct interpretation. The planner must verify what `ImageUploadFlow`'s Pick step actually renders for the header.

### Pattern 4: CSS-Art Topic Icons — Identical to LionFace pattern

**What:** The mock's `TOPIC_ICON` map renders each icon as absolutely-positioned `<div>` elements with `position: 'relative'` containers. This is exactly how `LionFace` is built (`src/components/daybreak/lion-face.tsx`). Translate to TSX with inline styles.

**Key translation rule:**
- Mock: `ring(c, s)` → `{ position: 'absolute', border: '2.2px solid ${c}', boxSizing: 'border-box', ...s }`
- Mock: `line(c, s)` → `{ position: 'absolute', background: c, borderRadius: 2, ...s }`
- Mock: `TG` wrapper → `<div style={{ position: 'relative', width: 27, height: 26, flex: 'none' }}>`
- Mock: `bt.primary` → CSS var `var(--color-primary)` or the literal `#F28A1F` (project uses inline styles for exact tokens in daybreak atoms)
- Mock: `bt.surface` → `#FFFFFF` (used in Travel icon's inner circle)
- Mock: `bt.fontDisplay` → `var(--font-display)` (Numbers icon uses the display font)

**STK = 2.2** (stroke weight used throughout). One mock bug: `STk2()` is called in the Days & Months icon — it's just `STK` (= 2.2). Safe to inline.

**Note on `bt.fieldBorder`:** The `BWLevels` component uses `bt.fieldBorder` for inactive tile borders. From the design README, field border is `1px solid #EDDFC9` (can be read from `hifi-daybreak.jsx` — planner should verify exact value).

**Example:**
```typescript
// Source: design/handoff-daybreak/daybreak-browse.jsx + src/components/daybreak/lion-face.tsx (pattern)
// RSC-safe (no hooks) — same approach as LionFace

const ICON_COLOR = "#F28A1F"; // bt.primary
const STK = 2.2;

// ring helper
function r(s: React.CSSProperties): React.CSSProperties {
  return { position: "absolute", border: `${STK}px solid ${ICON_COLOR}`, boxSizing: "border-box", ...s };
}
// line helper
function l(s: React.CSSProperties): React.CSSProperties {
  return { position: "absolute", background: ICON_COLOR, borderRadius: 2, ...s };
}

export function TopicIcon({ name }: { name: string }) {
  // returns a 27×26 relative container with the icon drawn inside
  // ...one case per CATEGORIES entry...
}
```

### Pattern 5: Optimistic Row State with Inline Reserved Error Space (D-06)

**What:** The existing `WordRow` error display uses `position: absolute; bottom: -1rem` which causes layout overlap in a tight list. Replace with a reserved inline line below the word content so the row height expands by ~18px when an error is present — no layout shift in the *rest* of the list, scroll position preserved.

**Example:**
```typescript
// Source: src/components/word-list-browser.tsx (current anti-pattern identified)
// Fix: reserve error line space inside the row's flex layout, not absolutely outside it

<div style={{ flex: 1, minWidth: 0 }}>
  <div style={{ fontSize: 17.5, fontWeight: 700 }}>{word.native}</div>
  <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: "#9C8467" }}>
      {targetLangCode}
    </span>
    <span style={{ fontSize: 14.5, color: "#9C8467" }}>{word.target}</span>
  </div>
  {/* Reserved error line — always in DOM, transparent when no error; prevents layout shift */}
  <div style={{ fontSize: 12, color: "#DE5F4A", minHeight: 16, marginTop: 2 }}>
    {error ?? ""}
  </div>
</div>
```

This approach means the row height is `minHeight + errorLineHeight` at all times, but for long lists the ~16px cost is acceptable and far better than losing scroll position on error.

### Anti-Patterns to Avoid

- **Do NOT use `useSearchParams()` in a client component for `?topic=`** — since `page.tsx` already reads `searchParams` server-side and controls which screen to render, there is no need for `useSearchParams`. The client components receive `topic` as a prop.
- **Do NOT add `?topic=` to the CEFR level filter** — deliberate per D-01; adding it would flood browser history and break the intended navigation model.
- **Do NOT regenerate `deckWords` state from props on every render** — the existing `useState(() => new Set(existingWords))` initializer is intentional (initialises once from server data, then tracks client-side optimistically). Do not add a `useEffect` to sync with props.
- **Do NOT copy the mock's `last` prop on `BWWordRow`** — D-01 explicitly says ignore it; rows use margin not dividers.
- **Do NOT use a CSS class-based selector in e2e after the reskin** — `.border-b.border-border.py-2` selector in `03-word-list-browser.spec.ts` will break; replace with structural role+accessible-name or `data-testid`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL-safe topic names | Custom encoding | `encodeURIComponent` / Next.js router decode | Next.js 16 searchParams are pre-decoded; spaces and & encoded once and decoded transparently |
| Language chip | Custom chip component | `LangChip` from `src/components/daybreak/lang-chip.tsx` | Already extracted in Phase 22 exactly for this use |
| Empty-state mascot | Custom mascot | `LionFace` from `src/components/daybreak/lion-face.tsx` | RSC-safe, all prop variants accepted, Daybreak palette |
| Primary button | Custom button | `TBtn` from `src/components/daybreak/t-btn.tsx` | "Show all levels" button = standard primary action |
| Optimistic state machine | New state model | Existing `handleAdd`/`handleRemove` + `useTransition` + `Set` pattern | Already battle-tested; Phase 23's job is to restyle, not replace |
| Per-category counts | DB query | `filterWords(words, { category: cat }).length` in a loop server-side | `getWordList` is already called; counting is O(n) synchronous work, no extra I/O |

**Key insight:** The data layer is fully preserved. Every hand-rolled piece in this phase is visual / structural only.

---

## Runtime State Inventory

> Not applicable — this is a presentation-layer re-skin with one navigation structural change. No stored data, live service config, OS state, secrets, or build artifacts embed Browse screen copy or route structure that would need migration. The `/deck/browse` route URL is unchanged.

---

## e2e Literal-Selector Audit (L-06)

This is the highest-risk area for the phase. Full audit of all at-risk strings across ALL e2e specs:

### Files requiring changes

| File | At-Risk Locator | Why It Breaks | Required Retarget |
|------|----------------|--------------|-------------------|
| `e2e/03-word-list-browser.spec.ts:15` | `page.getByText("Browse Words")` | The `<h1>Browse Words</h1>` heading moves into `BWLandingTop`'s centred title span — same text, but `getByText` may find multiple nodes if the title appears elsewhere. Retarget. | `page.getByRole("heading", { name: "Browse Words" })` or `data-testid="browse-words-title"` |
| `e2e/03-word-list-browser.spec.ts:16` | `getByRole("button", { name: "Animals" })` | Category pills (buttons) are replaced by `<Link>` tile cards — no longer `<button>` elements. Playwright strict mode will throw. | `page.getByTestId("topic-tile-animals")` + `waitForURL(/topic=Animals/)` after click |
| `e2e/03-word-list-browser.spec.ts:17` | `getByRole("button", { name: "Food" })` | Same as above. "Food & Drink" is the actual category name (not "Food"). | `page.getByTestId("topic-tile-food-drink")` |
| `e2e/03-word-list-browser.spec.ts:18` | `getByRole("button", { name: "All" })` | LEVEL tile row — "All" tile is still a `<button>`, BUT the selector will now also match the LEVEL label text. Strict mode may multi-match. | `page.getByRole("button", { name: "All" })` is safe IF scoped to the word-list screen (after navigating into a topic). The spec navigates directly to `/deck/browse` and clicks first category first — needs the two-step navigation now. |
| `e2e/03-word-list-browser.spec.ts:19` | `getByRole("button", { name: "A1" })` | Same as "All" — safe on the list screen but the spec currently lands on the tiles screen where A1 button does not exist. Needs navigation into a topic first. | Navigate to a topic tile, then assert A1. |
| `e2e/03-word-list-browser.spec.ts:57` | `getByRole("button", { name: "Food" })` | "Food" no longer exists (it's "Food & Drink"); was a category pill button, now a tile link. | `page.getByTestId("topic-tile-food-drink").click()` + `waitForURL(/topic=Food/)` |
| `e2e/03-word-list-browser.spec.ts:60` | `.locator(".border-b.border-border.py-2")` | CSS class selector — these Tailwind classes are replaced by Daybreak inline styles. Will find 0 elements. | `page.locator('[data-testid="word-row"]')` — add `data-testid="word-row"` to each `BWWordRow` |
| `e2e/03-word-list-browser.spec.ts:72` | `.locator(".border-b.border-border.py-2")` | Same CSS class — same fix. | `page.locator('[data-testid="word-row"]')` |
| `e2e/03-word-list-browser.spec.ts:69` | `getByRole("button", { name: "A1" })` | Same two-screen navigation issue. | Navigate into a topic first, then click A1. |
| `e2e/09-language-breakdown.spec.ts:24` | `page.getByText("Browse Words")` | Same as above — possibly multi-match. | `page.getByRole("heading", { name: "Browse Words" })` or `data-testid` |
| `e2e/09-language-breakdown.spec.ts:26` | `page.getByRole("link", { name: "Back to my deck" })` | "Back to my deck" link is REMOVED — the landing back-link becomes "‹ Add a card" (D-04) and the list back-link becomes "‹ Topics" (D-02). | Use `page.getByRole("link", { name: /Add a card/i })` to return to `/deck/new-card`. The navigation intent (return from Browse) should use the deck link or back button. |
| `e2e/10-mobile-responsive.spec.ts:94` | `getByRole("button", { name: "Animals" })` | Same: category pills → tile links. | `page.getByTestId("topic-tile-animals")` |

### Files where "Browse words" link locator SURVIVES unchanged

These use `page.getByRole("link", { name: "Browse words" }).first()` to navigate to the Browse page — this link exists in `card-list.tsx` (empty-deck state, `data-testid="browse-words-empty"`) and in the new D-03 `ACTop` link. The `.first()` disambiguates. These work after the re-skin:

| File | Locator | Status |
|------|---------|--------|
| `e2e/02-first-visit-deck-creation.spec.ts:46,92` | `getByRole("link", { name: "Browse words" }).first()` | SAFE — resolves to `card-list.tsx` empty-deck link; survives re-skin |
| `e2e/03-word-list-browser.spec.ts:12,23,36,53,65` | `getByRole("link", { name: "Browse words" }).first()` | SAFE — same reason |
| `e2e/09-language-breakdown.spec.ts:22` | `getByRole("link", { name: "Browse words" }).first()` | SAFE |
| `e2e/10-mobile-responsive.spec.ts:91` | `getByRole("link", { name: "Browse words" }).first()` | SAFE |

**Note:** After D-03 adds `data-testid="browse-words-link"` to `ACTop`, a second "Browse words" link will exist. The `.first()` disambiguates based on DOM order. Verify DOM order in the test: the `card-list.tsx` "Browse words" button is in the empty-deck state, the `ACTop` link is in `new-card`. The test creates a fresh user with `signUpWithDeck` (populated deck), so the empty-deck card-list is NOT shown. The `.first()` from e2e/03 currently resolves to the `card-list.tsx` link on the empty-deck dashboard. After Phase 23, this will still be the first "Browse words" link on the dashboard. Safe.

### New e2e selectors needed (add in Phase 23)

| Element | Recommended testid / locator |
|---------|------------------------------|
| Landing tiles heading | `data-testid="browse-words-title"` on the "Browse Words" centred span |
| Topic tile | `data-testid="topic-tile-{slug}"` where slug = category name lowercased, non-alpha → `-` |
| LEVEL filter tile (All/A1/A2/B1) | `getByRole("button", { name: "All" })` — already role-scoped and safe on the list screen |
| Word row | `data-testid="word-row"` on each `BWWordRow` container |
| Landing back-link | `getByRole("link", { name: /Add a card/i })` — survives copy changes |
| List back-link | `getByRole("link", { name: /Topics/i })` |
| Empty-state heading | `getByRole("heading", { name: /No words at this level/i })` |
| "Show all levels" button | `getByRole("button", { name: "Show all levels" })` |
| D-03 "Browse words" in ACTop | `data-testid="browse-words-link"` |

### Strict-mode multi-match watch

- "All" button: exists only on the list screen. The `03-word-list-browser.spec.ts` tests that assert "All" / "A1" currently navigate to Browse and stay on the tiles screen. After re-skin, these tests must navigate into a topic tile first. The "All" LEVEL tile and the "All" category pill used to be different elements; now only one "All" exists (the LEVEL tile), which is multi-match-safe.
- "Browse Words" text: appears both as the centred screen title AND potentially as a heading or aria-label on the `Browse words` link. Use `data-testid="browse-words-title"` to scope to the screen header only.

---

## Common Pitfalls

### Pitfall 1: Category names with spaces/ampersands in URLs

**What goes wrong:** `?topic=Days & Months` (unencoded) produces `topic=Days ` + a broken `& Months=` second param that Next.js silently ignores.
**Why it happens:** Template literals don't URL-encode by default.
**How to avoid:** Always use `encodeURIComponent(category)` in `<Link href={...}>`. Next.js 16 `searchParams` provides the decoded value, so `params.topic === "Days & Months"` works naturally.
**Warning signs:** Topic tiles for "Days & Months" or "Food & Drink" navigate to the Browse page but show the tiles landing (topic not found = undefined).

### Pitfall 2: `useSearchParams()` in a client component for `?topic=`

**What goes wrong:** If a client component calls `useSearchParams()` to read `?topic=` (instead of receiving it as a prop from the server page), Next.js will require the component to be wrapped in a `<Suspense>` boundary at build time, or it will error with "Missing Suspense boundary with useSearchParams".
**Why it happens:** The browse page is dynamically rendered (it already calls `auth` + `headers`), but child client components using `useSearchParams` still require Suspense in production.
**How to avoid:** Read `params.topic` once in the server component (`page.tsx`) and pass it as a prop. No child component needs `useSearchParams`.

### Pitfall 3: Adding `useEffect` to sync `deckWords` from props

**What goes wrong:** A developer sees `deckWords` initialised from `existingWords` and adds a `useEffect` to keep it in sync. This destroys the optimistic state: every server revalidation (from `addWordToCard` calling `revalidatePath('/dashboard')`) will reset the in-memory set, potentially reverting in-flight optimistic updates.
**Why it happens:** The pattern looks wrong to someone unfamiliar with the intentional optimistic model.
**How to avoid:** Keep the `useState(() => new Set(existingWords))` initialiser. The set is intentionally NOT synced back from props after mount. (Note: `addWordToCard` calls `revalidatePath('/dashboard')`, not `/deck/browse`, so the browse page does not re-render from server during the session anyway.)

### Pitfall 4: CSS-class locators in e2e after re-skin

**What goes wrong:** `page.locator(".border-b.border-border.py-2")` returns 0 elements; tests fail silently (wrong assertion: `toBeVisible()` on `.first()` of an empty locator throws).
**Why it happens:** The word rows now use Daybreak inline styles, not Tailwind utility classes.
**How to avoid:** Add `data-testid="word-row"` to `BWWordRow` and retarget all CSS-class selectors in `e2e/03` before the spec runs.

### Pitfall 5: `ACTop` prop threading for D-03 entry link

**What goes wrong:** `ACTop` doesn't know the `deckId`, so the "Browse words ›" link target must be computed in `NewCardModeToggle` (which receives `activeDeckId` from the server page) and passed as `browsePath`.
**Why it happens:** `ACTop` is a pure presentational atom with no access to route state.
**How to avoid:** Compute `browsePath = `/deck/browse?deck=${activeDeckId}`` in `NewCardModeToggle` and pass it to `ACTop`. Show only when `mode === "type"`.

### Pitfall 6: The existing error display overlaps adjacent rows

**What goes wrong:** The current `WordRow` uses `position: absolute; bottom: -1rem` for the inline error text, which means it renders on top of the next row and is cut off by the row's `overflow: hidden`.
**Why it happens:** The original implementation chose absolute positioning to avoid row height change. The D-06 decision explicitly overrides this: reserve space inline.
**How to avoid:** Implement the error line as an in-flow child of the row's left content column with `minHeight: 16px`, visible only when `error` is truthy. Row height increases slightly but scroll position is preserved because the list does not reflow above the error row.

### Pitfall 7: `React.memo` on `BWWordRow` — avoid anonymous function children

**What goes wrong:** If the memo-wrapped `BWWordRow` receives a new object or arrow-function prop on every parent render, `React.memo` is bypassed and the whole list re-renders on every optimistic state change.
**Why it happens:** `onAdd` and `onRemove` are `useCallback`-memoised in the parent — preserve this pattern. The existing code already does this correctly.
**How to avoid:** Keep `onAdd`/`onRemove` as `useCallback` with `[deckId]` dependency. Do not destructure `word` inside the memo component and then pass sub-properties as separate props — pass the whole `word: WordEntry` object (it is referentially stable; each word object comes from the server-loaded word list and is never mutated).

---

## Code Examples

### Verified: Per-category count computation (server-side)

```typescript
// Source: src/lib/wordlist.ts — filterWords is synchronous
// Source: src/data/wordlists/schema.ts — CATEGORIES is the canonical 14

import { CATEGORIES, filterWords } from "@/lib/wordlist";

// In page.tsx, after getWordList() resolves:
const categoryCounts: Record<string, number> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat, filterWords(wordList.words, { category: cat }).length])
);
```

### Verified: Next.js 16 searchParams pattern (extends existing pattern)

```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
// The existing page.tsx already uses this exact pattern for ?deck=

interface BrowsePageProps {
  searchParams: Promise<{ deck?: string; topic?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const topic = params.topic; // Already decoded by Next.js; "Days & Months" not "Days+%26+Months"
```

### Verified: Daybreak token values for browse (from mock + existing daybreak atoms)

```typescript
// Source: design/handoff-daybreak/daybreak-browse.jsx + design/handoff-daybreak/README.md

// Medallion container (BWMedallion)
const medallionStyle = {
  width: 52,
  height: 52,
  borderRadius: 16,
  background: "#FFF1DC",        // bt.pillBg — amber tint
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
};

// Topic tile (BWTopicTile)
const tileStyle = {
  borderRadius: 18,
  background: "#FFFFFF",
  border: "1px solid #EDDFC9",  // bt.cardBorder
  boxShadow: "0 5px 14px rgba(160,110,40,0.07)",
  padding: "15px 12px 13px",
};

// Active LEVEL tile
const activeLevelStyle = {
  background: "#F28A1F",        // bt.primary
  color: "#FFFFFF",
  boxShadow: "0 6px 14px rgba(242,138,31,0.26)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
};

// In-deck row warm tint (BWWordRow, inDeck=true)
const inDeckRowStyle = {
  background: "#FFF7E9",
  border: "1px solid #F4E3C4",
  borderRadius: 14,
};

// CEFR level chip (BWLvlTag)
const lvlTagStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "#B4762A",
  background: "#FFF1DC",
  borderRadius: 6,
  padding: "2px 7px",
};

// Not-in-deck circular toggle (outlined amber +)
const toggleOutlinedStyle = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  border: "2px solid #F28A1F",
  background: "#FFFFFF",
};

// In-deck circular toggle (filled amber ✓)
const toggleFilledStyle = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  background: "#F28A1F",
  boxShadow: "0 5px 12px rgba(242,138,31,0.26)",
};
```

### Verified: Existing optimistic state machine (PRESERVE AS-IS)

```typescript
// Source: src/components/word-list-browser.tsx (lines 71-147)
// handleAdd — optimistic add with revert on failure + 3s auto-clear

const handleAdd = useCallback((word: WordEntry) => {
  const key = wordKey(word); // `${word.native}::${word.target}`
  setDeckWords((prev) => new Set([...prev, key]));       // optimistic add
  setLoadingWords((prev) => new Set([...prev, key]));     // loading state
  startTransition(async () => {
    try {
      await addWordToCard(deckId, word.id, word.native, word.target);
    } catch {
      setDeckWords((prev) => { const n = new Set(prev); n.delete(key); return n; }); // revert
      setErrorWords((prev) => new Map([...prev, [key, "Failed. Try again."]]));
      setTimeout(() => {
        setErrorWords((prev) => { const n = new Map(prev); n.delete(key); return n; });
      }, 3000); // auto-clear
    } finally {
      setLoadingWords((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  });
}, [deckId]);
```

---

## State of the Art

| Old Approach (pre-Phase 23) | New Approach (Phase 23) | Impact |
|-----------------------------|------------------------|--------|
| Single screen with horizontal category-pill scroll row | Two-screen: tiles landing → per-topic word list | Browser back button works naturally; topics are deep-linkable |
| `searchParams: Promise<{ deck?: string }>` | `searchParams: Promise<{ deck?: string; topic?: string }>` | Additive extension; no breaking change |
| "Back to my deck" link → `/dashboard` | No "Back to my deck" link; landing has "‹ Add a card", list has "‹ Topics" | Navigation is now contextual to the add-a-card flow |
| Category pill buttons (client-side state selection) | Topic tile `<Link>` cards (server-rendered navigation) | Native browser back button, deep-linkable, SEO-friendly |
| Column-header table layout (native | target | Level | action) | Daybreak Row A layout (native bold / target beneath with chip, CEFR tag, circular toggle) | Visual hierarchy clearer; warm tint marks membership at a glance |
| `position: absolute; bottom: -1rem` error display | Reserved inline error line (in-flow, `minHeight`) | No layout shift; scroll position preserved (fixes existing bug) |
| Mock's placeholder counts (12/20/11…) | Real counts from `filterWords` per-pair | Correct for all 6 language pairs |

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json`

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit/component) + Playwright (e2e) |
| Vitest config | `vitest.config.ts` — `environment: "node"` default; `// @vitest-environment jsdom` docblock per rendered-component test file |
| Playwright config | `playwright.config.ts` — `timeout: 180_000`, `workers: 1`, Chromium web + Pixel 7 mobile |
| Vitest quick run | `npx vitest run src/components/daybreak/__tests__/` |
| Vitest full suite | `npx vitest run` |
| Playwright e2e | `npx playwright test e2e/03-word-list-browser.spec.ts` |
| Playwright full | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| BRW-01 | 14 topic tiles render with name + real word count | Rendered-component (jsdom) | `npx vitest run src/components/daybreak/__tests__/bw-atoms.test.tsx` | ❌ Wave 0 |
| BRW-01 | Clicking a tile navigates to `?topic={category}` | e2e | `npx playwright test e2e/03-word-list-browser.spec.ts` | ✅ (needs retarget) |
| BRW-02 | List screen shows back-link, topic header, LEVEL tile row, context line | Rendered-component (jsdom) | `npx vitest run src/components/daybreak/__tests__/bw-atoms.test.tsx` | ❌ Wave 0 |
| BRW-02 | Clicking a LEVEL tile filters the word list | e2e | `npx playwright test e2e/03-word-list-browser.spec.ts` | ✅ (needs retarget) |
| BRW-03 | Word row renders native / target / CEFR chip / toggle correctly | Rendered-component (jsdom) | `npx vitest run src/components/daybreak/__tests__/bw-atoms.test.tsx` | ❌ Wave 0 |
| BRW-03 | In-deck row has warm tint background | Rendered-component (jsdom) | same | ❌ Wave 0 |
| BRW-03 | Add word → optimistic toggle flip → eventual remove availability | e2e | `npx playwright test e2e/03-word-list-browser.spec.ts` | ✅ (needs retarget) |
| BRW-03 | Error display does not cause layout shift (reserved inline space) | Rendered-component (jsdom) | `npx vitest run src/components/daybreak/__tests__/bw-atoms.test.tsx` | ❌ Wave 0 |
| BRW-04 | Empty result shows LionFace + "No words at this level." + "Show all levels" | Rendered-component (jsdom) | same | ❌ Wave 0 |
| BRW-04 | "Show all levels" resets CEFR filter to All | e2e | `npx playwright test e2e/03-word-list-browser.spec.ts` | ❌ Wave 0 |
| D-03 | "Browse words ›" link appears on Add-a-Card landing (mode=type) | Rendered-component (jsdom) | `npx vitest run src/components/daybreak/__tests__/ac-atoms.test.tsx` | ✅ (needs new case) |
| D-03 | "Browse words ›" link absent on Add-a-Card during stepper | Rendered-component (jsdom) | same | ✅ (needs new case) |

**Phase 22 lesson applied:** The optimistic toggle, warm-tint row, and inline error line are all rendered-component territory — not pure reducer logic. A reducer-only test would miss that the toggle CSS is wrong or the error line overlaps. Use `@testing-library/react` + jsdom for these assertions.

### Sampling Rate

- **Per task commit:** `npx vitest run src/components/daybreak/__tests__/ && npx vitest run src/lib/wordlist.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full vitest suite green + `npx playwright test e2e/03-word-list-browser.spec.ts` green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/daybreak/__tests__/bw-atoms.test.tsx` — rendered-component tests for `BWMedallion`, `BWTopicTile`, `BWWordRow` (in-deck/not/loading/error states), `BWLevels`, `BrowseEmpty`
- [ ] `src/components/daybreak/__tests__/bw-atoms.test.tsx` — test that error line reserves space (renders empty string when no error, not absent from DOM)
- [ ] Add new test cases to existing `src/components/daybreak/__tests__/ac-atoms.test.tsx` for D-03 `ACTop` `browsePath` prop

*(Existing `e2e/03-word-list-browser.spec.ts` must be retargeted — not a new file, but all 5 tests need selector updates before the component re-skin ships)*

---

## Security Domain

> `security_enforcement` absent from config (treated as enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Browse page already has `auth` guard; no new auth logic |
| V3 Session Management | no | No session changes |
| V4 Access Control | no | `getDeckCardWords` and `addWordToCard`/`removeWordFromDeck` are scoped to `deckId` which comes from the server (user's own deck); preserved unchanged |
| V5 Input Validation | yes | `topic` param value is compared against `CATEGORIES` (canonical enum); if the value doesn't match any category, the list renders empty (not an error). No injection surface — it's used only to filter in-memory word data, never in a DB query. |
| V6 Cryptography | no | No crypto changes |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unexpected `?topic=` values (e.g. SQL injection attempts) | Tampering | `filterWords` compares `w.category === options.category` — in-memory filter on static JSON data; no DB query from topic value. Benign: unknown categories produce an empty list. |
| XSS via topic name in rendered heading | Tampering | React's JSX string interpolation escapes HTML automatically; no `dangerouslySetInnerHTML` |

---

## Open Questions

1. **`ACTop` browsePath — should it also appear when `mode === "image"` on the Pick step?**
   - What we know: D-03 says "landing/Pick view only, not during the image stepper"; ImageUploadFlow renders its own header (ACStepper) for steps ≥ Confirm.
   - What's unclear: Whether the Pick step of ImageUploadFlow uses `ACTop` or overrides it. From the code, `ACTop` is rendered by `NewCardModeToggle` unconditionally, and `ImageUploadFlow` likely renders `ACStepper` only when step > pick — meaning the Pick step still shows `ACTop`.
   - Recommendation: Planner reads `src/components/image-upload-flow.tsx` step structure and verifies. If Pick step shows `ACTop`, pass `browsePath` when `mode === "type"` only (simplest). If Pick step also shows `ACTop`, pass `browsePath` when `mode === "type" || (mode === "image" && step === "pick")`.

2. **`bt.fieldBorder` exact value for `BWLevels` inactive tile borders**
   - What we know: The mock uses `bt.fieldBorder` for the inactive LEVEL tiles' border. The design README doesn't list `fieldBorder` explicitly.
   - What's unclear: Exact hex. The existing `TField` uses `#EDDFC9` border on inputs (visible in card-list.tsx `ghost button` border). This is likely `fieldBorder`.
   - Recommendation: Planner reads `design/handoff-daybreak/hifi-daybreak.jsx` and extracts the `d1` theme object's `fieldBorder` value. High confidence it is `"1px solid #EDDFC9"` matching the existing codebase pattern.

---

## Environment Availability

> Step 2.6: No new external tools required. All dependencies are in-project.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All builds | ✓ | (in use) | — |
| Next.js 16.2.1 | App framework | ✓ | 16.2.1 | — |
| Vitest | Unit/component tests | ✓ | (configured) | — |
| Playwright | e2e tests | ✓ | (configured) | — |
| `@testing-library/react` | Rendered-component tests | ✓ | (installed Phase 19) | — |

---

## Sources

### Primary (HIGH confidence — verified against files in this session)

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` — `searchParams` as Promise, `await searchParams`, version history (v15.0.0-RC introduced Promise)
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` — `useSearchParams` client hook, Suspense requirements, server-side alternative
- `src/app/(protected)/deck/browse/page.tsx` — existing `searchParams: Promise<{ deck?: string }>` pattern; exact structure to extend
- `src/components/word-list-browser.tsx` — complete existing optimistic state machine; all method names, set keys, timing
- `src/lib/wordlist.ts` — `getWordList`, `filterWords`, `getCategories` signatures
- `src/data/wordlists/schema.ts` — `CATEGORIES` (14 entries), `WordEntry`, `CefrLevel`
- `src/lib/deck-actions.ts` — `addWordToCard(deckId, wordId, front, back)`, `removeWordFromDeck(deckId, front, back)` (preserved unchanged)
- `src/components/daybreak/ac-top.tsx` — ACTop structure; 60px right spacer; `data-testid="add-card-title"`
- `src/components/daybreak/lang-chip.tsx` — `LangChip` props + exact inline style values
- `src/components/daybreak/lion-face.tsx` — CSS-art pattern (RSC-safe, inline styles, position: relative container)
- `src/components/new-card-mode-toggle.tsx` — prop shape; ACTop render position; mode state
- `design/handoff-daybreak/daybreak-browse.jsx` — all atom definitions; TOPIC_ICON map; exact token values
- `design/handoff-daybreak/daybreak-browse-boards.jsx` — all 4 board states; empty state copy and layout
- `design/handoff-daybreak/README.md` — Daybreak token table; typography; spacing/radius/shadow values
- `e2e/03-word-list-browser.spec.ts` — all 5 test cases; every at-risk literal
- `e2e/09-language-breakdown.spec.ts` — "Browse Words" + "Back to my deck" at-risk locators
- `e2e/10-mobile-responsive.spec.ts` — "Animals" button at-risk locator
- `e2e/02-first-visit-deck-creation.spec.ts` — "Browse words" link (survives)
- `vitest.config.ts` — `environment: "node"` default; per-file jsdom docblock pattern
- `playwright.config.ts` — 180s timeout; workers: 1; Chromium + Pixel 7 projects

### Secondary (MEDIUM confidence)

- `src/components/card-list.tsx` — empty-deck "Browse words" link (`data-testid="browse-words-empty"`); preserved unchanged per D-04 note
- `.planning/config.json` — `nyquist_validation: true`; `commit_docs: true`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `bt.fieldBorder` = `"1px solid #EDDFC9"` (for BWLevels inactive tile border) | Code Examples — token values | Inactive LEVEL tiles have wrong border colour; low visual impact |
| A2 | `ACTop` is rendered by `NewCardModeToggle` for the Pick step of the image flow (not overridden by ACStepper) | Pattern 3 — D-03 entry link | "Browse words ›" appears mid-stepper (wrong) or missing from Pick step (also wrong). Planner must verify in `image-upload-flow.tsx`. |

**If this table is empty:** Not empty — two assumptions flagged above. Both are low-risk or require a one-file verification by the planner.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all APIs read directly from Next.js 16 docs in node_modules
- Architecture: HIGH — `?topic=` pattern is a direct extension of the live `?deck=` pattern
- e2e audit: HIGH — every at-risk locator found by direct grep; all 5 affected files identified
- Topic icon translation: HIGH — TOPIC_ICON map read from mock; LionFace pattern read from codebase
- Optimistic state: HIGH — full source code of `word-list-browser.tsx` read; no inference required
- Pitfalls: HIGH — all sourced from combination of codebase anti-patterns found and Next.js 16 documented requirements

**Research date:** 2026-06-23
**Valid until:** 2026-07-23 (Next.js 16 stable; no fast-moving API surface involved)
