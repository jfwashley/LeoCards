---
phase: 25-my-account
plan: 02
subsystem: ui

tags: [react, react-hook-form, zod, better-auth, context-api, css-keyframes, daybreak]

# Dependency graph
requires:
  - phase: 24-habitat
    provides: "Daybreak design system atoms (TField, TBtn, Card) + the globals.css '@keyframes pair + prefers-reduced-motion override' convention (cl-accordion-*, hab-fall) this plan mirrors"
provides:
  - "AccountDirtyProvider / useAccountDirty — boolean-only cross-sibling dirty Context (D-04)"
  - "acct-accordion-open-kf / acct-accordion-close-kf + acct-success-fade CSS keyframe pairs in globals.css, each with a prefers-reduced-motion override"
  - "ChangePasswordCard — collapsed/expanded accordion, 3-field zod form, revokeOtherSessions:true, inline error mapping, quiet success fade (D-08/D-09/D-10/D-11)"
affects: [25-03-my-account, 25-04-my-account, 25-05-my-account]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First project-authored React Context: createContext + Provider + custom-hook-wrapping-useContext, throwing outside the provider (mirrors src/components/ui/form.tsx's defensive idiom)"
    - "react-hook-form watch() + useEffect to reactively derive a cross-component dirty boolean — no manual onChange wrapping needed, and form.reset() automatically drives it back to false"
    - "CSS-only accordion with a panelMounted unmount-on-close safety-net timer (mirrors card-list.tsx's handleAccordionToggle exactly)"

key-files:
  created:
    - src/components/account-dirty-context.tsx
    - src/components/change-password-card.tsx
    - src/components/change-password-card.test.tsx
  modified:
    - src/app/globals.css

key-decisions:
  - "AccountDirtyProvider stores ONLY a derived boolean, never the typed password text (D-04 leak guard, T-25-02-B)"
  - "passwordDirty is derived reactively via watch()+useEffect rather than wrapping each field's onChange — collapses 'reset on success' and 'reset on manual clear' into one code path"
  - "Chevron rotation uses a plain CSS transition (matches card-list.tsx's own accordion-chevron precedent), kept separate from the @keyframes-only accordion open/close and success-fade animations"

patterns-established:
  - "acct- prefixed keyframe pairs in globals.css: one uniquely-named pair per feature, each paired with its own prefers-reduced-motion override — extends the existing hab-fall/cl-accordion-*/ac-progress-slide convention"
  - "AccountDirtyProvider/useAccountDirty: minimal boolean-only Context for cross-sibling client state, ready for 25-04's back-guard to consume directly"

requirements-completed: [ACC-03, ACC-06]

# Metrics
duration: 18min
completed: 2026-07-19
---

# Phase 25 Plan 02: Change Password Card Summary

**Collapsed/expanded change-password accordion calling authClient.changePassword with revokeOtherSessions:true, plus the AccountDirtyProvider Context and two globals.css keyframe pairs that 25-03/25-04 build on**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-19T16:21:00Z
- **Completed:** 2026-07-19T16:39:15Z
- **Tasks:** 2 completed (Task 2 was TDD: test → feat)
- **Files modified:** 4 (2 created outright, 1 created+implemented via TDD, 1 CSS append)

## Accomplishments

- `AccountDirtyProvider` / `useAccountDirty` — the project's first hand-authored React Context, exposing only `{ passwordDirty, setPasswordDirty }`. Verified by grep that no password string is ever stored in it.
- Two new CSS `@keyframes` pairs appended to `globals.css` (`acct-accordion-open-kf`/`acct-accordion-close-kf`, `acct-success-fade`), each with a paired `prefers-reduced-motion` override, following the file's established per-feature-prefix convention.
- `ChangePasswordCard`: collapsed row → expanding panel (Current/New/Confirm password fields + security caption + "Update password"), zod schema mirroring `reset-password/page.tsx`'s `.refine` pattern, `authClient.changePassword({ ..., revokeOtherSessions: true })`, `error.code === "INVALID_PASSWORD"` mapped to an inline Current-password error (never `.message` verbatim), success clears fields/collapses the panel/shows a fading "Password updated" line, and `passwordDirty` resets to `false`. No "Forgot password?" link anywhere (D-11).
- 9 rendered tests (fireEvent-driven, real `AccountDirtyProvider` + probe component) covering the full `<behavior>` list from the plan; all green.

## Task Commits

Each task was committed atomically:

1. **Task 1: account-dirty-context.tsx + globals.css keyframes** - `553a60b` (feat)
2. **Task 2: change-password-card.tsx + rendered test (TDD)**
   - RED: `38e5993` (test) — failing test confirmed via unresolved import (`change-password-card.tsx` did not exist yet)
   - GREEN: `fc1e8cb` (feat) — all 9 tests pass; no REFACTOR commit needed (implementation was already clean on first pass)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `src/components/account-dirty-context.tsx` - `AccountDirtyProvider` + `useAccountDirty()`, boolean-only Context
- `src/app/globals.css` - `acct-accordion-open-kf`/`acct-accordion-close-kf` + `acct-success-fade` keyframe pairs, each with a `prefers-reduced-motion` override
- `src/components/change-password-card.tsx` - `ChangePasswordCard`: accordion + 3-field form + `authClient.changePassword` wiring
- `src/components/change-password-card.test.tsx` - 9 rendered tests (accordion, dirty wiring, validation, submit success, INVALID_PASSWORD + generic error mapping)

## Decisions Made

- Used react-hook-form's `watch()` + a single `useEffect` to derive `passwordDirty` from all three field values on every render, instead of wrapping each field's `onChange` individually — this makes "resets to false on successful save or manual collapse-with-empty-fields" (a D-04 must-have) fall out automatically from `reset()` and manual clearing, with no extra code path to keep in sync.
- Mirrored `card-list.tsx`'s exact `panelMounted` + safety-net `setTimeout` accordion-unmount pattern (25-PATTERNS.md's cited convention) rather than a simpler mount-always approach, so the panel stays out of the DOM/tab-order when collapsed in real browsers, and so jsdom (which never fires `animationend`) still unmounts reliably.
- Confirmed via a live `npx tsc --noEmit` run (rather than assuming) that `data-testid` passed directly into `TField`/`TBtn` type-checks and renders correctly, resolving the "untested territory" flag from 25-PATTERNS.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reformatted new files to satisfy `biome ci`'s format check**
- **Found during:** Task 2 (GREEN verification)
- **Issue:** `npx biome ci` failed on `change-password-card.tsx`/`change-password-card.test.tsx` with "File content differs from formatting output" — whitespace/line-wrap differences only, no lint errors, no logic issues.
- **Fix:** Ran `npx biome format --write` on both files, then re-verified `biome ci`, `tsc --noEmit`, and the full test file all still passed.
- **Files modified:** `src/components/change-password-card.tsx`, `src/components/change-password-card.test.tsx`
- **Verification:** `npx biome ci` clean, `npx tsc --noEmit` clean, all 9 tests still green after reformat.
- **Committed in:** `fc1e8cb` (Task 2 GREEN commit — formatting was applied before the GREEN commit, not as a separate commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, formatting-only, zero behavior change)
**Impact on plan:** No scope change. Plan executed exactly as specified otherwise.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `AccountDirtyProvider` and both keyframe pairs are ready for 25-03 (account-details-card "Details updated" fade reuses `acct-success-fade`) and 25-04 (`AccountBack` reads `useAccountDirty()` for the discard-changes guard).
- `ChangePasswordCard` is a standalone, fully-tested component — 25-05 (or whichever plan assembles `/account/page.tsx`) can mount it directly inside an `<AccountDirtyProvider>` alongside `AccountDetailsCard`, `AccountLogoutSection`, and `DeleteAccountRow`.
- No blockers. Full project verification passed: `npx tsc --noEmit` clean, full `npx vitest run` green (2154 passed, 6 pre-existing skips, 124 files), scoped `npx biome ci` clean across all 4 touched files, `package.json` diff empty (zero new dependencies), no `motion/react` import introduced.

---
*Phase: 25-my-account*
*Completed: 2026-07-19*

## Self-Check: PASSED

All created/modified files verified present on disk:
- FOUND: src/components/account-dirty-context.tsx
- FOUND: src/components/change-password-card.tsx
- FOUND: src/components/change-password-card.test.tsx
- FOUND: src/app/globals.css
- FOUND: .planning/phases/25-my-account/25-02-SUMMARY.md

All task commits verified present in git log:
- FOUND: 553a60b (Task 1)
- FOUND: 38e5993 (Task 2 RED)
- FOUND: fc1e8cb (Task 2 GREEN)
- FOUND: a91d8ac (docs: plan summary)
