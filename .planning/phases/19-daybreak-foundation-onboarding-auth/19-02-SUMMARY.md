---
phase: 19-daybreak-foundation-onboarding-auth
plan: "02"
subsystem: ui
tags: [react, tailwind, vitest, testing-library, jsdom, daybreak, design-system, better-auth, react-hook-form, zod]

requires:
  - phase: 19-01
    provides: TField + TBtn Daybreak primitives, jsdom/@testing-library/react test infra, AuthCard/DaybreakAuthScene sunrise shell

provides:
  - Login page composed from TField/TBtn (no inline shadcn Input/Button/Label; no fieldClass helper)
  - Signup page: Daybreak AuthCard sunrise shell, Name/Email/Password only (nativeLanguage removed D-04), redirects to /welcome (D-05)
  - signup-payload.test.tsx: Vitest unit smoke proving payload shape { name, email, password } and /welcome redirect

affects:
  - 19-03 (forgot/reset pages: follow same Daybreak shell + TField/TBtn pattern established here)
  - 19-04 (welcome route: signup now redirects here; harness can repair e2e flows)

tech-stack:
  added: []
  patterns:
    - "vi.hoisted() for mock fn declarations when vi.mock factory needs to close over them (hoisting order)"
    - "call![0] non-null assertion after toBeDefined() to satisfy TS2532 on mock.calls[0]"
    - "TField hint prop shown only when error is absent — use for 'At least 8 characters' on password fields"

key-files:
  created:
    - src/app/(auth)/__tests__/signup-payload.test.tsx
  modified:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/signup/page.tsx

key-decisions:
  - "nativeLanguage is required: false + defaultValue: 'en' on the better-auth server config, so removing it from the signUp payload does NOT break the call — the server fills the default"
  - "vi.hoisted() required (not just top-level const) because vi.mock is statically hoisted before any variable initializers run; factory closure needs the refs available at hoist time"
  - "TS2532 on mock.calls[0][0]: fixed with call![0] after explicit toBeDefined() check, avoiding unsafe cast on possibly-undefined array element"
  - "nativeLanguage comment in signupSchema removed (not just the field) so grep count = 0 per acceptance criteria"
  - "Login Forgot-password link placed inside a flex flex-col gap-1.5 wrapper beneath the TField so it remains visually attached to the password field without breaking the outer gap-[15px] form layout"

patterns-established:
  - "Auth page Daybreak shell: outer <> fragment with AuthCard + DaybreakAuthScene variant=sunrise; cross-link paragraph below card"
  - "Per-field error prop: error={isSubmitted ? errors.field?.message : undefined} — never on blur"
  - "emailError 'already exists' path: isSubmitted ? (errors.email?.message ?? (emailError ?? undefined)) : undefined"
  - "TDD RED gate: run tests against un-refactored page first; confirmed FAIL before implementing"

requirements-completed: [ONB-01, ONB-02, DSY-03]

duration: 25min
completed: 2026-06-20
---

# Phase 19 Plan 02: Daybreak Auth Pages (Login + Signup) Summary

**Login composed from TField/TBtn primitives (D-02); Signup restyled to Daybreak AuthCard sunrise shell with nativeLanguage removed from schema/payload/UI and success redirected to /welcome (D-04/D-05); unit smoke locks payload shape and /welcome redirect**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-20T12:03:00Z
- **Completed:** 2026-06-20T12:10:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Refactored `login/page.tsx` onto TField/TBtn: removed shadcn Button/Input/Label imports, deleted `fieldClass()` helper, replaced all field+button markup with primitives — all sign-in logic, sunrise scene, Suspense wrapper, and Forgot password link preserved
- Refactored `signup/page.tsx`: removed `nativeLanguage` from zod schema, `defaultValues`, `authClient.signUp.email()` call, and the entire `<select>` block; replaced shadcn Card shell with AuthCard sunrise; swapped Label+Input+Button for TField (with hint on Password) + TBtn; success path changed from `router.push("/dashboard")` to `router.push("/welcome")`; `emailError` "already exists" branch preserved
- New `signup-payload.test.tsx` (jsdom, vi.hoisted): two Vitest unit smokes — (1) proves `signUp.email` receives exactly `{ name, email, password }` with no `nativeLanguage` key, (2) proves `router.push("/welcome")` fires on success; both green

## signup nativeLanguage Handling

`nativeLanguage` is declared in `src/lib/auth.ts` as `required: false, defaultValue: "en"`. Removing it from the client-side `signUp.email()` payload is safe — better-auth applies the server-side default. The field is not sent at signup; it will be set at `/welcome` step 3 via `authClient.updateUser({ nativeLanguage })` (19-04/19-03 scope). This narrows the signUp trust boundary (T-19-02-VAL).

## Task Commits

1. **Task 1: Refactor Login onto TField/TBtn** — `fc26d74` (feat)
2. **Task 2 RED: Failing signup-payload smoke** — `846ad16` (test)
3. **Task 2 GREEN: Daybreak Signup + passing smokes** — `64c5967` (feat)

## Files Created/Modified

- `src/app/(auth)/login/page.tsx` — TField/TBtn primitives replace shadcn; fieldClass() deleted; all auth logic preserved; login still routes to /dashboard
- `src/app/(auth)/signup/page.tsx` — Daybreak AuthCard sunrise shell; nativeLanguage fully removed; payload is { email, password, name }; success → /welcome
- `src/app/(auth)/__tests__/signup-payload.test.tsx` — jsdom Vitest smoke: asserts no nativeLanguage in payload + /welcome redirect

## Decisions Made

- `nativeLanguage` field has `required: false` server-side, so removing it from the client payload is non-breaking. No server-side auth.ts change needed.
- Used `vi.hoisted()` for mock fn declarations because `vi.mock()` is statically hoisted to the file's top, making normal `const mockFn = vi.fn()` declarations unavailable at factory execution time.
- TS2532 on `mock.calls[0][0]`: resolved with `const call = ...; expect(call).toBeDefined(); const arg = call![0]` to avoid unsafe cast.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.hoisted() required for mock fn declarations in vi.mock factory**
- **Found during:** Task 2 (RED phase — first test run)
- **Issue:** `vi.mock` is statically hoisted before variable initializers; declaring `const mockSignUpEmail = vi.fn()` then using it in `vi.mock("@/lib/auth-client", () => ({ ... mockSignUpEmail ... }))` caused `ReferenceError: Cannot access 'mockSignUpEmail' before initialization`
- **Fix:** Used `vi.hoisted(() => ({ mockPush, mockRefresh, mockSignUpEmail }))` to lift mock fn creation into the hoist zone
- **Files modified:** signup-payload.test.tsx
- **Verification:** Tests executed and failed for the correct reason (wrong payload / wrong redirect) rather than setup error
- **Committed in:** 846ad16 (RED commit)

**2. [Rule 1 - Bug] TS2532 — mock.calls[0] possibly undefined**
- **Found during:** Task 2 (GREEN phase — tsc after implementing signup)
- **Issue:** `mockSignUpEmail.mock.calls[0][0]` caused `TS2532: Object is possibly 'undefined'` because TypeScript infers `calls[0]` as `T | undefined`
- **Fix:** Assigned to `call`, added `expect(call).toBeDefined()`, then accessed `call![0]` with non-null assertion
- **Files modified:** signup-payload.test.tsx
- **Verification:** `npx tsc --noEmit` exits 0; tests still pass
- **Committed in:** 64c5967 (GREEN commit)

**3. [Rule 1 - Bug] nativeLanguage comment caused grep count = 1**
- **Found during:** Task 2 (acceptance criteria check after GREEN)
- **Issue:** A `// nativeLanguage REMOVED (D-04)` comment in signupSchema left `grep -c nativeLanguage signup/page.tsx` returning 1, violating the acceptance criterion of 0
- **Fix:** Removed the comment; plan context explains the D-04 decision
- **Files modified:** signup/page.tsx
- **Verification:** `grep -c nativeLanguage signup/page.tsx` returns 0
- **Committed in:** 64c5967 (same GREEN commit)

---

**Total deviations:** 3 auto-fixed (Rule 1 bugs — test setup, type safety, grep hygiene)
**Impact on plan:** All three auto-fixes necessary for correctness or acceptance. No scope creep, no architectural change.

## Issues Encountered

None beyond the three auto-fixed issues above.

## Known Stubs

None — login and signup are fully wired to `authClient.signIn.email` / `signUp.email`. No placeholder data, hardcoded empty returns, or TODO markers.

## Threat Flags

None — this plan only swaps presentation markup and narrows the signUp payload (removes `nativeLanguage`). No new network endpoints, auth paths, or file access patterns introduced. T-19-02-AUTH (better-auth flows preserved verbatim), T-19-02-VAL (payload narrowed, unit-tested) both mitigated as planned.

## Next Phase Readiness

- Login (ONB-01) confirmed: TField/TBtn composition pattern proven, sunrise scene preserved, routes to /dashboard
- Signup (ONB-02) confirmed: nativeLanguage fully removed from client; server default applies; success routes to /welcome
- 19-03 (Forgot/Reset): follow identical pattern — AuthCard with daylight/dusk variants, TField/TBtn, preserve better-auth flows
- 19-04 (Welcome): signup now routes here; e2e harness repair in-scope for that plan

---
*Phase: 19-daybreak-foundation-onboarding-auth*
*Completed: 2026-06-20*
