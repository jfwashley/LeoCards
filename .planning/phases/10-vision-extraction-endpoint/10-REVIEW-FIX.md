---
phase: 10-vision-extraction-endpoint
iteration: 1
fix_scope: critical_warning
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-05-20
**Source review:** `.planning/phases/10-vision-extraction-endpoint/10-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (Critical + Warning): 4
- Fixed: 4
- Skipped: 0

Info-tier findings (IN-01, IN-02, IN-03) were intentionally out of scope per `fix_scope: critical_warning` and were not touched.

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

## Skipped Issues

None.

## Verification

- `npx tsc --noEmit` — passes cleanly (no output) after each of the three source commits.
- `npx vitest run` on touched files (`image-constants.test.ts`, `extract.unit.test.ts`, `extract-reducer.test.ts`) — 21/21 tests pass after final state.
- Biome auto-format applied to `image-constants.ts` (`ALLOWED_IMAGE_TYPES` line-wrap); other touched files were already biome-clean.

## Commits

| Finding | Commit | Summary |
|---------|--------|---------|
| WR-01   | `98c03e4` | unify server/client image size caps via MAX_SERVER_IMAGE_BYTES |
| WR-02   | `83e1298` | verify WEBP subtype in magic-byte check (not just RIFF) |
| WR-03   | `bf9ba10` | wrap FileReader rejection in Error for outer catch |
| WR-04   | (no-op)   | tsconfig + existing `?? now` fallback already correct |

---

_Fixed: 2026-05-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
