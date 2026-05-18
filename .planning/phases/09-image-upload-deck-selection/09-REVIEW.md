---
phase: 09-image-upload-deck-selection
reviewed: 2026-05-18T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/app/(protected)/deck/new-card/page.tsx
  - src/components/image-drop-zone.tsx
  - src/components/image-upload-flow.tsx
  - src/components/new-card-mode-toggle.tsx
  - src/lib/image-validation.ts
  - src/lib/image-validation.test.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-18
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 9 delivers client-side image upload (drop zone, paste, click-to-browse), validation, and deck selection, with the Extract button intentionally a no-op placeholder for Phase 10. The overall implementation is solid: the reducer pattern is clean, object URL lifecycle is managed correctly via a ref to avoid stale-closure leaks, and the validation library has good test coverage for both type and size checks.

Two warnings were found — one is a meaningful prop-duplication in the component interface that creates confusion and fragility, the other is a missing `e.preventDefault()` in the document-level paste handler that will cause unintended double-paste when text inputs are introduced in later phases. Three info items cover: MIME-type spoofability (expected for client-only validation, needs a Phase 10 note), a slightly misleading error message for extension-less filenames, and a defensive `src ?? ""` that produces a broken empty `src` on an edge transition.

No critical issues found.

---

## Warnings

### WR-01: Duplicate `activeDeckId` / `deckId` props create a fragile interface

**File:** `src/components/new-card-mode-toggle.tsx:9-17` and `src/app/(protected)/deck/new-card/page.tsx:49-57`

**Issue:** `NewCardModeToggleProps` declares two separate props — `activeDeckId: string` (line 12) and `deckId: string` (line 15) — that always carry the same value (`activeDeck.id` in the page, lines 51 and 55). Internally, `activeDeckId` feeds `ImageUploadFlow` and `deckId` feeds `TranslationForm`. This split is invisible to callers and means any future caller must supply the same value twice. If they ever diverge by mistake (e.g., a caller passes different IDs), the two modes will silently operate on different decks.

**Fix:** Merge to a single prop. Remove `activeDeckId` from the interface, rename `deckId` to `activeDeckId` (or vice-versa), and use it for both child components.

```tsx
// new-card-mode-toggle.tsx — collapsed to one prop
interface NewCardModeToggleProps {
  decks: DeckOption[];
  activeDeckId: string;   // ← single source of truth for the active deck
  nativeLang: string;
  nativeLangLabel: string;
  targetLangLabel: string;
  targetLang: string;
}

// Usage in page.tsx
<NewCardModeToggle
  decks={decks}
  activeDeckId={activeDeck.id}   // ← one prop, not two
  nativeLang={nativeLang}
  nativeLangLabel={nativeLangLabel}
  targetLangLabel={targetLangLabel}
  targetLang={activeDeck.language}
/>
```

---

### WR-02: Document-level paste handler does not call `e.preventDefault()` — will cause double-paste when text inputs are present

**File:** `src/components/image-upload-flow.tsx:131-137`

**Issue:** The `handlePaste` listener registered on `document` (line 131) processes `e.clipboardData?.files?.[0]` but never calls `e.preventDefault()`. In the current Phase 9 UI this is harmless because there are no focusable text inputs on the page when the drop zone is visible. However, Phase 10 will add extraction results and potentially editable fields to the same page. At that point, pasting an image while a text input is focused will both trigger `validateAndSetFile` AND insert clipboard text into the input, producing a confusing double-action.

**Fix:** Call `e.preventDefault()` only when the paste event contains a file, to suppress the default browser paste without breaking normal text-input paste elsewhere:

```ts
function handlePaste(e: ClipboardEvent) {
  const file = e.clipboardData?.files?.[0];
  if (file) {
    e.preventDefault();          // ← suppress browser default only for image paste
    validateAndSetFile(file);
  }
}
```

---

## Info

### IN-01: Client-side MIME-type check is spoofable — should be noted for Phase 10 server validation

**File:** `src/lib/image-validation.ts:9`

**Issue:** `validateImageFile` checks `file.type`, which is set by the browser based on file extension or OS MIME registry. A file can pass validation by being named `malicious.jpg` regardless of its actual content. This is expected and acceptable for a client-only guard, but there is no existing comment or TODO indicating that magic-byte validation must occur server-side before the file is processed.

**Fix:** Add a comment so Phase 10 does not accidentally skip the server-side check:

```ts
// NOTE: file.type is browser-supplied and can be spoofed by renaming.
// Phase 10 MUST validate magic bytes server-side before processing.
if (!ALLOWED_TYPES.has(file.type)) {
```

---

### IN-02: Extension-less filename produces a grammatically broken error message

**File:** `src/lib/image-validation.ts:10`

**Issue:** `file.name.split(".").pop()` returns the last segment of the filename. For a file with no extension (e.g., filename `"image"`) this returns `"image"` — the full name, not an extension — producing the message: _"JPG, PNG, or WebP only — that file is a IMAGE."_ The nullish coalescing default `"unknown format"` is never reached because `.pop()` on a single-segment array returns the segment, not `undefined`.

**Fix:** Check that the returned token is actually a suffix (i.e., the array had more than one segment):

```ts
const parts = file.name.split(".");
const ext =
  parts.length > 1
    ? (parts.pop()?.toUpperCase() ?? "unknown format")
    : "unknown format";
```

---

### IN-03: `src={state.previewUrl ?? ""}` renders a broken empty-`src` image on transitional states

**File:** `src/components/image-upload-flow.tsx:144` and `src/components/image-upload-flow.tsx:183`

**Issue:** Both `<img>` elements use `src={state.previewUrl ?? ""}`. In the `step === "deck"` branch the reducer guarantees `previewUrl` is non-null (it is set atomically with `file` in `FILE_PICKED`, and `ADVANCE_STEP` only advances when `file` is truthy). But in the `state.file` truthy branch (line 177), React state updates are asynchronous — there is a render window where `file` is non-null but `previewUrl` has been revoked (e.g., after `handleClearFile` dispatches `CLEAR_FILE` but before the component re-renders to the empty state). In practice the fallback `""` renders an empty broken image briefly. This is visually harmless but triggers a browser network request for the current page URL.

**Fix:** Conditionally render the `<img>` only when `previewUrl` is non-null, or use a non-empty placeholder:

```tsx
{state.previewUrl && (
  <img
    src={state.previewUrl}
    alt="Selected file"
    className="max-h-64 w-auto object-contain rounded-lg"
  />
)}
```

---

_Reviewed: 2026-05-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
