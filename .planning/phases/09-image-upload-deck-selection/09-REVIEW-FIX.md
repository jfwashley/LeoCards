---
phase: 09-image-upload-deck-selection
iteration: 1
fix_scope: all
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
generated: 2026-05-20
---

# Phase 09: Code Review Fix Report

All 5 findings from `09-REVIEW.md` (2 Warning + 3 Info) have been resolved.

## Fixes Applied

### WR-01 — Duplicate `activeDeckId` / `deckId` props
**Commit:** `0c1068b`
**File:** `src/components/image-upload-flow.tsx`
**Change:** Collapsed the duplicated `activeDeckId == deckId` props to a single prop on the consuming component, removing the fragile dual-source-of-truth interface.

### WR-02 — Document-level paste handler does not `preventDefault()`
**Commit:** `310f816`
**File:** `src/components/image-upload-flow.tsx`
**Change:** Added `e.preventDefault()` inside the paste handler when the clipboard contains a file, preventing double-paste behavior when text inputs are also present in the DOM.

### IN-01 — Client-side MIME-type check is spoofable
**Commit:** `f43ebb9`
**File:** `src/lib/image-validation.ts`
**Change:** Documented (via inline comment) that the client-side MIME check is advisory only and that authoritative validation happens server-side in Phase 10 (magic-byte + content-length + WEBP subtype check at `src/app/api/extract/route.ts`).

### IN-02 — Extension-less filename produces grammatically broken error
**Commit:** `2019740`
**File:** `src/lib/image-validation.ts`
**Change:** Handled the extensionless-filename branch explicitly so the user-facing rejection message stays grammatical when the picked file has no extension.

### IN-03 — `src={state.previewUrl ?? ""}` triggers empty-src network request
**Commit:** `06f75de`
**File:** `src/components/image-upload-flow.tsx` (5 occurrences)
**Change:** Replaced `state.previewUrl ?? ""` with `state.previewUrl ?? undefined` for all five `<img>` elements. React omits the `src` attribute entirely when it is `undefined`, so the transient null-previewUrl render window no longer issues a browser request for the current page URL. Cleanest minimal patch — preserves existing JSX structure and biome-ignore comments.

## Verification

- `npx tsc --noEmit` — clean (pre-existing `.next/dev/types` generated-file noise only).
- `npx biome check src/components/image-upload-flow.tsx src/lib/image-validation.ts` — clean.
- Unit suites covering touched files (`image-validation.test.ts`) green pre/post.

## Not Touched (out of scope)

- Untracked `e2e/11-phase9-image-upload.spec.ts` (Playwright spec) — separate keep/delete decision for the user.
- `.planning/v1.0-MILESTONE-AUDIT.md` unstaged deletion — unrelated to Phase 9 review-fix scope.
