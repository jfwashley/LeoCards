---
status: partial
phase: 27-performance-batch-2
source: [27-VERIFICATION.md]
started: 2026-07-22T23:30:00.000Z
updated: 2026-07-22T23:30:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Real-photo extraction quality parity (D-05 residual, PERF-17)
expected: On a prod build, extract a few REAL phone photos (menus, signs, handwriting; include a >5 MB portrait-EXIF one) via Add a card → From an image on `claude-haiku-4-5`. Per-word accuracy should match what sonnet used to give (no missed words, no hallucinations, accents intact). Context: the synthetic screenshot side-by-side showed identical 20/20 word sets with correct accents, Haiku API median ~2.1s; but Haiku was noisier on a NON-vocab image (returned UI-chrome text where sonnet returned almost nothing) — check junk-word volume on busy real photos. Revert = one-line swap back to claude-sonnet-4-6 in src/app/api/extract/route.ts if quality measurably drops.
result: [pending]

### 2. Pause-toggle perceived responsiveness (PERF-13)
expected: On /dashboard's card list, tapping pause/resume flips the pill INSTANTLY (optimistic), with no flash-back; rapid multi-taps coalesce; a failed toggle visibly rolls back with a transient error.
result: [pending]

### 3. Backdrop-blur removal visual check (PERF-22)
expected: On /habitat with the video playing (prod build), the progress card, back button, and mood chip still read clearly over the moving video with their ~92%-opaque backgrounds — no legibility loss now the blur is gone. Trivially revertible if any panel looks wrong.
result: [pending]

### 4. Post-deploy bundle-size confirmation (PERF-14, zod/mini)
expected: After the next prod deploy (or a local `npm run build`), first-load JS for /signup and /login is smaller than the pre-phase-27 build (RESEARCH A2 estimated ~44KB directional across 9 importers). Confirm via build output or bundle analyzer; note the real delta in the phase summary.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
