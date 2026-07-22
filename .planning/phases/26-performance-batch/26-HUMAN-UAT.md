---
status: partial
phase: 26-performance-batch
source: [26-VERIFICATION.md]
started: 2026-07-22T01:20:00.000Z
updated: 2026-07-22T01:20:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Real-photo resize fidelity (D-06)
expected: Upload a real phone photo (ideally >5 MB, portrait EXIF orientation) via Add a card → From an image. The photo should upload in a few hundred KB (check network tab: /api/extract payload), extraction accuracy should be comparable to before, and the preview/orientation should be correct. If extraction accuracy measurably drops at JPEG q0.8, bump `JPEG_QUALITY` in src/lib/image-resize.ts to 0.9 (D-06 fallback rule).
result: [pending]

### 2. Prod Cache-Control header on habitat clips (D-08 / A2)
expected: After the next production deploy, `curl -sI https://leocards.vercel.app/habitat/clips/l1-excited.mp4` returns `Cache-Control: public, max-age=31536000, immutable` (dev/prod parity of next.config headers() on Vercel static serving is the one unverified research assumption). Repeat habitat visits should hit browser cache (no clip re-download in the network tab).
result: [pending]

### 3. Study-save stopwatch note (D-02)
expected: Informal before/after observation: the "Saving your progress…" moment after a study session should feel noticeably shorter (was ~27 sequential Neon round trips, now 1 atomic batch). Note the rough timing in the phase summary; no timing gate by design.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
