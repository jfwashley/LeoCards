---
phase: 09-image-upload-deck-selection
plan: "02"
subsystem: image-upload-ui
tags: [client-components, useReducer, file-api, drag-drop, deck-selection, image-preview]
dependency_graph:
  requires: ["09-01"]
  provides: [image-drop-zone, image-upload-flow, new-card-mode-toggle, new-card-page-mode-toggle-wired]
  affects: [new-card-page, deck-switcher]
tech_stack:
  added: []
  patterns: [useReducer-state-machine, forwardRef-useImperativeHandle, object-url-lifecycle, document-paste-listener]
key_files:
  created:
    - src/components/image-drop-zone.tsx
    - src/components/image-upload-flow.tsx
    - src/components/new-card-mode-toggle.tsx
  modified:
    - src/app/(protected)/deck/new-card/page.tsx
decisions:
  - "Used forwardRef + useImperativeHandle on ImageDropZone to expose openPicker/resetInput to ImageUploadFlow parent"
  - "Hidden drop zone kept mounted (CSS hidden) during previewing state so dropZoneRef stays valid for openPicker/resetInput"
  - "biome-ignore lint/performance/noImgElement added for both <img> uses; blob URLs are unsupported by next/image per RESEARCH.md Pitfall 5"
  - "biome-ignore lint/a11y/useSemanticElements added for drop zone div role=button; drag events require non-button element"
  - "Alt text changed from 'Selected image preview' to 'Selected file' to satisfy biome lint/a11y/noRedundantAlt"
metrics:
  duration: "~10 min"
  completed: "2026-05-18"
  tasks_completed: 3
  tasks_total: 4
  files_created: 3
  files_modified: 1
---

# Phase 09 Plan 02: Image Upload Flow UI Summary

**One-liner:** Client-side 2-step image picker (click/drag/paste + validation + object URL preview) wired into the add-card page behind a "Type a word" / "From image" mode toggle.

## What Was Built

Three new `"use client"` components implement the Phase 9 image-upload UI in full:

**ImageDropZone** (`src/components/image-drop-zone.tsx`)
- Hidden `<input type="file" accept="image/jpeg,image/png,image/webp">` with forwardRef handle exposing `openPicker()` and `resetInput()`
- Drop zone div with `role="button"`, `tabIndex={0}`, ARIA label, `onKeyDown` (Enter/Space), `onClick`, `onDragOver`, `onDragLeave`, `onDrop`
- `isDragOver` local state toggles `border-primary bg-muted` / `border-border bg-background` classes
- Drag-over text "Drop it here!" vs idle "Drop an image here" 
- Inline error below zone: `text-sm text-destructive`

**ImageUploadFlow** (`src/components/image-upload-flow.tsx`)
- `useReducer` state machine with `ImageFlowState` (step/file/previewUrl/pickError/selectedDeckId) and 6-action `ImageFlowAction` union
- `previewUrlRef` pattern (RESEARCH.md A6): `useRef` kept in sync with `state.previewUrl` for stale-closure-safe unmount revocation
- `handleValidFile`: revokes old URL before `URL.createObjectURL`; `handleClearFile`: revokes before CLEAR_FILE dispatch + `resetInput()`
- `validateAndSetFile` useCallback calls `validateImageFile(file)` for all three vectors
- Document paste listener via `useEffect` + `document.addEventListener("paste", ...)` with `removeEventListener` cleanup
- Step 1 empty: `<ImageDropZone>` visible; Step 1 previewing: `max-h-64` `<img>` + X overlay + "Choose different image" + "Next: choose deck"
- Drop zone kept mounted in `hidden` div during preview so ref stays valid
- Step 2: `max-h-32` recap `<img>` + "Add words to:" `<Label>` + `<DeckSwitcher>` + "Back" + "Extract words" (disabled until file+deck set)
- `handleExtract` is an empty no-op placeholder with `// Phase 10 wires extraction here` comment

**NewCardModeToggle** (`src/components/new-card-mode-toggle.tsx`)
- `useState<"type" | "image">("type")` for active mode
- `flex gap-2 mb-6` toggle row with two Buttons (`variant="default"` active / `variant="outline"` inactive)
- Conditionally renders `<TranslationForm>` or `<ImageUploadFlow>` per mode

**new-card/page.tsx** (surgical 2-line change)
- Import swapped from `TranslationForm` to `NewCardModeToggle`
- `<TranslationForm>` replaced with `<NewCardModeToggle decks activeDeckId nativeLang nativeLangLabel targetLangLabel deckId targetLang />`
- All server-side logic unchanged; page remains async server component (no `"use client"`)

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `npx biome check` (all 4 files) | PASS |
| `npx vitest run src/` (79 files, 1712 tests) | PASS |
| `npx next build` | PASS (Turbopack 17.6s compile, 13.5s TypeScript) |
| grep: page.tsx contains NewCardModeToggle | PASS |
| grep: page.tsx does NOT contain TranslationForm | PASS |
| grep: image-upload-flow.tsx contains validateImageFile, URL.revokeObjectURL, DeckSwitcher, no-op handleExtract | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / Biome fix] biome-ignore for `lint/a11y/useSemanticElements` on drop zone div**
- **Found during:** Task 1 verification
- **Issue:** Biome's `useSemanticElements` lint rule flagged `div role="button"` and recommended converting to `<button>`. However, drag events (`onDragOver`, `onDrop`) are technically supported on `<button>` elements too, but the existing pattern in the plan spec requires the `div role="button"` for the drop zone. Added biome-ignore suppress comment with explanation.
- **Fix:** Added `{/* biome-ignore lint/a11y/useSemanticElements: ... */}` comment
- **Files modified:** `src/components/image-drop-zone.tsx`
- **Commit:** ce32011

**2. [Rule 1 - Bug / Biome fix] `biome-ignore lint/performance/noImgElement` for preview `<img>` tags**
- **Found during:** Task 2 verification
- **Issue:** Biome's `noImgElement` rule flags plain `<img>` in favor of `next/image`. However, `next/image` does not support blob/object URLs — this is explicitly documented in RESEARCH.md Pitfall 5 as a hard requirement to use plain `<img>`. Added biome-ignore comments.
- **Fix:** Added `{/* biome-ignore lint/performance/noImgElement: ... */}` before each `<img>` tag
- **Files modified:** `src/components/image-upload-flow.tsx`
- **Commit:** 2dfc298

**3. [Rule 1 - Bug / Biome fix] Alt text changed from "Selected image preview" to "Selected file"**
- **Found during:** Task 2 verification (first pass)
- **Issue:** Biome's `lint/a11y/noRedundantAlt` flags alt text containing "image", "picture", or "photo" because screen readers already announce `<img>` as "image"
- **Fix:** Changed alt text to "Selected file" (no redundant word)
- **Files modified:** `src/components/image-upload-flow.tsx`
- **Commit:** 2dfc298

**4. [Rule 1 - Design] Drop zone kept mounted in `hidden` div during preview state**
- **Found during:** Task 2 implementation
- **Issue:** When `state.file` is set and we conditionally don't render `<ImageDropZone>`, the `dropZoneRef` loses its target and `dropZoneRef.current?.openPicker()` / `resetInput()` silently no-op. The "Choose different image" button would fail.
- **Fix:** Keep `<ImageDropZone>` mounted inside a `className="hidden"` wrapper during preview state so the ref remains valid, while hiding it visually.
- **Files modified:** `src/components/image-upload-flow.tsx`
- **Commit:** 2dfc298

**5. [Rule 1 - Bug / Biome fix] Import ordering and type-import style fixes**
- **Found during:** Tasks 1-3 verification
- **Issue:** Biome's `organizeImports` and `useImportType` rules flagged import ordering and `{ type X }` vs `import type { X }` style
- **Fix:** Reordered imports per Biome's rules; changed `{ type DeckOption }` to `import type { DeckOption }` in new-card-mode-toggle.tsx
- **Files modified:** All three new components
- **Commits:** ce32011, 2dfc298, 103a939

## Known Stubs

- `handleExtract()` in `image-upload-flow.tsx` is an intentional empty no-op — Phase 10 wires the extraction endpoint. The button is correctly disabled until `state.file && state.selectedDeckId`, providing user-facing feedback. This is by design per the plan scope.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Phase 9 performs zero network I/O. The `handleExtract` no-op confirms no fetch/server call was added. Client-side file handling stays in browser memory only.

## Status

Tasks 1-3 complete. Task 4 (checkpoint:human-verify) reached — awaiting manual browser verification by user.

## Self-Check: PASSED

- `src/components/image-drop-zone.tsx`: FOUND
- `src/components/image-upload-flow.tsx`: FOUND
- `src/components/new-card-mode-toggle.tsx`: FOUND
- Commits ce32011, 2dfc298, 103a939: VERIFIED in git log
