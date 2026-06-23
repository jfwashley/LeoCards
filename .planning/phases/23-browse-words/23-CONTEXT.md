# Phase 23: Browse Words - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-skin the existing **Browse Words** experience (`/deck/browse`) to the Daybreak design system, and adopt the mock's **locked two-screen information architecture**: a **topic-tiles landing** (14 category tiles) → a **per-topic word list** with a CEFR level-tile row, covering every state the mock draws (default list, level-filtered, empty result, and per-word not-added / added / adding / failed).

Requirements: **BRW-01, BRW-02, BRW-03, BRW-04**.

**Presentation-layer + IA only.** The curated-catalogue data layer and the add/remove pipeline are **preserved unchanged**: `getWordList(native, target)` (dynamic per-pair JSON), `filterWords` (category + CEFR), the optimistic `addWordToCard` / `removeWordFromDeck` server actions (source `"wordlist"`), the per-row loading/error/3s-auto-clear recovery, and `getDeckCardWords` in-deck detection (matches `front::back` on `source="wordlist"` cards only). The one structural change beyond a pure re-skin is **navigation**: today's single screen (a horizontal category-pill row, all 14 categories inline) becomes the mock's **two-screen drill-down** (tiles landing → topic list). Builds on the Daybreak foundation + primitives shipped in Phase 19 and the `LangChip` extracted in Phase 22.

**One small cross-screen touch (sanctioned):** add a **"Browse words"** entry link to the **Phase 22 Add-a-Card screen** (top-right of its landing header) — this is the populated-deck entry point into Browse (see D-05). No dashboard change.

</domain>

<decisions>
## Implementation Decisions

### Navigation & routing (BRW-01 / BRW-02)
- **D-01:** **Route-based via a `?topic=` query param — NOT in-page state.** Keep the single `/deck/browse` route: **no `?topic=`** renders the **tiles landing**; **`?topic={Category}`** renders that topic's **word list**. Rationale over Phase 22's in-page-state precedent (Add-a-Card's Pick→stepper): Browse is *exploration/navigation*, where the browser **back button returning list→tiles** is the expected mobile behavior, topics are **deep-linkable**, and the page **stays server-rendered** (it already reads `searchParams.deck`). Adding `topic` alongside `deck` is the natural extension. **Preserve the active `?deck=` context in every internal URL** (landing, list, and the back-links). The **CEFR level filter stays in-page state** (defaults to **All** on each topic entry) — deliberately *not* a URL param, so tapping levels doesn't flood browser history. The mock's `BWWordRow.last` prop is cosmetic — ignore it (rows use margin, not a divider).
- **D-02:** **Within Browse, the list screen's back is "‹ Topics" → the landing** (`/deck/browse?deck=…`, no `topic`). This is the mock's `BWListTop` left affordance and is unchanged. (The *landing's* back-link is the overridden one — see D-04.)

### Entry point (how Browse is reached)
- **D-03:** **Primary entry = a "Browse words ›" link in the TOP-RIGHT of the Add-a-Card landing header.** Browse was removed from the populated dashboard action line in Phase 21 (L-05), so active users currently can't reach it. Instead of restoring a dashboard link, the entry lives on the **Phase 22 Add-a-Card screen** as the mirror of its existing top-left **"‹ My deck"** escape — making Add-a-Card and Browse the two co-located "build your deck" paths. **Show it only on the Add-a-Card *landing/Pick* header** (visible for both the **type-a-word** view and the **image Pick** view, where the segmented toggle lives); **do NOT show it once the image stepper starts** (Confirm onward, where the header becomes the 5-dot `ACStepper`). Populated-deck path: **Dashboard → "Add a card" → "Browse words"**. **The dashboard action line is unchanged** (Phase 21's Start studying + status + Add a card stays). Touches the Phase 22 Add-a-Card top bar (`new-card-mode-toggle.tsx` / the Add-a-Card header) — add `e2e` selectors for the new link and watch the L-06 audit there too. Link target: `/deck/browse?deck={activeDeckId}`.
- **D-04:** **⚠ Browse landing back-link → "‹ Add a card" — DELIBERATE OVERRIDE of the mock.** The mock's landing header (`BWLandingTop`) draws **"‹ My deck"** (→ dashboard). Override it to **"‹ Add a card"** → `/deck/new-card?deck={activeDeckId}` (preserve the deck context), because the user arrives at Browse *from* Add-a-Card (D-03) and should return there. **This is intentional:** the downstream UI checker / `gsd-ui-auditor` must **NOT** "correct" the landing back-link to "‹ My deck" to match the mock. The existing empty-deck **"Browse words"** entry (`card-list.tsx`, Phase 19/21) is **preserved unchanged** and also opens this Browse; with the `?topic=` route model the **browser back button** still returns each user to wherever they actually came from (Add-a-Card *or* the empty-deck dashboard), even though the in-app landing back-link is uniformly "‹ Add a card". (Context-aware `from`-param routing was considered and declined — see Deferred.)

### Word row & language pair (BRW-03)
- **D-05:** **Native term on top, target term + target-language marker beneath — generalize the mock's hardcoded EN→ES.** The mock's `BWWordRow` draws **English bold on top** + an **"ES" marker** + Spanish muted beneath. The screen serves **all 6 language pairs** (`en-fr`, `en-es`, `fr-en`, `fr-es`, `es-en`, `es-fr`), so "English/ES" are mock placeholders. Lock the real rule: **native term (`WordEntry.native`) bold on top with no chip; target term (`WordEntry.target`) beneath with the *target* language-code chip (EN / FR / ES).** This matches the mock's structure for the EN→ES example **and** stays consistent with Phase 21 **D-04** (native-on-top, app-wide). Drive the **context line** (`BWContext`: `LangChip {native}` → `LangChip {target}` · "tap a word to add it to your **{TargetLanguageName}** deck") and the count/labels from the active pair — `page.tsx` already computes `nativeLangLabel` / `targetLangLabel`. Browse is **not** an exception like Phase 22's D-01 image pairs: these are curated pairs where the native word is the anchor.

### Per-row loading & error states (BRW-03)
- **D-06:** **Spinner-in-toggle while saving; revert + inline "Failed. Try again." on failure — no layout shift, scroll-stable.** The mock doesn't draw these. While an add/remove is in flight, the **38px circular toggle** shows a small **amber spinner** (the row's warm tint / toggle state has already flipped optimistically). On failure, **revert the toggle** and show **"Failed. Try again."** inline against that row in **reserved space** (no absolute-positioned overlap, no layout shift — fixing the current `-bottom-4` overlap), auto-clearing after **3s**. This **preserves** the existing behavior exactly (`useTransition`, optimistic `deckWords` set, `loadingWords` / `errorWords` sets, 3s timeout) and honors BRW-03's hard "**never loses scroll position**" requirement. Keep the `React.memo`'d row (avoids re-creating per-row `onClick` closures across a long list).

### Topic tiles, counts & icons (BRW-01)
- **D-07:** **Tile word-counts are computed from REAL wordlist data — the mock's `n` values (12/20/11…) are placeholders.** Compute per-category counts from `getWordList(native, target)` for the active pair (counts vary by pair). Render the mock's 3-column tile grid (`BWTopicTile`: medallion + name + "{n} words"). If a category has **0 words** for a pair, still render the tile (show "0 words") rather than hiding it — keeps the 14-tile grid stable; the empty word-list state (D-08) covers the drill-in. Mirrors the D-05/D-06-class "mock-vs-reality" reconciliations from Phases 20–22 (L9-not-L10, 5MB-not-10MB).
- **D-08:** **Recreate the mock's 14 geometric amber topic icons as CSS-drawn placeholders.** `daybreak-browse.jsx` defines a `TOPIC_ICON` map (one single-weight amber glyph per category, rendered in a rounded `BWMedallion`). Per PROJECT.md, "Leo + habitat/**topic art** are CSS-drawn placeholders — shippable as-is or swappable for commissioned/icon-library art later, keeping the Daybreak palette." So recreate them faithfully (a `TopicIcon`/medallion component keyed by category name). Whether it becomes a shared `daybreak/*` primitive or a Browse-local component, and SVG-vs-styled-div rendering, is the planner's call.

### Filtering & empty state (BRW-02 / BRW-04)
- **D-09:** **Empty result = the mock board's treatment, with a "Show all levels" reset.** When a category+level combination has no words: centered **`LionFace`** in a `#F3E3C6` disc + **"No words at this level."** (display font) + contextual subtext **"There are no {LEVEL} words in {Topic} yet. Try another level or topic."** + a primary **"Show all levels"** button that **resets the CEFR filter to All** (stays on the current topic). This replaces the current bare text "No words in this category at this level." — an **L-06 at-risk string** (see below). The **LEVEL** filter row (`BWLevels`: a "LEVEL" label + 4 equal tiles All / A1 / A2 / B1, active = amber fill + shadow) is its own section above the list.

### Carried forward from Phases 19–22 (locked — not re-litigated)
- **L-01:** **Leo, not tiger; no emoji.** Text `LangChip` ("EN"/"FR"/"ES") for the context line and the target-word marker — never flag emoji; `LionFace` for the empty-result mascot moment. (Phase 19/20/21/22.)
- **L-02:** **Behavior preserved, surface + IA only**, composing Daybreak primitives (`TField`/`TBtn`/`Pill`/`Card`/`LionFace`/`LangChip`). The add/remove pipeline, filtering, and in-deck detection are untouched. **Note for the planner:** in-deck detection + remove match **only `source="wordlist"` cards** by `front::back` — a word added via manual/image entry will *not* read as "in deck" here. This is **existing behavior; preserve it, do not "fix" it** in a re-skin phase. (REQUIREMENTS "Out of Scope"; Phase 19/20/21/22 pattern.)
- **L-06:** **Audit `e2e/*.spec.ts` for literal-text Playwright locators before restyling**, and retarget to role+accessible-name or `data-testid` (preserve behavioral intent, never re-add old copy). **Known at-risk Browse strings:** the **"Browse Words"** `h1` heading, **"Back to my deck"** link, the category-pill labels (the whole pill row is being replaced by tiles), the CEFR labels (`All`/`A1`/`A2`/`B1`), the empty copy **"No words in this category at this level."** → **"No words at this level."** (D-09), and the row `aria-label`s (`Add {native} to deck` / `Remove {native} from deck`). Also audit the **Add-a-Card** specs for the new D-03 link. Grep the **whole** `e2e/` dir for each changed string (stale literals often live in more than the obvious spec) and watch for strict-mode multi-match. Add changed specs to the owning plan's `files_modified`.

### Claude's Discretion
- **Exact Daybreak token values, spacing, radii, prop shapes, file layout, and component decomposition** — pull from the Daybreak system + existing `src/components/daybreak/*` primitives and the `daybreak-browse.jsx` atoms (`BWMedallion`, `BWLandingTop`/`BWListTop`, `BWContext`, `BWLevels`, `BWTopicTile`/`BWTopicGrid`, `BWLvlTag`, `BWWordRow`, `BWList`).
- **Whether the tiles→list route transition is animated** (`motion/react`) and the responsive grid behavior (the mock's fixed 3-col phone-shell is a reference; desktop may widen) — discretion within the Daybreak system.
- **Whether `TopicIcon`/`BWMedallion` and the word `Row` become shared `daybreak/*` primitives or Browse-local components** (D-08) — planner's call; build shareable if cheap.
- **The list's scroll/overflow treatment** — the mock's bottom mask-fade is a fixed-phone-shell artifact; natural page scroll on the responsive page is fine.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Browse Words design contract (content / states / copy — the blue-sky brief)
- `design/ui-redesign-requirements-browse-words.md` — the authoritative brief: what the screen must do/show (14 categories, CEFR filtering, the word pairing, in-deck vs not, optimistic add/remove with row-local error recovery), the **5 states**, the domain concepts ("in deck" ≠ "learned"; deck = active language pair; curated pre-translated catalogue), and the hard constraints (≥44px targets, native→target unambiguous, instant/optimistic, never lose scroll, back-to-deck always present). **Treat its content/states/behaviors as the contract; its visual form is explicitly blue-sky → superseded by the Daybreak mock + the decisions above.**

### Browse Words visual contract (Daybreak hi-fi — recreate faithfully, EXCEPT D-04/D-05/D-07 notes)
- `design/handoff-daybreak/daybreak-browse.jsx` — locked atoms: the **`TOPIC_ICON`** map (14 geometric amber glyphs — D-08), `TOPICS` (placeholder counts — **D-07: use real**), `LEVELS`, `BWMedallion`, `BWLandingTop` (**"‹ My deck"** left — **D-04 overrides to "‹ Add a card"**), `BWListTop` ("‹ Topics"), `BWContext` (**EN→ES / "Spanish deck"** placeholders — **D-05: drive from real pair**), `BWLevels`, `BWTopicTile`/`BWTopicGrid`, `BWLvlTag`, `BWWordRow` (**Row A: native-on-top + target marker — D-05**), `BWList`.
- `design/handoff-daybreak/daybreak-browse-boards.jsx` — the 4 board states: `BrowseTiles` (landing + "Pick a topic"), `BrowseList` (All), `BrowseListA1` (level-filtered), `BrowseEmpty` (LionFace + "No words at this level." + "Show all levels" — **D-09**).
- `design/handoff-daybreak/LeoCards Daybreak Browse Words.html` — renders the artboards (all states) for visual reference.
- `design/handoff-daybreak/wireframes/wf-browse.jsx` + `wf-browse-boards.jsx` + `LeoCards Browse Words Wireframes.html` — the structural wireframes the hi-fi mock is built on.

### Daybreak design system (tokens + primitives — shipped Phase 19)
- `design/handoff-daybreak/README.md` §"Design System — Daybreak tokens" + §"Shared components" — palette, type, spacing, radii, shadows.
- `design/handoff-daybreak/hifi-daybreak.jsx` — the `d1` theme object (exact token values; `bt = window.d1Theme` in the browse mock).
- `design/handoff-daybreak/hifi-shared.jsx` — `LionFace`, `TField`, `TBtn`, `Pill`, `Card` references (ported into `src/components/daybreak/*` in Phase 19).

### Requirements, roadmap & prior context
- `.planning/ROADMAP.md` §"Phase 23: Browse Words" — goal + 4 success criteria.
- `.planning/REQUIREMENTS.md` — **BRW-01, BRW-02, BRW-03, BRW-04**.
- `.planning/phases/22-add-a-card/22-CONTEXT.md` — the **Add-a-Card screen** that gets the D-03 "Browse words" entry link (its header / `new-card-mode-toggle.tsx`, the L-06 e2e pattern, and the `LangChip` extraction reused here).
- `.planning/phases/21-dashboard-my-deck/21-CONTEXT.md` — the **D-04 native-on-top** rule (D-05 here is consistent with it) and the **L-05** removal of "Browse words" from the populated dashboard (the reason D-03 routes the entry through Add-a-Card).
- `.planning/phases/20-study-screen/20-CONTEXT.md` — the re-skin pattern (preserve behavior, restyle surface) + the e2e-selector / dead-branch lessons.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/daybreak/{lion-face,t-btn,t-field,pill,card}.tsx` + `src/components/daybreak/lang-chip.tsx` (extracted in Phase 22) — the medallion, tiles, level tiles, context line, word rows, empty state, and circular toggle compose these.
- `src/lib/wordlist.ts` — `getWordList(sourceLang, targetLang)` (dynamic per-pair JSON import), `filterWords(words, {category, cefr})`, `getCategories(words)`. **Reuse unchanged.**
- `src/data/wordlists/schema.ts` — `CATEGORIES` (the canonical 14, in display order), `WordEntry { id, category, cefr, native, target }`, `CefrLevel = "A1" | "A2" | "B1"`. **The 14 topic tiles iterate `CATEGORIES`; counts come from the active pair's word list (D-07).**

### Screens / components to redesign (presentation + IA — preserve behavior)
- `src/app/(protected)/deck/browse/page.tsx` — server entry: `auth`, `getUserDecks`, `getUserNativeLanguage`, `getWordList`, `getDeckCardWords`, 0-deck→`/dashboard` redirect, `?deck=` param. **Add `?topic=` reading (D-01)**, wrap in the Daybreak background/shell; compute per-category counts for the landing. No data-layer change.
- `src/components/word-list-browser.tsx` — the client component to restyle + split into the two-screen IA. Currently: a "Back to my deck" link, an `h1` "Browse Words", a horizontal **category-pill row** (replaced by the **tiles landing** — D-01), a **difficulty-pill row** (becomes the `BWLevels` tile row — D-09), column headers (native | target | Level), and `WordRow` (becomes **Row A** — D-05). **Preserve the `handleAdd`/`handleRemove` optimistic logic, `useTransition`, the `deckWords`/`loadingWords`/`errorWords` sets, the 3s error auto-clear, and the `React.memo` row** — restyle only (D-06).
- **Phase 22 Add-a-Card header** (`src/components/new-card-mode-toggle.tsx` / the Add-a-Card landing top bar) — **add the D-03 "Browse words ›" top-right link** (landing/Pick only, not mid-stepper).
- `src/components/card-list.tsx` — the empty-deck "Browse words" entry is **preserved unchanged** (Phase 19/21); it also opens this Browse.

### Integration Points (preserved unchanged)
- `addWordToCard(deckId, wordId, front=native, back=target)` → inserts a card with `source="wordlist"`; `revalidatePath("/dashboard")`. (`src/lib/deck-actions.ts`)
- `removeWordFromDeck(deckId, front, back)` → deletes the matching `source="wordlist"` card. (`src/lib/deck-actions.ts`)
- `getDeckCardWords(deckId)` → `Set<"front::back">` over `source="wordlist"` cards — the in-deck detection source; `wordKey(word) = native::target`. (`src/lib/deck-queries.ts`)
- `getUserDecks` / `getUserNativeLanguage` (`src/lib/deck-queries.ts`) + `getWordList` (`src/lib/wordlist.ts`) on the page entry.

### Established Patterns
- Daybreak tokens via Tailwind semantic classes (`bg-background`, `text-foreground`, `text-primary`) + `--db-*` CSS vars; display text uses `font-display` (Baloo 2); `daybreak/*` atoms use inline styles for exact token values (the mock uses `bt = window.d1Theme`).
- Optimistic toggle: `useTransition` + a `Set` for in-flight ids + a `Map`/`Set` for per-row errors with a 3s auto-clear timeout (already in `word-list-browser.tsx` — the model for D-06).
- `motion/react` for transitions (available for the route/level transitions).
- `React.memo`'d row to avoid re-creating closures across a long list (preserve for scan/scroll perf).

</code_context>

<specifics>
## Specific Ideas

- **Landing (`BrowseTiles`):** top bar = **"‹ Add a card"** (D-04 override) + centered **"Browse Words"**; then the `BWContext` line; a **"Pick a topic"** display heading; a **3-column grid** of 14 `BWTopicTile`s (rounded-white card, `BWMedallion` with the geometric amber icon, category name, "**{n} words**" from real data).
- **List (`BrowseList`):** top bar = **"‹ Topics"** + centered (`BWMedallion` mini + topic name); the `BWContext` line; the **LEVEL** tile row (All / A1 / A2 / B1, active = amber fill + shadow); the word list.
- **Context line (both screens):** `LangChip {native}` → `LangChip {target}` · "tap a word to add it to your **{TargetLanguageName}** deck" — destination deck stays unambiguous (BRW-02 / the brief's "native→target must be unambiguous").
- **Word row (Row A):** native term bold (~17.5px) on top; beneath it the **target-code chip** (e.g. "ES") + target term muted; a small amber **CEFR tag** (`BWLvlTag`); a trailing **38px circular toggle** — **outlined `+`** (not in deck) / **filled amber `✓`** (in deck). **In-deck rows get a warm tint** (`#FFF7E9` bg + `#F4E3C4` border) so membership is obvious at a glance across a long list.
- **Empty result:** `LionFace` in a `#F3E3C6` disc + "No words at this level." + "There are no {LEVEL} words in {Topic} yet. Try another level or topic." + **"Show all levels"** primary button (resets CEFR → All; D-09).
- **No text search on Browse** — the mock and the brief filter by topic + difficulty only (search belongs to the Dashboard "Your words" accordion, Phase 21). Don't add a search box here.

</specifics>

<deferred>
## Deferred Ideas

- **Context-aware Browse back-link** (return to the actual referrer — Add-a-Card vs the empty-deck dashboard — via a `?from=` param) — considered, **declined** for simplicity; the landing back-link is hardwired to "‹ Add a card" (D-04), and the route-based browser back-button already returns users correctly. Promote only if the empty-deck→Browse→back-to-Add-a-Card path proves confusing in UAT.
- **A "Browse words" entry on the populated DASHBOARD action line** — explicitly **not** restored; Phase 21 (L-05) deliberately kept the action line to Start studying + Add a card, and the entry now lives on Add-a-Card instead (D-03). The dashboard is untouched this phase.
- **⚠ Flag for the team (not Phase 23 work):** the Daybreak browse mock hard-codes **per-topic counts** (`12/20/11…`) and an **EN→ES / "Spanish deck"** example — both are placeholders that D-05/D-07 replace with real per-pair data. No logic ticket needed (these were always illustrative), but noting the mock-vs-reality drift consistent with the L9-vs-L10 (Phases 20/21) and 5MB-vs-10MB (Phase 22) flags.
- **Topic icons as final art** — the 14 geometric glyphs ship as CSS placeholders (D-08, per PROJECT.md's project-level decision); swapping for commissioned / icon-library art (keeping the Daybreak palette) is a future, non-Daybreak-blocking change.

### Reviewed Todos (not folded)
None — `todo.match-phase 23` returned no matches.

</deferred>

---

*Phase: 23-browse-words*
*Context gathered: 2026-06-23*
