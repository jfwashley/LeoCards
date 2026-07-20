---
phase: 25-my-account
plan: 04
subsystem: ui
tags: [react, next-rsc, better-auth, dialog, base-ui, daybreak]

# Dependency graph
requires:
  - phase: 25-01
    provides: "deleteAccount server action (D-14) and getPendingEmailChange query (D-07) — consumed directly by delete-account-row.tsx and page.tsx"
  - phase: 25-02
    provides: "AccountDirtyProvider / useAccountDirty (D-04 boolean-only Context) and ChangePasswordCard — AccountBack reads passwordDirty directly; page.tsx mounts ChangePasswordCard"
  - phase: 25-03
    provides: "AccountDetailsCard and AccountLogoutSection — mounted directly by page.tsx in the D-03 stacked order"
provides:
  - "DeleteAccountRow — quiet trigger + two-step confirm (D-12/D-13), destructive Button color deviation, deleteAccount->router.push('/login') (D-14), inline error + re-enable on throw"
  - "AccountBack — client back button visually mirroring HBack at a 44px hit/40px visual, intercepting navigation into a Discard-changes Dialog only when passwordDirty (D-04)"
  - "/account (src/app/(protected)/account/page.tsx) — the fully-live, session-gated RSC page shell composing every section in the fixed D-03 order inside AccountDirtyProvider"
affects: [25-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Small-Target Wrapper applied to a stateful button (not just a Link): AccountBack's outer 44x44 <button> wraps a 40x40 visual span, since click behavior is conditional (dirty-guard intercept vs. immediate navigate) and can't be a plain RSC-safe Link"
    - "Server-computed display strings pattern extended: memberSince/nativeLanguageLabel/pendingEmail all resolved once in page.tsx and passed down as props, never re-fetched or reformatted client-side"

key-files:
  created:
    - src/components/delete-account-row.tsx
    - src/components/delete-account-row.test.tsx
    - src/components/daybreak/account-back.tsx
    - src/app/(protected)/account/page.tsx
  modified: []

key-decisions:
  - "session.user.nativeLanguage types as string | null | undefined despite its defaultValue:'en' additionalField config -- normalized via a local `const nativeLanguage = session.user.nativeLanguage ?? \"en\"` before both the LANGUAGE_LABELS lookup and its own fallback, rather than the plan's illustrative single-expression snippet which failed tsc"
  - "Implemented the ?verified allow-list as an if/else chain assigning a typed `let verified: \"success\" | \"expired\" | null`, not the plan's illustrative nested ternary -- avoids nested-ternary lint friction while preserving the exact `verified === \"success\"` / `verified === \"expired\"` substrings the plan's acceptance grep requires"
  - "Manual smoke-test (plan's own per-wave gate) run against a dedicated dev server on port 3001, not the pre-existing port-3000 server -- that server was serving a stale cached 404 for the brand-new /account route (owned by a concurrently-running session, not restarted to avoid disrupting it); verified D-03 stacked order via byte-offset comparison, both ?verified banners, and that an XSS-payload ?verified value is neither rendered as a banner nor reflected raw in the HTML"
  - "The 3 throwaway *test.local users created during the manual smoke test were removed via a surgical exact-email DELETE (not the broad cleanup-test-users.mjs '%@test.local' pattern) to guarantee zero risk of touching any other concurrently-running session's residue"

patterns-established:
  - "/account is the first page in the project assembled entirely from already-independently-tested leaf components (25-01 actions/queries, 25-02 dirty-context+ChangePasswordCard, 25-03 details+logout, this plan's delete-row+back-button) with no new business logic in the page shell itself -- page.tsx is pure composition + server-side data resolution"

requirements-completed: [ACC-01, ACC-04, ACC-05, ACC-06]

# Metrics
duration: 22min
completed: 2026-07-20
---

# Phase 25 Plan 04: Delete Account Row + AccountBack + /account Page Shell Summary

**Final integration wave: quiet two-step account-delete row, a dirty-guard-aware back button mirroring HBack, and the RSC page.tsx that makes /account fully live and reachable**

## Performance

- **Duration:** ~22 min (coding); manual smoke-test + verification added ~12 min beyond the last commit
- **Started:** 2026-07-20T11:13:00Z
- **Completed:** 2026-07-20T11:34:52Z
- **Tasks:** 3 (Task 1 TDD — RED+GREEN commit pair; Tasks 2-3 single-commit)
- **Files modified:** 4 (all net-new: 3 implementation, 1 test)

## Accomplishments

- `DeleteAccountRow` (D-12/D-13/D-14): a bare, quiet trigger row (`Trash2` + "Delete account", `text-destructive`, NOT wrapped in a Card, `min-h-11` Small-Target Wrapper) that swaps in-place to a two-step confirm with no password re-entry and no typed confirmation — a sober "Delete your account? / This can't be undone. It permanently erases your decks, words, and habitat progress." block, a shadcn `Button variant="destructive" h-11` "Delete account" and an outline `Button h-11` "Keep account" (the deliberate color deviation from card-edit-dialog's amber `TBtn`, per UI-SPEC). Confirming calls `deleteAccount()` then `router.push("/login")`; a thrown error shows an inline "Couldn't delete your account. Try again." and re-enables both buttons.
- `AccountBack` (D-04): a client component visually identical to `HBack` (frosted circle, blur, chevron border-trick) but at a 44x44 clickable hit-area wrapping the 40x40 visual — deliberately NOT copying HBack's literal 40px hit or its pure-RSC-Link shape, since this button must intercept navigation. Reads `useAccountDirty().passwordDirty`; when true, opens a "Discard changes?" Dialog (styling matches `card-edit-dialog.tsx`'s `DialogContent` verbatim) with generic copy only ("Your password changes haven't been saved." — never the typed password text, T-25-02-B) and Stay/Leave buttons; when false, navigates to `/dashboard` immediately with no dialog.
- `/account` page.tsx: the RSC shell that makes the whole phase reachable. Fetches the session once server-side, computes `memberSince` (`Intl.DateTimeFormat`), `nativeLanguageLabel` (inline `LANGUAGE_LABELS` dict — a deliberate third independent copy, per 25-PATTERNS.md), and `pendingEmail` (via 25-01's `getPendingEmailChange`) all server-side; allow-lists `?verified` to exactly `"success"` / `"expired"` / `null` (never renders the raw query string — verified against an XSS payload during manual smoke test); composes `AccountDetailsCard -> ChangePasswordCard -> AccountLogoutSection -> DeleteAccountRow` in the fixed D-03 order (delete row isolated by `mt-8`) inside a single `AccountDirtyProvider`.
- Manual per-wave smoke test (the plan's own verification gate, beyond automated tsc/biome/vitest): confirmed unauthenticated `/account` redirects (307), authenticated `/account` renders 200 with all expected `data-testid`s in the correct D-03 byte-offset order, both `?verified=success`/`?verified=expired` banners render with exact copy, no banner renders with no param, and an injected `<script>` payload in `?verified` is neither rendered as a banner nor reflected raw anywhere in the HTML (T-25-04-B holds).

## Task Commits

Each task was committed atomically:

1. **Task 1: delete-account-row.tsx (TDD)**
   - RED: `93677ac` (test) — 4 failing tests, confirmed via module-not-found
   - GREEN: `f8ef6e7` (feat) — implementation; 4/4 tests green
2. **Task 2: account-back.tsx** - `31979bb` (feat)
3. **Task 3: /account page.tsx** - `ac0b019` (feat)

**Plan metadata:** _pending — added after this Summary is committed_

## Files Created/Modified

- `src/components/delete-account-row.tsx` — `DeleteAccountRow`: quiet trigger + two-step confirm, destructive Button color deviation
- `src/components/delete-account-row.test.tsx` — 4 rendered tests (trigger->confirm, Keep->no-call, Delete->deleteAccount+push, inline error on throw)
- `src/components/daybreak/account-back.tsx` — `AccountBack`: client back button, D-04 dirty-guard Dialog intercept
- `src/app/(protected)/account/page.tsx` — `AccountPage`: RSC shell, server-computed props, ?verified allow-list, D-03 composition

## Decisions Made

- `session.user.nativeLanguage` types as `string | null | undefined` (despite its `defaultValue: "en"` additionalField config in `auth.ts`) — normalized into a local `nativeLanguage` const with `?? "en"` before use, rather than the plan's single-expression illustrative snippet, which failed `tsc` with `Type 'string | null | undefined' is not assignable to type 'string'`.
- The `?verified` allow-list uses an if/else chain assigning a typed `let verified: "success" | "expired" | null`, not the plan's illustrative nested ternary — functionally identical and still satisfies the plan's own acceptance-criteria grep (`verified === "success"` / `verified === "expired"` both appear verbatim), while sidestepping any nested-ternary lint friction.
- Ran the plan's own "manual smoke (dev server)" verification gate against a dedicated server on port 3001 rather than the pre-existing port-3000 server, after discovering the port-3000 server was returning a stale cached 404 for `/account` (that server belongs to a different, concurrently-running session — see Issues Encountered below; restarting it was avoided to prevent disrupting that work). Verified, via real HTTP requests with a signed-up session cookie: unauthenticated redirect, authenticated 200 render, exact D-03 stacking order (byte-offset comparison), both `?verified` banner states, absent-by-default states (dialog/confirm/password-panel all correctly unrendered pre-interaction), and that the `?verified` allow-list rejects an XSS payload with zero reflection.
- The 3 throwaway `*test.local` users created for the smoke test were deleted via a surgical exact-email match (not `scripts/cleanup-test-users.mjs`'s broader `%@test.local` LIKE pattern), to guarantee the cleanup could not affect any other session's test-user residue.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/type-correctness] Normalized `session.user.nativeLanguage`'s `string | null | undefined` type before use**
- **Found during:** Task 3, full `npx tsc --noEmit` run
- **Issue:** The plan's `<action>` text specified `LANGUAGE_LABELS[session.user.nativeLanguage] ?? session.user.nativeLanguage` for `nativeLanguageLabel`, matching 25-PATTERNS.md's dashboard.tsx precedent — but `session.user.nativeLanguage`'s inferred type is `string | null | undefined` (better-auth's additionalField typing, despite the runtime `defaultValue: "en"`), so the fallback expression itself remained `string | null | undefined`, failing to satisfy `AccountDetailsCard`'s `nativeLanguageLabel: string` prop type.
- **Fix:** `const nativeLanguage = session.user.nativeLanguage ?? "en"; const nativeLanguageLabel = LANGUAGE_LABELS[nativeLanguage] ?? nativeLanguage;` — guarantees a plain `string` at both steps.
- **Files modified:** `src/app/(protected)/account/page.tsx`
- **Verification:** `npx tsc --noEmit` clean.
- **Committed in:** `ac0b019` (Task 3 commit)

**2. [Rule 3 - Blocking] Reformatted new files / fixed import order to satisfy `biome ci`**
- **Found during:** Task 1, Task 2, and Task 3 verification
- **Issue:** `npx biome ci` failed on all 4 new files — `delete-account-row.tsx`/`.test.tsx` had line-wrap formatting differences (matches the identical deviation already documented in 25-02/25-03's Summaries); `account-back.tsx` and `page.tsx` had unsorted import statements (biome's `assist/source/organizeImports`). No lint/logic errors in any case.
- **Fix:** Ran `npx biome format --write` (delete-account-row files) and `npx biome check --write` (account-back.tsx, page.tsx), then re-verified `biome ci`, `tsc --noEmit`, and all tests still passed.
- **Files modified:** `src/components/delete-account-row.tsx`, `src/components/delete-account-row.test.tsx`, `src/components/daybreak/account-back.tsx`, `src/app/(protected)/account/page.tsx`
- **Verification:** `npx biome ci` clean on all 4 files; `npx tsc --noEmit` clean; full `npx vitest run` still green after each fix.
- **Committed in:** `f8ef6e7` (Task 1 GREEN), `31979bb` (Task 2), `ac0b019` (Task 3)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 type-correctness, 1 Rule 3 blocking/formatting — both narrow, zero scope creep)
**Impact on plan:** No architectural or behavioral change. Both fixes were necessary to reach this plan's own stated verification gate (clean `tsc --noEmit` + `biome ci`).

## Issues Encountered

**Concurrent write activity in the shared working tree (environmental, not a plan deviation).** During Task 1's RED commit, a `git add` + `git commit` from what is clearly a separate, concurrently-running session (interleaved commits `fix(17): WR-01` through `WR-04`, `docs(17)`, `style(17)` — a Phase 17 code-review-fix pass, landing throughout this plan's execution window) swept my freshly-staged `delete-account-row.test.tsx` into one of its commits (`9597f93`, later `git reset` back out by that same session). No data was lost — the file's on-disk content was verified byte-for-byte intact both times — but from that point forward, **every commit in this plan was made with an explicit trailing pathspec** (`git commit -m "..." -- <exact files>`) rather than a bare `git commit`, so each commit could only ever capture this plan's own files regardless of whatever else that other session had staged concurrently. All 4 of this plan's commits were individually verified via `git show --stat` immediately after committing to contain exactly their intended file(s) — no cross-contamination occurred after the pathspec discipline was adopted. This same concurrent activity is also why the pre-existing port-3000 dev server was serving a stale cached 404 for `/account` (see Decisions Made) — it was not restarted, to avoid disrupting that other session's work; a dedicated dev server on port 3001 was used for this plan's manual smoke test instead.

**Recommendation for the user:** if two GSD sessions are intentionally running against this repo at once (one on Phase 25, one revisiting Phase 17 review findings), it may be worth confirming both are aware of each other, since `parallelization: false` in `.planning/config.json` assumes single-writer access within a phase run but does not prevent two independent top-level sessions from writing to the same working tree simultaneously.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `/account` is now fully live: reachable, session-gated (307 redirect confirmed for unauthenticated requests), Daybreak-styled, single-column at every viewport, all four sections (details, password, sign-out, delete) present in the fixed D-03 order inside one `AccountDirtyProvider`.
- 25-05 (header swap) can now safely remove `logout-button.tsx`'s rendering from `app-header.tsx` and retarget the two literal "Sign out" e2e locators (`e2e/01-auth-signup-login.spec.ts` lines 48/70/99, `e2e/10-mobile-responsive.spec.ts` line 46) per 25-UI-SPEC.md's retarget table — `/account`'s own `account-logout-btn` already preserves the exact "Sign out" accessible name, so only a navigation hop needs inserting.
- Full project verification passed: `npx tsc --noEmit` clean, full `npx vitest run` green (2174 passed, 6 pre-existing skips, 128 test files total — up from 2168/127 files after 25-03, the +1 file and +6 tests accounted for by the new `delete-account-row.test.tsx`'s 4 tests plus incidental growth from concurrent unrelated work landing in the same window, see Issues Encountered), scoped `npx biome ci` clean across all 4 touched files, `package.json`/`package-lock.json` diff empty (zero new dependencies), `src/db/schema.ts` untouched.
- No blockers for 25-05. The concurrency hazard noted above did not affect this plan's own final state (all commits verified clean) but is worth the user's awareness for session-hygiene going forward.

---
*Phase: 25-my-account*
*Completed: 2026-07-20*
