---
phase: 22-add-a-card
verified: 2026-06-23T00:00:00Z
status: human_needed
score: 3/3
overrides_applied: 0
human_verification:
  - test: "Visual pixel-fidelity check — type-a-word flow"
    expected: "ACSeg toggle, ACContext line (EN→ES · saves to your Spanish deck), ACTop (‹ My deck link + Add a Card title), and all type-a-word states (empty, translating shimmer, translate-fail, save-fail, Card saved banner above fields) match daybreak-addcard-boards.jsx boards"
    why_human: "Inline-style rendering cannot be verified programmatically — requires visual comparison against hi-fi boards"
  - test: "Visual pixel-fidelity check — from-an-image stepper"
    expected: "Pick (ACDrop), Confirm (ACThumb + ACDeckSelect + Extract words), Extracting (ACProgress with Leo + amber bar), and all result states (success LionFace disc / partial counts / all-failed banner) match daybreak-addcard-boards.jsx; 5-dot stepper dots align correctly"
    why_human: "ACProgress motion animation, ACDrop drag-over amber state, and multi-step stepper visual alignment require visual inspection"
  - test: "ACContext chip shows ES not SP for Spanish"
    expected: "The context line chip for Spanish should read ES (matching the header deck picker which uses the BCP-47 code via deck.language.toUpperCase()); currently toChipCode() slices the label 'Spanish' to 'SP' — inconsistency visible side-by-side with the header"
    why_human: "This is a live cosmetic bug (IN-03 from 22-REVIEW.md); cannot be verified without visual inspection of the running app showing context line chip vs header DeckSwitcher chip side-by-side"
  - test: "In-flow new deck create from Confirm surface"
    expected: "Clicking the ACDeckSelect full-width trigger opens the DeckSwitcher popover; '+ New deck' inline create works (language selection + name + confirming creates a deck and selects it in the Confirm surface); data-testid='confirm-deck-select' present and header data-testid='deck-picker-trigger' is unaffected"
    why_human: "createDeck server action requires a live Next.js server and database — cannot be exercised by grep or unit test"
  - test: "Review step inline word edit UX"
    expected: "Clicking the pencil on a word in the Review step shows an inline input pre-filled with the word; typing a new value and pressing Enter updates the word in the row; Escape cancels without change; blur commits the edit (matches the CR-01 fix verified in ac-atoms.test.tsx)"
    why_human: "Component-level behaviour confirmed by unit tests, but UX feel (focus, Enter/Escape, blur timing) requires human interaction testing on the running app"
  - test: "Cancel navigation uses client-side routing (WR-02)"
    expected: "Cancel buttons on Pick (image mode) and error/no-words surfaces navigate to /dashboard without a full page reload — transition should be instant like other client-side route changes in the app"
    why_human: "The review flagged WR-02 as a known advisory (window.location.assign instead of router.push) — requires visual inspection of the navigation transition to assess real-world impact"
  - test: "Full image happy-path end-to-end (live API keys required)"
    expected: "Upload a real photo with words → Extract (ACProgress with Leo, real up-to-30s wait) → Review words list with real OCR output → Check translations with ACPairRow pairs → Add N cards commit → Result success state (LionFace disc + 'N cards added!') — all matching the Daybreak boards"
    why_human: "The Extract and Translate API calls (Claude Vision + DeepL) require live API keys; confirmed by VALIDATION.md 'Manual-Only Verifications' note; unit/component tests cover the reducer logic but not the live data path"
---

# Phase 22: Add-a-Card Verification Report

**Phase Goal:** The Add a Card destination — both the type-a-word and from-an-image flows — is redesigned to Daybreak, preserving the existing translation and extraction pipelines.

**Requirements:** ADC-01, ADC-02, ADC-03

**Verified:** 2026-06-23T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Single Add-a-Card destination with segmented toggle ("Type a word \| From an image"), persistent context line (EN → ES · saves to your Spanish deck), and a working "‹ My deck" escape link | VERIFIED | `new-card-mode-toggle.tsx`: renders `<ACTop />` (Link to /dashboard + "Add a Card" title with data-testid="add-card-title"), `<ACContext nativeLang=... targetLang=... targetDeckName=.../>`, `<ACSeg mode={mode} onChange={setMode} />`. `ac-top.tsx` line 30 has Link href="/dashboard"; `ac-context.tsx` imports and uses `LangChip` from shared `daybreak/lang-chip`. `ac-seg.tsx` renders two `<button type="button">` segments with labels "Type a word" / "From an image". |
| 2 | Type-a-word shows linked native/target fields with auto-translate shimmer, handles all states (empty, translating, translate-fail, save-fail, saved "Card saved — add another." banner + form clear), and Save remains locked until both fields are filled | VERIFIED | `translation-form.tsx`: preserves `formReducer`, `translateFrom` with 500ms `use-debounce`, `activeField.current` stale guard, `saveCard`. `ACField` renders shimmer pending state. `ACBanner kind="ok"` renders "Card saved — add another." above fields. `canSave` predicate (`!nativeText.trim() \|\| !targetText.trim() \|\| isSaving`) gates `ACBtn kind=...`. Save error renders `ACBanner kind="error"`. Grep confirms: "Card saved — add another." present (line 364), "Translation unavailable — enter manually." present (line 273), "Save card" label present (line 413), `saveCard` import present, `/api/translate` call preserved, `use-debounce` import preserved. No shadcn `@/components/ui/input` or `@/components/ui/button` in translation-form. |
| 3 | From-an-image completes the full stepper (Pick, Confirm+deck, Extracting with calm long-wait progress and Cancel, Review words with keep/exclude list, Check translations with editable pairs, Result) across all outcome states (success, partial counts, all-failed); nothing saves until the explicit "Add N cards" commit | VERIFIED | **Pick:** `image-drop-zone.tsx` renders "Upload a Photo" / "Drop to upload", "browse your files", "JPG · PNG · WebP", `data-testid="file-error"`, no "10 MB". `validateImageFile` call preserved. **Confirm:** `image-upload-flow.tsx` renders `ACStepper`, `ACDeckSelect` (with `data-testid="confirm-deck-select"`, reuses `DeckSwitcher` popover + createDeck). `ACDeckSelect` imports and passes `customTrigger` to `DeckSwitcher`; `deck-switcher.tsx` conditionally sets `data-testid="deck-picker-trigger"` only when no `customTrigger`. **Extracting:** `ACProgress` with `searching={true}`, D-03 `cancelled.current` guard on all 4 result dispatch sites (lines 299, 302, 309, 318). `handleCancelExtraction` dispatches `EXTRACT_CANCEL` (stays on Confirm, preserves file/deck). **WR-01 fixed (783a88d):** `handleClearFile` also sets `cancelled.current = true`. 35s `AbortController` preserved. **Review:** `review-list.tsx` renders `ACReviewRow` per word; `onEdit` wires to `dispatch({ type: "EDIT_WORD", id: row.id, word: newWord })` (new word value, not no-op). **CR-01 fixed (8065480):** `ACReviewRow` has inline edit mode with `<input>` on pencil click; unit tests in `ac-atoms.test.tsx` lock the behaviour (Enter/Escape/blur). **Check:** `ACPairRow` with D-01 target-on-top orientation (ES on top, EN below); atom unit test in `ac-atoms.test.tsx` regression-guards DOM order. **Commit:** "Add {n} cards" `ACBtn kind="primary"` → `handleCommit` → `saveImageCards`. **Result:** three states — all-failed (`ACBanner kind="error"` + "Couldn't add cards — please try again."), partial (counts card with ✓/–/! glyphs), success (LionFace sunrise disc + "{n} cards added!" + "Go to my deck"). No `CheckCircle2`. All results under `ACStepper current={4}` ("Add" dot). |

**Score:** 3/3 truths verified

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ADC-01 | 22-02, 22-03 | Single destination with segmented toggle, context line, "‹ My deck" escape | SATISFIED | `new-card-mode-toggle.tsx` renders ACTop + ACContext + ACSeg; page.tsx is Daybreak shell; ACDeckSelect in Confirm reuses Phase 21 DeckSwitcher popover (D-02) |
| ADC-02 | 22-02 | Type-a-word — native/target fields with shimmer, all states, Save locked until filled, "Card saved" banner | SATISFIED | `translation-form.tsx` full restyle confirmed; all behavior (reducer, debounce, stale guard, saveCard) preserved verbatim |
| ADC-03 | 22-03, 22-04 | From-an-image stepper — Pick, Confirm+deck, Extracting (cancelable), Review, Check, Result; nothing saves until "Add N cards" | SATISFIED | `image-drop-zone.tsx`, `image-upload-flow.tsx`, `review-list.tsx` confirmed as Daybreak-restyled with behavior preserved; D-03 guard + CR-01 fix verified |

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/components/daybreak/ac-seg.tsx` | VERIFIED | Two `<button type="button">` with "Type a word" / "From an image" labels; no emoji; `aria-pressed` |
| `src/components/daybreak/ac-btn.tsx` | VERIFIED | Single `<button>` element; `disabled` attribute set for `kind="disabled"`; spreads `{...props}` |
| `src/components/daybreak/ac-progress.tsx` | VERIFIED | Imports `LionFace` and `motion/react`; 116×116 sunrise disc; indeterminate amber `motion.div`; `searching` prop for magnifier |
| `src/components/daybreak/ac-banner.tsx` | VERIFIED | `kind="ok"` green circle "✓"; `kind="error"` red circle "!"; CSS glyphs, no emoji |
| `src/components/daybreak/ac-review-row.tsx` | VERIFIED | CR-01 fix: pencil click reveals `<input>` pre-filled with current word; Enter commits, Escape cancels, blur commits; 3+ `type="button"` controls |
| `src/components/daybreak/ac-pair-row.tsx` | VERIFIED | D-01: TARGET (ES) field first (top), NATIVE (EN) field second (bottom); `failed` prop gives red EN border + "Translation unavailable — enter manually." |
| `src/components/daybreak/lang-chip.tsx` | VERIFIED | `export function LangChip`; shared across `deck-switcher.tsx` (line 6 imports from `daybreak/lang-chip`) and `ac-context.tsx` |
| `src/components/daybreak/__tests__/ac-atoms.test.tsx` | VERIFIED | Covers ACSeg (2 buttons, onChange, aria-pressed), ACBtn (primary/disabled/ghost), ACBanner (ok/error), ACReviewRow (toggle + CR-01 inline edit regression suite), ACPairRow (D-01 orientation guard + failed helper), ACProgress (render + searching) |
| `src/components/daybreak/ac-context.tsx` | VERIFIED | Imports `LangChip`; renders chip→chip · "saves to your {deck}" |
| `src/components/daybreak/ac-top.tsx` | VERIFIED | `data-testid="add-card-title"` on title span; `Link href="/dashboard"` reads "‹ My deck" |
| `src/components/daybreak/ac-stepper.tsx` | VERIFIED | 5 stages: Image · Extract · Review · Translate · Add; presentational; no 6th dot |
| `src/components/daybreak/ac-deck-select.tsx` | VERIFIED | `data-testid="confirm-deck-select"` on trigger; imports `DeckSwitcher` and passes `customTrigger`; `LangChip` in trigger row |
| `src/components/new-card-mode-toggle.tsx` | VERIFIED | Renders ACTop + ACContext + ACSeg; both child mounts preserved (`TranslationForm` and `ImageUploadFlow`); `useState<"type" \| "image">` kept; no `ui/button` import |
| `src/components/translation-form.tsx` | VERIFIED | All behavior preserved; Daybreak surface; "Card saved — add another." banner; "Translation unavailable — enter manually." error; "Save card" ACBtn |
| `src/components/image-drop-zone.tsx` | VERIFIED | "Upload a Photo" / "Drop to upload"; "browse your files"; "JPG · PNG · WebP"; `data-testid="file-error"`; `validateImageFile` call; no "10 MB" |
| `src/components/image-upload-flow.tsx` | VERIFIED | D-03 `cancelled.current` guard on 4 dispatch sites; `handleCancelExtraction` → `EXTRACT_CANCEL`; WR-01 fix: `handleClearFile` also sets guard; `AbortController` 35s timeout preserved; `/api/extract` call preserved |
| `src/components/review-list.tsx` | VERIFIED | CR-01 fixed: `onEdit={(newWord) => dispatch({ type: "EDIT_WORD", id: row.id, word: newWord })}`; ACReviewRow, ACPairRow (D-01), ACProgress, ACStepper, LionFace all imported and rendered; "Add {n} cards" commit; 3 result states; `saveImageCards`, `handleGoToDeck`, translate-cancel guard preserved |
| `src/components/__tests__/image-upload-flow-cancel.test.tsx` | VERIFIED | Tests `EXTRACT_CANCEL` reducer action (D-03/D-16 preservation); pure guard logic; Pitfall 3 reset regression |
| `src/app/(protected)/deck/new-card/page.tsx` | VERIFIED | Daybreak shell (`min-h-screen bg-background flex flex-col items-center` + `max-w-lg px-5 py-6`); no "use client"; auth gate + 0-deck redirect preserved; all `NewCardModeToggle` props passed |
| `e2e/04-manual-card-entry.spec.ts` | VERIFIED | `getByTestId("add-card-title")` (retargeted); `getByRole("button", { name: "Save card" })` preserved; `getByText(/Card saved/)` regex; D-07 regression test: "Type a word" and "From an image" role+name assertions with `aria-pressed` check; no stale `getByText("Add a Card")` |
| `e2e/11-phase9-image-upload.spec.ts` | VERIFIED | Toggle uses `From an image` (D-07); `getByText("Upload a Photo")`; `getByTestId("file-error")` scoped error assertions; `getByTestId("image-preview")`; `getByTestId("confirm-deck-select")`; "Next: choose deck" removed; "Drop an image here" removed; "Re-pick" button; D-03 Cancel-preserves-image test intercepts `/api/extract` and asserts `image-preview` + `confirm-deck-select` visible after cancel |

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `new-card-mode-toggle.tsx` | `ac-seg.tsx` | `<ACSeg mode={mode} onChange={setMode} />` | WIRED | Import and JSX usage confirmed |
| `ac-top.tsx` | `/dashboard` | `<Link href="/dashboard">‹ My deck</Link>` | WIRED | Line 17-31 of `ac-top.tsx` |
| `translation-form.tsx` | `/api/translate` | `fetch("/api/translate", ...)` in `translateFrom` | WIRED | Line 250 of `translation-form.tsx` |
| `translation-form.tsx` | `ac-banner.tsx` | `<ACBanner kind="ok">Card saved — add another.</ACBanner>` | WIRED | Line 364 of `translation-form.tsx` |
| `ac-deck-select.tsx` | `deck-switcher.tsx` | `<DeckSwitcher ... customTrigger={fullWidthTrigger} />` | WIRED | Import + usage; `customTrigger` prop exists in `deck-switcher.tsx` line 91 |
| `image-upload-flow.tsx` | `ac-progress.tsx` | `<ACProgress ... searching={true} />` for Extracting state | WIRED | Import line 7 + Extracting render |
| `image-upload-flow.tsx` | `/api/extract` | `fetch("/api/extract", { ... signal: controller.signal })` | WIRED | Line 281; 35s AbortController preserved |
| `review-list.tsx` | `ac-pair-row.tsx` | `<ACPairRow target={row.word} native={row.nativeText} ...>` | WIRED | Import line 8 + step-b render at line 524 |
| `review-list.tsx` | `deck-actions.ts (saveImageCards)` | `commitReviewRows()` calls `saveImageCards(deckId, ...)` | WIRED | Import line 15; call at line 303 |
| `review-list.tsx` | `/api/translate` | `runTranslationFanOut` → `fetch("/api/translate")` | WIRED | Pattern confirmed; `/api/translate` POST preserved |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `translation-form.tsx` | `state.nativeText`, `state.targetText`, `state.isTranslating` | `formReducer` via `useReducer`; populated by `translateFrom` → `fetch("/api/translate")` | Yes — reducer handles TRANSLATE_DONE/TRANSLATE_ERROR from live API | FLOWING |
| `image-upload-flow.tsx` | `state.extractWords` | `imageFlowReducer` via `EXTRACT_SUCCESS`; populated by `handleExtract` → `fetch("/api/extract")` | Yes — reducer receives words array from live API | FLOWING (live API path manual-verified per VALIDATION.md) |
| `review-list.tsx` | `state.translationRows` | `reviewListReducer` via `TRANSLATION_ROW_DONE`; populated by `runTranslationFanOut` → `fetch("/api/translate")` per row | Yes — per-row fan-out to live DeepL API | FLOWING (live API path manual-verified per VALIDATION.md) |

### Behavioral Spot-Checks

Step 7b is SKIPPED for the live-API dependent paths (Extract, Translate fan-out) — these require running server + API keys. The runnable code paths (type-a-word toggle, drop-zone, Save gating) are covered by the e2e suite that passed per execution status.

### Probe Execution

No probe scripts are declared for this phase (Phase 22 uses Playwright e2e + vitest as its verification mechanism). Per execution status: vitest 2044 passed / 6 skipped; e2e web+mobile green for Phase 22 specs.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ac-context.tsx` | 20-22 | `toChipCode` slices label text `"Spanish" → "SP"` instead of using BCP-47 code `"es" → "ES"` | Warning (IN-03) | Cosmetic: context line chip reads "SP" while header DeckSwitcher shows "ES" for same Spanish deck — visible inconsistency when side-by-side. No functional impact. |
| `ac-banner.tsx` | 26-42 | `✓` / `!` glyph spans have no `aria-hidden="true"` | Warning (WR-04) | A11y: glyphs announced as raw punctuation by screen readers. Adjacent text carries meaning but glyph noise is suboptimal. Non-blocking — the parent element conveys meaning. |
| `review-list.tsx` | 630-711 | Partial-result circle glyphs (`✓`, `-`, `!`) have no `aria-hidden` | Warning (WR-04) | Same a11y pattern as above. Text labels ("Added", "Already learned", "Couldn't add") carry semantic meaning. |
| `image-upload-flow.tsx` | 469, 564, 711 | `window.location.assign("/dashboard")` for Cancel buttons | Warning (WR-02) | Full page reload instead of client-side `router.push`. Documented advisory in 22-REVIEW.md. Functional but inconsistent with codebase routing convention. |
| `image-upload-flow.tsx` | 56, 110-116 | `EXTRACT_RETRY` action handled in reducer but never dispatched (Try-again calls `handleExtract` → `EXTRACT_START`) | Info (IN-01) | Dead production code. No correctness impact. |

No `TBD`, `FIXME`, or `XXX` markers found in any Phase 22 modified files.

### Human Verification Required

#### 1. Visual Pixel-Fidelity — Type-a-Word Flow

**Test:** Navigate to `/deck/new-card` on the running app. Compare each state against `design/handoff-daybreak/daybreak-addcard-boards.jsx` boards: ACTypeEmpty (toggle + context + fields), ACTypeTranslating (shimmer pending field), ACTypeErrors (translate-fail red border + banner), ACTypeSaved (green "Card saved — add another." banner + cleared fields).
**Expected:** Daybreak token colours (cream #FFF6E9 bg, amber #F28A1F accents, ink #4A331C), Baloo 2 display title, field radii/borders, LangChip chips, ACBanner visual — all match the hi-fi boards.
**Why human:** Inline-style rendering is not verifiable programmatically.

#### 2. Visual Pixel-Fidelity — From-an-Image Stepper

**Test:** Navigate to `/deck/new-card`, switch to "From an image". Inspect each step: ACDrop drop zone (idle + drag-over amber + error red), Confirm (ACThumb thumbnail + ACDeckSelect full-width trigger + ACStepper dots), Extracting (ACProgress Leo disc + indeterminate amber bar animation + Cancel button), Result states (success LionFace disc + "N cards added!" / partial counts / all-failed error banner).
**Expected:** All boards in `daybreak-addcard-boards.jsx` reproduced faithfully; 5-dot stepper shows correct active dot at each step.
**Why human:** Motion animation, drag-over visual state, multi-step stepper visual alignment require visual inspection.

#### 3. ACContext Chip Shows "SP" Not "ES" for Spanish (IN-03)

**Test:** Navigate to `/deck/new-card` with a Spanish deck. Observe the context line chip for the target language. Compare to the header DeckSwitcher chip.
**Expected:** Context line should show "ES" (matching BCP-47 convention used everywhere else). Currently `toChipCode("Spanish") = "SP"`.
**Why human:** Live UI comparison required. This is a documented cosmetic bug (IN-03 from 22-REVIEW.md) that was not fixed in the post-review commits. Developer decision needed: accept as-is or fix.

#### 4. In-Flow New Deck Create from Confirm

**Test:** On the Confirm step (after picking an image), click the `ACDeckSelect` full-width trigger. Verify the DeckSwitcher popover opens, "+ New deck" create flow works (select language → confirm), and the new deck is selected in the trigger row. Verify the header `deck-picker-trigger` is unaffected.
**Expected:** Seamless inline deck creation from within the image upload flow (D-02); `data-testid="confirm-deck-select"` on the trigger; `data-testid="deck-picker-trigger"` on the header instance.
**Why human:** `createDeck` server action requires a live Next.js server and database.

#### 5. Review Step Inline Word Edit UX

**Test:** Navigate to the Review step (requires live extract API or seeded data). Click the pencil icon on a word. Verify the word becomes an editable input pre-filled with the current value. Test Enter (commit), Escape (cancel without change), blur (commit).
**Expected:** Smooth inline editing experience; CR-01 regression is not visible in the running app.
**Why human:** Component-level behavior is unit-tested (ac-atoms.test.tsx CR-01 suite), but UX feel and focus behavior require human interaction testing.

#### 6. Cancel Navigation Full Page Reload (WR-02)

**Test:** On the Pick surface (image mode) or an error state, click "Cancel". Observe the navigation transition to `/dashboard`.
**Expected:** Ideally instant client-side transition (router.push). Currently uses `window.location.assign` which causes a full reload.
**Why human:** Navigation performance difference requires visual observation. Developer decision: accept current behavior (full reload) or apply WR-02 fix (`router.push`).

#### 7. Full Image Happy-Path End-to-End

**Test:** Upload a real photo containing vocabulary words → confirm the full stepper: Extract (real 15-30s wait with ACProgress), Review (real OCR words in ACReviewRow), Check translations (real DeepL pairs in ACPairRow), Add N cards commit, Result state.
**Expected:** All steps render correctly with real data; success shows LionFace disc + "{N} cards added!"; partial/all-failed states handle API errors gracefully.
**Why human:** Requires live Claude Vision API key (extract) and DeepL API key (translate). Confirmed as "Manual-Only Verification" in `22-VALIDATION.md`.

---

## Gaps Summary

No automated-verification gaps. All three success criteria are VERIFIED in the codebase:

- **ADC-01** (single destination + toggle + context + escape): confirmed across `new-card-mode-toggle.tsx`, `ac-top.tsx`, `ac-context.tsx`, `ac-seg.tsx`, `page.tsx`.
- **ADC-02** (type-a-word all states, behavior preserved): confirmed in `translation-form.tsx` with all behavior (reducer, debounce, stale guard, saveCard) intact.
- **ADC-03** (full image stepper, cancelable extraction, editable review/check, commit gate): confirmed across `image-drop-zone.tsx`, `image-upload-flow.tsx` (with D-03 guard + WR-01 fix), `review-list.tsx` (with CR-01 fix).

The two post-review fixes (CR-01 word editing restored in `ACReviewRow`, WR-01 cancel guard applied to Re-pick) are both committed and verified in source.

Human verification is required for: visual fidelity (expected for a UI phase), the IN-03 chip code inconsistency (developer decision), in-flow deck create, and the live API happy-path. The WR-02 and WR-04 warnings remain documented advisories from the code review and are non-blocking.

---

_Verified: 2026-06-23T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
