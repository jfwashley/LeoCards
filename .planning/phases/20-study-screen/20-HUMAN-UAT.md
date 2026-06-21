---
status: partial
phase: 20-study-screen
source: [20-VERIFICATION.md]
started: 2026-06-21
updated: 2026-06-21
---

## Current Test

[awaiting human testing]

## Tests

### 1. Study card front face visual fidelity
expected: Daybreak card surface (radius-22 white, 1px #F0E3CF border, soft amber shadow), ALL-CAPS "WHAT'S THE TRANSLATION?" prompt (muted, letter-spaced), 42px Baloo 2 word, amber "Tap to reveal" pill (#B4762A on #FFF1DC) — matches design/handoff-daybreak hifi-shared.jsx HiFiStudy
result: [pending]

### 2. Ghost-peek stack geometry + count-aware decrement
expected: up to 3 white Daybreak card edges (radius 22, #F0E3CF border) thinning toward session end; it is the SOLE "cards remaining" cue (no "N of M" counter, no progress bar)
result: [pending]

### 3. Swipe color feedback animation
expected: progressive green (#3E9B5F) overlay on swipe-right / red (#DE5F4A) on swipe-left, ramping with gesture distance; replaces the old generic green-100/red-100 overlays
result: [pending]

### 4. Back-face hint vs below-card pill visual distinctness
expected: post-flip back-face cue "← still learning · got it →" (arrows colored red/green) reads clearly and is visually distinct from the below-card hint pill ("Swipe → if you got it · ← still learning")
result: [pending]

### 5. End screen visual fidelity
expected: Daybreak LionFace (size 80) replaces the 🐯 emoji; three stats in Baloo 2 display numerals (32px); "learned" is the amber hero number; "Back to deck" is a Daybreak TBtn; NO mini-habitat teaser
result: [pending]

### 6. Level-up overlay visual fidelity
expected: static Soft-Clay Leo (widget-l{level}.webp, clamped ≤9) over a cream overlay (rgba(255,246,233,0.92), no backdrop blur); Daybreak-recolored confetti (#F28A1F/#3E9B5F/#DE5F4A/#F2B33A/#4A331C); "Your habitat grew!" beat; tap-anywhere-to-dismiss works
result: [pending]

### 7. Reduced-motion confetti gate (DevTools emulation)
expected: with prefers-reduced-motion: reduce emulated, the level-up overlay shows the static Leo + level summary but NO falling confetti particles (the 3D card flip + swipe tilt keep their current motion this phase). NOTE: code review WR-01 flags a possible brief confetti flash on first paint before the hook resolves — watch for it
result: [pending]

### 8. Daybreak session chrome layout
expected: top bar shows a glyph-only X-circle quit (40×40, 1.5px #EDDFC9 border, aria-label "Quit study session") + centered "Study session" label + right spacer; quit-confirm popover is a Daybreak card surface with "Keep studying" / "Save and quit"; committing ("Saving your progress…") and error/retry states are Daybreak-restyled
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
