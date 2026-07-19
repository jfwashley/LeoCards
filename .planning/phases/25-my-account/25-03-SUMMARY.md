---
phase: 25-my-account
plan: 03
subsystem: ui
tags: [react, react-hook-form, zod, better-auth, daybreak, testing-library]

# Dependency graph
requires:
  - phase: 25-01
    provides: "requestEmailChange server action (D-07 custom token flow) — consumed directly by the email-change submit path and the Resend affordance"
  - phase: 25-02
    provides: "acct-success-fade globals.css keyframe pair — reused verbatim for the details card's 'Details updated' quiet confirmation"
provides:
  - "AccountDetailsCard — view/edit toggle for name+email, Pitfall-9 two-mutation sequencing under one isPending, A5-resolved success-signal (fade vs. pending banner), honest email-taken error, display-only member-since/native-language"
  - "AccountLogoutSection — in-section Sign out card reusing logout-button.tsx's signOut->/login logic, preserves the 'Sign out' accessible name"
affects: [25-04, 25-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-mutation sequencing under one isPending/submit: authClient.updateUser({name}) FIRST, then requestEmailChange(email) — first form in the codebase to sequence two independent async mutations behind a single spinner (RESEARCH Pitfall 9); NEVER passes email to updateUser (EMAIL_CAN_NOT_BE_UPDATED)"
    - "Wrap Daybreak atoms that don't forward data-testid (Card, ACBanner) in a plain <div data-testid=...> instead of modifying the shared atom — extends the same technique 25-PATTERNS.md already prescribed for ACBanner to Card"

key-files:
  created:
    - src/components/account-details-card.tsx
    - src/components/account-details-card.test.tsx
    - src/components/account-logout-section.tsx
    - src/components/account-logout-section.test.tsx
  modified: []

key-decisions:
  - "Wrapped Card and ACBanner in data-testid-carrying <div>s rather than modifying either shared atom — kept both to their as-shipped {children,className}/{kind,children} prop surface and kept this plan's files_modified scope exact"
  - "A5 resolved concretely and symmetrically: the 'Details updated' fade fires ONLY when the email did not change, including the combined name+email case — the pending banner alone is the signal whenever email changed, name-changed-or-not"
  - "Simplified the AccountLogoutSection 'disabled while pending' test to a never-resolving promise instead of a manually-resolved deferred, after a TypeScript closure/control-flow-narrowing quirk collapsed a null-checked `let` variable's type to `never` at the call site — resolution/navigation timing is already covered by the separate click-through test"
  - "Added a (not contractually required) data-testid=\"account-details-success\" on the 'Details updated' line, mirroring the established account-password-success precedent from 25-02, for test-query robustness"

patterns-established:
  - "AccountDetailsCard's sequenced-submit shape (compute nameChanged/emailChanged vs. props, mutate in order, router.refresh(), then exactly one success signal) is the template 25-04/25-05 and any future multi-mutation form in this codebase should follow"

requirements-completed: [ACC-01, ACC-02, ACC-04, ACC-06]

# Metrics
duration: 24min
completed: 2026-07-19
---

# Phase 25 Plan 03: Account Details Card + Sign-out Section Summary

**Account Details card (view/edit name+email, Pitfall-9 two-mutation sequencing, A5-resolved success signal, pending-email banner) and the in-section Sign-out card, consuming requestEmailChange from 25-01 and the acct-success-fade CSS from 25-02**

## Performance

- **Duration:** ~24 min
- **Started:** 2026-07-19T16:48:00Z
- **Completed:** 2026-07-19T17:12:37Z
- **Tasks:** 2 (both TDD — RED+GREEN commit pairs)
- **Files modified:** 4 (all net-new: 2 implementation, 2 test)

## Accomplishments

- `AccountDetailsCard` (D-05/D-06/D-07): view mode renders Name/Email/Member-since/I-speak as static label-left/value-right rows plus a right-aligned "Edit" link; Member-since and native language stay display-only in BOTH view and edit mode (no input affordance, ever). Edit mode swaps in-place to a react-hook-form + zod form for Name+Email only.
- Implements RESEARCH Pitfall 9's two-mutation sequencing under one `isPending`/one spinner: if the name changed, `authClient.updateUser({ name })` runs FIRST (never `{name, email}` together — that 400s with `EMAIL_CAN_NOT_BE_UPDATED`); if the email changed, `requestEmailChange(email)` runs next; `email-taken` maps to an inline error under the Email field, any other failure to a generic banner above the buttons.
- Resolves Assumption A5 concretely: on full success, `router.refresh()` fires, then exactly ONE success signal shows — the server-persisted pending-email banner (driven by the `pendingEmail` prop, never local state) when the email changed, or the quiet `.acct-success-fade` "Details updated" line when it did not — including the combined name+email case, where the banner alone is shown.
- Pending-email banner (`ACBanner kind="ok"`, wrapped for `data-testid`) shows "Verification sent to {pendingEmail}", the explanatory body line, and a "Resend email." affordance that re-invokes `requestEmailChange(pendingEmail)`.
- `AccountLogoutSection` (ACC-04): a Daybreak `Card` with a "Sign out" heading, description, and a full-width outline `Button` that lifts `logout-button.tsx`'s `handleSignOut` logic verbatim (`authClient.signOut()` then `router.push("/login")`), disabling while in flight. Preserves the exact "Sign out" accessible name for e2e continuity.
- 14 rendered tests total (fireEvent-driven, real component trees) prove NEW typed values reach `updateUser`/`requestEmailChange` (CR-01 lesson) — including a dedicated test asserting `updateUser` is called strictly BEFORE `requestEmailChange` on a combined save.

## Task Commits

Each task followed RED -> GREEN (TDD):

1. **Task 1: account-details-card.tsx (view/edit/pending) + rendered test**
   - `2f1d758` (test) — failing test, module doesn't exist yet (confirmed via import-resolution failure)
   - `97979fa` (feat) — implementation + a `noUncheckedIndexedAccess` tsc fix in the test; 11/11 tests green
2. **Task 2: account-logout-section.tsx (Sign out card) + test**
   - `2a21a17` (test) — failing test, module doesn't exist yet
   - `c7d304d` (feat) — implementation + a test simplification to dodge a TS closure-narrowing quirk; 3/3 tests green

**Plan metadata:** _pending — added after this Summary is committed_

_Both tasks were `tdd="true"`; each RED commit's test run was confirmed failing (module-not-found) before its paired GREEN commit was made._

## Files Created/Modified

- `src/components/account-details-card.tsx` — `AccountDetailsCard`: view/edit toggle, two-mutation sequenced submit, pending-email banner
- `src/components/account-details-card.test.tsx` — 11 rendered tests (view mode, edit mode, name-only save, email-change save, combined-save ordering, email-taken error, pending banner + resend)
- `src/components/account-logout-section.tsx` — `AccountLogoutSection`: Sign out card, reuses `authClient.signOut()` -> `/login`
- `src/components/account-logout-section.test.tsx` — 3 rendered tests (render, click-through, disabled-while-pending)

## Decisions Made

- `Card` and `ACBanner` both only accept `{children, className}` / `{kind, children}` — neither forwards `data-testid`. Rather than widen either shared Daybreak atom (out of this plan's `files_modified` scope), both `account-details-card` and `account-logout-section` wrap them in a plain `<div data-testid="...">`, extending the exact technique 25-PATTERNS.md already prescribed for `ACBanner` to `Card` as well.
- A5's fade-suppression rule was implemented as `if (!emailChanged) show fade` (not `if nameChanged and not emailChanged`) so the rule is symmetric: a no-op save (nothing changed) and a name-only save both quietly fade, while ANY email change — alone or combined with a name change — shows the pending banner alone, matching the plan's frontmatter truth verbatim ("the quiet 'Details updated' fade fires ONLY when the email did NOT change").
- Added a `data-testid="account-details-success"` on the "Details updated" line even though it isn't in the UI-SPEC's data-testid contract list, mirroring the established `account-password-success` precedent from 25-02 (change-password-card.tsx) for consistency and query robustness; tests still primarily assert via `getByText`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reformatted new files to satisfy `biome ci`'s format check**
- **Found during:** Task 1 and Task 2 GREEN verification
- **Issue:** `npx biome ci` failed on all 4 new files with "File content differs from formatting output" (whitespace/line-wrap differences only — e.g. long ternary/JSX-attribute lines biome wanted split differently). No lint errors, no logic issues. Matches the identical deviation already documented in 25-02's Summary.
- **Fix:** Ran `npx biome format --write` on the affected files, then re-verified `biome ci`, `tsc --noEmit`, and the test files all still passed.
- **Files modified:** `src/components/account-details-card.tsx`, `src/components/account-details-card.test.tsx`, `src/components/account-logout-section.tsx`, `src/components/account-logout-section.test.tsx`
- **Verification:** `npx biome ci` clean on all 4 files; `npx tsc --noEmit` clean; all tests still green after reformat.
- **Committed in:** `97979fa` (Task 1 GREEN), `c7d304d` (Task 2 GREEN)

**2. [Rule 1 - Bug/type-correctness] Fixed a `noUncheckedIndexedAccess` tsc error on a mock-call-order array access**
- **Found during:** Task 1 GREEN, full `npx tsc --noEmit` run
- **Issue:** `mockUpdateUser.mock.invocationCallOrder[0]` and the `requestEmailChange` equivalent are typed `number | undefined` under this project's `noUncheckedIndexedAccess`; passing them straight into `toBeLessThan` failed to compile.
- **Fix:** Added an explicit `if (x === undefined || y === undefined) throw new Error(...)` runtime guard before the comparison — narrows both to `number` without using `!` (biome forbids non-null assertions), matching the project's established branded-cast/guard convention from 25-01.
- **Files modified:** `src/components/account-details-card.test.tsx`
- **Verification:** `npx tsc --noEmit` clean; the ordering test still passes (11/11).
- **Committed in:** `97979fa` (Task 1 GREEN)

**3. [Rule 1 - Bug/type-correctness] Simplified a rendered test to avoid a TypeScript closure-narrowing footgun**
- **Found during:** Task 2 GREEN, full `npx tsc --noEmit` run
- **Issue:** A `let resolveSignOut: (() => void) | null = null;` reassigned inside a `mockImplementation`'s nested `Promise` executor, then null-checked and called later in the same test, produced `error TS2349: This expression is not callable. Type 'never' has no call signatures.` at the call site — a known TS control-flow-analysis limitation when a `let` binding is mutated inside a closure crossing an intervening opaque call (`fireEvent.click`).
- **Fix:** Replaced the manual deferred-resolve pattern with a simpler, separate test asserting `btn.disabled` synchronously after `fireEvent.click` against a mock that returns a promise that never resolves — sidesteps the narrowing issue entirely (no closure-mutated `let`, no `!`) since navigation-after-resolution is already proven by the adjacent click-through test.
- **Files modified:** `src/components/account-logout-section.test.tsx`
- **Verification:** `npx tsc --noEmit` clean; 3/3 tests pass, including the simplified disabled-state test.
- **Committed in:** `c7d304d` (Task 2 GREEN)

---

**Total deviations:** 3 auto-fixed (1 Rule 3 blocking/formatting, 2 Rule 1 bug/type-correctness — all test-file-only, zero production-logic changes beyond the formatting pass)
**Impact on plan:** No scope change. All three fixes were necessary to reach a clean `tsc --noEmit`/`biome ci`, which is this plan's own per-wave verification gate. No new files, no architectural changes, no behavior change to either component.

## Issues Encountered

None beyond the three auto-fixed deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `AccountDetailsCard(props: {name, email, memberSince, nativeLanguageLabel, pendingEmail})` and `AccountLogoutSection()` match the plan's `<interfaces>` block exactly and are ready for 25-04 to mount inside `/account/page.tsx` alongside `ChangePasswordCard` (25-02) and `DeleteAccountRow` (25-04).
- Verified end-to-end within this plan's scope: name-only save, email-change save (including the combined name+email case with strict call ordering), email-taken inline error, and the server-persisted pending banner + resend affordance all have rendered-test coverage proving real typed values reach the real mutation call sites (Pitfall 12 / CR-01 lesson).
- Full project verification passed: `npx tsc --noEmit` clean, full `npx vitest run` green (2168 passed, 6 pre-existing skips, 127 files — up from 2154/124 after 25-02), scoped `npx biome ci` clean across all 4 touched files, `package.json`/`package-lock.json` diff empty (zero new dependencies), no `motion/react` import introduced.
- No blockers for 25-04 (page assembly + Delete Account row) or 25-05 (e2e retargets — the header's "Sign out" control removal blast radius documented in 25-PATTERNS.md/RESEARCH.md Pitfall 13 is unaffected by this plan; `AccountLogoutSection`'s button preserves the exact same accessible name the existing e2e specs already target).

---
*Phase: 25-my-account*
*Completed: 2026-07-19*

## Self-Check: PASSED

All 4 created files verified present on disk:
- FOUND: src/components/account-details-card.tsx
- FOUND: src/components/account-details-card.test.tsx
- FOUND: src/components/account-logout-section.tsx
- FOUND: src/components/account-logout-section.test.tsx

All 4 task commits verified present in `git log`:
- FOUND: 2f1d758 (Task 1 RED)
- FOUND: 97979fa (Task 1 GREEN)
- FOUND: 2a21a17 (Task 2 RED)
- FOUND: c7d304d (Task 2 GREEN)
