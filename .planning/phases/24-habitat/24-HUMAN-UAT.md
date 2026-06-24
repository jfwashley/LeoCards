---
status: partial
phase: 24-habitat
source: [24-VERIFICATION.md]
started: 2026-06-24
updated: 2026-06-24
---

## Current Test

[awaiting human testing]

## Tests

### 1. HAB-01 — kept-video + Daybreak overlay reads correctly across levels
expected: Visit /habitat at L1 (Bare mound), L5 (mid), and L9 (Golden hour). The kept pre-rendered video renders inside the contained 16/9 card with the Daybreak CSS overlays (chrome, mood tint, bottom card) composited over it — reads as the intended re-skin, not a broken or full-screen layout.
result: [pending]

### 2. HAB-02 — mood expressed distinctly (tint + mood chip)
expected: Cycle all 4 engine moods (excited/happy/neutral/sad). The CSS mood tint shift over the video and the HMoodChip colour-dot + label are perceptually distinct per mood; the tint composites WITH the existing decay filter (not replacing it).
result: [pending]

### 3. HAB-03 — bottom progress card visual fidelity
expected: HProgCard shows "Level N · {name}", an amber progress-bar fill at the correct proportion, and "Next at L{at}: {what}" for L1–8; at L9 it shows "Course 1 complete — you grew the whole world." with no bar. Matches the handoff mock. (REQUIREMENTS.md marks HAB-03 Pending — this is the gating visual check.)
result: [pending]

### 4. HAB-04 — 3-tier motion in a live browser
expected: Desktop autoplays the looping clip; mobile (real device or DevTools emulation < 768px) autoplays then freezes to the still after ~10s and pauses offscreen / resumes on re-entry (IntersectionObserver); prefers-reduced-motion shows the still poster only plus the "Motion paused" label. No confetti flash for reduced-motion users (WR-01 SSR-safe).
result: [pending]

### 5. HAB-05 — all 8 Daybreak state boards
expected: Trigger each of the 8 boards and confirm visual quality: new-user L1, mid L5, lush L9, level-up celebration (/habitat?celebrate=5 — confetti + "Level N" + reveal, auto-settles ~2.5s with no tap), decaying ("Leo misses you" + Study now), offline banner, error ("We couldn't load your habitat." + Try again), reduced-motion. No separate sleeping/night-cycle board.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
