---
phase: 26-performance-batch
reviewed: 2026-07-22T00:23:56Z
depth: deep
files_reviewed: 18
files_reviewed_list:
  - src/app/api/translate/route.ts
  - src/app/api/translate/__tests__/route.test.ts
  - src/components/review-list.tsx
  - src/components/review-list.test.ts
  - src/app/api/study/complete/route.ts
  - src/app/api/study/complete/route.test.ts
  - src/lib/deck-actions.ts
  - src/lib/deck-actions.test.ts
  - src/lib/image-resize.ts
  - src/lib/image-resize.test.ts
  - src/lib/image-constants.ts
  - src/lib/image-constants.test.ts
  - src/lib/image-validation.ts
  - src/lib/image-validation.test.ts
  - src/components/image-upload-flow.tsx
  - e2e/11-phase9-image-upload.spec.ts
  - next.config.ts
  - scripts/render-habitat-clips.mjs
findings:
  critical: 1
  warning: 2
  info: 3
  total: 6
status: issues_found_fixed
fix_status:
  fixed_at: 2026-07-22T01:38:00Z
  critical_fixed: 1
  warning_fixed: 2
  info_fixed: 0
  info_skipped_by_design: 3
---

# Phase 26: Code Review Report

**Reviewed:** 2026-07-22T00:23:56Z
**Depth:** deep
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 26 is a set of five performance refactors billed as behavior-preserving. Most of that promise holds up under adversarial tracing:

- **PERF-09 (translate `texts[]` array mode)** — the additive array branch is correctly gated behind an XOR `.refine()`, the `.max(50)` abuse guard is present, and the frozen singular `{text}` → `{translation}` contract that `translation-form.tsx` depends on is genuinely untouched (verified against the caller). No defect.
- **PERF-07 (study/complete `db.batch()`)** — the WR-04 commitId idempotency machinery is behavior-equivalent under the atomic batch. Deterministic recall-event ids + `onConflictDoNothing`, the `lastCommitId` UPDATE guard, and the habitat `onConflictDoUpdate` all still converge on replay. No defect.
- **PERF-11 (immutable cache headers) + render-habitat-clips comment rule** — correct and self-consistent. No defect.

The concerns concentrate in the **image path (PERF-10 / PERF-08)**. The new client-side `resizeImageForUpload` was added to `handleExtract` **outside** the function's `try/catch`, so a decode failure (a realistic mobile input) produces an unhandled rejection and a permanently stuck "Reading your image…" spinner with no error surfaced (CR-01). Separately, the new all-or-nothing `saveImageCards` semantics interact badly with the existing unguarded commit UI: a single empty/failed translation row now aborts the entire batch instead of just that row (WR-01).

## Critical Issues

### CR-01: `resizeImageForUpload` (and the FileReader promise) run outside `handleExtract`'s try/catch — decode failure hangs the flow with an unhandled rejection

**File:** `src/components/image-upload-flow.tsx:257-266`
**Issue:**
`handleExtract` dispatches `EXTRACT_START` (sets `extracting: true`), then does:

```ts
dispatch({ type: "EXTRACT_START" });
const file = state.file;
const resized = await resizeImageForUpload(file);   // line 257 — NOT guarded
if (cancelled.current) return;
const dataUrl = await new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(new Error("FileReader error")); // line 264 — NOT guarded
  reader.readAsDataURL(resized);
});
```

Both awaits are **before** the `try` block that starts at line 287. `resizeImageForUpload` rejects whenever `createImageBitmap` cannot decode the file (`src/lib/image-resize.ts:12`), or when `canvas.getContext("2d")` returns null, or when `canvas.toBlob` yields null. `validateImageFile` only checks the browser-supplied `file.type` string and `file.size` — it never decodes — so a file that is `type: "image/jpeg"` but has corrupt/truncated/non-decodable bytes (a partial download, a renamed non-image, an OS-mislabeled HEIC on some mobile pickers) passes validation and then rejects inside resize.

When that rejection fires:
1. The promise returned by `handleExtract` rejects and is swallowed by the `onClick={() => void handleExtract()}` call site → **unhandled promise rejection**.
2. No `EXTRACT_ERROR` (or any) action is dispatched, so state stays `extracting: true` → the UI is pinned on the "Reading your image…" spinner with **no error message and no working "Try again"** (the retry button only lives in the `extractError` render branch, which is unreachable here).

There is no fallback to the original file, and none is possible as written: even if one were added, `mimeType` is hardcoded `"image/jpeg"` (line 298), so an un-resized PNG/WebP original would then fail the server magic-byte check anyway. The net effect is that the only correct path is "resize always succeeds"; any decode failure is unhandled.

This is a new regression: `resizeImageForUpload` did not exist before PERF-10, so this failure mode was introduced by this phase.

**Fix:** Move the resize + FileReader awaits inside a guarded block and dispatch a real error so the recovery UI renders:

```ts
dispatch({ type: "EXTRACT_START" });
const file = state.file;

let dataUrl: string;
try {
  const resized = await resizeImageForUpload(file);
  if (cancelled.current) return;
  dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(resized);
  });
} catch {
  if (cancelled.current) return;
  dispatch({
    type: "EXTRACT_ERROR",
    status: 415,
    message: "We couldn't read that image. Please choose a different photo.",
  });
  return;
}
```

(415 maps to the existing "file type isn't supported" friendly copy; a dedicated status/message is also fine.)

**Fix status:** fixed — commit `2789dfa`. Wrapped the resize + FileReader awaits in `handleExtract` in a try/catch that dispatches `EXTRACT_ERROR` (status 415) on any decode/read failure, so the existing error banner + reachable "Try again" render instead of an unhandled rejection. Added a rendered `<ImageUploadFlow>` test (`src/components/__tests__/image-upload-flow-extract-errors.test.tsx`) covering both the resize-reject and FileReader-error paths, asserting the "Reading your image…" spinner is not left stuck and `fetch` is never reached.

## Warnings

### WR-01: New all-or-nothing `saveImageCards` + unguarded commit UI — one empty/failed translation row now fails the entire batch

**File:** `src/lib/deck-actions.ts:249-264`, `src/components/review-list.tsx:311-340` and `:518-570`
**Issue:**
`saveImageCards` sanitizes every input up front and **throws** on the first invalid one:

```ts
const f = input.front.trim();
const b = input.back.trim();
if (!f || !b || f.length > 500 || b.length > 500) {
  throw new Error("Invalid card data"); // aborts the WHOLE loop, before any insert
}
```

`commitReviewRows` builds its inputs from every `translationRow` with `front: row.nativeText.trim()`. A translation row whose fan-out failed carries `nativeText: ""` and `translationError: "Translation unavailable — enter manually."` (`review-list.tsx:303-307`). If the user hits **Add** without manually filling that row, `front` is `""` → `saveImageCards` throws → `commitReviewRows`'s catch returns `failedCount: rows.length` → **every** card fails, including all the correctly-translated ones.

Under the previous per-row continue-on-failure semantics (explicitly removed in PERF-08, see the file comment), the valid cards would still have been saved and only the empty row would have failed. The step-b commit button (`review-list.tsx:569`, `Add {n} card…`) has **no guard** against empty `nativeText`, so this is reachable through normal use, and the resulting screen shows the generic "Couldn't add cards — please try again." (`review-list.tsx:607-609`), which is misleading — retrying will fail identically until the user edits the empty field.

**Fix:** Prevent the empty-field commit, or salvage valid rows. Simplest is to disable/gate the commit while any kept row is empty, mirroring the step-a `noWordsKept` guard:

```ts
const hasEmptyTranslation = state.translationRows.some(
  (r) => r.nativeText.trim() === "",
);
// ...
<ACBtn
  kind={hasEmptyTranslation ? "disabled" : "primary"}
  disabled={hasEmptyTranslation}
  onClick={handleCommit}
>
  Add {n} card{plural(n)}
</ACBtn>
```

Alternatively, filter empty rows out of the `saveImageCards` payload in `commitReviewRows` and count them as failed/skipped rather than letting one empty row throw the whole batch.

**Fix status:** fixed — commit `f4003fb`. Added a `hasEmptyTranslation` guard (mirroring the existing step-a `noWordsKept` pattern) that disables "Add N cards" and shows "Fill in every translation before adding." while any kept row's `nativeText` is empty; also extended `ACPairRow`'s `failed` styling to flag empty rows (not just `translationError !== null`) so a manually-cleared row is visibly flagged too. Added a rendered `<ReviewList>` test (`src/components/__tests__/review-list-commit-guard.test.tsx`) driving Step A → Step B → commit, asserting the commit button is disabled and `saveImageCards` is not called while a row is empty, and that filling in the empty row re-enables commit and saves every row.

### WR-02: `handleExtract` sends the resized image with no size ceiling below the server's 4MB cap — a large-but-decodable image fails only after the round trip

**File:** `src/components/image-upload-flow.tsx:257-303`, `src/lib/image-constants.ts:10-14`
**Issue:**
The client cap was loosened to 20MB (`MAX_IMAGE_BYTES`) and the authoritative server cap tightened to 4MB (`MAX_SERVER_IMAGE_BYTES`). The design intent (image-constants comment) is that `resizeImageForUpload` closes the gap by downscaling to ~1568px/JPEG 0.8. In the common case that holds. But the client never re-checks the **resized** blob's size against `MAX_SERVER_IMAGE_BYTES` before uploading, and JPEG q0.8 at 1568px is not guaranteed to land under 4MB for pathological inputs (extremely high-entropy / noisy source images). When it doesn't, the base64 body trips the server's `413` (`extract/route.ts:109` / `:131`), surfaced to the user as "That image is too large for the server to process. Please choose a smaller image (under 4MB)." — advice the user cannot act on, since they already picked a ≤20MB image and the oversize is an artifact of client re-encoding they can't see.

This is lower-severity than CR-01 (it only degrades UX on rare inputs and does not hang), but it is a real edge of the loosened-cap change worth a cheap guard.

**Fix:** After resize, if `resized.size > MAX_SERVER_IMAGE_BYTES`, either re-encode at a lower quality/edge or dispatch a clear client-side error instead of relying on the post-upload 413:

```ts
const resized = await resizeImageForUpload(file);
if (resized.size > MAX_SERVER_IMAGE_BYTES) {
  dispatch({ type: "EXTRACT_ERROR", status: 413,
    message: "That image is too detailed to process. Please try a different photo." });
  return;
}
```

**Fix status:** fixed — commit `8b6c491`. Rather than checking `resized.size` directly, the check mirrors the server's own `estimatedBytes` formula (`extract/route.ts`) against the actual base64 `dataUrl` about to be sent (`Math.ceil((dataUrl.length * 3) / 4)`), so the client-side gate is exactly faithful to the server's authoritative math rather than an approximation. Dispatches the same `EXTRACT_ERROR` (413) used for the real server 413, before the network call. Extended the CR-01 rendered test file with oversized/under-cap coverage.

## Info

### IN-01: `isPartial` success branch in `ReviewList` is dead code under the new atomic semantics

**File:** `src/components/review-list.tsx:600`, `:624-736`
**Issue:** `const isPartial = failedCount > 0 && addedCount > 0;`. With PERF-08's all-or-nothing `saveImageCards`, `commitReviewRows` returns outcomes that are either all-`ok` or all-`!ok`, so exactly one of `addedCount`/`failedCount` is always 0 and `isPartial` can never be true. The entire partial-result card (~110 lines) is unreachable. This is acknowledged as known-dead in the phase context; recorded here for completeness so the fixer can decide to prune it.
**Fix:** Remove the `isPartial` branch and its counts card, or add a code comment marking it intentionally-retained-dead if a future non-atomic mode is planned.

### IN-02: Dead nullish fallback `state.selectedDeckId ?? activeDeck?.id ?? null`

**File:** `src/components/image-upload-flow.tsx:780`
**Issue:** `selectedDeckId` is typed `string` (non-nullable) in `ImageFlowState` and is initialized to `defaultDeckId`, so the `?? activeDeck?.id ?? null` fallback is unreachable (an empty string is not nullish either). Harmless but misleading — it implies `selectedDeckId` can be null, which it cannot. Pre-existing, not introduced this phase.
**Fix:** Pass `state.selectedDeckId` directly, or make the type honestly nullable if a null state is actually intended.

### IN-03: `habitat_metadata` replay writes the retry's timestamp, not the original `lastActivityAt`

**File:** `src/app/api/study/complete/route.ts:261-271`
**Issue:** On a WR-04 replay (same `commitId`), the recall-event insert and card updates are correctly no-ops, but the habitat upsert's `onConflictDoUpdate` unconditionally sets `lastActivityAt: now` again — using the retry's `now`, not the original commit's. This is benign (activity recency only moves slightly forward, and habitat decay is time-based, not commit-counted), and the behavior is unchanged from before the batch refactor, so it is not a regression. Noting it only because the file's idempotency comment claims the whole write phase converges identically on replay — the habitat timestamp is the one field that does not.
**Fix:** None required. If strict byte-equivalence on replay is ever desired, guard the habitat `lastActivityAt` write on the same `lastCommitId` semantics, but this is almost certainly not worth the complexity.

**Fix status:** intentionally not fixed in this pass — IN-01/IN-02/IN-03 are out of scope for this fix run (IN-01 dead-code pruning deferred to a future cleanup pass; IN-02/IN-03 are notes with no required action).

---

_Reviewed: 2026-07-22T00:23:56Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
