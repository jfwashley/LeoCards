---
status: partial
phase: 17-performance-optimization
source: [17-04-SUMMARY.md, 17-05 checkpoint]
started: 2026-07-19
updated: 2026-07-19
---

## Current Test

[awaiting human testing — D-05 visual identity, D-17 landing freshness, optional post-deploy re-measure]

## Tests

### 1. D-05 — four Motion→CSS keyframe swaps are visually indistinguishable from the Motion originals
expected: Visit each of the four swapped components (study-session mount fade on entering /study, card-list accordion open/close on /deck/browse, ac-progress indeterminate bar wherever it renders, habitat-teaser glow pulse on the marketing/welcome surface) and confirm each CSS keyframe animation reads as pixel/motion-identical to its prior Motion (framer-motion/motion-react) implementation — same easing feel, same duration, same visual character. Repeat with `prefers-reduced-motion` enabled (OS or DevTools emulation) and confirm each component's reduced-motion branch still behaves correctly (no animation, or the documented reduced fallback), matching the prior Motion-based reduced-motion behavior.
result: [pending]
note: Carried forward from 17-04 (deferred there); the CSS swaps were implemented in 17-04 Task 2 and are code-complete, but Josh has not yet done the side-by-side visual pass.

### 2. D-17 — landing freshness after study completion and card add (no stale/self-correcting numbers)
expected: (a) Complete a full study session end-to-end, land back on /dashboard (or /habitat via the celebrate flow), and confirm the due-count and habitat state shown are immediately correct for the just-completed session — not a stale pre-session number that then flickers/corrects itself a moment later. (b) Add a new card via /deck/new-card, land on /dashboard (or /deck/browse), and confirm the card count is immediately correct on arrival, with no visible self-correction.
result: [pending]
note: Wired via router.refresh() in study-session.tsx (17-05 Task 2, D-17) and via existing revalidatePath() Server Actions for card-add; needs a manual live-browser confirmation since this is a landing-render-timing behavior not fully capturable by the automated e2e content-visible probe.

### 3. Post-deploy re-measure (optional) — Phase 17 code on the live Vercel deployment
expected: After Josh runs `npx vercel deploy --prod --yes` manually, optionally re-run the 4-route measure-cwv as a fresh after-record against the live deployment (rather than the local prod build used for this phase's official after-record) to confirm the measured gains hold in the real hosting environment.
result: [pending]
note: Optional — not required to close Phase 17. The official PERF-03 after-record (2026-07-17T23:07:33Z run) and the PERF-04 nav-gate measurement were both taken against a LOCAL prod build (`next build && next start`, per D-14); prod still runs the 2026-07-15 deployment as of phase close, so Phase 17 Wave 4/5 code (17-04 route work + 17-05 nav/invalidation) is not yet live. This item exists purely so a future re-measure isn't forgotten if Josh wants extra confidence post-deploy.

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

[none — all three items are deferred manual checks, not known defects; items 1 and 2 are functionally complete in code and only need a human visual/behavioral confirmation pass, item 3 is optional and gated on Josh's manual deploy]
