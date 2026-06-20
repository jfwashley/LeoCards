---
phase: 19-daybreak-foundation-onboarding-auth
plan: "03"
subsystem: ui
tags: [react, tailwind, playwright, e2e, daybreak, design-system, security, auth]

requires:
  - phase: 19-daybreak-foundation-onboarding-auth
    plan: "01"
    provides: TField/TBtn/AuthCard/DaybreakAuthScene primitives

provides:
  - "src/app/(auth)/forgot-password/page.tsx: Daybreak daylight Forgot with privacy-safe confirmation (ONB-03)"
  - "src/app/(auth)/reset-password/page.tsx: Daybreak dusk Reset with expired-link dead-end + mismatch validation (ONB-04)"
  - "e2e/03-forgot-reset-password.spec.ts: Playwright spec locking ONB-03 + ONB-04 security behaviors"

affects:
  - "All four Daybreak auth screens now complete (DSY-03 fully satisfied)"

tech-stack:
  added: []
  patterns:
    - "DaybreakAuthScene tagline prop used to differentiate screen flavour: daylight='We'll send a link.' dusk='Almost done.' (D-07)"
    - "ExpiredState sub-component in reset-password renders both the missing-token AND tokenError paths, keeping the Suspense boundary intact"
    - "TBtn(type=button onClick=router.push) used for the 'Request a new link' dead-end action (avoids anchor-as-button anti-pattern)"
    - "Privacy-safe confirmation uses 'If an account exists, we've sent a reset link to <strong>{sentEmail}</strong>.' — conditional prefix prevents account enumeration"

key-files:
  created:
    - e2e/03-forgot-reset-password.spec.ts
  modified:
    - src/app/(auth)/forgot-password/page.tsx
    - src/app/(auth)/reset-password/page.tsx

key-decisions:
  - "Privacy-safe confirmation string: 'If an account exists, we've sent a reset link to {email}.' — replaces prior existence-implying 'Check your email — we sent a reset link to …'"
  - "Resend link implemented as a button calling setSent(false) — low-friction UX without re-navigating; avoids creating a second form or route"
  - "ExpiredState extracted as a sub-component shared between missing-token (no ?token=) and tokenError (server rejected token) dead-end paths — single source of truth for the expired UI"
  - "TBtn(type=button) for 'Request a new link' rather than a plain <Link> anchor — keeps Daybreak styling without the anchor-as-button semantic issue"
  - "Selector fixed in e2e: getByRole('heading', { name: /link expired/i }) preferred over getByText(/expired/i) which matched both the heading and paragraph (Playwright strict-mode violation)"

metrics:
  duration: 18min
  completed: 2026-06-20
---

# Phase 19 Plan 03: Forgot + Reset Password Daybreak Restyle Summary

**Daybreak restyle of Forgot (daylight) and Reset (dusk) auth screens, completing the four-screen Daybreak auth family, with Playwright e2e coverage locking the two security-critical behaviors.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-20T12:00:00Z
- **Completed:** 2026-06-20T12:18:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

### Task 1 — Forgot Password (daylight, privacy-safe confirmation)
- Replaced shadcn `Card`/`Input`/`Label`/`Button` with `AuthCard` + `DaybreakAuthScene(variant="daylight", tagline="We'll send a link.")` + `TField`/`TBtn`
- **Unsent state:** title "Reset your password", explainer, Email `TField`, "Send reset link" `TBtn`
- **Sent state:** title "Check your email", envelope medallion (#FFF1DC circle), privacy-safe body "If an account exists, we've sent a reset link to **{sentEmail}**.", resend inline button
- Preserved exactly: `forgotPasswordSchema`, `useForm`/`zodResolver`, `authClient.requestPasswordReset({ email, redirectTo: window.location.origin + '/reset-password' })`, `sent`/`sentEmail` state machine
- Footer: "‹ Back to sign in" Daybreak link below card

### Task 2 — Reset Password (dusk, expired-link dead-end)
- Replaced shadcn `Card`/`Input`/`Label`/`Button` with `AuthCard` + `DaybreakAuthScene(variant="dusk", tagline="Almost done.")` + `TField`/`TBtn`
- **Normal state:** title "Set a new password", New password + Confirm password `TField`s, "Set new password" `TBtn`
- **Expired dead-end (missing token OR tokenError):** `ExpiredState` sub-component — title "Link expired", red "!" medallion (#FCEBE6 circle, `--destructive` color), body "This reset link has expired. Request a new one and we'll send a fresh link.", `TBtn` "Request a new link" → `router.push("/forgot-password")`
- Preserved exactly: `resetSchema` with `.refine("Passwords do not match")`, `token = searchParams.get("token")`, `authClient.resetPassword({ newPassword: values.password, token })`, `router.push("/login")` on success, `Suspense` boundary wrapping the `useSearchParams`-consuming `ResetPasswordForm`

### Task 3 — Playwright e2e spec
- `e2e/03-forgot-reset-password.spec.ts` — 3 tests × 2 viewports (web + Pixel 7 mobile) = **6 tests, all green**
- **ONB-03 test:** Visits `/forgot-password`, fills unregistered `testEmail()`, submits, asserts `/If an account exists/` — proves no account-existence leakage regardless of registration status
- **ONB-04 test:** Visits `/reset-password` (no token), asserts `getByRole("heading", { name: /link expired/i })`, clicks "Request a new link", asserts navigation to `/forgot-password`
- **Mismatch test:** Visits `/reset-password?token=invalid-token-xyz`, fills mismatched passwords, asserts `/do not match/i` fires client-side before any server token call

## Security Behavior Preservation (D-08 / Threat Model)

| Threat ID | Behavior | How Preserved | Tested |
|-----------|----------|---------------|--------|
| T-19-03-ENUM | Privacy-safe confirmation — never reveals account existence | Sent state copy uses "If an account exists, we've sent a reset link to…" (conditional prefix) — replaces prior "Check your email — we sent a reset link to…" | e2e test 1 asserts `/If an account exists/` |
| T-19-03-TOKEN | Reset token validated server-side by better-auth | `authClient.resetPassword({ newPassword, token })` call preserved unchanged; expired/tampered token returns error → routes to dead-end | e2e test 2 asserts dead-end + forgot route |
| T-19-03-MATCH | Cross-field password match | `resetSchema .refine("Passwords do not match")` zod refinement preserved unchanged | e2e test 3 asserts `/do not match/i` fires before server call |
| T-19-03-LEAK | Generic expired copy — no oracle | "This reset link has expired." message shown for both missing-token and server-rejected-token paths (no distinction) | ExpiredState used for both paths |

**Exact privacy-safe confirmation string used:**
```
If an account exists, we've sent a reset link to {sentEmail}.
```

## Task Commits

1. **Task 1: Forgot Password Daybreak restyle** — `5564bfc` (feat)
2. **Task 2: Reset Password Daybreak restyle** — `7f69677` (feat)
3. **Task 3: Playwright e2e spec** — `8e95f60` (test)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Playwright strict-mode violation on `/expired/i` selector**
- **Found during:** Task 3 (e2e run — test 2 failed on both web and mobile)
- **Issue:** `page.getByText(/expired/i)` matched two elements: the `<h2>Link expired</h2>` heading AND the `<p>This reset link has expired...</p>` paragraph. Playwright strict mode requires an unambiguous locator.
- **Fix:** Changed to `page.getByRole("heading", { name: /link expired/i })` — resolves to exactly the `<h2>` element
- **Files modified:** `e2e/03-forgot-reset-password.spec.ts`
- **Verification:** 6/6 tests pass after fix

---

**Total deviations:** 1 auto-fixed (Rule 1 bug — ambiguous Playwright selector in e2e spec)
**Impact on plan:** Single-line fix; no architectural change; no behavior change.

## Verification Results

- `npx tsc --noEmit`: TSC-OK
- `npx vitest run`: 1956 passed, 6 skipped — no regressions vs. Plan 01 baseline
- `npx playwright test e2e/03-forgot-reset-password.spec.ts`: 6/6 passed (web + mobile)

## Known Stubs

None — all security behaviors are fully wired. No placeholder data, hardcoded empty values, or TODO markers in the restyled pages.

## Threat Flags

None — plan modifies presentation of existing auth screens only. No new network endpoints, auth paths, file access patterns, or schema changes introduced. The privacy-safe confirmation and expired-link dead-end are hardened vs. the prior implementation (T-19-03-ENUM mitigated; T-19-03-LEAK mitigated).

## Self-Check: PASSED

Files verified:
- src/app/(auth)/forgot-password/page.tsx: FOUND
- src/app/(auth)/reset-password/page.tsx: FOUND
- e2e/03-forgot-reset-password.spec.ts: FOUND

Commits verified:
- 5564bfc: feat(19-03): restyle Forgot Password to Daybreak daylight with privacy-safe confirmation
- 7f69677: feat(19-03): restyle Reset Password to Daybreak dusk with expired-link dead-end
- 8e95f60: test(19-03): add Playwright e2e coverage for ONB-03 privacy-safe confirmation + ONB-04 expired-link dead-end
