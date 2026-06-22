---
phase: 22-add-a-card
reviewed: 2026-06-22T23:03:26Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - e2e/04-manual-card-entry.spec.ts
  - e2e/09-language-breakdown.spec.ts
  - e2e/11-phase9-image-upload.spec.ts
  - src/app/(protected)/deck/new-card/page.tsx
  - src/components/__tests__/image-upload-flow-cancel.test.tsx
  - src/components/daybreak/__tests__/ac-atoms.test.tsx
  - src/components/daybreak/ac-banner.tsx
  - src/components/daybreak/ac-btn.tsx
  - src/components/daybreak/ac-context.tsx
  - src/components/daybreak/ac-deck-select.tsx
  - src/components/daybreak/ac-pair-row.tsx
  - src/components/daybreak/ac-progress.tsx
  - src/components/daybreak/ac-review-row.tsx
  - src/components/daybreak/ac-seg.tsx
  - src/components/daybreak/ac-stepper.tsx
  - src/components/daybreak/ac-top.tsx
  - src/components/daybreak/lang-chip.tsx
  - src/components/deck-switcher.tsx
  - src/components/image-drop-zone.tsx
  - src/components/image-upload-flow.tsx
  - src/components/new-card-mode-toggle.tsx
  - src/components/review-list.tsx
  - src/components/translation-form.tsx
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-06-22T23:03:26Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Phase 22 is billed as a pure presentational Daybreak re-skin of the Add-a-Card flow that MUST preserve behavior. The re-skin work itself is high quality: interactive atoms (`ACSeg`, `ACBtn`, `ACReviewRow`, `ACPairRow`) use real `<button>`/`<input>` elements with sensible `aria` attributes, no `dangerouslySetInnerHTML` / `eval` / injection vectors were introduced, all user content is rendered as React text nodes (auto-escaped), and the `image-upload-flow` reducer plus the D-03 `cancelled.current` guard are intact and well-tested at the reducer level. E2E selector retargets (D-07 labels, drop-zone copy, `confirm-deck-select`) line up with the validation message strings in `image-validation.ts`.

However, the phase is **not** behavior-preserving as claimed. A diff against the phase base (`d6335cc`) shows two real behavior changes smuggled into the "re-skin":

1. **Step A inline word editing was silently dropped** (BLOCKER). The baseline rendered an editable `<input>` per word in the Review step; the new `ACReviewRow` renders the word as a static `<span>` and wires the "Edit" pencil button to a no-op dispatch. Users can no longer correct an extracted word before translating.
2. A brand-new **swap feature** and **full-page-reload Cancel** navigation were added — net-new behavior, not restyling — and the Re-pick-during-extraction path is missing the cancel guard that the dedicated Cancel button has.

The dedicated `image-upload-flow-cancel.test.tsx` tests a *re-implementation* of the guard rather than the component, so it would not catch the unguarded Re-pick path. Recommend fixing CR-01 before ship; the warnings are correctness/robustness gaps worth addressing.

## Critical Issues

### CR-01: Step A "Edit word" is a no-op — inline word editing regressed

**File:** `src/components/review-list.tsx:815-831`, `src/components/daybreak/ac-review-row.tsx:96-198`

**Issue:** This is a behavior-preservation regression for a phase whose mandate is "preserve behavior." In the phase base (`d6335cc:src/components/review-list.tsx:337-346`), each word in the Review step rendered an editable `<input>` whose `onChange` called `onEdit(row.id, e.target.value)`, letting the user fix an OCR'd word before translation. The reskinned `ACReviewRow` now renders the word as a static, non-editable `<span>` (ac-review-row.tsx:143-153) and exposes only an "Edit" pencil **button**. In `review-list.tsx` that button is wired to:

```tsx
onEdit={() =>
  dispatch({
    type: "EDIT_WORD",
    id: row.id,
    word: row.word, // <-- dispatches the CURRENT, unchanged word
  })
}
```

Because it dispatches `EDIT_WORD` with the unchanged `row.word`, the reducer overwrites the word with itself — a guaranteed no-op. There is no text input, no `prompt()`, and no edit affordance anywhere in Step A, so the user has **no way to edit an extracted word's spelling** before it is translated and saved. The `reviewListReducer` `EDIT_WORD` case still works (and `review-list.test.ts:154` still passes because it tests the reducer directly), which is exactly why the regression slipped through — the broken wiring is in the component, not the reducer.

**Fix:** Restore an editable affordance in Step A. Minimal option: make `ACReviewRow` render the word in an `<input>` (matching the baseline) and pass the new value up. Wire it through the existing `EDIT_WORD` action:

```tsx
// ac-review-row.tsx — accept the new value
interface ACReviewRowProps {
  word: string;
  excluded: boolean;
  last?: boolean;
  onToggle: () => void;
  onEdit: (word: string) => void; // pass the edited text
  onRemove: () => void;
}
// ...render the word as an <input value={word} onChange={(e) => onEdit(e.target.value)} />
// styled to look like the static span until focused, OR keep the pencil button
// and open an inline editable input on click.

// review-list.tsx
<ACReviewRow
  // ...
  onEdit={(word) => dispatch({ type: "EDIT_WORD", id: row.id, word })}
/>
```

If a click-to-edit pencil is the intended UX, the pencil must toggle the span into a real input (or focus a hidden one) so a changed value can reach `EDIT_WORD`. Add a test that types a new value and asserts the row text changes, to lock the behavior.

## Warnings

### WR-01: Re-pick during extraction does not set the cancel guard or abort the fetch — late result can leak

**File:** `src/components/image-upload-flow.tsx:360-380` (Re-pick button), `image-upload-flow.tsx:228-240` (`handleClearFile` vs `handleCancelExtraction`)

**Issue:** On the Extracting surface there are two exits: **Cancel** (`handleCancelExtraction`, line 235) correctly sets `cancelled.current = true` so the D-03 late-result guards (`if (cancelled.current) return;` at lines 298/301/308/317) suppress a stale dispatch. **Re-pick** (line 362, `onClick={() => handleClearFile()}`) does **not** set `cancelled.current` and does **not** abort the in-flight `AbortController`. The original `handleExtract` promise keeps running with `cancelled.current === false`, so when it resolves it will dispatch `EXTRACT_SUCCESS` / `EXTRACT_NO_WORDS` / `EXTRACT_ERROR`. If the user re-picks a different image and returns to the Confirm (`step: "deck"`) surface before the abandoned request resolves, the late `EXTRACT_SUCCESS` will surface the *first* image's words against the *second* image — stale, incorrect results. It also leaves the original network request running for up to 35s.

**Fix:** Treat Re-pick the same way as Cancel — set the guard before clearing. Ideally also abort the request (hoist the `AbortController` into a ref so non-`handleExtract` handlers can abort it):

```tsx
function handleClearFile() {
  cancelled.current = true; // suppress any in-flight extraction result
  abortRef.current?.abort(); // optional: cancel the network request
  if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  dropZoneRef.current?.resetInput();
  dispatch({ type: "CLEAR_FILE" });
}
```

Note `handleExtract` already resets `cancelled.current = false` at its top (line 246) before each new attempt, so setting it here is safe for subsequent extractions.

### WR-02: Cancel navigates via `window.location.assign` — full page reload, inconsistent with codebase routing

**File:** `src/components/image-upload-flow.tsx:469`, `:564`, `:711`

**Issue:** The three "Cancel" buttons on the deck/error/no-words surfaces call `window.location.assign("/dashboard")`, forcing a full document reload. This is net-new navigation (the phase base had no such buttons) and diverges from the established client-side routing convention used in the sibling `review-list.tsx:448-450` (`router.push(\`/dashboard?deck=${deckId}\`)`). A hard reload discards the React tree, re-runs server components, refetches the session, and produces a visibly slower transition than the rest of the app. It also abandons the in-flight extraction without aborting it (related to WR-01).

**Fix:** Use the Next.js client router for consistency and to avoid the reload:

```tsx
import { useRouter } from "next/navigation";
// inside the component:
const router = useRouter();
// ...
onClick={() => router.push("/dashboard")}
```

### WR-03: `image-upload-flow-cancel.test.tsx` tests a re-implementation of the guard, not the component

**File:** `src/components/__tests__/image-upload-flow-cancel.test.tsx:78-129`

**Issue:** The file's header comment claims it verifies "the D-03 cancelled.current guard" for `image-upload-flow.tsx`, but the guard tests (lines 88-129) exercise local `shouldIgnoreResult` / `resetCancelledGuard` helpers defined *inside the test file* — a copy of the pattern, not the component's actual `handleExtract` / `handleClearFile` wiring. The component is never rendered for the guard assertions; only the reducer is. Consequently this suite cannot detect real wiring regressions such as WR-01 (Re-pick not setting the guard) or a future refactor that forgets a `cancelled.current` check on one of the four return sites. It provides false confidence that the live guard is covered.

**Fix:** Add an integration test that renders `ImageUploadFlow`, mocks `fetch` to a controllable deferred promise, drives the UI to the Extracting state, clicks **Cancel** (and separately **Re-pick**), resolves the deferred fetch, and asserts no success/words leak into the Confirm surface. Keep the pure-helper tests, but rename the suite so it does not claim component coverage it does not have.

### WR-04: `ACBanner` and result-card status icons rely on bare glyphs with no accessible text

**File:** `src/components/daybreak/ac-banner.tsx:26-42`, `src/components/review-list.tsx:630-646`, `:692-708`

**Issue:** The status indicators render the literal characters `✓` / `!` / `-` inside decorative circles with no `aria-hidden` and no accompanying screen-reader label. For `ACBanner` the adjacent text usually conveys meaning, but the glyph itself is announced as raw punctuation ("exclamation mark") which is noise. In the partial-result card (review-list.tsx:630-711) the colored circles (`✓`, `-`, `!`) are the *only* visual distinction between "Added", "Already learned", and "Couldn't add" rows beyond the text label; the glyphs are announced inconsistently across screen readers. This is a minor a11y regression versus the lucide-icon baseline, which shipped icons that were already `aria-hidden` by convention.

**Fix:** Mark the purely decorative glyph spans `aria-hidden="true"` (the text label carries the meaning), e.g. in `ac-banner.tsx`:

```tsx
<span aria-hidden="true" style={{ /* circle */ }}>{ok ? "✓" : "!"}</span>
```

If the banner has no adjacent descriptive text in some call sites, add `role="status"` (ok) / `role="alert"` (error) on the banner container so the message is announced.

## Info

### IN-01: `EXTRACT_RETRY` action is dead in the production path

**File:** `src/components/image-upload-flow.tsx:56`, `:110-116`

**Issue:** `EXTRACT_RETRY` is defined in the action union and handled in the reducer (identical to `EXTRACT_START`), but no component code dispatches it — the "Try again" button (line 507) calls `handleExtract`, which dispatches `EXTRACT_START` (line 247). The action exists only to satisfy `image-upload-flow-cancel.test.tsx:152` and `extract-reducer.test.ts:78`. It is harmless but is dead production code that can drift from `EXTRACT_START` over time.

**Fix:** Either dispatch `EXTRACT_RETRY` from the "Try again" handler (so the name reflects intent and the test covers real usage), or remove the action and have the tests assert `EXTRACT_START` semantics directly. Do not leave two divergent-but-identical actions.

### IN-02: `EXTRACT_NO_WORDS` is redundant with the `extractWords: []` render branch

**File:** `src/components/image-upload-flow.tsx:101-102`, `:297-299`, `:518`

**Issue:** `EXTRACT_NO_WORDS` sets `extractWords: []`, and the "no words" surface is selected by `Array.isArray(state.extractWords) && state.extractWords.length === 0` (line 518). The success path could equally dispatch `EXTRACT_SUCCESS` with an empty array and hit the same branch. Two actions encode the same state transition, which is a minor smell. Not a bug — just extra surface area.

**Fix:** Optional consolidation: drop `EXTRACT_NO_WORDS` and always dispatch `EXTRACT_SUCCESS` with `data.words`; the `length === 0` branch already handles the empty case. Keeps one source of truth for "extraction finished."

### IN-03: `ACContext.toChipCode` produces wrong chips for multi-word or short language labels

**File:** `src/components/daybreak/ac-context.tsx:20-22`

**Issue:** `toChipCode` does `label.trim().slice(0, 2).toUpperCase()`. For the three current languages this yields EN / FR / SP — note "Spanish" maps to **"SP"**, whereas the rest of the app (deck-switcher, lang-chip usage) uses the BCP-47-derived **"ES"** chip. The header `DeckSwitcher` shows `ES` while this context line shows `SP` for the same Spanish deck, an inconsistency a user can see side-by-side. The function comment claims it handles "≤3 chars as-is" but the code never checks length. Purely cosmetic, but it is a visible inconsistency introduced this phase.

**Fix:** Drive the chip from the language code, not the label, mirroring `deck-switcher.tsx:138` (`activeDeck?.language.toUpperCase()`). Pass the BCP-47 code (`en`/`es`/`fr`) into `ACContext` and uppercase it, so Spanish renders `ES` everywhere.

### IN-04: `LeftChev` accepts `c`/`size` props that are never overridden

**File:** `src/components/image-upload-flow.tsx:157-172`

**Issue:** The `LeftChev` glyph component is parameterized (`c`, `size`) but every call site uses the defaults (`<LeftChev />`). Minor dead flexibility / unused-API smell consistent with the inline-glyph style used elsewhere. No correctness impact.

**Fix:** Inline the constants or drop the props until a second styling is actually needed. Low priority.

---

_Reviewed: 2026-06-22T23:03:26Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
