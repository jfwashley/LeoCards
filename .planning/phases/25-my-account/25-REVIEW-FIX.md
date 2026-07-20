---
phase: 25-my-account
fixed_at: 2026-07-20T14:21:50Z
review_path: .planning/phases/25-my-account/25-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 25: Code Review Fix Report

**Fixed at:** 2026-07-20T14:21:50Z
**Source review:** .planning/phases/25-my-account/25-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (WR-01..WR-09; 0 Critical findings existed; IN-01/IN-02 explicitly out of scope for this pass)
- Fixed: 9
- Skipped: 0

## Fixed Issues

### WR-01: Mutation handlers use `try/finally` with no `catch`

**Files modified:** `src/components/account-details-card.tsx`, `src/components/account-details-card.test.tsx`, `src/components/change-password-card.tsx`, `src/components/change-password-card.test.tsx`
**Commit:** `d59cd26`
**Applied fix:** Added a `catch` clause to both `onSubmit` handlers (setting the existing generic error copy), mirroring `delete-account-row.tsx`'s established try/catch/finally pattern. Added one regression test per component asserting the generic error shows and the Save/Update button re-enables (`disabled === false`) when the mutation call rejects rather than resolves.

### WR-02: Partial-mutation success leaves the UI showing stale data

**Files modified:** `src/components/account-details-card.tsx`, `src/components/account-details-card.test.tsx`
**Commit:** `dfbb59b`
**Applied fix:** `router.refresh()` now fires immediately once the name mutation succeeds, independent of whether the follow-up email step succeeds or fails. Added the exact name-succeeds/email-fails regression test the finding's own narrative flagged as missing.

### WR-03: `handleResend` discards the result of `requestEmailChange`

**Files modified:** `src/components/account-details-card.tsx`, `src/components/account-details-card.test.tsx`
**Commit:** `a423067`
**Applied fix:** Adapted from the literal suggestion. The pending-email banner (and its Resend button) renders in both view and edit mode, but `serverError`'s `<p>` only renders inside the `editing==true` form branch — reusing `serverError` as REVIEW.md's snippet literally showed would have left a resend failure completely invisible whenever the user clicks Resend from view mode (the common case, since the banner is usually seen right after returning to view mode). Introduced a dedicated `resendError` state rendered directly beside the banner instead, so the failure is visible regardless of mode. Regression test added and deliberately exercised from view mode to prove the fix actually surfaces the message where the literal snippet would not have.

### WR-04: `"rate-limited"` collapsed into the generic save error

**Files modified:** `src/components/account-details-card.tsx`, `src/components/account-details-card.test.tsx`
**Commit:** `d0803cd`
**Applied fix:** Added the suggested `else if (result.error === "rate-limited")` branch with "Too many attempts. Try again in a bit." Regression test asserts the specific copy appears and the generic message does not.

### WR-05: `requestEmailChange` never validates the new email server-side

**Files modified:** `src/lib/account-actions.ts`, `src/lib/account-actions.test.ts`
**Commit:** `7812567`
**Applied fix:** Added `newEmailSchema = z.string().trim().toLowerCase().email()`, applied via `safeParse` in place of the old raw `.trim().toLowerCase()`, with a new `"invalid-email"` error variant on the return type. Verified against the installed zod 4.3.6 directly (trim -> lowercase -> email-format all chain correctly; empty string and malformed input both rejected). Two regression tests added (malformed string, empty string), both asserting the uniqueness `db.select` is never reached.

### WR-06: Single-use verify token consumed by scanner prefetches

**Files modified:** `src/app/api/account/verify-email/route.ts`, `src/app/api/account/verify-email/route.test.ts`, `src/lib/account-queries.ts`, `src/lib/account-queries.test.ts`, `src/app/(protected)/account/page.tsx`
**Commit:** `dab40fb`
**Applied fix:** Deviated from REVIEW.md's literal "confirm interstitial" suggestion in favor of the orchestrator's alternative guidance: idempotent-per-user token consumption. The GET no longer deletes the verification row on success, so the token stays valid and safely re-appliable (a harmless no-op re-set of the already-current email) up to its normal 24h TTL, instead of being burned on first hit. Traced the race re-check logic by hand to confirm a replay resolves `clash[0].id === userId` (not a false "someone else claimed it"), so it correctly falls through to success on replay rather than `expired`.

This required a follow-on fix to `getPendingEmailChange` (new `currentEmail` param): without it, a lingering-but-already-applied row would keep reporting itself as still-pending after the email had already changed, re-showing a stale "verification sent" banner. Found this by reading `account/page.tsx`'s only call site before finalizing the approach, not after.

Chosen over the interstitial because it requires no new UI/copy/page (avoiding a UI-SPEC copy-review cycle) and leaves the existing e2e flow (`page.goto` the verify URL -> immediate success banner) fully intact with zero spec changes. Two new regression tests: happy path asserts the row is no longer deleted; a same-token replay (simulating a scanner having already consumed it) asserts a redirect to success rather than expired.

### WR-07: `PENDING_EMAIL_PREFIX` duplicated across four files

**Files modified:** `src/lib/account-constants.ts` (new), `src/lib/account-actions.ts`, `src/app/api/account/verify-email/route.ts`, `src/lib/account-queries.ts`, `e2e/helpers.ts`
**Commit:** `1543e4e`
**Applied fix:** Extracted to a new `src/lib/account-constants.ts` (named to match the existing `image-constants.ts` convention rather than REVIEW.md's suggested `verification-identifiers.ts`) and imported from all three production files. `e2e/helpers.ts` imports it via the same dynamic-import pattern it already uses for `@/db`/`@/db/schema` (confirmed the `@/*` -> `./src/*` tsconfig alias resolves identically for both before applying).

### WR-08: `deleteAccount`'s signOut unguarded; caller's catch doesn't log

**Files modified:** `src/lib/account-actions.ts`, `src/lib/account-actions.test.ts`, `src/components/delete-account-row.tsx`, `src/components/delete-account-row.test.tsx`
**Commit:** `e7dce57`
**Applied fix:** Wrapped `auth.api.signOut()` in its own try/catch with `console.error` logging inside `deleteAccount()`. Bound the error and added `console.error` logging in `delete-account-row.tsx`'s catch, ahead of the existing inline message. Two regression tests: `deleteAccount()` resolves (not rejects) and logs when `signOut` itself rejects; the row component's existing throw-path test extended with a `console.error` spy assertion.

### WR-09: `AccountBack`'s D-04 dirty guard has zero test coverage

**Files modified:** `src/components/daybreak/account-back.test.tsx` (new)
**Commit:** `c2b0dc8`
**Applied fix:** Added the file, covering all four cases REVIEW.md specified (dirty=false navigates immediately; dirty=true opens the dialog and blocks navigation; Stay closes without navigating; Leave navigates) plus a dedicated leak-guard test. Deviated from the suggested synthetic `setPasswordDirty()` probe: renders the real `ChangePasswordCard` alongside `AccountBack` so `passwordDirty` is driven by genuine typed keystrokes through the real `AccountDirtyProvider`, per this codebase's own established lesson that rendered tests must type/interact for real rather than fake a state transition. This also made the leak-guard case directly meaningful: it types a real, recognizable password string and asserts that string never appears anywhere in the rendered dialog or `document.body`, rather than only proving the Context's TypeScript type is a boolean. Ran the new file in isolation before committing to confirm no flakiness in the dialog-open/Stay-close timing assumptions (all 5 tests passed on the first real run).

## Skipped Issues

None — all 9 in-scope findings were fixed.

---

_Fixed: 2026-07-20T14:21:50Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
