---
phase: 25-my-account
plan: 05
subsystem: testing
tags: [playwright, e2e, react, nextjs, daybreak, drizzle, better-auth]

# Dependency graph
requires:
  - phase: 25-01
    provides: "requestEmailChange/deleteAccount server actions + GET /api/account/verify-email route — exercised directly by the new e2e spec and its token seam"
  - phase: 25-02
    provides: "ChangePasswordCard (account-password-* testids) — driven end-to-end by the new spec's change-password steps"
  - phase: 25-03
    provides: "AccountDetailsCard + AccountLogoutSection testids — driven end-to-end by the new spec's details/email/logout steps"
  - phase: 25-04
    provides: "DeleteAccountRow, AccountBack, and the live /account page shell — made /account reachable in the first place; consumed directly by every step of the new spec"
provides:
  - "AccountNavButton — dashboard header glyph -> /account (D-01), RSC-safe next/link, 36px visual frame inside a 44px Small-Target Wrapper hit area"
  - "app-header.tsx swapped to AccountNavButton; logout-button.tsx deleted with zero dangling references"
  - "e2e/01-auth-signup-login.spec.ts + e2e/10-mobile-responsive.spec.ts retargeted off the removed header Sign-out control, behavioral intent preserved"
  - "e2e/25-my-account.spec.ts — full account-flow e2e coverage (reach, details, touch targets, change-password wrong+happy, email pending-banner, logout, delete+sign-in-rejected)"
  - "e2e/helpers.ts getPendingEmailChangeToken(newEmail) — test-only, dynamically-imported DB seam for the email-verify round trip"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic (non-module-scope) @/db import inside a test helper, wrapped in try/catch returning null: isolates a missing-DATABASE_URL (or any DB) failure to the one helper's caller instead of throwing at spec-collection time and breaking every file that imports ./helpers"
    - "Small-Target Wrapper composition applied to a pure RSC Link (not just a stateful button): AccountNavButton's 44x44 transparent outer Link centers a 36x36 visual span, extending the pattern 25-04's AccountBack already established for a client-side button to a zero-JS navigation element"

key-files:
  created:
    - src/components/account-nav-button.tsx
    - e2e/25-my-account.spec.ts
  modified:
    - src/components/app-header.tsx
    - e2e/01-auth-signup-login.spec.ts
    - e2e/10-mobile-responsive.spec.ts
    - e2e/helpers.ts

key-decisions:
  - "Chose the Drizzle-direct-read option (not a new DEBUG_CHEAT_SECRET-gated route) for the email-token e2e seam — stays within this plan's files_modified scope (no new route file) and matches every other DB-needing Node process in this codebase (scripts/qa-run.mjs, cleanup-test-users.mjs), none of which use dotenv — DATABASE_URL is expected to already be process-wide, not .env.local-only"
  - "Keyed getPendingEmailChangeToken by newEmail, not userId — signUpFreshUser/signUpWithDeck only return {email}; scanning-and-matching mirrors verify-email/route.ts's own technique exactly, avoiding any change to existing signup helpers"
  - "The DB import inside the seam is dynamic (await import), never module-scope — a top-level import would throw at spec-collection time for every e2e file if DATABASE_URL is absent, breaking the whole suite instead of just this one optional assertion"
  - "Left app-header.tsx's right-cluster gap at 9 (did not preemptively drop to 6-7 per UI-SPEC's conditional crowding note) — analytically, the 44px hit area is centered around the same 36px visual frame, so the visible gap to DeckSwitcher grows (9+4px padding), it does not shrink; left for the orchestrator's live/visual gate to confirm rather than making an unverified speculative change"

patterns-established:
  - "Test-only DB seam pattern for e2e specs needing server-persisted, no-live-inbox-available state: dynamic import + try/catch + null fallback + a spec-level opportunistic if/else branch that never hard-fails the suite"

requirements-completed: [ACC-01, ACC-04, ACC-05, ACC-06]

# Metrics
duration: ~31min
completed: 2026-07-20
---

# Phase 25 Plan 05: Header Glyph Swap + Full Account-Flow E2E Summary

**AccountNavButton replaces the header's bare logout glyph (D-01), logout-button.tsx deleted, the two blast-radius e2e specs retargeted, and a new full-pipeline e2e/25-my-account.spec.ts proves all four /account sections against the real backend with throwaway users**

## Performance

- **Duration:** ~31 min
- **Started:** 2026-07-20T11:45:00Z
- **Completed:** 2026-07-20T12:16:00Z
- **Tasks:** 3 (all `type="auto"`, single-commit each — no TDD gate on this plan)
- **Files modified:** 7 (2 created, 4 modified, 1 deleted)

## Accomplishments

- `AccountNavButton` (D-01): RSC-safe (`next/link`, no `"use client"`) person-silhouette glyph — a 36px visual frame (dimensionally identical to the removed `LogoutButton`'s frame: `border-radius:10`, `border:1.5px solid #EDDFC9`, `background:#FFFFFF`) centered inside a 44px transparent Small-Target Wrapper hit area, `data-testid="account-nav-btn"`, `aria-label="My Account"`, `href="/account"`. Glyph built from divs (head: 6.5x6.5 circle, shoulders: 14x7.5 `border-radius:8px 8px 0 0`), matching `LogoutGlyph`'s construction technique exactly — never an `<svg>` element.
- `app-header.tsx`'s right cluster now renders `AccountNavButton` instead of `LogoutButton`; `logout-button.tsx` deleted only after confirming (via `tsc --noEmit` + a full `src/` grep) that `app-header.tsx` was its only call site.
- `e2e/01-auth-signup-login.spec.ts` (lines ~48/70/99) and `e2e/10-mobile-responsive.spec.ts` (line ~46) retargeted per the exactly-two-files blast radius RESEARCH/UI-SPEC identified: each "Sign out" flow now navigates via `account-nav-btn` to `/account` first, then clicks the section's Sign out button (same accessible name, so the click/assertion code itself is otherwise untouched); the mobile chrome-overflow test now asserts the nav glyph's visibility instead of the removed header button.
- `e2e/25-my-account.spec.ts`: two tests covering the full real-pipeline flow —
  1. **Full flow test:** dashboard `account-nav-btn` (with a 44px touch-target assertion) -> `/account` -> details card renders name/email/"Member since"/"I speak" -> `account-back-btn` touch-target assertion -> change-password wrong-current inline error ("That password isn't right.") -> happy path ("Password updated" fade) -> sign out + sign back in with the **new** password (proving it actually applied) -> edit email to a second unique address -> pending-banner assertion (`"Verification sent to {newEmail}"`, old email still shown in the details card) -> opportunistic token round-trip via the new DB seam -> final logout to `/login`.
  2. **Delete test** (fresh throwaway user): reach `/account` -> `account-delete-row` -> two-step confirm -> `account-delete-confirm-btn` -> `/login` -> attempt sign-in with the deleted credentials and assert rejection ("Incorrect email or password.", D-14).
- `e2e/helpers.ts` gained `getPendingEmailChangeToken(newEmail)`: a test-only seam that dynamically imports `@/db`/`@/db/schema`/`drizzle-orm` inside a try/catch, scans `verification` rows under the `change-email:` prefix (mirroring `verify-email/route.ts`'s own scan-and-parse technique), and returns the matching token or `null`. The new spec exercises the full verify-email round trip when a token resolves, and otherwise logs a note and relies on the pending-banner assertion alone — either branch satisfies the plan's "no live inbox required" contract, and `route.test.ts` (25-01) covers the round trip at the unit level regardless.

## Task Commits

Each task was committed atomically:

1. **Task 1: account-nav-button.tsx** - `6c76491` (feat)
2. **Task 2: app-header swap + delete logout-button + retarget e2e/01 & e2e/10** - `d285be9` (feat)
3. **Task 3: e2e/25-my-account.spec.ts + pending-token seam in helpers** - `e167e73` (test)

**Plan metadata:** _pending — added after this Summary is committed_

## Files Created/Modified

- `src/components/account-nav-button.tsx` — `AccountNavButton`: header glyph, RSC-safe Link to `/account`
- `src/components/app-header.tsx` — right cluster renders `AccountNavButton` instead of `LogoutButton`
- `src/components/logout-button.tsx` — **deleted** (dead code once the header stopped rendering it; logic was already lifted into `account-logout-section.tsx` in 25-03)
- `e2e/01-auth-signup-login.spec.ts` — 3 sign-out flows retargeted via an `account-nav-btn` navigation hop
- `e2e/10-mobile-responsive.spec.ts` — mobile header-chrome assertion retargeted to `account-nav-btn`
- `e2e/25-my-account.spec.ts` — new: full account-flow e2e (2 tests)
- `e2e/helpers.ts` — new `getPendingEmailChangeToken` test-only DB seam

## Decisions Made

- Implemented the email-token e2e seam as a direct Drizzle read (the plan's first-offered option) rather than a new `DEBUG_CHEAT_SECRET`-gated route, because: (a) it stays inside this plan's stated `files_modified` (no new route file), and (b) every other DB-needing Node process in this codebase (`scripts/qa-run.mjs`, `scripts/cleanup-test-users.mjs`) already assumes `DATABASE_URL` is available process-wide with no `dotenv`/`.env.local` auto-loading, so the same assumption should hold for the Playwright runner.
- Keyed the seam by `newEmail` rather than `userId` — `signUpFreshUser`/`signUpWithDeck` only return `{ email }`, and scanning-then-matching by the pending `newEmail` value mirrors `verify-email/route.ts`'s own bounded-scan technique exactly, so no existing helper's return type needed to change.
- Made the `@/db` import inside the seam dynamic (`await import(...)`, never top-level) specifically to bound the blast radius of a missing/misconfigured `DATABASE_URL`: a top-level import failing would throw at spec-collection time for every file that imports `./helpers` (i.e. the whole e2e suite), whereas the dynamic import confines any failure to this one optional assertion, which gracefully falls back to pending-banner-only coverage.
- Left `app-header.tsx`'s cluster `gap` at its existing `9` rather than preemptively narrowing it per UI-SPEC's conditional crowding note — the 44px hit area is centered around the identical 36px visual frame, so the *visible* gap to `DeckSwitcher` grows (9px gap + 4px of now-invisible padding before the visible frame starts), it does not shrink. Left as-is for the orchestrator's live visual gate to confirm rather than making an unverified speculative CSS change.
- Structured the new spec as two `test()` blocks (one continuous "full flow" covering steps 1-5 on a single signed-up user/session, one isolated "delete" test on a fresh throwaway user) rather than one giant test or five independent ones — matches the plan's own step numbering (step 6 is explicitly "(fresh throwaway user)", implying steps 1-5 share one session) while keeping Playwright's default per-test browser-context isolation intact.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reformatted the new/modified e2e files to satisfy `biome ci`'s format check**
- **Found during:** Task 3 verification
- **Issue:** `npx biome ci e2e/25-my-account.spec.ts e2e/helpers.ts` failed with "File content differs from formatting output" on the new spec file — pure line-wrap differences (e.g. a multi-arg `assertTouchTarget` call, a long `.fill()` chain), no lint/logic errors. Identical in kind to the formatting deviation documented in every prior wave of this phase (25-02, 25-03, 25-04).
- **Fix:** Ran `npx biome check --write e2e/25-my-account.spec.ts e2e/helpers.ts`, then re-verified `biome ci` and `tsc --noEmit` both clean.
- **Files modified:** `e2e/25-my-account.spec.ts` (helpers.ts required no changes from this pass)
- **Verification:** `npx biome ci` clean on both files; `npx tsc --noEmit` clean; full `npx vitest run` still green afterward (2174/128, unchanged from before this plan).
- **Committed in:** `e167e73` (Task 3 commit — formatting was applied before committing, not as a separate commit)

**2. [Rule 1 - correctness] Reworded a doc comment to avoid a literal `<svg` substring**
- **Found during:** Task 1, self-verification of the plan's own acceptance-criteria grep (`grep -n "<svg" src/components/account-nav-button.tsx` must return nothing)
- **Issue:** My own explanatory comment ("...not a literal `<svg>`...") contained the literal substring `<svg`, which the acceptance grep would have flagged as a false positive despite there being no actual SVG element in the file.
- **Fix:** Reworded to "...not an SVG element..." — same meaning, no literal `<svg` substring.
- **Files modified:** `src/components/account-nav-button.tsx`
- **Verification:** `grep -n "<svg" src/components/account-nav-button.tsx` returns no match (exit code 1); `biome ci` still clean.
- **Committed in:** `6c76491` (Task 1 commit — caught and fixed before that commit was made)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking/formatting matching every prior wave's precedent, 1 Rule 1 self-caught wording fix before the first commit — zero behavior change in either case)
**Impact on plan:** No scope change, no architectural change. Both fixes were necessary to cleanly satisfy this plan's own stated verification gates.

## Issues Encountered

None. No live/runtime failures were hit during static verification — `tsc --noEmit`, scoped `biome ci`, and the full `vitest run` all passed on essentially the first attempt for each task (aside from the expected formatting pass above).

**Live e2e execution was intentionally NOT run by this executor**, per this run's static-only e2e policy: the orchestrator owns the live gate after this plan returns, using a fresh harness-managed dev server and the established web/mobile project batches. Everything gate-able without a live browser was verified:
- `npx tsc --noEmit` — clean (run again after all three tasks, satisfying the plan's "run the FULL tsc AFTER the e2e wave" note).
- `npx biome ci` scoped to every touched file, individually and combined — clean.
- Full `npx vitest run` — 2174 passed / 6 skipped / 128 files, byte-identical counts to 25-04's own post-run figures, confirming zero regression from the header swap + deletion.
- `git status --short` confirms `package.json`, `package-lock.json`, and `src/db/schema.ts` are untouched — zero new dependencies, no schema drift.
- A full `e2e/` + `scripts/` grep for `Sign out`/`logout`/`Logout` confirms every remaining hit is either an intentional new reference (targeting `account-logout-btn`, never the removed header control) or harmless historical prose in a comment — no stale header-control literals remain anywhere.

The following remain to be proven live by the orchestrator's gate:
- `npx playwright test e2e/25-my-account.spec.ts e2e/01-auth-signup-login.spec.ts e2e/10-mobile-responsive.spec.ts` against a freshly-restarted dev server.
- Whether `getPendingEmailChangeToken`'s DB seam actually resolves a token in that environment (i.e. whether `DATABASE_URL` is present in the Playwright runner's process) — if it does, the full verify-email round trip gets exercised; if not, the spec still passes via the documented pending-banner-only fallback, and the `console.log` note will appear in the run's output either way, making the branch taken visible in the test report.
- The visual check of whether the header's `gap: 9` cluster spacing reads correctly next to `DeckSwitcher` (left unchanged this plan — see Decisions Made).

## User Setup Required

None — no external service configuration required. The email-token seam is opportunistic and self-detecting (no new env var is required to be set; it degrades gracefully if `DATABASE_URL` isn't visible to the Playwright process).

## Next Phase Readiness

- **Phase 25 (my-account) is now code-complete.** All four requirements this plan targets (ACC-01, ACC-04, ACC-05, ACC-06) have their production code AND static e2e coverage in place; the phase's full closure is pending the orchestrator's live e2e run of `e2e/25-my-account.spec.ts e2e/01-auth-signup-login.spec.ts e2e/10-mobile-responsive.spec.ts` against a fresh dev server, per this plan's `<verification>` phase-gate block.
- `logout-button.tsx` is fully removed with zero dangling references (grep-confirmed across all of `src/`).
- Both pre-existing specs whose only "Sign out" locators lived in the header are retargeted with behavioral intent preserved; a full `e2e/` + `scripts/` sweep confirms no other stale references exist.
- The DB-read e2e seam pattern established here (dynamic import + try/catch + null fallback) is reusable for any future phase that needs a test-only, no-live-external-service read of server-persisted state.
- No blockers. Flagging for Josh: this plan did not observe any further interleaved commits from the concurrent Phase-17 session that 25-04's Summary flagged — `git log` shows a clean, uninterrupted sequence of this plan's own 3 commits.

---
*Phase: 25-my-account*
*Completed: 2026-07-20*

## Self-Check: PASSED

All created files verified present on disk, deleted file verified gone:
- FOUND: src/components/account-nav-button.tsx
- FOUND: e2e/25-my-account.spec.ts
- CONFIRMED DELETED: src/components/logout-button.tsx
- FOUND: .planning/phases/25-my-account/25-05-SUMMARY.md

All 4 commits verified present in `git log`:
- FOUND: 6c76491 (Task 1)
- FOUND: d285be9 (Task 2)
- FOUND: e167e73 (Task 3)
- FOUND: 7d4d63c (docs: plan summary)
