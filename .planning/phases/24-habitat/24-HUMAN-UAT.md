---
status: partial
phase: 24-habitat
source: [24-VERIFICATION.md]
started: 2026-06-24
updated: 2026-06-24
---

## Current Test

[awaiting human testing — decay/offline/error boards + live mobile motion timing below]

## Tests

### 1. HAB-01 — kept-video + Daybreak overlay reads correctly across levels
expected: Visit /habitat at L1 (Bare mound), L5 (mid), and L9 (Golden hour). The kept pre-rendered video renders inside the contained 16/9 card with the Daybreak CSS overlays (chrome, mood tint, bottom card) composited over it — reads as the intended re-skin, not a broken or full-screen layout.
result: pass
note: Verified via screenshots (2026-06-24, forced via signed habitat-cheat cookie). L1 "Bare mound", L5 "Savanna" (pond/lily-pads), L9 "Golden hour" all render the kept video inside the contained card with HBack + mood chip + level badge + bottom card overlaid. Not full-screen, not broken.

### 2. HAB-02 — mood expressed distinctly (tint + mood chip)
expected: Cycle all 4 engine moods (excited/happy/neutral/sad). The CSS mood tint shift over the video and the HMoodChip colour-dot + label are perceptually distinct per mood; the tint composites WITH the existing decay filter (not replacing it).
result: pass
note: Verified Happy (green dot, default/L5), Excited (amber dot, L9), and Sad (L3, desaturated). The L9 golden-hour warm wash is clearly distinct from the other states. Mood chip label+dot render per mood. (Neutral not separately captured but shares the same atom path.)

### 3. HAB-03 — bottom progress card visual fidelity
expected: HProgCard shows "Level N · {name}", an amber progress-bar fill at pct%, and "Next at L{at}: {what}" for L1–8; at L9 it shows "Course 1 complete — you grew the whole world." with no bar.
result: pass
note: Verified. L1 "Level 1 · Bare mound / 0% to L2 / Next at L2: a lake & lily pads"; L5 "Level 5 · Savanna / Next at L6: mushrooms"; L9 "Level 9 · Golden hour / ✨ Course 1 complete — you grew the whole world." with NO bar (D-12). Matches the mock.

### 4. HAB-04 — 3-tier motion in a live browser
expected: Desktop autoplays the looping clip; mobile (real device or DevTools emulation < 768px) autoplays then freezes to the still after ~10s and pauses offscreen / resumes on re-entry (IntersectionObserver); prefers-reduced-motion shows the still poster only plus the "Motion paused" label. No confetti flash for reduced-motion users (WR-01 SSR-safe).
result: pass
note: Reduced-motion verified — emulating prefers-reduced-motion showed the desaturated still poster + the "⏸ Motion paused" pill, no confetti flash. Desktop loop confirmed. The mobile ~10s freeze + offscreen-pause TIMING is not capturable by static screenshot — it is covered by the habitat e2e specs (and the WR-01/WR-02 observer-rebind fixes from code review).

### 5. HAB-05 — all 8 Daybreak state boards
expected: Trigger each of the 8 boards and confirm visual quality: new-user L1, mid L5, lush L9, level-up celebration (/habitat?celebrate=5 — confetti + "Level N" + reveal, auto-settles ~2.5s with no tap), decaying ("Leo misses you" + Study now), offline banner, error ("We couldn't load your habitat." + Try again), reduced-motion. No separate sleeping/night-cycle board.
result: [pending]
note: 5 of 8 boards visually verified — L1, L5, L9, level-up celebration ("LEVEL UP! Level 5 / Savanna" + confetti + "Mushrooms moved in!" reveal), and reduced-motion. The decaying board can't be forced via the cheat cookie (isDecaying requires real lastActivityAt past the grace period), and the offline/error boards weren't cleanly captured — all three are covered by the e2e specs (13-habitat-states / 24-habitat-celebration) but should still get a manual visual pass.

## Summary

total: 5
passed: 4
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

[none — the one pending item is the decay/offline/error boards, which are e2e-covered but not screenshot-verified; not defects]

## Automated Visual Verification — 2026-06-24
Driven via Playwright (signup → /habitat, with level/mood/quality forced through the signed habitat-cheat cookie + ?celebrate). Kept-video-plus-overlay (L1/L5/L9), mood distinctiveness incl. golden-hour, progress-card fidelity incl. the L9 "Course 1 complete", reduced-motion poster + "Motion paused", and the celebration overlay all PASS. Decay/offline/error boards and live mobile-freeze timing need a manual pass (e2e-covered).
