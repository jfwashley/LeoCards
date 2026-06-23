---
phase: 23-browse-words
verified: 2026-06-23T12:30:00Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Visual fidelity — topic-tiles landing matches Daybreak mock"
    expected: "14 amber medallion tiles in a 3-column grid with geometric icons, amber palette, warm tint background; matches daybreak-browse-boards.jsx BrowseTiles artboard"
    why_human: "Pixel/CSS fidelity vs the hi-fi mock cannot be asserted programmatically"
  - test: "Visual fidelity — per-topic word list matches Daybreak mock"
    expected: "Row-A rows (native bold / target chip beneath / CEFR chip / 38px visual inside 44px tap target), in-deck warm tint visible at a glance, LEVEL tile row styled with amber active state; matches BrowseList artboard"
    why_human: "Visual match to daybreak-browse-boards.jsx BrowseList/BrowseListA1 cannot be confirmed by grep"
  - test: "Visual fidelity — D-09 empty state matches Daybreak mock"
    expected: "LionFace centered in a #F3E3C6 disc, 'No words at this level.' display heading, contextual subtext, amber 'Show all levels' button; matches BrowseEmpty artboard"
    why_human: "Visual fidelity of empty-state mock rendering is not programmatically verifiable"
  - test: "Optimistic toggle feel — add/remove is instant and scroll-stable"
    expected: "Tapping the circular toggle flips the row visual immediately (optimistic), shows amber spinner while in-flight; on failure reverts and shows 'Failed. Try again.' in reserved space with no jump or scroll shift"
    why_human: "Timing/layout-shift behavior under real network latency requires live interaction"
  - test: "Two-screen navigation — browser back button returns list to tiles"
    expected: "From the topic word list, pressing the device/browser back button returns to the tiles landing (not the dashboard), preserving ?deck= context"
    why_human: "Browser history/back-button behavior requires a real browser session to confirm"
---

# Phase 23: Browse Words Verification Report

**Phase Goal:** Topic tiles and word-list screens in Daybreak
**Verified:** 2026-06-23T12:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

All 12 code-level must-haves across all 4 plans are VERIFIED in the actual codebase. The phase delivered a complete Daybreak two-screen Browse Words experience. Status is `human_needed` exclusively because visual fidelity against the hi-fi mock and real-device interaction feel cannot be auto-verified.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BWMedallion renders a geometric amber icon for all 14 CATEGORIES without crashing | VERIFIED | `bw-medallion.tsx` — `ICON_MAP` with 14 entries keyed on exact CATEGORIES strings; `TopicIcon` returns `ICON_MAP[name] ?? null`; `bw-atoms.test.tsx` line 17 iterates CATEGORIES and asserts no crash |
| 2 | BWMedallion is RSC-safe (pure, no hooks, aria-hidden) | VERIFIED | No `"use client"`, no hooks; `aria-hidden="true"` on container (line 466); `background: "#FFF1DC"`, `borderRadius: 16` confirmed |
| 3 | "Browse words ›" link appears top-right on Add-a-Card type-a-word mode, absent during stepper | VERIFIED | `ac-top.tsx` line 50: `{browsePath ? <Link data-testid="browse-words-link">Browse words ›</Link> : <span spacer />}`; `new-card-mode-toggle.tsx` line 34: `browsePath={mode === "type" ? /deck/browse?deck=${activeDeckId} : undefined}` |
| 4 | /deck/browse with no ?topic= renders tiles landing; ?topic={Category} renders the word list (server branch) | VERIFIED | `page.tsx` line 34-37: topic validated against CATEGORIES (WR-01 fix applied); line 74: `requestedTopic ? <BrowseList> : <BrowseTiles>`; `categoryCounts` computed from real `filterWords` per-pair data (D-07) |
| 5 | Tiles landing: "‹ Add a card" back-link (D-04 override), "Browse Words" title, context line, 14-tile grid with real counts | VERIFIED | `word-list-browser.tsx` line 417: `href=/deck/new-card?deck=${deckId}` + text "Add a card" (not "My deck"); line 432: `data-testid="browse-words-title"` "Browse Words"; line 478: `encodeURIComponent(category)` tile links; line 507: `{categoryCounts[category] ?? 0} words` |
| 6 | Topic word list: "‹ Topics" back-link (D-02), mini-medallion + topic name header, LEVEL tile row (All/A1/A2/B1), context line | VERIFIED | `word-list-browser.tsx` line 653: `href=/deck/browse?deck=${deckId}` + text "Topics"; line 676: `<BWMedallion name={topic} size={26} />`; lines 712-743: 4 LEVEL button tiles with active=amber fill |
| 7 | Word row: native bold on top, target-language code + target beneath, CEFR chip, ≥44px touch target wrapping 38px visual; in-deck warm tint | VERIFIED | Lines 149-294: `data-testid="word-row"`, `minHeight: 44`; button `minWidth: 44, minHeight: 44` (line 230-231); 38px visual inner span (line 246); `background: inDeck ? "#FFF7E9" : "transparent"` (line 158); aria-labels "Add/Remove {native} to/from deck" |
| 8 | Add/remove is optimistic: toggle flips immediately; spinner during save; revert + "Failed. Try again." in reserved space (no layout shift); auto-clears after 3s | VERIFIED | Optimistic flip in `handleAdd`/`handleRemove` (lines 550-626); `setTimeout(..., 3000)` at lines 576/615; `data-role="error-line"` with `minHeight: 16` always in DOM (line 204-213); no `-bottom-4` pattern found |
| 9 | Empty state (D-09): LionFace + "No words at this level." + "Show all levels" reset to All on same topic | VERIFIED | `BrowseEmpty` (lines 306-384): LionFace in #F3E3C6 disc; heading "No words at this level."; button "Show all levels" onClick `onShowAll`; wired in BrowseList line 751: `onShowAll={() => setDifficultyFilter("All")}` |
| 10 | e2e helper `addWordsFromBrowser` navigates the two-screen IA before adding words | VERIFIED | `helpers.ts` lines 178-180: `getByTestId("topic-tile-animals").click()` + `waitForURL(/topic=/)` + `waitForCompilation` before `waitForSelector('[aria-label*="Add"]')` |
| 11 | e2e/03 exercises tiles, topic nav, level filter, optimistic add/remove, BRW-04 empty state + reset — structural selectors only | VERIFIED | All 6 tests use `getByTestId("topic-tile-*")`, `data-testid="word-row"`, role buttons; no `getByText("Browse Words")`, no `.border-b` CSS class; Test 6 asserts "No words at this level." + "Show all levels" click |
| 12 | e2e/09 and e2e/10 retargeted off removed copy; touch-target assertion preserved | VERIFIED | e2e/09: `getByTestId("browse-words-title")` + D-04 nav path (no "Back to my deck"); e2e/10: `getByTestId("topic-tile-animals")` + drill-in + `box?.height >= 44` |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/daybreak/bw-medallion.tsx` | BWMedallion + 14 CSS-art topic icons (D-08) | VERIFIED | Exports `BWMedallion`; 14 ICON_MAP entries; pure, no hooks, no `"use client"` |
| `src/components/daybreak/__tests__/bw-atoms.test.tsx` | Rendered-component scaffold — BWMedallion + BWWordRow + BrowseEmpty | VERIFIED | First line `// @vitest-environment jsdom`; iterates CATEGORIES; tests BWWordRow in-deck tint, error-line, toggle a11y; tests BrowseEmpty heading + "Show all levels" click |
| `src/components/daybreak/ac-top.tsx` | ACTop with optional `browsePath` prop → conditional "Browse words ›" link | VERIFIED | `browsePath?: string`; conditional `<Link data-testid="browse-words-link">Browse words ›</Link>`; left link + title span unchanged |
| `src/components/new-card-mode-toggle.tsx` | Threads `browsePath` to ACTop in type mode only | VERIFIED | `browsePath={mode === "type" ? /deck/browse?deck=${activeDeckId} : undefined}` |
| `src/app/(protected)/deck/browse/page.tsx` | Server entry — reads ?topic=, validates against CATEGORIES, computes per-category counts, branches tiles vs list | VERIFIED | `searchParams: Promise<{ deck?: string; topic?: string }>`; CATEGORIES.includes validation (WR-01); `categoryCounts` via `filterWords`; `requestedTopic ? BrowseList : BrowseTiles` |
| `src/components/word-list-browser.tsx` | BrowseTiles + BrowseList + BWWordRow + BrowseEmpty; optimistic machine preserved | VERIFIED | Exports all 4; `WordListBrowser` gone; no lucide-react/ui-button/cn; `useState(() => new Set(existingWords))`; no useEffect syncing deckWords; `setTimeout(..., 3000)`; no `-bottom-4` |
| `e2e/helpers.ts` | `addWordsFromBrowser` updated for two-screen IA | VERIFIED | topic-tile-animals drill-in + waitForURL(/topic=/) before waitForSelector |
| `e2e/03-word-list-browser.spec.ts` | Retargeted to structural selectors; 6 tests including BRW-04 | VERIFIED | 6 tests; no old copy; `topic-tile-*`, `word-row`, `browse-words-title` testids |
| `e2e/09-language-breakdown.spec.ts` | Retargeted off "Back to my deck" / getByText("Browse Words") | VERIFIED | `browse-words-title` testid; D-04 nav path via Add-a-card → My deck |
| `e2e/10-mobile-responsive.spec.ts` | Retargeted to topic-tile-animals; ≥44px touch-target preserved | VERIFIED | `topic-tile-animals` + drill-in; `box?.height >= 44` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `new-card-mode-toggle.tsx` | `ac-top.tsx browsePath` | `mode === "type" ? /deck/browse?deck=${activeDeckId} : undefined` | WIRED | Line 34-36; `browsePath` prop consumed by ACTop conditional |
| `ac-top.tsx` | `/deck/browse` | `<Link href={browsePath} data-testid="browse-words-link">` | WIRED | Line 51-65; link present when browsePath truthy |
| `page.tsx` | `word-list-browser.tsx BrowseTiles/BrowseList` | `requestedTopic ? BrowseList : BrowseTiles` | WIRED | Line 74; imports confirmed line 3 |
| `word-list-browser.tsx` | `bw-medallion.tsx` | `<BWMedallion name={category} />` and `<BWMedallion name={topic} size={26} />` | WIRED | Lines 494, 676 |
| `word-list-browser.tsx` | `deck-actions.ts addWordToCard/removeWordFromDeck` | `handleAdd`/`handleRemove` via `useTransition` | WIRED | Lines 560, 602 |
| `BrowseTiles topic tile` | `/deck/browse?deck=&topic=` | `href={/deck/browse?deck=${deckId}&topic=${encodeURIComponent(category)}}` | WIRED | Line 478 |
| `e2e/helpers.ts addWordsFromBrowser` | Browse two-screen IA | `getByTestId("topic-tile-animals").click()` + `waitForURL(/topic=/)` | WIRED | Lines 178-180 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `BrowseTiles` | `categoryCounts` | `page.tsx` → `filterWords(wordList.words, { category: cat }).length` for each CATEGORIES entry | Yes — per-pair wordlist queried server-side, counts are real (D-07) | FLOWING |
| `BrowseList` | `filteredWords` | `useMemo(() => filterWords(words, { category: topic, cefr: ... }))` — words passed from server | Yes — `words` is the real pair wordlist, filtering is live client-side | FLOWING |
| `BrowseList` | `deckWords` | `useState(() => new Set(existingWords))` lazy initializer — `existingWords` from `getDeckCardWords(activeDeck.id)` server-side | Yes — real DB query for `source="wordlist"` cards | FLOWING |

### Behavioral Spot-Checks

Step 7b skipped — Browse is a Next.js RSC/client hybrid requiring a running dev server. The e2e gate (confirmed green by orchestrator) serves as the functional verification.

### Probe Execution

No probe scripts declared for this phase. The orchestrator-managed e2e gate covers behavioral verification (green: e2e/02, 03, 09, 10 per SUMMARY documentation and confirmed working locators).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BRW-01 | Plans 23-01, 23-02, 23-03, 23-04 | Topic-tiles landing — 14 category tiles with BWMedallion + real per-pair counts; "Browse words ›" entry from Add-a-Card header | SATISFIED | `bw-medallion.tsx` (14 icons); `BrowseTiles` + `categoryCounts`; `ac-top.tsx` browse link; e2e/03 test 1 |
| BRW-02 | Plans 23-03, 23-04 | Word list per topic — "‹ Topics" back-link, topic header, CEFR LEVEL tile row (All/A1/A2/B1), context line | SATISFIED | `BrowseList` top bar + LEVEL row; `?topic=` routing in `page.tsx`; e2e/03 tests 1-5 |
| BRW-03 | Plans 23-03, 23-04 | Word row — native bold / target + lang marker / CEFR chip / ≥44px touch target; in-deck warm tint; optimistic add/remove with scroll-stable error recovery | SATISFIED | `BWWordRow`: `minWidth/minHeight: 44`, 38px visual inner span, `background: inDeck ? "#FFF7E9"`, `data-role="error-line"` always in DOM, `setTimeout(..., 3000)`; rendered-component tests in `bw-atoms.test.tsx` |
| BRW-04 | Plans 23-03, 23-04 | Empty state: LionFace + "No words at this level." + "Show all levels" reset | SATISFIED | `BrowseEmpty` component; `onShowAll={() => setDifficultyFilter("All")}`; rendered-component test + e2e/03 test 6 |

All 4 BRW requirements traced in REQUIREMENTS.md as Complete for Phase 23 — confirmed against actual codebase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `word-list-browser.tsx` | 357 | `There are no {level} words in {topic} yet.` — when `level === "All"` this reads "There are no All words..." | Info | WR-01 secondary fix not applied to `BrowseEmpty` copy; however WR-01 primary fix (CATEGORIES validation in page.tsx) makes this path unreachable for any valid topic (all 14 CATEGORIES are non-empty across all wordlists). Non-blocking. |

No `TBD`, `FIXME`, or `XXX` markers found in any phase-touched files.

### Human Verification Required

#### 1. Tiles Landing Visual Fidelity

**Test:** Open `/deck/browse?deck={id}` in a browser. Compare the rendered page against `design/handoff-daybreak/LeoCards Daybreak Browse Words.html` BrowseTiles artboard.
**Expected:** 14 rounded white cards in a 3-column grid; each with an amber medallion icon on a `#FFF1DC` disc, category name, and "{n} words" count; "‹ Add a card" back-link top-left; "Browse Words" display title centered; context line with LangChip chips.
**Why human:** CSS rendering, icon geometry, spacing, and color fidelity vs the hi-fi mock cannot be asserted programmatically.

#### 2. Word List Screen Visual Fidelity

**Test:** Click any topic tile, review the word list screen against the BrowseList/BrowseListA1 artboards.
**Expected:** "‹ Topics" link top-left; mini medallion + topic name centered; LEVEL row with amber active tile; word rows showing native bold on top, target + 2-letter language code beneath, CEFR chip, circular amber toggle; in-deck rows have visible warm background tint.
**Why human:** Visual fidelity of Row-A layout and the toggle CSS cannot be confirmed by grep.

#### 3. Empty State Visual Fidelity

**Test:** Navigate to a topic, select a CEFR level with no words (e.g. Animals + A1 in the French deck).
**Expected:** LionFace centered in a `#F3E3C6` circular disc, "No words at this level." display heading, contextual subtext naming the level and topic, amber "Show all levels" primary button.
**Why human:** Visual match to BrowseEmpty artboard.

#### 4. Optimistic Toggle Feel (Interaction)

**Test:** On a word list, tap the "+" toggle on an un-added word. Observe the visual change, then simulate a network failure (throttle to offline briefly) and verify error recovery.
**Expected:** Toggle flips to filled amber checkmark instantly (optimistic); amber spinner visible while in-flight; on failure, reverts to "+" and "Failed. Try again." appears in the row without page scroll. Auto-clears after ~3 seconds.
**Why human:** Timing, animation feel, and scroll stability under real network conditions require live interaction.

#### 5. Browser Back Button Navigation

**Test:** From the tiles landing, click a topic tile to open the word list. Press the browser/device back button.
**Expected:** Returns to the tiles landing (not the dashboard), with the `?deck=` context preserved.
**Why human:** Browser history stack behavior requires a real browser session.

### Gaps Summary

No gaps. All code-level must-haves are implemented and verified. The `human_needed` status reflects the nature of this phase as a visual UI re-skin: behavioral logic is fully verified; pixel fidelity and interaction feel require human UAT against the Daybreak mocks.

---

_Verified: 2026-06-23T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
