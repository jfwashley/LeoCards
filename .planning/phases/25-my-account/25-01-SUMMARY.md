---
phase: 25-my-account
plan: 01
subsystem: auth
tags: [better-auth, drizzle, server-actions, route-handlers, rate-limiting, email-verification, neon]

# Dependency graph
requires: []
provides:
  - "requestEmailChange server action (D-07) — custom verification-table token flow, honest email-taken error, 5/hr rate limit"
  - "deleteAccount server action (D-14) — single cascading delete + verification hygiene + signOut"
  - "getPendingEmailChange RSC-safe query — drives the pending-email banner from server-persisted state"
  - "GET /api/account/verify-email route handler — unauthenticated, single-use token consumer, open-redirect-proof"
affects: [25-02, 25-03, 25-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "drizzle-orm partial vi.mock (swap `eq` for a plain {__op,col,val} object via importOriginal) to assert exact query-condition arguments in server-action/route tests, mirroring src/app/api/study/complete/route.test.ts"
    - "Real `next/server` NextRequest construction in Route Handler unit tests (not a cast plain Request) — required whenever the handler reads request.nextUrl, since a bare Request has no .nextUrl getter"
    - "try/catch wrapping an entire fire-and-forget email send (not just .catch() on the send promise) — the Resend SDK throws synchronously at construction when no API key is configured"

key-files:
  created:
    - src/lib/account-actions.ts
    - src/lib/account-actions.test.ts
    - src/lib/account-queries.ts
    - src/lib/account-queries.test.ts
    - src/app/api/account/verify-email/route.ts
    - src/app/api/account/verify-email/route.test.ts
  modified: []

key-decisions:
  - "Wrapped the Resend send in try/catch (not just .catch() on the returned promise) — new Resend(undefined) throws synchronously when RESEND_API_KEY is unset, which a bare .catch() chain never reaches"
  - "Cast the userId parsed from the verification identifier suffix `as UserId` in verify-email/route.ts — RESEARCH's illustrative snippet omitted this, but strict + noUncheckedIndexedAccess tsc requires it to match user.id's branded column type"

patterns-established:
  - "Account-mutation backend pattern: custom server actions bypass better-auth's built-in changeEmail/deleteUser wherever their default behavior conflicts with an explicit product decision (anti-enumeration masking vs. honest errors; 24h session-freshness vs. no-password-reentry)"

requirements-completed: [ACC-02, ACC-05]

# Metrics
duration: 20min
completed: 2026-07-19
---

# Phase 25 Plan 01: Account Mutation Backend Summary

**Custom D-07 email-change token flow (verification table, 24h TTL, 5/hr rate limit) + D-14 single-statement cascading delete, both deliberately bypassing better-auth's built-in changeEmail/deleteUser endpoints**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-19T15:51:55Z
- **Completed:** 2026-07-19T16:12:18Z
- **Tasks:** 3 (all TDD — RED+GREEN commit pairs)
- **Files modified:** 6 (all net-new: 3 implementation, 3 test)

## Accomplishments

- `requestEmailChange` (D-07): writes a single-use token into the existing `verification` table under a deterministic per-user identifier (`change-email:{userId}`), replacing any prior pending row rather than accumulating them. Rate-limited to 5 requests/hour/user. Lowercases the candidate email before both the uniqueness check and the stored value. Returns an honest `email-taken` error (deliberately not anti-enumeration-masked, per the UI-SPEC contract). Fires a verification email to the NEW inbox only, fully fire-and-forget.
- `deleteAccount` (D-14): a single `db.delete(user)` statement relies on Postgres `ON DELETE CASCADE` (already present on every user-referencing FK) to wipe session, account, decks→cards→recall_events, milestones_seen, and habitat_metadata atomically — no JS transaction, matching Neon HTTP's no-transaction constraint. Proactively hygiene-deletes any pending email-change verification row first (that table has no FK cascade), then best-effort `auth.api.signOut()` for cookie clearing.
- `getPendingEmailChange`: RSC-safe (no `"use server"`) read query returning the pending `{newEmail, expiresAt}` or `null` for missing/expired/malformed rows — lets `page.tsx` (a later plan) drive the pending-email banner from state that spans sessions/devices.
- `GET /api/account/verify-email`: unauthenticated-by-design Route Handler that consumes the token exactly once (verification row deleted only after a successful update), handles all 5 edge cases (no token, no-match, expired, deleted target user, uniqueness race), and redirects to a hardcoded `/account?verified=success|expired` target with zero client-controlled redirect surface.
- Email-token round-trip is fully unit-covered without any live inbox — the DB row is the source of truth, exactly as RESEARCH's Validation Architecture intended.

## Task Commits

Each task followed RED → GREEN (TDD):

1. **Task 1: account-actions.ts (requestEmailChange + deleteAccount) + tests**
   - `1b6223c` (test) — failing tests, module doesn't exist yet
   - `413fc53` (feat) — implementation + Resend try/catch fix; 10/10 tests green
2. **Task 2: account-queries.ts (getPendingEmailChange) + test**
   - `5eef469` (test) — failing tests, module doesn't exist yet
   - `a0df98c` (feat) — implementation; 4/4 tests green
3. **Task 3: verify-email GET route handler + test**
   - `0bdac02` (test) — failing tests, module doesn't exist yet
   - `95a5292` (feat) — implementation; 6/6 tests green

**Plan metadata:** _pending — added after this Summary is committed_

_All three tasks were `tdd="true"`; each RED commit's test run was confirmed failing (module-not-found) before its paired GREEN commit was made._

## Files Created/Modified

- `src/lib/account-actions.ts` — `"use server"` module: `requestEmailChange`, `deleteAccount`
- `src/lib/account-actions.test.ts` — 10 tests (vi.hoisted mock scaffold extended with `auth.api.signOut` + a partial `drizzle-orm` mock for query-arg assertions)
- `src/lib/account-queries.ts` — RSC-safe query module: `getPendingEmailChange`
- `src/lib/account-queries.test.ts` — 4 tests (milestone-queries.test.ts-style chain mock)
- `src/app/api/account/verify-email/route.ts` — GET Route Handler, redirect-emitting
- `src/app/api/account/verify-email/route.test.ts` — 6 tests (debug/state.test.ts-style queue-based chain mock + real `NextRequest`)

## Decisions Made

- Resend send wrapped in `try { ... } catch` rather than a bare `.catch()` on the send promise — `new Resend(undefined)` throws synchronously when `RESEND_API_KEY` is unset (the local/CI default), which a `.catch()` on the *result* of a call that never happens cannot protect against. Discovered via TDD GREEN using the real, unmocked `resend` package (deliberately not mocked, matching the codebase's existing `sendResetPassword` precedent and RESEARCH's explicit "e2e tests don't need a live inbox" rationale).
- `userId` parsed from `match.identifier.slice(...)` in the verify-email route is cast `as UserId` — needed to satisfy `strict` + `noUncheckedIndexedAccess` tsc against `user.id`'s branded `$type<UserId>()` column, matching the codebase's existing `session.user.id as UserId` convention used throughout `deck-actions.ts`/`deck-queries.ts`.
- Test files construct a real `next/server` `NextRequest` (not a cast plain `Request`) wherever the handler under test reads `request.nextUrl` — a bare `Request` has no `.nextUrl` getter, so casting would produce a runtime `undefined` access rather than a working test.
- `drizzle-orm`'s `eq` was partially mocked (via `importOriginal` + override) in `account-actions.test.ts` to make query-condition arguments (column + value) directly assertable — used specifically to prove the lowercased email and the exact `change-email:{userId}` identifier reach the query builder, mirroring the existing `study/complete/route.test.ts` precedent for this technique.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resend constructor's synchronous throw was not actually caught by the plan's `.catch()`-only pattern**
- **Found during:** Task 1 GREEN (`npx vitest run src/lib/account-actions.test.ts`) — 4 of 10 tests failed with `Error: Missing API key. Pass it to the constructor \`new Resend("re_123")\`` propagating out of `requestEmailChange` itself, not swallowed by any `.catch()`.
- **Issue:** RESEARCH Code Example §C's `.catch()`-only pattern (matching `src/lib/auth.ts`'s existing `sendResetPassword`) assumes only the returned `.send()` promise can reject. In this Resend SDK version, `new Resend(process.env.RESEND_API_KEY)` itself throws synchronously when the key is absent — before `.send()` is ever called — so a `.catch()` chained onto `.send()`'s result never runs, and the exception propagates up through `requestEmailChange`, violating Pitfall 8's explicit "never lets a send failure surface to the user" requirement.
- **Fix:** Wrapped the `await import("resend")` → `new Resend(...)` → `.send().catch(...)` sequence in an outer `try/catch`, logging via `console.error` on either failure path. The verification DB row (written before this block) remains the source of truth regardless.
- **Files modified:** `src/lib/account-actions.ts`
- **Verification:** All 10 `account-actions.test.ts` tests pass with the real (unmocked) `resend` package and no `RESEND_API_KEY` set, exactly the local/CI default this pitfall describes.
- **Committed in:** `413fc53` (Task 1 GREEN commit)

**2. [Rule 1 - Type correctness] Added a branded `as UserId` cast omitted from RESEARCH's illustrative route code**
- **Found during:** Task 3 implementation (pre-empted before running `tsc`, based on the established `deck-actions.ts`/`deck-queries.ts` casting convention for this project's branded-ID types).
- **Issue:** `userId = match.identifier.slice(PENDING_EMAIL_PREFIX.length)` produces a plain `string`; `user.id` is declared `.$type<UserId>()` in `src/db/schema.ts`, so `eq(user.id, userId)` requires `userId: UserId` under this project's `strict: true` tsconfig.
- **Fix:** `const userId = match.identifier.slice(PENDING_EMAIL_PREFIX.length) as UserId;`
- **Files modified:** `src/app/api/account/verify-email/route.ts`
- **Verification:** Full `npx tsc --noEmit` clean.
- **Committed in:** `95a5292` (Task 3 GREEN commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bug/correctness, discovered via TDD's real-implementation test runs rather than mocked-away)
**Impact on plan:** Both fixes are narrow, necessary corrections to match the plan's own stated intent (fire-and-forget email never blocking the response; branded-type-correct DB access). No scope creep — no new files, no architectural changes.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None — no external service configuration required. `RESEND_API_KEY` remains optional exactly as before (Pitfall 8); the email-change flow is fully functional and testable without it, per design.

## Next Phase Readiness

- The account-mutation backend contracts are live and match the plan's `<interfaces>` block exactly: `requestEmailChange(newEmailRaw): Promise<{ok:true}|{ok:false,error}>`, `deleteAccount(): Promise<void>`, `getPendingEmailChange(userId): Promise<{newEmail,expiresAt}|null>`, `GET` (302/307 redirect to `/account?verified=success|expired`).
- Downstream plans (25-03 account details card, 25-04 delete row + page) can import directly from `src/lib/account-actions.ts` and `src/lib/account-queries.ts` with no further backend work needed for D-07/D-14.
- `src/lib/auth.ts` and `src/db/schema.ts` are confirmed untouched (`git status --porcelain` empty for both); zero new dependencies (`package.json` diff empty).
- Full project `npx tsc --noEmit` clean and full `npx vitest run` green (2145 passed, 6 skipped, 0 failed) — including the two known parallel-load-flaky files (`cooldown-config.test.ts`, `bw-atoms.test.tsx`), which did not flake this run.
- No blockers for Wave 2 of this phase.

---
*Phase: 25-my-account*
*Completed: 2026-07-19*
