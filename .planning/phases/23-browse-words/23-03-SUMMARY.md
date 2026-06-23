---
phase: 23-browse-words
plan: "03"
subsystem: browse
tags: [browse, daybreak, IA, optimistic-state, reskin, BRW-01, BRW-02, BRW-03, BRW-04]
dependency_graph:
  requires: [23-01]
  provides: [BrowseTiles, BrowseList, BWWordRow, BrowseEmpty]
  affects: [src/app/(protected)/deck/browse/page.tsx, src/components/word-list-browser.tsx, src/components/daybreak/__tests__/bw-atoms.test.tsx]
tech_stack:
  added: []
  patterns:
    - "?topic= server-side param alongside existing ?deck= (D-01)"
    - "named exports BrowseTiles + BrowseList replace single WordListBrowser export"
    - "BWWordRow + BrowseEmpty exported for direct test import (rendered-component pattern)"
    - "reserved inline error line (data-role=error-line, minHeight 16, no -bottom-4)"
    - "encodeURIComponent on topic tiles for 'Days & Months' / 'Food & Drink'"
    - "CEFR filter in-page useState (D-01: not a URL param)"
    - "animate-spin Tailwind class for amber spinner (keyframe via Tailwind theme)"
key_files:
  created: []
  modified:
    - src/app/(protected)/deck/browse/page.tsx
    - src/components/word-list-browser.tsx
    - src/components/daybreak/__tests__/bw-atoms.test.tsx
decisions:
  - "D-04 OVERRIDE applied: landing back-link reads 'Add a card' (not mock's 'My deck') — guard comment in source confirms intent"
  - "Spinner uses Tailwind animate-spin class rather than inline animation string to ensure @keyframes spin is emitted by the compiler"
  - "BWWordRow and BrowseEmpty exported named (not just module-local) to allow direct rendered-component import in bw-atoms.test.tsx"
  - "CATEGORIES import in word-list-browser.tsx is import type only — runtime value not needed (only used in typeof CATEGORIES type cast)"
metrics:
  duration: "~35 minutes"
  completed: "2026-06-23T09:36:33Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
---

# Phase 23 Plan 03: Browse Words Daybreak Re-skin Summary

**One-liner:** Two-screen Daybreak Browse re-skin — BrowseTiles landing (14 medallion tiles, real per-pair counts) + BrowseList (CEFR level-tile row, Row-A word rows, D-06 scroll-stable inline error), optimistic state machine preserved verbatim.

---

## What Was Built

### Task 1 + 2: page.tsx + word-list-browser.tsx (committed together — 553836b)

**`src/app/(protected)/deck/browse/page.tsx`**
- Extended `searchParams` interface to `{ deck?: string; topic?: string }` — reads `requestedTopic` alongside existing `requestedDeckId`
- Added `filterWords` + `CATEGORIES` imports; computes `categoryCounts: Record<string, number>` server-side (synchronous, no extra I/O — D-07)
- Branches `requestedTopic ? <BrowseList> : <BrowseTiles>` inside the preserved `min-h-screen bg-background` + `max-w-4xl mx-auto` shell
- Auth guard, decks.length===0 redirect, activeDeck redirect, and getWordList/getDeckCardWords Promise.all preserved verbatim
- Security: `?topic=` passed through to `filterWords` (in-memory; unknown topics → empty list → D-09 state, no error leak — T-23-03-TOPIC mitigated)

**`src/components/word-list-browser.tsx`** (full rewrite, "use client" preserved)
- `WordListBrowser` export replaced with `BrowseTiles` (landing) + `BrowseList` (word list) named exports
- `BWWordRow` and `BrowseEmpty` also exported named for test isolation
- Module-local atoms: `ChevL` (CSS-drawn left chevron), `AmberSpinner` (Tailwind animate-spin), `BWLvlTag` (CEFR chip), `BWContext` (LangChip → LangChip · deck text)
- **BrowseTiles**: D-04 "‹ Add a card" back-link → /deck/new-card, `data-testid="browse-words-title"`, 3-column grid of 14 category tiles with `data-testid="topic-tile-{slug}"`, BWMedallion, real per-pair count, `encodeURIComponent(category)` in href
- **BrowseList**: D-02 "‹ Topics" back-link → /deck/browse, mini-medallion center header, BWContext, LEVEL tile row (All/A1/A2/B1 as `<button>` with amber active state), filteredWords list or BrowseEmpty
- **BWWordRow** (React.memo preserved): `data-testid="word-row"`, warm tint `#FFF7E9` + `#F4E3C4` border when inDeck, native bold (17.5/700/#4A331C) top, target-lang chip code + target muted beneath, CEFR tag, 38px circular toggle (filled amber ✓ in-deck / outlined amber + not-in-deck / AmberSpinner loading), D-06 reserved `data-role="error-line"` inline (minHeight 16, no position:absolute, no -bottom-4)
- **BrowseEmpty**: D-09 LionFace in `#F3E3C6` 92px disc, display font heading, contextual subtext with level+topic, "Show all levels" amber button calls `onShowAll`
- **Optimistic machine PRESERVED VERBATIM**: `useState(() => new Set(existingWords))` lazy initializer, no useEffect sync, `useTransition` + handleAdd/handleRemove, `setDeckWords`/`setLoadingWords`/`setErrorWords`, "Failed. Try again." message, `setTimeout(..., 3000)` auto-clear
- Removed: lucide-react icons, `@/components/ui/button`, `cn` from `@/lib/utils`
- Added: `BWMedallion`, `LangChip`, `LionFace`

### Task 3: bw-atoms.test.tsx extensions (76c4a83)

**`src/components/daybreak/__tests__/bw-atoms.test.tsx`** (appended)
- `describe("BWWordRow — Row A states", ...)` — 5 rendered-component cases:
  - In-deck warm tint: asserts `rgb(255, 247, 233)` on row background (jsdom normalises hex — BRW-03)
  - Not-in-deck: `getByRole("button", { name: /Add water to deck/ })`
  - In-deck remove: `getByRole("button", { name: /Remove water from deck/ })`
  - Reserved error line present + empty when no error (scroll-stability guard)
  - Error line populated with "Failed. Try again." when error prop set
- `describe("BrowseEmpty — D-09 empty state", ...)` — 2 rendered-component cases:
  - Heading "No words at this level." + B1/Body subtext
  - "Show all levels" button click fires onShowAll callback (BRW-04 reset)

---

## Gate Results

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` (full repo) | PASSED |
| `npx biome check word-list-browser.tsx + page.tsx + bw-atoms.test.tsx` | PASSED (3 files clean) |
| `npx vitest run src/components/daybreak/__tests__/bw-atoms.test.tsx` | PASSED — 10/10 (3 BWMedallion + 7 new) |
| `npx vitest run src/lib` | PASSED — 1795/1795 (data layer unchanged) |

---

## Success Criteria Verification

- [x] BRW-01: tiles landing — 14 medallion tiles with real per-pair counts (categoryCounts server-side)
- [x] BRW-02: per-topic list — "‹ Topics" back-link, mini-medallion header, CEFR level-tile row, context line; `?topic=` routing server-rendered, deep-linkable
- [x] BRW-03: Row-A rows (native-on-top + target-lang chip, CEFR chip, 38px circular toggle), in-deck warm tint `#FFF7E9`, optimistic add/remove with amber spinner and scroll-stable reserved-space error (data-role=error-line, no -bottom-4 overlap)
- [x] BRW-04: LionFace empty state + "No words at this level." + "Show all levels" resets CEFR → All on same topic
- [x] D-04 landing back-link = "‹ Add a card" — intentional override of mock's "‹ My deck"
- [x] Structural testids: `browse-words-title`, `topic-tile-{slug}`, `word-row` (ready for 23-04 e2e)
- [x] Optimistic machine byte-for-byte behaviorally preserved (no useEffect, lazy init preserved)

---

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Implementation Notes (not deviations)

**1. Spinner uses `className="animate-spin"` instead of inline `animation: "spin ..."`**
- Tailwind v4's `@keyframes spin` is only emitted by the compiler when an `animate-spin` class is present. Using the inline string `animation: "spin 0.7s linear infinite"` would reference a keyframe that might not be in the CSS bundle.
- Fix: added `className="animate-spin"` to the spinner span alongside inline styles for color/sizing. Clean fix, zero behavior change.

**2. D-04 comment in source**
- The comment `{/* Top bar — D-04: "‹ Add a card" (NOT "My deck") */}` contains the string "My deck" in a guard comment. This is intentional documentation, not UI text. The rendered UI reads "Add a card" as required.

**3. Tasks 1+2 committed together**
- page.tsx imports `BrowseTiles`/`BrowseList` from word-list-browser.tsx; TypeScript would fail if committed independently. Combined into one commit — both files form a single atomic change.

---

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced beyond what was planned. The `?topic=` param is consumed by `filterWords` only (in-memory, static data). T-23-03-TOPIC, T-23-03-XSS, T-23-03-AC mitigated as planned.

---

## Self-Check: PASSED

- `src/app/(protected)/deck/browse/page.tsx` — EXISTS
- `src/components/word-list-browser.tsx` — EXISTS
- `src/components/daybreak/__tests__/bw-atoms.test.tsx` — EXISTS
- Commit `553836b` — EXISTS (`feat(23-03): Daybreak Browse re-skin...`)
- Commit `76c4a83` — EXISTS (`test(23-03): extend bw-atoms.test.tsx...`)
