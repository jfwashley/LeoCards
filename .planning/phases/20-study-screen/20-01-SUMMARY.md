---
phase: 20-study-screen
plan: 01
subsystem: ui
tags: [react, motion, tailwind, daybreak, study-card, flashcard, e2e, playwright]

# Dependency graph
requires:
  - phase: 19-daybreak-foundation-onboarding-auth
    provides: Daybreak card surface tokens (auth-card.tsx, card.tsx), GhostPeek atom — reused for study card reskin
provides:
  - Daybreak-skinned StudyCard (radius 22, #FFFFFF, #F0E3CF border, soft shadow, Baloo 2 42px word, ALL-CAPS prompt, amber pill, green/red swipe feedback)
  - Daybreak-skinned CardStack (same card surface, count-aware 1-3 layers)
  - data-testid="card-back-hint" on back-face swipe-cue (scoped e2e locator for 20-02 and QA)
  - Retargeted 06 + 12 e2e specs (getByTestId("card-back-hint") replaces stale /Swipe right/)
affects:
  - 20-02 (imports StudyCard/CardStack by unchanged prop signatures; runs the same e2e specs)
  - e2e/06-study-session.spec.ts (line ~37 retargeted — 20-02 touches lines ~23/~71 only)
  - e2e/12-pause-cards.spec.ts (line ~80 retargeted)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Daybreak card surface applied via inline style (borderRadius:22, #FFFFFF, 1px #F0E3CF, box-shadow amber) — same pattern as auth-card.tsx"
    - "Back-face swipe-cue tagged data-testid=card-back-hint for unambiguous Playwright scoping"
    - "Swipe feedback uses Daybreak palette: rgba(62,155,95) green / rgba(222,95,74) red via useTransform"
    - "e2e locator retarget: getByTestId scopes card-back vs below-card showSwipeHint to avoid strict-mode multi-match"

key-files:
  created: []
  modified:
    - src/components/card-stack.tsx
    - src/components/study-card.tsx
    - e2e/06-study-session.spec.ts
    - e2e/12-pause-cards.spec.ts

key-decisions:
  - "Adapt card-stack.tsx in place (not reuse GhostPeek atom) — auth GhostPeek renders top-edge strips (h:22px) while study stack needs full-height ghost cards shifted down; in-place reskin is lower-risk and preserves count-aware translateY/scale geometry"
  - "data-testid=card-back-hint is additive only — avoids bare getByText(/still learning/) which multi-matches both the back-face cue and the below-card showSwipeHint pill in study-session.tsx"
  - "StudyCard and CardStack prop signatures left entirely unchanged — 20-02 depends on importing them as-is"
  - "Task 3 (e2e gate) run on a FRESH dev server after killing the degraded old server (PID 39412) — first run against old server timed out at helpers.ts:78; second run 14/14 passed in 4.0 min"
  - "Overlay rounded-xl → rounded-[22px] (Pitfall 6) to match Daybreak card corners"

patterns-established:
  - "Daybreak card surface for study components: inline style matching auth-card.tsx surface (lines 184-194)"
  - "Back-face interaction cues use data-testid for Playwright scoping when text is ambiguous across DOM elements"

requirements-completed: [STU-01]

# Metrics
duration: 52min
completed: 2026-06-20
---

# Phase 20 Plan 01: Study Card + Ghost-Peek Stack Daybreak Reskin Summary

**Daybreak card surface applied to StudyCard and CardStack: radius 22 white-card with #F0E3CF amber border, 42px Baloo 2 word, ALL-CAPS prompt, amber Tap-to-reveal pill, Daybreak green/red swipe feedback; flip/swipe/keyboard/QABadge preserved; behavior-preservation e2e 14/14 green**

## Performance

- **Duration:** 52 min
- **Started:** 2026-06-20T23:06:18Z
- **Completed:** 2026-06-20T23:58:59Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments

- `card-stack.tsx` reskinned from shadcn `rounded-xl bg-card border-border` to Daybreak card surface (borderRadius:22, #FFFFFF, 1px solid #F0E3CF); count-aware geometry (Math.min(3), opacities, translateY/scale) preserved exactly; no progress indicator added (D-01/D-03)
- `study-card.tsx` fully reskinned: Daybreak surface on both faces, ALL-CAPS 12.5px/700/2.2 prompt, 42px font-display word, amber "Tap to reveal" pill, Daybreak green rgba(62,155,95)/red rgba(222,95,74) swipe overlays, overlay radius corrected to rounded-[22px] (Pitfall 6); back-face swipe cue tagged `data-testid="card-back-hint"`; handleKeyDown, handleDragEnd, 3D flip, 300ms guard, and QaStateBadge mount preserved byte-for-byte (D-02)
- Behavior-preservation e2e gate: 14/14 passed (06-study-session, study-progression, 14-qa-parity) after fresh dev server restart — tap-flip, keyboard arrows, quit/retry, full progression loop, QA-badge parity all confirmed
- e2e locators retargeted: stale `getByText(/Swipe right/)` in 06 (line ~37) and 12 (line ~80) replaced with `getByTestId("card-back-hint")`; 14 passed / 4 skipped (mobile 12-pause-cards skip is per-spec design)

## Task Commits

Each task was committed atomically:

1. **Task 1: Reskin card-stack.tsx to Daybreak card surface** - `dbb3c94` (feat)
2. **Task 2: Reskin study-card.tsx — Daybreak surface, swipe colors, prompt/word/pill** - `e0b0929` (feat)
3. **Task 3: Behavior-preservation e2e gate** - (verification-only, no code changes — documented here)
4. **Task 4: Retarget stale Swipe right e2e assertions** - `e9ce269` (test)

**Plan metadata:** (docs commit follows)

## Dev Server Note (per VALIDATION.md gotcha)

The e2e gate (Task 3) was run with a FRESH dev server, as required. The initial e2e run was against a degraded old server (PID 39412) which had been running before plan execution started. That run timed out at `helpers.ts:78` (`waitForURL(/\/welcome/)`) for all tests. After killing the old server and starting a fresh one (PID 29948), all 14 behavior-preservation tests passed in 4.0 minutes. The Task 4 e2e run (06 + 12) also passed 14/14 (4 skipped) on the same fresh server.

## Files Created/Modified

- `src/components/card-stack.tsx` — Daybreak card surface tokens on layer divs; count-aware geometry preserved
- `src/components/study-card.tsx` — Daybreak reskin: surface, swipe colors, prompt style, back-face cue with data-testid; PRESERVE zone intact
- `e2e/06-study-session.spec.ts` — Line ~37 retargeted to getByTestId("card-back-hint"); quit-control assertions (lines ~23/~71) untouched for 20-02
- `e2e/12-pause-cards.spec.ts` — Line ~80 retargeted to getByTestId("card-back-hint")

## Decisions Made

- Adapted `card-stack.tsx` in place rather than reusing the `GhostPeek` atom — the auth card GhostPeek renders 22px top-edge strips, not full-height ghost cards shifted down. Reskinning in place preserves the existing translateY/scale geometry without geometry changes.
- `data-testid="card-back-hint"` added to the swipe-cue `<p>` — additive only, no copy change. "still learning" appears in BOTH the back-face cue AND the below-card `showSwipeHint` pill in study-session.tsx (at the post-flip moment both are visible: currentIndex===0, swipeReady fires within 2s). A bare `getByText(/still learning/)` would throw a strict-mode "resolved to N elements" error.
- Overlay divs changed from `rounded-xl` to `rounded-[22px]` (Pitfall 6) to match the Daybreak 22px card corner radius.

## Deviations from Plan

None - plan executed exactly as written. The dev server cold-start issue during Task 3 (first e2e run against degraded old server timed out) is documented under Dev Server Note but is not a deviation — it is the known VALIDATION.md gotcha. The fix (kill + restart) is the prescribed procedure.

## Issues Encountered

- First e2e run (Task 3) timed out for all tests at `helpers.ts:78` because a stale pre-existing dev server (PID 39412) was still running. After killing it with `Stop-Process` and starting a fresh server, all 14 tests passed in 4.0 min. The initial `kill via netstat` command failed silently due to bash-on-Windows awk field parsing; PowerShell `Stop-Process` succeeded.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `StudyCard` and `CardStack` prop signatures are unchanged — 20-02 can import them as-is
- `e2e/06-study-session.spec.ts` lines ~23/~71 (quit-control assertions) are untouched — 20-02 retargets those disjoint lines
- Daybreak study card surface is now consistent with auth cards from Phase 19
- The `card-back-hint` testid is available for any future e2e that needs to scope the card-back swipe cue

## Threat Flags

None. This plan is presentation-only — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The QaStateBadge mount condition is preserved verbatim; `e2e/14-qa-parity.spec.ts` confirms badge absent from customer DOM.

---
*Phase: 20-study-screen*
*Completed: 2026-06-20*

## Self-Check: PASSED

**Files exist:**
- [x] `src/components/card-stack.tsx` — present, contains `borderRadius: 22` and `#F0E3CF`
- [x] `src/components/study-card.tsx` — present, contains `rgba(62,155,95`, `rgba(222,95,74`, `borderRadius: 22` (×2), `data-testid="card-back-hint"`, `qaCardData && <QaStateBadge`
- [x] `e2e/06-study-session.spec.ts` — present, contains `getByTestId("card-back-hint")`, no `getByText(/Swipe right/)`
- [x] `e2e/12-pause-cards.spec.ts` — present, contains `getByTestId("card-back-hint")`, no `getByText(/Swipe right/)`

**Commits exist:**
- [x] `dbb3c94` — feat(20-01): reskin ghost-peek stack
- [x] `e0b0929` — feat(20-01): reskin flashcard
- [x] `e9ce269` — test(20-01): retarget stale assertions

**E2E results:**
- [x] Behavior-preservation (06 + study-progression + 14-qa-parity): 14/14 passed (fresh server)
- [x] Retarget verification (06 + 12): 14 passed, 4 skipped (mobile 12-pause-cards per spec design)

**TypeScript:** `npx tsc --noEmit` exits 0 (TSC-OK)
