---
phase: 27-performance-batch-2
plan: 07
subsystem: ui
tags: [zod, zod-mini, react-hook-form, bundle-size, client-diet, auth]

# Dependency graph
requires:
  - phase: 27-performance-batch-2 (plan 06)
    provides: translation-form.tsx AbortController fix (landed before this plan's zod/mini conversion of the same file)
provides:
  - All 9 client-side "use client" zod importers converted from full zod to the tree-shakeable zod/mini subpath
  - Identical validation semantics and error messages preserved across the conversion
affects: [27-08, 27-09, 27-10, phase-18-recert]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "zod/mini functional .check() composition (z.minLength/z.refine) replacing full-zod method chaining, for any future client-side schema in this codebase"
    - "Cross-field checks on zod/mini object schemas use .check(z.refine(...)), NOT a chained .refine() method (zod/mini object schemas have no .refine() method)"

key-files:
  created: []
  modified:
    - src/app/(auth)/signup/page.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/forgot-password/page.tsx
    - src/app/(auth)/reset-password/page.tsx
    - src/components/welcome/welcome-step-choose.tsx
    - src/components/review-list.tsx
    - src/components/translation-form.tsx
    - src/components/account-details-card.tsx
    - src/components/change-password-card.tsx

key-decisions:
  - "Cross-field password-match checks (reset-password, change-password-card) converted to .check(z.refine(...)) rather than a chained .refine() method, because zod/mini object schemas do not expose a .refine() method at all (confirmed via a live node probe against installed zod 4.3.6 — calling .refine() on a zod/mini z.object() throws 'obj.refine is not a function')."
  - "zodResolver call sites (signup, login, reset-password, account-details-card, change-password-card) left byte-unchanged — its _zod-core detection dispatches generically, exactly as 27-RESEARCH.md predicted."

patterns-established:
  - "zod/mini conversion pattern: `import * as z from \"zod/mini\"`, `.min(n,msg)` -> `.check(z.minLength(n,msg))`, `.email(msg)` -> top-level `z.email(msg)`, cross-field `.refine()` -> `.check(z.refine(...))`."

requirements-completed: [PERF-14]

# Metrics
duration: 25min
completed: 2026-07-22
---

# Phase 27 Plan 07: zod/mini client bundle diet Summary

**Converted all 9 client-side zod importers (4 auth pages, welcome onboarding, review-list, translation-form, account-details-card, change-password-card) from full zod to the tree-shakeable zod/mini subpath, with byte-identical validation semantics, error messages, and zodResolver behavior.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-22T14:28:00Z
- **Completed:** 2026-07-22T14:53:19Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- All 9 confirmed client-side zod importers now import from `zod/mini` instead of `zod` — zero full-zod stragglers (verified via exhaustive grep)
- Every `.min()`/`.email()` method-chain call converted to zod/mini's functional `.check()` composition (`z.minLength`, top-level `z.email`) with identical error message strings
- Both cross-field checks (reset-password's password-confirm match, change-password-card's newPassword/confirmNewPassword match) converted to `.check(z.refine(...))` and verified behaviorally equivalent
- `zodResolver` calls across all 5 form components left byte-unchanged — confirmed working via passing tests, no resolver-side code touched
- Full `npx tsc --noEmit` clean; scoped and full `npx vitest run` green (2235/2245 passed, the 4 failures are pre-existing documented full-suite parallel-execution flakes, all 4 confirmed passing in isolation); `npm run build` succeeds with all 4 auth pages still compiling as static routes

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert 4 auth pages + welcome-step-choose to zod/mini** - `41ce8cf` (feat)
2. **Task 2: Convert review-list, translation-form, account-details-card, change-password-card + straggler sweep** - `2066e17` (feat)

**Plan metadata:** (this commit) - `docs(27-07): complete zod/mini client bundle diet plan`

## Files Created/Modified
- `src/app/(auth)/signup/page.tsx` - `z.object` schema converted to zod/mini (`.min`->`.check(z.minLength)`, `.email`->top-level `z.email`)
- `src/app/(auth)/login/page.tsx` - same conversion pattern
- `src/app/(auth)/forgot-password/page.tsx` - same conversion pattern
- `src/app/(auth)/reset-password/page.tsx` - conversion + cross-field password-match check moved to `.check(z.refine(...))`
- `src/components/welcome/welcome-step-choose.tsx` - `LANG_ENUM = z.enum([...])` import swapped to zod/mini (no API change needed, `z.enum` behaves identically)
- `src/components/review-list.tsx` - `BatchTranslationResponseSchema` (bare `z.object({translations: z.array(z.string())})`, no zodResolver) converted
- `src/components/translation-form.tsx` - `TranslationResponseSchema` converted (`.min(1)` -> `.check(z.minLength(1))`)
- `src/components/account-details-card.tsx` - `detailsSchema` converted, zodResolver unchanged
- `src/components/change-password-card.tsx` - `changePasswordSchema` converted, cross-field check moved to `.check(z.refine(...))`, zodResolver unchanged

## Decisions Made
- Confirmed via a live node probe (not assumption) that zod/mini's `z.object()` schemas have NO `.refine()` method — calling it throws `TypeError: obj.refine is not a function`. Both cross-field checks in this plan use `.check(z.refine(...))` instead, which was independently verified to reject mismatched values with the expected `path`/`message` in the error output.
- Kept every `zodResolver(schema)` call site byte-unchanged per the plan's interface contract — no resolver code was touched, consistent with 27-RESEARCH.md's verified claim that `@hookform/resolvers/zod` dispatches generically via `"_zod" in schema`.

## Deviations from Plan

None - plan executed exactly as written. The only nuance beyond the plan's own text: the plan's `<interfaces>` block said "zod/mini supports `.refine()` on object schemas the same way" for cross-field checks; a live probe against the installed zod 4.3.6 showed this is not literally true (the method doesn't exist on the object schema instance) — the functionally equivalent `.check(z.refine(...))` composition (already documented in Pitfall 3 elsewhere in 27-RESEARCH.md) was used instead. This is a correction of an interfaces-block detail, not a deviation from the plan's intent or scope.

## Issues Encountered

None - all verification passed cleanly. The full `npx vitest run` showed 4 failing test files (`deck-switcher.test.tsx`, `image-upload-flow-extract-errors.test.tsx`, `review-list-commit-guard.test.tsx`, `cooldown-config.test.ts`), all matching the project's documented pre-existing full-suite parallel-execution timeout flake set (see STATE.md Phase 27-08 entry); re-ran all 4 in isolation and confirmed all 13 tests pass — not a regression introduced by this plan.

## User Setup Required

None - no external service configuration required. No new packages installed (zod/mini is a subpath of the already-installed `zod` package).

## Next Phase Readiness

PERF-14 is fully shipped: all 9 client zod importers on zod/mini, zero stragglers, identical validation behavior. The ~44KB+ bundle-size saving cited in 27-RESEARCH.md (Assumption A2) remains directional/informal per the plan's own D-10 verification note — a full before/after `next build` chunk-size diff was not performed (would require reverting and re-building, which the plan explicitly treats as informal, not a gate). `npm run build` was run post-conversion and succeeds cleanly with no route regressions. Ready for 27-08/27-09 (already executed per STATE.md) and the eventual Phase 18 re-cert gate.

---
*Phase: 27-performance-batch-2*
*Completed: 2026-07-22*

## Self-Check: PASSED

All 9 modified source files and the SUMMARY.md itself confirmed present on disk; both task commits (`41ce8cf`, `2066e17`) confirmed present in `git log --oneline --all`.
