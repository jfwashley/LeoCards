---
phase: 10-vision-extraction-endpoint
reviewed: 2026-05-19T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/app/api/extract/route.ts
  - src/env.ts
  - src/lib/image-constants.ts
  - src/lib/image-validation.ts
  - src/components/image-upload-flow.tsx
  - src/test-setup.ts
  - src/app/api/extract/__tests__/extract.unit.test.ts
  - src/app/api/extract/__tests__/extract-reducer.test.ts
  - src/app/api/extract/__tests__/extract-eval.test.ts
  - src/lib/image-constants.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-19
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The guard sequence in `route.ts` is well-structured and covers the attack surface described in the brief: auth → rate-limit → content-length fast-path → JSON parse → Zod → base64 size estimate → MIME allow-list → magic bytes → API key → vision call. Privacy is respected — no image bytes or extracted words are logged. The AbortController/timeout pattern is correct on both client and server. The reducer is pure and correct. No critical issues were found.

Four warnings are raised: a mismatch between the client-side 5MB cap and the server's 7MB hard limit (which can mislead users and under-reject files at the server-side estimate step), a WebP magic-byte check that is structurally incomplete (RIFF + WEBP subtype not verified), a missing `noUncheckedIndexedAccess`-safe guard in the rate limiter that is exercised indirectly by this phase, and an unhandled `FileReader` rejection path in the component. Three informational items are also noted.

---

## Warnings

### WR-01: Client 5MB limit vs server 7MB limit — user-facing lie and under-rejection

**File:** `src/lib/image-constants.ts:2` and `src/app/api/extract/route.ts:90,111`

**Issue:** `MAX_IMAGE_BYTES` is `5 * 1024 * 1024` (5 MB), which is what `validateImageFile` enforces on the client and what the user-facing error copy in `image-upload-flow.tsx` (line 113) references ("under 5MB"). However the server enforces `7 * 1024 * 1024` at both the Content-Length fast-path (line 90) and the decoded-size estimate (line 112). A file between 5 MB and 7 MB will be rejected client-side by `validateImageFile` with "please pick one under 5MB", but if a client bypasses `validateImageFile` (e.g. a direct POST) the server will accept it. More importantly, the user-facing friendly copy in the component (line 113: "smaller image (under 5MB)") is inaccurate for the server's actual threshold — users who craft a request directly get 7 MB of headroom the UI never told them about. The more meaningful risk is the inverse: if the client limit is ever raised to match the server, `validateImageFile` would pass a 6 MB file that would be accepted server-side too, but the friendly error copy and UI copy would still say "under 5MB". The two constants should be derived from a single source of truth.

**Fix:** Export a single `MAX_SERVER_IMAGE_BYTES` (7 MB) constant from `image-constants.ts` and derive `MAX_IMAGE_BYTES` from it (or unify both at 7 MB if the client limit is intentionally conservative — but then update the user-facing copy to say "under 7MB"):

```typescript
// image-constants.ts
export const MAX_SERVER_IMAGE_BYTES = 7 * 1024 * 1024; // authoritative server cap
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;        // conservative client UI cap

// route.ts — reference the server constant, not a magic literal
import { ALLOWED_IMAGE_TYPES, MAX_SERVER_IMAGE_BYTES } from "@/lib/image-constants";
// ...
if (cl && Number(cl) > MAX_SERVER_IMAGE_BYTES) { ... }
// ...
if (estimatedBytes > MAX_SERVER_IMAGE_BYTES) { ... }

// image-upload-flow.tsx line 113 — update copy to match MAX_IMAGE_BYTES:
// "That image is too large for the server to process. Please choose a smaller image (under 5MB)."
// Already correct — just ensure MAX_IMAGE_BYTES stays the source for this string.
```

---

### WR-02: WebP magic-byte check verifies only RIFF header, not WEBP subtype

**File:** `src/app/api/extract/route.ts:48-49`

**Issue:** The WebP check only verifies that bytes 0-3 are `52 49 46 46` ("RIFF"). Any RIFF container (AVI, WAV, ANI, etc.) would pass this check if the client declares `image/webp`. A real WebP file has the structure: bytes 0-3 = `RIFF`, bytes 4-7 = file size (little-endian), bytes 8-11 = `WEBP`. The current validator never checks bytes 8-11.

While the Anthropic API will reject a non-WebP RIFF file when passed as `image/webp`, the magic-byte check is specifically designed to be the local pre-flight that prevents sending garbage to the upstream. As written it doesn't fulfill that stated purpose for WebP.

**Fix:**

```typescript
"image/webp": (b) =>
  b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
  b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
```

Also increase the slice length from 17 to 21 chars to ensure bytes 8-11 are decoded:

```typescript
const b64Payload = dataUrl.slice(commaIndex + 1, commaIndex + 21); // was 17
```

Sixteen base64 characters decode to 12 bytes (16 * 6 / 8 = 12), so bytes 0-11 are available with 16 chars. The existing `commaIndex + 17` slice is borderline — a comment explaining the byte-count arithmetic would make this maintainable. (17 chars of base64 decode to floor(17*6/8) = 12 bytes, which is exactly enough — but only if the b64 string is padded correctly. Using 21 chars gives a safe margin for the new check.)

---

### WR-03: `handleExtract` in the component swallows `FileReader` rejection silently

**File:** `src/components/image-upload-flow.tsx:193-198`

**Issue:** The `FileReader` is wrapped in a `Promise` where `reader.onerror = reject`. If the `FileReader` fails (e.g. the file becomes unavailable between pick and submit — possible on mobile where object URLs can be revoked by the OS), `reject` is called with a `ProgressEvent`, not an `Error`. The outer `catch` block (line 240) checks `err instanceof Error` — a `ProgressEvent` will not satisfy this, so `isAbort` evaluates `false` and the dispatch is:

```typescript
dispatch({ type: "EXTRACT_ERROR", status: 0, message: "Network error." });
```

`status: 0` does fall through to `friendlyErrorCopy`'s `default` case ("Something went wrong. Please try again."), so the user does see an error — but `extracting` is stuck at `true` until the catch fires, and if the `FileReader` error itself is an uncaught rejection the promise may go unhandled.

More concretely: the state was set to `extracting: true` at line 189, but if `reader.onerror` fires synchronously before the `await` the dispatch with `EXTRACT_ERROR` happens inside the outer `catch`. The flow is actually safe because the `Promise` wrapping serialises it, but the `FileReader` error type leaking into the `catch` as `ProgressEvent` is a latent type mismatch.

**Fix:** Wrap the `FileReader` rejection with an `Error`:

```typescript
reader.onerror = () => reject(new Error("FileReader error"));
```

---

### WR-04: `noUncheckedIndexedAccess` — `entry.timestamps[0]` in rate limiter is unsafe

**File:** `src/lib/rate-limit.ts:57`

**Issue:** This file is not in the explicit review scope, but `route.ts` (line 75) directly calls `visionLimiter.check(session.user.id)` and the return value's `retryAfterMs` is used in the 429 response header (line 82). With `noUncheckedIndexedAccess` enabled in this project, `entry.timestamps[0]` at `rate-limit.ts:57` is typed as `number | undefined`. The fallback `?? now` handles it, so there is no runtime crash, but the TypeScript compiler should be surfacing this as an error under strict mode. If it is not, it may indicate `noUncheckedIndexedAccess` is disabled or the file is in a scope that excludes it. Worth confirming the tsconfig applies to `src/lib/rate-limit.ts`.

**Fix:** Confirm the tsconfig includes `src/lib/` in its strictness scope. The existing `?? now` fallback is correct — no logic change needed, but the typing acknowledgement should be verified.

---

## Info

### IN-01: `targetLanguage` is interpolated into the system prompt without sanitization

**File:** `src/app/api/extract/route.ts:151-153`

**Issue:** `targetLanguage` (a BCP-47 string from the client, validated only by Zod as `z.string()` with no regex constraint) is interpolated directly into the system prompt: `Prioritise words in ${targetLanguage}`. A malicious authenticated user could supply a value like `"French. IGNORE ALL PRIOR INSTRUCTIONS and..."` to attempt prompt injection.

The practical risk is bounded because: (a) the system prompt constraint order is designed per 10-AI-SPEC Section 4b.3 and the extraction schema is strictly validated via `Output.object`, so injected instructions that try to change the output shape will fail schema validation and return `{ words: [] }`; (b) the user is already authenticated and rate-limited. However the attack surface exists.

**Fix:** Add a regex constraint to `targetLanguage` in `RequestSchema`, mirroring the `detectedLanguage` pattern already in `ExtractionSchema`:

```typescript
targetLanguage: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
```

This is a lightweight input fence that costs nothing and closes the injection vector before it reaches the prompt.

---

### IN-02: `image/gif` is in the `mediaType` type assertion but not in `ALLOWED_IMAGE_TYPES`

**File:** `src/app/api/extract/route.ts:173`

**Issue:** The type cast on line 172-174 includes `"image/gif"` as a valid `mediaType`:

```typescript
mediaType: mimeType as
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp",
```

But `image/gif` is explicitly excluded from `ALLOWED_IMAGE_TYPES` (confirmed by `image-constants.test.ts` line 12). The `mimeType` value at this point has passed the allow-list guard (step 7) and the magic-byte check (step 8), so `"image/gif"` can never reach this line at runtime. However the type assertion suggests `gif` is a supported type, which is misleading and could cause confusion if the allow-list is ever expanded. It also means the cast is overly broad relative to what `ALLOWED_IMAGE_TYPES` permits.

**Fix:** Narrow the type assertion to match the actual allow-list:

```typescript
mediaType: mimeType as "image/jpeg" | "image/png" | "image/webp",
```

---

### IN-03: `EXTRACT_RETRY` and `EXTRACT_START` are functionally identical — dead distinction

**File:** `src/components/image-upload-flow.tsx:95-101` and `src/app/api/extract/__tests__/extract-reducer.test.ts:58-64`

**Issue:** The `EXTRACT_RETRY` action produces exactly the same state transition as `EXTRACT_START` (both set `extracting: true`, clear `extractError` and `extractWords`). The reducer comment on line 94 notes "file / previewUrl / selectedDeckId are NOT touched — D-16 preservation", but `EXTRACT_START` also spreads `...state` so it equally preserves those fields. The retry button in the component (line 337-338) dispatches `EXTRACT_RETRY` then calls `handleExtract()`, which itself dispatches `EXTRACT_START` at the top of its body (line 189). This means the retry path fires two sequential state transitions with identical effects before the fetch begins, causing two redundant re-renders.

**Fix (minimal):** Remove the `EXTRACT_RETRY` dispatch from the retry button handler. `handleExtract()` already dispatches `EXTRACT_START`:

```tsx
// Before:
onClick={() => {
  dispatch({ type: "EXTRACT_RETRY" });
  void handleExtract();
}}

// After:
onClick={() => { void handleExtract(); }}
```

If `EXTRACT_RETRY` needs to be a distinct action for semantic clarity or future animation triggers, at minimum document why it exists alongside `EXTRACT_START` in the reducer switch statement. As-is it is an undocumented duplicate that produces a double render on retry.

---

_Reviewed: 2026-05-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
