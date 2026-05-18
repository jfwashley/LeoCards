---
phase: 09-image-upload-deck-selection
verified: 2026-05-18T00:00:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
---

# Phase 9: Image Upload & Deck Selection — Verification Report

**Phase Goal:** From the add-card flow, a user can pick a single valid image, preview it, and choose which deck the extracted words will land in — all before any extraction happens.
**Verified:** 2026-05-18
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On /deck/new-card the user sees a "Type a word" / "From image" toggle and can switch to image mode | VERIFIED | `new-card/page.tsx` imports and renders `<NewCardModeToggle>` (line 3, line 49). `NewCardModeToggle` has `useState<"type" \| "image">("type")` + two Buttons with correct variant switching. No "use client" on page. |
| 2 | In image mode the user can pick an image via click, drag-and-drop, or Ctrl+V paste | VERIFIED | `ImageDropZone`: hidden `<input>` with `onClick={openPicker}`, `onDrop` handler, `onKeyDown` (Enter/Space). `ImageUploadFlow`: `document.addEventListener("paste", ...)` in `useEffect` with cleanup. All three vectors call `validateAndSetFile`. Human-verified (Wave 2 checkpoint): real drag-drop and clipboard Ctrl+V confirmed in Chrome. |
| 3 | Invalid files (wrong type or >5MB) are rejected before preview with a friendly inline error | VERIFIED | `validateImageFile` returns named-extension message for disallowed MIME types and named-MB message (`toFixed(1)`) for oversized files. `FILE_ERROR` reducer sets `pickError`, clears `previewUrl` and `file`. Error displayed below drop zone as `<p className="text-sm text-destructive mt-2">{error}</p>`. 8/8 unit tests pass (Vitest). E2E confirms wrong-type and oversized rejection with no preview. |
| 4 | A valid image shows a contained thumbnail; X overlay clears it, "Choose different image" re-opens the picker | VERIFIED | Step 1 preview state renders `<img className="max-h-64 w-auto object-contain rounded-lg">` with `<Button aria-label="Remove selected image">` (X icon) that calls `handleClearFile` (revokes object URL, resets input, dispatches CLEAR_FILE) and `<Button variant="outline">Choose different image</Button>` that calls `dropZoneRef.current?.openPicker()`. Drop zone kept mounted in `className="hidden"` div so ref stays valid. E2E confirmed. |
| 5 | Step 2 shows a recap thumbnail + DeckSwitcher pre-selected to the active deck; "Extract words" is disabled until image+deck set and is a no-op placeholder | VERIFIED | `step === "deck"` branch: `<img className="max-h-32 ...">`, `<Label>Add words to:</Label>`, `<DeckSwitcher activeDeckId={state.selectedDeckId} ...>`, `<Button disabled={!state.file \|\| !state.selectedDeckId}>Extract words</Button>`. `handleExtract()` is an empty body with `// Phase 10 wires extraction here` comment — no fetch, no navigation. `selectedDeckId` initialised to `defaultDeckId` which is `activeDeck.id` from server. E2E confirmed no-op. |
| 6 | validateImageFile accepts JPEG, PNG, WebP and rejects other types with a message naming the extension | VERIFIED | `ALLOWED_TYPES = new Set(["image/jpeg","image/png","image/webp"])`. Rejection message: `` `JPG, PNG, or WebP only — that file is a ${ext}.` ``. Unit tests: accepts jpeg/png/webp; rejects heic (message contains "HEIC"); rejects gif. 5/5 type tests green. |
| 7 | validateImageFile rejects files over 5MB with a message naming the size; accepts exactly 5MB | VERIFIED | `if (file.size > MAX_BYTES)` (strictly-greater). Message: `` `That image is ${mb}MB — please pick one under 5MB.` `` Unit tests: exactly-5MB passes; 5MB+1 rejected (message matches /MB/); 7.3MB rejected (message contains "7.3MB"). 3/3 size tests green. |
| 8 | Object URL lifecycle is managed (revoked on replace, clear, and unmount) | VERIFIED | `previewUrlRef` tracks latest URL. `handleValidFile` revokes before `URL.createObjectURL`. `handleClearFile` revokes before CLEAR_FILE dispatch. Unmount cleanup: `useEffect(() => { return () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }; }, [])`. |
| 9 | Page remains a server component; mode toggle and image flow are client components only | VERIFIED | `new-card/page.tsx` has no `"use client"`. `image-drop-zone.tsx`, `image-upload-flow.tsx`, `new-card-mode-toggle.tsx` all have `"use client"` at line 1. |

**Score:** 9/9 truths verified

---

### Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| IMG-01 | 09-02 | User can choose an image from the add-card flow (entry point) | SATISFIED | `NewCardModeToggle` on `/deck/new-card` with "From image" button wired to `ImageUploadFlow` |
| IMG-02 | 09-01 / 09-02 | One image at a time; JPG, PNG, WebP only | SATISFIED | `ALLOWED_TYPES` in `validateImageFile`; `accept="image/jpeg,image/png,image/webp"` on hidden input; single-file flow |
| IMG-03 | 09-01 / 09-02 | Clear friendly error for wrong type or >5MB, rejected before upload | SATISFIED | `validateImageFile` returns named messages; error shown below drop zone; `FILE_ERROR` action clears preview; 8/8 unit tests pass |
| IMG-04 | 09-02 | Deck selected before extraction; defaults to active deck | SATISFIED | `selectedDeckId: defaultDeckId` in reducer init; `defaultDeckId` = `activeDeck.id` from server page; `DeckSwitcher` in Step 2 with SET_DECK dispatch |
| IMG-05 | 09-02 | Preview/thumbnail of chosen image; replace or cancel before extraction | SATISFIED | `max-h-64` Step 1 preview; X button clears; "Choose different image" re-opens picker; no extraction at this step |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/image-validation.ts` | Pure `validateImageFile(file) -> ValidationResult` | VERIFIED | 24 lines; no `"use client"`, no imports; exports `validateImageFile` and `ValidationResult`; contains `5 * 1024 * 1024` and JPEG/PNG/WebP allow-list. Commit 1d1d777. |
| `src/lib/image-validation.test.ts` | Unit tests covering IMG-02 type allow-list and IMG-03 size cap | VERIFIED | 58 lines; 2 describe blocks; 8 behaviours including 7.3MB message and exact-5MB acceptance. Commit b6f1542. |
| `src/components/image-drop-zone.tsx` | Drop zone UI (click/drag/paste), hidden file input, isDragOver state | VERIFIED | 81 lines; forwardRef/useImperativeHandle exposing `openPicker`/`resetInput`; drag-over state; ARIA labels; error display. Commit ce32011. |
| `src/components/image-upload-flow.tsx` | 2-step useReducer state machine, object URL lifecycle, DeckSwitcher in Step 2 | VERIFIED | 232 lines; `imageFlowReducer` with 6-action union; `previewUrlRef` pattern; paste listener with cleanup; both `<img>` sizes; no-op `handleExtract`. Commit 2dfc298. |
| `src/components/new-card-mode-toggle.tsx` | Two-button mode switcher rendering TranslationForm or ImageUploadFlow | VERIFIED | 63 lines; `useState<"type" \| "image">("type")`; conditional render; "Type a word" / "From image" copy. Commit 103a939. |
| `src/app/(protected)/deck/new-card/page.tsx` | Server page rendering NewCardModeToggle instead of TranslationForm directly | VERIFIED | Imports `NewCardModeToggle`; renders `<NewCardModeToggle decks activeDeckId nativeLang nativeLangLabel targetLangLabel deckId targetLang>`; no `TranslationForm` import; no `"use client"`. Commit 103a939. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `image-upload-flow.tsx` | `src/lib/image-validation.ts` | `import { validateImageFile }` line 12; called line 110 inside `validateAndSetFile` for all three input vectors | WIRED | Both import and call site confirmed. |
| `image-upload-flow.tsx` | `src/components/deck-switcher.tsx` | `import { type DeckOption, DeckSwitcher }` line 5; `<DeckSwitcher activeDeckId={state.selectedDeckId} onDeckChange={(id) => dispatch({type:"SET_DECK",deckId:id})} ...>` line 150 | WIRED | Both import and render with SET_DECK dispatch confirmed. |
| `new-card/page.tsx` | `src/components/new-card-mode-toggle.tsx` | `import { NewCardModeToggle }` line 3; `<NewCardModeToggle decks={decks} activeDeckId={activeDeck.id} ...>` line 49 | WIRED | Import and render with all required props confirmed. |

---

### Data-Flow Trace (Level 4)

Phase 9 performs zero network I/O by design. No data fetching occurs in the new components. The `decks` array and `activeDeckId` flow from the existing server-side `getUserDecks` query in `new-card/page.tsx` (unchanged), through `NewCardModeToggle` props, to `ImageUploadFlow` props. No hollow props: all props are populated from the server before render. `ImageUploadFlow`'s `selectedDeckId` state is initialised from `defaultDeckId` (which equals `activeDeck.id`), confirmed real by the server query.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `image-upload-flow.tsx` | `decks` | `getUserDecks(session.user.id)` in `new-card/page.tsx` | Yes — DB query (unchanged from pre-phase) | FLOWING |
| `image-upload-flow.tsx` | `selectedDeckId` (initial) | `defaultDeckId` = `activeDeck.id` from server | Yes | FLOWING |
| `image-upload-flow.tsx` | `previewUrl` | `URL.createObjectURL(file)` from user-selected File | Yes — object URL from real file | FLOWING |

---

### Behavioral Spot-Checks

Step 7b is not applicable for programmatic execution (UI-only phase, requires browser). Covered by the E2E suite and the Wave 2 human checkpoint instead.

| Behavior | Method | Result | Status |
|----------|--------|--------|--------|
| validateImageFile: jpeg/png/webp accepted, heic/gif rejected | Vitest unit suite | 8/8 pass | PASS |
| validateImageFile: 7.3MB names size; exactly 5MB accepted | Vitest unit suite | 3/3 size tests pass | PASS |
| Full unit suite — no regressions | `npx vitest run src/` | 79 files, 1712 tests pass | PASS |
| Full UI flow: toggle, file picker, validation errors, preview, clear, re-pick, Step 2, deck selection, no-op Extract, Back | Playwright E2E `e2e/11-phase9-image-upload.spec.ts` | 1 passed, 13.3s | PASS |
| Real drag-and-drop (OS-native) | Human checkpoint (Wave 2) | Approved 2026-05-18 | PASS |
| Real clipboard paste Ctrl+V (OS-native) | Human checkpoint (Wave 2) | Approved 2026-05-18 | PASS |
| TypeScript clean | `npx tsc --noEmit` | Exit 0 | PASS |
| Lint clean | `npx biome check` (all 4 files) | Exit 0 | PASS |
| Production build | `npx next build` | Exit 0 (17.6s compile) | PASS |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `image-upload-flow.tsx` line 127 | `function handleExtract() {}` — empty body | Info | Intentional per scope note D-03 and plan threat model. Button disabled until file+deck set. Phase 10 wires extraction. Not a gap. |

No TODO/FIXME/placeholder comments found in production code. No unguarded `return null`, `return []`, or `return {}` in any rendering path. The `handleExtract` no-op is explicitly locked as a Phase 9 design decision.

---

### Human Verification Required

None. All observable behaviors were verified programmatically (unit tests, E2E) or through the Wave 2 human checkpoint (OS-native drag-drop and clipboard paste, approved 2026-05-18). No remaining items require human testing.

---

## Gaps Summary

No gaps. All 9 truths verified, all 5 requirements satisfied, all 6 artifacts substantive and wired, all key links confirmed, build and lint clean, E2E passed, human checkpoint approved.

---

_Verified: 2026-05-18_
_Verifier: Claude (gsd-verifier)_
