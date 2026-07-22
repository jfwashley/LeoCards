---
phase: 26-performance-batch
plan: 04
subsystem: ui
tags: [canvas, image-resize, createImageBitmap, jsdom, image-upload, vercel-body-limit]

requires:
  - phase: 26-01
    provides: DeepL array-batching precedent for this phase's "collapse N calls into 1" pattern (independent subsystem, sequencing dependency only)

provides:
  - "resizeImageForUpload(file, {maxEdge=1568, quality=0.8}) — zero-dependency client-side canvas downscale before upload"
  - "MAX_IMAGE_BYTES (client) loosened 5MB->20MB; MAX_SERVER_IMAGE_BYTES (server, authoritative) tightened 7MB->4MB — closes the silent 3.3-5MB Vercel body-limit dead zone"
  - "All four scattered '5MB' copy/test/e2e references retargeted to the new caps"
  - "resizeImageForUpload wired into image-upload-flow.tsx's handleExtract before the FileReader/base64/fetch pipeline"

affects: [phase-18-performance-optimization]

tech-stack:
  added: []
  patterns:
    - "Isolate browser-only canvas/createImageBitmap/toBlob calls into a small pure-ish function; test with '// @vitest-environment jsdom' + manual mocks of the three unimplemented jsdom APIs (project convention, not new this plan)"

key-files:
  created:
    - src/lib/image-resize.ts
    - src/lib/image-resize.test.ts
  modified:
    - src/lib/image-constants.ts
    - src/lib/image-constants.test.ts
    - src/lib/image-validation.ts
    - src/lib/image-validation.test.ts
    - e2e/11-phase9-image-upload.spec.ts
    - src/components/image-upload-flow.tsx

key-decisions:
  - "D-06 shipped at the planned default: 1568px long edge, JPEG quality 0.8 — no bump to 0.9 (extraction-accuracy regression testing is deferred to manual UAT, see below; no measured drop observed in this plan's scope)"
  - "D-07 shipped exactly as specified: client cap 5MB->20MB, server cap 7MB->4MB"
  - "Rule 1 fix: mimeType sent to /api/extract hardcoded to image/jpeg (resizeImageForUpload always re-encodes to JPEG) instead of the original file.type, which would fail the server's magic-byte check for any non-JPEG original"

patterns-established: []

requirements-completed: [PERF-10]

duration: 15min
completed: 2026-07-22
---

# Phase 26 Plan 04: Client-side photo resize + cap dead-zone closure Summary

**Photos downscale client-side to ~1568px/JPEG q0.8 via native createImageBitmap+canvas (zero new deps) before upload; server cap drops 7MB->4MB while client cap loosens 5MB->20MB, structurally closing the silent 3.3-5MB Vercel body-limit dead zone.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-22 (session start)
- **Completed:** 2026-07-22T00:00:14Z (approx, per last task commit 01103a0)
- **Tasks:** 3/3 completed
- **Files modified:** 7 (2 created, 5 modified — plus 1 straggler test file caught by the mandatory grep sweep)

## Accomplishments
- `resizeImageForUpload(file, {maxEdge=1568, quality=0.8})` — new isolated helper using `createImageBitmap` (auto-EXIF orientation) + canvas + `toBlob`, zero new npm dependencies
- `MAX_IMAGE_BYTES` (client) loosened 5MB -> 20MB; `MAX_SERVER_IMAGE_BYTES` (authoritative) tightened 7MB -> 4MB, closing the 3.3-5MB dead zone where a body passed the old 7MB app cap but was silently rejected by Vercel's ~4.5MB body limit
- Resize wired into `image-upload-flow.tsx`'s `handleExtract`, running before the existing FileReader -> base64 -> `fetch("/api/extract")` pipeline, honoring the existing D-03 `cancelled` ref guard
- All four scattered "5MB" references (constants, constants test, validation copy, e2e spec) retargeted — plus a fifth straggler (`image-validation.test.ts`, not in the plan's `files_modified` list) caught by the mandatory grep sweep and fixed in the same task

## Task Commits

Each task was committed atomically:

1. **Task 1 (Wave 0): resizeImageForUpload helper + jsdom test** - `c381e0d` (test)
2. **Task 2: Retarget caps + copy (constants, validation, e2e)** - `4f9f160` (fix)
3. **Task 3: Wire resize into the upload flow + 413 copy** - `01103a0` (feat)

_Task 1 is tagged `tdd="true"` in the plan but was executed as a single commit (helper + test together) rather than separate RED/GREEN commits — the plan's own action text specifies creating both files in one action, not a strict RED-then-GREEN sequence, and this matches how the analogous jsdom-tagged tests in this codebase are typically added._

## Files Created/Modified
- `src/lib/image-resize.ts` - NEW: `resizeImageForUpload` — createImageBitmap + canvas + toBlob, 1568px/0.8 defaults
- `src/lib/image-resize.test.ts` - NEW: jsdom-tagged test mocking the three unimplemented browser APIs; covers dimension clamp, no-upscale, jpeg quality default, null-ctx throw
- `src/lib/image-constants.ts` - `MAX_IMAGE_BYTES` 5MB->20MB, `MAX_SERVER_IMAGE_BYTES` 7MB->4MB, comments rewritten (server now intentionally below client cap)
- `src/lib/image-constants.test.ts` - retargeted client assertion, added server-cap assertion
- `src/lib/image-validation.ts` - "under 5MB" literal replaced with an interpolated `${capMb}MB` derived from `MAX_IMAGE_BYTES`
- `src/lib/image-validation.test.ts` - (straggler, not in plan's `files_modified`) retargeted 5MB/7.3MB fixtures to 20MB/22.3MB
- `e2e/11-phase9-image-upload.spec.ts` - oversized-buffer construction and copy assertion retargeted to the 20MB cap
- `src/components/image-upload-flow.tsx` - imports and calls `resizeImageForUpload` before the FileReader step; 413 copy updated to 4MB; mimeType sent to `/api/extract` hardcoded to `image/jpeg`

## Decisions Made
- D-06 shipped at its planned default (1568px / quality 0.8) — no fallback bump to 0.9, since accuracy-regression testing against real photos is explicitly manual/UAT scope (Pitfall 5), not something an automated unit test can validate
- D-07 shipped exactly as specified (client 20MB / server 4MB)
- Rule 1 auto-fix: the plan's action text for Task 3 only mentioned feeding the resized Blob into the FileReader step; while wiring it in, I found the `fetch("/api/extract")` body still sent `mimeType: file.type` (the ORIGINAL file's declared type) alongside the NOW-JPEG-encoded `dataUrl`. The server performs a magic-byte check (`checkMagicBytes(image, mimeType)` at `src/app/api/extract/route.ts:141`) that verifies the declared mimeType against the actual byte signature — a resized PNG or WebP upload would have failed that check with a spurious 415 the moment this plan shipped. Fixed by hardcoding `mimeType: "image/jpeg"` (resizeImageForUpload always re-encodes to JPEG via `canvas.toBlob`), since this is a direct, structural consequence of Task 3's own change, not a pre-existing unrelated bug.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] mimeType sent to /api/extract no longer matched the resized Blob's actual encoding**
- **Found during:** Task 3 (wiring resize into the upload flow)
- **Issue:** `handleExtract` fed the resized (always-JPEG) Blob into the FileReader/base64 pipeline but still declared `mimeType: file.type` (the ORIGINAL file's type, e.g. `image/png`) in the `/api/extract` request body. The server's magic-byte verification (`route.ts:141`) checks the declared mimeType against the actual byte signature and would reject any non-JPEG-original upload as a mismatch.
- **Fix:** Hardcoded `mimeType: "image/jpeg"` in the fetch body, since `resizeImageForUpload` always outputs JPEG via `canvas.toBlob("image/jpeg", quality)`.
- **Files modified:** src/components/image-upload-flow.tsx
- **Verification:** `npx tsc --noEmit` clean; full `npx vitest run` (2200 passed, 6 skipped, unchanged pass count) confirms no regression; scoped biome clean.
- **Committed in:** 01103a0 (Task 3 commit)

**2. [Rule 1/Task-2 explicit instruction — straggler] image-validation.test.ts hardcoded 5MB/7.3MB fixtures**
- **Found during:** Task 2's mandatory grep sweep for "5MB"/"5 * 1024 * 1024"/"under 5MB" across src/ and e2e/ (explicitly required by the plan's Task 2 action text)
- **Issue:** `src/lib/image-validation.test.ts` (not listed in the plan's `files_modified` frontmatter) had a `FIVE_MB` constant and a "rejects a 7.3MB file" test — both would silently pass-through-wrong or fail once `MAX_IMAGE_BYTES` moved to 20MB (a 7.3MB file is now well under the new cap, so that test's rejection assertion would fail).
- **Fix:** Retargeted `FIVE_MB` -> `TWENTY_MB` (20 * 1024 * 1024) and the oversized-fixture test from 7.3MB -> 22.3MB, matching the new cap.
- **Files modified:** src/lib/image-validation.test.ts
- **Verification:** `npx vitest run src/lib/image-validation.test.ts` (3/3 pass); scoped biome clean.
- **Committed in:** 4f9f160 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 straggler-fix explicitly mandated by the plan's own grep-sweep instruction)
**Impact on plan:** Both fixes were necessary for correctness — the mimeType fix prevents a shipped-and-broken image-upload path for non-JPEG originals; the straggler-test fix was explicitly required by Task 2's own acceptance criteria ("grep of e2e/ finds no stale 'under 5MB'" extended in spirit to src/, per Pitfall 4's stated scope). No scope creep beyond what the plan itself specified.

## Issues Encountered
None.

## D-06 Fallback Status (per plan's <output> instruction)

Quality stayed at the planned default 0.8 — the D-06 fallback rule ("bump to 0.9 ONLY if extraction accuracy measurably drops in testing") was NOT triggered. No accuracy regression was observed or tested in this plan's automated scope; **real-photo extraction-accuracy fidelity at quality 0.8 is deferred to manual UAT** (per the plan's own `<verification>` note and 26-RESEARCH.md Pitfall 5 — jsdom cannot exercise real canvas/JPEG encoding, only mocked dimensions/calls). If a future UAT session finds measurably degraded extraction accuracy, bump `quality` to 0.9 in `image-resize.ts`'s default parameter.

## Real-photo / EXIF Fidelity (manual UAT, deferred)

Per 26-RESEARCH.md Pitfall 5 and this plan's own verification section: whether a real photo visually resizes correctly and EXIF orientation is honored is NOT covered by the jsdom-mocked unit test (which only asserts mocked bitmap dimensions and mocked API call shapes). This is consistent with the project's existing "unit-test pure logic, manually verify browser rendering" split. Recommend a manual smoke test (upload a real portrait-orientation phone photo via `/deck/new-card` -> "From an image") as part of the phase-level UAT pass, not blocking this plan's completion.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PERF-10 fully satisfied: client-side resize wired end-to-end, dead zone closed, all copy/tests/e2e retargeted, zero new dependencies, tsc + full vitest suite (2200 tests) green.
- Ready for the orchestrator's wave-gate (full `npx tsc --noEmit` + full `npx vitest run` — both already re-confirmed green in this plan) and the e2e gate (`npx playwright test e2e/11-phase9-image-upload.spec.ts` against a freshly-restarted dev server, per project convention).
- Remaining phase work: PERF-11 (Cache-Control immutable headers for habitat clips, plan 26-05) is the last item before Phase 26 closes and Phase 18's re-cert gate can run.

---
*Phase: 26-performance-batch*
*Completed: 2026-07-22*

## Self-Check: PASSED

All 8 created/modified source files + this SUMMARY.md confirmed present on disk; all 3 task commits (c381e0d, 4f9f160, 01103a0) confirmed present in git log.
