# Phase 22: Add a Card — Research

**Researched:** 2026-06-22
**Domain:** Daybreak re-skin of existing Add-a-Card flows (type-a-word + from-an-image), presentation layer only
**Confidence:** HIGH — all claims verified against live source files; no assumed facts about the codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Mixed field orientation by design ("lead with the source field"). Image Check-translations = target (ES) on top, native (EN) beneath (`ACPairRow`). Type-a-word = native-first (`ACField` order in `ACTypeScreen`). The UI auditor must NOT correct either orientation. Documented exception to Phase 21 D-04.
- **D-02:** Full-width "Add words to" field row on the Confirm step reuses the Phase 21 `DeckSwitcher` popover internals (incl. inline `+ New deck` create). Trigger presentation changes from compact pill to full-width `ACDeckSelect`; popover/list/create logic is unchanged.
- **D-03:** Restyle wait screens only; no new abort path. Cancel on the Extracting screen returns to Confirm (image+deck preserved via existing reducer "D-16 preservation" comment) plus a one-line `cancelled` ref guard to ignore a late extraction result — the exact pattern `review-list.tsx` already uses for translate-cancel via `cancelled.current`. AbortController is NOT wired to Cancel. No `EXTRACT_CANCEL` action added.
- **D-04:** Navigation model matches the mock. Pick screen: segmented toggle + context line + "‹ My deck" escape. From Confirm onward: 5-dot stepper; Back = prev step, Re-pick (Confirm only) = dropzone, Cancel = safe exit to My deck. Nothing committed until "Add N cards".
- **D-05:** 5-dot stepper = Image · Extract · Review · Translate · Add (`AC_STAGES`). Pick is pre-stepper (Pick + Confirm both live under "Image" dot; Result lives under "Add" dot). Do not add a 6th dot.
- **D-06:** File-size copy = 5 MB (real enforced limit). Current `image-validation.ts:28` already says `"under 5MB"`. Mock board's "under 10 MB" is a placeholder — ignore it.
- **D-07:** Mode label is **"From an image"** (replacing current code's **"From image"** in `new-card-mode-toggle.tsx`). This is the primary L-06 e2e selector change.

### Carried-forward locks (Phases 19-21)
- **L-01:** Leo (LionFace), not tiger; no emoji. LangChip text chips for context line + deck rows.
- **L-02:** Behavior preserved, surface only. Sanctioned behavior touch: D-03 one-line guard only.
- **L-06:** Audit e2e/*.spec.ts for literal-text Playwright locators before restyling. Retarget to role+accessible-name or data-testid. Add changed specs to plan's `files_modified`.

### Claude's Discretion
- Exact Daybreak token values, spacing, radii, prop shapes, file layout, component decomposition.
- Whether new atoms (segmented toggle, stepper, drop zone, calm-progress, review row, pair row, result card) become shared `daybreak/*` primitives or page-local components.
- The type-a-word "saved — add another" rhythm (banner + form clear + focus return).
- Pick → stepper as in-page conditional render (preserve single-page `/deck/new-card`; no new routes).
- Drop-zone responsive treatment; result-screen partial/all-failed layout copy mapping.

### Deferred Ideas (OUT OF SCOPE)
- True abort-the-AI-call extraction Cancel (AbortController wired to button + `EXTRACT_CANCEL`).
- Live camera capture / multi-image batch upload (project-level IMG-F1/IMG-F2 Out of Scope).
- Raising the file-size limit to 10 MB (non-Daybreak logic change, raise separately).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADC-01 | Single Add-a-Card destination with segmented toggle ("Type a word \| From an image"), persistent context line (EN → ES · saves to your Spanish deck), and "‹ My deck" escape | `new-card-mode-toggle.tsx` is the toggle wrapper; `ACTop`/`ACSeg`/`ACContext` atoms are the Daybreak replacements; `DeckSwitcher` (Phase 21) reused for D-02 full-width deck field |
| ADC-02 | Type-a-word with auto-translate shimmer, all states (empty/translating/translate-fail/save-fail/saved), Save locked until both filled | `translation-form.tsx` already implements all behavior via reducer; restyle only touches JSX surface |
| ADC-03 | From-an-image full stepper (Pick → Confirm+deck → Extracting → Review → Check → Result) with calm long-wait, cancelable extraction, editable keep/exclude, editable pairs, result outcomes; nothing saves until "Add N cards" | `image-upload-flow.tsx` + `review-list.tsx` own all behavior; D-03 one-line guard is the only behavior touch |
</phase_requirements>

---

## Summary

Phase 22 re-skins the existing, fully-working Add-a-Card destination to the Daybreak design system. Both the type-a-word flow and the from-an-image stepper are in production today at `/deck/new-card`, driven by three components that contain no presentational Daybreak code: `new-card-mode-toggle.tsx`, `translation-form.tsx`, and `image-upload-flow.tsx` (+ `review-list.tsx` for the review/translate/result steps). The extraction and translation pipelines are untouched. The research below grounds every CONTEXT claim in the live code, surfaces the exact e2e selector changes required, and maps what new Daybreak atoms need building vs. what already exists.

**Primary recommendation:** Plan in two waves — Wave 1 builds the new shared Daybreak atoms and Wave 2 applies them to the four restyle targets — so atoms are unit-tested before integration. The e2e retargets (L-06) must be batched with their restyled component in the same plan, not deferred.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth gate + deck/language loading | Server (RSC, `/deck/new-card/page.tsx`) | — | Already implemented; no change |
| Mode toggle + context line + "My deck" escape | Client component (`new-card-mode-toggle.tsx`) | — | `useState<"type"\|"image">` switch drives child mount |
| Type-a-word fields + auto-translate | Client component (`translation-form.tsx`) | API `/api/translate` | Debounced fetch, reducer-driven state |
| Image pick / confirm / extract | Client component (`image-upload-flow.tsx`) | API `/api/extract` (Claude vision) | Reducer, 35s AbortController, paste listener |
| Review / translate fan-out / commit | Client component (`review-list.tsx`) | API `/api/translate` + server action `saveImageCards` | Multi-step reducer, cancelled.current guard |
| Deck picker (full-width trigger, D-02) | Client component (`deck-switcher.tsx`) | `createDeck` server action | Already imported by `image-upload-flow.tsx`; only trigger presentation changes |
| Daybreak atoms (new) | Shared `src/components/daybreak/*` or page-local | — | Planner's discretion; recommendation below |

---

## Standard Stack

No new packages. This phase composes existing dependencies only.

| Library | Already installed | Purpose in this phase |
|---------|-------------------|----------------------|
| `motion/react` (framer-motion) | Yes (used in Phase 19/20/21) | Shimmer on translating field, indeterminate progress bar animation |
| Tailwind v4 + CSS vars | Yes | Daybreak semantic classes (`bg-background`, `text-primary`, `--db-*` vars) |
| `use-debounce` | Yes | Already used in `translation-form.tsx` for `translateFrom` |
| `zod` | Yes | Already used for `TranslationResponseSchema` in both form files |

**Installation:** Nothing to install.

---

## Package Legitimacy Audit

No new external packages are added in this phase. Section not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser entry: /deck/new-card
    │
    ▼
page.tsx (RSC) ─── getUserDecks + getUserNativeLanguage ──► Drizzle/DB
    │  0-deck → redirect /dashboard
    │
    ▼
NewCardModeToggle (Client)
    │
    ├─[mode="type"]──► TranslationForm (Client)
    │                       │
    │                       ├── debounced fetch ──► POST /api/translate (DeepL)
    │                       └── handleSave ─────► saveCard() server action
    │
    └─[mode="image"]─► ImageUploadFlow (Client)
                            │
                            ├─[step="pick"] ─────► ImageDropZone
                            │                        (click / drag / paste)
                            │
                            ├─[step="deck", idle]─► ACDeckSelect trigger
                            │                        ↕ DeckSwitcher popover
                            │                          └─ createDeck server action
                            │
                            ├─[extracting=true]──► POST /api/extract (Claude vision, 35s)
                            │                        └─ cancelled.current guard (D-03, NEW)
                            │
                            └─[extractWords set]─► ReviewList (Client)
                                                    │
                                                    ├── getSameLanguageDeckBackWords (dedupe)
                                                    ├── translateFanOut → POST /api/translate
                                                    │   └─ cancelled.current guard (existing)
                                                    └── commitReviewRows → saveImageCards
```

### Recommended Project Structure

The four restyle targets stay in-place. New Daybreak atoms are proposed as shared primitives:

```
src/components/
├── daybreak/
│   ├── lion-face.tsx         (exists)
│   ├── t-btn.tsx             (exists)
│   ├── t-field.tsx           (exists)
│   ├── pill.tsx              (exists)
│   ├── card.tsx              (exists)
│   ├── auth-card.tsx         (exists)
│   ├── ac-seg.tsx            (NEW — segmented toggle; Phase 23 Browse may reuse)
│   ├── ac-progress.tsx       (NEW — calm long-wait; shared for Extract + Translate steps)
│   ├── ac-review-row.tsx     (NEW — keep/exclude row; Phase 23 Browse word rows are similar)
│   ├── ac-pair-row.tsx       (NEW — translation pair row; potentially reusable)
│   └── ac-banner.tsx         (NEW — success/error banner; reused across type and result screens)
├── new-card-mode-toggle.tsx  (RESTYLE)
├── translation-form.tsx      (RESTYLE)
├── image-upload-flow.tsx     (RESTYLE + D-03 one-line guard)
├── image-drop-zone.tsx       (RESTYLE — ACDrop Daybreak styling)
├── review-list.tsx           (RESTYLE)
└── deck-switcher.tsx         (no change to component; new ACDeckSelect wrapper in image-upload-flow)
```

**On shared vs page-local:** `ACSeg` (segmented toggle) is worth sharing — Phase 23 Browse Words uses a CEFR level filter row that could share the same atom. `ACReviewRow` and `ACPairRow` are specific enough that page-local is fine, but the planner can promote if Browse rows are close. `ACProgress` is clearly shared (used in both Extracting and Translating steps). `ACBanner` maps cleanly to the existing TBtn/TField pattern and belongs in `daybreak/`.

### Established Patterns

**Daybreak token access pattern (VERIFIED: live code):**
```tsx
// Tailwind semantic classes for globally-set tokens
className="bg-background text-foreground text-primary"

// Inline styles for exact token values (used in daybreak/* atoms)
style={{ background: '#FFFBF4', border: '1.5px solid #EDDFC9', borderRadius: 12 }}

// CSS vars for button shadow
style={{ boxShadow: 'var(--db-btn-shadow)' }}
```

**Reducer-driven multi-step flows (VERIFIED: live code):**
```tsx
// Pattern: do NOT restructure reducers, restyle rendered surface per step
const [state, dispatch] = useReducer(imageFlowReducer, initialState);
if (state.extracting) { return <ACExtracting>; }
if (state.extractError) { return <ACError>; }
// ...etc
```

**Shimmer/pending field pattern (design contract → implementation):**
The `ACField` atom in `daybreak-addcard.jsx` shows:
```tsx
// pending state: amber background (#FFF8EC) + shimmer div + "Translating…" indicator
{pending
  ? <div className="ac-shimmer" style={{ height: 13, width: '62%', borderRadius: 7 }}></div>
  : <span ...>{value || placeholder}</span>}
```
In production React: replace the `ac-shimmer` CSS animation with a `motion/react` animated div or a Tailwind `animate-pulse` equivalent in the amber background field.

**Indeterminate progress bar pattern:**
```tsx
// ACProgress uses CSS animation class "ac-indeterminate" in the design prototype
// In production: use motion/react animate={{ x: ['-100%', '100%'] }} repeat(Infinity)
// or a Tailwind keyframe — pattern already established by Phase 19/20 spinner usage
```

### Anti-Patterns to Avoid

- **Restructuring reducers:** `imageFlowReducer` and `reviewListReducer` both have well-tested shapes. The restyle renders a new JSX surface per step; it does NOT reorganize the reducer's action types or state shape.
- **Adding `EXTRACT_CANCEL` to the reducer:** D-03 explicitly forbids it. The only addition is a `cancelled.current` ref check after `dispatch({ type: "EXTRACT_SUCCESS", ... })` resolves.
- **Changing ACPairRow orientation:** D-01 is intentional. ES (target) is the top field in `ACPairRow`; EN (native) is beneath. Do not correct.
- **Using 10 MB in copy:** D-06 is explicit. The file-size copy remains "under 5MB".
- **Breaking the DeckSwitcher popover logic:** D-02 only changes the trigger (pill → full-width `ACDeckSelect` row). The popover internals (`DeckSwitcher`) are untouched.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Indeterminate progress animation | Custom CSS keyframe loop | `motion/react` animate loop (already installed) | Consistent with Phase 19/20 animation approach; reduced-motion gate available |
| Shimmer loading state | CSS-only animation | `motion/react` or `animate-pulse` Tailwind utility | Matches Phase 21 `HabitatMedallion` skeleton pattern |
| Deck picker popover | New popover component | `DeckSwitcher` (Phase 21, already imported by `image-upload-flow.tsx`) | Full-width trigger is the only change; popover logic is battle-tested |
| File validation | New validation logic | `validateImageFile()` from `src/lib/image-validation.ts` | Already handles type + size; produces the correct "under 5MB" copy |
| Translation cancel guard | Complex state machine | One-line `cancelled.current` ref check (D-03) | Pattern already in `review-list.tsx`; add it in `image-upload-flow.tsx` after EXTRACT_SUCCESS/EXTRACT_NO_WORDS/EXTRACT_ERROR dispatch |

---

## D-03 Cancelled Guard — Exact Pattern to Replicate

In `review-list.tsx` at line 451:
```tsx
const cancelled = useRef(false);
```

The translate-cancel guard appears at line 513 (inside `handleNext()`):
```tsx
const fanOutResults = await runTranslationFanOut(...);
if (cancelled.current) return;   // ← THIS IS THE GUARD
const completedRows = ...;
dispatch({ type: "TRANSLATE_ALL_DONE", rows: completedRows });
```

And in `handleCancel()` (line 491):
```tsx
function handleCancel() {
  cancelled.current = true;
  onCancel();
}
```

**For D-03 in `image-upload-flow.tsx`:** Add the same pattern. A `cancelled` ref is set to `true` when the Cancel button fires (dispatching `BACK_TO_PICK` to return to Confirm). In `handleExtract()`, after the `try/catch` resolves (i.e., after the `if (res.ok)` branch or the `catch` branch), add:
```tsx
if (cancelled.current) return;  // ← one-line guard; late result is ignored
dispatch({ type: "EXTRACT_SUCCESS", words: data.words });
// or dispatch({ type: "EXTRACT_ERROR", ... })
```

The reducer's `EXTRACT_RETRY` and `EXTRACT_NO_WORDS` actions are already present. **Do not add** `EXTRACT_CANCEL`. The Cancel button dispatches `BACK_TO_PICK` and sets `cancelled.current = true`.

**D-16 preservation is already correct (VERIFIED: live code):** `EXTRACT_RETRY` in the reducer (line 102–108) explicitly does NOT touch `file`, `previewUrl`, or `selectedDeckId`. The comment at line 101 reads: `// file / previewUrl / selectedDeckId are NOT touched — D-16 preservation`. So on Cancel → back to Confirm, the image thumbnail and selected deck are intact. No new reducer work needed.

---

## Current File State vs. CONTEXT Claims (Verified)

### `src/app/(protected)/deck/new-card/page.tsx` [VERIFIED: live code read]
CONTEXT is accurate. The file:
- Is an `async` server component (RSC-safe, no `"use client"`)
- Calls `getUserDecks(session.user.id)` and `getUserNativeLanguage(session.user.id)` in `Promise.all`
- Redirects to `/dashboard` (not `/welcome`) when `decks.length === 0`
- Passes `?deck=` param via `searchParams: Promise<{ deck?: string }>` (Next.js 16 async searchParams)
- Wraps everything in `<div className="min-h-screen bg-background">` — **this is the wrapper to replace with the Daybreak full-bleed shell**
- Renders `<NewCardModeToggle>` with all required props: `decks`, `activeDeckId`, `nativeLang`, `nativeLangLabel`, `targetLangLabel`, `targetLang`

**Restyle scope:** Replace the outer div + main wrapper with the Daybreak background/shell. No prop or behavior change.

### `src/components/new-card-mode-toggle.tsx` [VERIFIED: live code read]
CONTEXT is accurate. The file:
- Has `"use client"` and `useState<"type" | "image">("type")`
- Uses two shadcn `<Button variant={...}>` elements with labels **"Type a word"** and **"From image"** (exact current copy — `"From image"` is the D-07 change target)
- Renders `<TranslationForm>` or `<ImageUploadFlow>` based on mode
- Has NO Daybreak code — completely pre-restyle

**Restyle scope:** Replace both `<Button>` elements with the `ACSeg` Daybreak segmented toggle; add `ACContext` (context line) and `ACTop` ("‹ My deck" link + "Add a Card" title). Change label **"From image"** to **"From an image"** (D-07).

### `src/components/translation-form.tsx` [VERIFIED: live code read]
CONTEXT is accurate. The file:
- Has `"use client"` + full reducer (`FormAction` / `FormState`)
- Bidirectional auto-translate: `translateFrom(text, direction)` called from `handleNativeChange` and `handleTargetChange` after debounce (500ms via `use-debounce`)
- Active-field tracking via `activeField.current` ref (guards stale translation results)
- Save locked when `!nativeText.trim() || !targetText.trim() || isSaving`
- Has a "Card saved." success message (exact current copy — restyle to `"Card saved — add another."`)
- Has a save error: "Couldn't save card. Try again." (exact current copy — matching the mock's banner)
- Translation error: "Translation unavailable. Enter manually." (exact current copy — Daybreak version adds ` —` em dash before "enter manually")
- Has shadcn `<Input>`, `<Label>`, `<Button>` — NO Daybreak primitives yet
- Back link: `<Link href="/dashboard">` with `<ArrowLeft>` lucide icon — replace with `ACTop` in the wrapper

**Current copy strings to change:**
| Location | Current | Daybreak target |
|----------|---------|-----------------|
| `saveSuccess` paragraph | `"Card saved."` | `"Card saved — add another."` (ACBanner kind="ok") |
| `translationError` dispatch | `"Translation unavailable. Enter manually."` | `"Translation unavailable — enter manually."` (ACField error prop) |
| Button label | `"Save card"` | `"Save card"` (keep) — but render as `ACBtn` |
| Helper text | `"Save unlocks once both sides are filled."` | Same copy, rendered as muted caption |

**Note on helper text:** The current code renders save error and success as `<p>` elements below the button. The Daybreak mock (`ACTypeScreen`) shows the "Card saved" as an `ACBanner` ABOVE the fields. The plan must explicitly note this layout change.

### `src/components/image-upload-flow.tsx` [VERIFIED: live code read]
CONTEXT is accurate with one important nuance:

**Reducer steps:** The reducer has `step: "pick" | "deck"` (not a 6-step stepper). The 5-dot stepper is a DISPLAY concern only — the reducer step `"deck"` covers Confirm, Extracting, No-words, Error, and (via ReviewList) the entire Review/Check/Result flow. The step transitions are:
- `"pick"` → `ADVANCE_STEP` → `"deck"` (user has picked a file)
- From `"deck"`: `extracting: true/false`, `extractError`, `extractWords` drive which sub-state renders
- `BACK_TO_PICK` returns to `"deck"` step with `step: "pick"`
- `CLEAR_FILE` returns to `"pick"` with `file: null`

**The current image flow does NOT have a separate "preview-then-confirm" structure.** When a file is picked, the component renders an `<img>` preview + "Next: choose deck" button (still in step `"pick"`). Clicking "Next: choose deck" dispatches `ADVANCE_STEP` → `step: "deck"`, which renders the deck selector idle state. The Daybreak re-skin must map these to the mock's Pick → Confirm visual distinction while keeping the two-step reducer.

**AbortController (VERIFIED: line 225-226):**
```tsx
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 35_000);
```
This is the 35s client-side timeout that D-03 says NOT to wire to the Cancel button. It stays exactly as-is.

**`cancelled.current` is NOT yet in `image-upload-flow.tsx`** — this is the one new line added per D-03. Confirm: `cancelled` ref does not appear in the current file.

**D-16 preservation comment (VERIFIED: line 101):**
```tsx
// file / previewUrl / selectedDeckId are NOT touched — D-16 preservation
case "EXTRACT_RETRY":
  return { ...state, extracting: true, extractError: null, extractWords: null };
```

**ImageDropZone is a separate component** (`src/components/image-drop-zone.tsx`). It has its own copy that will change:
- Current: `"Drop an image here"` / `"or click to browse, or paste a screenshot (Ctrl+V)"`
- Daybreak target: `ACDrop` renders `"Upload a Photo"` / `"or browse your files · paste a screenshot"` (Mac: `⌘V`; cross-platform: consider `Ctrl+V`)
- The `ImageDropZone` component will be **restyled to the `ACDrop` Daybreak visual** (dashed border, amber drag-over state, ACUpload glyph)

### `src/components/review-list.tsx` [VERIFIED: live code read]
CONTEXT is accurate. Key facts:
- `cancelled.current` is declared at line 451 and is the exact D-03 model
- Step machine: `"loading-dedupe"` → `"step-a"` → `"translating"` → `"step-b"` → `"committing"` → `"success"`
- `handleCancel()` at line 490: sets `cancelled.current = true` then calls `onCancel()`
- The "translating" render (line 588-603) has a `<Button variant="ghost">Cancel</Button>` — this is the one that gets the `ACProgress` + Daybreak Cancel button restyle
- The `AlreadyLearnedRow` component (line 366) renders `line-through` muted text — maps to `ACReview`'s "Already in your deck · skipped" chip group
- The "step-a" (Review) render has "Select all" / "Select none" as `<Button variant="ghost">` — map to the `ACReview` link-style controls
- **"Next: translate" is the current button text** for the "Translate N words" action — change to **"Translate N words"** (with count and right chevron icon per the mock)
- **"step-b" shows "Check translations"** as a `<p>` — the `ACCheck` board shows this as a Baloo 2 display heading
- Current `ReviewTranslationRow` renders native field FIRST (top), target SECOND (bottom) — must flip to ES (target) on top, EN (native) beneath per D-01 `ACPairRow`
- The "success" render uses `<CheckCircle2>` lucide icon + plain text — replace with `LionFace` disc + `ACResultSuccess`/`ACResultPartial` layout
- `handleGoToDeck()` routes to `/dashboard?deck=${deckId}` — preserve unchanged

### `src/components/deck-switcher.tsx` [VERIFIED: live code read]
CONTEXT is accurate. The `DeckSwitcher` component:
- Is already Daybreak-styled internally (uses inline styles with Daybreak tokens — `#FFF1DC`, `#B4762A`, `#F28A1F`, `#4A331C`)
- Its `PopoverTrigger` (the current trigger) is a compact pill (36px height, `LangChip + Chevron`)
- For D-02: the `ACDeckSelect` full-width row becomes a NEW wrapper/trigger component that opens the existing `DeckSwitcher` popover. The cleanest approach is to extract the popover content into a separate component or pass a custom trigger to `DeckSwitcher` — the planner should decide the prop interface.
- `data-testid="deck-picker-trigger"` is on the current compact pill trigger — this is NOT on the new full-width `ACDeckSelect` row (the testid would move to the new trigger, or the planner adds a new testid)

**Existing `DeckSwitcher` props (VERIFIED):**
```tsx
interface DeckSwitcherProps {
  decks: DeckOption[];
  activeDeckId: string | null;
  onDeckChange: (id: string) => void;
  nativeLang: string;
}
```
The full-width `ACDeckSelect` wrapper needs these same props.

---

## e2e Selector Audit (L-06) — Complete Findings

### Environment facts [VERIFIED: playwright.config.ts]
- `webServer: undefined` — dev server at :3000 MUST be running before any e2e run
- `baseURL: "http://localhost:3000"`
- `timeout: 180_000` (180s per test — accommodates Turbopack cold compilation)
- Two projects: `"web"` (1280×800 Chromium) and `"mobile"` (Pixel 7 Chromium)

### At-risk locators by file

#### `e2e/04-manual-card-entry.spec.ts` — MUST UPDATE [VERIFIED: line-by-line read]

| Line | Current locator | Change trigger | Retarget |
|------|-----------------|---------------|----------|
| 13 | `page.getByText("Add a Card")` | Title may become Baloo 2 display text in `ACTop` rather than a plain `<h1>` | Add `data-testid="add-card-title"` to the heading in `ACTop` or keep as accessible heading — `getByRole("heading", { name: "Add a Card" })` if it stays an `<h1>` |
| 17, 49, 60 | `page.getByRole("button", { name: "Save card" })` | Copy stays "Save card" but element becomes `ACBtn` — should stay `<button>`, so role+name still works. Verify `ACBtn` renders as `<button>` | No change needed IF `ACBtn` is a `<button>` (confirmed in design prototype as a `<div>` — production must use `<button>`) |
| 51 | `page.getByText("Card saved")` | New copy is `"Card saved — add another."` | Update to `page.getByText(/Card saved/)` or `getByText("Card saved — add another.")` |

**Note on "Save card" locator:** The design's `ACBtn` uses a `<div>` — in production, use `<button>` (accessibility + Playwright `getByRole` requires a real button). If the executor uses `<button>`, the locator `getByRole("button", { name: "Save card" })` continues to work.

#### `e2e/11-phase9-image-upload.spec.ts` — MUST UPDATE [VERIFIED: line-by-line read]

| Line | Current locator | Change trigger | Retarget |
|------|-----------------|---------------|----------|
| 21 | `page.getByRole("button", { name: "Type a word" })` | ACSeg is likely a `<button>` or `<div role="button">` — accessible name must remain "Type a word" | Keep role+name if `ACSeg` has a `<button>` per segment; or add `aria-label="Type a word"` to the segment div |
| 22 | `page.getByRole("button", { name: "From image" })` | **CHANGE:** label becomes "From an image" (D-07) | `page.getByRole("button", { name: "From an image" })` |
| 27, 31, 73 | `page.getByText("Drop an image here")` | ACDrop shows "Upload a Photo" as the heading | `page.getByText("Upload a Photo")` or add `data-testid="drop-zone-heading"` |
| 33 | `page.getByText("or click to browse, or paste a screenshot (Ctrl+V)")` | ACDrop copy changes | `page.getByText(/browse your files/)` (partial match; more robust to minor wording changes) |
| 44 | `page.getByText(/JPG, PNG, or WebP only/i)` | File error copy format changes — current `image-validation.ts:21` uses "JPG, PNG, or WebP only — that file is a ..." | This regex still matches. No change needed if copy is preserved. But if the error is now shown inside `ACDrop` with different phrasing, update accordingly. **Recommendation:** add `data-testid="file-error"` to the error element |
| 53 | `page.getByText(/please pick one under 5MB/i)` | Size error copy from `image-validation.ts:28` is `"...please pick one under 5MB."` | Still matches. No change needed IF the error display location is preserved. Recommend `data-testid="file-size-error"` |
| 64 | `expect(preview).toHaveClass(/max-h-64/)` | Daybreak thumbnail (`ACThumb`) uses inline styles, not Tailwind classes | **BREAKING** — remove class assertion; replace with structural assertion. E.g., `expect(preview).toBeVisible()` only, or assert `data-testid="image-preview"` |
| 66 | `page.getByRole("button", { name: "Choose different image" })` | Confirm step has "Change image" (ACConfirm mock) | Update to `page.getByRole("button", { name: "Change image" })` |
| 68, 87, 100 | `page.getByRole("button", { name: "Next: choose deck" })` | **REMOVED** — this button disappears; user picks file → ACDrop auto-advances OR there is now a separate "Extract words" button on Confirm | The new flow has "Extract words" on the Confirm screen; "Next: choose deck" no longer exists. Retarget to `page.getByRole("button", { name: "Extract words" })` for step 7. For step 5 (after valid file picked), the equivalent is now that the Confirm screen renders with `ACThumb`. |
| 72 | `page.getByRole("button", { name: "Remove selected image" })` | Confirm step has "Remove" button (ACConfirm mock shows `ACBtn label="Remove" kind="ghost"`) | Update to `page.getByRole("button", { name: "Remove" })` OR add `aria-label="Remove selected image"` to the button |
| 88 | `page.getByText("Add words to:")` | ACDeckSelect has label `"Add words to"` (no colon in mock) | Update to `page.getByText("Add words to")` |
| 90 | `page.getByRole("button", { name: "Extract words" })` | "Extract words" stays — ACConfirm uses this label | No change needed |
| 97 | `page.getByRole("button", { name: "Back" })` | Confirm screen Back button shows in `ACFlowTop` as "Re-pick" | Update to `page.getByRole("button", { name: "Re-pick" })` OR use `getByText("Re-pick")` |

**Structural flow change:** The current spec step flow is: pick file → "Next: choose deck" button → step 2 (deck + Extract). In the Daybreak flow, picking a file → immediately shows the Confirm screen (`ACConfirm`) with the ACThumb thumbnail. There is no intermediate "Next: choose deck" step — the ACDrop advances directly. The spec's step 5 assertions about the "Next: choose deck" button need to be rewritten as assertions about the Confirm screen appearing.

#### `e2e/09-language-breakdown.spec.ts` — REVIEW [VERIFIED: relevant lines read]

| Line | Current locator | Risk | Action |
|------|-----------------|------|--------|
| 29 | `page.getByRole("link", { name: "Add a card" })` | Dashboard "Add a card" link — survives if Phase 22 doesn't change the dashboard action line (it doesn't — Phase 21 owns that) | No change |
| 31 | `page.getByText("Add a Card")` | Same as 04-spec line 13 — the page title | Add `data-testid="add-card-title"` in `ACTop` for robustness |

#### `e2e/10-mobile-responsive.spec.ts` — REVIEW [VERIFIED: relevant lines read]

| Line | Current locator | Risk | Action |
|------|-----------------|------|--------|
| 111 | `page.getByRole("link", { name: "Add a card" })` | Dashboard link — survives | No change |
| 114 | `page.getByLabel("English")` | The English field label in `TranslationForm` — `ACField` uses `<label>` associated to input | Survives if `ACField`'s label prop (`"English"`) generates a `<label>` with correct `htmlFor` — it does per the TField pattern |
| 115 | `page.getByLabel("French")` | Same as above | Survives |

#### Other specs — NOT at risk [VERIFIED]

- `e2e/04-manual-card-entry.spec.ts` line 35: `page.getByText("Translation unavailable")` — partial match, survives the em-dash change
- `e2e/02-first-visit-deck-creation.spec.ts`: "Add a card" link locators survive (dashboard link unchanged)
- `e2e/08-deck-switching.spec.ts`: `deck-picker-trigger` and `deck-option-*` testids — in `DeckSwitcher` which is not restyled; survive

### Strict-mode multi-match risks

- `page.getByText("Add a Card")` — unique on the page (the title in `ACTop`); low risk
- `page.getByRole("button", { name: "Cancel" })` — NOT currently in any spec, but if added: the segmented toggle Cancel and the stepper Cancel are different. Use `ACFlowTop` testid scoping.
- `page.getByLabel("English")` appears in both `04-manual-card-entry.spec.ts` and `10-mobile-responsive.spec.ts` — these tests visit different pages so no within-test multi-match.

---

## Pipelines to Preserve (Unchanged)

### `POST /api/translate` [VERIFIED: translation-form.tsx + review-list.tsx]
- Called from `translateFrom()` in `translation-form.tsx` (debounced, 500ms)
- Called from `runTranslationFanOut()` in `review-list.tsx` (parallel `Promise.allSettled`)
- Request shape: `{ text, sourceLang, targetLang }`
- Response shape: `{ translation: string }` (validated via `TranslationResponseSchema`)
- **Do not touch.**

### `POST /api/extract` [VERIFIED: extract/route.ts lines 1-100]
- Auth-gated, rate-limited (10 req/min)
- `maxDuration = 60` (Vercel route segment timeout — Next.js 16 required)
- Request: `{ image: base64DataUrl, mimeType, deckId, targetLanguage }`
- Magic-byte validation: JPEG (`0xFF 0xD8 0xFF`), PNG (`0x89 0x50 0x4E 0x47`), WebP (RIFF+WEBP subtype at bytes 8-11)
- Server-side size limit: `MAX_SERVER_IMAGE_BYTES = 7MB` (absorbs base64 overhead above client 5MB cap)
- Client-side 35s AbortController (line 225-226 in `image-upload-flow.tsx`)
- Response: `{ words: string[], detectedLanguage?: string }` (validated by `ExtractionSchema`)
- **Do not touch.**

### `saveImageCards(deckId, rows)` [VERIFIED: review-list.tsx commitReviewRows]
- Called row-by-row in `commitReviewRows()`: `saveImageCards(deckId, [{ front: row.nativeText.trim(), back: row.word.trim() }])`
- Per-row tolerant: each row in its own try/catch; `addedCount`/`failedCount` tallied independently
- **Do not touch.**

### `createDeck(langCode)` [VERIFIED: deck-switcher.tsx line 137]
- Called inside `DeckSwitcher.handleCreateDeck()`; result `id` passed to `onDeckChange`
- **Do not touch.**

### `getUserDecks` / `getUserNativeLanguage` [VERIFIED: page.tsx lines 27-30]
- Called in `Promise.all` on the server component
- **Do not touch.**

---

## Daybreak Tokens — d1 Object [VERIFIED: hifi-daybreak.jsx]

```
bg: '#FFF6E9'         — app background (cream)
surface: '#FFFFFF'    — cards, fields
ink: '#4A331C'        — primary text (warm dark brown)
muted: '#9C8467'      — secondary text
primary: '#F28A1F'    — amber buttons, active, progress
link: '#C96F12'       — links, secondary accents
green: '#3E9B5F'      — success / added
red: '#DE5F4A'        — errors
pillBg: '#FFF1DC'     — tags, chips
pillText: '#B4762A'   — tag text
fieldBg: '#FFFBF4'    — input fill
fieldBorder: '1.5px solid #EDDFC9'
fieldRadius: 12
btnRadius: 14
cardRadius: 22
fontDisplay: 'Baloo 2'  (weight 700)
fontBody: 'Figtree'
lion: { mane: '#E8973B', face: '#FFD9A6', muzzle: '#FFF1DC', ink: '#4A331C' }
```

All tokens are already live in `src/app/globals.css` (Tailwind custom properties) from Phase 19. Inline-style usage in new atoms pulls these exact hex values.

---

## Existing Daybreak Primitives [VERIFIED: ls + read]

| File | Component | Phase 22 use |
|------|-----------|-------------|
| `daybreak/lion-face.tsx` | `LionFace` | ACProgress disc, ACNoWords disc, ACResultSuccess disc |
| `daybreak/t-btn.tsx` | `TBtn` | Base for `ACBtn` (or `ACBtn` is new; TBtn is `h-[50px]` fixed — ACBtn needs multiple sizes/kinds) |
| `daybreak/t-field.tsx` | `TField` | `ACField` extends this pattern (adds `pending` state + shimmer) |
| `daybreak/pill.tsx` | `Pill` | `LangChip` in `deck-switcher.tsx` is a local re-implementation; `Pill` is for tags |
| `daybreak/card.tsx` | `Card` | `ACResultPartial` card surface |
| `daybreak/auth-card.tsx` | `AuthCard` | Not reused in Add-a-Card |

**`LangChip`** is defined locally in `deck-switcher.tsx` (inline style, not from `daybreak/`) — `ACContext` needs the same `LangChip`. Options: (1) import from `deck-switcher.tsx` (already exported), (2) create a shared `daybreak/lang-chip.tsx`, (3) define locally in `new-card-mode-toggle.tsx`. The `deck-switcher.tsx` local version is not exported as a named export — the planner should extract it or re-implement.

**`TBtn` compatibility with `ACBtn`:** `TBtn` is always full-width, single style (primary, h-50px). `ACBtn` needs four variants: primary, disabled, ghost, ghost-danger, and variable heights (54px primary, 46px cancel, 42px secondary). Plan should either extend `TBtn` with variant props or build `ACBtn` as a new atom.

**NEW atoms needed (not yet in `daybreak/`):**

| Atom | Notes |
|------|-------|
| `ACSeg` | Segmented toggle; two segments with icon+label; amber pill background `#F4E7D2`; white active segment with shadow |
| `ACProgress` | LionFace in sunrise disc + indeterminate amber bar + title/sub; `searching` prop adds magnifier overlay |
| `ACReviewRow` | Checkbox (ACCheckBox) + word text + edit (pencil) + remove (X close) |
| `ACPairRow` | ES field on top (bold) + EN field beneath; `failed` state = red EN border + helper |
| `ACBanner` | Green (ok) or red (error) banner with circle icon + text |
| `ACBtn` | Multi-variant button: primary/disabled/ghost/ghost-danger; variable heights |

---

## Common Pitfalls

### Pitfall 1: ACSeg rendered as `<div>` instead of `<button>`
**What goes wrong:** Design prototype uses `<div>` for segments. Production must use `<button>` for Playwright `getByRole("button", ...)` to work.
**Why it happens:** Copy-paste from JSX prototype.
**How to avoid:** Each segment of `ACSeg` must be a `<button type="button">` with the accessible name matching the label text.
**Warning signs:** Playwright locator `getByRole("button", { name: "Type a word" })` returning 0 matches.

### Pitfall 2: `ACBtn` rendered as `<div>` instead of `<button>`
**What goes wrong:** `e2e/04-manual-card-entry.spec.ts` locates the Save button via `getByRole("button", { name: "Save card" })`. If `ACBtn` uses `<div>`, this fails.
**How to avoid:** All `ACBtn` variants must be `<button>` elements.

### Pitfall 3: `cancelled.current` not reset between retries
**What goes wrong:** If the user cancels extraction, sets `cancelled.current = true`, then tries again (by retrying from the Confirm screen), the guard will prevent the NEXT successful extraction from dispatching.
**How to avoid:** Reset `cancelled.current = false` when `EXTRACT_START` or `EXTRACT_RETRY` fires, or when the Confirm button is clicked again. The existing `review-list.tsx` avoids this by unmounting `ReviewList` on cancel (the `cancelled` ref is scoped to `ReviewList`'s lifecycle). For `image-upload-flow.tsx`, `cancelled` is scoped to the component lifetime — ensure `cancelled.current = false` is set before calling `handleExtract()`.

### Pitfall 4: `image-validation.ts` copy in e2e assertions
**What goes wrong:** `e2e/11-phase9-image-upload.spec.ts` lines 44 and 53 assert the exact validation error copy. This copy lives in `image-validation.ts` (which is NOT restyled) and passes through `dispatch({ type: "FILE_ERROR", message: r.message })`. If the re-skin moves the error display location (e.g., from below the drop zone to inside `ACDrop`), the locator may still match — but if the copy changes, specs break.
**How to avoid:** Keep `image-validation.ts` copy unchanged (it's pipeline, not surface). The `error` prop is passed to `ACDrop`; it renders the error string. D-06 says "under 5MB" is already correct in `image-validation.ts`.

### Pitfall 5: `max-h-64` class assertion in `e2e/11` line 64
**What goes wrong:** `expect(preview).toHaveClass(/max-h-64/)` asserts a Tailwind class that the current `<img>` has. After restyling, `ACThumb` uses inline styles and a fixed height (168px in the design). The `max-h-64` class will be gone.
**How to avoid:** Remove this assertion entirely, or replace with `toBeVisible()` + structural check. Optionally add `data-testid="image-preview"` to the thumbnail element.

### Pitfall 6: "Next: choose deck" flow restructuring
**What goes wrong:** The current flow is pick → preview (still step "pick") → "Next: choose deck" button → step "deck". The Daybreak flow is pick → ACDrop auto-advances to Confirm on file selection (no intermediate state). Several e2e assertions target the "Next: choose deck" button as the transition gate.
**How to avoid:** Decide explicitly whether "Next: choose deck" disappears entirely (auto-advance on pick) or is preserved. The mock's `ACPickScreen` does NOT show a "Next" button — file selection on `ACDrop` goes directly to Confirm. Update the spec to reflect this.

### Pitfall 7: `DeckSwitcher` trigger testid conflict
**What goes wrong:** `data-testid="deck-picker-trigger"` is on the current compact pill trigger in `DeckSwitcher`. After D-02 makes the trigger a full-width `ACDeckSelect` row in the Confirm step, `e2e/08-deck-switching.spec.ts` still uses this testid for the HEADER deck picker (Phase 21 — unchanged). The header deck picker is a different instance of `DeckSwitcher`. There is NO conflict — the header deck picker trigger keeps `data-testid="deck-picker-trigger"` and the new Confirm step `ACDeckSelect` trigger gets a different testid (e.g., `data-testid="confirm-deck-select"`).

---

## Code Examples

### ACSeg (segmented toggle) — from design contract
```tsx
// Source: design/handoff-daybreak/daybreak-addcard.jsx — ACSeg atom
// Production implementation must use <button> elements
export function ACSeg({ mode, onChange }: { mode: "type"|"image", onChange: (m: "type"|"image") => void }) {
  return (
    <div style={{ display: 'flex', gap: 5, padding: 5, background: '#F4E7D2', borderRadius: 14 }}>
      {(['type', 'image'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          style={{
            flex: 1, height: 44, borderRadius: 11,
            background: mode === m ? '#FFFFFF' : 'transparent',
            boxShadow: mode === m ? '0 2px 8px rgba(160,110,40,0.14)' : 'none',
            color: mode === m ? '#4A331C' : '#9C8467',
            fontWeight: 700, fontSize: 14.5,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          {/* icon + label */}
          {m === 'type' ? <PencilGlyph /> : <ACMiniImg />}
          {m === 'type' ? 'Type a word' : 'From an image'}
        </button>
      ))}
    </div>
  );
}
```

### ACProgress (calm long-wait) — from design contract
```tsx
// Source: design/handoff-daybreak/daybreak-addcard.jsx — ACProgress atom
// 'searching' prop adds magnifier overlay (used for Extracting screen only)
// Production: replace ac-indeterminate CSS class with motion/react animate
<div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 28, textAlign: 'center' }}>
  <div style={{ width: 116, height: 116, borderRadius: '50%', background: 'linear-gradient(180deg, #FFE7BC, #FFFDF8)', border: '1px solid #F0E3CF', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <LionFace size={62} mane="#E8973B" face="#FFD9A6" muzzle="#FFF1DC" ink="#4A331C" />
    {/* amber dot top-right */}
    <div style={{ position: 'absolute', right: 16, top: 14, width: 14, height: 14, borderRadius: '50%', background: '#FFC95C' }} />
  </div>
  <span style={{ fontFamily: "'Baloo 2'", fontSize: 23, fontWeight: 700, color: '#4A331C' }}>{title}</span>
  {/* indeterminate bar — use motion/react in production */}
  <div style={{ width: '74%', height: 12, borderRadius: 7, background: '#F1E6D2', overflow: 'hidden', position: 'relative' }}>
    <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
      style={{ position: 'absolute', top: 0, bottom: 0, width: '42%', borderRadius: 7, background: '#F28A1F' }} />
  </div>
  <span style={{ fontSize: 14.5, color: '#9C8467', lineHeight: 1.5, maxWidth: 280 }}>{sub}</span>
</div>
```

### D-03 cancelled guard (one-line addition to image-upload-flow.tsx)
```tsx
// Add at top of ImageUploadFlow component (alongside dropZoneRef):
const cancelled = useRef(false);

// In Cancel handler (new, triggered from ACExtracting Cancel button):
function handleCancelExtraction() {
  cancelled.current = true;
  dispatch({ type: "BACK_TO_PICK" });  // returns to Confirm with file+deck preserved
}

// In handleExtract(), after await fetch resolves:
if (res.ok) {
  const data = ...;
  if (cancelled.current) return;       // ← D-03 late-result guard
  if (data.words.length === 0) {
    dispatch({ type: "EXTRACT_NO_WORDS" });
  } else {
    dispatch({ type: "EXTRACT_SUCCESS", words: data.words });
  }
} else {
  // ...
  if (cancelled.current) return;       // ← also guard error path
  dispatch({ type: "EXTRACT_ERROR", ... });
}

// Also reset on retry:
function handleExtract() {
  cancelled.current = false;           // ← reset before each attempt
  dispatch({ type: "EXTRACT_START" });
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Shadcn `<Button>` + `<Input>` + `<Label>` | Daybreak atoms (`ACBtn`, `ACField`, `ACSeg`) with inline token styles | Warmer, cohesive UI; no behavior change |
| Lucide `<ImageOff>` for no-words empty state | `LionFace` in a sunrise disc | On-brand; same "nothing found" semantic |
| `<CheckCircle2>` + plain text for success | `LionFace` + "N cards added!" + Baloo 2 display heading | Celebratory, branded |
| `animate-pulse` bg shimmer on translating field | ACField `pending` state: amber bg + shimmer div + "Translating…" inline indicator | More informative; shows direction |

---

## Next.js Version Constraint

**Installed version: Next.js 16.2.1** [VERIFIED: `node_modules/next/package.json`]

Per `AGENTS.md` (via `CLAUDE.md`): "This is NOT the Next.js you know… read the relevant guide in `node_modules/next/dist/docs/` before writing any code."

**Local docs available at:** `node_modules/next/dist/docs/01-app/` (App Router docs)

Relevant to this phase:
- `searchParams` in `page.tsx` is typed as `Promise<{ deck?: string }>` (Next.js 16 async params — already correct in current code)
- Any new route handler added (none planned for Phase 22) must declare `maxDuration` explicitly
- The `"use client"` boundary is on `NewCardModeToggle` — `page.tsx` stays a server component

**Executor instruction:** Before writing any Next.js-specific code (server components, route handlers, `headers()`, `redirect()`), consult `node_modules/next/dist/docs/` for the v16.x API. Do not rely on training-data knowledge of Next.js APIs.

---

## Validation Architecture

**Nyquist validation is enabled** (no `workflow.nyquist_validation: false` in config).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (e2e) + Vitest (unit) |
| e2e config | `playwright.config.ts` — `webServer: undefined`, baseURL :3000 |
| Unit config | `vitest.config.ts` (Phase 19 established; jsdom env, @testing-library/react) |
| e2e run | `npx playwright test --project=web e2e/04-manual-card-entry.spec.ts e2e/11-phase9-image-upload.spec.ts` |
| Full e2e suite | `npx playwright test --project=web` (dev server must be running) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| ADC-01 | Toggle renders with correct labels; "My deck" escape navigates to dashboard; context line visible | e2e | `npx playwright test --project=web e2e/11-phase9-image-upload.spec.ts` (covers toggle) |
| ADC-01 | "From an image" label (D-07) present | e2e | `e2e/11-phase9-image-upload.spec.ts` (after retarget) |
| ADC-02 | Save button disabled when empty; enabled when both filled; "Card saved — add another." on success | e2e | `npx playwright test --project=web e2e/04-manual-card-entry.spec.ts` |
| ADC-02 | Auto-translate fires and fills field OR shows error | e2e | `e2e/04-manual-card-entry.spec.ts` test 2 |
| ADC-03 | File pick → Confirm screen shows thumbnail + ACDeckSelect + Extract words | e2e | `e2e/11-phase9-image-upload.spec.ts` (after retarget) |
| ADC-03 | Cancel on Extracting returns to Confirm with image preserved | e2e (new test) | New test in `e2e/11-phase9-image-upload.spec.ts` or new spec |
| ADC-03 | "Add N cards" commit → result screen shows count | e2e (integration, needs live API keys) | Manual UAT |

### Existing Specs to Keep Green
All specs must pass unchanged after retargeting:
- `e2e/04-manual-card-entry.spec.ts` — retarget "Save card" button (if rendered as `<button>`, survives), "Card saved" text, "Add a Card" title
- `e2e/11-phase9-image-upload.spec.ts` — most locators change; full retarget required (see L-06 audit above)
- `e2e/09-language-breakdown.spec.ts` — `getByText("Add a Card")` — low risk; add testid
- `e2e/10-mobile-responsive.spec.ts` — `getByLabel("English")` / `getByLabel("French")` — survive if ACField uses proper label/htmlFor

### Wave 0 Gaps
The following are new tests that need writing:

- [ ] `e2e/11-phase9-image-upload.spec.ts` — retarget all broken locators (see L-06 audit)
- [ ] New test: Cancel on Extracting screen → returns to Confirm with image + deck preserved (D-03 behaviour verification)
- [ ] New test: "From an image" label visible after toggle switch (D-07 regression guard)

**No new unit test files needed** for the re-skin itself. Unit tests for `reviewListReducer` and `imageFlowReducer` already exist (they test behavior, not presentation). The one-line D-03 guard addition to `image-upload-flow.tsx` should have a unit test for the `cancelled.current` guard logic.

### Sampling Rate
- **Per task commit:** `npx playwright test --project=web e2e/04-manual-card-entry.spec.ts` (< 60s)
- **Per wave merge:** `npx playwright test --project=web e2e/04-manual-card-entry.spec.ts e2e/11-phase9-image-upload.spec.ts e2e/09-language-breakdown.spec.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

---

## Security Domain

This phase makes no changes to server-side logic. All API routes (`/api/translate`, `/api/extract`) are preserved exactly. Auth gates, rate limiters, magic-byte validation, and input schemas are untouched. No new ASVS surface is introduced.

| ASVS Category | Applies | Note |
|---------------|---------|------|
| V2 Authentication | Preserved unchanged | Auth gate in `page.tsx` and both API routes |
| V5 Input Validation | Preserved unchanged | `validateImageFile()`, `RequestSchema`, `ExtractionSchema` all untouched |
| V6 Cryptography | N/A | No new crypto |

---

## Environment Availability

No new external dependencies. Dev server at :3000 required for e2e.

| Dependency | Required By | Available | Notes |
|------------|-------------|-----------|-------|
| Node.js / Next.js dev server | All e2e | Assumed available | `webServer: undefined` — must be started manually before e2e |
| DeepL API key | Auto-translate in e2e test 2 | Unknown | Test 2 in `04-manual-card-entry.spec.ts` is written to pass with OR without a working key |
| Anthropic API key | Extraction e2e | Unknown | Phase 10 territory; Phase 22 e2e does not call Extract (stops at "Extract words" button) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ACSeg` segments should be `<button>` elements for Playwright `getByRole` | e2e Audit + Code Examples | If rendered as non-interactive divs, e2e locators break and accessibility fails |
| A2 | `ACBtn` should be a `<button>` element in all variants | Code Examples | Same as A1 — e2e Save button locator breaks |
| A3 | The `cancelled` ref must also be reset to `false` before each `handleExtract()` call | D-03 Code Example | If not reset, a user who cancels then retries will have their retry result silently swallowed |

**If this table is empty of high-risk items:** the three assumptions above are implementation-level (not factual claims) and can be resolved by the executor without user confirmation.

---

## Sources

### Primary (HIGH confidence)
- `src/app/(protected)/deck/new-card/page.tsx` — server entry verified line-by-line
- `src/components/new-card-mode-toggle.tsx` — exact copy strings and component structure verified
- `src/components/translation-form.tsx` — reducer, debounce, copy strings all verified
- `src/components/image-upload-flow.tsx` — reducer, AbortController (line 225-226), D-16 comment (line 101) all verified
- `src/components/review-list.tsx` — `cancelled.current` (line 451), guard pattern (line 513), all step renders verified
- `src/components/deck-switcher.tsx` — props interface, popover structure, `data-testid` attributes verified
- `src/components/daybreak/*` — all 6 existing primitives read and catalogued
- `src/components/image-drop-zone.tsx` — current copy strings verified
- `src/lib/image-validation.ts` / `image-constants.ts` — 5MB limit and error copy verified
- `src/app/api/extract/route.ts` — AbortController budget (35s client / 60s server), magic-byte checks verified
- `design/handoff-daybreak/daybreak-addcard.jsx` — all atom definitions read; `ACSeg`, `ACContext`, `ACTop`, `ACStepper`, `ACFlowTop`, `ACField`, `ACLinkBadge`, `ACBtn`, `ACDrop`, `ACThumb`, `ACDeckSelect`, `ACProgress`, `ACReviewRow`, `ACPairRow`, `ACBanner` all verified
- `design/handoff-daybreak/daybreak-addcard-boards.jsx` — all state boards read; copy strings extracted
- `design/handoff-daybreak/hifi-daybreak.jsx` — `d1` token object verified
- `design/handoff-daybreak/README.md` — design system spec verified
- `e2e/04-manual-card-entry.spec.ts` — every locator read line-by-line
- `e2e/11-phase9-image-upload.spec.ts` — every locator read line-by-line
- `e2e/09-language-breakdown.spec.ts`, `e2e/10-mobile-responsive.spec.ts` — relevant locators verified
- `playwright.config.ts` — `webServer: undefined`, baseURL :3000, timeout 180s verified
- `node_modules/next/package.json` — version 16.2.1 verified

### Secondary (MEDIUM confidence)
- Phase 21 deck-switcher pattern reuse for D-02 — established by CONTEXT.md, confirmed by live `DeckSwitcher` code showing it is already imported in `image-upload-flow.tsx`

---

## Metadata

**Confidence breakdown:**
- Current code state: HIGH — all components read directly
- Design contract: HIGH — all daybreak-addcard.jsx atoms read
- e2e selector audit: HIGH — every at-risk locator line-by-line verified with exact retarget suggestions
- D-03 implementation: HIGH — cancelled.current pattern directly verified in review-list.tsx

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (30 days; stable codebase)
