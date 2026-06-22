---
phase: 21-dashboard-my-deck
verified: 2026-06-22T12:00:00Z
status: human_needed
score: 17/17 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Persistent header matches Daybreak TopBar (DSH-01 / D-01)"
    expected: "LionFace mark + 'LeoCards' wordmark (not 🐯), compact LangChip pill showing active language code (e.g. 'ES'), dropdown popover with deck list + active marker + '+ New deck' inline chips, per-language creating/error states, Daybreak logout glyph icon button"
    why_human: "Pixel fidelity vs daybreak-dashboard.jsx TopBar — automated checks confirm code structure; visual rendering and state transitions require human inspection"
  - test: "Habitat hero medallion states (DSH-02 / D-05, D-06)"
    expected: "LionFace on sunrise disc with conic progress ring; 'Habitat · Level N' title; 'X of Y cards to Level N+1' subtitle. At L9 (max): gold ring + gold badge + 'Course 1 complete' + no next-level line. During cooldown: napping Leo (dimmed + 'z' mark) over a still-accurate conic ring; countdown NOT on hero, only in status row"
    why_human: "Visual fidelity of the conic-gradient ring, gold treatment, napping animation, and the D-06 coexistence of napping face + real progress — not auto-checkable"
  - test: "Action line four-state visual rendering (DSH-03 / L-05)"
    expected: "Full-width 'Start studying' amber primary (active when due, dimmed #F4E7D2 when not); status row left: '12 due' amber dot / '0 due' outline dot / napping-LionFace-z + 'Resting · 2h 15m' / pause-bars + 'All paused'; 'Add a card' pill right. 'Browse words' is absent from the populated line but present in the empty-deck state"
    why_human: "State cycling requires live dashboard with each state active; visual distinction between active/dimmed StudyButton and the four StatusText variants"
  - test: "'Your words' Daybreak word rows — D-04 native-on-top deliberate override (DSH-04, DSH-05 / D-03, D-04)"
    expected: "Accordion collapsed by default, tap expands with height/opacity transition (not swipe). Rows: native term BOLD ON TOP (card.front), target muted beneath (card.back), source tag (Curated/Added by you/Paused), 3-bar mastery meter (amber, green+✓ at 3/3), pause+edit icon buttons; paused rows at ~55% opacity. Search inside expanded panel. D-04 override: native-on-top is INTENTIONAL, should NOT match mock's target-on-top"
    why_human: "Visual fidelity of the row layout, mastery meter, source tags, and opacity; accordion animation smoothness; the D-04 deliberate deviation from the mock must be visually confirmed as intentional"
  - test: "Edit-card modal Daybreak styling (DSH-06)"
    expected: "Daybreak surface (bg #FFF6E9, border #F0E3CF, radius 22px); TField inputs for 'Native word' and 'Target word'; amber TBtn 'Save changes'; 'Discard changes' outline; delete trigger; confirm screen 'Delete this card? / This can't be undone.' with Delete / Keep card. L-03 nit: 'Delete' confirm button is amber (TBtn) — not the red/destructive variant as noted in REVIEW M-02 L-03 — verify UX impact is acceptable"
    why_human: "Modal visual styling and the L-03 delete-button colour (amber vs expected red) require visual inspection; behavior is auto-covered by green unit tests"
  - test: "All seven DSH-07 states render in Daybreak (DSH-07)"
    expected: "Walk each state: (1) cards-due — amber StudyButton + '12 due'; (2) none-due — dimmed button + '0 due'; (3) resting — dimmed + 'Resting · countdown' + napping hero; (4) all-paused — dimmed + 'All paused'; (5) empty-deck — Leo medallion + 'Your deck is empty' + Browse words / Add a card; (6) brand-new-user — same as empty-deck (0-deck → /welcome redirect prevents dashboard rendering a no-deck state); (7) search-active-no-results — expanded accordion + search term + 'No words match …' + Clear search"
    why_human: "End-to-end state coverage requires a live dashboard with test data cycling through each state; visual consistency of each Daybreak state cannot be asserted programmatically"
---

# Phase 21: Dashboard — My Deck Verification Report

**Phase Goal:** "The full Dashboard experience — persistent header, habitat hero medallion, action line, and 'Your words' accordion — is redesigned to Daybreak across all seven requirement states."
**Verified:** 2026-06-22T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Persistent header shows LionFace + "LeoCards" wordmark (no tiger emoji) and Daybreak logout glyph | VERIFIED | `app-header.tsx`: 0 tiger emoji; LionFace imported and rendered (size=27); "LeoCards" wordmark present. `logout-button.tsx`: `aria-label="Sign out"`, `authClient.signOut()` + `router.push("/login")` preserved |
| 2 | Deck picker is a Popover anchored to a compact LangChip pill; lists decks by full name; inline create with per-language spinner/error; no flag emoji | VERIFIED | `deck-switcher.tsx`: imports `ui/popover`; `deck-picker-trigger` testid on trigger; `LangChip` chip (no FLAG_MAP); `new-deck-row` + `deck-option-{lang}` testids; `createDeck` called (2 refs); per-language `creatingLang` spinner; `error` state rendering |
| 3 | getLanguageBreakdown removed from dashboard; languageBreakdown prop gone from DeckView; "My Deck" heading removed (D-02) | VERIFIED | `dashboard/page.tsx`: `getLanguageBreakdown` = 0 occurrences; `languageBreakdown` = 0. `deck-view.tsx`: `languageBreakdown` = 0; "My Deck" = 0. Function preserved in `milestone-queries.ts` |
| 4 | Habitat hero medallion: conic progress ring + level badge, L9 max (gold + "Course 1 complete", next-line hidden) — no level>=10 dead branch (D-05) | VERIFIED | `habitat-medallion.tsx`: `LEVEL_THRESHOLDS` imported (2 refs); `nextLevelThreshold === null` as canonical max signal; `>= 10` dead branch = 0 occurrences; `data-testid="medallion-ring"` with real progress conic-gradient |
| 5 | During cooldown only: napping Leo over ACCURATE ring (ring NOT zeroed/greyed); countdown NOT on hero (D-06) | VERIFIED | `habitat-medallion.tsx`: `sleeping` dims inner disc (opacity 0.45) but `ringBackground` uses real `conic-gradient` always (D-06 override comment present). `habitat-hero.tsx`: "Resting" = 0 occurrences; "countdown" = 0; real `nextLevelThreshold`/`learnedCardCount` always passed to `HabitatMedallion` (no `progress={0}`) |
| 6 | HabitatHero wired into DeckView replacing legacy HabitatWidget; sleeping flag = `Boolean(earliestCooldownEnd && !hasDueCards)` (L-04, D-06 sibling) | VERIFIED | `deck-view.tsx`: `HabitatWidget` = 0; `HabitatHero` = 3 refs (import + JSX); `sleeping={Boolean(earliestCooldownEnd && !hasDueCards)}` confirmed; `habitatState={habitatState}` (real prop, no hardcoded data) |
| 7 | Option-D action line: full-width "Start studying" (amber active / dimmed when not due) + four-state status row + "Add a card"; "Browse words" REMOVED from populated line; "All cards are paused" paragraph folded into "All paused" (DSH-03, L-05) | VERIFIED | `deck-view.tsx`: "Browse words" = 0; "All cards are paused" = 0; "All paused" present; "Resting" present; `data-testid="add-a-card"` present; `router.refresh` (CountdownTimer expiry) = 1 ref; hasDueCards-gated Link to `/study` |
| 8 | dueCount is server-authoritative `sessionCards.length` (M-01 fix) | VERIFIED | `dashboard/page.tsx`: `dueCount={sessionCards.length}` — uses `assembleSession` output directly, no client-side approximation |
| 9 | StatusText four-state machine: due / none-due / resting+countdown / all-paused | VERIFIED | `deck-view.tsx`: all four branches present; cooldown → `CountdownTimer` renders "Resting · {countdown}" with napping-LionFace + z-mark; paused → pause-bars + "All paused"; due → amber dot + `{dueCount} due`; none → outline dot + "0 due" |
| 10 | "Your words" accordion: collapsed-by-default, height/opacity transition (not swipe), search inside expanded panel (D-03, DSH-04) | VERIFIED | `card-list.tsx`: `motion/react` imported; `AnimatePresence` + `motion.div` with `height: 0→auto, opacity: 0→1`; `style={{ overflow: "hidden" }}` (Pitfall 1); `usePrefersReducedMotion` gating; `aria-expanded={open}` on header; `aria-controls="words-panel"`; `words-search-input` inside motion.div panel |
| 11 | Word-row orientation is D-04 deliberate override: native (card.front) BOLD ON TOP / target (card.back) muted beneath | VERIFIED | `card-list.tsx`: `card.front` at position 15143, `card.back` at 15925 — `front` renders first in JSX. Comment "D-04: native-on-top override of the handoff CardRow — intentional, do not 'correct'" present |
| 12 | Source-tag copy: "Curated" (wordlist), "Added by you" (manual), "Paused" (pausedAt) — old "word list"/"manual" strings removed (DSH-05, L-06) | VERIFIED | `card-list.tsx`: "word list" = 0; "Added by you" present; "Curated" present; `SourceTag` maps `manual → "Added by you"`, else `"Curated"`, `pausedAt → "Paused"` |
| 13 | 3-bar mastery meter (amber, green+check at masteryRound>=3); paused rows de-emphasised (opacity 0.55); pause/edit icon buttons preserved (DSH-05) | VERIFIED | `card-list.tsx`: `MasteryMeter` component with 3 bars, `done = effectiveStep >= 3 → #3E9B5F + ✓`; paused rows `opacity: paused ? 0.55 : 1`; `togglePause` wired to pause/resume `IconBtn`; `setEditCard` wired to edit `IconBtn` |
| 14 | Edit-card modal restyled to Daybreak (TField/TBtn, Daybreak surface); Save/Discard/Delete-with-confirm + error states preserved (DSH-06) | VERIFIED | `card-edit-dialog.tsx`: TField = 3 refs, TBtn = 5 refs; `DialogContent` has `bg-[var(--background)] rounded-[22px] border border-[#F0E3CF]`; "Delete this card?" present; "can't be undone" present; "Keep card" present; `editCard` = 2 refs; `deleteCard` = 2 refs |
| 15 | All seven DSH-07 states render in Daybreak: cards-due, none-due, resting, all-paused, empty-deck, brand-new-user, search-no-results | VERIFIED | StatusText 4 states in `deck-view.tsx`; empty-deck "Your deck is empty" in `card-list.tsx`; brand-new-user → `/welcome` redirect (0-deck guard in `dashboard/page.tsx`); "No words match" no-results in expanded accordion panel |
| 16 | QA badge + optimistic pause toggle (useTransition + fetch + router.refresh) preserved | VERIFIED | `card-list.tsx`: `QaStateBadge` present; `togglePause` with `useTransition`, `fetch /api/cards/${card.id}/${action}`, `router.refresh()` |
| 17 | e2e specs retargeted for all Daybreak surface changes; no stale literals remaining (L-06) | VERIFIED | All 8 Phase-21-touched specs clean: 0 stale `select-trigger`/`Sign out` text/`My Deck`/`All cards are paused`/`bg-secondary.rounded-full`/`Search your cards`/`No cards match`; `deck-picker-trigger`, `new-deck-row`, `words-accordion-header`, `words-search-input`, `browse-words-empty` all in place |

**Score:** 17/17 truths verified

### Deferred Items

No must-have truths are deferred to later phases. All 17 are verified in the current codebase.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/ui/popover.tsx` | Daybreak-styled `@base-ui/react` Popover wrapper | VERIFIED | Exports Popover, PopoverTrigger, PopoverPortal, PopoverPositioner, PopoverPopup, PopoverClose, PopoverContent; `z-50` on Positioner; Daybreak surface on Popup |
| `src/app/(protected)/dashboard/page.tsx` | Dashboard server entry with getLanguageBreakdown removed; dueCount = sessionCards.length | VERIFIED | 0 refs to `getLanguageBreakdown`/`languageBreakdown`; `dueCount={sessionCards.length}` wired; 0-deck→/welcome redirect intact |
| `src/components/deck-view.tsx` | Daybreak DeckView — HabitatHero + Option-D action line + StatusText state machine | VERIFIED | HabitatWidget gone; HabitatHero present; Browse words absent; All cards are paused absent; StatusText 4 states present; dueCount prop threaded from server |
| `src/components/app-header.tsx` | Daybreak TopBar — LionFace + wordmark + DeckSwitcher + logout glyph | VERIFIED | LionFace size=27, "LeoCards" wordmark; no tiger emoji; DeckSwitcher + LogoutButton wired |
| `src/components/deck-switcher.tsx` | Popover-based deck picker with inline create + LangChip | VERIFIED | PopoverTrigger with deck-picker-trigger testid; LangChip trigger; deck-option-{lang} buttons; new-deck-row; createDeck reused; FLAG_MAP absent |
| `src/components/logout-button.tsx` | Icon-only logout button with aria-label="Sign out" | VERIFIED | aria-label="Sign out"; LogoutGlyph SVG; authClient.signOut() + router.push("/login") preserved |
| `src/components/habitat-medallion.tsx` | Conic-ring medallion — progress ring, level badge, sleeping + max-level variants | VERIFIED | LEVEL_THRESHOLDS imported; nextLevelThreshold===null as max signal (no >=10); D-06 ring keeps real value when sleeping; data-testid="habitat-medallion" + data-max-level + data-sleeping attributes |
| `src/components/habitat-hero.tsx` | Daybreak hero card — medallion + title/subtitle + View habitat link | VERIFIED | Link to /habitat; celebrate param wired; "Course 1 complete" at L9; "Resting" absent (D-06); real props passed to medallion (no progress=0) |
| `src/components/card-list.tsx` | WordsAccordion-wrapped card list — collapsed default, search inside, Daybreak CardRow native-on-top, source tags, mastery meter | VERIFIED | motion/react accordion with overflow:hidden; usePrefersReducedMotion; words-accordion-header; words-search-input inside panel; native-on-top D-04 with comment; Curated/Added by you/Paused tags; 3-bar MasteryMeter; browse-words-empty testid |
| `src/components/card-edit-dialog.tsx` | Daybreak-restyled edit modal — behavior preserved | VERIFIED | TField (3) + TBtn (5); Daybreak DialogContent surface; Delete this card? / can't be undone / Keep card copy; editCard + deleteCard calls preserved |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `deck-switcher.tsx` | `ui/popover.tsx` | `import { Popover, PopoverContent, PopoverTrigger }` | WIRED | Imports confirmed; PopoverTrigger used as trigger pill, PopoverContent wraps deck list |
| `deck-switcher.tsx` | `deck-actions.ts` | `createDeck` (reused unchanged) | WIRED | `createDeck` appears 2 times (import + call in `handleCreateDeck`) |
| `app-header.tsx` | `lion-face.tsx` | `LionFace` brand mark | WIRED | LionFace imported and rendered with correct palette props |
| `deck-view.tsx` | `habitat-hero.tsx` | `import { HabitatHero }` (replaces HabitatWidget) | WIRED | `HabitatHero` appears 3 times (import + JSX + type); HabitatWidget = 0 |
| `deck-view.tsx` | `/study` | Start studying Link when hasDueCards | WIRED | `href={"/study?deck=" + activeDeckId}` inside `hasDueCards` branch |
| `deck-view.tsx` | `/deck/new-card` | Add a card link | WIRED | `href={"/deck/new-card?deck=" + activeDeckId}` with `data-testid="add-a-card"` |
| `habitat-hero.tsx` | `/habitat` | `next/link href` | WIRED | `href = celebratingLevel ? "/habitat?celebrate=..." : "/habitat"` |
| `habitat-medallion.tsx` | `habitat-engine.ts` | `LEVEL_THRESHOLDS` (read-only) | WIRED | `LEVEL_THRESHOLDS` imported and used in `progressRatio` function |
| `card-list.tsx` | `motion/react` | `AnimatePresence + motion.div` height/opacity accordion | WIRED | Both imported; accordion pattern with overflow:hidden on motion.div (Pitfall 1 guard) |
| `card-list.tsx` | `/api/cards/[id]/pause|unpause` | `togglePause` optimistic fetch | WIRED | `fetch("/api/cards/${card.id}/${action}", { method: "POST" })` + `router.refresh()` |
| `card-edit-dialog.tsx` | `deck-actions.ts` | `editCard` / `deleteCard` | WIRED | Both imported and called in `handleSave`/`handleDelete` |
| `dashboard/page.tsx` | `study-engine.ts` | `assembleSession` → `sessionCards.length` → `dueCount` | WIRED | `assembleSession(allCardsForSession, now)` → `sessionCards.length` → `dueCount={sessionCards.length}` (M-01 fix) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `deck-view.tsx` StatusText | `dueCount` | `dashboard/page.tsx`: `assembleSession()` → `sessionCards.length` → `dueCount` prop | Yes — server-authoritative SRS engine output (M-01 fix confirmed) | FLOWING |
| `habitat-hero.tsx` + `habitat-medallion.tsx` | `habitatState` (level, learnedCardCount, nextLevelThreshold) | `dashboard/page.tsx`: `computeHabitatState(habitatFacts, new Date())` from DB | Yes — real DB facts via `getHabitatFacts` | FLOWING |
| `deck-view.tsx` | `sleeping` flag | `Boolean(earliestCooldownEnd && !hasDueCards)` — both from server `getEarliestCooldownEnd(allCardsForSession, now)` | Yes — derived from real study card data | FLOWING |
| `card-list.tsx` | `cards` (masteryRound, pausedAt, source) | `dashboard/page.tsx`: `getDeckCards` + `masteryByCardId` map from `getStudyCards` | Yes — real DB queries | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for visual-only rendering checks (no runnable entry points without dev server). Behavioral assertions are auto-covered by the green gates declared in `<gate_status_already_passed>`:
- TypeScript: `npx tsc --noEmit` — clean
- Unit suite: 2011 passed, 6 skipped (110 files)
- Production build: green, all 21 routes compile
- Playwright e2e (8 Phase-21-touched specs): web 29 passed, mobile 22 passed + 8 intentional skips, 0 failures

### Probe Execution

No `scripts/*/tests/probe-*.sh` probes declared or applicable to this presentation-only re-skin phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DSH-01 | Plans 01, 02 | Persistent app header — LionFace + "LeoCards" wordmark, deck picker (LangChip pill, switch/create), logout | SATISFIED | `app-header.tsx` + `deck-switcher.tsx` + `logout-button.tsx` verified |
| DSH-02 | Plans 03, 04 | Habitat hero medallion — conic ring, level badge, "X of Y", L9 max, /habitat link | SATISFIED | `habitat-medallion.tsx` + `habitat-hero.tsx` verified; HabitatHero wired into deck-view.tsx |
| DSH-03 | Plan 04 | Action line — "Start studying" (dims when nothing due) + adaptive status row + "Add a card" | SATISFIED | Option-D action line in `deck-view.tsx` verified; all 4 StatusText states; Browse words absent |
| DSH-04 | Plan 05 | "Your words" tap-to-expand inline accordion (height/opacity, not swipe) | SATISFIED | `card-list.tsx` accordion with AnimatePresence + motion height/opacity verified |
| DSH-05 | Plan 05 | Word row — native/translation/source tag/3-bar mastery/pause+edit; paused de-emphasised | SATISFIED | Daybreak CardRow with D-04 native-on-top, Curated/Added by you/Paused tags, MasteryMeter verified |
| DSH-06 | Plan 05 | Edit-card modal — TField/TBtn Daybreak, Save/Discard/Delete-with-confirm + errors | SATISFIED | `card-edit-dialog.tsx` TField+TBtn+Dialog surface + full flow copy verified |
| DSH-07 | Plans 04, 05 | All 7 states render in Daybreak | SATISFIED | All 7 state code paths verified: due/none/resting/all-paused/empty-deck/brand-new-user(=empty-deck)/search-no-results |

All DSH-01 through DSH-07 requirements are satisfied. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/card-list.tsx` | — | `placeholder="Search your words"` flagged by scanner | Info | FALSE POSITIVE — this is an HTML `<input placeholder="...">` attribute, not a stub indicator. The search input is fully functional with wired `value={query}` + `onChange`. |

No BLOCKER or WARNING anti-patterns found. No TBD/FIXME/XXX markers in any touched file.

**Code review findings (from 21-REVIEW.md):**

| Finding | Severity | Resolution |
|---------|----------|------------|
| M-01: dueCount inflated (counted all non-paused cards including learned) | MEDIUM | FIXED in commit 1740441 — `dueCount={sessionCards.length}` confirmed in `dashboard/page.tsx` |
| M-02: duplicate `data-testid="deck-option-{lang}"` for same-language decks | MEDIUM | DEFERRED per REVIEW.md — documented follow-up, not a must-have for phase goal |
| L-01: dead `__new__` branch in `handleValueChange` | LOW | DEFERRED per REVIEW.md — dead code, no runtime impact |
| L-02: `Loader2` uses inline `animation` style instead of `animate-spin` | LOW | DEFERRED per REVIEW.md — functional today, inconsistency only |
| L-03: delete confirm button is amber TBtn not red/destructive | LOW | DEFERRED per REVIEW.md — visual UX nit, captured in human_verification item 5 |

### Human Verification Required

All 17 automated must-haves are VERIFIED. The following 6 items require a developer with access to a running LeoCards instance to confirm visual fidelity and state coverage. These are surfaced from `21-VALIDATION.md` Manual-Only Verifications plus the L-03 nit from code review.

#### 1. Persistent Header — Daybreak TopBar Fidelity (DSH-01 / D-01)

**Test:** Load the dashboard; compare the header to the `daybreak-dashboard.jsx` TopBar mock (lines 127-143). Open the deck popover; exercise '+ New deck' chip flow, observe creating spinner and error state.
**Expected:** LionFace mark + "LeoCards" wordmark visible; compact LangChip pill (e.g. "ES") with down chevron; popover lists decks with full names and active marker; '+ New deck' reveals per-language LangChip chips with individual creating spinners and inline error message. Logout is an icon-only glyph button (not text).
**Why human:** Pixel fidelity of typography, spacing, border colours, and the popover animation cannot be asserted programmatically.

#### 2. Habitat Hero Medallion States (DSH-02 / D-05, D-06)

**Test:** Compare the hero at a mid level to the mock; check L9 (max level); trigger a cooldown state.
**Expected:** Conic amber progress ring over sunrise disc with LionFace; "Habitat · Level N" title; "N of M cards to Level N+1" subtitle; "View habitat" link with right chevron. At L9: gold ring + gold badge + "Course 1 complete" (no next-level line). During cooldown: LionFace dimmed with "z" mark, ring remains real progress (not greyed/zeroed), "Your lion is napping · cards recharging" subtitle — countdown is NOT on the hero.
**Why human:** CSS conic-gradient rendering, gold colour treatment, napping face opacity, and the D-06 coexistence of napping + real ring cannot be pixel-verified programmatically.

#### 3. Action Line Four-State Visual Rendering (DSH-03 / L-05)

**Test:** Cycle the dashboard through each state; verify the action line adapts correctly. Also confirm "Browse words" appears only in the empty-deck state, not the populated action line.
**Expected:** (1) cards-due: amber full-width "Start studying" + amber dot + "N due" count + "Add a card" pill; (2) none-due: dimmed #F4E7D2 "Start studying" + outline dot + "0 due" + "Add a card"; (3) resting: dimmed "Start studying" + napping LionFace-z + "Resting · 2h 15m" (live countdown) + "Add a card"; (4) all-paused: dimmed "Start studying" + pause bars + "All paused" + "Add a card". "Browse words" absent from all four states.
**Why human:** Live state cycling requires test data setup; visual distinction between active (amber) and dimmed (#F4E7D2) StudyButton must be confirmed.

#### 4. "Your Words" Daybreak Rows — D-04 Native-on-Top (DSH-04, DSH-05 / D-03, D-04)

**Test:** Expand "Your words"; inspect rows for orientation, source tags, mastery, and paused state. Confirm native-on-top is NOT the mock's target-on-top.
**Expected:** Accordion collapses/expands with smooth height/opacity transition. Each row: NATIVE word bold on top (#4A331C, 16.5px 700) / target muted beneath (#8C7A63, 13.5px) with source tag. Tags: "Curated" (amber chip), "Added by you" (green chip), "Paused" (muted chip). 3-bar mastery meter (amber → green+✓ at 3/3). Paused rows at ~55% opacity. Search inside expanded panel produces "No words match '…'" state when no results.
**Why human:** Visual inspection of the D-04 deliberate override (row ordering vs the mock), mastery bar colours, source-tag colour palette, and paused-row opacity.

#### 5. Edit-Card Modal Daybreak Styling + L-03 Nit (DSH-06)

**Test:** Open an edit modal; verify Daybreak surface and full save/discard/delete-confirm flow. Specifically check whether the Delete confirm button (amber TBtn) is visually distinguishable from the Save button.
**Expected:** Modal uses Daybreak surface (warm bg, rounded-22px, warm border). TField inputs for "Native word" and "Target word". Amber "Save changes" TBtn; outline "Discard changes". Delete trigger (Trash2 icon + text). On delete trigger: confirm screen shows "Delete this card?" + "This can't be undone." with "Delete" (amber TBtn) and "Keep card" (outline). L-03 nit: the "Delete" confirm button is amber (same as Save) — confirm the UX is acceptable given the copy differentiates it, or flag for L-03 follow-up fix.
**Why human:** Visual rendering of the modal surface, TBtn/TField styles, and the L-03 amber-vs-red distinction for the destructive action.

#### 6. All Seven DSH-07 States in Daybreak (DSH-07)

**Test:** Walk through all seven dashboard states end-to-end in a running instance.
**Expected:**
1. **cards-due**: amber StudyButton + amber dot "N due" + habitat hero with real progress
2. **none-due**: dimmed StudyButton + outline dot "0 due" + habitat hero (normal)
3. **resting**: dimmed StudyButton + napping hero (dimmed ring with "z") + "Resting · countdown" in status row
4. **all-paused**: dimmed StudyButton + "All paused" status + all rows at 55% opacity when "Your words" expanded
5. **empty-deck**: "Your deck is empty" page with Leo medallion + "Browse words" + "+ Add a card" (no accordion)
6. **brand-new-user**: same as empty-deck (0-deck users redirect to /welcome; this state is the empty-deck experience for first-deck users)
7. **search-active-no-results**: expand "Your words", type a non-matching term, see "No words match '…'" + "Clear search"
**Why human:** Full state coverage requires live app with appropriate test data for each state; visual Daybreak consistency across all states cannot be asserted programmatically.

### Gaps Summary

No gaps found. All 17 must-have truths are VERIFIED in the codebase.

Two documented code-review issues (M-02 non-unique testid, L-03 amber delete button) are DEFERRED per 21-REVIEW.md and do not block the phase goal. They surface as human-verification items where appropriate.

The placeholder WARN from the anti-pattern scanner is a false positive (HTML `<input placeholder="Search your words">` attribute).

---

_Verified: 2026-06-22T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Depth: full goal-backward analysis + code reads across all 10 component/page files + grep verification_
