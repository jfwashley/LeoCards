---
phase: 10-vision-extraction-endpoint
iteration: 2
fix_scope: all
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-05-20
**Source review:** `.planning/phases/10-vision-extraction-endpoint/10-REVIEW.md`
**Iteration:** 2 (extends iteration 1 with Info-tier findings)

**Summary:**
- Findings in scope (Critical + Warning + Info): 7
- Fixed: 7
- Skipped: 0

Iteration 1 (2026-05-20, `fix_scope: critical_warning`) addressed WR-01..WR-04.
Iteration 2 (2026-05-20, `fix_scope: all`) adds IN-01..IN-03. All entries from
iteration 1 are preserved verbatim below.

## Fixed Issues

### WR-01: Client 5MB limit vs server 7MB limit — unified via shared constant

**Files modified:**
- `src/lib/image-constants.ts`
- `src/app/api/extract/route.ts`

**Commit:** `98c03e4`

**Applied fix:** Introduced `MAX_SERVER_IMAGE_BYTES = 7 * 1024 * 1024` in `image-constants.ts` alongside the existing `MAX_IMAGE_BYTES` (5 MB client cap). `route.ts` now imports `MAX_SERVER_IMAGE_BYTES` and references it in both the Content-Length fast-path guard (line 90 → was `7 * 1024 * 1024`) and the decoded-size estimate guard (line 112 → was `7 * 1024 * 1024`). Both server-side limits now derive from a single source of truth; client UI copy remains "under 5MB" which correctly matches `MAX_IMAGE_BYTES`. Biome formatter re-wrapped the `ALLOWED_IMAGE_TYPES` declaration as a side effect of the file edit; left in place.

### WR-02: WebP magic-byte check now verifies RIFF + WEBP subtype

**Files modified:**
- `src/app/api/extract/route.ts`

**Commit:** `83e1298`

**Applied fix:** Extended the `image/webp` validator in the `MAGIC` table to check bytes 8-11 == `"WEBP"` in addition to bytes 0-3 == `"RIFF"`. Closes the loophole where an AVI/WAV/ANI file declared as `image/webp` would pass the pre-flight. Increased the base64 slice from `commaIndex + 17` to `commaIndex + 25` (~18 decoded bytes) to comfortably cover bytes 0-11 with margin against base64 padding/alignment. Added a comment block explaining the byte arithmetic per the reviewer's maintainability note. Unit tests (`extract.unit.test.ts`, 12 tests) still pass — they use JPEG/PNG fixtures and a "declared PNG but JPEG bytes" negative case, none of which exercise the WebP path.

### WR-03: FileReader rejection wrapped in Error

**Files modified:**
- `src/components/image-upload-flow.tsx`

**Commit:** `bf9ba10`

**Applied fix:** Changed `reader.onerror = reject` to `reader.onerror = () => reject(new Error("FileReader error"))`. The outer catch in `handleExtract` checks `err instanceof Error` to derive `isAbort` and to surface friendly error copy; previously it would have received a `ProgressEvent` which fails that check. Now the rejection is a proper `Error`, the type contract is consistent with the rest of the catch handler, and any unhandled-rejection devtools warnings would carry a readable message.

### WR-04: `noUncheckedIndexedAccess` rate-limiter guard — verified, no code change required

**Files modified:** none

**Commit:** n/a (verification only)

**Applied fix:** Verified `tsconfig.json` has `"noUncheckedIndexedAccess": true` and the `include` glob covers `**/*.ts` (so `src/lib/rate-limit.ts` is in scope). The existing `entry.timestamps[0] ?? now` fallback at `rate-limit.ts:57` is correctly typed under strict indexed access; `npx tsc --noEmit` passes cleanly with zero errors across the project. The reviewer's "Fix" explicitly states "no logic change needed, but the typing acknowledgement should be verified" — verification done, no edit required.

### IN-01: `targetLanguage` sanitized with BCP-47 regex before reaching system prompt

**Files modified:**
- `src/app/api/extract/route.ts`

**Commit:** `964190a`

**Applied fix:** Tightened the `RequestSchema.targetLanguage` Zod schema from `z.string()` to `z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/)` — the same constraint already applied to `ExtractionSchema.detectedLanguage`. `targetLanguage` is interpolated directly into the system prompt (line 166) and into the user-message text (line 181); rejecting non-BCP-47 input at the Zod step closes the prompt-injection vector before any string is concatenated into the prompt. Inline comment added explaining the rationale. All existing test fixtures (`extract.unit.test.ts`, `reference-labels.json`) use valid BCP-47 codes (`"fr"`, `"es"`) so no tests required updating. `npx tsc --noEmit` clean; 18/18 extract unit + reducer tests pass.

### IN-02: `mediaType` cast narrowed to remove unreachable `image/gif`

**Files modified:**
- `src/app/api/extract/route.ts`

**Commit:** `ad890c7`

**Applied fix:** Removed `"image/gif"` from the type-assertion union at the vision-call `messages[0].content` image part. Cast is now `mimeType as "image/jpeg" | "image/png" | "image/webp"`, exactly matching the runtime allow-list (`ALLOWED_IMAGE_TYPES`, asserted by `image-constants.test.ts:12` which explicitly excludes gif). The previous wider cast was misleading because gif can never reach this line — the MIME allow-list (step 7) and magic-byte check (step 8) both reject it earlier. Inline comment updated to reference IN-02 and the allow-list parity. `npx tsc --noEmit` passes.

### IN-03: Retry button no longer dispatches redundant `EXTRACT_RETRY` before `handleExtract`

**Files modified:**
- `src/components/image-upload-flow.tsx`

**Commit:** `1d997a0`

**Applied fix:** Removed the `dispatch({ type: "EXTRACT_RETRY" })` call from the retry button's `onClick` handler. `handleExtract()` already dispatches `EXTRACT_START` at the top of its body, which produces an identical state transition (extracting: true, extractError: null, extractWords: null). The previous double-dispatch caused two sequential reducer transitions and a redundant re-render on every retry. The `EXTRACT_RETRY` action is intentionally retained in the reducer's switch statement (the brief reserved it for potential future use such as animation triggers) — only the duplicate dispatch on this path is removed. The reducer unit tests (`extract-reducer.test.ts`, including the `EXTRACT_RETRY` case at lines 58-64) continue to pass without modification because the action type itself remains valid.

## Skipped Issues

None.

## Verification

- `npx tsc --noEmit` — passes cleanly (no output) after every source commit in both iterations.
- `npx biome check src/app/api/extract/route.ts src/components/image-upload-flow.tsx` — no fixes needed after iteration 2 edits.
- `npx vitest run` on `extract.unit.test.ts`, `extract-reducer.test.ts`, `image-constants.test.ts` — 21/21 tests pass at end of iteration 2.
- Pre-existing Playwright/e2e config noise and vitest project warnings unrelated to the touched files were ignored per the iteration-2 brief.

## Commits

| Iteration | Finding | Commit    | Summary                                                              |
|-----------|---------|-----------|----------------------------------------------------------------------|
| 1         | WR-01   | `98c03e4` | unify server/client image size caps via MAX_SERVER_IMAGE_BYTES       |
| 1         | WR-02   | `83e1298` | verify WEBP subtype in magic-byte check (not just RIFF)              |
| 1         | WR-03   | `bf9ba10` | wrap FileReader rejection in Error for outer catch                   |
| 1         | WR-04   | (no-op)   | tsconfig + existing `?? now` fallback already correct                |
| 2         | IN-01   | `964190a` | sanitize targetLanguage with BCP-47 regex                            |
| 2         | IN-02   | `ad890c7` | narrow mediaType cast to match ALLOWED_IMAGE_TYPES                   |
| 2         | IN-03   | `1d997a0` | drop redundant EXTRACT_RETRY dispatch on retry button                |

---

_Fixed: 2026-05-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
