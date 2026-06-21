---
phase: 20-study-screen
plan: 02
subsystem: ui
tags: [react, motion, tailwind, daybreak, study-session, level-up, confetti, reduced-motion, e2e, playwright, vitest]

# Dependency graph
requires:
  - phase: 20-study-screen
    provides: Daybreak-skinned StudyCard and CardStack (20-01); Daybreak primitives LionFace/TBtn/usePrefersReducedMotion (Phase 19)
provides:
  - Daybreak level-up overlay: static Soft-Clay Leo (widget-l{N}.webp, L9-clamped), Daybreak confetti palette, prefers-reduced-motion confetti gate (D-05/D-06)
  - Daybreak session chrome: X-circle quit (aria-label="Quit study session"), centered "Study session" label, Daybreak quit-confirm popover
  - Daybreak committing/error states: LionFace + TBtn retry
  - Daybreak end screen: LionFace size=80 replaces tiger 🐯, Baloo 2 font-display text-[32px] stat numerals, amber "learned" hero, TBtn "Back to deck"
  - Wave 0 D-06 component test: confetti absent under reduced motion, Leo + summary always present, L9 asset clamp locked
affects:
  - e2e/06-study-session.spec.ts (lines ~23/~71 quit-control retargeted to getByRole)
  - e2e/10-mobile-responsive.spec.ts (line ~72 retargeted to getByRole)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reduced-motion confetti gate: {!reduced && <div data-testid='confetti-layer'>...36 particles...</div>} pattern using usePrefersReducedMotion hook"
    - "biome-ignore lint/performance/noImgElement with justification comment for dynamic-src plain <img> (matches image-upload-flow.tsx precedent)"
    - "type='button' required on plain <button> elements per biome a11y/useButtonType"
    - "TDD RED/GREEN with stable data-testid + data-confetti-particle hooks enabling component render tests without user interaction"

key-files:
  created:
    - src/components/__tests__/level-up-overlay.test.tsx
  modified:
    - src/components/level-up-overlay.tsx
    - src/components/study-session.tsx
    - e2e/06-study-session.spec.ts
    - e2e/10-mobile-responsive.spec.ts

key-decisions:
  - "level === 10 copy condition in level-up-overlay.tsx preserved verbatim per CONTEXT Deferred scope fence — NOT changed to level >= 9; dead branch (habitat caps at L9) is flagged for a separate non-Daybreak logic ticket"
  - "leveledUp === 10 dead branch in handleLevelUpDismiss (study-session.tsx PRESERVE zone) left untouched byte-for-byte — scope fence enforced"
  - "plain <img> used for Soft-Clay Leo (not next/image) — dynamic template-literal src with Math.min clamp is unsupported by next/image; biome-ignore with justification comment added per project precedent in image-upload-flow.tsx"
  - "Pre-existing e2e failure in 10-mobile-responsive.spec.ts line 103 (Add a card strict-mode violation) documented as pre-existing; core behavior-preservation gate (06-study-session + study-progression + 14-qa-parity) is 14/14 green"
  - "Biome auto-formatting applied to both modified components (biome format --write + biome check --fix for import ordering)"
  - "type='button' added to plain <button> elements in Daybreak chrome per biome a11y/useButtonType rule"

patterns-established:
  - "Reduced-motion gate pattern: import usePrefersReducedMotion; const reduced = usePrefersReducedMotion(); gate decorative animation with {!reduced && ...}"
  - "TDD stable hook pattern: add data-testid + data-attribute to animation containers so component tests can query without user-event interaction"

requirements-completed: [STU-02]

# Metrics
duration: 36min
completed: 2026-06-21
---

# Phase 20 Plan 02: Study Session Chrome + Level-Up Overlay Daybreak Reskin Summary

**Daybreak level-up overlay with Soft-Clay Leo (widget-l{N}.webp, L9-clamped), Daybreak confetti palette (#F28A1F #3E9B5F #DE5F4A #F2B33A #4A331C) gated behind prefers-reduced-motion, plus Daybreak session chrome (X-circle quit, centered label, cream end screen with LionFace + Baloo 2 numerals + amber 'learned' hero + TBtn), with Wave 0 D-06 component test and full behavior-preservation e2e gate green**

## Performance

- **Duration:** 36 min
- **Started:** 2026-06-21T00:05:48Z
- **Completed:** 2026-06-21T00:42:00Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments

- `level-up-overlay.tsx` fully reskinned to Daybreak: static Soft-Clay Leo `widget-l${Math.min(level,9)}.webp` (L9-clamped, never widget-l10.webp which does not exist), Daybreak confetti palette (#F28A1F, #3E9B5F, #DE5F4A, #F2B33A, #4A331C), confetti gated with `{!reduced && <div data-testid="confetti-layer">...}` via `usePrefersReducedMotion`, cream overlay `rgba(255,246,233,0.92)`, dead `level === 10` copy condition preserved verbatim per CONTEXT Deferred scope fence
- `study-session.tsx` render zone (lines ~297-483) reskinned to Daybreak: X-circle quit button with `aria-label="Quit study session"` + centered "Study session" label + 40px spacer; Daybreak quit-confirm card surface; committing LionFace size=48; error LionFace size=56 + TBtn retry; end screen LionFace size=80 replaces 🐯, Baloo 2 `font-display text-[32px]` stat numerals, amber `text-primary` on "learned" hero, TBtn "Back to deck"; Daybreak hint pill; PRESERVE zone (lines 1-294 incl. reducer/commitIdRef/handleLevelUpDismiss/`leveledUp===10` dead branch) untouched byte-for-byte
- Wave 0 D-06 component test (TDD RED→GREEN): 12/12 tests pass — confetti absent under reduced motion, Leo+summary always present, `level=12` clamps to `widget-l9`, `level=5` yields `widget-l5`
- Behavior-preservation e2e gate: 14/14 passed on core specs (06-study-session 5/5, study-progression, 14-qa-parity); quit-control retargets in 06 (~23/~71) and 10 (~72) use `getByRole("button",{name:/quit study session/i})`
- Dev server killed and restarted fresh before e2e run per VALIDATION.md gotcha

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 D-06 test (RED)** - `b29e041` (test)
2. **Task 2: level-up-overlay.tsx Daybreak reskin (GREEN)** - `072a997` (feat)
3. **Task 3: study-session.tsx render zone Daybreak reskin** - `15defec` (feat)
4. **Task 4: e2e selector retargets + behavior-preservation gate** - `a4225ce` (test)

**Plan metadata:** (docs commit follows)

## Dev Server Note (per VALIDATION.md gotcha)

The e2e gate (Task 4) was run with a FRESH dev server per the required procedure. Any prior server on :3000 was killed first (`taskkill //F //PID`), then `npm run dev` was started fresh in the background. The server was confirmed responding (HTTP 307 redirect to /login) before running Playwright.

## Confetti Palette

Daybreak palette used: `["#F28A1F", "#3E9B5F", "#DE5F4A", "#F2B33A", "#4A331C"]`
- #F28A1F — amber (primary Daybreak accent)
- #3E9B5F — green (Daybreak success/swipe-right)
- #DE5F4A — red (Daybreak error/swipe-left)
- #F2B33A — gold
- #4A331C — ink (Daybreak dark)

## Files Created/Modified

- `src/components/__tests__/level-up-overlay.test.tsx` — Wave 0 D-06 component test: confetti absent under reduced motion, Leo+summary always present, L9 clamp; jsdom env with vi.mock for usePrefersReducedMotion
- `src/components/level-up-overlay.tsx` — Daybreak reskin: Soft-Clay Leo (static widget-l{N}.webp, L9-clamped), Daybreak confetti, reduced-motion gate, cream overlay; `level===10` copy condition PRESERVED
- `src/components/study-session.tsx` — Daybreak render zone only (lines ~297-end): X-circle quit chrome, Daybreak quit-confirm, LionFace/TBtn imports replacing shadcn Button, end screen D-04; PRESERVE zone (lines 1-294) untouched
- `e2e/06-study-session.spec.ts` — Lines ~23/~71: `getByText("Quit session")` -> `getByRole("button",{name:/quit study session/i})`; `getByText("Quit session?")` popover heading at ~72 preserved
- `e2e/10-mobile-responsive.spec.ts` — Line ~72: `getByText("Quit session")` -> `getByRole("button",{name:/quit study session/i})`

## Decisions Made

- Dead branches preserved verbatim: `level === 10` in level-up-overlay.tsx copy block and `leveledUp === 10` in handleLevelUpDismiss (study-session.tsx PRESERVE zone) intentionally left as-is per CONTEXT Deferred scope fence. The `level >= 9` example in 20-PATTERNS.md was correctly declined for Phase 20 (presentation-only phase, logic preserved).
- Plain `<img>` used for Soft-Clay Leo — dynamic template-literal src (`/habitat/widget-l${assetLevel}.webp`) is unsupported by next/image; added `biome-ignore lint/performance/noImgElement` comment per project precedent (matches image-upload-flow.tsx pattern).
- `type="button"` added to plain `<button>` elements in Daybreak chrome per biome `a11y/useButtonType` rule (auto-fix).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Convention] biome-ignore comment for plain `<img>` tag**
- **Found during:** Task 4 (biome ci gate)
- **Issue:** Biome `lint/performance/noImgElement` error on the Soft-Clay Leo `<img>` in level-up-overlay.tsx
- **Fix:** Added `{/* biome-ignore lint/performance/noImgElement: dynamic src with Math.min clamp is unsupported by next/image ... */}` comment per project precedent in image-upload-flow.tsx
- **Files modified:** src/components/level-up-overlay.tsx
- **Verification:** `npx biome ci src/components/level-up-overlay.tsx` exits 0

**2. [Rule 2 - Missing Convention] type="button" on plain button elements**
- **Found during:** Task 4 (biome ci gate)
- **Issue:** Biome `a11y/useButtonType` error on the X-circle quit button and Keep studying button in study-session.tsx
- **Fix:** Added `type="button"` to both `<button>` elements
- **Files modified:** src/components/study-session.tsx
- **Verification:** `npx biome ci src/components/study-session.tsx` exits 0

**3. [Rule 2 - Missing Convention] Biome import ordering + formatting**
- **Found during:** Task 4 (biome ci gate)
- **Issue:** Import ordering (organizeImports) and formatting (printWidth) errors in level-up-overlay.tsx and study-session.tsx
- **Fix:** `npx biome format --write` + `npx biome check --fix --unsafe` to apply safe import ordering and formatting
- **Files modified:** src/components/level-up-overlay.tsx, src/components/study-session.tsx, src/components/__tests__/level-up-overlay.test.tsx (import order)
- **Verification:** `npx biome ci` exits 0 for all modified component files

---

**Total deviations:** 3 auto-fixed (all Rule 2 — missing project conventions / biome compliance)
**Impact on plan:** All fixes are biome lint/format compliance fixes. No scope creep. No logic changes. All are within the scope of files this plan created or modified.

## Pre-Existing Issues (Out of Scope)

**e2e/10-mobile-responsive.spec.ts line 103** — "add card form stacks vertically on mobile" fails with strict-mode violation: `getByRole('link', {name: 'Add a card'})` matches 2 elements. This failure exists on the pre-Wave-2 codebase (our only change to this file was at line 72). Documented here; not fixed (out of scope — unrelated to study session chrome / level-up reskin). The "study session is usable on mobile" test (line 62 — our retarget) passes 2/2.

**e2e/10-mobile-responsive.spec.ts lines 92+115** — `noNonNullAssertion` biome warnings on pre-existing `box!.height` and `frBox!.y` assertions. Out of scope.

## Issues Encountered

None specific to this plan's implementation. The biome compliance deviations above were straightforward auto-fixes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 20 complete: both plans (20-01 StudyCard/CardStack + 20-02 chrome/end-screen/level-up) are done and committed on main
- Full behavior-preservation e2e gate green (14/14 on core specs)
- All Daybreak visual requirements for study flow shipped: D-01 (ghost-peek stack), D-02 (card surface + swipe colors), D-03 (no progress indicator), D-04 (end screen LionFace + Baloo 2 + amber CTA), D-05 (Soft-Clay Leo overlay), D-06 (reduced-motion confetti gate)
- STU-01 and STU-02 both satisfied
- Outstanding: `handleLevelUpDismiss` `leveledUp === 10` dead branch + `level === 10` copy condition in overlay — both flagged in CONTEXT Deferred for a separate non-Daybreak logic ticket

---
*Phase: 20-study-screen*
*Completed: 2026-06-21*

## Self-Check: PASSED

**Files exist:**
- [x] `src/components/__tests__/level-up-overlay.test.tsx` — present, contains `// @vitest-environment jsdom`, `data-testid="confetti-layer"`, `data-confetti-particle`, `getByAltText("Leo")`
- [x] `src/components/level-up-overlay.tsx` — present, contains `usePrefersReducedMotion`, `widget-l`, `Math.min(level, 9)`, `#F28A1F`, `data-testid="confetti-layer"`, `level === 10` (2 occurrences), no `level >= 9` in logic code
- [x] `src/components/study-session.tsx` — present, contains `daybreak/lion-face`, `daybreak/t-btn`, `LionFace size={80}`, `font-display text-[32px]`, `router.push(\`/dashboard?deck=${deckId}\`)`, `leveledUp === 10`, no 🐯 emoji, no `@/components/ui/button`
- [x] `e2e/06-study-session.spec.ts` — present, contains `quit study session` (role-based), `getByText("Quit session?")` (popover heading preserved), no `getByText("Quit session")` (non-? version)
- [x] `e2e/10-mobile-responsive.spec.ts` — present, contains `quit study session` (role-based), no `getByText("Quit session")`
- [x] `.planning/phases/20-study-screen/20-02-SUMMARY.md` — this file

**Commits exist (newest first):**
- [x] `a4225ce` — test(20-02): behavior-preservation gate
- [x] `15defec` — feat(20-02): study-session render zone reskin
- [x] `072a997` — feat(20-02): level-up overlay GREEN
- [x] `b29e041` — test(20-02): level-up overlay RED

**TDD Gate Compliance:**
- [x] RED gate: `b29e041` — `test(20-02): add failing D-06 reduced-motion confetti gate test (RED)`
- [x] GREEN gate: `072a997` — `feat(20-02): reskin level-up overlay to Daybreak — Soft-Clay Leo + confetti gate (GREEN)`
- [x] Order: RED commit (b29e041) precedes GREEN commit (072a997) in git log

**Unit tests:** `npx vitest run` — 105/106 file pass, 1968/1974 tests pass (1 file skipped pre-existing)
**E2e tests:** `npx playwright test e2e/06-study-session.spec.ts e2e/study-progression.spec.ts e2e/14-qa-parity.spec.ts` — 14/14 passed
**TypeScript:** `npx tsc --noEmit` exits 0 (TSC-OK)
**Biome:** All modified component/test files clean; pre-existing `noNonNullAssertion` warnings in 10-mobile-responsive.spec.ts (lines 92+115) are out of scope
