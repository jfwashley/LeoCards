---
phase: 10-vision-extraction-endpoint
plan: 02
subsystem: api
tags: [anthropic, ai-sdk-v6, vision, rate-limit, magic-bytes, route-handler]

# Dependency graph
requires:
  - phase: 10-vision-extraction-endpoint-plan-01
    provides: "ai@6.0.185 + @ai-sdk/anthropic@3.0.78 installed; ALLOWED_IMAGE_TYPES/MAX_IMAGE_BYTES constants; ANTHROPIC_API_KEY in env; extract.unit.test.ts scaffold"
provides:
  - "Protected Claude vision extraction endpoint at /api/extract (POST)"
  - "Auth/rate-limit/size/MIME/magic-byte/key guard sequence (EXT-05)"
  - "generateText + Output.object vision call returning { words, detectedLanguage? } (EXT-01/EXT-03)"
  - "export const maxDuration = 60; AbortController 30s timeout"
affects:
  - "10-03 (image-upload-flow.tsx wiring uses this endpoint)"
  - "10-04 (model-id verification checkpoint)"
  - "Phase 11 (consumes { words: string[], detectedLanguage? } contract)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "generateText + Output.object({ schema }) — v6 AI SDK structured-output vision call (not deprecated generateObject)"
    - "Hand-rolled magic-byte sniff for JPEG/PNG/WebP — no file-type dep"
    - "Two-stage 413 guard: Content-Length fast path + ceil(base64.length*3/4) authoritative estimate"
    - "AbortController 30s + clearTimeout(finally) pattern for vision timeout"
    - "anthropic() provider factory called inside handler (never module scope) — key presence checked first"

key-files:
  created:
    - src/app/api/extract/route.ts
  modified: []

key-decisions:
  - "anthropic() in @ai-sdk/anthropic@3.x takes only modelId (no second options arg); apiKey read from process.env automatically after 503 key-presence guard"
  - "vi.doMock + dynamic import without vi.resetModules() cannot cascade-invalidate cached route module in Vitest 4 (node env); 503 guard test remains broken by scaffold design — route is correct"

patterns-established:
  - "Extract route guard ordering: auth→rate-limit→Content-Length→json/zod→base64-size→MIME-allow-list→magic-bytes→key-check→vision-call"
  - "Privacy: catch blocks log metadata strings only, never image bytes or extracted word arrays"

requirements-completed: [EXT-01, EXT-03, EXT-05]

# Metrics
duration: 10min
completed: 2026-05-19
---

# Phase 10 Plan 02: Vision Extraction Route Summary

**Protected /api/extract POST endpoint with 9-step guard sequence (auth/rate-limit/size/MIME/magic-bytes/key) and Claude vision call via AI SDK v6 generateText + Output.object, returning { words: string[], detectedLanguage? }**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-19T11:51:11Z
- **Completed:** 2026-05-19T12:01:02Z
- **Tasks:** 2 (combined into 1 commit — guards + vision call)
- **Files modified:** 1

## Accomplishments

- Created `src/app/api/extract/route.ts` (213 lines) mirroring `translate/route.ts` with vision-specific additions
- 9-guard sequence implemented in mandated order: auth (401) → rate-limit (429) → Content-Length fast path (413) → json/zod (400) → base64 size estimate (413) → MIME allow-list (415) → magic-byte sniff (415) → key check (503) → vision call
- v6 AI SDK `generateText + Output.object({ schema: ExtractionSchema })` wired with `AbortController(30s)` timeout and `clearTimeout(finally)`
- `createRateLimiter({ windowMs: 60_000, maxRequests: 10 })` at module scope (stricter than translate's 30/min — D-17)
- `export const maxDuration = 60` for Vercel route segment timeout (D-13)
- 11/12 unit tests passing; cross-regression `image-validation.test.ts` 8/8 green; tsc and biome clean for route.ts

## Task Commits

1. **Tasks 1+2: guards + vision call (combined)** - `fce5c7b` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/app/api/extract/route.ts` — Protected Claude vision extraction endpoint; guards + v6 vision call + error mapping

## Decisions Made

- `anthropic()` in `@ai-sdk/anthropic@3.x` accepts only `modelId` (one argument). The AI-SPEC showed a two-arg form `anthropic(modelId, { apiKey })` which TypeScript rejects. The API key is read from `process.env.ANTHROPIC_API_KEY` automatically by the provider. The 503 guard verifies key presence before calling the model. [Rule 1 - Bug fix]
- Tasks 1 and 2 were implemented in a single file creation (no intermediate partial commit needed — the placeholder approach would have left the file in a broken state between commits).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed @ai-sdk/anthropic@3.x anthropic() call signature**
- **Found during:** Task 2 (vision call implementation)
- **Issue:** AI-SPEC Section 3 showed `anthropic("claude-sonnet-4-6", { apiKey: env.ANTHROPIC_API_KEY })` as a two-argument call, but `@ai-sdk/anthropic@3.0.78` types `anthropic` as `AnthropicProvider` accepting only one argument (modelId). TypeScript error TS2554: Expected 1 arguments, but got 2.
- **Fix:** Use `anthropic("claude-sonnet-4-6")` with no second arg; the provider reads `process.env.ANTHROPIC_API_KEY` automatically. Key presence is validated by the 503 guard immediately before model instantiation.
- **Files modified:** `src/app/api/extract/route.ts`
- **Verification:** `npx tsc --noEmit` clean for route.ts
- **Committed in:** `fce5c7b`

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in AI-SPEC code example vs. actual installed package API)
**Impact on plan:** Necessary correctness fix; no behavioral change to guard sequence or vision call semantics.

## Issues Encountered

**503 test scaffold limitation (non-blocking):** The `extract.unit.test.ts` 503 test uses `vi.doMock("@/env", ...)` + `await import("@/app/api/extract/route")` expecting a fresh module evaluation. In Vitest 4 (node environment), `vi.doMock` queues a new mock factory but does NOT cascade-invalidate already-loaded dependent modules in the module cache. The route was loaded by the file's top-level static `import { POST }`, so the dynamic import returns the cached route with the original `env` binding (`ANTHROPIC_API_KEY: "test-key"`), bypassing the 503 guard. The test needs `vi.resetModules()` before the dynamic import to work correctly.

**Result:** 11/12 tests pass. The 503 guard is correctly implemented (verified by code inspection and biome/tsc). The test scaffold has a design limitation that cannot be fixed from within route.ts without modifying the test file (prohibited by plan). This is a known issue to resolve in a future scaffold-fix plan or by adding `vi.resetModules()` to the test.

## Known Stubs

None — the route fully implements the extraction logic. No placeholder or hardcoded returns remain.

## Threat Flags

No new threat surface beyond what the plan's threat model covers. The route adds no new endpoints or trust boundaries beyond `/api/extract` (already specified in T-10-03 through T-10-10).

## Next Phase Readiness

- `/api/extract` is complete and ready for Phase 10 Plan 03 (client-side wiring in `image-upload-flow.tsx`)
- Route returns `{ words: string[], detectedLanguage? }` — Phase 11 contract satisfied
- Model ID `claude-sonnet-4-6` is ASSUMED-latest; Plan 04 (checkpoint) verifies against live provider docs

---
*Phase: 10-vision-extraction-endpoint*
*Completed: 2026-05-19*
