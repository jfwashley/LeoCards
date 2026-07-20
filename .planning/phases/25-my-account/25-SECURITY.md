---
phase: 25
slug: my-account
status: verified
threats_total: 28
threats_open: 0
asvs_level: 1
created: 2026-07-20
---

# Phase 25 — Security (my-account)

> Per-phase security contract: threat register, accepted risks, and audit trail.
>
> Auth-critical phase: custom email-change token flow (better-auth `verification`
> table), custom account-deletion server action (Postgres FK cascade), password
> change with `revokeOtherSessions`, header logout → in-page sign-out swap.
> All evidence below is verified against the CURRENT on-disk implementation
> (post-25-REVIEW-FIX.md hardening), not plan intent or stale SUMMARY prose —
> confirmed via a live `npx vitest run` (8 files / 62 tests, all green,
> 2026-07-20) and direct `git diff` checks, not assumed from documentation.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → `requestEmailChange`/`deleteAccount` server actions | Untrusted candidate email crosses; userId is always session-derived, never client-supplied | candidate email string (only) |
| email inbox → `GET /api/account/verify-email` | Unauthenticated URL click, possibly a different device/session than the requester | opaque `?token=` query param |
| DB `verification`/`user` tables | Token store + identity-of-record for the email-change flow | token, pending newEmail, user row |
| client form → `authClient.changePassword` | Current/new password values cross to better-auth's `/change-password` endpoint | current + new password (in-flight only) |
| `ChangePasswordCard` → `AccountDirtyProvider` | Only a derived boolean crosses — never typed password text | `boolean` |
| edit form → `authClient.updateUser` / `requestEmailChange` | Name + candidate email cross to server-authorized mutations | name string, email string |
| server pending state → pending-email banner | Server-derived `pendingEmail` prop renders; client never fabricates it | email string (display only) |
| browser → `/account` searchParams | Untrusted `?verified` query param crosses | string (allow-listed on read) |
| `(protected)/layout.tsx` | Session gate every `/account` request passes through | session cookie |
| dashboard header → `/account` | Pure navigation Link, no user input | none (nav only) |
| e2e pending-token seam → `verification` table | Test-only, dynamically-imported Drizzle read; not reachable from any `src/` route | token string (test process only) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-25-01-A | Tampering | email-change token | mitigate | `crypto.randomUUID()` (~122 bits), server-side only, never client-derived | closed |
| T-25-01-B | Tampering (replay) | verify route | mitigate | Mechanism updated post-review (WR-06): idempotent-per-user re-apply instead of delete-on-success — see Notes | closed |
| T-25-01-C | Tampering (expiry) | verify route | mitigate | `match.expiresAt < new Date()` checked before UPDATE; 24h TTL | closed |
| T-25-01-D | Tampering (identifier collision) | requestEmailChange | mitigate | Deterministic identifier; delete-then-insert, replace-not-additive | closed |
| T-25-01-E | Spoofing/Info Disclosure (uniqueness race) | verify route | mitigate | Race re-check `clash[0]?.id !== userId`; both sides lowercased before write | closed |
| T-25-01-F | Tampering (open redirect) | verify route | mitigate | Redirect target hardcoded to `request.nextUrl.origin` + fixed path; no callbackURL param | closed |
| T-25-01-G | Elevation/Info Disclosure (IDOR) | actions + verify route | mitigate | userId always session-derived (actions) or resolved server-side from the matched token row (route) — never client input | closed |
| T-25-01-H | Denial of Service | requestEmailChange (send abuse) | mitigate | `createRateLimiter` 5 req/hr/user, checked before any DB write/send | closed |
| T-25-01-I | Info Disclosure (email enumeration) | requestEmailChange | accept | AR-25-01 | closed |
| T-25-01-J | Tampering (authz) | deleteAccount | mitigate | Session-derived userId only; no client-supplied id, no GET | closed |
| T-25-01-SC | Tampering (supply chain) | dependencies | accept | AR-25-04 | closed |
| T-25-02-A | Session Management (fixation) | password change | mitigate | `revokeOtherSessions: true` on every `changePassword` call | closed |
| T-25-02-B | Info Disclosure (leak) | dirty-form guard | mitigate | `AccountDirtyProvider` stores ONLY a boolean; leak-guard test proves typed password never renders | closed |
| T-25-02-C | Spoofing | current-password verification | mitigate | Server-verified by better-auth; client maps `error.code === "INVALID_PASSWORD"`, never bypasses | closed |
| T-25-02-D | Info Disclosure | password fields in DOM/logs | mitigate | `type="password"` on all 3 fields; zero `console.*` references to password values | closed |
| T-25-03-A | Tampering (IDOR) | name update | mitigate | `authClient.updateUser({ name })` only — no id/email passed; better-auth re-derives session user | closed |
| T-25-03-B | Info Disclosure | email-in-use error in UI | accept | AR-25-02 | closed |
| T-25-03-C | Tampering (client fabrication) | pending banner | mitigate | Driven by server-read `pendingEmail` prop, never local state | closed |
| T-25-03-D | Info Disclosure | stale-vs-new email display | mitigate | View-mode Email row renders the ACTIVE (old) prop; e2e proves new address never shows pre-verification | closed |
| T-25-04-A | Tampering (CSRF) | delete-account | mitigate | Next.js Server Action (same-origin Origin-header enforcement, default config, no `allowedOrigins` override); re-derives userId from session | closed |
| T-25-04-B | Tampering (param injection) | `?verified` | mitigate | Explicit allow-list to exactly `"success"`/`"expired"`/`null`; raw param never rendered | closed |
| T-25-04-C | Info Disclosure (typed password leak) | back-guard dialog | mitigate | `AccountBack` reads only `passwordDirty` boolean; dedicated leak-guard test (WR-09) proves no leak | closed |
| T-25-04-D | Session Management | post-delete session validity | mitigate | Postgres cascade wipes `session`/`account`; `signOut()` best-effort clears cookie; e2e proves old creds rejected | closed |
| T-25-04-E | Access Control | unauthenticated `/account` | mitigate | Inherits `(protected)/layout.tsx` redirect + defensive `if (!session) return null` | closed |
| T-25-05-A | Tampering (regression) | header sign-out removal | mitigate | Both blast-radius specs (e2e/01:49-107, e2e/10:48) retargeted; zero stale literals (grep-confirmed) | closed |
| T-25-05-B | Info Disclosure | e2e pending-token seam | mitigate | Read-only, dynamically-imported, try/catch-wrapped; not imported by any `src/` file — no prod route exposure | closed |
| T-25-05-C | Tampering | account-nav glyph | accept | AR-25-03 | closed |
| T-25-05-SC | Tampering (supply chain) | dependencies | accept | AR-25-05 | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**28/28 closed. 0 open.**

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|--------------|------|
| AR-25-01 | T-25-01-I | Honest `"email-taken"` disclosure is a deliberate low-stakes-app UI contract (25-UI-SPEC.md), consciously bypassing better-auth's anti-enumeration default so the UI can show an accurate error. Does not introduce a NEW enumeration oracle beyond what Phase 19's signup flow already accepted (AR-19-02). | Plan author (25-01-PLAN.md threat_model) | 2026-07-19 |
| AR-25-02 | T-25-03-B | Same tradeoff as AR-25-01, surfaced a second time where the UI renders the action's honest error under the Email field. | Plan author (25-03-PLAN.md threat_model) | 2026-07-19 |
| AR-25-03 | T-25-05-C | `AccountNavButton` is a zero-JS RSC `next/link` — no client state, no form, no user-controlled input. Negligible attack surface for a pure navigation control. Verified: no `"use client"`, no `onClick`, no `useState` in the file. | Plan author (25-05-PLAN.md threat_model) | 2026-07-20 |
| AR-25-04 | T-25-01-SC | Zero new npm packages introduced across all 5 plans of Phase 25. Verified by auditor: `git diff <pre-phase-25 commit>..HEAD -- package.json package-lock.json` returns an empty diff. | Plan author (25-01-PLAN.md threat_model), verified by gsd-security-auditor | 2026-07-20 |
| AR-25-05 | T-25-05-SC | Same supply-chain verification as AR-25-04 — one `package.json` diff spans the entire phase; no individual plan added a dependency. | Plan author (25-05-PLAN.md threat_model), verified by gsd-security-auditor | 2026-07-20 |

*Accepted risks do not resurface in future audit runs.*

---

## Threat Verification Evidence

| Threat ID | Evidence |
|-----------|----------|
| T-25-01-A | `src/lib/account-actions.ts:101` — `const token = crypto.randomUUID();`, written into `verification.value` only, never derived from `newEmailRaw`. |
| T-25-01-B | `src/app/api/account/verify-email/route.ts:74-96` — UPDATE applied, row NOT deleted (WR-06 comment block explains link-scanner-prefetch rationale); `route.test.ts:195-231` — two regression tests: happy path asserts `mockDbDelete` not called, and a same-token replay after prior success redirects to `success` again (not `expired`). Replace-not-additive on a genuinely NEW request (`account-actions.ts:99`) still fully invalidates the old row, so there is no unbounded replay window for a *different* target email — only same-token/same-value replay is idempotent. |
| T-25-01-C | `src/app/api/account/verify-email/route.ts:50` — `if (!match \|\| match.expiresAt < new Date()) return expired();`; `route.test.ts:154-162` — expired-row test. |
| T-25-01-D | `src/lib/account-actions.ts:96-99` — delete-then-insert on `PENDING_EMAIL_PREFIX + userId`; `account-actions.test.ts:167-186` — asserts delete fires before insert on the exact identifier. |
| T-25-01-E | `src/app/api/account/verify-email/route.ts:65-72` — `clash.length > 0 && clash[0]?.id !== userId` before UPDATE; `route.test.ts:179-193` — race-clash test. Lowercasing enforced once at write time via `newEmailSchema` (`account-actions.ts:39,84`), so both the uniqueness check and the stored/verified value already agree. |
| T-25-01-F | `src/app/api/account/verify-email/route.ts:30-32,98` — `base = request.nextUrl.origin`; both redirects hardcoded `${base}/account?verified=...`. `grep -rn "callbackURL\|callbackUrl" src/app/api/account/` — 0 matches. |
| T-25-01-G | `src/lib/account-actions.ts:64-66,156-160` — `userId = session.user.id`, never a function parameter. `src/app/api/account/verify-email/route.ts:53` — `userId` resolved only from `match.identifier` (the matched DB row), never from `request.nextUrl.searchParams` directly. |
| T-25-01-H | `src/lib/account-actions.ts:29-32` — `createRateLimiter({ windowMs: 3_600_000, maxRequests: 5 })`; line 68-71 checked immediately after the auth preamble, before any DB read/write. `account-actions.test.ts:188-198` — 6th call in-window returns `rate-limited`. |
| T-25-01-I | Accepted — see Accepted Risks Log AR-25-01. `src/lib/account-actions.ts:91-94` returns the honest `"email-taken"` error (no anti-enumeration mask). |
| T-25-01-J | `src/lib/account-actions.ts:156-168` — `deleteAccount()` takes no arguments; `db.delete(user).where(eq(user.id, userId))` with session-derived `userId` only. `account-actions.test.ts:250-264`. |
| T-25-01-SC | Accepted — see AR-25-04. `git diff a545dff..HEAD -- package.json package-lock.json` (pre-Phase-25 commit → HEAD) is empty. |
| T-25-02-A | `src/components/change-password-card.tsx:145-149` — `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`. |
| T-25-02-B | `src/components/account-dirty-context.tsx:20-23` — `AccountDirtyContextValue { passwordDirty: boolean; setPasswordDirty }` — no string field exists in the type or state. `src/components/daybreak/account-back.test.tsx:104-118` — types a real password through the real Provider and asserts `document.body.textContent` never contains it. |
| T-25-02-C | `src/components/change-password-card.tsx:153-157` — branches on `error.code === "INVALID_PASSWORD"`; `error.message` never read anywhere in the file (grep confirms). |
| T-25-02-D | `src/components/change-password-card.tsx:248,263,273` — `type="password"` on Current/New/Confirm fields. `grep -n "console\." src/components/change-password-card.tsx` — 0 matches. |
| T-25-03-A | `src/components/account-details-card.tsx:120` — `authClient.updateUser({ name: values.name })` — grep confirms zero occurrences of `updateUser` passing `email` or an `id`. |
| T-25-03-B | Accepted — see AR-25-02. `src/components/account-details-card.tsx:141-142` renders the honest `"That email is already in use."` from the action's return value. |
| T-25-03-C | `src/components/account-details-card.tsx:26-32,296` — `pendingEmail` is a required prop, rendered directly (`{pendingEmail && ...}`); no local `useState` shadows it. `src/app/(protected)/account/page.tsx:41-42,90` — sourced from `getPendingEmailChange(userId, session.user.email)` server-side. |
| T-25-03-D | `src/components/account-details-card.tsx:288` — view-mode `<DetailRow label="Email" value={email} />` uses the prop directly. `e2e/25-my-account.spec.ts:134-136` — after a pending change, asserts the details card still contains the OLD email and does NOT contain the new one. |
| T-25-04-A | `src/lib/account-actions.ts:1` — `"use server";` (Next Server Action). `grep -n "serverActions\|allowedOrigins" next.config.*` — no override found, so Next's default same-origin Origin-header check applies unmodified. |
| T-25-04-B | `src/app/(protected)/account/page.tsx:48-53` — explicit `if (params.verified === "success") ... else if (params.verified === "expired") ...` allow-list assigning a typed `"success" \| "expired" \| null`; raw `params.verified` never interpolated into rendered output. |
| T-25-04-C | `src/components/daybreak/account-back.tsx:24,98-99` — reads only `passwordDirty`; dialog body is the hardcoded string `"Your password changes haven't been saved."` with zero interpolation. `account-back.test.tsx:104-118` — dedicated leak-guard test (WR-09), all 5 tests in the file pass (confirmed via live `vitest run`). |
| T-25-04-D | `src/db/schema.ts:47-49,56-58` — `session.userId`/`account.userId` both `onDelete: "cascade"` on `user.id`; deck/card/recall_events/milestones_seen/habitat_metadata chain confirmed cascading (schema.ts:87,98,121,133,150). `src/lib/account-actions.ts:177-184` — best-effort guarded `signOut()`. `e2e/25-my-account.spec.ts:185-195` — deleted user's old credentials rejected with "Incorrect email or password.", never reach `/dashboard`. |
| T-25-04-E | `src/app/(protected)/layout.tsx:13` — `if (!session) redirect("/login")`. `src/app/(protected)/account/page.tsx:31` — defensive `if (!session) return null`. |
| T-25-05-A | `grep -n "account-nav-btn\|Sign out" e2e/01-auth-signup-login.spec.ts` — lines 49/51, 73/75, 105/107 all show the `account-nav-btn` navigation hop preceding each `Sign out` click. `e2e/10-mobile-responsive.spec.ts:48` — retargeted to `account-nav-btn`. `logout-button.tsx` confirmed absent from disk; `grep -rn "logout-button\|LogoutButton" src/` returns only harmless historical-prose comments, zero import/render references. |
| T-25-05-B | `e2e/helpers.ts:323-366` — `getPendingEmailChangeToken` is a single `.select()` (read-only), dynamically imports `@/db`/`@/db/schema`/`@/lib/account-constants` inside a `try/catch` returning `null` on any failure. `grep -rn "e2e/helpers" src/` — 0 import references from application code; the file lives under `e2e/`, outside Next's `src/app` route surface. |
| T-25-05-C | Accepted — see AR-25-03. `src/components/account-nav-button.tsx` — no `"use client"`, no `onClick`, no `useState`, pure `next/link`. |
| T-25-05-SC | Accepted — see AR-25-05. |

---

## Unregistered Flags

None. No `## Threat Flags` section exists in any of `25-01-SUMMARY.md` through `25-05-SUMMARY.md` (grep-confirmed across all five files, 0 matches). No new, un-mapped attack surface was self-reported by the executor during implementation.

---

## Notes

**T-25-01-B mechanism change (WR-06) — verified not a regression.** The original plan-time mitigation text read "verification row deleted immediately on success; a second click finds no row → `?verified=expired`" (strict single-use). Post-implementation code review (25-REVIEW.md WR-06) found this strict single-use design was itself a bug: corporate mail-security gateways (Microsoft Defender Safe Links, Proofpoint, Mimecast) auto-follow links in incoming email to scan them before the real user opens the message, silently burning the token and locking the legitimate user out with a false "expired" result even though their email had already changed correctly. The fix (commit `dab40fb`) makes consumption idempotent-per-user instead of single-use: the row is no longer deleted on success, so replaying the *same* token just re-applies the *same* already-current email — a harmless no-op, not a new state change. The security property the original threat register cared about (an old/stolen token cannot be used to move the account to a *different* attacker-chosen address after the flow completes) is preserved by two mechanisms unaffected by WR-06: (1) `requestEmailChange`'s replace-not-additive delete-then-insert means any genuinely new change request fully invalidates the old row/token, and (2) the race re-check on every consumption (`clash[0]?.id !== userId`) still correctly falls through on a self-replay (the "clash" is the user themself) rather than granting a different account's identity. Both the happy-path-no-delete and the replay-still-succeeds behaviors have dedicated regression tests in `route.test.ts`, confirmed passing in this audit's live test run. Verdict: disposition remains `mitigate`/closed, evidence updated to reflect the current mechanism.

**Residual informational findings (25-REVIEW.md, explicitly out of the fix scope — `fix_scope: critical_warning`, IN-01/IN-02 not fixed by design).** These were never declared threats in any plan's `<threat_model>` register, so they do not count against `threats_open`, but are recorded here for visibility since they represent consciously-deferred, low-severity residual risk:
- **IN-01** — the verify-email route's token match (`route.ts:45`) uses plain `===` string equality rather than a constant-time comparison. Real-world exploitability is very low (122-bit `crypto.randomUUID()` tokens, no per-character retry oracle exposed) and constant-time comparison is an ASVS L2/L3-tier defense-in-depth control, not an L1 baseline requirement — consistent with this phase's `asvs_level: 1` configuration. Non-blocking.
- **IN-02** — expired `verification` rows are never swept (they're just treated as absent on read), and `deleteAccount` only cleans up the `change-email:` identifier, not any other lingering `verification` rows (e.g. an unused better-auth password-reset token) under a different identifier convention. Both are dead-row hygiene/storage-growth concerns, not an access-control or data-integrity gap — an abandoned or orphaned row grants no capability to anyone. Non-blocking.

**Live verification performed by this audit (2026-07-20), not assumed from SUMMARY prose:**
- `npx vitest run` scoped to all 8 Phase 25 test files (`account-actions.test.ts`, `account-queries.test.ts`, `verify-email/route.test.ts`, `account-details-card.test.tsx`, `change-password-card.test.tsx`, `delete-account-row.test.tsx`, `account-logout-section.test.tsx`, `account-back.test.tsx`) — **8 passed / 62 tests passed, 0 failed.**
- `git diff a545dff..HEAD -- package.json package-lock.json` (pre-Phase-25 commit → HEAD) — empty, confirming AR-25-04/AR-25-05's zero-new-dependency claims.
- `grep -rn "logout-button\|LogoutButton" src/` — confirms zero import/render references remain; file confirmed absent from disk.
- `grep -rn "e2e/helpers" src/` — confirms the test-only DB seam (T-25-05-B) has no path into application/production code.
- `grep -n "serverActions\|allowedOrigins" next.config.*` — confirms no CSRF-weakening override to Next's default Server Action Origin-header enforcement.
- Postgres cascade FKs read directly from `src/db/schema.ts` (not inferred from comments) for T-25-04-D: `session`, `account`, `decks`, `milestones_seen`, `habitat_metadata` all reference `user.id` with `onDelete: "cascade"`; `cards` cascades from `decks.id`; `recall_events` cascades from `cards.id` — full transitive chain confirmed erasing every user-referencing row via the single `db.delete(user)` statement. `verification` confirmed to carry no `userId` FK (hygiene-delete in `deleteAccount` is therefore necessary and present).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|----------------|--------|------|--------|
| 2026-07-20 | 28 | 28 | 0 | gsd-security-auditor (claude-sonnet-5) via /gsd:secure-phase |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-20
