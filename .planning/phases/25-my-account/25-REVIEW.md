---
phase: 25-my-account
reviewed: 2026-07-20T13:30:08Z
depth: deep
files_reviewed: 24
files_reviewed_list:
  - e2e/01-auth-signup-login.spec.ts
  - e2e/10-mobile-responsive.spec.ts
  - e2e/25-my-account.spec.ts
  - e2e/helpers.ts
  - src/app/(protected)/account/page.tsx
  - src/app/api/account/verify-email/route.test.ts
  - src/app/api/account/verify-email/route.ts
  - src/app/globals.css
  - src/components/account-details-card.test.tsx
  - src/components/account-details-card.tsx
  - src/components/account-dirty-context.tsx
  - src/components/account-logout-section.test.tsx
  - src/components/account-logout-section.tsx
  - src/components/account-nav-button.tsx
  - src/components/app-header.tsx
  - src/components/change-password-card.test.tsx
  - src/components/change-password-card.tsx
  - src/components/daybreak/account-back.tsx
  - src/components/delete-account-row.test.tsx
  - src/components/delete-account-row.tsx
  - src/lib/account-actions.test.ts
  - src/lib/account-actions.ts
  - src/lib/account-queries.test.ts
  - src/lib/account-queries.ts
findings:
  critical: 0
  warning: 9
  info: 2
  total: 11
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-07-20T13:30:08Z
**Depth:** deep
**Files Reviewed:** 24
**Status:** issues_found

## Narrative Findings (AI reviewer)

### Summary

Reviewed all 24 Phase 25 files plus their direct cross-file dependencies
(`src/db/schema.ts`, `src/lib/auth.ts`, `src/lib/rate-limit.ts`,
`src/app/(protected)/layout.tsx`) to trace the five flows called out in the
review brief end to end. `npx tsc --noEmit` is clean, `npx biome check` on
the full file set is clean, and all 47 existing unit tests pass — so this
is a solid, security-conscious implementation with deliberate, documented
trade-offs (FK cascades verified correct for every user-referencing table,
single-use token deletion ordered correctly, `.code`-based error mapping
that never leaks raw messages, `?verified` allow-listed rather than
reflected, session-derived `userId` only on both mutations, no
`dangerouslySetInnerHTML`/`eval`/hardcoded secrets anywhere in scope).

No Critical-tier defects were found — no injection, auth bypass, or data
loss path. The gaps below cluster in three places: (1) two of the three
client mutation handlers have no `catch`, so a rejected promise (e.g.
`requestEmailChange`'s own `throw new Error("Unauthorized")` on a
session that expired mid-edit) produces silent no-op UI with zero
feedback; (2) `AccountDetailsCard`'s two-mutation sequencing can leave the
UI showing stale data after a partial success; (3) the D-04 dirty-guard
back-button flow — the component the review brief specifically flagged for
"typed passwords must never leak into context/dialog" — has no test
coverage at all, unit or e2e.

### Critical Issues

None found.

### Warnings

#### WR-01: Mutation handlers use `try/finally` with no `catch` — a rejected promise produces silent no-op UI

**File:** `src/components/account-details-card.tsx:101-152`, `src/components/change-password-card.tsx:138-180`

**Issue:** Both `onSubmit` handlers wrap their `await` calls in `try { ... } finally { setIsPending(false); }` with **no `catch` clause**. Every error path they do handle assumes the callee *resolves* with an `{ error }` / `{ ok: false }` shape — but `requestEmailChange` (imported at `account-details-card.tsx:14`, called at `account-details-card.tsx:122`) is a `"use server"` action that can also *reject*: it does `throw new Error("Unauthorized")` at `src/lib/account-actions.ts:54` whenever `getSession()` returns null. That's a realistic runtime state, not a hypothetical — the user's session can expire or be revoked mid-edit (e.g. they changed their password in another tab, which fires `revokeOtherSessions: true` per D-09) while the `/account` edit form is still open. When that happens here, the promise rejects, nothing in `onSubmit` catches it, `serverError`/`emailTakenError` are never set (those assignments only happen inside the `if (error)` / `if (!result.ok)` branches, which are never reached), and `finally` still resets `isPending` — so the Save button just silently re-enables with the form otherwise unchanged. The user sees no error, no success, nothing. `change-password-card.tsx:142-179` has the identical shape around `authClient.changePassword`.

Contrast with `src/components/delete-account-row.tsx:23-34`, the third mutation handler added in this same phase, which *does* wrap its call in `try/catch/finally` and shows a message on any thrown error — proving the "catch and show a message" pattern was known and intended, just inconsistently applied to the other two.

**Fix:**
```tsx
// account-details-card.tsx
try {
  if (nameChanged) { /* ... */ }
  if (emailChanged) { /* ... */ }
  router.refresh();
  setEditing(false);
  if (!emailChanged) { /* success fade */ }
} catch {
  setServerError("Couldn't save your changes. Try again.");
} finally {
  setIsPending(false);
}
```
Apply the same `catch` to `change-password-card.tsx`'s `onSubmit`.

#### WR-02: Partial-mutation success leaves the UI showing stale data

**File:** `src/components/account-details-card.tsx:101-152` (also `87-99`)

**Issue:** When both name and email changed and the user submits: `authClient.updateUser({ name })` (line 114) can succeed while the follow-up `requestEmailChange(values.email)` (line 122) fails (e.g. `"email-taken"`). The function `return`s at line 129 *before* `router.refresh()`/`setEditing(false)` (lines 133-134) ever run. The server now genuinely has the new name, but the component's `name` prop is stale (not refreshed), `editing` stays `true`, and no success indicator fires. If the user then clicks "Discard changes" (`handleCancel`, line 94-99), it calls `reset({ name, email })` using that same **stale** `name` prop — so the view-mode `DetailRow` renders the *old* name, actively contradicting what the server just persisted, until the next full page load. There is no test covering this combined name+email, name-succeeds/email-fails path (`account-details-card.test.tsx`'s combined-save test only covers the both-succeed case).

**Fix:** Refresh (or otherwise reconcile local state) as soon as the name mutation succeeds, independent of what the email step does next:
```tsx
if (nameChanged) {
  const { error } = await authClient.updateUser({ name: values.name });
  if (error) { setServerError("Couldn't save your changes. Try again."); return; }
  router.refresh(); // commit the name success before attempting email
}
```

#### WR-03: `handleResend` discards the result of `requestEmailChange` — failures are completely silent

**File:** `src/components/account-details-card.tsx:154-163`

**Issue:**
```tsx
async function handleResend() {
  if (!pendingEmail) return;
  setResendPending(true);
  try {
    await requestEmailChange(pendingEmail);
    router.refresh();
  } finally {
    setResendPending(false);
  }
}
```
The `{ ok, error }` result is never inspected. If the resend is rate-limited (5/hour shared with the edit-save path, `src/lib/account-actions.ts:26-29`) or otherwise fails, the button just re-enables and the page refreshes as if nothing happened — no error text anywhere. The user has no way to know their "Resend email" click did nothing.

**Fix:**
```tsx
async function handleResend() {
  if (!pendingEmail) return;
  setResendPending(true);
  try {
    const result = await requestEmailChange(pendingEmail);
    if (!result.ok) {
      setServerError("Couldn't resend the email. Try again in a bit.");
      return;
    }
    router.refresh();
  } finally {
    setResendPending(false);
  }
}
```

#### WR-04: `"same-email"` and `"rate-limited"` are both collapsed into the same generic, misleading error

**File:** `src/components/account-details-card.tsx:121-130`

**Issue:** `requestEmailChange` returns three distinct error codes (`"same-email" | "email-taken" | "rate-limited"`, `src/lib/account-actions.ts:49-52`), but the caller only special-cases `"email-taken"`:
```tsx
if (result.error === "email-taken") {
  setEmailTakenError("That email is already in use.");
} else {
  setServerError("Couldn't save your changes. Try again.");
}
```
`"rate-limited"` is actively misleading — "Try again" implies retrying will help, but the whole point of the 5/hour limiter is that it won't. `"same-email"` can also legitimately occur (e.g. the user retypes the same address with different casing/whitespace than what's stored — the client's `emailChanged` check at line 107 is a raw `!==` against the unnormalized prop, while the server normalizes via `.trim().toLowerCase()` before comparing).

**Fix:**
```tsx
if (result.error === "email-taken") {
  setEmailTakenError("That email is already in use.");
} else if (result.error === "rate-limited") {
  setServerError("Too many attempts. Try again in a bit.");
} else {
  setServerError("Couldn't save your changes. Try again.");
}
```

#### WR-05: `requestEmailChange` never validates the new email is well-formed server-side

**File:** `src/lib/account-actions.ts:47-76`

**Issue:** The only email-shape validation (`z.string().email(...)`) lives in the client's `detailsSchema` (`src/components/account-details-card.tsx:19-22`). `requestEmailChange` itself only trims/lowercases (line 66) and checks equality/uniqueness (lines 68-76) — it never confirms `newEmailRaw` actually looks like an email. Since this is a `"use server"` action, it's directly callable over the network with an arbitrary POST body, bypassing the browser's zod validation entirely. A caller can set `newEmail` to any non-empty, not-currently-taken string (e.g. `""` after trim, or garbage text), which gets written into the `verification.value` JSON and, on the (self-limited, own-account-only) verification round trip, into `user.email` — the field better-auth uses as the sign-in identifier. Blast radius is limited to the caller's own account (userId is session-derived), but it's a real "trust the client" gap on a security-relevant field.

**Fix:**
```ts
import { z } from "zod";
const newEmailSchema = z.string().trim().toLowerCase().email();

export async function requestEmailChange(newEmailRaw: string): Promise<...> {
  const parsed = newEmailSchema.safeParse(newEmailRaw);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid-email" as const };
  }
  const newEmail = parsed.data;
  // ...rest unchanged
}
```

#### WR-06: Single-use verify token is consumed by *any* GET, including automated link-scanner prefetches

**File:** `src/app/api/account/verify-email/route.ts:26-82`

**Issue:** The route is (by design, per its own header comment) unauthenticated and stateless — authority comes entirely from the URL token. It applies the email change and deletes the verification row (single-use) on a bare `GET`. Many corporate mail gateways and security products (Microsoft Defender/ATP Safe Links, Proofpoint, Mimecast, etc.) automatically follow links in incoming email to scan them *before* the user opens the message. Against this route, that prefetch **is** a real, successful verification: it applies the email update and deletes the row, so when the actual user later clicks the same link, `match` is gone and they land on `?verified=expired` — a legitimate user whose email silently already changed, told their own link is broken, with no code-visible way to tell "prefetched by a scanner" apart from "used by the user."

**Fix:** Require an explicit second step before mutating — e.g. render a lightweight "Confirm this change" interstitial on `GET` (no DB write), and only consume the token on a subsequent same-page `POST`/button click:
```ts
export async function GET(request: NextRequest) {
  // validate token exists/unexpired (read-only) and render a confirm page
  // with a form that POSTs back to this same route to actually apply it
}
export async function POST(request: NextRequest) {
  // the existing apply-and-delete logic moves here
}
```

#### WR-07: The `"change-email:"` identifier-prefix convention is duplicated across four files with no shared constant

**File:** `src/lib/account-actions.ts:21`, `src/app/api/account/verify-email/route.ts:24`, `src/lib/account-queries.ts:13`, `e2e/helpers.ts:334`

**Issue:** Three separate production files each independently declare `const PENDING_EMAIL_PREFIX = "change-email:";`, and `e2e/helpers.ts:334` hardcodes the same literal a fourth time inside a `like(verification.identifier, "change-email:%")` call. Every one of these locations carries a comment saying it "must match" the others — but nothing enforces that beyond code review. A future edit to any one of the four (e.g. changing the delimiter, or namespacing by environment) silently breaks token creation/consumption/banner-display/test-seam agreement with no compiler or runtime error — verification would just stop being found, degrading to "always expired" or "banner never shows."

**Fix:** Extract to one shared module, e.g. `src/lib/verification-identifiers.ts`, exporting `PENDING_EMAIL_PREFIX` (or a `changeEmailIdentifier(userId)` helper), and import it from `account-actions.ts`, `verify-email/route.ts`, and `account-queries.ts`. `e2e/helpers.ts` already dynamically imports `@/db` and `@/db/schema` at call time (line 327-328) specifically to avoid a top-level import failure when `DATABASE_URL` is unset — it can dynamically import the same shared constant the same way.

#### WR-08: `deleteAccount`'s best-effort `signOut()` is unguarded, and the caller's `catch` swallows the error without logging it

**File:** `src/lib/account-actions.ts:138-156`, `src/components/delete-account-row.tsx:23-34`

**Issue:** `deleteAccount()`'s own comment acknowledges `auth.api.signOut()` (line 155) is "best-effort" because the session row is already gone via cascade by that point — but the call isn't wrapped in its own `try/catch`, so if it throws for any reason, the exception propagates out of `deleteAccount()` even though the account deletion itself (the operation the user actually asked for and cares about) already fully succeeded. The caller then does:
```tsx
} catch {
  setDeleteError("Couldn't delete your account. Try again.");
}
```
— a bare `catch` with no bound error and no logging. Net effect: the account is irreversibly gone, but the user is told the deletion failed and to retry (a retry would then hit `getSession()` returning null and throw `"Unauthorized"`, surfacing the same generic message again), and there is no console trace anywhere to diagnose what actually happened. (Confirmed by reading the schema: the delete-then-signOut security property — a deleted account's credentials must be rejected — does *not* depend on this call succeeding, since `account`/`session` cascade-delete with `user`; this is a UX/observability bug, not an auth bypass.)

**Fix:**
```ts
// account-actions.ts
await db.delete(user).where(eq(user.id, userId));
try {
  await auth.api.signOut({ headers: hdrs });
} catch (err) {
  console.error("[account] signOut after deleteAccount failed (best-effort):", err);
}
```
```tsx
// delete-account-row.tsx
} catch (err) {
  console.error("[account] deleteAccount failed:", err);
  setDeleteError("Couldn't delete your account. Try again.");
}
```

#### WR-09: The D-04 dirty-guard / discard-dialog flow has zero test coverage

**File:** `src/components/daybreak/account-back.tsx` (whole file — no test file exists)

**Issue:** `AccountBack` is the component the review brief specifically calls out ("typed passwords must never leak into context/dialog") and it contains real branching logic — `handleClick` intercepts navigation into a confirm dialog when `passwordDirty` is true, and `handleLeave`/"Stay" resolve it two different ways. There is no `account-back.test.tsx` (confirmed: no file matches `*account-back*` other than the component itself), and `e2e/25-my-account.spec.ts` never exercises this path either — its only interaction with `account-back-btn` is a touch-target size assertion (`e2e/25-my-account.spec.ts:79-82`); no test ever leaves the password fields dirty and clicks back, and the `account-discard-dialog`/`account-discard-stay-btn`/`account-discard-leave-btn` test ids are never referenced by any spec file in the repo. `change-password-card.test.tsx` only verifies the *upstream* boolean (`useAccountDirty`'s `passwordDirty`) gets set correctly — it never renders `AccountBack` itself. So the entire "don't silently lose a typed password on navigation" guarantee is currently unverified by any automated test.

**Fix:** Add `src/components/daybreak/account-back.test.tsx` covering: (1) click with `passwordDirty=false` navigates immediately, no dialog; (2) click with `passwordDirty=true` opens the dialog and does **not** navigate; (3) "Stay" closes the dialog without navigating; (4) "Leave" navigates to `/dashboard`. Render through `AccountDirtyProvider` + a probe that calls `setPasswordDirty`, mirroring the `DirtyProbe` pattern already used in `change-password-card.test.tsx:38-41`.

### Info

#### IN-01: Verification token comparison is not constant-time

**File:** `src/app/api/account/verify-email/route.ts:43`

**Issue:** `(JSON.parse(r.value) as { token: string }).token === token` uses plain string equality. Real-world risk is very low — tokens are `crypto.randomUUID()` (122 bits of entropy) and there's no per-character retry oracle exposed — but for a security-relevant token comparison, constant-time comparison is the defense-in-depth default.

**Fix:** `crypto.timingSafeEqual(Buffer.from(storedToken), Buffer.from(token))` (guard on equal length first, since `timingSafeEqual` throws on length mismatch).

#### IN-02: `verification` row hygiene — expired rows are never swept, and account deletion only cleans up its own row

**File:** `src/lib/account-queries.ts:33-34`, `src/lib/account-actions.ts:144-148`

**Issue:** `getPendingEmailChange` treats an expired row as "absent" (`if (row.expiresAt < new Date()) return null;`) but never deletes it — an abandoned email-change request leaves a dead row in `verification` forever unless the user makes a new request or deletes their account. Separately, `deleteAccount()` only deletes the `change-email:${userId}` row (line 146-148); any other lingering `verification` rows tied to the user under a different identifier convention (e.g. a better-auth password-reset token issued earlier) are left orphaned once the user row cascade-deletes out from under them.

**Fix:** Opportunistically delete on read in `getPendingEmailChange` when expired, and/or add a scheduled sweep; consider whether `deleteAccount` should scan more broadly for any verification rows referencing the user's email, not just the `change-email:` prefix.

---

_Reviewed: 2026-07-20T13:30:08Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
